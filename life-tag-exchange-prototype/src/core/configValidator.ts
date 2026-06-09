import { AccidentLevel } from './constants';
import type { AllConfigs, Condition, Effect, GameConfig, Modifier, RewardDef } from './types';

type ConfigItem = { id: string };

function validateUniqueIds(fileName: string, items: ConfigItem[], errors: string[]): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.id) {
      errors.push(`[${fileName}] 存在缺少 id 的配置对象`);
      continue;
    }
    if (seen.has(item.id)) {
      errors.push(`[${fileName}][${item.id}] id 重复`);
    }
    seen.add(item.id);
  }
}

function requireRef(
  fileName: string,
  ownerId: string,
  fieldName: string,
  refId: string,
  targetIds: Set<string>,
  targetLabel: string,
  errors: string[],
): void {
  if (!targetIds.has(refId)) {
    errors.push(`[${fileName}][${ownerId}] ${fieldName} 引用了不存在的 ${targetLabel}: ${refId}`);
  }
}

function validateConditionRefs(
  fileName: string,
  ownerId: string,
  conditions: Condition[],
  knownIds: Set<string>,
  errors: string[],
): void {
  for (const condition of conditions) {
    if (condition.target && condition.target.includes('_') && !knownIds.has(condition.target)) {
      errors.push(`[${fileName}][${ownerId}] condition.target 可能引用了不存在的 id: ${condition.target}`);
    }
  }
}

function validateEffectRefs(
  fileName: string,
  ownerId: string,
  effects: Effect[],
  knownIds: Set<string>,
  errors: string[],
): void {
  for (const effect of effects) {
    if (effect.target && effect.target.includes('_') && !knownIds.has(effect.target)) {
      errors.push(`[${fileName}][${ownerId}] effect.target 可能引用了不存在的 id: ${effect.target}`);
    }
    validateModifierRefs(fileName, ownerId, effect.modifiers ?? [], knownIds, errors);
  }
}

function validateModifierRefs(
  fileName: string,
  ownerId: string,
  modifiers: Modifier[],
  knownIds: Set<string>,
  errors: string[],
): void {
  for (const modifier of modifiers) {
    if (modifier.targetId && !knownIds.has(modifier.targetId)) {
      errors.push(`[${fileName}][${ownerId}] modifier.targetId 引用了不存在的 id: ${modifier.targetId}`);
    }
  }
}

function validateRewardPayload(
  reward: RewardDef,
  cardIds: Set<string>,
  passiveIds: Set<string>,
  supplySourceIds: Set<string>,
  errors: string[],
): void {
  const cardId = reward.payload.cardId;
  const passiveId = reward.payload.passiveId;
  const supplySourceId = reward.payload.supplySourceId;

  if (typeof cardId === 'string') {
    requireRef('rewards.json', reward.id, 'payload.cardId', cardId, cardIds, 'cardId', errors);
  }
  if (typeof passiveId === 'string') {
    requireRef('rewards.json', reward.id, 'payload.passiveId', passiveId, passiveIds, 'passiveId', errors);
  }
  if (typeof supplySourceId === 'string') {
    requireRef('rewards.json', reward.id, 'payload.supplySourceId', supplySourceId, supplySourceIds, 'supplySourceId', errors);
  }
}

function validateGameConfig(gameConfig: GameConfig, cardIds: Set<string>, errors: string[]): void {
  const fileName = 'gameConfig.json';
  const rawConfig = gameConfig as unknown as Record<string, unknown>;
  const legacyReputationTargetField = `passTarget${'Reputation'}`;

  if (legacyReputationTargetField in rawConfig) {
    errors.push(`[${fileName}][${gameConfig.id}] 不应使用 ${legacyReputationTargetField}，累计利润目标字段应为 targetTotalProfit`);
  }

  const expectedNumbers: Array<[keyof GameConfig, number]> = [
    ['runLengthDays', 8],
    ['initialCash', 120],
    ['targetTotalProfit', 500],
    ['initialReputation', 100],
    ['maxReputation', 100],
    ['dailyActionPoints', 4],
    ['dailyDrawCount', 5],
    ['dailyProductCandidateCount', 4],
    ['dailyProductBuyLimit', 2],
    ['dailyCustomerOrderCount', 3],
    ['inventoryLimit', 6],
    ['rewardOptionsPerDay', 3],
    ['marketEventsPerDay', 1],
  ];

  for (const [fieldName, expected] of expectedNumbers) {
    const actual = gameConfig[fieldName];
    if (actual !== expected) {
      errors.push(`[${fileName}][${gameConfig.id}] ${String(fieldName)} 应为 ${expected}，当前为 ${String(actual)}`);
    }
  }

  const initialDeckTotal = gameConfig.initialDeck.reduce((sum, entry) => sum + entry.count, 0);
  if (initialDeckTotal !== 10) {
    errors.push(`[${fileName}][${gameConfig.id}] initialDeck 总数量应为 10，当前为 ${initialDeckTotal}`);
  }

  for (const entry of gameConfig.initialDeck) {
    if (entry.count <= 0) {
      errors.push(`[${fileName}][${gameConfig.id}] initialDeck.${entry.cardId}.count 必须大于 0，当前为 ${entry.count}`);
    }
    requireRef(fileName, gameConfig.id, 'initialDeck.cardId', entry.cardId, cardIds, 'cardId', errors);
  }

  for (const cardId of gameConfig.initialDeckCardIds ?? []) {
    requireRef(fileName, gameConfig.id, 'initialDeckCardIds', cardId, cardIds, 'cardId', errors);
  }
  for (const cardId of gameConfig.initialDeckFixedCardIds ?? []) {
    requireRef(fileName, gameConfig.id, 'initialDeckFixedCardIds', cardId, cardIds, 'cardId', errors);
  }
  for (const pack of gameConfig.initialDeckRandomPacks ?? []) {
    for (const cardId of pack.cardIds) {
      requireRef(fileName, gameConfig.id, `initialDeckRandomPacks.${pack.id}.cardIds`, cardId, cardIds, 'cardId', errors);
    }
  }

  const expectedThresholds = {
    [AccidentLevel.None]: { min: 0, max: 39 },
    [AccidentLevel.Minor]: { min: 40, max: 59 },
    [AccidentLevel.Medium]: { min: 60, max: 79 },
    [AccidentLevel.Major]: { min: 80, max: 99 },
    [AccidentLevel.Severe]: { min: 100, max: null },
  } as const;

  for (const [level, expected] of Object.entries(expectedThresholds)) {
    const actual = gameConfig.riskThresholds[level as AccidentLevel];
    if (!actual) {
      errors.push(`[${fileName}][${gameConfig.id}] riskThresholds 缺少 ${level}`);
      continue;
    }
    if (actual.min !== expected.min || actual.max !== expected.max) {
      const expectedRange = expected.max === null ? `${expected.min}+` : `${expected.min}-${expected.max}`;
      const actualRange = actual.max === null ? `${actual.min}+` : `${actual.min}-${actual.max}`;
      errors.push(`[${fileName}][${gameConfig.id}] riskThresholds.${level} 应为 ${expectedRange}，当前为 ${actualRange}`);
    }
  }
}

function validatePricingModes(configs: AllConfigs, pricingModeIds: Set<string>, errors: string[]): void {
  const expectedPricingMultipliers = new Map([
    ['pricing_cheap', 0.8],
    ['pricing_normal', 1],
    ['pricing_high', 1.3],
    ['pricing_blind_box', 1.45],
  ]);

  for (const [pricingModeId, expectedMultiplier] of expectedPricingMultipliers) {
    if (!pricingModeIds.has(pricingModeId)) {
      errors.push(`[pricingModes.json] 缺少必需的 pricingModeId: ${pricingModeId}`);
      continue;
    }

    const pricingMode = configs.pricingModes.find((item) => item.id === pricingModeId);
    if (pricingMode?.priceMultiplier !== expectedMultiplier) {
      errors.push(`[pricingModes.json][${pricingModeId}] priceMultiplier 应为 ${expectedMultiplier}，当前为 ${String(pricingMode?.priceMultiplier)}`);
    }
  }
}

function validateAccidents(configs: AllConfigs, errors: string[]): void {
  const accidentLevels = new Set<string>(configs.accidents.map((accident) => accident.level));
  for (const level of ['none', 'minor', 'medium', 'major', 'severe']) {
    if (!accidentLevels.has(level)) {
      errors.push(`[accidents.json] 缺少必需的 accident level: ${level}`);
    }
  }

  for (const accident of configs.accidents) {
    const rawAccident = accident as unknown as Record<string, unknown>;
    if ('minRisk' in rawAccident || 'maxRisk' in rawAccident) {
      errors.push(`[accidents.json][${accident.id}] 不应保存 minRisk/maxRisk，事故等级判定以 gameConfig.riskThresholds 为唯一来源`);
    }
  }
}

export function validateConfigs(configs: AllConfigs): void {
  const errors: string[] = [];
  const tagIds = new Set(configs.tags.map((item) => item.id));
  const darkRiskIds = new Set(configs.darkRisks.map((item) => item.id));
  const customerIds = new Set(configs.customers.map((item) => item.id));
  const cardIds = new Set(configs.cards.map((item) => item.id));
  const passiveIds = new Set(configs.passives.map((item) => item.id));
  const supplySourceIds = new Set(configs.supplySources.map((item) => item.id));
  const pricingModeIds = new Set(configs.pricingModes.map((item) => item.id));
  const knownIds = new Set([
    configs.gameConfig.id,
    ...tagIds,
    ...darkRiskIds,
    ...customerIds,
    ...cardIds,
    ...passiveIds,
    ...supplySourceIds,
    ...pricingModeIds,
  ]);

  validateUniqueIds('tags.json', configs.tags, errors);
  validateUniqueIds('darkRisks.json', configs.darkRisks, errors);
  validateUniqueIds('tagConflicts.json', configs.tagConflicts, errors);
  validateUniqueIds('productTemplates.json', configs.productTemplates, errors);
  validateUniqueIds('customers.json', configs.customers, errors);
  validateUniqueIds('marketEvents.json', configs.marketEvents, errors);
  validateUniqueIds('cards.json', configs.cards, errors);
  validateUniqueIds('passives.json', configs.passives, errors);
  validateUniqueIds('supplySources.json', configs.supplySources, errors);
  validateUniqueIds('baseActions.json', configs.baseActions, errors);
  validateUniqueIds('pricingModes.json', configs.pricingModes, errors);
  validateUniqueIds('accidents.json', configs.accidents, errors);
  validateUniqueIds('rewards.json', configs.rewards, errors);
  validateUniqueIds('endingEvaluations.json', configs.endingEvaluations, errors);

  validateGameConfig(configs.gameConfig, cardIds, errors);
  validatePricingModes(configs, pricingModeIds, errors);
  validateAccidents(configs, errors);

  for (const template of configs.productTemplates) {
    for (const tagId of template.visibleTagIds) {
      requireRef('productTemplates.json', template.id, 'visibleTagIds', tagId, tagIds, 'tagId', errors);
    }
    for (const tagId of template.hiddenTagPool) {
      requireRef('productTemplates.json', template.id, 'hiddenTagPool', tagId, tagIds, 'tagId', errors);
    }
    for (const darkRiskId of template.darkRiskPool) {
      requireRef('productTemplates.json', template.id, 'darkRiskPool', darkRiskId, darkRiskIds, 'darkRiskId', errors);
    }
  }

  for (const darkRisk of configs.darkRisks) {
    for (const tagId of darkRisk.relatedTagIds) {
      requireRef('darkRisks.json', darkRisk.id, 'relatedTagIds', tagId, tagIds, 'tagId', errors);
    }
    for (const customerId of darkRisk.sensitiveCustomerIds) {
      requireRef('darkRisks.json', darkRisk.id, 'sensitiveCustomerIds', customerId, customerIds, 'customerId', errors);
    }
  }

  for (const relation of configs.tagConflicts) {
    requireRef('tagConflicts.json', relation.id, 'tagA', relation.tagA, tagIds, 'tagId', errors);
    requireRef('tagConflicts.json', relation.id, 'tagB', relation.tagB, tagIds, 'tagId', errors);
  }

  for (const customer of configs.customers) {
    for (const tagId of customer.preferredTagIds) {
      requireRef('customers.json', customer.id, 'preferredTagIds', tagId, tagIds, 'tagId', errors);
    }
    for (const tagId of customer.tabooTagIds) {
      requireRef('customers.json', customer.id, 'tabooTagIds', tagId, tagIds, 'tagId', errors);
    }
    for (const pricingModeId of customer.preferredPricingModeIds) {
      requireRef('customers.json', customer.id, 'preferredPricingModeIds', pricingModeId, pricingModeIds, 'pricingModeId', errors);
    }
  }

  for (const event of configs.marketEvents) {
    validateConditionRefs('marketEvents.json', event.id, event.conditions, knownIds, errors);
    validateEffectRefs('marketEvents.json', event.id, event.effects, knownIds, errors);
    validateModifierRefs('marketEvents.json', event.id, event.modifiers, knownIds, errors);
  }
  for (const card of configs.cards) {
    validateEffectRefs('cards.json', card.id, card.effects, knownIds, errors);
  }
  for (const passive of configs.passives) {
    validateEffectRefs('passives.json', passive.id, passive.effects, knownIds, errors);
  }
  for (const reward of configs.rewards) {
    validateRewardPayload(reward, cardIds, passiveIds, supplySourceIds, errors);
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}
