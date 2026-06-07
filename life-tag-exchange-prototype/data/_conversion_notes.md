# 配置转换说明

## 本轮适配

- 原始文档目录为 `devdoc/`，已复制到项目内 `devdocs/`。
- `gameConfig.json` 按 8 天首版局参数整理，通关目标使用 `passTargetReputation`，未把现金作为通关目标。
- Markdown 表格中的中文标签、顾客和暗风险引用均转换为英文 ID。
- `product_black_box_discount_meat` 的暗风险池在文档中写作“任意类别”，已展开为 9 个暗风险 ID。
- 卡牌、被动、市场事件在本阶段只保留配置与 `effectText`，复杂效果留给后续 core 系统实现。
- 04 文档奖励表实际列出 43 行，但任务目标要求 42 个奖励模板。本轮按目标数量转换 42 个，暂未转换 `reward_dark_risk_coupon`，需要设计者确认是否恢复或替换。

## TODO

- 设计者确认市场事件、卡牌、被动的结构化 `conditions/effects/modifiers` 细项。
- 设计者确认 42/43 个收店奖励数量差异。
- 后续根据 05 文档补全售价、爆雷、事故结算公式。
