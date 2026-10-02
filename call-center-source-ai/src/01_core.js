/* =====================================================================
   01_core.js  -  Utils, event Bus, AudioManager, SaveSystem
   ===================================================================== */

const U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  money: (n) => '$' + Math.round(n).toLocaleString('en-US'),
  pad: (n, l = 2) => String(n).padStart(l, '0'),
  mmss: (s) => U.pad(Math.floor(s / 60)) + ':' + U.pad(Math.floor(s % 60)),
  weighted(entries) {              // entries: [[item, weight], ...]
    const total = entries.reduce((a, e) => a + Math.max(0, e[1]), 0);
    if (total <= 0) return entries[0][0];
    let r = Math.random() * total;
    for (const [item, w] of entries) { r -= Math.max(0, w); if (r <= 0) return item; }
    return entries[entries.length - 1][0];
  },
};

const Bus = {
  _h: {},
  on(e, f) { (this._h[e] = this._h[e] || []).push(f); },
  emit(e, d) { (this._h[e] || []).slice().forEach(f => { try { f(d); } catch (err) { console.error('Bus handler error for', e, err); } }); },
};

/* ---------------------------------------------------------------------
   AudioManager: every sound is synthesized as a PLACEHOLDER.
   To replace a placeholder with a real file:
       AudioManager.register('ring', 'assets/audio/ring.ogg');
   Sound names: ring, pickup, hangup, type, click, ui, notify, warn,
                footstep, sale, fail  (+ loops: ambience, buzz, fan)
   --------------------------------------------------------------------- */
const AudioManager = {
  ctx: null, master: null, vol: 0.6, custom: {}, loops: {}, ringTimer: null, noiseBuf: null,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.vol;
      this.master.connect(this.ctx.destination);
      this.noiseBuf = this._makeNoise(3);
      this.startLoops();
    } catch (e) { this.ctx = null; }
  },
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; },
  register(name, url) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    fetch(url).then(r => r.arrayBuffer()).then(b => this.ctx.decodeAudioData(b)).then(buf => { this.custom[name] = buf; }).catch(() => {});
  },
  play(name, vol = 1, pitch = 1) {
    if (!this.ctx || this.vol <= 0) return;
    try {
      if (this.custom[name]) {
        const s = this.ctx.createBufferSource(); s.buffer = this.custom[name]; s.playbackRate.value = pitch;
        const g = this.ctx.createGain(); g.gain.value = vol; s.connect(g).connect(this.master); s.start(); return;
      }
      const fn = this.synth[name]; if (fn) fn.call(this, vol, pitch);
    } catch (e) { /* audio must never break gameplay */ }
  },
  startRing() { this.stopRing(); this.play('ring'); this.ringTimer = setInterval(() => this.play('ring'), 3300); },
  stopRing() { if (this.ringTimer) { clearInterval(this.ringTimer); this.ringTimer = null; } },

  _makeNoise(sec) {
    const n = this.ctx.sampleRate * sec, b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }   // brownish noise
    return b;
  },
  _tone(freq, dur, type = 'sine', vol = 0.2, delay = 0, slide = 0) {
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.03);
  },
  _noise(dur, freq, vol, delay = 0, type = 'lowpass') {
    const t = this.ctx.currentTime + delay, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noiseBuf; s.playbackRate.value = 1.5 + Math.random();
    f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master); s.start(t, Math.random() * 2); s.stop(t + dur + 0.02);
  },
  startLoops() {
    const mk = (freq, type, vol) => {
      const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      s.buffer = this.noiseBuf; s.loop = true; f.type = type; f.frequency.value = freq; g.gain.value = vol;
      s.connect(f).connect(g).connect(this.master); s.start(); return g;
    };
    this.loops.ambience = mk(420, 'lowpass', 0.06);       // office room tone
    this.loops.fan = mk(260, 'bandpass', 0.05);           // computer fans
    const o = this.ctx.createOscillator(), o2 = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 120; o2.type = 'square'; o2.frequency.value = 240;
    f.type = 'lowpass'; f.frequency.value = 700; g.gain.value = 0.006;                        // fluorescent buzz
    o.connect(f); o2.connect(f); f.connect(g).connect(this.master); o.start(); o2.start();
    this.loops.buzz = g;
  },
  buzzLevel(v) { if (this.loops.buzz) this.loops.buzz.gain.value = 0.006 * v; },

  synth: {
    ring(v) { [0, 0.55].forEach(d => { this._tone(440, 0.42, 'sine', 0.13 * v, d); this._tone(480, 0.42, 'sine', 0.13 * v, d); this._tone(880, 0.42, 'triangle', 0.02 * v, d); }); },
    pickup(v) { this._noise(0.08, 1800, 0.25 * v, 0, 'highpass'); this._tone(320, 0.09, 'square', 0.05 * v, 0.03); },
    hangup(v) { this._tone(180, 0.18, 'square', 0.09 * v, 0, -80); this._noise(0.12, 500, 0.3 * v, 0.02); },
    type(v, p = 1) { this._noise(0.03, 2600 * p, 0.12 * v, 0, 'bandpass'); },
    click(v) { this._tone(1400, 0.03, 'square', 0.05 * v); this._noise(0.02, 3000, 0.08 * v, 0, 'highpass'); },
    ui(v) { this._tone(760, 0.05, 'square', 0.04 * v); },
    notify(v) { this._tone(880, 0.12, 'sine', 0.1 * v); this._tone(1320, 0.18, 'sine', 0.1 * v, 0.1); },
    warn(v) { this._tone(520, 0.2, 'sawtooth', 0.11 * v, 0, -120); this._tone(400, 0.28, 'sawtooth', 0.11 * v, 0.18, -140); },
    footstep(v) { this._noise(0.09, 260, 0.6 * v); this._tone(70, 0.08, 'sine', 0.2 * v); },
    sale(v) { [523, 659, 784].forEach((f, i) => this._tone(f, 0.16, 'triangle', 0.1 * v, i * 0.08)); },
    fail(v) { this._tone(300, 0.3, 'sawtooth', 0.08 * v, 0, -160); },
  },
};

/* ---------------------------------------------------------------------
   SaveSystem: localStorage wrapper. Always safe: fails silently if blocked.
   --------------------------------------------------------------------- */
const SaveSystem = {
  has() { return !!this.load(); },
  load() {
    try { const s = localStorage.getItem(CFG.SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  },
  save(data) {
    try { localStorage.setItem(CFG.SAVE_KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
  },
  clear() { try { localStorage.removeItem(CFG.SAVE_KEY); } catch (e) { /* ignore */ } },
};
