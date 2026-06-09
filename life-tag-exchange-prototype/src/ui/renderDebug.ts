import { getDebugCopyPayload, type DebugCopyTarget } from '../core/debugActions';
import { getDebugState } from '../core/debugState';
import { getTestScenarios } from '../core/testScenarios';
import type { AppRuntime } from '../core/types';
import { escapeHtml } from './formatters';
import { getUiState } from './uiState';

const COPY_TARGETS: Array<{ id: DebugCopyTarget; label: string; missing: string }> = [
  { id: 'app_state', label: '完整 AppState JSON', missing: '当前没有 AppState' },
  { id: 'run_state', label: 'RunState JSON', missing: '当前没有 RunState' },
  { id: 'day_state', label: 'DayState JSON', missing: '当前没有 DayState' },
  { id: 'deck_state', label: 'DeckState JSON', missing: '当前没有 DeckState' },
  { id: 'deal_preview', label: '当前 DealPreview JSON', missing: '当前没有 DealPreview' },
  { id: 'selected_product', label: '选中 Product JSON', missing: '当前没有选中商品' },
  { id: 'selected_customer_order', label: '选中 CustomerOrder JSON', missing: '当前没有选中顾客订单' },
  { id: 'selected_pricing_mode', label: '选中 PricingMode JSON', missing: '当前没有选中定价方式' },
  { id: 'last_deal', label: '最后 DealResult JSON', missing: '当前没有 DealResult' },
  { id: 'last_accident', label: '最后 AccidentInstance JSON', missing: '当前没有 AccidentInstance' },
  { id: 'run_report', label: 'RunReport JSON', missing: '当前没有 RunReport' },
];

const CHECKLIST = [
  ['BOOT', '页面启动'],
  ['FLOW', '阶段推进'],
  ['PRODUCT', '买入与库存'],
  ['DECK', '抽牌与弃牌'],
  ['ACTION', '基础操作'],
  ['CARD', '卡牌使用'],
  ['PRICE', '售价计算'],
  ['RISK', '风险区间'],
  ['ACCIDENT', '事故结算'],
  ['REWARD', '奖励与下一天'],
  ['RUN', '第 8 天胜负'],
  ['UI', '按钮 disabled reason'],
  ['INFO', '隐藏信息不泄露'],
];

function stat(label: string, value: string | number | boolean | null): string {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value))}</dd></div>`;
}

function renderToggle(debugEnabled: boolean): string {
  return `
    <section class="debug-toggle" aria-label="Debug 开关">
      <button type="button" data-action="toggle-debug">Debug：${debugEnabled ? '关闭' : '打开'}</button>
    </section>
  `;
}

function canShowDebugEntry(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';
}

function renderSummary(app: AppRuntime): string {
  const state = app.state;
  const day = state.dayState;
  const deck = state.deckState;
  const ui = getUiState();
  const deckSize = deck.drawPile.length + deck.hand.length + deck.discardPile.length + deck.exhaustPile.length;

  return `
    <section class="debug-section">
      <h3>状态摘要</h3>
      <dl class="compact-stats">
        ${stat('phase', state.phase)}
        ${stat('result', state.result)}
        ${stat('failReason', state.failReason)}
        ${stat('currentDay / maxDays', `${state.currentDay} / ${state.maxDays}`)}
        ${stat('cash', state.cash)}
        ${stat('totalProfit / target', `${state.totalProfit} / ${state.targetTotalProfit}`)}
        ${stat('reputation / max', `${state.reputation} / ${state.maxReputation}`)}
        ${stat('inventory.length', state.inventory.length)}
        ${stat('activePassives.length', state.activePassives.length)}
        ${stat('activeSupplySources.length', state.activeSupplySources.length)}
        ${stat('dealLog.length', state.dealLog.length)}
        ${stat('accidentLog.length', state.accidentLog.length)}
        ${stat('rewardLog.length', state.rewardLog.length)}
        ${stat('dayNumber', day.dayNumber)}
        ${stat('day.phase', day.phase)}
        ${stat('actionPoints', day.actionPoints)}
        ${stat('boughtProductCount', day.boughtProductCount)}
        ${stat('soldProductCount', day.soldProductCount)}
        ${stat('marketEvent id', day.marketEvent?.id ?? 'none')}
        ${stat('productCandidates.length', day.productCandidates.length)}
        ${stat('customerOrders.length', day.customerOrders.length)}
        ${stat('rewardOptions.length', day.rewardOptions.length)}
        ${stat('selectedProductId', day.selectedProductId)}
        ${stat('selectedCustomerId', day.selectedCustomerId)}
        ${stat('selectedPricingModeId', day.selectedPricingModeId)}
        ${stat('has DealPreview', Boolean(day.currentDealPreview))}
        ${stat('drawPile.length', deck.drawPile.length)}
        ${stat('hand.length', deck.hand.length)}
        ${stat('discardPile.length', deck.discardPile.length)}
        ${stat('exhaustPile.length', deck.exhaustPile.length)}
        ${stat('totalDeckSize', deckSize)}
        ${stat('activeModal', Boolean(ui.activeDealResult))}
        ${stat('modalPayload type', ui.activeDealResult ? 'DealResult' : 'none')}
      </dl>
    </section>
  `;
}

function renderSeed(app: AppRuntime): string {
  const debug = getDebugState();
  return `
    <section class="debug-section">
      <h3>固定 seed</h3>
      <p class="hint-text">当前 seed：${app.state.rngState}；固定 seed：${debug.fixedSeed ?? '未设置'}</p>
      <div class="debug-row">
        <input id="debug-seed-input" type="number" min="1" placeholder="seed number" value="${debug.fixedSeed ?? ''}" />
        <button type="button" data-action="apply-debug-seed">应用 seed</button>
        <button type="button" data-action="reset-debug-seed">重置 seed</button>
      </div>
    </section>
  `;
}

function renderScenarios(): string {
  const scenarios = getTestScenarios();
  const debug = getDebugState();
  return `
    <section class="debug-section">
      <h3>固定测试局</h3>
      ${debug.lastScenarioResult ? `<p class="config-status">${escapeHtml(JSON.stringify(debug.lastScenarioResult))}</p>` : ''}
      <div class="debug-scenario-list">
        ${scenarios
          .map(
            (scenario) => `
              <article class="debug-scenario">
                <h4>${escapeHtml(scenario.displayName)}</h4>
                <p>${escapeHtml(scenario.description)}</p>
                <p><strong>目标阶段：</strong>${escapeHtml(scenario.targetPhase)}</p>
                <button type="button" data-action="load-test-scenario" data-scenario-id="${escapeHtml(scenario.id)}">加载测试局</button>
                <details>
                  <summary>预期结果与验收路径</summary>
                  <ul>${scenario.expected.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
                  <ol>${scenario.manualSteps.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
                </details>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `;
}

function renderCopyButtons(app: AppRuntime): string {
  const debug = getDebugState();
  return `
    <section class="debug-section">
      <h3>JSON 查看 / 复制</h3>
      <div class="debug-copy-grid">
        ${COPY_TARGETS.map((target) => {
          const exists = Boolean(getDebugCopyPayload(app, target.id));
          return `
            <div>
              <button type="button" data-action="copy-debug-json" data-copy-target="${target.id}" ${exists ? '' : 'disabled'}>${escapeHtml(target.label)}</button>
              ${exists ? '' : `<p class="disabled-reason">${escapeHtml(target.missing)}</p>`}
            </div>
          `;
        }).join('')}
      </div>
      ${debug.toast ? `<p class="config-status">${escapeHtml(debug.toast)}</p>` : ''}
      ${
        debug.copyFallbackText
          ? `<textarea class="debug-copy-fallback" readonly>${escapeHtml(debug.copyFallbackText)}</textarea>`
          : ''
      }
    </section>
  `;
}

function renderChecklist(): string {
  const debug = getDebugState();
  return `
    <section class="debug-section">
      <h3>验收清单</h3>
      <div class="debug-checklist">
        ${CHECKLIST.map(
          ([id, label]) => `
            <label>
              <input type="checkbox" data-action="toggle-debug-check" data-check-id="${id}" ${debug.checklist[id] ? 'checked' : ''} />
              <span>${escapeHtml(id)}：${escapeHtml(label)}</span>
            </label>
          `,
        ).join('')}
      </div>
      <h4>Debug 日志</h4>
      <ol>${debug.debugLog.slice(0, 12).map((log) => `<li>${escapeHtml(log)}</li>`).join('')}</ol>
    </section>
  `;
}

export function renderDebug(app: AppRuntime): string {
  if (!canShowDebugEntry()) {
    return '';
  }

  const debug = getDebugState();
  if (!debug.enabled) {
    return renderToggle(false);
  }

  return `
    ${renderToggle(true)}
    <section class="panel debug-panel" aria-label="Debug 面板">
      <h2>Debug 面板</h2>
      <p class="hint-text">开发者调试入口，可以查看隐藏信息与直接注入测试局，不代表普通试玩入口。</p>
      ${renderSummary(app)}
      ${renderSeed(app)}
      ${renderScenarios()}
      ${renderCopyButtons(app)}
      ${renderChecklist()}
    </section>
  `;
}
