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
      return '进入收店奖励';
    case RunPhase.RunEnd:
    case RunPhase.RunFailed:
      return '重新开始';
    default:
      return '推进阶段';
  }
}

function getPhaseHint(app: AppRuntime): string {
  if (app.state.phase === RunPhase.DayReward) {
    return '选择一个收店奖励。部分强力奖励需要消耗现金。选择后将进入下一天；第 8 天选择后进入最终清算。';
  }
  if (app.state.phase === RunPhase.DayResolve) {
    return '查看今日成交、事故、现金、累计利润和信誉变化，然后进入收店奖励。';
  }
  if (app.state.phase === RunPhase.RunEnd || app.state.phase === RunPhase.RunFailed) {
    return '本局已经结束。查看最终报告后可以重新开始。';
  }
  return '按每日流程推进。出售阶段可以多次确认出售，结束出售后进入日结。';
}

export function renderPhaseGuide(app: AppRuntime): string {
  const showReturnButton = app.state.phase === RunPhase.DaySell;
  const showMainButton = app.state.phase !== RunPhase.DayReward;

  return `
    <section class="panel phase-guide" aria-label="PhaseGuideBar">
      <h2>阶段提示</h2>
      <p>${getPhaseHint(app)}</p>
      <div class="phase-actions">
        ${showMainButton ? `<button id="advance-phase" type="button">${getMainButtonLabel(app)}</button>` : ''}
        ${showReturnButton ? '<button id="return-to-process" class="secondary-button" type="button">返回处理阶段</button>' : ''}
      </div>
    </section>
  `;
}
