import type { AppRuntime, CustomerOrder } from '../core/types';
import { escapeHtml } from './formatters';
import { formatDarkRiskCategories, formatTagNames } from './ui_helpers';

function renderCustomerCard(app: AppRuntime, order: CustomerOrder): string {
  const isSelected = app.state.dayState.selectedCustomerOrderId === order.id;
  const rules = order.specialRules && order.specialRules.length > 0 ? order.specialRules.join('；') : '无';

  return `
    <article class="item-card ${isSelected ? 'is-selected' : ''}" data-customer-order-id="${escapeHtml(order.id)}">
      <h3>${escapeHtml(order.displayName)}</h3>
      <dl class="item-stats">
        <div><dt>预算</dt><dd>${order.budget}</dd></div>
        <div><dt>风险容忍</dt><dd>${order.riskTolerance}</dd></div>
      </dl>
      <p><strong>喜欢标签：</strong>${formatTagNames(app, order.preferredTagIds)}</p>
      <p><strong>雷区标签：</strong>${formatTagNames(app, order.tabooTagIds)}</p>
      <p><strong>暗风险敏感类型：</strong>${formatDarkRiskCategories(order.darkRiskSensitivity)}</p>
      <p><strong>特殊规则：</strong>${escapeHtml(rules)}</p>
    </article>
  `;
}

export function renderCustomers(app: AppRuntime): string {
  const orders = app.state.dayState.customerOrders;
  const content =
    orders.length > 0
      ? orders.map((order) => renderCustomerCard(app, order)).join('')
      : '<p>暂无顾客订单。推进到 DAY_CUSTOMER 后生成今日顾客订单。</p>';

  return `
    <section class="panel customers-panel" aria-label="顾客区">
      <h2>顾客订单</h2>
      <p class="hint-text">P0-3 只生成订单与选择高亮，不触发交易预览。</p>
      <div class="item-list">${content}</div>
    </section>
  `;
}
