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
  [AccidentLevel.Medium]: { refundRate: 0.25, fine: 0, reputationLoss: 12 },
  [AccidentLevel.Major]: { refundRate: 0.5, fine: 0, reputationLoss: 30 },
  [AccidentLevel.Severe]: { refundRate: 1, fine: 35, reputationLoss: 50 },
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

function minLevel(level: AccidentLevel, min: AccidentLevel): AccidentLevel {
  return LEVEL_ORDER[Math.max(LEVEL_ORDER.indexOf(level), LEVEL_ORDER.indexOf(min))];
}

function maxLevel(level: AccidentLevel, max: AccidentLevel): AccidentLevel {
  return LEVEL_ORDER[Math.min(LEVEL_ORDER.indexOf(level), LEVEL_ORDER.indexOf(max))];
}

function dealModifiers(context: CalculationContext) {
  return [
    ...(context.product.productModifiers ?? []),
    ...(context.product.dealModifiers ?? []),
    ...context.dayState.temporaryDayModifiers,
    ...(context.dayState.temporaryDealModifiers ?? []),
  ].filter((modifier) => !modifier.targetId || modifier.targetId === context.product.id);
}

function modifierAccidentLevelMatches(modifier: ReturnType<typeof dealModifiers>[number], level: AccidentLevel): boolean {
  const condition = modifier.condition as { type?: string; accidentLevel?: AccidentLevel; params?: { accidentLevel?: AccidentLevel; accidentLevels?: AccidentLevel[] } } | undefined;
  if (!condition) return true;
  if (condition.type === 'accident_level_is') return (condition.accidentLevel ?? condition.params?.accidentLevel) === level;
  if (condition.params?.accidentLevels) return condition.params.accidentLevels.includes(level);
  return true;
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

  if (context.pricingMode.id === 'pricing_clearance' && LEVEL_ORDER.indexOf(finalAccidentLevel) > LEVEL_ORDER.indexOf(AccidentLevel.Medium)) {
    const before = finalAccidentLevel;
    finalAccidentLevel = AccidentLevel.Medium;
    breakdown.push(breakdownItem('pricing_clearance_accident_cap', `清仓卖：${getAccidentLevelLabel(before)} → ${getAccidentLevelLabel(finalAccidentLevel)}`, '最高中事故', 'pricing_mode', context.pricingMode.id));
  }

  if (
    context.activePassives.some((passive) => passive.passiveId === 'passive_public_opinion_stoploss') &&
    !context.dayState.phaseFlags.passivePublicOpinionStoplossUsed &&
    (finalAccidentLevel === AccidentLevel.Major || finalAccidentLevel === AccidentLevel.Severe)
  ) {
    const before = finalAccidentLevel;
    finalAccidentLevel = shiftLevel(finalAccidentLevel, -1);
    context.dayState.phaseFlags.passivePublicOpinionStoplossUsed = true;
    breakdown.push(breakdownItem('passive_public_opinion_stoploss', `舆论止损预案：${getAccidentLevelLabel(before)} → ${getAccidentLevelLabel(finalAccidentLevel)}`, -1, 'passive', 'passive_public_opinion_stoploss'));
  }

  for (const modifier of dealModifiers(context).filter((item) => item.stat === 'accidentLevel' && modifierAccidentLevelMatches(item, finalAccidentLevel))) {
    const before = finalAccidentLevel;
    if (modifier.op === 'add') finalAccidentLevel = shiftLevel(finalAccidentLevel, modifier.value);
    if ((modifier as typeof modifier & { min?: AccidentLevel }).min) finalAccidentLevel = minLevel(finalAccidentLevel, (modifier as typeof modifier & { min: AccidentLevel }).min);
    if ((modifier as typeof modifier & { max?: AccidentLevel }).max) finalAccidentLevel = maxLevel(finalAccidentLevel, (modifier as typeof modifier & { max: AccidentLevel }).max);
    breakdown.push(breakdownItem(`modifier_accident_level_${modifier.sourceId ?? breakdown.length}`, `${modifier.displayText ?? '事故等级修正'}：${getAccidentLevelLabel(before)} → ${getAccidentLevelLabel(finalAccidentLevel)}`, modifier.value, modifier.sourceType ?? 'modifier', modifier.sourceId ?? 'unknown'));
  }

  for (const insurance of [...context.runState.temporaryInsurances]) {
    if (insurance.remainingUses <= 0 || finalAccidentLevel === AccidentLevel.None) continue;
    const raw = insurance.config;
    const modifiers = Array.isArray(raw.modifiers) ? raw.modifiers : [];
    const levelModifier = modifiers.find((item) => item && typeof item === 'object' && (item as { stat?: string }).stat === 'accidentLevel') as
      | { op?: string; value?: number; min?: AccidentLevel }
      | undefined;
    if (!levelModifier || typeof levelModifier.value !== 'number') continue;
    const before = finalAccidentLevel;
    if (levelModifier.op === 'add') finalAccidentLevel = shiftLevel(finalAccidentLevel, levelModifier.value);
    if (levelModifier.min) finalAccidentLevel = minLevel(finalAccidentLevel, levelModifier.min);
    insurance.remainingUses -= 1;
    breakdown.push(
      breakdownItem(
        `insurance_level_${insurance.id}`,
        `事故保险触发：事故等级 ${getAccidentLevelLabel(before)} → ${getAccidentLevelLabel(finalAccidentLevel)}，保险已消耗`,
        levelModifier.value,
        'temporary_insurance',
        insurance.sourceRewardId,
      ),
    );
  }
  context.runState.temporaryInsurances = context.runState.temporaryInsurances.filter((insurance) => insurance.remainingUses > 0);

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
  let refundRate = Math.max(0, Math.min(1, readNumber(configured?.refundRate ?? configuredDefaults?.refundRate, fallback.refundRate)));
  let fine = Math.max(0, Math.round(readNumber(configured?.fine ?? configuredDefaults?.fine, fallback.fine)));
  let reputationLoss = Math.max(0, Math.round(readNumber(configured?.reputationLoss ?? configuredDefaults?.reputationLoss, fallback.reputationLoss)));
  let refund = Math.max(0, Math.round(finalPrice * refundRate));
  const accidentOutcomeBreakdown = [
    breakdownItem('refund_rate', '退款比例', refundRate),
    breakdownItem('refund', '退款', refund),
    breakdownItem('fine', '罚款', fine),
    breakdownItem('reputation_loss', '信誉损失', reputationLoss),
  ];

  if (
    context.activePassives.some((passive) => passive.passiveId === 'passive_black_red_is_red') &&
    (context.customerOrder.customerType ?? context.indexes.customersById.get(context.customerOrder.customerId)?.customerType) === 'mcn' &&
    accidentLevel === AccidentLevel.Minor
  ) {
    const before = reputationLoss;
    reputationLoss = 0;
    accidentOutcomeBreakdown.push(breakdownItem('passive_black_red_is_red', `黑红也是红：信誉损失 ${before} → 0，额外现金 +20`, 20, 'passive', 'passive_black_red_is_red'));
    context.runState.cash += 20;
  }

  for (const modifier of dealModifiers(context).filter((item) => (item.stat === 'fine' || item.stat === 'refund' || item.stat === 'refundRate' || item.stat === 'reputationLoss' || item.stat === 'cash') && modifierAccidentLevelMatches(item, accidentLevel))) {
    if (modifier.stat === 'refundRate') {
      const before = refundRate;
      refundRate = Math.max(0, Math.min(1, modifier.op === 'multiply' ? refundRate * modifier.value : refundRate + modifier.value));
      refund = Math.max(0, Math.round(finalPrice * refundRate));
      accidentOutcomeBreakdown.push(breakdownItem(`modifier_refund_rate_${modifier.sourceId ?? accidentOutcomeBreakdown.length}`, `${modifier.displayText ?? '退款比例修正'}：退款比例 ${before} → ${refundRate}`, refundRate - before, modifier.sourceType ?? 'modifier', modifier.sourceId ?? 'unknown'));
    }
    if (modifier.stat === 'refund') {
      const before = refund;
      refund = modifier.op === 'multiply' ? Math.round(refund * modifier.value) : Math.max(0, refund + modifier.value);
      accidentOutcomeBreakdown.push(breakdownItem(`modifier_refund_${modifier.sourceId ?? accidentOutcomeBreakdown.length}`, `${modifier.displayText ?? '退款修正'}：退款 ${before} → ${refund}`, refund - before, modifier.sourceType ?? 'modifier', modifier.sourceId ?? 'unknown'));
    }
    if (modifier.stat === 'fine') {
      const before = fine;
      fine = modifier.op === 'multiply' ? Math.round(fine * modifier.value) : Math.max(0, fine + modifier.value);
      accidentOutcomeBreakdown.push(breakdownItem(`modifier_fine_${modifier.sourceId ?? accidentOutcomeBreakdown.length}`, `${modifier.displayText ?? '罚款修正'}：罚款 ${before} → ${fine}`, fine - before, modifier.sourceType ?? 'modifier', modifier.sourceId ?? 'unknown'));
    }
    if (modifier.stat === 'reputationLoss') {
      const before = reputationLoss;
      reputationLoss = modifier.op === 'set' ? modifier.value : Math.max(0, reputationLoss + modifier.value);
      accidentOutcomeBreakdown.push(breakdownItem(`modifier_reputation_${modifier.sourceId ?? accidentOutcomeBreakdown.length}`, `${modifier.displayText ?? '信誉损失修正'}：信誉损失 ${before} → ${reputationLoss}`, reputationLoss - before, modifier.sourceType ?? 'modifier', modifier.sourceId ?? 'unknown'));
    }
    if (modifier.stat === 'cash') {
      context.runState.cash += modifier.value;
      accidentOutcomeBreakdown.push(breakdownItem(`modifier_cash_${modifier.sourceId ?? accidentOutcomeBreakdown.length}`, `${modifier.displayText ?? '现金修正'}：现金 ${modifier.value >= 0 ? '+' : ''}${modifier.value}`, modifier.value, modifier.sourceType ?? 'modifier', modifier.sourceId ?? 'unknown'));
    }
  }

  for (const insurance of [...context.runState.temporaryInsurances]) {
    if (insurance.remainingUses <= 0 || accidentLevel === AccidentLevel.None) continue;
    const raw = insurance.config;
    const levels = Array.isArray(raw.accidentLevels) ? raw.accidentLevels.filter((level): level is AccidentLevel => typeof level === 'string') : null;
    const atLeast = typeof raw.accidentLevelAtLeast === 'string' ? raw.accidentLevelAtLeast : null;
    const matches =
      (levels ? levels.includes(accidentLevel) : true) &&
      (!atLeast || LEVEL_ORDER.indexOf(accidentLevel) >= LEVEL_ORDER.indexOf(atLeast as AccidentLevel));
    if (!matches) continue;
    const beforeFine = fine;
    const beforeRep = reputationLoss;
    const modifiers = Array.isArray(raw.modifiers) ? raw.modifiers : [];
    for (const item of modifiers) {
      if (!item || typeof item !== 'object') continue;
      const modifier = item as { stat?: string; op?: string; value?: number; min?: AccidentLevel };
      if (typeof modifier.value !== 'number') continue;
      if (modifier.stat === 'fine') fine = modifier.op === 'multiply' ? Math.round(fine * modifier.value) : Math.max(0, fine + modifier.value);
      if (modifier.stat === 'reputationLoss') reputationLoss = modifier.op === 'set' ? modifier.value : Math.max(0, reputationLoss + modifier.value);
    }
    insurance.remainingUses -= 1;
    accidentOutcomeBreakdown.push(
      breakdownItem(
        `insurance_${insurance.id}`,
        `事故保险触发：罚款 ${beforeFine} → ${fine}，信誉损失 ${beforeRep} → ${reputationLoss}，保险已消耗`,
        -1,
        'temporary_insurance',
        insurance.sourceRewardId,
      ),
    );
  }
  context.runState.temporaryInsurances = context.runState.temporaryInsurances.filter((insurance) => insurance.remainingUses > 0);

  return {
    refundRate,
    refund,
    fine,
    reputationLoss,
    accidentOutcomeBreakdown,
  };
}
