import { getDeckCounts } from '../core/deckSystem';
import type { AppRuntime } from '../core/types';
import { renderCardInfo } from './renderCards';

export function renderHand(app: AppRuntime): string {
  const counts = getDeckCounts(app.state.deckState);
  const handContent =
    app.state.deckState.hand.length > 0
      ? app.state.deckState.hand.map((card) => renderCardInfo(app, card, { interactive: true })).join('')
      : '<p class="empty-note">当前没有手牌。</p>';

  return `
    <section class="panel hand-panel art-frame art-frame-panel" aria-label="今日手牌">
      <div class="section-title">
        <h2>今日手牌</h2>
        <span>牌堆 ${counts.drawCount} / 弃牌 ${counts.discardCount}</span>
      </div>
      <div class="item-list hand-grid">${handContent}</div>
    </section>
  `;
}
