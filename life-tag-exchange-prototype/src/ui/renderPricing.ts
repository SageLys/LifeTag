import { RunPhase } from '../core/constants';
import { getInventoryProductById, hasUnknownProductInfo } from '../core/selectors';
import type { AppRuntime, PricingModeDef } from '../core/types';
import { escapeHtml } from './formatters';

function getPricingDisabledReason(app: AppRuntime, pricingMode: PricingModeDef): string | null {
  const isPricingPhase = app.state.phase === RunPhase.DayProcess || app.state.phase === RunPhase.DaySell;
  if (!isPricingPhase) {
    return '只能在处理或出售阶段选择定价。';
  }

  if (pricingMode.id !== 'pricing_blind_box') {
    return null;
  }

  const selectedProduct = getInventoryProductById(app, app.state.dayState.selectedProductId ?? '');
  if (!selectedProduct) {
    return '请选择商品后判断是否可用。';
  }

  if (!hasUnknownProductInfo(selectedProduct)) {
    return '该商品没有未知信息，不能使用盲盒价。';
  }

  return null;
}

function renderPricingCard(app: AppRuntime, pricingMode: PricingModeDef): string {
  const isSelected = app.state.dayState.selectedPricingModeId === pricingMode.id;
  const disabledReason = getPricingDisabledReason(app, pricingMode);

  return `
    <article class="item-card pricing-card ${isSelected ? 'is-selected selected' : ''}">
      <h3>${escapeHtml(pricingMode.displayName)}</h3>
      <dl class="item-stats">
        <div><dt>价格倍率</dt><dd>×${pricingMode.priceMultiplier}</dd></div>
        <div><dt>风险修正</dt><dd>${pricingMode.riskDelta}</dd></div>
        <div><dt>成功修正</dt><dd>${pricingMode.successDelta}</dd></div>
        <div><dt>模式</dt><dd>${escapeHtml(pricingMode.mode)}</dd></div>
      </dl>
      ${isSelected ? '<p class="selection-badge">已选定价</p>' : ''}
      <button
        type="button"
        data-action="select-pricing-mode"
        data-pricing-mode-id="${escapeHtml(pricingMode.id)}"
        ${disabledReason ? 'disabled' : ''}
      >选择定价</button>
      ${disabledReason ? `<p class="disabled-reason">${escapeHtml(disabledReason)}</p>` : ''}
    </article>
  `;
}

export function renderPricing(app: AppRuntime): string {
  const content = app.configs.pricingModes.map((pricingMode) => renderPricingCard(app, pricingMode)).join('');

  return `
    <section class="panel pricing-panel" aria-label="定价方式">
      <h2>定价方式</h2>
      <p class="hint-text">选择定价后会刷新售价、爆雷区间和事故预测。</p>
      <div class="item-list">${content}</div>
    </section>
  `;
}
