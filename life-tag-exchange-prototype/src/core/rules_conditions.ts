import type { AppRuntime, CardDef, CardInstance, Condition, CustomerOrder, DealPreview, PricingModeDef, ProductInstance } from './types';
import {
  getAllKnownTagIds,
  getSelectedCustomerOrder,
  getSelectedPricingMode,
  getSelectedProduct,
  getUnrevealedHiddenTagIds,
  getUnresolvedDarkRiskIds,
} from './selectors';

export interface ConditionContext {
  app: AppRuntime;
  runState: AppRuntime['state'];
  dayState: AppRuntime['state']['dayState'];
  deckState: AppRuntime['state']['deckState'];
  configs: AppRuntime['configs'];
  indexes: AppRuntime['index'];
  cardDef?: CardDef | null;
  cardInstance?: CardInstance | null;
  selectedProduct?: ProductInstance | null;
  selectedCustomerOrder?: CustomerOrder | null;
  selectedPricingMode?: PricingModeDef | null;
  currentDealPreview?: DealPreview | null;
  targetProduct?: ProductInstance | null;
  targetTagId?: string | null;
}

export interface ConditionsResult {
  ok: boolean;
  failedReasons: string[];
}

export function createConditionContext(app: AppRuntime, extras: Partial<ConditionContext> = {}): ConditionContext {
  return {
    app,
    runState: app.state,
    dayState: app.state.dayState,
    deckState: app.state.deckState,
    configs: app.configs,
    indexes: app.index,
    selectedProduct: getSelectedProduct(app),
    selectedCustomerOrder: getSelectedCustomerOrder(app),
    selectedPricingMode: getSelectedPricingMode(app),
    currentDealPreview: app.state.dayState.currentDealPreview,
    ...extras,
  };
}

function getTargetProduct(context: ConditionContext): ProductInstance | null {
  return context.targetProduct ?? context.selectedProduct ?? null;
}

function getNumber(condition: Condition, fallback = 0): number {
  return typeof condition.value === 'number' && Number.isFinite(condition.value) ? condition.value : fallback;
}

function getChildConditions(condition: Condition): Condition[] {
  return condition.conditions ?? (condition.condition ? [condition.condition] : []);
}

function getTagIds(condition: Condition): string[] {
  return condition.tagIds ?? (Array.isArray(condition.value) ? condition.value.filter((value): value is string => typeof value === 'string') : []);
}

function getTagId(condition: Condition): string | null {
  return condition.tagId ?? condition.targetTagId ?? (typeof condition.value === 'string' ? condition.value : null);
}

function getConditionLabelForTag(context: ConditionContext, tagId: string): string {
  return context.indexes.tagsById.get(tagId)?.displayName ?? tagId;
}

export function evaluateCondition(condition: Condition, context: ConditionContext): ConditionsResult {
  const product = getTargetProduct(context);

  switch (condition.type) {
    case 'always':
      return { ok: true, failedReasons: [] };
    case 'all':
      return evaluateConditions(getChildConditions(condition), context);
    case 'any': {
      const results = getChildConditions(condition).map((child) => evaluateCondition(child, context));
      return results.some((result) => result.ok)
        ? { ok: true, failedReasons: [] }
        : { ok: false, failedReasons: results.flatMap((result) => result.failedReasons) };
    }
    case 'not': {
      const child = condition.condition ?? condition.conditions?.[0];
      if (!child) {
        return { ok: false, failedReasons: ['not 条件缺少子条件。'] };
      }
      const result = evaluateCondition(child, context);
      return result.ok ? { ok: false, failedReasons: ['反向条件未通过。'] } : { ok: true, failedReasons: [] };
    }
    case 'selected_product_exists':
      return context.selectedProduct ? { ok: true, failedReasons: [] } : { ok: false, failedReasons: ['请选择一个库存商品。'] };
    case 'selected_customer_exists':
      return context.selectedCustomerOrder ? { ok: true, failedReasons: [] } : { ok: false, failedReasons: ['请选择顾客。'] };
    case 'selected_pricing_exists':
      return context.selectedPricingMode ? { ok: true, failedReasons: [] } : { ok: false, failedReasons: ['请选择定价方式。'] };
    case 'product_has_tag': {
      const tagId = getTagId(condition);
      if (!product || !tagId || !getAllKnownTagIds(product).includes(tagId)) {
        return { ok: false, failedReasons: [`该卡牌需要商品拥有 [${tagId ? getConditionLabelForTag(context, tagId) : '未知标签'}]。`] };
      }
      return { ok: true, failedReasons: [] };
    }
    case 'product_has_any_tag': {
      const tagIds = getTagIds(condition);
      const knownTagIds = product ? getAllKnownTagIds(product) : [];
      return tagIds.some((tagId) => knownTagIds.includes(tagId))
        ? { ok: true, failedReasons: [] }
        : { ok: false, failedReasons: ['该卡牌需要商品拥有指定标签之一。'] };
    }
    case 'product_has_all_tags': {
      const tagIds = getTagIds(condition);
      const knownTagIds = product ? getAllKnownTagIds(product) : [];
      return tagIds.every((tagId) => knownTagIds.includes(tagId))
        ? { ok: true, failedReasons: [] }
        : { ok: false, failedReasons: ['该卡牌需要商品拥有所有指定标签。'] };
    }
    case 'product_has_unrevealed_hidden_tag':
      return product && getUnrevealedHiddenTagIds(product).length > 0
        ? { ok: true, failedReasons: [] }
        : { ok: false, failedReasons: ['该卡牌需要商品存在未揭示隐藏标签。'] };
    case 'product_has_unresolved_dark_risk':
      return product && getUnresolvedDarkRiskIds(product).length > 0
        ? { ok: true, failedReasons: [] }
        : { ok: false, failedReasons: ['该卡牌需要商品存在未处理暗风险。'] };
    case 'product_dark_risk_category_is': {
      const category = condition.category ?? (typeof condition.value === 'string' ? condition.value : null);
      const hasCategory = Boolean(
        product &&
          category &&
          product.darkRiskIds.some((riskId) => context.indexes.darkRisksById.get(riskId)?.category === category),
      );
      return hasCategory ? { ok: true, failedReasons: [] } : { ok: false, failedReasons: ['该卡牌需要指定类别的暗风险。'] };
    }
    case 'target_tag_is_washable': {
      const tagId = context.targetTagId ?? getTagId(condition);
      const tag = tagId ? context.indexes.tagsById.get(tagId) : null;
      return tag?.isWashable ? { ok: true, failedReasons: [] } : { ok: false, failedReasons: ['目标标签不可洗。'] };
    }
    case 'target_tag_revealed': {
      const tagId = context.targetTagId ?? getTagId(condition);
      return product && tagId && getAllKnownTagIds(product).includes(tagId)
        ? { ok: true, failedReasons: [] }
        : { ok: false, failedReasons: ['目标标签必须已揭示。'] };
    }
    case 'cash_at_least':
      return context.runState.cash >= getNumber(condition)
        ? { ok: true, failedReasons: [] }
        : { ok: false, failedReasons: [`现金不足，需要 ${getNumber(condition)} 现金。`] };
    case 'reputation_at_least':
      return context.runState.reputation >= getNumber(condition)
        ? { ok: true, failedReasons: [] }
        : { ok: false, failedReasons: [`信誉不足，需要 ${getNumber(condition)}。`] };
    case 'action_point_at_least':
      return context.dayState.actionPoints >= getNumber(condition)
        ? { ok: true, failedReasons: [] }
        : { ok: false, failedReasons: [`行动点不足，需要 ${getNumber(condition)} 点。`] };
    case 'pricing_mode_is': {
      const pricingModeId = condition.pricingModeId ?? (typeof condition.value === 'string' ? condition.value : null);
      return context.selectedPricingMode?.id === pricingModeId
        ? { ok: true, failedReasons: [] }
        : { ok: false, failedReasons: ['当前定价方式不满足卡牌条件。'] };
    }
    case 'customer_is': {
      const customerId = condition.customerId ?? (typeof condition.value === 'string' ? condition.value : null);
      return context.selectedCustomerOrder?.customerId === customerId
        ? { ok: true, failedReasons: [] }
        : { ok: false, failedReasons: ['当前顾客不满足卡牌条件。'] };
    }
    case 'customer_type_is': {
      const params = (condition as Condition & { params?: Record<string, unknown> }).params ?? {};
      const customerType = (typeof condition.value === 'string' ? condition.value : null) ?? (typeof params.customerType === 'string' ? params.customerType : null);
      const selectedType = context.selectedCustomerOrder?.customerType ?? context.indexes.customersById.get(context.selectedCustomerOrder?.customerId ?? '')?.customerType;
      return selectedType === customerType
        ? { ok: true, failedReasons: [] }
        : { ok: false, failedReasons: ['当前顾客类型不满足卡牌条件。'] };
    }
    case 'market_event_active': {
      const marketEventId = condition.marketEventId ?? (typeof condition.value === 'string' ? condition.value : null);
      return context.dayState.marketEvent?.id === marketEventId || context.dayState.marketEvents.some((event) => event.id === marketEventId)
        ? { ok: true, failedReasons: [] }
        : { ok: false, failedReasons: ['当前市场新闻不满足卡牌条件。'] };
    }
    case 'day_at_least':
      return context.runState.currentDay >= getNumber(condition)
        ? { ok: true, failedReasons: [] }
        : { ok: false, failedReasons: [`需要第 ${getNumber(condition)} 天或之后。`] };
    default:
      console.warn(`Unsupported condition type: ${condition.type}`);
      return { ok: false, failedReasons: [`暂不支持的条件：${condition.type}。`] };
  }
}

export function evaluateConditions(conditions: Condition[] | undefined, context: ConditionContext): ConditionsResult {
  const failedReasons: string[] = [];
  for (const condition of conditions ?? []) {
    const result = evaluateCondition(condition, context);
    if (!result.ok) {
      failedReasons.push(...result.failedReasons);
    }
  }

  return {
    ok: failedReasons.length === 0,
    failedReasons,
  };
}
