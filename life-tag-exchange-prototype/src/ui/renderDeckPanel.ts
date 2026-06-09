import { getDeckCounts } from '../core/deckSystem';
import type { AppRuntime, CardInstance } from '../core/types';
import { renderCardInfo } from './renderCards';

function renderPile(app: AppRuntime, title: string, cards: CardInstance[]): string {
  const content = cards.length > 0
    ? `<div class="item-list">${cards.map((card) => renderCardInfo(app, card)).join('')}</div>`
    : '<p class="hint-text">这个牌堆目前为空。</p>';

  return `
    <details class="info-details">
      <summary>${title}（${cards.length}）</summary>
      ${content}
    </details>
  `;
}

export function renderDeckPanel(app: AppRuntime): string {
  const { deckState } = app.state;
  const counts = getDeckCounts(deckState);

  return `
    <section class="panel deck-panel" aria-label="牌库查看">
      <h2>牌库查看</h2>
      <dl class="compact-stats">
        <div><dt>抽牌堆</dt><dd>${counts.drawCount}</dd></div>
        <div><dt>手牌</dt><dd>${counts.handCount}</dd></div>
        <div><dt>弃牌堆</dt><dd>${counts.discardCount}</dd></div>
        <div><dt>消耗堆</dt><dd>${counts.exhaustCount}</dd></div>
      </dl>
      ${renderPile(app, '抽牌堆', deckState.drawPile)}
      ${renderPile(app, '手牌', deckState.hand)}
      ${renderPile(app, '弃牌堆', deckState.discardPile)}
      ${renderPile(app, '消耗堆', deckState.exhaustPile)}
    </section>
  `;
}
