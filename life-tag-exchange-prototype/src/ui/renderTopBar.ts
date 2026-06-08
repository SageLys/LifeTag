import type { AppRuntime } from '../core/types';

export function renderTopBar(app: AppRuntime): string {
  const { state } = app;

  return `
    <section class="panel top-bar" aria-label="顶部状态栏">
      <h2>顶部状态栏</h2>
      <dl>
        <div><dt>天数</dt><dd>第 ${state.currentDay} / ${state.maxDays} 天</dd></div>
        <div><dt>阶段</dt><dd>${state.phase}</dd></div>
        <div><dt>现金</dt><dd>${state.cash}</dd></div>
        <div><dt>累计利润</dt><dd>${state.totalProfit} / ${state.targetTotalProfit}</dd></div>
        <div><dt>信誉</dt><dd>${state.reputation} / ${state.maxReputation}</dd></div>
        <div><dt>行动点</dt><dd>${state.dayState.actionPoints}</dd></div>
        <div><dt>库存</dt><dd>${state.inventory.length} / ${app.configs.gameConfig.inventoryLimit}</dd></div>
        <div><dt>手牌</dt><dd>${state.deckState.hand.length}</dd></div>
      </dl>
    </section>
  `;
}
