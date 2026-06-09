import { RewardType, RunPhase } from './constants';
import { createRng, pickWeighted, randomInt } from './rng';
import { refreshDealPreviewIfPossible } from './rules_deal';
import type {
  AppRuntime,
  CardInstance,
  DeckState,
  JsonValue,
  ProductInstance,
  RewardDef,
  RewardOptionInstance,
  RewardPhaseState,
  TemporaryInsuranceState,
  TemporaryRunModifierState,
} from './types';

export interface CanChooseRewardResult {
  ok: boolean;
  reason?: string;
}

export interface RewardApplyResult {
  ok: boolean;
  rewardId: string;
  rewardType: RewardType;
  cost: number;
  effectsApplied: string[];
  resourceChanges: string[];
  deckChanges: string[];
  passiveChanges: string[];
  supplySourceChanges: string[];
  messages: string[];
}

type RewardTarget = {
  cardInstanceId?: string;
  productId?: string;
  poolCardId?: string;
};

const LEVEL_ORDER = ['none', 'minor', 'medium', 'major', 'severe'];

function addLog(app: AppRuntime, message: string): void {
  const full = `第 ${app.state.currentDay} 天：${message}`;
  app.state.runLog.push(full);
  app.state.dayState.log.push(full);
}

function getRewardType(reward: RewardDef | RewardOptionInstance): RewardType {
  return (reward.rewardType ?? reward.type) as RewardType;
}

function getPayload(reward: RewardDef | RewardOptionInstance): Record<string, JsonValue> {
  return reward.payload ?? {};
}

function readString(reward: RewardDef | RewardOptionInstance, key: string): string | null {
  const direct = (reward as unknown as Record<string, unknown>)[key];
  const payload = getPayload(reward)[key];
  return typeof direct === 'string' ? direct : typeof payload === 'string' ? payload : null;
}

function readNumber(reward: RewardDef | RewardOptionInstance, key: string, fallback = 0): number {
  const direct = (reward as unknown as Record<string, unknown>)[key];
  const payload = getPayload(reward)[key];
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct;
  if (typeof payload === 'number' && Number.isFinite(payload)) return payload;
  return fallback;
}

function readStringArray(reward: RewardDef | RewardOptionInstance, key: string): string[] {
  const direct = (reward as unknown as Record<string, unknown>)[key];
  const payload = getPayload(reward)[key];
  const value = Array.isArray(direct) ? direct : Array.isArray(payload) ? payload : [];
  return value.filter((item): item is string => typeof item === 'string');
}

function getRewardCost(reward: RewardDef, app: AppRuntime): number {
  const raw = reward.price ?? reward.cost ?? readNumber(reward, 'cost', 0);
  const discount = app.state.currentDay === 1 ? reward.dayOneDiscount ?? 0 : 0;
  return Math.max(raw > 0 ? 1 : 0, Math.round(raw - discount));
}

function getRewardDisplayName(app: AppRuntime, reward: RewardDef): string {
  if (reward.displayName) return reward.displayName;
  const cardId = readString(reward, 'cardId');
  const passiveId = readString(reward, 'passiveId');
  const supplySourceId = readString(reward, 'supplySourceId');
  if (cardId) return app.index.cardsById.get(cardId)?.displayName ?? reward.description;
  if (passiveId) return app.index.passivesById.get(passiveId)?.displayName ?? reward.description;
  if (supplySourceId) return app.index.supplySourcesById.get(supplySourceId)?.displayName ?? reward.description;
  return reward.description || reward.id;
}

function getEffectSummary(app: AppRuntime, reward: RewardDef): string {
  if (reward.effects?.[0]?.displayText) {
    const text = reward.effects.map((effect) => effect.displayText).filter(Boolean).join('；');
    if (text) return text;
  }
  const type = getRewardType(reward);
  const amount = readNumber(reward, 'amount', 0);
  if (type === RewardType.GainCash) return `现金 +${amount}`;
  if (type === RewardType.GainReputation) return `信誉 +${amount}`;
  if (type === RewardType.AddPassive) return `获得被动：${app.index.passivesById.get(readString(reward, 'passiveId') ?? '')?.displayName ?? '未知被动'}`;
  if (type === RewardType.AddSupplySource) return `获得货源：${app.index.supplySourcesById.get(readString(reward, 'supplySourceId') ?? '')?.displayName ?? '随机货源'}`;
  if (type === RewardType.AddCard) return '获得卡牌';
  if (type === RewardType.UpgradeCard) return '升级卡牌';
  if (type === RewardType.RemoveCard) return '删除卡牌';
  if (type === RewardType.TemporaryInsurance) return '获得一次性事故保险';
  if (type === RewardType.AddTemporaryModifier) return '获得临时效果';
  if (type === RewardType.ProductRepair) return '处理库存商品';
  return reward.description || '特殊奖励效果';
}

function instantiateReward(app: AppRuntime, reward: RewardDef, slot: string, index: number): RewardOptionInstance {
  return {
    ...reward,
    rewardType: getRewardType(reward),
    instanceId: `reward_${slot}_${app.state.currentDay}_${app.state.nextInstanceCounter++}_${index}`,
    rewardId: reward.id,
    displayName: getRewardDisplayName(app, reward),
    cost: getRewardCost(reward, app),
    effectSummary: getEffectSummary(app, reward),
  };
}

function drawRewards(app: AppRuntime, slot: string, count: number): RewardOptionInstance[] {
  const rewards = app.configs.rewards.filter((reward) => reward.rewardSlot === slot);
  const rng = createRng(app.state.rngState);
  const remaining = [...rewards];
  const picked: RewardDef[] = [];
  while (picked.length < count && remaining.length > 0) {
    const reward = pickWeighted(rng, remaining, (item) => item.weight ?? 1);
    picked.push(reward);
    remaining.splice(remaining.indexOf(reward), 1);
  }
  app.state.rngState = rng.value;
  return picked.map((reward, index) => instantiateReward(app, reward, slot, index + 1));
}

function allRewards(app: AppRuntime, slot: string): RewardOptionInstance[] {
  return app.configs.rewards.filter((reward) => reward.rewardSlot === slot).map((reward, index) => instantiateReward(app, reward, slot, index + 1));
}

function bonusReasons(app: AppRuntime): string[] {
  const triggers = app.configs.gameConfig.bonusRewardTriggers ?? {};
  const reasons: string[] = [];
  if (app.state.dayState.dailyProfit >= (triggers.dailyProfitAtLeast ?? Infinity)) reasons.push(`当日利润达到 ${triggers.dailyProfitAtLeast}`);
  if (app.state.dayState.maxSingleDealProfit >= (triggers.singleDealProfitAtLeast ?? Infinity)) reasons.push(`单笔利润达到 ${triggers.singleDealProfitAtLeast}`);
  if (app.state.dayState.accidentCount === 0 && app.state.dayState.soldProductCount >= (triggers.noAccidentAndSalesAtLeast ?? Infinity)) {
    reasons.push(`无事故成交 ${triggers.noAccidentAndSalesAtLeast} 单`);
  }
  const maxAllowed = triggers.blindBoxDealMaxAccidentLevel ?? 'medium';
  if (app.state.dayState.blindBoxDealAccidentLevels.some((level) => LEVEL_ORDER.indexOf(level) <= LEVEL_ORDER.indexOf(maxAllowed))) {
    reasons.push(`盲盒交易事故等级不高于 ${maxAllowed}`);
  }
  return reasons;
}

export function ensureRewardState(app: AppRuntime): RewardPhaseState {
  if (app.state.dayState.rewardState) return app.state.dayState.rewardState;
  const system = app.configs.gameConfig.rewardSystem ?? {};
  const paidMin = system.paidShopMinOptions ?? 6;
  const paidMax = Math.max(paidMin, system.paidShopMaxOptions ?? 8);
  const paidRng = createRng(app.state.rngState);
  const paidCount = randomInt(paidRng, paidMin, paidMax);
  app.state.rngState = paidRng.value;
  const reasons = bonusReasons(app);
  const state: RewardPhaseState = {
    maintenancePointsRemaining: system.maintenancePointsPerDay ?? 3,
    maintenancePointsTotal: system.maintenancePointsPerDay ?? 3,
    maintenanceOptions: allRewards(app, 'maintenance'),
    freeBuildOptions: drawRewards(app, 'free_build', system.freeBuildChoiceCount ?? 3),
    paidShopOptions: drawRewards(app, 'paid_shop', paidCount),
    bonusOptions: reasons.length > 0 ? drawRewards(app, 'bonus', system.bonusRewardChoiceCount ?? 3) : [],
    selectedFreeBuildRewardId: null,
    selectedBonusRewardId: null,
    purchasedPaidRewardIds: [],
    claimedMaintenanceRewardIds: [],
    skippedBonus: false,
    bonusUnlocked: reasons.length > 0,
    bonusReasons: reasons,
    rewardPhaseCompleted: false,
  };
  app.state.dayState.rewardState = state;
  app.state.dayState.rewardOptions = [
    ...state.maintenanceOptions,
    ...state.freeBuildOptions,
    ...state.paidShopOptions,
    ...state.bonusOptions,
  ];
  app.state.dayState.rewardOptionIds = app.state.dayState.rewardOptions.map((reward) => reward.instanceId);
  return state;
}

export function generateRewardOptions(app: AppRuntime): RewardOptionInstance[] {
  return ensureRewardState(app).freeBuildOptions;
}

function createCardInstance(app: AppRuntime, cardId: string): CardInstance {
  const instanceId = `card_inst_${app.state.nextInstanceCounter++}`;
  return { id: instanceId, instanceId, cardId, cardDefId: cardId, upgraded: false, createdDay: app.state.currentDay };
}

function deckPiles(deckState: DeckState): CardInstance[][] {
  return [deckState.drawPile, deckState.hand, deckState.discardPile, deckState.exhaustPile];
}

function allDeckCards(app: AppRuntime): CardInstance[] {
  return deckPiles(app.state.deckState).flat();
}

function deckSize(app: AppRuntime): number {
  return allDeckCards(app).filter((card) => !card.temporary).length;
}

export function getUpgradableCards(app: AppRuntime): CardInstance[] {
  return allDeckCards(app).filter((card) => {
    if (card.temporary) return false;
    const def = app.index.cardsById.get(card.cardDefId);
    return Boolean(def?.upgradedCardId && app.index.cardsById.has(def.upgradedCardId) && !card.cardDefId.endsWith('_plus'));
  });
}

export function getRemovableCards(app: AppRuntime): CardInstance[] {
  if (deckSize(app) <= 6) return [];
  return allDeckCards(app).filter((card) => !card.temporary);
}

function findCardByInstanceId(app: AppRuntime, cardInstanceId?: string): CardInstance | null {
  if (!cardInstanceId) return null;
  return allDeckCards(app).find((card) => card.id === cardInstanceId || card.instanceId === cardInstanceId) ?? null;
}

function removeCardByInstanceId(app: AppRuntime, cardInstanceId: string): CardInstance | null {
  for (const pile of deckPiles(app.state.deckState)) {
    const index = pile.findIndex((card) => card.id === cardInstanceId || card.instanceId === cardInstanceId);
    if (index >= 0) {
      const [removed] = pile.splice(index, 1);
      return removed;
    }
  }
  return null;
}

function pickFromPool(app: AppRuntime, pool: string[], target?: RewardTarget): string | null {
  if (target?.poolCardId && pool.includes(target.poolCardId)) return target.poolCardId;
  const valid = pool.filter((cardId) => app.index.cardsById.has(cardId));
  if (valid.length === 0) return null;
  const rng = createRng(app.state.rngState);
  const picked = pickWeighted(rng, valid, () => 1);
  app.state.rngState = rng.value;
  return picked;
}

function getProductById(app: AppRuntime, productId?: string): ProductInstance | null {
  if (!productId) return null;
  return app.state.inventory.find((product) => product.id === productId) ?? null;
}

function createTempModifier(app: AppRuntime, reward: RewardOptionInstance): TemporaryRunModifierState | null {
  const effect = reward.effects?.[0] ?? (Array.isArray(reward.payload.effects) ? (reward.payload.effects[0] as unknown as { params?: Record<string, unknown> }) : null);
  const params = effect?.params ?? {};
  const id = `temp_mod_${app.state.nextInstanceCounter++}`;
  if (reward.id.includes('free_identify')) {
    return { id, sourceRewardId: reward.rewardId, displayName: reward.displayName, gainedDay: app.state.currentDay, timing: 'next_day', scope: 'first_action', target: 'action_identify', stat: 'actionPointCost', op: 'set', value: 0, uses: 1, consumed: 0 };
  }
  if (reward.id.includes('free_package')) {
    return { id, sourceRewardId: reward.rewardId, displayName: reward.displayName, gainedDay: app.state.currentDay, timing: 'next_day', scope: 'first_card_type', target: 'tag_tool', stat: 'cashCost', op: 'set', value: 0, uses: 1, consumed: 0 };
  }
  if (typeof params.stat === 'string' && typeof params.op === 'string' && typeof params.value === 'number') {
    return {
      id,
      sourceRewardId: reward.rewardId,
      displayName: reward.displayName,
      gainedDay: app.state.currentDay,
      timing: params.duration === 'next_day' ? 'next_day' : 'this_day',
      scope: typeof params.scope === 'string' ? params.scope : 'day_start',
      target: typeof params.actionId === 'string' ? params.actionId : typeof params.rewardSlot === 'string' ? params.rewardSlot : undefined,
      stat: params.stat,
      op: params.op,
      value: params.op === 'multiply' && params.value === 0.7 ? -0.3 : params.value,
      uses: 1,
      consumed: 0,
    };
  }
  return null;
}

function applyAddTemporaryModifier(app: AppRuntime, reward: RewardOptionInstance, result: RewardApplyResult): void {
  const modifier = createTempModifier(app, reward);
  if (!modifier) {
    result.messages.push('临时效果配置无法识别。');
    return;
  }
  app.state.temporaryRunModifiers.push(modifier);
  result.effectsApplied.push(`获得临时效果：${reward.displayName}`);
}

function applyTemporaryInsurance(app: AppRuntime, reward: RewardOptionInstance, result: RewardApplyResult): void {
  const config = (reward.temporaryInsurance ?? reward.payload.temporaryInsurance ?? reward.payload.effects ?? {}) as Record<string, JsonValue>;
  const insurance: TemporaryInsuranceState = {
    id: `insurance_${app.state.nextInstanceCounter++}`,
    sourceRewardId: reward.rewardId,
    displayName: reward.displayName,
    gainedDay: app.state.currentDay,
    remainingUses: typeof config.uses === 'number' ? config.uses : 1,
    config,
  };
  app.state.temporaryInsurances.push(insurance);
  result.effectsApplied.push(`获得事故保险【${reward.displayName}】`);
}

export function canChooseReward(app: AppRuntime, reward: RewardOptionInstance | null | undefined): CanChooseRewardResult {
  if (app.state.phase !== RunPhase.DayReward) return { ok: false, reason: '当前不是收店阶段。' };
  if (!reward) return { ok: false, reason: '奖励不存在。' };
  if (app.state.cash < reward.cost) return { ok: false, reason: `现金不足，需要 ${reward.cost} 现金。` };
  if (getRewardType(reward) === RewardType.AddPassive) {
    const passiveId = readString(reward, 'passiveId');
    if (!passiveId || !app.index.passivesById.has(passiveId)) return { ok: false, reason: `被动配置缺失：${passiveId ?? '未配置'}` };
    if (app.state.activePassives.some((passive) => passive.passiveId === passiveId)) return { ok: false, reason: '已拥有该店铺被动。' };
  }
  if (getRewardType(reward) === RewardType.AddSupplySource) {
    const supplySourceId = readString(reward, 'supplySourceId');
    const pool = readStringArray(reward, 'supplyPool');
    if (!supplySourceId && pool.length === 0) return { ok: false, reason: '货源配置缺失。' };
  }
  if (getRewardType(reward) === RewardType.UpgradeCard && getUpgradableCards(app).length === 0) return { ok: false, reason: '没有可升级卡牌。' };
  if (getRewardType(reward) === RewardType.RemoveCard && getRemovableCards(app).length === 0) return { ok: false, reason: deckSize(app) <= 6 ? '牌组总数不高于 6，不能删牌。' : '没有可删除卡牌。' };
  if (getRewardType(reward) === RewardType.ProductRepair && app.state.inventory.filter((product) => !product.flags.sold).length === 0) return { ok: false, reason: '没有可处理的库存。' };
  return { ok: true };
}

export function applyReward(app: AppRuntime, reward: RewardOptionInstance, target: RewardTarget = {}): RewardApplyResult {
  const result: RewardApplyResult = {
    ok: true,
    rewardId: reward.rewardId,
    rewardType: getRewardType(reward),
    cost: reward.cost,
    effectsApplied: [],
    resourceChanges: [],
    deckChanges: [],
    passiveChanges: [],
    supplySourceChanges: [],
    messages: [],
  };
  const type = getRewardType(reward);

  if (type === RewardType.GainCash) {
    const amount = readNumber(reward, 'amount', 0);
    app.state.cash += amount;
    result.effectsApplied.push(`获得现金 ${amount}`);
    result.resourceChanges.push(`cash +${amount}`);
  } else if (type === RewardType.GainReputation) {
    const amount = readNumber(reward, 'amount', 0);
    const before = app.state.reputation;
    app.state.reputation = Math.min(app.state.maxReputation, app.state.reputation + amount);
    result.effectsApplied.push(`恢复信誉 ${app.state.reputation - before}`);
    result.resourceChanges.push(`reputation +${app.state.reputation - before}`);
  } else if (type === RewardType.AddCard) {
    const pool = readStringArray(reward, 'cardPool');
    const cardId = readString(reward, 'cardId') ?? pickFromPool(app, pool, target);
    if (!cardId || !app.index.cardsById.has(cardId)) return { ...result, ok: false, messages: [`卡牌奖励配置错误：${cardId ?? '未配置'}`] };
    const card = createCardInstance(app, cardId);
    const addTo = readString(reward, 'addTo');
    if (addTo === 'draw_top') app.state.deckState.drawPile.unshift(card);
    else app.state.deckState.discardPile.push(card);
    result.effectsApplied.push(`获得卡牌《${app.index.cardsById.get(cardId)?.displayName ?? cardId}》`);
    result.deckChanges.push(`add ${cardId}`);
  } else if (type === RewardType.UpgradeCard) {
    const card = findCardByInstanceId(app, target.cardInstanceId) ?? getUpgradableCards(app)[0];
    const oldDef = card ? app.index.cardsById.get(card.cardDefId) : null;
    if (!card || !oldDef?.upgradedCardId || !app.index.cardsById.has(oldDef.upgradedCardId)) return { ...result, ok: false, messages: ['没有可升级卡牌。'] };
    const newDef = app.index.cardsById.get(oldDef.upgradedCardId);
    card.cardId = oldDef.upgradedCardId;
    card.cardDefId = oldDef.upgradedCardId;
    card.upgraded = true;
    result.effectsApplied.push(`升级《${oldDef.displayName}》为《${newDef?.displayName ?? oldDef.upgradedCardId}》`);
    result.deckChanges.push(`upgrade ${oldDef.id} -> ${oldDef.upgradedCardId}`);
  } else if (type === RewardType.RemoveCard) {
    const card = findCardByInstanceId(app, target.cardInstanceId) ?? getRemovableCards(app)[0];
    if (!card || deckSize(app) <= 6) return { ...result, ok: false, messages: ['牌组总数不高于 6，不能删牌。'] };
    const removed = removeCardByInstanceId(app, card.instanceId);
    result.effectsApplied.push(`删除卡牌《${app.index.cardsById.get(removed?.cardDefId ?? '')?.displayName ?? removed?.cardDefId ?? '未知卡牌'}》`);
    result.deckChanges.push(`remove ${removed?.cardDefId}`);
  } else if (type === RewardType.AddPassive) {
    const passiveId = readString(reward, 'passiveId');
    if (!passiveId || !app.index.passivesById.has(passiveId)) return { ...result, ok: false, messages: [`被动奖励配置错误：${passiveId ?? '未配置'}`] };
    if (!app.state.activePassives.some((passive) => passive.passiveId === passiveId)) {
      app.state.activePassives.push({ passiveId, gainedDay: app.state.currentDay, source: reward.rewardId });
    }
    result.effectsApplied.push(`获得店铺被动《${app.index.passivesById.get(passiveId)?.displayName ?? passiveId}》`);
    result.passiveChanges.push(`passive +${passiveId}`);
  } else if (type === RewardType.AddSupplySource) {
    const pool = readStringArray(reward, 'supplyPool');
    let supplySourceId = readString(reward, 'supplySourceId');
    if (!supplySourceId && pool.length > 0) {
      const rng = createRng(app.state.rngState);
      supplySourceId = pickWeighted(rng, pool, () => 1);
      app.state.rngState = rng.value;
    }
    if (!supplySourceId || !app.index.supplySourcesById.has(supplySourceId)) return { ...result, ok: false, messages: [`货源奖励配置错误：${supplySourceId ?? '未配置'}`] };
    const def = app.index.supplySourcesById.get(supplySourceId);
    const durationOverride = readNumber(reward, 'durationOverrideDays', NaN);
    app.state.activeSupplySources.push({
      supplySourceId,
      gainedDay: app.state.currentDay,
      remainingDays: Number.isFinite(durationOverride) ? durationOverride : def?.durationDays ?? null,
      source: reward.rewardId,
    });
    result.effectsApplied.push(`获得货源倾向《${def?.displayName ?? supplySourceId}》`);
    result.supplySourceChanges.push(`supply +${supplySourceId}`);
  } else if (type === RewardType.TemporaryInsurance) {
    applyTemporaryInsurance(app, reward, result);
  } else if (type === RewardType.AddTemporaryModifier || type === RewardType.TemporaryModifier) {
    applyAddTemporaryModifier(app, reward, result);
  } else if (type === RewardType.ProductRepair) {
    const product = getProductById(app, target.productId) ?? app.state.inventory.find((item) => !item.flags.sold) ?? null;
    if (!product) return { ...result, ok: false, messages: ['没有可处理的库存。'] };
    product.freshnessCurrent = Math.min(product.freshnessMax, product.freshnessCurrent + 1);
    product.productModifiers ??= [];
    product.productModifiers.push({ stat: 'risk', op: 'add', value: -10, sourceType: 'reward', sourceId: reward.rewardId, displayText: '清仓处理：腐败/爆雷 -10' });
    result.effectsApplied.push(`清仓处理《${product.displayName}》：新鲜度 +1，爆雷 -10`);
  } else {
    result.messages.push(`奖励类型 ${type} 暂未支持。`);
  }

  if (result.effectsApplied.length === 0 && result.messages.length === 0) result.messages.push('奖励没有可应用效果。');
  refreshDealPreviewIfPossible(app);
  return result;
}

function logReward(app: AppRuntime, reward: RewardOptionInstance, result: RewardApplyResult, cashBefore: number, reputationBefore: number): void {
  app.state.rewardLog.push({
    day: app.state.currentDay,
    rewardId: reward.rewardId,
    rewardInstanceId: reward.instanceId,
    rewardDisplayName: reward.displayName,
    rewardType: getRewardType(reward),
    cost: reward.cost,
    cashCost: reward.cost,
    effectsApplied: result.effectsApplied,
    cashBefore,
    cashAfter: app.state.cash,
    reputationBefore,
    reputationAfter: app.state.reputation,
    deckChange: result.deckChanges.join('；'),
    passiveChange: result.passiveChanges.join('；'),
    supplySourceChange: result.supplySourceChanges.join('；'),
  });
}

function applyRewardWithCost(app: AppRuntime, reward: RewardOptionInstance, target: RewardTarget = {}): RewardApplyResult {
  const cashBefore = app.state.cash;
  const reputationBefore = app.state.reputation;
  if (reward.cost > 0) app.state.cash -= reward.cost;
  const result = applyReward(app, reward, target);
  if (!result.ok) {
    if (reward.cost > 0) app.state.cash = cashBefore;
    return result;
  }
  logReward(app, reward, result, cashBefore, reputationBefore);
  addLog(app, `领取奖励【${reward.displayName}】${reward.cost > 0 ? `，花费 ${reward.cost} 现金` : ''}。${result.effectsApplied.join('；')}`);
  return result;
}

export function claimMaintenanceReward(app: AppRuntime, rewardInstanceId: string, target: RewardTarget = {}): RewardApplyResult {
  const state = ensureRewardState(app);
  const reward = state.maintenanceOptions.find((item) => item.instanceId === rewardInstanceId);
  if (!reward) return failReward('maintenance_missing', '维护奖励不存在。');
  if (state.claimedMaintenanceRewardIds.includes(reward.rewardId) && !reward.explicitlyRepeatable) return failReward(reward.rewardId, '该维护奖励今日已领取。');
  const cost = reward.maintenanceCost ?? 1;
  if (state.maintenancePointsRemaining < cost) return failReward(reward.rewardId, `维护点不足，需要 ${cost}。`);
  if (reward.oncePerDayGroup && state.maintenanceOptions.some((item) => item.oncePerDayGroup === reward.oncePerDayGroup && state.claimedMaintenanceRewardIds.includes(item.rewardId))) {
    return failReward(reward.rewardId, '同组强维护项今日只能领取一个。');
  }
  const canChoose = canChooseReward(app, reward);
  if (!canChoose.ok) return failReward(reward.rewardId, canChoose.reason ?? '不可领取。');
  state.maintenancePointsRemaining -= cost;
  state.claimedMaintenanceRewardIds.push(reward.rewardId);
  return applyRewardWithCost(app, reward, target);
}

export function chooseFreeBuildReward(app: AppRuntime, rewardInstanceId: string, target: RewardTarget = {}): RewardApplyResult {
  const state = ensureRewardState(app);
  if (state.selectedFreeBuildRewardId) return failReward(rewardInstanceId, '免费构筑奖励今日已选择。');
  const reward = state.freeBuildOptions.find((item) => item.instanceId === rewardInstanceId);
  if (!reward) return failReward(rewardInstanceId, '免费构筑奖励不存在。');
  const canChoose = canChooseReward(app, reward);
  if (!canChoose.ok) return failReward(reward.rewardId, canChoose.reason ?? '不可领取。');
  state.selectedFreeBuildRewardId = reward.rewardId;
  return applyRewardWithCost(app, reward, target);
}

export function buyPaidShopReward(app: AppRuntime, rewardInstanceId: string, target: RewardTarget = {}): RewardApplyResult {
  const state = ensureRewardState(app);
  const reward = state.paidShopOptions.find((item) => item.instanceId === rewardInstanceId);
  if (!reward) return failReward(rewardInstanceId, '付费奖励不存在。');
  if (state.purchasedPaidRewardIds.includes(reward.rewardId)) return failReward(reward.rewardId, '该商品今日已购买。');
  const canChoose = canChooseReward(app, reward);
  if (!canChoose.ok) return failReward(reward.rewardId, canChoose.reason ?? '不可购买。');
  if (app.state.cash < reward.cost) return failReward(reward.rewardId, `现金不足，需要 ${reward.cost} 现金。`);
  state.purchasedPaidRewardIds.push(reward.rewardId);
  return applyRewardWithCost(app, reward, target);
}

export function chooseBonusReward(app: AppRuntime, rewardInstanceId: string, target: RewardTarget = {}): RewardApplyResult {
  const state = ensureRewardState(app);
  if (!state.bonusUnlocked) return failReward(rewardInstanceId, '今日未触发爆单奖励。');
  if (state.selectedBonusRewardId) return failReward(rewardInstanceId, '爆单奖励今日已选择。');
  const reward = state.bonusOptions.find((item) => item.instanceId === rewardInstanceId);
  if (!reward) return failReward(rewardInstanceId, '爆单奖励不存在。');
  const canChoose = canChooseReward(app, reward);
  if (!canChoose.ok) return failReward(reward.rewardId, canChoose.reason ?? '不可领取。');
  state.selectedBonusRewardId = reward.rewardId;
  return applyRewardWithCost(app, reward, target);
}

export function skipBonusReward(app: AppRuntime): void {
  const state = ensureRewardState(app);
  state.skippedBonus = true;
  addLog(app, '跳过今日爆单奖励。');
}

export function canFinishRewardPhase(app: AppRuntime): CanChooseRewardResult {
  const state = ensureRewardState(app);
  if (state.freeBuildOptions.length > 0 && !state.selectedFreeBuildRewardId) return { ok: false, reason: '请先选择 1 个免费构筑奖励。' };
  if (state.bonusUnlocked && !state.selectedBonusRewardId && !state.skippedBonus) return { ok: false, reason: '请选择或跳过爆单奖励。' };
  return { ok: true };
}

export function markRewardPhaseCompleted(app: AppRuntime): CanChooseRewardResult {
  const result = canFinishRewardPhase(app);
  if (!result.ok) return result;
  ensureRewardState(app).rewardPhaseCompleted = true;
  return { ok: true };
}

export function chooseReward(app: AppRuntime, rewardInstanceId: string): RewardApplyResult {
  return chooseFreeBuildReward(app, rewardInstanceId);
}

function failReward(rewardId: string, message: string): RewardApplyResult {
  return {
    ok: false,
    rewardId,
    rewardType: RewardType.GainCash,
    cost: 0,
    effectsApplied: [],
    resourceChanges: [],
    deckChanges: [],
    passiveChanges: [],
    supplySourceChanges: [],
    messages: [message],
  };
}
