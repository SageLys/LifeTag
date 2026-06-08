import { DarkRiskRevealLevel, ProductStatus, TagSource } from './constants';
import { createProductInstanceId } from './ids';
import { createRng, nextRandom, pickWeighted, shuffle } from './rng';
import type { AppRuntime, ProductInstance, ProductTemplate } from './types';

function getTemplateWeight(template: ProductTemplate): number {
  const weightedTemplate = template as ProductTemplate & { weight?: number; spawnWeight?: number };
  return weightedTemplate.weight ?? weightedTemplate.spawnWeight ?? 1;
}

function getTemplateFreshnessMax(app: AppRuntime, template: ProductTemplate): number {
  const freshnessTemplate = template as ProductTemplate & { freshnessMax?: number };
  return Math.max(
    1,
    freshnessTemplate.freshnessMax ?? app.configs.gameConfig.spoiledAt + app.configs.gameConfig.freshnessLossPerDay,
  );
}

function nextProductId(app: AppRuntime): string {
  const id = createProductInstanceId(app.state.nextInstanceCounter);
  app.state.nextInstanceCounter += 1;
  return id;
}

function addRunLog(app: AppRuntime, message: string): void {
  app.state.runLog.push(message);
  app.state.dayState.log.push(message);
}

export function generateProductCandidates(
  app: AppRuntime,
  count = app.configs.gameConfig.dailyProductCandidateCount,
): ProductInstance[] {
  if (app.state.dayState.productCandidates.length > 0) {
    return app.state.dayState.productCandidates;
  }

  const templates = app.configs.productTemplates;
  if (templates.length === 0) {
    app.state.dayState.productCandidates = [];
    app.state.dayState.productCandidateIds = [];
    addRunLog(app, `[第 ${app.state.currentDay} 天][DAY_PURCHASE] 已生成 0 个商品候选。`);
    return [];
  }

  const rng = createRng(app.state.rngState);
  const productCount = Math.max(0, count);
  const products = Array.from({ length: productCount }, () => {
    const template = pickWeighted(rng, templates, getTemplateWeight);
    const hiddenTagIds = shuffle(rng, template.hiddenTagPool).slice(0, Math.min(template.hiddenTagCount, template.hiddenTagPool.length));
    const darkRiskIds =
      template.darkRiskPool.length > 0 && nextRandom(rng) < template.darkRiskChance
        ? [pickWeighted(rng, template.darkRiskPool, (riskId) => app.index.darkRisksById.get(riskId)?.accidentWeight ?? 1)]
        : [];
    const freshnessMax = getTemplateFreshnessMax(app, template);

    return {
      id: nextProductId(app),
      templateId: template.id,
      displayName: template.displayName,
      description: template.sourceHint ? `来源：${template.sourceHint}` : undefined,
      status: ProductStatus.Candidate,
      cost: template.baseCost,
      basePrice: template.basePrice,
      baseRisk: template.baseRisk,
      freshnessCurrent: freshnessMax,
      freshnessMax,
      visibleTagIds: [...template.visibleTagIds],
      hiddenTagIds,
      revealedHiddenTagIds: [],
      darkRiskIds,
      revealedDarkRiskIds: [],
      darkRiskRevealLevels: Object.fromEntries(darkRiskIds.map((riskId) => [riskId, DarkRiskRevealLevel.Hidden])),
      appliedTagIds: [],
      suppressedTagIds: [],
      flags: {
        packaged: false,
        sold: false,
        spoiled: false,
      },
      tagSources: Object.fromEntries(template.visibleTagIds.map((tagId) => [tagId, TagSource.Visible])),
    };
  });

  app.state.rngState = rng.value;
  app.state.dayState.productCandidates = products;
  app.state.dayState.productCandidateIds = products.map((product) => product.id);
  addRunLog(app, `[第 ${app.state.currentDay} 天][DAY_PURCHASE] 已生成 ${products.length} 个商品候选。`);

  return products;
}
