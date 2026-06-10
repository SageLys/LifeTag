# 项目长期记忆：牛马肉铺游戏原型

## 项目概述
《人生标签交易所：牛马肉铺》游戏原型，TypeScript + Vite 构建。

## v2 风险模型（已实装）
- 所有 tag.baseRisk = 0，标签本身不再贡献风险
- 风险来源：product.baseRisk（货源脏度）+ 顾客雷区（tabooTagRiskBonus）+ 标签冲突 + 条件式市场新闻 + 新鲜度/腐败 + 定价 + 卡牌/被动 + 流量过载
- flowOverloadRisk：MCN 顾客专属，flow 标签 3个+8 / 4个+15 / 5+个+25
- 暗风险敏感度：命中 darkRiskSensitivity 全额，未命中 30%

## 关键数据路径
- 风险计算：`src/core/rules_risk.ts`
- 类型定义：`src/core/types.ts`（CustomerDef 已扩展 v2 字段）
- 测试场景：`src/core/testScenarios.ts`（含 MCN-A/B/C/D 场景，seed 13201~13204）
- 顾客配置：`data/customers.json`（含 preferredTagPriceBonus / tabooTagRiskBonus / darkRiskSensitivity）
- 流量过载配置：`data/gameConfig.json` → `flowOverloadRisk`

## 未完成事项
- passive_collapse_contingency（风险≥60 才触发）动态判断未实装
- preferredTagPriceBonus 未在价格计算模块中读取
