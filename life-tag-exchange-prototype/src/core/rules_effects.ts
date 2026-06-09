import { DarkRiskRevealLevel } from './constants';
import { drawCards } from './deckSystem';
import { createRng } from './rng';
import type { AppRuntime, CardDef, CardInstance, Effect, Modifier, ProductInstance } from './types';
import {
  getAllKnownTagIds,
  getSelectedCustomerOrder,
  getSelectedPricingMode,
  getSelectedProduct,
  getUnrevealedHiddenTagIds,
  getUnresolvedDarkRiskIds,
} from './selectors';

export interface EffectContext {
  app: AppRuntime;
  runState: AppRuntime['state'];
  dayState: AppRuntime['state']['dayState'];
  deckState: AppRuntime['state']['deckState'];
  configs: AppRuntime['configs'];
  indexes: AppRuntime['index'];
  cardDef: CardDef;
  cardInstance: CardInstance;
  selectedProduct: ProductInstance | null;
  targetProduct: ProductInstance | null;
  targetTagId?: string | null;
}

export interface EffectResult {
  ok: boolean;
  message: string;
  effectType: string;
}

export interface ApplyEffectsResult {
  ok: boolean;
  appliedEffects: EffectResult[];
  messages: string[];
}

const CARD_TAG_EFFECTS: Record<string, string> = {
  card_low_salary_pitch: 'tag_low_salary_acceptance',
  card_decent_package: 'tag_decent',
  card_crazy_persona: 'tag_crazy',
  card_elite_endorsement: 'tag_elite_school',
  card_emotional_stability_cert: 'tag_emotionally_stable',
  card_overtime_glory: 'tag_overtime',
  card_resilience_medal: 'tag_resilient',
  card_controversy_hook: 'tag_controversial',
  card_returnee_aura: 'tag_oversea_returnee',
  card_social_savvy_script: 'tag_social_savvy',
  card_small_town_success_story: 'tag_small_town_grinder',
  card_boring_but_safe: 'tag_boring',
  card_rebellious_spirit_package: 'tag_rebellious',
};

const CARD_DEFAULT_EFFECTS: Record<string, Effect[]> = {
  card_struggle_narrative: [
    { type: 'add_applied_tag_to_product', tagId: 'tag_young' },
    { type: 'add_applied_tag_to_product', tagId: 'tag_small_town_grinder' },
    { type: 'add_applied_tag_to_product', tagId: 'tag_resilient' },
  ],
  card_high_end_talent_label: [
    { type: 'add_applied_tag_to_product', tagId: 'tag_elite_school' },
    { type: 'add_applied_tag_to_product', tagId: 'tag_oversea_returnee' },
    { type: 'add_applied_tag_to_product', tagId: 'tag_decent' },
  ],
  card_family_friendly_package: [
    { type: 'add_applied_tag_to_product', tagId: 'tag_stable' },
    { type: 'add_applied_tag_to_product', tagId: 'tag_social_savvy' },
    { type: 'add_applied_tag_to_product', tagId: 'tag_decent' },
  ],
  card_no_complaint_promise: [
    { type: 'add_applied_tag_to_product', tagId: 'tag_low_salary_acceptance' },
    { type: 'reduce_risk', value: 10 },
  ],
  card_meme_packaging: [
    { type: 'add_applied_tag_to_product', tagId: 'tag_absurd' },
    { type: 'add_applied_tag_to_product', tagId: 'tag_controversial' },
  ],
  card_background_check: [{ type: 'reveal_dark_risk_category', count: 1 }, { type: 'reveal_hidden_tags', count: 1 }],
  card_trial_transfer: [{ type: 'reduce_risk', value: 20 }],
  card_pr_package: [{ type: 'reduce_risk', value: 20 }],
  card_hot_search_warmup: [{ type: 'add_price', value: 30 }, { type: 'add_risk', value: 10 }],
  card_risk_underwriting: [{ type: 'reduce_risk', value: 25 }],
  card_file_deletion: [{ type: 'reveal_dark_risk_category', count: 1 }, { type: 'reduce_risk', value: 15 }],
  card_parent_background_check: [{ type: 'reduce_risk', value: 15 }],
  card_decent_repair: [{ type: 'suppress_tag', tagId: 'tag_empty_persona', forceSuppress: true }, { type: 'reduce_risk', value: 10 }],
  card_acquaintance_guarantee: [{ type: 'reduce_risk', value: 15 }],
  card_black_red_plan: [{ type: 'multiply_price', value: 1.2 }, { type: 'add_risk', value: 15 }],
  card_platform_hedge: [{ type: 'reveal_dark_risk_category', count: 1 }, { type: 'reduce_risk', value: 15 }],
  card_seal_package: [{ type: 'reduce_risk', value: 20 }],
  card_draw_two_filter_one: [{ type: 'draw_cards', count: 2 }],
  card_legalese_cover: [{ type: 'reduce_risk', value: 15 }],
  card_shadow_pr: [{ type: 'reduce_risk', value: 20 }],
  card_reputation_exchange: [{ type: 'add_price', value: -10 }, { type: 'reduce_risk', value: 20 }],
  card_hidden_label_probe: [{ type: 'reveal_hidden_tags', count: 1 }],
};

const SUPPORTED_EFFECT_TYPES = new Set([
  'add_applied_tag_to_product',
  'reveal_hidden_tags',
  'reveal_dark_risk_category',
  'reveal_dark_risk_full',
  'add_product_modifier',
  'add_deal_modifier',
  'add_price',
  'multiply_price',
  'add_risk',
  'reduce_risk',
  'suppress_tag',
  'gain_cash',
  'lose_cash',
  'gain_reputation',
  'lose_reputation',
  'draw_cards',
]);

export function getCardActionPointCost(cardDef: CardDef, cardInstance?: CardInstance | null): number {
  if (cardInstance?.upgraded && typeof cardDef.upgradedActionPointCost === 'number') {
    return cardDef.upgradedActionPointCost;
  }
  return cardDef.actionPointCost ?? cardDef.apCost ?? cardDef.cost ?? 0;
}

export function getCardCashCost(cardDef: CardDef, cardInstance?: CardInstance | null): number {
  if (cardInstance?.upgraded && typeof cardDef.upgradedCashCost === 'number') {
    return cardDef.upgradedCashCost;
  }
  return cardDef.cashCost ?? 0;
}

export function getCardTargetType(cardDef: CardDef): NonNullable<CardDef['targetType']> {
  if (cardDef.targetType) {
    return cardDef.targetType;
  }
  if (cardDef.id === 'card_draw_two_filter_one') {
    return 'player';
  }
  return cardDef.targetType ?? 'selected_product';
}

export function getCardEffects(cardDef: CardDef, cardInstance?: CardInstance | null): Effect[] {
  if (cardInstance?.upgraded && cardDef.upgradedEffects && cardDef.upgradedEffects.length > 0) {
    return cardDef.upgradedEffects;
  }
  if (cardDef.effects.length > 0) {
    return cardDef.effects;
  }
  const tagId = CARD_TAG_EFFECTS[cardDef.id];
  if (tagId) {
    return [{ type: 'add_applied_tag_to_product', tagId }];
  }
  return CARD_DEFAULT_EFFECTS[cardDef.id] ?? [];
}

export function getUnsupportedEffectTypes(effects: Effect[]): string[] {
  return [...new Set(effects.map((effect) => effect.type).filter((type) => !SUPPORTED_EFFECT_TYPES.has(type)))];
}

export function createEffectContext(app: AppRuntime, cardDef: CardDef, cardInstance: CardInstance, targetProduct?: ProductInstance | null): EffectContext {
  return {
    app,
    runState: app.state,
    dayState: app.state.dayState,
    deckState: app.state.deckState,
    configs: app.configs,
    indexes: app.index,
    cardDef,
    cardInstance,
    selectedProduct: getSelectedProduct(app),
    targetProduct: targetProduct ?? getSelectedProduct(app),
  };
}

function getProduct(context: EffectContext): ProductInstance | null {
  return context.targetProduct ?? context.selectedProduct;
}

function getNumberValue(effect: Effect, fallback = 0): number {
  return typeof effect.value === 'number' && Number.isFinite(effect.value) ? effect.value : fallback;
}

function getModifierLabel(context: EffectContext, label: string): string {
  return `${context.cardDef.displayName}：${label}`;
}

function pushProductModifier(context: EffectContext, modifier: Modifier): void {
  const product = getProduct(context);
  if (!product) {
    return;
  }
  product.productModifiers ??= [];
  product.productModifiers.push({
    ...modifier,
    sourceType: modifier.sourceType ?? 'card',
    sourceId: modifier.sourceId ?? context.cardDef.id,
    durationType: modifier.durationType ?? 'this_deal',
  });
}

function applyAddAppliedTag(effect: Effect, context: EffectContext): EffectResult {
  const product = getProduct(context);
  const tagId = effect.tagId ?? effect.targetTagId ?? (typeof effect.value === 'string' ? effect.value : null);
  if (!product || !tagId) {
    return { ok: false, effectType: effect.type, message: '缺少商品或标签目标。' };
  }
  if (!context.indexes.tagsById.has(tagId)) {
    return { ok: false, effectType: effect.type, message: `找不到标签配置：${tagId}。` };
  }
  if (!product.appliedTagIds.includes(tagId)) {
    product.appliedTagIds.push(tagId);
  }
  const tagName = context.indexes.tagsById.get(tagId)?.displayName ?? tagId;
  return { ok: true, effectType: effect.type, message: `给【${product.displayName}】添加了【${tagName}】。` };
}

function applyRevealHiddenTags(effect: Effect, context: EffectContext): EffectResult {
  const product = getProduct(context);
  if (!product) {
    return { ok: false, effectType: effect.type, message: '请选择一个库存商品。' };
  }
  const count = Math.max(1, effect.count ?? getNumberValue(effect, 1));
  const tagIds = getUnrevealedHiddenTagIds(product).slice(0, count);
  if (tagIds.length === 0) {
    return { ok: false, effectType: effect.type, message: '没有可揭示的隐藏标签。' };
  }
  product.revealedHiddenTagIds.push(...tagIds);
  if (getUnrevealedHiddenTagIds(product).length === 0) {
    product.flags.identified = true;
  }
  return { ok: true, effectType: effect.type, message: `揭示了 ${tagIds.length} 个隐藏标签。` };
}

function applyRevealDarkRiskCategory(effect: Effect, context: EffectContext): EffectResult {
  const product = getProduct(context);
  if (!product) {
    return { ok: false, effectType: effect.type, message: '请选择一个库存商品。' };
  }
  const count = Math.max(1, effect.count ?? getNumberValue(effect, 1));
  const riskIds = getUnresolvedDarkRiskIds(product)
    .filter((riskId) => (product.darkRiskRevealLevels[riskId] as string | undefined) !== 'category')
    .slice(0, count);
  if (riskIds.length === 0) {
    return { ok: false, effectType: effect.type, message: '没有可揭示类别的暗风险。' };
  }
  for (const riskId of riskIds) {
    product.darkRiskRevealLevels[riskId] = DarkRiskRevealLevel.Hinted;
  }
  return { ok: true, effectType: effect.type, message: `揭示了 ${riskIds.length} 个暗风险类别线索。` };
}

function applyRevealDarkRiskFull(effect: Effect, context: EffectContext): EffectResult {
  const product = getProduct(context);
  if (!product) {
    return { ok: false, effectType: effect.type, message: '请选择一个库存商品。' };
  }
  const riskId = typeof effect.value === 'string' ? effect.value : getUnresolvedDarkRiskIds(product)[0];
  if (!riskId) {
    return { ok: false, effectType: effect.type, message: '没有可完全揭示的暗风险。' };
  }
  product.darkRiskRevealLevels[riskId] = DarkRiskRevealLevel.Revealed;
  if (!product.revealedDarkRiskIds.includes(riskId)) {
    product.revealedDarkRiskIds.push(riskId);
  }
  return { ok: true, effectType: effect.type, message: '完全揭示了 1 个暗风险。' };
}

function applyAddProductModifier(effect: Effect, context: EffectContext): EffectResult {
  if (!effect.modifier) {
    return { ok: false, effectType: effect.type, message: '缺少 modifier。' };
  }
  pushProductModifier(context, {
    ...effect.modifier,
    displayText: effect.modifier.displayText ?? getModifierLabel(context, '商品修正'),
  });
  return { ok: true, effectType: effect.type, message: '添加了商品修正。' };
}

function applyAddDealModifier(effect: Effect, context: EffectContext): EffectResult {
  if (!effect.modifier) {
    return { ok: false, effectType: effect.type, message: '缺少 modifier。' };
  }
  context.dayState.temporaryDealModifiers ??= [];
  context.dayState.temporaryDealModifiers.push({
    ...effect.modifier,
    sourceType: effect.modifier.sourceType ?? 'card',
    sourceId: effect.modifier.sourceId ?? context.cardDef.id,
    displayText: effect.modifier.displayText ?? getModifierLabel(context, '本单修正'),
    durationType: effect.modifier.durationType ?? 'this_deal',
    targetId: effect.modifier.targetId ?? getProduct(context)?.id,
  });
  return { ok: true, effectType: effect.type, message: '添加了本单修正。' };
}

function applySimpleModifier(effect: Effect, context: EffectContext): EffectResult {
  const value = getNumberValue(effect);
  const modifierByEffect: Record<string, Modifier> = {
    add_price: { stat: 'price', op: 'add', value, displayText: getModifierLabel(context, `售价 ${value >= 0 ? '+' : ''}${value}`) },
    multiply_price: { stat: 'priceMultiplier', op: 'multiply', value, displayText: getModifierLabel(context, `售价 ×${value}`) },
    add_risk: { stat: 'risk', op: 'add', value, displayText: getModifierLabel(context, `爆雷 ${value >= 0 ? '+' : ''}${value}`) },
    reduce_risk: { stat: 'risk', op: 'add', value: -Math.abs(value), displayText: getModifierLabel(context, `爆雷 -${Math.abs(value)}`) },
  };
  pushProductModifier(context, modifierByEffect[effect.type]);
  return { ok: true, effectType: effect.type, message: modifierByEffect[effect.type].displayText ?? '添加修正。' };
}

function applySuppressTag(effect: Effect, context: EffectContext): EffectResult {
  const product = getProduct(context);
  const tagId = effect.tagId ?? effect.targetTagId ?? context.targetTagId ?? (typeof effect.value === 'string' ? effect.value : null);
  if (!product || !tagId) {
    return { ok: false, effectType: effect.type, message: '缺少商品或标签目标。' };
  }
  if (!getAllKnownTagIds(product).includes(tagId)) {
    return { ok: false, effectType: effect.type, message: '只能压制已揭示标签。' };
  }
  const tag = context.indexes.tagsById.get(tagId);
  if (!tag) {
    return { ok: false, effectType: effect.type, message: '标签配置缺失。' };
  }
  if (!tag.isWashable && !effect.forceSuppress) {
    return { ok: false, effectType: effect.type, message: '该标签不可压制。' };
  }
  if (!product.suppressedTagIds.includes(tagId)) {
    product.suppressedTagIds.push(tagId);
  }
  return { ok: true, effectType: effect.type, message: `压制了【${tag.displayName}】。` };
}

function applyResourceEffect(effect: Effect, context: EffectContext): EffectResult {
  const value = Math.abs(getNumberValue(effect));
  switch (effect.type) {
    case 'gain_cash':
      context.runState.cash += value;
      return { ok: true, effectType: effect.type, message: `获得 ${value} 现金。` };
    case 'lose_cash':
      if (context.runState.cash < value) {
        return { ok: false, effectType: effect.type, message: `现金不足，需要 ${value} 现金。` };
      }
      context.runState.cash -= value;
      return { ok: true, effectType: effect.type, message: `失去 ${value} 现金。` };
    case 'gain_reputation':
      context.runState.reputation = Math.min(context.runState.maxReputation, context.runState.reputation + value);
      return { ok: true, effectType: effect.type, message: `恢复 ${value} 信誉。` };
    case 'lose_reputation':
      context.runState.reputation -= value;
      return { ok: true, effectType: effect.type, message: `失去 ${value} 信誉。` };
    default:
      return { ok: false, effectType: effect.type, message: `未知资源效果：${effect.type}。` };
  }
}

function applyDrawCards(effect: Effect, context: EffectContext): EffectResult {
  const count = Math.max(0, effect.count ?? getNumberValue(effect, 0));
  const rng = createRng(context.runState.rngSeed);
  rng.value = context.runState.rngState;
  const drawn = drawCards(context.deckState, count, rng);
  context.runState.rngState = rng.value;
  return { ok: true, effectType: effect.type, message: `抽取 ${drawn.length} 张牌。` };
}

export function applyEffect(effect: Effect, context: EffectContext): EffectResult {
  switch (effect.type) {
    case 'add_applied_tag_to_product':
      return applyAddAppliedTag(effect, context);
    case 'reveal_hidden_tags':
      return applyRevealHiddenTags(effect, context);
    case 'reveal_dark_risk_category':
      return applyRevealDarkRiskCategory(effect, context);
    case 'reveal_dark_risk_full':
      return applyRevealDarkRiskFull(effect, context);
    case 'add_product_modifier':
      return applyAddProductModifier(effect, context);
    case 'add_deal_modifier':
      return applyAddDealModifier(effect, context);
    case 'add_price':
    case 'multiply_price':
    case 'add_risk':
    case 'reduce_risk':
      return applySimpleModifier(effect, context);
    case 'suppress_tag':
      return applySuppressTag(effect, context);
    case 'gain_cash':
    case 'lose_cash':
    case 'gain_reputation':
    case 'lose_reputation':
      return applyResourceEffect(effect, context);
    case 'draw_cards':
      return applyDrawCards(effect, context);
    default:
      console.warn(`Unsupported effect type: ${effect.type}`);
      return { ok: false, effectType: effect.type, message: `该卡牌包含暂未支持的效果：${effect.type}。` };
  }
}

export function applyEffects(effects: Effect[], context: EffectContext): ApplyEffectsResult {
  const appliedEffects: EffectResult[] = [];
  const messages: string[] = [];

  for (const effect of effects) {
    const result = applyEffect(effect, context);
    appliedEffects.push(result);
    messages.push(result.message);
    if (!result.ok) {
      return { ok: false, appliedEffects, messages };
    }
  }

  return {
    ok: true,
    appliedEffects,
    messages,
  };
}

export function getSelectedContext(app: AppRuntime) {
  return {
    selectedProduct: getSelectedProduct(app),
    selectedCustomerOrder: getSelectedCustomerOrder(app),
    selectedPricingMode: getSelectedPricingMode(app),
  };
}
