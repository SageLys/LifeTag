import type { AppRuntime } from '../core/types';

export function renderActions(app: AppRuntime): string {
  return `
    <section class="panel" aria-label="基础操作区">
      <h2>基础操作区</h2>
      <p>已加载 ${app.configs.baseActions.length} 个基础操作。操作效果尚未启用。</p>
      <button id="start-new-run" type="button">开始新局</button>
    </section>
  `;
}
