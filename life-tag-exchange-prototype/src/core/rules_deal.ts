import { calculatePrice } from './rules_price';
import {
  getActiveMarketEvent,
  getSelectedCustomerOrder,
  getSelectedPricingMode,
  getSelectedProduct,
} from './selectors';
import type { AppRuntime, CalculationContext, BreakdownItem, DealPreview } from './types';

function createRiskPlaceholder(productId: string, baseRisk: number): BreakdownItem[] {
  return [
    {
      id: 'product_base_risk',
      label: '商品基础风险占位',
      value: baseRisk,
      sourceId: productId,
      sourceType: 'product',
      stat: 'risk',
      op: 'add',
      visibleToPlayer: true,
    },
  ];
}

export function createDealPreview(app: AppRuntime): DealPreview | null {
  const product = getSelectedProduct(app);
  const customerOrder = getSelectedCustomerOrder(app);
  const pricingMode = getSelectedPricingMode(app);

  if (!product || !customerOrder || !pricingMode) {
    return null;
  }

  const context: CalculationContext = {
    mode: 'preview',
    runState: app.state,
    dayState: app.state.dayState,
    deckState: app.state.deckState,
    product,
    customerOrder,
    pricingMode,
    marketEvent: getActiveMarketEvent(app),
    activePassives: app.state.activePassives,
    activeSupplySources: app.state.activeSupplySources,
    configTables: app.configs,
    indexes: app.index,
  };
  const priceResult = calculatePrice(context);
  const baseRisk = product.baseRisk ?? 0;

  return {
    productId: product.id,
    customerOrderId: customerOrder.id,
    pricingModeId: pricingMode.id,
    price: priceResult.finalPrice,
    risk: baseRisk,
    estimatedPrice: priceResult.finalPrice,
    estimatedProfit: priceResult.estimatedProfit,
    rawPrice: priceResult.rawPrice,
    priceBeforeBudgetCap: priceResult.priceBeforeBudgetCap,
    effectiveBudget: priceResult.effectiveBudget,
    riskDisplayType: 'placeholder',
    riskMin: baseRisk,
    riskMax: baseRisk,
    accidentPreviewText: '爆雷区间与事故预测将在 P0-8 实现',
    priceBreakdown: priceResult.priceBreakdown,
    riskBreakdown: createRiskPlaceholder(product.id, baseRisk),
    unknownRiskBreakdown: [],
    warnings: [...priceResult.warnings, '风险、爆雷和事故预测仍为 P0-8 占位。'],
    missingSelections: [],
    canConfirmSell: false,
    disabledReason: '出售结算将在 P0-11 实现',
  };
}

export function refreshDealPreviewIfPossible(app: AppRuntime): void {
  app.state.dayState.currentDealPreview = createDealPreview(app);
}
