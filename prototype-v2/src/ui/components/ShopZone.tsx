interface Props {
  id: string;
  emoji: string;
  name: string;
  hint: string;
  colorClass: string;
  onClick: (id: string, name: string, emoji: string) => void;
}

export default function ShopZone({ id, emoji, name, hint, colorClass, onClick }: Props) {
  return (
    <div
      className={`zone-card ${colorClass}`}
      onClick={() => onClick(id, name, emoji)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(id, name, emoji)}
    >
      <div className="zone-emoji">{emoji}</div>
      <div className="zone-name">{name}</div>
      <div className="zone-hint">{hint}</div>
    </div>
  );
}
