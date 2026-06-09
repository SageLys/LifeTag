import { getDeckCounts } from '../core/deckSystem';
import type { AppRuntime } from '../core/types';
import { renderCardInfo } from './renderCards';

export function renderHand(app: AppRuntime): string {
  const counts = getDeckCounts(app.state.deckState);
  const handContent =
    app.state.deckState.hand.length > 0
      ? app.state.deckState.hand.map((card) => renderCardInfo(app, card, { interactive: true })).join('')
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
