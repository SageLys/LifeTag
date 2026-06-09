import { ProductStatus, RunPhase } from './constants';
import type { AppRuntime, CardDef, CardInstance, CustomerOrder, DeckState, MarketEventDef, PricingModeDef, ProductInstance, TagDef } from './types';

type PreferenceEntry = string | { tagId: string; priceBonus?: number };

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

export function getSelectedProduct(app: AppRuntime): ProductInstance | null {
  const productId = app.state.dayState.selectedProductId;
  if (!productId) {
    return null;
  }

  const product = getInventoryProductById(app, productId);
  if (!product || product.status !== ProductStatus.Inventory || product.flags.sold) {
    return null;
  }

  return product;
}

export function getSelectedCustomerOrder(app: AppRuntime): CustomerOrder | null {
  const orderId = app.state.dayState.selectedCustomerOrderId;
  if (!orderId) {
    return null;
  }

  return app.state.dayState.customerOrders.find((order) => order.id === orderId) ?? null;
}

export function getSelectedPricingMode(app: AppRuntime): PricingModeDef | null {
  const pricingModeId = app.state.dayState.selectedPricingModeId;
  if (!pricingModeId) {
    return null;
  }

  return app.index.pricingModesById.get(pricingModeId) ?? null;
}

export function getInventorySellableProducts(app: AppRuntime): ProductInstance[] {
  return app.state.inventory.filter(
    (product) => product.status === ProductStatus.Inventory && !product.flags.sold,
  );
}

export function getCurrentCustomerOrders(app: AppRuntime): CustomerOrder[] {
  return app.state.dayState.customerOrders;
}

export function hasUnknownProductInfo(product: ProductInstance): boolean {
  const hasHiddenTags = product.hiddenTagIds.some((tagId) => !product.revealedHiddenTagIds.includes(tagId));
  const hasUnknownDarkRisks = product.darkRiskIds.some((riskId) => {
    const revealLevel = product.darkRiskRevealLevels[riskId] as string | undefined;
    return revealLevel !== 'full' && revealLevel !== 'treated' && revealLevel !== 'revealed' && !product.revealedDarkRiskIds.includes(riskId);
  });
  return hasHiddenTags || hasUnknownDarkRisks;
}

export function getActiveMarketEvent(app: AppRuntime): MarketEventDef | null {
  return app.state.dayState.marketEvent ?? app.state.dayState.marketEvents[0] ?? null;
}

export function getTagDef(app: AppRuntime, tagId: string): TagDef | null {
  return app.index.tagsById.get(tagId) ?? null;
}

export function getCustomerPreferredTagIds(customerOrder: CustomerOrder): string[] {
  const compatibleOrder = customerOrder as CustomerOrder & {
    preferredTags?: PreferenceEntry[];
    preferences?: PreferenceEntry[];
    preferenceTags?: PreferenceEntry[];
  };
  const source: PreferenceEntry[] =
    compatibleOrder.preferredTagIds ??
    compatibleOrder.preferredTags ??
    compatibleOrder.preferences ??
    compatibleOrder.preferenceTags ??
    [];

  return source.map((item) => (typeof item === 'string' ? item : item.tagId)).filter(Boolean);
}

export function getCustomerPreferenceBonus(customerOrder: CustomerOrder, tagId: string): number {
  const compatibleOrder = customerOrder as CustomerOrder & {
    preferredTags?: PreferenceEntry[];
    preferences?: PreferenceEntry[];
    preferenceTags?: PreferenceEntry[];
    defaultPreferencePriceBonus?: number;
  };
  const structuredSources = [compatibleOrder.preferredTags, compatibleOrder.preferences, compatibleOrder.preferenceTags];

  for (const source of structuredSources) {
    if (!Array.isArray(source)) {
      continue;
    }
    const match = source.find((entry): entry is { tagId: string; priceBonus?: number } => typeof entry !== 'string' && entry.tagId === tagId);
    if (match && typeof match.priceBonus === 'number') {
      return match.priceBonus;
    }
  }

  return compatibleOrder.defaultPreferencePriceBonus ?? 20;
}

export function getCustomerBudget(customerOrder: CustomerOrder): number {
  const compatibleOrder = customerOrder as CustomerOrder & { maxBudget?: number; baseBudget?: number };
  return compatibleOrder.budget ?? compatibleOrder.maxBudget ?? compatibleOrder.baseBudget ?? 9999;
}

export function getCardDef(app: AppRuntime, cardInstance: CardInstance): CardDef | null {
  return app.index.cardsById.get(cardInstance.cardDefId) ?? app.index.cardsById.get(cardInstance.cardId) ?? null;
}

export function getAllKnownTagIds(product: ProductInstance): string[] {
  return [...new Set([...product.visibleTagIds, ...product.revealedHiddenTagIds, ...product.appliedTagIds].filter(Boolean))];
}

export function getEffectiveKnownTagIds(product: ProductInstance): string[] {
  const compatibleProduct = product as ProductInstance & { temporaryTagIds?: string[]; visibleTemporaryTagIds?: string[] };
  return [
    ...new Set(
      [
        ...product.visibleTagIds,
        ...product.revealedHiddenTagIds,
        ...product.appliedTagIds,
        ...(compatibleProduct.visibleTemporaryTagIds ?? []),
        ...(compatibleProduct.temporaryTagIds ?? []),
      ].filter(Boolean),
    ),
  ];
}

export function getUnrevealedHiddenTagIds(product: ProductInstance): string[] {
  return product.hiddenTagIds.filter((tagId) => !product.revealedHiddenTagIds.includes(tagId));
}

export function getUnresolvedDarkRiskIds(product: ProductInstance): string[] {
  return product.darkRiskIds.filter((riskId) => {
    const revealLevel = product.darkRiskRevealLevels[riskId] as string | undefined;
    return revealLevel !== 'full' && revealLevel !== 'treated' && revealLevel !== 'revealed' && !product.revealedDarkRiskIds.includes(riskId);
  });
}

export function isProductOperable(product: ProductInstance | null | undefined): product is ProductInstance {
  if (!product) {
    return false;
  }
  return (
    (product.status === ProductStatus.Inventory || product.status === ProductStatus.Spoiled || product.flags.inInventory) &&
    product.status !== ProductStatus.Sold &&
    product.status !== ProductStatus.Discarded &&
    !product.flags.sold
  );
}

export function findCardInstanceInHand(deckState: DeckState, cardInstanceId: string): CardInstance | null {
  return deckState.hand.find((card) => card.id === cardInstanceId || card.instanceId === cardInstanceId) ?? null;
}

export function isCardInHand(deckState: DeckState, cardInstanceId: string): boolean {
  return Boolean(findCardInstanceInHand(deckState, cardInstanceId));
}
