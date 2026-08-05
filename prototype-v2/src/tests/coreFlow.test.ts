import { describe, it, expect, beforeEach } from 'vitest';
import { createAppRuntime } from '../core/createAppRuntime';
import { drawCards } from '../core/deckSystem';
import { createRng } from '../core/rng';
import { finishDayAndStartNextDay } from '../core/dayFlow';
import type { AppRuntime } from '../core/types';

describe('core flow', () => {
  let app: AppRuntime;

  beforeEach(() => {
    app = createAppRuntime();
  });

  it('creates runtime with valid state', () => {
    expect(app.configs).toBeDefined();
    expect(app.index).toBeDefined();
    expect(app.state).toBeDefined();
  });

  it('starts on day 1', () => {
    expect(app.state.currentDay).toBe(1);
  });

  it('has non-empty deck after run start', () => {
    const deck = app.state.deckState;
    const total = deck.drawPile.length + deck.hand.length + deck.discardPile.length;
    expect(total).toBeGreaterThan(0);
  });

  it('drawCards returns requested count when pile is large enough', () => {
    const deck = app.state.deckState;
    const rng = createRng(app.state.rngState);
    const available = deck.drawPile.length;
    if (available >= 3) {
      const drawn = drawCards(deck, 3, rng);
      expect(drawn.length).toBe(3);
    } else {
      const drawn = drawCards(deck, available, rng);
      expect(Array.isArray(drawn)).toBe(true);
    }
  });

  it('has product candidates immediately after run start (no phase advance)', () => {
    expect(app.state.dayState.productCandidates.length).toBeGreaterThan(0);
  });

  it('has customer orders immediately after run start (no phase advance)', () => {
    expect(app.state.dayState.customerOrders.length).toBeGreaterThan(0);
  });

  it('advances to day 2 after finishDayAndStartNextDay (no phase gate)', () => {
    finishDayAndStartNextDay(app);
    expect(app.state.currentDay).toBe(2);
  });

  it('config index maps tags by id', () => {
    const firstTag = app.configs.tags[0];
    const found = app.index.tagsById.get(firstTag.id);
    expect(found).toBe(firstTag);
  });
});
