/* =====================================================================
   02_systems.js  -  Game logic. No rendering and no DOM in this file.
   TimeSystem, MoneySystem, NPCSystem, DialogueSystem, CallSystem
   (Trust/Suspicion live inside DialogueSystem.effect + CallSystem.choose),
   EventSystem, BossSystem, DaySystem.
   ===================================================================== */

const G = {
  mode: 'menu',            // menu | intro | play | review
  paused: false,
  day: 1,
  notes: '',
  career: null,
  today: null,
  buff: { coffee: false },
};

function freshCareer() { return { earned: 0, calls: 0, sales: 0, strikes: 0, bestDay: 0, days: [] }; }
function newToday(day) {
  const p = PROG.forDay(day);
  return { day, quota: p.quota, money: 0, annoy: 0, quotaAnnounced: false,
    stats: { success: 0, failed: 0, suspicion: 0, missed: 0, calls: 0 }, callLog: [], hourly: new Array(9).fill(0) };
}
G.career = freshCareer(); G.today = newToday(1);

const Equip = {
  has(id) { const e = EQUIPMENT.find(x => x.id === id); return !!e && G.day >= e.day; },
  unlocked() { return EQUIPMENT.filter(e => G.day >= e.day); },
  suspicionMult() { return this.has('headset') ? 0.9 : 1; },
  trustMult() { return this.has('binder') ? 1.1 : 1; },
  startPatience() { return this.has('coffee') ? 8 : 0; },
};

/* ------------------------------ TimeSystem ------------------------------ */
const TimeSystem = {
  minutes: CFG.DAY_START, acc: 0, running: false, lastEmitted: CFG.DAY_START,
  reset(m) { this.minutes = (m == null) ? CFG.DAY_START : m; this.acc = 0; this.lastEmitted = Math.floor(this.minutes); this.running = false; },
  update(dt) {
    if (!this.running) return;
    this.acc += dt;
    while (this.acc >= CFG.SEC_PER_MIN) { this.acc -= CFG.SEC_PER_MIN; this.minutes += 1; }
    this._emit();
  },
  add(m) { this.minutes += m; this._emit(); },
  _emit() { const f = Math.floor(this.minutes); if (f !== this.lastEmitted) { this.lastEmitted = f; Bus.emit('time', f); } },
  format(m) {
    if (m == null) m = this.minutes;
    let h = Math.floor(m / 60), mm = Math.floor(m % 60); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    return h + ':' + U.pad(mm) + ' ' + ap;
  },
  fraction() { return U.clamp((this.minutes - CFG.DAY_START) / (CFG.DAY_END - CFG.DAY_START), 0, 1); },
  ended() { return this.minutes >= CFG.DAY_END; },
};

/* ------------------------------ MoneySystem ------------------------------ */
const MoneySystem = {
  add(x) {
    const t = G.today, before = t.money;
    t.money += x; G.career.earned += x;
    const idx = U.clamp(Math.floor((TimeSystem.minutes - CFG.DAY_START) / 60), 0, 8);
    t.hourly[idx] += x;
    Bus.emit('money', t.money);
    if (before < t.quota && t.money >= t.quota) { t.quotaAnnounced = true; Bus.emit('quota:reached'); }
  },
  reached() { return G.today.money >= G.today.quota; },
};

/* ------------------------------ NPCSystem ------------------------------ */
const NPCSystem = {
  nextId: 1, roster: [], pending: [],
  reset() { this.roster = []; this.pending = []; },
  makeCaller(arch, day) {
    const hard = PROG.forDay(day).hard;
    const first = U.pick(NAMES[arch.g]), last = U.pick(NAMES.last);
    const c = {
      id: this.nextId++, archId: arch.id, arch, first, last, name: first + ' ' + last,
      callerId: first[0] + '. ' + last.toUpperCase(),
      age: U.randInt(arch.age[0], arch.age[1]),
      occupation: U.pick(arch.jobs), personality: arch.label,
      trust: U.clamp(U.randInt(arch.trust[0], arch.trust[1]) - Math.round(hard * 10), 0, 100),
      suspicion: U.clamp(U.randInt(arch.sus[0], arch.sus[1]) + Math.round(hard * 12), 0, 90),
      patience: U.clamp(U.randInt(arch.pat[0], arch.pat[1]) - Math.round(hard * 10), 15, 100),
      wealth: U.randInt(arch.wealth[0], arch.wealth[1]),
      emotion: arch.base,
      phone: '555-01' + U.pad(U.randInt(0, 99)),
      memory: { calls: 0, results: [], notes: [] },
      history: [], returning: false, lastResult: null,
    };
    return c;
  },
  pickArch(day, kind) {
    let pool = ARCHETYPES.filter(a => a.minDay <= day);
    if (kind) { const f = pool.filter(a => a.tags.includes(kind)); if (f.length) pool = f; }
    return U.pick(pool);
  },
  next(day) {
    const due = this.pending.findIndex(p => p.t <= 0);
    if (due >= 0) { const p = this.pending.splice(due, 1)[0]; p.caller.returning = true; return p.caller; }
    const forced = EventSystem.consumeForced();
    const arch = this.pickArch(day, forced);
    const c = this.makeCaller(arch, day);
    if (forced === 'suspicious') { c.suspicion = Math.min(80, c.suspicion + 12); c.trust = Math.max(0, c.trust - 8); }
    if (forced === 'angry') { c.patience = Math.max(15, c.patience - 12); c.emotion = 'angry'; }
    return c;
  },
  update(dt) { this.pending.forEach(p => { p.t -= dt; }); },
  queueCallback(c, delay) { this.pending.push({ caller: c, t: delay }); },
};

/* ------------------------------ DialogueSystem ------------------------------ */
const DialogueSystem = {
  stageOf(progress) { return progress < 25 ? 0 : progress < 50 ? 1 : progress < 75 ? 2 : 3; },
  playerLine(approach, stage) { return U.pick(PLAYER_LINES[approach][stage]); },
  callerLine(caller, key) {
    const by = LINES.by[caller.archId] || {};
    const pool = (by[key] && (Math.random() < 0.8 || !LINES.generic[key])) ? by[key] : (LINES.generic[key] || LINES.generic.objection);
    return U.pick(pool);
  },
  effect(call, approach) {
    const c = call.caller, a = c.arch, table = EFFECTS[approach];
    const e = table[call.intent] || table.objection;
    let t = e[0], s = e[1], p = e[2], g = e[3];
    const m = a.resp[approach];
    t = t > 0 ? t * m * Equip.trustMult() : t * (2 - m);
    s = s > 0 ? s * a.paranoia * (2 - m) * Equip.suspicionMult() : s * m;
    p = p < 0 ? p * a.impat : p;
    g = g > 0 ? g * m : g;
    if (p < 0 && (EventSystem.isActive('server') || EventSystem.isActive('network'))) p *= 1.25;
    const n = () => U.rand(0.8, 1.2);
    return { dt: Math.round(t * n()), ds: Math.round(s * n()), dp: Math.round(p * n()) - 1, dg: Math.round(g * n()) };
  },
  chooseIntent(call) {
    const c = call.caller, w = Object.assign({}, c.arch.w);
    if (c.suspicion >= 55) { w.accuse *= 3; w.objection *= 2; w.interest *= 0.3; }
    if (c.trust >= 60) { w.interest *= 3; w.accuse *= 0.3; }
    if (c.emotion === 'angry') w.angry *= 3;
    if (c.patience < 35) { w.angry *= 2; w.stall *= 0.5; }
    if (call.progress < 10) w.interest *= 0.3;
    if (call.stage >= 3) { w.question *= 1.5; w.interest *= 1.5; }
    return U.weighted(Object.keys(w).map(k => [k, w[k]]));
  },
  emotionOf(c, intent, call) {
    if (c.arch.flags.baiter && call.fakeInterest) return 'amused';
    if (intent === 'angry' || c.patience < 25) return 'angry';
    if (c.suspicion >= 55) return 'suspicious';
    if (intent === 'confused') return 'confused';
    if (c.trust >= 60) return 'friendly';
    return c.arch.base === 'angry' && c.patience > 45 ? 'calm' : c.arch.base;
  },
  successChance(call) {
    const c = call.caller;
    let p = 0.15 + (c.trust - 40) / 100 * 0.9 + (call.progress - 50) / 100 * 0.5 - (c.suspicion - 30) / 100 * 0.9 - c.arch.closeResist * 0.3;
    if (call.stage < 2) p *= 0.4;
    if (call.stage < 1) p *= 0.5;
    return U.clamp(p, 0.02, 0.95);
  },
  reward(call) {
    const c = call.caller;
    let r = CFG.WEALTH_PAY[c.wealth - 1] * (0.7 + 0.6 * c.trust / 100) * (1 - 0.3 * c.suspicion / 100);
    if (EventSystem.isActive('server')) r *= 0.85;
    return Math.max(10, Math.round(r / 10) * 10);
  },
};

/* ------------------------------ CallSystem ------------------------------ */
const CallSystem = {
  state: 'idle',          // idle | ringing | active | result
  incoming: null, active: null, result: null, nextTimer: 6, ringLeft: 0,

  reset() { this.state = 'idle'; this.incoming = null; this.active = null; this.result = null; this.nextTimer = 6; this.ringLeft = 0; AudioManager.stopRing(); },
  canRing() { return G.mode === 'play' && !TimeSystem.ended() && !EventSystem.isActive('network') && !EventSystem.blockCalls; },
  scheduleNext(short) {
    const d = G.day, base = Math.max(4, 11 - d);
    this.nextTimer = short ? U.rand(3, 6) : U.rand(base * 0.6, base * 1.6);
  },

  update(dt) {
    if (G.mode !== 'play') return;
    NPCSystem.update(dt);
    if (this.state === 'active' && this.active) { this.active.elapsed += dt; return; }
    if (this.state === 'idle') {
      if (!this.canRing()) return;
      this.nextTimer -= dt * (EventSystem.isActive('overload') ? 3.2 : 1);
      if (this.nextTimer <= 0) this.startRing(NPCSystem.next(G.day));
    } else if (this.state === 'ringing') {
      this.ringLeft -= dt;
      if (this.ringLeft <= 0) this.miss();
    }
  },
  startRing(caller) {
    this.incoming = caller; this.state = 'ringing'; this.ringLeft = CFG.RING_TIMEOUT * (EventSystem.isActive('overload') ? 0.7 : 1);
    AudioManager.startRing();
    Bus.emit('call:ring', caller);
  },
  miss() {
    AudioManager.stopRing();
    G.today.stats.missed++; BossSystem.adjust(2);
    if (this.incoming && this.incoming.arch.flags.callback && U.chance(0.4)) NPCSystem.queueCallback(this.incoming, U.rand(30, 60));
    this.incoming = null; this.state = 'idle'; this.scheduleNext(false);
    Bus.emit('call:missed'); Bus.emit('toast', { text: 'Missed call. The boss sees everything.', kind: 'warn' });
  },
  cancelRing() { if (this.state === 'ringing') { AudioManager.stopRing(); this.incoming = null; this.state = 'idle'; Bus.emit('call:idle'); } },

  answer() {
    if (this.state !== 'ringing' || !this.incoming) return false;
    AudioManager.stopRing(); AudioManager.play('pickup');
    const c = this.incoming; this.incoming = null;
    c.memory.calls++;
    if (!NPCSystem.roster.includes(c)) NPCSystem.roster.push(c);
    let intent = 'greet';
    if (c.returning) {
      c.suspicion = Math.min(90, c.suspicion + 10); c.trust = Math.max(0, c.trust - 5); c.patience = Math.min(c.patience, 60);
      c.memory.notes.push('Called back after an earlier call.'); intent = 'callback_greet';
    }
    if (G.buff.coffee) { c.patience = Math.min(100, c.patience + 10); G.buff.coffee = false; }
    c.patience = Math.min(100, c.patience + Equip.startPatience());
    c.emotion = c.arch.base;
    const call = { caller: c, stage: 0, progress: 0, intent, log: [], turns: 0, elapsed: 0, flags: {}, over: false, fakeInterest: false, startMin: TimeSystem.minutes };
    call.log.push({ who: 'caller', text: DialogueSystem.callerLine(c, intent === 'callback_greet' ? 'callback_greet' : 'greet') });
    if (intent === 'callback_greet') call.intent = 'greet';
    this.active = call; this.state = 'active';
    Bus.emit('call:start', call);
    Bus.emit('call:turn', { entries: call.log.slice() });
    return true;
  },

  /* One player action. approach: friendly|confident|pressure|reassure|change|close|end */
  choose(approach) {
    const call = this.active; if (!call || call.over || this.state !== 'active') return;
    const c = call.caller, entries = [];
    const say = (who, text, kind) => { const e = { who, text, kind }; entries.push(e); call.log.push(e); };

    if (approach === 'end') { say('you', END_LINE); return this._finish('abandoned', entries); }
    if (approach === 'close') return this._attemptClose(entries, say);

    say('you', DialogueSystem.playerLine(approach, call.stage));
    this._applyApproach(call, approach, say);
    return this._afterPlayerTurn(entries, say);
  },

  _applyApproach(call, approach, say) {
    const c = call.caller;
    const e = DialogueSystem.effect(call, approach);
    c.trust = U.clamp(c.trust + e.dt, 0, 100);
    c.suspicion = U.clamp(c.suspicion + e.ds, 0, 100);
    c.patience = U.clamp(c.patience + e.dp, 0, 100);
    call.progress = U.clamp(call.progress + e.dg, 0, 100);
    call.stage = DialogueSystem.stageOf(call.progress);
    call.turns++; TimeSystem.add(CFG.TURN_MINUTES);
    if (call.intent === 'stall' && (c.arch.flags.chatty || c.arch.flags.baiter)) { TimeSystem.add(3); say('sys', 'They talk for a while. Time is passing...', 'info'); }
  },

  /* ---- FREE-TEXT turn: the player types (or speaks) whatever they want. ----
     The local AI classifies HOW it was said (friendly/pressure/...) and writes the
     customer's reply. The game's own math (trust/suspicion/patience/odds) still decides
     the outcome, so balance stays the same. If the AI is down, a keyword fallback is used. */
  async submitText(raw) {
    const call = this.active;
    if (!call || call.over || this.state !== 'active' || call.thinking) return false;
    const text = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!text) return false;
    const c = call.caller;
    call.thinking = true;
    call.log.push({ who: 'you', text });
    Bus.emit('call:turn', { entries: [{ who: 'you', text }] });
    Bus.emit('call:thinking', true);
    const baitOn = !!(c.arch.flags.baiter && call.fakeInterest);
    const plan = { willBuy: baitOn || Math.random() < DialogueSystem.successChance(call), overheard: EventSystem.isActive('argument') && U.chance(0.35) };
    let ai = null;
    try { ai = await LLM.callerTurn(call, text, plan); } catch (e) { ai = null; }
    if (this.active !== call || call.over || this.state !== 'active') { call.thinking = false; Bus.emit('call:thinking', false); return false; }
    call.thinking = false; Bus.emit('call:thinking', false);
    const ok = !!(ai && ai.ok);
    const entries = [], say = (who, t, kind) => { const e = { who, text: t, kind }; entries.push(e); call.log.push(e); };
    let approach = ok ? ai.approach : Heur.classify(text);
    if (approach === 'end' && !Heur.isGoodbye(text)) approach = 'confident';
    if (approach === 'end') return this._finish('abandoned', entries, say);
    if (approach === 'close') return this._attemptClose(entries, say, { typed: true, willBuy: plan.willBuy, reply: ok ? ai.reply : null });
    this._applyApproach(call, approach, say);
    if (!ok) return this._afterPlayerTurn(entries, say);
    const pack = { intent: ai.intent, reply: ai.reply, overheard: plan.overheard, volunteer: false };
    if (c.suspicion < 100 && c.patience > 0 && this._volunteerCheck(call)) {
      pack.volunteer = true;
      pack.reply = (await LLM.finalLine(call, true)) || null;
      if (this.active !== call || call.over || this.state !== 'active') return false;
    }
    return this._afterPlayerTurn(entries, say, pack);
  },

  _volunteerCheck(call) {
    const c = call.caller;
    return call.stage >= 3 && c.trust >= 72 && c.suspicion < 45 && !(c.arch.flags.baiter && call.fakeInterest) && U.chance(0.5);
  },

  _afterPlayerTurn(entries, say, ai) {
    const call = this.active, c = call.caller;
    if (c.suspicion >= 100) return this._finish('suspicion', entries, say);
    if (c.patience <= 0) return this._finish('patience', entries, say);
    if (c.suspicion >= 50 && !call.flags.warned) {
      call.flags.warned = true; call.flags.incident = true; G.today.stats.suspicion++;
      say('sys', 'CALLER BECOMES SUSPICIOUS', 'warn'); AudioManager.play('warn'); Bus.emit('banner', { text: 'CALLER BECOMES SUSPICIOUS', kind: 'warn' });
    }
    // Next caller intent
    let intent = (ai && ai.intent) ? ai.intent : DialogueSystem.chooseIntent(call);
    if (ai ? ai.overheard : (EventSystem.isActive('argument') && U.chance(0.35))) { intent = 'overheard'; c.suspicion = U.clamp(c.suspicion + 5, 0, 100); }
    if (c.arch.flags.baiter && intent === 'interest' && c.trust >= 40) call.fakeInterest = true;
    call.intent = intent;
    c.emotion = DialogueSystem.emotionOf(c, intent, call);
    // Caller may volunteer to buy when the call has gone very well
    if (ai ? ai.volunteer : this._volunteerCheck(call)) {
      say('caller', (ai && ai.reply) || DialogueSystem.callerLine(c, 'agree'));
      return this._finish('sale', entries, say);
    }
    say('caller', (ai && ai.reply) || DialogueSystem.callerLine(c, intent));
    if (c.suspicion >= 100) return this._finish('suspicion', entries, say);   // e.g. overheard remark tipped it over
    Bus.emit('call:turn', { entries });
    return null;
  },

  _attemptClose(entries, say, opt) {
    const call = this.active, c = call.caller;
    if (!(opt && opt.typed)) say('you', CLOSE_LINE);
    call.turns++; TimeSystem.add(CFG.TURN_MINUTES);
    const win = (opt && opt.typed) ? !!opt.willBuy : Math.random() < DialogueSystem.successChance(call);
    const voice = (key) => (opt && opt.reply && ((key === 'agree') === !!opt.willBuy)) ? opt.reply : DialogueSystem.callerLine(c, key);
    if (c.arch.flags.baiter && call.fakeInterest) {
      say('caller', voice('agree'));
      return this._finish('baited', entries, say);
    }
    if (win) {
      say('caller', voice('agree'));
      return this._finish('sale', entries, say);
    }
    say('caller', voice('refuse'));
    c.suspicion = U.clamp(c.suspicion + 15, 0, 100); c.patience = U.clamp(c.patience - 20, 0, 100);
    c.trust = U.clamp(c.trust - 8, 0, 100); call.progress = U.clamp(call.progress - 10, 0, 100);
    call.stage = DialogueSystem.stageOf(call.progress);
    call.intent = 'objection'; c.emotion = DialogueSystem.emotionOf(c, 'objection', call);
    if (c.suspicion >= 100) return this._finish('suspicion', entries, say);
    if (c.patience <= 0) return this._finish('patience', entries, say);
    if (c.suspicion >= 50 && !call.flags.warned) {
      call.flags.warned = true; call.flags.incident = true; G.today.stats.suspicion++;
      say('sys', 'CALLER BECOMES SUSPICIOUS', 'warn'); AudioManager.play('warn'); Bus.emit('banner', { text: 'CALLER BECOMES SUSPICIOUS', kind: 'warn' });
    }
    Bus.emit('call:turn', { entries });
    return null;
  },

  _finish(reason, entries, say) {
    const call = this.active; if (!call || call.over) return;
    call.over = true;
    const c = call.caller, t = G.today;
    if (reason === 'suspicion') { say && say('caller', DialogueSystem.callerLine(c, 'hang_sus')); if (!call.flags.incident) { call.flags.incident = true; t.stats.suspicion++; } }
    if (reason === 'patience') { say && say('caller', DialogueSystem.callerLine(c, 'hang_pat')); }
    if (reason === 'baited' && !call.flags.incident) { call.flags.incident = true; t.stats.suspicion++; }
    let money = 0, title, detail, good = false;
    switch (reason) {
      case 'sale': money = DialogueSystem.reward(call); title = 'SALE COMPLETED'; detail = c.name + ' accepted the ' + CFG.PLAN + '.'; good = true; t.stats.success++; BossSystem.adjust(-2); break;
      case 'suspicion': title = 'CALL ENDED'; detail = c.name + ' became too suspicious and hung up.'; t.stats.failed++; BossSystem.adjust(3); break;
      case 'patience': title = 'CALLER HUNG UP'; detail = c.name + ' ran out of patience.'; t.stats.failed++; BossSystem.adjust(1); break;
      case 'baited': title = 'BAITED'; detail = c.name + ' was streaming the call. Nobody is laughing at the office.'; t.stats.failed++; BossSystem.adjust(4); break;
      default: title = 'CALL ABANDONED'; detail = 'You hung up on ' + c.name + '.'; t.stats.failed++; BossSystem.adjust(1);
    }
    t.stats.calls++;
    if (money > 0) MoneySystem.add(money);
    const res = { reason, title, detail, good, money, name: c.name, trust: c.trust, suspicion: c.suspicion,
      turns: call.turns, duration: call.elapsed, archLabel: c.arch.label, time: TimeSystem.format() };
    t.callLog.push({ time: res.time, name: c.name, arch: c.arch.label, result: title, money, dur: Math.round(call.elapsed), trust: c.trust, sus: c.suspicion });
    c.memory.results.push(reason); c.lastResult = reason; c.history = call.log.slice();
    if ((reason === 'patience' || reason === 'abandoned') && c.arch.flags.callback && U.chance(0.55)) NPCSystem.queueCallback(c, U.rand(40, 90));
    AudioManager.play('hangup'); AudioManager.play(good ? 'sale' : 'fail', 0.8);
    this.result = res; this.state = 'result';
    Bus.emit('call:turn', { entries });
    Bus.emit('call:result', res);
    return res;
  },

  dismissResult() {
    if (this.state !== 'result') return;
    this.active = null; this.result = null; this.state = 'idle'; this.scheduleNext(false);
    Bus.emit('call:idle');
  },
};

/* ------------------------------ EventSystem ------------------------------ */
const EventSystem = {
  active: {}, timer: 30, forced: null, deferred: [], blockCalls: false, last: null,
  reset(day) {
    this.active = {}; this.forced = null; this.deferred = []; this.blockCalls = false; this.last = null;
    const g = PROG.forDay(day).eventGap; this.timer = U.rand(g[0], g[1]) * 0.8;
  },
  isActive(id) { return this.active[id] > 0; },
  consumeForced() { const f = this.forced; this.forced = null; return f; },
  update(dt) {
    if (G.mode !== 'play') return;
    for (const id of Object.keys(this.active)) {
      this.active[id] -= dt;
      if (this.active[id] <= 0) { delete this.active[id]; Bus.emit('event:end', { id }); }
    }
    if (this.deferred.length && CallSystem.state === 'idle') { const id = this.deferred.shift(); this._start(id); }
    this.timer -= dt;
    if (this.timer <= 0) {
      const g = PROG.forDay(G.day).eventGap; this.timer = U.rand(g[0], g[1]);
      this.trigger(this.pick());
    }
  },
  pick() {
    const pool = EVENTS.filter(e => e.minDay <= G.day && e.id !== this.last && !this.isActive(e.id));
    const def = U.weighted(pool.map(e => [e, e.w]));
    this.last = def.id; return def.id;
  },
  trigger(id) {
    if (id === 'meeting') {
      if (TimeSystem.minutes > CFG.DAY_END - 40) return;       // no meetings near clock-out
      if (CallSystem.state !== 'idle') { this.deferred.push(id); return; }
    }
    this._start(id);
  },
  _start(id) {
    const def = EVENTS.find(e => e.id === id); if (!def) return;
    if (def.dur > 1) this.active[id] = def.dur;
    if (id === 'suspicious') this.forced = 'suspicious';
    if (id === 'angrycall') this.forced = 'angry';
    if (id === 'overload') CallSystem.nextTimer = Math.min(CallSystem.nextTimer, 2);
    if (id === 'meeting') this.blockCalls = true;
    if (def.text) Bus.emit('toast', { text: def.text, kind: (id === 'suspicious' || id === 'angrycall' || id === 'network' || id === 'server') ? 'warn' : 'info' });
    if (id !== 'meeting') AudioManager.play('notify', 0.6);
    Bus.emit('event:start', { id, def });
  },
  endMeeting() { this.blockCalls = false; TimeSystem.add(15); BossSystem.adjust(-3); Bus.emit('event:end', { id: 'meeting' }); },
};

/* ------------------------------ BossSystem ------------------------------ */
const BossSystem = {
  state: 'office',   // office | coming | watching | leaving
  timer: 90, watch: 0, chat: null, awaiting: false, tok: 0,
  reset(day) { this.state = 'office'; this.chat = null; this.awaiting = false; this.tok++; const g = PROG.forDay(day).bossGap; this.timer = U.rand(g[0], g[1]); },
  adjust(n) { const t = G.today; t.annoy = U.clamp(t.annoy + n * PROG.forDay(G.day).bossDemand, 0, 100); Bus.emit('boss:annoy', t.annoy); },
  update(dt) {
    if (G.mode !== 'play') return;
    if (this.state === 'office') { this.timer -= dt; if (this.timer <= 0) this.startVisit(); }
    else if (this.state === 'watching') { if (this.chat || this.awaiting) return; this.watch -= dt; if (this.watch <= 0) { this.state = 'leaving'; Bus.emit('boss:leave'); } }
  },
  startVisit() {
    if (this.state !== 'office') return;
    this.state = 'coming'; Bus.emit('boss:visit');
    Bus.emit('toast', { text: 'Heavy footsteps in the hallway...', kind: 'warn' });
  },
  arrived() { this.state = 'watching'; this.watch = 7; this.evaluate(); },
  returned() { this.state = 'office'; const g = PROG.forDay(G.day).bossGap; this.timer = U.rand(g[0], g[1]); },
  evaluate() {
    const t = G.today, ahead = t.money / t.quota - TimeSystem.fraction();
    let msg, delta, see;
    if (CallSystem.state === 'ringing') { msg = "\"Answer your phone!\""; delta = 5; see = 'The agent\'s phone is ringing and they are not answering it.'; }
    else if (CallSystem.state === 'active' || CallSystem.state === 'result') {
      const c = CallSystem.active && CallSystem.active.caller;
      if (c && c.suspicion >= 55) { msg = "\"Keep it clean. Customers complain to me, not to you.\""; delta = 8; see = 'The agent is on a call with a customer who has become suspicious.'; }
      else if (CallSystem.active && CallSystem.active.stage >= 2) { msg = "\"Good. Keep them talking. Close.\""; delta = -3; see = 'The agent is on a call that is going well; the customer is close to buying.'; }
      else { msg = "\"Don't waste time on small talk.\""; delta = 2; see = 'The agent is on a call but seems to be wasting time on small talk.'; }
    }
    else if (!Player.sitting) { msg = "\"Why aren't you at your desk?\""; delta = 6; see = 'The agent is away from their desk, wandering around the office.'; }
    else if (ahead < -0.15) { msg = "\"You're behind quota. Fix it.\""; delta = 5; see = 'The agent is at their desk but is clearly behind on the daily quota.'; }
    else { msg = "\"Numbers look fine. Don't get comfortable.\""; delta = -2; see = 'The agent is at their desk and the numbers look acceptable.'; }
    this.adjust(delta);
    const sit = { text: see, day: G.day, money: t.money, quota: t.quota, time: TimeSystem.format(), annoy: t.annoy };
    if (LLM.enabled()) this._greetAI(msg, sit); else Bus.emit('toast', { text: 'BOSS: ' + msg, kind: 'boss' });
  },

  /* AI boss: speaks a line fitted to the situation. If you are free, you can answer him. */
  async _greetAI(canned, sit) {
    const tok = ++this.tok; this.awaiting = true; this.watch = 60;
    const r = await LLM.bossLine(sit, [], null);
    if (tok !== this.tok) return;
    this.awaiting = false;
    const free = CallSystem.state === 'idle' && G.mode === 'play' && !UI.anyModal() && !UI.inFocus();
    if (r.ok && free) { this.chat = { sit, history: [{ who: 'boss', text: r.reply }], turns: 0, busy: false }; this.watch = 3; Bus.emit('boss:chat', this.chat); }
    else { this.watch = 5; Bus.emit('toast', { text: 'BOSS: "' + (r.ok ? r.reply : canned.replace(/^"|"$/g, '')) + '"', kind: 'boss' }); if (r.ok) Bus.emit('boss:said', r.reply); }
  },
  async reply(raw) {
    const ch = this.chat; if (!ch || ch.busy || ch.turns >= 2) return;
    const text = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 240); if (!text) return;
    ch.busy = true; const before = ch.history.slice(); ch.history.push({ who: 'you', text }); Bus.emit('boss:chat', ch);
    const r = await LLM.bossLine(ch.sit, before, text);
    if (this.chat !== ch) return;
    const delta = r.ok ? r.delta : Heur.bossDelta(text);
    this.adjust(delta);
    ch.history.push({ who: 'boss', text: r.ok ? r.reply : U.pick(['"Noted. Get back to work."', '"I\'ll pretend that was productive."', '"Quota. Think about the quota."']).replace(/^"|"$/g, '') });
    ch.turns++; ch.busy = false; Bus.emit('boss:chat', ch);
  },
  closeChat() { if (!this.chat) return; this.chat = null; this.watch = 1.5; Bus.emit('boss:chatclosed'); },
};

/* ------------------------------ DaySystem ------------------------------ */
const DaySystem = {
  setup(day, mid) {
    G.day = day; G.today = newToday(day);
    if (mid && mid.today) Object.assign(G.today, mid.today);
    TimeSystem.reset(mid ? mid.minutes : undefined);
    CallSystem.reset(); NPCSystem.reset(); EventSystem.reset(day); BossSystem.reset(day);
    G.buff = { coffee: false };
  },
  review(early) {
    const t = G.today, ratio = t.money / t.quota;
    const rating = ratio >= 1.25 ? 'Outstanding' : ratio >= 1 ? 'Target Met' : ratio >= 0.75 ? 'Below Target' : ratio >= 0.4 ? 'Poor' : 'Unacceptable';
    const strike = ratio < 0.4 || t.annoy >= 95 || (early && ratio < 1);
    if (strike) G.career.strikes++;
    G.career.calls += t.stats.calls; G.career.sales += t.stats.success;
    G.career.bestDay = Math.max(G.career.bestDay, t.money);
    G.career.days.push({ day: G.day, money: t.money, quota: t.quota, rating });
    const fired = G.career.strikes >= CFG.MAX_STRIKES;
    const quotes = {
      'Outstanding': "\"Adequate. Tomorrow the number goes up, obviously.\"",
      'Target Met': "\"You hit it. Don't make a face about it.\"",
      'Below Target': "\"Close is a word for people who lose.\"",
      'Poor': "\"I've seen houseplants with better numbers.\"",
      'Unacceptable': "\"Clean out your desk. Actually, just stay and make it up tomorrow.\"",
    };
    const next = G.day + 1;
    const review = { day: G.day, money: t.money, quota: t.quota, success: t.stats.success, failed: t.stats.failed,
      suspicion: t.stats.suspicion, missed: t.stats.missed, rating, strike, strikes: G.career.strikes, fired,
      annoy: Math.round(t.annoy), quote: quotes[rating], early: !!early, unlocks: fired ? [] : PROG.unlockText(next), career: G.career.earned };
    if (fired) SaveSystem.clear();
    else SaveSystem.save({ v: 1, day: next, career: G.career, notes: G.notes });
    return review;
  },
  saveMid() {
    const t = G.today;
    return SaveSystem.save({ v: 1, day: G.day, career: G.career, notes: G.notes,
      mid: { minutes: TimeSystem.minutes, today: { money: t.money, annoy: t.annoy, stats: t.stats, callLog: t.callLog, hourly: t.hourly, quotaAnnounced: t.quotaAnnounced } } });
  },
};
