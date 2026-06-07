# 07_HTML技术实现规格

文档编号：07  
文档名称：HTML 技术实现规格  
项目名称：《人生标签交易所：牛马肉铺》HTML 快速验证原型  
对应策划案版本：核心策划案 v0.5  
文档版本：v0.1  
用途：定义 HTML 原型第一版的技术路线、目录结构、模块职责、数据加载、运行时状态、渲染流程、交互事件、计算模块、随机生成、存档、错误处理、Debug 工具、测试方式和开发执行顺序。  
适用对象：前端开发者、AI Agent / Codex、游戏设计者、测试者。

---

# 1. 文档目的

本文档用于把已经完成的玩法流程、系统规则、数据结构、配置表、计算规格和 UI 规格，转化为可直接开发的 HTML 技术实现方案。

本文档重点回答：

1. 第一版 HTML 原型采用什么技术栈；
2. 项目目录如何组织；
3. 每个 JS 文件负责什么；
4. 数据 JSON 如何加载、校验和索引；
5. RunState、DayState、DeckState 如何在代码中维护；
6. 玩家点击按钮后如何调用 action；
7. action 如何修改状态；
8. 状态变化后如何刷新 UI；
9. 售价、爆雷、事故计算模块如何接入；
10. 随机生成如何实现并尽量可复现；
11. 本地存档如何实现；
12. Debug 面板如何辅助测试；
13. Codex / AI Agent 应按什么顺序开发；
14. 第一版完成到什么程度算技术验收通过。

本文档不负责：

- 重新定义游戏规则；
- 重新定义 UI 布局；
- 重新定义配置表内容；
- 重新设计数值公式；
- 编写正式版 Unity 架构；
- 设计正式美术、动画、音效；
- 实现后端、账号、在线排行榜或多人功能。

---

# 2. 技术路线总原则

## 2.1 第一版推荐技术栈

第一版采用：

```text
HTML + CSS + Vanilla JavaScript
```

即：

```text
不使用 React
不使用 Vue
不使用后端
不使用数据库
不使用构建工具也可以运行
```

推荐理由：

1. 原型目标是快速验证玩法闭环，不是展示工程能力；
2. 游戏状态规模较小，Vanilla JS 足够；
3. 文件可直接本地打开或通过简单静态服务器运行；
4. 便于 Codex / AI Agent 逐文件修改；
5. 便于后续迁移到 Unity 或 TypeScript 项目。

## 2.2 可选增强方案

如果后续希望增加类型约束和更强维护性，可以升级为：

```text
Vite + TypeScript
```

但第一版不强制。

本文档默认以 Vanilla JavaScript 写法为基准。  
所有模块设计应尽量保持可迁移：后续可以将 `.js` 改为 `.ts`，将对象结构改为 interface。

## 2.3 运行方式

推荐运行方式：

```text
方式 A：VS Code Live Server
方式 B：npx serve
方式 C：python -m http.server
方式 D：任意静态网页托管
```

不推荐直接双击打开 `index.html` 作为唯一运行方式。

原因：

```text
浏览器对 file:// 下 fetch JSON 有限制。
如果数据通过 /data/*.json 加载，必须通过本地 HTTP 服务运行。
```

---

# 3. 技术目标

## 3.1 第一版必须做到

第一版技术实现必须支持：

```text
8 天单局
静态 JSON 数据加载
RunState / DayState / DeckState 管理
每日阶段推进
商品候选生成
商品买入
顾客生成
抽牌
基础操作
出牌
选择商品 / 顾客 / 定价
交易预览
确认出售
售价计算
爆雷计算
事故结算
收店奖励
胜利 / 失败
最终报告
操作日志
Debug 面板
本地存档，可选但建议实现
```

## 3.2 第一版不做

第一版不实现：

```text
后端服务
账号系统
云存档
在线排行榜
复杂动画系统
复杂音频系统
多语言系统
移动端适配
响应式高级布局
正式版性能优化
加密或反作弊
多人同步
```

## 3.3 技术验收标准

第一版完成后，应能做到：

```text
1. 打开网页后可以开始新局；
2. 玩家可以从第 1 天玩到第 8 天；
3. 所有 P0 按钮有明确 enabled / disabled 状态；
4. 交易预览能随选择和操作实时刷新；
5. 出售后现金、累计利润、信誉、库存、日志正确变化；
6. 事故由最终爆雷值确定，不使用随机事故骰子；
7. 事故弹窗能显示事故链条；
8. 收店奖励能改变牌组、被动或货源倾向；
9. 最终报告能说明胜负和主要数据；
10. 控制台没有持续报错；
11. 修改 JSON 配置后，不需要改核心逻辑即可新增标签、商品、顾客、新闻或卡牌；
12. Debug 面板可以快速进入指定测试场景。
```

---

# 4. 推荐项目目录

第一版推荐目录结构如下：

```text
life-tag-exchange-prototype/
  index.html
  style.css
  README.md

  data/
    gameConfig.json
    tags.json
    darkRisks.json
    tagConflicts.json
    productTemplates.json
    customers.json
    marketEvents.json
    cards.json
    passives.json
    supplySources.json
    baseActions.json
    pricingModes.json
    accidents.json
    rewards.json
    endingEvaluations.json

  src/
    main.js
    constants.js
    dataLoader.js
    schemaValidator.js
    indexes.js

    state.js
    selectors.js
    rng.js
    logger.js
    storage.js

    dayFlow.js
    generator.js
    deck.js
    actions.js

    rules_conditions.js
    rules_effects.js
    rules_price.js
    rules_risk.js
    rules_accident.js
    rules_deal.js
    rules_rewards.js
    rules_report.js

    render.js
    ui_components.js
    ui_panels.js
    ui_modals.js
    ui_events.js
    ui_formatters.js

    debug.js
    testScenarios.js
```

## 4.1 最小实现目录

如果第一版需要更快启动，可以先压缩为：

```text
index.html
style.css

src/main.js
src/dataLoader.js
src/state.js
src/actions.js
src/rules.js
src/render.js
src/debug.js

data/*.json
```

但最终建议拆回完整目录。  
原因：售价、爆雷、事故、UI、行动逻辑混在一个文件里，会很快不可维护。

---

# 5. HTML 文件规格

## 5.1 index.html 职责

`index.html` 只负责页面骨架，不写复杂逻辑。

必须包含：

```text
1. 文档标题；
2. CSS 引用；
3. 根容器 #app；
4. 弹窗容器 #modal-root；
5. Toast 容器 #toast-root；
6. Debug 容器 #debug-root；
7. main.js 入口脚本。
```

推荐结构：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>人生标签交易所：牛马肉铺 HTML 原型</title>
  <link rel="stylesheet" href="./style.css" />
</head>
<body>
  <div id="app"></div>
  <div id="modal-root"></div>
  <div id="toast-root"></div>
  <div id="debug-root"></div>

  <script type="module" src="./src/main.js"></script>
</body>
</html>
```

## 5.2 index.html 禁止事项

不得在 `index.html` 中：

```text
写大量游戏逻辑
写大量 onclick 内联脚本
硬编码完整配置数据
硬编码交易计算公式
硬编码所有 UI 卡片内容
```

---

# 6. CSS 文件规格

## 6.1 style.css 职责

`style.css` 负责第一版视觉结构与可读性。

第一版 CSS 目标：

```text
清楚
可读
稳定
便于调试
桌面浏览器优先
```

不是：

```text
最终美术风格
复杂响应式
动画演出
移动端体验
```

## 6.2 推荐 CSS 分区

`style.css` 推荐按以下顺序书写：

```text
1. Reset / 基础变量
2. 页面整体布局
3. 顶部状态栏
4. 主网格布局
5. 通用面板 panel
6. 商品卡 product-card
7. 顾客卡 customer-card
8. 卡牌 card-view
9. 标签 tag-pill
10. 按钮 button
11. 交易预览 deal-preview
12. 日志 log-panel
13. 弹窗 modal
14. Toast
15. Debug 面板
16. 工具类
```

## 6.3 推荐布局

桌面版主界面推荐：

```text
顶部：状态栏 + 阶段提示
主体：三列或四列网格
底部：手牌 / 操作 / 日志，可根据屏幕高度放置
```

基础结构：

```css
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-layout {
  display: grid;
  grid-template-columns: 280px 360px 360px 1fr;
  gap: 12px;
  padding: 12px;
}
```

实际列宽可由开发时调整，但必须保证：

```text
商品、顾客、交易预览同时可见。
```

---

# 7. JavaScript 模块总览

## 7.1 模块分层

JS 代码分为 6 层：

```text
入口层：main.js
数据层：dataLoader / schemaValidator / indexes
状态层：state / selectors / storage / logger / rng
规则层：rules_*
行为层：actions / dayFlow / generator / deck
表现层：render / ui_components / ui_panels / ui_modals / ui_events / ui_formatters
调试层：debug / testScenarios
```

## 7.2 依赖方向

依赖方向必须保持单向：

```text
main
  → dataLoader
  → state
  → actions
  → rules
  → render
```

规则：

```text
规则层不得依赖 UI 层。
数据层不得依赖 UI 层。
状态层不得依赖 UI 层。
UI 层可以读取 state 和调用 actions。
```

禁止：

```text
rules_price.js 直接操作 DOM
rules_risk.js 直接弹窗
actions.js 里拼接大量 HTML
render.js 里直接修改游戏规则
```

---

# 8. main.js 入口规格

## 8.1 main.js 职责

`main.js` 是项目入口。

职责：

```text
1. 加载所有 JSON 配置；
2. 校验配置；
3. 建立索引；
4. 创建 AppRuntime；
5. 初始化新局或读取存档；
6. 绑定全局事件；
7. 首次 render；
8. 初始化 Debug 面板。
```

## 8.2 推荐启动流程

```js
import { loadAllData } from './dataLoader.js';
import { validateAllData } from './schemaValidator.js';
import { buildIndexes } from './indexes.js';
import { createNewGame } from './state.js';
import { loadSave } from './storage.js';
import { renderApp } from './render.js';
import { bindGlobalEvents } from './ui_events.js';
import { initDebugPanel } from './debug.js';

async function bootstrap() {
  const rawData = await loadAllData();
  validateAllData(rawData);
  const indexes = buildIndexes(rawData);

  const saved = loadSave();
  const runtime = saved ?? createNewGame(rawData.gameConfig, indexes);

  window.__APP__ = {
    data: rawData,
    indexes,
    state: runtime,
  };

  bindGlobalEvents(window.__APP__);
  renderApp(window.__APP__);
  initDebugPanel(window.__APP__);
}

bootstrap().catch((error) => {
  console.error(error);
  document.querySelector('#app').innerHTML = `
    <div class="fatal-error">
      <h1>配置或程序加载失败</h1>
      <pre>${String(error.stack || error.message || error)}</pre>
    </div>
  `;
});
```

## 8.3 window.__APP__ 说明

第一版允许使用：

```text
window.__APP__
```

作为 Debug 入口。

结构：

```js
window.__APP__ = {
  data,
  indexes,
  state,
  dispatch,
  render,
  debug
};
```

正式版可以移除。

---

# 9. 数据加载规格

## 9.1 dataLoader.js 职责

`dataLoader.js` 负责加载 `/data/*.json`。

推荐函数：

```js
export async function loadJson(path) {}
export async function loadAllData() {}
```

## 9.2 loadAllData 输出

```js
{
  gameConfig,
  tags,
  darkRisks,
  tagConflicts,
  productTemplates,
  customers,
  marketEvents,
  cards,
  passives,
  supplySources,
  baseActions,
  pricingModes,
  accidents,
  rewards,
  endingEvaluations
}
```

## 9.3 数据加载错误处理

如果某个 JSON 加载失败：

```text
1. 控制台输出具体路径；
2. 页面显示“配置数据加载失败”；
3. 禁止开始游戏；
4. Debug 面板显示失败文件名。
```

不得静默失败。

## 9.4 JSON 格式要求

每个数据文件推荐统一使用数组或对象，但同类必须一致。

推荐：

```json
[
  { "id": "tag_young", "displayName": "年轻" },
  { "id": "tag_elite_school", "displayName": "名校" }
]
```

`gameConfig.json` 可以是单个对象。

---

# 10. 配置校验规格

## 10.1 schemaValidator.js 职责

第一版可以不引入 JSON Schema 库，但必须做基础校验。

必须检查：

```text
1. 所有对象有 id；
2. 同一配置表内 id 不重复；
3. 引用的 tagId 存在；
4. 引用的 customerId 存在；
5. 引用的 cardId 存在；
6. 引用的 passiveId 存在；
7. 引用的 supplySourceId 存在；
8. pricingMode 至少包含 4 种基础定价；
9. AccidentLevel 包含 none/minor/medium/major/severe；
10. GameConfig 必填字段存在；
11. initialDeckCardIds 中所有卡牌存在；
12. ProductTemplate 的 hiddenTagPool / visibleTagIds / darkRiskPool 引用有效。
```

## 10.2 校验失败显示

校验失败时：

```text
抛出 Error
错误信息必须包含：
- 数据文件名
- 对象 id
- 字段名
- 失败原因
```

示例：

```text
[customers.json][customer_bigtech_hr] tabooTags 引用了不存在的 tagId: tag_unknown
```

## 10.3 校验不负责内容平衡

校验只负责结构正确，不负责判断：

```text
数值是否平衡
卡牌是否太强
事故是否太重
文案是否好笑
```

---

# 11. 索引规格

## 11.1 indexes.js 职责

`indexes.js` 将数组配置转为 Map，避免每次计算时重复查找。

推荐函数：

```js
export function buildIndexes(data) {}
```

## 11.2 推荐索引结构

```js
{
  tagsById: Map,
  darkRisksById: Map,
  tagConflictsById: Map,
  productTemplatesById: Map,
  customersById: Map,
  marketEventsById: Map,
  cardsById: Map,
  passivesById: Map,
  supplySourcesById: Map,
  baseActionsById: Map,
  pricingModesById: Map,
  accidentsByLevel: Map,
  rewardsById: Map,

  tagConflictsByTagPair: Map,
  customerPreferencesByCustomerId: Map,
  customerTaboosByCustomerId: Map,
  cardsByType: Map,
  rewardsByType: Map,
  productTemplatesByTag: Map
}
```

## 11.3 tagPair Key

标签组合索引推荐 key：

```js
function makeTagPairKey(tagA, tagB) {
  return [tagA, tagB].sort().join('__');
}
```

用于快速查找标签冲突 / 支撑。

---

# 12. 状态管理规格

## 12.1 state.js 职责

`state.js` 负责创建和维护运行时状态。

必须提供：

```js
createNewGame(gameConfig, indexes, options)
createInitialRunState(gameConfig)
createInitialDayState()
createInitialDeckState(gameConfig)
cloneState(state)
```

## 12.2 AppState 总结构

推荐结构：

```js
{
  runState,
  dayState,
  deckState,
  uiState,
  debugState,
  meta
}
```

其中：

```text
runState：整局长期状态
dayState：当天短期状态
deckState：牌组状态
uiState：仅用于 UI 选择、弹窗、toast、展开项
debugState：调试专用
meta：版本号、seed、创建时间等
```

## 12.3 RunState

核心字段：

```js
{
  currentDay: 1,
  maxDays: 8,
  cash: 100,
  totalProfit: 0,
  targetTotalProfit: 500,
  reputation: 100,
  maxReputation: 100,
  inventory: [],
  activePassives: [],
  activeSupplySources: [],
  runLog: [],
  dealLog: [],
  accidentLog: [],
  rewardLog: [],
  result: 'running',
  failReason: 'none'
}
```

## 12.4 DayState

核心字段：

```js
{
  dayNumber: 1,
  phase: 'DAY_OPENING',
  actionPoints: 3,
  marketEvent: null,
  productCandidates: [],
  customerOrders: [],
  rewardOptions: [],
  boughtProductCount: 0,
  soldProductCount: 0,
  selectedProductId: null,
  selectedCustomerId: null,
  selectedPricingModeId: null,
  currentDealPreview: null,
  temporaryDayModifiers: [],
  phaseFlags: {}
}
```

## 12.5 DeckState

核心字段：

```js
{
  drawPile: [],
  hand: [],
  discardPile: [],
  exhaustPile: []
}
```

## 12.6 UIState

UIState 不参与核心计算。

推荐结构：

```js
{
  activeModal: null,
  modalPayload: null,
  toastQueue: [],
  selectedTagIdForWash: null,
  expandedPanelIds: [],
  activeTab: 'inventory',
  previewPinned: true,
  lastError: null
}
```

## 12.7 状态修改原则

所有状态修改必须通过 action 函数完成。

允许：

```js
actions.buyProduct(app, productId)
actions.useBaseAction(app, actionId, payload)
actions.confirmSell(app)
```

禁止：

```js
button.onclick = () => {
  app.state.runState.cash -= 20;
}
```

原因：

```text
状态修改必须统一触发日志、预览刷新、胜负检查、存档和 UI 重绘。
```

---

# 13. Action 调度规格

## 13.1 actions.js 职责

`actions.js` 是玩家操作入口。

所有按钮点击最终都调用这里的函数。

推荐导出：

```js
export const Actions = {
  startNewRun,
  advancePhase,
  buyProduct,
  selectProduct,
  selectCustomer,
  selectPricingMode,
  useBaseAction,
  playCard,
  confirmSell,
  returnToProcess,
  chooseReward,
  closeModal,
  saveGame,
  loadGame,
  resetGame
};
```

## 13.2 action 通用流程

每个 action 推荐执行顺序：

```text
1. 校验当前 phase；
2. 校验目标对象存在；
3. 校验资源是否足够；
4. 校验规则条件是否满足；
5. 修改状态；
6. 写入日志；
7. 刷新交易预览；
8. 检查失败 / 胜利；
9. 自动存档；
10. renderApp。
```

## 13.3 推荐工具函数

```js
function afterStateChanged(app, options = {}) {
  refreshDealPreviewIfNeeded(app);
  checkRunEndConditions(app);
  saveGame(app.state);
  renderApp(app);
}
```

## 13.4 action 返回值

Action 可以返回：

```js
{
  ok: true,
  message: '买入成功',
  payload: {}
}
```

失败时返回：

```js
{
  ok: false,
  reason: 'cash_not_enough',
  message: '现金不足，无法买入。'
}
```

UI 可以根据返回值显示 toast。

---

# 14. 阶段推进实现规格

## 14.1 dayFlow.js 职责

`dayFlow.js` 负责阶段切换和每日开始 / 每日结束。

推荐函数：

```js
startDay(app)
enterOpeningPhase(app)
enterPurchasePhase(app)
enterCustomerPhase(app)
enterDrawPhase(app)
enterProcessPhase(app)
enterSellPhase(app)
enterResolvePhase(app)
enterRewardPhase(app)
endDay(app)
endRun(app)
```

## 14.2 phase 切换表

```text
RUN_INIT → DAY_OPENING
DAY_OPENING → DAY_PURCHASE
DAY_PURCHASE → DAY_CUSTOMER
DAY_CUSTOMER → DAY_DRAW
DAY_DRAW → DAY_PROCESS
DAY_PROCESS → DAY_SELL
DAY_SELL → DAY_PROCESS，可选，只允许在未结算前返回
DAY_SELL → DAY_RESOLVE
DAY_RESOLVE → DAY_REWARD
DAY_REWARD → DAY_OPENING，下一天
DAY_REWARD → RUN_END，第 8 天后
任意阶段 → RUN_FAILED，如果现金 < 0 或信誉 <= 0
```

## 14.3 advancePhase 实现

`advancePhase(app)` 根据当前 phase 决定下一个 phase。

伪代码：

```js
function advancePhase(app) {
  const phase = app.state.dayState.phase;

  switch (phase) {
    case 'DAY_OPENING':
      enterPurchasePhase(app);
      break;
    case 'DAY_PURCHASE':
      enterCustomerPhase(app);
      break;
    case 'DAY_CUSTOMER':
      enterDrawPhase(app);
      break;
    case 'DAY_DRAW':
      enterProcessPhase(app);
      break;
    case 'DAY_PROCESS':
      enterSellPhase(app);
      break;
    case 'DAY_SELL':
      enterResolvePhase(app);
      break;
    case 'DAY_RESOLVE':
      enterRewardPhase(app);
      break;
    case 'DAY_REWARD':
      endDay(app);
      break;
    default:
      throw new Error(`无法推进未知阶段: ${phase}`);
  }
}
```

## 14.4 阶段进入时机的自动操作

每个 enter 函数只做该阶段必要的自动操作。

例如：

```text
enterPurchasePhase：生成商品候选
enterCustomerPhase：生成顾客订单
enterDrawPhase：抽牌
enterRewardPhase：生成奖励选项
endDay：弃牌、天数 +1、进入下一日或最终报告
```

不得在 render 中生成商品、抽牌或发奖励。

---

# 15. 随机数与生成规格

## 15.1 rng.js 职责

第一版建议实现简单可复现随机数。

推荐：

```js
export function createRng(seed) {}
export function randomFloat(rng) {}
export function randomInt(rng, min, max) {}
export function weightedPick(rng, items, weightGetter) {}
export function shuffle(rng, array) {}
```

## 15.2 Seed 规则

新局创建时生成：

```js
meta.seed = Date.now()
```

Debug 面板允许输入固定 seed。

目的：

```text
复现测试局
复现疑难 bug
复现事故链条
```

## 15.3 generator.js 职责

`generator.js` 负责生成：

```text
商品候选
商品实例
隐藏标签
暗风险
顾客订单
市场新闻
收店奖励
```

推荐函数：

```js
generateMarketEvent(app)
generateProductCandidates(app, count)
generateProductInstance(template, app)
generateHiddenTags(template, app)
generateDarkRisk(template, app)
generateCustomerOrders(app, count)
generateRewardOptions(app, count)
```

## 15.4 生成禁止事项

生成逻辑不得：

```text
修改已售商品
跳过配置权重
直接写死某一天一定出现某商品，除非是测试场景
在事故结算时重新随机暗风险
在出售确认后重新随机隐藏标签
```

隐藏标签和暗风险必须在 ProductInstance 生成时确定。  
出售时只揭示和结算，不重新抽取。

---

# 16. 牌组实现规格

## 16.1 deck.js 职责

`deck.js` 负责牌组操作。

推荐函数：

```js
createInitialDeck(gameConfig, indexes, rng)
drawCards(deckState, count, rng)
shuffleDiscardIntoDraw(deckState, rng)
moveCardFromHandToDiscard(deckState, cardInstanceId)
moveCardFromHandToExhaust(deckState, cardInstanceId)
addCardToDeck(deckState, cardId, options)
removeCardFromDeck(deckState, cardInstanceId)
upgradeCard(deckState, cardInstanceId, upgradedCardId)
cleanupHandAtEndOfDay(deckState)
```

## 16.2 CardInstance 结构

```js
{
  instanceId: 'card_inst_0001',
  cardId: 'card_low_salary_pitch',
  upgraded: false,
  temporary: false,
  createdBy: 'initial_deck'
}
```

## 16.3 抽牌规则

```text
1. 从 drawPile 顶部取牌；
2. drawPile 不足时，将 discardPile 洗入 drawPile；
3. 仍不足时，能抽多少抽多少；
4. 抽到的牌进入 hand；
5. 每日结束时 hand 中非临时牌进入 discardPile；
6. 临时牌移除。
```

## 16.4 出牌处理

出牌 action 执行：

```text
1. 校验卡牌在 hand；
2. 校验 phase == DAY_PROCESS；
3. 校验 AP 与现金；
4. 校验 target 合法；
5. 执行 effects；
6. 移动卡牌到 discardPile 或 exhaustPile；
7. 刷新交易预览；
8. 写日志。
```

---

# 17. Condition 系统实现规格

## 17.1 rules_conditions.js 职责

`rules_conditions.js` 负责判断通用 Condition。

推荐函数：

```js
export function evaluateCondition(condition, context) {}
export function evaluateConditionList(conditions, context) {}
```

## 17.2 context 结构

```js
{
  app,
  runState,
  dayState,
  deckState,
  product,
  customer,
  pricingMode,
  card,
  reward,
  marketEvent,
  indexes,
  mode: 'preview' | 'resolve' | 'action'
}
```

## 17.3 必须实现的条件类型

第一版至少实现：

```text
always
all
any
not
product_has_tag
product_has_any_tag
product_has_all_tags
product_has_tag_category
product_has_unrevealed_hidden_tag
product_has_unresolved_dark_risk
product_has_dark_risk
product_dark_risk_category_is
target_tag_is_washable
target_tag_revealed
customer_is
customer_type_is
customer_has_preference_tag
customer_has_taboo_tag
market_event_active
pricing_mode_is
deal_risk_above
deal_price_above
accident_level_is
has_passive
has_supply_source
cash_at_least
reputation_at_least
day_is
day_at_least
```

## 17.4 未实现条件处理

如果配置中出现未实现 condition type：

```text
开发模式：抛出 Error
发布试玩模式：条件视为 false，并在 Debug 面板显示 warning
```

第一版建议直接抛错，避免配置无效却不知情。

---

# 18. Effect 系统实现规格

## 18.1 rules_effects.js 职责

`rules_effects.js` 负责执行通用 Effect。

推荐函数：

```js
executeEffects(effects, context)
executeEffect(effect, context)
```

## 18.2 必须实现的效果类型

第一版至少实现：

```text
add_applied_tag_to_product
suppress_tag
reveal_hidden_tags
reveal_dark_risk_category
reveal_dark_risk_full
add_product_modifier
add_deal_modifier
add_global_modifier
add_price
add_risk
multiply_price
reduce_risk
draw_cards
gain_cash
lose_cash
gain_reputation
lose_reputation
increase_accident_level
decrease_accident_level
modify_accident_result
add_card_to_deck
upgrade_card
remove_card_from_deck
add_shop_passive
add_supply_source
add_temporary_card
convert_accident_to_heat
```

## 18.3 Effect 执行原则

Effect 执行必须：

```text
1. 先判断 condition；
2. 再执行效果；
3. 修改数据时只修改合法目标；
4. 写入 effectLog 或 runLog；
5. 返回执行结果；
6. 对无法执行的效果给出 reason。
```

## 18.4 Effect 禁止事项

Effect 不得：

```text
直接操作 DOM
直接打开弹窗
直接调用 render
绕过 action 造成现金负数，除非这是事故结算
删除真实标签数据
让普通鉴定完全揭示暗风险
随机决定事故是否发生
```

---

# 19. 售价计算模块接入规格

## 19.1 rules_price.js 职责

`rules_price.js` 只负责售价计算，不修改状态。

推荐函数：

```js
calculatePrice(context)
collectEffectiveBudget(context)
collectEffectiveKnownTags(context)
collectPriceBreakdown(context)
applyBudgetCap(priceBeforeBudgetCap, effectiveBudget, context)
```

## 19.2 输入

```js
{
  mode: 'preview' | 'resolve',
  product,
  customer,
  pricingMode,
  marketEvent,
  runState,
  dayState,
  activePassives,
  indexes,
  config
}
```

## 19.3 输出

```js
{
  rawPrice,
  multiplier,
  priceBeforeBudgetCap,
  effectiveBudget,
  finalPrice,
  estimatedProfit,
  priceBreakdown
}
```

## 19.4 约束

`calculatePrice` 不得：

```text
修改 cash
修改 totalProfit
修改 product
修改 UI
写日志
决定事故
```

它只能计算并返回结果。

---

# 20. 爆雷计算模块接入规格

## 20.1 rules_risk.js 职责

`rules_risk.js` 只负责风险计算，不修改状态。

推荐函数：

```js
calculateRisk(context)
calculateKnownRisk(context)
calculateUnknownHiddenRiskRange(context)
calculateUnknownDarkRiskRange(context)
getRiskDisplayType(riskResult)
clampRisk(value)
```

## 20.2 输出

```js
{
  riskDisplayType: 'exact' | 'range',
  knownRisk,
  unknownHiddenRiskMin,
  unknownHiddenRiskMax,
  unknownDarkRiskMin,
  unknownDarkRiskMax,
  riskMin,
  riskMax,
  exactRisk,
  riskBreakdown,
  unknownRiskBreakdown,
  warnings
}
```

## 20.3 约束

如果存在未知信息：

```text
riskDisplayType 必须为 range
exactRisk 必须为 null
UI 不得显示精确爆雷值
```

如果不存在未知信息：

```text
riskDisplayType 必须为 exact
riskMin == riskMax == exactRisk
```

---

# 21. 事故计算模块接入规格

## 21.1 rules_accident.js 职责

`rules_accident.js` 负责：

```text
风险值转事故等级
事故等级修正
事故后果计算
事故链条生成
```

推荐函数：

```js
getAccidentLevelByRisk(risk, gameConfig)
applyAccidentLevelModifiers(baseLevel, context)
calculateAccidentOutcome(context, finalPrice, finalRisk, finalAccidentLevel)
generateAccidentChain(context, riskResult, accidentOutcome)
```

## 21.2 事故等级映射

内部数值映射：

```js
const AccidentLevelValue = {
  none: 0,
  minor: 1,
  medium: 2,
  major: 3,
  severe: 4,
};
```

## 21.3 约束

事故模块不得随机决定事故。  
事故是否发生只由 `finalRisk` 和事故等级修正规则决定。

---

# 22. 交易模块规格

## 22.1 rules_deal.js 职责

`rules_deal.js` 负责整合售价、风险、事故，生成 DealPreview 或 DealResult。

推荐函数：

```js
buildCalculationContext(app, mode)
calculateDealPreview(app)
resolveDeal(app)
```

## 22.2 calculateDealPreview

输入：当前选择的商品、顾客、定价。

输出：

```js
DealPreview
```

如果缺少必要选择：

```js
{
  valid: false,
  reason: 'missing_selection',
  message: '请选择商品、顾客和定价方式。'
}
```

完整输出：

```js
{
  valid: true,
  productId,
  customerId,
  pricingModeId,
  estimatedPrice,
  estimatedProfit,
  priceBeforeBudgetCap,
  effectiveBudget,
  riskDisplayType,
  knownRisk,
  riskMin,
  riskMax,
  exactRisk,
  accidentPredictionMin,
  accidentPredictionMax,
  priceBreakdown,
  riskBreakdown,
  unknownRiskBreakdown,
  warnings
}
```

## 22.3 resolveDeal

`resolveDeal(app)` 执行最终出售。

流程：

```text
1. 锁定 selectedProduct / selectedCustomer / selectedPricingMode；
2. 重新创建 resolve context；
3. calculatePrice(resolve)；
4. calculateRisk(resolve)，必须得出 finalRisk；
5. getAccidentLevelByRisk(finalRisk)；
6. applyAccidentLevelModifiers；
7. calculateAccidentOutcome；
8. 更新 cash；
9. 更新 totalProfit；
10. 更新 reputation；
11. 标记商品 sold；
12. 生成 DealResult；
13. 如有事故，生成 AccidentInstance；
14. 写入 dealLog / accidentLog / runLog；
15. 检查失败；
16. 打开事故弹窗或成交结果反馈。
```

## 22.4 交易结算不得复用预览结果

出售确认时必须重新计算。

原因：

```text
预览可能隐藏真实信息。
结算必须使用 ProductInstance 中真实隐藏标签和真实暗风险。
```

---

# 23. 奖励模块规格

## 23.1 rules_rewards.js 职责

`rules_rewards.js` 负责生成和应用收店奖励。

推荐函数：

```js
generateRewardOptions(app)
canChooseReward(app, rewardOption)
applyReward(app, rewardOption)
```

## 23.2 奖励生成

进入 `DAY_REWARD` 时：

```text
生成 3 个 RewardOption
```

奖励可以来自：

```text
rewards.json
cards.json
passives.json
supplySources.json
当前牌组可升级卡牌
当前牌组可删除卡牌
```

## 23.3 奖励选择规则

选择奖励前检查：

```text
cash >= reward.cashCost
reward.condition pass
reward not already chosen
phase == DAY_REWARD
```

现金不足时按钮 disabled。

## 23.4 奖励应用

奖励类型与效果：

```text
add_card：添加卡牌到牌组
upgrade_card：升级指定卡牌
remove_card：删除指定卡牌
add_passive：添加店铺被动
add_supply_source：添加货源倾向
gain_cash：获得现金
gain_reputation：恢复信誉
temporary_insurance：添加一次性事故修正
```

应用后：

```text
1. 扣现金；
2. 执行 payload；
3. 写奖励日志；
4. 进入下一天或最终结算。
```

---

# 24. 最终报告模块规格

## 24.1 rules_report.js 职责

生成 RunReport。

推荐函数：

```js
generateRunReport(app)
calculateMainBuildArchetype(runState)
calculateTopRiskSources(runState)
calculateEndingEvaluation(runState, indexes)
```

## 24.2 RunReport 必须包含

```js
{
  result,
  failReason,
  finalDay,
  finalCash,
  finalTotalProfit,
  targetTotalProfit,
  finalReputation,
  totalDeals,
  totalAccidents,
  maxSingleProfit,
  maxAccidentLevel,
  mainBuildArchetype,
  topRiskSources,
  endingEvaluationText,
  dealLog,
  accidentLog
}
```

## 24.3 流派判断

第一版可用简单计数：

```text
大厂牛马流：career 标签、职场顾客、职场卡牌使用次数
稳定相亲流：family 标签、家庭顾客、洗标/公关使用次数
MCN 发疯流：flow 标签、MCN 顾客、黑红事故转化次数
```

最高者为主要流派。

---

# 25. Render 渲染规格

## 25.1 render.js 职责

`render.js` 是 UI 重绘入口。

推荐函数：

```js
export function renderApp(app) {}
```

## 25.2 renderApp 流程

```text
1. 读取 app.state；
2. 生成 AppShell HTML；
3. 渲染顶部状态栏；
4. 渲染阶段提示；
5. 渲染各面板；
6. 渲染弹窗；
7. 渲染 Toast；
8. 渲染 Debug 面板；
9. 调用 bindDynamicEvents。
```

## 25.3 渲染方式

第一版可以使用：

```js
document.querySelector('#app').innerHTML = renderAppShell(app);
bindDynamicEvents(app);
```

不强制虚拟 DOM。

## 25.4 重绘原则

每次 action 完成后可以整页重绘。

原因：

```text
原型数据量小，整页重绘更简单可靠。
```

但必须避免：

```text
render 时修改游戏状态
render 时生成随机内容
render 时扣现金
render 时抽牌
render 时结算交易
```

渲染函数必须是纯展示函数。

---

# 26. UI 组件模块规格

## 26.1 ui_components.js

负责通用小组件：

```js
renderButton(options)
renderTagPill(tag, options)
renderResourceBadge(label, value, options)
renderBreakdownList(items, options)
renderWarningList(warnings)
renderEmptyState(message)
```

## 26.2 ui_panels.js

负责主要面板：

```js
renderHeaderStatusBar(app)
renderPhaseBar(app)
renderMarketPanel(app)
renderPassiveSupplyPanel(app)
renderProductCandidatePanel(app)
renderInventoryPanel(app)
renderProductDetailPanel(app)
renderCustomerPanel(app)
renderHandPanel(app)
renderBaseActionPanel(app)
renderPricingPanel(app)
renderDealPreviewPanel(app)
renderLogPanel(app)
```

## 26.3 ui_modals.js

负责弹窗：

```js
renderModalRoot(app)
renderAccidentModal(app, payload)
renderRewardModal(app, payload)
renderRunReportModal(app, payload)
renderConfirmModal(app, payload)
```

## 26.4 ui_formatters.js

负责格式化：

```js
formatMoney(value)
formatRisk(value)
formatRiskRange(min, max)
formatAccidentLevel(level)
formatPhaseName(phase)
formatTagName(tagId, indexes)
formatCustomerName(customerId, indexes)
formatModifierValue(item)
```

---

# 27. UI 事件绑定规格

## 27.1 ui_events.js 职责

`ui_events.js` 负责从 DOM 事件调用 Actions。

推荐函数：

```js
bindGlobalEvents(app)
bindDynamicEvents(app)
```

## 27.2 推荐事件绑定方式

使用事件委托：

```js
document.body.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]');
  if (!action) return;

  handleUiAction(app, action.dataset, event);
});
```

## 27.3 data-action 规范

按钮使用：

```html
<button data-action="buy-product" data-product-id="prod_0001">买入</button>
```

常用 data-action：

```text
start-new-run
advance-phase
buy-product
select-product
select-customer
select-pricing
use-base-action
select-wash-tag
play-card
confirm-sell
return-to-process
choose-reward
close-modal
save-game
load-game
reset-game
open-debug-scenario
```

## 27.4 UI 事件禁止事项

事件处理不得直接写游戏逻辑。

错误：

```js
if (dataset.action === 'buy-product') {
  app.state.runState.cash -= product.cost;
}
```

正确：

```js
if (dataset.action === 'buy-product') {
  Actions.buyProduct(app, dataset.productId);
}
```

---

# 28. 交易预览刷新规格

## 28.1 refreshDealPreviewIfNeeded

推荐函数：

```js
function refreshDealPreviewIfNeeded(app) {
  const { selectedProductId, selectedCustomerId, selectedPricingModeId } = app.state.dayState;

  if (!selectedProductId || !selectedCustomerId || !selectedPricingModeId) {
    app.state.dayState.currentDealPreview = {
      valid: false,
      reason: 'missing_selection',
      message: '请选择商品、顾客和定价方式。'
    };
    return;
  }

  app.state.dayState.currentDealPreview = calculateDealPreview(app);
}
```

## 28.2 必须触发刷新的 action

以下 action 完成后必须刷新预览：

```text
selectProduct
selectCustomer
selectPricingMode
useBaseAction
playCard
chooseReward，如果影响当前交易
advancePhase，如果进入处理 / 出售阶段
confirmSell 后应清空或刷新
```

## 28.3 预览失败处理

如果计算失败：

```text
1. currentDealPreview.valid = false；
2. 显示错误信息；
3. 出售按钮 disabled；
4. Debug 面板显示计算错误详情。
```

---

# 29. 本地存档规格

## 29.1 storage.js 职责

`storage.js` 负责 localStorage 保存 / 读取。

推荐函数：

```js
saveGame(state)
loadSave()
clearSave()
hasSave()
exportSave()
importSave(json)
```

## 29.2 存档 Key

```js
const SAVE_KEY = 'life_tag_exchange_prototype_save_v01';
```

## 29.3 自动存档时机

建议在每个 action 成功后自动存档。

也可以只在以下时机存档：

```text
开始新局
买入商品
使用操作 / 卡牌
出售结算后
选择奖励后
进入下一天
游戏结束
```

## 29.4 存档版本

存档必须包含：

```js
{
  saveVersion: '0.1',
  createdAt,
  updatedAt,
  state
}
```

读取存档时，如果版本不兼容：

```text
提示“存档版本过旧，请重新开始新局。”
```

第一版可以不做迁移。

---

# 30. 日志系统规格

## 30.1 logger.js 职责

统一写入日志。

推荐函数：

```js
addRunLog(app, type, message, payload)
addDealLog(app, dealResult)
addAccidentLog(app, accidentInstance)
addRewardLog(app, rewardResult)
```

## 30.2 日志结构

```js
{
  id: 'log_0001',
  day: 3,
  phase: 'DAY_PROCESS',
  type: 'base_action',
  message: '对 A号年轻名校肉 使用了鉴定，揭示 [水货]。',
  payload: {},
  createdAt: 1710000000000
}
```

## 30.3 日志类型

```text
system
phase
market
purchase
customer
draw
select
base_action
card
preview
sell
deal
accident
reward
run_end
error
```

## 30.4 日志显示

UI 默认显示最近 20 条。  
Debug 面板允许查看全部日志。

---

# 31. 错误处理规格

## 31.1 用户可恢复错误

例如：

```text
现金不足
行动点不足
未选择商品
未选择顾客
未选择定价
商品已出售
不能洗未揭示标签
盲盒价不可用
```

处理：

```text
按钮 disabled 或显示 toast。
不抛出程序异常。
```

## 31.2 程序错误

例如：

```text
配置引用不存在
未知 condition type
未知 effect type
交易计算返回 NaN
事故等级非法
```

处理：

```text
开发阶段抛出 Error
页面显示错误面板
Debug 面板记录错误
```

## 31.3 NaN 防御

所有数值计算后必须检查：

```js
if (!Number.isFinite(value)) {
  throw new Error('计算结果不是有效数字');
}
```

尤其是：

```text
finalPrice
knownRisk
riskMin
riskMax
finalRisk
refund
fine
singleProfit
cash
reputation
totalProfit
```

---

# 32. Debug 面板规格

## 32.1 debug.js 职责

Debug 面板用于快速测试，不是正式 UI。

必须支持：

```text
显示当前 phase
显示 seed
显示 RunState 摘要
显示 DayState 摘要
显示 DeckState 数量
手动保存 / 清除存档
快速加现金
快速加信誉
快速进入下一阶段
快速生成测试商品
快速生成测试顾客
快速触发测试交易
加载测试局
导出当前 state JSON
```

## 32.2 Debug 开关

推荐：

```js
const DEBUG_ENABLED = true;
```

或 URL 参数：

```text
?debug=1
```

## 32.3 Debug 禁止事项

Debug 工具可以直接改状态，但必须：

```text
1. 明显标记为 Debug；
2. 写入 debug log；
3. 不作为正式玩法入口；
4. 不影响普通玩家流程。
```

---

# 33. 测试场景规格

## 33.1 testScenarios.js 职责

定义固定测试局，帮助验证计算和流程。

推荐函数：

```js
loadScenario(app, scenarioId)
```

## 33.2 必须准备的测试场景

```text
scenario_safe_low_price
scenario_high_price_minor_accident
scenario_hidden_tag_range
scenario_dark_risk_range
scenario_blind_box_success
scenario_blind_box_backfire
scenario_mcn_minor_to_heat
scenario_bigtech_fake_elite_severe
scenario_reward_add_passive
scenario_final_victory
scenario_final_failure_reputation
```

## 33.3 测试场景结构

```js
{
  id: 'scenario_bigtech_fake_elite_severe',
  displayName: '大厂名校水货严重事故',
  description: '验证 [名校] + [水货] + 高价卖 + 履历暗风险 + 大厂 HR。',
  setup(app) {
    // 直接设置 state
  },
  expected: {
    riskMin: 100,
    accidentLevel: 'severe'
  }
}
```

## 33.4 测试场景用途

```text
1. 前端开发时快速检查 UI；
2. 数值调整后检查事故阈值；
3. Codex 修改后回归测试；
4. 试玩前准备展示案例。
```

---

# 34. 手动测试清单

## 34.1 启动测试

|测试项|验收标准|
|---|---|
|页面打开|无控制台错误|
|配置加载|所有 JSON 成功加载|
|开始新局|显示第 1 / 8 天，现金 100，利润 0 / 500，信誉 100|
|Debug 面板|可显示当前状态|

## 34.2 流程测试

|测试项|验收标准|
|---|---|
|开店阶段|生成 1 条市场新闻|
|进货阶段|生成 4 个候选商品|
|买入商品|现金减少，库存增加|
|接单阶段|生成 3 个顾客|
|抽牌阶段|手牌数量变为 5|
|处理阶段|可以选择商品、顾客、定价|
|出售阶段|满足条件时出售按钮可用|
|结算阶段|产生 DealResult|
|收店阶段|出现 3 个奖励|
|下一天|天数 +1，行动点恢复|

## 34.3 计算测试

|测试项|验收标准|
|---|---|
|无未知信息|显示精确爆雷|
|有隐藏标签|显示爆雷区间|
|有暗风险|显示暗风险区间|
|鉴定后|隐藏标签揭示，区间变化|
|深度背调后|暗风险类别显示，区间收窄|
|盲盒价|只有存在未知信息时可用|
|高价卖|售价上升，风险上升|
|便宜卖|售价下降，风险下降|
|事故|由最终爆雷确定|
|事故链条|显示主要风险来源|

## 34.4 资源测试

|测试项|验收标准|
|---|---|
|现金不足|付费按钮 disabled|
|行动点不足|操作和卡牌 disabled|
|信誉归零|立即失败|
|现金为负|立即失败|
|累计利润|只因成交利润增加|
|商品进价|进货时扣现金，出售时只参与利润计算，不重复扣现金|

## 34.5 奖励测试

|测试项|验收标准|
|---|---|
|免费卡牌奖励|选择后加入牌组|
|付费被动奖励|现金足够时可选，选择后扣现金并加入被动|
|现金不足奖励|按钮 disabled|
|货源倾向奖励|选择后未来商品生成权重改变|
|删除卡牌|牌组中对应实例减少|
|升级卡牌|对应实例 cardId 变为升级版|

---

# 35. 自动测试建议

第一版不强制引入测试框架。  
但推荐至少做一个简单浏览器内测试函数。

## 35.1 debugRunAllTests

```js
function debugRunAllTests(app) {
  const results = [];
  results.push(testAccidentLevelMapping(app));
  results.push(testPriceCalculation(app));
  results.push(testRiskRange(app));
  results.push(testBlindBoxCondition(app));
  results.push(testCashProfitSeparation(app));
  console.table(results);
}
```

## 35.2 必测函数

```text
getAccidentLevelByRisk
calculatePrice
calculateRisk
calculateDealPreview
resolveDeal
canChooseReward
canUseBaseAction
canPlayCard
```

## 35.3 测试输出

```js
{
  name: 'testRiskRange',
  passed: true,
  expected: 'range',
  actual: 'range',
  details: ''
}
```

---

# 36. 性能要求

第一版数据量很小，不需要复杂性能优化。

基本要求：

```text
1. 点击按钮后 UI 在 100ms 内响应；
2. 交易预览刷新不明显卡顿；
3. 一局日志增长不导致页面明显变慢；
4. Debug 导出 state 不阻塞太久。
```

允许：

```text
每次 action 后整页重绘。
```

不需要：

```text
虚拟列表
Web Worker
复杂缓存
增量 DOM diff
```

---

# 37. 可维护性要求

## 37.1 文件职责清晰

任何代码变更应满足：

```text
UI 变化主要改 ui_* 和 style.css
数值公式主要改 rules_price / rules_risk / rules_accident
流程变化主要改 dayFlow / actions
数据内容主要改 data/*.json
状态结构主要改 state.js
```

## 37.2 函数长度

建议：

```text
单个函数不超过 80 行。
复杂计算拆成子函数。
```

## 37.3 命名规则

JS 函数使用 camelCase：

```text
calculateDealPreview
resolveDeal
renderProductCard
```

常量使用 PascalCase 或 UPPER_SNAKE：

```text
RunPhase
ACCIDENT_LEVEL_ORDER
```

配置 ID 使用 snake_case：

```text
pricing_blind_box
customer_bigtech_hr
```

## 37.4 注释规则

必须注释：

```text
复杂计算顺序
事故等级修正顺序
隐藏信息处理
暗风险处理
现金与累计利润分离
```

不要注释显而易见代码。

---

# 38. 安全与内容处理

## 38.1 HTML 转义

所有来自 JSON 的显示文本，渲染进 HTML 时必须转义。

推荐实现：

```js
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
```

## 38.2 不使用 innerHTML 的场合

第一版为了快速开发可以用 `innerHTML` 拼接。  
但必须保证所有文本经过 `escapeHtml`。

尤其是：

```text
displayName
description
newsText
accidentText
log.message
reward.description
```

## 38.3 本地数据可信度

虽然数据来自本地 JSON，但仍应转义。  
原因：后续配置可能由 AI 或外部表格生成，不能假设完全安全。

---

# 39. 版本与配置兼容

## 39.1 版本字段

建议在 `gameConfig.json` 中加入：

```json
{
  "contentVersion": "0.1"
}
```

在代码中加入：

```js
const APP_VERSION = '0.1.0';
const SAVE_VERSION = '0.1';
```

## 39.2 存档兼容策略

第一版策略：

```text
版本不一致时，提示重新开始。
不做存档迁移。
```

后续版本再考虑迁移。

---

# 40. README 要求

`README.md` 必须写清楚：

```text
1. 项目是什么；
2. 如何运行；
3. 推荐 Node / 浏览器环境；
4. 数据文件在哪里；
5. 如何新增标签；
6. 如何新增商品；
7. 如何新增卡牌；
8. 如何打开 Debug；
9. 当前已实现内容；
10. 当前未实现内容；
11. 常见问题。
```

## 40.1 推荐运行说明

```md
## 运行方式

推荐使用本地静态服务器：

```bash
cd life-tag-exchange-prototype
python -m http.server 5173
```

然后打开：

```text
http://localhost:5173
```
```

如果用 Node：

```bash
npx serve .
```

---

# 41. Codex / AI Agent 开发顺序

## 41.1 总原则

不要一次让 Codex “做完整游戏”。  
应按阶段逐步开发，每一步都有可运行结果。

## 41.2 推荐开发任务拆分

### Step 1：建立基础项目

目标：

```text
创建 index.html、style.css、src/main.js。
页面能打开，显示空 AppShell。
```

验收：

```text
浏览器无报错。
页面显示标题和“开始新局”。
```

---

### Step 2：建立数据加载

目标：

```text
创建 dataLoader.js、schemaValidator.js、indexes.js。
加载所有 data/*.json。
```

验收：

```text
控制台能打印所有配置数量。
配置错误能显示明确错误。
```

---

### Step 3：建立运行时状态

目标：

```text
创建 state.js。
点击开始新局后创建 RunState / DayState / DeckState。
```

验收：

```text
顶部显示第 1/8 天、现金 100、利润 0/500、信誉 100。
```

---

### Step 4：实现阶段推进

目标：

```text
实现 dayFlow.js 和 advancePhase。
```

验收：

```text
按钮可从开店阶段推进到进货、接单、抽牌、处理、出售、结算、收店。
```

---

### Step 5：实现随机生成

目标：

```text
实现 rng.js 和 generator.js。
进入进货阶段生成商品，进入接单阶段生成顾客，进入开店生成新闻。
```

验收：

```text
商品候选 4 个，顾客 3 个，新闻 1 条。
```

---

### Step 6：实现基础 UI 面板

目标：

```text
实现 render.js、ui_panels.js、ui_components.js。
```

验收：

```text
主界面包含顶部状态、新闻、商品、库存、顾客、手牌、操作、定价、预览、日志。
```

---

### Step 7：实现进货和选择

目标：

```text
实现 buyProduct、selectProduct、selectCustomer、selectPricingMode。
```

验收：

```text
买入扣现金，库存增加。
选择商品 / 顾客 / 定价后 UI 高亮。
```

---

### Step 8：实现售价预览

目标：

```text
实现 rules_price.js 和 DealPreview 的价格部分。
```

验收：

```text
选择商品、顾客、定价后显示预计售价、预计利润、价格拆解。
```

---

### Step 9：实现爆雷预览

目标：

```text
实现 rules_risk.js。
```

验收：

```text
无未知信息显示精确爆雷；有隐藏标签或暗风险显示爆雷区间。
```

---

### Step 10：实现基础操作

目标：

```text
实现鉴定、洗标、包装、公关。
```

验收：

```text
操作扣 AP / 现金，修改商品状态，刷新交易预览。
```

---

### Step 11：实现牌组与出牌

目标：

```text
实现 deck.js、playCard、rules_effects。
```

验收：

```text
每日抽 5 张牌；出牌后效果作用于商品或交易，卡牌进入弃牌堆。
```

---

### Step 12：实现出售结算

目标：

```text
实现 rules_deal.js、rules_accident.js、confirmSell。
```

验收：

```text
出售后生成 DealResult，现金、累计利润、信誉变化正确，商品标记 sold。
```

---

### Step 13：实现事故弹窗

目标：

```text
实现 AccidentModal。
```

验收：

```text
事故发生时显示标题、后果、事故链条、最终爆雷。
```

---

### Step 14：实现收店奖励

目标：

```text
实现 rules_rewards.js 和 RewardModal。
```

验收：

```text
每日结束三选一；选择后改变牌组、被动、货源或资源。
```

---

### Step 15：实现胜负与最终报告

目标：

```text
实现 rules_report.js 和 RunReportModal。
```

验收：

```text
第 8 天后显示胜利 / 失败报告；现金 < 0 或信誉 <= 0 立即失败。
```

---

### Step 16：实现存档与 Debug

目标：

```text
实现 storage.js、debug.js、testScenarios.js。
```

验收：

```text
刷新页面可恢复存档；Debug 能加载测试场景。
```

---

# 42. Codex 提示词建议

开发时可以按以下格式给 Codex：

```text
请只完成 Step X。
必须遵守 07_HTML技术实现规格.md。
不要改玩法规则。
不要新增 P2 系统。
不要把配置硬编码进 JS。
完成后说明：
1. 修改了哪些文件；
2. 新增了哪些函数；
3. 如何运行；
4. 如何验收。
```

每次任务尽量限制在：

```text
1–4 个文件
1 个明确功能
1 个明确验收标准
```

不要一次要求：

```text
做完整游戏。
```

---

# 43. 技术禁止事项总表

开发中不得出现以下行为：

```text
1. 不得把所有数据硬编码进 JS；
2. 不得把售价、爆雷、事故写在 UI 点击事件里；
3. 不得让 render 函数修改游戏状态；
4. 不得让普通鉴定完全揭示暗风险；
5. 不得用随机骰子决定事故是否发生；
6. 不得把现金当作通关目标；
7. 不得让累计利润因洗标、包装、公关、奖励购买而下降；
8. 不得在出售时重复扣商品进价现金；
9. 不得让已售商品再次出售；
10. 不得让现金不足时主动付费按钮仍可点击；
11. 不得让行动点不足时操作仍可点击；
12. 不得在存在未知信息时显示精确爆雷；
13. 不得跳过事故链条；
14. 不得把 P2 系统做进第一版；
15. 不得静默吞掉配置错误。
```

---

# 44. 与后续 Unity 版本的关系

## 44.1 HTML 原型的迁移价值

本 HTML 原型应沉淀以下可迁移资产：

```text
1. JSON 配置结构；
2. 商品、顾客、卡牌、被动、奖励数据；
3. 售价计算公式；
4. 爆雷计算公式；
5. 事故结算规则；
6. 阶段流程；
7. 交易预览信息层级；
8. 测试场景；
9. 事故链条文案结构。
```

## 44.2 不要求迁移的内容

HTML 原型中的以下内容不需要直接迁移：

```text
DOM 渲染代码
CSS 布局
Debug 面板实现
localStorage 存档
Vanilla JS 事件绑定
```

## 44.3 为迁移预留的技术习惯

为方便后续 Unity 化，应保持：

```text
数据与逻辑分离
计算函数纯函数化
状态结构明确
配置 ID 稳定
日志与结算结果可序列化
```

---

# 45. 当前决策记录

## 45.1 已确定

```text
第一版使用单页 HTML 原型。
第一版推荐 Vanilla JavaScript。
第一版不需要后端。
第一版使用 JSON 配置。
第一版状态存在内存中，可用 localStorage 存档。
第一版允许整页重绘。
第一版必须有 Debug 面板。
第一版必须保留交易预览和事故链条。
```

## 45.2 暂不确定

```text
是否使用 TypeScript。
是否使用 Vite。
是否做自动化测试框架。
是否做导入 / 导出配置编辑器。
是否做可视化数值调参面板。
```

这些不影响第一版开发。

## 45.3 推荐默认决策

```text
先用 Vanilla JavaScript 完成可玩闭环。
在规则稳定后，再考虑迁移到 Vite + TypeScript。
```

---

# 46. 技术验收清单

第一版 HTML 技术实现完成时，必须逐项检查：

## 46.1 工程验收

```text
[ ] 项目可通过本地静态服务器运行
[ ] 页面打开无控制台错误
[ ] 所有 JSON 配置成功加载
[ ] 配置引用错误能明确报错
[ ] 文件结构符合本文档要求
[ ] 主要逻辑未写入 index.html
[ ] UI 事件通过 Actions 调用
```

## 46.2 状态验收

```text
[ ] 新局创建 RunState / DayState / DeckState
[ ] 阶段可以正确推进
[ ] 每日状态会重置
[ ] 库存跨日保留
[ ] 新鲜度跨日减少
[ ] 已售商品不可再次出售
[ ] 现金 < 0 会失败
[ ] 信誉 <= 0 会失败
```

## 46.3 玩法验收

```text
[ ] 每日生成市场新闻
[ ] 每日生成商品候选
[ ] 可买入商品
[ ] 每日生成顾客订单
[ ] 每日抽牌
[ ] 可使用基础操作
[ ] 可打出卡牌
[ ] 可选择定价方式
[ ] 可生成交易预览
[ ] 可确认出售
[ ] 可结算事故
[ ] 可选择收店奖励
[ ] 可完成 8 天单局
```

## 46.4 计算验收

```text
[ ] 售价拆解正确显示
[ ] 爆雷拆解正确显示
[ ] 未知信息显示风险区间
[ ] 已知信息显示精确爆雷
[ ] 事故由最终爆雷确定
[ ] 盲盒价条件正确
[ ] 现金与累计利润分离
[ ] 事故退款 / 罚款影响现金和单笔利润
```

## 46.5 UI 验收

```text
[ ] 顶部状态栏实时刷新
[ ] 商品卡显示关键信息
[ ] 顾客卡显示偏好和雷区
[ ] 手牌显示成本和效果
[ ] 操作按钮有 disabled 原因
[ ] 交易预览清楚显示收益和风险
[ ] 事故弹窗显示事故链条
[ ] 奖励弹窗显示三选一
[ ] 最终报告显示胜负与复盘
[ ] 日志能帮助回看操作
```

## 46.6 Debug 验收

```text
[ ] Debug 面板可开关
[ ] 可查看当前 state
[ ] 可加载测试场景
[ ] 可导出 state JSON
[ ] 可清空存档
[ ] 可快速推进阶段
```

---

# 47. 最终说明

本技术规格的核心目标是确保 HTML 原型能快速、稳定、可复盘地验证游戏内核。

开发时应始终优先保护以下技术边界：

```text
数据驱动
状态集中
规则独立
UI 只展示
Action 统一修改状态
计算可拆解
事故不随机
Debug 可复现
```

只要这几个边界守住，第一版即使界面简陋，也足以验证：

```text
每日经营
标签加工
现金构筑
隐藏标签 / 暗风险
爆雷复盘
肉鸽成长
```

是否真的能形成一个可继续扩展的游戏原型。
