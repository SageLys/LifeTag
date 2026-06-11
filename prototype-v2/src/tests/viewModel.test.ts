import { describe, it, expect } from 'vitest';
import { createAppRuntime } from '../core/createAppRuntime';
import { toProductCardView, toProductDetailView } from '../ui/viewModels/productViewModel';
import { toCustomerCardView } from '../ui/viewModels/customerViewModel';
import { toMarketEventBriefView } from '../ui/viewModels/marketEventViewModel';
import { toCardHandView } from '../ui/viewModels/cardViewModel';

const FORBIDDEN_KEYS = ['designerNote', 'debugNote', 'ruleText', 'formulaConfig', 'internalName'];

function assertNoForbiddenKeys(obj: object, label: string) {
  const json = JSON.stringify(obj);
  for (const key of FORBIDDEN_KEYS) {
    expect(json, `${label} must not expose "${key}"`).not.toContain(`"${key}"`);
  }
}

describe('viewModel output does not expose raw config fields', () => {
  const app = createAppRuntime();
  const tagsById = app.index.tagsById;

  it('ProductCardView hides forbidden fields', () => {
    const product = app.state.dayState.productCandidates[0];
    if (!product) return;
    const view = toProductCardView(product, tagsById);
    assertNoForbiddenKeys(view, 'ProductCardView');
  });

  it('ProductDetailView hides forbidden fields', () => {
    const product = app.state.dayState.productCandidates[0];
    if (!product) return;
    const view = toProductDetailView(product, tagsById);
    assertNoForbiddenKeys(view, 'ProductDetailView');
  });

  it('CustomerCardView hides forbidden fields', () => {
    const order = app.state.dayState.customerOrders[0];
    if (!order) return;
    const view = toCustomerCardView(order, tagsById);
    assertNoForbiddenKeys(view, 'CustomerCardView');
  });

  it('MarketEventBriefView hides forbidden fields', () => {
    const event = app.configs.marketEvents[0];
    if (!event) return;
    const view = toMarketEventBriefView(event);
    assertNoForbiddenKeys(view, 'MarketEventBriefView');
  });

  it('ProductCardView visibleTags is max 4 entries', () => {
    const product = app.state.dayState.productCandidates[0];
    if (!product) return;
    const view = toProductCardView(product, tagsById);
    expect(view.visibleTags.length).toBeLessThanOrEqual(4);
  });

  it('CustomerCardView preferences is max 3 entries', () => {
    const order = app.state.dayState.customerOrders[0];
    if (!order) return;
    const view = toCustomerCardView(order, tagsById);
    expect(view.preferences.length).toBeLessThanOrEqual(3);
  });

  it('CustomerCardView taboos is max 2 entries', () => {
    const order = app.state.dayState.customerOrders[0];
    if (!order) return;
    const view = toCustomerCardView(order, tagsById);
    expect(view.taboos.length).toBeLessThanOrEqual(2);
  });

  it('MarketEventBriefView summary is max 30 chars', () => {
    for (const event of app.configs.marketEvents) {
      const view = toMarketEventBriefView(event);
      expect(view.summary.length, `summary too long for ${event.id}`).toBeLessThanOrEqual(30);
    }
  });

  it('CardHandView effectSummary is max 28 chars', () => {
    const card = app.configs.cards[0];
    if (!card) return;
    const instance = app.state.deckState.drawPile[0] ?? app.state.deckState.hand[0];
    if (!instance) return;
    const view = toCardHandView(card, instance);
    expect(view.effectSummary.length).toBeLessThanOrEqual(28);
  });
});
