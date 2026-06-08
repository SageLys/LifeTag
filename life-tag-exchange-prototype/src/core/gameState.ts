import { FailReason, RunPhase, RunResult } from './constants';
import type { DeckState, GameConfig, RunState } from './types';

/**
 * 职责：创建和维护局内运行状态。
 * 本阶段只提供初始状态创建，不实现每日流程。
 * TODO：Step 1 接入阶段状态机；Step 4 接入抽牌、洗牌、弃牌和卡牌实例迁移细节。
 */
function createInitialDeckState(gameConfig: GameConfig): DeckState {
  const drawPile = gameConfig.initialDeck.flatMap((entry) =>
    Array.from({ length: entry.count }, (_, index) => ({
      id: `${entry.cardId}_${index + 1}`,
      cardId: entry.cardId,
      upgraded: false,
    })),
  );

  return {
    drawPile,
    hand: [],
    discardPile: [],
    exhaustPile: [],
  };
}

export function createInitialGameState(gameConfig: GameConfig): RunState {
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
    inventory: [],
    activePassives: [],
    activeSupplySources: [],
    deckState: createInitialDeckState(gameConfig),
    dayState: {
      dayNumber: 1,
      phase: RunPhase.RunInit,
      actionPoints: gameConfig.dailyActionPoints,
      marketEventIds: [],
      productCandidateIds: [],
      customerOrderIds: [],
      rewardOptionIds: [],
      boughtProductCount: 0,
      soldProductCount: 0,
      selectedProductId: null,
      selectedCustomerOrderId: null,
      selectedPricingModeId: null,
      currentDealPreview: null,
      temporaryDayModifiers: [],
      phaseFlags: {},
      log: ['配置加载完成，等待开始新局。'],
    },
    runLog: ['配置加载完成，等待开始新局。'],
    dealLog: [],
    accidentLog: [],
    rewardLog: [],
  };
}
