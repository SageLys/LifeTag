import type { AllConfigs } from '../core/types';

import gameConfigJson from './gameConfig.json';
import tagsJson from './tags.json';
import darkRisksJson from './darkRisks.json';
import tagConflictsJson from './tagConflicts.json';
import productTemplatesJson from './productTemplates.json';
import customersJson from './customers.json';
import marketEventsJson from './marketEvents.json';
import cardsJson from './cards.json';
import passivesJson from './passives.json';
import supplySourcesJson from './supplySources.json';
import baseActionsJson from './baseActions.json';
import pricingModesJson from './pricingModes.json';
import accidentsJson from './accidents.json';
import rewardsJson from './rewards.json';
import endingEvaluationsJson from './endingEvaluations.json';

export const ALL_CONFIGS: AllConfigs = {
  gameConfig:       gameConfigJson as AllConfigs['gameConfig'],
  tags:             tagsJson as AllConfigs['tags'],
  darkRisks:        darkRisksJson as AllConfigs['darkRisks'],
  tagConflicts:     tagConflictsJson as AllConfigs['tagConflicts'],
  productTemplates: productTemplatesJson as AllConfigs['productTemplates'],
  customers:        customersJson as unknown as AllConfigs['customers'],
  marketEvents:     marketEventsJson as AllConfigs['marketEvents'],
  cards:            cardsJson as AllConfigs['cards'],
  passives:         passivesJson as AllConfigs['passives'],
  supplySources:    supplySourcesJson as AllConfigs['supplySources'],
  baseActions:      baseActionsJson as AllConfigs['baseActions'],
  pricingModes:     pricingModesJson as AllConfigs['pricingModes'],
  accidents:        accidentsJson as AllConfigs['accidents'],
  rewards:          rewardsJson as AllConfigs['rewards'],
  endingEvaluations: endingEvaluationsJson as AllConfigs['endingEvaluations'],
};

export function getConfigStats() {
  return {
    tags:             ALL_CONFIGS.tags.length,
    darkRisks:        ALL_CONFIGS.darkRisks.length,
    tagConflicts:     ALL_CONFIGS.tagConflicts.length,
    productTemplates: ALL_CONFIGS.productTemplates.length,
    customers:        ALL_CONFIGS.customers.length,
    marketEvents:     ALL_CONFIGS.marketEvents.length,
    cards:            ALL_CONFIGS.cards.length,
    passives:         ALL_CONFIGS.passives.length,
    supplySources:    ALL_CONFIGS.supplySources.length,
    pricingModes:     ALL_CONFIGS.pricingModes.length,
    accidents:        ALL_CONFIGS.accidents.length,
    rewards:          ALL_CONFIGS.rewards.length,
    endingEvaluations: ALL_CONFIGS.endingEvaluations.length,
  };
}
