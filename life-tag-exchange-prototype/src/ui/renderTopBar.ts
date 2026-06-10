import type { AppRuntime } from '../core/types';

function safeNumber(value: number | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function chip(iconClass: string, label: string, value: string | number): string {
  return `
    <div class="status-chip">
      <span class="atlas-icon ${iconClass}" aria-hidden="true"></span>
      <span>${label}</span>
      <strong class="number">${value}</strong>
    </div>
  `;
}

export function renderTopBar(app: AppRuntime): string {
  const { state } = app;
  const actionPoints = safeNumber(state.dayState?.actionPoints);
  const deckCount =
    (state.deckState?.drawPile?.length ?? 0) +
    (state.deckState?.hand?.length ?? 0) +
    (state.deckState?.discardPile?.length ?? 0) +
    (state.deckState?.exhaustPile?.length ?? 0);

  return `
    <section class="top-bar" aria-label="经营状态">
      ${chip('icon-day', '第', `${safeNumber(state.currentDay, 1)}/${safeNumber(state.maxDays, app.configs.gameConfig.runLengthDays)} 天`)}
      ${chip('icon-cash', '现金', safeNumber(state.cash))}
      ${chip('icon-profit', '累计利润', `${safeNumber(state.totalProfit)} / ${safeNumber(state.targetTotalProfit, app.configs.gameConfig.targetTotalProfit)}`)}
      ${chip('icon-reputation', '信誉', `${safeNumber(state.reputation)} / ${safeNumber(state.maxReputation, app.configs.gameConfig.maxReputation)}`)}
      ${chip('icon-ap', '行动点', actionPoints)}
      ${chip('icon-inventory', '库存', `${state.inventory?.filter((item) => !item.flags.sold).length ?? 0} / ${app.configs.gameConfig.inventoryLimit}`)}
      ${chip('icon-hand', '牌库', deckCount)}
    </section>
  `;
}
