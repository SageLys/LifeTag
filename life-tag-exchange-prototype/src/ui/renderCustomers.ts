import { RunPhase } from '../core/constants';
import type { AppRuntime, CustomerOrder } from '../core/types';
import { escapeHtml } from './formatters';
import { formatDarkRiskCategories, formatTagNames } from './ui_helpers';

const AVATAR_CLASSES = ['avatar-hr', 'avatar-boss', 'avatar-hunter', 'avatar-state', 'avatar-partner'];

function renderCustomerCard(app: AppRuntime, order: CustomerOrder, index: number): string {
  const canSelect = app.state.phase === RunPhase.DayProcess || app.state.phase === RunPhase.DaySell;
  const isSelected = canSelect && app.state.dayState.selectedCustomerOrderId === order.id;
  const rules = order.specialRules && order.specialRules.length > 0 ? order.specialRules.join('、') : '无';

  return `
    <article class="item-card customer-card art-frame art-frame-customer ${isSelected ? 'is-selected selected' : ''}" ${canSelect ? `data-customer-order-id="${escapeHtml(order.id)}"` : ''}>
      <div class="avatar-art ${AVATAR_CLASSES[index % AVATAR_CLASSES.length]}" aria-hidden="true"></div>
      <h3>${escapeHtml(order.displayName)}</h3>
      ${isSelected ? '<p class="selection-badge">已选买家</p>' : ''}
      <dl class="item-stats">
        <div><dt>预算</dt><dd class="number">${order.budget}</dd></div>
        <div><dt>信誉要求</dt><dd class="number">${order.maxRisk}</dd></div>
        <div><dt>风险容忍</dt><dd class="number">${order.riskTolerance}</dd></div>
        <div><dt>暗风险敏感</dt><dd>${formatDarkRiskCategories(order.darkRiskSensitivity)}</dd></div>
      </dl>
      <p><strong>偏好：</strong>${formatTagNames(app, order.preferredTagIds)}</p>
      <p><strong>忌讳：</strong>${formatTagNames(app, order.tabooTagIds)}</p>
      <p><strong>规则：</strong>${escapeHtml(rules)}</p>
      ${
        canSelect
          ? `<button type="button" data-action="select-customer-order" data-customer-order-id="${escapeHtml(order.id)}">选择买家</button>`
          : '<p class="hint-text">仅供查看，加工阶段再选择买家。</p>'
      }
    </article>
  `;
}

export function renderCustomers(app: AppRuntime): string {
  const orders = app.state.dayState.customerOrders;
  const isPreviewOnly = app.state.phase === RunPhase.DayCustomer;
  const content =
    orders.length > 0
      ? orders.map((order, index) => renderCustomerCard(app, order, index)).join('')
      : '<p class="empty-note">今天还没有顾客把脑袋伸进门缝。</p>';

  return `
    <section class="panel customers-panel art-frame art-frame-panel" aria-label="客户订单">
      <div class="section-title">
        <h2>${isPreviewOnly ? '客户订单预览' : '客户订单'}</h2>
        <span>${isPreviewOnly ? '只看不锁定' : '选择本单买家'}</span>
      </div>
      <div class="item-list customer-grid">${content}</div>
    </section>
  `;
}
