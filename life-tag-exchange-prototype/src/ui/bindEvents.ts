import {
  buyProduct,
  clearDealSelection,
  confirmSell,
  selectCustomerOrder,
  selectPricingMode,
  selectProduct,
  selectProductCandidate,
} from '../core/actions';
import { advancePhase, returnToProcess } from '../core/dayFlow';
import type { AppRuntime } from '../core/types';
import { renderApp } from './render';

export function bindEvents(app: AppRuntime): void {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) {
    throw new Error('找不到 #app 根节点，无法绑定事件');
  }

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.id === 'advance-phase' || target.id === 'start-new-run') {
      advancePhase(app);
      renderApp(app);
    }

    if (target.id === 'return-to-process') {
      returnToProcess(app);
      renderApp(app);
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'buy-product') {
      if (!target.disabled) {
        buyProduct(app, target.dataset.productId ?? '');
        renderApp(app);
      }
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'select-product') {
      if (!target.disabled) {
        selectProduct(app, target.dataset.productId ?? '');
        renderApp(app);
      }
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'select-customer-order') {
      if (!target.disabled) {
        selectCustomerOrder(app, target.dataset.customerOrderId ?? '');
        renderApp(app);
      }
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'select-pricing-mode') {
      if (!target.disabled) {
        selectPricingMode(app, target.dataset.pricingModeId ?? '');
        renderApp(app);
      }
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'clear-deal-selection') {
      clearDealSelection(app);
      renderApp(app);
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'confirm-sell-placeholder') {
      if (!target.disabled) {
        confirmSell(app);
        renderApp(app);
      }
      return;
    }

    const productCard = target.closest<HTMLElement>('[data-product-id]');
    if (productCard) {
      if (productCard.dataset.productKind === 'inventory') {
        selectProduct(app, productCard.dataset.productId ?? '');
      } else {
        selectProductCandidate(app, productCard.dataset.productId ?? '');
      }
      renderApp(app);
      return;
    }

    const customerCard = target.closest<HTMLElement>('[data-customer-order-id]');
    if (customerCard) {
      selectCustomerOrder(app, customerCard.dataset.customerOrderId ?? '');
      renderApp(app);
    }
  });
}
