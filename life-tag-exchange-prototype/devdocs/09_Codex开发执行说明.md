# 09_Codex开发执行说明

文档编号：09  
文档名称：Codex 开发执行说明  
项目名称：《人生标签交易所：牛马肉铺》HTML 快速验证原型  
对应策划案版本：核心策划案 v0.5  
文档版本：v0.1  
用途：把 00–08 的设计、规则、数据、UI、技术与测试文档转化为可交给 Codex / AI Agent 执行的分步开发任务书。  
适用对象：游戏设计者、前端开发者、AI Agent / Codex、测试者。

---

# 1. 文档目的

本文档用于指导 Codex / Cursor Agent / 其他 AI 编程代理完成《人生标签交易所：牛马肉铺》HTML 快速验证原型。

本文档不是新策划案。

本文档的职责是：

1. 告诉 Codex 应该阅读哪些文档；
2. 告诉 Codex 本项目的技术边界；
3. 告诉 Codex 必须按什么顺序开发；
4. 告诉 Codex 每一步应该创建哪些文件；
5. 告诉 Codex 每一步的验收标准；
6. 告诉 Codex 哪些内容禁止自行发挥；
7. 告诉 Codex 如何处理不确定需求；
8. 告诉 Codex 如何输出开发日志、测试结果和剩余 TODO。

本文件的核心目标是避免 AI Agent 出现以下问题：

```text
1. 直接把游戏做成普通标签匹配小游戏；
2. 把现金和累计利润混为一谈；
3. 把爆雷事故做成随机骰子；
4. 忽略隐藏标签与暗风险；
5. 把数据写死在 JS 逻辑里；
6. 只做 UI，不做完整结算；
7. 一次性生成过多代码，难以检查；
8. 自行添加 P2 系统导致范围失控；
9. 没有 Debug 面板，无法验证数值；
10. 没有测试场景，无法判断玩法闭环是否成立。
```

---

# 2. Codex 必须读取的输入文档

Codex 开发前必须读取以下文档。

```text
/devdocs/
  00_HTML原型范围说明.md
  01_核心玩法流程规格.md
  02_系统规则规格.md
  03_数据结构规格.md
  04_首版配置表说明.md
  05_售价爆雷事故计算规格.md
  06_UI页面与交互规格.md
  07_HTML技术实现规格.md
  08_测试用例与验收清单.md
  09_Codex开发执行说明.md
```

如果项目目录中暂未建立 `/devdocs/`，则应先把上述文档放入该目录。

## 2.1 文档优先级

当文档之间存在局部不一致时，按以下优先级处理：

| 优先级 | 文档 | 用途 |
|---:|---|---|
| 1 | 00_HTML原型范围说明 | 决定做什么、不做什么 |
| 2 | 02_系统规则规格 | 决定系统规则与禁止事项 |
| 3 | 05_售价爆雷事故计算规格 | 决定交易、售价、爆雷、事故、利润计算 |
| 4 | 03_数据结构规格 | 决定数据对象、字段、ID、枚举 |
| 5 | 01_核心玩法流程规格 | 决定阶段推进与流程状态 |
| 6 | 06_UI页面与交互规格 | 决定界面、按钮、显示、交互 |
| 7 | 07_HTML技术实现规格 | 决定工程结构与模块划分 |
| 8 | 08_测试用例与验收清单 | 决定测试与验收 |
| 9 | 04_首版配置表说明 | 决定首版内容数据 |

说明：

```text
04 是内容配置来源。
但如果配置表中的某个效果与 02 或 05 的系统规则冲突，优先遵守 02 和 05。
```

---

# 3. 项目总目标

Codex 的目标是实现一个可以在桌面浏览器运行的单页 HTML 小游戏。

第一版必须完成以下闭环：

```text
开始新局
→ 第 1 天开店
→ 生成市场新闻
→ 生成商品候选
→ 买入商品
→ 生成顾客订单
→ 抽手牌
→ 使用基础操作 / 卡牌处理商品
→ 选择商品、顾客、定价
→ 显示交易预览
→ 确认出售
→ 结算售价、现金、累计利润、爆雷、事故、信誉
→ 收店奖励三选一
→ 进入下一天
→ 重复到第 8 天
→ 胜利 / 失败 / 最终经营报告
```

第一版不要求美术表现，不要求移动端适配，不要求服务器，不要求账号，不要求复杂动画。

---

# 4. 技术路线

## 4.1 默认技术栈

第一版使用：

```text
HTML + CSS + Vanilla JavaScript
```

不使用：

```text
React
Vue
Svelte
后端服务
数据库
构建工具强依赖
复杂状态管理库
CSS 框架
```

## 4.2 运行方式

推荐支持两种运行方式：

```text
方式 A：直接打开 index.html
方式 B：使用本地静态服务器运行
```

如果浏览器因 `fetch()` 读取本地 JSON 触发 CORS 限制，应在 README 中提示使用本地服务器：

```bash
npx serve .
```

或：

```bash
python -m http.server 5173
```

## 4.3 浏览器目标

优先支持：

```text
Chrome 最新版
Edge 最新版
桌面横屏
```

暂不处理：

```text
手机竖屏
触屏优化
Safari 兼容性细节
旧浏览器兼容性
```

---

# 5. 推荐项目目录

Codex 应按以下目录创建项目。

```text
life-tag-exchange-prototype/
  index.html
  style.css
  README.md

  devdocs/
    00_HTML原型范围说明.md
    01_核心玩法流程规格.md
    02_系统规则规格.md
    03_数据结构规格.md
    04_首版配置表说明.md
    05_售价爆雷事故计算规格.md
    06_UI页面与交互规格.md
    07_HTML技术实现规格.md
    08_测试用例与验收清单.md
    09_Codex开发执行说明.md

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
    rng.js
    ids.js
    state.js
    selectors.js
    storage.js
    logger.js

    generator.js
    deck.js
    dayFlow.js
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
    ui_helpers.js
    debug.js
    testScenarios.js
```

## 5.1 文件职责简表

| 文件 | 职责 |
|---|---|
| index.html | 页面骨架与根节点 |
| style.css | 全部样式 |
| main.js | 入口、初始化、事件绑定启动 |
| constants.js | 枚举、固定字符串、事故等级映射 |
| dataLoader.js | 加载 `/data/*.json` |
| schemaValidator.js | 基础数据校验 |
| rng.js | seed 随机数 |
| ids.js | 生成实例 ID |
| state.js | 创建与保存 RunState / DayState / DeckState |
| selectors.js | 查询当前选中商品、顾客、定价等 |
| storage.js | localStorage 存档 / 读档 |
| logger.js | runLog / dealLog / accidentLog |
| generator.js | 生成市场新闻、商品、顾客、奖励 |
| deck.js | 抽牌、弃牌、洗牌、添加卡牌、删除卡牌 |
| dayFlow.js | 阶段推进、开始新天、结算日 |
| actions.js | UI 操作入口，所有按钮调用这里 |
| rules_conditions.js | Condition 判断 |
| rules_effects.js | Effect 执行 |
| rules_price.js | 售价计算 |
| rules_risk.js | 爆雷计算 |
| rules_accident.js | 事故等级与事故后果 |
| rules_deal.js | DealPreview / DealResult |
| rules_rewards.js | 奖励生成与应用 |
| rules_report.js | 最终报告 |
| render.js | 总渲染入口 |
| ui_components.js | 商品卡、顾客卡、卡牌、预览等组件 HTML |
| ui_helpers.js | 标签渲染、按钮 disabled、格式化文本 |
| debug.js | Debug 面板、测试按钮、固定局注入 |
| testScenarios.js | 固定测试局数据 |

---

# 6. 开发总原则

## 6.1 数据驱动优先

Codex 应优先把以下对象放入 JSON：

```text
GameConfig
TagDef
DarkRiskDef
TagConflictDef
ProductTemplate
CustomerDef
MarketEventDef
CardDef
ShopPassiveDef
SupplySourceDef
BaseActionDef
PricingModeDef
AccidentDef
RewardOption / RewardTemplate
EndingEvaluationDef
```

不得把标签、商品、顾客、市场新闻、卡牌、事故等主要内容硬编码在 UI 或结算逻辑中。

允许在第一版中硬编码：

```text
事故等级枚举
阶段枚举
基础 UI 文案
Debug 测试按钮
少量 fallback 默认对象
```

## 6.2 状态集中管理

所有运行时状态必须集中在：

```text
appState = {
  configTables,
  runState,
  dayState,
  deckState,
  uiState,
  debugState
}
```

UI 不得直接持有独立游戏状态。

错误做法：

```text
商品卡按钮自己记录商品是否已售。
```

正确做法：

```text
商品是否已售只存在 ProductInstance.status / flags.sold。
商品卡只读取状态并渲染。
```

## 6.3 单向操作流

所有玩家操作必须走统一路径：

```text
UI event
→ actions.js
→ rules / dayFlow / deck / generator
→ update state
→ update preview if needed
→ render(appState)
```

禁止：

```text
按钮事件直接修改 DOM 和状态。
```

## 6.4 计算逻辑与 UI 分离

售价、爆雷、事故、奖励应用不得写在 `render.js` 或 `ui_components.js` 中。

UI 只能显示计算结果。

计算结果由以下模块提供：

```text
rules_price.js
rules_risk.js
rules_accident.js
rules_deal.js
rules_rewards.js
```

## 6.5 每次状态变化后统一刷新

第一版不需要复杂局部更新。

所有 action 完成后统一执行：

```javascript
updateDealPreviewIfPossible(appState);
render(appState);
saveAutosave(appState);
```

可接受性能开销，因为第一版数据量很小。

---

# 7. 绝对禁止事项

Codex 不得违反以下事项。

## 7.1 玩法禁止事项

```text
不得把现金作为通关目标。
不得用 cash >= 500 判定胜利。
不得让现金支出降低 totalProfit。
不得把 risk 存成全局长期资源。
不得使用随机骰子决定事故是否发生。
不得让普通鉴定完全揭示暗风险。
不得删除隐藏标签或暗风险来规避计算。
不得把洗标实现成直接删除真实标签。
不得把盲盒价做成独立抽奖系统。
不得在第一版加入店铺装修、员工、长线剧情、账号、Meta 成长等 P2 内容。
```

## 7.2 技术禁止事项

```text
不得把所有代码塞进 index.html。
不得把所有逻辑塞进 render.js。
不得让 UI 按钮直接执行售价 / 风险 / 事故计算。
不得硬编码完整内容表到 JS 逻辑中。
不得省略数据加载失败提示。
不得省略 Debug 面板。
不得省略测试场景。
不得省略交易预览。
不得省略事故链条。
```

## 7.3 文案禁止事项

```text
不得把所有爆雷原因显示为“发生事故”。
不得只显示最终扣钱、扣信誉，而不显示原因。
不得用含糊文案替代数值拆解。
不得让玩家不知道按钮为什么不可点。
```

---

# 8. 最低可交付版本定义

Codex 完成第一轮开发后，必须至少满足以下标准。

```text
1. 浏览器可以打开游戏；
2. 可以开始新局；
3. 可以从第 1 天玩到第 8 天；
4. 每天有市场新闻、商品候选、顾客订单、手牌；
5. 可以买入商品；
6. 可以选择商品、顾客、定价；
7. 可以看到交易预览；
8. 可以使用鉴定、洗标、包装、公关；
9. 可以打出至少一部分卡牌；
10. 可以确认出售；
11. 出售后正确结算现金、累计利润、信誉；
12. 爆雷事故由风险阈值确定；
13. 事故弹窗显示事故链条；
14. 每日结束有三选一奖励；
15. 现金不足的付费奖励不可选；
16. 第 8 天后生成最终报告；
17. cash < 0 或 reputation <= 0 会失败；
18. totalProfit >= 500 且现金 / 信誉合法会胜利；
19. Debug 面板可加载固定测试局；
20. README 说明如何运行。
```

---

# 9. 分步开发计划总览

Codex 必须按阶段开发，不应一次性生成整个项目。

推荐开发顺序：

```text
Step 0：建立项目骨架与 README
Step 1：创建数据文件与基础配置
Step 2：实现数据加载、索引、校验
Step 3：实现状态对象与新局初始化
Step 4：实现主 UI 骨架与顶部状态栏
Step 5：实现每日阶段推进
Step 6：实现市场新闻、商品、顾客生成
Step 7：实现进货与库存
Step 8：实现牌组与抽牌
Step 9：实现商品 / 顾客 / 定价选择
Step 10：实现售价计算与交易预览
Step 11：实现爆雷区间与事故预测
Step 12：实现基础操作
Step 13：实现卡牌 Condition / Effect 与出牌
Step 14：实现出售结算与事故弹窗
Step 15：实现收店奖励
Step 16：实现胜负判定与最终报告
Step 17：实现存档、读档、重开
Step 18：实现 Debug 面板与固定测试局
Step 19：执行 08 测试清单并修复问题
Step 20：整理 README、TODO 和开发报告
```

每一步完成后，Codex 应输出：

```text
完成了哪些文件
实现了哪些功能
如何手动测试
是否存在 TODO
是否有违反 00–08 的地方
```

---

# 10. Step 0：建立项目骨架

## 10.1 任务目标

创建基础文件与目录，使项目可以被本地服务器打开。

## 10.2 应创建文件

```text
index.html
style.css
README.md
src/main.js
src/constants.js
```

## 10.3 index.html 要求

必须包含：

```html
<div id="app"></div>
<script type="module" src="./src/main.js"></script>
```

可以包含基础 meta：

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>人生标签交易所：牛马肉铺 HTML 原型</title>
```

## 10.4 README 要求

README 至少写明：

```text
项目目标
如何运行
推荐浏览器
当前实现范围
文档来源
调试入口
```

## 10.5 验收标准

```text
打开 index.html 不报错。
页面显示项目标题和“开始新局”占位按钮。
控制台无 JS 错误。
```

---

# 11. Step 1：创建数据文件与基础配置

## 11.1 任务目标

根据 04_首版配置表说明创建 `/data/*.json`。

## 11.2 最低数据量

如果一次转完整 04 内容太长，可以先创建最小可玩集。

最小集：

```text
标签：12 个
暗风险：3 个
标签冲突：6 个
商品模板：8 个
顾客：5 个
市场新闻：6 个
卡牌：10 张初始牌 + 6 张奖励池
被动：3 个
货源：3 个
基础操作：4 个
定价：4 个
事故：5 档
奖励：12 个
结局评价：3 个
```

但文件结构必须完整。

## 11.3 数据要求

所有配置对象必须使用英文 ID。

中文只放在：

```text
displayName
description
newsText
effectSummary
accidentText
summaryText
```

## 11.4 验收标准

```text
/data/ 下存在所有必需 JSON 文件。
每个 JSON 文件可以被 JSON.parse 正确解析。
所有 ID 唯一。
所有引用 ID 存在。
```

---

# 12. Step 2：数据加载、索引、校验

## 12.1 任务目标

实现数据加载模块。

## 12.2 应实现文件

```text
src/dataLoader.js
src/schemaValidator.js
src/selectors.js
```

## 12.3 dataLoader.js 要求

提供函数：

```javascript
export async function loadAllData()
```

返回：

```javascript
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
  endingEvaluations,
  indexes
}
```

`indexes` 至少包含：

```javascript
{
  tagById,
  darkRiskById,
  productTemplateById,
  customerById,
  marketEventById,
  cardById,
  passiveById,
  supplySourceById,
  pricingModeById,
  accidentByLevel,
  rewardById
}
```

## 12.4 schemaValidator.js 要求

第一版不需要完整 JSON Schema，但必须检查：

```text
1. 必需文件存在；
2. 每个对象有 id；
3. id 不重复；
4. ProductTemplate 引用的 tagId 存在；
5. ProductTemplate 引用的 darkRiskId 存在；
6. CustomerDef 引用的 tagId 存在；
7. MarketEvent modifier 引用的 tagId 存在；
8. CardDef 引用的 tagId 存在；
9. GameConfig.initialDeckCardIds 引用的 cardId 存在；
10. PricingMode 包含 cheap / normal / high / blind_box。
```

## 12.5 验收标准

```text
页面加载后控制台打印“配置加载成功”。
如果故意删除一个 tagId，页面显示配置错误，而不是静默失败。
```

---

# 13. Step 3：状态对象与新局初始化

## 13.1 任务目标

实现 RunState / DayState / DeckState。

## 13.2 应实现文件

```text
src/state.js
src/ids.js
src/rng.js
src/logger.js
```

## 13.3 createNewRun 要求

提供函数：

```javascript
export function createNewGameState(configTables, options = {})
```

返回：

```javascript
appState = {
  configTables,
  runState,
  dayState,
  deckState,
  uiState,
  debugState
}
```

## 13.4 RunState 初始值

必须符合：

```text
currentDay = 1
maxDays = 8
cash = 100
totalProfit = 0
targetTotalProfit = 500
reputation = 100
maxReputation = 100
inventory = []
activePassives = []
activeSupplySources = []
runLog = []
dealLog = []
accidentLog = []
result = running
failReason = none
```

## 13.5 DeckState 初始值

```text
drawPile = initialDeckCardIds 生成的 CardInstance[]
hand = []
discardPile = []
exhaustPile = []
```

## 13.6 验收标准

点击“开始新局”后：

```text
顶部状态栏显示第 1 / 8 天。
现金 100。
累计利润 0 / 500。
信誉 100。
库存 0 / 6。
控制台可以查看 appState。
```

---

# 14. Step 4：主 UI 骨架

## 14.1 任务目标

实现 06 中定义的主界面区域。

## 14.2 应实现文件

```text
src/render.js
src/ui_components.js
src/ui_helpers.js
```

## 14.3 主布局要求

页面至少包含：

```text
HeaderStatusBar
PhaseBanner
MarketEventPanel
PassiveSupplyPanel
ProductCandidatePanel
InventoryPanel
ProductDetailPanel
CustomerOrderPanel
HandCardPanel
BaseActionPanel
PricingPanel
DealPreviewPanel
LogPanel
ModalLayer
DebugPanel
```

## 14.4 验收标准

即使还没有完整功能，页面也应能显示所有面板占位。

所有面板标题清楚。

无数据时显示空状态，不应显示 undefined。

---

# 15. Step 5：每日阶段推进

## 15.1 任务目标

实现 01 中的 RunPhase 与每日阶段推进。

## 15.2 应实现文件

```text
src/dayFlow.js
src/actions.js
```

## 15.3 阶段枚举

使用：

```text
RUN_INIT
DAY_OPENING
DAY_PURCHASE
DAY_CUSTOMER
DAY_DRAW
DAY_PROCESS
DAY_SELL
DAY_RESOLVE
DAY_REWARD
RUN_END
RUN_FAILED
```

## 15.4 必须实现 actions

```javascript
startNewRun()
goToNextPhase()
startDay()
endDay()
checkRunEnd()
failRun(reason)
```

## 15.5 验收标准

玩家可以点击按钮依次推进：

```text
开店 → 进货 → 接单 → 抽牌 → 处理 → 出售 → 结算 → 收店
```

当前阶段必须在 UI 中明确显示。

不允许跳过未完成的必要初始化。

---

# 16. Step 6：市场新闻、商品、顾客生成

## 16.1 任务目标

实现每日内容生成。

## 16.2 应实现文件

```text
src/generator.js
```

## 16.3 必须实现函数

```javascript
selectWeighted(items, weightKey, rng)
generateMarketEvent(appState)
generateProductCandidates(appState)
generateCustomerOrders(appState)
generateProductInstance(template, appState)
generateCustomerOrder(customerDef, appState)
```

## 16.4 商品生成要求

商品实例必须包含：

```text
instanceId
templateId
displayName
cost
basePrice
baseRisk
freshnessCurrent
freshnessMax
visibleTags
hiddenTags
darkRisk
appliedTags
suppressedTags
temporaryModifiers
flags
status
createdDay
soldDay
```

## 16.5 顾客生成要求

顾客订单必须包含：

```text
instanceId
customerId
displayName
budget
riskTolerance
preferredTags
tabooTags
darkRiskSensitivity
specialRules
```

## 16.6 验收标准

进入对应阶段后：

```text
开店阶段生成 1 条新闻。
进货阶段生成 4 个商品候选。
接单阶段生成 3 个顾客订单。
商品和顾客显示不出现 undefined。
```

---

# 17. Step 7：进货与库存

## 17.1 任务目标

实现商品买入、库存显示、按钮禁用。

## 17.2 actions

```javascript
selectProductCandidate(productInstanceId)
buyProduct(productInstanceId)
selectInventoryProduct(productInstanceId)
```

## 17.3 买入条件

必须同时满足：

```text
cash >= product.cost
boughtProductCount < dailyProductBuyLimit
inventory.length < inventoryLimit
product.status == candidate
当前阶段为 DAY_PURCHASE
```

## 17.4 买入效果

```text
cash -= product.cost
product.status = inventory
inventory.push(product)
boughtProductCount += 1
写入日志
刷新 UI
```

## 17.5 验收标准

```text
现金不足时买入按钮 disabled。
每日买入 2 个后其余买入按钮 disabled。
库存满时买入按钮 disabled。
已买入商品不能重复买入。
```

---

# 18. Step 8：牌组与抽牌

## 18.1 任务目标

实现初始牌组、抽牌、弃牌、洗牌。

## 18.2 应实现文件

```text
src/deck.js
```

## 18.3 必须实现函数

```javascript
createInitialDeck(configTables, rng)
drawCards(appState, count)
discardHand(appState)
shuffleDiscardIntoDraw(appState)
addCardToDeck(appState, cardId)
removeCardFromDeck(appState, cardInstanceId)
upgradeCard(appState, cardInstanceId)
```

## 18.4 抽牌规则

```text
从 drawPile 抽取 dailyDrawCount 张进入 hand。
如果 drawPile 不足，先洗 discardPile。
如果仍不足，能抽多少抽多少。
每日结束时，非临时手牌进 discardPile，临时牌移除。
```

## 18.5 验收标准

```text
第 1 天抽牌后 hand.length = 5。
抽牌堆数量减少。
每日结束手牌清空。
弃牌堆数量增加。
```

---

# 19. Step 9：选择商品、顾客、定价

## 19.1 任务目标

实现三选中状态，并触发交易预览刷新。

## 19.2 actions

```javascript
selectInventoryProduct(productInstanceId)
selectCustomerOrder(customerOrderId)
selectPricingMode(pricingModeId)
clearSelection(type)
```

## 19.3 UI 状态

选中的商品、顾客、定价按钮必须有 selected 样式。

## 19.4 盲盒价可用条件

```text
商品存在未揭示 hiddenTag
或
商品存在 darkRisk 且 revealedLevel != full / treated
```

如果条件不满足，盲盒价 disabled。

## 19.5 验收标准

```text
选择商品、顾客、定价后，交易预览出现。
取消任一选择后，交易预览显示“请选择商品、顾客和定价方式”。
没有未知信息时，盲盒价不可选。
```

---

# 20. Step 10：售价计算与交易预览

## 20.1 任务目标

实现 `calculatePrice()` 和 DealPreview 的价格部分。

## 20.2 应实现文件

```text
src/rules_price.js
src/rules_deal.js
```

## 20.3 calculatePrice 输出

```javascript
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

## 20.4 必须支持的价格来源

```text
商品基础价
标签基础价格
顾客偏好价格
标签冲突 / 支撑价格修正
市场新闻价格修正
新鲜度价格修正
卡牌 / 基础操作 / 被动 modifier
包装倍率
定价倍率
预算上限
```

## 20.5 验收标准

交易预览必须显示：

```text
预计售价
预计利润
预算上限是否生效
主要加价来源
倍率来源
```

所有价格来源必须进入 priceBreakdown。

---

# 21. Step 11：爆雷区间与事故预测

## 21.1 任务目标

实现 `calculateRisk()` 与事故预测。

## 21.2 应实现文件

```text
src/rules_risk.js
src/rules_accident.js
src/rules_deal.js
```

## 21.3 calculateRisk 输出

```javascript
{
  riskDisplayType,
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

## 21.4 事故预测

如果 exact：

```text
事故预测：无事故 / 小事故 / 中事故 / 大事故 / 严重事故
```

如果 range：

```text
事故预测：最小事故等级 ~ 最大事故等级
```

## 21.5 验收标准

```text
有未揭示隐藏标签时显示爆雷区间。
有未完全揭示暗风险时显示爆雷区间。
全部揭示或处理后显示精确爆雷值。
事故预测与风险阈值一致。
```

---

# 22. Step 12：基础操作

## 22.1 任务目标

实现鉴定、洗标、包装、公关。

## 22.2 actions

```javascript
useBaseAction(actionId, payload)
identifySelectedProduct()
suppressSelectedTag(tagId)
packageSelectedProduct()
publicRelationReduceRisk()
publicRelationRecoverReputation()
```

## 22.3 鉴定

```text
成本：AP -1
效果：揭示 1 个隐藏标签
不得揭示暗风险具体内容
```

## 22.4 洗标

```text
成本：AP -1，cash -20
效果：把 selectedTag 加入 suppressedTags
不得删除真实标签
```

## 22.5 包装

```text
成本：AP -1，cash -10
效果：flags.packaged = true，添加 priceMultiplier ×1.2 与 risk +10
```

## 22.6 公关

```text
A：选中商品下一次出售 risk -20
B：reputation +10，不超过上限
```

## 22.7 验收标准

```text
AP 不足时按钮 disabled。
现金不足时付费操作 disabled。
鉴定后隐藏标签显示具体标签。
洗标后标签显示“已压制”。
包装后交易预览售价上升、风险上升。
公关后交易预览风险下降或信誉恢复。
```

---

# 23. Step 13：卡牌 Condition / Effect 与出牌

## 23.1 任务目标

实现卡牌使用的通用框架。

## 23.2 应实现文件

```text
src/rules_conditions.js
src/rules_effects.js
src/deck.js
src/actions.js
```

## 23.3 Condition 最低支持

第一版至少支持：

```text
always
product_has_tag
product_has_any_tag
product_has_unrevealed_hidden_tag
product_has_unresolved_dark_risk
target_tag_is_washable
customer_is
customer_type_is
pricing_mode_is
cash_at_least
reputation_at_least
all
any
not
```

## 23.4 Effect 最低支持

第一版至少支持：

```text
add_applied_tag_to_product
suppress_tag
reveal_hidden_tags
reveal_dark_risk_category
add_product_modifier
add_deal_modifier
add_global_modifier
add_price
add_risk
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
convert_accident_to_heat
```

## 23.5 出牌流程

```text
检查 card in hand
检查阶段 DAY_PROCESS
检查 AP / cash
检查 target 合法
检查 condition
执行 effects
扣成本
移动卡牌到 discardPile / exhaustPile
写入日志
刷新预览
刷新 UI
```

## 23.6 验收标准

```text
不能使用条件不满足的卡牌。
不能在非处理阶段出牌。
卡牌成本正确扣除。
卡牌效果能进入售价 / 风险 breakdown。
使用后卡牌从 hand 移除。
```

---

# 24. Step 14：出售结算与事故弹窗

## 24.1 任务目标

实现确认出售、最终结算、事故弹窗。

## 24.2 应实现文件

```text
src/rules_deal.js
src/rules_accident.js
src/actions.js
src/ui_components.js
```

## 24.3 confirmSell 流程

```text
1. 锁定 selectedProduct / selectedCustomer / selectedPricingMode
2. 使用 resolve 模式重新计算 finalPrice
3. 使用 resolve 模式重新计算 finalRisk
4. 根据 finalRisk 得到基础事故等级
5. 应用事故等级修正
6. 计算 refund / fine / reputationLoss
7. cash += finalPrice
8. cash -= refund
9. cash -= fine
10. singleProfit = finalPrice - product.cost - refund - fine
11. totalProfit += max(0, singleProfit)
12. reputation -= reputationLoss
13. product.status = sold
14. product.flags.sold = true
15. soldProductCount += 1
16. 写入 dealLog
17. 如果事故等级 != none，写入 accidentLog 并显示事故弹窗
18. 检查失败条件
19. 刷新 UI
```

## 24.4 事故弹窗必须显示

```text
事故标题
事故文案
最终成交收入
退款
罚款
信誉损失
现金变化
单笔利润
最终爆雷
事故等级
事故链条
继续按钮
```

## 24.5 验收标准

```text
已售商品不能再次出售。
现金变化正确。
累计利润变化正确。
信誉变化正确。
事故不是随机触发。
事故链条显示主要风险来源。
```

---

# 25. Step 15：收店奖励

## 25.1 任务目标

实现每日结束奖励三选一。

## 25.2 应实现文件

```text
src/rules_rewards.js
src/generator.js
src/actions.js
```

## 25.3 奖励类型最低支持

```text
add_card
upgrade_card
remove_card
add_passive
add_supply_source
gain_cash
gain_reputation
temporary_insurance
```

## 25.4 奖励生成

每日收店阶段生成 3 个 RewardOption。

```text
RewardOption.cashCost > cash 时 disabled。
玩家必须选择 1 个奖励才能进入下一天。
```

## 25.5 应用奖励

```text
扣除 cashCost
执行 payload
写入日志
关闭奖励弹窗
如果 currentDay < maxDays，currentDay += 1 并 startDay
如果 currentDay == maxDays，进入最终结算
```

## 25.6 验收标准

```text
奖励弹窗显示 3 个选项。
现金不足的奖励不可选。
选择奖励后效果生效。
奖励后进入下一天或最终结算。
```

---

# 26. Step 16：胜负判定与最终报告

## 26.1 任务目标

实现胜利、失败、最终经营报告。

## 26.2 应实现文件

```text
src/rules_report.js
src/dayFlow.js
src/actions.js
src/ui_components.js
```

## 26.3 胜利条件

第 8 天结束时：

```text
totalProfit >= targetTotalProfit
cash >= 0
reputation > 0
```

## 26.4 失败条件

任意时刻：

```text
cash < 0
reputation <= 0
```

第 8 天结束时：

```text
totalProfit < targetTotalProfit
```

## 26.5 最终报告显示

```text
胜利 / 失败
失败原因
最终累计利润
最终现金
最终信誉
总事故次数
最大单笔利润
最大事故
主要流派倾向
主要爆雷原因
经营评价文案
重新开始按钮
```

## 26.6 验收标准

```text
第 8 天结束能进入最终报告。
达成利润目标时胜利。
未达利润目标时失败。
现金为负或信誉归零时立即失败。
```

---

# 27. Step 17：存档、读档、重开

## 27.1 任务目标

实现基础 localStorage。

## 27.2 应实现文件

```text
src/storage.js
```

## 27.3 存档内容

保存：

```text
runState
dayState
deckState
uiState 必要部分
当前 seed
```

不保存：

```text
configTables
```

读档后重新加载配置，再把运行时状态恢复。

## 27.4 功能

```javascript
saveGame(appState)
loadGame(configTables)
clearSave()
hasSave()
```

## 27.5 验收标准

```text
刷新页面后可以继续当前局。
点击“清除存档”后不会继续旧局。
配置加载失败时不读档。
```

---

# 28. Step 18：Debug 面板与固定测试局

## 28.1 任务目标

实现可验证数值的 Debug 工具。

## 28.2 应实现文件

```text
src/debug.js
src/testScenarios.js
```

## 28.3 Debug 面板功能

至少包含：

```text
显示当前 seed
重新生成 seed
设置现金
设置累计利润
设置信誉
设置行动点
跳到指定天数
跳到指定阶段
生成测试商品
生成测试顾客
加载固定测试局 A
加载固定测试局 B
加载固定测试局 C
加载固定测试局 D
加载固定测试局 E
强制刷新交易预览
导出 appState JSON
清空存档
```

## 28.4 固定测试局

必须覆盖：

| 测试局 | 目标 |
|---|---|
| A 大厂水货爆雷 | 验证名校 + 水货 + HR + 高价卖 + 履历暗风险 |
| B 稳定相亲低风险 | 验证洗标、公关、家庭顾客、低事故成交 |
| C MCN 黑红变现 | 验证会发疯 / 抽象 / 小事故转收益 |
| D 盲盒价命中雷区 | 验证盲盒价事故等级 +1 |
| E 现金断裂失败 | 验证事故退款罚款导致 cash < 0 |

## 28.5 验收标准

```text
开发者可一键加载测试局。
加载后 UI 与交易预览同步更新。
测试局可稳定复现预期事故或结果。
```

---

# 29. Step 19：执行测试清单并修复

## 29.1 任务目标

根据 08_测试用例与验收清单执行检查。

## 29.2 Codex 必须至少跑通

```text
启动测试
数据完整性测试
新局初始化测试
每日流程测试
商品系统测试
顾客系统测试
基础操作测试
定价方式测试
售价计算测试
爆雷计算测试
事故结算测试
收店奖励测试
胜负报告测试
Debug 面板测试
固定测试局 A/B/C/D/E
完整 8 天手动局
```

## 29.3 Bug 修复原则

优先级：

```text
P0：会阻断游戏流程 / 结算错误 / 状态损坏 / 白屏
P1：核心规则错误 / UI 误导 / 事故不可复盘
P2：显示瑕疵 / 文案不够清楚 / 样式问题
```

先修 P0，再修 P1，最后修 P2。

---

# 30. Step 20：整理交付

## 30.1 任务目标

完成最终项目整理，确保可以交给设计者试玩。

## 30.2 README 最终必须包含

```text
项目简介
运行方式
文件结构
当前实现范围
已知未实现内容
Debug 面板用法
测试局说明
如何新增标签 / 商品 / 顾客 / 卡牌
如何反馈 Bug
```

## 30.3 最终交付清单

```text
index.html 可运行
style.css 完整
src/ 模块完整
data/ 配置完整
README.md 完整
Debug 面板可用
固定测试局可用
08 测试清单主要项目通过
```

---

# 31. 推荐给 Codex 的总启动 Prompt

以下 Prompt 可直接作为第一次发送给 Codex 的任务说明。

```text
你现在要为《人生标签交易所：牛马肉铺》制作 HTML 快速验证原型。

请先阅读 devdocs/ 下的 00–09 文档，尤其是：
00_HTML原型范围说明.md
01_核心玩法流程规格.md
02_系统规则规格.md
03_数据结构规格.md
04_首版配置表说明.md
05_售价爆雷事故计算规格.md
06_UI页面与交互规格.md
07_HTML技术实现规格.md
08_测试用例与验收清单.md
09_Codex开发执行说明.md

项目必须使用 HTML + CSS + Vanilla JavaScript。
不要使用 React/Vue/后端/数据库。

请严格按 09_Codex开发执行说明.md 的 Step 0 开始，只创建项目骨架、基础 HTML、CSS、main.js、constants.js 和 README.md。

不要一次性实现全部功能。
不要自行添加 P2 系统。
不要把玩法改成普通标签匹配。

完成 Step 0 后，请输出：
1. 创建了哪些文件；
2. 每个文件的作用；
3. 如何运行；
4. 当前还没实现什么；
5. 下一步建议执行 Step 1。
```

---

# 32. 分步 Prompt 模板

后续每一步都建议使用以下格式让 Codex 执行。

```text
继续开发《人生标签交易所：牛马肉铺》HTML 原型。

请阅读：
- 09_Codex开发执行说明.md 中的 Step X
- 与 Step X 相关的 00–08 文档章节

现在只实现 Step X：{步骤名称}。

要求：
1. 不实现 Step X 以外的大功能；
2. 不破坏已完成功能；
3. 不改动已经通过测试的公共接口，除非必要；
4. 如必须改动接口，请说明原因；
5. 完成后运行或说明手动测试方式；
6. 输出修改文件列表、验收结果、剩余 TODO。
```

---

# 33. 每次 Codex 输出格式要求

Codex 每完成一次开发任务，必须按以下格式汇报。

```text
## 本次完成
- ...

## 修改文件
- path/to/file.js：修改原因
- path/to/file.css：修改原因

## 如何测试
1. ...
2. ...
3. ...

## 已通过验收
- ...

## 未完成 / TODO
- ...

## 风险或疑问
- ...

## 下一步建议
- 执行 Step X+1：...
```

禁止只回答：

```text
Done.
```

---

# 34. Git 提交建议

如果项目使用 Git，建议每个 Step 至少一次提交。

## 34.1 分支建议

```bash
git checkout -b html-prototype-v0
```

## 34.2 Commit 粒度

推荐：

```text
chore: create project skeleton
feat(data): add initial config tables
feat(state): implement run and day state
feat(ui): implement main layout
feat(flow): implement day phase progression
feat(generator): generate products customers and market events
feat(deal): implement price and risk preview
feat(actions): implement base actions
feat(cards): implement card condition and effects
feat(resolve): implement sell and accident resolution
feat(reward): implement end-of-day rewards
feat(report): implement final run report
feat(debug): add test scenarios and debug panel
fix: resolve QA issues from test checklist
```

## 34.3 提交前检查

每次提交前，至少确认：

```text
页面不白屏
控制台没有新报错
开始新局仍可用
核心按钮仍可点击
已通过当前 Step 验收
```

---

# 35. 不确定需求处理规则

如果 Codex 遇到文档未明确的细节，按以下规则处理。

## 35.1 优先使用最小实现

例如：

```text
如果卡牌升级细节不明确，先实现“升级后替换为 upgradeTo 卡牌”。
不要发明复杂升级树。
```

## 35.2 优先保持可测试

例如：

```text
如果某个市场新闻特殊规则很复杂，先实现普通 modifier，并在 TODO 标注特殊规则未完成。
```

## 35.3 优先保留数据接口

即使某效果暂时不能完全实现，也应保留字段结构。

例如：

```text
specialRules 可以先读取但不完全执行。
需要在 UI / Debug 中标注未实现。
```

## 35.4 不得自行扩展系统

不明确时不要添加：

```text
新资源
新阶段
新顾客长期关系
新地图
新监管系统
新剧情系统
```

---

# 36. 当前版本允许的简化

为了尽快形成可玩闭环，第一版允许以下简化。

## 36.1 内容数量简化

可以先做最小集，再扩展到 04 的完整集。

但数据文件必须保留完整分类。

## 36.2 效果系统简化

第一版可以只支持常用 Condition / Effect。

未支持的效果必须：

```text
1. 不导致崩溃；
2. 在控制台 warning；
3. 在 Debug 或 TODO 中列出；
4. 不假装已经实现。
```

## 36.3 UI 样式简化

可以用朴素卡片布局。

不要求：

```text
动画
图标
插画
复杂响应式
移动端适配
```

但必须做到：

```text
信息清楚
按钮状态清楚
交易预览清楚
事故链条清楚
```

## 36.4 数值平衡简化

第一版不要求完全平衡。

但要求：

```text
至少能玩出 3 个流派倾向。
至少有高收益高风险交易。
至少有低收益低风险交易。
至少能通过奖励形成成长感。
```

---

# 37. 模块接口建议

本节给出推荐接口。Codex 可以微调，但应保持模块职责清楚。

## 37.1 main.js

```javascript
import { loadAllData } from './dataLoader.js';
import { createNewGameState } from './state.js';
import { render } from './render.js';
import { bindGlobalEvents } from './actions.js';

let appState = null;

async function boot() {
  const configTables = await loadAllData();
  appState = createNewGameState(configTables);
  bindGlobalEvents(() => appState, (nextState) => { appState = nextState; });
  render(appState);
}

boot();
```

## 37.2 actions.js

```javascript
export function startNewRun(appState) {}
export function goToNextPhase(appState) {}
export function buyProduct(appState, productId) {}
export function selectProduct(appState, productId) {}
export function selectCustomer(appState, customerId) {}
export function selectPricingMode(appState, pricingModeId) {}
export function useBaseAction(appState, actionId, payload) {}
export function playCard(appState, cardInstanceId, payload) {}
export function confirmSell(appState) {}
export function chooseReward(appState, rewardId) {}
```

所有 action 返回更新后的 appState，或直接修改 appState 后返回。

第一版可以使用可变状态，但必须集中修改。

## 37.3 rules_deal.js

```javascript
export function buildCalculationContext(appState, mode) {}
export function calculateDealPreview(appState) {}
export function resolveDeal(appState) {}
```

## 37.4 render.js

```javascript
export function render(appState) {
  const root = document.getElementById('app');
  root.innerHTML = renderAppShell(appState);
  bindUiEvents(appState);
}
```

注意：

```text
第一版允许 innerHTML 重绘。
但事件绑定必须集中，不要分散到大量 inline onclick。
```

---

# 38. UI 事件绑定建议

## 38.1 data-action 方案

推荐所有按钮使用：

```html
<button data-action="buy-product" data-product-id="prod_001">买入</button>
```

统一事件代理：

```javascript
document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  handleAction(target.dataset);
});
```

## 38.2 优点

```text
避免每次 render 后丢失复杂事件引用。
便于 Debug。
便于 Codex 扩展。
减少 inline onclick。
```

---

# 39. Debug 与测试开发顺序提醒

Debug 不应最后才做。

推荐最晚在 Step 10 后加入 Debug 面板雏形。

原因：

```text
售价、爆雷、事故计算没有 Debug 很难验证。
```

Debug 面板最早可以只支持：

```text
显示 appState
导出 appState JSON
刷新交易预览
设置现金 / 信誉 / 利润
```

之后逐渐加入测试局。

---

# 40. Codex 自检清单

每次开发结束前，Codex 必须检查：

```text
[ ] 页面是否能打开？
[ ] 控制台是否有红色错误？
[ ] 是否还能开始新局？
[ ] 当前阶段是否显示正确？
[ ] 顶部状态栏是否显示正确？
[ ] 是否出现 undefined / NaN？
[ ] 按钮 disabled 是否有原因？
[ ] 操作后是否写入日志？
[ ] 操作后交易预览是否刷新？
[ ] 是否保存了 cash 与 totalProfit 的区别？
[ ] 是否没有把事故做成随机？
[ ] 是否没有让普通鉴定完全揭示暗风险？
[ ] 是否没有把真实标签删除？
[ ] 是否没有添加 P2 系统？
```

---

# 41. 交付验收标准

最终提交给设计者试玩前，必须满足：

```text
[ ] 00 中 P0 范围全部可运行。
[ ] 01 中每日 8 阶段全部可推进。
[ ] 02 中核心绝对规则未被破坏。
[ ] 03 中核心数据对象均存在。
[ ] 04 中至少最小配置集已转为 JSON。
[ ] 05 中售价、爆雷、事故计算可运行。
[ ] 06 中主 UI 区域均已实现。
[ ] 07 中模块结构基本落实。
[ ] 08 中主要测试项通过。
[ ] 09 中禁止事项未违反。
```

---

# 42. 最终开发报告模板

Codex 完成全部开发后，应输出以下报告。

```text
# HTML 原型开发报告

## 1. 当前版本
- 版本号：v0.1
- 技术栈：HTML + CSS + Vanilla JS
- 运行方式：...

## 2. 已实现功能
- ...

## 3. 未实现功能
- ...

## 4. 与设计文档的差异
- ...

## 5. 已知问题
- ...

## 6. 测试结果
- 启动测试：通过 / 未通过
- 数据测试：通过 / 未通过
- 流程测试：通过 / 未通过
- 计算测试：通过 / 未通过
- 固定测试局：通过 / 未通过

## 7. 如何继续开发
- ...

## 8. 需要设计者确认的问题
- ...
```

---

# 43. 当前文档结论

本项目适合让 Codex 分步实现，而不适合一次性生成完整游戏。

正确开发方式是：

```text
先做骨架
再做数据
再做状态
再做流程
再做 UI
再做计算
再做交互
再做事故
再做奖励
再做测试
```

整个开发过程必须始终保护以下核心：

```text
累计利润是目标。
现金是构筑资源。
信誉是生命值。
爆雷是单笔交易临时计算。
事故由确定性风险阈值触发。
隐藏标签提供基础不确定性。
暗风险提供高级赌博张力。
交易预览必须诚实显示精确值或区间。
事故必须可复盘。
```

如果 Codex 做出的版本满足这些要求，即使 UI 简陋、内容数量较少，也已经完成了 HTML 快速验证原型的核心任务。
