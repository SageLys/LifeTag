import { DarkRiskRevealLevel, ProductStatus, RunPhase, RunResult, TagSource } from './constants';
import { createNewGame } from './gameState';
import { generateRunReport } from './runReport';
import { ensureRewardState, generateRewardOptions } from './rules_rewards';
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
  ensureRewardState(app);
  app.state.dayState.rewardOptions = [
    ...(app.state.dayState.rewardState?.maintenanceOptions ?? []),
    ...(app.state.dayState.rewardState?.freeBuildOptions ?? generateRewardOptions(app)),
    ...(app.state.dayState.rewardState?.paidShopOptions ?? []),
    ...(app.state.dayState.rewardState?.bonusOptions ?? []),
  ];
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

function scenarioRewardAllTypes(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13101);
  syncPhase(app, RunPhase.DayReward);
  app.state.cash = 300;
  app.state.dayState.dailyProfit = 140;
  app.state.dayState.maxSingleDealProfit = 120;
  const product = createProduct(app);
  app.state.inventory = [product];
  app.state.deckState.drawPile = [];
  app.state.deckState.hand = [];
  app.state.deckState.discardPile = [
    'card_low_salary_pitch',
    'card_decent_package',
    'card_crazy_persona',
    'card_background_check',
    'card_pr_package',
    'card_risk_underwriting',
    'card_hot_search_warmup',
  ].map((cardId) => ({ id: `debug_${cardId}_${app.state.nextInstanceCounter++}`, instanceId: `debug_${cardId}_${app.state.nextInstanceCounter++}`, cardId, cardDefId: cardId, upgraded: false, createdDay: 1 }));
  ensureRewards(app);
  return makeResult(app, scenario, [product]);
}

function scenarioCardUpgradeEffect(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13102);
  syncPhase(app, RunPhase.DayProcess);
  const product = createProduct(app, { basePrice: 50, baseRisk: 0, hiddenTagIds: [], darkRiskIds: [] });
  const order = createOrder(app, { budget: 500, tabooTagIds: [], riskTolerance: 100 });
  app.state.inventory = [product];
  app.state.dayState.actionPoints = 4;
  app.state.cash = 200;
  addHandCard(app, 'card_low_salary_pitch');
  app.state.deckState.discardPile.push({ id: `debug_upgrade_${app.state.nextInstanceCounter++}`, instanceId: `debug_upgrade_${app.state.nextInstanceCounter++}`, cardId: 'card_low_salary_pitch', cardDefId: 'card_low_salary_pitch', upgraded: false, createdDay: 1 });
  selectDeal(app, product, order, 'pricing_normal');
  return makeResult(app, scenario, [product], [order]);
}

function scenarioPassiveInsuranceTrigger(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13103);
  syncPhase(app, RunPhase.DaySell);
  app.state.cash = 200;
  app.state.reputation = 80;
  app.state.temporaryInsurances.push({
    id: 'debug_major_insurance',
    sourceRewardId: 'debug',
    displayName: 'Debug 重大事故保险',
    gainedDay: 1,
    remainingUses: 1,
    config: { accidentLevels: ['major', 'severe'], modifiers: [{ stat: 'fine', op: 'multiply', value: 0.5 }, { stat: 'reputationLoss', op: 'add', value: -10 }], uses: 1 },
  });
  const { product, order } = highRiskDeal(app);
  product.baseRisk = 90;
  selectDeal(app, product, order, 'pricing_high');
  return makeResult(app, scenario, [product], [order]);
}

function scenarioSupplySourceGeneration(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13104);
  syncPhase(app, RunPhase.DayPurchase);
  app.state.activeSupplySources.push({ supplySourceId: 'supply_flow_frozen_meat', gainedDay: 1, remainingDays: 2, source: 'debug' });
  app.state.dayState.productCandidates = [];
  app.state.dayState.productCandidateIds = [];
  return makeResult(app, scenario);
}

function scenarioRewardBonusTrigger(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13105);
  syncPhase(app, RunPhase.DayReward);
  app.state.cash = 180;
  app.state.dayState.dailyProfit = 130;
  ensureRewards(app);
  return makeResult(app, scenario);
}

function scenarioV3SameProductMcn(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13301);
  syncPhase(app, RunPhase.DaySell);
  const template = firstTemplate(app, (item) => item.id === 'product_abstract_crazy_meat');
  const product = createProduct(app, { template, visibleTagIds: ['tag_absurd', 'tag_crazy'], hiddenTagIds: [], darkRiskIds: [] });
  const customer = firstCustomer(app, (item) => item.id === 'customer_short_video_mcn');
  const order = createOrder(app, { customer, budget: 300, riskTolerance: customer.riskTolerance });
  selectDeal(app, product, order, 'pricing_normal');
  return makeResult(app, scenario, [product], [order]);
}

function scenarioV3SameProductParent(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13302);
  syncPhase(app, RunPhase.DaySell);
  const template = firstTemplate(app, (item) => item.id === 'product_abstract_crazy_meat');
  const product = createProduct(app, { template, visibleTagIds: ['tag_absurd', 'tag_crazy'], hiddenTagIds: [], darkRiskIds: [] });
  const customer = firstCustomer(app, (item) => item.id === 'customer_parent_committee');
  const order = createOrder(app, { customer, budget: 300, riskTolerance: customer.riskTolerance });
  selectDeal(app, product, order, 'pricing_normal');
  return makeResult(app, scenario, [product], [order]);
}

function scenarioV3PlatformDarkRiskMcn(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13303);
  syncPhase(app, RunPhase.DaySell);
  const template = firstTemplate(app, (item) => item.id === 'product_controversial_flow_meat');
  const product = createProduct(app, { template, darkRiskIds: ['dark_platform_shadowban'], hiddenTagIds: [], darkRiskRevealLevels: { dark_platform_shadowban: DarkRiskRevealLevel.Hidden } });
  const customer = firstCustomer(app, (item) => item.id === 'customer_short_video_mcn');
  const order = createOrder(app, { customer, budget: 300, riskTolerance: customer.riskTolerance });
  selectDeal(app, product, order, 'pricing_normal');
  return makeResult(app, scenario, [product], [order]);
}

function scenarioV3PlatformDarkRiskStartup(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13304);
  syncPhase(app, RunPhase.DaySell);
  const template = firstTemplate(app, (item) => item.id === 'product_controversial_flow_meat');
  const product = createProduct(app, { template, darkRiskIds: ['dark_platform_shadowban'], hiddenTagIds: [], darkRiskRevealLevels: { dark_platform_shadowban: DarkRiskRevealLevel.Hidden } });
  const customer = firstCustomer(app, (item) => item.id === 'customer_startup_boss');
  const order = createOrder(app, { customer, budget: 300, riskTolerance: customer.riskTolerance });
  selectDeal(app, product, order, 'pricing_normal');
  return makeResult(app, scenario, [product], [order]);
}

function scenarioV3ConditionalCrazyCardMcn(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13305);
  syncPhase(app, RunPhase.DaySell);
  const template = firstTemplate(app, (item) => item.id === 'product_abstract_crazy_meat');
  const product = createProduct(app, { template, visibleTagIds: ['tag_absurd'], appliedTagIds: ['tag_crazy'], hiddenTagIds: [], darkRiskIds: [] });
  product.dealModifiers = [{ stat: 'risk', op: 'add', value: 50, sourceType: 'card', sourceId: 'card_crazy_persona', displayText: 'parent only risk', condition: { type: 'customer_is', params: { customerId: 'customer_parent_committee' } } }];
  const customer = firstCustomer(app, (item) => item.id === 'customer_short_video_mcn');
  const order = createOrder(app, { customer, budget: 300, riskTolerance: customer.riskTolerance });
  selectDeal(app, product, order, 'pricing_normal');
  return makeResult(app, scenario, [product], [order]);
}

function scenarioV3AppliedTagTool(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13306);
  syncPhase(app, RunPhase.DaySell);
  const template = firstTemplate(app, (item) => item.id === 'product_controversial_flow_meat');
  const product = createProduct(app, { template, appliedTagIds: ['tag_controversial'], hiddenTagIds: [], darkRiskIds: [] });
  const customer = firstCustomer(app, (item) => item.id === 'customer_parent_committee');
  const order = createOrder(app, { customer, budget: 300, riskTolerance: customer.riskTolerance });
  selectDeal(app, product, order, 'pricing_normal');
  return makeResult(app, scenario, [product], [order]);
}

function scenarioV3OverToleranceParent(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13307);
  syncPhase(app, RunPhase.DaySell);
  const template = firstTemplate(app, (item) => item.id === 'product_stable_marriage_meat');
  const product = createProduct(app, { template, baseRisk: 45, hiddenTagIds: [], darkRiskIds: [] });
  const customer = firstCustomer(app, (item) => item.id === 'customer_parent_committee');
  const order = createOrder(app, { customer, budget: 300, riskTolerance: 30, maxRisk: 30 });
  selectDeal(app, product, order, 'pricing_normal');
  return makeResult(app, scenario, [product], [order]);
}

// ============================================================
// v2 MCN Debug 测试场景（Task #8）
// ============================================================

/**
 * 场景 A：MCN 高适配安全单
 * 商品：抽象发疯肉（tag_absurd + tag_crazy，无隐藏标签，无暗风险）
 * 顾客：短视频 MCN（riskTolerance=85）
 * 定价：normal
 * 预期：风险值较低（仅商品 baseRisk=10 + 定价 0），不触发爆雷
 * 验收：riskBreakdown 中无 customer_taboo 项；flow 标签不超过 2 个，无 flow_overload
 */
function scenarioMcnSafeDeal(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13201);
  syncPhase(app, RunPhase.DaySell);

  const mcnTemplate = app.configs.productTemplates.find((t) => t.id === 'product_abstract_crazy_meat') ?? firstTemplate(app);
  const product = createProduct(app, {
    template: mcnTemplate,
    displayName: 'Debug MCN 安全单（抽象发疯肉）',
    baseRisk: 10,
    cost: 25,
    basePrice: 45,
    visibleTagIds: ['tag_absurd', 'tag_crazy'],
    hiddenTagIds: [],
    darkRiskIds: [],
  });

  const mcnCustomer = firstCustomer(app, (c) => c.id === 'customer_short_video_mcn');
  const order = createOrder(app, {
    customer: mcnCustomer,
    displayName: 'Debug 短视频 MCN（安全单）',
    budget: 250,
    riskTolerance: 85,
    maxRisk: 85,
    tabooTagIds: ['tag_boring', 'tag_stable', 'tag_decent'],
    darkRiskSensitivity: ['platform'],
  });

  selectDeal(app, product, order, 'pricing_normal');
  return makeResult(app, scenario, [product], [order]);
}

/**
 * 场景 B：MCN 流量过载
 * 商品：带 4 个 flow 标签（tag_crazy / tag_absurd / tag_controversial / tag_rebellious）
 * 顾客：短视频 MCN
 * 定价：normal
 * 预期：触发 flowOverloadRisk（4 个 flow 标签 → riskAdd=15）
 * 验收：riskBreakdown 中有 flow_overload 项，value = 15
 */
function scenarioMcnFlowOverload(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13202);
  syncPhase(app, RunPhase.DaySell);

  const baseTemplate = app.configs.productTemplates.find((t) => t.id === 'product_controversial_flow_meat') ?? firstTemplate(app);
  const product = createProduct(app, {
    template: baseTemplate,
    displayName: 'Debug MCN 流量过载商品（4 flow 标签）',
    baseRisk: 12,
    cost: 30,
    basePrice: 55,
    // 4 个 flow 标签 → 触发 flowOverloadRisk riskAdd=15
    visibleTagIds: ['tag_controversial', 'tag_rebellious'],
    appliedTagIds: ['tag_crazy', 'tag_absurd'],
    hiddenTagIds: [],
    darkRiskIds: [],
  });

  const mcnCustomer = firstCustomer(app, (c) => c.id === 'customer_short_video_mcn');
  const order = createOrder(app, {
    customer: mcnCustomer,
    displayName: 'Debug 短视频 MCN（流量过载）',
    budget: 250,
    riskTolerance: 85,
    maxRisk: 85,
    tabooTagIds: ['tag_boring', 'tag_stable', 'tag_decent'],
    darkRiskSensitivity: ['platform'],
  });

  selectDeal(app, product, order, 'pricing_normal');
  return makeResult(app, scenario, [product], [order]);
}

/**
 * 场景 C：MCN + 平台暗风险 + 高价卖
 * 商品：争议流量肉（tag_controversial + tag_rebellious），附加平台限流暗风险（dark_platform_shadowban）
 * 顾客：短视频 MCN（darkRiskSensitivity = ['platform']）
 * 定价：high（riskDelta=+15）
 * 预期：暗风险全额计入（actualRiskDefault=25），高价 +15，总风险较高
 * 验收：dark_risk breakdown 显示全额（非 30% 折扣）；pricing_mode breakdown = +15
 */
function scenarioMcnDarkRiskHighPrice(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13203);
  syncPhase(app, RunPhase.DaySell);

  const baseTemplate = app.configs.productTemplates.find((t) => t.id === 'product_controversial_flow_meat') ?? firstTemplate(app);
  const product = createProduct(app, {
    template: baseTemplate,
    displayName: 'Debug MCN 平台暗风险 + 高价',
    baseRisk: 12,
    cost: 30,
    basePrice: 55,
    visibleTagIds: ['tag_controversial', 'tag_rebellious'],
    hiddenTagIds: [],
    darkRiskIds: ['dark_platform_shadowban'],
    revealedDarkRiskIds: ['dark_platform_shadowban'],
    darkRiskRevealLevels: { dark_platform_shadowban: DarkRiskRevealLevel.Revealed },
  });

  const mcnCustomer = firstCustomer(app, (c) => c.id === 'customer_short_video_mcn');
  const order = createOrder(app, {
    customer: mcnCustomer,
    displayName: 'Debug 短视频 MCN（平台暗风险）',
    budget: 350,
    riskTolerance: 85,
    maxRisk: 85,
    tabooTagIds: ['tag_boring', 'tag_stable', 'tag_decent'],
    darkRiskSensitivity: ['platform'],
  });

  selectDeal(app, product, order, 'pricing_high');
  return makeResult(app, scenario, [product], [order]);
}

/**
 * 场景 D：MCN 流派标签错卖给家长委员会
 * 商品：抽象发疯肉（tag_absurd + tag_crazy）
 * 顾客：家长委员会（tabooTagIds 含 tag_crazy，riskTolerance=30）
 * 定价：normal
 * 预期：tag_crazy 命中 tabooTagRiskBonus（家长委员会 tag_crazy = 30），风险超出容忍值
 * 验收：riskBreakdown 中 customer_taboo 项 value=30；最终风险 > 30（顾客容忍上限）
 */
function scenarioWrongCustomerParent(app: AppRuntime, scenario: TestScenario): TestScenarioResult {
  resetRun(app, 13204);
  syncPhase(app, RunPhase.DaySell);

  const mcnTemplate = app.configs.productTemplates.find((t) => t.id === 'product_abstract_crazy_meat') ?? firstTemplate(app);
  const product = createProduct(app, {
    template: mcnTemplate,
    displayName: 'Debug 抽象发疯肉（错卖给家长）',
    baseRisk: 10,
    cost: 25,
    basePrice: 45,
    visibleTagIds: ['tag_absurd', 'tag_crazy'],
    hiddenTagIds: [],
    darkRiskIds: [],
  });

  const parentCustomer = firstCustomer(app, (c) => c.id === 'customer_parent_committee');
  const order = createOrder(app, {
    customer: parentCustomer,
    displayName: 'Debug 家长委员会（错误接单）',
    budget: 260,
    riskTolerance: 30,
    maxRisk: 30,
    tabooTagIds: ['tag_fake_quality', 'tag_rebellious', 'tag_controversial', 'tag_crazy'],
    darkRiskSensitivity: ['persona', 'career_background'],
  });

  selectDeal(app, product, order, 'pricing_normal');
  return makeResult(app, scenario, [product], [order]);
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
  {
    id: 'TEST_REWARD_ALL_TYPES',
    displayName: '新版收店奖励全类型局',
    description: '直接进入 DAY_REWARD，现金充足、牌组可升级且可删牌，检查 8 类 RewardType。',
    targetPhase: RunPhase.DayReward,
    setupName: 'rewardAllTypes',
    expected: ['现金 = 300', '显示维护/免费构筑/付费商店/爆单四区', 'add/upgrade/remove/passive/supply/insurance/cash/reputation 可见或可触发。'],
    manualSteps: ['领取维护奖励、选择免费构筑、购买多个付费奖励、选择爆单奖励，再结束收店。'],
  },
  {
    id: 'TEST_CARD_UPGRADE_EFFECT',
    displayName: '升级卡牌数值差异局',
    description: '验证低薪接受话术升级前后售价修正从 +25 变为 +40。',
    targetPhase: RunPhase.DayProcess,
    setupName: 'cardUpgradeEffect',
    expected: ['手牌有 card_low_salary_pitch', '升级为 plus 后卡牌 UI 显示 plus', '打出后交易预览售价修正为 +40。'],
    manualSteps: ['可先进入收店用升级奖励，或在 Debug JSON 中确认 upgradedCardId；打出卡牌后看交易预览。'],
  },
  {
    id: 'TEST_PASSIVE_INSURANCE_TRIGGER',
    displayName: '被动与重大保险事故局',
    description: '构造大事故并给玩家重大事故保险，验证保险链条。',
    targetPhase: RunPhase.DaySell,
    setupName: 'passiveInsuranceTrigger',
    expected: ['temporaryInsurances 显示 1 个', '确认出售触发 major/severe 事故', '事故链条显示罚款和信誉损失前后变化，保险消耗。'],
    manualSteps: ['点击确认出售，查看事故弹窗和店铺状态面板。'],
  },
  {
    id: 'TEST_SUPPLY_SOURCE_GENERATION',
    displayName: '货源影响商品生成局',
    description: '给予流量冻肉货源，进入进货阶段观察 MCN/发疯/抽象/争议商品权重。',
    targetPhase: RunPhase.DayPurchase,
    setupName: 'supplySourceGeneration',
    expected: ['activeSupplySources 包含 supply_flow_frozen_meat', '商品候选更偏流量/发疯/抽象/争议。'],
    manualSteps: ['若未自动生成，点击阶段刷新或重新加载场景后查看商品候选。'],
  },
  {
    id: 'TEST_REWARD_BONUS_TRIGGER',
    displayName: '爆单奖励触发局',
    description: '设置当日利润 >= 120 后进入 DAY_REWARD。',
    targetPhase: RunPhase.DayReward,
    setupName: 'rewardBonusTrigger',
    expected: ['bonusUnlocked = true', '爆单奖励区域显示 3 个选项。'],
    manualSteps: ['查看爆单奖励区域，选择一个或跳过。'],
  },
  {
    id: 'V3_SAME_PRODUCT_MCN',
    displayName: '[V3] same product to MCN',
    description: 'product_abstract_crazy_meat sold to MCN should have low risk versus family customers.',
    targetPhase: RunPhase.DaySell,
    setupName: 'v3SameProductMcn',
    expected: ['riskMin/riskMax clearly lower than V3_SAME_PRODUCT_PARENT', 'customer_trait and customer_fit participate in breakdown'],
    manualSteps: ['Compare deal_preview with V3_SAME_PRODUCT_PARENT.'],
  },
  {
    id: 'V3_SAME_PRODUCT_PARENT',
    displayName: '[V3] same product to parent committee',
    description: 'Same abstract/crazy product sold to parent committee should be high risk.',
    targetPhase: RunPhase.DaySell,
    setupName: 'v3SameProductParent',
    expected: ['riskMin/riskMax clearly higher than V3_SAME_PRODUCT_MCN', 'family traits and taboo risks appear'],
    manualSteps: ['Compare deal_preview with V3_SAME_PRODUCT_MCN.'],
  },
  {
    id: 'V3_PLATFORM_DARK_MCN',
    displayName: '[V3] platform dark risk preview MCN',
    description: 'Unrevealed platform dark risk should preview high for MCN.',
    targetPhase: RunPhase.DaySell,
    setupName: 'v3PlatformDarkRiskMcn',
    expected: ['unknownRiskBreakdown dark_risk range is multiplied by MCN platform multiplier'],
    manualSteps: ['Compare riskMax with V3_PLATFORM_DARK_STARTUP.'],
  },
  {
    id: 'V3_PLATFORM_DARK_STARTUP',
    displayName: '[V3] platform dark risk preview startup',
    description: 'Same unrevealed platform dark risk should preview much lower for startup boss.',
    targetPhase: RunPhase.DaySell,
    setupName: 'v3PlatformDarkRiskStartup',
    expected: ['riskMax lower than V3_PLATFORM_DARK_MCN for the same dark risk'],
    manualSteps: ['Compare unknownRiskBreakdown with V3_PLATFORM_DARK_MCN.'],
  },
  {
    id: 'V3_CONDITIONAL_CRAZY_CARD_MCN',
    displayName: '[V3] conditional card modifier to MCN',
    description: 'Parent-only risk modifier from card_crazy_persona must not affect MCN.',
    targetPhase: RunPhase.DaySell,
    setupName: 'v3ConditionalCrazyCardMcn',
    expected: ['riskBreakdown has no parent-only card_crazy_persona risk item'],
    manualSteps: ['Inspect deal_preview.riskBreakdown.'],
  },
  {
    id: 'V3_APPLIED_TAG_TOOL',
    displayName: '[V3] tag tool applied tag',
    description: 'Controversy hook style product must contain appliedTagIds and trigger customer-specific risk.',
    targetPhase: RunPhase.DaySell,
    setupName: 'v3AppliedTagTool',
    expected: ['selected_product.appliedTagIds includes tag_controversial', 'family risk or claim mismatch participates'],
    manualSteps: ['Inspect selected_product and deal_preview.'],
  },
  {
    id: 'V3_OVER_TOLERANCE_PARENT',
    displayName: '[V3] over tolerance accident add',
    description: 'finalRisk around 45 for parent committee should trigger overTolerance accident level +1.',
    targetPhase: RunPhase.DaySell,
    setupName: 'v3OverToleranceParent',
    expected: ['confirm sell should include customer_over_tolerance_accident_add in accident chain'],
    manualSteps: ['Confirm sell, then inspect last_deal.accidentLevelModifierBreakdown.'],
  },
  // ============================================================
  // v2 MCN Debug 场景（Task #8）
  // ============================================================
  {
    id: 'MCN_A_SAFE_DEAL',
    displayName: '[MCN-A] 高适配安全单',
    description: '商品带 2 个 flow 标签卖给 MCN，无雷区命中，无暗风险，normal 定价。预期风险低，无 flow_overload，无 customer_taboo。',
    targetPhase: RunPhase.DaySell,
    setupName: 'mcnSafeDeal',
    expected: [
      'riskBreakdown 无 customer_taboo 项',
      'riskBreakdown 无 flow_overload 项（flow 标签 ≤ 2）',
      '最终风险 ≈ 商品 baseRisk(10) + 定价(0) = 10',
      '风险远低于 MCN riskTolerance(85)',
    ],
    manualSteps: ['查看 DealPreview 风险 breakdown，确认只有商品来源风险和定价两项。'],
  },
  {
    id: 'MCN_B_FLOW_OVERLOAD',
    displayName: '[MCN-B] 流量过载（4 flow 标签）',
    description: '商品带 4 个 flow 标签（tag_crazy/tag_absurd/tag_controversial/tag_rebellious）卖给 MCN。预期触发 flowOverloadRisk riskAdd=15。',
    targetPhase: RunPhase.DaySell,
    setupName: 'mcnFlowOverload',
    expected: [
      'riskBreakdown 含 flow_overload 项，value = 15',
      '标签说明为"流量标签过载（4 个流量标签）：+15"',
      '最终风险 ≈ 12 + 0 + 15 = 27',
    ],
    manualSteps: ['查看 DealPreview 风险 breakdown，确认 flow_overload 项存在且数值为 15。'],
  },
  {
    id: 'MCN_C_DARK_RISK_HIGH_PRICE',
    displayName: '[MCN-C] 平台暗风险 + 高价卖',
    description: '商品含已揭示平台限流暗风险，卖给 darkRiskSensitivity=["platform"] 的 MCN，高价定价 +15。预期暗风险全额 25 计入（非 30% 折扣）。',
    targetPhase: RunPhase.DaySell,
    setupName: 'mcnDarkRiskHighPrice',
    expected: [
      'riskBreakdown 含 dark_risk 项，value = 25（全额，无"非敏感顾客"标注）',
      'riskBreakdown 含 pricing_mode 项，value = 15（高价卖）',
      '最终风险 ≈ 12 + 25 + 15 = 52',
      '仍低于 MCN riskTolerance(85)，不触发爆雷',
    ],
    manualSteps: ['查看 DealPreview 风险 breakdown，确认暗风险全额计入，高价加 15。'],
  },
  {
    id: 'MCN_D_WRONG_CUSTOMER_PARENT',
    displayName: '[MCN-D] MCN 标签错卖家长委员会',
    description: '抽象发疯肉（tag_absurd + tag_crazy）错卖给家长委员会（taboo: tag_crazy +30）。预期风险严重超出家长容忍值（30）。',
    targetPhase: RunPhase.DaySell,
    setupName: 'wrongCustomerParent',
    expected: [
      'riskBreakdown 含 customer_taboo 项（tag_crazy），value = 30',
      '最终风险 ≈ 10 + 30 + 0 = 40，超出家长委员会 riskTolerance(30)',
      '确认出售后应触发事故',
    ],
    manualSteps: ['查看 DealPreview 风险 breakdown，确认雷区 [会发疯] +30 项。点击确认出售后查看事故。'],
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
  rewardAllTypes: scenarioRewardAllTypes,
  cardUpgradeEffect: scenarioCardUpgradeEffect,
  passiveInsuranceTrigger: scenarioPassiveInsuranceTrigger,
  supplySourceGeneration: scenarioSupplySourceGeneration,
  rewardBonusTrigger: scenarioRewardBonusTrigger,
  v3SameProductMcn: scenarioV3SameProductMcn,
  v3SameProductParent: scenarioV3SameProductParent,
  v3PlatformDarkRiskMcn: scenarioV3PlatformDarkRiskMcn,
  v3PlatformDarkRiskStartup: scenarioV3PlatformDarkRiskStartup,
  v3ConditionalCrazyCardMcn: scenarioV3ConditionalCrazyCardMcn,
  v3AppliedTagTool: scenarioV3AppliedTagTool,
  v3OverToleranceParent: scenarioV3OverToleranceParent,
  // v2 MCN 场景
  mcnSafeDeal: scenarioMcnSafeDeal,
  mcnFlowOverload: scenarioMcnFlowOverload,
  mcnDarkRiskHighPrice: scenarioMcnDarkRiskHighPrice,
  wrongCustomerParent: scenarioWrongCustomerParent,
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
