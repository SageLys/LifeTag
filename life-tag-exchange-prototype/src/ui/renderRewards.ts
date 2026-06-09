import { RunPhase } from '../core/constants';
import { canChooseReward } from '../core/rules_rewards';
import type { AppRuntime, RewardOptionInstance } from '../core/types';
import { escapeHtml } from './formatters';

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
