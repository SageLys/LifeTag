import { describe, it, expect } from 'vitest';
import { ALL_CONFIGS, getConfigStats } from '../data/index';

describe('data migration coverage', () => {
  const stats = getConfigStats();

  it('has enough tags', () => expect(stats.tags).toBeGreaterThanOrEqual(24));
  it('has enough darkRisks', () => expect(stats.darkRisks).toBeGreaterThanOrEqual(9));
  it('has enough tagConflicts', () => expect(stats.tagConflicts).toBeGreaterThanOrEqual(20));
  it('has enough productTemplates', () => expect(stats.productTemplates).toBeGreaterThanOrEqual(16));
  it('has enough customers', () => expect(stats.customers).toBeGreaterThanOrEqual(6));
  it('has enough marketEvents', () => expect(stats.marketEvents).toBeGreaterThanOrEqual(13));
  it('has enough cards', () => expect(stats.cards).toBeGreaterThanOrEqual(52));
  it('has enough passives', () => expect(stats.passives).toBeGreaterThanOrEqual(16));
  it('has enough supplySources', () => expect(stats.supplySources).toBeGreaterThanOrEqual(9));
  it('has enough pricingModes', () => expect(stats.pricingModes).toBeGreaterThanOrEqual(5));
  it('has enough accidents', () => expect(stats.accidents).toBeGreaterThanOrEqual(5));
  it('has enough rewards', () => expect(stats.rewards).toBeGreaterThanOrEqual(60));
  it('has endingEvaluations', () => expect(stats.endingEvaluations).toBeGreaterThanOrEqual(1));

  it('tags have required fields', () => {
    for (const tag of ALL_CONFIGS.tags) {
      expect(tag.id, `tag missing id`).toBeTruthy();
      expect(tag.displayName, `tag ${tag.id} missing displayName`).toBeTruthy();
    }
  });

  it('darkRisks have category field', () => {
    for (const dr of ALL_CONFIGS.darkRisks) {
      expect(
        ['career_background', 'persona', 'platform'].includes(dr.category),
        `darkRisk ${dr.id} has unexpected category "${dr.category}"`,
      ).toBe(true);
    }
  });

  it('pricingModes have multiplier', () => {
    for (const pm of ALL_CONFIGS.pricingModes) {
      expect(pm.priceMultiplier, `pricingMode ${pm.id} missing multiplier`).toBeDefined();
    }
  });

  it('gameConfig has required fields', () => {
    const gc = ALL_CONFIGS.gameConfig;
    expect(gc.initialCash).toBeDefined();
    expect(gc.initialReputation).toBeDefined();
    expect(gc.runLengthDays).toBeDefined();
  });
});
