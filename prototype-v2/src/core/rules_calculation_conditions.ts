import { DarkRiskRevealLevel } from './constants';
import type { CalculationContext, Condition, Modifier } from './types';

type ConditionLike = Condition & {
  params?: Record<string, unknown>;
  customerType?: string;
  accidentLevel?: string;
  accidentLevels?: string[];
};

function paramsOf(condition: ConditionLike): Record<string, unknown> {
  return condition.params ?? {};
}

function paramString(condition: ConditionLike, key: string): string | undefined {
  const value = paramsOf(condition)[key];
  return typeof value === 'string' ? value : undefined;
}

function paramStringArray(condition: ConditionLike, key: string): string[] | undefined {
  const value = paramsOf(condition)[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : undefined;
}

function childConditions(condition: ConditionLike): ConditionLike[] {
  return (condition.conditions as ConditionLike[] | undefined) ?? (condition.condition ? [condition.condition as ConditionLike] : []);
}

function conditionTagId(condition: ConditionLike): string | undefined {
  return condition.tagId ?? condition.targetTagId ?? paramString(condition, 'tagId') ?? (typeof condition.value === 'string' ? condition.value : undefined);
}

function conditionTagIds(condition: ConditionLike): string[] | undefined {
  return condition.tagIds ?? paramStringArray(condition, 'tagIds') ?? (Array.isArray(condition.value) ? condition.value.filter((item): item is string => typeof item === 'string') : undefined);
}

export function getCalculationCustomerType(context: CalculationContext): string | undefined {
  return context.customerOrder.customerType ?? context.indexes.customersById.get(context.customerOrder.customerId)?.customerType;
}

export function evaluateCalculationCondition(
  rawCondition: unknown,
  context: CalculationContext,
  knownTagIds: string[],
  modifier?: Modifier,
  accidentLevel?: string,
): boolean {
  const modifierTagId = (modifier as (Modifier & { tagId?: string; targetTagId?: string }) | undefined)?.tagId ??
    (modifier as (Modifier & { tagId?: string; targetTagId?: string }) | undefined)?.targetTagId ??
    modifier?.targetId;
  if (modifierTagId?.startsWith('tag_') && !knownTagIds.includes(modifierTagId)) {
    return false;
  }

  if (!rawCondition || rawCondition === 'always') {
    return true;
  }
  if (typeof rawCondition === 'string') {
    return rawCondition === 'always';
  }
  if (typeof rawCondition !== 'object') {
    return false;
  }

  const condition = rawCondition as ConditionLike;
  const tagId = conditionTagId(condition);
  const tagIds = conditionTagIds(condition);
  const customerId = condition.customerId ?? paramString(condition, 'customerId');
  const customerType = condition.customerType ?? paramString(condition, 'customerType') ?? (typeof condition.value === 'string' ? condition.value : undefined);
  const pricingModeId = condition.pricingModeId ?? paramString(condition, 'pricingModeId') ?? (typeof condition.value === 'string' ? condition.value : undefined);
  const category = condition.category ?? paramString(condition, 'category') ?? (typeof condition.value === 'string' ? condition.value : undefined);
  const selectedCustomerType = getCalculationCustomerType(context);

  switch (condition.type) {
    case 'always':
      return true;
    case 'all':
      return childConditions(condition).every((child) => evaluateCalculationCondition(child, context, knownTagIds, undefined, accidentLevel));
    case 'any':
      return childConditions(condition).some((child) => evaluateCalculationCondition(child, context, knownTagIds, undefined, accidentLevel));
    case 'not': {
      const child = childConditions(condition)[0];
      return child ? !evaluateCalculationCondition(child, context, knownTagIds, undefined, accidentLevel) : false;
    }
    case 'product_has_tag':
      return Boolean(tagId && knownTagIds.includes(tagId));
    case 'product_lacks_tag':
      return Boolean(tagId && !knownTagIds.includes(tagId));
    case 'product_has_any_tag':
      return Boolean(tagIds?.some((id) => knownTagIds.includes(id)));
    case 'product_has_all_tags':
      return Boolean(tagIds && tagIds.every((id) => knownTagIds.includes(id)));
    case 'product_lacks_all_tags':
      return Boolean(tagIds && tagIds.every((id) => !knownTagIds.includes(id)));
    case 'customer_is':
      return customerId === context.customerOrder.customerId;
    case 'customer_type_is':
      return customerType === selectedCustomerType;
    case 'pricing_mode_is':
      return pricingModeId === context.pricingMode.id;
    case 'dark_risk_category_is':
    case 'product_dark_risk_category_is':
      return Boolean(category && context.product.darkRiskIds.some((riskId) => context.indexes.darkRisksById.get(riskId)?.category === category));
    case 'dark_risk_category_is_or_unrevealed':
      return Boolean(
        category &&
          context.product.darkRiskIds.some((riskId) => {
            const risk = context.indexes.darkRisksById.get(riskId);
            const revealLevel = context.product.darkRiskRevealLevels[riskId];
            return risk?.category === category || revealLevel === DarkRiskRevealLevel.Hidden;
          }),
      );
    case 'dark_risk_category_is_not':
      return Boolean(category && context.product.darkRiskIds.every((riskId) => context.indexes.darkRisksById.get(riskId)?.category !== category));
    case 'accident_level_is': {
      const level = condition.accidentLevel ?? paramString(condition, 'accidentLevel');
      const levels = condition.accidentLevels ?? paramStringArray(condition, 'accidentLevels');
      return Boolean(accidentLevel && (level === accidentLevel || levels?.includes(accidentLevel)));
    }
    default:
      return false;
  }
}
