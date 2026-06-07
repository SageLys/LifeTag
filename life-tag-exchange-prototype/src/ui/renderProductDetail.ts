import type { AppRuntime } from '../core/types';

export function renderProductDetail(app: AppRuntime): string {
  return `
    <section class="panel" aria-label="商品详情">
      <h2>商品详情</h2>
      <p>当前没有选中商品。配置索引中有 ${app.index.productTemplatesById.size} 个可查商品模板。</p>
    </section>
  `;
}
