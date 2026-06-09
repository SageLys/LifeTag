import type { AppRuntime } from '../core/types';
import { renderDebug } from './renderDebug';
import { renderInfoPanels } from './renderInfoPanels';
import { renderModal } from './renderModal';
import { renderPhaseGuide } from './renderPhaseGuide';
import { renderMainStageContent } from './renderStageContent';
import { renderTopBar } from './renderTopBar';

export function renderApp(app: AppRuntime): void {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) {
    throw new Error('找不到 #app 根节点');
  }

  root.innerHTML = `
    <main class="app-shell" aria-label="AppShell">
      <header class="app-header">
        <div>
          <p class="eyebrow">文字试玩 demo</p>
          <h1>人生标签交易所：牛马肉铺</h1>
          <p class="stage-label">8 天经营闭环：进货、接单、加工、出售、收店。</p>
        </div>
        <span class="status-pill">试玩中</span>
      </header>

      ${renderTopBar(app)}
      ${renderPhaseGuide(app)}

      <div class="main-stage-grid">
        ${renderMainStageContent(app)}
      </div>

      ${renderInfoPanels(app)}
      ${renderModal()}
      ${renderDebug(app)}
    </main>
  `;
}
