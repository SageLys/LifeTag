import type {
  AccidentLevel,
  CardType,
  DarkRiskCategory,
  DarkRiskRevealLevel,
  FailReason,
  ModifierDurationType,
  ModifierOp,
  ModifierStat,
  ProductStatus,
  RewardType,
  RunPhase,
  RunResult,
  TagSource,
} from './constants';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface GameConfig {
  id: string;
  displayName: string;
  runLengthDays: number;
  initialCash: number;
  targetTotalProfit: number;
  initialReputation: number;
  maxReputation: number;
  dailyActionPoints: number;
  dailyDrawCount: number;
  dailyProductCandidateCount: number;
  dailyProductBuyLimit: number;
  dailyCustomerOrderCount: number;
  inventoryLimit: number;
  marketEventsPerDay: number;
  rewardOptionsPerDay: number;
  rewardSystem?: {
    maintenancePointsPerDay?: number;
    freeBuildChoiceCount?: number;
    freeBuildPickCount?: number;
    paidShopMinOptions?: number;
    paidShopMaxOptions?: number;
    bonusRewardChoiceCount?: number;
    bonusRewardPickCount?: number;
    dayOnePaidRewardDiscount?: number;
  };
  bonusRewardTriggers?: {
    dailyProfitAtLeast?: number;
    singleDealProfitAtLeast?: number;
    noAccidentAndSalesAtLeast?: number;
    blindBoxDealMaxAccidentLevel?: AccidentLevel;
  };
  dailyMinimumSaleCount: number;
  freshnessLossPerDay: number;
  spoiledAt: number;
  spoiledPriceAdd: number;
  spoiledRiskAdd: number;
  riskThresholds: Record<AccidentLevel, RiskThreshold>;
  initialDeckCardIds?: string[];
  initialDeckMode?: 'fixed_plus_random_packs' | string;
  initialDeckFixedCardIds?: string[];
  initialDeckRandomPacks?: Array<{
    id: string;
    displayName?: string;
    pickCount: number;
    cardIds: string[];
  }>;
  initialDeck: InitialDeckEntry[];
  notes?: string;
}

export interface RiskThreshold {
  min: number;
  max: number | null;
}

export interface InitialDeckEntry {
  cardId: string;
  count: number;
}

export interface TagDef {
  id: string;
  displayName: string;
  category: string;
  baseValue: number;
  riskValue: number;
  isNegative: boolean;
  isWashable: boolean;
}

export interface DarkRiskDef {
  id: string;
  displayName: string;
  category: DarkRiskCategory;
  baseRisk: number;
  revealRisk: number;
  accidentWeight: number;
  relatedTagIds: string[];
  sensitiveCustomerIds: string[];
}

export interface TagConflictDef {
  id: string;
  tagA: string;
  tagB: string;
  relationType: 'conflict' | 'support';
  priceDelta: number;
  riskDelta: number;
}

export interface ProductTemplate {
  id: string;
  displayName: string;
  baseCost: number;
  basePrice: number;
  baseRisk: number;
  hiddenTagCount: number;
  visibleTagIds: string[];
  hiddenTagPool: string[];
  darkRiskPool: string[];
  darkRiskChance: number;
  weight: number;
  sourceHint?: string;
}

export interface CustomerDef {
  id: string;
  displayName: string;
  description: string;
  preferredTagIds: string[];
  tabooTagIds: string[];
  riskTolerance: number;
  priceSensitivity: number;
  preferredPricingModeIds: string[];
  budget?: number;
  customerType?: string;
  /** v2: 偏好标签各自的价格加成（覆盖通用 priceBonus） */
  preferredTagPriceBonus?: Record<string, number>;
  /** v2: 雷区标签各自的风险惩罚（覆盖通用 tabooRiskBonus） */
  tabooTagRiskBonus?: Record<string, number>;
  /** v2: 暗风险敏感类型——命中时全额计入，未命中时计入 30% */
  darkRiskSensitivity?: string[];
}

export interface MarketEventDef {
  id: string;
  displayName: string;
  newsText: string;
  durationDays: number;
  conditions: Condition[];
  modifiers: Modifier[];
  effects: Effect[];
  effectText?: string;
}

export interface CardDef {
  id: string;
  displayName: string;
  description?: string;
  type?: CardType;
  cardType: CardType;
  cost: number;
  actionPointCost?: number;
  apCost?: number;
  cashCost?: number;
  targetType?: 'none' | 'product' | 'selected_product' | 'selected_deal' | 'selected_customer' | 'player';
  conditions?: Condition[];
  condition?: Condition;
  effects: Effect[];
  exhaustAfterUse?: boolean;
  consumeAfterUse?: boolean;
  discardAfterUse?: boolean;
  upgradedEffects?: Effect[];
  upgradedCardId?: string;
  upgradedActionPointCost?: number;
  upgradedCashCost?: number;
  effectText?: string;
  flavorText?: string;
}

export interface ShopPassiveDef {
  id: string;
  displayName: string;
  description?: string;
  archetype?: string;
  effectText: string;
  effects: Effect[];
  aliasOf?: string;
}

export interface SupplySourceDef {
  id: string;
  displayName: string;
  description: string;
  durationDays?: number;
  archetype?: string;
  templateWeightModifiers: Modifier[];
  spawnModifiers?: Effect[];
  effects?: Effect[];
}

export interface BaseActionDef {
  id: string;
  displayName: string;
  description: string;
  dailyLimit: number;
  actionPointCost?: number;
  cashCost?: number;
  effects: Effect[];
}

export interface PricingModeDef {
  id: string;
  displayName: string;
  mode: string;
  priceMultiplier: number;
  riskDelta: number;
  successDelta: number;
}

export interface AccidentDef {
  id: string;
  level: AccidentLevel;
  displayName: string;
  loss: number;
  accidentText: string;
  refundRate?: number;
  fine?: number;
  reputationLoss?: number;
}

export interface RewardOption {
  id: string;
  rewardType: RewardType;
  type?: RewardType;
  rewardSlot?: 'maintenance' | 'free_build' | 'paid_shop' | 'bonus' | 'legacy' | string;
  archetype?: string;
  maintenanceCost?: number;
  price?: number;
  dayOneDiscount?: number;
  oncePerDayGroup?: string;
  explicitlyRepeatable?: boolean;
  cardId?: string;
  cardPool?: string[];
  passiveId?: string;
  supplySourceId?: string;
  supplyPool?: string[];
  durationOverrideDays?: number;
  amount?: number;
  temporaryInsurance?: Record<string, JsonValue>;
  requires?: JsonValue;
  effects?: Effect[];
  displayName?: string;
  description: string;
  weight: number;
  cost?: number;
  payload: Record<string, JsonValue>;
}

export type RewardDef = RewardOption;

export interface RewardOptionInstance extends RewardOption {
  instanceId: string;
  rewardId: string;
  displayName: string;
  cost: number;
  effectSummary: string;
}

export interface EndingEvaluationDef {
  id: string;
  displayName: string;
  summaryText: string;
  conditions: Condition[];
}

export interface Condition {
  type: string;
  target?: string;
  operator?: string;
  value?: JsonValue;
  conditions?: Condition[];
  condition?: Condition;
  tagId?: string;
  tagIds?: string[];
  targetTagId?: string;
  category?: string;
  customerId?: string;
  pricingModeId?: string;
  marketEventId?: string;
}

export interface Effect {
  type: string;
  displayText?: string;
  params?: Record<string, JsonValue>;
  target?: string;
  value?: JsonValue;
  modifiers?: Modifier[];
  tagId?: string;
  tagIds?: string[];
  targetTagId?: string;
  count?: number;
  category?: string;
  modifier?: Modifier;
  duration?: string;
  forceSuppress?: boolean;
}

export interface Modifier {
  id?: string;
  stat: ModifierStat | string;
  op: ModifierOp | string;
  value: number;
  durationType?: ModifierDurationType;
  targetId?: string;
  sourceId?: string;
  sourceType?: string;
  displayText?: string;
  condition?: JsonValue;
}

export interface BreakdownItem {
  id: string;
  label: string;
  value: number | string;
  sourceId?: string;
  sourceType?: string;
  stat?: string;
  op?: string;
  visibleToPlayer?: boolean;
}

export interface PriceResult {
  rawPrice: number;
  priceBeforeBudgetCap: number;
  effectiveBudget: number;
  finalPrice: number;
  estimatedProfit: number;
  priceBreakdown: BreakdownItem[];
  warnings: string[];
}

export type RiskDisplayType = 'exact' | 'range';

export interface RiskBreakdownItem {
  sourceType: string;
  sourceId: string;
  label: string;
  stat: 'risk';
  op: 'add' | 'multiply' | 'set' | 'min' | 'max';
  value: number;
  visibleToPlayer: boolean;
}

export interface UnknownRiskBreakdownItem {
  sourceType: 'hidden_tag' | 'dark_risk' | 'system';
  sourceId: string;
  label: string;
  riskMin: number;
  riskMax: number;
  visibleToPlayer: boolean;
}

export interface AccidentPreview {
  levelMin: AccidentLevel;
  levelMax: AccidentLevel;
  label: string;
  isRange: boolean;
}

export interface RiskResult {
  riskDisplayType: RiskDisplayType;
  knownRisk: number;
  riskMin: number;
  riskMax: number;
  exactRisk?: number;
  riskBreakdown: RiskBreakdownItem[];
  unknownRiskBreakdown: UnknownRiskBreakdownItem[];
  unknownResolvedBreakdown?: RiskBreakdownItem[];
  warnings: string[];
}

export interface CalculationContext {
  mode: 'preview' | 'resolve';
  runState: RunState;
  dayState: DayState;
  deckState?: DeckState;
  product: ProductInstance;
  customerOrder: CustomerOrder;
  pricingMode: PricingModeDef;
  marketEvent: MarketEventDef | null;
  activePassives: PassiveState[];
  activeSupplySources: SupplySourceState[];
  configTables: AllConfigs;
  indexes: ConfigIndex;
}

export interface DeckState {
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];
}

export interface DayState {
  dayNumber: number;
  phase: RunPhase;
  actionPoints: number;
  marketEvent: MarketEventDef | null;
  marketEvents: MarketEventDef[];
  productCandidates: ProductInstance[];
  customerOrders: CustomerOrder[];
  rewardOptions: RewardOptionInstance[];
  rewardState?: RewardPhaseState;
  marketEventIds: string[];
  productCandidateIds: string[];
  customerOrderIds: string[];
  rewardOptionIds: string[];
  chosenRewardId?: string | null;
  boughtProductCount: number;
  soldProductCount: number;
  dailyProfit: number;
  maxSingleDealProfit: number;
  accidentCount: number;
  blindBoxDealAccidentLevels: AccidentLevel[];
  selectedProductId: string | null;
  selectedCustomerId: string | null;
  selectedCustomerOrderId: string | null;
  selectedPricingModeId: string | null;
  currentDealPreview: DealPreview | null;
  temporaryDayModifiers: Modifier[];
  temporaryDealModifiers?: Modifier[];
  phaseFlags: Record<string, boolean>;
  log: string[];
}

export interface RunState {
  runId: string;
  phase: RunPhase;
  result: RunResult;
  failReason: FailReason;
  currentDay: number;
  maxDays: number;
  cash: number;
  totalProfit: number;
  targetTotalProfit: number;
  reputation: number;
  maxReputation: number;
  rngSeed: number;
  rngState: number;
  nextInstanceCounter: number;
  inventory: ProductInstance[];
  activePassives: PassiveState[];
  activeSupplySources: SupplySourceState[];
  temporaryInsurances: TemporaryInsuranceState[];
  temporaryRunModifiers: TemporaryRunModifierState[];
  deckState: DeckState;
  dayState: DayState;
  runLog: string[];
  dealLog: DealResult[];
  accidentLog: AccidentInstance[];
  rewardLog: RewardLogEntry[];
  runReport: RunReport | null;
}

export interface ProductInstance {
  id: string;
  templateId: string;
  displayName: string;
  description?: string;
  status: ProductStatus;
  cost: number;
  basePrice: number;
  baseRisk: number;
  freshnessCurrent: number;
  freshnessMax: number;
  visibleTagIds: string[];
  hiddenTagIds: string[];
  revealedHiddenTagIds: string[];
  darkRiskIds: string[];
  revealedDarkRiskIds: string[];
  darkRiskRevealLevels: Record<string, DarkRiskRevealLevel>;
  appliedTagIds: string[];
  suppressedTagIds: string[];
  flags: Record<string, boolean>;
  tagSources: Record<string, TagSource>;
  productModifiers?: Modifier[];
  dealModifiers?: Modifier[];
}

export interface CustomerOrder {
  id: string;
  customerId: string;
  displayName: string;
  budget: number;
  riskTolerance: number;
  preferredTagIds: string[];
  tabooTagIds: string[];
  darkRiskSensitivity: string[];
  maxRisk: number;
  pricingModeIds: string[];
  customerType?: string;
  specialRules?: string[];
}

export interface CardInstance {
  id: string;
  instanceId: string;
  cardId: string;
  cardDefId: string;
  upgraded: boolean;
  temporary?: boolean;
  createdDay?: number;
}

export interface PassiveState {
  passiveId: string;
  gainedDay: number;
  source?: string;
}

export interface SupplySourceState {
  supplySourceId: string;
  gainedDay: number;
  remainingDays?: number | null;
  source?: string;
}

export interface TemporaryInsuranceState {
  id: string;
  sourceRewardId: string;
  displayName: string;
  gainedDay: number;
  remainingUses: number;
  config: Record<string, JsonValue>;
}

export interface TemporaryRunModifierState {
  id: string;
  sourceRewardId: string;
  displayName: string;
  gainedDay: number;
  timing: 'next_day' | 'this_day';
  scope: string;
  stat: string;
  op: string;
  value: number;
  uses: number;
  consumed: number;
  target?: string;
}

export interface RewardPhaseState {
  maintenancePointsRemaining: number;
  maintenancePointsTotal: number;
  maintenanceOptions: RewardOptionInstance[];
  freeBuildOptions: RewardOptionInstance[];
  paidShopOptions: RewardOptionInstance[];
  bonusOptions: RewardOptionInstance[];
  selectedFreeBuildRewardId: string | null;
  selectedBonusRewardId: string | null;
  purchasedPaidRewardIds: string[];
  claimedMaintenanceRewardIds: string[];
  skippedBonus: boolean;
  bonusUnlocked: boolean;
  bonusReasons: string[];
  rewardPhaseCompleted: boolean;
}

export interface RewardLogEntry {
  day: number;
  rewardId: string;
  rewardInstanceId?: string;
  rewardDisplayName?: string;
  rewardType: RewardType;
  cost?: number;
  cashCost?: number;
  effectsApplied?: string[];
  cashBefore?: number;
  cashAfter?: number;
  reputationBefore?: number;
  reputationAfter?: number;
  deckChange?: string;
  passiveChange?: string;
  supplySourceChange?: string;
}

export interface DealPreview {
  productId: string;
  customerOrderId: string;
  pricingModeId: string;
  price: number;
  risk: number;
  estimatedPrice: number;
  estimatedProfit: number;
  rawPrice: number;
  priceBeforeBudgetCap: number;
  effectiveBudget: number;
  riskDisplayType: RiskDisplayType;
  knownRisk: number;
  riskMin: number;
  riskMax: number;
  exactRisk?: number;
  accidentPreview: AccidentPreview;
  priceBreakdown: BreakdownItem[];
  riskBreakdown: RiskBreakdownItem[];
  unknownRiskBreakdown: UnknownRiskBreakdownItem[];
  warnings: string[];
  missingSelections: string[];
  canConfirmSell: boolean;
  disabledReason: string | null;
}

export interface DealResult {
  dealId: string;
  day: number;
  productInstanceId: string;
  productDisplayName: string;
  customerOrderId: string;
  customerDisplayName: string;
  pricingModeId: string;
  pricingModeDisplayName: string;
  finalPrice: number;
  finalRisk: number;
  baseAccidentLevel: AccidentLevel;
  finalAccidentLevel: AccidentLevel;
  refundRate: number;
  refund: number;
  fine: number;
  reputationLoss: number;
  cashDelta: number;
  singleProfit: number;
  totalProfitGain: number;
  reputationDelta: number;
  currentCash: number;
  currentTotalProfit: number;
  currentReputation: number;
  priceBreakdown: BreakdownItem[];
  riskBreakdown: RiskBreakdownItem[];
  unknownResolvedBreakdown: RiskBreakdownItem[];
  accidentLevelModifierBreakdown: BreakdownItem[];
  accidentOutcomeBreakdown: BreakdownItem[];
  accidentChain: BreakdownItem[];
  createdAt: string;
  preview?: DealPreview;
  accepted?: boolean;
  accident?: AccidentInstance;
}

export interface AccidentInstance {
  accidentInstanceId: string;
  dealId: string;
  day: number;
  title: string;
  text: string;
  finalRisk: number;
  refund: number;
  fine: number;
  reputationLoss: number;
  cashDelta: number;
  totalProfitGain: number;
  chain: BreakdownItem[];
  relatedTags: string[];
  relatedDarkRiskIds: string[];
  relatedCustomerId: string;
  relatedMarketEventId: string | null;
  relatedPricingModeId: string;
  createdAt: string;
  id: string;
  level: AccidentLevel;
  risk: number;
  loss: number;
  darkRiskIds: string[];
  accidentText: string;
}

export interface RunReport {
  reportId: string;
  result: RunResult;
  failReason: FailReason;
  endingEvaluationId?: string;
  dayReached: number;
  finalCash: number;
  finalTotalProfit: number;
  targetTotalProfit: number;
  finalReputation: number;
  totalDeals: number;
  totalAccidents: number;
  maxAccidentLevel: AccidentLevel;
  maxSingleProfit: number;
  totalProfitGain: number;
  activePassives: string[];
  activeSupplySources: string[];
  deckSize: number;
  mainRiskSources: string[];
  endingTitle: string;
  endingText: string;
  createdAt: string;
  totalCash: number;
  totalReputation: number;
  summaryItems: BreakdownItem[];
}

export interface AllConfigs {
  gameConfig: GameConfig;
  tags: TagDef[];
  darkRisks: DarkRiskDef[];
  tagConflicts: TagConflictDef[];
  productTemplates: ProductTemplate[];
  customers: CustomerDef[];
  marketEvents: MarketEventDef[];
  cards: CardDef[];
  passives: ShopPassiveDef[];
  supplySources: SupplySourceDef[];
  baseActions: BaseActionDef[];
  pricingModes: PricingModeDef[];
  accidents: AccidentDef[];
  rewards: RewardDef[];
  endingEvaluations: EndingEvaluationDef[];
}

export interface ConfigIndex {
  tagsById: Map<string, TagDef>;
  darkRisksById: Map<string, DarkRiskDef>;
  tagConflictsById: Map<string, TagConflictDef>;
  productTemplatesById: Map<string, ProductTemplate>;
  customersById: Map<string, CustomerDef>;
  marketEventsById: Map<string, MarketEventDef>;
  cardsById: Map<string, CardDef>;
  passivesById: Map<string, ShopPassiveDef>;
  supplySourcesById: Map<string, SupplySourceDef>;
  baseActionsById: Map<string, BaseActionDef>;
  pricingModesById: Map<string, PricingModeDef>;
  accidentsByLevel: Map<AccidentLevel, AccidentDef>;
  rewardsById: Map<string, RewardDef>;
  endingEvaluationsById: Map<string, EndingEvaluationDef>;
  tagConflictsByPair: Map<string, TagConflictDef>;
  cardsByType: Map<CardType, CardDef[]>;
  productTemplatesByTag: Map<string, ProductTemplate[]>;
}

export interface AppRuntime {
  configs: AllConfigs;
  index: ConfigIndex;
  state: RunState;
}
