import { getDeckCounts } from '../core/deckSystem';
import type { AppRuntime, CardInstance } from '../core/types';
import { escapeHtml } from './formatters';

function renderCard(app: AppRuntime, card: CardInstance): string {
  const cardDef = app.index.cardsById.get(card.cardDefId) ?? app.index.cardsById.get(card.cardId);
  const cardName = cardDef?.displayName ?? card.cardId;
  const cardType = cardDef?.cardType ?? 'unknown';
  const actionPointCost = cardDef?.cost ?? 0;
  const cashCost = 0;
  const effectText = cardDef?.effectText ?? '暂无效果说明。';

  return `
    <article class="item-card hand-card">
      <h3>${escapeHtml(cardName)}</h3>
      <dl class="item-stats">
        <div><dt>类型</dt><dd>${escapeHtml(cardType)}</dd></div>
        <div><dt>行动点成本</dt><dd>${actionPointCost}</dd></div>
        <div><dt>现金成本</dt><dd>${cashCost}</dd></div>
        <div><dt>实例</dt><dd>${escapeHtml(card.id)}</dd></div>
      </dl>
      <p>${escapeHtml(effectText)}</p>
      <button type="button" disabled>使用</button>
      <p class="disabled-reason">卡牌效果将在 P0-10 实现</p>
    </article>
  `;
}

export function renderHand(app: AppRuntime): string {
  const counts = getDeckCounts(app.state.deckState);
  const handContent =
    app.state.deckState.hand.length > 0
      ? app.state.deckState.hand.map((card) => renderCard(app, card)).join('')
      : '<p>当前没有手牌。</p>';

  return `
    <section class="panel hand-panel" aria-label="手牌区">
      <h2>今日手牌</h2>
      <dl class="compact-stats">
        <div><dt>抽牌堆</dt><dd>${counts.drawCount}</dd></div>
        <div><dt>手牌</dt><dd>${counts.handCount}</dd></div>
        <div><dt>弃牌堆</dt><dd>${counts.discardCount}</dd></div>
        <div><dt>消耗堆</dt><dd>${counts.exhaustCount}</dd></div>
      </dl>
      <div class="item-list">${handContent}</div>
    </section>
  `;
}
