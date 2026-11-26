import React, { useMemo, useState } from 'react';
import {
  Flame,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Wand2,
} from 'lucide-react';
import { BAND_META } from '../data/bands';
import {
  RARITY_META,
  type DailyBossState,
  type OwnedCardRecord,
  type PlayerState,
  type WikiCard,
} from '../types';
import {
  evaluateTeamSynergy,
  getEffectiveStats,
  getOrInitDailyBoss,
} from '../utils/progression';
import { playBattleHitSound, playRewardSound, playVictorySound } from '../utils/sound';

type BattleMode = '5v5' | 'boss';
type Difficulty = 'easy' | 'normal' | 'hard';

const DIFF_CONFIG: Record<
  Difficulty,
  { label: string; desc: string; scale: number; rewardShards: number }
> = {
  easy: {
    label: '初級・Live House',
    desc: '對手戰力 ×0.75 · 勝場 +35 碎片',
    scale: 0.75,
    rewardShards: 35,
  },
  normal: {
    label: '中級・音樂祭舞台',
    desc: '對手戰力 ×0.98 · 勝場 +65 碎片',
    scale: 0.98,
    rewardShards: 65,
  },
  hard: {
    label: '上級・武道館決戰',
    desc: '對手戰力 ×1.18 · 勝場 +110 碎片',
    scale: 1.18,
    rewardShards: 110,
  },
};

interface RoundLog {
  round: number;
  playerCard: WikiCard;
  enemyCard: WikiCard;
  playerScore: number;
  enemyScore: number;
  win: boolean;
  crit: boolean;
  note: string;
}

interface BattleViewProps {
  allCards: WikiCard[];
  ownedMap: Record<string, OwnedCardRecord>;
  playerState: PlayerState;
  onComplete5v5: (result: {
    won: boolean;
    rewardShards: number;
    fullSynergyWin: boolean;
  }) => void;
  onDamageDailyBoss: (nextBossState: DailyBossState, damageDealt: number) => void;
  onClaimBossReward: (packs: number, shards: number) => void;
  onSelectCard: (card: WikiCard) => void;
  onNotify: (msg: string) => void;
}

export const BattleView: React.FC<BattleViewProps> = ({
  allCards,
  ownedMap,
  playerState,
  onComplete5v5,
  onDamageDailyBoss,
  onClaimBossReward,
  onSelectCard,
  onNotify,
}) => {
  const [mode, setMode] = useState<BattleMode>('5v5');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [pickerBand, setPickerBand] = useState<string>('ALL');

  // 5v5 Battle state
  const [isFighting, setIsFighting] = useState(false);
  const [rounds, setRounds] = useState<RoundLog[]>([]);
  const [revealedRounds, setRevealedRounds] = useState(0);
  const [battleOutcome, setBattleOutcome] = useState<{
    won: boolean;
    playerWins: number;
    enemyWins: number;
    shardsEarned: number;
  } | null>(null);

  // Boss raid log
  const [lastBossLog, setLastBossLog] = useState<{
    totalDamage: number;
    hits: { card: WikiCard; dmg: number; crit: boolean }[];
    defeatedNow: boolean;
  } | null>(null);

  const cardById = useMemo(() => {
    const m: Record<string, WikiCard> = {};
    for (const c of allCards) m[c.id] = c;
    return m;
  }, [allCards]);

  const ownedCards = useMemo(() => {
    return allCards
      .filter((c) => Boolean(ownedMap[c.id]))
      .sort((a, b) => {
        const sa = getEffectiveStats(a, ownedMap[a.id]);
        const sb = getEffectiveStats(b, ownedMap[b.id]);
        return sb.atk + sb.def - (sa.atk + sa.def);
      });
  }, [allCards, ownedMap]);

  const activeTeam = useMemo(
    () => teamIds.map((id) => cardById[id]).filter(Boolean),
    [cardById, teamIds]
  );

  const synergy = useMemo(() => evaluateTeamSynergy(activeTeam), [activeTeam]);

  const teamTotals = useMemo(() => {
    let rawAtk = 0;
    let rawDef = 0;
    for (const c of activeTeam) {
      const eff = getEffectiveStats(c, ownedMap[c.id]);
      rawAtk += eff.atk;
      rawDef += eff.def;
    }
    const atk = Math.round(rawAtk * (1 + synergy.atkBonusPct / 100));
    const def = Math.round(rawDef * (1 + synergy.defBonusPct / 100));
    return { atk, def, power: atk + def };
  }, [activeTeam, ownedMap, synergy]);

  const { boss, bossState } = useMemo(
    () => getOrInitDailyBoss(playerState),
    [playerState]
  );
  const bossCard = cardById[boss.cardId];

  const handleToggleTeamCard = (cardId: string) => {
    if (isFighting) return;
    setTeamIds((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= 5) {
        onNotify('隊伍上限為 5 張卡牌，請先點擊已選卡片移除');
        return prev;
      }
      return [...prev, cardId];
    });
  };

  const handleAutoStrongest = () => {
    if (ownedCards.length === 0) {
      onNotify('請先去「扭蛋」抽幾張卡牌再組隊！');
      return;
    }
    setTeamIds(ownedCards.slice(0, 5).map((c) => c.id));
    onNotify('已自動選出戰力最強的 5 張卡牌！');
  };

  const handleAutoBandSynergy = () => {
    const groups: Record<string, WikiCard[]> = {};
    for (const c of ownedCards) {
      if (c.band === 'general') continue;
      if (!groups[c.band]) groups[c.band] = [];
      groups[c.band].push(c);
    }
    let bestTeam: WikiCard[] = [];
    let bestScore = -1;
    for (const cards of Object.values(groups)) {
      const pick = cards.slice(0, 5);
      const syn = evaluateTeamSynergy(pick);
      const sum = pick.reduce((acc, c) => {
        const eff = getEffectiveStats(c, ownedMap[c.id]);
        return acc + eff.atk + eff.def;
      }, 0);
      const total = sum * (1 + (syn.atkBonusPct + syn.defBonusPct) / 200);
      if (pick.length >= 2 && total > bestScore) {
        bestScore = total;
        bestTeam = pick;
      }
    }
    if (bestTeam.length === 0) {
      handleAutoStrongest();
      return;
    }
    // Fill remaining slots up to 5 with strongest cards
    const ids = bestTeam.map((c) => c.id);
    for (const c of ownedCards) {
      if (ids.length >= 5) break;
      if (!ids.includes(c.id)) ids.push(c.id);
    }
    setTeamIds(ids);
    onNotify('已依樂團羈絆自動配置隊伍！');
  };

  const handleStart5v5 = () => {
    if (activeTeam.length < 5) {
      onNotify('請先編組滿 5 張卡牌（或點「自動最強隊伍」）');
      return;
    }
    const cfg = DIFF_CONFIG[difficulty];
    // Pick 5 random opponents from allCards
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    const enemyTeam = shuffled.slice(0, 5);

    const logList: RoundLog[] = [];
    let pWins = 0;
    let eWins = 0;

    for (let i = 0; i < 5; i++) {
      const pCard = activeTeam[i];
      const eCard = enemyTeam[i];
      const eff = getEffectiveStats(pCard, ownedMap[pCard.id]);
      const crit = Math.random() < 0.24;
      const pAtk = eff.atk * (1 + synergy.atkBonusPct / 100);
      const pDef = eff.def * (1 + synergy.defBonusPct / 100);
      const pScore = Math.round(
        (pAtk * 0.62 + pDef * 0.38) *
          (crit ? 1.24 : 0.94 + Math.random() * 0.14)
      );
      const eScore = Math.round(
        (eCard.atk * 0.6 + eCard.def * 0.4) *
          cfg.scale *
          (0.92 + Math.random() * 0.16)
      );
      const win = pScore >= eScore;
      if (win) pWins += 1;
      else eWins += 1;

      logList.push({
        round: i + 1,
        playerCard: pCard,
        enemyCard: eCard,
        playerScore: pScore,
        enemyScore: eScore,
        win,
        crit,
        note: crit
          ? '安可暴擊！全場氣氛瞬間沸騰！'
          : win
            ? '演出壓制對手，贏得觀眾歡呼！'
            : '對手節奏強勁，本回合略遜一籌。',
      });
    }

    const won = pWins >= 3;
    const rewardShards = won ? cfg.rewardShards : 12;
    const fullSynergyWin =
      won &&
      activeTeam.every(
        (c) => c.band !== 'general' && c.band === activeTeam[0].band
      );

    setRounds(logList);
    setRevealedRounds(0);
    setBattleOutcome(null);
    setIsFighting(true);

    logList.forEach((r, idx) => {
      window.setTimeout(() => {
        setRevealedRounds(idx + 1);
        playBattleHitSound(r.crit);
        if (idx === logList.length - 1) {
          setIsFighting(false);
          setBattleOutcome({
            won,
            playerWins: pWins,
            enemyWins: eWins,
            shardsEarned: rewardShards,
          });
          if (won) playVictorySound();
          onComplete5v5({ won, rewardShards, fullSynergyWin });
        }
      }, 360 + idx * 520);
    });
  };

  const handleAttackBoss = () => {
    if (activeTeam.length === 0) {
      onNotify('請先選擇至少 1 張卡牌上場挑戰首領！');
      return;
    }
    if (bossState.defeated) {
      onNotify('今日首領已被討伐，請領取獎勵或明日再戰！');
      return;
    }

    const hits: { card: WikiCard; dmg: number; crit: boolean }[] = [];
    let totalDamage = 0;
    for (const c of activeTeam) {
      const eff = getEffectiveStats(c, ownedMap[c.id]);
      const crit = Math.random() < 0.25;
      const dmg = Math.round(
        eff.atk *
          (1 + synergy.atkBonusPct / 100) *
          (crit ? 1.38 : 0.92 + Math.random() * 0.18)
      );
      totalDamage += dmg;
      hits.push({ card: c, dmg, crit });
    }

    const nextHp = Math.max(0, bossState.currentHp - totalDamage);
    const defeatedNow = nextHp === 0;
    playBattleHitSound(hits.some((h) => h.crit));
    if (defeatedNow) {
      window.setTimeout(() => playVictorySound(), 220);
    }

    const nextBoss: DailyBossState = {
      ...bossState,
      currentHp: nextHp,
      attempts: bossState.attempts + 1,
      defeated: defeatedNow,
    };
    setLastBossLog({ totalDamage, hits, defeatedNow });
    onDamageDailyBoss(nextBoss, totalDamage);
  };

  const filteredPickerCards = useMemo(() => {
    if (pickerBand === 'ALL') return ownedCards;
    return ownedCards.filter((c) => c.band === pickerBand);
  }, [ownedCards, pickerBand]);

  return (
    <div className="dex-section">
      {/* Mode Switcher */}
      <div
        className="surface-panel"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Swords size={20} color="#facc15" />
            Live 對邦舞台
          </h2>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>
            編組 5 張卡組觸發「樂團羈絆」，贏取星之碎片與傳說首領討伐卡包！（累計勝場：{playerState.battleWins}｜首領討伐：{playerState.bossDefeats}）
          </p>
        </div>

        <div className="pill-wrap">
          <button
            className={`pill ${mode === '5v5' ? 'active' : ''}`}
            style={{ padding: '8px 16px', fontSize: 13 }}
            onClick={() => setMode('5v5')}
          >
            <Users size={14} />
            5v5 樂團對邦戰
          </button>
          <button
            className={`pill ${mode === 'boss' ? 'active' : ''}`}
            style={{ padding: '8px 16px', fontSize: 13 }}
            onClick={() => setMode('boss')}
          >
            <Flame size={14} />
            每日傳說首領戰
          </button>
        </div>
      </div>

      {/* Team Deck Slots */}
      <section className="surface-panel">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>
              我的出戰卡組（{activeTeam.length} / 5）
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              總 ATK <strong style={{ color: '#fb7185' }}>{teamTotals.atk.toLocaleString()}</strong> · 總 DEF{' '}
              <strong style={{ color: '#38bdf8' }}>{teamTotals.def.toLocaleString()}</strong> · 綜合戰力{' '}
              <strong style={{ color: '#facc15' }}>{teamTotals.power.toLocaleString()}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button className="btn btn-gold" onClick={handleAutoStrongest}>
              <Wand2 size={14} />
              自動最強隊伍
            </button>
            <button className="btn" onClick={handleAutoBandSynergy}>
              <Sparkles size={14} />
              自動樂團羈絆隊
            </button>
            {activeTeam.length > 0 && (
              <button className="btn" onClick={() => setTeamIds([])}>
                清空隊伍
              </button>
            )}
          </div>
        </div>

        {/* 5 visual slots */}
        <div className="battle-slots-grid">
          {[0, 1, 2, 3, 4].map((slotIdx) => {
            const card = activeTeam[slotIdx];
            if (!card) {
              return (
                <div key={slotIdx} className="battle-slot empty">
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    SLOT 0{slotIdx + 1}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    點選下方卡牌編入
                  </span>
                </div>
              );
            }
            const eff = getEffectiveStats(card, ownedMap[card.id]);
            const rMeta = RARITY_META[card.rarity];
            return (
              <button
                key={card.id}
                className="battle-slot filled"
                style={{ borderColor: rMeta.borderColor }}
                onClick={() => handleToggleTeamCard(card.id)}
                title="點擊移出隊伍"
              >
                {card.imageUrl && (
                  <img
                    src={card.imageUrl}
                    alt={card.title}
                    className="battle-slot-img"
                  />
                )}
                <div className="battle-slot-overlay">
                  <span
                    className="rarity-badge"
                    style={{ background: rMeta.color, fontSize: 10 }}
                  >
                    {card.rarity}
                    {eff.lb > 0 ? ` +${eff.lb}` : ''}
                  </span>
                  <div className="battle-slot-name">{card.title}</div>
                  <div style={{ fontSize: 10.5, color: '#fde68a' }}>
                    ATK {eff.atk.toLocaleString()}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {synergy.badges.length > 0 && (
          <div className="pill-wrap" style={{ marginTop: 12 }}>
            {synergy.badges.map((b) => (
              <span
                key={b}
                className="pill active"
                style={{ cursor: 'default', fontSize: 11.5 }}
              >
                <Sparkles size={12} />
                {b}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ==================== 5v5 ARENA ==================== */}
      {mode === '5v5' && (
        <section className="surface-panel">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div className="pill-wrap">
              {(Object.keys(DIFF_CONFIG) as Difficulty[]).map((d) => (
                <button
                  key={d}
                  className={`pill ${difficulty === d ? 'active' : ''}`}
                  onClick={() => setDifficulty(d)}
                >
                  {DIFF_CONFIG[d].label}
                </button>
              ))}
            </div>

            <button
              className="btn btn-gold"
              disabled={isFighting || activeTeam.length < 5}
              onClick={handleStart5v5}
              style={{ padding: '10px 22px', fontSize: 14 }}
            >
              <Swords size={16} />
              {isFighting ? 'Live 對決進行中…' : '開演！開始 5v5 對決'}
            </button>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            {DIFF_CONFIG[difficulty].desc}（落敗仍可獲得 +12 星之碎片鼓勵獎）
          </div>

          {rounds.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rounds.slice(0, revealedRounds).map((r) => (
                <div
                  key={r.round}
                  className="battle-round-row"
                  style={{
                    borderColor: r.win
                      ? 'rgba(52, 211, 153, 0.4)'
                      : 'rgba(251, 113, 133, 0.35)',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--gold)' }}>
                    R{r.round}
                  </div>
                  <button
                    className="battle-round-side"
                    onClick={() => onSelectCard(r.playerCard)}
                  >
                    <strong>{r.playerCard.title}</strong>
                    <span style={{ color: '#34d399', fontWeight: 800 }}>
                      {r.playerScore.toLocaleString()}
                    </span>
                  </button>
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 900,
                      color: r.win ? '#34d399' : '#fb7185',
                    }}
                  >
                    {r.win ? 'WIN' : 'LOSE'}
                  </div>
                  <button
                    className="battle-round-side right"
                    onClick={() => onSelectCard(r.enemyCard)}
                  >
                    <span style={{ color: '#fb7185', fontWeight: 800 }}>
                      {r.enemyScore.toLocaleString()}
                    </span>
                    <strong>{r.enemyCard.title}</strong>
                  </button>
                  <div className="battle-round-note">
                    {r.crit && '⚡ '}
                    {r.note}
                  </div>
                </div>
              ))}
            </div>
          )}

          {battleOutcome && (
            <div
              style={{
                marginTop: 14,
                padding: '14px 18px',
                borderRadius: 14,
                background: battleOutcome.won
                  ? 'rgba(52, 211, 153, 0.14)'
                  : 'rgba(251, 113, 133, 0.12)',
                border: `1px solid ${
                  battleOutcome.won
                    ? 'rgba(52, 211, 153, 0.45)'
                    : 'rgba(251, 113, 133, 0.4)'
                }`,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Trophy
                  size={22}
                  color={battleOutcome.won ? '#facc15' : '#fb7185'}
                />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900 }}>
                    {battleOutcome.won
                      ? `LIVE 勝利！（${battleOutcome.playerWins} : ${battleOutcome.enemyWins}）`
                      : `惜敗收場（${battleOutcome.playerWins} : ${battleOutcome.enemyWins}）`}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    獲得 ✦ +{battleOutcome.shardsEarned} 星之碎片
                  </div>
                </div>
              </div>
              <button className="btn btn-gold" onClick={handleStart5v5}>
                再戰一場
              </button>
            </div>
          )}
        </section>
      )}

      {/* ==================== DAILY BOSS RAID ==================== */}
      {mode === 'boss' && (
        <section
          className="surface-panel"
          style={{
            borderColor: 'rgba(244, 63, 94, 0.4)',
            background:
              'radial-gradient(circle at 80% 20%, rgba(244,63,94,0.14), transparent 55%), var(--bg-surface)',
          }}
        >
          <div className="boss-hero">
            {bossCard?.imageUrl && (
              <img
                src={bossCard.imageUrl}
                alt={boss.name}
                className="boss-thumb"
              />
            )}
            <div style={{ flex: 1, minWidth: 240 }}>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  color: '#fb7185',
                }}
              >
                TODAY&apos;S LEGEND BOSS · {boss.title}
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>
                {boss.name}
              </h3>
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: 13,
                  color: '#fde68a',
                  margin: '6px 0 12px',
                }}
              >
                {boss.quote}
              </p>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12.5,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                <span>
                  BOSS HP：{bossState.currentHp.toLocaleString()} /{' '}
                  {bossState.maxHp.toLocaleString()}
                </span>
                <span>已挑戰 {bossState.attempts} 次</span>
              </div>
              <div className="progress-bar-track" style={{ height: 12 }}>
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${(bossState.currentHp / bossState.maxHp) * 100}%`,
                    background: 'linear-gradient(90deg, #ef4444, #f97316, #facc15)',
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                {bossState.defeated ? (
                  bossState.rewardClaimed ? (
                    <span className="pill active">
                      <Trophy size={14} />
                      今日首領已討伐並領取獎勵！明天將刷新新首領
                    </span>
                  ) : (
                    <button
                      className="btn btn-gold"
                      onClick={() => {
                        playRewardSound();
                        onClaimBossReward(boss.rewardPacks, boss.rewardShards);
                      }}
                    >
                      <Trophy size={15} />
                      領取討伐獎勵（+{boss.rewardPacks} 卡包 ＋ {boss.rewardShards} 碎片）
                    </button>
                  )
                ) : (
                  <button
                    className="btn btn-gold"
                    disabled={activeTeam.length === 0}
                    onClick={handleAttackBoss}
                  >
                    <Flame size={15} />
                    派出現有卡組發動總攻擊！
                  </button>
                )}
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  討伐獎勵：+{boss.rewardPacks} 卡包 ＋ ✦{boss.rewardShards} 碎片（HP 跨場保留）
                </span>
              </div>
            </div>
          </div>

          {lastBossLog && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>
                本次總傷害：
                <span style={{ color: '#fb7185', marginLeft: 4 }}>
                  {lastBossLog.totalDamage.toLocaleString()}
                </span>
                {lastBossLog.defeatedNow && (
                  <span style={{ color: '#34d399', marginLeft: 10 }}>
                    🎉 成功討伐今日首領！
                  </span>
                )}
              </div>
              <div className="pill-wrap">
                {lastBossLog.hits.map((h, i) => (
                  <span key={`${h.card.id}-${i}`} className="pill">
                    {h.crit ? '⚡ ' : ''}
                    {h.card.title}：{h.dmg.toLocaleString()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Card Picker Pool */}
      <section className="surface-panel">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={15} color="#38bdf8" />
            點擊已擁有卡牌編入／移出隊伍（共 {ownedCards.length} 張可用）
          </div>
          <select
            className="text-input"
            style={{ flex: '0 0 auto', minWidth: 160 }}
            value={pickerBand}
            onChange={(e) => setPickerBand(e.target.value)}
          >
            <option value="ALL">全部樂團</option>
            {Object.values(BAND_META).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {filteredPickerCards.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>
            還沒有符合條件的已擁有卡牌，快去「扭蛋」抽包吧！
          </div>
        ) : (
          <div className="battle-picker-grid">
            {filteredPickerCards.map((card) => {
              const selected = teamIds.includes(card.id);
              const eff = getEffectiveStats(card, ownedMap[card.id]);
              const rMeta = RARITY_META[card.rarity];
              const band = BAND_META[card.band] ?? BAND_META.general;
              return (
                <button
                  key={card.id}
                  className={`battle-pick-item ${selected ? 'selected' : ''}`}
                  onClick={() => handleToggleTeamCard(card.id)}
                >
                  <div className="battle-pick-thumb">
                    {card.imageUrl && (
                      <img src={card.imageUrl} alt={card.title} loading="lazy" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span
                        className="rarity-badge"
                        style={{ background: rMeta.color, fontSize: 9.5, padding: '1px 5px' }}
                      >
                        {card.rarity}
                      </span>
                      {eff.lb > 0 && (
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: '#facc15' }}>
                          +{eff.lb}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {card.title}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {band.shortName} · ATK {eff.atk.toLocaleString()} / DEF{' '}
                      {eff.def.toLocaleString()}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
