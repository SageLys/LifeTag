import type { AppRuntime, MarketEventDef } from '../core/types';
import { escapeHtml } from './formatters';

function renderEvent(event: MarketEventDef): string {
  const effectText = event.effectText ?? '这条新闻会影响今天的价格或爆雷。';
  const hasConfiguredEffects = event.modifiers.length > 0 || event.effects.length > 0;
  const visibleSummary = hasConfiguredEffects
    ? `本条新闻包含 ${event.modifiers.length} 个修正，${event.effects.length} 个效果。`
    : '';

  return `
    <article class="market-news">
      <h3>${escapeHtml(event.displayName)}</h3>
      <p>${escapeHtml(event.newsText)}</p>
      <p class="hint-text">${escapeHtml(effectText)}</p>
      ${visibleSummary ? `<p class="hint-text">${escapeHtml(visibleSummary)}</p>` : ''}
    </article>
  `;
}

export function renderMarket(app: AppRuntime): string {
  const events = app.state.dayState.marketEvents;
  const content =
    events.length > 0
      ? events.map(renderEvent).join('')
      : '<p>今日市场平稳。开始新局后会在开店阶段生成今日新闻。</p>';

  return `
    <section class="panel market-panel" aria-label="市场新闻">
      <h2>市场新闻</h2>
      ${content}
    </section>
  `;
}
