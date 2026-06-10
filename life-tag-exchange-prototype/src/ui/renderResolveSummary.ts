import { AccidentLevel, RunPhase } from '../core/constants';
import type { AppRuntime } from '../core/types';
import { escapeHtml } from './formatters';

const LEVEL_ORDER: AccidentLevel[] = [
  AccidentLevel.None,
  AccidentLevel.Minor,
  AccidentLevel.Medium,
  AccidentLevel.Major,
  AccidentLevel.Severe,
];

function renderStat(label: string, value: string | number): string {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value))}</dd></div>`;
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

function getMaxLevel(levels: AccidentLevel[]): AccidentLevel {
  return levels.reduce((maxLevel, level) => (LEVEL_ORDER.indexOf(level) > LEVEL_ORDER.indexOf(maxLevel) ? level : maxLevel), AccidentLevel.None);
}

export function renderResolveSummary(app: AppRuntime): string {
  if (app.state.phase !== RunPhase.DayResolve) {
    return '';
  }

  const todayDeals = app.state.dealLog.filter((deal) => deal.day === app.state.currentDay);
  const todayAccidents = app.state.accidentLog.filter((accident) => accident.day === app.state.currentDay);
  const income = todayDeals.reduce((total, deal) => total + deal.finalPrice, 0);
  const cashDelta = todayDeals.reduce((total, deal) => total + deal.cashDelta, 0);
  const totalProfitGain = todayDeals.reduce((total, deal) => total + deal.totalProfitGain, 0);
  const reputationDelta = todayDeals.reduce((total, deal) => total + deal.reputationDelta, 0);
  const unsoldInventory = app.state.inventory.filter((product) => !product.flags.sold && product.status === 'inventory').length;
  const maxAccidentLevel = getMaxLevel(todayAccidents.map((accident) => accident.level));
  const bestDeal = todayDeals.reduce((best, deal) => (!best || deal.singleProfit > best.singleProfit ? deal : best), todayDeals[0] ?? null);

  return `
    <section class="panel resolve-summary art-frame art-frame-ledger" aria-label="今日经营结算">
      <div class="section-title"><h2>今日经营结算</h2><span>第 ${app.state.currentDay} 天</span></div>
      ${app.state.dayState.soldProductCount === 0 ? '<p class="warning-text">今天没有出售商品，利润目标会更难追。</p>' : ''}
      <dl class="compact-stats">
        ${renderStat('今日成交单数', app.state.dayState.soldProductCount)}
        ${renderStat('今日收入', income)}
        ${renderStat('今日利润', `+${totalProfitGain}`)}
        ${renderStat('事故情况', `${todayAccidents.length} 起 / 最高 ${maxAccidentLevel}`)}
        ${renderStat('信誉变化', formatSigned(reputationDelta))}
        ${renderStat('现金变化', formatSigned(cashDelta))}
        ${renderStat('剩余库存', unsoldInventory)}
        ${renderStat('期末现金', app.state.cash)}
        ${renderStat('累计利润 / 目标', `${app.state.totalProfit} / ${app.state.targetTotalProfit}`)}
        ${renderStat('当前信誉', app.state.reputation)}
      </dl>
      <div class="ledger-table">
        <h3>今日售出清单</h3>
        <table>
          <thead><tr><th>商品</th><th>买家</th><th>成交价</th><th>利润</th></tr></thead>
          <tbody>
            ${todayDeals.length > 0 ? todayDeals.map((deal) => `
              <tr><td>${escapeHtml(deal.productDisplayName)}</td><td>${escapeHtml(deal.customerDisplayName)}</td><td>${deal.finalPrice}</td><td>${formatSigned(deal.singleProfit)}</td></tr>
            `).join('') : '<tr><td colspan="4">暂无成交</td></tr>'}
          </tbody>
        </table>
      </div>
      ${bestDeal ? `<p class="hint-text">最佳成交单：${escapeHtml(bestDeal.productDisplayName)} → ${escapeHtml(bestDeal.customerDisplayName)}，利润 ${formatSigned(bestDeal.singleProfit)}。</p>` : ''}
      <div class="phase-actions">
        <button id="advance-phase" type="button">收店</button>
      </div>
    </section>
  `;
}
