// ==========================================
// EFFETS SONORES : BERCEUSE DE RONDOUDOU
// ==========================================
export function playGameSound(type, enabled = true) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const makeTone = (freq, start, duration, wave = 'sine', gainVal = 0.12) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(gainVal, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    if (type === 'xp') {
      makeTone(523.25, now, 0.12, 'sine', 0.12);
      makeTone(659.25, now + 0.1, 0.15, 'sine', 0.13);
      makeTone(783.99, now + 0.2, 0.24, 'triangle', 0.14);
    } else if (type === 'boss') {
      makeTone(659.25, now, 0.22, 'sine', 0.15);
      makeTone(783.99, now + 0.24, 0.22, 'sine', 0.15);
      makeTone(739.99, now + 0.48, 0.22, 'sine', 0.15);
      makeTone(783.99, now + 0.72, 0.22, 'sine', 0.15);
      makeTone(880.0, now + 0.96, 0.45, 'triangle', 0.18);
    } else if (type === 'done') {
      makeTone(880, now, 0.12, 'square', 0.08);
      makeTone(880, now + 0.18, 0.12, 'square', 0.08);
      makeTone(1318.5, now + 0.36, 0.35, 'triangle', 0.16);
    } else if (type === 'click') {
      makeTone(680, now, 0.05, 'sine', 0.07);
    }
  } catch (e) {}
}
