const PLACEHOLDER_CARDS = ['🃏', '🃏', '🃏'];

export default function HandBar() {
  return (
    <div className="hand-bar">
      <div className="hand-bar-label">手牌</div>
      {PLACEHOLDER_CARDS.map((c, i) => (
        <div className="hand-card-placeholder" key={i} title={`手牌 ${i + 1}`}>
          {c}
        </div>
      ))}
      <div className="hand-bar-empty">（手牌系统待实现）</div>
    </div>
  );
}
