import { buyProduct, selectCustomerOrder, selectProductCandidate } from '../core/actions';
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

    const productCard = target.closest<HTMLElement>('[data-product-id]');
    if (productCard) {
      selectProductCandidate(app, productCard.dataset.productId ?? '');
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
