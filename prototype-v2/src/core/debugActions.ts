import { getDebugState, pushDebugLog, setDebugEnabled, setDebugToast } from './debugState';
import { loadTestScenario } from './testScenarios';
import { getSelectedCustomerOrder, getSelectedPricingMode } from './selectors';
import type { AppRuntime, JsonValue } from './types';

export type DebugCopyTarget =
  | 'app_state'
  | 'run_state'
  | 'day_state'
  | 'deck_state'
  | 'deal_preview'
  | 'selected_product'
  | 'selected_customer_order'
  | 'selected_pricing_mode'
  | 'last_deal'
  | 'last_accident'
  | 'run_report';

export interface DebugActionResult {
  ok: boolean;
  message: string;
  text?: string;
}

function safeClone(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

export function toggleDebugPanel(app: AppRuntime): DebugActionResult {
  const debugState = getDebugState();
  setDebugEnabled(!debugState.enabled);
  app.state.runLog.push(`[Debug] ${debugState.enabled ? '打开' : '关闭'} Debug 面板。`);
  return { ok: true, message: debugState.enabled ? 'Debug 已打开。' : 'Debug 已关闭。' };
}

export function applyDebugSeed(app: AppRuntime, seedValue: string): DebugActionResult {
  const seed = Number(seedValue);
  if (!Number.isFinite(seed) || seed <= 0) {
    return { ok: false, message: '请输入大于 0 的 seed number。' };
  }

  const normalizedSeed = Math.floor(seed);
  const debugState = getDebugState();
  debugState.fixedSeed = normalizedSeed;
  app.state.rngSeed = normalizedSeed;
  app.state.rngState = normalizedSeed;
  app.state.runLog.push(`[Debug] 应用固定 seed：${normalizedSeed}`);
  setDebugToast(`已应用 seed ${normalizedSeed}`);
  return { ok: true, message: `已应用 seed ${normalizedSeed}` };
}

export function resetDebugSeed(app: AppRuntime): DebugActionResult {
  const debugState = getDebugState();
  debugState.fixedSeed = null;
  app.state.runLog.push('[Debug] 重置固定 seed。');
  setDebugToast('已重置 fixed seed');
  return { ok: true, message: '已重置 fixed seed。' };
}

export function loadDebugScenario(app: AppRuntime, scenarioId: string): DebugActionResult {
  const debugState = getDebugState();
  debugState.selectedScenarioId = scenarioId;
  const result = loadTestScenario(app, scenarioId);
  debugState.lastScenarioResult = safeClone(result);
  app.state.runLog.push(`[Debug] ${result.ok ? '加载测试局成功' : '加载测试局失败'}：${scenarioId}`);
  pushDebugLog(`[Debug] ${result.message}`);
  return {
    ok: result.ok,
    message: result.message,
  };
}

export function getDebugCopyPayload(app: AppRuntime, target: DebugCopyTarget): unknown | null {
  switch (target) {
    case 'app_state':
      return app.state;
    case 'run_state':
      return app.state;
    case 'day_state':
      return app.state.dayState;
    case 'deck_state':
      return app.state.deckState;
    case 'deal_preview':
      return app.state.dayState.currentDealPreview;
    case 'selected_product':
      return app.state.inventory.find((product) => product.id === app.state.dayState.selectedProductId) ?? null;
    case 'selected_customer_order':
      return getSelectedCustomerOrder(app);
    case 'selected_pricing_mode':
      return getSelectedPricingMode(app);
    case 'last_deal':
      return app.state.dealLog[app.state.dealLog.length - 1] ?? null;
    case 'last_accident':
      return app.state.accidentLog[app.state.accidentLog.length - 1] ?? null;
    case 'run_report':
      return app.state.runReport;
    default:
      return null;
  }
}

export function prepareDebugCopy(app: AppRuntime, target: DebugCopyTarget): DebugActionResult {
  const payload = getDebugCopyPayload(app, target);
  if (!payload) {
    return { ok: false, message: `当前没有 ${target}。` };
  }

  const text = JSON.stringify(payload, null, 2);
  const debugState = getDebugState();
  debugState.lastCopiedText = text;
  debugState.copyFallbackText = text;
  setDebugToast(`已复制 ${target}`);
  app.state.runLog.push(`[Debug] 复制 JSON：${target}`);
  return {
    ok: true,
    message: `已复制 ${target}`,
    text,
  };
}

export function setDebugChecklistItem(id: string, checked: boolean): void {
  const debugState = getDebugState();
  debugState.checklist[id] = checked;
}
