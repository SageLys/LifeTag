import { getBaseActionDisabledReason } from '../core/actions';
import type { AppRuntime, ProductInstance } from '../core/types';
import { escapeHtml } from './formatters';
import { formatDarkRiskHint, formatHiddenTagPlaceholders, formatProductStatus } from './ui_helpers';

function getSelectedProductForDetail(app: AppRuntime): ProductInstance | null {
  return (
    app.state.dayState.productCandidates.find((candidate) => candidate.id === app.state.dayState.selectedProductId) ??
    app.state.inventory.find((inventoryProduct) => inventoryProduct.id === app.state.dayState.selectedProductId) ??
    null
  );
}

function getKnownTagIds(product: ProductInstance): string[] {
  return [...new Set([...product.visibleTagIds, ...product.revealedHiddenTagIds, ...product.appliedTagIds].filter(Boolean))];
}

function renderKnownTagList(app: AppRuntime, product: ProductInstance): string {
  const knownTagIds = getKnownTagIds(product);
  if (knownTagIds.length === 0) {
    return '<li>无</li>';
  }

  return knownTagIds
    .map((tagId) => {
      const tag = app.index.tagsById.get(tagId);
      const tagName = tag?.displayName ?? tagId;
      const isSuppressed = product.suppressedTagIds.includes(tagId);
      const disabledReason = getBaseActionDisabledReason(app, 'action_wash_tag', { productId: product.id, tagId });
      const sourceLabel = product.visibleTagIds.includes(tagId)
        ? '显性'
        : product.revealedHiddenTagIds.includes(tagId)
          ? '已揭示隐藏'
          : '已应用';

      return `
        <li class="tag-row">
          <span>[${escapeHtml(tagName)}] ${escapeHtml(sourceLabel)}</span>
          ${isSuppressed ? '<span class="status-pill">已压制</span>' : ''}
          ${tag && !tag.isWashable ? '<span class="hint-text">不可洗</span>' : ''}
          <button
            type="button"
            data-action="wash-tag"
            data-action-id="action_wash_tag"
            data-product-id="${escapeHtml(product.id)}"
            data-tag-id="${escapeHtml(tagId)}"
            ${disabledReason ? 'disabled' : ''}
          >洗标</button>
          ${disabledReason && !isSuppressed && tag?.isWashable ? `<span class="disabled-reason">${escapeHtml(disabledReason)}</span>` : ''}
        </li>
      `;
    })
    .join('');
}

function renderFlags(product: ProductInstance): string {
  const flags = [
    product.flags.identified ? '已鉴定' : product.revealedHiddenTagIds.length > 0 ? '部分鉴定' : null,
    product.flags.packaged ? '已包装' : null,
    product.flags.hasPublicRelation ? '已公关' : null,
    product.flags.sold ? '已售出' : null,
    product.flags.spoiled ? '已腐败' : null,
  ].filter(Boolean);

  if (flags.length === 0) {
    return '无';
  }

  return flags.map((flag) => `<span class="status-pill">${escapeHtml(String(flag))}</span>`).join(' ');
}

export function renderProductDetail(app: AppRuntime): string {
  const product = getSelectedProductForDetail(app);

  if (!product) {
    return `
      <section class="panel" aria-label="商品详情">
        <h2>商品详情</h2>
        <p>当前没有选中商品。点击商品候选或库存商品查看详情。</p>
      </section>
    `;
  }

  return `
    <section class="panel" aria-label="商品详情">
      <h2>商品详情</h2>
      <h3>${escapeHtml(product.displayName)}</h3>
      ${product.description ? `<p>${escapeHtml(product.description)}</p>` : ''}
      <p><strong>当前状态：</strong>${escapeHtml(formatProductStatus(product))}</p>
      <dl class="item-stats">
        <div><dt>进价</dt><dd>${product.cost}</dd></div>
        <div><dt>基础价</dt><dd>${product.basePrice}</dd></div>
        <div><dt>基础风险</dt><dd>${product.baseRisk}</dd></div>
        <div><dt>新鲜度</dt><dd>${product.freshnessCurrent} / ${product.freshnessMax}</dd></div>
      </dl>
      <p><strong>隐藏标签：</strong>${formatHiddenTagPlaceholders(product)}</p>
      <p><strong>暗风险提示：</strong>${escapeHtml(formatDarkRiskHint(app, product))}</p>
      <p><strong>操作状态：</strong>${renderFlags(product)}</p>
      <h3>已知标签</h3>
      <ul class="tag-list">${renderKnownTagList(app, product)}</ul>
      <p class="hint-text">未揭示隐藏标签和未完全揭示暗风险不会在详情中显示真实名称。</p>
    </section>
  `;
}
