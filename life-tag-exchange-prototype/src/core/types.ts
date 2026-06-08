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
  dailyMinimumSaleCount: number;
  freshnessLossPerDay: number;
  spoiledAt: number;
  spoiledPriceAdd: number;
  spoiledRiskAdd: number;
  riskThresholds: Record<AccidentLevel, RiskThreshold>;
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
  cardType: CardType;
  cost: number;
  effects: Effect[];
  effectText?: string;
  flavorText?: string;
}

export interface ShopPassiveDef {
  id: string;
  displayName: string;
  effectText: string;
  effects: Effect[];
}

export interface SupplySourceDef {
  id: string;
  displayName: string;
  description: string;
  templateWeightModifiers: Modifier[];
}

export interface BaseActionDef {
  id: string;
  displayName: string;
  description: string;
  dailyLimit: number;
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
}

export interface RewardOption {
  id: string;
  rewardType: RewardType;
  description: string;
  weight: number;
  payload: Record<string, JsonValue>;
}

export type RewardDef = RewardOption;

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
}

export interface Effect {
  type: string;
  target?: string;
  value?: JsonValue;
  modifiers?: Modifier[];
}

export interface Modifier {
  id?: string;
  stat: ModifierStat | string;
  op: ModifierOp | string;
  value: number;
  durationType?: ModifierDurationType;
  targetId?: string;
  sourceId?: string;
}

export interface BreakdownItem {
  id: string;
  label: string;
  value: number;
  sourceId?: string;
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
  productCandidates: ProductInstance[];
  customerOrders: CustomerOrder[];
  rewardOptions: RewardOption[];
  marketEventIds: string[];
  productCandidateIds: string[];
  customerOrderIds: string[];
  rewardOptionIds: string[];
  boughtProductCount: number;
  soldProductCount: number;
  selectedProductId: string | null;
  selectedCustomerId: string | null;
  selectedCustomerOrderId: string | null;
  selectedPricingModeId: string | null;
  currentDealPreview: DealPreview | null;
  temporaryDayModifiers: Modifier[];
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
  inventory: ProductInstance[];
  activePassives: PassiveState[];
  activeSupplySources: SupplySourceState[];
  deckState: DeckState;
  dayState: DayState;
  runLog: string[];
  dealLog: DealResult[];
  accidentLog: AccidentInstance[];
  rewardLog: RewardLogEntry[];
}

export interface ProductInstance {
  id: string;
  templateId: string;
  status: ProductStatus;
  cost: number;
  visibleTagIds: string[];
  hiddenTagIds: string[];
  revealedHiddenTagIds: string[];
  darkRiskIds: string[];
  revealedDarkRiskIds: string[];
  darkRiskRevealLevels: Record<string, DarkRiskRevealLevel>;
  tagSources: Record<string, TagSource>;
}

export interface CustomerOrder {
  id: string;
  customerId: string;
  preferredTagIds: string[];
  tabooTagIds: string[];
  maxRisk: number;
  pricingModeIds: string[];
}

export interface CardInstance {
  id: string;
  instanceId: string;
  cardId: string;
  cardDefId: string;
  upgraded: boolean;
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

export interface RewardLogEntry {
  day: number;
  rewardId: string;
  rewardType: RewardType;
  cashCost?: number;
}

export interface DealPreview {
  productId: string;
  customerOrderId: string;
  pricingModeId: string;
  price: number;
  risk: number;
  priceBreakdown: BreakdownItem[];
  riskBreakdown: BreakdownItem[];
}

export interface DealResult {
  preview: DealPreview;
  accepted: boolean;
  cashDelta: number;
  reputationDelta: number;
  accident?: AccidentInstance;
}

export interface AccidentInstance {
  id: string;
  level: AccidentLevel;
  risk: number;
  loss: number;
  darkRiskIds: string[];
  accidentText: string;
}

export interface RunReport {
  result: RunResult;
  endingEvaluationId?: string;
  totalCash: number;
  totalReputation: number;
  totalAccidents: number;
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
