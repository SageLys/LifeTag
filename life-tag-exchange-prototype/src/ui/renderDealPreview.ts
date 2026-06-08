import {
  getSelectedCustomerOrder,
  getSelectedPricingMode,
  getSelectedProduct,
} from '../core/selectors';
import type { AppRuntime, BreakdownItem } from '../core/types';
import { escapeHtml } from './formatters';

function renderBreakdown(items: BreakdownItem[]): string {
  if (items.length === 0) {
    return '<li>暂无</li>';
  }

  return items
    .map((item) => `<li>${escapeHtml(item.label)}：${escapeHtml(String(item.value))}</li>`)
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
        <div><dt>风险显示</dt><dd>P0-8 实现</dd></div>
      </dl>
      <p class="hint-text">${escapeHtml(preview.accidentPreviewText)}</p>
      <h3>价格拆解</h3>
      <ul>${renderBreakdown(preview.priceBreakdown)}</ul>
      <h3>风险拆解</h3>
      <ul>${renderBreakdown(preview.riskBreakdown)}</ul>
      ${preview.warnings.map((warning) => `<p class="warning-text">${escapeHtml(warning)}</p>`).join('')}
      <div class="phase-actions">
        <button type="button" data-action="confirm-sell-placeholder" disabled>确认出售</button>
        <button type="button" data-action="clear-deal-selection">清空选择</button>
      </div>
      <p class="disabled-reason">${escapeHtml(preview.disabledReason ?? '出售结算将在 P0-11 实现')}</p>
    </section>
  `;
}
