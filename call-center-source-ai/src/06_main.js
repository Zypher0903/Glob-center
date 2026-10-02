/* =====================================================================
   06_main.js  -  Game bootstrap, input wiring, main loop, game flow
   MENU -> NEW DAY -> OFFICE -> CALLS -> RESULT -> EVENTS -> END OF DAY -> REVIEW -> NEXT DAY
   ===================================================================== */

const Game = {
  renderer: null, scene: null, camera: null, last: 0, t: 0, uiT: 0,
  isPaused: false, expectUnlock: false, dayEnding: false, ready: false,

  init() {
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch (e) {
      document.body.insertAdjacentHTML('beforeend', '<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:99;background:#0b0d0c;text-align:center;padding:30px">WebGL is not available in this browser, so the 3D office cannot start.</div>');
      return;
    }
    const r = this.renderer; r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); r.setSize(window.innerWidth, window.innerHeight); $('stage').appendChild(r.domElement);
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x090b0a); this.scene.fog = new THREE.FogExp2(0x0a0d0c, 0.028);
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 80);
    World.build(this.scene); Player.init(this.camera); Interaction.init(); UI.init(); UI.bindMenus(); UI.initAI();
    World.resetDay(1);
    this.bindInput(); UI.showMenu(); this.ready = true;
    window.addEventListener('resize', () => { r.setSize(window.innerWidth, window.innerHeight); this.camera.aspect = window.innerWidth / window.innerHeight; this.camera.updateProjectionMatrix(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play' && !UI.inFocus()) this.pauseMenu(); });
    window.GAME_DEBUG = { G, CallSystem, EventSystem, BossSystem, TimeSystem, Player, World, UI, Game };
    this.last = performance.now(); requestAnimationFrame(n => this.frame(n));
  },

  /* ---------- flow ---------- */
  newGame() { G.career = freshCareer(); G.notes = ''; SaveSystem.clear(); this.startDay(1); },
  continueGame() {
    const s = SaveSystem.load(); if (!s) return;
    G.career = Object.assign(freshCareer(), s.career || {}); G.notes = s.notes || ''; this.startDay(s.day || 1, s.mid || null);
  },
  nextDay() { this.startDay(G.day + 1); },
  startDay(day, mid) {
    DaySystem.setup(day, mid); World.resetDay(day); Player.reset();
    G.mode = 'intro'; this.dayEnding = false; this.isPaused = false; this.hideAll();
    if (!mid) SaveSystem.save({ v: 1, day, career: G.career, notes: G.notes });
    UI.updateHUD(); UI.updateBanners(); UI.showPlayHud(false); UI.showDayIntro();
  },
  hideAll() { UI.hideAllGame(); $('menu').classList.remove('show'); },
  beginPlay() {
    G.mode = 'play'; TimeSystem.running = true; UI.showPlayHud(true); UI.updateHUD(); this.relock();
    UI.toast('Your phone is on the desk in front of the chair. Walk over (WASD), look at it and press E.', 'info');
    UI.toast('On a call you TYPE (or use Mic) whatever you want to say. The customers and the boss are AI.', 'info');
    LLM.warmup();
  },
  endDay(early) {
    if (this.dayEnding) return; this.dayEnding = true; TimeSystem.running = false; CallSystem.cancelRing();
    const review = DaySystem.review(early); G.mode = 'review';
    UI.endCallUI(); $('computer').classList.remove('show'); Player.locked = false; UI.showPlayHud(false);
    UI.showReview(review);
  },
  toMenu() { G.mode = 'menu'; TimeSystem.running = false; CallSystem.reset(); this.isPaused = false; UI.hideAllGame(); UI.showPlayHud(false); UI.showMenu(); },
  pauseMenu() { if (G.mode !== 'play' || this.isPaused) return; this.setPaused(true); UI.show('pause'); },
  setPaused(f) { this.isPaused = f; },
  canAct() { return G.mode === 'play' && !this.isPaused && !UI.inFocus(); },

  /* ---------- pointer lock + input ---------- */
  relock() {
    if (G.mode !== 'play' || UI.inFocus() || this.isPaused) return;
    if (Input.usePointerLock) {
      try { const p = this.renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => { Input.usePointerLock = false; }); } catch (e) { Input.usePointerLock = false; }
    }
  },
  bindInput() {
    const cv = this.renderer.domElement;
    document.addEventListener('keydown', e => {
      if (e.target && e.target.tagName === 'TEXTAREA') { if (e.code === 'Escape') e.target.blur(); return; }
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault();
      Input.keys[e.code] = true;
      if (G.mode !== 'play') return;
      if (e.code === 'Escape') {
        if ($('confirm').classList.contains('show')) return UI.hide('confirm');
        if ($('computer').classList.contains('show')) return UI.closeComputer(true);
        if ($('pause').classList.contains('show')) { UI.hide('pause'); this.setPaused(false); return this.relock(); }
        if (!UI.inFocus() && !Input.locked) return this.pauseMenu();
        return;
      }
      if (this.isPaused) return;
      if (e.code === 'KeyE' && this.canAct()) Interaction.use();
      if (e.code === 'KeyQ' && this.canAct() && Player.sitting) Player.stand();
      if (e.code === 'Tab' && !UI.anyModal() && Player.sitting && !$('computer').classList.contains('show') && Player.sitT > 0.8) UI.openComputer();
    });
    document.addEventListener('keyup', e => { Input.keys[e.code] = false; });
    window.addEventListener('blur', () => { Input.keys = {}; });
    document.addEventListener('mousemove', e => {
      if (Input.locked) { Input.dx += e.movementX; Input.dy += e.movementY; }
      else if (Input.drag) { Input.dx += e.movementX; Input.dy += e.movementY; }
    });
    cv.addEventListener('mousedown', () => {
      if (!this.canAct()) return;
      if (Input.usePointerLock && !Input.locked) this.relock(); else Input.drag = true;
    });
    window.addEventListener('mouseup', () => { Input.drag = false; });
    document.addEventListener('pointerlockchange', () => {
      Input.locked = document.pointerLockElement === cv;
      if (Input.locked) { $('clickhint').classList.add('hide'); return; }
      const exp = this.expectUnlock; this.expectUnlock = false;
      if (G.mode === 'play' && !exp && !UI.inFocus() && !this.isPaused) this.pauseMenu();
    });
    document.addEventListener('pointerlockerror', () => { Input.usePointerLock = false; });
  },

  /* ---------- loop ---------- */
  frame(now) {
    requestAnimationFrame(n => this.frame(n));
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.t += dt;
    const playing = G.mode === 'play' && !this.isPaused && !BossSystem.chat;
    if (playing) {
      TimeSystem.running = !EventSystem.blockCalls;
      TimeSystem.update(dt); CallSystem.update(dt); EventSystem.update(dt); BossSystem.update(dt);
      if (TimeSystem.ended() && !this.dayEnding && !EventSystem.blockCalls) {
        if (CallSystem.state === 'ringing') CallSystem.cancelRing();
        if (CallSystem.state === 'idle') this.endDay(false);
      }
    }
    const act = this.canAct();
    if (G.mode === 'play') { Player.update(this.isPaused ? 0 : dt, act); Interaction.update(act); }
    else { this.menuCamera(); }
    World.update(this.isPaused ? 0 : dt, this.t);
    // hint to re-capture mouse if unlocked in free-look (no modal open)
    const needClick = G.mode === 'play' && !this.isPaused && !UI.inFocus() && Input.usePointerLock && !Input.locked;
    $('clickhint').classList.toggle('hide', !needClick);
    this.uiT -= dt; if (this.uiT <= 0 && G.mode === 'play') { this.uiT = 0.5; UI.tick(); }
    this.renderer.render(this.scene, this.camera);
  },
  menuCamera() {
    const c = this.camera, t = this.t * 0.12;
    c.position.set(-6.5 + Math.sin(t) * 2.2, 2.2, -3.4 + Math.cos(t * 0.7) * 0.6);
    c.lookAt(1.5 + Math.sin(t * 0.8) * 1.5, 1.2, 3.2); Player.t += 0;
  },
};

window.addEventListener('load', () => { Game.init(); });
