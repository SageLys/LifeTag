import type { CustomerOrder, TagDef } from '../../core/types';
import { formatCash, riskLabel } from './playerText';

export interface CustomerCardView {
  id: string;
  name: string;
  budget: string;
  preferences: string[];   // max 3 tag names
  taboos: string[];        // max 2 tag names
  riskTolerance: string;
  riskToleranceLevel: string;
}

export function toCustomerCardView(
  order: CustomerOrder,
  tagsById: Map<string, TagDef>,
): CustomerCardView {
  const pref = order.preferredTagIds
    .slice(0, 3)
    .map(id => tagsById.get(id)?.displayName ?? id);

  const taboo = order.tabooTagIds
    .slice(0, 2)
    .map(id => tagsById.get(id)?.displayName ?? id);

  return {
    id: order.id,
    name: order.displayName,
    budget: formatCash(order.budget),
    preferences: pref,
    taboos: taboo,
    riskTolerance: String(order.riskTolerance),
    riskToleranceLevel: riskLabel(100 - order.riskTolerance),
  };
}
