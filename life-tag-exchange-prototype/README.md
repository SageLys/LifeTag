# 人生标签交易所：牛马肉铺

《人生标签交易所：牛马肉铺》文字试玩 demo，用于让朋友快速体验 8 天经营闭环。

玩家每天看市场新闻、进货、接单、抽牌、加工、出售，并在收店时选择奖励。目标是在 8 天内把累计利润做到目标值，同时守住现金和信誉。

## 当前已实现

- 8 天单局流程。
- 市场新闻。
- 进货。
- 顾客订单。
- 抽牌。
- 基础操作。
- 卡牌效果。
- 交易预览。
- 售价、爆雷区间、事故预测。
- 确认出售。
- 事故结算。
- 收店奖励。
- 第 8 天胜负判定。
- 最终报告。
- Debug 测试局。

## 本轮实现：新版收店与构筑反馈

- 收店阶段已改为四区 RewardPhase：基础维护、免费构筑三选一、付费强奖励商店、爆单奖励。
- 奖励效果已接入真实状态：加钱、回血、加卡、升级、删牌、加被动、加货源、临时保险、临时效果、库存处理。
- 卡牌 `effects` 会读取 `data/cards.json` 中的 `params`、`upgradedCardId` 和 plus 版配置，升级后会替换实际 `cardDefId`。
- 店铺被动、货源倾向、临时保险会显示在构筑面板，并参与售价、爆雷、事故或商品生成计算。
- Debug 增加 `TEST_REWARD_ALL_TYPES`、`TEST_CARD_UPGRADE_EFFECT`、`TEST_PASSIVE_INSURANCE_TRIGGER`、`TEST_SUPPLY_SOURCE_GENERATION`、`TEST_REWARD_BONUS_TRIGGER`。

## 当前仍待优化

- 数值平衡。
- 新手引导细节。
- 视觉表现。
- 存档。
- 朋友试玩反馈后的二轮调整。

## 运行方式

```bash
npm install
npm run check
npm run build
npm run dev
```

普通试玩：访问 `npm run dev` 输出的本地地址即可。

Debug：在 URL 后添加 `?debug=1` 才显示 Debug 入口。Debug 用于开发者调试、固定测试局和状态 JSON 查看，不是普通试玩入口。

## 分层原则

- `data/` 只放配置。
- `src/core/` 只放规则、状态、数据加载、校验、索引、类型。
- `src/ui/` 只放显示、按钮、DOM 事件。
- `src/main.ts` 只负责加载配置、校验、建索引、创建状态、调用 render、绑定事件。
