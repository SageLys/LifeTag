import type { AllConfigs } from '../core/types';

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatCount(label: string, count: number): string {
  return `<li><span>${escapeHtml(label)}</span><strong>${count}</strong></li>`;
}

export function getConfigCounts(configs: AllConfigs): Array<[string, number]> {
  return [
    ['tags.json', configs.tags.length],
    ['darkRisks.json', configs.darkRisks.length],
    ['tagConflicts.json', configs.tagConflicts.length],
    ['productTemplates.json', configs.productTemplates.length],
    ['customers.json', configs.customers.length],
    ['marketEvents.json', configs.marketEvents.length],
    ['cards.json', configs.cards.length],
    ['passives.json', configs.passives.length],
    ['supplySources.json', configs.supplySources.length],
    ['baseActions.json', configs.baseActions.length],
    ['pricingModes.json', configs.pricingModes.length],
    ['accidents.json', configs.accidents.length],
    ['rewardPools.json', configs.rewardPools.length],
    ['endingEvaluations.json', configs.endingEvaluations.length],
  ];
}
