import {
  RARITY_META,
  RARITY_ORDER,
  type PackType,
  type PlayerState,
  type PullResultItem,
  type Rarity,
  type WikiCard,
} from '../types';

export const PACK_REGEN_MS = 60_000; // 1 pack every 1 minute
export const CARDS_PER_PACK = 5;
export const GOLD_PITY_INTERVAL = 10;
export const RAINBOW_PITY_INTERVAL = 50;
export const BONUS_COOLDOWN_MS = 3 * 60_000; // 3 minutes for free cheer bonus (+3 packs)

export function computeRegeneratedState(
  state: PlayerState,
  now = Date.now()
): { state: PlayerState; changed: boolean; msUntilNext: number } {
  if (state.packs >= state.maxPacks) {
    return {
      state: { ...state, lastRegenAt: now },
      changed: false,
      msUntilNext: 0,
    };
  }

  const elapsed = Math.max(0, now - state.lastRegenAt);
  const gained = Math.floor(elapsed / PACK_REGEN_MS);

  if (gained > 0) {
    const nextPacks = Math.min(state.maxPacks, state.packs + gained);
    const nextLastRegenAt =
      nextPacks >= state.maxPacks
        ? now
        : state.lastRegenAt + gained * PACK_REGEN_MS;
    const msUntilNext =
      nextPacks >= state.maxPacks
        ? 0
        : Math.max(0, PACK_REGEN_MS - (now - nextLastRegenAt));

    return {
      state: {
        ...state,
        packs: nextPacks,
        lastRegenAt: nextLastRegenAt,
      },
      changed: true,
      msUntilNext,
    };
  }

  return {
    state,
    changed: false,
    msUntilNext: Math.max(0, PACK_REGEN_MS - elapsed),
  };
}

export function getNextPackType(state: PlayerState): PackType {
  if (state.welcomeRainbowPending) return 'rainbow';
  if (state.pityRainbowCounter + 1 >= RAINBOW_PITY_INTERVAL) return 'rainbow';
  if (state.pityGoldCounter + 1 >= GOLD_PITY_INTERVAL) return 'gold';
  return 'normal';
}

export function getPityRemaining(state: PlayerState): {
  toGold: number;
  toRainbow: number;
} {
  return {
    toGold: Math.max(0, GOLD_PITY_INTERVAL - state.pityGoldCounter),
    toRainbow: Math.max(0, RAINBOW_PITY_INTERVAL - state.pityRainbowCounter),
  };
}

function pickWeightedRarity(weights: Partial<Record<Rarity, number>>): Rarity {
  const entries = (Object.entries(weights) as [Rarity, number][]).filter(
    ([, w]) => w > 0
  );
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [rarity, weight] of entries) {
    r -= weight;
    if (r <= 0) return rarity;
  }
  return entries[entries.length - 1][0];
}

function pickCardOfRarity(
  pool: WikiCard[],
  targetRarity: Rarity,
  excludeIds: Set<string>
): WikiCard {
  const byRarity = pool.filter(
    (c) => c.rarity === targetRarity && !excludeIds.has(c.id)
  );
  if (byRarity.length > 0) {
    return byRarity[Math.floor(Math.random() * byRarity.length)];
  }
  const anyRarity = pool.filter((c) => c.rarity === targetRarity);
  if (anyRarity.length > 0) {
    return anyRarity[Math.floor(Math.random() * anyRarity.length)];
  }
  // Fallback if user removed all cards of a specific rarity
  const remaining = pool.filter((c) => !excludeIds.has(c.id));
  const fallbackPool = remaining.length > 0 ? remaining : pool;
  return fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
}

export function rollPackCards(
  pool: WikiCard[],
  packType: PackType
): { cards: WikiCard[]; highestRarity: Rarity } {
  const picked: WikiCard[] = [];
  const usedIds = new Set<string>();

  const normalWeights: Record<Rarity, number> = {
    C: RARITY_META.C.weight,
    UC: RARITY_META.UC.weight,
    R: RARITY_META.R.weight,
    SR: RARITY_META.SR.weight,
    SSR: RARITY_META.SSR.weight,
    UR: RARITY_META.UR.weight,
    LR: RARITY_META.LR.weight,
  };

  // First 4 slots: standard roll (moderate boost for gold/rainbow packs)
  const regularCount = CARDS_PER_PACK - 1;
  for (let i = 0; i < regularCount; i++) {
    const weights =
      packType === 'rainbow'
        ? { C: 18, UC: 24, R: 28, SR: 22, SSR: 6.2, UR: 1.4, LR: 0.4 }
        : packType === 'gold'
          ? { C: 22, UC: 26, R: 28, SR: 19, SSR: 4.0, UR: 0.8, LR: 0.2 }
          : normalWeights;

    const rarity = pickWeightedRarity(weights);
    const card = pickCardOfRarity(pool, rarity, usedIds);
    usedIds.add(card.id);
    picked.push(card);
  }

  // 5th slot: guaranteed slot for gold/rainbow, normal roll for normal
  let finalRarity: Rarity;
  if (packType === 'rainbow') {
    finalRarity = pickWeightedRarity({ SSR: 80, UR: 16, LR: 4 });
  } else if (packType === 'gold') {
    finalRarity = pickWeightedRarity({ SR: 82, SSR: 14, UR: 3.2, LR: 0.8 });
  } else {
    finalRarity = pickWeightedRarity(normalWeights);
  }

  const finalCard = pickCardOfRarity(pool, finalRarity, usedIds);
  picked.push(finalCard);

  // Order ascending by rarity so sequential 1-by-1 spin reveal saves the highest rarity for the grand finale!
  const sorted = [...picked].sort(
    (a, b) => RARITY_META[a.rarity].rank - RARITY_META[b.rarity].rank
  );

  const highestRarity = sorted.reduce<Rarity>(
    (best, c) =>
      RARITY_META[c.rarity].rank > RARITY_META[best].rank ? c.rarity : best,
    'C'
  );

  return { cards: sorted, highestRarity };
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function formatPullShareText(
  items: PullResultItem[],
  packType: PackType
): string {
  const packLabel =
    packType === 'rainbow'
      ? '🌈 彩虹卡包'
      : packType === 'gold'
        ? '✨ 金卡包'
        : '★ BanG Dream! 卡包';

  const lines = items.map((item, idx) => {
    const newMark = item.isNew ? ' [NEW]' : '';
    return `0${idx + 1} [${item.card.rarity}] ${item.card.title}${newMark} (ATK ${item.card.atk} / DEF ${item.card.def})`;
  });

  return [
    `【BanG Dream! WikiGacha】開啟了 ${packLabel}！`,
    ...lines,
    '#BanGDream #WikiGacha #邦邦維基抽卡',
  ].join('\n');
}

export function getRarityIndex(r: Rarity): number {
  return RARITY_ORDER.indexOf(r);
}
