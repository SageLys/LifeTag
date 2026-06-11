import { useState } from 'react';
import { useApp } from './AppContext';
import { advancePhase, finishDayAndStartNextDay } from '../core/dayFlow';
import { selectProduct, selectCustomerOrder, selectPricingMode, confirmSell, clearDealSelection } from '../core/actions';
import { createDealPreview } from '../core/rules_deal';
import { generateProductCandidates } from '../core/productGenerator';
import { generateCustomerOrders } from '../core/customerGenerator';
import { RunPhase } from '../core/constants';
import { toProductCardView } from './viewModels/productViewModel';
import { toCustomerCardView } from './viewModels/customerViewModel';
import { toMarketEventBriefView } from './viewModels/marketEventViewModel';
import { toDealPreviewView } from './viewModels/dealPreviewViewModel';
import { formatCash, riskLabel } from './viewModels/playerText';

type PanelId = 'tv' | 'supply' | 'fridge' | 'orders' | 'cutting' | 'cashier' | 'ledger' | 'safe' | null;

export default function ShopScene() {
  const { app, tick } = useApp();
  const [openPanel, setOpenPanel] = useState<PanelId>(null);
  const [debugOpen, setDebugOpen] = useState(false);

  const s = app.state;
  const ds = s.dayState;
  const tagsById = app.index.tagsById;

  const phase = s.phase;
  const phaseLabel: Record<string, string> = {
    RUN_INIT: '初始化',
    DAY_OPENING: '开店',
    DAY_PURCHASE: '进货',
    DAY_CUSTOMER: '接客',
    DAY_DRAW: '摸牌',
    DAY_PROCESS: '加工',
    DAY_SELL: '出售',
    DAY_RESOLVE: '结算',
    DAY_REWARD: '收店',
    RUN_END: '结局',
    RUN_FAILED: '倒闭',
  };

  function doAdvancePhase() {
    advancePhase(app);
    if (app.state.phase === RunPhase.DayPurchase) generateProductCandidates(app);
    if (app.state.phase === RunPhase.DayCustomer) generateCustomerOrders(app);
    tick();
  }

  function doFinishDay() {
    finishDayAndStartNextDay(app);
    tick();
  }

  const dealPreview = (() => {
    if (ds.selectedProductId && ds.selectedCustomerOrderId && ds.selectedPricingModeId) {
      const raw = createDealPreview(app);
      return raw ? toDealPreviewView(raw) : null;
    }
    return null;
  })();

  // Zone click handlers
  function handleSelectProduct(productId: string) {
    selectProduct(app, productId);
    tick();
  }

  function handleSelectOrder(orderId: string) {
    selectCustomerOrder(app, orderId);
    tick();
  }

  function handleSelectPricing(modeId: string) {
    selectPricingMode(app, modeId);
    tick();
  }

  function handleConfirmSell() {
    const result = confirmSell(app);
    if (result.ok) setOpenPanel(null);
    tick();
  }

  function handleClearDeal() {
    clearDealSelection(app);
    tick();
  }

  return (
    <div className="shop-scene-root">
      {/* Top status bar */}
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
        <div className="phase-badge">{phaseLabel[phase] ?? phase}</div>
        <button className="btn-advance" onClick={doAdvancePhase} title="推进阶段">
          推进 ▶
        </button>
        {phase === RunPhase.DayReward && (
          <button className="btn-next-day" onClick={doFinishDay}>
            下一天 ⏭
          </button>
        )}
        <button
          className="btn-debug"
          onClick={() => setDebugOpen(v => !v)}
          title="调试面板"
        >
          🔧
        </button>
      </header>

      {/* Main grid */}
      <main className="zone-grid">
        <ZoneCard
          id="tv" emoji="📺" name="电视新闻" colorClass="zone-tv"
          badge={ds.marketEvents.length > 0 ? `${ds.marketEvents.length} 条` : undefined}
          active={openPanel === 'tv'}
          onClick={() => setOpenPanel(p => p === 'tv' ? null : 'tv')}
        />
        <ZoneCard
          id="supply" emoji="🚚" name="货源区" colorClass="zone-supply"
          badge={ds.productCandidates.length > 0 ? `${ds.productCandidates.length} 件` : undefined}
          active={openPanel === 'supply'}
          onClick={() => setOpenPanel(p => p === 'supply' ? null : 'supply')}
        />
        <ZoneCard
          id="fridge" emoji="🧊" name="冷柜库存" colorClass="zone-fridge"
          badge={s.inventory.length > 0 ? `${s.inventory.length} 件` : undefined}
          active={openPanel === 'fridge'}
          onClick={() => setOpenPanel(p => p === 'fridge' ? null : 'fridge')}
        />
        <ZoneCard
          id="orders" emoji="📋" name="订单板" colorClass="zone-orders"
          badge={ds.customerOrders.length > 0 ? `${ds.customerOrders.length} 单` : undefined}
          active={openPanel === 'orders'}
          onClick={() => setOpenPanel(p => p === 'orders' ? null : 'orders')}
        />
        <ZoneCard
          id="cutting" emoji="🔪" name="砧板加工台" colorClass="zone-cutting"
          badge={s.deckState.hand.length > 0 ? `${s.deckState.hand.length} 牌` : undefined}
          active={openPanel === 'cutting'}
          onClick={() => setOpenPanel(p => p === 'cutting' ? null : 'cutting')}
        />
        <ZoneCard
          id="cashier" emoji="💰" name="收银台" colorClass="zone-cashier"
          badge={dealPreview ? '预览中' : undefined}
          active={openPanel === 'cashier'}
          onClick={() => setOpenPanel(p => p === 'cashier' ? null : 'cashier')}
        />
        <ZoneCard
          id="ledger" emoji="📒" name="账本" colorClass="zone-ledger"
          badge={s.dealLog.length > 0 ? `${s.dealLog.length} 笔` : undefined}
          active={openPanel === 'ledger'}
          onClick={() => setOpenPanel(p => p === 'ledger' ? null : 'ledger')}
        />
        <ZoneCard
          id="safe" emoji="🔒" name="保险柜" colorClass="zone-safe"
          badge={phase === RunPhase.DayReward ? '收店中' : undefined}
          active={openPanel === 'safe'}
          onClick={() => setOpenPanel(p => p === 'safe' ? null : 'safe')}
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
              selectedId={ds.selectedProductId}
              onSelect={handleSelectProduct}
            />
          )}
          {openPanel === 'fridge' && (
            <PanelFridge
              inventory={s.inventory.map(p => toProductCardView(p, tagsById))}
              selectedId={ds.selectedProductId}
              onSelect={handleSelectProduct}
            />
          )}
          {openPanel === 'orders' && (
            <PanelOrders
              orders={ds.customerOrders.map(o => toCustomerCardView(o, tagsById))}
              selectedId={ds.selectedCustomerOrderId}
              onSelect={handleSelectOrder}
            />
          )}
          {openPanel === 'cutting' && (
            <PanelCutting hand={s.deckState.hand} cardsById={app.index.cardsById} />
          )}
          {openPanel === 'cashier' && (
            <PanelCashier
              pricingModes={app.configs.pricingModes}
              selectedPricingId={ds.selectedPricingModeId}
              onSelectPricing={handleSelectPricing}
              dealPreview={dealPreview}
              onConfirmSell={handleConfirmSell}
              onClearDeal={handleClearDeal}
              phase={phase}
            />
          )}
          {openPanel === 'ledger' && (
            <PanelLedger dealLog={s.dealLog} dailyProfit={ds.dailyProfit} />
          )}
          {openPanel === 'safe' && (
            <PanelSafe phase={phase} rewardState={ds.rewardState} />
          )}
        </aside>
      )}

      {/* Hand bar */}
      <footer className="hand-bar">
        <span className="hand-bar-label">手牌</span>
        {s.deckState.hand.length === 0 ? (
          <span className="hand-empty">（尚未摸牌）</span>
        ) : (
          s.deckState.hand.map(inst => {
            const card = app.index.cardsById.get(inst.cardId ?? inst.id ?? '');
            return (
              <div className="hand-card" key={inst.instanceId ?? inst.id} title={card?.displayName ?? ''}>
                <div className="hand-card-name">{card?.displayName ?? '?'}</div>
                <div className="hand-card-ap">{card?.actionPointCost ?? 1} AP</div>
              </div>
            );
          })
        )}
      </footer>

      {/* Debug panel */}
      {debugOpen && (
        <div className="debug-panel">
          <div className="debug-header">
            <strong>🔧 调试面板</strong>
            <button onClick={() => setDebugOpen(false)}>✕</button>
          </div>
          <pre className="debug-body">
            {`阶段: ${phase}\n当前天: ${s.currentDay}\n现金: ${s.cash}\n信誉: ${s.reputation}\n库存数: ${s.inventory.length}\n手牌数: ${s.deckState.hand.length}\n抽牌堆: ${s.deckState.drawPile.length}\n弃牌堆: ${s.deckState.discardPile.length}\n已选商品: ${ds.selectedProductId ?? '无'}\n已选客户: ${ds.selectedCustomerOrderId ?? '无'}\n已选定价: ${ds.selectedPricingModeId ?? '无'}`}
          </pre>
        </div>
      )}
    </div>
  );
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
  id: string; emoji: string; name: string; colorClass: string;
  badge?: string; active?: boolean; onClick: () => void;
}
function ZoneCard({ emoji, name, colorClass, badge, active, onClick }: ZoneCardProps) {
  return (
    <button
      className={`zone-card ${colorClass}${active ? ' zone-card--active' : ''}`}
      onClick={onClick}
    >
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
  candidates, selectedId, onSelect,
}: {
  candidates: ReturnType<typeof toProductCardView>[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="panel-content">
      <h2 className="panel-title">🚚 今日货源</h2>
      {candidates.length === 0 ? (
        <p className="panel-empty">请先进入进货阶段</p>
      ) : (
        <div className="product-grid">
          {candidates.map(p => (
            <ProductCard key={p.id} product={p} selected={p.id === selectedId} onSelect={onSelect} />
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
        <p className="panel-empty">库存为空</p>
      ) : (
        <div className="product-grid">
          {inventory.map(p => (
            <ProductCard key={p.id} product={p} selected={p.id === selectedId} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product, selected, onSelect,
}: {
  product: ReturnType<typeof toProductCardView>;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className={`product-card${selected ? ' product-card--selected' : ''}${product.isSpoiled ? ' product-card--spoiled' : ''}`}
      onClick={() => onSelect(product.id)}
    >
      <div className="product-name">{product.name}</div>
      <div className="product-cost">{product.cost}</div>
      <div className="product-tags">
        {product.visibleTags.map(t => <span className="tag-chip" key={t}>{t}</span>)}
        {product.hiddenCount > 0 && <span className="tag-chip tag-hidden">隐藏×{product.hiddenCount}</span>}
        {product.darkRiskCount > 0 && <span className="tag-chip tag-dark">暗风险×{product.darkRiskCount}</span>}
      </div>
      <div className="product-status">{product.statusText}</div>
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
        <p className="panel-empty">请先进入接客阶段</p>
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
              <div className="order-prefs">
                喜好：{o.preferences.join('、') || '无'}
              </div>
              {o.taboos.length > 0 && (
                <div className="order-taboo">忌讳：{o.taboos.join('、')}</div>
              )}
              <div className="order-risk">风险承受：{o.riskToleranceLevel}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PanelCutting({ hand, cardsById }: { hand: import('../core/types').CardInstance[]; cardsById: Map<string, import('../core/types').CardDef> }) {
  return (
    <div className="panel-content">
      <h2 className="panel-title">🔪 加工台</h2>
      {hand.length === 0 ? (
        <p className="panel-empty">手牌为空</p>
      ) : (
        <div className="card-list">
          {hand.map(inst => {
            const card = cardsById.get(inst.cardId ?? inst.id ?? '');
            return (
              <div className="card-item" key={inst.instanceId ?? inst.id}>
                <div className="card-name">{card?.displayName ?? '未知手牌'}</div>
                <div className="card-ap">{card?.actionPointCost ?? 1} AP</div>
                <div className="card-desc">{card?.description ?? ''}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PanelCashier({
  pricingModes, selectedPricingId, onSelectPricing,
  dealPreview, onConfirmSell, onClearDeal, phase,
}: {
  pricingModes: import('../core/types').PricingModeDef[];
  selectedPricingId: string | null;
  onSelectPricing: (id: string) => void;
  dealPreview: ReturnType<typeof toDealPreviewView> | null;
  onConfirmSell: () => void;
  onClearDeal: () => void;
  phase: string;
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
              {dealPreview.topPriceSources.map((s, i) => <div className="dp-item" key={i}>{s}</div>)}
            </div>
          )}
          {dealPreview.topRiskSources.length > 0 && (
            <div className="dp-section">
              <div className="dp-section-title">风险来源</div>
              {dealPreview.topRiskSources.map((s, i) => <div className="dp-item" key={i}>{s}</div>)}
            </div>
          )}
          {dealPreview.warnings.map((w, i) => (
            <div className="dp-warning" key={i}>⚠ {w}</div>
          ))}
          <div className="dp-actions">
            <button
              className="btn-sell"
              onClick={onConfirmSell}
              disabled={!dealPreview.canSell || phase !== RunPhase.DaySell}
            >
              确认出售
            </button>
            <button className="btn-clear" onClick={onClearDeal}>取消</button>
          </div>
          {dealPreview.disabledReason && (
            <div className="dp-disabled">{dealPreview.disabledReason}</div>
          )}
        </div>
      ) : (
        <p className="panel-empty">先从货架选一件商品和一位客户</p>
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

function PanelSafe({ phase, rewardState }: { phase: string; rewardState?: import('../core/types').RewardPhaseState }) {
  return (
    <div className="panel-content">
      <h2 className="panel-title">🔒 保险柜</h2>
      {phase !== RunPhase.DayReward ? (
        <p className="panel-empty">收店奖励将在收店阶段开放</p>
      ) : !rewardState ? (
        <p className="panel-empty">生成奖励中...</p>
      ) : (
        <div className="reward-list">
          {[
            ...rewardState.maintenanceOptions,
            ...rewardState.freeBuildOptions,
            ...rewardState.paidShopOptions,
            ...rewardState.bonusOptions,
          ].map(r => (
            <div className="reward-card" key={r.instanceId}>
              <div className="reward-name">{r.displayName}</div>
              <div className="reward-cost">{(r.cost ?? 0) === 0 ? '免费' : formatCash(r.cost ?? 0)}</div>
              <div className="reward-desc">{r.effectSummary ?? r.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
