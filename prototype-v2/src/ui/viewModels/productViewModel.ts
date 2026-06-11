import type { ProductInstance, TagDef } from '../../core/types';
import { formatCash, riskLabel } from './playerText';

export interface ProductCardView {
  id: string;
  name: string;
  cost: string;
  visibleTags: string[];       // max 4 display names
  hiddenCount: number;
  darkRiskCount: number;
  statusText: string;
  isSpoiled: boolean;
}

export interface ProductDetailView extends ProductCardView {
  basePrice: string;
  revealedHiddenTags: string[];
  revealedDarkRiskHints: string[];
  allKnownTags: string[];
  riskHint: string;
  freshness: string;
}

export function toProductCardView(
  product: ProductInstance,
  tagsById: Map<string, TagDef>,
): ProductCardView {
  const visibleNames = product.visibleTagIds
    .slice(0, 4)
    .map(id => tagsById.get(id)?.displayName ?? id);

  const hiddenCount = product.hiddenTagIds.filter(
    id => !product.revealedHiddenTagIds.includes(id),
  ).length;

  const isSpoiled = Boolean(product.flags.spoiled);

  return {
    id: product.id,
    name: product.displayName,
    cost: formatCash(product.cost),
    visibleTags: visibleNames,
    hiddenCount,
    darkRiskCount: product.darkRiskIds.filter(
      id => !product.revealedDarkRiskIds.includes(id),
    ).length,
    statusText: isSpoiled ? '已变质' : product.flags.packaged ? '已包装' : '库存',
    isSpoiled,
  };
}

export function toProductDetailView(
  product: ProductInstance,
  tagsById: Map<string, TagDef>,
): ProductDetailView {
  const card = toProductCardView(product, tagsById);
  const revealedHiddenNames = product.revealedHiddenTagIds
    .map(id => tagsById.get(id)?.displayName ?? id);

  const knownIds = [
    ...product.visibleTagIds,
    ...product.revealedHiddenTagIds,
    ...product.appliedTagIds,
  ];
  const allKnownTags = [...new Set(knownIds)].map(id => tagsById.get(id)?.displayName ?? id);

  const revealedDarkRiskHints = product.revealedDarkRiskIds.map(id => {
    const level = product.darkRiskRevealLevels[id];
    return level === 'hinted' ? '（类别已知）暗风险线索' : '（已揭示）暗风险';
  });

  return {
    ...card,
    basePrice: formatCash(product.basePrice),
    revealedHiddenTags: revealedHiddenNames,
    revealedDarkRiskHints,
    allKnownTags,
    riskHint: riskLabel(product.baseRisk),
    freshness: `新鲜度 ${product.freshnessCurrent}`,
  };
}
