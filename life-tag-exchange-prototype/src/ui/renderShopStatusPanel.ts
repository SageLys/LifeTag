import type { AppRuntime, Effect, Modifier, PassiveState, SupplySourceState } from '../core/types';
import { escapeHtml } from './formatters';
import { formatEffect } from './renderCards';

function formatDuration(source: SupplySourceState): string {
  if (source.remainingDays === null || typeof source.remainingDays === 'undefined') {
    return '整局生效';
  }
  return `剩余 ${source.remainingDays} 天`;
}

function formatModifiers(modifiers: Modifier[]): string {
  if (modifiers.length === 0) {
    return '影响后续商品候选的生成权重。';
  }

  return modifiers
    .map((modifier) => {
      const target = modifier.targetId ? `${modifier.targetId} ` : '';
      return `${target}${modifier.stat} ${modifier.op} ${modifier.value}`;
    })
    .join('；');
}

function formatPassiveDescription(app: AppRuntime, passiveId: string): string {
  const def = app.index.passivesById.get(passiveId);
  const text = def?.effectText ?? def?.description;
  if (text && text !== 'undefined') {
    return text;
  }
  const effects = def?.effects ?? [];
  if (effects.length > 0) {
    return effects.map((effect) => effect.displayText ?? formatEffect(effect, app)).filter(Boolean).join('；');
  }
  return '暂无效果说明。';
}

function formatSupplyEffect(app: AppRuntime, effects: Effect[] | undefined, modifiers: Modifier[]): string {
  const effectText = (effects ?? []).map((effect) => effect.displayText ?? formatEffect(effect, app)).filter(Boolean).join('；');
  if (effectText) {
    return effectText;
  }
  return formatModifiers(modifiers);
}

function formatSourceName(app: AppRuntime, sourceId?: string): string {
  if (!sourceId) {
    return '奖励';
  }
  if (sourceId === 'debug') {
    return '调试场景';
  }
  const reward = app.index.rewardsById.get(sourceId);
  const text = reward?.displayName ?? reward?.description;
  return text && text !== 'undefined' ? text : '奖励';
}

function formatTemporaryModifier(modifier: { stat: string; op: string; value: number; target?: string }): string {
  if (modifier.stat === 'dailyActionPoints') return `下日行动点 ${modifier.value >= 0 ? '+' : ''}${modifier.value}`;
  if (modifier.stat === 'dailyDrawCount') return `下日抽牌 ${modifier.value >= 0 ? '+' : ''}${modifier.value}`;
  if (modifier.stat === 'dailyProductCandidateCount') return `下日商品候选 ${modifier.value >= 0 ? '+' : ''}${modifier.value}`;
  if (modifier.stat === 'risk') return `下次出售爆雷 ${modifier.value >= 0 ? '+' : ''}${modifier.value}`;
  if (modifier.stat === 'actionPointCost') return '下次对应操作不消耗行动点';
  if (modifier.stat === 'cashCost') return '下次对应操作不消耗现金';
  if (modifier.stat === 'price' && modifier.op === 'multiply') return '下次付费商店折扣';
  return '临时效果';
}

function renderPassive(app: AppRuntime, passive: PassiveState): string {
  const def = app.index.passivesById.get(passive.passiveId);
  return `
    <article class="item-card">
      <h3>${escapeHtml(def?.displayName ?? passive.passiveId)}</h3>
      <p>${escapeHtml(formatPassiveDescription(app, passive.passiveId))}</p>
      <dl class="item-stats">
        <div><dt>来源</dt><dd>${escapeHtml(formatSourceName(app, passive.source))}</dd></div>
        <div><dt>获得日</dt><dd>第 ${passive.gainedDay} 天</dd></div>
        <div><dt>持续</dt><dd>整局生效</dd></div>
      </dl>
    </article>
  `;
}

function renderSupplySource(app: AppRuntime, source: SupplySourceState): string {
  const def = app.index.supplySourcesById.get(source.supplySourceId);
  return `
    <article class="item-card">
      <h3>${escapeHtml(def?.displayName ?? source.supplySourceId)}</h3>
      <p>${escapeHtml(def?.description ?? '暂无说明。')}</p>
      <p><strong>效果：</strong>${escapeHtml(formatSupplyEffect(app, [...(def?.spawnModifiers ?? []), ...(def?.effects ?? [])], def?.templateWeightModifiers ?? []))}</p>
      <dl class="item-stats">
        <div><dt>来源</dt><dd>${escapeHtml(formatSourceName(app, source.source))}</dd></div>
        <div><dt>获得日</dt><dd>第 ${source.gainedDay} 天</dd></div>
        <div><dt>持续</dt><dd>${escapeHtml(formatDuration(source))}</dd></div>
      </dl>
    </article>
  `;
}

export function renderShopStatusPanel(app: AppRuntime): string {
  const passives = app.state.activePassives.length > 0
    ? app.state.activePassives.map((passive) => renderPassive(app, passive)).join('')
    : '<p class="hint-text">暂无店铺被动。</p>';
  const supplySources = app.state.activeSupplySources.length > 0
    ? app.state.activeSupplySources.map((source) => renderSupplySource(app, source)).join('')
    : '<p class="hint-text">暂无货源倾向。</p>';
  const insurances = app.state.temporaryInsurances.length > 0
    ? app.state.temporaryInsurances.map((insurance) => `
      <article class="item-card">
        <h3>${escapeHtml(insurance.displayName)}</h3>
        <p>剩余触发次数：${insurance.remainingUses}</p>
        <p><strong>来源：</strong>${escapeHtml(formatSourceName(app, insurance.sourceRewardId))}</p>
      </article>
    `).join('')
    : '<p class="hint-text">暂无临时保险。</p>';
  const temporaryModifiers = app.state.temporaryRunModifiers.length > 0
    ? app.state.temporaryRunModifiers.map((modifier) => `
      <article class="item-card">
        <h3>${escapeHtml(modifier.displayName)}</h3>
        <p>${escapeHtml(formatTemporaryModifier(modifier))}，剩余 ${modifier.uses - modifier.consumed} 次</p>
      </article>
    `).join('')
    : '<p class="hint-text">暂无临时效果。</p>';

  return `
    <section class="panel shop-status-panel" aria-label="店铺状态与构筑效果">
      <h2>店铺状态 / 构筑效果</h2>
      <details class="info-details" open>
        <summary>店铺被动（${app.state.activePassives.length}）</summary>
        <div class="item-list">${passives}</div>
      </details>
      <details class="info-details" open>
        <summary>货源倾向（${app.state.activeSupplySources.length}）</summary>
        <div class="item-list">${supplySources}</div>
      </details>
      <details class="info-details" open>
        <summary>临时保险（${app.state.temporaryInsurances.length}）</summary>
        <div class="item-list">${insurances}</div>
      </details>
      <details class="info-details">
        <summary>临时效果（${app.state.temporaryRunModifiers.length}）</summary>
        <div class="item-list">${temporaryModifiers}</div>
      </details>
    </section>
  `;
}
