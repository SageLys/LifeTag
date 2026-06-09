import { RunPhase } from '../core/constants';
import type { AppRuntime } from '../core/types';
import { renderDeckPanel } from './renderDeckPanel';
import { renderLog } from './renderLog';
import { renderRulesHelpPanel } from './renderRulesHelpPanel';
import { renderShopStatusPanel } from './renderShopStatusPanel';

export function renderInfoPanels(app: AppRuntime): string {
  if (app.state.phase === RunPhase.RunInit) {
    return '';
  }

  const isRunFinished = app.state.phase === RunPhase.RunEnd || app.state.phase === RunPhase.RunFailed;
  const deckAndShop = isRunFinished ? '' : `${renderDeckPanel(app)}${renderShopStatusPanel(app)}`;

  return `
    <section class="info-dock" aria-label="查询区">
      <details class="dock-details">
        <summary>规则帮助</summary>
        ${renderRulesHelpPanel(app)}
      </details>
      <details class="dock-details">
        <summary>牌库 / 店铺状态</summary>
        <div class="dock-grid">${deckAndShop || '<p class="hint-text">本局已结束。</p>'}</div>
      </details>
      <details class="dock-details">
        <summary>日志</summary>
        ${renderLog(app)}
      </details>
    </section>
  `;
}
