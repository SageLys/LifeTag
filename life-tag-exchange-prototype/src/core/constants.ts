export const RunPhase = {
  Setup: 'setup',
  DayStart: 'day_start',
  Market: 'market',
  Supply: 'supply',
  Action: 'action',
  Deal: 'deal',
  Reward: 'reward',
  Report: 'report',
  Finished: 'finished',
} as const;
export type RunPhase = (typeof RunPhase)[keyof typeof RunPhase];

export const RunResult = {
  InProgress: 'in_progress',
  Success: 'success',
  Failed: 'failed',
} as const;
export type RunResult = (typeof RunResult)[keyof typeof RunResult];

export const FailReason = {
  None: 'none',
  ReputationTooLow: 'reputation_too_low',
  AccidentOverload: 'accident_overload',
  CashDepleted: 'cash_depleted',
} as const;
export type FailReason = (typeof FailReason)[keyof typeof FailReason];

export const ProductStatus = {
  Available: 'available',
  Sold: 'sold',
  Discarded: 'discarded',
} as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const TagSource = {
  Visible: 'visible',
  Hidden: 'hidden',
  Card: 'card',
  Passive: 'passive',
  Market: 'market',
} as const;
export type TagSource = (typeof TagSource)[keyof typeof TagSource];

export const DarkRiskCategory = {
  CareerBackground: 'career_background',
  Persona: 'persona',
  Platform: 'platform',
} as const;
export type DarkRiskCategory = (typeof DarkRiskCategory)[keyof typeof DarkRiskCategory];

export const DarkRiskRevealLevel = {
  Hidden: 'hidden',
  Hinted: 'hinted',
  Revealed: 'revealed',
} as const;
export type DarkRiskRevealLevel = (typeof DarkRiskRevealLevel)[keyof typeof DarkRiskRevealLevel];

export const CardType = {
  TagTool: 'tag_tool',
  Operation: 'operation',
} as const;
export type CardType = (typeof CardType)[keyof typeof CardType];

export const RewardType = {
  AddCard: 'add_card',
  UpgradeCard: 'upgrade_card',
  RemoveCard: 'remove_card',
  AddPassive: 'add_passive',
  AddSupplySource: 'add_supply_source',
  GainCash: 'gain_cash',
  GainReputation: 'gain_reputation',
  GainInsurance: 'gain_insurance',
  TemporaryModifier: 'temporary_modifier',
} as const;
export type RewardType = (typeof RewardType)[keyof typeof RewardType];

export const AccidentLevel = {
  None: 'none',
  Minor: 'minor',
  Medium: 'medium',
  Major: 'major',
  Severe: 'severe',
} as const;
export type AccidentLevel = (typeof AccidentLevel)[keyof typeof AccidentLevel];

export const ModifierStat = {
  Price: 'price',
  Risk: 'risk',
  Cost: 'cost',
  SuccessRate: 'success_rate',
  Reputation: 'reputation',
  AccidentLoss: 'accident_loss',
} as const;
export type ModifierStat = (typeof ModifierStat)[keyof typeof ModifierStat];

export const ModifierOp = {
  Add: 'add',
  Multiply: 'multiply',
  Set: 'set',
} as const;
export type ModifierOp = (typeof ModifierOp)[keyof typeof ModifierOp];

export const ModifierDurationType = {
  Instant: 'instant',
  ThisDeal: 'this_deal',
  ThisDay: 'this_day',
  Run: 'run',
  NextDeal: 'next_deal',
} as const;
export type ModifierDurationType = (typeof ModifierDurationType)[keyof typeof ModifierDurationType];
