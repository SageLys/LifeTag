import type { AllConfigs } from './types';

const configFiles = {
  gameConfig: 'gameConfig.json',
  tags: 'tags.json',
  darkRisks: 'darkRisks.json',
  tagConflicts: 'tagConflicts.json',
  productTemplates: 'productTemplates.json',
  customers: 'customers.json',
  marketEvents: 'marketEvents.json',
  cards: 'cards.json',
  passives: 'passives.json',
  supplySources: 'supplySources.json',
  baseActions: 'baseActions.json',
  pricingModes: 'pricingModes.json',
  accidents: 'accidents.json',
  rewards: 'rewards.json',
  endingEvaluations: 'endingEvaluations.json',
} as const;

async function loadJson<T>(fileName: string): Promise<T> {
  const response = await fetch(`/data/${fileName}`);
  if (!response.ok) {
    throw new Error(`[${fileName}] 加载失败: HTTP ${response.status}`);
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new Error(`[${fileName}] JSON 解析失败: ${String(error)}`);
  }
}

export async function loadAllConfigs(): Promise<AllConfigs> {
  const configs = {
    gameConfig: await loadJson<AllConfigs['gameConfig']>(configFiles.gameConfig),
    tags: await loadJson<AllConfigs['tags']>(configFiles.tags),
    darkRisks: await loadJson<AllConfigs['darkRisks']>(configFiles.darkRisks),
    tagConflicts: await loadJson<AllConfigs['tagConflicts']>(configFiles.tagConflicts),
    productTemplates: await loadJson<AllConfigs['productTemplates']>(configFiles.productTemplates),
    customers: await loadJson<AllConfigs['customers']>(configFiles.customers),
    marketEvents: await loadJson<AllConfigs['marketEvents']>(configFiles.marketEvents),
    cards: await loadJson<AllConfigs['cards']>(configFiles.cards),
    passives: await loadJson<AllConfigs['passives']>(configFiles.passives),
    supplySources: await loadJson<AllConfigs['supplySources']>(configFiles.supplySources),
    baseActions: await loadJson<AllConfigs['baseActions']>(configFiles.baseActions),
    pricingModes: await loadJson<AllConfigs['pricingModes']>(configFiles.pricingModes),
    accidents: await loadJson<AllConfigs['accidents']>(configFiles.accidents),
    rewards: await loadJson<AllConfigs['rewards']>(configFiles.rewards),
    endingEvaluations: await loadJson<AllConfigs['endingEvaluations']>(configFiles.endingEvaluations),
  };

  console.info('[configLoader] 配置加载完成', {
    tags: configs.tags.length,
    darkRisks: configs.darkRisks.length,
    products: configs.productTemplates.length,
    cards: configs.cards.length,
    rewards: configs.rewards.length,
  });

  return configs;
}
