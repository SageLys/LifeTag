import { FailReason, ProductStatus, RunPhase, RunResult } from './constants';
import { generateCustomerOrders } from './customerGenerator';
import { discardHand, drawCards } from './deckSystem';
import { createNewGame } from './gameState';
import { generateMarketEvents } from './marketGenerator';
import { generateProductCandidates } from './productGenerator';
import { generateRunReport } from './runReport';
import { createRng } from './rng';
import type { AppRuntime, RunState } from './types';

function addRunLog(state: RunState, message: string): void {
  state.runLog.push(message);
  state.dayState.log.push(message);
}

function syncPhase(state: RunState, phase: RunPhase): void {
  state.phase = phase;
  state.dayState.phase = phase;
}

function clearPhaseSelections(state: RunState): void {
  state.dayState.selectedProductId = null;
  state.dayState.selectedCustomerId = null;
  state.dayState.selectedCustomerOrderId = null;
  state.dayState.selectedPricingModeId = null;
  state.dayState.currentDealPreview = null;
}

export function drawDailyHand(app: AppRuntime): void {
  const { state } = app;
  if (state.dayState.phaseFlags.drawnToday) {
    return;
  }

  const requestedDrawCount = app.configs.gameConfig.dailyDrawCount;
  const drawPileBefore = state.deckState.drawPile.length;
  const discardPileBefore = state.deckState.discardPile.length;
  const rng = createRng(state.rngState);
  const drawnCards = drawCards(state.deckState, requestedDrawCount, rng);
  state.rngState = rng.value;
  state.dayState.phaseFlags.drawnToday = true;

  if (drawPileBefore < requestedDrawCount && discardPileBefore > 0) {
    addRunLog(state, '抽牌堆不足，弃牌堆洗入抽牌堆。');
  }
  if (drawnCards.length < requestedDrawCount) {
    addRunLog(state, `牌堆不足，本次只抽取 ${drawnCards.length} 张。`);
  }
  addRunLog(state, `第 ${state.currentDay} 天：抽取 ${drawnCards.length} 张经营手牌。`);
}

function discardHandForDayEnd(app: AppRuntime): void {
  const discardedCards = discardHand(app.state.deckState);
  if (discardedCards.length > 0) {
    addRunLog(app.state, `收店后弃置 ${discardedCards.length} 张手牌。`);
  }
}

/**
 * 去阶段化：开店后立即确保当天的基础场景内容存在（新闻 / 货源 / 顾客）。
 * 不在此处抽牌或生成收店奖励——那些改为玩家点击牌堆 / 保险柜时按需触发。
 * 三个 generator 自身幂等（已有内容时直接返回），可安全重复调用。
 */
function ensureDailyContent(app: AppRuntime): void {
  generateMarketEvents(app);
  generateProductCandidates(app);
  generateCustomerOrders(app);
}

function createEmptyDayState(app: AppRuntime, dayNumber: number): RunState['dayState'] {
  const maxActionPoints = app.configs.gameConfig.maxActionPoints ?? app.configs.gameConfig.dailyActionPoints;
  return {
    dayNumber,
    phase: RunPhase.DayOpening,
    actionPoints: Math.min(app.configs.gameConfig.dailyActionPoints, maxActionPoints),
    marketEvent: null,
    marketEvents: [],
    productCandidates: [],
    customerOrders: [],
    rewardOptions: [],
    marketEventIds: [],
    productCandidateIds: [],
    customerOrderIds: [],
    rewardOptionIds: [],
    chosenRewardId: null,
    boughtProductCount: 0,
    soldProductCount: 0,
    dailyProfit: 0,
    maxSingleDealProfit: 0,
    accidentCount: 0,
    blindBoxDealAccidentLevels: [],
    selectedProductId: null,
    selectedCustomerId: null,
    selectedCustomerOrderId: null,
    selectedPricingModeId: null,
    currentDealPreview: null,
    temporaryDayModifiers: [],
    temporaryDealModifiers: [],
    phaseFlags: {},
    log: [],
  };
}

function applyOpeningCashFloor(app: AppRuntime): void {
  const floor = app.configs.gameConfig.dailyOpeningCashFloor ?? 0;
  const extra = app.configs.gameConfig.dailyOpeningCashBonus ?? 0;
  const target = floor + extra;
  if (target > 0 && app.state.cash < target) {
    const before = app.state.cash;
    app.state.cash = target;
    addRunLog(app.state, `开店周转补助：现金 ${before} → ${target}，不计入累计利润。`);
  }
}

function applyNextDayRunModifiers(app: AppRuntime): void {
  const { state } = app;
  for (const modifier of state.temporaryRunModifiers) {
    if (modifier.timing !== 'next_day' || modifier.consumed >= modifier.uses) {
      continue;
    }
    if (modifier.scope === 'day_start') {
      if (modifier.stat === 'dailyActionPoints') {
        state.dayState.actionPoints += modifier.value;
        modifier.consumed += 1;
        addRunLog(state, `临时效果触发：${modifier.displayName}，今日行动点 ${modifier.value >= 0 ? '+' : ''}${modifier.value}。`);
      }
      if (modifier.stat === 'dailyDrawCount' || modifier.stat === 'dailyProductCandidateCount') {
        modifier.consumed += 0;
      }
    }
  }
  state.temporaryRunModifiers = state.temporaryRunModifiers.filter((modifier) => modifier.consumed < modifier.uses);
}

function ageSupplySourcesForNextDay(app: AppRuntime): void {
  for (const source of app.state.activeSupplySources) {
    if (typeof source.remainingDays === 'number') {
      source.remainingDays -= 1;
    }
  }
  const expired = app.state.activeSupplySources.filter((source) => typeof source.remainingDays === 'number' && source.remainingDays <= 0);
  app.state.activeSupplySources = app.state.activeSupplySources.filter(
    (source) => source.remainingDays === null || typeof source.remainingDays === 'undefined' || source.remainingDays > 0,
  );
  for (const source of expired) {
    const name = app.index.supplySourcesById.get(source.supplySourceId)?.displayName ?? source.supplySourceId;
    addRunLog(app.state, `货源倾向【${name}】已过期。`);
  }
}

function ageInventoryForNextDay(app: AppRuntime): void {
  const loss = app.configs.gameConfig.freshnessLossPerDay;
  const spoiledAt = app.configs.gameConfig.spoiledAt;

  for (const product of app.state.inventory) {
    if (product.status !== ProductStatus.Inventory || product.flags.sold) {
      continue;
    }
    product.freshnessCurrent = Math.max(0, product.freshnessCurrent - loss);
    if (product.freshnessCurrent <= spoiledAt) {
      product.flags.spoiled = true;
    }
  }
}

export function startNewRun(app: AppRuntime): void {
  const shouldLogRestart = app.state.phase !== RunPhase.RunInit;
  app.state = createNewGame(app.configs.gameConfig);
  applyOpeningCashFloor(app);
  ensureDailyContent(app);

  if (shouldLogRestart) {
    addRunLog(app.state, '重新开始新局。');
  }
}

export function endRun(app: AppRuntime): void {
  const { state } = app;

  if (state.cash < 0) {
    state.result = RunResult.Failed;
    state.failReason = FailReason.CashBelowZero;
    syncPhase(state, RunPhase.RunFailed);
  } else if (state.reputation <= 0) {
    state.result = RunResult.Failed;
    state.failReason = FailReason.ReputationZero;
    syncPhase(state, RunPhase.RunFailed);
  } else if (state.totalProfit >= state.targetTotalProfit) {
    state.result = RunResult.Victory;
    state.failReason = FailReason.None;
    syncPhase(state, RunPhase.RunEnd);
  } else {
    state.result = RunResult.Failed;
    state.failReason = FailReason.ProfitTargetNotMet;
    syncPhase(state, RunPhase.RunFailed);
  }

  clearPhaseSelections(state);
  state.runReport = generateRunReport(app);
  addRunLog(state, `第 ${state.currentDay} 天结束，本局${state.result === RunResult.Victory ? '胜利' : '失败'}：${state.runReport.endingTitle}。`);
}

export function finishDayAndStartNextDay(app: AppRuntime): void {
  const { state } = app;

  // 去阶段化：不再要求 state.phase === DayReward。
  // 是否允许收店 / 进入下一天的校验在 actions.finishRewardPhase 中通过
  // canFinishRewardPhase 完成，这里只负责执行换天。
  if (state.result !== RunResult.InProgress) {
    addRunLog(state, '本局已结束，无法进入下一天。');
    return;
  }

  if (state.currentDay >= state.maxDays) {
    discardHandForDayEnd(app);
    addRunLog(state, `第 ${state.currentDay} 天结束。`);
    endRun(app);
    return;
  }

  addRunLog(state, `第 ${state.currentDay} 天结束，进入第 ${state.currentDay + 1} 天。`);
  discardHandForDayEnd(app);
  ageInventoryForNextDay(app);
  ageSupplySourcesForNextDay(app);
  state.currentDay += 1;
  state.dayState = createEmptyDayState(app, state.currentDay);
  syncPhase(state, RunPhase.DayOpening);
  applyNextDayRunModifiers(app);
  addRunLog(state, `第 ${state.currentDay} 天开店。`);
  applyOpeningCashFloor(app);
  ensureDailyContent(app);
}

export const startNextDay = finishDayAndStartNextDay;

/**
 * 去阶段化后，本局是否已结束只取决于结果状态，不再依赖具体阶段。
 */
export function checkRunEndConditions(app?: AppRuntime): boolean {
  if (!app) {
    return false;
  }
  return app.state.result !== RunResult.InProgress;
}
