import { getBaseActionCost, getBaseActionDisabledReason } from '../core/actions';
import type { AppRuntime } from '../core/types';
import { escapeHtml } from './formatters';

type ActionCard = {
  id: string;
  title: string;
  effect: string;
  icon: string;
};

const ACTION_CARDS: ActionCard[] = [
  { id: 'action_identify', title: '鉴定', effect: '揭示 1 个隐藏标签', icon: 'icon-inspect' },
  { id: 'action_package', title: '包装', effect: '提高售价，同时增加爆雷', icon: 'icon-package' },
  { id: 'action_pr', title: '公关', effect: '降低本商品下一次交易爆雷', icon: 'icon-pr' },
  { id: 'action_wash_tag', title: '洗标', effect: '在商品详情里压制已揭示且可洗标签', icon: 'icon-wash' },
];

function formatCost(actionPointCost: number, cashCost: number): string {
  const parts = [`${actionPointCost} AP`];
  if (cashCost > 0) {
    parts.push(`${cashCost} 现金`);
  }
  return parts.join(' / ');
}

function renderActionCard(app: AppRuntime, action: ActionCard): string {
  const cost = getBaseActionCost(app, action.id);
  const payload = { productId: app.state.dayState.selectedProductId ?? undefined };
  const disabledReason = action.id === 'action_wash_tag'
    ? '请在商品详情中选择标签洗标'
    : getBaseActionDisabledReason(app, action.id, payload);

  return `
    <article class="tool-button item-card">
      <span class="atlas-icon ${action.icon}" aria-hidden="true"></span>
      <h3>${escapeHtml(action.title)}</h3>
      <p>${escapeHtml(action.effect)}</p>
      <small>${escapeHtml(formatCost(cost.actionPointCost, cost.cashCost))}</small>
      <button
        type="button"
        data-action="use-base-action"
        data-action-id="${escapeHtml(action.id)}"
        data-product-id="${escapeHtml(app.state.dayState.selectedProductId ?? '')}"
        ${disabledReason ? 'disabled' : ''}
      >执行</button>
      ${disabledReason ? `<p class="disabled-reason">${escapeHtml(disabledReason)}</p>` : ''}
    </article>
  `;
}

export function renderActions(app: AppRuntime): string {
  return `
    <section class="panel base-actions-panel art-frame art-frame-panel" aria-label="加工工具">
      <div class="section-title"><h2>加工工具</h2><span>消耗行动点</span></div>
      <div class="tool-grid">${ACTION_CARDS.map((action) => renderActionCard(app, action)).join('')}</div>
    </section>
  `;
}
