import { RunPhase } from '../core/constants';
import { getDeckCounts } from '../core/deckSystem';
import type { AppRuntime } from '../core/types';
import { escapeHtml } from './formatters';
import { renderActions } from './renderActions';
import { renderCustomers } from './renderCustomers';
import { renderDealPreview } from './renderDealPreview';
import { renderHand } from './renderHand';
import { renderLog } from './renderLog';
import { renderMarket } from './renderMarket';
import { renderPricing } from './renderPricing';
import { renderProductDetail } from './renderProductDetail';
import { renderInventoryPanel, renderProducts } from './renderProducts';
import { renderReport } from './renderReport';
import { renderResolveSummary } from './renderResolveSummary';
import { renderRewards } from './renderRewards';
import { renderShopStatusPanel } from './renderShopStatusPanel';

function screen(className: string, body: string): string {
  return `<section class="game-screen ${className}">${body}</section>`;
}

function column(className: string, body: string): string {
  return `<div class="screen-column ${className}">${body}</div>`;
}

function renderLockedPanel(title: string, subtitle: string): string {
  return `
    <section class="panel locked-panel art-frame art-frame-locked">
      <h2>${escapeHtml(title)}</h2>
      <div class="lock-mark" aria-hidden="true">锁</div>
      <p>${escapeHtml(subtitle)}</p>
    </section>
  `;
}

function renderRunInit(app: AppRuntime): string {
  return screen('screen-title', `
    <div class="title-board art-frame art-frame-report-board">
      <div class="title-kicker">本局目标</div>
      <h2>${app.configs.gameConfig.runLengthDays} 天内把累计利润做到 <span>${app.configs.gameConfig.targetTotalProfit}</span></h2>
      <p>同时守住现金与信誉。看新闻，进货，接单，加工，出售，然后在账本上面对自己。</p>
      <div class="loop-cards" aria-label="核心循环">
        <article><span>1</span><strong>看新闻</strong><small>把握机会</small></article>
        <article><span>2</span><strong>进货</strong><small>控制成本</small></article>
        <article><span>3</span><strong>看订单</strong><small>评估风险</small></article>
        <article><span>4</span><strong>加工</strong><small>提升价值</small></article>
        <article><span>5</span><strong>出售</strong><small>赚取利润</small></article>
      </div>
      <div class="phase-actions title-actions">
        <button id="advance-phase" type="button">开始营业</button>
        <button type="button" class="secondary-button" data-action="toggle-help">规则帮助</button>
        <button type="button" class="secondary-button" data-action="toggle-debug">开发者调试</button>
      </div>
    </div>
    <aside class="panel title-tips art-frame art-frame-panel">
      <div class="section-title"><h2>新手提示</h2><span>NOTICE</span></div>
      <ul class="rules-list">
        <li>每天先看新闻，市场会改变标签价格与风险。</li>
        <li>高价订单可能亏得更快，爆雷由最终爆雷值确定。</li>
        <li>加工可以提高售价，也可能把风险推高。</li>
        <li>利润是目标，现金和信誉是活下去的门槛。</li>
      </ul>
    </aside>
  `);
}

function renderOpening(app: AppRuntime): string {
  return screen('screen-opening three-col', `
    ${column('left-col', `${renderLog(app)}${renderShopStatusPanel(app)}`)}
    ${column('main-col', `${renderMarket(app)}<div class="phase-actions docked-action"><button id="advance-phase" type="button">我知道了，去进货</button></div>`)}
    ${column('right-col', `${renderLockedPanel('库存', '即将解锁')}${renderLockedPanel('顾客订单', '看单阶段可查看')}${renderLockedPanel('成交单', '加工阶段会出现')}`)}
  `);
}

function renderPurchase(app: AppRuntime): string {
  const activeInventory = app.state.inventory.filter((product) => !product.flags.sold).length;
  const isFull = activeInventory >= app.configs.gameConfig.inventoryLimit;
  const reachedLimit = app.state.dayState.boughtProductCount >= app.configs.gameConfig.dailyProductBuyLimit;
  const hasBought = app.state.dayState.boughtProductCount > 0;
  const buttonText = isFull || reachedLimit ? '货已进满，去看订单' : hasBought ? '货已备好，去看订单' : '不进货，直接看订单';
  return screen('screen-purchase three-col', `
    ${column('left-col', `${renderMarket(app)}${renderShopStatusPanel(app)}`)}
    ${column('main-col', `${renderProducts(app)}<div class="phase-actions docked-action"><button id="advance-phase" type="button" data-confirm-no-purchase="true">${buttonText}</button></div>`)}
    ${column('right-col', `${renderInventoryMini(app)}${renderLockedPanel('买家预览', '看单阶段可查看买家')}`)}
  `);
}

function renderInventoryMini(app: AppRuntime): string {
  const count = app.state.inventory.filter((product) => !product.flags.sold).length;
  return `
    <section class="panel art-frame art-frame-panel">
      <div class="section-title"><h2>库存概览</h2><span>${count}/${app.configs.gameConfig.inventoryLimit}</span></div>
      <dl class="compact-stats">
        <div><dt>今日已进货</dt><dd>${app.state.dayState.boughtProductCount}/${app.configs.gameConfig.dailyProductBuyLimit}</dd></div>
        <div><dt>现金</dt><dd>${app.state.cash}</dd></div>
      </dl>
    </section>
  `;
}

function renderCustomer(app: AppRuntime): string {
  return screen('screen-customer three-col', `
    ${column('left-col', `${renderMarket(app)}${renderLog(app)}`)}
    ${column('main-col', `${renderCustomers(app)}<div class="phase-actions docked-action"><button id="advance-phase" type="button">订单看完了，抽今日手牌</button></div>`)}
    ${column('right-col', `${renderInventoryPanel(app)}${renderRulesReminder()}`)}
  `);
}

function renderRulesReminder(): string {
  return `
    <section class="panel art-frame art-frame-panel">
      <div class="section-title"><h2>本日规则与提醒</h2><span>RULES</span></div>
      <ol class="rules-list">
        <li>看单阶段只是预览买家，不会锁定最终交易对象。</li>
        <li>真正的商品、买家、定价选择会在加工阶段完成。</li>
        <li>忌讳标签会推高爆雷，请谨慎匹配。</li>
      </ol>
    </section>
  `;
}

function renderDraw(app: AppRuntime): string {
  const counts = getDeckCounts(app.state.deckState);
  return screen('screen-draw', `
    <div class="draw-backdrop">
      <div class="draw-modal art-frame art-frame-modal">
        <div class="section-title"><h2>今日手牌</h2><span>牌堆剩余 ${counts.drawCount}</span></div>
        <p>今日抽到 ${counts.handCount} 张手牌。看清费用和目标，再进加工台。</p>
        ${renderHand(app)}
        <div class="draw-counts">
          <span>弃牌堆：${counts.discardCount}</span>
          <span>消耗堆：${counts.exhaustCount}</span>
        </div>
        <div class="phase-actions"><button id="advance-phase" type="button">开始加工</button></div>
      </div>
    </div>
  `);
}

function renderProcess(app: AppRuntime): string {
  return screen('screen-process three-col', `
    ${column('left-col', `${renderMarket(app)}${renderShopStatusPanel(app)}${renderLog(app)}`)}
    ${column('main-col', `${renderInventoryPanel(app)}${renderProductDetail(app)}${renderActions(app)}${renderHand(app)}`)}
    ${column('right-col', `${renderCustomers(app)}${renderPricing(app)}${renderDealPreview(app)}<div class="phase-actions docked-action"><button type="button" class="secondary-button" data-action="skip-sale-to-resolve">不卖了，直接日结</button></div>`)}
  `);
}

function renderSell(app: AppRuntime): string {
  const preview = app.state.dayState.currentDealPreview;
  const warning = preview && preview.riskMax >= 60
    ? `<section class="panel danger-callout art-frame art-frame-danger-modal"><h2>高风险交易警告</h2><p>这单可能触发 ${escapeHtml(preview.accidentPreview.label)}。确认出售后无法撤回。</p></section>`
    : '';

  return screen('screen-sell three-col', `
    ${column('left-col', `${renderMarket(app)}${renderLog(app)}`)}
    ${column('main-col', `${warning}${renderDealPreview(app)}`)}
    ${column('right-col', `${renderProductDetail(app)}${renderCustomers(app)}`)}
  `);
}

function renderResolve(app: AppRuntime): string {
  return screen('screen-resolve three-col', `
    ${column('left-col', `${renderMarket(app)}${renderLog(app)}`)}
    ${column('main-col', renderResolveSummary(app))}
    ${column('right-col', renderEvaluationPanel(app))}
  `);
}

function renderEvaluationPanel(app: AppRuntime): string {
  const accidents = app.state.accidentLog.filter((accident) => accident.day === app.state.currentDay).length;
  const grade = app.state.dayState.dailyProfit >= 80 && accidents === 0 ? 'A' : accidents > 0 ? 'C' : 'B';
  return `
    <section class="panel evaluation-panel art-frame art-frame-clipboard">
      <div class="section-title"><h2>今日经营评价</h2><span>${grade}</span></div>
      <p>${accidents > 0 ? '肉卖出去了，后账也追上来了。' : '今天柜台还算体面，明天继续。'}</p>
      <dl class="compact-stats">
        <div><dt>成交表现</dt><dd>${app.state.dayState.soldProductCount}</dd></div>
        <div><dt>利润表现</dt><dd>${app.state.dayState.dailyProfit}</dd></div>
        <div><dt>事故控制</dt><dd>${accidents}</dd></div>
      </dl>
    </section>
  `;
}

function renderReward(app: AppRuntime): string {
  return screen('screen-reward three-col', `
    ${column('left-col', `${renderMarket(app)}${renderShopStatusPanel(app)}${renderLog(app)}`)}
    ${column('main-col wide-col', renderRewards(app))}
    ${column('right-col', renderInventoryMini(app))}
  `);
}

function renderEnd(app: AppRuntime): string {
  return screen('screen-report', renderReport(app));
}

export function renderMainStageContent(app: AppRuntime): string {
  switch (app.state.phase) {
    case RunPhase.RunInit:
      return renderRunInit(app);
    case RunPhase.DayOpening:
      return renderOpening(app);
    case RunPhase.DayPurchase:
      return renderPurchase(app);
    case RunPhase.DayCustomer:
      return renderCustomer(app);
    case RunPhase.DayDraw:
      return renderDraw(app);
    case RunPhase.DayProcess:
      return renderProcess(app);
    case RunPhase.DaySell:
      return renderSell(app);
    case RunPhase.DayResolve:
      return renderResolve(app);
    case RunPhase.DayReward:
      return renderReward(app);
    case RunPhase.RunEnd:
    case RunPhase.RunFailed:
      return renderEnd(app);
    default:
      return renderRunInit(app);
  }
}
