import type {
  AccidentDef,
  AllConfigs,
  CardDef,
  ConfigIndex,
  ProductTemplate,
} from './types';
import type { AccidentLevel, CardType } from './constants';

type WithId = { id: string };

function mapById<T extends WithId>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function pushToMapList<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const values = map.get(key);
  if (values) {
    values.push(value);
    return;
  }

  map.set(key, [value]);
}

export function makeTagPairKey(tagA: string, tagB: string): string {
  return [tagA, tagB].sort().join('__');
}

export function buildConfigIndex(configs: AllConfigs): ConfigIndex {
  const tagConflictsByPair = new Map<string, (typeof configs.tagConflicts)[number]>();
  for (const conflict of configs.tagConflicts) {
    tagConflictsByPair.set(makeTagPairKey(conflict.tagA, conflict.tagB), conflict);
  }

  const cardsByType = new Map<CardType, CardDef[]>();
  for (const card of configs.cards) {
    pushToMapList(cardsByType, card.cardType, card);
  }

  const productTemplatesByTag = new Map<string, ProductTemplate[]>();
  for (const template of configs.productTemplates) {
    for (const tagId of [...template.visibleTagIds, ...template.hiddenTagPool]) {
      pushToMapList(productTemplatesByTag, tagId, template);
    }
  }

  const accidentsByLevel = new Map<AccidentLevel, AccidentDef>();
  for (const accident of configs.accidents) {
    accidentsByLevel.set(accident.level, accident);
  }

  return {
    tagsById: mapById(configs.tags),
    darkRisksById: mapById(configs.darkRisks),
    tagConflictsById: mapById(configs.tagConflicts),
    productTemplatesById: mapById(configs.productTemplates),
    customersById: mapById(configs.customers),
    marketEventsById: mapById(configs.marketEvents),
    cardsById: mapById(configs.cards),
    passivesById: mapById(configs.passives),
    supplySourcesById: mapById(configs.supplySources),
    baseActionsById: mapById(configs.baseActions),
    pricingModesById: mapById(configs.pricingModes),
    accidentsByLevel,
    rewardPoolsById: mapById(configs.rewardPools),
    endingEvaluationsById: mapById(configs.endingEvaluations),
    tagConflictsByPair,
    cardsByType,
    productTemplatesByTag,
  };
}
