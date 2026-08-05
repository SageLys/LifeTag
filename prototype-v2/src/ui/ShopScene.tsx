import { useState } from 'react';
import { useApp } from './AppContext';
import {
  buyProduct,
  selectProduct,
  selectCustomerOrder,
  selectPricingMode,
  confirmSell,
  clearDealSelection,
  useBaseAction,
  getBaseActionDisabledReason,
  playCard,
  canPlayCard,
  drawHand,
  openClosing,
  getOpenClosingDisabledReason,
  finishRewardPhase,
  chooseReward,
  claimMaintenance,
  buyPaidReward,
  chooseBonus,
  skipBonus,
} from '../core/actions';
import { RunResult } from '../core/constants';
import { createDealPreview } from '../core/rules_deal';
import { toProductCardView } from './viewModels/productViewModel';
import { toCustomerCardView } from './viewModels/customerViewModel';
import { toMarketEventBriefView } from './viewModels/marketEventViewModel';
import { toDealPreviewView } from './viewModels/dealPreviewViewModel';
import { formatCash } from './viewModels/playerText';
import type { CardInstance, CardDef, PricingModeDef, RewardPhaseState, RewardOptionInstance } from '../core/types';

type PanelId = 'tv' | 'supply' | 'fridge' | 'orders' | 'cutting' | 'cashier' | 'ledger' | 'safe' | null;

const BASE_ACTIONS: { id: string; label: string }[] = [
  { id: 'action_identify', label: '鉴定' },
  { id: 'action_package', label: '包装' },
  { id: 'action_pr', label: '公关' },
];

export default function ShopScene() {
  const { app, tick } = useApp();
  const [openPanel, setOpenPanel] = useState<PanelId>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const s = app.state;
  const ds = s.dayState;
  const tagsById = app.index.tagsById;
  const runEnded = s.result !== RunResult.InProgress;

  // 统一的操作执行：调用 core action，根据返回反馈短提示，并触发重渲染。
  function run(result: { ok: boolean; message: string }) {
    setToast(result.message);
    tick();
    return result;
  }

  const dealPreview = (() => {
    if (ds.selectedProductId && ds.selectedCustomerOrderId && ds.selectedPricingModeId) {
      const raw = createDealPreview(app);
      return raw ? toDealPreviewView(raw) : null;
    }
    return null;
  })();

  const closingReason = getOpenClosingDisabledReason(app);

  return (
    <div className="shop-scene-root">
      {/* Top status bar — 场景化模型：仅状态条与调试入口，无流程切换控件 */}
      <header className="top-bar">
        <span className="shop-title">🥩 牛马肉铺</span>
        <div className="status-chips">
          <Chip label="第" value={`${s.currentDay} 天`} />
          <Chip label="现金" value={formatCash(s.cash)} highlight={s.cash < 50} />
          <Chip label="累计利润" value={formatCash(s.totalProfit)} />
          <Chip label="信誉" value={s.reputation} highlight={s.reputation < 20} />
          <Chip label="行动点" value={`${ds.actionPoints}`} />
          <Chip label="库存" value={s.inventory.length} />
          <Chip label="手牌" value={s.deckState.hand.length} />
        </div>
        <button className="btn-debug" onClick={() => setDebugOpen(v => !v)} title="调试面板">
          🔧
        </button>
      </header>

      {runEnded && (
        <div className="run-ended-banner">
          本局结束：{s.result === RunResult.Victory ? '🎉 达成目标' : '💀 经营失败'}
          {s.runReport?.endingTitle ? ` — ${s.runReport.endingTitle}` : ''}
        </div>
      )}

      {/* Main grid */}
      <main className="zone-grid">
        <ZoneCard
          emoji="📺" name="电视新闻" colorClass="zone-tv"
          badge={ds.marketEvents.length > 0 ? `${ds.marketEvents.length} 条` : undefined}
          active={openPanel === 'tv'}
          onClick={() => setOpenPanel(p => (p === 'tv' ? null : 'tv'))}
        />
        <ZoneCard
          emoji="🚚" name="货源区" colorClass="zone-supply"
          badge={ds.productCandidates.length > 0 ? `${ds.productCandidates.length} 件` : undefined}
          active={openPanel === 'supply'}
          onClick={() => setOpenPanel(p => (p === 'supply' ? null : 'supply'))}
        />
        <ZoneCard
          emoji="🧊" name="冷柜库存" colorClass="zone-fridge"
          badge={s.inventory.length > 0 ? `${s.inventory.length} 件` : undefined}
          active={openPanel === 'fridge'}
          onClick={() => setOpenPanel(p => (p === 'fridge' ? null : 'fridge'))}
        />
        <ZoneCard
          emoji="📋" name="订单板" colorClass="zone-orders"
          badge={ds.customerOrders.length > 0 ? `${ds.customerOrders.length} 单` : undefined}
          active={openPanel === 'orders'}
          onClick={() => setOpenPanel(p => (p === 'orders' ? null : 'orders'))}
        />
        <ZoneCard
          emoji="🔪" name="砧板加工台" colorClass="zone-cutting"
          badge={ds.selectedProductId ? '已选商品' : undefined}
          active={openPanel === 'cutting'}
          onClick={() => setOpenPanel(p => (p === 'cutting' ? null : 'cutting'))}
        />
        <ZoneCard
          emoji="💰" name="收银台" colorClass="zone-cashier"
          badge={dealPreview ? '预览中' : undefined}
          active={openPanel === 'cashier'}
          onClick={() => setOpenPanel(p => (p === 'cashier' ? null : 'cashier'))}
        />
        <ZoneCard
          emoji="📒" name="账本" colorClass="zone-ledger"
          badge={s.dealLog.length > 0 ? `${s.dealLog.length} 笔` : undefined}
          active={openPanel === 'ledger'}
          onClick={() => setOpenPanel(p => (p === 'ledger' ? null : 'ledger'))}
        />
        <ZoneCard
          emoji="🔒" name="保险柜" colorClass="zone-safe"
          badge={ds.rewardState ? '收店中' : undefined}
          active={openPanel === 'safe'}
          onClick={() => setOpenPanel(p => (p === 'safe' ? null : 'safe'))}
        />
      </main>

      {/* Side panel */}
      {openPanel && (
        <aside className="side-panel">
          <button className="panel-close" onClick={() => setOpenPanel(null)}>✕</button>

          {openPanel === 'tv' && (
            <PanelTV events={ds.marketEvents.map(e => toMarketEventBriefView(e))} />
          )}
          {openPanel === 'supply' && (
            <PanelSupply
              candidates={ds.productCandidates.map(p => toProductCardView(p, tagsById))}
              onBuy={id => run(buyProduct(app, id))}
            />
          )}
          {openPanel === 'fridge' && (
            <PanelFridge
              inventory={s.inventory.map(p => toProductCardView(p, tagsById))}
              selectedId={ds.selectedProductId}
              onSelect={id => run(selectProduct(app, id))}
            />
          )}
          {openPanel === 'orders' && (
            <PanelOrders
              orders={ds.customerOrders.map(o => toCustomerCardView(o, tagsById))}
              selectedId={ds.selectedCustomerOrderId}
              onSelect={id => { selectCustomerOrder(app, id); setToast('已选择顾客'); tick(); }}
            />
          )}
          {openPanel === 'cutting' && (
            <PanelCutting
              hasSelectedProduct={Boolean(ds.selectedProductId)}
              baseActions={BASE_ACTIONS.map(a => ({
                ...a,
                disabledReason: getBaseActionDisabledReason(app, a.id),
              }))}
              onBaseAction={id => run(useBaseAction(app, id))}
              hand={s.deckState.hand}
              cardsById={app.index.cardsById}
              cardReason={inst => canPlayCard(app, inst.instanceId ?? inst.id).reason ?? null}
              onPlayCard={inst => run(playCard(app, inst.instanceId ?? inst.id))}
            />
          )}
          {openPanel === 'cashier' && (
            <PanelCashier
              pricingModes={app.configs.pricingModes}
              selectedPricingId={ds.selectedPricingModeId}
              onSelectPricing={id => run(selectPricingMode(app, id))}
              dealPreview={dealPreview}
              onConfirmSell={() => { const r = run(confirmSell(app)); if (r.ok) setOpenPanel(null); }}
              onClearDeal={() => run(clearDealSelection(app))}
            />
          )}
          {openPanel === 'ledger' && (
            <PanelLedger dealLog={s.dealLog} dailyProfit={ds.dailyProfit} />
          )}
          {openPanel === 'safe' && (
            <PanelSafe
              rewardState={ds.rewardState}
              closingReason={closingReason}
              currentCash={s.cash}
              onOpenClosing={() => run(openClosing(app))}
              onClaimReward={(reward) => run(claimRewardBySlot(app, reward))}
              onNextDay={() => run(finishRewardPhase(app))}
              onSkipBonus={() => run(skipBonus(app))}
            />
          )}
        </aside>
      )}

      {/* Hand bar — 场景化模型：点击牌堆/手牌区抽牌 */}
      <footer className="hand-bar">
        <button
          className="deck-pile"
          title={ds.phaseFlags.drawnToday ? '今日已抽牌' : '点击抽取今日手牌'}
          onClick={() => run(drawHand(app))}
        >
          🂠
          <span className="deck-count">{s.deckState.drawPile.length}</span>
        </button>
        <span className="hand-bar-label">手牌</span>
        {s.deckState.hand.length === 0 ? (
          <span className="hand-empty">{ds.phaseFlags.drawnToday ? '（手牌已用尽）' : '（点击牌堆抽牌）'}</span>
        ) : (
          s.deckState.hand.map(inst => {
            const card = app.index.cardsById.get(inst.cardId ?? inst.id ?? '');
            const reason = canPlayCard(app, inst.instanceId ?? inst.id).reason ?? null;
            return (
              <button
                className="hand-card"
                key={inst.instanceId ?? inst.id}
                title={reason ?? card?.description ?? ''}
                onClick={() => run(playCard(app, inst.instanceId ?? inst.id))}
              >
                <div className="hand-card-name">{card?.displayName ?? '?'}</div>
                <div className="hand-card-ap">{card?.actionPointCost ?? 1} AP</div>
              </button>
            );
          })
        )}
      </footer>

      {toast && (
        <div className="toast" onAnimationEnd={() => setToast(null)} key={toast}>
          {toast}
        </div>
      )}

      {/* Debug panel */}
      {debugOpen && (
        <div className="debug-panel">
          <div className="debug-header">
            <strong>🔧 调试面板</strong>
            <button onClick={() => setDebugOpen(false)}>✕</button>
          </div>
          <pre className="debug-body">
            {`内部 phase: ${s.phase}\n结果: ${s.result}\n当前天: ${s.currentDay}/${s.maxDays}\n现金: ${s.cash}\n信誉: ${s.reputation}\n累计利润: ${s.totalProfit}/${s.targetTotalProfit}\n库存数: ${s.inventory.length}\n手牌: ${s.deckState.hand.length}  抽牌堆: ${s.deckState.drawPile.length}  弃牌堆: ${s.deckState.discardPile.length}\ndrawnToday: ${Boolean(ds.phaseFlags.drawnToday)}\n今日已售: ${ds.soldProductCount}  今日进货: ${ds.boughtProductCount}\nrewardState: ${ds.rewardState ? '已开启' : '未开启'}\n已选商品: ${ds.selectedProductId ?? '无'}\n已选顾客: ${ds.selectedCustomerOrderId ?? '无'}\n已选定价: ${ds.selectedPricingModeId ?? '无'}`}
          </pre>
        </div>
      )}
    </div>
  );
}

// 按奖励槽位分发到对应的领取 / 购买行为。
function claimRewardBySlot(app: ReturnType<typeof useApp>['app'], reward: RewardOptionInstance) {
  switch (reward.rewardSlot) {
    case 'maintenance':
      return claimMaintenance(app, reward.instanceId);
    case 'paid_shop':
      return buyPaidReward(app, reward.instanceId);
    case 'bonus':
      return chooseBonus(app, reward.instanceId);
    case 'free_build':
    default:
      return chooseReward(app, reward.instanceId);
  }
}

// ── Sub-components ──

function Chip({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`stat-chip${highlight ? ' stat-chip--warn' : ''}`}>
      <span className="chip-label">{label}</span>
      <span className="chip-value">{value}</span>
    </div>
  );
}

interface ZoneCardProps {
  emoji: string; name: string; colorClass: string;
  badge?: string; active?: boolean; onClick: () => void;
}
function ZoneCard({ emoji, name, colorClass, badge, active, onClick }: ZoneCardProps) {
  return (
    <button className={`zone-card ${colorClass}${active ? ' zone-card--active' : ''}`} onClick={onClick}>
      <span className="zone-emoji">{emoji}</span>
      <span className="zone-name">{name}</span>
      {badge && <span className="zone-badge">{badge}</span>}
    </button>
  );
}

function PanelTV({ events }: { events: ReturnType<typeof toMarketEventBriefView>[] }) {
  return (
    <div className="panel-content">
      <h2 className="panel-title">📺 今日市场新闻</h2>
      {events.length === 0 ? (
        <p className="panel-empty">今日暂无市场事件</p>
      ) : (
        events.map(e => (
          <div className="event-card" key={e.id}>
            <div className="event-title">{e.title}</div>
            <div className="event-summary">{e.summary}</div>
            {e.impactTags.length > 0 && (
              <div className="event-tags">
                {e.impactTags.map(t => <span className="tag-chip" key={t}>{t}</span>)}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function PanelSupply({
  candidates, onBuy,
}: {
  candidates: ReturnType<typeof toProductCardView>[];
  onBuy: (id: string) => void;
}) {
  return (
    <div className="panel-content">
      <h2 className="panel-title">🚚 今日货源</h2>
      {candidates.length === 0 ? (
        <p className="panel-empty">今日暂无货源</p>
      ) : (
        <div className="product-grid">
          {candidates.map(p => (
            <div className="product-card" key={p.id}>
              <div className="product-name">{p.name}</div>
              <div className="product-cost">{p.cost}</div>
              <div className="product-tags">
                {p.visibleTags.map(t => <span className="tag-chip" key={t}>{t}</span>)}
                {p.hiddenCount > 0 && <span className="tag-chip tag-hidden">隐藏×{p.hiddenCount}</span>}
                {p.darkRiskCount > 0 && <span className="tag-chip tag-dark">暗风险×{p.darkRiskCount}</span>}
              </div>
              <button className="btn-buy" onClick={() => onBuy(p.id)}>买入</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PanelFridge({
  inventory, selectedId, onSelect,
}: {
  inventory: ReturnType<typeof toProductCardView>[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="panel-content">
      <h2 className="panel-title">🧊 冷柜库存</h2>
      {inventory.length === 0 ? (
        <p className="panel-empty">库存为空，去货源区进货吧</p>
      ) : (
        <div className="product-grid">
          {inventory.map(p => (
            <div
              key={p.id}
              className={`product-card${p.id === selectedId ? ' product-card--selected' : ''}${p.isSpoiled ? ' product-card--spoiled' : ''}`}
              onClick={() => onSelect(p.id)}
            >
              <div className="product-name">{p.name}</div>
              <div className="product-cost">{p.cost}</div>
              <div className="product-tags">
                {p.visibleTags.map(t => <span className="tag-chip" key={t}>{t}</span>)}
                {p.hiddenCount > 0 && <span className="tag-chip tag-hidden">隐藏×{p.hiddenCount}</span>}
                {p.darkRiskCount > 0 && <span className="tag-chip tag-dark">暗风险×{p.darkRiskCount}</span>}
              </div>
              <div className="product-status">{p.statusText}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PanelOrders({
  orders, selectedId, onSelect,
}: {
  orders: ReturnType<typeof toCustomerCardView>[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="panel-content">
      <h2 className="panel-title">📋 今日客户</h2>
      {orders.length === 0 ? (
        <p className="panel-empty">今日暂无顾客</p>
      ) : (
        <div className="order-list">
          {orders.map(o => (
            <div
              key={o.id}
              className={`order-card${o.id === selectedId ? ' order-card--selected' : ''}`}
              onClick={() => onSelect(o.id)}
            >
              <div className="order-name">{o.name}</div>
              <div className="order-budget">预算 {o.budget}</div>
              <div className="order-prefs">喜好：{o.preferences.join('、') || '无'}</div>
              {o.taboos.length > 0 && <div className="order-taboo">忌讳：{o.taboos.join('、')}</div>}
              <div className="order-risk">风险承受：{o.riskToleranceLevel}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PanelCutting({
  hasSelectedProduct, baseActions, onBaseAction, hand, cardsById, cardReason, onPlayCard,
}: {
  hasSelectedProduct: boolean;
  baseActions: { id: string; label: string; disabledReason: string | null }[];
  onBaseAction: (id: string) => void;
  hand: CardInstance[];
  cardsById: Map<string, CardDef>;
  cardReason: (inst: CardInstance) => string | null;
  onPlayCard: (inst: CardInstance) => void;
}) {
  return (
    <div className="panel-content">
      <h2 className="panel-title">🔪 加工台</h2>
      {!hasSelectedProduct && <p className="panel-empty">先在冷柜选择一件库存商品再加工</p>}
      <div className="base-action-row">
        {baseActions.map(a => (
          <button
            key={a.id}
            className="base-action-btn"
            disabled={Boolean(a.disabledReason)}
            title={a.disabledReason ?? a.label}
            onClick={() => onBaseAction(a.id)}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div className="cutting-divider">手牌</div>
      {hand.length === 0 ? (
        <p className="panel-empty">手牌为空，点击牌堆抽牌</p>
      ) : (
        <div className="card-list">
          {hand.map(inst => {
            const card = cardsById.get(inst.cardId ?? inst.id ?? '');
            const reason = cardReason(inst);
            return (
              <div className="card-item" key={inst.instanceId ?? inst.id}>
                <div className="card-name">{card?.displayName ?? '未知手牌'}</div>
                <div className="card-ap">{card?.actionPointCost ?? 1} AP</div>
                <div className="card-desc">{card?.description ?? ''}</div>
                <button
                  className="btn-use-card"
                  disabled={Boolean(reason)}
                  title={reason ?? '使用'}
                  onClick={() => onPlayCard(inst)}
                >
                  使用
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PanelCashier({
  pricingModes, selectedPricingId, onSelectPricing, dealPreview, onConfirmSell, onClearDeal,
}: {
  pricingModes: PricingModeDef[];
  selectedPricingId: string | null;
  onSelectPricing: (id: string) => void;
  dealPreview: ReturnType<typeof toDealPreviewView> | null;
  onConfirmSell: () => void;
  onClearDeal: () => void;
}) {
  return (
    <div className="panel-content">
      <h2 className="panel-title">💰 收银台</h2>
      <div className="pricing-modes">
        {pricingModes.map(pm => (
          <button
            key={pm.id}
            className={`pricing-btn${pm.id === selectedPricingId ? ' pricing-btn--active' : ''}`}
            onClick={() => onSelectPricing(pm.id)}
          >
            {pm.displayName}
          </button>
        ))}
      </div>
      {dealPreview ? (
        <div className="deal-preview">
          <div className="dp-row"><span>预估售价</span><strong>{dealPreview.estimatedPrice}</strong></div>
          <div className="dp-row"><span>预估利润</span><strong>{dealPreview.estimatedProfit}</strong></div>
          <div className="dp-row"><span>风险</span><strong>{dealPreview.riskDisplay}</strong></div>
          <div className="dp-row"><span>事故预测</span><strong>{dealPreview.accidentPreview}</strong></div>
          {dealPreview.topPriceSources.length > 0 && (
            <div className="dp-section">
              <div className="dp-section-title">价格来源</div>
              {dealPreview.topPriceSources.map((src, i) => <div className="dp-item" key={i}>{src}</div>)}
            </div>
          )}
          {dealPreview.topRiskSources.length > 0 && (
            <div className="dp-section">
              <div className="dp-section-title">风险来源</div>
              {dealPreview.topRiskSources.map((src, i) => <div className="dp-item" key={i}>{src}</div>)}
            </div>
          )}
          {dealPreview.warnings.map((w, i) => <div className="dp-warning" key={i}>⚠ {w}</div>)}
          <div className="dp-actions">
            <button className="btn-sell" onClick={onConfirmSell} disabled={!dealPreview.canSell}>
              确认出售
            </button>
            <button className="btn-clear" onClick={onClearDeal}>取消</button>
          </div>
          {dealPreview.disabledReason && <div className="dp-disabled">{dealPreview.disabledReason}</div>}
        </div>
      ) : (
        <p className="panel-empty">先选库存商品（冷柜）、顾客（订单板）和定价方式</p>
      )}
    </div>
  );
}

function PanelLedger({ dealLog, dailyProfit }: { dealLog: import('../core/types').DealResult[]; dailyProfit: number }) {
  return (
    <div className="panel-content">
      <h2 className="panel-title">📒 账本</h2>
      <div className="ledger-summary">今日利润：{formatCash(dailyProfit)}</div>
      {dealLog.length === 0 ? (
        <p className="panel-empty">今日暂无交易记录</p>
      ) : (
        <div className="deal-log">
          {[...dealLog].reverse().map(d => (
            <div className="log-entry" key={d.dealId}>
              <span className="log-product">{d.productDisplayName}</span>
              <span className="log-customer">{d.customerDisplayName}</span>
              <span className="log-price">{formatCash(d.finalPrice)}</span>
              <span className={`log-profit ${d.singleProfit >= 0 ? 'profit-pos' : 'profit-neg'}`}>
                {d.singleProfit >= 0 ? '+' : ''}{formatCash(d.singleProfit)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PanelSafe({
  rewardState, closingReason, currentCash, onOpenClosing, onClaimReward, onNextDay, onSkipBonus,
}: {
  rewardState?: RewardPhaseState;
  closingReason: string | null;
  currentCash: number;
  onOpenClosing: () => void;
  onClaimReward: (reward: RewardOptionInstance) => void;
  onNextDay: () => void;
  onSkipBonus: () => void;
}) {
  if (!rewardState) {
    return (
      <div className="panel-content">
        <h2 className="panel-title">🔒 保险柜</h2>
        {closingReason ? (
          <p className="panel-empty">{closingReason}</p>
        ) : (
          <>
            <p className="panel-hint">今日经营达标，可以收店结算。</p>
            <button className="btn-open-closing" onClick={onOpenClosing}>开始收店</button>
          </>
        )}
      </div>
    );
  }

  const groups: { title: string; options: RewardOptionInstance[] }[] = [
    { title: '免费构筑', options: rewardState.freeBuildOptions },
    { title: '日常维护', options: rewardState.maintenanceOptions },
    { title: '付费商店', options: rewardState.paidShopOptions },
    { title: '爆单奖励', options: rewardState.bonusOptions },
  ];

  return (
    <div className="panel-content">
      <h2 className="panel-title">🔒 收店奖励</h2>
      {groups.map(g => g.options.length > 0 && (
        <div className="reward-group" key={g.title}>
          <div className="reward-group-title">{g.title}</div>
          <div className="reward-list">
            {g.options.map(r => {
              const cost = r.cost ?? 0;
              const afford = currentCash >= cost;
              return (
                <div className="reward-card" key={r.instanceId}>
                  <div className="reward-name">{r.displayName}</div>
                  <div className="reward-cost">{cost === 0 ? '免费' : formatCash(cost)}</div>
                  <div className="reward-desc">{r.effectSummary ?? r.description}</div>
                  <button
                    className="btn-claim-reward"
                    disabled={!afford}
                    title={afford ? '领取' : '现金不足'}
                    onClick={() => onClaimReward(r)}
                  >
                    {cost === 0 ? '选择' : '购买'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {rewardState.bonusUnlocked && !rewardState.selectedBonusRewardId && !rewardState.skippedBonus && (
        <button className="btn-skip-bonus" onClick={onSkipBonus}>跳过爆单奖励</button>
      )}
      <button className="btn-next-day" onClick={onNextDay}>结束收店 · 进入下一天 ⏭</button>
    </div>
  );
}
