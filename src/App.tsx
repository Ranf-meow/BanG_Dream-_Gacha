import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Brain,
  FolderPlus,
  Gem,
  HelpCircle,
  Sparkles,
  Swords,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { DEFAULT_BANGDREAM_CARDS } from './data/bangdreamCards';
import {
  clearCollectionOnly,
  commitPackPull,
  createInitialPlayerState,
  deleteCustomCard,
  exportBackupPayload,
  importBackupPayload,
  loadAllData,
  normalizePlayerState,
  saveCustomCard,
  saveMultipleCustomCards,
  saveOwnedRecord,
  saveOwnedRecordsBatch,
  savePlayerState,
} from './db/storage';
import {
  BONUS_COOLDOWN_MS,
  GOLD_PITY_INTERVAL,
  RAINBOW_PITY_INTERVAL,
  computeRegeneratedState,
  getNextPackType,
  rollPackCards,
} from './utils/gacha';
import {
  DISMANTLE_SHARDS,
  MAX_LIMIT_BREAK,
  evaluateUnlockedTrophies,
  type DailyMissionDef,
  type TrophyDef,
} from './utils/progression';
import {
  playPackOpenSound,
  playRewardSound,
  setSoundEnabled,
} from './utils/sound';
import {
  RARITY_META,
  type DailyBossState,
  type OwnedCardRecord,
  type PackType,
  type PlayerState,
  type PullRecord,
  type PullResultItem,
  type Rarity,
  type WikiCard,
} from './types';
import { GachaStage } from './components/GachaStage';
import { DexView } from './components/DexView';
import { BattleView } from './components/BattleView';
import { ExchangeView } from './components/ExchangeView';
import { QuizView } from './components/QuizView';
import { CardDetailModal } from './components/CardDetailModal';
import { PackOpeningOverlay } from './components/PackOpeningOverlay';
import { PoolManagerModal } from './components/PoolManagerModal';
import { GuideModal } from './components/GuideModal';
import { TrophiesModal } from './components/TrophiesModal';

type MainTab = 'gacha' | 'dex' | 'battle' | 'exchange' | 'quiz';

export const App: React.FC = () => {
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>('gacha');

  const [playerState, setPlayerState] = useState<PlayerState>(
    createInitialPlayerState
  );
  const [ownedMap, setOwnedMap] = useState<Record<string, OwnedCardRecord>>({});
  const [customCards, setCustomCards] = useState<WikiCard[]>([]);
  const [, setPullHistory] = useState<PullRecord[]>([]);

  const [nowTs, setNowTs] = useState(() => Date.now());
  const [msUntilNextPack, setMsUntilNextPack] = useState(0);

  const [pendingRitual, setPendingRitual] = useState<{
    id: string;
    highestRarity: Rarity;
    packType: PackType;
    items: PullResultItem[];
  } | null>(null);
  const [lastPull, setLastPull] = useState<{
    id: string;
    packType: PackType;
    items: PullResultItem[];
  } | null>(null);

  const [detailCard, setDetailCard] = useState<WikiCard | null>(null);
  const [poolModalOpen, setPoolModalOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [trophiesOpen, setTrophiesOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const allCards = useMemo(() => {
    const map = new Map<string, WikiCard>();
    for (const c of DEFAULT_BANGDREAM_CARDS) map.set(c.id, c);
    for (const c of customCards) map.set(c.id, { ...c, isCustom: true });
    return Array.from(map.values());
  }, [customCards]);

  // Sync audio flag
  useEffect(() => {
    setSoundEnabled(playerState.soundEnabled);
  }, [playerState.soundEnabled]);

  // Initial load from IndexedDB
  useEffect(() => {
    let active = true;
    loadAllData()
      .then((data) => {
        if (!active) return;
        const normalized = normalizePlayerState(data.playerState, Date.now());
        const { state, changed, msUntilNext } = computeRegeneratedState(
          normalized,
          Date.now()
        );
        const { nextUnlocked } = evaluateUnlockedTrophies(
          state,
          data.ownedMap,
          DEFAULT_BANGDREAM_CARDS.concat(data.customCards)
        );
        const finalState = { ...state, unlockedTrophies: nextUnlocked };
        setPlayerState(finalState);
        setMsUntilNextPack(msUntilNext);
        setOwnedMap(data.ownedMap);
        setCustomCards(data.customCards);
        setPullHistory(data.pullHistory);
        setLoaded(true);
        if (changed || nextUnlocked.length !== state.unlockedTrophies.length) {
          void savePlayerState(finalState);
        }
      })
      .catch(() => {
        if (!active) return;
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // 1-second tick for pack regeneration countdown & daily rollover
  useEffect(() => {
    if (!loaded) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setNowTs(now);
      setPlayerState((prev) => {
        const normalized = normalizePlayerState(prev, now);
        const { state, changed, msUntilNext } = computeRegeneratedState(
          normalized,
          now
        );
        setMsUntilNextPack(msUntilNext);
        if (changed || normalized.daily.dateKey !== prev.daily.dateKey) {
          void savePlayerState(state);
          return state;
        }
        return prev;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loaded]);

  const ownedUniqueCount = useMemo(
    () => allCards.filter((c) => Boolean(ownedMap[c.id])).length,
    [allCards, ownedMap]
  );

  const unclaimedTrophiesCount = useMemo(() => {
    const claimed = new Set(playerState.claimedTrophies);
    return playerState.unlockedTrophies.filter((id) => !claimed.has(id)).length;
  }, [playerState.claimedTrophies, playerState.unlockedTrophies]);

  // Helper: check trophy unlocks & notify
  const applyTrophyCheck = useCallback(
    (
      candidateState: PlayerState,
      candidateOwned: Record<string, OwnedCardRecord>
    ): PlayerState => {
      const { nextUnlocked, newlyUnlocked } = evaluateUnlockedTrophies(
        candidateState,
        candidateOwned,
        allCards
      );
      if (newlyUnlocked.length > 0) {
        notify(`🏆 解鎖獎盃「${newlyUnlocked[0].title}」！點右上角 🏆 領獎`);
      }
      return { ...candidateState, unlockedTrophies: nextUnlocked };
    },
    [allCards, notify]
  );

  // ==================== OPEN PACK ====================
  const handleOpenPack = useCallback(() => {
    if (playerState.packs <= 0 || allCards.length === 0) return;

    const now = Date.now();
    const packType = getNextPackType(playerState);
    playPackOpenSound(packType !== 'normal');
    const { cards, highestRarity } = rollPackCards(allCards, packType);

    const nextOwnedMap = { ...ownedMap };
    const results: PullResultItem[] = [];
    let srPlusCount = 0;
    let ssrPlusCount = 0;
    const distinctRarities = new Set<Rarity>();

    for (const card of cards) {
      distinctRarities.add(card.rarity);
      if (RARITY_META[card.rarity].rank >= 3) srPlusCount += 1;
      if (RARITY_META[card.rarity].rank >= 4) ssrPlusCount += 1;

      const existing = nextOwnedMap[card.id];
      const isNew = !existing;
      const nextRec: OwnedCardRecord = existing
        ? {
            ...existing,
            count: existing.count + 1,
            lastObtainedAt: now,
          }
        : {
            cardId: card.id,
            count: 1,
            firstObtainedAt: now,
            lastObtainedAt: now,
            favorite: false,
            limitBreak: 0,
          };
      nextOwnedMap[card.id] = nextRec;
      results.push({ card, isNew, totalCount: nextRec.count });
    }

    const recMap = new Map<string, OwnedCardRecord>();
    for (const r of results) recMap.set(r.card.id, nextOwnedMap[r.card.id]);
    const updatedRecords = Array.from(recMap.values());

    const wasFull = playerState.packs >= playerState.maxPacks;
    const isWelcome = playerState.welcomeRainbowPending;
    const nextGold = isWelcome
      ? playerState.pityGoldCounter
      : playerState.pityGoldCounter + 1 >= GOLD_PITY_INTERVAL
        ? 0
        : playerState.pityGoldCounter + 1;
    const nextRainbow = isWelcome
      ? playerState.pityRainbowCounter
      : playerState.pityRainbowCounter + 1 >= RAINBOW_PITY_INTERVAL
        ? 0
        : playerState.pityRainbowCounter + 1;

    const flags = new Set(playerState.specialFlags);
    if (ssrPlusCount >= 2) flags.add('double_ssr');
    if (distinctRarities.size >= 5) flags.add('rainbow_hand');

    const baseNextState: PlayerState = {
      ...playerState,
      packs: Math.max(0, playerState.packs - 1),
      lastRegenAt: wasFull ? now : playerState.lastRegenAt,
      totalPacksOpened: playerState.totalPacksOpened + 1,
      pityGoldCounter: nextGold,
      pityRainbowCounter: nextRainbow,
      welcomeRainbowPending: false,
      specialFlags: Array.from(flags),
      daily: {
        ...playerState.daily,
        packsOpened: playerState.daily.packsOpened + 1,
        srPlusPulled: playerState.daily.srPlusPulled + srPlusCount,
      },
    };

    const nextState = applyTrophyCheck(baseNextState, nextOwnedMap);
    const pullRecord: PullRecord = {
      id: `pull-${now}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      packType,
      cardIds: cards.map((c) => c.id),
      highestRarity,
    };

    setPlayerState(nextState);
    setOwnedMap(nextOwnedMap);
    setPullHistory((prev) => [pullRecord, ...prev].slice(0, 80));
    void commitPackPull(nextState, updatedRecords, pullRecord);

    if (playerState.effectsEnabled) {
      setPendingRitual({
        id: pullRecord.id,
        highestRarity,
        packType,
        items: results,
      });
    } else {
      setLastPull({ id: pullRecord.id, packType, items: results });
    }
  }, [allCards, applyTrophyCheck, ownedMap, playerState]);

  const handleFinishRitual = useCallback(() => {
    setPendingRitual((current) => {
      if (current) {
        setLastPull({
          id: current.id,
          packType: current.packType,
          items: current.items,
        });
      }
      return null;
    });
  }, []);

  const handleToggleEffects = useCallback(() => {
    setPlayerState((prev) => {
      const next = { ...prev, effectsEnabled: !prev.effectsEnabled };
      void savePlayerState(next);
      return next;
    });
  }, []);

  const handleToggleSound = useCallback(() => {
    setPlayerState((prev) => {
      const next = { ...prev, soundEnabled: !prev.soundEnabled };
      setSoundEnabled(next.soundEnabled);
      void savePlayerState(next);
      notify(next.soundEnabled ? '🔊 抽卡與互動音效：已開啟' : '🔇 抽卡與互動音效：已靜音');
      return next;
    });
  }, [notify]);

  const handleClaimBonusPacks = useCallback(() => {
    const now = Date.now();
    if (now - playerState.lastBonusClaimAt < BONUS_COOLDOWN_MS) return;
    playRewardSound();
    const next: PlayerState = {
      ...playerState,
      packs: playerState.packs + 3,
      lastBonusClaimAt: now,
    };
    setPlayerState(next);
    void savePlayerState(next);
    notify('已領取 Live House 應援補給 +3 卡包！');
  }, [notify, playerState]);

  const handleClaimDailyMission = useCallback(
    (mission: DailyMissionDef) => {
      if (playerState.daily.claimedMissionIds.includes(mission.id)) return;
      if (mission.getCurrent(playerState) < mission.target) return;
      playRewardSound();
      const next: PlayerState = {
        ...playerState,
        packs: playerState.packs + mission.rewardPacks,
        starShards: playerState.starShards + mission.rewardShards,
        daily: {
          ...playerState.daily,
          claimedMissionIds: [
            ...playerState.daily.claimedMissionIds,
            mission.id,
          ],
        },
      };
      setPlayerState(next);
      void savePlayerState(next);
      notify(
        `完成每日任務！獲得 +${mission.rewardPacks} 卡包 ＋ ✦${mission.rewardShards} 碎片`
      );
    },
    [notify, playerState]
  );

  const handleClaimTrophy = useCallback(
    (trophy: TrophyDef) => {
      if (playerState.claimedTrophies.includes(trophy.id)) return;
      if (!playerState.unlockedTrophies.includes(trophy.id)) return;
      playRewardSound();
      const next: PlayerState = {
        ...playerState,
        packs: playerState.packs + trophy.rewardPacks,
        starShards: playerState.starShards + trophy.rewardShards,
        claimedTrophies: [...playerState.claimedTrophies, trophy.id],
      };
      setPlayerState(next);
      void savePlayerState(next);
      notify(
        `領取獎盃「${trophy.title}」：+${trophy.rewardPacks} 卡包 ＋ ✦${trophy.rewardShards} 碎片`
      );
    },
    [notify, playerState]
  );

  // ==================== BATTLE HANDLERS ====================
  const handleComplete5v5 = useCallback(
    (res: { won: boolean; rewardShards: number; fullSynergyWin: boolean }) => {
      const flags = new Set(playerState.specialFlags);
      if (res.fullSynergyWin) flags.add('full_synergy_win');

      const base: PlayerState = {
        ...playerState,
        starShards: playerState.starShards + res.rewardShards,
        battleWins: playerState.battleWins + (res.won ? 1 : 0),
        specialFlags: Array.from(flags),
        daily: {
          ...playerState.daily,
          battlesPlayed: playerState.daily.battlesPlayed + 1,
        },
      };
      const next = applyTrophyCheck(base, ownedMap);
      setPlayerState(next);
      void savePlayerState(next);
    },
    [applyTrophyCheck, ownedMap, playerState]
  );

  const handleDamageDailyBoss = useCallback(
    (nextBossState: DailyBossState, damageDealt: number) => {
      const justDefeated =
        nextBossState.defeated && !playerState.dailyBoss?.defeated;
      const base: PlayerState = {
        ...playerState,
        dailyBoss: nextBossState,
        bossDefeats: playerState.bossDefeats + (justDefeated ? 1 : 0),
        daily: {
          ...playerState.daily,
          battlesPlayed: playerState.daily.battlesPlayed + 1,
        },
      };
      const next = applyTrophyCheck(base, ownedMap);
      setPlayerState(next);
      void savePlayerState(next);
      notify(
        justDefeated
          ? `🎉 造成 ${damageDealt.toLocaleString()} 傷害，成功討伐今日首領！`
          : `對首領造成 ${damageDealt.toLocaleString()} 傷害！`
      );
    },
    [applyTrophyCheck, notify, ownedMap, playerState]
  );

  const handleClaimBossReward = useCallback(
    (packs: number, shards: number) => {
      if (!playerState.dailyBoss || playerState.dailyBoss.rewardClaimed) return;
      const next: PlayerState = {
        ...playerState,
        packs: playerState.packs + packs,
        starShards: playerState.starShards + shards,
        dailyBoss: { ...playerState.dailyBoss, rewardClaimed: true },
      };
      setPlayerState(next);
      void savePlayerState(next);
      notify(`已領取首領討伐獎勵：+${packs} 卡包 ＋ ✦${shards} 星之碎片！`);
    },
    [notify, playerState]
  );

  // ==================== EXCHANGE / DISMANTLE / LIMIT BREAK ====================
  const handleDismantleSingle = useCallback(
    (card: WikiCard, qty: number) => {
      const rec = ownedMap[card.id];
      if (!rec || rec.count <= 1) return;
      const actualQty = Math.min(qty, rec.count - 1);
      const earned = actualQty * DISMANTLE_SHARDS[card.rarity];
      playRewardSound();

      const updatedRec: OwnedCardRecord = {
        ...rec,
        count: rec.count - actualQty,
      };
      const nextOwned = { ...ownedMap, [card.id]: updatedRec };
      const base: PlayerState = {
        ...playerState,
        starShards: playerState.starShards + earned,
        totalDismantled: playerState.totalDismantled + actualQty,
        daily: {
          ...playerState.daily,
          shardsOrBreakActions: playerState.daily.shardsOrBreakActions + 1,
        },
      };
      const nextState = applyTrophyCheck(base, nextOwned);
      setOwnedMap(nextOwned);
      setPlayerState(nextState);
      void saveOwnedRecordsBatch([updatedRec], nextState);
      notify(`已分解 ${actualQty} 張「${card.title}」，獲得 ✦ +${earned} 星之碎片`);
    },
    [applyTrophyCheck, notify, ownedMap, playerState]
  );

  const handleDismantleAllSurplus = useCallback(() => {
    const changedRecs: OwnedCardRecord[] = [];
    const nextOwned = { ...ownedMap };
    let totalCount = 0;
    let totalShards = 0;

    for (const c of allCards) {
      const rec = ownedMap[c.id];
      if (rec && rec.count > 1) {
        const surplus = rec.count - 1;
        totalCount += surplus;
        totalShards += surplus * DISMANTLE_SHARDS[c.rarity];
        const updated: OwnedCardRecord = { ...rec, count: 1 };
        nextOwned[c.id] = updated;
        changedRecs.push(updated);
      }
    }
    if (totalCount === 0) return;

    playRewardSound();
    const base: PlayerState = {
      ...playerState,
      starShards: playerState.starShards + totalShards,
      totalDismantled: playerState.totalDismantled + totalCount,
      daily: {
        ...playerState.daily,
        shardsOrBreakActions: playerState.daily.shardsOrBreakActions + 1,
      },
    };
    const nextState = applyTrophyCheck(base, nextOwned);
    setOwnedMap(nextOwned);
    setPlayerState(nextState);
    void saveOwnedRecordsBatch(changedRecs, nextState);
    notify(`一鍵分解 ${totalCount} 張多餘重複卡，獲得 ✦ +${totalShards.toLocaleString()} 星之碎片！`);
  }, [allCards, applyTrophyCheck, notify, ownedMap, playerState]);

  const handleExchangeCard = useCallback(
    (card: WikiCard, cost: number) => {
      if (playerState.starShards < cost || ownedMap[card.id]) return;
      playRewardSound();
      const now = Date.now();
      const newRec: OwnedCardRecord = {
        cardId: card.id,
        count: 1,
        firstObtainedAt: now,
        lastObtainedAt: now,
        favorite: false,
        limitBreak: 0,
      };
      const nextOwned = { ...ownedMap, [card.id]: newRec };
      const base: PlayerState = {
        ...playerState,
        starShards: playerState.starShards - cost,
        daily: {
          ...playerState.daily,
          shardsOrBreakActions: playerState.daily.shardsOrBreakActions + 1,
        },
      };
      const nextState = applyTrophyCheck(base, nextOwned);
      setOwnedMap(nextOwned);
      setPlayerState(nextState);
      void saveOwnedRecordsBatch([newRec], nextState);
      notify(`✨ 成功兌換【${card.rarity} ${card.title}】並收錄進圖鑑！`);
    },
    [applyTrophyCheck, notify, ownedMap, playerState]
  );

  const handleLimitBreakCard = useCallback(
    (card: WikiCard, cost: number) => {
      const rec = ownedMap[card.id];
      if (!rec) return;
      const curLb = rec.limitBreak ?? 0;
      if (curLb >= MAX_LIMIT_BREAK || playerState.starShards < cost) return;
      playRewardSound();

      const updatedRec: OwnedCardRecord = { ...rec, limitBreak: curLb + 1 };
      const nextOwned = { ...ownedMap, [card.id]: updatedRec };
      const base: PlayerState = {
        ...playerState,
        starShards: playerState.starShards - cost,
        totalLimitBreaks: playerState.totalLimitBreaks + 1,
        daily: {
          ...playerState.daily,
          shardsOrBreakActions: playerState.daily.shardsOrBreakActions + 1,
        },
      };
      const nextState = applyTrophyCheck(base, nextOwned);
      setOwnedMap(nextOwned);
      setPlayerState(nextState);
      void saveOwnedRecordsBatch([updatedRec], nextState);
      notify(`⚡ 「${card.title}」突破至 +${curLb + 1}（ATK / DEF 提升！）`);
    },
    [applyTrophyCheck, notify, ownedMap, playerState]
  );

  // ==================== QUIZ HANDLER ====================
  const handleQuizAnswer = useCallback(
    (res: { correct: boolean; nextStreak: number; grantPackBonus: boolean }) => {
      if (!res.correct) return;
      const bonusPacks = res.grantPackBonus ? 2 : 0;
      const bonusShards = 10 + (res.grantPackBonus ? 25 : 0);
      if (res.grantPackBonus) playRewardSound();

      const base: PlayerState = {
        ...playerState,
        packs: playerState.packs + bonusPacks,
        starShards: playerState.starShards + bonusShards,
        quizTotalCorrect: playerState.quizTotalCorrect + 1,
        quizBestStreak: Math.max(playerState.quizBestStreak, res.nextStreak),
        daily: {
          ...playerState.daily,
          quizCorrect: playerState.daily.quizCorrect + 1,
          quizBonusClaims:
            playerState.daily.quizBonusClaims + (res.grantPackBonus ? 1 : 0),
        },
      };
      const nextState = applyTrophyCheck(base, ownedMap);
      setPlayerState(nextState);
      void savePlayerState(nextState);
      if (res.grantPackBonus) {
        notify('🎓 累計答對 3 題！獎勵 +2 免費卡包 ＋ ✦25 星之碎片！');
      }
    },
    [applyTrophyCheck, notify, ownedMap, playerState]
  );

  const handleToggleFavorite = useCallback(
    (cardId: string) => {
      const rec = ownedMap[cardId];
      if (!rec) return;
      const updated = { ...rec, favorite: !rec.favorite };
      setOwnedMap((prev) => ({ ...prev, [cardId]: updated }));
      void saveOwnedRecord(updated);
      notify(updated.favorite ? '已加入最愛收藏 ★' : '已移出最愛收藏');
    },
    [notify, ownedMap]
  );

  // Custom Pool Handlers
  const handleAddCustomCard = useCallback(
    (card: WikiCard) => {
      setCustomCards((prev) => [card, ...prev]);
      void saveCustomCard(card);
      notify(`已將「${card.title}」加入 BanG Dream! 卡池！`);
    },
    [notify]
  );

  const handleDeleteCustomCard = useCallback(
    (cardId: string) => {
      setCustomCards((prev) => prev.filter((c) => c.id !== cardId));
      void deleteCustomCard(cardId);
      notify('已從自訂卡池移除該卡牌');
    },
    [notify]
  );

  const handleImportCustomCards = useCallback(
    (cards: WikiCard[]) => {
      setCustomCards((prev) => {
        const map = new Map(prev.map((c) => [c.id, c]));
        for (const c of cards) map.set(c.id, c);
        return Array.from(map.values());
      });
      void saveMultipleCustomCards(cards);
      notify(`成功匯入 ${cards.length} 張自訂卡牌！`);
    },
    [notify]
  );

  // Backup / Restore / Clear
  const handleExportBackup = useCallback(async () => {
    try {
      const payload = await exportBackupPayload();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bangdream-wikigacha-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notify('已匯出本地備份檔案！');
    } catch {
      notify('匯出備份失敗');
    }
  }, [notify]);

  const handleImportBackup = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const payload = JSON.parse(text);
        const restored = await importBackupPayload(payload);
        setPlayerState(restored.playerState);
        setOwnedMap(restored.ownedMap);
        setCustomCards(restored.customCards);
        setPullHistory(restored.pullHistory);
        setLastPull(null);
        notify('備份還原成功！');
      } catch (err) {
        notify(err instanceof Error ? err.message : '匯入備份失敗');
      }
    },
    [notify]
  );

  const handleClearCollection = useCallback(async () => {
    const fresh = await clearCollectionOnly(true);
    setPlayerState(fresh);
    setOwnedMap({});
    setPullHistory([]);
    setLastPull(null);
    notify('已清空圖鑑收集進度');
  }, [notify]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark">★</div>
            <div className="brand-text">
              <span className="brand-title">BanG! WikiGacha</span>
              <span className="brand-sub">邦邦維基抽卡 · 12團完整版</span>
            </div>
          </div>

          <nav className="nav-tabs" aria-label="主導覽">
            <button
              className={`nav-tab ${activeTab === 'gacha' ? 'active' : ''}`}
              onClick={() => setActiveTab('gacha')}
            >
              <Sparkles size={15} />
              扭蛋
            </button>
            <button
              className={`nav-tab ${activeTab === 'dex' ? 'active' : ''}`}
              onClick={() => setActiveTab('dex')}
            >
              <BookOpen size={15} />
              圖鑑
              <span className="nav-count-badge">
                {ownedUniqueCount}/{allCards.length}
              </span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'battle' ? 'active' : ''}`}
              onClick={() => setActiveTab('battle')}
            >
              <Swords size={15} />
              對戰
            </button>
            <button
              className={`nav-tab ${activeTab === 'exchange' ? 'active' : ''}`}
              onClick={() => setActiveTab('exchange')}
            >
              <Gem size={15} />
              交換所
            </button>
            <button
              className={`nav-tab ${activeTab === 'quiz' ? 'active' : ''}`}
              onClick={() => setActiveTab('quiz')}
            >
              <Brain size={15} />
              隨堂考
            </button>
          </nav>

          <div className="topbar-actions">
            <button
              className="shard-pill"
              title="前往星光交換所"
              onClick={() => setActiveTab('exchange')}
            >
              ✦ {playerState.starShards.toLocaleString()}
            </button>
            <button
              className="icon-btn"
              style={{ position: 'relative' }}
              title="獎盃成就"
              onClick={() => setTrophiesOpen(true)}
            >
              <Trophy size={16} />
              {unclaimedTrophiesCount > 0 && (
                <span className="notif-dot">{unclaimedTrophiesCount}</span>
              )}
            </button>
            <button
              className="icon-btn"
              title={playerState.soundEnabled ? '靜音' : '開啟音效'}
              onClick={handleToggleSound}
            >
              {playerState.soundEnabled ? (
                <Volume2 size={16} />
              ) : (
                <VolumeX size={16} />
              )}
            </button>
            <button
              className="icon-btn"
              title="自訂卡池管理"
              onClick={() => setPoolModalOpen(true)}
            >
              <FolderPlus size={16} />
            </button>
            <button
              className="icon-btn"
              title="遊戲說明與機率"
              onClick={() => setGuideOpen(true)}
            >
              <HelpCircle size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="main-container">
        {!loaded ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            載入 BanG Dream! 卡池與本地存檔中…
          </div>
        ) : activeTab === 'gacha' ? (
          <GachaStage
            playerState={playerState}
            msUntilNextPack={msUntilNextPack}
            nowTs={nowTs}
            poolSize={allCards.length}
            ownedCount={ownedUniqueCount}
            lastPull={lastPull}
            ownedMap={ownedMap}
            onOpenPack={handleOpenPack}
            onClearPullView={() => setLastPull(null)}
            onToggleEffects={handleToggleEffects}
            onClaimBonusPacks={handleClaimBonusPacks}
            onClaimDailyMission={handleClaimDailyMission}
            onSelectCard={setDetailCard}
            onNotify={notify}
          />
        ) : activeTab === 'dex' ? (
          <DexView
            allCards={allCards}
            ownedMap={ownedMap}
            onSelectCard={setDetailCard}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onClearCollection={handleClearCollection}
            onOpenPoolManager={() => setPoolModalOpen(true)}
            onNotify={notify}
          />
        ) : activeTab === 'battle' ? (
          <BattleView
            allCards={allCards}
            ownedMap={ownedMap}
            playerState={playerState}
            onComplete5v5={handleComplete5v5}
            onDamageDailyBoss={handleDamageDailyBoss}
            onClaimBossReward={handleClaimBossReward}
            onSelectCard={setDetailCard}
            onNotify={notify}
          />
        ) : activeTab === 'exchange' ? (
          <ExchangeView
            allCards={allCards}
            ownedMap={ownedMap}
            starShards={playerState.starShards}
            onDismantleSingle={handleDismantleSingle}
            onDismantleAllSurplus={handleDismantleAllSurplus}
            onExchangeCard={handleExchangeCard}
            onLimitBreakCard={handleLimitBreakCard}
            onSelectCard={setDetailCard}
          />
        ) : (
          <QuizView
            allCards={allCards}
            playerState={playerState}
            onQuizAnswer={handleQuizAnswer}
          />
        )}
      </main>

      <footer className="footer">
        BanG Dream! WikiGacha（非官方同人自製專案） · 12 團完整收錄 · 資料儲存於本地 IndexedDB
      </footer>

      {pendingRitual && (
        <PackOpeningOverlay
          highestRarity={pendingRitual.highestRarity}
          packType={pendingRitual.packType}
          onFinish={handleFinishRitual}
        />
      )}

      <CardDetailModal
        card={detailCard}
        owned={detailCard ? ownedMap[detailCard.id] : undefined}
        onClose={() => setDetailCard(null)}
        onToggleFavorite={handleToggleFavorite}
      />

      <PoolManagerModal
        open={poolModalOpen}
        customCards={customCards}
        defaultPoolCount={DEFAULT_BANGDREAM_CARDS.length}
        onClose={() => setPoolModalOpen(false)}
        onAddCustomCard={handleAddCustomCard}
        onDeleteCustomCard={handleDeleteCustomCard}
        onImportCustomCards={handleImportCustomCards}
        onNotify={notify}
      />

      <TrophiesModal
        open={trophiesOpen}
        playerState={playerState}
        onClose={() => setTrophiesOpen(false)}
        onClaimTrophy={handleClaimTrophy}
      />

      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

export default App;
