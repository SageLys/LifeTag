import { RunPhase } from '../core/constants';
import type { AppRuntime } from '../core/types';
import { escapeHtml } from './formatters';

interface PhaseGuideCopy {
  title: string;
  lines: string[];
  mainButton?: string;
}

function getPhaseGuide(app: AppRuntime): PhaseGuideCopy {
  switch (app.state.phase) {
    case RunPhase.RunInit:
      return {
        title: '准备开店',
        lines: [
          '先了解目标和基础规则。',
          '开始新局会生成第 1 天市场新闻、初始牌库和经营状态。',
        ],
      };
    case RunPhase.DayOpening:
      return {
        title: '开店：先看新闻',
        lines: [
          '当前目标：判断今天市场会抬高价格还是增加爆雷。',
          '推荐操作：看完新闻后再决定进货方向。',
          '下一步会进入进货阶段。',
        ],
        mainButton: '进入进货阶段',
      };
    case RunPhase.DayPurchase:
      return {
        title: '进货：选今天的肉',
        lines: [
          `每天最多买入 ${app.configs.gameConfig.dailyProductBuyLimit} 个，买入扣现金但不扣累计利润。`,
          '带 [?] 的商品有未知信息，可能带来高价或高风险。',
          '下一步会锁定今日进货，进入接单阶段。',
        ],
        mainButton: '结束进货，进入接单',
      };
    case RunPhase.DayCustomer:
      return {
        title: '接单：看顾客要什么',
        lines: [
          '顾客有预算、偏好、雷区和暗风险敏感类型。',
          '推荐操作：先记住谁适合你的库存。',
          '下一步会抽取今天可用的加工手牌。',
        ],
        mainButton: '进入抽牌阶段',
      };
    case RunPhase.DayDraw:
      return {
        title: '抽牌：今天的加工工具',
        lines: [
          '这些牌会在处理阶段使用。',
          '可以先查看牌库，理解每张牌的成本、目标、效果和去向。',
          '下一步会进入主要处理阶段。',
        ],
        mainButton: '进入处理阶段',
      };
    case RunPhase.DayProcess:
      return {
        title: '处理：加工并预演交易',
        lines: [
          '先选商品，再选顾客和定价。',
          '使用基础操作或手牌降低风险、揭示信息、提高售价。',
          '预览会显示售价、利润、爆雷区间和事故预测；下一步进入出售确认。',
        ],
        mainButton: '进入出售确认',
      };
    case RunPhase.DaySell:
      return {
        title: '出售：确认这笔生意',
        lines: [
          '确认出售后会按真实隐藏信息结算。',
          '如果预览是区间，最终事故可能落在区间内的任一档位。',
          '可以返回处理阶段继续加工，也可以结束今日出售进入日结。',
        ],
        mainButton: '结束今日出售，进入日结',
      };
    case RunPhase.DayResolve:
      return {
        title: '日结：看今天赚亏',
        lines: [
          '这里汇总成交、事故、现金、累计利润和信誉变化。',
          '下一步进入收店奖励，奖励会影响后续牌库或店铺构筑。',
        ],
        mainButton: '进入收店奖励',
      };
    case RunPhase.DayReward:
      return {
        title: '收店：选择奖励',
        lines: [
          '奖励会改变后续牌库、店铺被动或货源倾向。',
          '部分奖励需要现金，选之前可以展开查看具体作用。',
          '选择奖励后进入下一天；最后一天会进入最终报告。',
        ],
      };
    case RunPhase.RunEnd:
      return {
        title: '本局胜利',
        lines: ['查看最终报告，总结这 8 天怎么赢下来的。'],
        mainButton: '重新开始',
      };
    case RunPhase.RunFailed:
      return {
        title: '本局失败',
        lines: ['查看最终报告，确认失败原因和主要风险来源。'],
        mainButton: '重新开始',
      };
    default:
      return {
        title: '阶段提示',
        lines: ['查看当前面板，按按钮推进到下一阶段。'],
        mainButton: '推进阶段',
      };
  }
}

export function renderPhaseGuide(app: AppRuntime): string {
  const guide = getPhaseGuide(app);
  const showReturnButton = app.state.phase === RunPhase.DaySell;
  const showMainButton = app.state.phase !== RunPhase.DayReward && app.state.phase !== RunPhase.RunInit;

  return `
    <section class="panel phase-guide" aria-label="阶段提示">
      <h2>${escapeHtml(guide.title)}</h2>
      <ul class="guide-list">${guide.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
      <div class="phase-actions">
        ${showMainButton ? `<button id="advance-phase" type="button">${escapeHtml(guide.mainButton ?? '推进阶段')}</button>` : ''}
        ${showReturnButton ? '<button id="return-to-process" class="secondary-button" type="button">返回处理阶段</button>' : ''}
      </div>
    </section>
  `;
}
