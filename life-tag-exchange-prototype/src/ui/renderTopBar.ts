import type { AppRuntime } from '../core/types';

export function renderTopBar(app: AppRuntime): string {
  return `
    <section class="panel top-bar" aria-label="顶部状态栏">
      <h2>顶部状态栏</h2>
      <dl>
        <div><dt>天数</dt><dd>${app.state.day} / ${app.configs.gameConfig.dayLimit}</dd></div>
        <div><dt>资金</dt><dd>${app.state.cash}</dd></div>
        <div><dt>声誉</dt><dd>${app.state.reputation} / ${app.configs.gameConfig.passTargetReputation}</dd></div>
        <div><dt>行动点</dt><dd>${app.state.currentDay.actionPoints}</dd></div>
      </dl>
    </section>
  `;
}
