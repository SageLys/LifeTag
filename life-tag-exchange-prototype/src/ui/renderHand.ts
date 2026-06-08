import type { AppRuntime } from '../core/types';

export function renderHand(app: AppRuntime): string {
  const deckSize = app.configs.gameConfig.initialDeck.reduce((sum, entry) => sum + entry.count, 0);

  return `
    <section class="panel" aria-label="手牌区">
      <h2>手牌区</h2>
      <p>初始牌组包含 ${deckSize} 张配置卡。抽牌系统尚未启用。</p>
    </section>
  `;
}
