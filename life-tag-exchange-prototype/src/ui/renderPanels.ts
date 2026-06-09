import { RunPhase } from '../core/constants';
import type { AppRuntime } from '../core/types';
import { escapeHtml } from './formatters';

interface PhasePanelCopy {
  title: string;
  description: string;
  placeholder: string;
}

const PHASE_COPY: Partial<Record<RunPhase, PhasePanelCopy>> = {
  [RunPhase.RunInit]: {
    title: '等待开始',
    description: '点击开始新局后进入第 1 天开店阶段。',
    placeholder: '将初始化状态、初始牌组并生成第 1 天市场新闻。',
  },
  [RunPhase.DayOpening]: {
    title: '开店阶段',
    description: '阅读今日市场新闻。',
    placeholder: '市场新闻会影响后续交易预览中的价格或风险修正。',
  },
  [RunPhase.DayPurchase]: {
    title: '进货阶段',
    description: '查看今日商品候选，并可在限制内买入库存。',
    placeholder: '买入会扣现金并加入库存。',
  },
  [RunPhase.DayCustomer]: {
    title: '接单阶段',
    description: '查看今日顾客订单。',
    placeholder: '顾客偏好、雷区和预算会进入交易预览。',
  },
  [RunPhase.DayDraw]: {
    title: '抽牌阶段',
    description: '进入本阶段时自动抽取每日经营手牌。',
    placeholder: '抽牌堆不足时会洗入弃牌堆。',
  },
  [RunPhase.DayProcess]: {
    title: '处理阶段',
    description: '选择库存商品并使用基础操作或卡牌处理风险。',
    placeholder: '处理会刷新商品状态、定价可用性和交易预览。',
  },
  [RunPhase.DaySell]: {
    title: '出售阶段',
    description: '选择商品、顾客和定价方式后确认出售。',
    placeholder: '每日允许多次出售；结束后进入日结。',
  },
  [RunPhase.DayResolve]: {
    title: '结算阶段',
    description: '查看今日成交、事故和资源变化。',
    placeholder: '确认无误后进入收店奖励。',
  },
  [RunPhase.DayReward]: {
    title: '收店阶段',
    description: '选择一个收店奖励。',
    placeholder: '选择后进入下一天；第 8 天选择后进入最终清算。',
  },
  [RunPhase.RunEnd]: {
    title: '本局胜利',
    description: '最终报告已生成。',
    placeholder: '胜利条件只使用累计利润目标，并要求现金和信誉仍然存活。',
  },
  [RunPhase.RunFailed]: {
    title: '本局失败',
    description: '最终报告已生成。',
    placeholder: '可以查看失败原因后重新开始。',
  },
};

export function renderPhasePanel(app: AppRuntime): string {
  const { state } = app;
  const copy = PHASE_COPY[state.phase] ?? PHASE_COPY[RunPhase.RunInit]!;
  const deckState = state.deckState;

  return `
    <section class="panel phase-panel" aria-label="当前阶段面板">
      <h2>${escapeHtml(copy.title)}</h2>
      <p>${escapeHtml(copy.description)}</p>
      <p class="placeholder-text">${escapeHtml(copy.placeholder)}</p>
      <dl class="compact-stats">
        <div><dt>抽牌堆</dt><dd>${deckState.drawPile.length}</dd></div>
        <div><dt>手牌</dt><dd>${deckState.hand.length}</dd></div>
        <div><dt>弃牌堆</dt><dd>${deckState.discardPile.length}</dd></div>
      </dl>
    </section>
  `;
}
