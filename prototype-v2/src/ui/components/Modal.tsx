interface Props {
  emoji: string;
  name: string;
  onClose: () => void;
}

const ZONE_DESCRIPTIONS: Record<string, string> = {
  tv:       '电视里滚动着今日市场行情和突发新闻。关注新闻，掌握市场先机。',
  supply:   '货源区堆放着各地供应商的货品目录。选择进货，补充库存。',
  fridge:   '冷柜里存放着你所有的肉品库存。查看品质与标签，合理管理库存。',
  orders:   '订单板上挂着今日顾客的需求。接单前请确认货品与价格。',
  cutting:  '砧板加工台可以对肉品进行切割、分装或加工，改变产品标签。',
  cashier:  '收银台处理交易，完成售卖。记得定好价格，别亏本！',
  ledger:   '账本记录今日所有收支明细，日结时汇总利润与损失。',
  safe:     '保险柜存放收店奖励与特殊资产。达成目标后开锁领取。',
};

export default function Modal({ emoji, name, onClose }: Props) {
  const id = Object.entries({
    '电视新闻': 'tv', '货源区': 'supply', '冷柜库存': 'fridge',
    '订单板': 'orders', '砧板加工台': 'cutting', '收银台': 'cashier',
    '账本': 'ledger', '保险柜': 'safe',
  }).find(([k]) => name.includes(k.slice(0, 2)))?.[1] ?? '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-emoji">{emoji}</div>
        <h2>{name}</h2>
        <p>{ZONE_DESCRIPTIONS[id] ?? '（功能尚未实现，敬请期待）'}</p>
        <button className="modal-close" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}
