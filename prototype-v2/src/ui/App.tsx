import { useState } from 'react';
import StatusBar from './components/StatusBar';
import ShopZone from './components/ShopZone';
import Modal from './components/Modal';
import HandBar from './components/HandBar';

interface ZoneDef {
  id: string;
  emoji: string;
  name: string;
  hint: string;
  colorClass: string;
}

const ZONES: ZoneDef[] = [
  { id: 'tv',      emoji: '📺', name: '电视新闻',   hint: '市场行情 / 突发事件', colorClass: 'zone-tv'      },
  { id: 'supply',  emoji: '🚚', name: '货源区',     hint: '进货 / 补充库存',     colorClass: 'zone-supply'  },
  { id: 'fridge',  emoji: '🧊', name: '冷柜库存',   hint: '查看 / 管理库存',     colorClass: 'zone-fridge'  },
  { id: 'orders',  emoji: '📋', name: '订单板',     hint: '顾客需求 / 接单',     colorClass: 'zone-orders'  },
  { id: 'cutting', emoji: '🔪', name: '砧板加工台', hint: '切割 / 分装 / 加工',  colorClass: 'zone-cutting' },
  { id: 'cashier', emoji: '💰', name: '收银台',     hint: '定价 / 完成交易',     colorClass: 'zone-cashier' },
  { id: 'ledger',  emoji: '📒', name: '账本',       hint: '收支明细 / 日结',     colorClass: 'zone-ledger'  },
  { id: 'safe',    emoji: '🔒', name: '保险柜',     hint: '收店奖励 / 特殊资产', colorClass: 'zone-safe'    },
];

const INITIAL_STATS = {
  day: 1,
  cash: 500,
  profit: 0,
  reputation: 60,
  actionPoints: 5,
  inventory: 0,
  handSize: 3,
};

export default function App() {
  const [modal, setModal] = useState<{ emoji: string; name: string } | null>(null);

  const openZone = (_id: string, name: string, emoji: string) => {
    setModal({ emoji, name });
  };

  return (
    <>
      <StatusBar stats={INITIAL_STATS} />

      <main className="shop-scene">
        {ZONES.map(z => (
          <ShopZone key={z.id} {...z} onClick={openZone} />
        ))}
      </main>

      <HandBar />

      {modal && (
        <Modal
          emoji={modal.emoji}
          name={modal.name}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
