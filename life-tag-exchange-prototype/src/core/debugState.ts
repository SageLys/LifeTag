import type { JsonValue } from './types';

export interface DebugState {
  enabled: boolean;
  selectedScenarioId: string | null;
  fixedSeed: number | null;
  lastScenarioResult: JsonValue | null;
  lastCopiedText: string | null;
  copyFallbackText: string | null;
  toast: string | null;
  debugLog: string[];
  checklist: Record<string, boolean>;
}

const debugState: DebugState = {
  enabled: typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('debug') === '1' : false,
  selectedScenarioId: null,
  fixedSeed: null,
  lastScenarioResult: null,
  lastCopiedText: null,
  copyFallbackText: null,
  toast: null,
  debugLog: [],
  checklist: {},
};

export function getDebugState(): DebugState {
  return debugState;
}

export function setDebugEnabled(enabled: boolean): void {
  debugState.enabled = enabled;
  debugState.debugLog.unshift(`[Debug] ${enabled ? '打开' : '关闭'} Debug 面板。`);
}

export function pushDebugLog(message: string): void {
  debugState.debugLog.unshift(message);
  debugState.debugLog = debugState.debugLog.slice(0, 50);
}

export function setDebugToast(message: string): void {
  debugState.toast = message;
  pushDebugLog(`[Debug] ${message}`);
}
