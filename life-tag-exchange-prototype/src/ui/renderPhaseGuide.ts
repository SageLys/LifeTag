import { RunPhase } from '../core/constants';
import type { AppRuntime } from '../core/types';

const PHASES = [
  { phase: RunPhase.DayOpening, label: '开店', icon: 'icon-opening' },
  { phase: RunPhase.DayPurchase, label: '进货', icon: 'icon-purchase' },
  { phase: RunPhase.DayCustomer, label: '接单', icon: 'icon-customer' },
  { phase: RunPhase.DayDraw, label: '抽牌', icon: 'icon-draw' },
  { phase: RunPhase.DayProcess, label: '加工', icon: 'icon-process' },
  { phase: RunPhase.DaySell, label: '出售', icon: 'icon-sell' },
  { phase: RunPhase.DayResolve, label: '日结', icon: 'icon-resolve' },
  { phase: RunPhase.DayReward, label: '收店', icon: 'icon-reward' },
] as const;

function phaseIndex(phase: string): number {
  return PHASES.findIndex((item) => item.phase === phase);
}

export function renderPhaseGuide(app: AppRuntime): string {
  const current = phaseIndex(app.state.phase);
  const isRunShell = app.state.phase === RunPhase.RunInit || app.state.phase === RunPhase.RunEnd || app.state.phase === RunPhase.RunFailed;

  return `
    <nav class="phase-rail" aria-label="营业流程">
      ${PHASES.map((item, index) => {
        const stateClass = isRunShell
          ? 'is-locked'
          : index < current
            ? 'is-done'
            : index === current
              ? 'is-active'
              : 'is-locked';
        return `
          <div class="phase-tab ${stateClass}">
            <span class="atlas-icon ${item.icon}" aria-hidden="true"></span>
            <span>${item.label}</span>
          </div>
        `;
      }).join('')}
    </nav>
  `;
}
