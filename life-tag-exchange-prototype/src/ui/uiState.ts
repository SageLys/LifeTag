import type { AppRuntime, DealResult } from '../core/types';

export interface UiState {
  logs: string[];
  activeDealResult: DealResult | null;
  currentView: 'game' | 'deck_detail' | 'shop_rewards_detail';
}

const uiState: UiState = {
  logs: ['UI 骨架已初始化。'],
  activeDealResult: null,
  currentView: 'game',
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

export function openUiView(view: UiState['currentView']): void {
  uiState.currentView = view;
}

export function createAppSnapshot(app: AppRuntime): AppRuntime {
  return app;
}
