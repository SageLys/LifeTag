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

function renderReportBody(app: AppRuntime, report: RunReport): string {
  const passiveNames = renderNames(report.activePassives, (id) => app.index.passivesById.get(id)?.displayName ?? id);
  const sourceNames = renderNames(report.activeSupplySources, (id) => app.index.supplySourcesById.get(id)?.displayName ?? id);
  const isVictory = report.result === RunResult.Victory || report.result === RunResult.Success;

  return `
    <section class="panel report-panel" aria-label="最终报告">
      <h2>${isVictory ? '本局胜利' : '本局失败'}</h2>
      <p class="status-line">${escapeHtml(report.endingTitle)}</p>
      <p>${escapeHtml(report.endingText)}</p>
      <dl class="compact-stats report-stats">
        ${renderStat('失败原因', isVictory ? '无' : getFailReasonLabel(report.failReason))}
        ${renderStat('最终累计利润 / 目标', `${report.finalTotalProfit} / ${report.targetTotalProfit}`)}
        ${renderStat('最终现金', report.finalCash)}
        ${renderStat('最终信誉', report.finalReputation)}
        ${renderStat('总交易次数', report.totalDeals)}
        ${renderStat('总事故次数', report.totalAccidents)}
        ${renderStat('最大事故', report.maxAccidentLevel)}
        ${renderStat('最大单笔利润', report.maxSingleProfit)}
        ${renderStat('牌库规模', report.deckSize)}
      </dl>
      <h3>获得的店铺被动</h3>
      <p>${escapeHtml(passiveNames)}</p>
      <h3>获得的货源倾向</h3>
      <p>${escapeHtml(sourceNames)}</p>
      <h3>主要风险来源</h3>
      <ul>${report.mainRiskSources.map((source) => `<li>${escapeHtml(source)}</li>`).join('')}</ul>
      <div class="phase-actions">
        <button id="start-new-run" type="button">重新开始</button>
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
      <section class="panel report-panel" aria-label="最终报告">
        <h2>最终报告生成中断</h2>
        <p class="warning-text">没有找到 RunReport。可以重新开始新局。</p>
        <button id="start-new-run" type="button">重新开始</button>
      </section>
    `;
  }

  return renderReportBody(app, report);
}
