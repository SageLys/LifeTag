import type { AppRuntime } from '../core/types';

export function renderRulesHelpPanel(app: AppRuntime): string {
  return `
    <section class="panel rules-help-panel" aria-label="基础规则">
      <h2>基础规则</h2>
      <details class="info-details" open>
        <summary>经营目标</summary>
        <ul class="rules-list">
          <li>目标：${app.configs.gameConfig.runLengthDays} 天内累计利润达到 ${app.configs.gameConfig.targetTotalProfit}。</li>
          <li>现金是当前可花资源，买货、加工、部分奖励会消耗现金。</li>
          <li>累计利润是通关目标，只由出售净利润增加。</li>
          <li>信誉是生命值，事故会扣，归零失败。</li>
        </ul>
      </details>
      <details class="info-details">
        <summary>风险与事故</summary>
        <ul class="rules-list">
          <li>爆雷是每笔交易的风险，不是长期资源。</li>
          <li>隐藏标签 / 暗风险会让预览变成区间。</li>
          <li>事故不是随机抽取，由最终爆雷阈值决定。</li>
        </ul>
      </details>
    </section>
  `;
}
