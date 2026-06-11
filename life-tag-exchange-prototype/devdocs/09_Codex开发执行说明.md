# 09_Codex开发执行说明

文档编号：09  
文档名称：Codex 开发执行说明  
项目名称：《人生标签交易所：牛马肉铺》HTML 快速验证原型  
对应策划案版本：核心策划案 v0.5  
文档版本：v0.2  
状态：已按店铺式主界面交互重构改写。  
优先级说明：若本文档与 10_店铺式主界面交互重构规格.md 冲突，以 10 为准。

---

# 1. Codex 当前任务目标

本轮任务不是继续完善旧阶段页面，而是把现有实现重构为：

```text
仿真店铺主界面
+
ShopZone 点击触发功能
+
新闻 / 进货 / 接单 / 抽牌任意顺序
+
日结 / 收店奖励硬边界
```

必须先阅读：

```text
10_店铺式主界面交互重构规格.md
01_核心玩法流程规格.md
06_UI页面与交互规格.md
07_HTML技术实现规格.md
08_测试用例与验收清单.md
```

本轮不得改写：

```text
售价公式
爆雷公式
事故阈值
奖励配置
标签、商品、顾客、卡牌 JSON 内容
```

---

# 2. 第 0 步审计结果摘要

当前代码已经确认存在以下阶段式依赖：

```text
src/core/constants.ts：RunPhase 仍包含旧 8 阶段。
src/core/dayFlow.ts：NEXT_PHASE、advancePhase、ensurePhaseContent 强依赖 phase。
src/core/actions.ts：selectProduct、selectPricingMode、confirmSell、useBaseAction、playCard 等检查 phase。
src/ui/bindEvents.ts：advance-phase、return-to-process、skip-sale-to-resolve 等事件仍是旧流程。
src/ui/render.ts：调用 renderPhaseGuide 和 renderMainStageContent。
src/ui/renderPhaseGuide.ts：显示旧 8 阶段导航。
src/ui/renderStageContent.ts：按 app.state.phase switch 渲染旧阶段页面。
src/ui/renderProducts.ts / renderCustomers.ts / renderPricing.ts / renderDealPreview.ts：部分选择和按钮可用性依赖 phase。
```

可保留组件：

```text
商品卡
库存卡
顾客卡
手牌
基础操作
定价
交易预览
日志
店铺状态
Debug
```

必须新增或重构：

```text
ShopScene
ShopZone
ContextPanel
TodayTaskBar
DealPreviewDock
HandDock
LogDrawer
ShopArea / activeShopArea
ensureMarketEvent / ensureProductCandidates / ensureCustomerOrders / ensureDailyDraw
resolveDay
```

---

# 3. 开发批次

Codex 必须按批次开发，不得一次性大改全部文件。

## Batch 1：状态与 Action 层改造

目标：先让非线性任务触发成立，不改大 UI。

应做：

```text
1. 新增 ShopArea 枚举或常量。
2. 扩展 UIState：activeShopArea、logDrawerOpen、contextPanelPinned。
3. 扩展 DayState：taskFlags，或建立 phaseFlags 到 taskFlags 的兼容层。
4. 新增 openShopArea(app, areaId)。
5. 新增 ensureMarketEvent(app)。
6. 新增 ensureProductCandidates(app)。
7. 新增 ensureCustomerOrders(app)。
8. 新增 ensureDailyDraw(app)。
9. 新增 resolveDay(app)。
10. 保留 Debug 可用。
```

禁止：

```text
不要改 rules_price / rules_risk / rules_accident / rules_deal。
不要重写所有 UI。
不要删除 advancePhase，短期仅从正式 UI 脱钩。
```

验收：

```text
同一天重复 ensure 不重刷内容。
进入下一天后 taskFlags 重置。
```

## Batch 2：ShopScene UI 骨架

目标：主界面从阶段页改为店铺场景。

应做：

```text
1. 新增 renderShopScene.ts。
2. 新增 renderShopZones.ts。
3. 新增 renderTodayTaskBar.ts。
4. 新增 renderContextPanel.ts。
5. 新增 renderDocks.ts，至少包含 DealPreviewDock / HandDock。
6. 修改 render.ts，使正式主 UI 调用新结构。
7. renderPhaseGuide 不再作为正式主 UI 显示。
```

验收：

```text
开始新局后看到 ShopScene。
点击不同 ShopZone 可切换 ContextPanel。
```

## Batch 3：接入新闻、进货、订单、抽牌

目标：四个非强制顺序任务可用。

应做：

```text
公告牌 → ensureMarketEvent。
后门货源 → ensureProductCandidates。
订单板 → ensureCustomerOrders。
牌盒 → ensureDailyDraw。
```

验收：

```text
可按任意顺序点击。
重复点击不重复生成。
```

## Batch 4：接入库存、砧板、收银台

目标：加工与出售不再依赖 DAY_PROCESS / DAY_SELL 页面。

应做：

```text
1. ContextPanel.process 复用 renderInventoryPanel、renderProductDetail、renderActions、renderHand。
2. ContextPanel.cashier 复用 renderInventoryPanel、renderCustomers、renderPricing、renderDealPreview。
3. selectProduct / selectCustomerOrder / selectPricingMode 改为依据 dayResolved 与对象合法性判断，不依据旧 phase。
4. confirmSell 改为依据选择完整性与预览合法性判断，不依据 DAY_SELL。
5. useBaseAction / playCard 保持资源与目标检查，但改为依据 dayResolved / actionPoints / cash，不依据 DAY_PROCESS。
```

验收：

```text
玩家可以在店铺界面选择商品、顾客、定价并出售。
交易预览常驻刷新。
```

## Batch 5：接入日结、奖励、下一天、最终报告

目标：保留每日硬边界。

应做：

```text
账本 → resolveDay。
保险柜 → ensureRewardState / renderRewards。
finishRewardPhase → 下一天或最终报告。
日结后锁定经营动作。
```

验收：

```text
日结后不能继续进货、抽牌、加工、出售。
奖励完成后进入下一天。
第 8 天后显示报告。
```

## Batch 6：测试与清理

应做：

```text
1. 更新 Debug 测试局。
2. 增加任意顺序测试路径。
3. 删除正式 UI 中旧 advance-phase 按钮。
4. 保留旧阶段函数作为 Debug 兼容或移除死代码。
5. 执行 08 文档中的 TEST_SHOP_*。
```

---

# 4. 绝对禁止事项

```text
不得把所有逻辑写进 render.ts。
不得把售价、爆雷、事故计算写进 UI。
不得删除 Debug。
不得让重复点击进货区刷新商品。
不得让重复点击牌盒重复抽牌。
不得让日结后还能加工或出售。
不得让普通鉴定完全揭示暗风险。
不得让未知信息时显示精确风险值。
不得把现金作为胜利目标。
```

---

# 5. 每批输出要求

每批完成后 Codex 必须输出：

```text
1. 修改了哪些文件。
2. 新增了哪些函数 / 组件。
3. 删除或废弃了哪些旧入口。
4. 手动测试步骤。
5. 已知 TODO。
6. 是否触碰规则层；如果触碰，说明原因。
```

如果发现规格不明确，不要自行新增大系统。应优先选择最小实现，并在 TODO 中标注。
