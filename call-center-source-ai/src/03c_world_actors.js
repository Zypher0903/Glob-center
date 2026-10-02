/* =====================================================================
   03c_world_actors.js  -  Humanoid builder, Employee state machine, Boss,
   event reactions and World.update
   ===================================================================== */

function makeHuman(o) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  B(0.36, 0.5, 0.2, o.shirt, 0, 1.15, 0, body);
  if (o.tie) B(0.06, 0.3, 0.02, '#8a2a2a', 0, 1.2, 0.11, body);
  const head = new THREE.Group(); head.position.set(0, 1.5, 0); body.add(head);
  B(0.2, 0.24, 0.22, o.skin, 0, 0.12, 0, head); B(0.22, 0.08, 0.24, o.hair, 0, 0.26, -0.01, head);
  if (o.female) B(0.22, 0.28, 0.06, o.hair, 0, 0.08, -0.11, head);
  B(0.03, 0.03, 0.01, '#111', -0.05, 0.14, 0.115, head); B(0.03, 0.03, 0.01, '#111', 0.05, 0.14, 0.115, head);
  const arm = (sx) => { const p = new THREE.Group(); p.position.set(sx * 0.23, 1.38, 0); body.add(p); B(0.09, 0.5, 0.09, o.shirt, 0, -0.25, 0, p); B(0.08, 0.08, 0.08, o.skin, 0, -0.54, 0, p); return p; };
  const leg = (sx) => { const p = new THREE.Group(); p.position.set(sx * 0.09, 0.9, 0); body.add(p); B(0.13, 0.88, 0.13, o.pants, 0, -0.44, 0, p); return p; };
  const h = { root, body, head, armL: arm(-1), armR: arm(1), legL: leg(-1), legR: leg(1) };
  if (o.scale) root.scale.setScalar(o.scale);
  World.scene.add(root); return h;
}
const SHIRTS = ['#7a8060', '#6a5f7a', '#5d6e74', '#8a6a5a', '#6a7a58', '#74706a', '#5a6a8a'];
const PANTS = ['#2f3338', '#3a3a34', '#2a2e3a', '#4a4036'];
const HAIRS = ['#2a211c', '#4a3a2e', '#8a6a3a', '#b9b9b2', '#1a1a1a', '#6a2e22'];
const SKINS = ['#c8a583', '#d3ad8f', '#a67c5c', '#8a6347', '#e0bf9f'];

function gapX(cx) { return cx === 0 ? 1.5 : cx > 0 ? (cx === 6 ? 4.5 : cx - 1.5) : (cx === -6 ? -4.5 : cx + 1.5); }

class Employee {
  constructor(name, desk) {
    this.name = name; this.desk = desk; this.gx = gapX(desk.x);
    this.seat = { x: desk.x, z: desk.z + 0.75 };
    this.h = makeHuman({ shirt: U.pick(SHIRTS), pants: U.pick(PANTS), hair: U.pick(HAIRS), skin: U.pick(SKINS), female: U.chance(0.45) });
    this.path = []; this.then = null; this.state = 'typing'; this.t = U.rand(3, 9); this.ph = Math.random() * 10;
    this.loc = 'desk'; this.box = null; this.gone = false; this.sit();
  }
  sit() { const r = this.h.root; r.position.set(this.seat.x, 0, this.seat.z); r.rotation.y = Math.PI; this.h.body.position.y = -0.42; this.h.legL.rotation.x = this.h.legR.rotation.x = -1.5; this.seated = true; this.loc = 'desk'; }
  stand() { this.h.body.position.y = 0; this.h.legL.rotation.x = this.h.legR.rotation.x = 0; this.seated = false; }
  go(pts, then) { if (this.seated) this.stand(); this.path = pts.map(p => ({ x: p[0], z: p[1] })); this.then = then || null; this.state = 'walk'; }
  away() { return !this.seated; }
  routeBack() {
    const g = this.gx, s = this.seat;
    if (this.loc === 'break') return [[10.5, 2], [8.2, 2], [8.2, 3.6], [g, 3.6], [g, s.z], [s.x, s.z]];
    if (this.loc === 'aisle02') return [[g, 0.2], [g, s.z], [s.x, s.z]];
    return [[g, 3.6], [g, s.z], [s.x, s.z]];
  }
  returnToDesk() { this.go(this.routeBack(), () => { this.sit(); this.set('typing', U.rand(3, 8)); }); }
  set(s, t) { this.state = s; this.t = t || 4; }
  update(dt) {
    if (this.gone) return;
    const h = this.h; this.ph += dt;
    h.head.rotation.y *= 0.9;
    if (this.state === 'walk') {
      const tg = this.path[0];
      if (!tg) { const f = this.then; this.then = null; if (f) f(); else this.set('typing', 3); return; }
      const r = h.root, dx = tg.x - r.position.x, dz = tg.z - r.position.z, d = Math.hypot(dx, dz), step = 1.35 * dt;
      if (d < step + 0.03) { r.position.x = tg.x; r.position.z = tg.z; this.path.shift(); return; }
      r.position.x += dx / d * step; r.position.z += dz / d * step; r.rotation.y = Math.atan2(dx, dz);
      const sw = Math.sin(this.ph * 8) * 0.6; h.legL.rotation.x = sw; h.legR.rotation.x = -sw; h.armL.rotation.x = this.box ? -1.3 : -sw * 0.7; h.armR.rotation.x = this.box ? -1.3 : sw * 0.7;
      return;
    }
    const seatedArms = (l, r) => { h.armL.rotation.x = l; h.armR.rotation.x = r; };
    this.t -= dt;
    switch (this.state) {
      case 'typing':
        seatedArms(-1.25 + Math.sin(this.ph * 14) * 0.06, -1.25 + Math.sin(this.ph * 15 + 1) * 0.06);
        if (this.t <= 0) this.pickNext(); break;
      case 'phone':
        seatedArms(-1.25 + Math.sin(this.ph * 9) * 0.05, -2.5); h.head.rotation.z = 0.12;
        if (this.t <= 0) { h.head.rotation.z = 0; this.set('typing', U.rand(4, 9)); } break;
      case 'stretch':
        seatedArms(-3.0, -3.0); if (this.t <= 0) this.set('typing', U.rand(4, 9)); break;
      case 'sip':
        seatedArms(-0.2, -2.2 + Math.sin(this.ph * 2) * 0.1);
        if (this.t <= 0) this.returnToDesk(); break;
      case 'argue':
        seatedArms(-1.4 + Math.sin(this.ph * 7) * 0.7, -1.2 + Math.sin(this.ph * 6 + 2) * 0.8); break;
      case 'meeting':
        seatedArms(0, 0); break;
      case 'look':
        if (this.t <= 0) this.set('typing', U.rand(3, 8)); break;
    }
  }
  pickNext() {
    const away = World.employees.filter(e => e.away()).length, boss = BossSystem.state !== 'office';
    const r = Math.random();
    if (r < 0.45 || boss) this.set('typing', U.rand(5, 12));
    else if (r < 0.7) this.set('phone', U.rand(8, 16));
    else if (r < 0.8) this.set('stretch', 3);
    else if (r < 0.93 && !World.doors.break.locked && away < 2) {
      const g = this.gx, s = this.seat;
      this.go([[g, s.z], [g, 3.6], [8.2, 3.6], [8.2, 2], [10.5, 2], [11.5, 0.9]], () => { this.loc = 'break'; this.h.root.rotation.y = 0; this.set('sip', 6); });
    } else { this.h.head.rotation.y = U.rand(-0.8, 0.8); this.set('look', 2.5); }
  }
  glance(x, z) { if (this.seated && this.state !== 'phone') { this.h.head.rotation.y = U.clamp(Math.atan2(x - this.seat.x, z - this.seat.z) - Math.PI, -1, 1) * 0.0 + U.rand(-0.9, 0.9); this.set('look', 2.5); } }
  remove() { this.gone = true; World.scene.remove(this.h.root); }
}

class Boss {
  constructor() {
    this.h = makeHuman({ shirt: '#2b2e33', pants: '#22252a', hair: '#8a8a84', skin: '#d0a888', tie: true, scale: 1.07 });
    this.chair = { x: 5, z: -11.6 }; this.path = []; this.state = 'sit'; this.ph = 0; this.stepT = 0; this.then = null; this.sitDown();
  }
  sitDown() { const r = this.h.root; r.position.set(this.chair.x, 0, this.chair.z); r.rotation.y = 0; this.h.body.position.y = -0.42; this.h.legL.rotation.x = this.h.legR.rotation.x = -1.5; this.state = 'sit'; }
  go(pts, then) { this.h.body.position.y = 0; this.h.legL.rotation.x = this.h.legR.rotation.x = 0; this.path = pts.map(p => ({ x: p[0], z: p[1] })); this.then = then; this.state = 'walk'; }
  route() { return [[6.6, -11.6], [6.6, -9.2], [5, -9.2], [5, -6.8], [0, -6.8], [0, -4], [1.5, -3.8], [1.5, 3.4], [0.3, 3.4]]; }
  startVisit() { this.go(this.route(), () => { this.h.root.rotation.y = Math.PI; this.state = 'watch'; BossSystem.arrived(); }); }
  leave() { this.go(this.route().reverse().concat([[5, -11.6]]), () => { this.sitDown(); BossSystem.returned(); }); }
  update(dt) {
    const h = this.h; this.ph += dt;
    if (this.state === 'sit') { h.armL.rotation.x = -1.2 + Math.sin(this.ph * 9) * 0.05; h.armR.rotation.x = -1.2 + Math.sin(this.ph * 10) * 0.05; return; }
    if (this.state === 'watch') { h.armL.rotation.x = -0.3; h.armR.rotation.x = -0.9; h.head.rotation.y = Math.sin(this.ph * 0.6) * 0.15; return; }
    const tg = this.path[0];
    if (!tg) { const f = this.then; this.then = null; if (f) f(); return; }
    const r = h.root, dx = tg.x - r.position.x, dz = tg.z - r.position.z, d = Math.hypot(dx, dz), step = 1.6 * dt;
    if (d < step + 0.03) { r.position.x = tg.x; r.position.z = tg.z; this.path.shift(); return; }
    r.position.x += dx / d * step; r.position.z += dz / d * step; r.rotation.y = Math.atan2(dx, dz);
    const sw = Math.sin(this.ph * 7) * 0.55; h.legL.rotation.x = sw; h.legR.rotation.x = -sw; h.armL.rotation.x = -sw * 0.6; h.armR.rotation.x = sw * 0.6;
    this.stepT -= dt;
    if (this.stepT <= 0) { this.stepT = 0.5; const dist = Math.hypot(r.position.x - Player.pos.x, r.position.z - Player.pos.z); AudioManager.play('footstep', U.clamp(1 - dist / 16, 0, 1) * 0.9); }
  }
}

World.build = function (scene) {
  this.scene = scene;
  this.buildShell(); this.buildOffice(); this.buildHallway(); this.buildServerRoom(); this.buildBossOffice(); this.buildBreakRoom();
  this.boss = new Boss();
  const react = (x, z) => this.employees.forEach(e => e.glance(x, z));
  Bus.on('time', () => this.drawClock());
  Bus.on('boss:visit', () => { this.boss.startVisit(); this.employees.forEach(e => { if (e.away() && e.state !== 'walk') e.returnToDesk(); else if (e.seated) e.set('typing', 12); }); });
  Bus.on('boss:leave', () => this.boss.leave());
  Bus.on('call:ring', () => react(0, 2));
  Bus.on('event:start', ev => {
    const id = ev.id, seated = this.employees.filter(e => e.seated && !e.gone);
    if (id === 'crash' || id === 'flicker') { react(0, 2); if (id === 'flicker') this.flickerT = 3.5; }
    if (id === 'printer') this.printerBad = true;
    if (id === 'server') this.serverAlert = true;
    if (id === 'network') this.netDown = true;
    if (id === 'overload') seated.forEach(e => e.set('phone', 38));
    if (id === 'argument' && seated.length >= 2) {
      const a = seated[0], b = seated[1];
      a.go([[a.gx, a.seat.z], [a.gx, 3.6], [-0.7, 3.6]], () => { a.loc = 'aisle36'; a.h.root.rotation.y = Math.PI / 2; a.set('argue', 14); });
      b.go([[b.gx, b.seat.z], [b.gx, 3.6], [0.7, 3.6]], () => { b.loc = 'aisle36'; b.h.root.rotation.y = -Math.PI / 2; b.set('argue', 14); });
      [a, b].forEach(e => { e.loc = 'aisle36'; });
    }
    if (id === 'spill') {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.6, 14), new THREE.MeshBasicMaterial({ color: 0x2a1c10, transparent: true, opacity: 0.8 }));
      m.rotation.x = -Math.PI / 2; m.position.set(1.5, 0.012, 0.9); scene.add(m); this.puddle = { x: 1.5, z: 0.9, r: 0.65, mesh: m }; react(1.5, 0.9);
    }
    if (id === 'fired' && seated.length) {
      const e = U.pick(seated), g = e.gx;
      Bus.emit('toast', { text: e.name + ' has been let go. Security is escorting them out.', kind: 'warn' });
      e.box = B(0.3, 0.2, 0.3, '#8a6a3a', 0, 1.0, 0.32, e.h.body);
      e.go([[g, e.seat.z], [g, -3.6], [0, -3.8], [0, -6.5], [8.0, -6.5]], () => { if (e.box) e.h.body.remove(e.box); e.remove(); });
      this.employees.forEach(o => { if (o !== e) o.glance(0, 0); });
    }
    if (id === 'meeting') {
      UI.showMeeting();
      this.employees.forEach((e, i) => { if (e.gone) return; const g = e.gx, sx = -6 + i * 1.6; e.loc = 'aisle02'; const f = () => { e.h.root.rotation.y = Math.PI; e.set('meeting', 999); }; if (e.seated) e.go([[g, e.seat.z], [g, 0.2], [sx, 0.2]], f); else e.go([[g, 0.2], [sx, 0.2]], f); });
    }
  });
  Bus.on('event:end', ev => {
    const id = ev.id;
    if (id === 'printer') this.printerBad = false;
    if (id === 'server') this.serverAlert = false;
    if (id === 'network') this.netDown = false;
    if (id === 'spill' && this.puddle) { scene.remove(this.puddle.mesh); this.puddle = null; }
    if (id === 'argument') this.employees.forEach(e => { if (e.state === 'argue') e.returnToDesk(); });
    if (id === 'meeting') this.employees.forEach(e => { if (!e.gone && e.state === 'meeting') e.returnToDesk(); });
  });
};

World.resetDay = function (day) {
  this.employees.forEach(e => { if (!e.gone) e.remove(); }); this.employees = [];
  if (this.puddle) { this.scene.remove(this.puddle.mesh); this.puddle = null; }
  this.flickerT = 0; this.printerBad = false; this.serverAlert = false; this.netDown = false;
  const seats = [[0, 0], [0, 1], [0, 3], [1, 0], [1, 4], [2, 1], [2, 2], [2, 4]], names = EMPLOYEE_NAMES.slice().sort(() => Math.random() - 0.5);
  seats.forEach((s, i) => { const e = new Employee(names[i % names.length], { x: DESK_COLS[s[1]], z: DESK_ROWS[s[0]] }); e.set('typing', U.rand(1, 8)); this.employees.push(e); });
  this.boss.sitDown(); this.applyUnlocks(PROG.forDay(day).unlocks);
};

World.update = function (dt, t) {
  this.updaters.forEach(f => f(dt));
  this.employees.forEach(e => e.update(dt)); this.boss.update(dt);
  this.drawPlayerScreen();
  // fluorescent flicker
  let f = 1;
  if (this.flickerT > 0) { this.flickerT -= dt; f = Math.random() < 0.5 ? 0.12 : 1; AudioManager.buzzLevel(f < 0.5 ? 4 : 1); }
  else if (Math.random() < 0.003) f = 0.55; else AudioManager.buzzLevel(1);
  this.lightsFluor.forEach(l => {
    if (l.panel) l.panel.material.color.setHex(l.base).multiplyScalar(0.35 + 0.65 * f);
    if (l.light) l.light.intensity = l.base * f;
  });
  if (Math.random() < 0.01) this.hallLight2.intensity = Math.random() < 0.5 ? 0.15 : 0.5;
  // server room blinking + alert
  if (Math.random() < 0.15) { const led = U.pick(this.rackLeds); led.visible = !led.visible; }
  if (this.serverAlert || this.netDown) { const p = 0.5 + 0.5 * Math.sin(t * 6); this.serverLight.color.setRGB(1, 0.2 + 0.2 * (1 - p), 0.12); this.serverLight.intensity = 0.5 + p * 0.9; this.serverBlue.color.setHex(0xaa2222); }
  else { this.serverLight.color.setHex(0xffd08a); this.serverLight.intensity = 0.9; this.serverBlue.color.setHex(0x5c7fbf); }
  if (this.printerLed) this.printerLed.material = BasicM(this.printerBad && Math.sin(t * 10) > 0 ? 0xff2020 : 0x1a6a1a);
  if (this.printerBad && Math.random() < 0.02) AudioManager.play('notify', 0.35, 0.5);
  // phone LED
  if (this.player) this.player.led.material = BasicM(CallSystem.state === 'ringing' && Math.sin(t * 14) > 0 ? 0xff3322 : (CallSystem.state === 'active' ? 0x22aa33 : 0x331111));
};
