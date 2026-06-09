import { AccidentLevel, ProductStatus } from './constants';
import {
  applyAccidentLevelModifiers,
  calculateAccidentOutcome,
  getAccidentLevelByRisk,
  getAccidentLevelLabel,
  getAccidentLevelRange,
} from './rules_accident';
import { calculatePrice } from './rules_price';
import { calculateRisk } from './rules_risk';
import { getActiveMarketEvent, getSelectedCustomerOrder, getSelectedPricingMode, getSelectedProduct } from './selectors';
import type {
  AccidentInstance,
  AppRuntime,
  BreakdownItem,
  CalculationContext,
  DealPreview,
  DealResult,
  RiskBreakdownItem,
} from './types';

function createCalculationContext(app: AppRuntime, mode: CalculationContext['mode']): CalculationContext | null {
  const product = getSelectedProduct(app);
  const customerOrder = getSelectedCustomerOrder(app);
  const pricingMode = getSelectedPricingMode(app);

  if (!product || !customerOrder || !pricingMode) {
    return null;
  }

  return {
    mode,
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
}

function item(id: string, label: string, value: number | string, sourceType = 'system', sourceId = id): BreakdownItem {
  return {
    id,
    label,
    value,
    sourceType,
    sourceId,
    visibleToPlayer: true,
  };
}

function getTopRiskSources(items: RiskBreakdownItem[]): BreakdownItem[] {
  return [...items]
    .sort((left, right) => Math.abs(Number(right.value)) - Math.abs(Number(left.value)))
    .slice(0, 5)
    .map((riskItem, index) => item(`top_risk_${index}`, `主要风险来源：${riskItem.label}`, riskItem.value, riskItem.sourceType, riskItem.sourceId));
}

function buildAccidentChain(params: {
  finalRisk: number;
  baseAccidentLevel: AccidentLevel;
  finalAccidentLevel: AccidentLevel;
  riskBreakdown: RiskBreakdownItem[];
  unknownResolvedBreakdown: RiskBreakdownItem[];
  accidentLevelModifierBreakdown: BreakdownItem[];
  refund: number;
  fine: number;
  reputationLoss: number;
  cashDelta: number;
  totalProfitGain: number;
  context: CalculationContext;
}): BreakdownItem[] {
  const { context } = params;
  const hiddenResolved = params.unknownResolvedBreakdown.filter((entry) => entry.sourceType === 'hidden_tag');
  const darkRiskResolved = params.unknownResolvedBreakdown.filter((entry) => entry.sourceType === 'dark_risk');
  const customerTaboos = params.riskBreakdown.filter((entry) => entry.sourceType === 'customer_taboo');
  const marketItems = params.riskBreakdown.filter((entry) => entry.sourceType === 'market_event');
  const pricingItems = params.riskBreakdown.filter((entry) => entry.sourceType === 'pricing_mode');
  const modifierItems = params.riskBreakdown.filter((entry) => entry.sourceType === 'modifier');
  const baseActionItems = params.riskBreakdown.filter((entry) => entry.sourceType === 'base_action');

  return [
    item('chain_final_risk', `最终爆雷值：${params.finalRisk}`, params.finalRisk),
    item('chain_base_accident_level', `基础事故等级：${getAccidentLevelLabel(params.baseAccidentLevel)}`, params.baseAccidentLevel),
    ...params.accidentLevelModifierBreakdown.map((entry, index) => ({ ...entry, id: `chain_level_modifier_${index}_${entry.id}` })),
    item('chain_final_accident_level', `最终事故等级：${getAccidentLevelLabel(params.finalAccidentLevel)}`, params.finalAccidentLevel),
    ...getTopRiskSources(params.riskBreakdown),
    ...(hiddenResolved.length > 0
      ? hiddenResolved.map((entry, index) => item(`chain_hidden_${index}`, `隐藏标签实际揭示：${entry.label}`, entry.value, entry.sourceType, entry.sourceId))
      : [item('chain_hidden_none', '隐藏标签实际揭示：无新增', 0)]),
    ...(darkRiskResolved.length > 0
      ? darkRiskResolved.map((entry, index) => item(`chain_dark_${index}`, `暗风险实际参与：${entry.label}`, entry.value, entry.sourceType, entry.sourceId))
      : [item('chain_dark_none', '暗风险实际参与：无新增', 0)]),
    ...(customerTaboos.length > 0
      ? customerTaboos.map((entry, index) => item(`chain_customer_taboo_${index}`, `顾客雷区：${entry.label}`, entry.value, entry.sourceType, entry.sourceId))
      : [item('chain_customer_taboo_none', '顾客雷区：未命中', 0, 'customer_order', context.customerOrder.id)]),
    ...(marketItems.length > 0
      ? marketItems.map((entry, index) => item(`chain_market_${index}`, `市场新闻：${entry.label}`, entry.value, entry.sourceType, entry.sourceId))
      : [item('chain_market_none', `市场新闻：${context.marketEvent?.displayName ?? '无'}`, 0, 'market_event', context.marketEvent?.id ?? 'none')]),
    ...(pricingItems.length > 0
      ? pricingItems.map((entry, index) => item(`chain_pricing_${index}`, `定价方式：${entry.label}`, entry.value, entry.sourceType, entry.sourceId))
      : [item('chain_pricing', `定价方式：${context.pricingMode.displayName}`, 0, 'pricing_mode', context.pricingMode.id)]),
    ...(modifierItems.length > 0
      ? modifierItems.map((entry, index) => item(`chain_card_modifier_${index}`, `卡牌修正：${entry.label}`, entry.value, entry.sourceType, entry.sourceId))
      : [item('chain_card_modifier_none', '卡牌修正：无', 0)]),
    ...(baseActionItems.length > 0
      ? baseActionItems.map((entry, index) => item(`chain_base_action_${index}`, `基础操作/店铺被动修正：${entry.label}`, entry.value, entry.sourceType, entry.sourceId))
      : [item('chain_passive_none', '店铺被动修正：无', 0)]),
    item('chain_refund', `退款：${params.refund}`, params.refund),
    item('chain_fine', `罚款：${params.fine}`, params.fine),
    item('chain_reputation_loss', `信誉损失：${params.reputationLoss}`, params.reputationLoss),
    item('chain_cash_delta', `现金变化：${params.cashDelta}`, params.cashDelta),
    item('chain_total_profit_gain', `累计利润变化：${params.totalProfitGain}`, params.totalProfitGain),
  ];
}

export function createDealPreview(app: AppRuntime): DealPreview | null {
  const context = createCalculationContext(app, 'preview');

  if (!context) {
    return null;
  }

  const { product, customerOrder, pricingMode } = context;
  const priceResult = calculatePrice(context);
  const riskResult = calculateRisk(context);
  const accidentPreview = getAccidentLevelRange(riskResult.riskMin, riskResult.riskMax, app.configs.gameConfig);
  const canConfirmSell = app.state.phase === 'DAY_SELL' && product.status === ProductStatus.Inventory && !product.flags.sold;

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
    canConfirmSell,
    disabledReason: canConfirmSell ? null : '请在出售阶段选择库存商品后确认出售',
  };
}

export function refreshDealPreviewIfPossible(app: AppRuntime): void {
  app.state.dayState.currentDealPreview = createDealPreview(app);
}

export function resolveDeal(app: AppRuntime): DealResult {
  const context = createCalculationContext(app, 'resolve');
  if (!context) {
    throw new Error('resolveDeal requires selected product, customer, and pricing mode.');
  }

  const { product, customerOrder, pricingMode } = context;
  const priceResult = calculatePrice(context);
  const riskResult = calculateRisk(context);
  const finalPrice = priceResult.finalPrice;
  const finalRisk = riskResult.exactRisk ?? riskResult.riskMax;
  const baseAccidentLevel = getAccidentLevelByRisk(finalRisk, app.configs.gameConfig);
  const { finalAccidentLevel, accidentLevelModifierBreakdown } = applyAccidentLevelModifiers(context, baseAccidentLevel);
  const outcome = calculateAccidentOutcome(context, finalAccidentLevel, finalPrice);
  const cashDelta = finalPrice - outcome.refund - outcome.fine;
  const singleProfit = finalPrice - product.cost - outcome.refund - outcome.fine;
  const totalProfitGain = Math.max(0, singleProfit);
  const reputationDelta = -outcome.reputationLoss;
  const dealId = `deal_${app.state.runId}_${app.state.currentDay}_${app.state.dealLog.length + 1}`;
  const createdAt = new Date().toISOString();
  const unknownResolvedBreakdown = riskResult.unknownResolvedBreakdown ?? [];
  const accidentChain = buildAccidentChain({
    finalRisk,
    baseAccidentLevel,
    finalAccidentLevel,
    riskBreakdown: riskResult.riskBreakdown,
    unknownResolvedBreakdown,
    accidentLevelModifierBreakdown,
    refund: outcome.refund,
    fine: outcome.fine,
    reputationLoss: outcome.reputationLoss,
    cashDelta,
    totalProfitGain,
    context,
  });

  app.state.cash += cashDelta;
  app.state.totalProfit += totalProfitGain;
  app.state.reputation += reputationDelta;
  app.state.dayState.dailyProfit += totalProfitGain;
  app.state.dayState.maxSingleDealProfit = Math.max(app.state.dayState.maxSingleDealProfit, singleProfit);
  if (finalAccidentLevel !== AccidentLevel.None) {
    app.state.dayState.accidentCount += 1;
  }
  if (pricingMode.id === 'pricing_blind_box') {
    app.state.dayState.blindBoxDealAccidentLevels.push(finalAccidentLevel);
  }
  for (const modifier of app.state.temporaryRunModifiers) {
    if (modifier.stat === 'risk' && modifier.target === 'sell_product' && modifier.consumed < modifier.uses) {
      modifier.consumed += 1;
      app.state.runLog.push(`第 ${app.state.currentDay} 天：临时效果触发：${modifier.displayName}。`);
      app.state.dayState.log.push(`第 ${app.state.currentDay} 天：临时效果触发：${modifier.displayName}。`);
    }
  }
  app.state.temporaryRunModifiers = app.state.temporaryRunModifiers.filter((modifier) => modifier.consumed < modifier.uses);
  product.status = ProductStatus.Sold;
  product.flags.sold = true;
  app.state.dayState.soldProductCount += 1;
  app.state.dayState.selectedProductId = null;
  app.state.dayState.currentDealPreview = null;

  let accident: AccidentInstance | undefined;
  if (finalAccidentLevel !== AccidentLevel.None) {
    const accidentDef = app.index.accidentsByLevel.get(finalAccidentLevel);
    accident = {
      accidentInstanceId: `accident_${dealId}`,
      dealId,
      day: app.state.currentDay,
      level: finalAccidentLevel,
      title: accidentDef?.displayName ?? getAccidentLevelLabel(finalAccidentLevel),
      text: accidentDef?.accidentText ?? `${getAccidentLevelLabel(finalAccidentLevel)}发生。`,
      finalRisk,
      refund: outcome.refund,
      fine: outcome.fine,
      reputationLoss: outcome.reputationLoss,
      cashDelta,
      totalProfitGain,
      chain: accidentChain,
      relatedTags: [...new Set([...product.visibleTagIds, ...product.revealedHiddenTagIds, ...product.hiddenTagIds, ...product.appliedTagIds])],
      relatedDarkRiskIds: [...product.darkRiskIds],
      relatedCustomerId: customerOrder.customerId,
      relatedMarketEventId: context.marketEvent?.id ?? null,
      relatedPricingModeId: pricingMode.id,
      createdAt,
      id: `accident_${dealId}`,
      risk: finalRisk,
      loss: outcome.refund + outcome.fine,
      darkRiskIds: [...product.darkRiskIds],
      accidentText: accidentDef?.accidentText ?? `${getAccidentLevelLabel(finalAccidentLevel)}发生。`,
    };
  }

  return {
    dealId,
    day: app.state.currentDay,
    productInstanceId: product.id,
    productDisplayName: product.displayName,
    customerOrderId: customerOrder.id,
    customerDisplayName: customerOrder.displayName,
    pricingModeId: pricingMode.id,
    pricingModeDisplayName: pricingMode.displayName,
    finalPrice,
    finalRisk,
    baseAccidentLevel,
    finalAccidentLevel,
    refundRate: outcome.refundRate,
    refund: outcome.refund,
    fine: outcome.fine,
    reputationLoss: outcome.reputationLoss,
    cashDelta,
    singleProfit,
    totalProfitGain,
    reputationDelta,
    currentCash: app.state.cash,
    currentTotalProfit: app.state.totalProfit,
    currentReputation: app.state.reputation,
    priceBreakdown: priceResult.priceBreakdown,
    riskBreakdown: riskResult.riskBreakdown,
    unknownResolvedBreakdown,
    accidentLevelModifierBreakdown,
    accidentOutcomeBreakdown: outcome.accidentOutcomeBreakdown,
    accidentChain,
    createdAt,
    accepted: true,
    accident,
  };
}
