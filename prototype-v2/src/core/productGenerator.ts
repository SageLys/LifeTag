import { DarkRiskRevealLevel, ProductStatus, TagSource } from './constants';
import { createProductInstanceId } from './ids';
import { createRng, nextRandom, pickWeighted, shuffle } from './rng';
import type { AppRuntime, Effect, ProductInstance, ProductTemplate } from './types';

function getTemplateWeight(template: ProductTemplate): number {
  const weightedTemplate = template as ProductTemplate & { weight?: number; spawnWeight?: number };
  return weightedTemplate.weight ?? weightedTemplate.spawnWeight ?? 1;
}

function getActiveSupplyEffects(app: AppRuntime): Effect[] {
  return app.state.activeSupplySources.flatMap((source) => {
    const def = app.index.supplySourcesById.get(source.supplySourceId);
    return [...(def?.spawnModifiers ?? []), ...(def?.effects ?? [])];
  });
}

function getEffectParams(effect: Effect): Record<string, unknown> {
  return (effect.params ?? {}) as Record<string, unknown>;
}

function templateHasAnyTag(template: ProductTemplate, tagIds: string[]): boolean {
  const allTags = new Set([...template.visibleTagIds, ...template.hiddenTagPool]);
  return tagIds.some((tagId) => allTags.has(tagId));
}

function getSupplyWeightMultiplier(app: AppRuntime, template: ProductTemplate): number {
  let multiplier = 1;
  for (const effect of getActiveSupplyEffects(app)) {
    if (effect.type !== 'template_weight_by_tag' && effect.type !== 'template_weight_by_tag_or_source' && effect.type !== 'modify_spawn_weight') {
      continue;
    }
    const params = getEffectParams(effect);
    const tagIds = Array.isArray(params.tagIds) ? params.tagIds.filter((tagId): tagId is string => typeof tagId === 'string') : [];
    const sourceHint = typeof params.sourceHint === 'string' ? params.sourceHint : null;
    const effectMultiplier = typeof params.multiplier === 'number' ? params.multiplier : 1;
    const tagMatch = tagIds.length > 0 && templateHasAnyTag(template, tagIds);
    const sourceMatch = Boolean(sourceHint && template.sourceHint?.includes(sourceHint));
    if (tagMatch || sourceMatch) {
      multiplier *= effectMultiplier;
    }
  }
  return multiplier;
}

function getDarkRiskChanceAdd(app: AppRuntime, template: ProductTemplate): number {
  let add = 0;
  for (const effect of getActiveSupplyEffects(app)) {
    if (effect.type !== 'dark_risk_chance' && effect.type !== 'modify_dark_risk_chance') {
      continue;
    }
    const params = getEffectParams(effect);
    const category = typeof params.category === 'string' ? params.category : null;
    const value = typeof params.value === 'number' ? params.value : 0;
    if (!category || template.darkRiskPool.some((riskId) => app.index.darkRisksById.get(riskId)?.category === category)) {
      add += value;
    }
  }
  return add;
}

function applyGeneratedProductModifiers(app: AppRuntime, product: ProductInstance): void {
  for (const effect of getActiveSupplyEffects(app)) {
    if (effect.type !== 'generated_product_modifier' && effect.type !== 'modify_generated_product') {
      continue;
    }
    const params = getEffectParams(effect);
    const stat = params.stat;
    const op = params.op;
    const value = typeof params.value === 'number' ? params.value : 0;
    if (stat === 'basePrice') {
      product.basePrice = op === 'multiply' ? Math.round(product.basePrice * value) : product.basePrice + value;
    }
    if (stat === 'baseCost') {
      product.cost = op === 'multiply' ? Math.max(1, Math.round(product.cost * value)) : Math.max(1, product.cost + value);
    }
  }
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
  const extraCandidateModifier = app.state.temporaryRunModifiers.find(
    (modifier) => modifier.timing === 'next_day' && modifier.stat === 'dailyProductCandidateCount' && modifier.consumed < modifier.uses,
  );
  const productCount = Math.max(0, count + (extraCandidateModifier?.value ?? 0));
  if (extraCandidateModifier) {
    extraCandidateModifier.consumed += 1;
    addRunLog(app, `临时效果触发：${extraCandidateModifier.displayName}，今日商品候选 +${extraCandidateModifier.value}。`);
  }
  const products = Array.from({ length: productCount }, () => {
    const template = pickWeighted(rng, templates, (candidate) => getTemplateWeight(candidate) * getSupplyWeightMultiplier(app, candidate));
    const hiddenTagIds = shuffle(rng, template.hiddenTagPool).slice(0, Math.min(template.hiddenTagCount, template.hiddenTagPool.length));
    const darkRiskChance = Math.max(0, Math.min(1, template.darkRiskChance + getDarkRiskChanceAdd(app, template)));
    const darkRiskIds =
      template.darkRiskPool.length > 0 && nextRandom(rng) < darkRiskChance
        ? [pickWeighted(rng, template.darkRiskPool, (riskId) => app.index.darkRisksById.get(riskId)?.accidentWeight ?? 1)]
        : [];
    const freshnessMax = getTemplateFreshnessMax(app, template);

    const product: ProductInstance = {
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
    applyGeneratedProductModifiers(app, product);
    return product;
  });

  app.state.rngState = rng.value;
  app.state.dayState.productCandidates = products;
  app.state.dayState.productCandidateIds = products.map((product) => product.id);
  addRunLog(app, `[第 ${app.state.currentDay} 天][DAY_PURCHASE] 已生成 ${products.length} 个商品候选。`);

  return products;
}
