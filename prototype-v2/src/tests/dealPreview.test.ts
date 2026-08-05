import { describe, it, expect, beforeEach } from 'vitest';
import { createAppRuntime } from '../core/createAppRuntime';
import { createDealPreview } from '../core/rules_deal';
import { buyProduct, selectProduct, selectCustomerOrder, selectPricingMode } from '../core/actions';
import { RunPhase } from '../core/constants';
import type { AppRuntime } from '../core/types';

describe('deal preview', () => {
  let app: AppRuntime;

  beforeEach(() => {
    app = createAppRuntime();
    // 去阶段化：直接通过玩家操作建立一笔可预览的交易（买入 → 选商品/顾客/定价）。
    const candidate = app.state.dayState.productCandidates
      .filter((p) => p.cost <= app.state.cash)
      .sort((a, b) => a.cost - b.cost)[0];
    const firstOrder = app.state.dayState.customerOrders[0];

    if (candidate) {
      buyProduct(app, candidate.id);
      selectProduct(app, candidate.id);
    }
    if (firstOrder) selectCustomerOrder(app, firstOrder.id);
    selectPricingMode(app, 'pricing_normal');
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

  it('canConfirmSell does not depend on phase (de-phased)', () => {
    if (!app.state.dayState.selectedProductId) return;
    app.state.phase = RunPhase.DayPurchase;
    const a = createDealPreview(app)?.canConfirmSell;
    app.state.phase = RunPhase.DaySell;
    const b = createDealPreview(app)?.canConfirmSell;
    expect(a).toBe(b);
  });
});
