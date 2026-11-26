import React from 'react';
import { HelpCircle, X } from 'lucide-react';
import { RARITY_META, RARITY_ORDER } from '../types';

interface GuideModalProps {
  open: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <HelpCircle size={18} color="#facc15" />
            遊戲說明與機率公示
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            fontSize: 13.5,
            lineHeight: 1.65,
            color: 'var(--text-secondary)',
          }}
        >
          <div>
            <h4 style={{ color: '#fff', marginBottom: 4 }}>1. 抽卡與保底機制</h4>
            <p>
              每包可獲得 <strong>5 張</strong> BanG Dream! 維基條目卡牌。基礎卡包上限為{' '}
              <strong>10 包</strong>，每 <strong>1 分鐘</strong>自動回復 1 包，也可透過下方的「應援補給」每 3 分鐘額外領取 +3 包。
            </p>
            <ul style={{ paddingLeft: 18, marginTop: 6 }}>
              <li>
                <strong style={{ color: '#f0abfc' }}>新手彩虹卡包</strong>：首次抽卡必為彩虹卡包，保底 1 張 SSR 以上！
              </li>
              <li>
                <strong style={{ color: '#fde047' }}>金卡包（每 10 抽）</strong>：第 10 包自動升級，保底 1 張 SR 以上。
              </li>
              <li>
                <strong style={{ color: '#f0abfc' }}>彩虹卡包（每 50 抽）</strong>：第 50 包自動升級，保底 1 張 SSR 以上。
              </li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#fff', marginBottom: 6 }}>
              2. 七階稀有度與標準機率
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...RARITY_ORDER].reverse().map((r) => {
                const m = RARITY_META[r];
                return (
                  <div
                    key={r}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${m.borderColor}66`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        className="rarity-badge"
                        style={{ background: m.color }}
                      >
                        {r}
                      </span>
                      <span style={{ color: '#fff', fontWeight: 700 }}>
                        {m.zhName}
                      </span>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        Q-Score {m.minQ}
                      </span>
                    </div>
                    <strong style={{ color: m.color }}>{m.weight}%</strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 style={{ color: '#fff', marginBottom: 4 }}>
              3. 本地存檔與自訂卡池
            </h4>
            <p>
              所有圖鑑收錄進度、最愛收藏與自訂卡牌皆儲存在瀏覽器的{' '}
              <strong>IndexedDB</strong> 中。你可以隨時在「圖鑑」分頁匯出 JSON 備份檔，或透過「自訂卡池管理」自由新增角色、樂曲與自訂圖片網址！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
