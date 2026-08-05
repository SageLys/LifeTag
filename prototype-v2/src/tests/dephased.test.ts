import { describe, it, expect, beforeEach } from 'vitest';
import { createAppRuntime } from '../core/createAppRuntime';
import {
  buyProduct,
  selectProduct,
  selectCustomerOrder,
  selectPricingMode,
  confirmSell,
  useBaseAction,
  getBaseActionDisabledReason,
  canPlayCard,
  drawHand,
} from '../core/actions';
import { getBuyProductDisabledReason } from '../core/selectors';
import type { AppRuntime, ProductInstance } from '../core/types';

// 所有已被移除的“阶段门槛”玩家文案。任何玩家操作的失败原因都不应再等于它们。
const REMOVED_PHASE_TEXTS = [
  '只能在进货阶段买入',
  '请先进入进货阶段',
  '请先进入接客阶段',
  '请返回处理阶段后再操作。',
  '请在处理阶段使用卡牌。',
  '当前阶段不是出售阶段。',
  '只能在处理阶段或出售阶段选择交易商品。',
  '只能在处理阶段或出售阶段选择定价方式。',
];

// 选出当前现金买得起的最便宜候选商品。
function cheapestAffordable(app: AppRuntime): ProductInstance | null {
  const affordable = app.state.dayState.productCandidates
    .filter((p) => p.cost <= app.state.cash)
    .sort((a, b) => a.cost - b.cost);
  return affordable[0] ?? null;
}

describe('de-phased gameplay (玩家无需点击“推进阶段”)', () => {
  let app: AppRuntime;

  beforeEach(() => {
    app = createAppRuntime();
  });

  it('1. 新局开始即可看到新闻 / 商品候选 / 顾客订单（未推进任何阶段）', () => {
    expect(app.state.dayState.marketEvents.length).toBeGreaterThan(0);
    expect(app.state.dayState.productCandidates.length).toBeGreaterThan(0);
    expect(app.state.dayState.customerOrders.length).toBeGreaterThan(0);
  });

  it('2. 不推进阶段也可以买入商品', () => {
    const candidate = cheapestAffordable(app);
    expect(candidate).not.toBeNull();
    const result = buyProduct(app, candidate!.id);
    expect(result.ok).toBe(true);
    expect(app.state.inventory.length).toBe(1);
  });

  it('3. 不推进阶段也可以选择库存商品与顾客', () => {
    const candidate = cheapestAffordable(app)!;
    buyProduct(app, candidate.id);
    const sel = selectProduct(app, candidate.id);
    expect(sel.ok).toBe(true);
    const order = app.state.dayState.customerOrders[0];
    selectCustomerOrder(app, order.id);
    expect(app.state.dayState.selectedCustomerOrderId).toBe(order.id);
  });

  it('4. 不推进阶段也可以鉴定 / 包装 / 公关', () => {
    const candidate = cheapestAffordable(app)!;
    buyProduct(app, candidate.id); // 买入会自动选中该商品
    // 包装对任意新库存商品都可用
    const pkg = useBaseAction(app, 'action_package');
    expect(pkg.ok).toBe(true);
    // 鉴定 / 公关即使暂时不可用，其原因也绝不是“阶段”门槛文案
    expect(getBaseActionDisabledReason(app, 'action_identify')).not.toBe('请返回处理阶段后再操作。');
    expect(getBaseActionDisabledReason(app, 'action_pr')).not.toBe('请返回处理阶段后再操作。');
  });

  it('5. 不推进阶段也可以抽牌，且用牌校验不再依赖阶段', () => {
    const draw = drawHand(app);
    expect(draw.ok).toBe(true);
    expect(app.state.deckState.hand.length).toBeGreaterThan(0);
    // 再次抽牌应被 drawnToday 限制（而非阶段限制）
    expect(drawHand(app).ok).toBe(false);

    const first = app.state.deckState.hand[0];
    const reason = canPlayCard(app, first.instanceId ?? first.id).reason;
    expect(reason).not.toBe('请在处理阶段使用卡牌。');
  });

  it('6. 不推进阶段也可以选择定价方式并出售', () => {
    const candidate = cheapestAffordable(app)!;
    buyProduct(app, candidate.id);
    selectProduct(app, candidate.id);
    selectCustomerOrder(app, app.state.dayState.customerOrders[0].id);
    const price = selectPricingMode(app, 'pricing_normal');
    expect(price.ok).toBe(true);
    const sell = confirmSell(app);
    expect(sell.message).not.toBe('当前阶段不是出售阶段。');
    expect(sell.ok).toBe(true);
    expect(app.state.dayState.soldProductCount).toBe(1);
  });

  it('7. 买入失败原因不再出现“只能在进货阶段买入”', () => {
    const r = buyProduct(app, 'nonexistent_product');
    expect(r.ok).toBe(false);
    expect(r.message).not.toBe('只能在进货阶段买入');
    // 真实候选在初始即可买入，disabledReason 为 null（绝不会是阶段文案）
    const reason = getBuyProductDisabledReason(app, app.state.dayState.productCandidates[0]);
    expect(reason).not.toBe('只能在进货阶段买入');
  });

  it('8. 加工失败原因不再出现“请返回处理阶段后再操作”', () => {
    // 未选中商品 → 返回具体原因，而非阶段文案
    const reason = getBaseActionDisabledReason(app, 'action_package');
    expect(reason).not.toBe('请返回处理阶段后再操作。');
    expect(reason).toBe('请选择一个库存商品。');
  });

  it('9. 出售失败原因不再出现“当前阶段不是出售阶段”', () => {
    const sell = confirmSell(app);
    expect(sell.ok).toBe(false);
    expect(sell.message).not.toBe('当前阶段不是出售阶段。');
  });

  it('综合：任意操作的反馈文案都不含已移除的阶段门槛文案', () => {
    const messages: string[] = [];
    messages.push(buyProduct(app, 'nope').message);
    messages.push(useBaseAction(app, 'action_package').message);
    messages.push(useBaseAction(app, 'action_identify').message);
    messages.push(confirmSell(app).message);
    messages.push(selectPricingMode(app, 'pricing_blind_box').message);
    const candidate = cheapestAffordable(app);
    if (candidate) {
      buyProduct(app, candidate.id);
      messages.push(selectProduct(app, candidate.id).message);
      messages.push(selectPricingMode(app, 'pricing_normal').message);
    }
    for (const m of messages) {
      for (const phaseText of REMOVED_PHASE_TEXTS) {
        expect(m.includes(phaseText), `不应出现阶段文案：「${phaseText}」实际：「${m}」`).toBe(false);
      }
    }
  });
});
