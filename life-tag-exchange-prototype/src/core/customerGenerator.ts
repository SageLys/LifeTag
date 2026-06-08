import { createCustomerOrderId } from './ids';
import { createRng, pickOne, shuffle } from './rng';
import type { AppRuntime, CustomerDef, CustomerOrder } from './types';

function nextOrderId(app: AppRuntime): string {
  const id = createCustomerOrderId(app.state.nextInstanceCounter);
  app.state.nextInstanceCounter += 1;
  return id;
}

function addRunLog(app: AppRuntime, message: string): void {
  app.state.runLog.push(message);
  app.state.dayState.log.push(message);
}

function createOrderFromCustomer(app: AppRuntime, customer: CustomerDef): CustomerOrder {
  const darkRiskSensitivity = app.configs.darkRisks
    .filter((risk) => risk.sensitiveCustomerIds.includes(customer.id))
    .map((risk) => risk.category);
  const uniqueDarkRiskSensitivity = [...new Set(darkRiskSensitivity)];
  const budget = Math.max(1, 100 - customer.priceSensitivity + customer.riskTolerance);

  return {
    id: nextOrderId(app),
    customerId: customer.id,
    displayName: customer.displayName,
    budget,
    riskTolerance: customer.riskTolerance,
    preferredTagIds: [...customer.preferredTagIds],
    tabooTagIds: [...customer.tabooTagIds],
    darkRiskSensitivity: uniqueDarkRiskSensitivity,
    maxRisk: customer.riskTolerance,
    pricingModeIds: [...customer.preferredPricingModeIds],
    specialRules: customer.description ? [customer.description] : [],
  };
}

export function generateCustomerOrders(app: AppRuntime, count = app.configs.gameConfig.dailyCustomerOrderCount): CustomerOrder[] {
  if (app.state.dayState.customerOrders.length > 0) {
    return app.state.dayState.customerOrders;
  }

  const customers = app.configs.customers;
  if (customers.length === 0) {
    app.state.dayState.customerOrders = [];
    app.state.dayState.customerOrderIds = [];
    addRunLog(app, `[第 ${app.state.currentDay} 天][DAY_CUSTOMER] 已生成 0 个顾客订单。`);
    return [];
  }

  const rng = createRng(app.state.rngState);
  const orderCount = Math.max(0, count);
  const shuffledCustomers = shuffle(rng, customers);
  const orders = Array.from({ length: orderCount }, (_, index) => {
    const customer = shuffledCustomers[index] ?? pickOne(rng, customers);
    return createOrderFromCustomer(app, customer);
  });

  app.state.rngState = rng.value;
  app.state.dayState.customerOrders = orders;
  app.state.dayState.customerOrderIds = orders.map((order) => order.id);
  addRunLog(app, `[第 ${app.state.currentDay} 天][DAY_CUSTOMER] 已生成 ${orders.length} 个顾客订单。`);

  return orders;
}
