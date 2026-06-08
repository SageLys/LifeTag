import { ProductStatus, RunPhase } from './constants';
import type { AppRuntime, ProductInstance } from './types';

export function getProductCandidateById(app: AppRuntime, productId: string): ProductInstance | undefined {
  return app.state.dayState.productCandidates.find((product) => product.id === productId);
}

export function getInventoryProductById(app: AppRuntime, productId: string): ProductInstance | undefined {
  return app.state.inventory.find((product) => product.id === productId);
}

export function getInventoryCount(app: AppRuntime): number {
  return app.state.inventory.filter(
    (product) => product.status !== ProductStatus.Sold && product.status !== ProductStatus.Discarded,
  ).length;
}

export function isProductInInventory(app: AppRuntime, productId: string): boolean {
  return Boolean(getInventoryProductById(app, productId));
}

export function getBuyProductDisabledReason(app: AppRuntime, product: ProductInstance | undefined): string | null {
  if (app.state.dayState.phase !== RunPhase.DayPurchase) {
    return '只能在进货阶段买入';
  }

  if (!product) {
    return '商品不存在';
  }

  if (isProductInInventory(app, product.id) || product.flags.inInventory) {
    return '已买入';
  }

  if (product.status !== ProductStatus.Candidate) {
    return '商品状态不可买入';
  }

  if (app.state.cash < product.cost) {
    return '现金不足';
  }

  if (app.state.dayState.boughtProductCount >= app.configs.gameConfig.dailyProductBuyLimit) {
    return '今日进货已达上限';
  }

  if (getInventoryCount(app) >= app.configs.gameConfig.inventoryLimit) {
    return '库存已满';
  }

  return null;
}
