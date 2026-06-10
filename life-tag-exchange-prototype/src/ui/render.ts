import type { AppRuntime } from '../core/types';
import { renderDebug } from './renderDebug';
import { renderModal } from './renderModal';
import { renderPhaseGuide } from './renderPhaseGuide';
import { renderMainStageContent } from './renderStageContent';
import { renderDeckDetailPage, renderShopRewardsDetailPage } from './renderShopStatusPanel';
import { renderTopBar } from './renderTopBar';
import { getUiState } from './uiState';

function renderHeaderChrome(): string {
  return `
    <header class="header-chrome">
      <div class="logo-stamp" aria-hidden="true"></div>
      <div class="title-block">
        <h1>人生标签交易所：<span>牛马肉铺</span></h1>
        <p>有人贴标签，有人被明码标价。今天你卖的，是肉，还是人生？</p>
      </div>
      <div class="hanging-sign" aria-hidden="true">
        <span>不同出处</span>
        <strong>只看标签</strong>
      </div>
      <div class="hook-chain" aria-hidden="true"></div>
    </header>
  `;
}

function renderScreenContent(app: AppRuntime): string {
  switch (getUiState().currentView) {
    case 'deck_detail':
      return renderDeckDetailPage(app);
    case 'shop_rewards_detail':
      return renderShopRewardsDetailPage(app);
    default:
      return renderMainStageContent(app);
  }
}

export function renderApp(app: AppRuntime): void {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) {
    throw new Error('找不到 #app 根节点');
  }

  root.innerHTML = `
    <main class="app-shell" aria-label="人生标签交易所：牛马肉铺">
      ${renderHeaderChrome()}
      ${renderTopBar(app)}
      ${renderPhaseGuide(app)}
      ${renderScreenContent(app)}
      ${renderModal()}
      ${renderDebug(app)}
    </main>
  `;
}
