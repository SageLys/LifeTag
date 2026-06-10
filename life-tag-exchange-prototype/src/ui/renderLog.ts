import type { AppRuntime } from '../core/types';
import { escapeHtml } from './formatters';
import { getUiState } from './uiState';

const guardrailLogs = [
  '程序启动成功。',
  '配置加载成功。',
  '肉铺柜台已擦干净。',
];

export function renderLog(app: AppRuntime): string {
  const logs = [...guardrailLogs, ...getUiState().logs, ...app.state.runLog].slice(-12).reverse();
  const items = logs.map((log) => `<li>${escapeHtml(log)}</li>`).join('');

  return `
    <section class="panel log-panel art-frame art-frame-log" aria-label="迷你日志">
      <div class="section-title"><h2>最近日志</h2><span>LOG</span></div>
      <ol>${items}</ol>
    </section>
  `;
}
