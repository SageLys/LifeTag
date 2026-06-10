import { ProductStatus, RunPhase } from '../core/constants';
import { getBuyProductDisabledReason, getInventoryCount } from '../core/selectors';
import type { AppRuntime, ProductInstance } from '../core/types';
import { escapeHtml } from './formatters';
import { formatDarkRiskHint, formatHiddenTagPlaceholders, formatProductStatus, formatTagNames } from './ui_helpers';

function freshnessPercent(product: ProductInstance): number {
  return Math.max(0, Math.min(100, Math.round((product.freshnessCurrent / Math.max(1, product.freshnessMax)) * 100)));
}

function renderProductStats(product: ProductInstance): string {
  return `
    <dl class="item-stats">
      <div><dt>进价</dt><dd class="number">${product.cost}</dd></div>
      <div><dt>基础价</dt><dd class="number">${product.basePrice}</dd></div>
      <div><dt>基础爆雷</dt><dd class="number">${product.baseRisk}</dd></div>
      <div><dt>新鲜度</dt><dd class="number">${freshnessPercent(product)}%</dd></div>
    </dl>
    <div class="freshness-track"><span style="width:${freshnessPercent(product)}%"></span></div>
  `;
}

function renderActionBadges(product: ProductInstance): string {
  const badges = [
    product.flags.sold || product.status === ProductStatus.Sold ? '已售' : null,
    product.flags.identified ? '已鉴定' : product.revealedHiddenTagIds.length > 0 ? '部分鉴定' : null,
    product.flags.packaged ? '已包装' : null,
    product.flags.hasPublicRelation ? '已公关' : null,
    product.suppressedTagIds.length > 0 ? `已洗标 ${product.suppressedTagIds.length}` : null,
    product.flags.spoiled ? '已变质' : null,
  ].filter(Boolean);

  if (badges.length === 0) {
    return '';
  }

  return `<div class="badge-row">${badges.map((badge) => `<span class="tag-chip">${escapeHtml(String(badge))}</span>`).join('')}</div>`;
}

function renderSafeProductInfo(app: AppRuntime, product: ProductInstance): string {
  return `
    <p><strong>显性标签：</strong>${formatTagNames(app, product.visibleTagIds)}</p>
    <p><strong>隐藏标签：</strong>${formatHiddenTagPlaceholders(product)}</p>
    <p><strong>暗风险：</strong>${escapeHtml(formatDarkRiskHint(app, product))}</p>
    ${renderActionBadges(product)}
    ${product.flags.spoiled ? '<p class="warning-text">这块肉已经不太体面了。</p>' : ''}
  `;
}

function renderBuyButton(app: AppRuntime, product: ProductInstance): string {
  const reason = getBuyProductDisabledReason(app, product);
  const isBought = product.status === ProductStatus.Inventory || product.flags.inInventory;
  const label = isBought ? '已买入' : reason ?? '买入';

  return `
    <button
      class="${isBought ? 'secondary-button' : 'confirm-button'}"
      type="button"
      data-action="buy-product"
      data-product-id="${escapeHtml(product.id)}"
      ${reason || isBought ? 'disabled' : ''}
    >${escapeHtml(label)}</button>
    ${reason && !isBought ? `<p class="disabled-reason">${escapeHtml(reason)}</p>` : ''}
  `;
}

function meatArt(index: number): string {
  return `<div class="meat-art meat-${(index % 3) + 1}" aria-hidden="true"></div>`;
}

function renderProductCard(app: AppRuntime, product: ProductInstance, index: number): string {
  const isSelected = app.state.dayState.selectedProductId === product.id;

  return `
    <article class="item-card product-card art-frame art-frame-product ${isSelected ? 'is-selected' : ''}" data-product-kind="candidate" data-product-id="${escapeHtml(product.id)}">
      ${meatArt(index)}
      <h3>${escapeHtml(product.displayName)}</h3>
      ${renderProductStats(product)}
      ${renderSafeProductInfo(app, product)}
      ${renderBuyButton(app, product)}
    </article>
  `;
}

function renderInventoryCard(app: AppRuntime, product: ProductInstance, index: number): string {
  const isSelected = app.state.dayState.selectedProductId === product.id;
  const canSelectForDeal = app.state.phase === RunPhase.DayProcess || app.state.phase === RunPhase.DaySell;
  const disabledReason = !canSelectForDeal
    ? '当前阶段不能选择商品'
    : product.flags.sold || product.status === ProductStatus.Sold
      ? '商品已售出'
      : product.status !== ProductStatus.Inventory
        ? '商品不在库存中'
        : null;

  return `
    <article class="item-card product-card art-frame art-frame-product ${isSelected ? 'is-selected selected' : ''}" data-product-kind="inventory" data-product-id="${escapeHtml(product.id)}">
      ${meatArt(index)}
      <h3>${escapeHtml(product.displayName)}</h3>
      ${isSelected ? '<p class="selection-badge">已放上案板</p>' : ''}
      <p><strong>状态：</strong>${escapeHtml(formatProductStatus(product))}</p>
      ${renderProductStats(product)}
      ${renderSafeProductInfo(app, product)}
      <button
        type="button"
        data-action="select-product"
        data-product-id="${escapeHtml(product.id)}"
        ${disabledReason ? 'disabled' : ''}
      >选择原料</button>
      ${disabledReason ? `<p class="disabled-reason">${escapeHtml(disabledReason)}</p>` : ''}
    </article>
  `;
}

export function renderProducts(app: AppRuntime): string {
  const products = app.state.dayState.productCandidates;
  const content =
    products.length > 0
      ? products.map((product, index) => renderProductCard(app, product, index)).join('')
      : '<p class="empty-note">今日货源还没摆上钩。</p>';

  return `
    <section class="panel products-panel art-frame art-frame-panel" aria-label="今日可进货候选">
      <div class="section-title">
        <h2>今日可进货候选</h2>
        <span>每日上新</span>
      </div>
      <div class="item-list product-grid">${content}</div>
    </section>
  `;
}

export function renderInventoryPanel(app: AppRuntime): string {
  const inventory = app.state.inventory.filter((product) => !product.flags.sold);
  const content =
    inventory.length > 0
      ? inventory.map((product, index) => renderInventoryCard(app, product, index)).join('')
      : '<p class="empty-note">货架空着，接单前最好别太硬气。</p>';

  return `
    <section class="panel inventory-panel art-frame art-frame-panel" aria-label="库存">
      <div class="section-title">
        <h2>库存 / 可加工原料</h2>
        <span>${getInventoryCount(app)} / ${app.configs.gameConfig.inventoryLimit}</span>
      </div>
      <div class="item-list product-grid compact-products">${content}</div>
    </section>
  `;
}
