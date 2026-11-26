import React from 'react';
import { Star } from 'lucide-react';
import { BAND_META } from '../data/bands';
import { RARITY_META, type WikiCard } from '../types';

interface WikiCardViewProps {
  card: WikiCard;
  onClick?: () => void;
  isNew?: boolean;
  count?: number;
  limitBreak?: number;
  favorite?: boolean;
  unowned?: boolean;
  revealDelayMs?: number;
  selected?: boolean;
}

export const WikiCardView: React.FC<WikiCardViewProps> = ({
  card,
  onClick,
  isNew,
  count,
  limitBreak = 0,
  favorite,
  unowned = false,
  revealDelayMs,
  selected = false,
}) => {
  const rarity = RARITY_META[card.rarity];
  const band = BAND_META[card.band] ?? BAND_META.general;
  const isHolo = rarity.rank >= 3; // SR+
  const isLR = card.rarity === 'LR';
  const lbMult = 1 + Math.min(5, limitBreak) * 0.08;
  const displayAtk = Math.round(card.atk * lbMult);
  const displayDef = Math.round(card.def * lbMult);

  const cardStyle = {
    '--card-border': selected ? '#facc15' : rarity.borderColor,
    '--card-glow': selected ? 'rgba(250, 204, 21, 0.7)' : rarity.glow,
    animationDelay: revealDelayMs ? `${revealDelayMs}ms` : undefined,
  } as React.CSSProperties;

  const artBg = `radial-gradient(circle at 50% 30%, ${band.color}58, transparent 62%), radial-gradient(circle at 80% 85%, ${rarity.color}38, transparent 58%), linear-gradient(150deg, #1a1c2b 0%, #0c0d13 100%)`;

  const fitMode =
    card.imageFit ??
    (card.category === '角色'
      ? 'portrait'
      : card.category === '樂曲'
        ? 'album'
        : 'cover');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    el.style.setProperty('--rx', `${((0.5 - py) * 10).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((px - 0.5) * 12).toFixed(2)}deg`);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={cardStyle}
      className={[
        'wiki-card',
        isHolo && !unowned ? 'holo' : '',
        isLR && !unowned ? 'lr-aura' : '',
        revealDelayMs !== undefined ? 'reveal-pop' : '',
        unowned ? 'unowned' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="wiki-card-header">
        <span
          className="rarity-badge"
          style={{
            background:
              card.rarity === 'LR'
                ? 'linear-gradient(135deg, #facc15, #f472b6, #a855f7)'
                : rarity.color,
          }}
        >
          {card.rarity}
        </span>
        <span className="wiki-card-title" title={card.title}>
          {unowned ? '？？？' : card.title}
        </span>
        {!unowned && limitBreak > 0 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 900,
              padding: '1px 5px',
              borderRadius: 5,
              background: 'rgba(250, 204, 21, 0.2)',
              border: '1px solid rgba(250, 204, 21, 0.5)',
              color: '#facc15',
              flexShrink: 0,
            }}
          >
            +{limitBreak}
          </span>
        )}
        {!unowned && favorite && (
          <Star
            size={13}
            fill="#facc15"
            color="#facc15"
            style={{ flexShrink: 0 }}
          />
        )}
      </div>

      <div className="wiki-card-art" style={{ background: artBg }}>
        {!unowned && card.imageUrl ? (
          <>
            <img
              className={
                fitMode === 'portrait'
                  ? 'wiki-card-portrait'
                  : fitMode === 'album'
                    ? 'wiki-card-album'
                    : 'wiki-card-scene'
              }
              src={card.imageUrl}
              alt={card.title}
              loading="lazy"
            />
            {fitMode === 'cover' && (
              <div className="card-art-vignette" aria-hidden />
            )}
          </>
        ) : (
          <>
            <span
              className="art-generated-motif"
              style={{ color: band.color }}
              aria-hidden
            >
              {band.motif}
            </span>
            <div className="art-generated-center" style={{ paddingBottom: 10 }}>
              <span
                className="art-band-pill"
                style={{ borderColor: `${band.color}aa` }}
              >
                {band.motif} {band.shortName}
              </span>
              <div className="art-main-label">
                {unowned ? '未收錄條目' : card.title}
              </div>
              {!unowned && card.role && (
                <div className="art-sub-label">{card.role}</div>
              )}
            </div>
          </>
        )}

        {/* Semi-transparent band icon watermark in bottom-left corner */}
        {!unowned && band.iconUrl && (
          <img
            className="card-band-icon-corner"
            src={band.iconUrl}
            alt={band.name}
            loading="lazy"
          />
        )}

        {isNew && <span className="card-new-badge">NEW</span>}
        <span className="card-cat-chip">{card.category}</span>

        {!unowned && count !== undefined && count > 0 && (
          <span className="card-count-chip">×{count}</span>
        )}
      </div>

      <div className="wiki-card-body">
        <p className="wiki-card-summary">
          {unowned
            ? '開啟 BanG Dream! 卡包以解鎖這張維基條目卡牌的詳細介紹與數值。'
            : card.summary}
        </p>
        {!unowned && card.flavorText && rarity.rank >= 3 && (
          <p className="wiki-card-flavor">{card.flavorText}</p>
        )}
      </div>

      <div className="wiki-card-stats">
        <div className="stat-cell">
          <span className="stat-label">ATK</span>
          <span className="stat-value atk">
            {unowned ? '----' : displayAtk.toLocaleString()}
          </span>
        </div>
        <div className="stat-cell">
          <span className="stat-label">DEF</span>
          <span className="stat-value def">
            {unowned ? '----' : displayDef.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};
