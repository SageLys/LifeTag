import type { AppRuntime, MarketEventDef } from '../core/types';
import { escapeHtml } from './formatters';

function renderEvent(event: MarketEventDef): string {
  const effectText = event.effectText ?? '当前阶段仅展示新闻，不结算市场效果。';
  const visibleSummary =
    event.modifiers.length > 0 || event.effects.length > 0
      ? `配置效果：${event.modifiers.length} 个修正，${event.effects.length} 个效果。`
      : '可见效果摘要：P0-3 仅展示新闻，市场修正将在后续阶段生效。';

  return `
    <article class="market-news">
      <h3>${escapeHtml(event.displayName)}</h3>
      <p>${escapeHtml(event.newsText)}</p>
      <p class="hint-text">${escapeHtml(effectText)}</p>
      <p class="hint-text">${escapeHtml(visibleSummary)}</p>
    </article>
  `;
}

export function renderMarket(app: AppRuntime): string {
  const events = app.state.dayState.marketEvents;
  const content =
    events.length > 0
      ? events.map(renderEvent).join('')
      : '<p>今日市场平稳。点击开始新局后会在 DAY_OPENING 生成今日新闻。</p>';

  return `
    <section class="panel market-panel" aria-label="市场新闻">
      <h2>市场新闻</h2>
      ${content}
    </section>
  `;
}
