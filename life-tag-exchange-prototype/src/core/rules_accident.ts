import { AccidentLevel } from './constants';
import type { BreakdownItem, CalculationContext, GameConfig } from './types';

const FALLBACK_THRESHOLDS = {
  safeMax: 39,
  minorAccidentMax: 59,
  mediumAccidentMax: 79,
  majorAccidentMax: 99,
  severeAccidentMin: 100,
};

const ACCIDENT_LABELS: Record<AccidentLevel, string> = {
  [AccidentLevel.None]: '无事故',
  [AccidentLevel.Minor]: '小事故',
  [AccidentLevel.Medium]: '中事故',
  [AccidentLevel.Major]: '大事故',
  [AccidentLevel.Severe]: '严重事故',
};

const LEVEL_ORDER: AccidentLevel[] = [
  AccidentLevel.None,
  AccidentLevel.Minor,
  AccidentLevel.Medium,
  AccidentLevel.Major,
  AccidentLevel.Severe,
];

const DEFAULT_ACCIDENT_EFFECTS: Record<AccidentLevel, { refundRate: number; fine: number; reputationLoss: number }> = {
  [AccidentLevel.None]: { refundRate: 0, fine: 0, reputationLoss: 0 },
  [AccidentLevel.Minor]: { refundRate: 0.1, fine: 0, reputationLoss: 5 },
  [AccidentLevel.Medium]: { refundRate: 0.3, fine: 0, reputationLoss: 15 },
  [AccidentLevel.Major]: { refundRate: 0.5, fine: 10, reputationLoss: 30 },
  [AccidentLevel.Severe]: { refundRate: 0.8, fine: 30, reputationLoss: 45 },
};

type CompatibleThresholds = Partial<{
  safeMax: number;
  minorAccidentMax: number;
  mediumAccidentMax: number;
  majorAccidentMax: number;
  severeAccidentMin: number;
}> &
  GameConfig['riskThresholds'];

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function breakdownItem(id: string, label: string, value: number | string, sourceType = 'system', sourceId = id): BreakdownItem {
  return {
    id,
    label,
    value,
    sourceType,
    sourceId,
    visibleToPlayer: true,
  };
}

function clampLevelIndex(index: number): number {
  return Math.max(0, Math.min(LEVEL_ORDER.length - 1, index));
}

function shiftLevel(level: AccidentLevel, delta: number): AccidentLevel {
  return LEVEL_ORDER[clampLevelIndex(LEVEL_ORDER.indexOf(level) + delta)];
}

function getThresholds(gameConfig: GameConfig) {
  const thresholds = (gameConfig.riskThresholds ?? {}) as CompatibleThresholds;

  return {
    safeMax: readNumber(thresholds.safeMax, readNumber(thresholds.none?.max, FALLBACK_THRESHOLDS.safeMax)),
    minorAccidentMax: readNumber(thresholds.minorAccidentMax, readNumber(thresholds.minor?.max, FALLBACK_THRESHOLDS.minorAccidentMax)),
    mediumAccidentMax: readNumber(thresholds.mediumAccidentMax, readNumber(thresholds.medium?.max, FALLBACK_THRESHOLDS.mediumAccidentMax)),
    majorAccidentMax: readNumber(thresholds.majorAccidentMax, readNumber(thresholds.major?.max, FALLBACK_THRESHOLDS.majorAccidentMax)),
    severeAccidentMin: readNumber(thresholds.severeAccidentMin, readNumber(thresholds.severe?.min, FALLBACK_THRESHOLDS.severeAccidentMin)),
  };
}

export function getAccidentLevelByRisk(risk: number, gameConfig: GameConfig): AccidentLevel {
  const normalizedRisk = Number.isFinite(risk) ? risk : 0;
  const thresholds = getThresholds(gameConfig);

  if (normalizedRisk <= thresholds.safeMax) {
    return AccidentLevel.None;
  }
  if (normalizedRisk <= thresholds.minorAccidentMax) {
    return AccidentLevel.Minor;
  }
  if (normalizedRisk <= thresholds.mediumAccidentMax) {
    return AccidentLevel.Medium;
  }
  if (normalizedRisk <= thresholds.majorAccidentMax) {
    return AccidentLevel.Major;
  }
  if (normalizedRisk >= thresholds.severeAccidentMin) {
    return AccidentLevel.Severe;
  }

  return AccidentLevel.Severe;
}

export function getAccidentLevelRange(riskMin: number, riskMax: number, gameConfig: GameConfig) {
  const safeMin = Math.max(0, Math.round(Number.isFinite(riskMin) ? riskMin : 0));
  const safeMax = Math.max(safeMin, Math.round(Number.isFinite(riskMax) ? riskMax : safeMin));
  const levelMin = getAccidentLevelByRisk(safeMin, gameConfig);
  const levelMax = getAccidentLevelByRisk(safeMax, gameConfig);
  const isRange = levelMin !== levelMax;

  return {
    levelMin,
    levelMax,
    label: isRange ? `${ACCIDENT_LABELS[levelMin]} ~ ${ACCIDENT_LABELS[levelMax]}` : ACCIDENT_LABELS[levelMin],
    isRange,
  };
}

export function getAccidentLevelLabel(level: AccidentLevel): string {
  return ACCIDENT_LABELS[level] ?? level;
}

export function applyAccidentLevelModifiers(
  context: CalculationContext,
  baseAccidentLevel: AccidentLevel,
): { finalAccidentLevel: AccidentLevel; accidentLevelModifierBreakdown: BreakdownItem[] } {
  const breakdown: BreakdownItem[] = [];
  let finalAccidentLevel = baseAccidentLevel;
  const unresolvedHiddenCount = context.product.hiddenTagIds.filter((tagId) => !context.product.revealedHiddenTagIds.includes(tagId)).length;
  const unresolvedDarkRiskCount = context.product.darkRiskIds.filter((riskId) => {
    const revealLevel = context.product.darkRiskRevealLevels[riskId] as string | undefined;
    return revealLevel !== 'full' && revealLevel !== 'treated' && revealLevel !== 'revealed' && !context.product.revealedDarkRiskIds.includes(riskId);
  }).length;

  breakdown.push(breakdownItem('base_accident_level', `基础事故等级：${getAccidentLevelLabel(baseAccidentLevel)}`, baseAccidentLevel));

  if (context.pricingMode.id === 'pricing_blind_box' && (unresolvedHiddenCount > 0 || unresolvedDarkRiskCount > 0)) {
    finalAccidentLevel = shiftLevel(finalAccidentLevel, 1);
    breakdown.push(
      breakdownItem(
        'pricing_blind_box_accident_level_add',
        '盲盒价结算时存在未揭示信息，事故等级 +1',
        '+1',
        'pricing_mode',
        context.pricingMode.id,
      ),
    );
  }

  breakdown.push(breakdownItem('final_accident_level', `最终事故等级：${getAccidentLevelLabel(finalAccidentLevel)}`, finalAccidentLevel));

  return {
    finalAccidentLevel,
    accidentLevelModifierBreakdown: breakdown,
  };
}

export function calculateAccidentOutcome(
  context: CalculationContext,
  accidentLevel: AccidentLevel,
  finalPrice: number,
): {
  refundRate: number;
  refund: number;
  fine: number;
  reputationLoss: number;
  accidentOutcomeBreakdown: BreakdownItem[];
} {
  const configured = context.indexes.accidentsByLevel.get(accidentLevel);
  const configuredDefaults = (context.configTables.gameConfig as GameConfig & {
    defaultAccidentEffects?: Partial<Record<AccidentLevel, Partial<{ refundRate: number; fine: number; reputationLoss: number }>>>;
  }).defaultAccidentEffects?.[accidentLevel];
  const fallback = DEFAULT_ACCIDENT_EFFECTS[accidentLevel];
  const refundRate = Math.max(0, Math.min(1, readNumber(configured?.refundRate ?? configuredDefaults?.refundRate, fallback.refundRate)));
  const fine = Math.max(0, Math.round(readNumber(configured?.fine ?? configuredDefaults?.fine, fallback.fine)));
  const reputationLoss = Math.max(0, Math.round(readNumber(configured?.reputationLoss ?? configuredDefaults?.reputationLoss, fallback.reputationLoss)));
  const refund = Math.max(0, Math.round(finalPrice * refundRate));
  const accidentOutcomeBreakdown = [
    breakdownItem('refund_rate', '退款比例', refundRate),
    breakdownItem('refund', '退款', refund),
    breakdownItem('fine', '罚款', fine),
    breakdownItem('reputation_loss', '信誉损失', reputationLoss),
  ];

  return {
    refundRate,
    refund,
    fine,
    reputationLoss,
    accidentOutcomeBreakdown,
  };
}
