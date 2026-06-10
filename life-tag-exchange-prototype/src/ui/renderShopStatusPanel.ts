import { getDeckCounts } from '../core/deckSystem';
import type { AppRuntime, CardInstance, RewardLogEntry } from '../core/types';
import { escapeHtml } from './formatters';
import { renderCardInfo } from './renderCards';

function passiveNames(app: AppRuntime): string {
  return app.state.activePassives
    .map((passive) => app.index.passivesById.get(passive.passiveId)?.displayName ?? passive.passiveId)
    .join('、') || '暂无';
}

function renderDetailHeader(title: string, subtitle: string): string {
  return `
    <div class="detail-page-header">
      <div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(subtitle)}</p>
      </div>
      <button type="button" class="secondary-button" data-action="open-ui-view" data-view="game">返回营业界面</button>
    </div>
  `;
}

export function renderShopStatusPanel(app: AppRuntime): string {
  return `
    <section class="panel shop-status-panel art-frame art-frame-shop-status" aria-label="店铺状态入口">
      <div class="section-title"><h2>店铺状态</h2><span>查看详情</span></div>
      <div class="status-entry-grid">
        <button type="button" class="secondary-button status-entry" data-action="open-ui-view" data-view="deck_detail">
          <strong>牌库详情</strong>
          <span>查看抽牌堆、手牌、弃牌堆、消耗堆</span>
        </button>
        <button type="button" class="secondary-button status-entry" data-action="open-ui-view" data-view="shop_rewards_detail">
          <strong>店铺被动详情</strong>
          <span>查看被动、货源、一次性/临时/消耗型奖励</span>
        </button>
      </div>
      <div class="passive-overview">
        <h3>店铺被动概览</h3>
        <p>${escapeHtml(passiveNames(app))}</p>
      </div>
    </section>
  `;
}

function renderPile(app: AppRuntime, title: string, cards: CardInstance[]): string {
  const content = cards.length > 0
    ? `<div class="item-list hand-grid">${cards.map((card) => renderCardInfo(app, card)).join('')}</div>`
    : '<p class="hint-text">这个牌堆目前为空。</p>';

  return `
    <section class="panel art-frame art-frame-panel">
      <div class="section-title"><h3>${escapeHtml(title)}</h3><span>${cards.length} 张</span></div>
      ${content}
    </section>
  `;
}

export function renderDeckDetailPage(app: AppRuntime): string {
  const { deckState } = app.state;
  const counts = getDeckCounts(deckState);
  const total = counts.drawCount + counts.handCount + counts.discardCount + counts.exhaustCount;

  return `
    <section class="game-screen detail-page deck-detail-page">
      ${renderDetailHeader('牌库详情', '当前局内所有牌堆信息。这里不会改变牌序或抽牌结果。')}
      <section class="panel art-frame art-frame-panel">
        <div class="section-title"><h2>牌库总览</h2><span>${total} 张</span></div>
        <dl class="compact-stats">
          <div><dt>当前牌库数量</dt><dd>${total}</dd></div>
          <div><dt>抽牌堆</dt><dd>${counts.drawCount}</dd></div>
          <div><dt>手牌</dt><dd>${counts.handCount}</dd></div>
          <div><dt>弃牌堆</dt><dd>${counts.discardCount}</dd></div>
          <div><dt>消耗堆</dt><dd>${counts.exhaustCount}</dd></div>
        </dl>
      </section>
      <div class="detail-grid">
        ${renderPile(app, '抽牌堆', deckState.drawPile)}
        ${renderPile(app, '当前手牌', deckState.hand)}
        ${renderPile(app, '弃牌堆', deckState.discardPile)}
        ${renderPile(app, '消耗堆', deckState.exhaustPile)}
      </div>
    </section>
  `;
}

function formatSourceName(app: AppRuntime, sourceId?: string): string {
  if (!sourceId) return '奖励';
  if (sourceId === 'debug') return '调试场景';
  return app.index.rewardsById.get(sourceId)?.displayName ?? app.index.rewardsById.get(sourceId)?.description ?? sourceId;
}

function renderRewardLogEntry(app: AppRuntime, entry: RewardLogEntry): string {
  const reward = app.index.rewardsById.get(entry.rewardId);
  const effects = [
    ...(entry.effectsApplied ?? []),
    entry.deckChange,
    entry.passiveChange,
    entry.supplySourceChange,
    typeof entry.cashBefore === 'number' && typeof entry.cashAfter === 'number' ? `现金 ${entry.cashBefore} → ${entry.cashAfter}` : null,
    typeof entry.reputationBefore === 'number' && typeof entry.reputationAfter === 'number' ? `信誉 ${entry.reputationBefore} → ${entry.reputationAfter}` : null,
  ].filter((item): item is string => Boolean(item));

  return `
    <article class="item-card reward-history-card">
      <h3>${escapeHtml(entry.rewardDisplayName ?? reward?.displayName ?? reward?.description ?? entry.rewardId)}</h3>
      <dl class="item-stats">
        <div><dt>获得日</dt><dd>第 ${entry.day} 天</dd></div>
        <div><dt>类型</dt><dd>${escapeHtml(entry.rewardType)}</dd></div>
        <div><dt>现金消耗</dt><dd>${entry.cashCost ?? entry.cost ?? 0}</dd></div>
        <div><dt>实例</dt><dd>${escapeHtml(entry.rewardInstanceId ?? '无')}</dd></div>
      </dl>
      <p><strong>配置说明：</strong>${escapeHtml(reward?.description ?? '暂无说明')}</p>
      <ul>${effects.length > 0 ? effects.map((effect) => `<li>${escapeHtml(effect)}</li>`).join('') : '<li>奖励已结算，无额外日志文本。</li>'}</ul>
    </article>
  `;
}

export function renderShopRewardsDetailPage(app: AppRuntime): string {
  const passives = app.state.activePassives;
  const sources = app.state.activeSupplySources;
  const insurances = app.state.temporaryInsurances;
  const modifiers = app.state.temporaryRunModifiers;
  const rewardLog = app.state.rewardLog;

  return `
    <section class="game-screen detail-page shop-rewards-detail-page">
      ${renderDetailHeader('店铺被动详情', '完整展示本局已获得的被动、货源、一次性奖励、临时道具和消耗型道具。')}
      <div class="detail-grid">
        <section class="panel art-frame art-frame-panel">
          <div class="section-title"><h2>持续型店铺被动</h2><span>${passives.length} 项</span></div>
          <div class="item-list">
            ${passives.length > 0 ? passives.map((passive) => {
              const def = app.index.passivesById.get(passive.passiveId);
              return `<article class="item-card"><h3>${escapeHtml(def?.displayName ?? passive.passiveId)}</h3><p>${escapeHtml(def?.effectText ?? def?.description ?? '暂无说明')}</p><p class="hint-text">来源：${escapeHtml(formatSourceName(app, passive.source))} / 第 ${passive.gainedDay} 天</p></article>`;
            }).join('') : '<p class="hint-text">暂无持续型被动。</p>'}
          </div>
        </section>

        <section class="panel art-frame art-frame-panel">
          <div class="section-title"><h2>货源与渠道奖励</h2><span>${sources.length} 项</span></div>
          <div class="item-list">
            ${sources.length > 0 ? sources.map((source) => {
              const def = app.index.supplySourcesById.get(source.supplySourceId);
              const duration = typeof source.remainingDays === 'number' ? `剩余 ${source.remainingDays} 天` : '整局生效';
              return `<article class="item-card"><h3>${escapeHtml(def?.displayName ?? source.supplySourceId)}</h3><p>${escapeHtml(def?.description ?? '暂无说明')}</p><p class="hint-text">来源：${escapeHtml(formatSourceName(app, source.source))} / ${duration}</p></article>`;
            }).join('') : '<p class="hint-text">暂无货源奖励。</p>'}
          </div>
        </section>

        <section class="panel art-frame art-frame-panel">
          <div class="section-title"><h2>临时 / 消耗型道具</h2><span>${insurances.length + modifiers.length} 项</span></div>
          <div class="item-list">
            ${insurances.map((insurance) => `<article class="item-card"><h3>${escapeHtml(insurance.displayName)}</h3><p>剩余触发次数：${insurance.remainingUses}</p><p class="hint-text">来源：${escapeHtml(formatSourceName(app, insurance.sourceRewardId))} / 第 ${insurance.gainedDay} 天</p></article>`).join('')}
            ${modifiers.map((modifier) => `<article class="item-card"><h3>${escapeHtml(modifier.displayName)}</h3><p>${escapeHtml(modifier.stat)} ${escapeHtml(modifier.op)} ${modifier.value}</p><p class="hint-text">作用域：${escapeHtml(modifier.scope)} / 已用 ${modifier.consumed}/${modifier.uses}</p></article>`).join('')}
            ${insurances.length + modifiers.length === 0 ? '<p class="hint-text">暂无未消耗的临时或消耗型道具。</p>' : ''}
          </div>
        </section>

        <section class="panel art-frame art-frame-panel reward-history-panel">
          <div class="section-title"><h2>完整奖励记录</h2><span>${rewardLog.length} 条</span></div>
          <div class="item-list">
            ${rewardLog.length > 0 ? rewardLog.slice().reverse().map((entry) => renderRewardLogEntry(app, entry)).join('') : '<p class="hint-text">本局还没有获得奖励。</p>'}
          </div>
        </section>
      </div>
    </section>
  `;
}
