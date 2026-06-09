import { RewardType, RunPhase } from './constants';
import { createRng, pickWeighted } from './rng';
import type { AppRuntime, CardInstance, DeckState, RewardDef, RewardOptionInstance } from './types';

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

function getPayloadString(reward: RewardOptionInstance, key: string): string | null {
  const value = reward.payload[key];
  return typeof value === 'string' ? value : null;
}

function getPayloadNumber(reward: RewardOptionInstance, key: string, fallback: number): number {
  const value = reward.payload[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getRewardCost(reward: RewardDef): number {
  const payloadCost = reward.payload.cost;
  const rawCost = reward.cost ?? (typeof payloadCost === 'number' ? payloadCost : 0);
  return Math.max(0, Math.round(rawCost));
}

function getRewardDisplayName(app: AppRuntime, reward: RewardDef): string {
  if (reward.displayName) {
    return reward.displayName;
  }

  const cardId = typeof reward.payload.cardId === 'string' ? reward.payload.cardId : null;
  const passiveId = typeof reward.payload.passiveId === 'string' ? reward.payload.passiveId : null;
  const supplySourceId = typeof reward.payload.supplySourceId === 'string' ? reward.payload.supplySourceId : null;

  if (cardId) {
    return app.index.cardsById.get(cardId)?.displayName ?? reward.description;
  }
  if (passiveId) {
    return app.index.passivesById.get(passiveId)?.displayName ?? reward.description;
  }
  if (supplySourceId) {
    return app.index.supplySourcesById.get(supplySourceId)?.displayName ?? reward.description;
  }

  return reward.description || reward.id;
}

function getEffectSummary(app: AppRuntime, reward: RewardDef): string {
  const cardId = typeof reward.payload.cardId === 'string' ? reward.payload.cardId : null;
  const passiveId = typeof reward.payload.passiveId === 'string' ? reward.payload.passiveId : null;
  const supplySourceId = typeof reward.payload.supplySourceId === 'string' ? reward.payload.supplySourceId : null;
  const amount = typeof reward.payload.amount === 'number' ? reward.payload.amount : null;

  switch (reward.rewardType) {
    case RewardType.AddCard:
      return `获得卡牌：${app.index.cardsById.get(cardId ?? '')?.displayName ?? cardId ?? '未知卡牌'}`;
    case RewardType.AddPassive:
      return `获得店铺被动：${app.index.passivesById.get(passiveId ?? '')?.displayName ?? passiveId ?? '未知被动'}`;
    case RewardType.AddSupplySource:
      return `获得货源倾向：${app.index.supplySourcesById.get(supplySourceId ?? '')?.displayName ?? supplySourceId ?? '未知货源'}`;
    case RewardType.GainCash:
      return `现金 +${amount ?? 0}`;
    case RewardType.GainReputation:
      return `信誉 +${amount ?? 0}`;
    case RewardType.UpgradeCard:
      return `自动升级一张${cardId ? ` ${app.index.cardsById.get(cardId)?.displayName ?? cardId}` : '可升级卡牌'}`;
    case RewardType.RemoveCard:
      return `自动移除一张${cardId ? ` ${app.index.cardsById.get(cardId)?.displayName ?? cardId}` : '牌库卡牌'}`;
    default:
      return reward.description;
  }
}

function createFallbackRewards(app: AppRuntime): RewardOptionInstance[] {
  const firstCard = app.configs.cards[0];
  const fallbackDefs: RewardDef[] = [
    { id: 'fallback_gain_cash_20', rewardType: RewardType.GainCash, description: '获得 20 现金', weight: 1, payload: { amount: 20 } },
    { id: 'fallback_gain_reputation_10', rewardType: RewardType.GainReputation, description: '获得 10 信誉', weight: 1, payload: { amount: 10 } },
    {
      id: 'fallback_add_card',
      rewardType: RewardType.AddCard,
      description: '获得一张基础卡',
      weight: 1,
      payload: { cardId: firstCard?.id ?? '' },
    },
  ];

  return fallbackDefs.map((reward, index) => instantiateReward(app, reward, `fallback_${app.state.currentDay}_${index + 1}`));
}

function instantiateReward(app: AppRuntime, reward: RewardDef, instanceId: string): RewardOptionInstance {
  return {
    ...reward,
    instanceId,
    rewardId: reward.id,
    displayName: getRewardDisplayName(app, reward),
    cost: getRewardCost(reward),
    effectSummary: getEffectSummary(app, reward),
  };
}

export function generateRewardOptions(app: AppRuntime): RewardOptionInstance[] {
  const count = app.configs.gameConfig.rewardOptionsPerDay || 3;
  const rng = createRng(app.state.rngState);
  const candidates = app.configs.rewards.filter((reward) => Boolean(reward.rewardType));
  const selected: RewardDef[] = [];
  const remaining = [...candidates];

  while (selected.length < count && remaining.length > 0) {
    const picked = pickWeighted(rng, remaining, (reward) => reward.weight ?? 1);
    selected.push(picked);
    remaining.splice(remaining.indexOf(picked), 1);
  }

  app.state.rngState = rng.value;

  const instances = selected.map((reward, index) =>
    instantiateReward(app, reward, `reward_${app.state.currentDay}_${app.state.nextInstanceCounter++}_${index + 1}`),
  );

  if (instances.length >= count) {
    return instances;
  }

  app.state.runLog.push('奖励配置不足，已使用默认奖励补足。TODO：补充奖励池数据。');
  return [...instances, ...createFallbackRewards(app)].slice(0, count);
}

export function canChooseReward(app: AppRuntime, rewardInstance: RewardOptionInstance | null | undefined): CanChooseRewardResult {
  if (app.state.phase !== RunPhase.DayReward) {
    return { ok: false, reason: '当前不是收店阶段。' };
  }
  if (!rewardInstance) {
    return { ok: false, reason: '奖励不存在。' };
  }
  if (app.state.dayState.chosenRewardId) {
    return { ok: false, reason: '已选择过今日奖励。' };
  }
  if (app.state.cash < rewardInstance.cost) {
    return { ok: false, reason: `现金不足，需要 ${rewardInstance.cost} 现金。` };
  }

  const cardId = getPayloadString(rewardInstance, 'cardId');
  const passiveId = getPayloadString(rewardInstance, 'passiveId');
  const supplySourceId = getPayloadString(rewardInstance, 'supplySourceId');

  if ((rewardInstance.rewardType === RewardType.AddCard || rewardInstance.rewardType === RewardType.UpgradeCard) && cardId && !app.index.cardsById.has(cardId)) {
    return { ok: false, reason: `奖励配置引用了不存在的卡牌：${cardId}。` };
  }
  if (rewardInstance.rewardType === RewardType.AddPassive) {
    if (!passiveId || !app.index.passivesById.has(passiveId)) {
      return { ok: false, reason: `奖励配置引用了不存在的店铺被动：${passiveId ?? '未配置'}。` };
    }
    if (app.state.activePassives.some((passive) => passive.passiveId === passiveId)) {
      return { ok: false, reason: '已拥有该店铺被动。' };
    }
  }
  if (rewardInstance.rewardType === RewardType.AddSupplySource) {
    if (!supplySourceId || !app.index.supplySourcesById.has(supplySourceId)) {
      return { ok: false, reason: `奖励配置引用了不存在的货源：${supplySourceId ?? '未配置'}。` };
    }
    if (app.state.activeSupplySources.some((source) => source.supplySourceId === supplySourceId)) {
      return { ok: false, reason: '已拥有该货源倾向。' };
    }
  }

  return { ok: true };
}

function createCardInstance(app: AppRuntime, cardId: string): CardInstance {
  const instanceId = `card_inst_${app.state.nextInstanceCounter++}`;
  return {
    id: instanceId,
    instanceId,
    cardId,
    cardDefId: cardId,
    upgraded: false,
    createdDay: app.state.currentDay,
  };
}

function getAllDeckPiles(deckState: DeckState): CardInstance[][] {
  return [deckState.drawPile, deckState.hand, deckState.discardPile, deckState.exhaustPile];
}

function findDeckCard(app: AppRuntime, cardId: string | null, requireUnupgraded: boolean): CardInstance | null {
  for (const pile of getAllDeckPiles(app.state.deckState)) {
    const card = pile.find((item) => (!cardId || item.cardId === cardId || item.cardDefId === cardId) && (!requireUnupgraded || !item.upgraded));
    if (card) {
      return card;
    }
  }
  return null;
}

function removeDeckCard(app: AppRuntime, cardId: string | null): CardInstance | null {
  for (const pile of getAllDeckPiles(app.state.deckState)) {
    const index = pile.findIndex((item) => !cardId || item.cardId === cardId || item.cardDefId === cardId);
    if (index >= 0) {
      const [removed] = pile.splice(index, 1);
      return removed;
    }
  }
  return null;
}

export function applyReward(app: AppRuntime, rewardInstance: RewardOptionInstance): RewardApplyResult {
  const result: RewardApplyResult = {
    ok: true,
    rewardId: rewardInstance.rewardId,
    rewardType: rewardInstance.rewardType,
    cost: rewardInstance.cost,
    effectsApplied: [],
    resourceChanges: [],
    deckChanges: [],
    passiveChanges: [],
    supplySourceChanges: [],
    messages: [],
  };

  switch (rewardInstance.rewardType) {
    case RewardType.GainCash: {
      const amount = getPayloadNumber(rewardInstance, 'amount', 0);
      app.state.cash += amount;
      result.effectsApplied.push(`现金 +${amount}`);
      result.resourceChanges.push(`cash +${amount}`);
      break;
    }
    case RewardType.GainReputation: {
      const amount = getPayloadNumber(rewardInstance, 'amount', 0);
      const before = app.state.reputation;
      app.state.reputation = Math.min(app.state.maxReputation, app.state.reputation + amount);
      result.effectsApplied.push(`信誉 +${app.state.reputation - before}`);
      result.resourceChanges.push(`reputation +${app.state.reputation - before}`);
      break;
    }
    case RewardType.AddCard: {
      const cardId = getPayloadString(rewardInstance, 'cardId');
      if (!cardId || !app.index.cardsById.has(cardId)) {
        return { ...result, ok: false, messages: [`卡牌奖励配置错误：${cardId ?? '未配置'}`] };
      }
      const card = createCardInstance(app, cardId);
      app.state.deckState.discardPile.push(card);
      result.effectsApplied.push(`获得卡牌 ${app.index.cardsById.get(cardId)?.displayName ?? cardId}`);
      result.deckChanges.push(`discardPile +${cardId}`);
      break;
    }
    case RewardType.AddPassive: {
      const passiveId = getPayloadString(rewardInstance, 'passiveId');
      if (!passiveId || !app.index.passivesById.has(passiveId)) {
        return { ...result, ok: false, messages: [`被动奖励配置错误：${passiveId ?? '未配置'}`] };
      }
      app.state.activePassives.push({ passiveId, gainedDay: app.state.currentDay, source: rewardInstance.rewardId });
      result.effectsApplied.push(`获得店铺被动 ${app.index.passivesById.get(passiveId)?.displayName ?? passiveId}`);
      result.passiveChanges.push(`passive +${passiveId}`);
      break;
    }
    case RewardType.AddSupplySource: {
      const supplySourceId = getPayloadString(rewardInstance, 'supplySourceId');
      if (!supplySourceId || !app.index.supplySourcesById.has(supplySourceId)) {
        return { ...result, ok: false, messages: [`货源奖励配置错误：${supplySourceId ?? '未配置'}`] };
      }
      app.state.activeSupplySources.push({ supplySourceId, gainedDay: app.state.currentDay, source: rewardInstance.rewardId });
      result.effectsApplied.push(`获得货源倾向 ${app.index.supplySourcesById.get(supplySourceId)?.displayName ?? supplySourceId}`);
      result.supplySourceChanges.push(`supplySource +${supplySourceId}`);
      break;
    }
    case RewardType.UpgradeCard: {
      const cardId = getPayloadString(rewardInstance, 'cardId');
      const card = findDeckCard(app, cardId, true);
      if (!card) {
        result.messages.push('没有可升级卡牌，奖励安全跳过。TODO：后续加入选牌 UI。');
        break;
      }
      card.upgraded = true;
      result.effectsApplied.push(`升级卡牌 ${app.index.cardsById.get(card.cardId)?.displayName ?? card.cardId}`);
      result.deckChanges.push(`upgrade ${card.cardId}`);
      break;
    }
    case RewardType.RemoveCard: {
      const cardId = getPayloadString(rewardInstance, 'cardId');
      const removed = removeDeckCard(app, cardId);
      if (!removed) {
        result.messages.push('没有可移除卡牌，奖励安全跳过。TODO：后续加入删牌选择 UI。');
        break;
      }
      result.effectsApplied.push(`移除卡牌 ${app.index.cardsById.get(removed.cardId)?.displayName ?? removed.cardId}`);
      result.deckChanges.push(`remove ${removed.cardId}`);
      break;
    }
    default:
      result.messages.push(`奖励类型 ${rewardInstance.rewardType} 暂未支持，已安全跳过。TODO：补充奖励效果。`);
      break;
  }

  if (result.effectsApplied.length === 0 && result.messages.length === 0) {
    result.messages.push('奖励没有可应用效果。');
  }

  result.messages.unshift(`选择奖励：${rewardInstance.displayName}`);
  return result;
}
