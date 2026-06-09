import { getBaseActionCost, getBaseActionDisabledReason } from '../core/actions';
import type { AppRuntime } from '../core/types';
import { escapeHtml } from './formatters';

type ActionCard = {
  id: string;
  title: string;
  effect: string;
  buttonLabel: string;
};

const ACTION_CARDS: ActionCard[] = [
  {
    id: 'action_identify',
    title: '鉴定',
    effect: '揭示 1 个隐藏标签',
    buttonLabel: '鉴定',
  },
  {
    id: 'action_package',
    title: '包装',
    effect: '售价 ×1.2，爆雷 +10',
    buttonLabel: '包装',
  },
  {
    id: 'action_pr',
    title: '公关',
    effect: '本商品下一次交易爆雷 -20',
    buttonLabel: '公关',
  },
  {
    id: 'action_wash_tag',
    title: '洗标',
    effect: '压制一个已揭示且可洗标签',
    buttonLabel: '请在商品详情中选择标签洗标',
  },
];

function formatCost(actionPointCost: number, cashCost: number): string {
  const parts = [`${actionPointCost} 行动点`];
  if (cashCost > 0) {
    parts.push(`${cashCost} 现金`);
  }
  return parts.join('，');
}

function renderActionCard(app: AppRuntime, action: ActionCard): string {
  const cost = getBaseActionCost(app, action.id);
  const payload = { productId: app.state.dayState.selectedProductId ?? undefined };
  const disabledReason = action.id === 'action_wash_tag'
    ? '请在商品详情中选择标签洗标。'
    : getBaseActionDisabledReason(app, action.id, payload);

  return `
    <article class="item-card action-card">
      <h3>${escapeHtml(action.title)}</h3>
      <dl class="item-stats">
        <div><dt>成本</dt><dd>${escapeHtml(formatCost(cost.actionPointCost, cost.cashCost))}</dd></div>
        <div><dt>效果</dt><dd>${escapeHtml(action.effect)}</dd></div>
      </dl>
      <button
        type="button"
        data-action="use-base-action"
        data-action-id="${escapeHtml(action.id)}"
        data-product-id="${escapeHtml(app.state.dayState.selectedProductId ?? '')}"
        ${disabledReason ? 'disabled' : ''}
      >${escapeHtml(action.buttonLabel)}</button>
      ${disabledReason ? `<p class="disabled-reason">${escapeHtml(disabledReason)}</p>` : ''}
    </article>
  `;
}

export function renderActions(app: AppRuntime): string {
  return `
    <section class="panel base-actions-panel" aria-label="基础操作区">
      <h2>基础操作</h2>
      <div class="item-list">${ACTION_CARDS.map((action) => renderActionCard(app, action)).join('')}</div>
    </section>
  `;
}
