import { RunPhase } from '../core/constants';
import { canChooseReward } from '../core/rules_rewards';
import type { AppRuntime, CardInstance, RewardOptionInstance } from '../core/types';
import { escapeHtml } from './formatters';
import { renderCardInfo } from './renderCards';

function getRewardTypeLabel(type: string): string {
  switch (type) {
    case 'add_card':
      return '新增卡牌';
    case 'add_passive':
      return '店铺被动';
    case 'add_supply_source':
      return '货源倾向';
    case 'gain_cash':
      return '获得现金';
    case 'gain_reputation':
      return '恢复信誉';
    case 'upgrade_card':
      return '升级卡牌';
    case 'remove_card':
      return '移除卡牌';
    default:
      return type;
  }
}

function getPayloadString(reward: RewardOptionInstance, key: string): string | null {
  const value = reward.payload[key];
  return typeof value === 'string' ? value : null;
}

function renderRewardDetails(app: AppRuntime, reward: RewardOptionInstance): string {
  const cardId = getPayloadString(reward, 'cardId');
  const passiveId = getPayloadString(reward, 'passiveId');
  const supplySourceId = getPayloadString(reward, 'supplySourceId');

  if (cardId) {
    const card: CardInstance = {
      id: `reward_preview_${cardId}`,
      instanceId: `reward_preview_${cardId}`,
      cardId,
      cardDefId: cardId,
      upgraded: reward.rewardType === 'upgrade_card',
      createdDay: app.state.currentDay,
    };
    return `
      <details class="info-details">
        <summary>${reward.rewardType === 'upgrade_card' ? '升级后卡牌效果' : '新增卡牌效果'}</summary>
        ${renderCardInfo(app, card)}
      </details>
    `;
  }

  if (passiveId) {
    const passive = app.index.passivesById.get(passiveId);
    return `
      <details class="info-details">
        <summary>店铺被动作用</summary>
        <p><strong>${escapeHtml(passive?.displayName ?? passiveId)}</strong></p>
        <p>${escapeHtml(passive?.effectText ?? '暂无效果说明。')}</p>
      </details>
    `;
  }

  if (supplySourceId) {
    const source = app.index.supplySourcesById.get(supplySourceId);
    return `
      <details class="info-details">
        <summary>货源倾向作用</summary>
        <p><strong>${escapeHtml(source?.displayName ?? supplySourceId)}</strong></p>
        <p>${escapeHtml(source?.description ?? '暂无说明。')}</p>
      </details>
    `;
  }

  return '';
}

function renderRewardCard(app: AppRuntime, reward: RewardOptionInstance): string {
  const canChoose = canChooseReward(app, reward);
  const costText = reward.cost > 0 ? `花费 ${reward.cost} 现金` : '免费';

  return `
    <article class="item-card reward-card">
      <h3>${escapeHtml(reward.displayName)}</h3>
      <p><strong>类型：</strong>${escapeHtml(getRewardTypeLabel(reward.rewardType))}</p>
      <p>${escapeHtml(reward.description)}</p>
      <p><strong>费用：</strong>${escapeHtml(costText)}</p>
      <p><strong>效果：</strong>${escapeHtml(reward.effectSummary)}</p>
      ${renderRewardDetails(app, reward)}
      <button
        type="button"
        data-action="choose-reward"
        data-reward-instance-id="${escapeHtml(reward.instanceId)}"
        ${canChoose.ok ? '' : 'disabled'}
      >选择奖励</button>
      ${canChoose.ok ? '' : `<p class="disabled-reason">${escapeHtml(canChoose.reason ?? '不可选择')}</p>`}
    </article>
  `;
}

export function renderRewards(app: AppRuntime): string {
  if (app.state.phase !== RunPhase.DayReward) {
    return '';
  }

  const rewards = app.state.dayState.rewardOptions;
  const content =
    rewards.length > 0
      ? rewards.map((reward) => renderRewardCard(app, reward)).join('')
      : '<p class="warning-text">奖励生成失败：使用默认奖励。请尝试重新进入收店阶段。</p>';

  return `
    <section class="panel rewards-panel" aria-label="收店奖励">
      <h2>收店奖励</h2>
      <p class="hint-text">选择一个收店奖励。部分强力奖励需要消耗现金。选择后将进入下一天；第 8 天选择后进入最终清算。</p>
      <div class="item-list">${content}</div>
    </section>
  `;
}
