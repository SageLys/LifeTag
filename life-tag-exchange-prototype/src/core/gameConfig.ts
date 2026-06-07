import type { GameConfig } from './types';

/**
 * 职责：提供 GameConfig 相关读取与派生值入口。
 * 参考文档：03_数据结构规格.md、04_首版配置表说明.md。
 * 本阶段状态：只保留轻量读取函数。
 * TODO：补充不含 DOM 的配置派生值与默认值规范。
 */
export function getRunDayLimit(config: GameConfig): number {
  return config.dayLimit;
}
