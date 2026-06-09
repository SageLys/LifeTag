import { RunPhase } from '../core/constants';
import { canFinishRewardPhase } from '../core/rules_rewards';
import { canChooseReward, ensureRewardState, getRemovableCards, getUpgradableCards } from '../core/rules_rewards';
import type { AppRuntime, CardInstance, RewardOptionInstance } from '../core/types';
import { escapeHtml } from './formatters';
import { renderCardInfo } from './renderCards';

function getRewardTypeLabel(type: string): string {
  switch (type) {
    case 'add_card': return '新增卡牌';
    case 'add_passive': return '店铺被动';
    case 'add_supply_source': return '货源倾向';
    case 'gain_cash': return '获得现金';
    case 'gain_reputation': return '恢复信誉';
    case 'upgrade_card': return '升级卡牌';
    case 'remove_card': return '删除卡牌';
    case 'temporary_insurance': return '事故保险';
    case 'add_temporary_modifier': return '临时效果';
    case 'product_repair': return '库存处理';
    default: return type;
  }
}

function getArchetypeLabel(archetype?: string): string {
  switch (archetype) {
    case 'bigtech': return '大厂流';
    case 'family': return '相亲流';
    case 'mcn': return 'MCN 流';
    case 'risk_control': return '风控流';
    case 'high_risk': return '高风险流';
    case 'general': return '通用';
    case undefined: return '';
    default: return '特殊流派';
  }
}

function renderCardPreview(app: AppRuntime, cardId: string, upgraded = false): string {
  const card: CardInstance = {
    id: `reward_preview_${cardId}`,
    instanceId: `reward_preview_${cardId}`,
    cardId,
    cardDefId: cardId,
    upgraded,
    createdDay: app.state.currentDay,
  };
  return `<details class="info-details"><summary>卡牌效果</summary>${renderCardInfo(app, card)}</details>`;
}

function getPayloadString(reward: RewardOptionInstance, key: string): string | null {
  const direct = (reward as unknown as Record<string, unknown>)[key];
  const payload = reward.payload[key];
  return typeof direct === 'string' ? direct : typeof payload === 'string' ? payload : null;
}

function getPayloadArray(reward: RewardOptionInstance, key: string): string[] {
  const direct = (reward as unknown as Record<string, unknown>)[key];
  const payload = reward.payload[key];
  const value = Array.isArray(direct) ? direct : Array.isArray(payload) ? payload : [];
  return value.filter((item): item is string => typeof item === 'string');
}

function renderDetails(app: AppRuntime, reward: RewardOptionInstance): string {
  const cardId = getPayloadString(reward, 'cardId');
  const cardPool = getPayloadArray(reward, 'cardPool');
  const passiveId = getPayloadString(reward, 'passiveId');
  const supplySourceId = getPayloadString(reward, 'supplySourceId');
  const supplyPool = getPayloadArray(reward, 'supplyPool');
  if (cardId) return renderCardPreview(app, cardId, reward.rewardType === 'upgrade_card');
  if (cardPool.length > 0) {
    return `<details class="info-details"><summary>卡池</summary><p>${cardPool.map((id) => escapeHtml(app.index.cardsById.get(id)?.displayName ?? id)).join(' / ')}</p></details>`;
  }
  if (passiveId) {
    const passive = app.index.passivesById.get(passiveId);
    return `<details class="info-details"><summary>被动作用</summary><p><strong>${escapeHtml(passive?.displayName ?? passiveId)}</strong></p><p>${escapeHtml(passive?.effectText ?? passive?.description ?? '暂无说明。')}</p></details>`;
  }
  if (supplySourceId || supplyPool.length > 0) {
    const ids = supplySourceId ? [supplySourceId] : supplyPool;
    return `<details class="info-details"><summary>货源作用</summary>${ids.map((id) => {
      const source = app.index.supplySourcesById.get(id);
      return `<p><strong>${escapeHtml(source?.displayName ?? id)}</strong>：${escapeHtml(source?.description ?? '暂无说明。')}</p>`;
    }).join('')}</details>`;
  }
  return '';
}

function renderTargetChoices(app: AppRuntime, reward: RewardOptionInstance, action: string): string {
  if (reward.rewardType === 'upgrade_card') {
    const cards = getUpgradableCards(app);
    return cards.length > 0 ? `<div class="choice-list">${cards.map((card) => {
      const def = app.index.cardsById.get(card.cardDefId);
      return `<button type="button" data-action="${action}" data-reward-instance-id="${escapeHtml(reward.instanceId)}" data-card-instance-id="${escapeHtml(card.instanceId)}">${escapeHtml(def?.displayName ?? card.cardDefId)}</button>`;
    }).join('')}</div>` : '';
  }
  if (reward.rewardType === 'remove_card') {
    const cards = getRemovableCards(app);
    return cards.length > 0 ? `<div class="choice-list">${cards.map((card) => {
      const def = app.index.cardsById.get(card.cardDefId);
      return `<button type="button" data-action="${action}" data-reward-instance-id="${escapeHtml(reward.instanceId)}" data-card-instance-id="${escapeHtml(card.instanceId)}">${escapeHtml(def?.displayName ?? card.cardDefId)}</button>`;
    }).join('')}</div>` : '';
  }
  if (reward.rewardType === 'product_repair') {
    const products = app.state.inventory.filter((product) => !product.flags.sold);
    return products.length > 0 ? `<div class="choice-list">${products.map((product) => `<button type="button" data-action="${action}" data-reward-instance-id="${escapeHtml(reward.instanceId)}" data-product-id="${escapeHtml(product.id)}">${escapeHtml(product.displayName)}</button>`).join('')}</div>` : '';
  }
  return '';
}

function renderRewardCard(app: AppRuntime, reward: RewardOptionInstance, action: string, buttonText: string, disabled = false, stateText = ''): string {
  const canChoose = canChooseReward(app, reward);
  const disabledReason = disabled ? stateText : canChoose.ok ? '' : canChoose.reason ?? '不可选择';
  const targetChoices = !disabled && canChoose.ok ? renderTargetChoices(app, reward, action) : '';
  const needsTarget = ['upgrade_card', 'remove_card', 'product_repair'].includes(reward.rewardType) && targetChoices;
  return `
    <article class="item-card reward-card">
      <h3>${escapeHtml(reward.displayName)}</h3>
      <p><strong>类型：</strong>${escapeHtml(getRewardTypeLabel(reward.rewardType))}${reward.archetype ? ` · ${escapeHtml(getArchetypeLabel(reward.archetype))}` : ''}</p>
      <p>${escapeHtml(reward.description)}</p>
      <p><strong>费用：</strong>${reward.cost > 0 ? `${reward.cost} 现金` : '免费'}${reward.maintenanceCost ? ` · ${reward.maintenanceCost} 维护点` : ''}</p>
      <p><strong>效果：</strong>${escapeHtml(reward.effectSummary)}</p>
      ${renderDetails(app, reward)}
      ${targetChoices}
      ${needsTarget ? '' : `<button type="button" data-action="${action}" data-reward-instance-id="${escapeHtml(reward.instanceId)}" ${disabled || !canChoose.ok ? 'disabled' : ''}>${escapeHtml(buttonText)}</button>`}
      ${disabledReason ? `<p class="disabled-reason">${escapeHtml(disabledReason)}</p>` : ''}
    </article>
  `;
}

function renderMaintenance(app: AppRuntime): string {
  const state = ensureRewardState(app);
  return `
    <section class="reward-section">
      <h3>基础维护</h3>
      <p class="hint-text">维护点：${state.maintenancePointsRemaining} / ${state.maintenancePointsTotal}</p>
      <div class="item-list">${state.maintenanceOptions.map((reward) => {
        const claimed = state.claimedMaintenanceRewardIds.includes(reward.rewardId) && !reward.explicitlyRepeatable;
        const pointShort = state.maintenancePointsRemaining < (reward.maintenanceCost ?? 1);
        const sameGroup = Boolean(reward.oncePerDayGroup && state.maintenanceOptions.some((item) => item.oncePerDayGroup === reward.oncePerDayGroup && state.claimedMaintenanceRewardIds.includes(item.rewardId)));
        const reason = claimed ? '已领取' : pointShort ? '维护点不足' : sameGroup ? '同组强维护项今日已领取' : '';
        return renderRewardCard(app, reward, 'claim-maintenance-reward', claimed ? '已领取' : '领取', Boolean(reason), reason);
      }).join('')}</div>
    </section>
  `;
}

function renderFreeBuild(app: AppRuntime): string {
  const state = ensureRewardState(app);
  return `
    <section class="reward-section">
      <h3>免费构筑三选一</h3>
      <div class="item-list">${state.freeBuildOptions.map((reward) => {
        const selected = state.selectedFreeBuildRewardId === reward.rewardId;
        const locked = Boolean(state.selectedFreeBuildRewardId && !selected);
        return renderRewardCard(app, reward, 'choose-reward', selected ? '已选择' : '选择', selected || locked, selected ? '已选择' : locked ? '已锁定' : '');
      }).join('')}</div>
    </section>
  `;
}

function renderPaidShop(app: AppRuntime): string {
  const state = ensureRewardState(app);
  return `
    <section class="reward-section">
      <h3>付费强奖励商店</h3>
      <p class="hint-text">当前现金：${app.state.cash}。每项今日最多购买一次，可以购买多个。</p>
      <div class="item-list">${state.paidShopOptions.map((reward) => {
        const bought = state.purchasedPaidRewardIds.includes(reward.rewardId);
        const short = app.state.cash < reward.cost;
        const reason = bought ? '已购买' : short ? `现金不足，需要 ${reward.cost}` : '';
        return renderRewardCard(app, reward, 'buy-paid-reward', bought ? '已购买' : '购买', Boolean(reason), reason);
      }).join('')}</div>
    </section>
  `;
}

function renderBonus(app: AppRuntime): string {
  const state = ensureRewardState(app);
  if (!state.bonusUnlocked) {
    return `<section class="reward-section"><h3>爆单奖励</h3><p class="hint-text">今日未触发爆单奖励。触发条件：当日利润、单笔利润、无事故多单或低事故盲盒交易达到配置要求。</p></section>`;
  }
  return `
    <section class="reward-section">
      <h3>爆单奖励</h3>
      <p class="hint-text">触发原因：${state.bonusReasons.map(escapeHtml).join('；')}</p>
      <div class="item-list">${state.bonusOptions.map((reward) => {
        const selected = state.selectedBonusRewardId === reward.rewardId;
        const locked = Boolean((state.selectedBonusRewardId && !selected) || state.skippedBonus);
        return renderRewardCard(app, reward, 'choose-bonus-reward', selected ? '已选择' : '选择', selected || locked, selected ? '已选择' : locked ? '已锁定' : '');
      }).join('')}</div>
      <button type="button" data-action="skip-bonus-reward" ${state.selectedBonusRewardId || state.skippedBonus ? 'disabled' : ''}>跳过爆单奖励</button>
      ${state.skippedBonus ? '<p class="disabled-reason">已跳过</p>' : ''}
    </section>
  `;
}

export function renderRewards(app: AppRuntime): string {
  if (app.state.phase !== RunPhase.DayReward) return '';
  const finish = canFinishRewardPhase(app);
  return `
    <section class="panel rewards-panel" aria-label="收店奖励">
      <h2>收店奖励</h2>
      <p class="hint-text">维护奖励可多领；免费构筑和爆单奖励各选 1 个；付费商店可买多个。</p>
      ${renderMaintenance(app)}
      ${renderFreeBuild(app)}
      ${renderPaidShop(app)}
      ${renderBonus(app)}
      <div class="reward-footer">
        <button type="button" data-action="finish-reward-phase" ${finish.ok ? '' : 'disabled'}>结束收店 / 进入下一天</button>
        ${finish.ok ? '' : `<p class="disabled-reason">${escapeHtml(finish.reason ?? '还不能结束收店')}</p>`}
      </div>
    </section>
  `;
}
