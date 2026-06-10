import { FailReason, RunPhase, RunResult } from '../core/constants';
import type { AppRuntime, RunReport } from '../core/types';
import { escapeHtml } from './formatters';

function renderStat(label: string, value: string | number): string {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value))}</dd></div>`;
}

function getFailReasonLabel(reason: FailReason): string {
  switch (reason) {
    case FailReason.CashBelowZero:
      return '现金低于 0';
    case FailReason.ReputationZero:
      return '信誉归零';
    case FailReason.ProfitTargetNotMet:
      return '累计利润未达标';
    case FailReason.None:
      return '无';
    default:
      return reason;
  }
}

function renderNames(ids: string[], getName: (id: string) => string): string {
  if (ids.length === 0) {
    return '无';
  }
  return ids.map(getName).join('、');
}

function renderTrend(app: AppRuntime): string {
  const byDay = new Map<number, number>();
  for (const deal of app.state.dealLog) {
    byDay.set(deal.day, (byDay.get(deal.day) ?? 0) + deal.totalProfitGain);
  }
  return `
    <div class="profit-trend">
      ${Array.from({ length: app.state.maxDays }, (_, index) => {
        const day = index + 1;
        const value = byDay.get(day) ?? 0;
        const height = Math.max(8, Math.min(100, Math.abs(value)));
        return `<span title="第 ${day} 天：${value}" style="height:${height}px"><b>${value >= 0 ? `+${value}` : value}</b></span>`;
      }).join('')}
    </div>
  `;
}

function renderReportBody(app: AppRuntime, report: RunReport): string {
  const passiveNames = renderNames(report.activePassives, (id) => app.index.passivesById.get(id)?.displayName ?? id);
  const sourceNames = renderNames(report.activeSupplySources, (id) => app.index.supplySourcesById.get(id)?.displayName ?? id);
  const isVictory = report.result === RunResult.Victory || report.result === RunResult.Success;
  const bestDeal = app.state.dealLog.reduce((best, deal) => (!best || deal.singleProfit > best.singleProfit ? deal : best), app.state.dealLog[0] ?? null);

  return `
    <section class="panel report-panel art-frame art-frame-report-board" aria-label="最终报告">
      <div class="section-title"><h2>${isVictory ? '本局胜利' : '本局失败'}</h2><span>${escapeHtml(report.endingTitle)}</span></div>
      <p>${escapeHtml(report.endingText)}</p>
      <dl class="compact-stats report-stats">
        ${renderStat('失败原因', isVictory ? '无' : getFailReasonLabel(report.failReason))}
        ${renderStat('累计利润', `${report.finalTotalProfit} / ${report.targetTotalProfit}`)}
        ${renderStat('最高单笔利润', report.maxSingleProfit)}
        ${renderStat('总事故次数', report.totalAccidents)}
        ${renderStat('现金结余', report.finalCash)}
        ${renderStat('信誉结余', report.finalReputation)}
        ${renderStat('达成天数', `${report.dayReached} / ${app.state.maxDays}`)}
        ${renderStat('总成交数', report.totalDeals)}
        ${renderStat('牌库规模', report.deckSize)}
      </dl>
      <h3>利润走势</h3>
      ${renderTrend(app)}
      ${bestDeal ? `<div class="best-deal"><h3>最佳成交</h3><p>${escapeHtml(bestDeal.productDisplayName)} → ${escapeHtml(bestDeal.customerDisplayName)}，成交价 ${bestDeal.finalPrice}，利润 ${bestDeal.singleProfit}。</p></div>` : ''}
      <div class="report-columns">
        <section><h3>本局构筑 / 获得被动</h3><p>${escapeHtml(passiveNames)}</p></section>
        <section><h3>主要进货来源</h3><p>${escapeHtml(sourceNames)}</p></section>
        <section><h3>主要风险来源</h3><ul>${report.mainRiskSources.map((source) => `<li>${escapeHtml(source)}</li>`).join('') || '<li>无</li>'}</ul></section>
      </div>
      <div class="phase-actions">
        <button id="start-new-run" type="button">再来一局</button>
      </div>
    </section>
  `;
}

export function renderReport(app: AppRuntime): string {
  if (app.state.phase !== RunPhase.RunEnd && app.state.phase !== RunPhase.RunFailed) {
    return '';
  }

  const report = app.state.runReport;
  if (!report) {
    return `
      <section class="panel report-panel art-frame art-frame-report-board" aria-label="最终报告">
        <h2>最终报告生成中断</h2>
        <p class="warning-text">没有找到 RunReport。可以重新开始新局。</p>
        <button id="start-new-run" type="button">返回主界面</button>
      </section>
    `;
  }

  return renderReportBody(app, report);
}
