import { escapeHtml } from './formatters';
import { getUiState } from './uiState';

export function renderLog(): string {
  const items = getUiState().logs.map((log) => `<li>${escapeHtml(log)}</li>`).join('');
  return `
    <section class="panel log-panel" aria-label="日志区">
      <h2>日志区</h2>
      <ol>${items}</ol>
    </section>
  `;
}
