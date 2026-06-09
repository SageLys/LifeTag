import type { AppRuntime, DealResult } from '../core/types';

export interface UiState {
  logs: string[];
  activeDealResult: DealResult | null;
}

const uiState: UiState = {
  logs: ['UI 骨架已初始化。'],
  activeDealResult: null,
};

export function getUiState(): UiState {
  return uiState;
}

export function appendUiLog(message: string): void {
  uiState.logs = [`${new Date().toLocaleTimeString()} ${message}`, ...uiState.logs].slice(0, 20);
}

export function showDealResult(result: DealResult): void {
  uiState.activeDealResult = result;
}

export function closeModal(): void {
  uiState.activeDealResult = null;
}

export function createAppSnapshot(app: AppRuntime): AppRuntime {
  return app;
}
