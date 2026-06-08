import type { AppRuntime } from '../core/types';

export function renderActions(app: AppRuntime): string {
  return `
    <section class="panel" aria-label="基础操作区">
      <h2>基础操作区</h2>
      <p>已加载 ${app.configs.baseActions.length} 个基础操作。P0-1 阶段仅验证按钮存在和事件绑定，不启用操作效果。</p>
      <button id="start-new-run" type="button">开始新局</button>
      <p class="hint-text">完整新局流程尚未实现；点击按钮只会写入日志。</p>
    </section>
  `;
}
