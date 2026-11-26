import { BAND_META } from '../data/bands';
import { getTodayKey } from '../db/storage';
import {
  RARITY_META,
  type BandId,
  type DailyBossState,
  type OwnedCardRecord,
  type PlayerState,
  type Rarity,
  type WikiCard,
} from '../types';

// ==================== LIMIT BREAK & SHARD ECONOMICS ====================
export const MAX_LIMIT_BREAK = 5;
export const LIMIT_BREAK_BONUS_PER_LEVEL = 0.08; // +8% ATK & DEF per level (max +40%)

export const DISMANTLE_SHARDS: Record<Rarity, number> = {
  C: 5,
  UC: 10,
  R: 20,
  SR: 45,
  SSR: 120,
  UR: 300,
  LR: 600,
};

export const EXCHANGE_COST_SHARDS: Record<Rarity, number> = {
  C: 25,
  UC: 45,
  R: 85,
  SR: 180,
  SSR: 420,
  UR: 900,
  LR: 1600,
};

export function getLimitBreakCost(rarity: Rarity, currentLevel: number): number {
  const base: Record<Rarity, number> = {
    C: 15,
    UC: 25,
    R: 40,
    SR: 75,
    SSR: 140,
    UR: 240,
    LR: 360,
  };
  return Math.round(base[rarity] * (1 + currentLevel * 0.5));
}

export function getEffectiveStats(
  card: WikiCard,
  owned?: OwnedCardRecord
): { atk: number; def: number; lb: number } {
  const lb = Math.min(MAX_LIMIT_BREAK, owned?.limitBreak ?? 0);
  const mult = 1 + lb * LIMIT_BREAK_BONUS_PER_LEVEL;
  return {
    atk: Math.round(card.atk * mult),
    def: Math.round(card.def * mult),
    lb,
  };
}

// ==================== BAND SYNERGY FOR 5V5 BATTLE ====================
export interface TeamSynergyResult {
  atkBonusPct: number;
  defBonusPct: number;
  badges: string[];
  dominantBand: BandId | null;
}

export function evaluateTeamSynergy(team: WikiCard[]): TeamSynergyResult {
  if (team.length === 0) {
    return { atkBonusPct: 0, defBonusPct: 0, badges: [], dominantBand: null };
  }

  let atkBonusPct = 0;
  let defBonusPct = 0;
  const badges: string[] = [];

  // Count non-general bands
  const bandCounts: Partial<Record<BandId, number>> = {};
  for (const c of team) {
    if (c.band !== 'general') {
      bandCounts[c.band] = (bandCounts[c.band] ?? 0) + 1;
    }
  }

  let topBand: BandId | null = null;
  let topCount = 0;
  for (const [b, cnt] of Object.entries(bandCounts) as [BandId, number][]) {
    if (cnt > topCount) {
      topBand = b;
      topCount = cnt;
    }
  }

  if (topBand && topCount >= 5) {
    atkBonusPct += 25;
    defBonusPct += 20;
    badges.push(`${BAND_META[topBand].shortName} 全團一心（ATK+25% / DEF+20%）`);
  } else if (topBand && topCount >= 3) {
    atkBonusPct += 14;
    defBonusPct += 10;
    badges.push(`${BAND_META[topBand].shortName} 樂團共鳴（ATK+14% / DEF+10%）`);
  } else if (topBand && topCount >= 2) {
    atkBonusPct += 6;
    defBonusPct += 5;
    badges.push(`${BAND_META[topBand].shortName} 雙人默契（ATK+6% / DEF+5%）`);
  }

  const hasSong = team.some((c) => c.category === '樂曲');
  const hasChar = team.some((c) => c.category === '角色');
  if (hasSong && hasChar) {
    atkBonusPct += 8;
    badges.push('現場演出編制：角色＋樂曲（ATK+8%）');
  }

  const hasVenue = team.some((c) => c.category === '場所・學園');
  if (hasVenue) {
    defBonusPct += 10;
    badges.push('主場 Live House 應援（DEF+10%）');
  }

  const hasMeme = team.some((c) => c.category === '名場面與梗');
  if (hasMeme) {
    atkBonusPct += 5;
    defBonusPct += 5;
    badges.push('邦學名場面氣場（全數值+5%）');
  }

  return { atkBonusPct, defBonusPct, badges, dominantBand: topBand };
}

// ==================== DAILY LEGEND BOSS ====================
export interface BossTemplate {
  id: string;
  name: string;
  title: string;
  cardId: string;
  band: BandId;
  maxHp: number;
  atk: number;
  quote: string;
  rewardPacks: number;
  rewardShards: number;
}

export const DAILY_BOSSES: BossTemplate[] = [
  {
    id: 'boss-haruhikage',
    name: '為什麼要演奏春日影！？',
    title: '邦學歷史級重力試煉',
    cardId: 'bd-lr-003',
    band: 'mygo',
    maxHp: 95000,
    atk: 11200,
    quote: '「那不是只屬於我們五個人的歌嗎……接受這份沉重的質問吧！」',
    rewardPacks: 4,
    rewardShards: 180,
  },
  {
    id: 'boss-roselia',
    name: 'Roselia 蒼藍頂點試煉',
    title: '通往音樂頂點的覺悟之戰',
    cardId: 'bd-ur-002',
    band: 'roselia',
    maxHp: 92000,
    atk: 10800,
    quote: '「你們，有將一切奉獻給舞台的覺悟嗎？」',
    rewardPacks: 4,
    rewardShards: 160,
  },
  {
    id: 'boss-avemujica',
    name: 'Ave Mujica 假面狂想曲',
    title: '五位人偶的華麗金屬饗宴',
    cardId: 'bd-ur-004',
    band: 'avemujica',
    maxHp: 96000,
    atk: 11400,
    quote: '「忘卻恐懼與悲傷，在假面舞會中撐過這場終曲吧。」',
    rewardPacks: 4,
    rewardShards: 180,
  },
  {
    id: 'boss-yumemita',
    name: 'BanG Dream! ゆめ∞みた',
    title: '跨越虛擬與現實的生存最終舞台',
    cardId: 'bd-ym-lr-001',
    band: 'yumemita',
    maxHp: 94000,
    atk: 11000,
    quote: '「音が止んでも、あらがえ——就算音樂停止，也要奮力抗爭！」',
    rewardPacks: 4,
    rewardShards: 170,
  },
  {
    id: 'boss-crychic',
    name: 'CRYCHIC 永恆白月光',
    title: '僅此一次的命運合奏',
    cardId: 'bd-ur-010',
    band: 'mygo',
    maxHp: 90000,
    atk: 10500,
    quote: '「如果時間能永遠停留在那場演出，你願意挑戰嗎？」',
    rewardPacks: 4,
    rewardShards: 160,
  },
];

export function getTodayBossTemplate(now = Date.now()): BossTemplate {
  const key = getTodayKey(now);
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return DAILY_BOSSES[hash % DAILY_BOSSES.length];
}

export function getOrInitDailyBoss(
  state: PlayerState,
  now = Date.now()
): { boss: BossTemplate; bossState: DailyBossState } {
  const key = getTodayKey(now);
  const boss = getTodayBossTemplate(now);
  if (state.dailyBoss && state.dailyBoss.dateKey === key && state.dailyBoss.bossId === boss.id) {
    return { boss, bossState: state.dailyBoss };
  }
  return {
    boss,
    bossState: {
      dateKey: key,
      bossId: boss.id,
      maxHp: boss.maxHp,
      currentHp: boss.maxHp,
      attempts: 0,
      defeated: false,
      rewardClaimed: false,
    },
  };
}

// ==================== DAILY MISSIONS ====================
export interface DailyMissionDef {
  id: string;
  title: string;
  description: string;
  target: number;
  getCurrent: (state: PlayerState) => number;
  rewardPacks: number;
  rewardShards: number;
}

export const DAILY_MISSIONS: DailyMissionDef[] = [
  {
    id: 'daily-pull-3',
    title: '開啟 3 次卡包',
    description: '在扭蛋頁面開啟任意 3 包 BanG Dream! 卡包',
    target: 3,
    getCurrent: (s) => s.daily.packsOpened,
    rewardPacks: 2,
    rewardShards: 30,
  },
  {
    id: 'daily-sr-plus',
    title: '抽到 1 張 SR 以上卡牌',
    description: '今日內開出至少 1 張 SR / SSR / UR / LR 卡牌',
    target: 1,
    getCurrent: (s) => s.daily.srPlusPulled,
    rewardPacks: 2,
    rewardShards: 40,
  },
  {
    id: 'daily-battle-1',
    title: '參加 1 場 Live 對戰',
    description: '完成 1 場 5v5 樂團對邦戰或每日首領挑戰',
    target: 1,
    getCurrent: (s) => s.daily.battlesPlayed,
    rewardPacks: 2,
    rewardShards: 50,
  },
  {
    id: 'daily-quiz-3',
    title: '邦學隨堂考答對 3 題',
    description: '前往隨堂考分頁累計答對 3 道題目',
    target: 3,
    getCurrent: (s) => s.daily.quizCorrect,
    rewardPacks: 2,
    rewardShards: 40,
  },
  {
    id: 'daily-exchange-1',
    title: '強化或分解 1 次卡牌',
    description: '在星光交換所進行一次重複卡分解、換卡或限界突破',
    target: 1,
    getCurrent: (s) => s.daily.shardsOrBreakActions,
    rewardPacks: 1,
    rewardShards: 45,
  },
];

// ==================== TROPHIES & HIDDEN EASTER EGGS ====================
export interface TrophyDef {
  id: string;
  title: string;
  description: string;
  hidden?: boolean;
  rewardPacks: number;
  rewardShards: number;
  check: (
    state: PlayerState,
    ownedMap: Record<string, OwnedCardRecord>,
    allCards: WikiCard[]
  ) => boolean;
}

export const TROPHIES: TrophyDef[] = [
  {
    id: 'tr-first-pull',
    title: '星之鼓動的起點',
    description: '開啟你的第 1 包 BanG Dream! 卡包',
    rewardPacks: 1,
    rewardShards: 20,
    check: (s) => s.totalPacksOpened >= 1,
  },
  {
    id: 'tr-pull-10',
    title: '常駐 Live House 觀眾',
    description: '累計開啟 10 包卡包',
    rewardPacks: 2,
    rewardShards: 50,
    check: (s) => s.totalPacksOpened >= 10,
  },
  {
    id: 'tr-pull-50',
    title: '武道館滿席狂熱粉',
    description: '累計開啟 50 包卡包',
    rewardPacks: 5,
    rewardShards: 150,
    check: (s) => s.totalPacksOpened >= 50,
  },
  {
    id: 'tr-dex-25',
    title: '邦邦見習收集家',
    description: '圖鑑收錄達 25 張不同卡牌',
    rewardPacks: 2,
    rewardShards: 40,
    check: (_s, owned) => Object.keys(owned).length >= 25,
  },
  {
    id: 'tr-dex-75',
    title: '跨世代邦學研究員',
    description: '圖鑑收錄達 75 張不同卡牌',
    rewardPacks: 3,
    rewardShards: 120,
    check: (_s, owned) => Object.keys(owned).length >= 75,
  },
  {
    id: 'tr-dex-140',
    title: '邦邦百科全書大師',
    description: '圖鑑收錄達 140 張不同卡牌',
    rewardPacks: 6,
    rewardShards: 300,
    check: (_s, owned) => Object.keys(owned).length >= 140,
  },
  {
    id: 'tr-first-ssr',
    title: '五星閃耀時刻',
    description: '獲得第 1 張 SSR 卡牌',
    rewardPacks: 1,
    rewardShards: 50,
    check: (_s, owned, cards) =>
      cards.some((c) => c.rarity === 'SSR' && Boolean(owned[c.id])),
  },
  {
    id: 'tr-first-ur',
    title: '超越常理的光芒',
    description: '獲得第 1 張 UR 卡牌',
    rewardPacks: 2,
    rewardShards: 100,
    check: (_s, owned, cards) =>
      cards.some((c) => c.rarity === 'UR' && Boolean(owned[c.id])),
  },
  {
    id: 'tr-first-lr',
    title: '傳奇降臨！',
    description: '獲得第 1 張 LR 傳奇稀有卡牌',
    rewardPacks: 3,
    rewardShards: 200,
    check: (_s, owned, cards) =>
      cards.some((c) => c.rarity === 'LR' && Boolean(owned[c.id])),
  },
  {
    id: 'tr-five-star-5',
    title: '★5 覺醒殿堂',
    description: '收集 5 張以上的（★5）SSR 角色覺醒卡',
    rewardPacks: 3,
    rewardShards: 150,
    check: (_s, owned, cards) =>
      cards.filter((c) => c.id.endsWith('-ssr') && Boolean(owned[c.id])).length >= 5,
  },
  {
    id: 'tr-first-battle-win',
    title: '初登對邦舞台',
    description: '在 5v5 Live 對邦戰獲得首場勝利',
    rewardPacks: 2,
    rewardShards: 60,
    check: (s) => s.battleWins >= 1,
  },
  {
    id: 'tr-battle-10',
    title: '不敗的 Live 女王',
    description: '累計在 5v5 Live 對邦戰獲勝 10 場',
    rewardPacks: 4,
    rewardShards: 180,
    check: (s) => s.battleWins >= 10,
  },
  {
    id: 'tr-boss-kill',
    title: '傳說討伐者',
    description: '成功擊敗 1 次每日傳說首領',
    rewardPacks: 3,
    rewardShards: 150,
    check: (s) => s.bossDefeats >= 1,
  },
  {
    id: 'tr-dismantle',
    title: '星光煉金術師',
    description: '累計分解 10 張以上多餘重複卡',
    rewardPacks: 2,
    rewardShards: 80,
    check: (s) => s.totalDismantled >= 10,
  },
  {
    id: 'tr-limit-break',
    title: '突破極限的音色',
    description: '進行至少 1 次卡牌限界突破',
    rewardPacks: 2,
    rewardShards: 70,
    check: (s) => s.totalLimitBreaks >= 1,
  },
  {
    id: 'tr-quiz-streak-5',
    title: '行走的邦學字典',
    description: '在邦學隨堂考達成 5 題連續答對',
    rewardPacks: 3,
    rewardShards: 100,
    check: (s) => s.quizBestStreak >= 5,
  },
  {
    id: 'tr-all-12-bands',
    title: '十二大樂團全制霸',
    description: '收集全部 12 支樂團的團卡',
    rewardPacks: 5,
    rewardShards: 220,
    check: (_s, owned) =>
      [
        'bd-ur-001',
        'bd-ssr-001',
        'bd-ssr-002',
        'bd-ur-002',
        'bd-ssr-003',
        'bd-ssr-004',
        'bd-ssr-005',
        'bd-ur-003',
        'bd-ur-004',
        'bd-ym-ur-001',
        'bd-ms-ur-001',
        'bd-ik-ur-001',
      ].every((id) => Boolean(owned[id])),
  },
  // ---- Hidden Easter Egg Trophies ----
  {
    id: 'tr-secret-tomosaki',
    title: '命運的交叉點',
    description: '同時收錄「高松燈」與「豐川祥子」',
    hidden: true,
    rewardPacks: 2,
    rewardShards: 100,
    check: (_s, owned) =>
      (Boolean(owned['bd-ur-007']) || Boolean(owned['bd-ur-007-ssr'])) &&
      Boolean(owned['bd-ur-008']),
  },
  {
    id: 'tr-secret-haruhikage',
    title: '為什麼要演奏春日影！？',
    description: '同時收錄「CRYCHIC」、「春日影 (CRYCHIC ver.)」與「長崎爽世」',
    hidden: true,
    rewardPacks: 3,
    rewardShards: 150,
    check: (_s, owned) =>
      Boolean(owned['bd-ur-010']) &&
      Boolean(owned['bd-lr-002']) &&
      (Boolean(owned['bd-ssr-007']) || Boolean(owned['bd-ssr-007-ssr'])),
  },
  {
    id: 'tr-secret-yumemita',
    title: '跨越虛擬與現實的 ∞',
    description: '集齊夢限大MewType 五位團員',
    hidden: true,
    rewardPacks: 3,
    rewardShards: 120,
    check: (_s, owned) =>
      [
        'bd-ym-ur-002',
        'bd-ym-ssr-001',
        'bd-ym-ssr-002',
        'bd-ym-ssr-003',
        'bd-ym-ssr-004',
      ].every((id) => Boolean(owned[id])),
  },
  {
    id: 'tr-secret-our-notes',
    title: 'Our Notes 新星崛起',
    description: '同時收錄「汐見螢」、「須賀蕾葉」與「馬橋心玖」',
    hidden: true,
    rewardPacks: 3,
    rewardShards: 120,
    check: (_s, owned) =>
      Boolean(owned['bd-ms-ur-002']) &&
      Boolean(owned['bd-ik-ur-002']) &&
      Boolean(owned['bd-ik-ssr-001']),
  },
  {
    id: 'tr-secret-double-ssr',
    title: '雙黃蛋奇蹟！',
    description: '在單一卡包內同時開出 2 張以上的 SSR+ 卡牌',
    hidden: true,
    rewardPacks: 2,
    rewardShards: 120,
    check: (s) => s.specialFlags.includes('double_ssr'),
  },
  {
    id: 'tr-secret-straight',
    title: '星光大順子',
    description: '在單一卡包內開出 5 種完全不同的稀有度',
    hidden: true,
    rewardPacks: 2,
    rewardShards: 120,
    check: (s) => s.specialFlags.includes('rainbow_hand'),
  },
  {
    id: 'tr-secret-full-synergy',
    title: '全團一心 LIVE 勝利',
    description: '使用 5 張同樂團卡牌組隊並在 5v5 對邦戰獲勝',
    hidden: true,
    rewardPacks: 3,
    rewardShards: 150,
    check: (s) => s.specialFlags.includes('full_synergy_win'),
  },
];

export function evaluateUnlockedTrophies(
  state: PlayerState,
  ownedMap: Record<string, OwnedCardRecord>,
  allCards: WikiCard[]
): { nextUnlocked: string[]; newlyUnlocked: TrophyDef[] } {
  const existing = new Set(state.unlockedTrophies);
  const newlyUnlocked: TrophyDef[] = [];
  for (const t of TROPHIES) {
    if (!existing.has(t.id) && t.check(state, ownedMap, allCards)) {
      existing.add(t.id);
      newlyUnlocked.push(t);
    }
  }
  return {
    nextUnlocked: Array.from(existing),
    newlyUnlocked,
  };
}

export function getRarityRank(r: Rarity): number {
  return RARITY_META[r].rank;
}
