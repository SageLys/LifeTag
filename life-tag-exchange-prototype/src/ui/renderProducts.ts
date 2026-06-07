import type { AppRuntime } from '../core/types';

export function renderProducts(app: AppRuntime): string {
  return `
    <section class="panel" aria-label="商品区">
      <h2>商品区</h2>
      <p>已加载 ${app.configs.productTemplates.length} 个商品模板。商品生成尚未启用。</p>
    </section>
  `;
}
