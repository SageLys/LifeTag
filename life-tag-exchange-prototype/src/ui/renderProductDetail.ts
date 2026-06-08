import type { AppRuntime } from '../core/types';
import { escapeHtml } from './formatters';
import { formatDarkRiskHint, formatHiddenTagPlaceholders, formatProductStatus, formatTagNames } from './ui_helpers';

export function renderProductDetail(app: AppRuntime): string {
  const product =
    app.state.dayState.productCandidates.find((candidate) => candidate.id === app.state.dayState.selectedProductId) ??
    app.state.inventory.find((inventoryProduct) => inventoryProduct.id === app.state.dayState.selectedProductId);

  if (!product) {
    return `
      <section class="panel" aria-label="商品详情">
        <h2>商品详情</h2>
        <p>当前没有选中商品。点击商品候选或库存商品可查看 P0-5 安全详情。</p>
      </section>
    `;
  }

  return `
    <section class="panel" aria-label="商品详情">
      <h2>商品详情</h2>
      <h3>${escapeHtml(product.displayName)}</h3>
      ${product.description ? `<p>${escapeHtml(product.description)}</p>` : ''}
      <p><strong>当前状态：</strong>${formatProductStatus(product)}</p>
      <dl class="item-stats">
        <div><dt>进价</dt><dd>${product.cost}</dd></div>
        <div><dt>基础价</dt><dd>${product.basePrice}</dd></div>
        <div><dt>基础风险</dt><dd>${product.baseRisk}</dd></div>
        <div><dt>新鲜度</dt><dd>${product.freshnessCurrent} / ${product.freshnessMax}</dd></div>
      </dl>
      <p><strong>显性标签：</strong>${formatTagNames(app, product.visibleTagIds)}</p>
      <p><strong>隐藏标签：</strong>${formatHiddenTagPlaceholders(product)}</p>
      <p><strong>暗风险：</strong>${escapeHtml(formatDarkRiskHint(app, product))}</p>
      <p class="hint-text">商品实例 ID：${escapeHtml(product.id)}</p>
      <p class="hint-text">未揭示隐藏标签与暗风险详情不会在 P0-5 泄露。</p>
    </section>
  `;
}
