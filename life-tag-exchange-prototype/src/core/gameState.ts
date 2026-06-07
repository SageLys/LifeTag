import { FailReason, RunPhase, RunResult } from './constants';
import type { ConfigIndex, GameConfig, RunState } from './types';

/**
 * 职责：创建和维护局内运行状态。
 * 参考文档：03_数据结构规格.md、07_HTML技术实现规格.md。
 * 本阶段状态：只提供初始状态创建，不实现每日流程。
 * TODO：接入每日生成、抽牌、交易、奖励和结局状态迁移。
 */
export function createInitialGameState(gameConfig: GameConfig, index: ConfigIndex): RunState {
  return {
    runId: `run_${Date.now()}`,
    phase: RunPhase.Setup,
    result: RunResult.InProgress,
    failReason: FailReason.None,
    day: 1,
    cash: gameConfig.initialCash,
    reputation: gameConfig.initialReputation,
    accidentInsurance: 0,
    deck: {
      drawPile: [...gameConfig.initialDeckCardIds],
      hand: [],
      discardPile: [],
      exhaustedPile: [],
    },
    activePassiveIds: [],
    supplySourceIds: [...index.supplySourcesById.keys()].slice(0, 1),
    products: [],
    customerOrders: [],
    currentDay: {
      day: 1,
      phase: RunPhase.Setup,
      actionPoints: gameConfig.dailyActionPoints,
      marketEventIds: [],
      productIds: [],
      customerOrderIds: [],
      log: ['配置加载完成，等待开始新局。'],
    },
    runLog: ['配置加载完成，等待开始新局。'],
  };
}
