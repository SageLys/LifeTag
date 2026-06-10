import { RunPhase } from '../core/constants';
import { canChooseReward, canFinishRewardPhase, ensureRewardState, getRemovableCards, getUpgradableCards } from '../core/rules_rewards';
import type { AppRuntime, CardInstance, RewardOptionInstance } from '../core/types';
import { escapeHtml } from './formatters';
import { renderCardInfo } from './renderCards';

type RewardAction = 'claim-maintenance-reward' | 'choose-reward' | 'buy-paid-reward' | 'choose-bonus-reward';

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
    case 'mcn': return 'MCN流';
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

function renderTargetChoices(app: AppRuntime, reward: RewardOptionInstance, action: RewardAction): string {
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

function rewardCostText(reward: RewardOptionInstance, action: RewardAction): string {
  if (action === 'claim-maintenance-reward') {
    return `消耗维护点：${reward.maintenanceCost ?? 1}`;
  }
  if (action === 'buy-paid-reward') {
    return `价格：${reward.cost} 现金`;
  }
  return reward.cost > 0 ? `费用：${reward.cost} 现金` : '费用：免费';
}

function renderRewardCard(app: AppRuntime, reward: RewardOptionInstance, action: RewardAction, buttonText: string, disabled = false, stateText = ''): string {
  const canChoose = canChooseReward(app, reward);
  const disabledReason = disabled ? stateText : canChoose.ok ? '' : canChoose.reason ?? '不可选择';
  const targetChoices = !disabled && canChoose.ok ? renderTargetChoices(app, reward, action) : '';
  const needsTarget = ['upgrade_card', 'remove_card', 'product_repair'].includes(reward.rewardType) && targetChoices;
  return `
    <article class="item-card reward-card art-frame art-frame-reward-card">
      <div class="reward-art" aria-hidden="true"></div>
      <h3>${escapeHtml(reward.displayName)}</h3>
      <p><strong>类型：</strong>${escapeHtml(getRewardTypeLabel(reward.rewardType))}${reward.archetype ? ` / ${escapeHtml(getArchetypeLabel(reward.archetype))}` : ''}</p>
      <p>${escapeHtml(reward.description)}</p>
      <p><strong>${escapeHtml(rewardCostText(reward, action))}</strong></p>
      <p><strong>效果：</strong>${escapeHtml(reward.effectSummary)}</p>
      ${renderDetails(app, reward)}
      ${targetChoices}
      ${needsTarget ? '' : `<button type="button" data-action="${action}" data-reward-instance-id="${escapeHtml(reward.instanceId)}" ${disabled || !canChoose.ok ? 'disabled' : ''}>${escapeHtml(buttonText)}</button>`}
      ${disabledReason ? `<p class="disabled-reason">${escapeHtml(disabledReason)}</p>` : ''}
    </article>
  `;
}

function getWizardStep(app: AppRuntime): number {
  const flags = app.state.dayState.phaseFlags;
  if (flags.rewardWizardStep6) return 6;
  if (flags.rewardWizardStep5) return 5;
  if (flags.rewardWizardStep4) return 4;
  if (flags.rewardWizardStep3) return 3;
  return 2;
}

function renderStepRail(step: number): string {
  const labels = ['日结摘要', '基础维护', '免费构筑', '付费商店', '爆单奖励', '收店总结'];
  return `<div class="reward-steps">${labels.map((label, index) => `<span class="${index + 1 === step ? 'is-active' : index + 1 < step ? 'is-done' : ''}">${index + 1}. ${label}</span>`).join('')}</div>`;
}

function nextButton(step: number, label = '下一步'): string {
  return `<div class="phase-actions reward-nav"><button type="button" data-action="reward-wizard-next" data-next-step="${step}">${label}</button></div>`;
}

function renderCurrentStep(app: AppRuntime, step: number): string {
  const state = ensureRewardState(app);
  if (step === 2) {
    return `
      <h3>基础维护</h3>
      <p class="hint-text">剩余维护点：${state.maintenancePointsRemaining} / ${state.maintenancePointsTotal}。资源足够时可以领取多个维护奖励，选完后手动进入下一步。</p>
      <div class="item-list reward-grid">${state.maintenanceOptions.map((reward) => {
        const claimed = state.claimedMaintenanceRewardIds.includes(reward.rewardId) && !reward.explicitlyRepeatable;
        const pointShort = state.maintenancePointsRemaining < (reward.maintenanceCost ?? 1);
        const sameGroup = Boolean(reward.oncePerDayGroup && state.maintenanceOptions.some((item) => item.oncePerDayGroup === reward.oncePerDayGroup && state.claimedMaintenanceRewardIds.includes(item.rewardId)));
        const reason = claimed ? '已领取' : pointShort ? `维护点不足，还差 ${(reward.maintenanceCost ?? 1) - state.maintenancePointsRemaining}` : sameGroup ? '同组维护今日已领取' : '';
        return renderRewardCard(app, reward, 'claim-maintenance-reward', claimed ? '已领取' : '领取', Boolean(reason), reason);
      }).join('')}</div>
      ${nextButton(3, '维护完成，去免费构筑')}
    `;
  }
  if (step === 3) {
    return `
      <h3>免费构筑</h3>
      <p class="hint-text">免费构筑只能选择 1 项。</p>
      <div class="item-list reward-grid">${state.freeBuildOptions.map((reward) => {
        const selected = state.selectedFreeBuildRewardId === reward.rewardId;
        const locked = Boolean(state.selectedFreeBuildRewardId && !selected);
        return renderRewardCard(app, reward, 'choose-reward', selected ? '已选择' : '选择', selected || locked, selected ? '已选择' : locked ? '已锁定' : '');
      }).join('')}</div>
      ${state.selectedFreeBuildRewardId ? nextButton(4, '进入付费商店') : '<p class="disabled-reason">请先选择 1 项免费构筑。</p>'}
    `;
  }
  if (step === 4) {
    return `
      <h3>付费商店</h3>
      <p class="hint-text">当前现金：${app.state.cash}。现金足够时可以买多个，买完后手动进入下一步。</p>
      <div class="item-list reward-grid">${state.paidShopOptions.map((reward) => {
        const bought = state.purchasedPaidRewardIds.includes(reward.rewardId);
        const short = app.state.cash < reward.cost;
        const reason = bought ? '已购买' : short ? `现金不足，需要 ${reward.cost}` : '';
        return renderRewardCard(app, reward, 'buy-paid-reward', bought ? '已购买' : '购买', Boolean(reason), reason);
      }).join('')}</div>
      ${nextButton(5, '商店逛完，去看爆单奖励')}
    `;
  }
  if (step === 5) {
    if (!state.bonusUnlocked) {
      return `
        <h3>爆单奖励</h3>
        <p class="hint-text">今日未触发爆单奖励。</p>
        ${nextButton(6, '进入收店总结')}
      `;
    }
    return `
      <h3>爆单奖励</h3>
      <p class="hint-text">触发原因：${state.bonusReasons.map(escapeHtml).join('；')}</p>
      <div class="item-list reward-grid">${state.bonusOptions.map((reward) => {
        const selected = state.selectedBonusRewardId === reward.rewardId;
        const locked = Boolean((state.selectedBonusRewardId && !selected) || state.skippedBonus);
        return renderRewardCard(app, reward, 'choose-bonus-reward', selected ? '已选择' : '选择', selected || locked, selected ? '已选择' : locked ? '已锁定' : '');
      }).join('')}</div>
      <div class="phase-actions reward-nav">
        <button type="button" data-action="skip-bonus-reward" ${state.selectedBonusRewardId || state.skippedBonus ? 'disabled' : ''}>跳过</button>
        ${(state.selectedBonusRewardId || state.skippedBonus) ? '<button type="button" data-action="reward-wizard-next" data-next-step="6">进入收店总结</button>' : ''}
      </div>
    `;
  }
  return `
    <h3>收店总结</h3>
    <dl class="compact-stats">
      <div><dt>当前现金</dt><dd>${app.state.cash}</dd></div>
      <div><dt>累计利润</dt><dd>${app.state.totalProfit} / ${app.state.targetTotalProfit}</dd></div>
      <div><dt>信誉</dt><dd>${app.state.reputation}</dd></div>
      <div><dt>牌库规模</dt><dd>${app.state.deckState.drawPile.length + app.state.deckState.hand.length + app.state.deckState.discardPile.length + app.state.deckState.exhaustPile.length}</dd></div>
    </dl>
    <div class="phase-actions">
      <button type="button" data-action="finish-reward-phase" ${canFinishRewardPhase(app).ok ? '' : 'disabled'}>${app.state.currentDay >= app.state.maxDays ? '查看最终报告' : '进入下一天'}</button>
    </div>
    ${canFinishRewardPhase(app).ok ? '' : `<p class="disabled-reason">${escapeHtml(canFinishRewardPhase(app).reason ?? '还不能收店')}</p>`}
  `;
}

export function renderRewards(app: AppRuntime): string {
  if (app.state.phase !== RunPhase.DayReward) return '';
  const step = getWizardStep(app);
  return `
    <section class="panel rewards-panel art-frame art-frame-modal" aria-label="收店奖励向导">
      <div class="section-title"><h2>收店奖励向导</h2><span>第 ${app.state.currentDay} 天</span></div>
      ${renderStepRail(step)}
      ${renderCurrentStep(app, step)}
    </section>
  `;
}
