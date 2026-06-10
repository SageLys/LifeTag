import {
  getInventoryProductById,
  getSelectedCustomerOrder,
  getSelectedPricingMode,
  getSelectedProduct,
} from '../core/selectors';
import { ProductStatus, RunPhase } from '../core/constants';
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
    <div class="receipt-lines">
      <p><span>商品</span><strong>${product ? escapeHtml(product.displayName) : '未选择'}</strong></p>
      <p><span>买家</span><strong>${customerOrder ? escapeHtml(customerOrder.displayName) : '未选择'}</strong></p>
      <p><span>报价</span><strong>${pricingMode ? escapeHtml(pricingMode.displayName) : '未选择'}</strong></p>
    </div>
  `;
}

function getMissingSelections(app: AppRuntime): string[] {
  const missingSelections: string[] = [];
  if (!getSelectedProduct(app)) missingSelections.push('商品');
  if (!getSelectedCustomerOrder(app)) missingSelections.push('买家');
  if (!getSelectedPricingMode(app)) missingSelections.push('报价');
  return missingSelections;
}

function getConfirmSellDisabledReason(app: AppRuntime): string | null {
  if (app.state.phase !== RunPhase.DaySell) {
    return '当前还不是出售确认阶段';
  }
  if (!app.state.dayState.selectedProductId) return '未选择商品';
  const rawProduct = getInventoryProductById(app, app.state.dayState.selectedProductId);
  if (!rawProduct) return '未选择商品';
  if (rawProduct.flags.sold || rawProduct.status === ProductStatus.Sold) return '商品已出售';
  if (rawProduct.status !== ProductStatus.Inventory) return '商品不在库存';
  if (!getSelectedCustomerOrder(app)) return '未选择买家';
  if (!getSelectedPricingMode(app)) return '未选择报价方式';
  const preview = app.state.dayState.currentDealPreview;
  if (!preview) return '交易预览计算失败';
  if (!preview.canConfirmSell) return preview.disabledReason ?? '交易预览计算失败';
  return null;
}

function riskDisplay(app: AppRuntime): string {
  const preview = app.state.dayState.currentDealPreview;
  if (!preview) return '未计算';
  return preview.riskDisplayType === 'exact' ? String(preview.exactRisk ?? preview.riskMin) : `${preview.riskMin}-${preview.riskMax}`;
}

function riskMeter(maxRisk: number): string {
  const clamped = Math.max(0, Math.min(120, maxRisk));
  const percent = Math.min(100, Math.round((clamped / 120) * 100));
  return `
    <div class="risk-meter" aria-label="风险等级">
      <span class="risk-fill" style="width:${percent}%"></span>
      <i style="left:${percent}%"></i>
    </div>
    <div class="risk-labels"><span>安全</span><span>低</span><span>中</span><span>高</span><span>极高</span></div>
  `;
}

function renderActions(app: AppRuntime): string {
  const preview = app.state.dayState.currentDealPreview;
  const missing = getMissingSelections(app);
  const disabledReason = getConfirmSellDisabledReason(app);
  const isSellPhase = app.state.phase === RunPhase.DaySell;
  const canSubmit = Boolean(preview && missing.length === 0);

  if (isSellPhase) {
    return `
      <div class="phase-actions receipt-actions">
        <button type="button" data-action="confirm-sell" ${disabledReason ? 'disabled' : ''}>确认出售</button>
        <button id="return-to-process" class="secondary-button" type="button">再想想</button>
      </div>
      ${disabledReason ? `<p class="disabled-reason">${escapeHtml(disabledReason)}</p>` : ''}
    `;
  }

  return `
    <div class="phase-actions receipt-actions">
      <button id="advance-phase" type="button" ${canSubmit ? '' : 'disabled'}>提交成交单</button>
      <button type="button" data-action="clear-deal-selection" class="secondary-button">清空选择</button>
    </div>
    ${canSubmit ? '' : `<p class="disabled-reason">还需要选择：${escapeHtml(missing.join('、') || '可预览的成交组合')}</p>`}
  `;
}

export function renderDealPreview(app: AppRuntime): string {
  const preview = app.state.dayState.currentDealPreview;

  if (!preview) {
    return `
      <section class="panel deal-preview art-frame art-frame-deal-ticket" aria-label="成交单">
        <div class="section-title"><h2>成交单</h2><span>待填写</span></div>
        ${renderSelectionSummary(app)}
        <p class="hint-text">选择商品、买家与报价后，柜台会自动估算售价、利润与爆雷区间。</p>
        ${renderActions(app)}
      </section>
    `;
  }

  return `
    <section class="panel deal-preview art-frame art-frame-deal-ticket ${preview.riskMax >= 60 ? 'is-risky' : ''}" aria-label="成交单">
      <div class="section-title"><h2>成交单</h2><span>${preview.riskDisplayType === 'exact' ? '风险已知' : '存在未知'}</span></div>
      ${renderSelectionSummary(app)}
      <dl class="receipt-stats">
        <div><dt>预计成交</dt><dd class="number price-value">${preview.estimatedPrice}</dd></div>
        <div><dt>预计利润</dt><dd class="number price-value">${formatSigned(preview.estimatedProfit)}</dd></div>
        <div><dt>爆雷</dt><dd class="number risk-value">${riskDisplay(app)}</dd></div>
        <div><dt>事故预测</dt><dd>${escapeHtml(preview.accidentPreview.label)}</dd></div>
      </dl>
      ${riskMeter(preview.riskMax)}
      ${preview.unknownRiskBreakdown.length > 0 ? '<p class="warning-text">仍有未知标签或暗风险，爆雷只显示区间。</p>' : ''}
      <details class="receipt-details">
        <summary>展开拆解</summary>
        <h3>价格拆解</h3>
        <ul>${renderBreakdown(preview.priceBreakdown)}</ul>
        <h3>已知风险</h3>
        <ul>${renderRiskBreakdown(preview.riskBreakdown)}</ul>
        <h3>未知风险提示</h3>
        <ul>${renderUnknownRiskBreakdown(preview.unknownRiskBreakdown)}</ul>
      </details>
      ${preview.warnings.map((warning) => `<p class="warning-text">${escapeHtml(warning)}</p>`).join('')}
      ${renderActions(app)}
    </section>
  `;
}
