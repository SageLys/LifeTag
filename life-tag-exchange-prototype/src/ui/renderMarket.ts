import type { AppRuntime, MarketEventDef } from '../core/types';
import { escapeHtml } from './formatters';

function renderEvent(event: MarketEventDef): string {
  const effectText = event.effectText ?? '这条新闻会影响今天的价格或爆雷。';

  return `
    <article class="market-news">
      <h3>${escapeHtml(event.displayName)}</h3>
      <p>${escapeHtml(event.newsText)}</p>
      <p class="hint-text">${escapeHtml(effectText)}</p>
    </article>
  `;
}

export function renderMarket(app: AppRuntime): string {
  const events = app.state.dayState.marketEvents;
  const content =
    events.length > 0
      ? events.map(renderEvent).join('')
      : '<p class="empty-note">今日市场平稳。开店后会生成市场新闻。</p>';

  return `
    <section class="panel market-panel art-frame art-frame-news" aria-label="今日市场新闻">
      <div class="section-title"><h2>今日市场新闻</h2><span>DAILY NEWS</span></div>
      ${content}
    </section>
  `;
}
