import { ProductStatus, RunPhase } from './constants';
import { refreshDealPreviewIfPossible } from './rules_deal';
import {
  getBuyProductDisabledReason,
  getInventoryProductById,
  getProductCandidateById,
  hasUnknownProductInfo,
} from './selectors';
import type { AppRuntime } from './types';

export interface ActionResult {
  ok: boolean;
  reason?: string;
  message: string;
}

export function selectProductCandidate(app: AppRuntime, productId: string): void {
  const exists = app.state.dayState.productCandidates.some((product) => product.id === productId);
  if (!exists) {
    app.state.runLog.push(`非法选择：找不到商品候选 ${productId}。`);
    return;
  }

  app.state.dayState.selectedProductId = productId;
  app.state.dayState.currentDealPreview = null;
}

function addActionLog(app: AppRuntime, message: string): void {
  app.state.runLog.push(message);
  app.state.dayState.log.push(message);
}

function canSelectForDeal(app: AppRuntime): boolean {
  return app.state.phase === RunPhase.DayProcess || app.state.phase === RunPhase.DaySell;
}

export function selectProduct(app: AppRuntime, productId: string): ActionResult {
  if (!canSelectForDeal(app)) {
    return {
      ok: false,
      reason: 'invalid_phase',
      message: '只能在处理阶段或出售阶段选择交易商品。',
    };
  }

  const product = getInventoryProductById(app, productId);
  if (!product) {
    return {
      ok: false,
      reason: 'not_found',
      message: '找不到库存商品。',
    };
  }

  if (product.status !== ProductStatus.Inventory || product.flags.sold) {
    return {
      ok: false,
      reason: 'not_sellable',
      message: '该商品当前不可用于交易。',
    };
  }

  app.state.dayState.selectedProductId = product.id;
  refreshDealPreviewIfPossible(app);
  addActionLog(app, `选择商品：${product.displayName}`);

  return {
    ok: true,
    message: '已选择商品',
  };
}

export function selectCustomerOrder(app: AppRuntime, orderId: string): void {
  const order = app.state.dayState.customerOrders.find((customerOrder) => customerOrder.id === orderId);
  if (!order) {
    addActionLog(app, `非法选择：找不到顾客订单 ${orderId}。`);
    return;
  }

  app.state.dayState.selectedCustomerOrderId = orderId;
  app.state.dayState.selectedCustomerId = order.customerId;
  refreshDealPreviewIfPossible(app);
  addActionLog(app, `选择顾客：${order.displayName}`);
}

export function selectPricingMode(app: AppRuntime, pricingModeId: string): ActionResult {
  if (!canSelectForDeal(app)) {
    return {
      ok: false,
      reason: 'invalid_phase',
      message: '只能在处理阶段或出售阶段选择定价方式。',
    };
  }

  const pricingMode = app.index.pricingModesById.get(pricingModeId);
  if (!pricingMode) {
    return {
      ok: false,
      reason: 'not_found',
      message: '找不到定价方式。',
    };
  }

  const selectedProduct = getInventoryProductById(app, app.state.dayState.selectedProductId ?? '');
  if (pricingMode.id === 'pricing_blind_box') {
    if (!selectedProduct) {
      return {
        ok: false,
        reason: 'missing_product',
        message: '请选择商品后判断是否可用。',
      };
    }

    if (!hasUnknownProductInfo(selectedProduct)) {
      return {
        ok: false,
        reason: 'no_unknown_info',
        message: '该商品没有未知信息，不能使用盲盒价。',
      };
    }
  }

  app.state.dayState.selectedPricingModeId = pricingMode.id;
  refreshDealPreviewIfPossible(app);
  addActionLog(app, `选择定价方式：${pricingMode.displayName}`);

  return {
    ok: true,
    message: '已选择定价方式',
  };
}

export function clearDealSelection(app: AppRuntime): ActionResult {
  app.state.dayState.selectedProductId = null;
  app.state.dayState.selectedCustomerOrderId = null;
  app.state.dayState.selectedCustomerId = null;
  app.state.dayState.selectedPricingModeId = null;
  app.state.dayState.currentDealPreview = null;
  addActionLog(app, '清空交易选择。');

  return {
    ok: true,
    message: '已清空交易选择',
  };
}

export function confirmSell(app: AppRuntime): ActionResult {
  void app;
  return {
    ok: false,
    reason: 'not_implemented',
    message: '出售结算将在 P0-11 实现。',
  };
}

export function buyProduct(app: AppRuntime, productId: string): ActionResult {
  const product = getProductCandidateById(app, productId);
  const disabledReason = getBuyProductDisabledReason(app, product);

  if (disabledReason || !product) {
    const message = disabledReason ?? '商品不存在';
    app.state.runLog.push(`[第 ${app.state.currentDay} 天][${app.state.phase}] 买入失败：${message}。`);
    app.state.dayState.log.push(`[第 ${app.state.currentDay} 天][${app.state.phase}] 买入失败：${message}。`);
    return {
      ok: false,
      reason: message,
      message,
    };
  }

  app.state.cash -= product.cost;
  product.status = ProductStatus.Inventory;
  product.flags.inInventory = true;
  app.state.inventory.push(product);
  app.state.dayState.boughtProductCount += 1;
  app.state.dayState.selectedProductId = product.id;

  const message = `买入「${product.displayName}」，花费 ${product.cost} 现金。`;
  app.state.runLog.push(`[第 ${app.state.currentDay} 天][DAY_PURCHASE] ${message}`);
  app.state.dayState.log.push(`[第 ${app.state.currentDay} 天][DAY_PURCHASE] ${message}`);

  return {
    ok: true,
    message: '买入成功',
  };
}
