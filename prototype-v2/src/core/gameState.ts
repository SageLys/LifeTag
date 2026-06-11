import { FailReason, RunPhase, RunResult } from './constants';
import { createInitialDeckState } from './deckSystem';
import { createRng } from './rng';
import type { GameConfig, RunState } from './types';

export function createInitialGameState(gameConfig: GameConfig): RunState {
  const rngSeed = Date.now();
  const rng = createRng(rngSeed);
  const deckState = createInitialDeckState(gameConfig, rng);
  const maxActionPoints = gameConfig.maxActionPoints ?? gameConfig.dailyActionPoints;

  return {
    runId: `run_${Date.now()}`,
    phase: RunPhase.RunInit,
    result: RunResult.InProgress,
    failReason: FailReason.None,
    currentDay: 1,
    maxDays: gameConfig.runLengthDays,
    cash: gameConfig.initialCash,
    totalProfit: 0,
    targetTotalProfit: gameConfig.targetTotalProfit,
    reputation: gameConfig.initialReputation,
    maxReputation: gameConfig.maxReputation,
    rngSeed,
    rngState: rng.value,
    nextInstanceCounter: 1,
    inventory: [],
    activePassives: [],
    activeSupplySources: [],
    temporaryInsurances: [],
    temporaryRunModifiers: [],
    deckState,
    dayState: {
      dayNumber: 1,
      phase: RunPhase.RunInit,
      actionPoints: Math.min(gameConfig.dailyActionPoints, maxActionPoints),
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
      log: ['配置加载完成，等待开始新局。'],
    },
    runLog: ['配置加载完成，等待开始新局。'],
    dealLog: [],
    accidentLog: [],
    rewardLog: [],
    runReport: null,
  };
}

export function createNewGame(gameConfig: GameConfig): RunState {
  const state = createInitialGameState(gameConfig);
  state.phase = RunPhase.DayOpening;
  state.dayState.phase = RunPhase.DayOpening;
  state.runLog = [
    '开始新局。',
    '进入第 1 天。',
    '第 1 天开店。',
    '基础操作、售价预览、爆雷区间和事故预测已启用。',
  ];
  state.dayState.log = [...state.runLog];
  return state;
}
