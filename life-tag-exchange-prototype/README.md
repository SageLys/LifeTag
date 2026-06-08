# 人生标签交易所：牛马肉铺

HTML 快速验证原型，用于验证首版配置、核心流程边界和后续 TypeScript 规则模块组织。

## 当前开发阶段

P0-3：每日市场新闻、商品候选、顾客订单生成。

本阶段在 P0-2 状态机基础上生成每日新闻、商品候选和顾客订单，不实现买入、抽牌、出售、结算、奖励、存档或 Debug 测试局。

## 当前已实现

- Vite / TypeScript 项目可启动。
- 配置加载、配置校验和配置索引。
- 点击开始新局。
- RunState 初始化。
- DayState 初始化。
- DeckState 初始化。
- 初始牌组实例化。
- 每日阶段推进。
- DAY_SELL 返回 DAY_PROCESS。
- 第 1 天到第 8 天推进。
- 第 8 天结束后进入 RUN_END 占位报告。
- DAY_OPENING 生成今日市场新闻。
- DAY_PURCHASE 生成 4 个商品候选。
- DAY_CUSTOMER 生成 3 个顾客订单。
- 商品候选和顾客订单使用运行时实例 ID。
- 未揭示隐藏标签和暗风险详情不提前泄露。
- 阶段日志。
- 顶部状态栏实时更新。
- 配置或程序加载失败时显示 `fatal-error`。

## 当前未实现

- 买入商品。
- 抽牌。
- 基础操作。
- 卡牌效果。
- 商品 / 顾客 / 定价选择。
- 交易预览。
- 售价计算。
- 爆雷计算。
- 事故结算。
- 收店奖励。
- 正式胜负判定。
- 正式最终报告。
- 存档。
- Debug 测试局。

## 运行命令

```bash
npm install
npm run check
npm run build
npm run dev
```

预览生产构建：

```bash
npm run preview
```

## 手动验收步骤

1. 运行 `npm install`。
2. 运行 `npm run check`，确认 TypeScript 检查通过。
3. 运行 `npm run build`，确认生产构建通过。
4. 运行 `npm run dev`。
5. 打开终端输出的本地地址，通常是 `http://127.0.0.1:5173/` 或 `http://localhost:5173/`。
6. 确认页面显示“当前开发阶段：P0-3：每日市场新闻、商品候选、顾客订单生成”。
7. 确认顶部状态栏没有 `undefined`、`null`、`NaN`。
8. 点击“开始新局”，确认进入第 1 天 `DAY_OPENING`，市场新闻面板显示今日新闻。
9. 点击进入 `DAY_PURCHASE`，确认商品候选面板显示 4 个商品候选，买入按钮为 disabled。
10. 点击进入 `DAY_CUSTOMER`，确认顾客订单面板显示 3 个顾客订单。
11. 继续点击主按钮推进：`DAY_CUSTOMER` → `DAY_DRAW` → `DAY_PROCESS` → `DAY_SELL` → `DAY_RESOLVE` → `DAY_REWARD`。
12. 在 `DAY_SELL` 点击“返回处理阶段”，确认只会回到 `DAY_PROCESS`，再继续进入出售和结算。
13. 在 `DAY_REWARD` 点击“进入下一天”，确认旧新闻、商品候选、顾客订单被重置，并在对应阶段重新生成。
14. 重复推进到第 8 天。
15. 第 8 天 `DAY_REWARD` 点击“结束本局，查看占位报告”，确认进入 `RUN_END` 占位报告。
16. 在 `RUN_END` 点击“重新开始”，确认重新进入第 1 天 `DAY_OPENING`。
17. 确认日志区按顺序记录今日新闻、商品候选生成数量和顾客订单生成数量。
18. 打开浏览器控制台，确认没有阻塞级红色错误。

## 常见问题

### 页面白屏怎么办

先打开浏览器控制台查看错误。如果页面中出现“配置或程序加载失败”，优先按错误 message 检查配置文件路径、JSON 格式或配置校验问题。

### 配置加载失败怎么办

确认 `data/` 下配置文件名与 `src/core/configLoader.ts` 一致。当前奖励文件使用 `rewards.json`，不是 `rewardPools.json`。

### npm run build 失败怎么办

先运行 `npm run check` 查看 TypeScript 错误，再根据终端中的文件路径和行号修复。配置口径错误通常会在页面启动时由 `validateConfigs(configs)` 抛出。

## 分层原则

- `data/` 只放配置。
- `src/core/` 只放规则、状态、数据加载、校验、索引、类型。
- `src/ui/` 只放显示、按钮、DOM 事件。
- `src/main.ts` 只负责加载配置、校验、建索引、创建状态、调用 render、绑定事件。
