import type { AppRuntime } from '../core/types';
import { formatCount, getConfigCounts } from './formatters';
import { renderActions } from './renderActions';
import { renderCustomers } from './renderCustomers';
import { renderDealPreview } from './renderDealPreview';
import { renderHand } from './renderHand';
import { renderLog } from './renderLog';
import { renderMarket } from './renderMarket';
import { renderModal } from './renderModal';
import { renderProductDetail } from './renderProductDetail';
import { renderProducts } from './renderProducts';
import { renderTopBar } from './renderTopBar';

export function renderApp(app: AppRuntime): void {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) {
    throw new Error('找不到 #app 根节点');
  }

  const counts = getConfigCounts(app.configs)
    .map(([label, count]) => formatCount(label, count))
    .join('');

  root.innerHTML = `
    <main class="app-shell">
      <header class="app-header">
        <div>
          <p class="eyebrow">HTML 快速验证原型</p>
          <h1>人生标签交易所：牛马肉铺</h1>
        </div>
        <span class="status-pill">配置加载成功</span>
      </header>

      <section class="config-summary" aria-label="配置加载结果">
        <h2>配置表数量</h2>
        <ul>${counts}</ul>
      </section>

      ${renderTopBar(app)}

      <div class="workspace-grid">
        ${renderMarket(app)}
        ${renderProducts(app)}
        ${renderProductDetail(app)}
        ${renderCustomers(app)}
        ${renderHand(app)}
        ${renderActions(app)}
        ${renderDealPreview(app)}
        ${renderLog()}
      </div>

      ${renderModal()}
    </main>
  `;
}
