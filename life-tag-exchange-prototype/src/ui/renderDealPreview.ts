import type { AppRuntime } from '../core/types';

export function renderDealPreview(app: AppRuntime): string {
  return `
    <section class="panel" aria-label="交易预览区">
      <h2>交易预览区</h2>
      <p>已加载 ${app.configs.pricingModes.length} 种定价方式。售价和爆雷预览尚未启用。</p>
    </section>
  `;
}
