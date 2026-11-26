import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FolderPlus,
  Layers,
  Search,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { BAND_LIST } from '../data/bands';
import { THEME_SETS } from '../data/themeSets';
import {
  RARITY_META,
  RARITY_ORDER,
  type BandId,
  type CardCategory,
  type OwnedCardRecord,
  type Rarity,
  type WikiCard,
} from '../types';
import { WikiCardView } from './WikiCardView';

type DexSubTab = 'cards' | 'themes';
type SortKey =
  | 'rarity'
  | 'atk'
  | 'def'
  | 'power'
  | 'count'
  | 'obtained'
  | 'title'
  | 'id';

const CATEGORIES: ('ALL' | CardCategory)[] = [
  'ALL',
  '角色',
  '樂團',
  '樂曲',
  '場所・學園',
  '名場面與梗',
];

interface DexViewProps {
  allCards: WikiCard[];
  ownedMap: Record<string, OwnedCardRecord>;
  onSelectCard: (card: WikiCard) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onClearCollection: () => void;
  onOpenPoolManager: () => void;
  onNotify: (msg: string) => void;
}

export const DexView: React.FC<DexViewProps> = ({
  allCards,
  ownedMap,
  onSelectCard,
  onExportBackup,
  onImportBackup,
  onClearCollection,
  onOpenPoolManager,
  onNotify,
}) => {
  const [subTab, setSubTab] = useState<DexSubTab>('cards');
  const [search, setSearch] = useState('');
  const [bandFilter, setBandFilter] = useState<'ALL' | BandId>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | CardCategory>(
    'ALL'
  );
  const [rarityFilter, setRarityFilter] = useState<'ALL' | Rarity>('ALL');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [showUnowned, setShowUnowned] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('rarity');

  // Showcase mode (1-10 cards side-by-side)
  const [showcaseSelectMode, setShowcaseSelectMode] = useState(false);
  const [showcaseIds, setShowcaseIds] = useState<string[]>([]);
  const [showcaseOpen, setShowcaseOpen] = useState(false);

  const importInputRef = useRef<HTMLInputElement>(null);

  const cardById = useMemo(() => {
    const map: Record<string, WikiCard> = {};
    for (const c of allCards) map[c.id] = c;
    return map;
  }, [allCards]);

  const stats = useMemo(() => {
    const totalByRarity: Record<Rarity, number> = {
      C: 0,
      UC: 0,
      R: 0,
      SR: 0,
      SSR: 0,
      UR: 0,
      LR: 0,
    };
    const ownedByRarity: Record<Rarity, number> = {
      C: 0,
      UC: 0,
      R: 0,
      SR: 0,
      SSR: 0,
      UR: 0,
      LR: 0,
    };
    let ownedUnique = 0;

    for (const c of allCards) {
      totalByRarity[c.rarity] += 1;
      if (ownedMap[c.id]) {
        ownedByRarity[c.rarity] += 1;
        ownedUnique += 1;
      }
    }

    return {
      ownedUnique,
      total: allCards.length,
      pct: allCards.length > 0 ? (ownedUnique / allCards.length) * 100 : 0,
      totalByRarity,
      ownedByRarity,
    };
  }, [allCards, ownedMap]);

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = allCards.filter((card) => {
      const owned = ownedMap[card.id];
      if (!showUnowned && !owned) return false;
      if (onlyFavorites && !owned?.favorite) return false;
      if (bandFilter !== 'ALL' && card.band !== bandFilter) return false;
      if (categoryFilter !== 'ALL' && card.category !== categoryFilter)
        return false;
      if (rarityFilter !== 'ALL' && card.rarity !== rarityFilter) return false;
      if (q) {
        const hay = [
          card.title,
          card.subtitle,
          card.summary,
          card.role ?? '',
          ...card.tags,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      const oa = ownedMap[a.id];
      const ob = ownedMap[b.id];
      if (Boolean(oa) !== Boolean(ob)) return oa ? -1 : 1;

      switch (sortBy) {
        case 'rarity':
          return (
            RARITY_META[b.rarity].rank - RARITY_META[a.rarity].rank ||
            b.qScore - a.qScore
          );
        case 'atk':
          return b.atk - a.atk;
        case 'def':
          return b.def - a.def;
        case 'power':
          return b.atk + b.def - (a.atk + a.def);
        case 'count':
          return (ob?.count ?? 0) - (oa?.count ?? 0);
        case 'obtained':
          return (ob?.lastObtainedAt ?? 0) - (oa?.lastObtainedAt ?? 0);
        case 'title':
          return a.title.localeCompare(b.title, 'zh-Hant');
        case 'id':
          return a.pageId - b.pageId;
        default:
          return 0;
      }
    });

    return list;
  }, [
    allCards,
    ownedMap,
    showUnowned,
    onlyFavorites,
    bandFilter,
    categoryFilter,
    rarityFilter,
    search,
    sortBy,
  ]);

  const handleCardClick = (card: WikiCard) => {
    const owned = ownedMap[card.id];
    if (showcaseSelectMode) {
      if (!owned) {
        onNotify('只能選擇已擁有的卡牌加入收藏展示牆');
        return;
      }
      setShowcaseIds((prev) => {
        if (prev.includes(card.id)) {
          return prev.filter((id) => id !== card.id);
        }
        if (prev.length >= 10) {
          onNotify('收藏展示牆最多選擇 10 張卡牌');
          return prev;
        }
        return [...prev, card.id];
      });
      return;
    }

    if (owned) {
      onSelectCard(card);
    } else {
      onNotify('尚未獲得這張卡牌，快去開包收錄吧！');
    }
  };

  const handleCopyShowcase = async () => {
    const cards = showcaseIds.map((id) => cardById[id]).filter(Boolean);
    const lines = cards.map(
      (c, i) => `0${i + 1} [${c.rarity}] ${c.title} (ATK ${c.atk} / DEF ${c.def})`
    );
    const text = [
      `【BanG Dream! WikiGacha 我的收藏展示】(${cards.length} 張)`,
      ...lines,
      '#BanGDream #WikiGacha',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      onNotify('已複製收藏展示清單！');
    } catch {
      onNotify('複製失敗');
    }
  };

  const handleClearConfirm = () => {
    if (
      window.confirm(
        '確定要清空所有圖鑑收集進度與抽卡紀錄嗎？（自訂卡池會保留）'
      )
    ) {
      onClearCollection();
    }
  };

  return (
    <div className="dex-section">
      {/* Progress Overview */}
      <section className="surface-panel">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              BanG Dream! 圖鑑收錄進度
            </div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>
              <span style={{ color: '#facc15' }}>{stats.ownedUnique}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>
                {' '}
                / {stats.total} 張（{stats.pct.toFixed(1)}%）
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button className="btn btn-gold" onClick={onOpenPoolManager}>
              <FolderPlus size={15} />
              自訂卡池管理
            </button>
            <button className="btn" onClick={onExportBackup}>
              <Download size={14} />
              匯出備份
            </button>
            <button
              className="btn"
              onClick={() => importInputRef.current?.click()}
            >
              <Upload size={14} />
              匯入備份
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImportBackup(file);
                e.target.value = '';
              }}
            />
            <button className="btn btn-danger" onClick={handleClearConfirm}>
              <Trash2 size={14} />
              清空圖鑑
            </button>
          </div>
        </div>

        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${Math.min(100, stats.pct)}%` }}
          />
        </div>

        <div className="rarity-counts-grid">
          {[...RARITY_ORDER].reverse().map((r) => {
            const meta = RARITY_META[r];
            return (
              <button
                key={r}
                className="rarity-count-box"
                onClick={() => {
                  setSubTab('cards');
                  setRarityFilter((prev) => (prev === r ? 'ALL' : r));
                }}
                style={{
                  borderColor:
                    rarityFilter === r ? meta.color : 'var(--border-subtle)',
                  background:
                    rarityFilter === r ? meta.bgTint : 'rgba(255,255,255,0.025)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 12,
                    fontWeight: 800,
                    color: meta.color,
                  }}
                >
                  {r}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    marginTop: 2,
                  }}
                >
                  {stats.ownedByRarity[r]} / {stats.totalByRarity[r]}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Sub-tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div className="pill-wrap">
          <button
            className={`pill ${subTab === 'cards' ? 'active' : ''}`}
            onClick={() => setSubTab('cards')}
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            <Layers size={14} />
            卡牌列表
          </button>
          <button
            className={`pill ${subTab === 'themes' ? 'active' : ''}`}
            onClick={() => setSubTab('themes')}
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            <Sparkles size={14} />
            主題圖鑑（{THEME_SETS.length} 組）
          </button>
        </div>

        {subTab === 'cards' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {showcaseSelectMode ? (
              <>
                <span style={{ fontSize: 12.5, color: '#facc15', fontWeight: 700 }}>
                  已選 {showcaseIds.length} / 10 張
                </span>
                <button
                  className="btn btn-gold"
                  disabled={showcaseIds.length === 0}
                  onClick={() => setShowcaseOpen(true)}
                >
                  開啟展示牆
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setShowcaseSelectMode(false);
                    setShowcaseIds([]);
                  }}
                >
                  取消
                </button>
              </>
            ) : (
              <button
                className="btn"
                onClick={() => {
                  setShowcaseSelectMode(true);
                  setShowUnowned(false);
                  onNotify('請點選 1～10 張已擁有的卡牌組成收藏展示牆');
                }}
              >
                <Star size={14} />
                查看收藏展示
              </button>
            )}
          </div>
        )}
      </div>

      {/* ==================== CARD LIST SUBTAB ==================== */}
      {subTab === 'cards' && (
        <>
          <div className="surface-panel dex-controls">
            <div className="search-row">
              <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
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
                  placeholder="搜尋卡名、日文名、樂器、標籤或介紹…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="text-input"
                style={{ flex: '0 0 auto', minWidth: 145 }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
              >
                <option value="rarity">排序：稀有度</option>
                <option value="atk">排序：ATK（人氣）</option>
                <option value="def">排序：DEF（深度）</option>
                <option value="power">排序：ATK + DEF</option>
                <option value="count">排序：持有數量</option>
                <option value="obtained">排序：最近獲得</option>
                <option value="title">排序：名稱</option>
                <option value="id">排序：條目 ID</option>
              </select>

              <button
                className={`pill ${onlyFavorites ? 'active' : ''}`}
                onClick={() => setOnlyFavorites((v) => !v)}
              >
                <Star size={13} fill={onlyFavorites ? 'currentColor' : 'none'} />
                僅★收藏
              </button>

              <button
                className={`pill ${showUnowned ? 'active' : ''}`}
                onClick={() => setShowUnowned((v) => !v)}
              >
                {showUnowned ? <Eye size={13} /> : <EyeOff size={13} />}
                {showUnowned ? '顯示未擁有：開' : '顯示未擁有：關'}
              </button>
            </div>

            {/* Category filter */}
            <div className="pill-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`pill ${categoryFilter === cat ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat === 'ALL' ? '全部分類' : cat}
                </button>
              ))}
            </div>

            {/* Band filter */}
            <div className="pill-wrap">
              <button
                className={`pill ${bandFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setBandFilter('ALL')}
              >
                全部樂團
              </button>
              {BAND_LIST.map((b) => (
                <button
                  key={b.id}
                  className={`pill ${bandFilter === b.id ? 'active' : ''}`}
                  onClick={() => setBandFilter(b.id)}
                  style={
                    bandFilter === b.id
                      ? {
                          borderColor: b.color,
                          color: '#fff',
                          background: `${b.color}33`,
                        }
                      : undefined
                  }
                >
                  {b.iconUrl ? (
                    <img
                      src={b.iconUrl}
                      alt=""
                      style={{
                        width: 15,
                        height: 15,
                        objectFit: 'contain',
                        borderRadius: 3,
                      }}
                    />
                  ) : (
                    <span style={{ color: b.color }}>{b.motif}</span>
                  )}
                  {b.shortName}
                </button>
              ))}
            </div>
          </div>

          {filteredCards.length === 0 ? (
            <div
              className="surface-panel"
              style={{ textAlign: 'center', padding: '44px 20px' }}
            >
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                目前沒有符合條件的卡牌
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {stats.ownedUnique === 0 && !showUnowned
                  ? '先去「扭蛋」分頁開啟你的第一包彩虹卡包，或開啟「顯示未擁有」預覽卡池！'
                  : '試著調整搜尋關鍵字或篩選條件。'}
              </p>
            </div>
          ) : (
            <div className="dex-card-grid">
              {filteredCards.map((card) => {
                const owned = ownedMap[card.id];
                return (
                  <WikiCardView
                    key={card.id}
                    card={card}
                    unowned={!owned}
                    count={owned?.count}
                    limitBreak={owned?.limitBreak}
                    favorite={owned?.favorite}
                    selected={showcaseIds.includes(card.id)}
                    onClick={() => handleCardClick(card)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ==================== THEME SETS SUBTAB ==================== */}
      {subTab === 'themes' && (
        <div className="theme-sets-grid">
          {THEME_SETS.map((set) => {
            const setCards = set.cardIds
              .map((id) => cardById[id])
              .filter(Boolean);
            const collected = setCards.filter((c) => Boolean(ownedMap[c.id]));
            const completed =
              setCards.length > 0 && collected.length === setCards.length;
            const pct =
              setCards.length > 0
                ? (collected.length / setCards.length) * 100
                : 0;

            return (
              <div
                key={set.id}
                className="theme-set-card"
                style={{
                  borderColor: completed
                    ? `${set.accentColor}99`
                    : 'var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        color: set.accentColor,
                      }}
                    >
                      {set.subtitle}
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>
                      {set.title}
                    </h3>
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 13,
                      fontWeight: 800,
                      color: completed ? '#34d399' : '#facc15',
                      flexShrink: 0,
                    }}
                  >
                    {completed && <CheckCircle2 size={15} />}
                    {collected.length} / {setCards.length}
                  </div>
                </div>

                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {set.description}
                </p>

                <div className="progress-bar-track" style={{ height: 7 }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${pct}%`,
                      background: set.accentColor,
                    }}
                  />
                </div>

                <div className="theme-mini-list">
                  {setCards.map((card) => {
                    const isOwned = Boolean(ownedMap[card.id]);
                    const rMeta = RARITY_META[card.rarity];
                    return (
                      <button
                        key={card.id}
                        className={`theme-mini-chip ${isOwned ? 'owned' : ''}`}
                        onClick={() => {
                          if (isOwned) onSelectCard(card);
                          else onNotify(`尚未收集「${card.title}」`);
                        }}
                      >
                        <span
                          style={{
                            color: isOwned ? rMeta.color : 'var(--text-muted)',
                            fontWeight: 800,
                            marginRight: 4,
                          }}
                        >
                          {card.rarity}
                        </span>
                        {isOwned ? card.title : '？？？'}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== SHOWCASE MODAL ==================== */}
      {showcaseOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setShowcaseOpen(false)}
        >
          <div
            className="modal-card wide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title">
                <Star size={18} color="#facc15" fill="#facc15" />
                我的 BanG Dream! 收藏展示牆（{showcaseIds.length} 張）
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-gold" onClick={handleCopyShowcase}>
                  <Copy size={14} />
                  複製分享文字
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setShowcaseOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="dex-card-grid">
              {showcaseIds
                .map((id) => cardById[id])
                .filter(Boolean)
                .map((card) => (
                  <WikiCardView
                    key={card.id}
                    card={card}
                    count={ownedMap[card.id]?.count}
                    favorite={ownedMap[card.id]?.favorite}
                    onClick={() => onSelectCard(card)}
                  />
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
