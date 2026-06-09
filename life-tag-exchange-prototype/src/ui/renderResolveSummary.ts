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

  return `
    <section class="panel resolve-summary" aria-label="日结摘要">
      <h2>日结摘要</h2>
      ${app.state.dayState.soldProductCount === 0 ? '<p class="warning-text">今日没有出售商品，可能难以达成累计利润目标。</p>' : ''}
      <dl class="compact-stats">
        ${renderStat('今日售出数量', app.state.dayState.soldProductCount)}
        ${renderStat('今日成交总收入', income)}
        ${renderStat('今日事故数量', todayAccidents.length)}
        ${renderStat('今日最大事故', maxAccidentLevel)}
        ${renderStat('今日现金变化', formatSigned(cashDelta))}
        ${renderStat('今日累计利润增加', `+${totalProfitGain}`)}
        ${renderStat('今日信誉变化', formatSigned(reputationDelta))}
        ${renderStat('当前现金', app.state.cash)}
        ${renderStat('累计利润 / 目标', `${app.state.totalProfit} / ${app.state.targetTotalProfit}`)}
        ${renderStat('当前信誉', app.state.reputation)}
        ${renderStat('未售库存数量', unsoldInventory)}
      </dl>
      <div class="phase-actions">
        <button id="advance-phase" type="button">进入收店奖励</button>
      </div>
    </section>
  `;
}
