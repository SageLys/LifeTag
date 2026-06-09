import { FailReason, ProductStatus, RunPhase, RunResult } from './constants';
import { generateCustomerOrders } from './customerGenerator';
import { discardHand, drawCards } from './deckSystem';
import { createNewGame } from './gameState';
import { generateMarketEvents } from './marketGenerator';
import { generateProductCandidates } from './productGenerator';
import { generateRunReport } from './runReport';
import { generateRewardOptions } from './rules_rewards';
import { createRng } from './rng';
import type { AppRuntime, RunState } from './types';

const NEXT_PHASE: Partial<Record<RunPhase, RunPhase>> = {
  [RunPhase.DayOpening]: RunPhase.DayPurchase,
  [RunPhase.DayPurchase]: RunPhase.DayCustomer,
  [RunPhase.DayCustomer]: RunPhase.DayDraw,
  [RunPhase.DayDraw]: RunPhase.DayProcess,
  [RunPhase.DayProcess]: RunPhase.DaySell,
  [RunPhase.DaySell]: RunPhase.DayResolve,
  [RunPhase.DayResolve]: RunPhase.DayReward,
};

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

function drawDailyHand(app: AppRuntime): void {
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

function ensurePhaseContent(app: AppRuntime): void {
  switch (app.state.phase) {
    case RunPhase.DayOpening:
      generateMarketEvents(app);
      break;
    case RunPhase.DayPurchase:
      generateProductCandidates(app);
      break;
    case RunPhase.DayCustomer:
      generateCustomerOrders(app);
      break;
    case RunPhase.DayDraw:
      drawDailyHand(app);
      break;
    case RunPhase.DayReward:
      if (app.state.dayState.rewardOptions.length === 0) {
        app.state.dayState.rewardOptions = generateRewardOptions(app);
        app.state.dayState.rewardOptionIds = app.state.dayState.rewardOptions.map((reward) => reward.instanceId);
        addRunLog(app.state, `第 ${app.state.currentDay} 天收店，生成 ${app.state.dayState.rewardOptions.length} 个奖励选项。`);
      }
      break;
    default:
      break;
  }
}

function createEmptyDayState(app: AppRuntime, dayNumber: number): RunState['dayState'] {
  return {
    dayNumber,
    phase: RunPhase.DayOpening,
    actionPoints: app.configs.gameConfig.dailyActionPoints,
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
  ensurePhaseContent(app);

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

  if (state.phase !== RunPhase.DayReward) {
    addRunLog(state, `非法推进：${state.phase} 不能进入下一天。`);
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
  state.currentDay += 1;
  state.dayState = createEmptyDayState(app, state.currentDay);
  syncPhase(state, RunPhase.DayOpening);
  addRunLog(state, `第 ${state.currentDay} 天开店。`);
  ensurePhaseContent(app);
}

export const startNextDay = finishDayAndStartNextDay;

export function advancePhase(app: AppRuntime): void {
  const { state } = app;

  if (state.phase === RunPhase.RunInit || state.phase === RunPhase.RunEnd || state.phase === RunPhase.RunFailed) {
    startNewRun(app);
    return;
  }

  if (state.phase === RunPhase.DayReward) {
    addRunLog(state, '请先选择一个收店奖励。');
    return;
  }

  const nextPhase = NEXT_PHASE[state.phase];
  if (!nextPhase) {
    addRunLog(state, `非法推进：${state.phase} 没有可用的下一阶段。`);
    return;
  }

  const previousPhase = state.phase;
  syncPhase(state, nextPhase);
  clearPhaseSelections(state);
  addRunLog(state, `阶段切换：${previousPhase} → ${nextPhase}。`);
  ensurePhaseContent(app);
}

export function returnToProcess(app: AppRuntime): void {
  const { state } = app;

  if (state.phase !== RunPhase.DaySell) {
    addRunLog(state, `非法返回：${state.phase} 不能返回 DAY_PROCESS。`);
    return;
  }

  syncPhase(state, RunPhase.DayProcess);
  clearPhaseSelections(state);
  addRunLog(state, '从 DAY_SELL 返回 DAY_PROCESS。');
}

export function checkRunEndConditions(app?: AppRuntime): boolean {
  if (!app) {
    return false;
  }
  return app.state.currentDay >= app.state.maxDays && app.state.phase === RunPhase.DayReward;
}
