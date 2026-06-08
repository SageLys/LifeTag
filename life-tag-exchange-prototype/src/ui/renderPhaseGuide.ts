import { RunPhase } from '../core/constants';
import type { AppRuntime } from '../core/types';

function getMainButtonLabel(app: AppRuntime): string {
  const { state } = app;

  switch (state.phase) {
    case RunPhase.RunInit:
      return '开始新局';
    case RunPhase.DayOpening:
      return '进入进货阶段';
    case RunPhase.DayPurchase:
      return '结束进货，进入接单阶段';
    case RunPhase.DayCustomer:
      return '进入抽牌阶段';
    case RunPhase.DayDraw:
      return '进入处理阶段';
    case RunPhase.DayProcess:
      return '进入出售阶段';
    case RunPhase.DaySell:
      return '结束今日出售，进入结算阶段';
    case RunPhase.DayResolve:
      return '进入收店阶段';
    case RunPhase.DayReward:
      return state.currentDay < state.maxDays ? '进入下一天' : '结束本局，查看占位报告';
    case RunPhase.RunEnd:
    case RunPhase.RunFailed:
      return '重新开始';
    default:
      return '推进阶段';
  }
}

export function renderPhaseGuide(app: AppRuntime): string {
  const showReturnButton = app.state.phase === RunPhase.DaySell;

  return `
    <section class="panel phase-guide" aria-label="PhaseGuideBar">
      <h2>阶段提示</h2>
      <p>P0-2 阶段为状态机占位，暂不校验玩法完成条件。</p>
      <div class="phase-actions">
        <button id="advance-phase" type="button">${getMainButtonLabel(app)}</button>
        ${showReturnButton ? '<button id="return-to-process" class="secondary-button" type="button">返回处理阶段</button>' : ''}
      </div>
    </section>
  `;
}
