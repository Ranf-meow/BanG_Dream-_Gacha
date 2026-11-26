import React, { useState } from 'react';
import { ExternalLink, Info, Star, X } from 'lucide-react';
import { BAND_META } from '../data/bands';
import { RARITY_META, type OwnedCardRecord, type WikiCard } from '../types';

interface CardDetailModalProps {
  card: WikiCard | null;
  owned?: OwnedCardRecord;
  onClose: () => void;
  onToggleFavorite?: (cardId: string) => void;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  card,
  owned,
  onClose,
  onToggleFavorite,
}) => {
  const [showInfo, setShowInfo] = useState(false);

  if (!card) return null;

  const rarity = RARITY_META[card.rarity];
  const band = BAND_META[card.band] ?? BAND_META.general;
  const lb = Math.min(5, owned?.limitBreak ?? 0);
  const lbMult = 1 + lb * 0.08;
  const effAtk = Math.round(card.atk * lbMult);
  const effDef = Math.round(card.def * lbMult);
  const fitMode =
    card.imageFit ??
    (card.category === '角色'
      ? 'portrait'
      : card.category === '樂曲'
        ? 'album'
        : 'cover');
  const artBg = `radial-gradient(circle at 25% 20%, ${band.color}60, transparent 60%), radial-gradient(circle at 80% 85%, ${rarity.color}45, transparent 58%), linear-gradient(155deg, #1b1d2c 0%, #0c0d13 100%)`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{
          borderColor: rarity.borderColor,
          boxShadow: `0 28px 64px rgba(0,0,0,0.8), 0 0 40px -6px ${rarity.glow}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span
              className="rarity-badge"
              style={{
                background:
                  card.rarity === 'LR'
                    ? 'linear-gradient(135deg, #facc15, #f472b6, #a855f7)'
                    : rarity.color,
                fontSize: 12,
                padding: '3px 9px',
              }}
            >
              {card.rarity} · {rarity.zhName}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              #{card.pageId}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {owned && onToggleFavorite && (
              <button
                className="btn"
                style={{
                  padding: '6px 11px',
                  borderColor: owned.favorite
                    ? 'rgba(250, 204, 21, 0.55)'
                    : undefined,
                  color: owned.favorite ? '#facc15' : undefined,
                }}
                onClick={() => onToggleFavorite(card.id)}
              >
                <Star
                  size={14}
                  fill={owned.favorite ? 'currentColor' : 'none'}
                />
                {owned.favorite ? '已收藏' : '加入收藏'}
              </button>
            )}
            <button
              className="icon-btn"
              onClick={() => setShowInfo((v) => !v)}
              title="顯示條目數值詳情"
              style={{
                color: showInfo ? '#facc15' : undefined,
                borderColor: showInfo ? 'rgba(250, 204, 21, 0.5)' : undefined,
              }}
            >
              <Info size={16} />
            </button>
            <button className="icon-btn" onClick={onClose} aria-label="關閉">
              <X size={16} />
            </button>
          </div>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 2 }}>
          {card.title}
        </h2>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
          {card.subtitle}
        </p>

        <div
          style={{
            position: 'relative',
            height: 260,
            borderRadius: 14,
            overflow: 'hidden',
            background: artBg,
            border: `1px solid ${rarity.borderColor}88`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: card.imageUrl && fitMode === 'portrait' ? 10 : 0,
            marginBottom: 16,
          }}
        >
          {card.imageUrl ? (
            <>
              <img
                src={card.imageUrl}
                alt={card.title}
                style={
                  fitMode === 'portrait'
                    ? {
                        position: 'relative',
                        zIndex: 1,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        objectPosition: 'center bottom',
                        filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.68))',
                      }
                    : fitMode === 'album'
                      ? {
                          position: 'relative',
                          zIndex: 1,
                          width: 'auto',
                          height: 'calc(100% - 24px)',
                          maxWidth: 'calc(100% - 28px)',
                          objectFit: 'contain',
                          borderRadius: 10,
                          boxShadow: '0 10px 26px rgba(0,0,0,0.7)',
                          border: '1px solid rgba(255,255,255,0.16)',
                        }
                      : {
                          position: 'absolute',
                          inset: 0,
                          zIndex: 1,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center 22%',
                        }
                }
              />
              {fitMode === 'cover' && (
                <div className="card-art-vignette" aria-hidden />
              )}
            </>
          ) : (
            <>
              <span
                style={{
                  position: 'absolute',
                  right: 16,
                  bottom: -10,
                  fontSize: 88,
                  color: band.color,
                  opacity: 0.22,
                }}
              >
                {band.motif}
              </span>
              <span
                className="art-band-pill"
                style={{ borderColor: band.color, marginBottom: 8 }}
              >
                {band.motif} {band.name}
              </span>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 26,
                  fontWeight: 700,
                  textAlign: 'center',
                  padding: '0 20px',
                }}
              >
                {card.title}
              </div>
              {card.role && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.82)',
                  }}
                >
                  {card.role}
                </div>
              )}
            </>
          )}

          {band.iconUrl && (
            <img
              className="modal-band-icon-corner"
              src={band.iconUrl}
              alt={band.name}
            />
          )}

          {showInfo && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(8, 9, 14, 0.92)',
                backdropFilter: 'blur(6px)',
                padding: 18,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                alignContent: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>分類</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{card.category}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>所屬樂團</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: band.secondaryColor }}>
                  {band.name}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  質量（條目 Q-Score）
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: rarity.color }}>
                  {card.qScore.toFixed(1)} / 100
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>持有數量</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#facc15' }}>
                  {owned ? `×${owned.count}` : '未擁有'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ATK（人氣）</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fb7185' }}>
                  {card.atk.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>DEF（篇幅）</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#38bdf8' }}>
                  {card.def.toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>

        <p
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: 'var(--text-primary)',
            marginBottom: card.flavorText ? 12 : 16,
          }}
        >
          {card.summary}
        </p>

        {card.flavorText && (
          <blockquote
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 13.5,
              lineHeight: 1.6,
              color: '#fde68a',
              padding: '10px 14px',
              borderLeft: `3px solid ${rarity.color}`,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '0 10px 10px 0',
              marginBottom: 16,
            }}
          >
            {card.flavorText}
          </blockquote>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div className="rarity-count-box">
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              ATK 人氣{lb > 0 ? ` (+${lb})` : ''}
            </div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#fb7185' }}>
              {effAtk.toLocaleString()}
            </div>
          </div>
          <div className="rarity-count-box">
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              DEF 深度{lb > 0 ? ` (+${lb})` : ''}
            </div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#38bdf8' }}>
              {effDef.toLocaleString()}
            </div>
          </div>
          <div className="rarity-count-box">
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Q-Score</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: rarity.color }}>
              {card.qScore.toFixed(1)}
            </div>
          </div>
        </div>

        {card.tags.length > 0 && (
          <div className="pill-wrap" style={{ marginBottom: 16 }}>
            {card.tags.map((tag) => (
              <span key={tag} className="pill" style={{ cursor: 'default' }}>
                #{tag}
              </span>
            ))}
            {card.isCustom && (
              <span
                className="pill"
                style={{
                  borderColor: 'rgba(250,204,21,0.5)',
                  color: '#facc15',
                  cursor: 'default',
                }}
              >
                ★ 自訂卡牌
              </span>
            )}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            paddingTop: 12,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {owned
              ? `首次獲得：${new Date(owned.firstObtainedAt).toLocaleDateString('zh-TW')}（共 ×${owned.count}）`
              : '尚未收錄於圖鑑'}
          </span>

          {card.wikiUrl && (
            <a
              href={card.wikiUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-gold"
              style={{ padding: '7px 14px' }}
            >
              前往維基條目
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
