import React, { useMemo, useState } from 'react';
import {
  ArrowUpCircle,
  Gem,
  Recycle,
  Search,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { BAND_META } from '../data/bands';
import {
  RARITY_META,
  RARITY_ORDER,
  type OwnedCardRecord,
  type Rarity,
  type WikiCard,
} from '../types';
import {
  DISMANTLE_SHARDS,
  EXCHANGE_COST_SHARDS,
  MAX_LIMIT_BREAK,
  getEffectiveStats,
  getLimitBreakCost,
} from '../utils/progression';

type ExchangeTab = 'dismantle' | 'shop' | 'limitbreak';

interface ExchangeViewProps {
  allCards: WikiCard[];
  ownedMap: Record<string, OwnedCardRecord>;
  starShards: number;
  onDismantleSingle: (card: WikiCard, qty: number) => void;
  onDismantleAllSurplus: () => void;
  onExchangeCard: (card: WikiCard, cost: number) => void;
  onLimitBreakCard: (card: WikiCard, cost: number) => void;
  onSelectCard: (card: WikiCard) => void;
}

export const ExchangeView: React.FC<ExchangeViewProps> = ({
  allCards,
  ownedMap,
  starShards,
  onDismantleSingle,
  onDismantleAllSurplus,
  onExchangeCard,
  onLimitBreakCard,
  onSelectCard,
}) => {
  const [tab, setTab] = useState<ExchangeTab>('dismantle');
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState<'ALL' | Rarity>('ALL');

  const surplusItems = useMemo(() => {
    return allCards
      .filter((c) => (ownedMap[c.id]?.count ?? 0) > 1)
      .map((c) => ({
        card: c,
        surplus: (ownedMap[c.id]?.count ?? 1) - 1,
        unitShards: DISMANTLE_SHARDS[c.rarity],
      }))
      .sort(
        (a, b) =>
          RARITY_META[b.card.rarity].rank - RARITY_META[a.card.rarity].rank ||
          b.surplus - a.surplus
      );
  }, [allCards, ownedMap]);

  const totalSurplusCount = useMemo(
    () => surplusItems.reduce((sum, item) => sum + item.surplus, 0),
    [surplusItems]
  );

  const totalSurplusShards = useMemo(
    () =>
      surplusItems.reduce(
        (sum, item) => sum + item.surplus * item.unitShards,
        0
      ),
    [surplusItems]
  );

  const shopCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCards
      .filter((c) => {
        if (ownedMap[c.id]) return false;
        if (rarityFilter !== 'ALL' && c.rarity !== rarityFilter) return false;
        if (q) {
          const hay = `${c.title} ${c.subtitle} ${BAND_META[c.band]?.name ?? ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          RARITY_META[b.rarity].rank - RARITY_META[a.rarity].rank ||
          b.atk - a.atk
      );
  }, [allCards, ownedMap, rarityFilter, search]);

  const upgradeCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCards
      .filter((c) => {
        if (!ownedMap[c.id]) return false;
        if (rarityFilter !== 'ALL' && c.rarity !== rarityFilter) return false;
        if (q) {
          const hay = `${c.title} ${c.subtitle} ${BAND_META[c.band]?.name ?? ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const lba = ownedMap[a.id]?.limitBreak ?? 0;
        const lbb = ownedMap[b.id]?.limitBreak ?? 0;
        return (
          RARITY_META[b.rarity].rank - RARITY_META[a.rarity].rank ||
          lbb - lba ||
          b.atk - a.atk
        );
      });
  }, [allCards, ownedMap, rarityFilter, search]);

  return (
    <div className="dex-section">
      {/* Header Banner */}
      <section className="surface-panel">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Gem size={20} color="#facc15" />
              星光交換所
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>
              將多餘的重複卡分解成「星之碎片」，自選兌換尚未入手的指定 SSR 5★／傳說卡，或進行限界突破強化對戰戰力！
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 18px',
              borderRadius: 14,
              background: 'rgba(250, 204, 21, 0.1)',
              border: '1px solid rgba(250, 204, 21, 0.4)',
            }}
          >
            <Sparkles size={18} color="#facc15" />
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                目前持有星之碎片
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: '#facc15',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                ✦ {starShards.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div className="pill-wrap">
            <button
              className={`pill ${tab === 'dismantle' ? 'active' : ''}`}
              style={{ padding: '8px 16px', fontSize: 13 }}
              onClick={() => setTab('dismantle')}
            >
              <Recycle size={14} />
              重複卡分解（{totalSurplusCount} 張多餘）
            </button>
            <button
              className={`pill ${tab === 'shop' ? 'active' : ''}`}
              style={{ padding: '8px 16px', fontSize: 13 }}
              onClick={() => setTab('shop')}
            >
              <ShoppingBag size={14} />
              自選兌換未擁有（{shopCards.length}）
            </button>
            <button
              className={`pill ${tab === 'limitbreak' ? 'active' : ''}`}
              style={{ padding: '8px 16px', fontSize: 13 }}
              onClick={() => setTab('limitbreak')}
            >
              <ArrowUpCircle size={14} />
              卡牌限界突破
            </button>
          </div>

          {tab === 'dismantle' && totalSurplusCount > 0 && (
            <button
              className="btn btn-gold"
              onClick={onDismantleAllSurplus}
            >
              <Recycle size={14} />
              一鍵分解全部多餘卡（+{totalSurplusShards.toLocaleString()} 碎片）
            </button>
          )}
        </div>
      </section>

      {/* ==================== TAB 1: DISMANTLE ==================== */}
      {tab === 'dismantle' && (
        <section className="surface-panel">
          {surplusItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px' }}>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                目前沒有多餘的重複卡可分解
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                系統會自動為每張已收錄的卡牌保留至少 1 張，抽到重複卡（×2 以上）時就能在這裡分解換成星之碎片！
              </p>
            </div>
          ) : (
            <div className="exchange-list">
              {surplusItems.map(({ card, surplus, unitShards }) => {
                const rMeta = RARITY_META[card.rarity];
                return (
                  <div key={card.id} className="exchange-row">
                    <button
                      className="exchange-card-info"
                      onClick={() => onSelectCard(card)}
                    >
                      <div className="battle-pick-thumb">
                        {card.imageUrl && (
                          <img src={card.imageUrl} alt={card.title} loading="lazy" />
                        )}
                      </div>
                      <div style={{ textAlign: 'left', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            className="rarity-badge"
                            style={{ background: rMeta.color }}
                          >
                            {card.rarity}
                          </span>
                          <strong style={{ fontSize: 14 }}>{card.title}</strong>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          持有 ×{surplus + 1}（可分解 {surplus} 張，每張 +{unitShards} 碎片）
                        </div>
                      </div>
                    </button>

                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        className="btn"
                        onClick={() => onDismantleSingle(card, 1)}
                      >
                        分解 1 張（+{unitShards}）
                      </button>
                      {surplus > 1 && (
                        <button
                          className="btn btn-gold"
                          onClick={() => onDismantleSingle(card, surplus)}
                        >
                          全分 {surplus} 張（+{surplus * unitShards}）
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ==================== TAB 2 & 3 FILTERS ==================== */}
      {(tab === 'shop' || tab === 'limitbreak') && (
        <section className="surface-panel dex-controls">
          <div className="search-row">
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                className="text-input"
                style={{ width: '100%', paddingLeft: 36 }}
                placeholder="搜尋卡牌名稱或樂團…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="pill-wrap">
              <button
                className={`pill ${rarityFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setRarityFilter('ALL')}
              >
                全稀有度
              </button>
              {[...RARITY_ORDER].reverse().map((r) => (
                <button
                  key={r}
                  className={`pill ${rarityFilter === r ? 'active' : ''}`}
                  onClick={() => setRarityFilter(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {tab === 'shop' ? (
            shopCards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-secondary)' }}>
                沒有符合條件的未擁有卡牌（或你已經全圖鑑制霸了！）
              </div>
            ) : (
              <div className="exchange-list">
                {shopCards.map((card) => {
                  const rMeta = RARITY_META[card.rarity];
                  const cost = EXCHANGE_COST_SHARDS[card.rarity];
                  const canAfford = starShards >= cost;
                  return (
                    <div key={card.id} className="exchange-row">
                      <button
                        className="exchange-card-info"
                        onClick={() => onSelectCard(card)}
                      >
                        <div className="battle-pick-thumb">
                          {card.imageUrl && (
                            <img src={card.imageUrl} alt={card.title} loading="lazy" />
                          )}
                        </div>
                        <div style={{ textAlign: 'left', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              className="rarity-badge"
                              style={{ background: rMeta.color }}
                            >
                              {card.rarity}
                            </span>
                            <strong style={{ fontSize: 14 }}>{card.title}</strong>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {BAND_META[card.band]?.name} · {card.category} · ATK{' '}
                            {card.atk.toLocaleString()} / DEF {card.def.toLocaleString()}
                          </div>
                        </div>
                      </button>

                      <button
                        className="btn btn-gold"
                        disabled={!canAfford}
                        onClick={() => onExchangeCard(card, cost)}
                      >
                        ✦ {cost} 兌換
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          ) : upgradeCards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-secondary)' }}>
              尚未擁有符合條件的卡牌。
            </div>
          ) : (
            <div className="exchange-list">
              {upgradeCards.map((card) => {
                const rec = ownedMap[card.id];
                const eff = getEffectiveStats(card, rec);
                const isMax = eff.lb >= MAX_LIMIT_BREAK;
                const cost = getLimitBreakCost(card.rarity, eff.lb);
                const nextAtk = Math.round(card.atk * (1 + (eff.lb + 1) * 0.08));
                const nextDef = Math.round(card.def * (1 + (eff.lb + 1) * 0.08));
                const rMeta = RARITY_META[card.rarity];
                return (
                  <div key={card.id} className="exchange-row">
                    <button
                      className="exchange-card-info"
                      onClick={() => onSelectCard(card)}
                    >
                      <div className="battle-pick-thumb">
                        {card.imageUrl && (
                          <img src={card.imageUrl} alt={card.title} loading="lazy" />
                        )}
                      </div>
                      <div style={{ textAlign: 'left', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            className="rarity-badge"
                            style={{ background: rMeta.color }}
                          >
                            {card.rarity}
                          </span>
                          <strong style={{ fontSize: 14 }}>{card.title}</strong>
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 800,
                              color: isMax ? '#34d399' : '#facc15',
                            }}
                          >
                            {isMax ? 'MAX (+5)' : `突破 +${eff.lb}`}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          ATK {eff.atk.toLocaleString()}
                          {!isMax && ` → ${nextAtk.toLocaleString()}`} · DEF{' '}
                          {eff.def.toLocaleString()}
                          {!isMax && ` → ${nextDef.toLocaleString()}`}
                        </div>
                      </div>
                    </button>

                    {isMax ? (
                      <span className="pill active">已滿突 MAX</span>
                    ) : (
                      <button
                        className="btn btn-gold"
                        disabled={starShards < cost}
                        onClick={() => onLimitBreakCard(card, cost)}
                      >
                        <ArrowUpCircle size={14} />✦ {cost} 突破 +{eff.lb + 1}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
