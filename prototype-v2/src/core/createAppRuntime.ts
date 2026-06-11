import { buildConfigIndex } from './configIndex';
import { startNewRun } from './dayFlow';
import { createInitialGameState } from './gameState';
import { ALL_CONFIGS } from '../data/index';
import type { AppRuntime } from './types';

export function createAppRuntime(): AppRuntime {
  const configs = ALL_CONFIGS;
  const index = buildConfigIndex(configs);
  const state = createInitialGameState(configs.gameConfig);

  const app: AppRuntime = { configs, index, state };
  startNewRun(app);
  return app;
}
