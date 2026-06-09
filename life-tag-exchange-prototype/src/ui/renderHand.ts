import { canPlayCard } from '../core/actions';
import { getDeckCounts } from '../core/deckSystem';
import { getCardActionPointCost, getCardCashCost, getCardEffects, getCardTargetType } from '../core/rules_effects';
import type { AppRuntime, CardDef, CardInstance, Effect } from '../core/types';
import { escapeHtml } from './formatters';

function getCardDef(app: AppRuntime, card: CardInstance): CardDef | null {
  return app.index.cardsById.get(card.cardDefId) ?? app.index.cardsById.get(card.cardId) ?? null;
}

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
      return `售价 ×${effect.value}`;
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

function renderCard(app: AppRuntime, card: CardInstance): string {
  const cardDef = getCardDef(app, card);
  const cardName = cardDef?.displayName ?? card.cardId;
  const cardType = cardDef?.cardType ?? cardDef?.type ?? 'unknown';
  const actionPointCost = cardDef ? getCardActionPointCost(cardDef, card) : 0;
  const cashCost = cardDef ? getCardCashCost(cardDef, card) : 0;
  const effects = cardDef ? getCardEffects(cardDef, card) : [];
  const effectText = effects.length > 0 ? effects.map((effect) => formatEffect(effect, app)).join('；') : cardDef?.effectText ?? '暂无效果说明。';
  const targetType = cardDef ? getCardTargetType(cardDef) : 'unknown';
  const canPlay = canPlayCard(app, card.id);

  return `
    <article class="item-card hand-card">
      <h3>${escapeHtml(cardName)}</h3>
      <dl class="item-stats">
        <div><dt>类型</dt><dd>${escapeHtml(cardType)}</dd></div>
        <div><dt>行动点成本</dt><dd>${actionPointCost}</dd></div>
        <div><dt>现金成本</dt><dd>${cashCost}</dd></div>
        <div><dt>目标</dt><dd>${escapeHtml(targetType)}</dd></div>
      </dl>
      <p>${escapeHtml(effectText)}</p>
      <p class="hint-text">${cardDef ? escapeHtml(getMoveHint(cardDef, card)) : '卡牌配置缺失'}</p>
      <button
        type="button"
        data-action="play-card"
        data-card-instance-id="${escapeHtml(card.id)}"
        ${canPlay.ok ? '' : 'disabled'}
      >使用</button>
      ${canPlay.ok ? '' : `<p class="disabled-reason">${escapeHtml(canPlay.reason ?? '不能使用该卡牌。')}</p>`}
    </article>
  `;
}

export function renderHand(app: AppRuntime): string {
  const counts = getDeckCounts(app.state.deckState);
  const handContent =
    app.state.deckState.hand.length > 0
      ? app.state.deckState.hand.map((card) => renderCard(app, card)).join('')
      : '<p>当前没有手牌。</p>';

  return `
    <section class="panel hand-panel" aria-label="手牌区">
      <h2>今日手牌</h2>
      <dl class="compact-stats">
        <div><dt>抽牌堆</dt><dd>${counts.drawCount}</dd></div>
        <div><dt>手牌</dt><dd>${counts.handCount}</dd></div>
        <div><dt>弃牌堆</dt><dd>${counts.discardCount}</dd></div>
        <div><dt>消耗堆</dt><dd>${counts.exhaustCount}</dd></div>
      </dl>
      <div class="item-list">${handContent}</div>
    </section>
  `;
}
