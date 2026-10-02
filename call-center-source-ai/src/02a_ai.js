/* =====================================================================
   02a_ai.js  -  Local AI bridge. No cloud, no API key, $0.
   - LLM    : talks to a model running on THIS computer (Ollama by default,
              or any OpenAI-compatible local server such as LM Studio).
   - Heur   : offline fallback (keyword classifier) so the game never breaks.
   - Speech : optional microphone input + spoken replies (browser built-ins).
   ===================================================================== */

const AISettings = {
  KEY: 'globecom_ai_v1',
  d: { enabled: true, endpoint: 'http://localhost:11434', model: 'llama3.2:3b', lang: 'English', voice: false },
  load() { try { const s = localStorage.getItem(this.KEY); if (s) Object.assign(this.d, JSON.parse(s)); } catch (e) { /* ignore */ } },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.d)); } catch (e) { /* ignore */ } },
  speechLang() { return this.d.lang === 'Serbian' ? 'sr-RS' : 'en-US'; },
};
AISettings.load();

const APPROACH_IDS = ['friendly', 'confident', 'pressure', 'reassure', 'change', 'close', 'end'];
const CALLER_INTENTS = ['question', 'objection', 'stall', 'accuse', 'interest', 'confused', 'angry'];

const ARCH_BLURB = {
  nervous_man: 'Anxious and polite. Worries about being tricked or making a mistake, apologizes a lot, calms down when reassured.',
  suspicious_woman: 'Sharp and distrustful. Asks for proof, company details and a callback number. Hates pushiness.',
  friendly_elder: 'Warm and rambling. Loves to chat, tells little stories from his working years, agreeable but easily distracted.',
  confused_elder: 'Hard of hearing and forgetful. Mixes up what is being offered, asks for things to be repeated. Sweet.',
  angry_biz: 'Impatient, brusque, important. Hates being interrupted, respects directness, threatens to hang up.',
  exhausted: 'Tired and monotone. Wants the call over. Short sentences, the occasional sigh.',
  techie: 'Skeptical and technical. Asks pointed questions about fees, terms, privacy and how you got his number. Dry sarcasm.',
  trusting: 'Sweet, open and far too trusting. Enthusiastic, asks innocent questions.',
  paranoid: 'Convinced everything is a scam or surveillance. Accuses, hostile, conspiratorial.',
  baiter: 'Secretly recording the call for a comedy channel. Plays along with fake enthusiasm, asks absurd questions, stalls for laughs.',
  aggressive: 'Loud, rude, confrontational. Demands a manager. Mild swearing at most, never slurs.',
  confused_customer: 'Does not understand what is being offered. Keeps asking basic questions, easily flustered.',
  chatty: 'Lonely. Talks about her late husband, her cats and her neighbours. Wants company and derails the call.',
  broke_student: 'Almost no money and says so. Asks about the price. Polite but cannot afford anything.',
};

/* ------------------------- offline fallback ------------------------- */
const Heur = {
  isGoodbye: t => /\b(good\s?bye|bye|hang up|have a (good|nice|great) (day|one|evening)|talk (to you )?later|that'?s all)\b/i.test(t) || /(dovi[dđ]enja|ćao|cao)/i.test(t),
  classify(t) {
    if (this.isGoodbye(t)) return 'end';
    if (/\b(sign|buy|purchase|finali[sz]e|confirm|go ahead|sign you up|do we have a deal|shall (we|i)|ready to (start|sign|go)|activate|enroll|subscribe|proceed)\b/i.test(t)) return 'close';
    if (/\b(now|today only|right now|limited|expires?|last chance|hurry|running out|miss out|decide|immediately|deadline)\b/i.test(t)) return 'pressure';
    if (/\b(don'?t worry|no worries|no obligation|guarantee[d]?|safe|secure|promise|rest assured|i understand|trust me|no risk|cancel anytime)\b/i.test(t)) return 'reassure';
    if (/\b(weather|weekend|game last night|lunch|dinner|how'?s your day|how are you|family|kids|pets?|cat|dog|vacation|football|movie)\b/i.test(t)) return 'change';
    if (/\b(please|thank|thanks|lovely|nice|happy|hope|great|wonderful|pleasure|hello|hi there|good (morning|afternoon|evening))\b/i.test(t)) return 'friendly';
    return 'confident';
  },
  bossDelta(t) {
    if (/\b(sorry|will do|understood|yes sir|yes boss|on it|right away|you'?re right|my fault)\b/i.test(t)) return -2;
    if (/\b(shut up|idiot|stupid|hate|quit|whatever|screw|damn)\b/i.test(t)) return 6;
    return 1;
  },
};

/* ------------------------- local LLM ------------------------- */
const LLM = {
  online: null, warm: false, lastErr: '', warned: false, _warmP: null,

  enabled() { return !!AISettings.d.enabled && typeof fetch === 'function'; },
  _base() { return String(AISettings.d.endpoint || '').replace(/\/+$/, ''); },
  _openai() { return /\/v1$/.test(this._base()); },

  async _chat(system, user, schema, o = {}) {
    const S = AISettings.d, base = this._base(), openai = this._openai();
    if (this._warmP && !o.noWait) { try { await this._warmP; } catch (e) { /* ignore */ } }   // let the model finish loading first
    const ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const limit = o.timeout || (this.warm ? 120000 : 240000);
    const timer = ctl ? setTimeout(() => ctl.abort(), limit) : null;
    try {
      const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
      let fmt = schema, tries = 0;
      for (;;) {
        tries++;
        let url, body;
        if (openai) {
          url = base + '/chat/completions';
          body = { model: S.model, messages, temperature: 0.8, max_tokens: o.max || 120, response_format: { type: 'json_object' } };
        } else {
          url = base + '/api/chat';
          body = { model: S.model, messages, stream: false, format: fmt, keep_alive: '30m', options: { temperature: 0.8, num_predict: o.max || 120, num_ctx: 2048 } };
        }
        let r;
        try { r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined }); }
        catch (e) {
          if (e && e.name === 'AbortError') throw new Error('timeout after ' + Math.round(limit / 1000) + 's - the model is too slow on this PC, try model llama3.2:1b');
          throw new Error('browser blocked or could not send the request (' + ((e && e.message) || e) + '). Open the game with start-game.bat, not by double-clicking the html.');
        }
        if (!r.ok) {
          let t = ''; try { t = (await r.text() || '').slice(0, 160); } catch (e) { /* ignore */ }
          if (!openai && fmt && fmt !== 'json' && r.status === 400 && tries < 2) { fmt = 'json'; continue; }   // older Ollama: no schema support
          throw new Error('HTTP ' + r.status + (t ? ' ' + t : '') + (r.status === 403 ? ' (Ollama refused this page: set OLLAMA_ORIGINS, see README)' : ''));
        }
        const d = await r.json();
        const txt = openai ? d.choices[0].message.content : d.message.content;
        this.warm = true; this._status(true);
        return txt;
      }
    } finally { if (timer) clearTimeout(timer); }
  },
  _parse(raw) {
    if (raw && typeof raw === 'object') return raw;
    const s = String(raw || '');
    try { return JSON.parse(s); } catch (e) { /* try to extract */ }
    const m = s.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch (e) { /* ignore */ } }
    return null;
  },
  _clean(s) {
    s = String(s || '').replace(/\*[^*]*\*/g, '').replace(/^\s*(customer|caller|boss|player)\s*:\s*/i, '').replace(/^["“”]+|["“”]+$/g, '').replace(/\s+/g, ' ').trim();
    if (s.length > 280) s = s.slice(0, 277).replace(/\s\S*$/, '') + '...';
    return s;
  },
  _status(on) { if (this.online !== on) { this.online = on; Bus.emit('ai:status', on); } },
  _fail(e) {
    this.lastErr = (e && e.name === 'AbortError') ? 'timeout' : String((e && e.message) || e);
    this._status(false);
    Bus.emit('ai:error', this.lastErr);
    if (!this.warned) { this.warned = true; Bus.emit('toast', { text: 'Local AI problem: ' + this.lastErr + '  (using simple offline replies)', kind: 'warn' }); }
  },

  /* Preload the model when the shift starts so the first call is not slow. */
  warmup() {
    if (!this.enabled()) return Promise.resolve();
    if (this._warmP) return this._warmP;
    this._warmP = (async () => {
      try {
        if (this._openai()) await this._chat('Reply with OK.', 'ping', null, { max: 1, timeout: 240000, noWait: true });
        else {
          const ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
          const timer = ctl ? setTimeout(() => ctl.abort(), 240000) : null;
          try {
            const r = await fetch(this._base() + '/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: AISettings.d.model, prompt: '', keep_alive: '30m' }), signal: ctl ? ctl.signal : undefined });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            this.warm = true; this._status(true);
          } finally { if (timer) clearTimeout(timer); }
        }
      } catch (e) { this._fail(e); }
      finally { this._warmP = null; }
    })();
    return this._warmP;
  },

  /* Settings screen: server up? model installed? and does a REAL chat request work (and how fast)? */
  async test() {
    const S = AISettings.d, base = this._base();
    try {
      const r = await fetch(base + (this._openai() ? '/models' : '/api/tags'));
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      const names = this._openai() ? (d.data || []).map(m => m.id) : (d.models || []).map(m => m.name);
      const has = names.some(n => n === S.model || n.split(':')[0] === S.model);
      if (!has) return { ok: false, msg: 'Server is running, but model "' + S.model + '" is not installed. Run:  ollama pull ' + S.model };
    } catch (e) {
      return { ok: false, msg: 'Cannot reach ' + base + '. Is Ollama running? If you opened the game as a file, use start-game.bat / start-game.sh instead.' };
    }
    const t0 = Date.now();
    try {
      const raw = await this._chat('Reply ONLY with JSON: {"reply":"hello"}', 'Say hello.', { type: 'object', properties: { reply: { type: 'string' } }, required: ['reply'] }, { max: 24, timeout: 240000 });
      const j = this._parse(raw), sec = Math.round((Date.now() - t0) / 100) / 10;
      if (!j || !j.reply) return { ok: false, msg: 'Server answered, but the model returned something unreadable: ' + String(raw).slice(0, 80) };
      return { ok: true, msg: 'Connected, model works. Test reply took ' + sec + 's (first one includes loading the model).' + (sec > 15 ? ' That is slow: try model llama3.2:1b.' : '') };
    } catch (e) {
      return { ok: false, msg: 'Server is up and the model is installed, but a real chat request FAILED: ' + ((e && e.message) || e) };
    }
  },

  /* ---------- customer ---------- */
  _callerSystem(call, plan) {
    const c = call.caller, a = c.arch, L = AISettings.d.lang || 'English';
    const nice = { friendly: 'warmth and rapport', confident: 'calm professional confidence', pressure: 'pushy pressure', reassure: 'gentle reassurance', change: 'off-topic small talk' };
    const likes = [], dislikes = [];
    for (const k in a.resp) { if (a.resp[k] >= 1.25) likes.push(nice[k]); else if (a.resp[k] <= 0.55) dislikes.push(nice[k]); }
    const trust = c.trust < 25 ? 'distrustful' : c.trust < 50 ? 'wary' : c.trust < 70 ? 'warming up' : 'trusting';
    const sus = c.suspicion < 25 ? 'not suspicious' : c.suspicion < 50 ? 'a little suspicious' : c.suspicion < 75 ? 'very suspicious' : 'convinced this is a scam';
    const pat = c.patience < 25 ? 'about to hang up' : c.patience < 50 ? 'getting impatient' : 'patient';
    const decision = (a.flags.baiter && call.fakeInterest)
      ? 'If the player asks you to buy/sign/confirm, act delighted and agree (you are only baiting them).'
      : plan.willBuy ? 'If the player asks you to buy/sign/confirm, you AGREE (say yes, in your own style).'
        : 'If the player asks you to buy/sign/confirm, you REFUSE for now (give a reason in character).';
    return [
      'You are role-playing a PHONE CUSTOMER in a satirical dark-comedy video game. The player is a telemarketer at "' + CFG.COMPANY + '" trying to sell a fictional, vaguely described "' + CFG.PLAN + '". Everything is fictional.',
      'You play ONLY the customer. Stay in character. Speak naturally on the phone in 1-2 SHORT sentences. No stage directions, no emojis, never mention AI, games or rules. Language: ' + L + '.',
      'CUSTOMER: ' + c.name + ', ' + c.age + ', ' + c.occupation + '. Type: ' + a.label + '. ' + (ARCH_BLURB[c.archId] || ''),
      'You respond well to: ' + (likes.join(', ') || 'honesty') + '. You react badly to: ' + (dislikes.join(', ') || 'rudeness') + '.',
      'RIGHT NOW you feel: ' + trust + ', ' + sus + ', ' + pat + '. Mood: ' + c.emotion + '.' + (call.stage >= 2 ? ' The pitch is already well underway.' : call.stage === 0 ? ' The call has barely started.' : ''),
      'React to what the player actually says. Pushy, rude or evasive = you get more suspicious or annoyed. Warm, honest, clear = you soften a little. Do not agree to buy unless the hidden decision below says so.',
      decision,
      plan.overheard ? 'You can hear loud shouting in the background at the player\'s office. Mention it suspiciously.' : '',
      'Never give out real card numbers, passwords or ID numbers. If asked, refuse or get suspicious.',
      'Return ONLY JSON: {"approach": <how the PLAYER just spoke: friendly | confident | pressure | reassure | change | close | end>, "intent": <what YOUR reply expresses: question | objection | stall | accuse | interest | confused | angry>, "reply": <your spoken words>}',
      'approach meanings: friendly=warm rapport; confident=firm professional pitch; pressure=urgency, pushing, fear of missing out; reassure=calming doubts, promises, no-obligation; change=off-topic small talk or deflecting; close=explicitly asks you to buy/sign/agree/confirm now; end=says goodbye / ends the call.',
    ].filter(Boolean).join('\n');
  },
  _callerUser(call, text) {
    const hist = call.log.slice(0, -1).filter(e => e.who === 'you' || e.who === 'caller').slice(-10)
      .map(e => (e.who === 'you' ? 'PLAYER: ' : 'CUSTOMER: ') + String(e.text).slice(0, 200)).join('\n');
    return (hist ? 'TRANSCRIPT SO FAR:\n' + hist + '\n\n' : '') + 'The PLAYER just said: "' + text + '"\nReply now as the customer. Output the JSON.';
  },
  async callerTurn(call, text, plan) {
    if (!this.enabled()) return { ok: false };
    try {
      const schema = { type: 'object', properties: { approach: { type: 'string', enum: APPROACH_IDS }, intent: { type: 'string', enum: CALLER_INTENTS }, reply: { type: 'string' } }, required: ['approach', 'intent', 'reply'] };
      const raw = await this._chat(this._callerSystem(call, plan), this._callerUser(call, text), schema, { max: 110 });
      const j = this._parse(raw), reply = this._clean(j && j.reply);
      if (!reply) throw new Error('empty reply');
      return { ok: true, approach: APPROACH_IDS.includes(j.approach) ? j.approach : Heur.classify(text), intent: CALLER_INTENTS.includes(j.intent) ? j.intent : null, reply };
    } catch (e) { this._fail(e); return { ok: false }; }
  },
  /* Used when a happy customer volunteers to buy without being asked. */
  async finalLine(call, accept) {
    if (!this.enabled()) return null;
    try {
      const plan = { willBuy: accept };
      const sys = this._callerSystem(call, plan);
      const raw = await this._chat(sys, this._callerUser(call, '(the player has done a great job; you decide to ' + (accept ? 'buy the plan now' : 'decline') + ' and say so)'), { type: 'object', properties: { approach: { type: 'string' }, intent: { type: 'string' }, reply: { type: 'string' } }, required: ['approach', 'intent', 'reply'] }, { max: 120 });
      const j = this._parse(raw); return this._clean(j && j.reply) || null;
    } catch (e) { this._fail(e); return null; }
  },

  /* ---------- boss ---------- */
  _bossSystem(sit) {
    return [
      'You are THE BOSS at a soul-crushing call center (' + CFG.COMPANY + ') in a satirical dark-comedy video game. Deadpan, passive-aggressive, corporate buzzwords, petty. Never violent, never hateful. 1-2 SHORT sentences. Language: ' + (AISettings.d.lang || 'English') + '.',
      'The player is your employee, Agent 4471. Day ' + sit.day + ', ' + sit.time + '. Quota progress: ' + U.money(sit.money) + ' of ' + U.money(sit.quota) + '. Your annoyance with the agent: ' + Math.round(sit.annoy) + '/100.',
      'WHAT YOU SEE: ' + sit.text,
      'Return ONLY JSON: {"reply": <your spoken words>, "annoy_delta": <integer from -8 (impressed) to 10 (insulting, lying, lazy excuses); use 0 for your opening remark>}',
    ].join('\n');
  },
  async bossLine(sit, history, playerText) {
    if (!this.enabled()) return { ok: false };
    try {
      const hist = (history || []).map(e => (e.who === 'boss' ? 'BOSS: ' : 'AGENT: ') + String(e.text).slice(0, 200)).join('\n');
      const user = (hist ? 'CONVERSATION:\n' + hist + '\n\n' : '') + (playerText ? 'The AGENT just said: "' + playerText + '"\nRespond as the boss. Output the JSON.' : 'Say your opening remark to the agent. Output the JSON.');
      const schema = { type: 'object', properties: { reply: { type: 'string' }, annoy_delta: { type: 'integer' } }, required: ['reply', 'annoy_delta'] };
      const raw = await this._chat(this._bossSystem(sit), user, schema, { max: 120, timeout: this.warm ? 45000 : 180000 });
      const j = this._parse(raw), reply = this._clean(j && j.reply);
      if (!reply) throw new Error('empty reply');
      return { ok: true, reply, delta: U.clamp(Math.round(Number(j.annoy_delta) || 0), -8, 10) };
    } catch (e) { this.lastErr = String((e && e.message) || e); return { ok: false }; }   // quiet: boss lines are optional flavour, never block or flag the AI
  },
};

/* ------------------------- speech (browser built-ins) ------------------------- */
const Speech = {
  rec: null, listening: false,
  supported() { return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition); },
  listen(onText, onState) {
    if (!this.supported() || this.listening) return false;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR(); this.rec = r; r.lang = AISettings.speechLang(); r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = e => { const t = e.results && e.results[0] && e.results[0][0] && e.results[0][0].transcript; if (t) onText(t); };
    r.onend = () => { this.listening = false; this.rec = null; if (onState) onState(false); };
    r.onerror = () => { this.listening = false; if (onState) onState(false); };
    try { r.start(); this.listening = true; if (onState) onState(true); } catch (e) { this.listening = false; return false; }
    return true;
  },
  stop() { try { if (this.rec) this.rec.stop(); } catch (e) { /* ignore */ } if (typeof speechSynthesis !== 'undefined') { try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } } },
  speak(text, who, age) {
    if (!AISettings.d.voice || typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = AISettings.speechLang();
      u.pitch = who === 'boss' ? 0.55 : who === 'f' ? 1.25 : 0.85;
      u.rate = who === 'boss' ? 0.95 : (age && age > 65 ? 0.88 : 1.02);
      speechSynthesis.speak(u);
    } catch (e) { /* voice must never break gameplay */ }
  },
};
