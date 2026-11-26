import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FastForward,
  Gift,
  Sparkles,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { DAILY_MISSIONS, type DailyMissionDef } from '../utils/progression';
import { playCardFlipSound } from '../utils/sound';
import {
  BONUS_COOLDOWN_MS,
  formatCountdown,
  formatPullShareText,
  getNextPackType,
  getPityRemaining,
} from '../utils/gacha';
import {
  RARITY_META,
  type OwnedCardRecord,
  type PackType,
  type PlayerState,
  type PullResultItem,
  type WikiCard,
} from '../types';
import { WikiCardView } from './WikiCardView';

interface GachaStageProps {
  playerState: PlayerState;
  msUntilNextPack: number;
  nowTs: number;
  poolSize: number;
  ownedCount: number;
  lastPull: { id: string; packType: PackType; items: PullResultItem[] } | null;
  ownedMap: Record<string, OwnedCardRecord>;
  onOpenPack: () => void;
  onClearPullView: () => void;
  onToggleEffects: () => void;
  onClaimBonusPacks: () => void;
  onClaimDailyMission: (mission: DailyMissionDef) => void;
  onSelectCard: (card: WikiCard) => void;
  onNotify: (msg: string) => void;
}

export const GachaStage: React.FC<GachaStageProps> = ({
  playerState,
  msUntilNextPack,
  nowTs,
  poolSize,
  ownedCount,
  lastPull,
  ownedMap,
  onOpenPack,
  onClearPullView,
  onToggleEffects,
  onClaimBonusPacks,
  onClaimDailyMission,
  onSelectCard,
  onNotify,
}) => {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [revealedCount, setRevealedCount] = useState(0);

  // Sequential 1-by-1 spinning card reveal whenever a new pack result arrives
  useEffect(() => {
    if (!lastPull) {
      setRevealedCount(0);
      return;
    }
    const total = lastPull.items.length;
    setRevealedCount(0);
    const timers: number[] = [];
    for (let i = 0; i < total; i++) {
      const cardRarity = lastPull.items[i].card.rarity;
      const t = window.setTimeout(() => {
        setRevealedCount((prev) => Math.max(prev, i + 1));
        playCardFlipSound(cardRarity);
      }, 180 + i * 480);
      timers.push(t);
    }
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [lastPull]);

  const nextPackType = getNextPackType(playerState);
  const { toGold, toRainbow } = getPityRemaining(playerState);
  const canPull = playerState.packs > 0;

  const bonusRemainingMs = Math.max(
    0,
    BONUS_COOLDOWN_MS - (nowTs - playerState.lastBonusClaimAt)
  );
  const canClaimBonus = bonusRemainingMs === 0;

  const handlePackMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: -py * 14, ry: px * 16 });
  };

  const handleCopyPull = async () => {
    if (!lastPull) return;
    const text = formatPullShareText(lastPull.items, lastPull.packType);
    try {
      await navigator.clipboard.writeText(text);
      onNotify('已複製本次抽卡結果到剪貼簿！');
    } catch {
      onNotify('複製失敗，請檢查瀏覽器權限');
    }
  };

  // ==================== PULL RESULT SCREEN ====================
  if (lastPull) {
    const highest = lastPull.items.reduce(
      (best, item) =>
        RARITY_META[item.card.rarity].rank > RARITY_META[best].rank
          ? item.card.rarity
          : best,
      lastPull.items[0]?.card.rarity ?? 'C'
    );
    const highMeta = RARITY_META[highest];
    const allRevealed = revealedCount >= lastPull.items.length;

    return (
      <div className="gacha-stage">
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.14em',
              color: highMeta.color,
              marginBottom: 4,
            }}
          >
            {lastPull.packType === 'rainbow'
              ? 'RAINBOW PACK · SSR+ 保證'
              : lastPull.packType === 'gold'
                ? 'GOLD PACK · SR+ 保證'
                : 'STARLIGHT PACK RESULT'}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 900 }}>
            {allRevealed
              ? `獲得 ${lastPull.items.length} 張卡牌 · 點擊卡片查看詳情`
              : `正在依序翻開第 ${Math.min(revealedCount + 1, lastPull.items.length)} / ${lastPull.items.length} 張卡牌…`}
          </h2>
        </div>

        <div className="card-grid-pull">
          {lastPull.items.map((item, idx) => {
            const isRevealed = idx < revealedCount;
            const rMeta = RARITY_META[item.card.rarity];
            const isHighBurst = isRevealed && rMeta.rank >= 4; // SSR+

            return (
              <div
                key={`${lastPull.id}-${item.card.id}-${idx}`}
                className={[
                  'pull-card-slot',
                  isRevealed ? 'spinning-in' : '',
                  isHighBurst ? 'high-rarity-burst' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={
                  isHighBurst
                    ? ({
                        '--burst-color': rMeta.color,
                        '--burst-glow': rMeta.glow,
                      } as React.CSSProperties)
                    : undefined
                }
              >
                {isRevealed ? (
                  <WikiCardView
                    card={item.card}
                    isNew={item.isNew}
                    count={item.totalCount}
                    limitBreak={ownedMap[item.card.id]?.limitBreak}
                    favorite={ownedMap[item.card.id]?.favorite}
                    onClick={() => onSelectCard(item.card)}
                  />
                ) : (
                  <button
                    className="pull-card-back"
                    onClick={() => setRevealedCount(lastPull.items.length)}
                    title="點擊立刻全部翻開"
                  >
                    <div className="pull-card-back-crest">★</div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 12,
                        letterSpacing: '0.16em',
                        color: 'var(--gold)',
                      }}
                    >
                      CARD 0{idx + 1}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      等待旋轉登場…
                    </div>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 10,
            marginTop: 8,
          }}
        >
          {!allRevealed ? (
            <button
              className="btn btn-gold"
              onClick={() => setRevealedCount(lastPull.items.length)}
            >
              <FastForward size={15} />
              全部立即翻開
            </button>
          ) : (
            <>
              <button className="btn" onClick={handleCopyPull}>
                <Copy size={15} />
                複製結果
              </button>
              <button
                className="btn btn-gold"
                disabled={!canPull}
                onClick={onOpenPack}
              >
                <RotateCcw size={15} />
                再開一包（剩餘 {playerState.packs}）
              </button>
              <button className="btn" onClick={onClearPullView}>
                返回卡包頁面
                <ArrowRight size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ==================== MAIN PACK SCREEN ====================
  return (
    <div className="gacha-stage">
      <div className="gacha-top-strip">
        <button
          className={`effect-toggle ${playerState.effectsEnabled ? 'on' : ''}`}
          onClick={onToggleEffects}
        >
          <Zap size={14} />
          特效強化模式：{playerState.effectsEnabled ? 'ON' : 'OFF'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
            圖鑑收錄：
            <strong style={{ color: '#facc15', marginLeft: 4 }}>
              {ownedCount} / {poolSize}
            </strong>
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
            累計開包：
            <strong style={{ color: 'var(--text-primary)', marginLeft: 4 }}>
              {playerState.totalPacksOpened}
            </strong>
          </span>
        </div>
      </div>

      <section className="pack-hero-panel">
        <div className="pack-counter-bar">
          <div className="pack-counter-pill">
            <span>今日卡包：</span>
            <strong>
              {playerState.packs} / {playerState.maxPacks}
            </strong>
          </div>
          <span className="regen-badge">
            {playerState.packs >= playerState.maxPacks
              ? '卡包已滿（每分鐘回復 1 包）'
              : `距離下次回復 ${formatCountdown(msUntilNextPack)}`}
          </span>
        </div>

        <div className="pity-row">
          {playerState.welcomeRainbowPending ? (
            <span className="pity-chip rainbow">
              🌈 新手首抽福利！本包必出 SSR 以上彩虹卡包
            </span>
          ) : (
            <>
              <span className="pity-chip gold">
                {toGold <= 1
                  ? '✨ 下一包即為【金卡包】(保底 SR+)'
                  : `${toGold} 次後獲得金卡包 (SR+)`}
              </span>
              <span className="pity-chip rainbow">
                {toRainbow <= 1
                  ? '🌈 下一包即為【彩虹卡包】(保底 SSR+)'
                  : `${toRainbow} 次後獲得彩虹卡包 (SSR+)`}
              </span>
            </>
          )}
        </div>

        <div className="booster-wrapper">
          <button
            className={`booster-pack ${nextPackType} ${!canPull ? 'disabled' : ''}`}
            disabled={!canPull}
            onClick={onOpenPack}
            onMouseMove={handlePackMouseMove}
            onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
            style={
              canPull
                ? {
                    transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                  }
                : undefined
            }
          >
            <div className="booster-crimp" />

            <span className="booster-tag">
              {nextPackType === 'rainbow'
                ? 'RAINBOW · SSR+ GUARANTEED'
                : nextPackType === 'gold'
                  ? 'GOLD · SR+ GUARANTEED'
                  : '5 CARDS PER PACK'}
            </span>

            <div className="booster-emblem">
              <span className="booster-emblem-star">★</span>
            </div>

            <div>
              <div className="booster-title">BanG! Wiki Pack</div>
              <div className="booster-sub">
                十二大樂團・角色・名曲・邦學條目
              </div>
            </div>

            <div className="booster-crimp-bottom" />
          </button>
        </div>

        {canPull ? (
          <div className="open-prompt">▲ 點擊卡包開啟 ▲</div>
        ) : (
          <div style={{ fontSize: 13, color: '#fda4af', fontWeight: 700 }}>
            卡包已用完，請稍候自動回復或領取下方應援補給包
          </div>
        )}
      </section>

      {/* Cheer Bonus & Drop Rate Summary */}
      <div
        className="surface-panel"
        style={{
          width: '100%',
          maxWidth: 720,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'rgba(250, 204, 21, 0.14)',
              border: '1px solid rgba(250, 204, 21, 0.35)',
              display: 'grid',
              placeItems: 'center',
              color: '#facc15',
            }}
          >
            <Gift size={20} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>
              Live House 應援補給（+3 卡包）
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              每 3 分鐘可免費領取一次應援卡包（可突破 10 包上限）
            </div>
          </div>
        </div>

        <button
          className="btn btn-gold"
          disabled={!canClaimBonus}
          onClick={onClaimBonusPacks}
        >
          <Sparkles size={14} />
          {canClaimBonus
            ? '領取 +3 包'
            : `冷卻中 ${formatCountdown(bonusRemainingMs)}`}
        </button>
      </div>

      {/* Daily Missions Checklist */}
      <section
        className="surface-panel"
        style={{ width: '100%', maxWidth: 720 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <ClipboardCheck size={17} color="#facc15" />
            每日任務（完成領卡包與星之碎片）
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            {playerState.daily.dateKey}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {DAILY_MISSIONS.map((m) => {
            const current = Math.min(m.target, m.getCurrent(playerState));
            const done = current >= m.target;
            const claimed = playerState.daily.claimedMissionIds.includes(m.id);
            return (
              <div key={m.id} className="mission-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 13.5 }}>{m.title}</strong>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        color: done ? '#34d399' : 'var(--text-muted)',
                      }}
                    >
                      {current} / {m.target}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {m.description} · 獎勵：+{m.rewardPacks} 卡包 ＋ ✦{m.rewardShards}
                  </div>
                </div>

                {claimed ? (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#34d399',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle2 size={14} />
                    已領取
                  </span>
                ) : done ? (
                  <button
                    className="btn btn-gold"
                    style={{ padding: '6px 12px', fontSize: 12, flexShrink: 0 }}
                    onClick={() => onClaimDailyMission(m)}
                  >
                    <Gift size={13} />
                    領取
                  </button>
                ) : (
                  <span
                    style={{
                      fontSize: 11.5,
                      color: 'var(--text-muted)',
                      flexShrink: 0,
                    }}
                  >
                    進行中
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
