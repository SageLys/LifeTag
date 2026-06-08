import type { AppRuntime, ProductInstance } from '../core/types';
import { escapeHtml } from './formatters';
import { formatDarkRiskHint, formatHiddenTagPlaceholders, formatTagNames } from './ui_helpers';

function renderProductCard(app: AppRuntime, product: ProductInstance): string {
  const isSelected = app.state.dayState.selectedProductId === product.id;

  return `
    <article class="item-card ${isSelected ? 'is-selected' : ''}" data-product-id="${escapeHtml(product.id)}">
      <h3>${escapeHtml(product.displayName)}</h3>
      <dl class="item-stats">
        <div><dt>进价</dt><dd>${product.cost}</dd></div>
        <div><dt>基础价</dt><dd>${product.basePrice}</dd></div>
        <div><dt>基础风险</dt><dd>${product.baseRisk}</dd></div>
        <div><dt>新鲜度</dt><dd>${product.freshnessCurrent} / ${product.freshnessMax}</dd></div>
      </dl>
      <p><strong>显性标签：</strong>${formatTagNames(app, product.visibleTagIds)}</p>
      <p><strong>隐藏标签：</strong>${formatHiddenTagPlaceholders(product)}</p>
      <p><strong>暗风险：</strong>${escapeHtml(formatDarkRiskHint(app, product))}</p>
      <button type="button" disabled>下一阶段实现买入</button>
    </article>
  `;
}

export function renderProducts(app: AppRuntime): string {
  const products = app.state.dayState.productCandidates;
  const content =
    products.length > 0
      ? products.map((product) => renderProductCard(app, product)).join('')
      : '<p>暂无商品候选。推进到 DAY_PURCHASE 后生成今日商品候选。</p>';

  return `
    <section class="panel products-panel" aria-label="商品区">
      <h2>商品候选</h2>
      <p class="hint-text">P0-3 只生成候选，不开放进货。</p>
      <div class="item-list">${content}</div>
    </section>
  `;
}
