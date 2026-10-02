/* =====================================================================
   05_ui.js  -  UIManager: HUD, call panel, computer desktop + apps,
   portraits, menus and modals. Every visible button is wired here.
   ===================================================================== */

const $ = (id) => document.getElementById(id);
const ICON = {
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-4 3-6 6.5-6s6.5 2 6.5 6"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14c3 0 4.5 1.8 4.5 5"/>',
  notes: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 12l6-6"/>',
  badge: '<rect x="4" y="3" width="16" height="18" rx="1"/><circle cx="12" cy="10" r="3"/><path d="M7 18c1-3 3-4 5-4s4 1 5 4"/>',
};
const ico = (n) => '<div class="ico"><svg viewBox="0 0 24 24">' + ICON[n] + '</svg></div>';

/* ---------- procedural caller portraits (expression driven) ---------- */
function drawPortrait(canvas, look, emo) {
  const x = canvas.getContext('2d'), w = canvas.width, h = canvas.height, cx = w / 2;
  x.fillStyle = '#343a39'; x.fillRect(0, 0, w, h);
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,230,.07)'); g.addColorStop(1, 'rgba(0,0,0,.25)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const r = Math.min(255, (n >> 16) * f), gg = Math.min(255, ((n >> 8) & 255) * f), b = Math.min(255, (n & 255) * f); return 'rgb(' + r + ',' + gg + ',' + b + ')'; };
  // shoulders
  x.fillStyle = look.shirt; x.beginPath(); x.moveTo(8, h); x.lineTo(20, h - 40); x.lineTo(cx - 28, h - 56); x.lineTo(cx + 28, h - 56); x.lineTo(w - 20, h - 40); x.lineTo(w - 8, h); x.fill();
  x.fillStyle = shade(look.shirt, 0.75); x.beginPath(); x.moveTo(cx - 28, h - 56); x.lineTo(cx, h - 36); x.lineTo(cx + 28, h - 56); x.lineTo(cx + 8, h - 30); x.lineTo(cx - 8, h - 30); x.fill();
  // neck + head
  x.fillStyle = shade(look.skin, 0.85); x.fillRect(cx - 14, h - 80, 28, 30);
  const hy = 72, hw = look.female ? 38 : 42, hh = 52;
  // hair back
  x.fillStyle = look.hair;
  if (look.style === 'long' || look.female && look.style === 'bob') { x.beginPath(); x.moveTo(cx - hw - 8, hy + (look.style === 'long' ? 70 : 38)); x.lineTo(cx - hw - 6, hy - 40); x.lineTo(cx + hw + 6, hy - 40); x.lineTo(cx + hw + 8, hy + (look.style === 'long' ? 70 : 38)); x.fill(); }
  if (look.style === 'bun') { x.beginPath(); x.arc(cx, hy - 56, 14, 0, 7); x.fill(); }
  // face polygon (low-poly look)
  x.fillStyle = look.skin; x.beginPath(); x.moveTo(cx - hw, hy - 28); x.lineTo(cx - hw + 6, hy + 30); x.lineTo(cx - 14, hy + hh); x.lineTo(cx + 14, hy + hh); x.lineTo(cx + hw - 6, hy + 30); x.lineTo(cx + hw, hy - 28); x.lineTo(cx, hy - 44); x.closePath(); x.fill();
  x.fillStyle = shade(look.skin, 0.88); x.beginPath(); x.moveTo(cx, hy - 44); x.lineTo(cx + hw, hy - 28); x.lineTo(cx + hw - 6, hy + 30); x.lineTo(cx + 14, hy + hh); x.lineTo(cx + 6, hy + 8); x.closePath(); x.fill();
  x.fillStyle = look.skin; x.fillRect(cx - hw - 4, hy - 2, 6, 18); x.fillRect(cx + hw - 2, hy - 2, 6, 18);
  // hair front
  x.fillStyle = look.hair;
  const cap = () => { x.beginPath(); x.moveTo(cx - hw - 2, hy - 20); x.lineTo(cx - hw + 4, hy - 46); x.lineTo(cx, hy - 56); x.lineTo(cx + hw - 4, hy - 46); x.lineTo(cx + hw + 2, hy - 20); x.lineTo(cx + hw - 8, hy - 30); x.lineTo(cx, hy - 38); x.lineTo(cx - hw + 8, hy - 30); x.closePath(); x.fill(); };
  if (look.style === 'bald') { x.fillStyle = look.hair; x.fillRect(cx - hw - 3, hy - 14, 8, 26); x.fillRect(cx + hw - 5, hy - 14, 8, 26); } else cap();
  if (look.style === 'cap') { x.fillStyle = '#3a4a3a'; x.fillRect(cx - hw - 4, hy - 38, hw * 2 + 8, 14); x.fillRect(cx - hw - 12, hy - 28, hw + 20, 7); }
  if (look.style === 'messy') { x.beginPath(); x.moveTo(cx - 20, hy - 54); x.lineTo(cx - 10, hy - 66); x.lineTo(cx, hy - 54); x.lineTo(cx + 12, hy - 64); x.lineTo(cx + 22, hy - 52); x.fill(); }
  if (look.style === 'curly') { for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(cx - hw + i * (hw * 2 / 8), hy - 42 + Math.abs(i - 4) * 4, 11, 0, 7); x.fill(); } }
  if (look.beard) { x.fillStyle = look.hair; x.globalAlpha = 0.85; x.beginPath(); x.moveTo(cx - hw + 6, hy + 8); x.lineTo(cx - 14, hy + hh + 4); x.lineTo(cx + 14, hy + hh + 4); x.lineTo(cx + hw - 6, hy + 8); x.lineTo(cx + 18, hy + 22); x.lineTo(cx - 18, hy + 22); x.fill(); x.globalAlpha = 1; }
  // expression
  const eyeY = hy + 2, ex = 17;
  let bl = 0, br = 0, sq = 0, mouth = 'flat', blush = false;
  switch (emo) {
    case 'angry': bl = 9; br = 9; sq = 3; mouth = 'frown'; blush = true; break;
    case 'suspicious': bl = 5; br = 5; sq = 5; mouth = 'flat'; break;
    case 'confused': bl = -3; br = 7; mouth = 'wave'; break;
    case 'friendly': bl = -3; br = -3; mouth = 'smile'; break;
    case 'amused': bl = -2; br = 5; mouth = 'smirk'; break;
    default: mouth = 'flat';
  }
  if (blush) { x.fillStyle = 'rgba(170,60,40,.25)'; x.fillRect(cx - hw + 8, hy + 6, 70, 30); }
  [-1, 1].forEach((s, i) => {
    const ex0 = cx + s * ex, br0 = i === 0 ? bl : br;
    x.fillStyle = '#e8e6da'; x.fillRect(ex0 - 8, eyeY - 5 + sq, 16, 10 - sq * 1.2);
    x.fillStyle = '#2a2622'; x.fillRect(ex0 - 3, eyeY - 4 + sq, 6, 8 - sq * 1.2);
    x.strokeStyle = look.hair === '#b9b9b2' || look.hair === '#c9c9c4' || look.hair === '#a9a29a' ? '#8a8a84' : shade(look.hair, 0.9); x.lineWidth = 3.2; x.beginPath();
    if (emo !== 'angry' && emo !== 'suspicious') { x.moveTo(ex0 - 10, eyeY - 12 - br0 * 0.5); x.lineTo(ex0 + 10, eyeY - 12 - (emo === 'confused' && i === 1 ? 4 : 0)); x.stroke(); }
    // angled brows for anger/suspicion
    if (emo === 'angry' || emo === 'suspicious') { x.beginPath(); x.moveTo(ex0 - 10 * s, eyeY - 18 + (emo === 'angry' ? 0 : 3)); x.lineTo(ex0 + 10 * s, eyeY - 8); x.stroke(); }
  });
  x.strokeStyle = shade(look.skin, 0.6); x.lineWidth = 2; x.beginPath(); x.moveTo(cx, eyeY + 4); x.lineTo(cx - 5, eyeY + 20); x.lineTo(cx + 3, eyeY + 21); x.stroke();
  x.strokeStyle = '#4a2a24'; x.lineWidth = 3; x.beginPath(); const my = hy + 38;
  if (mouth === 'smile') { x.moveTo(cx - 14, my - 2); x.quadraticCurveTo(cx, my + 12, cx + 14, my - 2); }
  else if (mouth === 'frown') { x.moveTo(cx - 13, my + 5); x.quadraticCurveTo(cx, my - 6, cx + 13, my + 5); }
  else if (mouth === 'wave') { x.moveTo(cx - 13, my + 2); x.quadraticCurveTo(cx - 6, my - 5, cx, my + 2); x.quadraticCurveTo(cx + 6, my + 8, cx + 13, my); }
  else if (mouth === 'smirk') { x.moveTo(cx - 12, my + 3); x.quadraticCurveTo(cx + 2, my + 4, cx + 14, my - 4); }
  else { x.moveTo(cx - 12, my); x.lineTo(cx + 12, my); }
  x.stroke();
  if (look.glasses) { x.strokeStyle = '#2a2a28'; x.lineWidth = 2.4; [-1, 1].forEach(s => x.strokeRect(cx + s * ex - 12, eyeY - 9, 24, 17)); x.beginPath(); x.moveTo(cx - 5, eyeY - 2); x.lineTo(cx + 5, eyeY - 2); x.stroke(); }
  // grit overlay
  x.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < h; y += 3) x.fillRect(0, y, w, 1);
}

const UI = {
  crashed: false, app: 'calls', selCust: null, queue: [], busy: false, qTimer: null, bannerTimer: null, pendingResult: null, confirmCb: null, lastHud: '',

  init() {
    const g = $('grain').getContext('2d'); $('grain').width = 160; $('grain').height = 120;
    const id = g.createImageData(160, 120); for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0);
    $('grain').style.width = '100%'; $('grain').style.height = '100%';
    const lg = $('menu-logo').getContext('2d'); drawLogoBlock(lg, 100, 95, 1.35); drawLogoBlock($('pc-mark').getContext('2d'), 110, 96, 1.4);
    // computer icons
    const apps = [['calls', 'CALLS', 'phone'], ['customers', 'CUSTOMERS', 'users'], ['notes', 'NOTES', 'notes'], ['stats', 'STATISTICS', 'chart'], ['target', 'DAILY TARGET', 'target'], ['status', 'EMPLOYEE STATUS', 'badge']];
    $('pc-icons').innerHTML = apps.map(a => '<button class="pcicon" data-app="' + a[0] + '">' + ico(a[2]) + a[1].replace(' ', '<br>') + '</button>').join('');
    $('pc-icons').querySelectorAll('.pcicon').forEach(b => b.addEventListener('click', () => { AudioManager.play('click'); this.openApp(b.dataset.app); }));
    $('pc-close').addEventListener('click', () => this.closeComputer(true));
    // call options
    // bus wiring
    Bus.on('toast', t => this.toast(t.text, t.kind));
    Bus.on('banner', b => this.banner(b.text));
    Bus.on('money', () => this.updateHUD()); Bus.on('time', () => this.updateHUD());
    Bus.on('quota:reached', () => { this.toast('QUOTA REACHED. Keep going: the boss does not give bonuses, only higher quotas.', 'good'); AudioManager.play('notify'); });
    Bus.on('call:ring', c => { this.toast('Incoming call: ' + c.callerId + '  (' + c.phone + ')', 'info'); this.refreshApp(); });
    Bus.on('call:missed', () => this.refreshApp()); Bus.on('call:idle', () => this.refreshApp());
    Bus.on('call:start', c => { this.beginCall(c); this.refreshApp(); });
    Bus.on('call:turn', t => this.onTurn(t));
    Bus.on('call:result', r => { this.pendingResult = r; this.queue.push({ fn: () => this.showResult(r), d: 700 }); this.runQueue(); });
    Bus.on('event:start', e => { if (e.id === 'crash') this.crash(e.def.dur); this.updateBanners(); });
    Bus.on('event:end', () => this.updateBanners());
    Bus.on('boss:annoy', () => { if (this.app === 'status') this.refreshApp(); });
  },

  /* ----- generic helpers ----- */
  setHint(txt) {
    const h = $('hint'); if (!txt) { h.classList.add('hide'); return; }
    h.classList.remove('hide'); const html = '<kbd>E</kbd>' + txt; if (h.dataset.t !== html) { h.innerHTML = html; h.dataset.t = html; }
  },
  toast(text, kind) {
    const d = document.createElement('div'); d.className = 'toast ' + (kind || ''); d.textContent = text; $('toasts').appendChild(d);
    while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
    setTimeout(() => d.remove(), 6500);
  },
  banner(text) {
    clearTimeout(this.bannerTimer); let b = $('bigbanner'); if (!b) { b = document.createElement('div'); b.id = 'bigbanner'; document.body.appendChild(b); }
    b.textContent = text; b.style.display = 'block'; this.bannerTimer = setTimeout(() => { b.style.display = 'none'; }, 2200);
  },
  updateBanners() {
    const chips = []; const add = (id, t, c) => { if (EventSystem.isActive(id)) chips.push('<div class="chip ' + (c || '') + '">' + t + '</div>'); };
    add('network', 'Network down'); add('overload', 'Phone overload', 'info'); add('server', 'Line quality poor'); add('crash', 'PC rebooting', 'info');
    if (EventSystem.blockCalls) chips.push('<div class="chip info">Meeting</div>');
    $('banners').innerHTML = chips.join('');
  },
  updateHUD() {
    const t = G.today, pct = Math.min(100, t.money / t.quota * 100);
    $('hud-time').textContent = TimeSystem.format(); $('hud-quota').textContent = U.money(t.money) + ' / ' + U.money(t.quota); $('hud-money').textContent = U.money(t.money);
    $('hud-fill').style.width = pct + '%'; $('hud-fill').classList.toggle('done', t.money >= t.quota);
    $('pc-clock').textContent = TimeSystem.format();
  },
  tick() {   // called ~2x/sec while playing
    this.updateHUD(); this.updateBanners();
    if (CallSystem.active && CallSystem.state === 'active') { $('cp-timer').textContent = U.mmss(CallSystem.active.elapsed); this.updateCallOpts(); }
    if ($('computer').classList.contains('show')) this.tickApp();
  },
  anyModal() { return ['menu', 'help', 'dayintro', 'result', 'review', 'pause', 'meeting', 'confirm', 'bosschat', 'aiset'].some(i => $(i).classList.contains('show')); },
  inFocus() { return this.anyModal() || $('computer').classList.contains('show') || $('callpanel').classList.contains('show'); },
  show(id) { $(id).classList.add('show'); this.releasePointer(); },
  hide(id) { $(id).classList.remove('show'); },
  releasePointer() { if (document.pointerLockElement) { Game.expectUnlock = true; document.exitPointerLock(); } },
  confirm(text, cb) { $('cf-text').textContent = text; this.confirmCb = cb; this.show('confirm'); },
  showPlayHud(on) { ['hud', 'crosshair'].forEach(i => $(i).classList.toggle('hide', !on)); if (!on) { this.setHint(''); $('clickhint').classList.add('hide'); } },

  /* ----- call panel ----- */
  beginCall(call) {
    document.body.classList.add('incall'); $('callpanel').classList.add('show'); this.releasePointer();
    const c = call.caller;
    $('cp-log').innerHTML = ''; $('cp-name').textContent = c.name; $('cp-sub').textContent = c.age + ', ' + c.occupation + (c.returning ? ' (returning caller)' : '');
    $('cp-timer').textContent = '00:00'; this.queue = []; this.busy = false; this.pendingResult = null; this.updateMeters(true);
    this.updateCallOpts();
  },
  updateMeters(instant) {
    const call = CallSystem.active; if (!call) return; const c = call.caller;
    const set = (id, v) => { $(id).querySelector('.v').textContent = Math.round(v); $(id).querySelector('i').style.width = v + '%'; };
    set('m-trust', c.trust); set('m-sus', c.suspicion); set('m-pat', c.patience); set('m-prog', call.progress);
    $('cp-pot').textContent = U.money(DialogueSystem.reward(call));
    $('cp-emo').textContent = c.emotion; drawPortrait($('cp-portrait'), c.arch.look, c.emotion);
  },
  updateCallOpts() {
    const call = CallSystem.active; const disabled = this.busy || !call || call.over || CallSystem.state !== 'active';
    $('cp-opts').querySelectorAll('button').forEach(b => {
      b.disabled = disabled; b.classList.toggle('hot', b.dataset.a === 'close' && !!call && call.stage >= 3 && DialogueSystem.successChance(call) > 0.5);
      if (b.dataset.a === 'close' && Equip.has('analyzer') && call) b.querySelector('.t').textContent = 'Odds: ' + Math.round(DialogueSystem.successChance(call) * 100) + '%';
    });
  },
  pick(a) {
    if (this.busy || CallSystem.state !== 'active') return;
    AudioManager.play('ui'); CallSystem.choose(a);
  },
  onTurn(t) {
    t.entries.forEach((e, i) => this.queue.push({ fn: () => this.addLine(e), d: e.who === 'caller' ? 650 : (e.who === 'you' ? 100 : 350) }));
    this.queue.push({ fn: () => this.updateMeters(), d: 0 });
    this.busy = true; this.updateCallOpts(); this.runQueue();
  },
  addLine(e) {
    const d = document.createElement('div'); d.className = e.who === 'sys' ? (e.kind === 'warn' ? 'warn' : 'sys') : e.who;
    const who = e.who === 'you' ? 'YOU' : e.who === 'caller' ? (CallSystem.active ? CallSystem.active.caller.first.toUpperCase() : 'CALLER') : '';
    d.innerHTML = (who ? '<b>' + who + '</b>' : '') + this.esc(e.text); $('cp-log').appendChild(d); $('cp-log').scrollTop = 99999;
    if (e.who !== 'sys') AudioManager.play('type', 0.5, 0.8 + Math.random() * 0.5);
  },
  esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); },
  runQueue() {
    if (this.qTimer) return;
    const step = () => {
      const job = this.queue.shift();
      if (!job) { this.qTimer = null; this.busy = false; this.updateCallOpts(); return; }
      job.fn(); this.qTimer = setTimeout(step, job.d);
    };
    this.busy = true; step();
  },
  endCallUI() { document.body.classList.remove('incall'); $('callpanel').classList.remove('show'); },
  showResult(r) {
    this.updateMeters();
    $('r-title').textContent = r.title; $('r-title').className = 'big ' + (r.good ? 'good' : 'bad'); $('r-detail').textContent = r.detail;
    $('r-money').textContent = r.money ? '+' + U.money(r.money) : '$0'; $('r-dur').textContent = U.mmss(r.duration); $('r-ts').textContent = Math.round(r.trust) + ' / ' + Math.round(r.suspicion); $('r-turns').textContent = r.turns;
    this.show('result');
  },

  /* ----- computer ----- */
  openComputer() {
    if (Player.locked) return;
    Player.sit(); Player.locked = true; $('computer').classList.add('show'); this.releasePointer(); AudioManager.play('click');
    this.openApp(CallSystem.state === 'ringing' ? 'calls' : this.app || 'calls');
  },
  closeComputer(clickGesture) {
    if (!$('computer').classList.contains('show')) return;
    $('computer').classList.remove('show'); Player.locked = false; AudioManager.play('click');
    if (clickGesture) Game.relock();
  },
  crash(dur) {
    this.crashed = true; World.screens.player && (World.screens.player.key = '');
    const old = $('pc-crash'); if (old) old.remove();
    const d = document.createElement('div'); d.id = 'pc-crash'; d.className = 'crash'; d.innerHTML = '<p>:( A problem has been detected.</p><p>GLOBECOM.SYS has stopped responding.</p><p>Restarting. Please do not cry at the desk.</p><p class="mono" id="pc-pct">0%</p>';
    $('screen').appendChild(d);
    const t0 = performance.now(); const iv = setInterval(() => { const p = Math.min(100, (performance.now() - t0) / (dur * 10)); const el = $('pc-pct'); if (el) el.textContent = Math.floor(p) + '%'; if (p >= 100) { clearInterval(iv); d.remove(); this.crashed = false; World.screens.player && (World.screens.player.key = ''); } }, 200);
  },
  openApp(id) {
    this.app = id; $('pc-icons').querySelectorAll('.pcicon').forEach(b => b.classList.toggle('on', b.dataset.app === id)); this.refreshApp();
  },
  refreshApp() {
    if (!$('computer').classList.contains('show')) return;
    const a = this.apps[this.app]; if (!a) return;
    $('pc-t').textContent = a.title; $('pc-sub').textContent = 'Globe-Com Workstation'; $('pc-body').innerHTML = a.render.call(this); if (a.bind) a.bind.call(this);
  },
  tickApp() { const a = this.apps[this.app]; if (a && a.tick) a.tick.call(this); },

  apps: {
    calls: {
      title: 'CALLS - LINE 1',
      render() {
        let h = '<h3>CALL QUEUE</h3>';
        if (CallSystem.state === 'ringing') {
          const c = CallSystem.incoming;
          h += '<p>INCOMING: <b>' + c.callerId + '</b> &nbsp; ' + c.phone + ' &nbsp; (<span id="ring-t">' + Math.ceil(CallSystem.ringLeft) + '</span>s)</p><button class="pbtn" id="a-answer">ANSWER CALL</button>';
        } else if (CallSystem.state === 'active') h += '<p>On the line with <b>' + CallSystem.active.caller.name + '</b>. Use the call panel below.</p>';
        else if (CallSystem.state === 'result') h += '<p>Finishing call report...</p>';
        else h += '<p>Line 1: IDLE. ' + (EventSystem.isActive('network') ? '<b style="color:#8a3a30">NETWORK DOWN - no calls.</b>' : 'Waiting for the next call...') + '</p>';
        const log = G.today.callLog.slice(-8).reverse();
        h += '<h3 style="margin-top:18px">TODAY\'S CALL LOG</h3><table><tr><th>TIME</th><th>CALLER</th><th>RESULT</th><th>EARNED</th><th>LENGTH</th></tr>' + (log.length ? log.map(l => '<tr><td>' + l.time + '</td><td>' + l.name + '</td><td>' + l.result + '</td><td>' + (l.money ? U.money(l.money) : '-') + '</td><td>' + U.mmss(l.dur) + '</td></tr>').join('') : '<tr><td colspan="5">No calls yet.</td></tr>') + '</table>';
        return h;
      },
      bind() { const b = $('a-answer'); if (b) b.addEventListener('click', () => { if (CallSystem.state === 'ringing') { Player.sit(); CallSystem.answer(); } }); },
      tick() { const e = $('ring-t'); if (e) e.textContent = Math.ceil(CallSystem.ringLeft); },
    },
    customers: {
      title: 'CUSTOMERS - FILE',
      render() {
        const r = NPCSystem.roster.slice().reverse(); if (!r.length) return '<h3>CUSTOMER FILES</h3><p>No customer files yet. Answer a call to open one.</p>';
        if (!UI.selCust || !r.find(c => c.id === UI.selCust)) UI.selCust = r[0].id;
        const c = r.find(x => x.id === UI.selCust), live = CallSystem.active && CallSystem.active.caller === c && CallSystem.state === 'active';
        const tag = (x) => x.lastResult === 'sale' ? '<span class="tag g">SALE</span>' : x.lastResult ? '<span class="tag r">' + x.lastResult.toUpperCase() + '</span>' : '<span class="tag">ACTIVE</span>';
        const list = r.map(x => '<div class="li ' + (x.id === c.id ? 'on' : '') + '" data-id="' + x.id + '"><b>' + x.name + '</b>' + tag(x) + '<br><span style="color:#555">' + x.occupation + '</span></div>').join('');
        const wealth = '$'.repeat(c.wealth) + '<span style="opacity:.3">' + '$'.repeat(5 - c.wealth) + '</span>';
        const hist = (c.history || []).slice(-8).map(e => '<div style="font-size:12px;color:#444"><b>' + (e.who === 'you' ? 'YOU' : e.who === 'caller' ? 'THEM' : '..') + ':</b> ' + UI.esc(e.text) + '</div>').join('');
        return '<div class="cust"><div class="list">' + list + '</div><div style="flex:1;min-width:0"><canvas id="cust-p" width="154" height="170" style="float:right;border:1px solid #888;margin-left:10px"></canvas><h3>' + c.name + '</h3>' +
          '<div>Age: <b>' + c.age + '</b></div><div>Occupation: <b>' + c.occupation + '</b></div><div>Profile: <b>' + c.personality + '</b></div><div>Wealth: <b>' + wealth + '</b></div><div>Phone: <b>' + c.phone + '</b></div><div>Times called: <b>' + c.memory.calls + '</b></div>' +
          (Equip.has('analyzer') || !live ? '<div>Trust / Suspicion: <b>' + Math.round(c.trust) + ' / ' + Math.round(c.suspicion) + '</b></div>' : '<div>Trust / Suspicion: <i>hidden during live calls (needs Voice Stress Analyzer)</i></div>') +
          (c.memory.notes.length ? '<div>Notes: ' + c.memory.notes.join(' ') + '</div>' : '') + '<h3 style="margin-top:14px">LAST CONVERSATION</h3>' + (hist || '<i>No transcript yet.</i>') + '</div></div>';
      },
      bind() {
        document.querySelectorAll('.cust .li').forEach(el => el.addEventListener('click', () => { UI.selCust = +el.dataset.id; UI.refreshApp(); }));
        const c = NPCSystem.roster.find(x => x.id === UI.selCust); const cv = $('cust-p'); if (c && cv) drawPortrait(cv, c.arch.look, c.emotion);
      },
    },
    notes: {
      title: 'NOTES - notes.txt',
      render() { return '<h3>PERSONAL NOTES</h3><textarea id="notes-ta" placeholder="Write anything. It saves with the game."></textarea><button class="pbtn red" id="notes-clear" style="margin-top:6px">Clear notes</button>'; },
      bind() {
        const ta = $('notes-ta'); ta.value = G.notes; ta.addEventListener('input', () => { G.notes = ta.value; AudioManager.play('type', 0.4); });
        ta.addEventListener('keydown', e => e.stopPropagation());
        $('notes-clear').addEventListener('click', () => { G.notes = ''; ta.value = ''; });
      },
    },
    stats: {
      title: 'STATISTICS',
      render() {
        const t = G.today, s = t.stats, rate = s.calls ? Math.round(s.success / s.calls * 100) : 0, cr = G.career;
        const mx = Math.max(500, ...t.hourly);
        const bars = t.hourly.map((v, i) => '<div style="height:' + Math.max(2, v / mx * 100) + '%" title="' + U.money(v) + '"><span>' + (((8 + i) % 12) || 12) + '</span></div>').join('');
        return '<h3>TODAY</h3><div class="row" style="display:flex;gap:30px"><div>Calls<br><span class="bigv">' + s.calls + '</span></div><div>Sales<br><span class="bigv">' + s.success + '</span></div><div>Success rate<br><span class="bigv">' + rate + '%</span></div><div>Suspicion<br><span class="bigv">' + s.suspicion + '</span></div><div>Missed<br><span class="bigv">' + s.missed + '</span></div></div>' +
          '<h3 style="margin-top:12px">EARNINGS BY HOUR</h3><div class="bars">' + bars + '</div><h3>CAREER</h3><table><tr><td>Total earned</td><td><b>' + U.money(cr.earned) + '</b></td><td>Best day</td><td><b>' + U.money(cr.bestDay) + '</b></td></tr><tr><td>Total calls</td><td><b>' + (cr.calls + s.calls) + '</b></td><td>Days worked</td><td><b>' + cr.days.length + '</b></td></tr></table>';
      },
    },
    target: {
      title: 'DAILY TARGET',
      render() {
        const t = G.today, left = Math.max(0, CFG.DAY_END - TimeSystem.minutes), need = Math.max(0, t.quota - t.money), hrs = left / 60;
        const hist = G.career.days.slice(-5).map(d => '<tr><td>Day ' + d.day + '</td><td>' + U.money(d.money) + '</td><td>' + U.money(d.quota) + '</td><td>' + d.rating + '</td></tr>').join('');
        return '<h3>DAY ' + G.day + ' TARGET</h3><div class="bigv" id="tg-m">' + U.money(t.money) + ' / ' + U.money(t.quota) + '</div><div class="pbar"><i id="tg-bar" style="width:' + Math.min(100, t.money / t.quota * 100) + '%"></i></div>' +
          '<div class="row" style="display:flex;justify-content:space-between"><span>Remaining</span><b id="tg-need">' + U.money(need) + '</b></div><div class="row" style="display:flex;justify-content:space-between"><span>Time left</span><b id="tg-left">' + Math.floor(left / 60) + 'h ' + Math.floor(left % 60) + 'm</b></div><div class="row" style="display:flex;justify-content:space-between"><span>Required pace</span><b id="tg-pace">' + (hrs > 0 ? U.money(need / hrs) + ' / hour' : '-') + '</b></div>' +
          '<h3 style="margin-top:16px">PREVIOUS DAYS</h3><table><tr><th>DAY</th><th>EARNED</th><th>QUOTA</th><th>RESULT</th></tr>' + (hist || '<tr><td colspan="4">First day on the job.</td></tr>') + '</table>';
      },
      tick() {
        const t = G.today, left = Math.max(0, CFG.DAY_END - TimeSystem.minutes), need = Math.max(0, t.quota - t.money);
        const s = (id, v) => { const e = $(id); if (e) e.textContent = v; };
        s('tg-m', U.money(t.money) + ' / ' + U.money(t.quota)); s('tg-need', U.money(need)); s('tg-left', Math.floor(left / 60) + 'h ' + Math.floor(left % 60) + 'm'); s('tg-pace', left > 0 ? U.money(need / (left / 60)) + ' / hour' : '-');
        const b = $('tg-bar'); if (b) b.style.width = Math.min(100, t.money / t.quota * 100) + '%';
      },
    },
    status: {
      title: 'EMPLOYEE STATUS',
      render() {
        const eq = EQUIPMENT.map(e => '<tr><td>' + e.name + '</td><td>' + (G.day >= e.day ? '<b style="color:#3a6a4a">ACTIVE</b>' : 'Unlocks Day ' + e.day) + '</td><td>' + e.desc + '</td></tr>').join('');
        const an = Math.round(G.today.annoy);
        return '<div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap"><div class="idcard"><canvas id="id-logo" width="60" height="60"></canvas><div style="font:11px var(--mono)"><b>GLOBE-COM SOLUTIONS</b><br>EMPLOYEE ID<br><br>NAME: AGENT 4471<br>DEPT: OUTBOUND RETENTION<br>CLEARANCE: NONE</div></div>' +
          '<div style="flex:1;min-width:240px"><div>Strikes: <span class="dots">' + '&#9679;'.repeat(G.career.strikes) + '<span style="opacity:.3">' + '&#9679;'.repeat(CFG.MAX_STRIKES - G.career.strikes) + '</span></span> (' + CFG.MAX_STRIKES + ' and you are fired)</div><div style="margin-top:6px">Boss irritation: <b>' + an + '%</b></div><div class="pbar"><i style="width:' + an + '%;background:#8a3a30"></i></div></div></div>' +
          '<h3 style="margin-top:14px">EQUIPMENT</h3><table><tr><th>ITEM</th><th>STATUS</th><th>EFFECT</th></tr>' + eq + '</table>' +
          '<div style="margin-top:16px;display:flex;gap:10px"><button class="pbtn" id="st-save">SAVE GAME</button><button class="pbtn red" id="st-out">CLOCK OUT EARLY</button></div><div id="st-msg" style="margin-top:8px;font-size:12px"></div>';
      },
      bind() {
        const lg = $('id-logo'); if (lg) logoDraw(lg.getContext('2d'), 30, 28, 0.6);
        $('st-save').addEventListener('click', () => { const ok = CallSystem.state === 'idle' || CallSystem.state === 'ringing' ? DaySystem.saveMid() : false; $('st-msg').textContent = ok ? 'Game saved.' : 'Cannot save during a call.'; if (ok) AudioManager.play('notify', 0.6); });
        $('st-out').addEventListener('click', () => {
          if (CallSystem.state === 'active' || CallSystem.state === 'result') return void ($('st-msg').textContent = 'Finish your call first.');
          UI.confirm(MoneySystem.reached() ? 'Clock out now and end the day?' : 'You have NOT met quota. Clocking out early earns you a strike. Continue?', () => { UI.closeComputer(); Game.endDay(true); });
        });
      },
    },
  },

  /* ----- menus and flow ----- */
  showMenu() { this.showPlayHud(false); $('menu').classList.add('show'); $('b-cont').disabled = !SaveSystem.has(); this.hideAllGame(); },
  hideAllGame() { ['computer', 'callpanel'].forEach(i => $(i).classList.remove('show')); document.body.classList.remove('incall'); ['result', 'review', 'pause', 'dayintro', 'meeting', 'help', 'confirm', 'bosschat', 'aiset'].forEach(i => this.hide(i)); },
  showDayIntro() {
    $('di-day').textContent = 'DAY ' + G.day; $('di-quota').textContent = U.money(G.today.quota);
    $('di-strikes').innerHTML = '&#9679;'.repeat(G.career.strikes) + '<span style="opacity:.3">' + '&#9679;'.repeat(CFG.MAX_STRIKES - G.career.strikes) + '</span>';
    const un = PROG.unlockText(G.day); $('di-notes').innerHTML = un.length && G.day > 1 ? 'NEW TODAY:<br>- ' + un.join('<br>- ') : 'Make the calls. Hit the number. Do not make eye contact with the boss.';
    $('menu').classList.remove('show'); this.show('dayintro');
  },
  showReview(r) {
    this.endCallUI(); $('computer').classList.remove('show'); Player.locked = false;
    $('rv-title').textContent = 'DAILY PERFORMANCE - DAY ' + r.day + (r.early ? ' (CLOCKED OUT EARLY)' : '');
    $('rv-money').textContent = U.money(r.money); $('rv-quota').textContent = U.money(r.quota); $('rv-succ').textContent = r.success; $('rv-fail').textContent = r.failed; $('rv-sus').textContent = r.suspicion; $('rv-miss').textContent = r.missed; $('rv-annoy').textContent = r.annoy + '%';
    const rt = $('rv-rating'); rt.textContent = r.rating; rt.className = (r.rating === 'Outstanding' || r.rating === 'Target Met') ? 'good' : (r.rating === 'Below Target' ? 'warnc' : 'bad');
    $('rv-quote').textContent = 'Boss: ' + r.quote;
    $('rv-strike').textContent = r.fired ? 'You have been TERMINATED. Three strikes.' : (r.strike ? 'STRIKE ISSUED. Strikes: ' + r.strikes + ' / ' + CFG.MAX_STRIKES : '');
    $('rv-unlock').innerHTML = r.unlocks.length ? 'TOMORROW:<br>- ' + r.unlocks.join('<br>- ') : '';
    $('b-next').textContent = r.fired ? 'Start over' : 'Next day'; $('b-next').dataset.fired = r.fired ? '1' : '';
    this.show('review');
  },
  showMeeting() {
    $('mt-text').textContent = U.pick(['"Good news: quota is going up. Bad news: so is the morale deficit."', '"We are a family. Families do not leave at 5:00 sharp."', '"Someone is wasting company oxygen. Efficiency is everything."']);
    this.show('meeting');
  },
  bindMenus() {
    const sfx = () => AudioManager.play('ui');
    $('b-new').addEventListener('click', () => { AudioManager.init(); sfx(); Game.newGame(); });
    $('b-cont').addEventListener('click', () => { AudioManager.init(); sfx(); Game.continueGame(); });
    $('b-help').addEventListener('click', () => { sfx(); this.helpFrom = 'menu'; $('menu').classList.remove('show'); this.show('help'); });
    $('b-helpclose').addEventListener('click', () => { sfx(); this.hide('help'); if (this.helpFrom === 'menu') $('menu').classList.add('show'); else $('pause').classList.add('show'); });
    $('b-pausehelp').addEventListener('click', () => { sfx(); this.helpFrom = 'pause'; $('pause').classList.remove('show'); this.show('help'); });
    $('b-clockin').addEventListener('click', () => { sfx(); this.hide('dayintro'); Game.beginPlay(); });
    $('b-result').addEventListener('click', () => { sfx(); this.hide('result'); this.endCallUI(); CallSystem.dismissResult(); this.refreshApp(); Game.relock(); });
    $('b-next').addEventListener('click', () => { sfx(); this.hide('review'); if ($('b-next').dataset.fired) Game.newGame(); else Game.nextDay(); });
    $('b-rvmenu').addEventListener('click', () => { sfx(); Game.toMenu(); });
    $('b-resume').addEventListener('click', () => { sfx(); this.hide('pause'); Game.setPaused(false); Game.relock(); });
    $('b-pausesave').addEventListener('click', () => { sfx(); const ok = (CallSystem.state === 'idle' || CallSystem.state === 'ringing') && DaySystem.saveMid(); this.toast(ok ? 'Game saved.' : 'Cannot save during a call.', ok ? 'good' : 'warn'); });
    $('b-quit').addEventListener('click', () => { sfx(); Game.toMenu(); });
    $('b-meeting').addEventListener('click', () => { sfx(); this.hide('meeting'); EventSystem.endMeeting(); this.toast('Meeting over. 15 minutes of your life, gone.', 'info'); Game.relock(); });
    $('cf-yes').addEventListener('click', () => { this.hide('confirm'); const cb = this.confirmCb; this.confirmCb = null; if (cb) cb(); });
    $('cf-no').addEventListener('click', () => { this.hide('confirm'); this.confirmCb = null; });
    const vol = (e) => { const v = e.target.value / 100; AudioManager.setVolume(v); AudioManager.vol = v; $('vol').value = $('vol2').value = e.target.value; };
    $('vol').addEventListener('input', vol); $('vol2').addEventListener('input', vol);
    document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.btn,.pbtn,.pcicon,#cp-input button')) AudioManager.play('click', 0.5); }, true);
  },
};
