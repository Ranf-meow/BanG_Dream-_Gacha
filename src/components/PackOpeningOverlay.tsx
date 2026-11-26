import React, { useEffect } from 'react';
import { RARITY_META, type PackType, type Rarity } from '../types';

interface PackOpeningOverlayProps {
  highestRarity: Rarity;
  packType: PackType;
  onFinish: () => void;
}

export const PackOpeningOverlay: React.FC<PackOpeningOverlayProps> = ({
  highestRarity,
  packType,
  onFinish,
}) => {
  const meta = RARITY_META[highestRarity];
  const isHighTier = meta.rank >= 4; // SSR+

  useEffect(() => {
    const duration = isHighTier ? 1750 : 1250;
    const timer = window.setTimeout(onFinish, duration);
    return () => window.clearTimeout(timer);
  }, [isHighTier, onFinish]);

  return (
    <div
      className="ritual-overlay"
      style={
        {
          '--ritual-color': meta.color,
          '--ritual-glow': meta.glow,
        } as React.CSSProperties
      }
      onClick={onFinish}
    >
      <button
        className="ritual-skip"
        onClick={(e) => {
          e.stopPropagation();
          onFinish();
        }}
      >
        跳過演出 »
      </button>

      <div className="ritual-kicker">
        BANG DREAM! WIKIGACHA ·{' '}
        {packType === 'rainbow'
          ? 'RAINBOW PACK'
          : packType === 'gold'
            ? 'GOLD PACK'
            : 'STARLIGHT PACK'}
      </div>

      <div className="astrolabe">
        <div className="astrolabe-ring" />
        <div className="astrolabe-ring inner" />
        <div className="astrolabe-core">★</div>
      </div>

      <div className="ritual-title">
        {highestRarity === 'LR'
          ? '傳說降臨！星之鼓動響徹夜空！'
          : isHighTier
            ? '非同尋常的氣息……星光化作旋律！'
            : '星光，化作旋律。'}
      </div>

      <div className="ritual-sub">
        {isHighTier
          ? `SOMETHING EXTRAORDINARY · ${meta.label} 氣場感應`
          : 'INTO THE UNKNOWN · 正在展開條目記憶…'}
      </div>
    </div>
  );
};
