import type { RewardOptionInstance } from '../../core/types';
import { formatCash, truncate } from './playerText';

export interface RewardOptionView {
  instanceId: string;
  rewardId: string;
  name: string;
  costText: string;         // "免费" | "¥N" | "每日 ¥N"
  effectSummary: string;    // ≤32 chars
  slot: string;             // translated slot label
  canAfford: boolean;
}

const SLOT_LABELS: Record<string, string> = {
  maintenance: '日常维护',
  free_build: '免费建造',
  paid_shop: '付费商店',
  bonus: '奖励',
  legacy: '传承',
};

function costText(reward: RewardOptionInstance): string {
  if ((reward.cost ?? 0) === 0 && !reward.maintenanceCost) return '免费';
  if (reward.maintenanceCost) return `每日 ${formatCash(reward.maintenanceCost)}`;
  return formatCash(reward.cost ?? 0);
}

export function toRewardOptionView(
  reward: RewardOptionInstance,
  currentCash: number,
): RewardOptionView {
  const cost = reward.cost ?? 0;
  return {
    instanceId: reward.instanceId,
    rewardId: reward.rewardId,
    name: reward.displayName,
    costText: costText(reward),
    effectSummary: truncate(reward.effectSummary ?? reward.description ?? '', 32),
    slot: SLOT_LABELS[reward.rewardSlot ?? ''] ?? reward.rewardSlot ?? '奖励',
    canAfford: currentCash >= cost,
  };
}
