import { describe, it, expect, beforeEach } from 'vitest';
import { createAppRuntime } from '../core/createAppRuntime';
import { createDealPreview } from '../core/rules_deal';
import { RunPhase } from '../core/constants';
import type { AppRuntime } from '../core/types';

describe('deal preview', () => {
  let app: AppRuntime;

  beforeEach(() => {
    app = createAppRuntime();
    // Set up a minimal selection for preview
    const firstProduct = app.state.dayState.productCandidates[0];
    const firstOrder = app.state.dayState.customerOrders[0];
    const firstPricingMode = app.configs.pricingModes[0];

    if (firstProduct) app.state.dayState.selectedProductId = firstProduct.id;
    if (firstOrder) app.state.dayState.selectedCustomerOrderId = firstOrder.id;
    if (firstPricingMode) app.state.dayState.selectedPricingModeId = firstPricingMode.id;
  });

  it('returns null without selections', () => {
    app.state.dayState.selectedProductId = null;
    app.state.dayState.selectedCustomerOrderId = null;
    app.state.dayState.selectedPricingModeId = null;
    const preview = createDealPreview(app);
    expect(preview).toBeNull();
  });

  it('returns a DealPreview with all required fields when selections present', () => {
    if (!app.state.dayState.selectedProductId) return; // skip if no products
    const preview = createDealPreview(app);
    expect(preview).not.toBeNull();
    if (!preview) return;

    expect(preview.productId).toBeTruthy();
    expect(preview.customerOrderId).toBeTruthy();
    expect(preview.pricingModeId).toBeTruthy();
    expect(typeof preview.estimatedPrice).toBe('number');
    expect(typeof preview.estimatedProfit).toBe('number');
    expect(typeof preview.riskMin).toBe('number');
    expect(typeof preview.riskMax).toBe('number');
    expect(preview.riskMin).toBeLessThanOrEqual(preview.riskMax);
    expect(Array.isArray(preview.priceBreakdown)).toBe(true);
    expect(Array.isArray(preview.riskBreakdown)).toBe(true);
    expect(Array.isArray(preview.warnings)).toBe(true);
    expect(typeof preview.canConfirmSell).toBe('boolean');
  });

  it('estimatedPrice is positive when product and order selected', () => {
    if (!app.state.dayState.selectedProductId) return;
    const preview = createDealPreview(app);
    if (!preview) return;
    expect(preview.estimatedPrice).toBeGreaterThan(0);
  });

  it('accidentPreview has level fields', () => {
    if (!app.state.dayState.selectedProductId) return;
    const preview = createDealPreview(app);
    if (!preview) return;
    expect(preview.accidentPreview.levelMin).toBeTruthy();
    expect(preview.accidentPreview.levelMax).toBeTruthy();
  });

  it('canConfirmSell is false outside DAY_SELL phase', () => {
    app.state.phase = RunPhase.DayPurchase;
    if (!app.state.dayState.selectedProductId) return;
    const preview = createDealPreview(app);
    if (!preview) return;
    expect(preview.canConfirmSell).toBe(false);
  });
});
