import { RunPhase } from '../core/constants';
import { getInventoryProductById, hasUnknownProductInfo } from '../core/selectors';
import type { AppRuntime, PricingModeDef } from '../core/types';
import { escapeHtml } from './formatters';

function getPricingDisabledReason(app: AppRuntime, pricingMode: PricingModeDef): string | null {
  const isPricingPhase = app.state.phase === RunPhase.DayProcess || app.state.phase === RunPhase.DaySell;
  if (!isPricingPhase) {
    return '只能在加工或出售阶段选择定价';
  }

  if (pricingMode.id !== 'pricing_blind_box') {
    return null;
  }

  const selectedProduct = getInventoryProductById(app, app.state.dayState.selectedProductId ?? '');
  if (!selectedProduct) {
    return '请先选择商品';
  }

  if (!hasUnknownProductInfo(selectedProduct)) {
    return '没有未知信息，不能使用盲盒价';
  }

  return null;
}

function renderPricingCard(app: AppRuntime, pricingMode: PricingModeDef): string {
  const isSelected = app.state.dayState.selectedPricingModeId === pricingMode.id;
  const disabledReason = getPricingDisabledReason(app, pricingMode);

  return `
    <button
      class="pricing-pill ${isSelected ? 'is-selected' : ''}"
      type="button"
      data-action="select-pricing-mode"
      data-pricing-mode-id="${escapeHtml(pricingMode.id)}"
      title="价格 x${pricingMode.priceMultiplier}，爆雷 ${pricingMode.riskDelta >= 0 ? '+' : ''}${pricingMode.riskDelta}"
      ${disabledReason ? 'disabled' : ''}
    >
      ${escapeHtml(pricingMode.displayName)}
    </button>
  `;
}

export function renderPricing(app: AppRuntime): string {
  const content = app.configs.pricingModes.map((pricingMode) => renderPricingCard(app, pricingMode)).join('');

  return `
    <section class="pricing-panel" aria-label="定价方式">
      <h2>定价方式</h2>
      <div class="pricing-row">${content}</div>
    </section>
  `;
}
