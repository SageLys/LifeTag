# 配置转换说明

## 本轮适配

- 原始文档目录为 `devdoc/`，已复制到项目内 `devdocs/`。
- `gameConfig.json` 已修复为 `targetTotalProfit = 500`。累计利润是通关目标，现金是局内构筑资源，信誉是血量。
- `gameConfig.json` 默认参数已对齐首版 8 天 HTML 原型：初始现金 100、初始信誉 100、最大信誉 100、每日商品候选 4、库存上限 6、每日奖励选项 3。
- 初始牌组改为 `initialDeck` 结构，总数 10 张。
- 初始牌组 cardId 与 04 文档建议完全一致，且均存在于 `cards.json`：
  - `card_low_salary_pitch` x2
  - `card_decent_package` x2
  - `card_crazy_persona` x1
  - `card_background_check` x1
  - `card_trial_transfer` x1
  - `card_pr_package` x1
  - `card_hot_search_warmup` x1
  - `card_risk_underwriting` x1
- Markdown 表格中的中文标签、顾客和暗风险引用均转换为英文 ID。
- `product_black_box_discount_meat` 的暗风险池在文档中写作“任意类别”，已展开为 9 个暗风险 ID。
- 卡牌、被动、市场事件在当前阶段只保留配置中的 `effectText`，复杂效果留给后续 core 系统实现。
- 04 文档奖励表实际列出 43 行，但任务目标要求 42 个奖励模板。本轮按目标数量转换 42 个，暂未转换 `reward_dark_risk_coupon`，需要设计者确认是否恢复或替换。

## TODO

- 设计者确认市场事件、卡牌、被动的结构化 `conditions/effects/modifiers` 细项。
- 设计者确认 42/43 个收店奖励数量差异。
- 后续根据 05 文档补全售价、爆雷、事故结算公式。
