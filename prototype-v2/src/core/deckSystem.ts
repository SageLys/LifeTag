import type { DeckState, GameConfig, CardInstance } from './types';
import { pickWeighted, shuffle, type RngState } from './rng';

function getInitialDeckCardIds(gameConfig: GameConfig): string[] {
  if (
    gameConfig.initialDeckMode === 'fixed_plus_random_packs' &&
    gameConfig.initialDeckFixedCardIds &&
    gameConfig.initialDeckRandomPacks
  ) {
    return [
      ...gameConfig.initialDeckFixedCardIds,
      ...gameConfig.initialDeckRandomPacks.flatMap((pack) =>
        Array.from({ length: Math.max(0, pack.pickCount) }, (_, index) => pack.cardIds[index] ?? pack.cardIds[0]).filter(Boolean),
      ),
    ];
  }

  if (gameConfig.initialDeckCardIds && gameConfig.initialDeckCardIds.length > 0) {
    return [...gameConfig.initialDeckCardIds];
  }

  return gameConfig.initialDeck.flatMap((entry) => Array.from({ length: entry.count }, () => entry.cardId));
}

export function createInitialDeckState(gameConfig: GameConfig, rng?: RngState): DeckState {
  const fixedPlusRandom =
    gameConfig.initialDeckMode === 'fixed_plus_random_packs' &&
    gameConfig.initialDeckFixedCardIds &&
    gameConfig.initialDeckRandomPacks &&
    rng
      ? [
          ...gameConfig.initialDeckFixedCardIds,
          ...gameConfig.initialDeckRandomPacks.flatMap((pack) => {
            const remaining = [...pack.cardIds];
            const picked: string[] = [];
            while (picked.length < Math.max(0, pack.pickCount) && remaining.length > 0) {
              const cardId = pickWeighted(rng, remaining, () => 1);
              picked.push(cardId);
              remaining.splice(remaining.indexOf(cardId), 1);
            }
            return picked;
          }),
        ]
      : getInitialDeckCardIds(gameConfig);

  const drawPile = fixedPlusRandom.map((cardId, index) => {
    const instanceId = `card_inst_${index + 1}`;
    return {
      id: instanceId,
      instanceId,
      cardId,
      cardDefId: cardId,
      upgraded: false,
      createdDay: 1,
    };
  });

  return {
    drawPile: rng ? shuffle(rng, drawPile) : drawPile,
    hand: [],
    discardPile: [],
    exhaustPile: [],
  };
}

export function shuffleDiscardIntoDraw(deckState: DeckState, rng: RngState): void {
  if (deckState.discardPile.length === 0) {
    return;
  }

  deckState.drawPile = shuffle(rng, deckState.discardPile);
  deckState.discardPile = [];
}

export function drawCards(deckState: DeckState, count: number, rng: RngState): CardInstance[] {
  const drawnCards: CardInstance[] = [];
  const drawCount = Math.max(0, count);

  while (drawnCards.length < drawCount) {
    if (deckState.drawPile.length === 0) {
      shuffleDiscardIntoDraw(deckState, rng);
    }

    const card = deckState.drawPile.shift();
    if (!card) {
      break;
    }

    deckState.hand.push(card);
    drawnCards.push(card);
  }

  return drawnCards;
}

export function discardHand(deckState: DeckState): CardInstance[] {
  const discardedCards = [...deckState.hand];
  deckState.discardPile.push(...discardedCards);
  deckState.hand = [];
  return discardedCards;
}

export function moveHandCardToDiscard(deckState: DeckState, cardInstanceId: string): CardInstance | null {
  const cardIndex = deckState.hand.findIndex((card) => card.id === cardInstanceId || card.instanceId === cardInstanceId);
  if (cardIndex < 0) {
    return null;
  }

  const [card] = deckState.hand.splice(cardIndex, 1);
  deckState.discardPile.push(card);
  return card;
}

export function moveHandCardToExhaust(deckState: DeckState, cardInstanceId: string): CardInstance | null {
  const cardIndex = deckState.hand.findIndex((card) => card.id === cardInstanceId || card.instanceId === cardInstanceId);
  if (cardIndex < 0) {
    return null;
  }

  const [card] = deckState.hand.splice(cardIndex, 1);
  deckState.exhaustPile.push(card);
  return card;
}

export function getDeckCounts(deckState: DeckState): {
  drawCount: number;
  handCount: number;
  discardCount: number;
  exhaustCount: number;
} {
  return {
    drawCount: deckState.drawPile.length,
    handCount: deckState.hand.length,
    discardCount: deckState.discardPile.length,
    exhaustCount: deckState.exhaustPile.length,
  };
}
