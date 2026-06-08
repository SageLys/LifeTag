import type { AppRuntime } from './types';

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
