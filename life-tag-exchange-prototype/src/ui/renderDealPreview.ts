import {
  getSelectedCustomerOrder,
  getSelectedPricingMode,
  getSelectedProduct,
} from '../core/selectors';
import type { AppRuntime, BreakdownItem, RiskBreakdownItem, UnknownRiskBreakdownItem } from '../core/types';
import { escapeHtml } from './formatters';

function renderBreakdown(items: BreakdownItem[]): string {
  if (items.length === 0) {
    return '<li>暂无</li>';
  }

  return items.map((item) => `<li>${escapeHtml(item.label)}：${escapeHtml(String(item.value))}</li>`).join('');
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

function renderRiskBreakdown(items: RiskBreakdownItem[]): string {
  if (items.length === 0) {
    return '<li>暂无</li>';
  }

  return items.map((item) => `<li>${escapeHtml(item.label)}：${formatSigned(item.value)}</li>`).join('');
}

function renderUnknownRiskBreakdown(items: UnknownRiskBreakdownItem[]): string {
  if (items.length === 0) {
    return '<li>暂无</li>';
  }

  return items
    .map((item) => `<li>${escapeHtml(item.label)}：${formatSigned(item.riskMin)} ~ ${formatSigned(item.riskMax)}</li>`)
    .join('');
}

function renderSelectionSummary(app: AppRuntime): string {
  const product = getSelectedProduct(app);
  const customerOrder = getSelectedCustomerOrder(app);
  const pricingMode = getSelectedPricingMode(app);

  return `
    <div class="selection-summary">
      <p><strong>商品：</strong>${product ? escapeHtml(product.displayName) : '未选择'}</p>
      <p><strong>顾客：</strong>${customerOrder ? escapeHtml(customerOrder.displayName) : '未选择'}</p>
      <p><strong>定价：</strong>${pricingMode ? escapeHtml(pricingMode.displayName) : '未选择'}</p>
    </div>
  `;
}

function getMissingSelections(app: AppRuntime): string[] {
  const missingSelections: string[] = [];
  if (!getSelectedProduct(app)) {
    missingSelections.push('商品');
  }
  if (!getSelectedCustomerOrder(app)) {
    missingSelections.push('顾客');
  }
  if (!getSelectedPricingMode(app)) {
    missingSelections.push('定价');
  }
  return missingSelections;
}

function renderRiskSummary(app: AppRuntime): string {
  const preview = app.state.dayState.currentDealPreview;
  if (!preview) {
    return '';
  }

  if (preview.riskDisplayType === 'exact') {
    return `
      <div><dt>爆雷显示</dt><dd>精确值</dd></div>
      <div><dt>爆雷值</dt><dd>${preview.exactRisk ?? preview.riskMin}</dd></div>
      <div><dt>已知风险</dt><dd>${preview.knownRisk}</dd></div>
      <div><dt>风险下限</dt><dd>${preview.riskMin}</dd></div>
      <div><dt>风险上限</dt><dd>${preview.riskMax}</dd></div>
      <div><dt>事故预测</dt><dd>${escapeHtml(preview.accidentPreview.label)}</dd></div>
    `;
  }

  return `
    <div><dt>爆雷显示</dt><dd>区间</dd></div>
    <div><dt>爆雷区间</dt><dd>${preview.riskMin}-${preview.riskMax}</dd></div>
    <div><dt>已知风险</dt><dd>${preview.knownRisk}</dd></div>
    <div><dt>风险下限</dt><dd>${preview.riskMin}</dd></div>
    <div><dt>风险上限</dt><dd>${preview.riskMax}</dd></div>
    <div><dt>事故预测</dt><dd>${escapeHtml(preview.accidentPreview.label)}</dd></div>
  `;
}

export function renderDealPreview(app: AppRuntime): string {
  const preview = app.state.dayState.currentDealPreview;
  const missingSelections = getMissingSelections(app);

  if (!preview) {
    return `
      <section class="panel deal-preview" aria-label="交易预览区">
        <h2>交易预览</h2>
        ${renderSelectionSummary(app)}
        <p class="hint-text">请选择：${missingSelections.join('、') || '无'}</p>
        <button type="button" data-action="clear-deal-selection">清空选择</button>
      </section>
    `;
  }

  return `
    <section class="panel deal-preview" aria-label="交易预览区">
      <h2>交易预览</h2>
      ${renderSelectionSummary(app)}
      <dl class="compact-stats">
        <div><dt>预计售价</dt><dd>${preview.estimatedPrice}</dd></div>
        <div><dt>预计利润</dt><dd>${preview.estimatedProfit}</dd></div>
        <div><dt>原始价格</dt><dd>${preview.rawPrice}</dd></div>
        <div><dt>预算前价格</dt><dd>${preview.priceBeforeBudgetCap}</dd></div>
        <div><dt>顾客预算</dt><dd>${preview.effectiveBudget}</dd></div>
        ${renderRiskSummary(app)}
      </dl>
      <h3>价格拆解</h3>
      <ul>${renderBreakdown(preview.priceBreakdown)}</ul>
      <h3>已知风险</h3>
      <ul>${renderRiskBreakdown(preview.riskBreakdown)}</ul>
      <h3>未知风险</h3>
      <ul>${renderUnknownRiskBreakdown(preview.unknownRiskBreakdown)}</ul>
      ${preview.warnings.map((warning) => `<p class="warning-text">${escapeHtml(warning)}</p>`).join('')}
      <div class="phase-actions">
        <button type="button" data-action="confirm-sell-placeholder" disabled>确认出售</button>
        <button type="button" data-action="clear-deal-selection">清空选择</button>
      </div>
      <p class="disabled-reason">${escapeHtml(preview.disabledReason ?? '出售结算将在 P0-11 实现')}</p>
    </section>
  `;
}
