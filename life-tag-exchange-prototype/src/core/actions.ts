import { FailReason, ProductStatus, RunPhase, RunResult } from './constants';
import { endRun, finishDayAndStartNextDay } from './dayFlow';
import { moveHandCardToDiscard, moveHandCardToExhaust } from './deckSystem';
import { refreshDealPreviewIfPossible, resolveDeal } from './rules_deal';
import { applyReward, canChooseReward } from './rules_rewards';
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
  action_wash_tag: { actionPointCost: 1, cashCost: 20 },
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

function canSelectForDeal(app: AppRuntime): boolean {
  return app.state.phase === RunPhase.DayProcess || app.state.phase === RunPhase.DaySell;
}

function getBaseActionDef(app: AppRuntime, actionId: string): BaseActionDef | undefined {
  return app.index.baseActionsById.get(actionId) ?? app.configs.baseActions.find((action) => action.id === actionId);
}

export function getBaseActionCost(app: AppRuntime, actionId: string): BaseActionCost {
  const fallback = FALLBACK_BASE_ACTION_COSTS[actionId as BaseActionId] ?? { actionPointCost: 1, cashCost: 0 };
  const actionDef = getBaseActionDef(app, actionId);

  // TODO: P0 后续应完全数据驱动；当前 baseActions.json 缺少成本字段时使用 P0-9 fallback。
  return {
    actionPointCost: typeof actionDef?.actionPointCost === 'number' ? actionDef.actionPointCost : fallback.actionPointCost,
    cashCost: typeof actionDef?.cashCost === 'number' ? actionDef.cashCost : fallback.cashCost,
  };
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
  if (app.state.phase !== RunPhase.DayProcess) {
    return '请返回处理阶段后再操作。';
  }

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
      return getUnrevealedHiddenTagId(product) ? null : '该商品没有可鉴定的隐藏标签。';
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
    return { ok: false, reason: 'no_hidden_tag', message: '该商品没有可鉴定的隐藏标签。' };
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
  return finishBaseAction(app, 'action_package', `包装【${product.displayName}】，花费 ${getBaseActionCost(app, 'action_package').cashCost} 现金，售价提高但爆雷上升。`);
}

function applyPublicRelationAction(app: AppRuntime, payload: BaseActionPayload): ActionResult {
  const product = getActionProduct(app, payload);
  if (!product) {
    return { ok: false, reason: 'missing_product', message: '请选择一个库存商品。' };
  }

  product.flags.hasPublicRelation = true;
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
        const tagId = effect.tagId ?? effect.targetTagId ?? (typeof effect.value === 'string' ? effect.value : null);
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
  if (app.state.phase !== RunPhase.DayProcess) {
    return { ok: false, reason: '请在处理阶段使用卡牌。' };
  }

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

  const apCost = getCardActionPointCost(cardDef, cardInstance);
  if (app.state.dayState.actionPoints < apCost) {
    return { ok: false, reason: `行动点不足，需要 ${apCost} 点。` };
  }

  const cashCost = getCardCashCost(cardDef, cardInstance) + getLoseCashEffectCost(effects);
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

  app.state.dayState.actionPoints = Math.max(0, app.state.dayState.actionPoints - getCardActionPointCost(cardDef, cardInstance));
  app.state.cash = Math.max(0, app.state.cash - getCardCashCost(cardDef, cardInstance));

  const effectResult = applyEffects(effects, effectContext);
  if (!effectResult.ok) {
    app.state.dayState.actionPoints += getCardActionPointCost(cardDef, cardInstance);
    app.state.cash += getCardCashCost(cardDef, cardInstance);
    return {
      ok: false,
      reason: 'effect_failed',
      message: effectResult.messages[effectResult.messages.length - 1] ?? '卡牌效果执行失败。',
    };
  }

  moveCardAfterPlay(app, cardInstance, cardDef);
  refreshDealPreviewIfPossible(app);
  addActionLog(app, `使用【${cardDef.displayName}】。${effectResult.messages.join('')}`);

  return {
    ok: true,
    message: `使用【${cardDef.displayName}】。`,
  };
}

export function selectProduct(app: AppRuntime, productId: string): ActionResult {
  if (!canSelectForDeal(app)) {
    return {
      ok: false,
      reason: 'invalid_phase',
      message: '只能在处理阶段或出售阶段选择交易商品。',
    };
  }

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
  if (!canSelectForDeal(app)) {
    return {
      ok: false,
      reason: 'invalid_phase',
      message: '只能在处理阶段或出售阶段选择定价方式。',
    };
  }

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
  if (app.state.phase !== RunPhase.DaySell || app.state.dayState.phase !== RunPhase.DaySell) {
    return '当前阶段不是出售阶段。';
  }

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

export function chooseReward(app: AppRuntime, rewardInstanceId: string): ActionResult {
  const rewardInstance = app.state.dayState.rewardOptions.find((reward) => reward.instanceId === rewardInstanceId);
  const canChoose = canChooseReward(app, rewardInstance);

  if (!canChoose.ok || !rewardInstance) {
    const message = canChoose.reason ?? '奖励不存在。';
    addActionLog(app, `选择奖励失败：${message}`);
    return {
      ok: false,
      reason: message,
      message,
    };
  }

  const cashBefore = app.state.cash;
  const reputationBefore = app.state.reputation;
  if (rewardInstance.cost > 0) {
    app.state.cash -= rewardInstance.cost;
  }

  const applyResult = applyReward(app, rewardInstance);
  if (!applyResult.ok) {
    if (rewardInstance.cost > 0) {
      app.state.cash += rewardInstance.cost;
    }
    const message = applyResult.messages[applyResult.messages.length - 1] ?? '奖励应用失败。';
    addActionLog(app, `选择奖励失败：${message}`);
    return {
      ok: false,
      reason: message,
      message,
    };
  }

  app.state.dayState.chosenRewardId = rewardInstance.instanceId;
  app.state.rewardLog.push({
    day: app.state.currentDay,
    rewardId: rewardInstance.rewardId,
    rewardInstanceId: rewardInstance.instanceId,
    rewardDisplayName: rewardInstance.displayName,
    rewardType: rewardInstance.rewardType,
    cost: rewardInstance.cost,
    cashCost: rewardInstance.cost,
    effectsApplied: applyResult.effectsApplied,
    cashBefore,
    cashAfter: app.state.cash,
    reputationBefore,
    reputationAfter: app.state.reputation,
    deckChange: applyResult.deckChanges.join('；'),
    passiveChange: applyResult.passiveChanges.join('；'),
    supplySourceChange: applyResult.supplySourceChanges.join('；'),
  });

  const message = `第 ${app.state.currentDay} 天选择奖励：${rewardInstance.displayName}，花费 ${rewardInstance.cost} 现金。${applyResult.effectsApplied.join('；')}`;
  addActionLog(app, message);

  if (app.state.cash < 0 || app.state.reputation <= 0) {
    failRunIfNeeded(app);
    return {
      ok: true,
      message,
    };
  }

  finishDayAndStartNextDay(app);

  return {
    ok: true,
    message,
  };
}

export function buyProduct(app: AppRuntime, productId: string): ActionResult {
  const product = getProductCandidateById(app, productId);
  const disabledReason = getBuyProductDisabledReason(app, product);

  if (disabledReason || !product) {
    const message = disabledReason ?? '商品不存在';
    app.state.runLog.push(`[第 ${app.state.currentDay} 天][${app.state.phase}] 买入失败：${message}。`);
    app.state.dayState.log.push(`[第 ${app.state.currentDay} 天][${app.state.phase}] 买入失败：${message}。`);
    return {
      ok: false,
      reason: message,
      message,
    };
  }

  app.state.cash -= product.cost;
  product.status = ProductStatus.Inventory;
  product.flags.inInventory = true;
  app.state.inventory.push(product);
  app.state.dayState.boughtProductCount += 1;
  app.state.dayState.selectedProductId = product.id;

  const message = `买入【${product.displayName}】，花费 ${product.cost} 现金。`;
  app.state.runLog.push(`[第 ${app.state.currentDay} 天][DAY_PURCHASE] ${message}`);
  app.state.dayState.log.push(`[第 ${app.state.currentDay} 天][DAY_PURCHASE] ${message}`);

  return {
    ok: true,
    message: '买入成功',
  };
}
