import type { AppRuntime, BreakdownItem, DealPreview, PricingModeDef } from './types';
import {
  getSelectedCustomerOrder,
  getSelectedPricingMode,
  getSelectedProduct,
} from './selectors';

function getPricingMultiplier(pricingMode: PricingModeDef): number {
  const compatiblePricingMode = pricingMode as PricingModeDef & { multiplier?: number };
  return compatiblePricingMode.priceMultiplier ?? compatiblePricingMode.multiplier ?? 1;
}

function createBreakdownItem(
  id: string,
  label: string,
  value: number | string,
  sourceType: string,
  sourceId: string,
  stat: string,
  op: string,
): BreakdownItem {
  return {
    id,
    label,
    value,
    sourceType,
    sourceId,
    stat,
    op,
    visibleToPlayer: true,
  };
}

export function createDealPreview(app: AppRuntime): DealPreview | null {
  const product = getSelectedProduct(app);
  const customerOrder = getSelectedCustomerOrder(app);
  const pricingMode = getSelectedPricingMode(app);

  if (!product || !customerOrder || !pricingMode) {
    return null;
  }

  const pricingMultiplier = getPricingMultiplier(pricingMode);
  const estimatedPrice = Math.round(product.basePrice * pricingMultiplier);
  const estimatedProfit = estimatedPrice - product.cost;

  return {
    productId: product.id,
    customerOrderId: customerOrder.id,
    pricingModeId: pricingMode.id,
    price: estimatedPrice,
    risk: product.baseRisk,
    estimatedPrice,
    estimatedProfit,
    riskDisplayType: 'placeholder',
    riskMin: product.baseRisk ?? 0,
    riskMax: product.baseRisk ?? 0,
    accidentPreviewText: '爆雷区间与事故预测将在 P0-8 实现',
    priceBreakdown: [
      createBreakdownItem('product_base_price', '商品基础价', product.basePrice, 'product', product.id, 'price', '+'),
      createBreakdownItem(
        'pricing_mode_multiplier',
        `定价方式：${pricingMode.displayName}`,
        `×${pricingMultiplier}`,
        'pricing_mode',
        pricingMode.id,
        'price',
        '*',
      ),
    ],
    riskBreakdown: [
      createBreakdownItem('product_base_risk', '商品基础风险', product.baseRisk, 'product', product.id, 'risk', '+'),
      createBreakdownItem(
        'pricing_mode_risk_placeholder',
        '定价风险占位',
        '真实风险将在 P0-8 实现',
        'pricing_mode',
        pricingMode.id,
        'risk',
        '+',
      ),
    ],
    unknownRiskBreakdown: [],
    warnings: ['当前为 P0-6 交易预览壳，售价、爆雷和事故尚未按完整公式计算。'],
    missingSelections: [],
    canConfirmSell: false,
    disabledReason: '出售结算将在 P0-11 实现',
  };
}

export function refreshDealPreviewIfPossible(app: AppRuntime): void {
  app.state.dayState.currentDealPreview = createDealPreview(app);
}
