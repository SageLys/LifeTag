import type { AppRuntime, Modifier, PassiveState, SupplySourceState } from '../core/types';
import { escapeHtml } from './formatters';

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

function renderPassive(app: AppRuntime, passive: PassiveState): string {
  const def = app.index.passivesById.get(passive.passiveId);
  return `
    <article class="item-card">
      <h3>${escapeHtml(def?.displayName ?? passive.passiveId)}</h3>
      <p>${escapeHtml(def?.effectText ?? '暂无效果说明。')}</p>
      <dl class="item-stats">
        <div><dt>来源</dt><dd>${escapeHtml(passive.source ?? '奖励')}</dd></div>
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
      <p><strong>效果：</strong>${escapeHtml(formatModifiers(def?.templateWeightModifiers ?? []))}</p>
      <dl class="item-stats">
        <div><dt>来源</dt><dd>${escapeHtml(source.source ?? '奖励')}</dd></div>
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
    </section>
  `;
}
