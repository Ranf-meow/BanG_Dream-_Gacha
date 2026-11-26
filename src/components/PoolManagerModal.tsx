import React, { useRef, useState } from 'react';
import { Download, Plus, Trash2, Upload, X } from 'lucide-react';
import { BAND_LIST } from '../data/bands';
import {
  RARITY_META,
  RARITY_ORDER,
  type BandId,
  type CardCategory,
  type Rarity,
  type WikiCard,
} from '../types';

interface PoolManagerModalProps {
  open: boolean;
  customCards: WikiCard[];
  defaultPoolCount: number;
  onClose: () => void;
  onAddCustomCard: (card: WikiCard) => void;
  onDeleteCustomCard: (cardId: string) => void;
  onImportCustomCards: (cards: WikiCard[]) => void;
  onNotify: (msg: string) => void;
}

const CATEGORIES: CardCategory[] = [
  '角色',
  '樂團',
  '樂曲',
  '場所・學園',
  '名場面與梗',
];

export const PoolManagerModal: React.FC<PoolManagerModalProps> = ({
  open,
  customCards,
  defaultPoolCount,
  onClose,
  onAddCustomCard,
  onDeleteCustomCard,
  onImportCustomCards,
  onNotify,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [rarity, setRarity] = useState<Rarity>('SSR');
  const [category, setCategory] = useState<CardCategory>('角色');
  const [band, setBand] = useState<BandId>('mygo');
  const [role, setRole] = useState('');
  const [atk, setAtk] = useState(8800);
  const [def, setDef] = useState(8400);
  const [summary, setSummary] = useState('');
  const [flavorText, setFlavorText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [wikiUrl, setWikiUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) {
      onNotify('請至少填寫「條目名稱」與「條目簡介」');
      return;
    }

    const qByRarity: Record<Rarity, number> = {
      C: 16,
      UC: 28,
      R: 48,
      SR: 72,
      SSR: 85,
      UR: 93,
      LR: 98.5,
    };

    const newCard: WikiCard = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pageId: Math.floor(9000000 + Math.random() * 999999),
      title: title.trim(),
      subtitle: subtitle.trim() || 'Custom BanG Dream! Entry',
      rarity,
      qScore: qByRarity[rarity],
      category,
      band,
      role: role.trim() || undefined,
      atk: Math.min(15000, Math.max(100, Number(atk) || 5000)),
      def: Math.min(15000, Math.max(100, Number(def) || 5000)),
      summary: summary.trim(),
      flavorText: flavorText.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      wikiUrl:
        wikiUrl.trim() ||
        `https://zh.wikipedia.org/wiki/${encodeURIComponent(title.trim())}`,
      tags: tagsInput
        .split(/[,，\s]+/)
        .map((t) => t.trim())
        .filter(Boolean),
      isCustom: true,
    };

    onAddCustomCard(newCard);
    setTitle('');
    setSubtitle('');
    setRole('');
    setSummary('');
    setFlavorText('');
    setImageUrl('');
    setWikiUrl('');
    setTagsInput('');
  };

  const handleExportTemplate = () => {
    const sample: WikiCard[] =
      customCards.length > 0
        ? customCards
        : [
            {
              id: 'custom-example-1',
              pageId: 9000001,
              title: '純田真奈',
              subtitle: '純田 まな / Sumita Mana',
              rarity: 'SR',
              qScore: 73.5,
              category: '角色',
              band: 'avemujica',
              role: 'sumimi 成員',
              atk: 7820,
              def: 7210,
              summary:
                '與三角初華共同組成雙人偶像團體 sumimi 的開朗少女，非常喜歡吃甜甜圈。',
              flavorText: '「初華，要不要一起吃甜甜圈呀？」',
              wikiUrl: 'https://zh.wikipedia.org/wiki/Ave_Mujica',
              imageUrl: '',
              tags: ['sumimi', '偶像', '甜甜圈'],
              isCustom: true,
            },
          ];

    const blob = new Blob([JSON.stringify(sample, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bangdream-custom-pool.json';
    a.click();
    URL.revokeObjectURL(url);
    onNotify('已下載自訂卡池 JSON 範本');
  };

  const handleImportJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const valid: WikiCard[] = list
        .filter((item) => item && typeof item.title === 'string')
        .map((item, idx) => ({
          id:
            typeof item.id === 'string' && item.id
              ? item.id
              : `custom-import-${Date.now()}-${idx}`,
          pageId: Number(item.pageId) || 9100000 + idx,
          title: item.title,
          subtitle: item.subtitle || 'Custom Entry',
          rarity: RARITY_ORDER.includes(item.rarity) ? item.rarity : 'R',
          qScore: Number(item.qScore) || 55,
          category: CATEGORIES.includes(item.category)
            ? item.category
            : '名場面與梗',
          band: BAND_LIST.some((b) => b.id === item.band)
            ? item.band
            : 'general',
          role: item.role,
          atk: Math.min(15000, Math.max(100, Number(item.atk) || 5000)),
          def: Math.min(15000, Math.max(100, Number(item.def) || 5000)),
          summary: item.summary || '自訂匯入的 BanG Dream! 條目。',
          flavorText: item.flavorText,
          wikiUrl: item.wikiUrl || 'https://zh.wikipedia.org/wiki/BanG_Dream!',
          imageUrl: item.imageUrl || undefined,
          tags: Array.isArray(item.tags) ? item.tags : ['自訂'],
          isCustom: true,
        }));

      if (valid.length === 0) {
        onNotify('JSON 中找不到有效的卡牌資料');
        return;
      }
      onImportCustomCards(valid);
    } catch {
      onNotify('JSON 解析失敗，請確認格式是否正確');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 280px' }}>
            <div className="modal-title">自訂 BanG Dream! 卡池管理</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              內建卡池 {defaultPoolCount} 張 ＋ 自訂卡牌 {customCards.length}{' '}
              張（儲存於瀏覽器 IndexedDB，抽卡會即時納入！）
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flexShrink: 0 }}>
            <button className="btn" style={{ whiteSpace: 'nowrap' }} onClick={handleExportTemplate}>
              <Download size={14} />
              匯出／範本 JSON
            </button>
            <button
              className="btn"
              style={{ whiteSpace: 'nowrap' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} />
              批次匯入 JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportJson(file);
                e.target.value = '';
              }}
            />
            <button className="icon-btn" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="surface-panel" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>
            新增單張自訂卡牌
          </div>
          <div className="form-grid">
            <div className="field">
              <label>條目名稱 *</label>
              <input
                className="text-input"
                placeholder="例如：純田真奈 / 迷路日々 / 豐川家別墅"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label>副標題（日文／英文）</label>
              <input
                className="text-input"
                placeholder="例如：純田 まな / Sumita Mana"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </div>

            <div className="field">
              <label>稀有度</label>
              <select
                className="text-input"
                value={rarity}
                onChange={(e) => setRarity(e.target.value as Rarity)}
              >
                {[...RARITY_ORDER].reverse().map((r) => (
                  <option key={r} value={r}>
                    {r} - {RARITY_META[r].zhName}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>所屬樂團</label>
              <select
                className="text-input"
                value={band}
                onChange={(e) => setBand(e.target.value as BandId)}
              >
                {BAND_LIST.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>分類</label>
              <select
                className="text-input"
                value={category}
                onChange={(e) => setCategory(e.target.value as CardCategory)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>職位／副標籤（選填）</label>
              <input
                className="text-input"
                placeholder="例如：Gt. / 劇中曲 / 聖地"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>

            <div className="field">
              <label>ATK 人氣（100 ~ 15000）</label>
              <input
                type="number"
                className="text-input"
                min={100}
                max={15000}
                value={atk}
                onChange={(e) => setAtk(Number(e.target.value))}
              />
            </div>

            <div className="field">
              <label>DEF 深度（100 ~ 15000）</label>
              <input
                type="number"
                className="text-input"
                min={100}
                max={15000}
                value={def}
                onChange={(e) => setDef(Number(e.target.value))}
              />
            </div>

            <div className="field full">
              <label>條目簡介 *</label>
              <textarea
                className="text-input"
                placeholder="簡短介紹這張卡牌的背景、劇情亮點或典故…"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                required
              />
            </div>

            <div className="field full">
              <label>風味台詞（SR 以上會顯示在卡面）</label>
              <input
                className="text-input"
                placeholder="例如：「只要大家在一起，一定沒問題的！」"
                value={flavorText}
                onChange={(e) => setFlavorText(e.target.value)}
              />
            </div>

            <div className="field">
              <label>卡面圖片網址（選填，留空將自動套用樂團星光視覺）</label>
              <input
                className="text-input"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>

            <div className="field">
              <label>標籤（以逗號分隔）</label>
              <input
                className="text-input"
                placeholder="例如：sumimi, 甜甜圈, 偶像"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
            </div>

            <div className="field full">
              <label>Wiki 連結（選填）</label>
              <input
                className="text-input"
                placeholder="https://zh.wikipedia.org/wiki/..."
                value={wikiUrl}
                onChange={(e) => setWikiUrl(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-gold">
              <Plus size={15} />
              加入 BanG Dream! 卡池
            </button>
          </div>
        </form>

        {/* Custom cards list */}
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 10 }}>
            已加入的自訂卡牌（{customCards.length}）
          </div>
          {customCards.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              尚未新增自訂卡牌。你可以使用上方表單或「批次匯入 JSON」擴充專屬邦邦卡池！
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {customCards.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      className="rarity-badge"
                      style={{ background: RARITY_META[c.rarity].color }}
                    >
                      {c.rarity}
                    </span>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                        {c.title}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        {c.category} · ATK {c.atk} / DEF {c.def}
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '5px 10px' }}
                    onClick={() => onDeleteCustomCard(c.id)}
                  >
                    <Trash2 size={13} />
                    移除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
