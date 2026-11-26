import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Flame,
  Gift,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { BAND_LIST, BAND_META } from '../data/bands';
import type { PlayerState, WikiCard } from '../types';
import { playQuizCorrectSound, playQuizWrongSound } from '../utils/sound';

type QuestionKind = 'silhouette' | 'quote' | 'band' | 'atk';

interface QuizQuestion {
  kind: QuestionKind;
  badge: string;
  prompt: string;
  quoteText?: string;
  imageCard?: WikiCard;
  silhouetteMode?: 'shadow' | 'blur';
  options: { id: string; label: string }[];
  correctId: string;
  explanation: string;
}

const MAX_DAILY_QUIZ_BONUS_SETS = 5;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function generateQuestion(allCards: WikiCard[]): QuizQuestion {
  const baseChars = allCards.filter(
    (c) => c.category === '角色' && !c.id.endsWith('-ssr') && c.imageUrl
  );
  const quoteCards = allCards.filter(
    (c) => Boolean(c.flavorText) && !c.id.endsWith('-ssr')
  );
  const bandCards = allCards.filter(
    (c) =>
      (c.category === '角色' || c.category === '樂曲') &&
      c.band !== 'general' &&
      !c.id.endsWith('-ssr')
  );

  const kinds: QuestionKind[] = ['silhouette', 'quote', 'band', 'atk'];
  const pickKind = kinds[Math.floor(Math.random() * kinds.length)];

  if (pickKind === 'silhouette' && baseChars.length >= 4) {
    const picked = shuffle(baseChars).slice(0, 4);
    const target = picked[0];
    const mode = Math.random() < 0.55 ? 'shadow' : 'blur';
    return {
      kind: 'silhouette',
      badge: mode === 'shadow' ? '剪影猜角色' : '模糊卡面猜角色',
      prompt: '請問圖片中這位 BanG Dream! 角色是誰？',
      imageCard: target,
      silhouetteMode: mode,
      options: shuffle(picked).map((c) => ({ id: c.id, label: c.title })),
      correctId: target.id,
      explanation: `正解是【${target.title}】（${BAND_META[target.band]?.name ?? ''} · ${target.role ?? '成員'}）！`,
    };
  }

  if (pickKind === 'quote' && quoteCards.length >= 4) {
    const picked = shuffle(quoteCards).slice(0, 4);
    const target = picked[0];
    return {
      kind: 'quote',
      badge: '邦學名台詞考',
      prompt: '請問下面這段經典台詞／風味敘述出自哪張卡牌？',
      quoteText: target.flavorText,
      imageCard: target,
      options: shuffle(picked).map((c) => ({ id: c.id, label: c.title })),
      correctId: target.id,
      explanation: `正解是【${target.title}】（${BAND_META[target.band]?.shortName} · ${target.category}）！`,
    };
  }

  if (pickKind === 'band' && bandCards.length >= 1) {
    const target = bandCards[Math.floor(Math.random() * bandCards.length)];
    const realBands = BAND_LIST.filter((b) => b.id !== 'general');
    const wrongBands = shuffle(realBands.filter((b) => b.id !== target.band)).slice(
      0,
      3
    );
    const targetBand = BAND_META[target.band];
    const options = shuffle([targetBand, ...wrongBands]).map((b) => ({
      id: b.id,
      label: b.name,
    }));
    return {
      kind: 'band',
      badge: '樂團歸屬測驗',
      prompt: `請問【${target.title}】屬於哪一支 BanG Dream! 樂團？`,
      imageCard: target,
      options,
      correctId: target.band,
      explanation: `【${target.title}】屬於 ${targetBand.name}（${target.role ?? target.category}）！`,
    };
  }

  // ATK duel fallback
  const distinct = shuffle(allCards.filter((c) => !c.id.endsWith('-ssr'))).slice(
    0,
    2
  );
  const [a, b] = distinct;
  const winner = a.atk >= b.atk ? a : b;
  return {
    kind: 'atk',
    badge: '人氣數值大對決',
    prompt: '以下兩張 BanG Dream! 卡牌，哪一張的基礎 ATK（人氣）比較高？',
    options: [
      { id: a.id, label: `${a.title}（${BAND_META[a.band]?.shortName}）` },
      { id: b.id, label: `${b.title}（${BAND_META[b.band]?.shortName}）` },
    ],
    correctId: winner.id,
    explanation: `【${a.title}】ATK ${a.atk.toLocaleString()} vs 【${b.title}】ATK ${b.atk.toLocaleString()}，由「${winner.title}」勝出！`,
  };
}

interface QuizViewProps {
  allCards: WikiCard[];
  playerState: PlayerState;
  onQuizAnswer: (result: {
    correct: boolean;
    nextStreak: number;
    grantPackBonus: boolean;
  }) => void;
}

export const QuizView: React.FC<QuizViewProps> = ({
  allCards,
  playerState,
  onQuizAnswer,
}) => {
  const [question, setQuestion] = useState<QuizQuestion>(() =>
    generateQuestion(allCards)
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [progressInSet, setProgressInSet] = useState(0); // 0..2 -> at 3 grants +2 packs!

  const answered = selectedId !== null;
  const isCorrect = selectedId === question.correctId;
  const remainingBonusSets = Math.max(
    0,
    MAX_DAILY_QUIZ_BONUS_SETS - playerState.daily.quizBonusClaims
  );

  const handlePick = (optId: string) => {
    if (answered) return;
    setSelectedId(optId);
    const correct = optId === question.correctId;
    if (correct) {
      playQuizCorrectSound();
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      const nextInSet = progressInSet + 1;
      const grantPackBonus = nextInSet >= 3 && remainingBonusSets > 0;
      setProgressInSet(nextInSet >= 3 ? 0 : nextInSet);
      onQuizAnswer({ correct: true, nextStreak, grantPackBonus });
    } else {
      playQuizWrongSound();
      setStreak(0);
      onQuizAnswer({ correct: false, nextStreak: 0, grantPackBonus: false });
    }
  };

  const handleNext = () => {
    setSelectedId(null);
    setQuestion(generateQuestion(allCards));
  };

  const showHintImage = useMemo(() => {
    if (!question.imageCard?.imageUrl) return false;
    if (question.kind === 'silhouette') return true;
    return answered;
  }, [answered, question]);

  return (
    <div className="dex-section">
      {/* Header */}
      <section className="surface-panel">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
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
              <Brain size={20} color="#facc15" />
              邦學隨堂考
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>
              每答對 1 題獲得 ✦ +10 星之碎片，每累計答對 3 題額外送 <strong>+2 免費卡包</strong>（每日最多領 {MAX_DAILY_QUIZ_BONUS_SETS} 次，今日剩餘 {remainingBonusSets} 次）！
            </p>
          </div>

          <div className="pill-wrap">
            <span className="pill active" style={{ cursor: 'default' }}>
              <Flame size={13} />
              目前連勝：{streak}（最高 {playerState.quizBestStreak}）
            </span>
            <span className="pill" style={{ cursor: 'default' }}>
              <Gift size={13} color="#facc15" />
              距離 +2 卡包：{progressInSet} / 3 題
            </span>
          </div>
        </div>
      </section>

      {/* Question Stage */}
      <section
        className="surface-panel"
        style={{ maxWidth: 740, width: '100%', margin: '0 auto' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <span className="pill active" style={{ cursor: 'default' }}>
            <Sparkles size={12} />
            {question.badge}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            今日答對：{playerState.daily.quizCorrect} 題
          </span>
        </div>

        <h3 style={{ fontSize: 19, fontWeight: 900, marginBottom: 14 }}>
          {question.prompt}
        </h3>

        {question.quoteText && (
          <blockquote
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 17,
              lineHeight: 1.6,
              color: '#fde68a',
              padding: '16px 20px',
              borderRadius: 14,
              background: 'rgba(250, 204, 21, 0.07)',
              borderLeft: '4px solid #facc15',
              marginBottom: 16,
            }}
          >
            {question.quoteText}
          </blockquote>
        )}

        {showHintImage && question.imageCard?.imageUrl && (
          <div className="quiz-image-stage">
            <img
              src={question.imageCard.imageUrl}
              alt="quiz-visual"
              className={
                !answered && question.kind === 'silhouette'
                  ? question.silhouetteMode === 'shadow'
                    ? 'quiz-img-shadow'
                    : 'quiz-img-blur'
                  : 'quiz-img-clear'
              }
            />
          </div>
        )}

        <div className="quiz-options-grid">
          {question.options.map((opt) => {
            const isThisCorrect = opt.id === question.correctId;
            const isThisSelected = opt.id === selectedId;
            let stateClass = '';
            if (answered) {
              if (isThisCorrect) stateClass = 'correct';
              else if (isThisSelected) stateClass = 'wrong';
            }
            return (
              <button
                key={opt.id}
                className={`quiz-option-btn ${stateClass}`}
                disabled={answered}
                onClick={() => handlePick(opt.id)}
              >
                <span>{opt.label}</span>
                {answered && isThisCorrect && (
                  <CheckCircle2 size={17} color="#34d399" />
                )}
                {answered && isThisSelected && !isThisCorrect && (
                  <XCircle size={17} color="#fb7185" />
                )}
              </button>
            );
          })}
        </div>

        {answered && (
          <div
            style={{
              marginTop: 16,
              padding: '14px 16px',
              borderRadius: 14,
              background: isCorrect
                ? 'rgba(52, 211, 153, 0.12)'
                : 'rgba(251, 113, 133, 0.12)',
              border: `1px solid ${
                isCorrect
                  ? 'rgba(52, 211, 153, 0.45)'
                  : 'rgba(251, 113, 133, 0.4)'
              }`,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  color: isCorrect ? '#34d399' : '#fb7185',
                }}
              >
                {isCorrect ? '答對了！✦ +10 星之碎片' : '可惜答錯了！'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>
                {question.explanation}
              </div>
            </div>

            <button className="btn btn-gold" onClick={handleNext}>
              下一題
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
