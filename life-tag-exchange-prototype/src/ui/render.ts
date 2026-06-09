import type { AppRuntime } from '../core/types';
import { formatCount, getConfigCounts } from './formatters';
import { renderActions } from './renderActions';
import { renderCustomers } from './renderCustomers';
import { renderDealPreview } from './renderDealPreview';
import { renderHand } from './renderHand';
import { renderLog } from './renderLog';
import { renderMarket } from './renderMarket';
import { renderModal } from './renderModal';
import { renderPhaseGuide } from './renderPhaseGuide';
import { renderPhasePanel } from './renderPanels';
import { renderPricing } from './renderPricing';
import { renderProductDetail } from './renderProductDetail';
import { renderInventoryPanel, renderProducts } from './renderProducts';
import { renderTopBar } from './renderTopBar';

const DEVELOPMENT_STAGE = 'P0-9：基础操作：鉴定、包装、公关、洗标';

export function renderApp(app: AppRuntime): void {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) {
    throw new Error('找不到 #app 根节点');
  }

  const counts = getConfigCounts(app.configs)
    .map(([label, count]) => formatCount(label, count))
    .join('');

  root.innerHTML = `
    <main class="app-shell" aria-label="AppShell">
      <header class="app-header">
        <div>
          <p class="eyebrow">HTML 快速验证原型</p>
          <h1>人生标签交易所：牛马肉铺</h1>
          <p class="stage-label">当前开发阶段：${DEVELOPMENT_STAGE}</p>
        </div>
        <span class="status-pill">配置加载成功</span>
      </header>

      ${renderPhaseGuide(app)}

      <section class="config-summary" aria-label="配置加载摘要区">
        <h2>配置加载摘要</h2>
        <p class="config-status">配置加载成功</p>
        <ul>${counts}</ul>
      </section>

      ${renderTopBar(app)}
      ${renderPhasePanel(app)}

      <section class="panel guardrail-panel" aria-label="当前范围提示区">
        <h2>当前范围提示</h2>
        <p>P0-9 阶段开放基础操作加工商品；仍不开放卡牌效果、确认出售和事故结算。</p>
      </section>

      <div class="workspace-grid">
        ${renderMarket(app)}
        ${renderProducts(app)}
        ${renderInventoryPanel(app)}
        ${renderProductDetail(app)}
        ${renderCustomers(app)}
        ${renderPricing(app)}
        ${renderHand(app)}
        ${renderActions(app)}
        ${renderDealPreview(app)}
        ${renderLog(app)}
      </div>

      ${renderModal()}
    </main>
  `;
}
