import {
  buyProduct,
  buyPaidReward,
  chooseReward,
  chooseBonus,
  clearDealSelection,
  confirmSell,
  claimMaintenance,
  finishRewardPhase,
  playCard,
  selectCustomerOrder,
  selectPricingMode,
  selectProduct,
  selectProductCandidate,
  skipBonus,
  useBaseAction,
} from '../core/actions';
import {
  applyDebugSeed,
  loadDebugScenario,
  prepareDebugCopy,
  resetDebugSeed,
  setDebugChecklistItem,
  toggleDebugPanel,
  type DebugCopyTarget,
} from '../core/debugActions';
import { advancePhase, returnToProcess } from '../core/dayFlow';
import type { AppRuntime } from '../core/types';
import { renderApp } from './render';
import { closeModal, showDealResult } from './uiState';

export function bindEvents(app: AppRuntime): void {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) {
    throw new Error('找不到 #app 根节点，无法绑定事件');
  }

  root.addEventListener('click', async (event) => {
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

    if (target instanceof HTMLButtonElement && target.dataset.action === 'toggle-debug') {
      toggleDebugPanel(app);
      renderApp(app);
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'apply-debug-seed') {
      const input = document.querySelector<HTMLInputElement>('#debug-seed-input');
      applyDebugSeed(app, input?.value ?? '');
      renderApp(app);
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'reset-debug-seed') {
      resetDebugSeed(app);
      renderApp(app);
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'load-test-scenario') {
      loadDebugScenario(app, target.dataset.scenarioId ?? '');
      renderApp(app);
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'copy-debug-json') {
      const result = prepareDebugCopy(app, (target.dataset.copyTarget ?? 'app_state') as DebugCopyTarget);
      if (result.ok && result.text && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(result.text);
        } catch {
          // The textarea fallback is rendered from debugState when clipboard access is unavailable.
        }
      }
      renderApp(app);
      return;
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

    if (target instanceof HTMLButtonElement && target.dataset.action === 'confirm-sell') {
      if (!target.disabled) {
        const result = confirmSell(app);
        if (result.ok && result.dealResult) {
          showDealResult(result.dealResult);
        }
        renderApp(app);
      }
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'choose-reward') {
      if (!target.disabled) {
        chooseReward(app, target.dataset.rewardInstanceId ?? '', {
          cardInstanceId: target.dataset.cardInstanceId || undefined,
          productId: target.dataset.productId || undefined,
          poolCardId: target.dataset.poolCardId || undefined,
        });
        renderApp(app);
      }
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'claim-maintenance-reward') {
      if (!target.disabled) {
        claimMaintenance(app, target.dataset.rewardInstanceId ?? '', {
          cardInstanceId: target.dataset.cardInstanceId || undefined,
          productId: target.dataset.productId || undefined,
          poolCardId: target.dataset.poolCardId || undefined,
        });
        renderApp(app);
      }
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'buy-paid-reward') {
      if (!target.disabled) {
        buyPaidReward(app, target.dataset.rewardInstanceId ?? '', {
          cardInstanceId: target.dataset.cardInstanceId || undefined,
          productId: target.dataset.productId || undefined,
          poolCardId: target.dataset.poolCardId || undefined,
        });
        renderApp(app);
      }
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'choose-bonus-reward') {
      if (!target.disabled) {
        chooseBonus(app, target.dataset.rewardInstanceId ?? '', {
          cardInstanceId: target.dataset.cardInstanceId || undefined,
          productId: target.dataset.productId || undefined,
          poolCardId: target.dataset.poolCardId || undefined,
        });
        renderApp(app);
      }
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'skip-bonus-reward') {
      if (!target.disabled) {
        skipBonus(app);
        renderApp(app);
      }
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'finish-reward-phase') {
      if (!target.disabled) {
        finishRewardPhase(app);
        renderApp(app);
      }
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'close-modal') {
      closeModal();
      renderApp(app);
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'use-base-action') {
      if (!target.disabled) {
        useBaseAction(app, target.dataset.actionId ?? '', {
          productId: target.dataset.productId || undefined,
        });
        renderApp(app);
      }
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'wash-tag') {
      if (!target.disabled) {
        useBaseAction(app, target.dataset.actionId ?? 'action_wash_tag', {
          productId: target.dataset.productId || undefined,
          tagId: target.dataset.tagId || undefined,
        });
        renderApp(app);
      }
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.action === 'play-card') {
      if (!target.disabled) {
        playCard(app, target.dataset.cardInstanceId ?? '');
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

  root.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (target.dataset.action === 'toggle-debug-check') {
      setDebugChecklistItem(target.dataset.checkId ?? '', target.checked);
      renderApp(app);
    }
  });
}
