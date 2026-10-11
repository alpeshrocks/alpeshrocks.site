// Every sound is synthesized: wind from filtered noise, koto-like plucks from
// Karplus-Strong, and a temple bell from inharmonic partials. No audio files.

const HIRAJOSHI = [0, 2, 3, 7, 8];

let ctx = null;
let master = null;
let verb = null;
let ambient = null;
let pluckTimer = 0;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);

  verb = ctx.createConvolver();
  const len = ctx.sampleRate * 3.2;
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  verb.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  verb.connect(wet).connect(master);
  return ctx;
}

function noiseBuffer(seconds) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  return buf;
}

function pluck(freq, when = 0, gain = 0.18) {
  const sr = ctx.sampleRate;
  const period = Math.round(sr / freq);
  const len = sr * 2.5;
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < period; i++) d[i] = Math.random() * 2 - 1;
  for (let i = period; i < len; i++) d[i] = (d[i - period] + d[i - period + 1]) * 0.4965;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = gain;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  src.connect(lp).connect(g);
  g.connect(master);
  g.connect(verb);
  src.start(ctx.currentTime + when);
}

function schedulePluck() {
  if (!ambient) return;
  const root = 146.83; // D3
  const n = HIRAJOSHI[Math.floor(Math.random() * HIRAJOSHI.length)] + 12 * Math.floor(Math.random() * 2);
  pluck(root * Math.pow(2, n / 12), 0, 0.12);
  if (Math.random() < 0.35) {
    const n2 = HIRAJOSHI[Math.floor(Math.random() * HIRAJOSHI.length)] + 12;
    pluck(root * Math.pow(2, n2 / 12), 0.35, 0.08);
  }
  pluckTimer = setTimeout(schedulePluck, 3500 + Math.random() * 5500);
}

export const audio = {
  get on() { return !!ambient; },

  toggle() {
    if (!ensure()) return false;
    ctx.resume();
    if (ambient) {
      const a = ambient;
      ambient = null;
      clearTimeout(pluckTimer);
      a.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
      setTimeout(() => a.src.stop(), 3000);
      return false;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(8);
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(lp.frequency);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(0.22, ctx.currentTime, 1.5);
    src.connect(lp).connect(gain).connect(master);
    src.start();
    lfo.start();
    ambient = { src, gain };
    pluckTimer = setTimeout(schedulePluck, 1200);
    return true;
  },

  bell() {
    if (!ensure()) return;
    ctx.resume();
    const base = 220;
    const t = ctx.currentTime;
    [1, 2.01, 2.76, 4.07, 5.43].forEach((r, i) => {
      const o = ctx.createOscillator();
      o.frequency.value = base * r;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16 / (i + 1), t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5 / (1 + i * 0.4));
      o.connect(g);
      g.connect(master);
      g.connect(verb);
      o.start(t);
      o.stop(t + 5);
    });
  },

  plip() {
    if (!ensure()) return;
    ctx.resume();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(900, t);
    o.frequency.exponentialRampToValueAtTime(320, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g);
    g.connect(master);
    g.connect(verb);
    o.start(t);
    o.stop(t + 0.3);
  },

  coin() {
    if (!ensure()) return;
    ctx.resume();
    [0, 0.09].forEach((d) => {
      const t = ctx.currentTime + d;
      const o = ctx.createOscillator();
      o.frequency.value = 2600 + d * 4000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.45);
    });
    setTimeout(() => this.plip(), 900);
  },

  slash() {
    if (!ensure()) return;
    ctx.resume();
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    const len = ctx.sampleRate * 0.5;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 3;
    bp.frequency.setValueAtTime(800, t);
    bp.frequency.exponentialRampToValueAtTime(7000, t + 0.25);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    src.connect(bp).connect(g);
    g.connect(master);
    g.connect(verb);
    src.start(t);
  },

  horn() {
    if (!ensure()) return;
    ctx.resume();
    const t = ctx.currentTime;
    [[98, 0], [82.4, 0.9]].forEach(([f, d]) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.22, t + d + 0.15);
      g.gain.setValueAtTime(0.22, t + d + 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.4);
      o.connect(lp).connect(g);
      g.connect(master);
      g.connect(verb);
      o.start(t + d);
      o.stop(t + d + 1.5);
    });
  },

  stamp() {
    if (!ensure()) return;
    ctx.resume();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.3);
    pluck(587.33, 0.15, 0.1);
    pluck(880, 0.3, 0.08);
  },
};
