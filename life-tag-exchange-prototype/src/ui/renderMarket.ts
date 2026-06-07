import type { AppRuntime } from '../core/types';

export function renderMarket(app: AppRuntime): string {
  return `
    <section class="panel" aria-label="市场新闻">
      <h2>市场新闻</h2>
      <p>已加载 ${app.configs.marketEvents.length} 条市场新闻。每日新闻抽取将在后续阶段实现。</p>
    </section>
  `;
}
