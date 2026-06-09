export const RunPhase = {
  RunInit: 'RUN_INIT',
  DayOpening: 'DAY_OPENING',
  DayPurchase: 'DAY_PURCHASE',
  DayCustomer: 'DAY_CUSTOMER',
  DayDraw: 'DAY_DRAW',
  DayProcess: 'DAY_PROCESS',
  DaySell: 'DAY_SELL',
  DayResolve: 'DAY_RESOLVE',
  DayReward: 'DAY_REWARD',
  RunEnd: 'RUN_END',
  RunFailed: 'RUN_FAILED',
} as const;
export type RunPhase = (typeof RunPhase)[keyof typeof RunPhase];

export const RunResult = {
  InProgress: 'in_progress',
  Victory: 'victory',
  Success: 'success',
  Failed: 'failed',
} as const;
export type RunResult = (typeof RunResult)[keyof typeof RunResult];

export const FailReason = {
  None: 'none',
  ReputationTooLow: 'reputation_too_low',
  ReputationZero: 'reputation_zero',
  AccidentOverload: 'accident_overload',
  CashDepleted: 'cash_depleted',
  CashBelowZero: 'cash_below_zero',
  ProfitTargetNotMet: 'profit_target_not_met',
} as const;
export type FailReason = (typeof FailReason)[keyof typeof FailReason];

export const ProductStatus = {
  Candidate: 'candidate',
  Inventory: 'inventory',
  Sold: 'sold',
  Spoiled: 'spoiled',
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
  TemporaryInsurance: 'temporary_insurance',
  AddTemporaryModifier: 'add_temporary_modifier',
  ProductRepair: 'product_repair',
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
