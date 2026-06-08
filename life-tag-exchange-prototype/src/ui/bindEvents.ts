import type { AppRuntime } from '../core/types';
import { renderApp } from './render';
import { appendUiLog } from './uiState';

export function bindEvents(app: AppRuntime): void {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) {
    throw new Error('找不到 #app 根节点，无法绑定事件');
  }

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.id === 'start-new-run') {
      appendUiLog('P0-1 阶段尚未实现完整新局流程。');
      renderApp(app);
    }
  });
}
