import type {
  BreakdownItem,
  CalculationContext,
  CustomerOrder,
  Modifier,
  PriceResult,
  ProductInstance,
  TagConflictDef,
} from './types';
import {
  getCustomerBudget,
  getCustomerPreferenceBonus,
  getCustomerPreferredTagIds,
} from './selectors';
import { evaluateCalculationCondition } from './rules_calculation_conditions';

function item(
  id: string,
  label: string,
  stat: string,
  op: string,
  value: number | string,
  sourceType: string,
  sourceId: string,
): BreakdownItem {
  return {
    id,
    label,
    stat,
    op,
    value,
    sourceType,
    sourceId,
    visibleToPlayer: true,
  };
}

function getNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getProductBasePrice(product: ProductInstance, warnings: string[]): number {
  const compatibleProduct = product as ProductInstance & { baseValue?: number; templateBasePrice?: number; price?: number };
  const price = compatibleProduct.basePrice ?? compatibleProduct.baseValue ?? compatibleProduct.templateBasePrice ?? compatibleProduct.price;
  if (typeof price !== 'number') {
    warnings.push('商品基础价缺失，使用 0。');
    return 0;
  }
  return price;
}

function getProductCost(product: ProductInstance, warnings: string[]): number {
  const compatibleProduct = product as ProductInstance & { baseCost?: number; purchaseCost?: number };
  const cost = compatibleProduct.cost ?? compatibleProduct.baseCost ?? compatibleProduct.purchaseCost;
  if (typeof cost !== 'number') {
    warnings.push('商品进价缺失，预计利润使用成本 0。');
    return 0;
  }
  return cost;
}

function getEffectiveKnownTagIds(product: ProductInstance): string[] {
  const compatibleProduct = product as ProductInstance & {
    temporaryTagIds?: string[];
    hiddenTags?: Array<{ tagId: string; revealed?: boolean }>;
  };
  const revealedStructuredHiddenTags =
    compatibleProduct.hiddenTags?.filter((hiddenTag) => hiddenTag.revealed).map((hiddenTag) => hiddenTag.tagId) ?? [];
  const tagIds = [
    ...product.visibleTagIds,
    ...product.revealedHiddenTagIds,
    ...revealedStructuredHiddenTags,
    ...product.appliedTagIds,
    ...(compatibleProduct.temporaryTagIds ?? []),
  ];

  return [...new Set(tagIds.filter(Boolean))];
}

function getEffectivePriceTagIds(context: CalculationContext): string[] {
  if (context.mode !== 'resolve') {
    return getEffectiveKnownTagIds(context.product);
  }

  return [...new Set([...getEffectiveKnownTagIds(context.product), ...context.product.hiddenTagIds].filter(Boolean))];
}

function getTagLabel(context: CalculationContext, tagId: string): string {
  return context.indexes.tagsById.get(tagId)?.displayName ?? tagId;
}

function isSuppressed(product: ProductInstance, tagId: string): boolean {
  return product.suppressedTagIds.includes(tagId);
}

function applyCustomerPreference(context: CalculationContext, customerOrder: CustomerOrder, tagId: string, warnings: string[]): number {
  const preferredTagIds = getCustomerPreferredTagIds(customerOrder);
  if (!preferredTagIds.includes(tagId)) {
    return 0;
  }
  const bonus = getCustomerPreferenceBonus(customerOrder, tagId);
  if (!Number.isFinite(bonus)) {
    warnings.push(`顾客偏好 ${tagId} 加价缺失，按 0 处理。`);
    return 0;
  }
  void context;
  return bonus;
}

function applyTagRelations(
  context: CalculationContext,
  knownTagIds: string[],
  product: ProductInstance,
  breakdown: BreakdownItem[],
  warnings: string[],
): number {
  let delta = 0;
  const knownTagSet = new Set(knownTagIds);

  for (const relation of context.configTables.tagConflicts as TagConflictDef[]) {
    if (!knownTagSet.has(relation.tagA) || !knownTagSet.has(relation.tagB)) {
      continue;
    }
    const hasSuppressedTag = isSuppressed(product, relation.tagA) || isSuppressed(product, relation.tagB);
    const priceDelta = hasSuppressedTag ? 0 : getNumber(relation.priceDelta, 0);
    delta += priceDelta;
    const relationLabel = relation.relationType === 'support' ? '支撑关系' : '冲突关系';
    breakdown.push(
      item(
        relation.id,
        `[${getTagLabel(context, relation.tagA)}] + [${getTagLabel(context, relation.tagB)}] ${relationLabel}${hasSuppressedTag ? '（含已压制标签）' : ''}`,
        'price',
        'add',
        priceDelta,
        'tag_relation',
        relation.id,
      ),
    );
    if (!Number.isFinite(relation.priceDelta)) {
      warnings.push(`标签关系 ${relation.id} 缺少 priceDelta，按 0 处理。`);
    }
  }

  return delta;
}

function conditionMatches(modifier: Modifier, context: CalculationContext, knownTagIds: string[]): boolean {
  const compatibleModifier = modifier as Modifier & {
    tagId?: string;
    targetTagId?: string;
    condition?: string | { type?: string; tagId?: string; tagIds?: string[]; customerId?: string; customerType?: string; pricingModeId?: string; params?: Record<string, unknown> };
  };
  const targetTagId = compatibleModifier.tagId ?? compatibleModifier.targetTagId ?? modifier.targetId;
  if (targetTagId && !knownTagIds.includes(targetTagId)) {
    return false;
  }

  const condition = compatibleModifier.condition;
  if (!condition || condition === 'always') {
    return true;
  }
  if (typeof condition === 'string') {
    return condition === 'always';
  }

  const params = condition.params ?? {};
  const tagId = condition.tagId ?? (typeof params.tagId === 'string' ? params.tagId : undefined);
  const tagIds = condition.tagIds ?? (Array.isArray(params.tagIds) ? params.tagIds.filter((id): id is string => typeof id === 'string') : undefined);
  const customerId = condition.customerId ?? (typeof params.customerId === 'string' ? params.customerId : undefined);
  const customerType = condition.customerType ?? (typeof params.customerType === 'string' ? params.customerType : undefined);
  const pricingModeId = condition.pricingModeId ?? (typeof params.pricingModeId === 'string' ? params.pricingModeId : undefined);
  const customerDef = context.indexes.customersById.get(context.customerOrder.customerId);

  switch (condition.type) {
    case 'all':
      return Array.isArray((condition as typeof condition & { conditions?: typeof condition[] }).conditions)
        ? (condition as typeof condition & { conditions: typeof condition[] }).conditions.every((child) => conditionMatches({ ...modifier, condition: child }, context, knownTagIds))
        : false;
    case 'any':
      return Array.isArray((condition as typeof condition & { conditions?: typeof condition[] }).conditions)
        ? (condition as typeof condition & { conditions: typeof condition[] }).conditions.some((child) => conditionMatches({ ...modifier, condition: child }, context, knownTagIds))
        : false;
    case 'product_has_tag':
      return Boolean(tagId && knownTagIds.includes(tagId));
    case 'product_lacks_tag':
      return Boolean(tagId && !knownTagIds.includes(tagId));
    case 'product_has_any_tag':
      return Boolean(tagIds?.some((conditionTagId) => knownTagIds.includes(conditionTagId)));
    case 'product_has_all_tags':
      return Boolean(tagIds && tagIds.every((conditionTagId) => knownTagIds.includes(conditionTagId)));
    case 'product_lacks_all_tags':
      return Boolean(tagIds && tagIds.every((conditionTagId) => !knownTagIds.includes(conditionTagId)));
    case 'customer_is':
      return customerId === context.customerOrder.customerId;
    case 'customer_type_is':
      return customerType === (context.customerOrder.customerType ?? customerDef?.customerType);
    case 'pricing_mode_is':
      return pricingModeId === context.pricingMode.id;
    default:
      return false;
  }
}

function getMarketModifierLabel(marketEventDisplayName: string, modifier: Modifier): string {
  return modifier.displayText ? `今日新闻 ${marketEventDisplayName}：${modifier.displayText}` : `今日新闻 ${marketEventDisplayName}`;
}

void conditionMatches;

function applyMarketModifiers(
  context: CalculationContext,
  knownTagIds: string[],
  breakdown: BreakdownItem[],
  warnings: string[],
): { priceAdd: number; multipliers: number[] } {
  const marketEvent = context.marketEvent;
  if (!marketEvent) {
    return { priceAdd: 0, multipliers: [] };
  }

  let priceAdd = 0;
  const multipliers: number[] = [];

  for (const modifier of marketEvent.modifiers) {
    if (!evaluateCalculationCondition(modifier.condition, context, knownTagIds, modifier)) {
      const compatibleModifier = modifier as Modifier & { condition?: unknown };
      if (compatibleModifier.condition) {
        warnings.push(`市场新闻 ${marketEvent.displayName} 的复杂条件暂未支持。`);
      }
      continue;
    }

    if (modifier.stat === 'price' && modifier.op === 'add') {
      priceAdd += modifier.value;
      breakdown.push(
        item(
          `market_${marketEvent.id}_${modifier.id ?? breakdown.length}`,
          getMarketModifierLabel(marketEvent.displayName, modifier),
          'price',
          'add',
          modifier.value,
          'market_event',
          marketEvent.id,
        ),
      );
    } else if (modifier.stat === 'priceMultiplier' && modifier.op === 'multiply') {
      multipliers.push(modifier.value);
      breakdown.push(
        item(
          `market_multiplier_${marketEvent.id}_${modifier.id ?? breakdown.length}`,
          getMarketModifierLabel(marketEvent.displayName, modifier),
          'priceMultiplier',
          'multiply',
          `×${modifier.value}`,
          'market_event',
          marketEvent.id,
        ),
      );
    }
  }

  return { priceAdd, multipliers };
}

function getPricingMultiplier(context: CalculationContext, warnings: string[]): number {
  const compatiblePricingMode = context.pricingMode as typeof context.pricingMode & { multiplier?: number; priceRate?: number };
  const multiplier = compatiblePricingMode.priceMultiplier ?? compatiblePricingMode.multiplier ?? compatiblePricingMode.priceRate;
  if (typeof multiplier !== 'number') {
    warnings.push(`定价方式 ${context.pricingMode.displayName} 缺少 priceMultiplier，使用 1.0。`);
    return 1;
  }
  return multiplier;
}

function getPackageMultiplier(product: ProductInstance): number {
  const compatibleProduct = product as ProductInstance & { packaged?: boolean; packageMultiplier?: number };
  if (compatibleProduct.packageMultiplier) {
    return compatibleProduct.packageMultiplier;
  }
  return product.flags.packaged || compatibleProduct.packaged ? 1.25 : 1;
}

function applySimplePriceModifiers(context: CalculationContext, breakdown: BreakdownItem[], warnings: string[]): { add: number; multipliers: number[] } {
  const compatibleProduct = context.product as ProductInstance & { priceModifiers?: Modifier[]; modifiers?: Modifier[] };
  const compatibleDayState = context.dayState as typeof context.dayState & { temporaryDealModifiers?: Modifier[] };
  const modifiers = [
    ...(compatibleProduct.priceModifiers ?? []),
    ...(context.product.productModifiers ?? []),
    ...(context.product.dealModifiers ?? []),
    ...(compatibleProduct.modifiers ?? []),
    ...context.dayState.temporaryDayModifiers,
    ...(compatibleDayState.temporaryDealModifiers ?? []),
  ].filter((modifier) => !modifier.targetId || modifier.targetId === context.product.id);
  const priceModifiers = modifiers.filter((modifier) => modifier.stat === 'price' || modifier.stat === 'priceMultiplier');
  let add = 0;
  const multipliers: number[] = [];

  const knownTagIds = getEffectivePriceTagIds(context);
  for (const modifier of priceModifiers) {
    if (!evaluateCalculationCondition(modifier.condition, context, knownTagIds, modifier)) {
      continue;
    }
    if (modifier.stat === 'price' && modifier.op === 'add') {
      add += modifier.value;
      breakdown.push(item(modifier.id ?? `modifier_${breakdown.length}`, modifier.displayText ?? '价格修正', 'price', 'add', modifier.value, 'modifier', modifier.sourceId ?? modifier.id ?? 'unknown'));
    } else if (modifier.stat === 'priceMultiplier' && modifier.op === 'multiply') {
      if (modifier.sourceId === 'action_package' && context.product.flags.packaged) {
        continue;
      }
      multipliers.push(modifier.value);
      breakdown.push(item(modifier.id ?? `modifier_multiplier_${breakdown.length}`, modifier.displayText ?? '价格倍率修正', 'priceMultiplier', 'multiply', `×${modifier.value}`, 'modifier', modifier.sourceId ?? modifier.id ?? 'unknown'));
    } else {
      warnings.push(`价格修正 ${modifier.id ?? 'unknown'} 暂未支持。`);
    }
  }

  return { add, multipliers };
}

function applyPassivePriceModifiers(context: CalculationContext, knownTagIds: string[], breakdown: BreakdownItem[]): number {
  let add = 0;
  if (
    context.activePassives.some((passive) => passive.passiveId === 'passive_bigtech_endorsement') &&
    context.customerOrder.customerId === 'customer_bigtech_hr' &&
    (knownTagIds.includes('tag_elite_school') || knownTagIds.includes('tag_young'))
  ) {
    add += 20;
    breakdown.push(item('passive_bigtech_endorsement_price', '店铺被动：大厂背书合作', 'price', 'add', 20, 'passive', 'passive_bigtech_endorsement'));
  }
  return add;
}

export function calculatePrice(context: CalculationContext): PriceResult {
  const warnings: string[] = [];
  const priceBreakdown: BreakdownItem[] = [];
  const product = context.product;
  const knownTagIds = getEffectivePriceTagIds(context);
  let rawPrice = getProductBasePrice(product, warnings);

  priceBreakdown.push(item('product_base_price', '商品基础价', 'price', 'add', rawPrice, 'product', product.id));

  for (const tagId of knownTagIds) {
    const tag = context.indexes.tagsById.get(tagId);
    const tagLabel = tag?.displayName ?? tagId;
    if (!tag) {
      warnings.push(`标签 ${tagId} 配置缺失，价格按 0 处理。`);
      continue;
    }

    if (isSuppressed(product, tagId)) {
      priceBreakdown.push(item(`tag_suppressed_${tagId}`, `[${tagLabel}] 已压制`, 'price', 'add', 0, 'tag', tagId));
      continue;
    }

    const tagValue = getNumber((tag as typeof tag & { basePrice?: number }).basePrice ?? tag.baseValue, 0);
    rawPrice += tagValue;
    priceBreakdown.push(item(`tag_value_${tagId}`, `[${tagLabel}] 标签价值`, 'price', 'add', tagValue, 'tag', tagId));

    const preferenceBonus = applyCustomerPreference(context, context.customerOrder, tagId, warnings);
    if (preferenceBonus !== 0) {
      rawPrice += preferenceBonus;
      priceBreakdown.push(
        item(
          `customer_preference_${context.customerOrder.id}_${tagId}`,
          `${context.customerOrder.displayName} 偏好 [${tagLabel}]`,
          'price',
          'add',
          preferenceBonus,
          'customer_order',
          context.customerOrder.id,
        ),
      );
    }
  }

  rawPrice += applyTagRelations(context, knownTagIds, product, priceBreakdown, warnings);
  const marketResult = applyMarketModifiers(context, knownTagIds, priceBreakdown, warnings);
  rawPrice += marketResult.priceAdd;

  const isSpoiled = product.flags.spoiled || product.status === 'spoiled' || product.freshnessCurrent <= context.configTables.gameConfig.spoiledAt;
  if (isSpoiled) {
    const spoiledPriceAdd = context.configTables.gameConfig.spoiledPriceAdd ?? -20;
    rawPrice += spoiledPriceAdd;
    priceBreakdown.push(item('spoiled_price_add', '商品已变质', 'price', 'add', spoiledPriceAdd, 'product', product.id));
  }

  const simpleModifiers = applySimplePriceModifiers(context, priceBreakdown, warnings);
  rawPrice += simpleModifiers.add;
  rawPrice += applyPassivePriceModifiers(context, knownTagIds, priceBreakdown);

  if (rawPrice < 1) {
    rawPrice = 1;
    priceBreakdown.push(item('raw_price_floor', '售价下限', 'price', 'set', '至少 1', 'system', 'price_floor'));
  }

  const configuredPackageMultiplier = context.configTables.gameConfig.basePackageMultiplier;
  const packageMultiplier = product.flags.packaged && typeof configuredPackageMultiplier === 'number' ? configuredPackageMultiplier : getPackageMultiplier(product);
  if (packageMultiplier !== 1) {
    priceBreakdown.push(item('package_multiplier', '基础包装', 'priceMultiplier', 'multiply', `×${packageMultiplier}`, 'product', product.id));
  }

  const pricingMultiplier = getPricingMultiplier(context, warnings);
  priceBreakdown.push(item('pricing_multiplier', context.pricingMode.displayName, 'priceMultiplier', 'multiply', `×${pricingMultiplier}`, 'pricing_mode', context.pricingMode.id));

  const otherMultipliers = [...marketResult.multipliers, ...simpleModifiers.multipliers];
  const otherMultiplierProduct = otherMultipliers.reduce((total, multiplier) => total * multiplier, 1);
  const priceBeforeBudgetCap = Math.max(1, Math.round(rawPrice * packageMultiplier * pricingMultiplier * otherMultiplierProduct));
  priceBreakdown.push(item('price_before_budget_cap', '预算封顶前价格', 'price', 'set', priceBeforeBudgetCap, 'system', 'price_before_budget_cap'));

  let effectiveBudget = getCustomerBudget(context.customerOrder);
  if (effectiveBudget === 9999) {
    warnings.push('顾客预算缺失，使用默认预算 9999。');
  }
  const compatibleOrder = context.customerOrder as CustomerOrder & { budgetAdd?: number; budgetMultiplier?: number };
  effectiveBudget += compatibleOrder.budgetAdd ?? 0;
  effectiveBudget *= compatibleOrder.budgetMultiplier ?? 1;
  effectiveBudget = Math.max(1, Math.round(effectiveBudget));
  priceBreakdown.push(item('customer_budget_cap', '顾客预算上限', 'budget', 'cap', effectiveBudget, 'customer_order', context.customerOrder.id));

  let finalPrice = Math.min(priceBeforeBudgetCap, effectiveBudget);
  if (priceBeforeBudgetCap > effectiveBudget) {
    priceBreakdown.push(item('budget_cap_applied', '顾客预算封顶', 'budget', 'cap', effectiveBudget, 'customer_order', context.customerOrder.id));
  } else {
    priceBreakdown.push(item('budget_cap_not_applied', '未触及预算上限', 'budget', 'cap', `预算 ${effectiveBudget}`, 'customer_order', context.customerOrder.id));
  }

  finalPrice = Math.max(1, finalPrice);
  priceBreakdown.push(item('final_price', '最终售价', 'price', 'set', finalPrice, 'system', 'final_price'));

  const estimatedProfit = finalPrice - getProductCost(product, warnings);

  return {
    rawPrice,
    priceBeforeBudgetCap,
    effectiveBudget,
    finalPrice,
    estimatedProfit,
    priceBreakdown,
    warnings,
  };
}
