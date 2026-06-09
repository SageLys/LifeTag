import { canPlayCard } from '../core/actions';
import { getCardActionPointCost, getCardCashCost, getCardEffects, getCardTargetType } from '../core/rules_effects';
import { getCardDef } from '../core/selectors';
import type { AppRuntime, CardDef, CardInstance, Effect } from '../core/types';
import { escapeHtml } from './formatters';

function formatEffect(effect: Effect, app: AppRuntime): string {
  switch (effect.type) {
    case 'add_applied_tag_to_product': {
      const tagId = effect.tagId ?? effect.targetTagId ?? (typeof effect.value === 'string' ? effect.value : '');
      return `添加标签 ${app.index.tagsById.get(tagId)?.displayName ?? tagId}`;
    }
    case 'reveal_hidden_tags':
      return `揭示 ${effect.count ?? effect.value ?? 1} 个隐藏标签`;
    case 'reveal_dark_risk_category':
      return `揭示 ${effect.count ?? effect.value ?? 1} 个暗风险类别`;
    case 'reveal_dark_risk_full':
      return '完全揭示 1 个暗风险';
    case 'add_price':
      return `售价 ${Number(effect.value) >= 0 ? '+' : ''}${effect.value}`;
    case 'multiply_price':
      return `售价 x${effect.value}`;
    case 'add_risk':
      return `爆雷 ${Number(effect.value) >= 0 ? '+' : ''}${effect.value}`;
    case 'reduce_risk':
      return `爆雷 -${Math.abs(Number(effect.value ?? 0))}`;
    case 'draw_cards':
      return `抽 ${effect.count ?? effect.value ?? 0} 张牌`;
    case 'suppress_tag':
      return '压制指定标签';
    case 'gain_cash':
      return `获得 ${effect.value} 现金`;
    case 'lose_cash':
      return `失去 ${effect.value} 现金`;
    case 'gain_reputation':
      return `恢复 ${effect.value} 信誉`;
    case 'lose_reputation':
      return `失去 ${effect.value} 信誉`;
    default:
      return effect.type;
  }
}

function getMoveHint(cardDef: CardDef, card: CardInstance): string {
  if (cardDef.exhaustAfterUse || cardDef.consumeAfterUse || (card.temporary && !cardDef.discardAfterUse)) {
    return '使用后进入消耗堆';
  }
  return '使用后进入弃牌堆';
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
    type: cardDef?.cardType ?? cardDef?.type ?? 'unknown',
    actionPointCost: cardDef ? getCardActionPointCost(cardDef, card) : 0,
    cashCost: cardDef ? getCardCashCost(cardDef, card) : 0,
    targetType: cardDef ? getCardTargetType(cardDef) : 'unknown',
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
    <article class="item-card hand-card">
      <h3>${escapeHtml(info.name)}</h3>
      <dl class="item-stats">
        <div><dt>类型</dt><dd>${escapeHtml(info.type)}</dd></div>
        <div><dt>AP 成本</dt><dd>${info.actionPointCost}</dd></div>
        <div><dt>现金成本</dt><dd>${info.cashCost}</dd></div>
        <div><dt>目标</dt><dd>${escapeHtml(info.targetType)}</dd></div>
        <div><dt>升级</dt><dd>${escapeHtml(info.upgradeText)}</dd></div>
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
            >使用</button>
            ${canPlay?.ok ? '' : `<p class="disabled-reason">${escapeHtml(canPlay?.reason ?? '不能使用该卡牌。')}</p>`}
          `
          : ''
      }
    </article>
  `;
}
