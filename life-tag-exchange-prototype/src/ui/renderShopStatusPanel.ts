import type { AppRuntime } from '../core/types';
import { escapeHtml } from './formatters';

export function renderShopStatusPanel(app: AppRuntime): string {
  const passives = app.state.activePassives
    .map((passive) => app.index.passivesById.get(passive.passiveId)?.displayName ?? passive.passiveId)
    .join('、') || '暂无';
  const sources = app.state.activeSupplySources
    .map((source) => app.index.supplySourcesById.get(source.supplySourceId)?.displayName ?? source.supplySourceId)
    .join('、') || '暂无';
  const inventory = app.state.inventory.filter((product) => !product.flags.sold).length;

  return `
    <section class="panel shop-status-panel art-frame art-frame-shop-status" aria-label="店铺状态">
      <div class="section-title"><h2>店铺状态</h2><span>构筑</span></div>
      <dl class="compact-stats">
        <div><dt>现金</dt><dd class="number">${app.state.cash}</dd></div>
        <div><dt>信誉</dt><dd class="number">${app.state.reputation}</dd></div>
        <div><dt>行动点</dt><dd class="number">${app.state.dayState.actionPoints}</dd></div>
        <div><dt>库存</dt><dd class="number">${inventory} / ${app.configs.gameConfig.inventoryLimit}</dd></div>
      </dl>
      <p><strong>店铺被动：</strong>${escapeHtml(passives)}</p>
      <p><strong>货源倾向：</strong>${escapeHtml(sources)}</p>
    </section>
  `;
}
