import type { AppRuntime, MarketEventDef } from './types';
import { createRng, pickWeighted } from './rng';

const FALLBACK_MARKET_EVENT: MarketEventDef = {
  id: 'market_fallback_calm',
  displayName: '今日市场平稳',
  newsText: '今日市场平稳，无特殊效果。',
  durationDays: 1,
  conditions: [],
  modifiers: [],
  effects: [],
  effectText: '今日市场平稳，无特殊效果。',
};

function getEventWeight(event: MarketEventDef): number {
  const weightedEvent = event as MarketEventDef & { weight?: number; spawnWeight?: number };
  return weightedEvent.weight ?? weightedEvent.spawnWeight ?? 1;
}

function addRunLog(app: AppRuntime, message: string): void {
  app.state.runLog.push(message);
  app.state.dayState.log.push(message);
}

export function generateMarketEvents(app: AppRuntime, count = app.configs.gameConfig.marketEventsPerDay): MarketEventDef[] {
  if (app.state.dayState.marketEvents.length > 0) {
    return app.state.dayState.marketEvents;
  }

  const events: MarketEventDef[] = [];
  const rng = createRng(app.state.rngState);
  const sourceEvents = app.configs.marketEvents.length > 0 ? app.configs.marketEvents : [FALLBACK_MARKET_EVENT];
  const eventCount = Math.max(1, count);

  for (let index = 0; index < eventCount; index += 1) {
    events.push(pickWeighted(rng, sourceEvents, getEventWeight));
  }

  app.state.rngState = rng.value;
  app.state.dayState.marketEvents = events;
  app.state.dayState.marketEvent = events[0] ?? null;
  app.state.dayState.marketEventIds = events.map((event) => event.id);

  const headline = events[0]?.displayName ?? FALLBACK_MARKET_EVENT.displayName;
  addRunLog(app, `[第 ${app.state.currentDay} 天][DAY_OPENING] 今日新闻：${headline}`);

  return events;
}
