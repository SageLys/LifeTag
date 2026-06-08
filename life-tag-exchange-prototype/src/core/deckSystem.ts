import type { DeckState, GameConfig, CardInstance } from './types';
import { shuffle, type RngState } from './rng';

function getInitialDeckCardIds(gameConfig: GameConfig): string[] {
  if (gameConfig.initialDeckCardIds && gameConfig.initialDeckCardIds.length > 0) {
    return [...gameConfig.initialDeckCardIds];
  }

  return gameConfig.initialDeck.flatMap((entry) => Array.from({ length: entry.count }, () => entry.cardId));
}

export function createInitialDeckState(gameConfig: GameConfig, rng?: RngState): DeckState {
  const drawPile = getInitialDeckCardIds(gameConfig).map((cardId, index) => {
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
