/* =====================================================================
   03b_world_rooms.js  -  Workstations, player desk, rooms and props
   ===================================================================== */

const DESK_COLS = [-6, -3, 0, 3, 6], DESK_ROWS = [-2, 1.5, 5];
const PLAYER_DESK = { x: 0, z: 1.5 };
const SEAT = { x: 0, z: 2.25, eyeY: 1.2 };

function textScreen(lines, color, bg) {
  return canvasTex(128, 96, (x, w, h) => {
    x.fillStyle = bg || '#0b1a12'; x.fillRect(0, 0, w, h); x.fillStyle = color || '#7fcf8f'; x.font = '9px monospace';
    lines.forEach((l, i) => x.fillText(l, 5, 12 + i * 11));
    x.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 0; y < h; y += 3) x.fillRect(0, y, w, 1);
  });
}
function mugTex() { return canvasTex(64, 32, (x, w, h) => { x.fillStyle = '#d8d4c4'; x.fillRect(0, 0, w, h); x.fillStyle = '#4a3f33'; x.font = 'bold 7px Arial'; x.fillText("WORLD'S OKAYEST", 4, 14); x.fillText('EMPLOYEE', 14, 24); }); }

World.buildWorkstation = function (cx, cz, isPlayer, variant) {
  const g = new THREE.Group(); this.scene.add(g);
  const deskC = '#6e6a58', fabric = '#59604f', beige = '#a9a58f';
  B(1.5, 0.05, 0.75, deskC, cx, 0.74, cz, g);
  B(0.04, 0.72, 0.7, '#4f4c3f', cx - 0.7, 0.36, cz, g); B(0.04, 0.72, 0.7, '#4f4c3f', cx + 0.7, 0.36, cz, g);
  B(1.4, 0.4, 0.03, '#4f4c3f', cx, 0.5, cz - 0.33, g);
  B(0.05, 1.15, 0.9, fabric, cx - 0.86, 0.58, cz, g); B(0.05, 1.15, 0.9, fabric, cx + 0.86, 0.58, cz, g);
  solid(cx - 0.9, cz - 0.45, cx + 0.9, cz + 0.4);
  // monitor (CRT)
  const mon = new THREE.Group(); g.add(mon);
  B(0.44, 0.38, 0.42, beige, cx, 1.0, cz - 0.15, mon); B(0.18, 0.05, 0.2, beige, cx, 0.8, cz - 0.15, mon);
  let screenMat;
  if (isPlayer) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 192; const t = new THREE.CanvasTexture(c);
    World.screens.player = { canvas: c, tex: t, key: '' }; screenMat = new THREE.MeshBasicMaterial({ map: t });
  } else {
    const L = [['C:\\> sales.xls', 'Q3 .... 41%', 'Q4 .... 12%', 'DO NOT PANIC', '> _'], ['CALL LOG', '14:02 NO ANS', '14:09 HANGUP', '14:15 NO ANS', '> _'], ['ERR 0x7F', 'RETRY? (Y/N)', '', 'Y', '']][variant % 3];
    screenMat = new THREE.MeshBasicMaterial({ map: textScreen(L, ['#7fcf8f', '#d6c070', '#cf7f7f'][variant % 3]) });
  }
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.26), screenMat); scr.position.set(cx, 1.02, cz + 0.061); mon.add(scr);
  B(0.2, 0.42, 0.42, beige, cx + 0.55, 0.22, cz - 0.1, g);           // PC tower
  const kb = B(0.44, 0.025, 0.15, '#8d8a78', cx, 0.775, cz + 0.2, g);
  const ms = B(0.06, 0.03, 0.09, '#8d8a78', cx + 0.34, 0.78, cz + 0.22, g);
  // phone
  const ph = new THREE.Group(); g.add(ph);
  B(0.2, 0.07, 0.22, '#25272a', cx - 0.52, 0.8, cz + 0.02, ph); B(0.22, 0.04, 0.06, '#1c1e20', cx - 0.52, 0.86, cz + 0.02, ph);
  const led = B(0.03, 0.02, 0.03, BasicM(0x331111), cx - 0.46, 0.84, cz + 0.12, ph);
  // clutter
  B(0.28, 0.01, 0.2, '#cfcab8', cx - 0.3, 0.77, cz + 0.28, g).rotation.y = Math.random() - 0.5;
  B(0.22, 0.01, 0.16, '#c4bfa9', cx + 0.45, 0.77, cz + 0.05, g).rotation.y = Math.random() - 0.5;
  const mug = CYL(0.045, 0.04, 0.1, new THREE.MeshLambertMaterial({ map: mugTex() }), cx + 0.5, 0.82, cz + 0.28, g, 12);
  if (variant % 2 === 0) CYL(0.03, 0.03, 0.12, M('#a32b2b'), cx - 0.25, 0.83, cz + 0.3, g, 10);       // energy can
  // chair
  const chair = new THREE.Group(); chair.position.set(cx, 0, cz + 0.75); chair.rotation.y = (Math.random() - 0.5) * 0.5; g.add(chair);
  B(0.5, 0.07, 0.5, '#3a4048', 0, 0.5, 0, chair); B(0.5, 0.55, 0.07, '#343a41', 0, 0.82, 0.24, chair);
  CYL(0.03, 0.03, 0.3, '#222', 0, 0.3, 0, chair, 6); B(0.55, 0.04, 0.06, '#222', 0, 0.1, 0, chair); B(0.06, 0.04, 0.55, '#222', 0, 0.1, 0, chair);
  return { group: g, mon, scr, kb, ms, led, mug, chair, ph };
};

World.buildOffice = function () {
  let v = 0;
  DESK_ROWS.forEach((rz, ri) => DESK_COLS.forEach((cx, ci) => {
    const isP = (ri === 1 && ci === 2);
    const ws = this.buildWorkstation(cx, rz, isP, v++);
    if (isP) this.player = ws;
    if (!isP && Math.random() < 0.5) ws.chair.rotation.y += 0.6;
  }));
  const p = this.player;
  // --- player's desk interactions
  interact(p.mon, { label: () => 'Use computer', action: () => UI.openComputer() });
  interact(p.kb, { label: () => 'Use computer', action: () => UI.openComputer() });
  interact(p.ph, { label: () => CallSystem.state === 'ringing' ? 'Answer phone' : (CallSystem.state === 'active' ? 'Phone (on the line)' : 'Phone'), action: () => {
    if (CallSystem.state === 'ringing') { Player.sit(); CallSystem.answer(); } else if (CallSystem.state === 'idle') say('The phone is quiet. For now.');
  } });
  interact(p.chair, { label: () => Player.sitting ? '' : 'Sit down', action: () => Player.sit() });
  let mugReady = 0;
  interact(p.mug, { label: () => 'Drink coffee', action: () => {
    if (performance.now() < mugReady) return say('The mug is empty. Of course it is.');
    if (G.buff.coffee) return say('You are already as caffeinated as you can get.');
    G.buff.coffee = true; mugReady = performance.now() + 90000; say('Cold, bitter coffee. Next caller starts with +10 patience.', 'good');
  } });
  // sticky notes on the player's monitor
  const stick = B(0.07, 0.07, 0.01, '#d9cf6a', SEAT.x + 0.2, 1.17, PLAYER_DESK.z + 0.062, p.group); stick.rotation.z = 0.15;
  B(0.07, 0.07, 0.01, '#d99a6a', SEAT.x - 0.2, 1.1, PLAYER_DESK.z + 0.062, p.group).rotation.z = -0.1;
  interact(stick, { label: () => 'Read sticky note', action: () => say(U.pick(FLAVOR.sticky)) });
  // headset
  const hs = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 14, Math.PI), M('#1b1b1d')); hs.position.set(0.28, 0.82, PLAYER_DESK.z + 0.3); hs.rotation.x = Math.PI / 2; p.group.add(hs);
  B(0.05, 0.05, 0.03, '#1b1b1d', 0.205, 0.8, PLAYER_DESK.z + 0.3, p.group); B(0.05, 0.05, 0.03, '#1b1b1d', 0.355, 0.8, PLAYER_DESK.z + 0.3, p.group);
  // desk fan
  const fan = new THREE.Group(); fan.position.set(-0.55, 0.77, PLAYER_DESK.z + 0.28); p.group.add(fan);
  CYL(0.07, 0.08, 0.03, '#444', 0, 0.015, 0, fan, 10); B(0.03, 0.14, 0.03, '#555', 0, 0.1, 0, fan);
  const blades = new THREE.Group(); blades.position.set(0, 0.2, 0.02); fan.add(blades);
  for (let i = 0; i < 4; i++) { const b = B(0.16, 0.035, 0.01, '#9a9a90', 0, 0, 0, blades); b.rotation.z = i * Math.PI / 4 * 1; b.position.set(0, 0, 0); }
  let fanOn = true; this.updaters.push(dt => { if (fanOn) blades.rotation.z += dt * 18; });
  interact(fan, { label: () => fanOn ? 'Turn fan off' : 'Turn fan on', action: () => { fanOn = !fanOn; AudioManager.play('click'); } });

  // --- walls: clock, posters, sign, camera, cabinets, printer, cooler
  const clk = canvasTex(128, 128, () => {}); this.clockCanvas = clk.image; this.clockTex = clk;
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), new THREE.MeshBasicMaterial({ map: clk })); clock.position.set(4.5, 2.25, -4.88); this.scene.add(clock);
  interact(clock, { label: () => 'Check the clock', action: () => say('It is ' + TimeSystem.format() + '. Nobody here leaves on time.') });
  this.drawClock();
  const poster = (x, z, rot, txt, col, idx) => {
    const t = canvasTex(128, 160, (c, w, h) => { c.fillStyle = col; c.fillRect(0, 0, w, h); c.fillStyle = '#1c1c1a'; c.fillRect(8, 8, w - 16, h - 40); c.fillStyle = '#c9c4ae'; c.textAlign = 'center'; c.font = 'bold 12px Arial'; const words = txt.split(' '); words.slice(0, 3).forEach((wd, i) => c.fillText(wd, w / 2, 60 + i * 18)); c.font = '8px Arial'; c.fillStyle = '#222'; c.fillText(words.slice(3).join(' ') || 'GLOBE-COM', w / 2, h - 16); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.75), new THREE.MeshBasicMaterial({ map: t })); m.position.set(x, 1.7, z); m.rotation.y = rot; this.scene.add(m);
    interact(m, { label: () => 'Read poster', action: () => say(FLAVOR.posters[idx % FLAVOR.posters.length]) });
  };
  poster(-5.5, -4.88, 0, 'TEAMWORK because blame is better shared', '#6b7358', 0);
  poster(-8.88, 4.2, Math.PI / 2, 'QUOTA IS A STATE OF MIND', '#6a5f58', 1);
  poster(8.88, -3.2, -Math.PI / 2, 'SMILE THEY CAN HEAR IT', '#586a6a', 2);
  const sign = canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#25282a'; c.fillRect(0, 0, w, h); drawLogoBlock(c, 60, 38, 0.55, ''); c.textAlign = 'left'; c.fillStyle = '#c9d2c3'; c.font = 'bold 20px Arial'; c.fillText('GLOBE-COM', 100, 42); c.font = '11px Arial'; c.fillStyle = '#9aa598'; c.fillText('SOLUTIONS  -  "WE CALL YOU"', 100, 62); });
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), new THREE.MeshBasicMaterial({ map: sign })); sg.position.set(-3.5, 2.25, -4.88); this.scene.add(sg);
  const days = canvasTex(128, 64, (c, w, h) => { c.fillStyle = '#d8d6c8'; c.fillRect(0, 0, w, h); c.fillStyle = '#222'; c.font = 'bold 10px Arial'; c.textAlign = 'center'; c.fillText('DAYS SINCE LAST INCIDENT', 64, 18); c.font = 'bold 28px Arial'; c.fillStyle = '#a02a22'; c.fillText('0', 64, 52); });
  const ds = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({ map: days })); ds.position.set(7.2, 1.9, -4.88); this.scene.add(ds);
  // security camera
  const cam = new THREE.Group(); cam.position.set(8.6, 2.75, -4.6); this.scene.add(cam);
  B(0.12, 0.12, 0.12, '#222', 0, 0.1, 0, cam); const head = new THREE.Group(); cam.add(head); B(0.14, 0.12, 0.3, '#3a3c3a', 0, 0, 0.1, head); const cled = B(0.03, 0.03, 0.03, BasicM(0xff2222), 0.05, 0.04, 0.26, head);
  let ct = 0; this.updaters.push(dt => { ct += dt; head.rotation.y = 2.3 + Math.sin(ct * 0.5) * 0.55; cled.visible = (ct % 1.6) < 1.0; });
  interact(head, { label: () => 'Security camera', action: () => say(U.pick(FLAVOR.camera)) });
  // filing cabinets, printer, water cooler
  const cab = B(0.5, 1.3, 0.6, '#6a6f66', -8.6, 0.65, -3.6, this.scene); B(0.46, 0.3, 0.02, '#585d54', -8.3, 0.4, -3.6, this.scene); B(0.46, 0.3, 0.02, '#585d54', -8.3, 0.85, -3.6, this.scene);
  solidBox(-8.6, -3.6, 0.5, 0.6); interact(cab, { label: () => 'Open filing cabinet', action: () => say(U.pick(FLAVOR.cabinet)) });
  const pr = new THREE.Group(); this.scene.add(pr); B(0.8, 0.8, 0.6, '#3d403d', 8.3, 0.4, 5.6, pr); const pt = B(0.7, 0.22, 0.5, '#a9a58f', 8.3, 0.9, 5.6, pr); this.printerLed = B(0.05, 0.03, 0.03, BasicM(0x1a6a1a), 8.55, 0.99, 5.34, pr);
  solidBox(8.3, 5.6, 0.8, 0.6); interact(pr, { label: () => 'Printer', action: () => say(U.pick(FLAVOR.printer)) });
  const wc = new THREE.Group(); this.scene.add(wc); B(0.4, 0.9, 0.4, '#9a9a90', 8.4, 0.45, -3.8, wc); CYL(0.16, 0.16, 0.45, '#6a8aa0', 8.4, 1.1, -3.8, wc, 10);
  solidBox(8.4, -3.8, 0.45, 0.45); interact(wc, { label: () => 'Water cooler', action: () => say(U.pick(FLAVOR.cooler)) });
  // trash bins & floor cables
  [[-4.5, 3.3], [4.5, 0.3], [-1.5, 6.4]].forEach(b => CYL(0.14, 0.12, 0.35, '#3c3f3c', b[0], 0.17, b[1], this.scene, 8));
  cable([[0.55, 0.1, 1.4], [0.8, 0.02, 1.6], [1.5, 0.01, 1.2], [3, 0.01, 0.6], [5, 0.01, -1]], '#111', 0.015);
  cable([[-3, 0.1, 1.2], [-3.4, 0.01, 0.5], [-5, 0.01, -0.2], [-8.5, 0.01, -1.2]], '#2a2a2a', 0.015);
  cable([[3, 0.1, 5], [2, 0.01, 4.6], [-1, 0.01, 3.9], [-6, 0.01, 4.2]], '#1d1d1d', 0.015);
  cable([[-9, 2.8, -4.5], [-5, 2.7, -4.6], [0, 2.78, -4.7], [5, 2.7, -4.6], [9, 2.8, -4.5]], '#1a1a1a', 0.03);
};

World.drawClock = function () {
  const c = this.clockCanvas, x = c.getContext('2d'); x.clearRect(0, 0, 128, 128);
  x.fillStyle = '#d4d1c2'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.strokeStyle = '#2a2a28'; x.lineWidth = 5; x.stroke();
  x.fillStyle = '#222'; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; x.fillRect(64 + Math.sin(a) * 52 - 2, 64 - Math.cos(a) * 52 - 2, 4, 4); }
  const m = TimeSystem.minutes, mm = m % 60, hh = (m / 60) % 12;
  const hand = (ang, len, w) => { x.strokeStyle = '#1a1a18'; x.lineWidth = w; x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + Math.sin(ang) * len, 64 - Math.cos(ang) * len); x.stroke(); };
  hand(hh / 12 * 6.283, 30, 5); hand(mm / 60 * 6.283, 46, 3);
  this.clockTex.needsUpdate = true;
};

World.drawPlayerScreen = function () {
  const sc = this.screens.player; if (!sc) return;
  let key = 'idle', sub = '';
  if (UI && UI.crashed) key = 'crash';
  else if (CallSystem.state === 'ringing') key = 'ring' + (Math.floor(performance.now() / 500) % 2);
  else if (CallSystem.state === 'active') key = 'call';
  else if (EventSystem.isActive('network')) key = 'net';
  if (key === sc.key) return; sc.key = key;
  const x = sc.canvas.getContext('2d'), w = 256, h = 192;
  x.fillStyle = key === 'crash' ? '#10206a' : '#0f1d22'; x.fillRect(0, 0, w, h);
  if (key === 'crash') { x.fillStyle = '#cfd6ff'; x.font = '12px monospace'; x.fillText('A problem has been detected.', 14, 40); x.fillText('GLOBECOM.SYS - RESTARTING', 14, 62); x.fillText('Please do not cry at the desk.', 14, 84); }
  else {
    drawLogoBlock(x, w / 2, 70, 0.9, 'SOLUTIONS');
    x.textAlign = 'center'; x.font = 'bold 15px monospace';
    if (key.startsWith('ring')) { x.fillStyle = key === 'ring0' ? '#e0c060' : '#8a7030'; x.fillText('INCOMING CALL', w / 2, 168); }
    else if (key === 'call') { x.fillStyle = '#7fcf8f'; x.fillText('CALL IN PROGRESS', w / 2, 168); }
    else if (key === 'net') { x.fillStyle = '#d06050'; x.fillText('NO CARRIER', w / 2, 168); }
    else { x.fillStyle = '#6a8a7a'; x.fillText('LINE 1: IDLE', w / 2, 168); }
  }
  x.fillStyle = 'rgba(0,0,0,0.15)'; for (let y = 0; y < h; y += 3) x.fillRect(0, y, w, 1);
  sc.tex.needsUpdate = true;
};

World.buildHallway = function () {
  const bb = canvasTex(128, 96, (c, w, h) => { c.fillStyle = '#7a6a4a'; c.fillRect(0, 0, w, h); c.fillStyle = '#d8d6c8'; for (let i = 0; i < 4; i++) c.fillRect(8 + i * 30, 10 + (i % 2) * 20, 24, 30); c.fillStyle = '#a02a22'; c.font = 'bold 9px Arial'; c.fillText('MANDATORY FUN DAY', 8, 80); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), new THREE.MeshBasicMaterial({ map: bb })); m.position.set(-1.5, 1.7, -7.88); this.scene.add(m);
  interact(m, { label: () => 'Read notice', action: () => say("Notice: 'MANDATORY FUN DAY - attendance is not optional.'") });
  const ex = B(0.5, 0.18, 0.05, BasicM(0x2f9a4a), 8.5, 2.5, -6.5, this.scene);
  B(0.1, 2.2, 1.2, '#4a4d46', 8.88, 1.1, -6.5, this.scene);
  cable([[-8.8, 2.6, -7.8], [-4, 2.4, -7.6], [2, 2.55, -7.7], [8, 2.5, -7.7]], '#171717', 0.03);
};

World.buildServerRoom = function () {
  const rackTex = canvasTex(128, 256, (c, w, h) => {
    c.fillStyle = '#30343a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 10; i++) { const y = 8 + i * 24; c.fillStyle = '#1a1c20'; c.fillRect(6, y, w - 12, 20); c.fillStyle = '#44484e'; for (let k = 0; k < 8; k++) c.fillRect(10 + k * 6, y + 4, 4, 12);
      for (let k = 0; k < 4; k++) { c.fillStyle = ['#46c46a', '#e0a030', '#46c46a', '#c43d30'][Math.floor(Math.random() * 4)]; c.fillRect(70 + k * 12, y + 8, 5, 5); } }
  });
  this.rackLeds = [];
  for (let i = 0; i < 5; i++) {
    const x = -8 + i * 1.5, z = -13.3, g = new THREE.Group(); this.scene.add(g);
    B(0.9, 2.1, 0.9, '#1d2024', x, 1.05, z, g);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 2.0), new THREE.MeshLambertMaterial({ map: rackTex })); f.position.set(x, 1.05, z + 0.455); g.add(f);
    for (let k = 0; k < 6; k++) { const led = B(0.03, 0.03, 0.02, BasicM(k % 3 === 0 ? 0xe0a030 : 0x46e06a), x - 0.3 + (k % 3) * 0.04, 0.4 + k * 0.28, z + 0.47, g); this.rackLeds.push(led); }
    solidBox(x, z, 0.9, 0.9);
    interact(g, { label: () => 'Check server rack', action: () => say(World.serverAlert ? 'The rack is hot to the touch. Something is wrong.' : U.pick(FLAVOR.server)) });
    for (let c = 0; c < 4; c++) cable([[x - 0.3 + c * 0.2, 2.1, z + 0.3], [x - 0.4 + c * 0.25, 1.4, z + 0.8], [x + (Math.random() - 0.5), 0.4, z + 1.2 + Math.random()], [x + Math.random() * 2 - 1, 0.01, z + 1.6 + Math.random() * 1.2]], ['#111', '#1b2a44', '#442020', '#2a2a2a'][c], 0.018);
  }
  for (let i = 0; i < 6; i++) cable([[-8.6 + i * 1.4, 2.95, -13.5], [-8 + i * 1.3, 2.4, -12.4], [-7 + i * 1.2, 2.0, -11.2], [-6.5 + i * 0.8, 2.6, -9.5]], '#141414', 0.025);
  // cart + old monitor + stool
  const cart = new THREE.Group(); this.scene.add(cart);
  B(0.9, 0.04, 0.6, '#555a5e', -2.6, 0.75, -9.9, cart); B(0.9, 0.04, 0.6, '#555a5e', -2.6, 0.35, -9.9, cart);
  [[-3, -10.15], [-2.2, -10.15], [-3, -9.65], [-2.2, -9.65]].forEach(p => B(0.03, 0.75, 0.03, '#444', p[0], 0.38, p[1], cart));
  B(0.44, 0.38, 0.42, '#a9a58f', -2.6, 0.97, -9.95, cart);
  const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.26), new THREE.MeshBasicMaterial({ map: textScreen(['> ping globe-com.int', 'Request timed out.', 'Request timed out.', 'Request timed out.', '> _'], '#7fcf8f') })); sm.position.set(-2.6, 0.99, -9.74); sm.rotation.y = 0; cart.add(sm);
  solidBox(-2.6, -9.9, 0.9, 0.6); interact(cart, { label: () => 'Check console', action: () => say(World.serverAlert ? 'Console: TEMP CRITICAL. Somebody should do something.' : 'Console: connection timed out. As usual.') });
  const stool = new THREE.Group(); this.scene.add(stool); CYL(0.2, 0.2, 0.05, '#7a6a4a', -3.9, 0.62, -9.3, stool, 10); CYL(0.03, 0.03, 0.6, '#444', -3.9, 0.3, -9.3, stool, 6);
  // bare bulb
  CYL(0.005, 0.005, 0.3, '#111', -5, 2.8, -10.5, this.scene, 4);
};

World.buildBossOffice = function () {
  B(2.0, 0.08, 0.9, '#3b2c22', 5, 0.76, -10.8, this.scene); B(1.9, 0.7, 0.8, '#2f231b', 5, 0.38, -10.8, this.scene);
  solid(3.95, -11.3, 6.05, -10.3);
  const mon = B(0.5, 0.42, 0.45, '#a9a58f', 5, 1.05, -11.0, this.scene);
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.3), new THREE.MeshBasicMaterial({ map: textScreen(['QUOTA: DOWN', 'MORALE: N/A', 'BONUS: ME', '> _'], '#d6c070') })); sc.position.set(5, 1.07, -10.77); this.scene.add(sc);
  B(0.5, 0.08, 0.5, '#241c16', 5, 0.5, -11.6, this.scene); B(0.55, 0.6, 0.08, '#241c16', 5, 0.85, -11.92, this.scene);
  CYL(0.12, 0.1, 0.02, '#222', 5.7, 0.81, -10.6, this.scene, 8); B(0.03, 0.3, 0.03, '#222', 5.7, 0.95, -10.6, this.scene);
  this.boardTex = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#d6d4c8'; c.fillRect(0, 0, w, h); c.strokeStyle = '#a02a22'; c.lineWidth = 3; c.beginPath(); c.moveTo(20, 30); c.lineTo(70, 50); c.lineTo(120, 45); c.lineTo(170, 80); c.lineTo(230, 104); c.stroke(); c.fillStyle = '#333'; c.font = 'bold 12px Arial'; c.fillText('QUOTA', 20, 18); c.beginPath(); c.arc(200, 40, 12, 0, 7); c.stroke(); });
  const bd = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshBasicMaterial({ map: this.boardTex })); bd.position.set(5, 1.7, -13.88); this.scene.add(bd);
  interact(bd, { label: () => 'Look at whiteboard', action: () => say(U.pick(FLAVOR.boardroom)) });
  const fc = B(0.5, 1.3, 0.6, '#4f544c', 8.5, 0.65, -13.4, this.scene); solidBox(8.5, -13.4, 0.5, 0.6); interact(fc, { label: () => 'Open filing cabinet', action: () => say('Locked. Probably full of bonus paperwork.') });
  CYL(0.15, 0.12, 0.3, '#5a4030', 1.6, 0.15, -13.4, this.scene, 8); B(0.04, 0.5, 0.04, '#4a3a22', 1.6, 0.55, -13.4, this.scene);
};

World.buildBreakRoom = function () {
  const t = new THREE.Group(); this.scene.add(t); CYL(0.7, 0.7, 0.05, '#7a7a68', 11.5, 0.75, 3.2, t, 14); CYL(0.06, 0.06, 0.75, '#444', 11.5, 0.37, 3.2, t, 6); solidBox(11.5, 3.2, 1.3, 1.3);
  [[10.6, 3.2], [12.4, 3.2], [11.5, 2.3], [11.5, 4.1]].forEach(p => CYL(0.18, 0.18, 0.05, '#8a4a3a', p[0], 0.45, p[1], this.scene, 8));
  const vm = B(0.9, 1.9, 0.8, '#43484c', 14.5, 0.95, 4.8, this.scene);
  const vf = canvasTex(64, 128, (c, w, h) => { c.fillStyle = '#1c2a30'; c.fillRect(0, 0, w, h); for (let i = 0; i < 20; i++) { c.fillStyle = ['#a03a30', '#d0a040', '#4a7a9a', '#6a9a5a'][i % 4]; c.fillRect(6 + (i % 4) * 14, 8 + Math.floor(i / 4) * 22, 10, 14); } c.fillStyle = '#e8d8c0'; c.font = 'bold 7px Arial'; c.fillText('OUT OF ORDER', 4, 122); });
  const vp = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.4), new THREE.MeshBasicMaterial({ map: vf })); vp.position.set(14.04, 1.1, 4.8); vp.rotation.y = -Math.PI / 2; this.scene.add(vp);
  solidBox(14.5, 4.8, 0.9, 0.8); interact(vm, { label: () => 'Vending machine', action: () => say(U.pick(FLAVOR.vending)) }); interact(vp, { label: () => 'Vending machine', action: () => say(U.pick(FLAVOR.vending)) });
  const fr = B(0.8, 1.7, 0.7, '#8a8d84', 14.5, 0.85, 0.2, this.scene); solidBox(14.5, 0.2, 0.8, 0.7); interact(fr, { label: () => 'Open fridge', action: () => say(U.pick(FLAVOR.fridge)) });
  // counter + coffee machine
  B(2.4, 0.9, 0.6, '#5d5a4a', 12, 0.45, -1.65, this.scene); solid(10.8, -1.95, 13.2, -1.35);
  const cm = new THREE.Group(); this.scene.add(cm); B(0.35, 0.45, 0.35, '#25272a', 11.4, 1.13, -1.65, cm); B(0.12, 0.1, 0.12, '#a9a58f', 11.4, 0.95, -1.5, cm); B(0.05, 0.05, 0.03, BasicM(0xc43d30), 11.5, 1.3, -1.46, cm);
  B(0.35, 0.18, 0.3, '#a9a58f', 12.4, 0.99, -1.65, cm); // microwave
  let ready = 0; interact(cm, { label: () => 'Get coffee', action: () => {
    if (performance.now() < ready) return say('The pot is empty. Someone took the last cup and did not refill it.');
    if (G.buff.coffee) return say('You already have coffee in your system.');
    G.buff.coffee = true; ready = performance.now() + 60000; AudioManager.play('click'); say('Fresh enough coffee. Next caller starts with +10 patience.', 'good');
  } });
  const cb = canvasTex(128, 96, (c, w, h) => { c.fillStyle = '#7a6a4a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 5; i++) { c.fillStyle = ['#d8d6c8', '#d0b060', '#9ab0a0'][i % 3]; c.fillRect(8 + (i % 3) * 38, 10 + Math.floor(i / 3) * 40, 30, 32); } });
  const cp = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.75), new THREE.MeshBasicMaterial({ map: cb })); cp.position.set(14.88, 1.7, 2.2); cp.rotation.y = -Math.PI / 2; this.scene.add(cp);
  CYL(0.15, 0.12, 0.35, '#3c3f3c', 9.5, 0.17, 5.5, this.scene, 8);
};
