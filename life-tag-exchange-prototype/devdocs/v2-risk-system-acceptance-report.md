# v2 风险系统验收报告

> 生成时间：2026-06-10  
> 任务来源：Codex 风险数值重做全任务  
> 构建状态：✅ `tsc --noEmit` 零错误，`vite build` 成功

---

## 一、修改文件清单

| 文件 | 修改性质 | 核心内容 |
|---|---|---|
| `data/tags.json` | 数值归零 + 新增字段 | 所有 24 个标签 `baseRisk/riskValue` 归零；MCN 流派标签 `isNegative` 改 `false`；新增 `riskTraits` 字段 |
| `data/tagConflicts.json` | 数值调整 | `support_crazy_absurd.riskDelta` 改为 0；`support_controversial_rebellious.riskDelta` 改为 5 |
| `data/productTemplates.json` | 数值下调 | MCN 商品 `baseRisk` 下调（抽象发疯肉 20→10，争议流量肉 25→12，叛逆脆皮肉 25→12） |
| `data/customers.json` | 结构扩展 | 新增 `preferredTagPriceBonus`、`tabooTagRiskBonus`、`darkRiskSensitivity` 字段；MCN 配置完整重写 |
| `data/gameConfig.json` | 新增配置块 | 新增 `flowOverloadRisk`（流量过载分档风险） |
| `data/darkRisks.json` | 新增字段 | 平台类暗风险新增 `riskMin/riskMax/actualRiskDefault` |
| `data/marketEvents.json` | 条件式改造 | MCN 流派新闻风险改为条件式；新增 `market_platform_boring_penalty` |
| `data/pricingModes.json` | 数值上调 | `pricing_high.riskDelta` 10→15；`pricing_blind_box.riskDelta` 15→20 |
| `data/cards.json` | 条件式改造 | `card_crazy_persona` / `card_black_red_package` 风险改为仅家庭类顾客触发 |
| `data/passives.json` | 新增被动 | `passive_platform_pr_contact`（平台暗风险 -10）；`passive_collapse_contingency`（MCN 高风险 -15） |
| `src/core/rules_risk.ts` | 核心逻辑重写 | 禁用 `tag.baseRisk` 累加；新增流量过载/暗风险敏感度/精细化雷区逻辑 |
| `src/core/testScenarios.ts` | 新增测试场景 | 新增 4 个 MCN Debug 场景（MCN-A/B/C/D） |
| `src/core/types.ts` | 类型扩展 | `CustomerDef` 新增 `preferredTagPriceBonus`、`tabooTagRiskBonus`、`darkRiskSensitivity` 字段 |

---

## 二、v2 风险模型对比

### 旧模型（v1）

```
总风险 = Σ(tag.baseRisk) + product.baseRisk + 顾客雷区累加
         + 标签冲突 + 暗风险 + 市场新闻（无条件）+ 定价 + 卡牌
```

**问题：**
- MCN 核心标签（`[会发疯][抽象][争议感]`）`baseRisk` 本身就高（10~20），MCN 顾客偏好这些标签，导致卖给 MCN 的商品反而风险天然偏高
- 市场新闻无条件给 flow 标签加风险
- 顾客偏好标签和雷区标签都会加风险，设计语义混乱

### 新模型（v2）

```
总风险 = product.baseRisk（货源脏度）
       + Σ(命中 tabooTag 的 tabooTagRiskBonus[tagId])  ← 雷区才加风险
       + 标签冲突/支撑 riskDelta
       + 市场新闻（conditionMatches 过滤后）
       + 新鲜度/腐败
       + 基础操作（包装/公关）
       + 定价风险
       + 卡牌/操作修正
       + 被动修正
       + flowOverloadRisk（流量过载，分档）
```

**暗风险敏感度机制：**
- 命中顾客 `darkRiskSensitivity` 类型 → 全额计入 `actualRiskDefault`
- 未命中 → 仅计入 30% 残余

---

## 三、4 个 MCN Debug 场景验收预期

### MCN-A：高适配安全单

| 字段 | 预期值 |
|---|---|
| 商品 | 抽象发疯肉（`tag_absurd` + `tag_crazy`，无暗风险） |
| 顾客 | 短视频 MCN（riskTolerance=85） |
| 定价 | pricing_normal (+0) |
| 期望风险 | ≈ 10（仅 product.baseRisk） |
| 验收要点 | riskBreakdown 无 `customer_taboo` 项；无 `flow_overload`（flow 标签 ≤ 2） |

### MCN-B：流量过载（4 flow 标签）

| 字段 | 预期值 |
|---|---|
| 商品 | 争议流量肉 + appliedTagIds 补 `[会发疯][抽象]`，共 4 个 flow 标签 |
| 顾客 | 短视频 MCN |
| 定价 | pricing_normal (+0) |
| 期望风险 | ≈ 12 + 15 = 27（baseRisk + flowOverload） |
| 验收要点 | riskBreakdown 含 `flow_overload` 项，value = 15，label 显示"4 个流量标签" |

### MCN-C：平台暗风险 + 高价卖

| 字段 | 预期值 |
|---|---|
| 商品 | 争议流量肉 + `dark_platform_shadowban`（已揭示） |
| 顾客 | MCN（`darkRiskSensitivity: ["platform"]`） |
| 定价 | pricing_high (+15) |
| 期望风险 | ≈ 12 + 25（全额，敏感类型）+ 15 = 52 |
| 验收要点 | dark_risk breakdown 项无"非敏感顾客"标注；pricing_mode = +15 |

### MCN-D：MCN 标签错卖家长委员会

| 字段 | 预期值 |
|---|---|
| 商品 | 抽象发疯肉（`tag_absurd` + `tag_crazy`） |
| 顾客 | 家长委员会（taboo `tag_crazy` = 30，riskTolerance=30） |
| 定价 | pricing_normal (+0) |
| 期望风险 | ≈ 10 + 30 = 40，超出容忍值 30 |
| 验收要点 | riskBreakdown 含 `customer_taboo` 项（`[会发疯]`），value = 30；确认出售后触发事故 |

---

## 四、flowOverloadRisk 分档规则（gameConfig.json）

| flow 标签数量 | riskAdd |
|---|---|
| 0–2 个 | +0（不触发） |
| 3 个 | +8 |
| 4 个 | +15 |
| 5 个及以上 | +25 |

仅对 `customer_short_video_mcn`（或 customerType = "mcn"）生效。

---

## 五、MCN 新增被动

| 被动 ID | 触发条件 | 效果 |
|---|---|---|
| `passive_platform_pr_contact` | 商品含 platform 类暗风险 | 风险 -10 |
| `passive_collapse_contingency` | 顾客为 MCN 且风险 ≥ 60 | 风险 -15（每日限 1 次） |

---

## 六、已知 TODO / 后续工作

- [ ] `passive_collapse_contingency` 在 `rules_risk.ts` 的 `collectPassiveRiskModifiers()` 中尚未实现"风险 ≥ 60 才触发"的动态判断（当前版本只实现了 `passive_platform_pr_contact`，`collapse_contingency` 需要在已知风险计算完成后再判断，存在顺序依赖问题）
- [ ] `preferredTagPriceBonus` 的价格计算目前只在 `customers.json` 中声明，需在 `rules_price.ts`（或对应价格计算模块）中读取并应用
- [ ] 市场新闻条件式 modifier 中的 `condition.type = "customer_is"` / `"customer_type_is"` 已由 `conditionMatches()` 支持，但 `"pricing_mode_is"` 条件尚需在实际新闻数据中验证（`market_controversy_carnival`）
- [ ] 建议在 dev 工具中为 MCN-B/MCN-C/MCN-D 场景增加"自动断言模式"，对比实际 riskBreakdown 与预期值，无需手动查看

---

## 七、构建验证

```
tsc --noEmit        → 0 errors, 0 warnings ✅
vite build          → dist/ 202 KB JS, 1.23s ✅
```
