import type { Rarity } from '../types';

let audioCtx: AudioContext | null = null;
let soundEnabledFlag = true;

export function setSoundEnabled(enabled: boolean): void {
  soundEnabledFlag = enabled;
}

function getCtx(): AudioContext | null {
  if (!soundEnabledFlag || typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  options: {
    type?: OscillatorType;
    gain?: number;
    delay?: number;
    slideTo?: number;
  } = {}
): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime + (options.delay ?? 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = options.type ?? 'triangle';
  osc.frequency.setValueAtTime(freq, now);
  if (options.slideTo) {
    osc.frequency.exponentialRampToValueAtTime(options.slideTo, now + duration);
  }
  const peak = options.gain ?? 0.08;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playPackOpenSound(isSpecial: boolean): void {
  const notes = isSpecial
    ? [523.25, 659.25, 783.99, 1046.5, 1318.5]
    : [392.0, 493.88, 587.33, 783.99];
  notes.forEach((f, i) => {
    playTone(f, 0.28, {
      type: isSpecial ? 'sine' : 'triangle',
      gain: 0.075,
      delay: i * 0.055,
    });
  });
}

export function playCardFlipSound(rarity: Rarity): void {
  // Subtle flip swoosh
  playTone(260, 0.09, { type: 'sine', gain: 0.04, slideTo: 520 });

  switch (rarity) {
    case 'C':
      playTone(440, 0.14, { type: 'triangle', gain: 0.045, delay: 0.04 });
      break;
    case 'UC':
      playTone(523.25, 0.16, { type: 'triangle', gain: 0.055, delay: 0.04 });
      break;
    case 'R':
      playTone(587.33, 0.16, { type: 'triangle', gain: 0.06, delay: 0.04 });
      playTone(739.99, 0.22, { type: 'sine', gain: 0.055, delay: 0.1 });
      break;
    case 'SR':
      [523.25, 659.25, 783.99].forEach((f, i) =>
        playTone(f, 0.25, { type: 'sine', gain: 0.065, delay: 0.04 + i * 0.05 })
      );
      break;
    case 'SSR':
      [587.33, 739.99, 880, 1174.66].forEach((f, i) =>
        playTone(f, 0.36, { type: 'triangle', gain: 0.08, delay: 0.03 + i * 0.06 })
      );
      break;
    case 'UR':
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
        playTone(f, 0.42, { type: 'sine', gain: 0.085, delay: 0.02 + i * 0.06 })
      );
      break;
    case 'LR':
      [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98].forEach((f, i) =>
        playTone(f, 0.55, { type: 'sine', gain: 0.09, delay: 0.02 + i * 0.065 })
      );
      break;
  }
}

export function playRewardSound(): void {
  [659.25, 783.99, 1046.5].forEach((f, i) =>
    playTone(f, 0.24, { type: 'sine', gain: 0.075, delay: i * 0.06 })
  );
}

export function playQuizCorrectSound(): void {
  playTone(659.25, 0.16, { type: 'sine', gain: 0.075 });
  playTone(987.77, 0.26, { type: 'sine', gain: 0.08, delay: 0.09 });
}

export function playQuizWrongSound(): void {
  playTone(280, 0.18, { type: 'sawtooth', gain: 0.045, slideTo: 190 });
  playTone(210, 0.24, { type: 'sawtooth', gain: 0.045, delay: 0.12, slideTo: 150 });
}

export function playBattleHitSound(crit = false): void {
  if (crit) {
    playTone(520, 0.15, { type: 'square', gain: 0.055, slideTo: 880 });
    playTone(880, 0.2, { type: 'triangle', gain: 0.065, delay: 0.06 });
  } else {
    playTone(300, 0.11, { type: 'triangle', gain: 0.055, slideTo: 160 });
  }
}

export function playVictorySound(): void {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
    playTone(f, 0.34, { type: 'triangle', gain: 0.08, delay: i * 0.09 })
  );
}
