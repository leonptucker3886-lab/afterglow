// Tiny WebAudio synth: no audio files, everything generated.
import { state } from './store.js';
let ac, master;
function ctx() {
  if (!ac) {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
    ac = new A(); master = ac.createGain(); master.gain.value = 0.32; master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
addEventListener('pointerdown', () => state.settings.sound && ctx(), { once: true });

function tone(freq, dur = 0.12, { type = 'sine', vol = 0.6, at = 0, slide = 0, attack = 0.005 } = {}) {
  const c = ctx(); if (!c) return;
  const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur = 0.1, { vol = 0.3, at = 0, hp = 1000 } = {}) {
  const c = ctx(); if (!c) return;
  const t = c.currentTime + at, b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol;
  s.buffer = b; s.connect(f); f.connect(g); g.connect(master); s.start(t);
}

const SFX = {
  tap: () => tone(660, 0.05, { type: 'triangle', vol: 0.25 }),
  bet: () => { tone(520, 0.06, { type: 'square', vol: 0.12 }); tone(780, 0.08, { type: 'triangle', vol: 0.2, at: 0.04 }); },
  chip: () => { noise(0.05, { vol: 0.25, hp: 3000 }); tone(1800, 0.04, { type: 'sine', vol: 0.12 }); },
  card: () => noise(0.07, { vol: 0.3, hp: 1800 }),
  tick: () => tone(1200, 0.03, { type: 'square', vol: 0.06 }),
  reveal: () => tone(880, 0.12, { type: 'sine', vol: 0.3, slide: 1.5 }),
  gem: () => { tone(1046, 0.1, { type: 'triangle', vol: 0.3 }); tone(1568, 0.16, { type: 'sine', vol: 0.22, at: 0.05 }); },
  lose: () => tone(220, 0.35, { type: 'sawtooth', vol: 0.18, slide: 0.5 }),
  boom: () => { noise(0.5, { vol: 0.5, hp: 80 }); tone(90, 0.5, { type: 'sine', vol: 0.6, slide: 0.4 }); },
  win: () => [523, 659, 784].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.3, at: i * 0.07 })),
  big: () => [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => { tone(f, 0.3, { type: 'triangle', vol: 0.3, at: i * 0.09 }); tone(f / 2, 0.3, { type: 'sine', vol: 0.18, at: i * 0.09 }); }),
  cash: () => { [1318, 1568, 2093].forEach((f, i) => tone(f, 0.12, { type: 'square', vol: 0.08, at: i * 0.05 })); noise(0.15, { vol: 0.15, hp: 5000, at: 0.05 }); },
  spin: () => noise(0.12, { vol: 0.12, hp: 2500 }),
  stop: () => { tone(160, 0.08, { type: 'square', vol: 0.15 }); noise(0.04, { vol: 0.2, hp: 1500 }); },
  peg: () => tone(900 + Math.random() * 600, 0.04, { type: 'sine', vol: 0.12 }),
  level: () => [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, { type: 'square', vol: 0.12, at: i * 0.08 })),
  rise: () => tone(200, 1.2, { type: 'sawtooth', vol: 0.06, slide: 4, attack: 0.2 }),
};

export function sfx(name) { if (!state.settings.sound) return; try { SFX[name]?.(); } catch (e) {} }
export function buzz(p = 12) { if (state.settings.haptics && navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} }
export { tone };
