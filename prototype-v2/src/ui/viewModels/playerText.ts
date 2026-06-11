/** Shared helpers for player-facing text — short, no raw config fields exposed */

export function formatCash(value: number): string {
  return `¥${value}`;
}

export function formatRiskRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}~${max}`;
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function riskLabel(risk: number): string {
  if (risk <= 39) return '安全';
  if (risk <= 59) return '小风险';
  if (risk <= 79) return '中风险';
  if (risk <= 99) return '高风险';
  return '极危';
}

export function riskColor(risk: number): string {
  if (risk <= 39) return '#4caf50';
  if (risk <= 59) return '#ff9800';
  if (risk <= 79) return '#f44336';
  return '#9c27b0';
}

export function accidentLevelText(level: string): string {
  const map: Record<string, string> = {
    none: '无事故', minor: '小事故', medium: '中事故', major: '大事故', severe: '严重事故',
  };
  return map[level] ?? level;
}
