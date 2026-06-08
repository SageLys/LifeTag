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

const DEVELOPMENT_STAGE = 'P0-1：可测试开发护栏';

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

      <section class="panel phase-guide" aria-label="PhaseGuideBar">
        <h2>阶段提示</h2>
        <p>当前处于 P0-1 护栏阶段：只验证项目可运行、配置可加载、状态可显示、错误可兜底。</p>
      </section>

      <section class="config-summary" aria-label="配置加载摘要区">
        <h2>配置加载摘要</h2>
        <p class="config-status">配置加载成功</p>
        <ul>${counts}</ul>
      </section>

      ${renderTopBar(app)}

      <section class="panel guardrail-panel" aria-label="当前未实现功能提示区">
        <h2>当前未实现功能提示</h2>
        <p>P0-1 不实现每日流程、商品生成、顾客生成、抽牌、进货、售价、爆雷、事故和奖励系统。</p>
      </section>

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
