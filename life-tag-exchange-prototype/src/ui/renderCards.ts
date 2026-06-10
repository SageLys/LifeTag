import { canPlayCard } from '../core/actions';
import { getCardActionPointCost, getCardCashCost, getCardEffects, getCardTargetType } from '../core/rules_effects';
import { getCardDef } from '../core/selectors';
import type { AppRuntime, CardDef, CardInstance, Effect } from '../core/types';
import { escapeHtml } from './formatters';

function getEffectParams(effect: Effect): Record<string, unknown> {
  return (effect.params ?? {}) as Record<string, unknown>;
}

function getEffectNumber(effect: Effect, key: string, fallback = 0): number {
  const params = getEffectParams(effect);
  const value = params[key] ?? effect.value;
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getEffectString(effect: Effect, key: string): string {
  const params = getEffectParams(effect);
  const value = params[key] ?? effect.value;
  return typeof value === 'string' ? value : '';
}

export function formatEffect(effect: Effect, app: AppRuntime): string {
  if (effect.displayText) {
    return effect.displayText;
  }

  switch (effect.type) {
    case 'add_applied_tag_to_product': {
      const tagId = effect.tagId ?? effect.targetTagId ?? getEffectString(effect, 'tagId');
      return `添加标签 ${app.index.tagsById.get(tagId)?.displayName ?? tagId}`;
    }
    case 'reveal_hidden_tags':
    case 'reveal_hidden_tag':
      return `揭示 ${effect.count ?? getEffectNumber(effect, 'count', 1)} 个隐藏标签`;
    case 'reveal_dark_risk_category':
      return `揭示 ${effect.count ?? getEffectNumber(effect, 'count', 1)} 个暗风险类别`;
    case 'reveal_dark_risk_full':
      return '完全揭示 1 个暗风险';
    case 'add_deal_modifier': {
      const stat = getEffectString(effect, 'stat');
      const value = getEffectNumber(effect, 'value', 0);
      if (stat === 'price') return `售价 ${value >= 0 ? '+' : ''}${value}`;
      if (stat === 'risk') return `爆雷 ${value >= 0 ? '+' : ''}${value}`;
      return '添加本单修正';
    }
    case 'add_product_modifier': {
      const stat = getEffectString(effect, 'stat');
      const value = getEffectNumber(effect, 'value', 0);
      if (stat === 'price') return `商品售价 ${value >= 0 ? '+' : ''}${value}`;
      if (stat === 'risk') return `商品爆雷 ${value >= 0 ? '+' : ''}${value}`;
      return '添加商品修正';
    }
    case 'modify_accident_result': {
      const stat = getEffectString(effect, 'stat');
      const value = getEffectNumber(effect, 'value', 0);
      if (stat === 'fine') return `事故罚款 ${value >= 0 ? '+' : ''}${value}`;
      if (stat === 'reputationLoss') return `事故信誉损失 ${value >= 0 ? '+' : ''}${value}`;
      if (stat === 'cash') return `事故后现金 ${value >= 0 ? '+' : ''}${value}`;
      return '修改事故结果';
    }
    case 'add_price':
      return `售价 ${getEffectNumber(effect, 'value', 0) >= 0 ? '+' : ''}${getEffectNumber(effect, 'value', 0)}`;
    case 'multiply_price':
      return `售价 x${getEffectNumber(effect, 'value', 1)}`;
    case 'add_risk':
      return `爆雷 ${getEffectNumber(effect, 'value', 0) >= 0 ? '+' : ''}${getEffectNumber(effect, 'value', 0)}`;
    case 'reduce_risk':
      return `爆雷 -${Math.abs(getEffectNumber(effect, 'value', 0))}`;
    case 'draw_cards':
      return `抽 ${effect.count ?? getEffectNumber(effect, 'count', 0)} 张牌`;
    case 'suppress_tag':
      return '压制指定标签';
    case 'gain_cash':
      return `获得 ${getEffectNumber(effect, 'amount', getEffectNumber(effect, 'value', 0))} 现金`;
    case 'lose_cash':
      return `失去 ${getEffectNumber(effect, 'amount', getEffectNumber(effect, 'value', 0))} 现金`;
    case 'gain_reputation':
      return `恢复 ${getEffectNumber(effect, 'amount', getEffectNumber(effect, 'value', 0))} 信誉`;
    case 'lose_reputation':
      return `失去 ${getEffectNumber(effect, 'amount', getEffectNumber(effect, 'value', 0))} 信誉`;
    default:
      return '特殊效果';
  }
}

function getMoveHint(cardDef: CardDef, card: CardInstance): string {
  if (cardDef.exhaustAfterUse || cardDef.consumeAfterUse || (card.temporary && !cardDef.discardAfterUse)) {
    return '使用后进消耗堆';
  }
  return '使用后进弃牌堆';
}

function formatCardType(type: string): string {
  switch (type) {
    case 'tag_tool':
      return '标签工具';
    case 'operation':
      return '经营牌';
    default:
      return '未知类型';
  }
}

function formatTargetType(targetType: string): string {
  switch (targetType) {
    case 'selected_product':
    case 'product':
      return '当前商品';
    case 'selected_deal':
      return '当前交易';
    case 'selected_customer':
      return '当前顾客';
    case 'player':
      return '玩家';
    case 'none':
      return '无需目标';
    default:
      return '当前商品';
  }
}

export function getCardDisplayInfo(app: AppRuntime, card: CardInstance): {
  cardDef: CardDef | null;
  name: string;
  type: string;
  actionPointCost: number;
  cashCost: number;
  targetType: string;
  effectText: string;
  moveHint: string;
  upgradeText: string;
} {
  const cardDef = getCardDef(app, card);
  const effects = cardDef ? getCardEffects(cardDef, card) : [];
  return {
    cardDef,
    name: cardDef?.displayName ?? card.cardId,
    type: formatCardType(cardDef?.cardType ?? cardDef?.type ?? 'unknown'),
    actionPointCost: cardDef ? getCardActionPointCost(cardDef, card) : 0,
    cashCost: cardDef ? getCardCashCost(cardDef, card) : 0,
    targetType: cardDef ? formatTargetType(getCardTargetType(cardDef)) : '未知',
    effectText:
      effects.length > 0
        ? effects.map((effect) => formatEffect(effect, app)).join('；')
        : cardDef?.effectText ?? '暂无效果说明。',
    moveHint: cardDef ? getMoveHint(cardDef, card) : '卡牌配置缺失',
    upgradeText: card.upgraded ? '已升级' : '未升级',
  };
}

export function renderCardInfo(app: AppRuntime, card: CardInstance, options: { interactive?: boolean } = {}): string {
  const info = getCardDisplayInfo(app, card);
  const canPlay = options.interactive ? canPlayCard(app, card.id) : null;

  return `
    <article class="item-card hand-card art-frame art-frame-hand-card">
      <div class="card-art card-art-${Math.abs(card.id.length % 4)}" aria-hidden="true"></div>
      <h3>${escapeHtml(info.name)}</h3>
      <dl class="item-stats">
        <div><dt>类型</dt><dd>${escapeHtml(info.type)}</dd></div>
        <div><dt>费用</dt><dd class="number">${info.actionPointCost} AP${info.cashCost > 0 ? ` / ${info.cashCost} 现金` : ''}</dd></div>
        <div><dt>目标</dt><dd>${escapeHtml(info.targetType)}</dd></div>
        <div><dt>去向</dt><dd>${escapeHtml(info.moveHint)}</dd></div>
      </dl>
      <p>${escapeHtml(info.effectText)}</p>
      ${
        options.interactive
          ? `
            <button
              type="button"
              data-action="play-card"
              data-card-instance-id="${escapeHtml(card.id)}"
              ${canPlay?.ok ? '' : 'disabled'}
            >打出</button>
            ${canPlay?.ok ? '' : `<p class="disabled-reason">${escapeHtml(canPlay?.reason ?? '不能使用这张牌。')}</p>`}
          `
          : ''
      }
    </article>
  `;
}
