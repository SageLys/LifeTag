import { DarkRiskRevealLevel, ProductStatus, RunPhase, RunResult, TagSource } from './constants';
import { createNewGame } from './gameState';
import { generateRunReport } from './runReport';
import { generateRewardOptions } from './rules_rewards';
import { refreshDealPreviewIfPossible } from './rules_deal';
import type { AppRuntime, CardInstance, CustomerDef, CustomerOrder, ProductInstance, ProductTemplate } from './types';

export interface TestScenarioResult {
  ok: boolean;
  scenarioId: string;
  message: string;
  phase: RunPhase;
  injectedProductIds: string[];
  injectedCustomerOrderIds: string[];
  selectedProductId: string | null;
  selectedCustomerId: string | null;
  selectedPricingModeId: string | null;
  expected: string[];
}

export interface TestScenario {
  id: string;
  displayName: string;
  description: string;
  targetPhase: RunPhase;
  expected: string[];
  manualSteps: string[];
  setup: (app: AppRuntime) => TestScenarioResult;
}

function log(app: AppRuntime, message: string): void {
  app.state.runLog.push(message);
  app.state.dayState.log.push(message);
}

function resetRun(app: AppRuntime, seed = 13013): void {
  app.state = createNewGame(app.configs.gameConfig);
  app.state.rngSeed = seed;
  app.state.rngState = seed;
  app.state.runLog.push(`[Debug] 固定 seed = ${seed}`);
}

function syncPhase(app: AppRuntime, phase: RunPhase): void {
  app.state.phase = phase;
  app.state.dayState.phase = phase;
}

function firstTemplate(app: AppRuntime, predicate?: (template: ProductTemplate) => boolean): ProductTemplate {
  const template = app.configs.productTemplates.find((item) => predicate?.(item) ?? true) ?? app.configs.productTemplates[0];
  if (!template) {
    throw new Error('缺少 productTemplates 配置。');
  }
  return template;
}

function firstCustomer(app: AppRuntime, predicate?: (customer: CustomerDef) => boolean): CustomerDef {
  const customer = app.configs.customers.find((item) => predicate?.(item) ?? true) ?? app.configs.customers[0];
  if (!customer) {
    throw new Error('缺少 customers 配置。');
  }
  return customer;
}

function createProduct(app: AppRuntime, options: Partial<ProductInstance> & { template?: ProductTemplate } = {}): ProductInstance {
  const template = options.template ?? firstTemplate(app);
  const hiddenTagIds = options.hiddenTagIds ?? template.hiddenTagPool.slice(0, Math.min(template.hiddenTagCount || 1, template.hiddenTagPool.length));
  const darkRiskIds = options.darkRiskIds ?? [];
  const id = options.id ?? `debug_product_${app.state.nextInstanceCounter++}`;
  return {
    id,
    templateId: template.id,
    displayName: options.displayName ?? template.displayName,
    description: options.description ?? 'Debug 测试商品',
    status: options.status ?? ProductStatus.Inventory,
    cost: options.cost ?? template.baseCost,
    basePrice: options.basePrice ?? template.basePrice,
    baseRisk: options.baseRisk ?? template.baseRisk,
    freshnessCurrent: options.freshnessCurrent ?? 3,
    freshnessMax: options.freshnessMax ?? 3,
    visibleTagIds: options.visibleTagIds ?? [...template.visibleTagIds],
    hiddenTagIds,
    revealedHiddenTagIds: options.revealedHiddenTagIds ?? [],
    darkRiskIds,
    revealedDarkRiskIds: options.revealedDarkRiskIds ?? [],
    darkRiskRevealLevels:
      options.darkRiskRevealLevels ?? Object.fromEntries(darkRiskIds.map((riskId) => [riskId, DarkRiskRevealLevel.Hidden])),
    appliedTagIds: options.appliedTagIds ?? [],
    suppressedTagIds: options.suppressedTagIds ?? [],
    flags: {
      packaged: false,
      sold: false,
      spoiled: false,
      inInventory: true,
      ...(options.flags ?? {}),
    },
    tagSources:
      options.tagSources ?? Object.fromEntries((options.visibleTagIds ?? template.visibleTagIds).map((tagId) => [tagId, TagSource.Visible])),
    productModifiers: options.productModifiers,
    dealModifiers: options.dealModifiers,
  };
}

function createOrder(app: AppRuntime, options: Partial<CustomerOrder> & { customer?: CustomerDef } = {}): CustomerOrder {
  const customer = options.customer ?? firstCustomer(app);
  const id = options.id ?? `debug_order_${app.state.nextInstanceCounter++}`;
  return {
    id,
    customerId: customer.id,
    displayName: options.displayName ?? customer.displayName,
    budget: options.budget ?? 999,
    riskTolerance: options.riskTolerance ?? customer.riskTolerance,
    preferredTagIds: options.preferredTagIds ?? [...customer.preferredTagIds],
    tabooTagIds: options.tabooTagIds ?? [...customer.tabooTagIds],
    darkRiskSensitivity: options.darkRiskSensitivity ?? [],
    maxRisk: options.maxRisk ?? customer.riskTolerance,
    pricingModeIds: options.pricingModeIds ?? [...customer.preferredPricingModeIds],
    specialRules: options.specialRules ?? [],
  };
}

function selectDeal(app: AppRuntime, product: ProductInstance, order: CustomerOrder, pricingModeId = 'pricing_normal'): void {
  app.state.inventory = [product, ...app.state.inventory.filter((item) => item.id !== product.id)];
  app.state.dayState.customerOrders = [order];
  app.state.dayState.customerOrderIds = [order.id];
  app.state.dayState.selectedProductId = product.id;
  app.state.dayState.selectedCustomerId = order.customerId;
  app.state.dayState.selectedCustomerOrderId = order.id;
  app.state.dayState.selectedPricingModeId = app.index.pricingModesById.has(pricingModeId) ? pricingModeId : app.configs.pricingModes[0]?.id ?? null;
  refreshDealPreviewIfPossible(app);
}

function makeResult(app: AppRuntime, scenario: TestScenario, products: ProductInstance[] = [], orders: CustomerOrder[] = []): TestScenarioResult {
  log(app, `[Debug] 加载测试局：${scenario.displayName}`);
  return {
    ok: true,
    scenarioId: scenario.id,
    message: `已加载：${scenario.displayName}`,
    phase: app.state.phase,
    injectedProductIds: products.map((product) => product.id),
    injectedCustomerOrderIds: orders.map((order) => order.id),
    selectedProductId: app.state.dayState.selectedProductId,
    selectedCustomerId: app.state.dayState.selectedCustomerId,
    selectedPricingModeId: app.state.dayState.selectedPricingModeId,
    expected: scenario.expected,
  };
}

function addHandCard(app: AppRuntime, cardId: string): CardInstance {
  const instanceId = `debug_card_${app.state.nextInstanceCounter++}`;
  const card = { id: instanceId, instanceId, cardId, cardDefId: cardId, upgraded: false, createdDay: app.state.currentDay };
  app.state.deckState.hand.push(card);
  return card;
}

function ensureRewards(app: AppRuntime): void {
  app.state.dayState.rewardOptions = generateRewardOptions(app);
  app.state.dayState.rewardOptionIds = app.state.dayState.rewardOptions.map((reward) => reward.instanceId);
}

function forcePaidReward(app: AppRuntime): void {
  const reward = app.state.dayState.rewardOptions[0];
  if (reward) {
    reward.cost = Math.max(50, app.state.cash + 40);
    reward.effectSummary = `${reward.effectSummary}（Debug 付费测试）`;
  }
}

function highRiskDeal(app: AppRuntime): { product: ProductInstance; order: CustomerOrder } {
  const darkRisk = app.configs.darkRisks[0];
  const highRiskTag = app.configs.tags.find((tag) => tag.riskValue > 20) ?? app.configs.tags[0];
  const template = firstTemplate(app, (item) => item.hiddenTagPool.includes(highRiskTag?.id ?? '')) ?? firstTemplate(app);
  const product = createProduct(app, {
    template,
    displayName: 'Debug 高风险商品',
    baseRisk: 80,
    cost: 20,
    basePrice: 80,
    hiddenTagIds: highRiskTag ? [highRiskTag.id] : [],
    darkRiskIds: darkRisk ? [darkRisk.id] : [],
    freshnessCurrent: 3,
  });
  const customer = firstCustomer(app);
  const order = createOrder(app, {
    customer,
    displayName: 'Debug 高敏感顾客',
    budget: 220,
    tabooTagIds: highRiskTag ? [highRiskTag.id] : [],
    darkRiskSensitivity: darkRisk ? [darkRisk.category] : [],
    riskTolerance: 20,
    maxRisk: 20,
  });
  return { product, order };
}

function scenarioBoot(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13001);
  syncPhase(app, RunPhase.DayOpening);
  return makeResult(app, scenario);
}

function scenarioSafeDeal(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13002);
  syncPhase(app, RunPhase.DaySell);
  const template = firstTemplate(app);
  const product = createProduct(app, { template, hiddenTagIds: [], darkRiskIds: [], baseRisk: 0, cost: 20, basePrice: 80 });
  const order = createOrder(app, { budget: 300, tabooTagIds: [], riskTolerance: 100 });
  selectDeal(app, product, order, 'pricing_cheap');
  return makeResult(app, scenario, [product], [order]);
}

function scenarioHiddenRange(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13003);
  syncPhase(app, RunPhase.DaySell);
  const template = firstTemplate(app, (item) => item.hiddenTagPool.length > 0);
  const product = createProduct(app, { template, hiddenTagIds: template.hiddenTagPool.slice(0, 1), revealedHiddenTagIds: [] });
  const order = createOrder(app, { budget: 300 });
  selectDeal(app, product, order, 'pricing_normal');
  return makeResult(app, scenario, [product], [order]);
}

function scenarioDarkRisk(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13004);
  syncPhase(app, RunPhase.DaySell);
  const { product, order } = highRiskDeal(app);
  selectDeal(app, product, order, 'pricing_high');
  return makeResult(app, scenario, [product], [order]);
}

function scenarioSevereFail(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13005);
  syncPhase(app, RunPhase.DaySell);
  app.state.cash = 5;
  app.state.reputation = 20;
  const { product, order } = highRiskDeal(app);
  product.baseRisk = 120;
  selectDeal(app, product, order, 'pricing_high');
  return makeResult(app, scenario, [product], [order]);
}

function scenarioRewardNextDay(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13006);
  syncPhase(app, RunPhase.DayReward);
  const product = createProduct(app, { freshnessCurrent: 3, freshnessMax: 3 });
  app.state.inventory = [product];
  addHandCard(app, app.configs.cards[0]?.id ?? '');
  addHandCard(app, app.configs.cards[1]?.id ?? app.configs.cards[0]?.id ?? '');
  ensureRewards(app);
  return makeResult(app, scenario, [product]);
}

function scenarioFinalVictory(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13007);
  app.state.currentDay = app.state.maxDays;
  app.state.dayState.dayNumber = app.state.maxDays;
  app.state.totalProfit = app.state.targetTotalProfit + 20;
  app.state.cash = 100;
  app.state.reputation = 80;
  syncPhase(app, RunPhase.DayReward);
  ensureRewards(app);
  return makeResult(app, scenario);
}

function scenarioFinalProfitFail(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13008);
  app.state.currentDay = app.state.maxDays;
  app.state.dayState.dayNumber = app.state.maxDays;
  app.state.totalProfit = Math.max(0, app.state.targetTotalProfit - 80);
  app.state.cash = 100;
  app.state.reputation = 80;
  syncPhase(app, RunPhase.DayReward);
  ensureRewards(app);
  return makeResult(app, scenario);
}

function scenarioSoldLock(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13009);
  syncPhase(app, RunPhase.DayProcess);
  const sold = createProduct(app, { displayName: 'Debug 已售商品', status: ProductStatus.Sold, flags: { sold: true, inInventory: true } });
  const live = createProduct(app, { displayName: 'Debug 可售商品' });
  app.state.inventory = [sold, live];
  app.state.dayState.selectedProductId = sold.id;
  return makeResult(app, scenario, [sold, live]);
}

function scenarioCardEffect(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13010);
  syncPhase(app, RunPhase.DayProcess);
  const product = createProduct(app);
  app.state.inventory = [product];
  app.state.dayState.selectedProductId = product.id;
  app.state.dayState.actionPoints = 3;
  app.state.cash = 100;
  addHandCard(app, app.configs.cards[0]?.id ?? '');
  return makeResult(app, scenario, [product]);
}

function scenarioPaidRewardDisabled(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13011);
  syncPhase(app, RunPhase.DayReward);
  app.state.cash = 10;
  ensureRewards(app);
  forcePaidReward(app);
  return makeResult(app, scenario);
}

function scenarioSpoilage(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13012);
  syncPhase(app, RunPhase.DayReward);
  const product = createProduct(app, { displayName: 'Debug 临期商品', freshnessCurrent: 1, freshnessMax: 3 });
  app.state.inventory = [product];
  ensureRewards(app);
  return makeResult(app, scenario, [product]);
}

const SCENARIO_DATA: Array<Omit<TestScenario, 'setup'> & { setupName: string }> = [
  {
    id: 'SCENARIO_A_BOOT_SMOKE',
    displayName: '启动与基础状态局',
    description: '验证新局基础状态正确。',
    targetPhase: RunPhase.DayOpening,
    setupName: 'boot',
    expected: ['currentDay = 1', 'phase = DAY_OPENING', 'cash/reputation 使用初始值', '库存为空', '可继续推进。'],
    manualSteps: ['点击阶段推进，确认进入进货阶段。'],
  },
  {
    id: 'SCENARIO_B_SAFE_DEAL',
    displayName: '无事故安全交易局',
    description: '验证 confirmSell、cash、totalProfit、sold 状态。',
    targetPhase: RunPhase.DaySell,
    setupName: 'safeDeal',
    expected: ['确认出售后事故 none', 'cash 增加 finalPrice', 'totalProfit 增加正利润', '商品 sold', 'dealLog +1。'],
    manualSteps: ['点击确认出售。'],
  },
  {
    id: 'SCENARIO_C_HIDDEN_RISK_RANGE',
    displayName: '隐藏标签风险区间局',
    description: '验证未揭示隐藏标签导致风险区间，普通 UI 不泄露真实隐藏标签。',
    targetPhase: RunPhase.DaySell,
    setupName: 'hiddenRange',
    expected: ['DealPreview riskDisplayType = range', '普通商品卡显示未知占位', 'Debug JSON 可见 hiddenTagIds。'],
    manualSteps: ['查看商品卡、DealPreview 和 Debug JSON。'],
  },
  {
    id: 'SCENARIO_D_DARK_RISK_ACCIDENT',
    displayName: '暗风险事故局',
    description: '验证暗风险参与 resolve 结算，事故确定性触发。',
    targetPhase: RunPhase.DaySell,
    setupName: 'darkRisk',
    expected: ['确认出售后 finalAccidentLevel 不为 none', 'accidentLog +1', '事故链条包含暗风险。'],
    manualSteps: ['点击确认出售，查看事故弹窗。'],
  },
  {
    id: 'SCENARIO_E_SEVERE_ACCIDENT_FAILURE',
    displayName: '严重事故导致失败局',
    description: '验证事故后 cash < 0 或 reputation <= 0 立即失败。',
    targetPhase: RunPhase.DaySell,
    setupName: 'severeFail',
    expected: ['确认出售后进入 RUN_FAILED', 'failReason 为 cash_below_zero 或 reputation_zero', '显示失败报告。'],
    manualSteps: ['点击确认出售。'],
  },
  {
    id: 'SCENARIO_F_REWARD_NEXT_DAY',
    displayName: '奖励进入下一天局',
    description: '验证 DAY_REWARD 选择奖励后进入下一天。',
    targetPhase: RunPhase.DayReward,
    setupName: 'rewardNextDay',
    expected: ['选择奖励后 currentDay = 2', 'phase = DAY_OPENING', '手牌弃置', '库存保留', '新鲜度减少 1。'],
    manualSteps: ['选择任一可用奖励。'],
  },
  {
    id: 'SCENARIO_G_FINAL_VICTORY',
    displayName: '第 8 天胜利局',
    description: '验证第 8 天后胜利判定。',
    targetPhase: RunPhase.DayReward,
    setupName: 'finalVictory',
    expected: ['选择奖励后不进入第 9 天', 'phase = RUN_END', 'result = victory', 'RunReport 显示胜利。'],
    manualSteps: ['选择任一可用奖励。'],
  },
  {
    id: 'SCENARIO_H_FINAL_PROFIT_FAIL',
    displayName: '第 8 天利润未达标失败局',
    description: '验证第 8 天后 totalProfit 未达标失败。',
    targetPhase: RunPhase.DayReward,
    setupName: 'finalProfitFail',
    expected: ['选择奖励后不进入第 9 天', 'phase = RUN_FAILED', 'failReason = profit_target_not_met。'],
    manualSteps: ['选择任一可用奖励。'],
  },
  {
    id: 'SCENARIO_I_SOLD_LOCK',
    displayName: '已售商品锁定局',
    description: '验证 sold 商品不可再次出售、加工或成为卡牌目标。',
    targetPhase: RunPhase.DayProcess,
    setupName: 'soldLock',
    expected: ['已售商品显示已售', '相关操作按钮 disabled', '不能选择出售。'],
    manualSteps: ['查看库存、基础操作和卡牌按钮。'],
  },
  {
    id: 'SCENARIO_J_CARD_EFFECT',
    displayName: '卡牌效果局',
    description: '验证卡牌最小效果仍可用。',
    targetPhase: RunPhase.DayProcess,
    setupName: 'cardEffect',
    expected: ['卡牌按钮可用或显示明确 disabled reason', '使用后 AP/cash/牌堆/商品状态变化。'],
    manualSteps: ['选择商品后使用手牌。'],
  },
  {
    id: 'SCENARIO_K_PAID_REWARD_DISABLED',
    displayName: '付费奖励现金不足局',
    description: '验证现金不足奖励 disabled。',
    targetPhase: RunPhase.DayReward,
    setupName: 'paidRewardDisabled',
    expected: ['付费奖励 disabled', '显示现金不足', '点击不会进入下一天。'],
    manualSteps: ['查看奖励面板。'],
  },
  {
    id: 'SCENARIO_L_SPOILAGE',
    displayName: '新鲜度与腐败局',
    description: '验证进入下一天时未售商品新鲜度只扣一次。',
    targetPhase: RunPhase.DayReward,
    setupName: 'spoilage',
    expected: ['选择奖励后 currentDay = 2', 'freshnessCurrent = 0', 'spoiled = true', '商品仍在库存。'],
    manualSteps: ['选择任一可用奖励后查看库存。'],
  },
];

const SETUP_BY_NAME: Record<string, (app: AppRuntime, scenario: TestScenario) => TestScenarioResult> = {
  boot: scenarioBoot,
  safeDeal: scenarioSafeDeal,
  hiddenRange: scenarioHiddenRange,
  darkRisk: scenarioDarkRisk,
  severeFail: scenarioSevereFail,
  rewardNextDay: scenarioRewardNextDay,
  finalVictory: scenarioFinalVictory,
  finalProfitFail: scenarioFinalProfitFail,
  soldLock: scenarioSoldLock,
  cardEffect: scenarioCardEffect,
  paidRewardDisabled: scenarioPaidRewardDisabled,
  spoilage: scenarioSpoilage,
};

export function getTestScenarios(): TestScenario[] {
  return SCENARIO_DATA.map((scenario) => ({
    ...scenario,
    setup: (app: AppRuntime) => SETUP_BY_NAME[scenario.setupName](app, { ...scenario, setup: () => null as never }),
  }));
}

export function loadTestScenario(app: AppRuntime, scenarioId: string): TestScenarioResult {
  const scenario = getTestScenarios().find((item) => item.id === scenarioId);
  if (!scenario) {
    return {
      ok: false,
      scenarioId,
      message: `找不到测试局：${scenarioId}`,
      phase: app.state.phase,
      injectedProductIds: [],
      injectedCustomerOrderIds: [],
      selectedProductId: app.state.dayState.selectedProductId,
      selectedCustomerId: app.state.dayState.selectedCustomerId,
      selectedPricingModeId: app.state.dayState.selectedPricingModeId,
      expected: [],
    };
  }

  try {
    const result = scenario.setup(app);
    app.state.result = RunResult.InProgress;
    app.state.runReport = app.state.phase === RunPhase.RunEnd || app.state.phase === RunPhase.RunFailed ? generateRunReport(app) : null;
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    app.state.runLog.push(`[Debug] 测试局加载失败：${message}`);
    return {
      ok: false,
      scenarioId,
      message,
      phase: app.state.phase,
      injectedProductIds: [],
      injectedCustomerOrderIds: [],
      selectedProductId: app.state.dayState.selectedProductId,
      selectedCustomerId: app.state.dayState.selectedCustomerId,
      selectedPricingModeId: app.state.dayState.selectedPricingModeId,
      expected: scenario.expected,
    };
  }
}
