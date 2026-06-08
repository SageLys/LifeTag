import type { AppRuntime } from '../core/types';
import { escapeHtml } from './formatters';
import { getUiState } from './uiState';

const guardrailLogs = [
  '程序启动成功。',
  '配置加载成功。',
  '当前阶段：P0-3 每日市场新闻、商品候选、顾客订单生成。',
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
