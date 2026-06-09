import { RunPhase } from '../core/constants';
import { getDeckCounts } from '../core/deckSystem';
import type { AppRuntime } from '../core/types';
import { escapeHtml } from './formatters';
import { renderActions } from './renderActions';
import { renderCustomers } from './renderCustomers';
import { renderDealPreview } from './renderDealPreview';
import { renderDeckPanel } from './renderDeckPanel';
import { renderHand } from './renderHand';
import { renderMarket } from './renderMarket';
import { renderPricing } from './renderPricing';
import { renderProductDetail } from './renderProductDetail';
import { renderInventoryPanel, renderProducts } from './renderProducts';
import { renderReport } from './renderReport';
import { renderResolveSummary } from './renderResolveSummary';
import { renderRewards } from './renderRewards';
import { renderRulesHelpPanel } from './renderRulesHelpPanel';
import { renderShopStatusPanel } from './renderShopStatusPanel';

function renderStartPanel(app: AppRuntime): string {
  return `
    <section class="panel start-panel" aria-label="开始新局">
      <h2>开店准备</h2>
      <p>你要在 ${app.configs.gameConfig.runLengthDays} 天内经营这家肉铺，让累计利润达到 ${app.configs.gameConfig.targetTotalProfit}。</p>
      <p>每天先看新闻、进货、接单、抽牌，然后加工并出售。事故会扣现金和信誉。</p>
      <div class="phase-actions">
        <button id="advance-phase" type="button">开始新局</button>
      </div>
    </section>
  `;
}

function renderMarketSummary(app: AppRuntime): string {
  const events = app.state.dayState.marketEvents;
  const content = events.length > 0
    ? events.map((event) => `<li><strong>${escapeHtml(event.displayName)}</strong>：${escapeHtml(event.effectText ?? event.newsText)}</li>`).join('')
    : '<li>今日市场平稳。</li>';

  return `
    <section class="panel summary-panel" aria-label="市场摘要">
      <h2>市场摘要</h2>
      <ul class="rules-list">${content}</ul>
    </section>
  `;
}

function renderInventorySummary(app: AppRuntime): string {
  const unsold = app.state.inventory.filter((product) => !product.flags.sold && product.status !== 'sold');
  const content = unsold.length > 0
    ? unsold
        .map((product) => `<li>${escapeHtml(product.displayName)}：进价 ${product.cost}，基础价 ${product.basePrice}，新鲜度 ${product.freshnessCurrent}/${product.freshnessMax}</li>`)
        .join('')
    : '<li>暂无库存。</li>';

  return `
    <section class="panel summary-panel" aria-label="库存摘要">
      <h2>库存摘要</h2>
      <p class="hint-text">库存 ${unsold.length} / ${app.configs.gameConfig.inventoryLimit}</p>
      <ul class="rules-list">${content}</ul>
    </section>
  `;
}

function renderDeckSummary(app: AppRuntime): string {
  const counts = getDeckCounts(app.state.deckState);
  return `
    <section class="panel summary-panel" aria-label="牌库摘要">
      <h2>牌库摘要</h2>
      <dl class="compact-stats">
        <div><dt>抽牌堆</dt><dd>${counts.drawCount}</dd></div>
        <div><dt>手牌</dt><dd>${counts.handCount}</dd></div>
        <div><dt>弃牌堆</dt><dd>${counts.discardCount}</dd></div>
        <div><dt>消耗堆</dt><dd>${counts.exhaustCount}</dd></div>
      </dl>
      <p class="hint-text">需要看具体卡牌时，展开下方“牌库 / 店铺状态”。</p>
    </section>
  `;
}

function renderCustomerSummary(app: AppRuntime): string {
  const orders = app.state.dayState.customerOrders;
  const content = orders.length > 0
    ? orders.map((order) => `<li>${escapeHtml(order.displayName)}：预算 ${order.budget}，风险容忍 ${order.riskTolerance}</li>`).join('')
    : '<li>暂无顾客订单。</li>';

  return `
    <section class="panel summary-panel" aria-label="顾客摘要">
      <h2>顾客摘要</h2>
      <ul class="rules-list">${content}</ul>
    </section>
  `;
}

function renderRecentDeals(app: AppRuntime): string {
  const deals = app.state.dealLog.slice(-5).reverse();
  const content = deals.length > 0
    ? deals
        .map((deal) => `<li>第 ${deal.day} 天 ${escapeHtml(deal.productDisplayName)} 卖给 ${escapeHtml(deal.customerDisplayName)}：利润 +${deal.totalProfitGain}，事故 ${escapeHtml(deal.finalAccidentLevel)}</li>`)
        .join('')
    : '<li>暂无成交记录。</li>';

  return `
    <section class="panel summary-panel" aria-label="最近交易记录">
      <h2>最近交易记录</h2>
      <ol>${content}</ol>
    </section>
  `;
}

export function renderMainStageContent(app: AppRuntime): string {
  switch (app.state.phase) {
    case RunPhase.RunInit:
      return `${renderStartPanel(app)}${renderRulesHelpPanel(app)}`;
    case RunPhase.DayOpening:
      return `${renderMarket(app)}${renderInventorySummary(app)}${renderShopStatusPanel(app)}${renderDeckSummary(app)}`;
    case RunPhase.DayPurchase:
      return `${renderMarket(app)}${renderProducts(app)}${renderInventoryPanel(app)}`;
    case RunPhase.DayCustomer:
      return `${renderCustomers(app)}${renderInventoryPanel(app)}${renderMarketSummary(app)}`;
    case RunPhase.DayDraw:
      return `${renderHand(app)}${renderDeckPanel(app)}${renderCustomerSummary(app)}${renderInventorySummary(app)}`;
    case RunPhase.DayProcess:
      return `${renderInventoryPanel(app)}${renderProductDetail(app)}${renderCustomers(app)}${renderPricing(app)}${renderDealPreview(app)}${renderActions(app)}${renderHand(app)}`;
    case RunPhase.DaySell:
      return `${renderInventoryPanel(app)}${renderCustomers(app)}${renderPricing(app)}${renderDealPreview(app)}`;
    case RunPhase.DayResolve:
      return `${renderResolveSummary(app)}${renderRecentDeals(app)}`;
    case RunPhase.DayReward:
      return `${renderRewards(app)}${renderDeckPanel(app)}${renderShopStatusPanel(app)}`;
    case RunPhase.RunEnd:
    case RunPhase.RunFailed:
      return `${renderReport(app)}${renderRecentDeals(app)}`;
    default:
      return renderRulesHelpPanel(app);
  }
}
