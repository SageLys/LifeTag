import { AccidentLevel, FailReason, RunResult } from './constants';
import type { AppRuntime, BreakdownItem, RunReport } from './types';

const LEVEL_ORDER: AccidentLevel[] = [
  AccidentLevel.None,
  AccidentLevel.Minor,
  AccidentLevel.Medium,
  AccidentLevel.Major,
  AccidentLevel.Severe,
];

function item(id: string, label: string, value: number | string): BreakdownItem {
  return {
    id,
    label,
    value,
    visibleToPlayer: true,
  };
}

function getMaxAccidentLevel(app: AppRuntime): AccidentLevel {
  return app.state.accidentLog.reduce<AccidentLevel>((maxLevel, accident) => {
    return LEVEL_ORDER.indexOf(accident.level) > LEVEL_ORDER.indexOf(maxLevel) ? accident.level : maxLevel;
  }, AccidentLevel.None);
}

function getMainRiskSources(app: AppRuntime): string[] {
  const counts = new Map<string, number>();
  for (const accident of app.state.accidentLog) {
    for (const entry of accident.chain.slice(0, 8)) {
      if (!entry.label.includes('风险') && !entry.label.includes('雷区') && !entry.label.includes('暗风险')) {
        continue;
      }
      counts.set(entry.label, (counts.get(entry.label) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([label]) => label);
}

function getEndingCopy(result: RunResult, failReason: FailReason): { endingTitle: string; endingText: string } {
  if (result === RunResult.Victory || result === RunResult.Success) {
    return {
      endingTitle: '黑心机器运转成功',
      endingText: '你在 8 天内达成累计利润目标，肉铺已经形成稳定的标签变现体系。',
    };
  }

  switch (failReason) {
    case FailReason.CashBelowZero:
      return {
        endingTitle: '资金链断裂',
        endingText: '现金流被事故与投入拖垮，肉铺无法继续经营。',
      };
    case FailReason.ReputationZero:
      return {
        endingTitle: '全网塌房',
        endingText: '信誉归零后，所有包装话术都失去了意义。',
      };
    case FailReason.ProfitTargetNotMet:
    default:
      return {
        endingTitle: '利润未达标',
        endingText: '肉铺活到了最后一天，但累计利润不足，黑心机器还不够高效。',
      };
  }
}

export function generateRunReport(app: AppRuntime): RunReport {
  const deckSize =
    app.state.deckState.drawPile.length +
    app.state.deckState.hand.length +
    app.state.deckState.discardPile.length +
    app.state.deckState.exhaustPile.length;
  const maxSingleProfit = app.state.dealLog.reduce((max, deal) => Math.max(max, deal.singleProfit), 0);
  const maxAccidentLevel = getMaxAccidentLevel(app);
  const mainRiskSources = getMainRiskSources(app);
  const { endingTitle, endingText } = getEndingCopy(app.state.result, app.state.failReason);

  return {
    reportId: `report_${app.state.runId}`,
    result: app.state.result,
    failReason: app.state.failReason,
    dayReached: app.state.currentDay,
    finalCash: app.state.cash,
    finalTotalProfit: app.state.totalProfit,
    targetTotalProfit: app.state.targetTotalProfit,
    finalReputation: app.state.reputation,
    totalDeals: app.state.dealLog.length,
    totalAccidents: app.state.accidentLog.length,
    maxAccidentLevel,
    maxSingleProfit,
    totalProfitGain: app.state.dealLog.reduce((total, deal) => total + deal.totalProfitGain, 0),
    activePassives: app.state.activePassives.map((passive) => passive.passiveId),
    activeSupplySources: app.state.activeSupplySources.map((source) => source.supplySourceId),
    deckSize,
    mainRiskSources: mainRiskSources.length > 0 ? mainRiskSources : ['本局事故较少或风险来源不足以统计。'],
    endingTitle,
    endingText,
    createdAt: new Date().toISOString(),
    totalCash: app.state.cash,
    totalReputation: app.state.reputation,
    summaryItems: [
      item('final_total_profit', '最终累计利润', app.state.totalProfit),
      item('target_total_profit', '目标累计利润', app.state.targetTotalProfit),
      item('final_cash', '最终现金', app.state.cash),
      item('final_reputation', '最终信誉', app.state.reputation),
      item('total_deals', '总交易次数', app.state.dealLog.length),
      item('total_accidents', '总事故次数', app.state.accidentLog.length),
    ],
  };
}
