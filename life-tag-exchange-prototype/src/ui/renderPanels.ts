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
    placeholder: '今日新闻会影响后续交易预览中的价格或风险修正。',
  },
  [RunPhase.DayPurchase]: {
    title: '进货阶段',
    description: '查看今日商品候选，并可在限制内买入库存。',
    placeholder: '买入会扣现金并加入库存；基础操作要到处理阶段使用。',
  },
  [RunPhase.DayCustomer]: {
    title: '接单阶段',
    description: '查看今日顾客订单。',
    placeholder: '顾客偏好、雷区和预算会进入交易预览。',
  },
  [RunPhase.DayDraw]: {
    title: '抽牌阶段',
    description: '进入本阶段时自动抽取每日经营手牌。',
    placeholder: '卡牌效果将在 P0-10 实现。',
  },
  [RunPhase.DayProcess]: {
    title: '处理阶段',
    description: '选择库存商品并使用鉴定、包装、公关、洗标等基础操作。',
    placeholder: '基础操作会即时刷新商品、定价可用性和交易预览。',
  },
  [RunPhase.DaySell]: {
    title: '出售阶段',
    description: '查看交易预览；基础操作请先返回处理阶段。',
    placeholder: '确认出售将在 P0-11 实现。',
  },
  [RunPhase.DayResolve]: {
    title: '结算阶段',
    description: '日结摘要将在后续阶段实现。',
    placeholder: 'P0-9 暂无真实出售结算。',
  },
  [RunPhase.DayReward]: {
    title: '收店阶段',
    description: '三选一奖励将在后续阶段实现。',
    placeholder: '当前可点击进入下一天。',
  },
  [RunPhase.RunEnd]: {
    title: '本局结束',
    description: '占位最终报告。正式胜负判定和经营报告将在后续阶段实现。',
    placeholder: '正式胜负判定将在后续阶段实现。',
  },
  [RunPhase.RunFailed]: {
    title: '本局失败',
    description: '失败状态占位。P0-9 不主动制造失败。',
    placeholder: '点击重新开始可创建新局。',
  },
};

export function renderPhasePanel(app: AppRuntime): string {
  const { state } = app;
  const copy = PHASE_COPY[state.phase] ?? PHASE_COPY[RunPhase.RunInit]!;
  const deckState = state.deckState;
  const isRunEnd = state.phase === RunPhase.RunEnd;

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
      ${
        isRunEnd
          ? `<dl class="compact-stats report-stats">
              <div><dt>当前天数</dt><dd>${state.currentDay}</dd></div>
              <div><dt>现金</dt><dd>${state.cash}</dd></div>
              <div><dt>累计利润</dt><dd>${state.totalProfit}</dd></div>
              <div><dt>信誉</dt><dd>${state.reputation}</dd></div>
              <div><dt>日志条数</dt><dd>${state.runLog.length}</dd></div>
            </dl>`
          : ''
      }
    </section>
  `;
}
