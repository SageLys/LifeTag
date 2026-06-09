import { AccidentLevel } from './constants';
import type { GameConfig } from './types';

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
