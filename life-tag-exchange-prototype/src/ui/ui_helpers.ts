import { DarkRiskRevealLevel } from '../core/constants';
import type { AppRuntime, ProductInstance } from '../core/types';
import { escapeHtml } from './formatters';

const DARK_RISK_CATEGORY_LABELS: Record<string, string> = {
  career_background: '履历',
  persona: '人设',
  platform: '平台',
};

export function formatTagNames(app: AppRuntime, tagIds: string[]): string {
  if (tagIds.length === 0) {
    return '无';
  }

  return tagIds.map((tagId) => escapeHtml(app.index.tagsById.get(tagId)?.displayName ?? tagId)).join('、');
}

export function formatHiddenTagPlaceholders(product: ProductInstance): string {
  if (product.hiddenTagIds.length === 0) {
    return '无';
  }

  return product.hiddenTagIds
    .map((tagId) => (product.revealedHiddenTagIds.includes(tagId) ? '[已揭示]' : '[?]'))
    .join(' ');
}

export function formatDarkRiskHint(app: AppRuntime, product: ProductInstance): string {
  if (product.darkRiskIds.length === 0) {
    return '无';
  }

  const fullRevealedNames = product.darkRiskIds
    .filter((riskId) => {
      const revealLevel = product.darkRiskRevealLevels[riskId] as string | undefined;
      return revealLevel === 'full' || revealLevel === DarkRiskRevealLevel.Revealed || product.revealedDarkRiskIds.includes(riskId);
    })
    .map((riskId) => app.index.darkRisksById.get(riskId)?.displayName)
    .filter((name): name is string => Boolean(name));

  const revealedCategories = product.darkRiskIds
    .filter((riskId) => {
      const revealLevel = product.darkRiskRevealLevels[riskId] as string | undefined;
      return revealLevel === DarkRiskRevealLevel.Hinted || revealLevel === 'category';
    })
    .map((riskId) => app.index.darkRisksById.get(riskId)?.category)
    .filter((category) => Boolean(category))
    .map((category) => String(category));

  const parts = [
    ...fullRevealedNames.map((name) => `已揭示：${name}`),
    ...[...new Set(revealedCategories)].map((category) => `可能存在${DARK_RISK_CATEGORY_LABELS[category] ?? category}类暗风险`),
  ];

  if (parts.length === 0) {
    return '可能存在未揭示暗风险';
  }

  return parts.join('、');
}

export function formatDarkRiskCategories(categories: string[]): string {
  if (categories.length === 0) {
    return '无';
  }

  return categories.map((category) => escapeHtml(DARK_RISK_CATEGORY_LABELS[category] ?? category)).join('、');
}

export function formatProductStatus(product: ProductInstance): string {
  if (product.flags.sold || product.status === 'sold') {
    return '已售出';
  }

  if (product.flags.spoiled) {
    return '库存中（已变质）';
  }

  if (product.flags.inInventory || product.status === 'inventory') {
    return '库存中';
  }

  if (product.status === 'candidate') {
    return '候选';
  }

  return product.status;
}
