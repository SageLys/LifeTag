import type { AppRuntime } from '../core/types';

export function renderCustomers(app: AppRuntime): string {
  return `
    <section class="panel" aria-label="顾客区">
      <h2>顾客区</h2>
      <p>已加载 ${app.configs.customers.length} 类顾客。每日顾客生成尚未启用。</p>
    </section>
  `;
}
