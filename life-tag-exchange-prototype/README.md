# 人生标签交易所：牛马肉铺

HTML 快速验证原型，用于验证首版配置、核心流程边界和后续 TypeScript 规则模块组织。本阶段不实现完整玩法，只完成工程骨架、配置 JSON 转换、加载、索引、基础校验和最小 UI 骨架。

## 当前阶段

- 建立 Vite + TypeScript 工程骨架。
- 将 `devdocs/04_首版配置表说明.md` 的 Markdown 配置表转换为根目录 `data/*.json`。
- 建立 `data / core / ui / main.ts` 分层边界。
- 页面只显示配置加载成功、各配置表数量和未来面板占位。

## 安装与启动

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
```

## 目录结构

```text
life-tag-exchange-prototype/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  README.md
  devdocs/
  data/
  src/
    main.ts
    core/
    ui/
    styles/
```

## 分层职责

- `data/`：只放静态配置 JSON，不保存运行时状态。
- `src/core/`：只放规则、类型、状态、数据加载、索引、校验和后续计算逻辑，不直接操作 DOM。
- `src/ui/`：只放显示、按钮、DOM 渲染和 UI 事件绑定，不实现售价、爆雷、事故等核心计算。
- `src/main.ts`：只负责加载配置、校验、建立索引、初始化状态、调用渲染和绑定事件。

## 已转换配置

- `gameConfig.json`
- `tags.json`
- `darkRisks.json`
- `tagConflicts.json`
- `productTemplates.json`
- `customers.json`
- `marketEvents.json`
- `cards.json`
- `passives.json`
- `supplySources.json`
- `baseActions.json`
- `pricingModes.json`
- `accidents.json`
- `rewardPools.json`
- `endingEvaluations.json`

转换说明和待确认项记录在 `data/_conversion_notes.md`。

## 配置校验

开发服务器启动时会执行：

```ts
validateConfigs(configs)
```

最低校验包括 id 缺失、同表 id 重复、卡牌、标签、暗风险、顾客、奖励、定价方式和事故档位引用完整性。配置错误会抛出异常并阻止启动。

构建检查：

```bash
npm run build
```

## 当前未实现

- 每日流程推进。
- 商品和顾客生成。
- 牌组抽牌、弃牌、升级和删牌。
- 卡牌、被动、基础操作效果。
- 售价、利润、爆雷风险和事故结算。
- 收店奖励应用。
- 结局报告。
- 完整 UI 交互。

## 下一步建议

1. 根据 `01_核心玩法流程规格.md` 实现每日流程状态机。
2. 根据 `02_系统规则规格.md` 实现商品、顾客和市场生成。
3. 根据 `05_售价爆雷事故计算规格.md` 实现售价、风险、事故的确定性计算。
4. 将配置化 `Effect / Modifier / Condition` 补成可执行结构。
5. 在 UI 层接入商品选择、顾客选择、卡牌目标选择和交易预览。
