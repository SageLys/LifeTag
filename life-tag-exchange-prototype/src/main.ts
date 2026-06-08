import './styles/main.css';
import { buildConfigIndex } from './core/configIndex';
import { loadAllConfigs } from './core/configLoader';
import { validateConfigs } from './core/configValidator';
import { createInitialGameState } from './core/gameState';
import { bindEvents } from './ui/bindEvents';
import { renderApp } from './ui/render';

async function bootstrap() {
  const configs = await loadAllConfigs();
  validateConfigs(configs);
  const index = buildConfigIndex(configs);
  const state = createInitialGameState(configs.gameConfig);

  const app = {
    configs,
    index,
    state,
  };

  renderApp(app);
  bindEvents(app);
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  const root = document.querySelector<HTMLDivElement>('#app');
  if (root) {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    root.innerHTML = `<pre class="fatal-error">${message}</pre>`;
  }
});
