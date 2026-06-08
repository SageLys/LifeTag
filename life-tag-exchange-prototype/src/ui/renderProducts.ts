import { ProductStatus } from '../core/constants';
import { getBuyProductDisabledReason, getInventoryCount } from '../core/selectors';
import type { AppRuntime, ProductInstance } from '../core/types';
import { escapeHtml } from './formatters';
import { formatDarkRiskHint, formatHiddenTagPlaceholders, formatProductStatus, formatTagNames } from './ui_helpers';

function renderProductStats(product: ProductInstance): string {
  return `
    <dl class="item-stats">
      <div><dt>进价</dt><dd>${product.cost}</dd></div>
      <div><dt>基础价</dt><dd>${product.basePrice}</dd></div>
      <div><dt>基础风险</dt><dd>${product.baseRisk}</dd></div>
      <div><dt>新鲜度</dt><dd>${product.freshnessCurrent} / ${product.freshnessMax}</dd></div>
    </dl>
  `;
}

function renderSafeProductInfo(app: AppRuntime, product: ProductInstance): string {
  return `
    <p><strong>显性标签：</strong>${formatTagNames(app, product.visibleTagIds)}</p>
    <p><strong>隐藏标签：</strong>${formatHiddenTagPlaceholders(product)}</p>
    <p><strong>暗风险：</strong>${escapeHtml(formatDarkRiskHint(app, product))}</p>
    ${product.flags.spoiled ? '<p class="warning-text">已变质</p>' : ''}
  `;
}

function renderBuyButton(app: AppRuntime, product: ProductInstance): string {
  const reason = getBuyProductDisabledReason(app, product);
  const isBought = product.status === ProductStatus.Inventory || product.flags.inInventory;
  const label = reason ?? '买入';

  return `
    <button
      type="button"
      data-action="buy-product"
      data-product-id="${escapeHtml(product.id)}"
      ${reason ? 'disabled' : ''}
    >${isBought ? '已买入' : escapeHtml(label)}</button>
    ${reason && !isBought ? `<p class="disabled-reason">${escapeHtml(reason)}</p>` : ''}
  `;
}

function renderProductCard(app: AppRuntime, product: ProductInstance): string {
  const isSelected = app.state.dayState.selectedProductId === product.id;

  return `
    <article class="item-card ${isSelected ? 'is-selected' : ''}" data-product-id="${escapeHtml(product.id)}">
      <h3>${escapeHtml(product.displayName)}</h3>
      ${renderProductStats(product)}
      ${renderSafeProductInfo(app, product)}
      ${renderBuyButton(app, product)}
    </article>
  `;
}

function renderInventoryCard(app: AppRuntime, product: ProductInstance): string {
  const isSelected = app.state.dayState.selectedProductId === product.id;

  return `
    <article class="item-card ${isSelected ? 'is-selected' : ''}" data-product-id="${escapeHtml(product.id)}">
      <h3>${escapeHtml(product.displayName)}</h3>
      <p><strong>状态：</strong>${formatProductStatus(product)}</p>
      ${renderProductStats(product)}
      ${renderSafeProductInfo(app, product)}
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
      <p class="hint-text">P0-4 可在进货阶段买入商品；买入后进入库存，不影响累计利润。</p>
      <div class="item-list">${content}</div>
    </section>
  `;
}

export function renderInventoryPanel(app: AppRuntime): string {
  const inventory = app.state.inventory;
  const content =
    inventory.length > 0
      ? inventory.map((product) => renderInventoryCard(app, product)).join('')
      : '<p>暂无库存。请在进货阶段买入商品。</p>';

  return `
    <section class="panel inventory-panel" aria-label="库存区">
      <h2>库存</h2>
      <p class="hint-text">库存数量：${getInventoryCount(app)} / ${app.configs.gameConfig.inventoryLimit}</p>
      <div class="item-list">${content}</div>
    </section>
  `;
}
