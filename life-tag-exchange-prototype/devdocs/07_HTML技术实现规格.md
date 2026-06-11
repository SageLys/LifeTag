# 07_HTML技术实现规格

文档编号：07  
文档名称：HTML 技术实现规格  
项目名称：《人生标签交易所：牛马肉铺》HTML 快速验证原型  
对应策划案版本：核心策划案 v0.5  
文档版本：v0.2  
状态：已按店铺式主界面重构要求改写。  
优先级说明：若本文档与 10_店铺式主界面交互重构规格.md 冲突，以 10 为准。

---

# 1. 文档目的

本文档定义 HTML 原型的技术实现路线。v0.2 起，本项目不再以“阶段页面渲染”为 UI 中心，而以：

```text
ShopScene
ShopZone
ContextPanel
DealPreviewDock
HandDock
LogDrawer
```

为 UI 中心。

本次技术重构不得改写售价、爆雷、事故、奖励等规则公式。

---

# 2. 当前代码审计结论

当前实现已经存在 TypeScript 模块化结构，不是早期 Vanilla JS 单文件结构。

已确认的关键实现：

```text
src/core/constants.ts：定义 RunPhase 等枚举。
src/core/types.ts：定义 RunState、DayState、DeckState、ProductInstance、DealPreview 等类型。
src/core/gameState.ts：创建新局状态。
src/core/dayFlow.ts：线性阶段推进、阶段内容生成、下一天、结束局。
src/core/actions.ts：买入、选择商品、选择顾客、定价、基础操作、出牌、出售、奖励。
src/ui/bindEvents.ts：DOM 事件绑定。
src/ui/render.ts：总渲染入口。
src/ui/renderPhaseGuide.ts：旧阶段导航。
src/ui/renderStageContent.ts：旧阶段页面 switch。
src/ui/renderProducts.ts：商品候选与库存。
src/ui/renderCustomers.ts：顾客订单。
src/ui/renderHand.ts：手牌。
src/ui/renderActions.ts：基础加工操作。
src/ui/renderPricing.ts：定价。
src/ui/renderDealPreview.ts：成交单预览。
src/ui/renderDebug.ts：Debug 面板。
src/ui/uiState.ts：当前 UI 视图与弹窗状态。
```

---

# 3. 保留模块

以下模块原则上保留，仅做必要适配：

```text
src/core/rules_price.ts
src/core/rules_risk.ts
src/core/rules_accident.ts
src/core/rules_deal.ts
src/core/rules_rewards.ts
src/core/rules_conditions.ts
src/core/rules_effects.ts
src/core/deckSystem.ts
src/core/productGenerator.ts
src/core/customerGenerator.ts
src/core/marketGenerator.ts
src/core/debugActions.ts
src/core/testScenarios.ts
```

以下 UI 组件可复用并嵌入新 ContextPanel：

```text
renderProducts
renderInventoryPanel
renderCustomers
renderHand
renderActions
renderPricing
renderDealPreview
renderLog
renderShopStatusPanel
renderDebug
```

---

# 4. 必须重构模块

## 4.1 dayFlow.ts

旧职责：

```text
NEXT_PHASE 线性阶段推进。
ensurePhaseContent() 按 phase 生成内容。
advancePhase() 作为主流程入口。
```

新职责：

```text
startNewRun()
startNextDay()
resolveDay()
endRun()
ensureMarketEvent()
ensureProductCandidates()
ensureCustomerOrders()
ensureDailyDraw()
ensureRewardState()
```

`advancePhase()` 可以短期保留给 Debug，但正式 UI 不再调用它。

## 4.2 actions.ts

新增：

```ts
openShopArea(app, areaId)
ensureMarketEvent(app)
ensureProductCandidates(app)
ensureCustomerOrders(app)
ensureDailyDraw(app)
resolveDay(app)
```

调整：

```text
selectProduct 不再限制只能 DAY_PROCESS / DAY_SELL。
selectCustomerOrder 不再限制只能非 DAY_CUSTOMER。
selectPricingMode 不再限制只能 DAY_PROCESS / DAY_SELL，而是依据是否日结、是否有有效对象判断。
useBaseAction / playCard 仍需检查行动点、现金、商品目标与是否日结。
confirmSell 不再要求 phase == DAY_SELL，而要求当前未日结、选择完整、预览有效。
```

## 4.3 render.ts

旧结构：

```text
renderPhaseGuide(app)
renderMainStageContent(app)
```

新结构：

```text
renderTopBar(app)
renderTodayTaskBar(app)
renderShopScene(app)
renderContextPanel(app)
renderDealPreviewDock(app)
renderHandDock(app)
renderLogDrawer(app)
renderModal()
renderDebug(app)
```

## 4.4 renderStageContent.ts

旧 `renderMainStageContent()` 按 `app.state.phase` switch 到阶段页面。该文件应废弃或仅保留 RunInit / RunEnd / RunFailed 的壳。

新文件建议：

```text
src/ui/renderShopScene.ts
src/ui/renderContextPanel.ts
src/ui/renderTodayTaskBar.ts
src/ui/renderDocks.ts
src/ui/renderShopZones.ts
```

## 4.5 renderPhaseGuide.ts

废弃正式 UI 使用。可保留为 Debug 兼容，但不应在主界面显示。

## 4.6 bindEvents.ts

新增 ShopZone 点击事件：

```text
data-action="open-shop-area"
data-shop-area="news|supply|orders|deck|inventory|process|cashier|daybook|reward|passives"
```

废弃正式 UI 对 `advance-phase` 的依赖。

---

# 5. 状态结构改造

## 5.1 DayState

新增：

```ts
taskFlags?: {
  marketGenerated: boolean;
  marketRead: boolean;
  productCandidatesGenerated: boolean;
  customerOrdersGenerated: boolean;
  cardsDrawnToday: boolean;
  processingOpened: boolean;
  dayResolved: boolean;
  rewardGenerated: boolean;
  rewardChosen: boolean;
};
```

短期兼容：

```text
phaseFlags.drawnToday 可以继续读取，但新代码应优先写 taskFlags.cardsDrawnToday。
```

## 5.2 UIState

新增：

```ts
activeShopArea: ShopArea | null;
logDrawerOpen: boolean;
contextPanelPinned: boolean;
```

`currentView` 可以继续保留用于牌库详情、店铺被动详情等全屏详情页，但普通每日操作应使用 `activeShopArea`。

---

# 6. 内容生成策略

旧策略：进入某 phase 时自动生成。

新策略：点击对应区域时 ensure。

```text
公告牌：ensureMarketEvent。
后门货源：ensureProductCandidates。
订单板：ensureCustomerOrders。
牌盒：ensureDailyDraw。
保险柜：日结后 ensureRewardState。
```

ensure 函数必须幂等：

```text
同一天重复点击不重复生成。
进入下一天后 taskFlags 重置，可重新生成。
```

---

# 7. 交易预览刷新策略

以下操作后必须刷新交易预览：

```text
选择商品
选择顾客
选择定价方式
鉴定
洗标
包装
公关
使用卡牌
商品售出
日结
进入下一天
```

交易预览仍由 `rules_deal.ts` 提供，不得在 UI 层重新写公式。

---

# 8. Debug 保留要求

Debug 面板必须继续支持：

```text
固定 seed
固定测试局
复制 AppState / RunState / DayState / DeckState / DealPreview
验收清单
```

需要新增或更新测试局：

```text
任意顺序测试局
无库存点击砧板测试局
重复点击抽牌测试局
日结后锁定测试局
第 8 天最终报告测试局
```

---

# 9. 技术验收标准

```text
1. renderApp 不再调用 renderPhaseGuide 作为正式主 UI。
2. renderApp 不再以 renderMainStageContent 的 phase switch 作为主内容。
3. 店铺区域点击通过 action 修改 uiState.activeShopArea。
4. 新闻、进货、接单、抽牌由 ensure 函数幂等触发。
5. 旧 advancePhase 不再作为正式营业主入口。
6. selectProduct / selectCustomer / selectPricing 不再被旧处理 / 出售阶段限制。
7. confirmSell 依据选择完整性和预览合法性，而不是 DAY_SELL。
8. 日结后经营动作全部 disabled。
9. 规则层不依赖 UI 层。
10. Debug 面板仍可打开并加载测试局。
```
