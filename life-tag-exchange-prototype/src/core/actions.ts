import { ProductStatus } from './constants';
import { getBuyProductDisabledReason, getProductCandidateById } from './selectors';
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

export function selectCustomerOrder(app: AppRuntime, orderId: string): void {
  const order = app.state.dayState.customerOrders.find((customerOrder) => customerOrder.id === orderId);
  if (!order) {
    app.state.runLog.push(`非法选择：找不到顾客订单 ${orderId}。`);
    return;
  }

  app.state.dayState.selectedCustomerOrderId = orderId;
  app.state.dayState.selectedCustomerId = order.customerId;
  app.state.dayState.currentDealPreview = null;
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
