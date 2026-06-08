import './styles/main.css';
import { buildConfigIndex } from './core/configIndex';
import { loadAllConfigs } from './core/configLoader';
import { validateConfigs } from './core/configValidator';
import { createInitialGameState } from './core/gameState';
import { bindEvents } from './ui/bindEvents';
import { renderApp } from './ui/render';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderFatalError(error: unknown): void {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) {
    console.error('找不到 #app 根节点，无法显示 fatal-error', error);
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  root.innerHTML = `
    <section class="fatal-error" role="alert" aria-label="配置或程序加载失败">
      <h1>配置或程序加载失败</h1>
      <p>${escapeHtml(message)}</p>
      ${stack ? `<pre>${escapeHtml(stack)}</pre>` : ''}
    </section>
  `;
}

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
  renderFatalError(error);
});
