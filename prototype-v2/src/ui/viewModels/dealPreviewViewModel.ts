import type { DealPreview, BreakdownItem, RiskBreakdownItem } from '../../core/types';
import { formatCash, formatRiskRange, accidentLevelText } from './playerText';

export interface DealPreviewView {
  estimatedPrice: string;
  estimatedProfit: string;
  riskDisplay: string;
  accidentPreview: string;
  topPriceSources: string[];   // max 3, player-readable
  topRiskSources: string[];    // max 3, player-readable
  warnings: string[];          // max 3
  canSell: boolean;
  disabledReason: string | null;
}

function topItems(items: BreakdownItem[], maxCount: number): string[] {
  return [...items]
    .filter(i => typeof i.value === 'number' && i.value !== 0)
    .sort((a, b) => Math.abs(Number(b.value)) - Math.abs(Number(a.value)))
    .slice(0, maxCount)
    .map(i => {
      const sign = Number(i.value) >= 0 ? '+' : '';
      return `${i.label} ${sign}${i.value}`;
    });
}

function topRiskItems(items: RiskBreakdownItem[], maxCount: number): string[] {
  return [...items]
    .filter(i => i.value !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, maxCount)
    .map(i => {
      const sign = i.value >= 0 ? '+' : '';
      return `${i.label} ${sign}${i.value}`;
    });
}

export function toDealPreviewView(preview: DealPreview): DealPreviewView {
  const riskDisplay = preview.riskDisplayType === 'exact'
    ? String(preview.exactRisk ?? preview.knownRisk)
    : formatRiskRange(preview.riskMin, preview.riskMax);

  const accText = preview.accidentPreview.isRange
    ? `${accidentLevelText(preview.accidentPreview.levelMin)} ~ ${accidentLevelText(preview.accidentPreview.levelMax)}`
    : accidentLevelText(preview.accidentPreview.levelMin);

  // Only show player-visible price breakdown items
  const playerPriceItems = preview.priceBreakdown.filter(
    i => i.visibleToPlayer !== false && typeof i.value === 'number',
  );
  const playerRiskItems = preview.riskBreakdown.filter(
    i => i.visibleToPlayer !== false,
  );

  return {
    estimatedPrice: formatCash(preview.estimatedPrice),
    estimatedProfit: formatCash(preview.estimatedProfit),
    riskDisplay,
    accidentPreview: accText,
    topPriceSources: topItems(playerPriceItems, 3),
    topRiskSources: topRiskItems(playerRiskItems, 3),
    warnings: preview.warnings.slice(0, 3),
    canSell: preview.canConfirmSell,
    disabledReason: preview.disabledReason,
  };
}
