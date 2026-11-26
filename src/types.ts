export type Rarity = 'C' | 'UC' | 'R' | 'SR' | 'SSR' | 'UR' | 'LR';

export type CardCategory =
  | '角色'
  | '樂團'
  | '樂曲'
  | '場所・學園'
  | '名場面與梗';

export type BandId =
  | 'popipa'
  | 'afterglow'
  | 'pasupare'
  | 'roselia'
  | 'hhw'
  | 'morfonica'
  | 'ras'
  | 'mygo'
  | 'avemujica'
  | 'yumemita'
  | 'millsage'
  | 'ikka'
  | 'general';

export interface WikiCard {
  id: string;
  pageId: number;
  title: string;
  subtitle: string;
  rarity: Rarity;
  qScore: number;
  category: CardCategory;
  band: BandId;
  role?: string;
  atk: number;
  def: number;
  summary: string;
  flavorText?: string;
  wikiUrl: string;
  imageUrl?: string;
  imageFit?: 'portrait' | 'album' | 'cover';
  tags: string[];
  isCustom?: boolean;
}

export interface OwnedCardRecord {
  cardId: string;
  count: number;
  firstObtainedAt: number;
  lastObtainedAt: number;
  favorite: boolean;
  limitBreak?: number; // 0..5 (+8% ATK & DEF per level)
}

export interface DailyProgress {
  dateKey: string; // YYYY-MM-DD
  packsOpened: number;
  srPlusPulled: number;
  battlesPlayed: number;
  quizCorrect: number;
  shardsOrBreakActions: number;
  claimedMissionIds: string[];
  quizBonusClaims: number; // max 5 bonus claims per day
}

export interface DailyBossState {
  dateKey: string;
  bossId: string;
  maxHp: number;
  currentHp: number;
  attempts: number;
  defeated: boolean;
  rewardClaimed: boolean;
}

export type PackType = 'normal' | 'gold' | 'rainbow';

export interface PullResultItem {
  card: WikiCard;
  isNew: boolean;
  totalCount: number;
}

export interface PullRecord {
  id: string;
  timestamp: number;
  packType: PackType;
  cardIds: string[];
  highestRarity: Rarity;
}

export interface PlayerState {
  packs: number;
  maxPacks: number;
  lastRegenAt: number;
  totalPacksOpened: number;
  pityGoldCounter: number; // 0..9 -> 10th pack is Gold
  pityRainbowCounter: number; // 0..49 -> 50th pack is Rainbow
  effectsEnabled: boolean;
  soundEnabled: boolean;
  welcomeRainbowPending: boolean;
  lastBonusClaimAt: number;
  starShards: number;
  battleWins: number;
  bossDefeats: number;
  quizTotalCorrect: number;
  quizBestStreak: number;
  totalDismantled: number;
  totalLimitBreaks: number;
  specialFlags: string[];
  unlockedTrophies: string[];
  claimedTrophies: string[];
  daily: DailyProgress;
  dailyBoss: DailyBossState | null;
}

export interface ThemeSet {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  accentColor: string;
  cardIds: string[];
}

export interface BackupPayload {
  version: number;
  exportedAt: number;
  app: 'bangdream-wikigacha';
  playerState: PlayerState;
  ownedCards: OwnedCardRecord[];
  customCards: WikiCard[];
  pullHistory: PullRecord[];
}

export const RARITY_ORDER: Rarity[] = ['C', 'UC', 'R', 'SR', 'SSR', 'UR', 'LR'];

export const RARITY_META: Record<
  Rarity,
  {
    label: string;
    zhName: string;
    color: string;
    glow: string;
    bgTint: string;
    borderColor: string;
    weight: number;
    rank: number;
    minQ: string;
  }
> = {
  C: {
    label: 'C',
    zhName: '普通',
    color: '#c29368',
    glow: 'rgba(194, 147, 104, 0.35)',
    bgTint: 'rgba(194, 147, 104, 0.12)',
    borderColor: '#8f6745',
    weight: 28,
    rank: 0,
    minQ: '< 20',
  },
  UC: {
    label: 'UC',
    zhName: '不常見',
    color: '#93c5fd',
    glow: 'rgba(147, 197, 253, 0.38)',
    bgTint: 'rgba(147, 197, 253, 0.12)',
    borderColor: '#5b8cc4',
    weight: 27,
    rank: 1,
    minQ: '20+',
  },
  R: {
    label: 'R',
    zhName: '稀有',
    color: '#34d399',
    glow: 'rgba(52, 211, 153, 0.42)',
    bgTint: 'rgba(52, 211, 153, 0.13)',
    borderColor: '#10b981',
    weight: 26,
    rank: 2,
    minQ: '35+',
  },
  SR: {
    label: 'SR',
    zhName: '超級稀有',
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.55)',
    bgTint: 'rgba(56, 189, 248, 0.16)',
    borderColor: '#0ea5e9',
    weight: 14.5,
    rank: 3,
    minQ: '60+',
  },
  SSR: {
    label: 'SSR',
    zhName: '超級特別稀有',
    color: '#fb7185',
    glow: 'rgba(251, 113, 133, 0.65)',
    bgTint: 'rgba(251, 113, 133, 0.18)',
    borderColor: '#f43f5e',
    weight: 3.5,
    rank: 4,
    minQ: '80+',
  },
  UR: {
    label: 'UR',
    zhName: '超稀有',
    color: '#facc15',
    glow: 'rgba(250, 204, 21, 0.72)',
    bgTint: 'rgba(250, 204, 21, 0.2)',
    borderColor: '#eab308',
    weight: 0.8,
    rank: 5,
    minQ: '90+',
  },
  LR: {
    label: 'LR',
    zhName: '傳奇稀有',
    color: '#e879f9',
    glow: 'rgba(232, 121, 249, 0.82)',
    bgTint: 'rgba(192, 132, 252, 0.24)',
    borderColor: '#d946ef',
    weight: 0.2,
    rank: 6,
    minQ: '96+',
  },
};
