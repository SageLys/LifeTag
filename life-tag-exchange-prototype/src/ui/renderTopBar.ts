import type { AppRuntime } from '../core/types';

function safeNumber(value: number | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function renderTopBar(app: AppRuntime): string {
  const { state } = app;
  const actionPoints = safeNumber(state.dayState?.actionPoints);
  const drawPileCount = state.deckState?.drawPile?.length ?? 0;
  const handCount = state.deckState?.hand?.length ?? 0;

  return `
    <section class="panel top-bar" aria-label="HeaderStatusBar">
      <h2>HeaderStatusBar</h2>
      <p class="status-line">
        第 ${safeNumber(state.currentDay, 1)} / ${safeNumber(state.maxDays, app.configs.gameConfig.runLengthDays)} 天｜
        ${state.phase ?? 'RUN_INIT'}｜
        现金 ${safeNumber(state.cash)}｜
        累计利润 ${safeNumber(state.totalProfit)} / ${safeNumber(state.targetTotalProfit, app.configs.gameConfig.targetTotalProfit)}｜
        信誉 ${safeNumber(state.reputation)} / ${safeNumber(state.maxReputation, app.configs.gameConfig.maxReputation)}｜
        行动点 ${actionPoints}｜
        库存 ${state.inventory?.length ?? 0} / ${app.configs.gameConfig.inventoryLimit}｜
        手牌 ${handCount}｜
        抽牌堆 ${drawPileCount}
      </p>
      <dl>
        <div><dt>阶段</dt><dd>${state.phase ?? 'RUN_INIT'}</dd></div>
        <div><dt>天数</dt><dd>第 ${safeNumber(state.currentDay, 1)} / ${safeNumber(state.maxDays, app.configs.gameConfig.runLengthDays)} 天</dd></div>
        <div><dt>现金</dt><dd>${safeNumber(state.cash)}</dd></div>
        <div><dt>累计利润</dt><dd>${safeNumber(state.totalProfit)} / ${safeNumber(state.targetTotalProfit, app.configs.gameConfig.targetTotalProfit)}</dd></div>
        <div><dt>信誉</dt><dd>${safeNumber(state.reputation)} / ${safeNumber(state.maxReputation, app.configs.gameConfig.maxReputation)}</dd></div>
        <div><dt>行动点</dt><dd>${actionPoints}</dd></div>
        <div><dt>库存</dt><dd>${state.inventory?.length ?? 0} / ${app.configs.gameConfig.inventoryLimit}</dd></div>
        <div><dt>手牌</dt><dd>${handCount}</dd></div>
        <div><dt>抽牌堆</dt><dd>${drawPileCount}</dd></div>
      </dl>
    </section>
  `;
}
