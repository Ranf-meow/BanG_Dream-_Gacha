import React, { useState } from 'react';
import { CheckCircle2, Gift, Lock, Trophy, X } from 'lucide-react';
import type { PlayerState } from '../types';
import { TROPHIES, type TrophyDef } from '../utils/progression';

interface TrophiesModalProps {
  open: boolean;
  playerState: PlayerState;
  onClose: () => void;
  onClaimTrophy: (trophy: TrophyDef) => void;
}

export const TrophiesModal: React.FC<TrophiesModalProps> = ({
  open,
  playerState,
  onClose,
  onClaimTrophy,
}) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  if (!open) return null;

  const unlockedSet = new Set(playerState.unlockedTrophies);
  const claimedSet = new Set(playerState.claimedTrophies);

  const visibleTrophies = TROPHIES.filter((t) => {
    const isUnlocked = unlockedSet.has(t.id);
    if (filter === 'unlocked') return isUnlocked;
    if (filter === 'locked') return !isUnlocked;
    return true;
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ flexWrap: 'wrap' }}>
          <div className="modal-title">
            <Trophy size={20} color="#facc15" />
            邦邦獎盃成就（{unlockedSet.size} / {TROPHIES.length}）
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="pill-wrap">
              <button
                className={`pill ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                全部
              </button>
              <button
                className={`pill ${filter === 'unlocked' ? 'active' : ''}`}
                onClick={() => setFilter('unlocked')}
              >
                已解鎖
              </button>
              <button
                className={`pill ${filter === 'locked' ? 'active' : ''}`}
                onClick={() => setFilter('locked')}
              >
                未解鎖
              </button>
            </div>
            <button className="icon-btn" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="trophy-grid">
          {visibleTrophies.map((t) => {
            const isUnlocked = unlockedSet.has(t.id);
            const isClaimed = claimedSet.has(t.id);
            const masked = Boolean(t.hidden && !isUnlocked);

            return (
              <div
                key={t.id}
                className={`trophy-card ${isUnlocked ? 'unlocked' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div className={`trophy-icon ${isUnlocked ? 'unlocked' : ''}`}>
                    {isUnlocked ? <Trophy size={18} /> : <Lock size={16} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <strong style={{ fontSize: 14 }}>
                        {masked ? '？？？？？' : t.title}
                      </strong>
                      {t.hidden && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: '1px 6px',
                            borderRadius: 6,
                            background: 'rgba(232, 121, 249, 0.16)',
                            color: '#f0abfc',
                            fontWeight: 700,
                          }}
                        >
                          隱藏彩蛋
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        marginTop: 3,
                        lineHeight: 1.45,
                      }}
                    >
                      {masked
                        ? '達成特定邦邦彩蛋條件即可解鎖此隱藏獎盃'
                        : t.description}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 11.5, color: '#fde68a', fontWeight: 700 }}>
                    獎勵：+{t.rewardPacks} 卡包 ＋ ✦{t.rewardShards}
                  </span>

                  {isUnlocked ? (
                    isClaimed ? (
                      <span
                        style={{
                          fontSize: 12,
                          color: '#34d399',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <CheckCircle2 size={14} />
                        已領取
                      </span>
                    ) : (
                      <button
                        className="btn btn-gold"
                        style={{ padding: '5px 11px', fontSize: 12 }}
                        onClick={() => onClaimTrophy(t)}
                      >
                        <Gift size={13} />
                        領取獎勵
                      </button>
                    )
                  ) : (
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      未達成
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
