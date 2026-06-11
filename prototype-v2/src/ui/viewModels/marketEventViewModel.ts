import type { MarketEventDef } from '../../core/types';
import { truncate } from './playerText';

export interface MarketEventBriefView {
  id: string;
  title: string;
  summary: string;       // ≤30 chars
  impactTags: string[];  // max 3
}

function extractImpactTags(event: MarketEventDef): string[] {
  const tags = new Set<string>();
  for (const mod of event.modifiers) {
    const m = mod as unknown as { tagId?: string };
    if (m.tagId) {
      tags.add(m.tagId);
    }
  }
  return [...tags].slice(0, 3);
}

function buildSummary(event: MarketEventDef): string {
  if (event.effectText) return truncate(event.effectText, 30);
  const mods = event.modifiers;
  if (mods.length === 0) return '今日市场平稳';
  const first = mods[0];
  const sign = first.value >= 0 ? '+' : '';
  const statLabel = first.stat === 'price' ? '售价' : '爆雷';
  return `${statLabel} ${sign}${first.value}`;
}

export function toMarketEventBriefView(event: MarketEventDef): MarketEventBriefView {
  return {
    id: event.id,
    title: event.displayName,
    summary: buildSummary(event),
    impactTags: extractImpactTags(event),
  };
}
