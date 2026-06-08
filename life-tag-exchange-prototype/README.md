# 人生标签交易所：牛马肉铺

HTML 快速验证原型，用于验证首版配置、核心流程边界和后续 TypeScript 规则模块组织。本阶段不实现完整玩法，只完成工程骨架、配置 JSON、加载、索引、基础校验和最小 UI 骨架。

## 当前项目目标

- 累计利润 `totalProfit` 是唯一核心通关目标。
- 现金 `cash` 是局内资源和构筑资源。
- 信誉 `reputation` 是血量。
- 爆雷 `risk` 是每笔交易的临时风险值，不是全局资源。
- 事故不随机，由最终风险阈值确定。

胜利条件：第 8 天结束时 `totalProfit >= targetTotalProfit`、`cash >= 0`、`reputation > 0`。

失败条件：任意时刻 `cash < 0` 或 `reputation <= 0`。

## 当前阶段

- 建立 Vite + TypeScript 工程骨架。
- 将 `devdocs/04_首版配置表说明.md` 的配置表转换为根目录 `data/*.json`。
- 建立 `data / core / ui / main.ts` 分层边界。
- 页面显示配置加载成功、各配置表数量、顶部状态栏和未来面板占位。
- Step 0 已对齐 `GameConfig`、`RunState`、`RunPhase`、顶部栏和配置校验口径。

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

## 配置校验

开发服务器启动时会执行：

```ts
validateConfigs(configs)
```

当前校验包括 id 唯一性、引用完整性、GameConfig 默认参数、初始牌组数量和卡牌引用、风险阈值区间、必需事故等级与定价方式。

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

进入 Step 1：运行时状态与阶段状态机。
