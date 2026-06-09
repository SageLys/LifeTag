import { AccidentLevel } from '../core/constants';
import type { BreakdownItem, DealResult } from '../core/types';
import { escapeHtml } from './formatters';
import { getUiState } from './uiState';

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

function renderStat(label: string, value: string | number): string {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value))}</dd></div>`;
}

function renderChain(items: BreakdownItem[]): string {
  if (items.length === 0) {
    return '<li>暂无事故链条。</li>';
  }

  return items.map((item) => `<li>${escapeHtml(item.label)}：${escapeHtml(String(item.value))}</li>`).join('');
}

function renderCommonStats(result: DealResult): string {
  return `
    <dl class="compact-stats modal-stats">
      ${renderStat('最终成交收入', `+${result.finalPrice}`)}
      ${renderStat('最终爆雷值', result.finalRisk)}
      ${renderStat('事故等级', result.finalAccidentLevel === AccidentLevel.None ? '无事故' : result.finalAccidentLevel)}
      ${renderStat('现金变化', formatSigned(result.cashDelta))}
      ${renderStat('单笔利润', formatSigned(result.singleProfit))}
      ${renderStat('累计利润增加', `+${result.totalProfitGain}`)}
      ${renderStat('当前现金', result.currentCash)}
    </dl>
  `;
}

function renderSuccess(result: DealResult): string {
  return `
    <div id="modal-root" class="modal-root is-open" aria-live="polite">
      <section class="modal-card" role="dialog" aria-modal="true" aria-label="成交反馈">
        <h2>成交成功</h2>
        <p>${escapeHtml(result.productDisplayName)} 已出售给 ${escapeHtml(result.customerDisplayName)}。</p>
        ${renderCommonStats(result)}
        <dl class="compact-stats modal-stats">
          ${renderStat('事故等级', '无事故')}
          ${renderStat('当前累计利润', result.currentTotalProfit)}
          ${renderStat('当前信誉', result.currentReputation)}
        </dl>
        <button type="button" data-action="close-modal">继续</button>
      </section>
    </div>
  `;
}

function renderAccident(result: DealResult): string {
  const accident = result.accident;
  return `
    <div id="modal-root" class="modal-root is-open" aria-live="polite">
      <section class="modal-card accident-modal" role="dialog" aria-modal="true" aria-label="事故弹窗">
        <h2>${escapeHtml(accident?.title ?? '发生事故')}</h2>
        <p>${escapeHtml(accident?.text ?? '本单发生事故。')}</p>
        <dl class="compact-stats modal-stats">
          ${renderStat('最终成交收入', `+${result.finalPrice}`)}
          ${renderStat('退款', `-${result.refund}`)}
          ${renderStat('罚款', `-${result.fine}`)}
          ${renderStat('信誉损失', `-${result.reputationLoss}`)}
          ${renderStat('现金变化', formatSigned(result.cashDelta))}
          ${renderStat('单笔利润', formatSigned(result.singleProfit))}
          ${renderStat('累计利润增加', `+${result.totalProfitGain}`)}
          ${renderStat('最终爆雷', result.finalRisk)}
          ${renderStat('事故等级', result.finalAccidentLevel)}
        </dl>
        <h3>事故链条</h3>
        <ul class="chain-list">${renderChain(result.accidentChain)}</ul>
        <button type="button" data-action="close-modal">继续</button>
      </section>
    </div>
  `;
}

export function renderModal(): string {
  const result = getUiState().activeDealResult;
  if (!result) {
    return '<div id="modal-root" class="modal-root" aria-live="polite"></div>';
  }

  return result.finalAccidentLevel === AccidentLevel.None ? renderSuccess(result) : renderAccident(result);
}
