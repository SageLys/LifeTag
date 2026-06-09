import { getAccidentLevelRange } from './rules_accident';
import { calculatePrice } from './rules_price';
import { calculateRisk } from './rules_risk';
import {
  getActiveMarketEvent,
  getSelectedCustomerOrder,
  getSelectedPricingMode,
  getSelectedProduct,
} from './selectors';
import type { AppRuntime, CalculationContext, DealPreview } from './types';

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
  const riskResult = calculateRisk(context);
  const accidentPreview = getAccidentLevelRange(riskResult.riskMin, riskResult.riskMax, app.configs.gameConfig);

  return {
    productId: product.id,
    customerOrderId: customerOrder.id,
    pricingModeId: pricingMode.id,
    price: priceResult.finalPrice,
    risk: riskResult.exactRisk ?? riskResult.riskMax,
    estimatedPrice: priceResult.finalPrice,
    estimatedProfit: priceResult.estimatedProfit,
    rawPrice: priceResult.rawPrice,
    priceBeforeBudgetCap: priceResult.priceBeforeBudgetCap,
    effectiveBudget: priceResult.effectiveBudget,
    riskDisplayType: riskResult.riskDisplayType,
    knownRisk: riskResult.knownRisk,
    riskMin: riskResult.riskMin,
    riskMax: riskResult.riskMax,
    exactRisk: riskResult.exactRisk,
    accidentPreview,
    priceBreakdown: priceResult.priceBreakdown,
    riskBreakdown: riskResult.riskBreakdown,
    unknownRiskBreakdown: riskResult.unknownRiskBreakdown,
    warnings: [...priceResult.warnings, ...riskResult.warnings],
    missingSelections: [],
    canConfirmSell: false,
    disabledReason: '出售结算将在 P0-11 实现',
  };
}

export function refreshDealPreviewIfPossible(app: AppRuntime): void {
  app.state.dayState.currentDealPreview = createDealPreview(app);
}
