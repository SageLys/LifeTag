import { DarkRiskRevealLevel, ProductStatus } from './constants';
import type {
  CalculationContext,
  DarkRiskDef,
  MarketEventDef,
  Modifier,
  ProductInstance,
  RiskBreakdownItem,
  RiskResult,
  TagConflictDef,
  TagDef,
  UnknownRiskBreakdownItem,
} from './types';

// ============================================================
// v2 风险模型：标签本身不再累加风险
// 风险来源：商品基础风险 + 顾客雷区 + 标签冲突 + 暗风险 +
//           流量过载 + 市场新闻 + 新鲜度 + 定价 +
//           卡牌/操作修正 - 公关/便宜卖/保险/被动
// ============================================================

type CompatibleDarkRisk = DarkRiskDef & {
  riskMin?: number;
  riskMax?: number;
  actualRiskDefault?: number;
};

type CompatiblePricingMode = CalculationContext['pricingMode'] & {
  riskAdd?: number;
  riskModifier?: number;
};

type CompatibleCustomerRisk = { tabooRiskBonus?: number; riskBonus?: number };

type FlowOverloadStep = { minCount: number; maxCount: number; riskAdd: number };
type FlowOverloadConfig = {
  enabled?: boolean;
  customerIds?: string[];
  tagIds?: string[];
  steps?: FlowOverloadStep[];
  displayText?: string;
};
type CompatibleGameConfig = CalculationContext['configTables']['gameConfig'] & {
  flowOverloadRisk?: FlowOverloadConfig;
};

const DEFAULT_TABOO_RISK_BONUS = 25;

// Flow 标签 ID 常量，用于 flowOverloadRisk fallback（当 gameConfig 没有该字段时）
const FLOW_TAG_IDS_FALLBACK = [
  'tag_crazy',
  'tag_absurd',
  'tag_controversial',
  'tag_rebellious',
  'tag_fragile_heart',
  'tag_empty_persona',
];

function riskItem(sourceType: string, sourceId: string, label: string, value: number, op: RiskBreakdownItem['op'] = 'add'): RiskBreakdownItem {
  return {
    sourceType,
    sourceId,
    label,
    stat: 'risk',
    op,
    value,
    visibleToPlayer: true,
  };
}

function unknownItem(
  sourceType: UnknownRiskBreakdownItem['sourceType'],
  sourceId: string,
  label: string,
  riskMin: number,
  riskMax: number,
): UnknownRiskBreakdownItem {
  return {
    sourceType,
    sourceId,
    label,
    riskMin,
    riskMax,
    visibleToPlayer: true,
  };
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

// v2: getTagRisk 已弃用，不再用于常规风险计算
// 保留函数用于隐藏标签区间估算（此时标签 baseRisk = 0，故实际为 0）
function getTagRisk(tag: TagDef): number {
  // v2: 所有标签 baseRisk = 0，标签本身不贡献风险
  // 此函数仅保留以兼容隐藏标签未揭示时的区间估算
  const rawBaseRisk = readNumber((tag as TagDef & { baseRisk?: number }).baseRisk, readNumber(tag.riskValue, 0));
  // 若 baseRisk 已归零，返回 0；旧数据未更新时也不会超过 0
  return Math.max(0, rawBaseRisk);
}

function getEffectiveKnownTagIds(product: ProductInstance): string[] {
  const compatibleProduct = product as ProductInstance & {
    temporaryTagIds?: string[];
    visibleTemporaryTagIds?: string[];
    hiddenTags?: Array<{ tagId: string; revealed?: boolean }>;
  };
  const revealedStructuredHiddenTags =
    compatibleProduct.hiddenTags?.filter((hiddenTag) => hiddenTag.revealed).map((hiddenTag) => hiddenTag.tagId) ?? [];
  const tagIds = [
    ...product.visibleTagIds,
    ...product.revealedHiddenTagIds,
    ...revealedStructuredHiddenTags,
    ...product.appliedTagIds,
    ...(compatibleProduct.visibleTemporaryTagIds ?? []),
    ...(compatibleProduct.temporaryTagIds ?? []),
  ];

  return [...new Set(tagIds.filter(Boolean))];
}

function getEffectiveRiskTagIds(context: CalculationContext): string[] {
  if (context.mode !== 'resolve') {
    return getEffectiveKnownTagIds(context.product);
  }

  return [...new Set([...getEffectiveKnownTagIds(context.product), ...context.product.hiddenTagIds].filter(Boolean))];
}

function getUnrevealedHiddenTagIds(product: ProductInstance): string[] {
  return product.hiddenTagIds.filter((tagId) => !product.revealedHiddenTagIds.includes(tagId));
}

function isSuppressed(product: ProductInstance, tagId: string): boolean {
  return product.suppressedTagIds.includes(tagId);
}

function getSuppressionFactor(product: ProductInstance, tagId: string): number {
  return isSuppressed(product, tagId) ? 0 : 1;
}

function isDarkRiskFullyKnown(product: ProductInstance, riskId: string): boolean {
  const revealLevel = product.darkRiskRevealLevels[riskId] as string | undefined;
  return revealLevel === 'full' || revealLevel === DarkRiskRevealLevel.Revealed || product.revealedDarkRiskIds.includes(riskId);
}

function isDarkRiskTreated(product: ProductInstance, riskId: string): boolean {
  return (product.darkRiskRevealLevels[riskId] as string | undefined) === 'treated';
}

function isDarkRiskUnknown(product: ProductInstance, riskId: string): boolean {
  return !isDarkRiskFullyKnown(product, riskId) && !isDarkRiskTreated(product, riskId);
}

function getDarkRiskActualRisk(darkRisk: CompatibleDarkRisk): number {
  return readNumber(darkRisk.actualRiskDefault, readNumber(darkRisk.revealRisk, readNumber(darkRisk.riskMax, readNumber(darkRisk.baseRisk, 0))));
}

function getDarkRiskRange(darkRisk: CompatibleDarkRisk): { riskMin: number; riskMax: number } {
  const riskMin = readNumber(darkRisk.riskMin, readNumber(darkRisk.baseRisk, 0));
  const riskMax = readNumber(darkRisk.riskMax, readNumber(darkRisk.revealRisk, riskMin));
  return {
    riskMin: Math.max(0, riskMin),
    riskMax: Math.max(Math.max(0, riskMin), riskMax),
  };
}

/**
 * v2: 判断暗风险是否命中顾客敏感类型
 * 命中时全额计入 actualRiskDefault；未命中时计入 30%
 */
function getDarkRiskWithSensitivity(
  darkRisk: CompatibleDarkRisk,
  context: CalculationContext,
): number {
  const actualRisk = getDarkRiskActualRisk(darkRisk);
  const customerDef = context.indexes.customersById.get(context.customerOrder.customerId);
  const sensitivityList: string[] = [
    ...(context.customerOrder.darkRiskSensitivity ?? []),
    ...(customerDef?.darkRiskSensitivity ?? []),
  ];

  if (sensitivityList.length === 0) {
    // 没有敏感类型配置：按全额计（向后兼容）
    return actualRisk;
  }

  if (sensitivityList.includes(darkRisk.category)) {
    return actualRisk;
  }

  // 非敏感类型：仅计入 30% 残余
  return Math.round(actualRisk * 0.3);
}

function getTabooTagIds(context: CalculationContext): string[] {
  const compatibleOrder = context.customerOrder as CalculationContext['customerOrder'] & { tabooTags?: string[] };
  const customerDef = context.indexes.customersById.get(context.customerOrder.customerId);
  return [...(context.customerOrder.tabooTagIds ?? []), ...(compatibleOrder.tabooTags ?? []), ...(customerDef?.tabooTagIds ?? [])].filter(Boolean);
}

function getTabooRiskBonusForTag(context: CalculationContext, tagId: string): number {
  const customerDef = context.indexes.customersById.get(context.customerOrder.customerId) as
    | (NonNullable<ReturnType<typeof context.indexes.customersById.get>> & {
        tabooTagRiskBonus?: Record<string, number>;
        tabooRiskBonus?: number;
        riskBonus?: number;
      })
    | undefined;

  // 优先使用精细化的 tabooTagRiskBonus 字典
  if (customerDef?.tabooTagRiskBonus && tagId in customerDef.tabooTagRiskBonus) {
    return customerDef.tabooTagRiskBonus[tagId];
  }

  const compatibleOrder = context.customerOrder as CalculationContext['customerOrder'] & CompatibleCustomerRisk;
  return readNumber(
    compatibleOrder.tabooRiskBonus ?? compatibleOrder.riskBonus ?? customerDef?.tabooRiskBonus ?? customerDef?.riskBonus,
    DEFAULT_TABOO_RISK_BONUS,
  );
}

function getRelationRiskDelta(relation: TagConflictDef): number {
  return readNumber((relation as TagConflictDef & { riskAdd?: number }).riskAdd, readNumber(relation.riskDelta, 0));
}

function getRelationSuppressionFactor(product: ProductInstance, relation: TagConflictDef): number {
  const suppressedCount = [relation.tagA, relation.tagB].filter((tagId) => isSuppressed(product, tagId)).length;
  if (suppressedCount === 2) {
    return 0;
  }
  if (suppressedCount === 1) {
    return 0;
  }
  return 1;
}

function collectRiskModifiersFromMarketEvent(marketEvent: MarketEventDef | null): Modifier[] {
  if (!marketEvent) {
    return [];
  }

  const effectModifiers = marketEvent.effects.flatMap((effect) => effect.modifiers ?? []);
  return [...marketEvent.modifiers, ...effectModifiers].filter((modifier) => modifier.stat === 'risk' && modifier.op === 'add');
}

function conditionMatches(modifier: Modifier, context: CalculationContext, knownTagIds: string[]): boolean {
  const compatibleModifier = modifier as Modifier & {
    tagId?: string;
    targetTagId?: string;
    condition?: string | { type?: string; tagId?: string; tagIds?: string[]; customerId?: string; customerType?: string; pricingModeId?: string; category?: string; params?: Record<string, unknown> };
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
  const category = condition.category ?? (typeof params.category === 'string' ? params.category : undefined);
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
    case 'dark_risk_category_is':
      return Boolean(category && context.product.darkRiskIds.some((riskId) => context.indexes.darkRisksById.get(riskId)?.category === category));
    case 'dark_risk_category_is_or_unrevealed':
      return Boolean(
        category &&
          context.product.darkRiskIds.some((riskId) => {
            const darkRisk = context.indexes.darkRisksById.get(riskId);
            const revealLevel = context.product.darkRiskRevealLevels[riskId];
            return darkRisk?.category === category || revealLevel === DarkRiskRevealLevel.Hidden;
          }),
      );
    case 'dark_risk_category_is_not':
      return Boolean(category && context.product.darkRiskIds.every((riskId) => context.indexes.darkRisksById.get(riskId)?.category !== category));
    default:
      return false;
  }
}

function getModifierSuppressionFactor(modifier: Modifier, product: ProductInstance): number {
  const compatibleModifier = modifier as Modifier & { tagId?: string; targetTagId?: string };
  const tagId = compatibleModifier.tagId ?? compatibleModifier.targetTagId ?? modifier.targetId;
  return tagId ? getSuppressionFactor(product, tagId) : 1;
}

function getPricingRiskDelta(pricingMode: CompatiblePricingMode): number {
  const configured = pricingMode.riskAdd ?? pricingMode.riskDelta ?? pricingMode.riskModifier;
  if (typeof configured === 'number' && Number.isFinite(configured)) {
    return configured;
  }

  switch (pricingMode.id) {
    case 'pricing_cheap':
      return -10;
    case 'pricing_high':
      return 15;
    case 'pricing_blind_box':
      return 20;
    case 'pricing_normal':
    default:
      return 0;
  }
}

function getPricingRiskLabel(pricingMode: CompatiblePricingMode): string {
  switch (pricingMode.id) {
    case 'pricing_cheap':
      return '便宜卖';
    case 'pricing_high':
      return '高价卖';
    case 'pricing_blind_box':
      return '盲盒卖';
    default:
      return pricingMode.displayName;
  }
}

function collectSimpleRiskModifiers(context: CalculationContext): Modifier[] {
  const compatibleProduct = context.product as ProductInstance & { riskModifiers?: Modifier[]; modifiers?: Modifier[] };
  const compatibleDayState = context.dayState as typeof context.dayState & { temporaryDealModifiers?: Modifier[] };

  return [
    ...(compatibleProduct.riskModifiers ?? []),
    ...(context.product.productModifiers ?? []),
    ...(context.product.dealModifiers ?? []),
    ...(compatibleProduct.modifiers ?? []),
    ...context.dayState.temporaryDayModifiers,
    ...(compatibleDayState.temporaryDealModifiers ?? []),
    ...context.runState.temporaryRunModifiers
      .filter((modifier) => modifier.stat === 'risk' && modifier.target === 'sell_product' && modifier.consumed < modifier.uses)
      .map((modifier) => ({
        stat: 'risk',
        op: 'add',
        value: modifier.value,
        sourceType: 'temporary_modifier',
        sourceId: modifier.sourceRewardId,
        displayText: modifier.displayName,
        targetId: context.product.id,
      })),
  ]
    .filter((modifier) => !modifier.targetId || modifier.targetId === context.product.id)
    .filter((modifier) => modifier.stat === 'risk' && modifier.op === 'add');
}

function collectPassiveRiskModifiers(context: CalculationContext): RiskBreakdownItem[] {
  const items: RiskBreakdownItem[] = [];
  if (context.activePassives.some((passive) => passive.passiveId === 'passive_family_network_pr' || passive.passiveId === 'passive_acquaintance_society')) {
    const isParentCommittee = context.customerOrder.customerId === 'customer_parent_committee';
    const hasPersonaRisk = context.product.darkRiskIds.some((riskId) => context.indexes.darkRisksById.get(riskId)?.category === 'persona');
    if (isParentCommittee && hasPersonaRisk) {
      items.push(riskItem('passive', 'passive_family_network_pr', '店铺被动：熟人社会公关', -15));
    }
  }

  // 平台公关熟人：platform 暗风险 -10
  if (context.activePassives.some((passive) => passive.passiveId === 'passive_platform_pr_contact')) {
    const hasPlatformRisk = context.product.darkRiskIds.some((riskId) => context.indexes.darkRisksById.get(riskId)?.category === 'platform');
    if (hasPlatformRisk) {
      items.push(riskItem('passive', 'passive_platform_pr_contact', '店铺被动：平台公关熟人', -10));
    }
  }

  return items;
}

/**
 * v2: 计算流量过载风险
 * 仅在顾客是 MCN 且商品有足够多 flow 标签时触发
 */
function calculateFlowOverloadRisk(
  context: CalculationContext,
  knownTagIds: string[],
  isResolveMode: boolean,
): { riskAdd: number; label: string } | null {
  const compatibleGameConfig = context.configTables.gameConfig as CompatibleGameConfig;
  const flowConfig = compatibleGameConfig.flowOverloadRisk;

  // 检查功能开关和顾客匹配
  const enabled = flowConfig?.enabled ?? true;
  if (!enabled) return null;

  const customerDef = context.indexes.customersById.get(context.customerOrder.customerId);
  const customerType = context.customerOrder.customerType ?? customerDef?.customerType;
  const customerIds = flowConfig?.customerIds ?? ['customer_short_video_mcn'];
  const isTargetCustomer =
    customerIds.includes(context.customerOrder.customerId) ||
    customerType === 'mcn';

  if (!isTargetCustomer) return null;

  // 流量标签列表
  const flowTagIds = flowConfig?.tagIds ?? FLOW_TAG_IDS_FALLBACK;

  // 计算命中的流量标签数量（resolve 模式下用全部 effectiveRiskTagIds，预览模式下只用已知标签）
  const tagIdsToCount = isResolveMode
    ? [...new Set([...knownTagIds, ...context.product.hiddenTagIds])]
    : knownTagIds;

  const hitCount = tagIdsToCount.filter((tagId) => flowTagIds.includes(tagId)).length;

  if (hitCount === 0) return null;

  // 按 steps 计算风险
  const steps: FlowOverloadStep[] = flowConfig?.steps ?? [
    { minCount: 0, maxCount: 2, riskAdd: 0 },
    { minCount: 3, maxCount: 3, riskAdd: 8 },
    { minCount: 4, maxCount: 4, riskAdd: 15 },
    { minCount: 5, maxCount: 99, riskAdd: 25 },
  ];

  let riskAdd = 0;
  for (const step of steps) {
    if (hitCount >= step.minCount && hitCount <= step.maxCount) {
      riskAdd = step.riskAdd;
      break;
    }
  }

  if (riskAdd === 0) return null;

  const displayText = flowConfig?.displayText ?? '流量标签过载';
  return { riskAdd, label: `${displayText}（${hitCount} 个流量标签）：+${riskAdd}` };
}

function getDarkRiskCategoryLabel(category: string): string {
  switch (category) {
    case 'career_background':
      return '履历类';
    case 'persona':
      return '人设类';
    case 'platform':
      return '平台类';
    default:
      return '未知类别';
  }
}

function shouldShowDarkRiskCategory(product: ProductInstance, riskId: string): boolean {
  const revealLevel = product.darkRiskRevealLevels[riskId] as string | undefined;
  return revealLevel === 'category' || revealLevel === DarkRiskRevealLevel.Hinted;
}

function hasUnknownInformation(product: ProductInstance): boolean {
  return getUnrevealedHiddenTagIds(product).length > 0 || product.darkRiskIds.some((riskId) => isDarkRiskUnknown(product, riskId));
}

function getMarketModifierRiskLabel(marketEventDisplayName: string, modifier: Modifier, factor: number): string {
  const prefix = modifier.displayText ? `今日新闻 ${marketEventDisplayName}：${modifier.displayText}` : `今日新闻 ${marketEventDisplayName}`;
  return factor < 1 ? `${prefix}（已压制残余风险）` : prefix;
}

export function calculateRisk(context: CalculationContext): RiskResult {
  const warnings: string[] = [];
  const riskBreakdown: RiskBreakdownItem[] = [];
  const unknownRiskBreakdown: UnknownRiskBreakdownItem[] = [];
  const unknownResolvedBreakdown: RiskBreakdownItem[] = [];
  const product = context.product;
  const knownTagIds = getEffectiveRiskTagIds(context);
  const knownTagSet = new Set(knownTagIds);
  const tabooTagSet = new Set(getTabooTagIds(context));
  let knownRisk = readNumber(product.baseRisk, 0);

  // 1. 商品基础风险（来源风险/货源脏度）
  riskBreakdown.push(riskItem('product', product.id, '商品来源风险', knownRisk));

  // 2. 顾客雷区风险（v2: 只有 tabooTags 才加风险，preferredTags 不加风险）
  for (const tagId of knownTagIds) {
    const tag = context.indexes.tagsById.get(tagId);
    if (!tag) {
      console.warn(`Missing tag definition for risk calculation: ${tagId}`);
      warnings.push(`标签配置缺失：${tagId}，该标签风险按 0 处理。`);
      continue;
    }

    // v2: 标签本身不再贡献风险（baseRisk = 0）
    // 不再执行：knownRisk += tagRisk

    // 顾客雷区风险（标签命中 taboo 才加风险）
    if (tabooTagSet.has(tagId)) {
      const factor = getSuppressionFactor(product, tagId);
      const tabooRisk = Math.round(getTabooRiskBonusForTag(context, tagId) * factor);
      knownRisk += tabooRisk;
      riskBreakdown.push(riskItem('customer_taboo', context.customerOrder.id, `顾客雷区 [${tag.displayName}]${factor < 1 ? ' 已压制残余风险' : ''}`, tabooRisk));
    }
  }

  // 3. 标签冲突 / 支撑关系风险
  for (const relation of context.configTables.tagConflicts) {
    if (!knownTagSet.has(relation.tagA) || !knownTagSet.has(relation.tagB)) {
      continue;
    }
    const factor = getRelationSuppressionFactor(product, relation);
    const riskDelta = Math.round(getRelationRiskDelta(relation) * factor);
    knownRisk += riskDelta;
    const tagA = context.indexes.tagsById.get(relation.tagA);
    const tagB = context.indexes.tagsById.get(relation.tagB);
    const relationLabel = relation.relationType === 'support' ? '支撑' : '冲突';
    riskBreakdown.push(riskItem('tag_relation', relation.id, `[${tagA?.displayName ?? relation.tagA}] + [${tagB?.displayName ?? relation.tagB}] ${relationLabel}${factor < 1 ? ' 已压制残余风险' : ''}`, riskDelta));
  }

  // 4. 市场新闻风险（v2: 条件式，依赖 conditionMatches 过滤）
  for (const modifier of collectRiskModifiersFromMarketEvent(context.marketEvent)) {
    if (!conditionMatches(modifier, context, knownTagIds)) {
      // v2: 新闻 modifier 不满足条件时静默跳过（不再输出 warning）
      continue;
    }
    const factor = getModifierSuppressionFactor(modifier, product);
    const value = Math.round(modifier.value * factor);
    knownRisk += value;
    riskBreakdown.push(
      riskItem(
        'market_event',
        context.marketEvent?.id ?? 'market_event_unknown',
        getMarketModifierRiskLabel(context.marketEvent?.displayName ?? '未知新闻', modifier, factor),
        value,
      ),
    );
  }

  // 5. 新鲜度 / 腐败风险
  const isSpoiled =
    product.flags.spoiled || product.status === ProductStatus.Spoiled || product.freshnessCurrent <= context.configTables.gameConfig.spoiledAt;
  if (isSpoiled) {
    const spoiledRiskAdd = readNumber(context.configTables.gameConfig.spoiledRiskAdd, 20);
    knownRisk += spoiledRiskAdd;
    riskBreakdown.push(riskItem('product', product.id, '商品腐败', spoiledRiskAdd));
  }

  // 6. 基础操作风险（包装 +10，公关 -20）
  if (product.flags.packaged) {
    const packageRiskAdd = readNumber(context.configTables.gameConfig.basePackageRiskAdd, 8);
    knownRisk += packageRiskAdd;
    riskBreakdown.push(riskItem('base_action', 'action_package', '基础包装', packageRiskAdd));
  }

  if (product.flags.hasPublicRelation) {
    const publicRelationRiskReduction = readNumber(context.configTables.gameConfig.basePublicRelationRiskReduction, 25);
    knownRisk -= publicRelationRiskReduction;
    riskBreakdown.push(riskItem('base_action', 'action_pr', '公关处理', -publicRelationRiskReduction));
  }

  // 7. 定价风险
  const pricingRiskDelta = getPricingRiskDelta(context.pricingMode);
  knownRisk += pricingRiskDelta;
  riskBreakdown.push(riskItem('pricing_mode', context.pricingMode.id, getPricingRiskLabel(context.pricingMode), pricingRiskDelta));

  // 8. 卡牌 / 操作修正
  for (const modifier of collectSimpleRiskModifiers(context)) {
    if (modifier.sourceId === 'action_package' && product.flags.packaged) {
      continue;
    }
    if (modifier.sourceId === 'action_pr' && product.flags.hasPublicRelation) {
      continue;
    }
    knownRisk += modifier.value;
    riskBreakdown.push(riskItem('modifier', modifier.sourceId ?? modifier.id ?? 'unknown_modifier', modifier.displayText ?? '风险修正', modifier.value));
  }

  // 9. 被动风险修正
  for (const passiveModifier of collectPassiveRiskModifiers(context)) {
    knownRisk += passiveModifier.value;
    riskBreakdown.push(passiveModifier);
  }

  // 10. 流量过载风险（v2 新增）
  const flowOverload = calculateFlowOverloadRisk(context, knownTagIds, context.mode === 'resolve');
  if (flowOverload) {
    knownRisk += flowOverload.riskAdd;
    riskBreakdown.push(riskItem('flow_overload', 'flow_overload_risk', flowOverload.label, flowOverload.riskAdd));
  }

  // ============================================================
  // 未知风险区间（隐藏标签 + 暗风险）
  // ============================================================
  let unknownMin = 0;
  let unknownMax = 0;
  const unresolvedHiddenTagIds = getUnrevealedHiddenTagIds(product);
  const unrevealedHiddenTagIds = context.mode === 'resolve' ? [] : unresolvedHiddenTagIds;

  if (context.mode === 'resolve') {
    for (const hiddenTagId of unresolvedHiddenTagIds) {
      const tag = context.indexes.tagsById.get(hiddenTagId);
      // v2: 隐藏标签揭示后主要风险来自顾客雷区，而非标签自身
      const hiddenTagRisk = tag ? getTagRisk(tag) : 0;
      const hiddenTabooRisk = tabooTagSet.has(hiddenTagId) ? getTabooRiskBonusForTag(context, hiddenTagId) : 0;
      unknownResolvedBreakdown.push(
        riskItem('hidden_tag', hiddenTagId, `结算揭示隐藏标签${tag ? ` [${tag.displayName}]` : ''}`, hiddenTagRisk + hiddenTabooRisk),
      );
    }
  }

  for (const hiddenTagId of unrevealedHiddenTagIds) {
    const tag = context.indexes.tagsById.get(hiddenTagId);
    if (!tag) {
      console.warn(`Missing hidden tag definition for risk calculation: ${hiddenTagId}`);
      warnings.push('存在配置缺失的未揭示隐藏标签，区间可能偏低。');
      continue;
    }

    // v2: 隐藏标签的区间估算：主要考虑 taboo 风险（标签自身 baseRisk = 0）
    let hiddenMax = Math.max(0, getTagRisk(tag)); // 通常为 0
    if (tabooTagSet.has(hiddenTagId)) {
      hiddenMax += Math.max(0, getTabooRiskBonusForTag(context, hiddenTagId));
    }

    // 仍然考虑标签冲突的可能增量
    for (const relation of context.configTables.tagConflicts) {
      const matchesKnownPair =
        (relation.tagA === hiddenTagId && knownTagSet.has(relation.tagB)) ||
        (relation.tagB === hiddenTagId && knownTagSet.has(relation.tagA));
      if (matchesKnownPair) {
        hiddenMax += Math.max(0, getRelationRiskDelta(relation));
      }
    }

    unknownMax += hiddenMax;
    if (hiddenMax > 0) {
      unknownRiskBreakdown.push(unknownItem('hidden_tag', 'hidden_tag_unknown', '未揭示隐藏标签可能增加爆雷', 0, hiddenMax));
    }
  }

  // 暗风险区间（v2: 命中顾客敏感类型全额，非敏感类型 30%）
  for (const riskId of product.darkRiskIds) {
    const darkRisk = context.indexes.darkRisksById.get(riskId) as CompatibleDarkRisk | undefined;
    if (!darkRisk) {
      console.warn(`Missing dark risk definition for risk calculation: ${riskId}`);
      warnings.push('存在配置缺失的暗风险，区间可能偏低。');
      continue;
    }

    if (isDarkRiskTreated(product, riskId)) {
      const residualRisk = Math.round(getDarkRiskActualRisk(darkRisk) * 0.3);
      knownRisk += residualRisk;
      riskBreakdown.push(riskItem('dark_risk', riskId, `[${darkRisk.displayName}] 已处理残余风险`, residualRisk));
      continue;
    }

    if (isDarkRiskFullyKnown(product, riskId) || context.mode === 'resolve') {
      // v2: 已揭示暗风险按敏感度计算
      const actualRisk = getDarkRiskWithSensitivity(darkRisk, context);
      knownRisk += actualRisk;
      const isNonSensitive = actualRisk < getDarkRiskActualRisk(darkRisk);
      const resolvedItem = riskItem(
        'dark_risk',
        riskId,
        context.mode === 'resolve' && !isDarkRiskFullyKnown(product, riskId)
          ? `[${darkRisk.displayName}] 结算揭示暗风险${isNonSensitive ? '（非敏感顾客）' : ''}`
          : `[${darkRisk.displayName}] 暗风险${isNonSensitive ? '（非敏感顾客）' : ''}`,
        actualRisk,
      );
      riskBreakdown.push(resolvedItem);
      if (context.mode === 'resolve' && !isDarkRiskFullyKnown(product, riskId)) {
        unknownResolvedBreakdown.push(resolvedItem);
      }
      continue;
    }

    const range = getDarkRiskRange(darkRisk);
    unknownMin += range.riskMin;
    unknownMax += range.riskMax;
    const label = shouldShowDarkRiskCategory(product, riskId)
      ? `未完全揭示的${getDarkRiskCategoryLabel(darkRisk.category)}暗风险`
      : '未完全揭示的暗风险';
    unknownRiskBreakdown.push(unknownItem('dark_risk', 'dark_risk_unknown', label, range.riskMin, range.riskMax));
  }

  // 预览模式：未知信息提示
  if (context.mode !== 'resolve' && unrevealedHiddenTagIds.length > 0) {
    warnings.push('存在未揭示隐藏标签，爆雷值只能预估区间。');
  }
  if (context.mode !== 'resolve' && product.darkRiskIds.some((riskId) => isDarkRiskUnknown(product, riskId))) {
    warnings.push('存在未完全揭示暗风险，普通鉴定不能完全排除该风险。');
  }
  if (context.pricingMode.id === 'pricing_high') {
    warnings.push('高价卖会提高爆雷风险。');
  }
  if (context.pricingMode.id === 'pricing_blind_box') {
    warnings.push(hasUnknownInformation(product) ? '盲盒价风险较高，只适合愿意赌未知信息时使用。' : '当前商品没有未知信息，不建议使用盲盒价。');
  }

  knownRisk = Math.max(0, Math.round(knownRisk));
  const roundedUnknownMin = Math.round(unknownMin);
  const roundedUnknownMax = Math.max(roundedUnknownMin, Math.round(unknownMax));
  const hasUnknownRisk = roundedUnknownMin !== 0 || roundedUnknownMax !== 0 || unknownRiskBreakdown.length > 0;
  const riskMin = Math.max(0, Math.round(knownRisk + (hasUnknownRisk ? roundedUnknownMin : 0)));
  const riskMax = Math.max(riskMin, Math.round(knownRisk + (hasUnknownRisk ? roundedUnknownMax : 0)));

  if (!hasUnknownRisk) {
    return {
      riskDisplayType: 'exact',
      knownRisk,
      riskMin: knownRisk,
      riskMax: knownRisk,
      exactRisk: knownRisk,
      riskBreakdown,
      unknownRiskBreakdown,
      unknownResolvedBreakdown,
      warnings,
    };
  }

  return {
    riskDisplayType: 'range',
    knownRisk,
    riskMin,
    riskMax,
    riskBreakdown,
    unknownRiskBreakdown,
    unknownResolvedBreakdown,
    warnings,
  };
}
