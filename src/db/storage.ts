import type {
  BackupPayload,
  OwnedCardRecord,
  PlayerState,
  PullRecord,
  WikiCard,
} from '../types';

const DB_NAME = 'bangdream-wikigacha-db';
const DB_VERSION = 1;

const STORE_META = 'meta';
const STORE_OWNED = 'owned';
const STORE_CUSTOM = 'customCards';
const STORE_HISTORY = 'history';

export const getTodayKey = (now = Date.now()): string => {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const createEmptyDaily = (now = Date.now()) => ({
  dateKey: getTodayKey(now),
  packsOpened: 0,
  srPlusPulled: 0,
  battlesPlayed: 0,
  quizCorrect: 0,
  shardsOrBreakActions: 0,
  claimedMissionIds: [] as string[],
  quizBonusClaims: 0,
});

export const createInitialPlayerState = (now = Date.now()): PlayerState => ({
  packs: 10,
  maxPacks: 10,
  lastRegenAt: now,
  totalPacksOpened: 0,
  pityGoldCounter: 0,
  pityRainbowCounter: 0,
  effectsEnabled: true,
  soundEnabled: true,
  welcomeRainbowPending: true,
  lastBonusClaimAt: 0,
  starShards: 0,
  battleWins: 0,
  bossDefeats: 0,
  quizTotalCorrect: 0,
  quizBestStreak: 0,
  totalDismantled: 0,
  totalLimitBreaks: 0,
  specialFlags: [],
  unlockedTrophies: [],
  claimedTrophies: [],
  daily: createEmptyDaily(now),
  dailyBoss: null,
});

export function normalizePlayerState(
  raw: Partial<PlayerState> | undefined,
  now = Date.now()
): PlayerState {
  const base = createInitialPlayerState(now);
  const merged: PlayerState = {
    ...base,
    ...(raw ?? {}),
    specialFlags: Array.isArray(raw?.specialFlags) ? raw.specialFlags : [],
    unlockedTrophies: Array.isArray(raw?.unlockedTrophies)
      ? raw.unlockedTrophies
      : [],
    claimedTrophies: Array.isArray(raw?.claimedTrophies)
      ? raw.claimedTrophies
      : [],
  };

  const today = getTodayKey(now);
  if (!raw?.daily || raw.daily.dateKey !== today) {
    merged.daily = createEmptyDaily(now);
  } else {
    merged.daily = {
      ...createEmptyDaily(now),
      ...raw.daily,
      claimedMissionIds: Array.isArray(raw.daily.claimedMissionIds)
        ? raw.daily.claimedMissionIds
        : [],
    };
  }

  if (merged.dailyBoss && merged.dailyBoss.dateKey !== today) {
    merged.dailyBoss = null;
  }

  return merged;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
      if (!db.objectStoreNames.contains(STORE_OWNED)) {
        db.createObjectStore(STORE_OWNED, { keyPath: 'cardId' });
      }
      if (!db.objectStoreNames.contains(STORE_CUSTOM)) {
        db.createObjectStore(STORE_CUSTOM, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        db.createObjectStore(STORE_HISTORY, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export interface LoadedDatabase {
  playerState: PlayerState;
  ownedMap: Record<string, OwnedCardRecord>;
  customCards: WikiCard[];
  pullHistory: PullRecord[];
}

export async function loadAllData(): Promise<LoadedDatabase> {
  const db = await openDatabase();
  const tx = db.transaction(
    [STORE_META, STORE_OWNED, STORE_CUSTOM, STORE_HISTORY],
    'readonly'
  );

  const [savedState, ownedList, customCards, historyList] = await Promise.all([
    reqToPromise<PlayerState | undefined>(
      tx.objectStore(STORE_META).get('playerState')
    ),
    reqToPromise<OwnedCardRecord[]>(tx.objectStore(STORE_OWNED).getAll()),
    reqToPromise<WikiCard[]>(tx.objectStore(STORE_CUSTOM).getAll()),
    reqToPromise<PullRecord[]>(tx.objectStore(STORE_HISTORY).getAll()),
  ]);

  const playerState: PlayerState = normalizePlayerState(savedState);

  const ownedMap: Record<string, OwnedCardRecord> = {};
  for (const item of ownedList) {
    ownedMap[item.cardId] = item;
  }

  const pullHistory = historyList
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 80);

  db.close();
  return { playerState, ownedMap, customCards, pullHistory };
}

export async function savePlayerState(state: PlayerState): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction([STORE_META], 'readwrite');
  tx.objectStore(STORE_META).put(state, 'playerState');
  await txDone(tx);
  db.close();
}

export async function commitPackPull(
  nextState: PlayerState,
  updatedOwned: OwnedCardRecord[],
  record: PullRecord
): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(
    [STORE_META, STORE_OWNED, STORE_HISTORY],
    'readwrite'
  );
  tx.objectStore(STORE_META).put(nextState, 'playerState');
  const ownedStore = tx.objectStore(STORE_OWNED);
  for (const item of updatedOwned) {
    ownedStore.put(item);
  }
  tx.objectStore(STORE_HISTORY).put(record);
  await txDone(tx);
  db.close();
}

export async function saveOwnedRecordsBatch(
  records: OwnedCardRecord[],
  nextState?: PlayerState
): Promise<void> {
  const db = await openDatabase();
  const stores = nextState ? [STORE_OWNED, STORE_META] : [STORE_OWNED];
  const tx = db.transaction(stores, 'readwrite');
  const ownedStore = tx.objectStore(STORE_OWNED);
  for (const r of records) {
    ownedStore.put(r);
  }
  if (nextState) {
    tx.objectStore(STORE_META).put(nextState, 'playerState');
  }
  await txDone(tx);
  db.close();
}

export async function saveOwnedRecord(record: OwnedCardRecord): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction([STORE_OWNED], 'readwrite');
  tx.objectStore(STORE_OWNED).put(record);
  await txDone(tx);
  db.close();
}

export async function saveCustomCard(card: WikiCard): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction([STORE_CUSTOM], 'readwrite');
  tx.objectStore(STORE_CUSTOM).put({ ...card, isCustom: true });
  await txDone(tx);
  db.close();
}

export async function deleteCustomCard(cardId: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction([STORE_CUSTOM], 'readwrite');
  tx.objectStore(STORE_CUSTOM).delete(cardId);
  await txDone(tx);
  db.close();
}

export async function saveMultipleCustomCards(cards: WikiCard[]): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction([STORE_CUSTOM], 'readwrite');
  const store = tx.objectStore(STORE_CUSTOM);
  for (const c of cards) {
    store.put({ ...c, isCustom: true });
  }
  await txDone(tx);
  db.close();
}

export async function clearCustomCards(): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction([STORE_CUSTOM], 'readwrite');
  tx.objectStore(STORE_CUSTOM).clear();
  await txDone(tx);
  db.close();
}

export async function clearCollectionOnly(
  keepCustom = true
): Promise<PlayerState> {
  const freshState = createInitialPlayerState();
  const db = await openDatabase();
  const stores = keepCustom
    ? [STORE_META, STORE_OWNED, STORE_HISTORY]
    : [STORE_META, STORE_OWNED, STORE_HISTORY, STORE_CUSTOM];
  const tx = db.transaction(stores, 'readwrite');
  tx.objectStore(STORE_META).put(freshState, 'playerState');
  tx.objectStore(STORE_OWNED).clear();
  tx.objectStore(STORE_HISTORY).clear();
  if (!keepCustom) {
    tx.objectStore(STORE_CUSTOM).clear();
  }
  await txDone(tx);
  db.close();
  return freshState;
}

export async function exportBackupPayload(): Promise<BackupPayload> {
  const data = await loadAllData();
  return {
    version: 1,
    exportedAt: Date.now(),
    app: 'bangdream-wikigacha',
    playerState: data.playerState,
    ownedCards: Object.values(data.ownedMap),
    customCards: data.customCards,
    pullHistory: data.pullHistory,
  };
}

export async function importBackupPayload(
  payload: BackupPayload
): Promise<LoadedDatabase> {
  if (!payload || payload.app !== 'bangdream-wikigacha') {
    throw new Error('無效的備份檔案格式（非 BanG Dream! WikiGacha 備份檔）');
  }
  const db = await openDatabase();
  const tx = db.transaction(
    [STORE_META, STORE_OWNED, STORE_CUSTOM, STORE_HISTORY],
    'readwrite'
  );
  tx.objectStore(STORE_META).put(
    normalizePlayerState(payload.playerState),
    'playerState'
  );

  const ownedStore = tx.objectStore(STORE_OWNED);
  ownedStore.clear();
  for (const rec of payload.ownedCards || []) {
    if (rec && rec.cardId) ownedStore.put(rec);
  }

  const customStore = tx.objectStore(STORE_CUSTOM);
  customStore.clear();
  for (const card of payload.customCards || []) {
    if (card && card.id) customStore.put({ ...card, isCustom: true });
  }

  const historyStore = tx.objectStore(STORE_HISTORY);
  historyStore.clear();
  for (const h of payload.pullHistory || []) {
    if (h && h.id) historyStore.put(h);
  }

  await txDone(tx);
  db.close();
  return loadAllData();
}
