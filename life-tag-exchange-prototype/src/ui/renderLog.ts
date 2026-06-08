import type { AppRuntime } from '../core/types';
import { escapeHtml } from './formatters';
import { getUiState } from './uiState';

const guardrailLogs = [
  '程序启动成功。',
  '配置加载成功。',
  '当前阶段：P0-4 进货与库存系统。',
];

export function renderLog(app: AppRuntime): string {
  const logs = [...guardrailLogs, ...getUiState().logs, ...app.state.runLog];
  const items = logs.map((log) => `<li>${escapeHtml(log)}</li>`).join('');

  return `
    <section class="panel log-panel" aria-label="日志区">
      <h2>日志区</h2>
      <ol>${items}</ol>
    </section>
  `;
}
