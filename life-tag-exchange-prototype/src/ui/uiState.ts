import type { AppRuntime } from '../core/types';

export interface UiState {
  logs: string[];
}

const uiState: UiState = {
  logs: ['UI 骨架已初始化。'],
};

export function getUiState(): UiState {
  return uiState;
}

export function appendUiLog(message: string): void {
  uiState.logs = [`${new Date().toLocaleTimeString()} ${message}`, ...uiState.logs].slice(0, 20);
}

export function createAppSnapshot(app: AppRuntime): AppRuntime {
  return app;
}
