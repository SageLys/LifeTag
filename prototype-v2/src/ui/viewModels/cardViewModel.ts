import type { CardDef, CardInstance } from '../../core/types';
import { truncate } from './playerText';

export interface CardHandView {
  instanceId: string;
  cardId: string;
  name: string;
  costText: string;   // e.g. "1 AP  ¥10"
  effectSummary: string; // ≤28 chars
  upgraded: boolean;
}

function getEffectSummary(card: CardDef, upgraded: boolean): string {
  const effects = upgraded && card.upgradedEffects ? card.upgradedEffects : card.effects;
  if (card.effectText) return truncate(card.effectText, 28);
  if (effects.length === 0) return '（效果待实现）';
  const first = effects[0];
  return truncate(first.displayText ?? first.type, 28);
}

function getCostText(card: CardDef, instance: CardInstance): string {
  const apCost = instance.upgraded
    ? (card.upgradedActionPointCost ?? card.actionPointCost ?? card.apCost ?? 1)
    : (card.actionPointCost ?? card.apCost ?? 1);
  const cashCost = instance.upgraded
    ? (card.upgradedCashCost ?? card.cashCost ?? 0)
    : (card.cashCost ?? 0);
  const parts: string[] = [`${apCost} AP`];
  if (cashCost > 0) parts.push(`¥${cashCost}`);
  return parts.join('  ');
}

export function toCardHandView(card: CardDef, instance: CardInstance): CardHandView {
  return {
    instanceId: instance.instanceId ?? instance.id,
    cardId: card.id,
    name: card.displayName,
    costText: getCostText(card, instance),
    effectSummary: getEffectSummary(card, instance.upgraded),
    upgraded: instance.upgraded,
  };
}
