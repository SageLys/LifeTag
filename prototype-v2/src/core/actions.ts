import { FailReason, ProductStatus, RunPhase, RunResult } from './constants';
import { drawDailyHand, endRun, finishDayAndStartNextDay } from './dayFlow';
import { moveHandCardToDiscard, moveHandCardToExhaust } from './deckSystem';
import { refreshDealPreviewIfPossible, resolveDeal } from './rules_deal';
import {
  buyPaidShopReward,
  canFinishRewardPhase,
  chooseBonusReward,
  chooseFreeBuildReward,
  claimMaintenanceReward,
  ensureRewardState,
  markRewardPhaseCompleted,
  skipBonusReward,
} from './rules_rewards';
import { createConditionContext, evaluateConditions } from './rules_conditions';
import {
  applyEffects,
  createEffectContext,
  getCardActionPointCost,
  getCardCashCost,
  getCardEffects,
  getCardTargetType,
  getUnsupportedEffectTypes,
} from './rules_effects';
import {
  findCardInstanceInHand,
  getAllKnownTagIds,
  getBuyProductDisabledReason,
  getCardDef,
  getInventoryProductById,
  getProductCandidateById,
  getSelectedCustomerOrder,
  getSelectedPricingMode,
  getSelectedProduct,
  getUnrevealedHiddenTagIds,
  getUnresolvedDarkRiskIds,
  hasUnknownProductInfo,
  isProductOperable,
} from './selectors';
import type { AppRuntime, BaseActionDef, CardDef, CardInstance, DealResult, Effect, ProductInstance, TagDef } from './types';

export interface ActionResult {
  ok: boolean;
  reason?: string;
  message: string;
  dealResult?: DealResult;
}

type BaseActionId = 'action_identify' | 'action_package' | 'action_pr' | 'action_wash_tag';

type BaseActionPayload = {
  productId?: string;
  tagId?: string;
  mode?: 'reduce_risk' | 'restore_reputation';
};

type BaseActionCost = {
  actionPointCost: number;
  cashCost: number;
};

export interface CanPlayCardResult {
  ok: boolean;
  reason?: string;
}

const FALLBACK_BASE_ACTION_COSTS: Record<BaseActionId, BaseActionCost> = {
  action_identify: { actionPointCost: 1, cashCost: 0 },
  action_package: { actionPointCost: 1, cashCost: 10 },
  action_pr: { actionPointCost: 1, cashCost: 20 },
  action_wash_tag: { actionPointCost: 1, cashCost: 15 },
};

export function selectProductCandidate(app: AppRuntime, productId: string): void {
  const exists = app.state.dayState.productCandidates.some((product) => product.id === productId);
  if (!exists) {
    app.state.runLog.push(`非法选择：找不到商品候选 ${productId}。`);
    return;
  }

  app.state.dayState.selectedProductId = productId;
  app.state.dayState.currentDealPreview = null;
}

function addActionLog(app: AppRuntime, message: string): void {
  const fullMessage = `第 ${app.state.currentDay} 天：${message}`;
  app.state.runLog.push(fullMessage);
  app.state.dayState.log.push(fullMessage);
}

function getBaseActionDef(app: AppRuntime, actionId: string): BaseActionDef | undefined {
  return app.index.baseActionsById.get(actionId) ?? app.configs.baseActions.find((action) => action.id === actionId);
}

export function getBaseActionCost(app: AppRuntime, actionId: string): BaseActionCost {
  const fallback = FALLBACK_BASE_ACTION_COSTS[actionId as BaseActionId] ?? { actionPointCost: 1, cashCost: 0 };
  const actionDef = getBaseActionDef(app, actionId);

  // 当前 baseActions.json 缺少成本字段时使用内置成本，后续可完全数据驱动。
  const cost = {
    actionPointCost: typeof actionDef?.actionPointCost === 'number' ? actionDef.actionPointCost : fallback.actionPointCost,
    cashCost: typeof actionDef?.cashCost === 'number' ? actionDef.cashCost : fallback.cashCost,
  };

  if (
    actionId === 'action_wash_tag' &&
    app.state.activePassives.some((passive) => passive.passiveId === 'passive_wash_label_pipeline' || passive.passiveId === 'passive_wash_line') &&
    !app.state.dayState.phaseFlags.passiveWashLabelUsed
  ) {
    cost.actionPointCost = Math.max(0, cost.actionPointCost - 1);
  }

  if (actionId === 'action_wash_tag' && !app.state.dayState.phaseFlags.firstWashCashDiscountUsed) {
    const discount = (app.configs.gameConfig as typeof app.configs.gameConfig & { firstWashCashDiscount?: number }).firstWashCashDiscount ?? 0;
    cost.cashCost = Math.max(0, cost.cashCost - discount);
  }

  if (actionId === 'action_identify' && !app.state.dayState.phaseFlags.firstIdentifyFreeUsed) {
    const firstIdentifyFree = (app.configs.gameConfig as typeof app.configs.gameConfig & { firstIdentifyFree?: number }).firstIdentifyFree ?? 0;
    if (firstIdentifyFree > 0) {
      cost.actionPointCost = 0;
    }
  }

  if (actionId === 'action_pr') {
    cost.cashCost = Math.max(0, cost.cashCost - ((app.configs.gameConfig as typeof app.configs.gameConfig & { basePrCashDiscount?: number }).basePrCashDiscount ?? 0));
  }

  const freeAction = app.state.temporaryRunModifiers.find(
    (modifier) =>
      (modifier.scope === 'first_action' || modifier.scope === 'first_base_action') &&
      modifier.target === actionId &&
      modifier.stat === 'actionPointCost' &&
      modifier.consumed < modifier.uses,
  );
  if (freeAction) {
    cost.actionPointCost = 0;
  }

  return cost;
}

function getPayload(payload?: unknown): BaseActionPayload {
  if (!payload || typeof payload !== 'object') {
    return {};
  }
  return payload as BaseActionPayload;
}

function getActionProduct(app: AppRuntime, payload: BaseActionPayload): ProductInstance | null {
  const productId = payload.productId ?? app.state.dayState.selectedProductId;
  if (!productId) {
    return null;
  }
  return getInventoryProductById(app, productId) ?? null;
}

function getUnrevealedHiddenTagId(product: ProductInstance): string | null {
  return product.hiddenTagIds.find((tagId) => !product.revealedHiddenTagIds.includes(tagId)) ?? null;
}

function getKnownWashableTagIds(product: ProductInstance): string[] {
  return [...new Set([...product.visibleTagIds, ...product.revealedHiddenTagIds, ...product.appliedTagIds].filter(Boolean))];
}

function getTagDef(app: AppRuntime, tagId: string): TagDef | null {
  return app.index.tagsById.get(tagId) ?? null;
}

function getCommonBaseActionDisabledReason(app: AppRuntime, actionId: string, payload: BaseActionPayload): string | null {
  // 去阶段化：不再检查 DayProcess 阶段，仅校验是否选中了可加工的库存商品及资源是否足够。
  const product = getActionProduct(app, payload);
  if (!product) {
    return '请选择一个库存商品。';
  }

  if (product.flags.sold || product.status === ProductStatus.Sold) {
    return '已售商品不能再加工。';
  }

  if (product.status === ProductStatus.Discarded) {
    return '已丢弃商品不能再加工。';
  }

  if (product.status !== ProductStatus.Inventory && product.status !== ProductStatus.Spoiled && !product.flags.inInventory) {
    return '只能加工库存商品。';
  }

  const cost = getBaseActionCost(app, actionId);
  if (app.state.dayState.actionPoints < cost.actionPointCost) {
    return '行动点不足。';
  }

  if (app.state.cash < cost.cashCost) {
    return `现金不足，需要 ${cost.cashCost} 现金。`;
  }

  return null;
}

export function getBaseActionDisabledReason(app: AppRuntime, actionId: string, payload?: unknown): string | null {
  const safePayload = getPayload(payload);

  if (!getBaseActionDef(app, actionId)) {
    return '基础操作配置缺失。';
  }

  const commonReason = getCommonBaseActionDisabledReason(app, actionId, safePayload);
  if (commonReason) {
    return commonReason;
  }

  const product = getActionProduct(app, safePayload);
  if (!product) {
    return '请选择一个库存商品。';
  }

  switch (actionId) {
    case 'action_identify':
      return getUnrevealedHiddenTagId(product) || getUnresolvedDarkRiskIds(product).length > 0 ? null : '该商品没有可鉴定的隐藏标签或暗风险线索。';
    case 'action_package':
      return product.flags.packaged ? '该商品已包装。' : null;
    case 'action_pr':
      return product.flags.hasPublicRelation ? '该商品已公关。' : null;
    case 'action_wash_tag': {
      const tagId = safePayload.tagId;
      if (!tagId) {
        return '请选择一个可洗标签。';
      }
      if (!getKnownWashableTagIds(product).includes(tagId)) {
        return '只能洗已揭示标签。';
      }
      const tag = getTagDef(app, tagId);
      if (!tag) {
        return '标签配置缺失。';
      }
      if (!tag.isWashable) {
        return '该标签不可洗。';
      }
      if (product.suppressedTagIds.includes(tagId)) {
        return '该标签已压制。';
      }
      return null;
    }
    default:
      return '未知基础操作。';
  }
}

function spendBaseActionCost(app: AppRuntime, actionId: string): void {
  const cost = getBaseActionCost(app, actionId);
  app.state.dayState.actionPoints = Math.max(0, app.state.dayState.actionPoints - cost.actionPointCost);
  app.state.cash = Math.max(0, app.state.cash - cost.cashCost);
  if (actionId === 'action_wash_tag') {
    app.state.dayState.phaseFlags.passiveWashLabelUsed = true;
    app.state.dayState.phaseFlags.firstWashCashDiscountUsed = true;
  }
  if (actionId === 'action_identify') {
    app.state.dayState.phaseFlags.firstIdentifyFreeUsed = true;
  }
  const freeAction = app.state.temporaryRunModifiers.find(
    (modifier) =>
      (modifier.scope === 'first_action' || modifier.scope === 'first_base_action') &&
      modifier.target === actionId &&
      modifier.stat === 'actionPointCost' &&
      modifier.consumed < modifier.uses,
  );
  if (freeAction) {
    freeAction.consumed += 1;
    addActionLog(app, `临时效果触发：${freeAction.displayName}。`);
    app.state.temporaryRunModifiers = app.state.temporaryRunModifiers.filter((modifier) => modifier.consumed < modifier.uses);
  }
}

function finishBaseAction(app: AppRuntime, actionId: string, message: string): ActionResult {
  spendBaseActionCost(app, actionId);
  refreshDealPreviewIfPossible(app);
  addActionLog(app, message);
  return {
    ok: true,
    message,
  };
}

function applyIdentifyAction(app: AppRuntime, payload: BaseActionPayload): ActionResult {
  const product = getActionProduct(app, payload);
  if (!product) {
    return { ok: false, reason: 'missing_product', message: '请选择一个库存商品。' };
  }

  const hiddenTagId = getUnrevealedHiddenTagId(product);
  if (!hiddenTagId) {
    const darkRiskId = getUnresolvedDarkRiskIds(product)[0];
    if (!darkRiskId) {
      return { ok: false, reason: 'no_hidden_tag', message: '该商品没有可鉴定的隐藏标签或暗风险线索。' };
    }
    product.darkRiskRevealLevels[darkRiskId] = 'hinted';
    const risk = app.index.darkRisksById.get(darkRiskId);
    return finishBaseAction(app, 'action_identify', `鉴定【${product.displayName}】，发现${risk?.category ?? '未知'}类暗风险线索。`);
  }

  product.revealedHiddenTagIds.push(hiddenTagId);
  if (!getUnrevealedHiddenTagId(product)) {
    product.flags.identified = true;
  }

  return finishBaseAction(app, 'action_identify', `鉴定【${product.displayName}】，揭示 1 个隐藏标签。`);
}

function applyPackageAction(app: AppRuntime, payload: BaseActionPayload): ActionResult {
  const product = getActionProduct(app, payload);
  if (!product) {
    return { ok: false, reason: 'missing_product', message: '请选择一个库存商品。' };
  }

  product.flags.packaged = true;
  const preferenceThreshold = app.configs.gameConfig.basePackagePreferenceThreshold ?? 2;
  const preferenceBonus = app.configs.gameConfig.basePackagePreferenceBonus ?? 15;
  const selectedOrder = getSelectedCustomerOrder(app);
  const knownTags = getAllKnownTagIds(product);
  const preferenceHits = selectedOrder ? selectedOrder.preferredTagIds.filter((tagId) => knownTags.includes(tagId)).length : 0;
  if (selectedOrder && preferenceHits >= preferenceThreshold && preferenceBonus !== 0) {
    product.productModifiers ??= [];
    product.productModifiers.push({
      stat: 'price',
      op: 'add',
      value: preferenceBonus,
      sourceType: 'base_action',
      sourceId: 'action_package',
      displayText: `基础包装：命中 ${preferenceHits} 个顾客偏好，售价 +${preferenceBonus}`,
    });
  }
  return finishBaseAction(app, 'action_package', `包装【${product.displayName}】，花费 ${getBaseActionCost(app, 'action_package').cashCost} 现金，售价提高但爆雷上升。`);
}

function applyPublicRelationAction(app: AppRuntime, payload: BaseActionPayload): ActionResult {
  const product = getActionProduct(app, payload);
  if (!product) {
    return { ok: false, reason: 'missing_product', message: '请选择一个库存商品。' };
  }

  product.flags.hasPublicRelation = true;
  product.productModifiers ??= [];
  product.productModifiers.push({
    stat: 'accidentLevel',
    op: 'add',
    value: -1,
    sourceType: 'base_action',
    sourceId: 'action_pr',
    displayText: '基础公关：小/中事故降级',
    condition: { type: 'accident_level_is', params: { accidentLevels: ['minor', 'medium'] } },
  });
  return finishBaseAction(app, 'action_pr', `公关【${product.displayName}】，花费 ${getBaseActionCost(app, 'action_pr').cashCost} 现金，本商品风险降低。`);
}

function applyWashTagAction(app: AppRuntime, payload: BaseActionPayload): ActionResult {
  const product = getActionProduct(app, payload);
  const tagId = payload.tagId;
  if (!product || !tagId) {
    return { ok: false, reason: 'missing_target', message: '请选择一个可洗标签。' };
  }

  const tag = getTagDef(app, tagId);
  if (!tag) {
    return { ok: false, reason: 'missing_tag', message: '标签配置缺失。' };
  }

  product.suppressedTagIds.push(tagId);
  const selectedOrder = getSelectedCustomerOrder(app);
  if (selectedOrder?.tabooTagIds.includes(tagId)) {
    product.productModifiers ??= [];
    product.productModifiers.push({
      stat: 'risk',
      op: 'add',
      value: -10,
      sourceType: 'base_action',
      sourceId: 'action_wash_tag',
      displayText: '洗标命中当前顾客雷区：爆雷 -10',
    });
  }
  return finishBaseAction(app, 'action_wash_tag', `洗标【${product.displayName}】的【${tag.displayName}】，花费 ${getBaseActionCost(app, 'action_wash_tag').cashCost} 现金，标签被压制。`);
}

export function useBaseAction(app: AppRuntime, actionId: string, payload?: unknown): ActionResult {
  const safePayload = getPayload(payload);
  const disabledReason = getBaseActionDisabledReason(app, actionId, safePayload);
  if (disabledReason) {
    return {
      ok: false,
      reason: disabledReason,
      message: disabledReason,
    };
  }

  switch (actionId) {
    case 'action_identify':
      return applyIdentifyAction(app, safePayload);
    case 'action_package':
      return applyPackageAction(app, safePayload);
    case 'action_pr':
      return applyPublicRelationAction(app, safePayload);
    case 'action_wash_tag':
      return applyWashTagAction(app, safePayload);
    default:
      return {
        ok: false,
        reason: 'unknown_action',
        message: '未知基础操作。',
      };
  }
}

function getCardConditions(cardDef: CardDef) {
  return [...(cardDef.conditions ?? []), ...(cardDef.condition ? [cardDef.condition] : [])];
}

function getLoseCashEffectCost(effects: Effect[]): number {
  return effects.reduce((total, effect) => {
    if (effect.type !== 'lose_cash' || typeof effect.value !== 'number') {
      return total;
    }
    return total + Math.max(0, effect.value);
  }, 0);
}

function getEffectiveCardCosts(app: AppRuntime, cardDef: CardDef, cardInstance: CardInstance): { apCost: number; cashCost: number } {
  const apCost = getCardActionPointCost(cardDef, cardInstance);
  let cashCost = getCardCashCost(cardDef, cardInstance);
  if (
    (cardDef.id === 'card_background_check' || cardDef.id === 'card_background_check_plus') &&
    app.state.activePassives.some((passive) => passive.passiveId === 'passive_background_check_outsource' || passive.passiveId === 'passive_background_outsource') &&
    !app.state.dayState.phaseFlags.passiveBackgroundCheckUsed
  ) {
    cashCost = Math.max(0, cashCost - 15);
  }
  const freePackage = app.state.temporaryRunModifiers.find(
    (modifier) =>
      modifier.scope === 'first_card_type' &&
      modifier.target === cardDef.cardType &&
      modifier.consumed < modifier.uses,
  );
  if (freePackage) {
    if (freePackage.stat === 'cashCost') cashCost = 0;
    if (freePackage.stat === 'actionPointCost') return { apCost: 0, cashCost };
  }
  return { apCost, cashCost };
}

function validateEffectAvailability(app: AppRuntime, effects: Effect[], targetProduct: ProductInstance | null): string | null {
  for (const effect of effects) {
    switch (effect.type) {
      case 'reveal_hidden_tags':
        if (!targetProduct || getUnrevealedHiddenTagIds(targetProduct).length === 0) {
          return '该卡牌需要商品存在未揭示隐藏标签。';
        }
        break;
      case 'reveal_dark_risk_category':
      case 'reveal_dark_risk_full':
        if (!targetProduct || getUnresolvedDarkRiskIds(targetProduct).length === 0) {
          return '该卡牌需要商品存在未处理暗风险。';
        }
        break;
      case 'suppress_tag': {
        const params = (effect.params ?? {}) as Record<string, unknown>;
        const tagId = effect.tagId ?? effect.targetTagId ?? (typeof params.tagId === 'string' ? params.tagId : null) ?? (typeof effect.value === 'string' ? effect.value : null);
        if (!tagId && params.autoPick === 'known_negative') {
          const available = targetProduct
            ? getAllKnownTagIds(targetProduct).some((knownTagId) => {
                const tag = app.index.tagsById.get(knownTagId);
                return Boolean(tag?.isNegative && tag.isWashable && !targetProduct.suppressedTagIds.includes(knownTagId));
              })
            : false;
          if (!available) {
            return '该卡牌需要商品存在已揭示、可压制的负面标签。';
          }
          break;
        }
        if (!targetProduct || !tagId) {
          return '该卡牌需要指定可压制标签。';
        }
        if (!getAllKnownTagIds(targetProduct).includes(tagId)) {
          return '只能压制已揭示标签。';
        }
        const tag = app.index.tagsById.get(tagId);
        if (!tag) {
          return '标签配置缺失。';
        }
        if (!tag.isWashable && !effect.forceSuppress) {
          return '该标签不可压制。';
        }
        if (targetProduct.suppressedTagIds.includes(tagId)) {
          return '该标签已压制。';
        }
        break;
      }
      default:
        break;
    }
  }

  return null;
}

function getPlayCardTargetProduct(app: AppRuntime, cardDef: CardDef): ProductInstance | null {
  const targetType = getCardTargetType(cardDef);
  if (targetType === 'selected_product' || targetType === 'selected_deal') {
    return getInventoryProductById(app, app.state.dayState.selectedProductId ?? '') ?? null;
  }
  return null;
}

function validateCardTarget(app: AppRuntime, cardDef: CardDef): string | null {
  const targetType = getCardTargetType(cardDef);
  if (targetType === 'none' || targetType === 'player') {
    return null;
  }

  if (targetType === 'selected_customer') {
    return app.state.dayState.selectedCustomerOrderId ? null : '请选择顾客。';
  }

  const product = getPlayCardTargetProduct(app, cardDef);
  if (!product) {
    return '请选择一个库存商品。';
  }
  if (product.flags.sold || product.status === ProductStatus.Sold) {
    return '已售商品不能作为卡牌目标。';
  }
  if (!isProductOperable(product)) {
    return '只能以库存商品作为卡牌目标。';
  }

  if (targetType === 'selected_deal') {
    if (!app.state.dayState.selectedCustomerOrderId || !app.state.dayState.selectedPricingModeId || !app.state.dayState.currentDealPreview) {
      return '请选择商品、顾客和定价后使用。';
    }
  }

  return null;
}

export function canPlayCard(app: AppRuntime, cardInstanceId: string, payload?: unknown): CanPlayCardResult {
  void payload;
  // 去阶段化：不再检查 DayProcess 阶段，仅校验手牌、资源、目标与卡牌条件。
  const cardInstance = findCardInstanceInHand(app.state.deckState, cardInstanceId);
  if (!cardInstance) {
    return { ok: false, reason: '该卡牌不在手牌中。' };
  }

  const cardDef = getCardDef(app, cardInstance);
  if (!cardDef) {
    return { ok: false, reason: '找不到卡牌配置。' };
  }

  const effects = getCardEffects(cardDef, cardInstance);
  if (effects.length === 0) {
    return { ok: false, reason: '该卡牌效果暂未支持。' };
  }

  const unsupportedEffects = getUnsupportedEffectTypes(effects);
  if (unsupportedEffects.length > 0) {
    return { ok: false, reason: `该卡牌包含暂未支持的效果：${unsupportedEffects[0]}。` };
  }

  const { apCost, cashCost: baseCashCost } = getEffectiveCardCosts(app, cardDef, cardInstance);
  if (app.state.dayState.actionPoints < apCost) {
    return { ok: false, reason: `行动点不足，需要 ${apCost} 点。` };
  }

  const cashCost = baseCashCost + getLoseCashEffectCost(effects);
  if (app.state.cash < cashCost) {
    return { ok: false, reason: `现金不足，需要 ${cashCost} 现金。` };
  }

  const targetReason = validateCardTarget(app, cardDef);
  if (targetReason) {
    return { ok: false, reason: targetReason };
  }

  const targetProduct = getPlayCardTargetProduct(app, cardDef);
  const effectAvailabilityReason = validateEffectAvailability(app, effects, targetProduct);
  if (effectAvailabilityReason) {
    return { ok: false, reason: effectAvailabilityReason };
  }

  const conditionContext = createConditionContext(app, {
    cardDef,
    cardInstance,
    targetProduct,
  });
  const conditionResult = evaluateConditions(getCardConditions(cardDef), conditionContext);
  if (!conditionResult.ok) {
    return { ok: false, reason: conditionResult.failedReasons[0] ?? '卡牌条件不满足。' };
  }

  return { ok: true };
}

function moveCardAfterPlay(app: AppRuntime, cardInstance: CardInstance, cardDef: CardDef): void {
  const shouldExhaust =
    cardDef.exhaustAfterUse === true ||
    cardDef.consumeAfterUse === true ||
    (cardInstance.temporary === true && cardDef.discardAfterUse !== true);

  if (shouldExhaust) {
    moveHandCardToExhaust(app.state.deckState, cardInstance.id);
    return;
  }

  moveHandCardToDiscard(app.state.deckState, cardInstance.id);
}

export function playCard(app: AppRuntime, cardInstanceId: string, payload?: unknown): ActionResult {
  const canPlay = canPlayCard(app, cardInstanceId, payload);
  if (!canPlay.ok) {
    return {
      ok: false,
      reason: canPlay.reason,
      message: canPlay.reason ?? '不能使用该卡牌。',
    };
  }

  const cardInstance = findCardInstanceInHand(app.state.deckState, cardInstanceId);
  if (!cardInstance) {
    return { ok: false, reason: 'not_in_hand', message: '该卡牌不在手牌中。' };
  }
  const cardDef = getCardDef(app, cardInstance);
  if (!cardDef) {
    return { ok: false, reason: 'missing_card_def', message: '找不到卡牌配置。' };
  }

  const targetProduct = getPlayCardTargetProduct(app, cardDef);
  const effects = getCardEffects(cardDef, cardInstance);
  const effectContext = createEffectContext(app, cardDef, cardInstance, targetProduct);

  const costs = getEffectiveCardCosts(app, cardDef, cardInstance);
  app.state.dayState.actionPoints = Math.max(0, app.state.dayState.actionPoints - costs.apCost);
  app.state.cash = Math.max(0, app.state.cash - costs.cashCost);

  const effectResult = applyEffects(effects, effectContext);
  if (!effectResult.ok) {
    app.state.dayState.actionPoints += costs.apCost;
    app.state.cash += costs.cashCost;
    return {
      ok: false,
      reason: 'effect_failed',
      message: effectResult.messages[effectResult.messages.length - 1] ?? '卡牌效果执行失败。',
    };
  }

  moveCardAfterPlay(app, cardInstance, cardDef);
  if (cardDef.id === 'card_background_check' || cardDef.id === 'card_background_check_plus') {
    app.state.dayState.phaseFlags.passiveBackgroundCheckUsed = true;
    if (app.state.activePassives.some((passive) => passive.passiveId === 'passive_background_check_outsource' || passive.passiveId === 'passive_background_outsource')) {
      const product = targetProduct;
      if (product) {
        product.productModifiers ??= [];
        product.productModifiers.push({ stat: 'risk', op: 'add', value: -5, sourceType: 'passive', sourceId: 'passive_background_check_outsource', displayText: '背调外包：额外爆雷 -5' });
      }
    }
  }
  const freePackage = app.state.temporaryRunModifiers.find(
    (modifier) =>
      modifier.scope === 'first_card_type' &&
      modifier.target === cardDef.cardType &&
      modifier.stat === 'cashCost' &&
      modifier.consumed < modifier.uses,
  );
  if (freePackage) {
    freePackage.consumed += 1;
    addActionLog(app, `临时效果触发：${freePackage.displayName}。`);
    app.state.temporaryRunModifiers = app.state.temporaryRunModifiers.filter((modifier) => modifier.consumed < modifier.uses);
  }
  refreshDealPreviewIfPossible(app);
  addActionLog(app, `使用【${cardDef.displayName}】。${effectResult.messages.join('')}`);

  return {
    ok: true,
    message: `使用【${cardDef.displayName}】。`,
  };
}

export function selectProduct(app: AppRuntime, productId: string): ActionResult {
  // 去阶段化：随时可以选择库存商品用于加工 / 交易，只校验商品本身是否可交易。
  const product = getInventoryProductById(app, productId);
  if (!product) {
    return {
      ok: false,
      reason: 'not_found',
      message: '找不到库存商品。',
    };
  }

  if (product.status !== ProductStatus.Inventory || product.flags.sold) {
    return {
      ok: false,
      reason: 'not_sellable',
      message: '该商品当前不可用于交易。',
    };
  }

  app.state.dayState.selectedProductId = product.id;
  refreshDealPreviewIfPossible(app);
  addActionLog(app, `选择商品：${product.displayName}`);

  return {
    ok: true,
    message: '已选择商品',
  };
}

export function selectCustomerOrder(app: AppRuntime, orderId: string): void {
  const order = app.state.dayState.customerOrders.find((customerOrder) => customerOrder.id === orderId);
  if (!order) {
    addActionLog(app, `非法选择：找不到顾客订单 ${orderId}。`);
    return;
  }

  app.state.dayState.selectedCustomerOrderId = orderId;
  app.state.dayState.selectedCustomerId = order.customerId;
  refreshDealPreviewIfPossible(app);
  addActionLog(app, `选择顾客：${order.displayName}`);
}

export function selectPricingMode(app: AppRuntime, pricingModeId: string): ActionResult {
  // 去阶段化：随时可以选择定价方式，盲盒价仍需商品存在未知信息。
  const pricingMode = app.index.pricingModesById.get(pricingModeId);
  if (!pricingMode) {
    return {
      ok: false,
      reason: 'not_found',
      message: '找不到定价方式。',
    };
  }

  const selectedProduct = getInventoryProductById(app, app.state.dayState.selectedProductId ?? '');
  if (pricingMode.id === 'pricing_blind_box') {
    if (!selectedProduct) {
      return {
        ok: false,
        reason: 'missing_product',
        message: '请选择商品后判断是否可用。',
      };
    }

    if (!hasUnknownProductInfo(selectedProduct)) {
      return {
        ok: false,
        reason: 'no_unknown_info',
        message: '该商品没有未知信息，不能使用盲盒价。',
      };
    }
  }
  if (pricingMode.id === 'pricing_clearance' && app.state.dayState.phaseFlags.clearanceSaleUsed) {
    return {
      ok: false,
      reason: 'daily_limit',
      message: '清仓卖每日限 1 次。',
    };
  }

  app.state.dayState.selectedPricingModeId = pricingMode.id;
  refreshDealPreviewIfPossible(app);
  addActionLog(app, `选择定价方式：${pricingMode.displayName}`);

  return {
    ok: true,
    message: '已选择定价方式',
  };
}

export function clearDealSelection(app: AppRuntime): ActionResult {
  app.state.dayState.selectedProductId = null;
  app.state.dayState.selectedCustomerOrderId = null;
  app.state.dayState.selectedCustomerId = null;
  app.state.dayState.selectedPricingModeId = null;
  app.state.dayState.currentDealPreview = null;
  addActionLog(app, '清空交易选择。');

  return {
    ok: true,
    message: '已清空交易选择',
  };
}

function getConfirmSellDisabledReason(app: AppRuntime): string | null {
  // 去阶段化：出售只校验商品 / 顾客 / 定价 / 预览是否齐备且可成交，不再检查 DaySell 阶段。
  const selectedProductId = app.state.dayState.selectedProductId;
  if (!selectedProductId) {
    return '未选择商品。';
  }

  const rawProduct = app.state.inventory.find((product) => product.id === selectedProductId);
  if (!rawProduct) {
    return '未选择商品。';
  }
  if (rawProduct.flags.sold || rawProduct.status === ProductStatus.Sold) {
    return '商品已出售。';
  }
  if (rawProduct.status !== ProductStatus.Inventory) {
    return '商品不在库存。';
  }

  const product = getSelectedProduct(app);
  if (!product) {
    return '未选择商品。';
  }

  if (!getSelectedCustomerOrder(app) || !app.state.dayState.selectedCustomerOrderId) {
    return '未选择顾客。';
  }

  const pricingMode = getSelectedPricingMode(app);
  if (!pricingMode || !app.state.dayState.selectedPricingModeId) {
    return '未选择定价方式。';
  }
  if (pricingMode.id === 'pricing_blind_box' && !hasUnknownProductInfo(product)) {
    return '定价方式不可用。';
  }

  const preview = app.state.dayState.currentDealPreview;
  if (!preview) {
    return '交易预览计算失败。';
  }
  if (preview.canConfirmSell === false || preview.disabledReason) {
    return preview.disabledReason ?? '交易预览计算失败。';
  }

  return null;
}

function failRunIfNeeded(app: AppRuntime): void {
  if (app.state.cash < 0) {
    app.state.result = RunResult.Failed;
    app.state.failReason = FailReason.CashBelowZero;
    app.state.phase = RunPhase.RunFailed;
    app.state.dayState.phase = RunPhase.RunFailed;
    addActionLog(app, '资金链断裂，现金低于 0，本局失败。');
    endRun(app);
    return;
  }

  if (app.state.reputation <= 0) {
    app.state.result = RunResult.Failed;
    app.state.failReason = FailReason.ReputationZero;
    app.state.phase = RunPhase.RunFailed;
    app.state.dayState.phase = RunPhase.RunFailed;
    addActionLog(app, '店铺信誉崩盘，信誉归零，本局失败。');
    endRun(app);
  }
}

export function confirmSell(app: AppRuntime): ActionResult {
  const disabledReason = getConfirmSellDisabledReason(app);
  if (disabledReason) {
    addActionLog(app, `出售失败：${disabledReason}`);
    return {
      ok: false,
      reason: disabledReason,
      message: disabledReason,
    };
  }

  const dealResult = resolveDeal(app);
  app.state.dealLog.push(dealResult);
  if (dealResult.accident) {
    app.state.accidentLog.push(dealResult.accident);
  }

  const message =
    `成交 ${dealResult.productDisplayName} → ${dealResult.customerDisplayName}，` +
    `售价 ${dealResult.finalPrice}，爆雷 ${dealResult.finalRisk}，事故 ${dealResult.finalAccidentLevel}，` +
    `退款 ${dealResult.refund}，罚款 ${dealResult.fine}，信誉 ${dealResult.reputationDelta}，` +
    `现金 ${dealResult.cashDelta}，单笔利润 ${dealResult.singleProfit}，累计利润 +${dealResult.totalProfitGain}。`;
  addActionLog(app, message);
  failRunIfNeeded(app);
  refreshDealPreviewIfPossible(app);

  return {
    ok: true,
    message,
    dealResult,
  };
}

function rewardTarget(payload?: unknown): { cardInstanceId?: string; productId?: string; poolCardId?: string } {
  if (!payload || typeof payload !== 'object') return {};
  const data = payload as Record<string, unknown>;
  return {
    cardInstanceId: typeof data.cardInstanceId === 'string' ? data.cardInstanceId : undefined,
    productId: typeof data.productId === 'string' ? data.productId : undefined,
    poolCardId: typeof data.poolCardId === 'string' ? data.poolCardId : undefined,
  };
}

function toActionResult(label: string, result: ReturnType<typeof claimMaintenanceReward>): ActionResult {
  const message = result.ok ? `${label}成功。${result.effectsApplied.join('；')}` : result.messages[result.messages.length - 1] ?? `${label}失败。`;
  return { ok: result.ok, reason: result.ok ? undefined : message, message };
}

export function chooseReward(app: AppRuntime, rewardInstanceId: string, payload?: unknown): ActionResult {
  return toActionResult('选择免费构筑奖励', chooseFreeBuildReward(app, rewardInstanceId, rewardTarget(payload)));
}

export function claimMaintenance(app: AppRuntime, rewardInstanceId: string, payload?: unknown): ActionResult {
  return toActionResult('领取维护奖励', claimMaintenanceReward(app, rewardInstanceId, rewardTarget(payload)));
}

export function buyPaidReward(app: AppRuntime, rewardInstanceId: string, payload?: unknown): ActionResult {
  return toActionResult('购买付费奖励', buyPaidShopReward(app, rewardInstanceId, rewardTarget(payload)));
}

export function chooseBonus(app: AppRuntime, rewardInstanceId: string, payload?: unknown): ActionResult {
  return toActionResult('选择爆单奖励', chooseBonusReward(app, rewardInstanceId, rewardTarget(payload)));
}

export function skipBonus(app: AppRuntime): ActionResult {
  skipBonusReward(app);
  return { ok: true, message: '已跳过爆单奖励。' };
}

export function finishRewardPhase(app: AppRuntime): ActionResult {
  const canFinish = canFinishRewardPhase(app);
  if (!canFinish.ok) {
    const message = canFinish.reason ?? '还不能结束收店。';
    addActionLog(app, `结束收店失败：${message}`);
    return { ok: false, reason: message, message };
  }
  markRewardPhaseCompleted(app);
  finishDayAndStartNextDay(app);
  return { ok: true, message: '结束收店，进入下一天。' };
}

/**
 * 去阶段化：玩家点击牌堆 / 手牌区时抽取当天手牌，每天仅一次（drawnToday 限制）。
 */
export function drawHand(app: AppRuntime): ActionResult {
  if (app.state.dayState.phaseFlags.drawnToday) {
    return { ok: false, reason: '今日已抽过手牌。', message: '今日已抽过手牌。' };
  }
  drawDailyHand(app);
  return { ok: true, message: '抽取当天经营手牌。' };
}

/**
 * 去阶段化：开启收店的具体条件（而非阶段门槛）。
 * 当天至少完成 dailyMinimumSaleCount 笔交易后才能收店。
 */
export function getOpenClosingDisabledReason(app: AppRuntime): string | null {
  const minSale = app.configs.gameConfig.dailyMinimumSaleCount ?? 0;
  if (app.state.dayState.soldProductCount < minSale) {
    return `今日至少完成 ${minSale} 笔交易后才能收店。`;
  }
  return null;
}

/**
 * 去阶段化：玩家点击保险柜时，若满足收店条件则生成收店奖励（rewardState），否则返回短提示。
 */
export function openClosing(app: AppRuntime): ActionResult {
  if (app.state.dayState.rewardState) {
    return { ok: true, message: '收店已开启。' };
  }
  const reason = getOpenClosingDisabledReason(app);
  if (reason) {
    return { ok: false, reason, message: reason };
  }
  ensureRewardState(app);
  addActionLog(app, '开启收店，生成收店奖励。');
  return { ok: true, message: '开启收店。' };
}

export function buyProduct(app: AppRuntime, productId: string): ActionResult {
  const product = getProductCandidateById(app, productId);
  const disabledReason = getBuyProductDisabledReason(app, product);

  if (disabledReason || !product) {
    const message = disabledReason ?? '商品不存在';
    app.state.runLog.push(`[第 ${app.state.currentDay} 天] 买入失败：${message}。`);
    app.state.dayState.log.push(`[第 ${app.state.currentDay} 天] 买入失败：${message}。`);
    return {
      ok: false,
      reason: message,
      message,
    };
  }

  const purchaseDiscount = app.state.temporaryRunModifiers.find(
    (modifier) =>
      modifier.scope === 'next_purchase' &&
      modifier.stat === 'cost' &&
      modifier.consumed < modifier.uses,
  );
  const discount = purchaseDiscount ? Math.abs(purchaseDiscount.value) : 0;
  const finalCost = Math.max(1, product.cost - discount);
  app.state.cash -= finalCost;
  if (purchaseDiscount) {
    purchaseDiscount.consumed += 1;
    if (product.darkRiskIds.length > 0) {
      const refund = 10;
      app.state.cash += refund;
      app.state.runLog.push(`[第 ${app.state.currentDay} 天] 低价收割命中暗风险，返还 ${refund} 现金。`);
      app.state.dayState.log.push(`[第 ${app.state.currentDay} 天] 低价收割命中暗风险，返还 ${refund} 现金。`);
    }
    app.state.temporaryRunModifiers = app.state.temporaryRunModifiers.filter((modifier) => modifier.consumed < modifier.uses);
  }
  product.status = ProductStatus.Inventory;
  product.flags.inInventory = true;
  app.state.inventory.push(product);
  app.state.dayState.boughtProductCount += 1;
  app.state.dayState.selectedProductId = product.id;

  const message = `买入【${product.displayName}】，花费 ${finalCost} 现金${discount > 0 ? `（已优惠 ${discount}）` : ''}。`;
  app.state.runLog.push(`[第 ${app.state.currentDay} 天] ${message}`);
  app.state.dayState.log.push(`[第 ${app.state.currentDay} 天] ${message}`);

  return {
    ok: true,
    message: '买入成功',
  };
}
