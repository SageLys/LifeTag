interface Stats {
  day: number;
  cash: number;
  profit: number;
  reputation: number;
  actionPoints: number;
  inventory: number;
  handSize: number;
}

interface Props { stats: Stats; }

export default function StatusBar({ stats }: Props) {
  const chips: { label: string; value: string | number }[] = [
    { label: '第', value: `${stats.day} 天` },
    { label: '现金', value: `¥${stats.cash}` },
    { label: '累计利润', value: `¥${stats.profit}` },
    { label: '信誉', value: stats.reputation },
    { label: '行动点', value: stats.actionPoints },
    { label: '库存', value: stats.inventory },
    { label: '手牌', value: stats.handSize },
  ];

  return (
    <div className="status-bar">
      <h1>🥩 牛马肉铺</h1>
      {chips.map(c => (
        <div className="stat-chip" key={c.label}>
          <span className="label">{c.label}</span>
          <span className="value">{c.value}</span>
        </div>
      ))}
    </div>
  );
}
