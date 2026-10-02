/* =====================================================================
   03a_world_shell.js  -  Three.js helpers, procedural textures, building shell
   Layout (metres, +z = south):
     Main office  x[-9,9]   z[-5,7]      Hallway  x[-9,9] z[-8,-5]
     Server room  x[-9,-1]  z[-14,-8]    Boss office x[1,9] z[-14,-8]
     Break room   x[9,15]   z[-2,6]
   ===================================================================== */

const World = {
  scene: null, colliders: [], pickables: [], blockers: [], doors: {}, mats: {}, geos: {},
  lightsFluor: [], updaters: [], employees: [], boss: null, flickerT: 0, puddle: null,
  netDown: false, serverAlert: false, printerBad: false, screens: {},
};

/* ---------- small builders ---------- */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
function M(color, o) {
  const key = color + (o ? JSON.stringify(o) : '');
  if (!World.mats[key]) World.mats[key] = new THREE.MeshLambertMaterial(Object.assign({ color }, o || {}));
  return World.mats[key];
}
function BasicM(color) { const k = 'b' + color; if (!World.mats[k]) World.mats[k] = new THREE.MeshBasicMaterial({ color }); return World.mats[k]; }
function boxGeo(w, h, d) { const k = w + '_' + h + '_' + d; return World.geos[k] || (World.geos[k] = new THREE.BoxGeometry(w, h, d)); }
function B(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(boxGeo(w, h, d), typeof mat === 'string' ? M(mat) : mat);
  m.position.set(x, y, z); (parent || World.scene).add(m); return m;
}
function CYL(rt, rb, h, mat, x, y, z, parent, seg) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 10), typeof mat === 'string' ? M(mat) : mat);
  m.position.set(x, y, z); (parent || World.scene).add(m); return m;
}
function solid(minx, minz, maxx, maxz) { World.colliders.push({ minx, minz, maxx, maxz }); return World.colliders[World.colliders.length - 1]; }
function solidBox(x, z, w, d) { return solid(x - w / 2, z - d / 2, x + w / 2, z + d / 2); }
function scaleUV(geo, su, sv) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); uv.needsUpdate = true; }
function interact(obj, def) {
  obj.traverse(o => { if (o.isMesh) { o.userData.interact = def; World.pickables.push(o); } });
}
function tiled(tex, rx, ry) { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return t; }
function say(text, kind) { Bus.emit('toast', { text, kind: kind || 'info' }); }

/* ---------- procedural textures ---------- */
function dirtyTex(base, o) {
  o = o || {};
  return canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {
      const px = Math.random() * w, py = Math.random() * h, r = 12 + Math.random() * 44, g = x.createRadialGradient(px, py, 0, px, py, r);
      const dark = Math.random() < 0.72;
      g.addColorStop(0, dark ? 'rgba(28,22,12,' + (0.16 + Math.random() * 0.14) + ')' : 'rgba(255,255,235,0.07)');
      g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
    }
    if (o.grime !== false) { const g = x.createLinearGradient(0, h, 0, h * 0.62); g.addColorStop(0, 'rgba(18,15,8,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, h * 0.62, w, h * 0.38); }
    if (o.tiles) { x.strokeStyle = 'rgba(0,0,0,0.28)'; x.lineWidth = 2; for (let i = 0; i <= w; i += o.tiles) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); } }
    for (let i = 0; i < 1800; i++) { x.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '0,0,0' : '255,255,255') + ',' + (Math.random() * 0.06) + ')'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    if (o.cracks) { x.strokeStyle = 'rgba(20,16,10,0.4)'; x.lineWidth = 1.2; for (let k = 0; k < 3; k++) { let px = Math.random() * w, py = Math.random() * h * 0.6; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 8; j++) { px += (Math.random() - 0.5) * 24; py += Math.random() * 16; x.lineTo(px, py); } x.stroke(); } }
  });
}
function cityTex() {
  return canvasTex(1024, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0a0e16'); g.addColorStop(0.7, '#1b2230'); g.addColorStop(1, '#3a2c26');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(210,205,180,0.8)'; x.beginPath(); x.arc(820, 50, 14, 0, 7); x.fill();
    for (let layer = 0; layer < 3; layer++) {
      let px = -10; const shade = ['#0f131a', '#0b0e13', '#07090c'][layer];
      while (px < w) {
        const bw = 40 + Math.random() * 70, bh = 60 + Math.random() * (110 - layer * 20) + (2 - layer) * 10;
        x.fillStyle = shade; x.fillRect(px, h - bh, bw, bh);
        if (layer > 0) for (let wy = h - bh + 8; wy < h - 8; wy += 12) for (let wx = px + 5; wx < px + bw - 8; wx += 10) {
          if (Math.random() < 0.28) { x.fillStyle = Math.random() < 0.85 ? 'rgba(214,190,120,' + (0.35 + Math.random() * 0.4) + ')' : 'rgba(150,180,200,0.5)'; x.fillRect(wx, wy, 5, 6); }
        }
        px += bw + Math.random() * 6;
      }
    }
  });
}
function logoDraw(x, cx, cy, s) {          // Globe-Com shield + globe
  x.save(); x.translate(cx, cy); x.scale(s, s);
  x.beginPath(); x.moveTo(-40, -46); x.lineTo(40, -46); x.lineTo(40, 6); x.quadraticCurveTo(38, 36, 0, 54); x.quadraticCurveTo(-38, 36, -40, 6); x.closePath();
  x.fillStyle = '#b9a26a'; x.fill();
  x.beginPath(); x.moveTo(-35, -41); x.lineTo(35, -41); x.lineTo(35, 5); x.quadraticCurveTo(33, 32, 0, 48); x.quadraticCurveTo(-33, 32, -35, 5); x.closePath();
  x.fillStyle = '#3d6a92'; x.fill();
  x.beginPath(); x.arc(0, -4, 25, 0, 7); x.fillStyle = '#4c86b0'; x.fill();
  x.fillStyle = '#8fa46a'; x.beginPath(); x.moveTo(-14, -18); x.lineTo(-2, -22); x.lineTo(4, -10); x.lineTo(-6, 0); x.lineTo(-16, -6); x.fill();
  x.beginPath(); x.moveTo(8, -2); x.lineTo(20, -8); x.lineTo(20, 8); x.lineTo(10, 14); x.fill();
  x.strokeStyle = 'rgba(230,235,225,0.5)'; x.lineWidth = 1.2; x.beginPath(); x.arc(0, -4, 25, 0, 7); x.stroke();
  x.restore();
}
function drawLogoBlock(x, cx, cy, s, sub) {
  logoDraw(x, cx, cy - 12 * s, s);
  x.fillStyle = '#c9d2c3'; x.textAlign = 'center'; x.font = 'bold ' + Math.round(22 * s) + 'px Arial, sans-serif'; x.fillText('GLOBE-COM', cx, cy + 62 * s);
  x.font = Math.round(11 * s) + 'px Arial, sans-serif'; x.fillStyle = '#9aa598'; x.fillText(sub || 'SOLUTIONS', cx, cy + 78 * s);
}

/* ---------- wall / floor / ceiling ---------- */
function wall(x1, z1, x2, z2, gaps, mat, H) {
  H = H || 3; gaps = gaps || []; const t = 0.2, horiz = z1 === z2;
  const a = horiz ? Math.min(x1, x2) : Math.min(z1, z2), b = horiz ? Math.max(x1, x2) : Math.max(z1, z2);
  const segs = []; let cur = a;
  gaps.slice().sort((p, q) => p[0] - q[0]).forEach(g => { if (g[0] > cur) segs.push([cur, g[0]]); cur = g[1]; });
  if (cur < b) segs.push([cur, b]);
  const add = (s, e, y0, y1, collide) => {
    const len = e - s, h = y1 - y0, c = (s + e) / 2, geo = new THREE.BoxGeometry(horiz ? len : t, h, horiz ? t : len);
    scaleUV(geo, len / 3, h / 3);
    const m = new THREE.Mesh(geo, mat); m.position.set(horiz ? c : x1, y0 + h / 2, horiz ? z1 : c);
    World.scene.add(m); World.blockers.push(m);
    if (collide) { if (horiz) solid(s, z1 - t / 2, e, z1 + t / 2); else solid(x1 - t / 2, s, x1 + t / 2, e); }
  };
  segs.forEach(s => add(s[0], s[1], 0, H, true));
  gaps.forEach(g => add(g[0], g[1], 2.3, H, false));
}
function floorPlane(x1, z1, x2, z2, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), mat);
  m.rotation.x = -Math.PI / 2; m.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2); World.scene.add(m); return m;
}
function ceilPlane(x1, z1, x2, z2, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), mat);
  m.rotation.x = Math.PI / 2; m.position.set((x1 + x2) / 2, 3, (z1 + z2) / 2); World.scene.add(m); return m;
}
function makeDoor(name, hx, hz, width, axis, locked, unlockDay, mat) {
  const pivot = new THREE.Group(); pivot.position.set(hx, 0, hz); World.scene.add(pivot);
  const leaf = axis === 'x' ? B(width, 2.2, 0.06, mat, width / 2, 1.1, 0, pivot) : B(0.06, 2.2, width, mat, 0, 1.1, width / 2, pivot);
  B(0.06, 0.06, 0.06, '#c9c19a', axis === 'x' ? width - 0.12 : 0.05, 1.05, axis === 'x' ? 0.06 : width - 0.12, pivot);   // handle
  const d = { pivot, locked, unlockDay, collider: null };
  if (locked) {
    d.collider = axis === 'x' ? solid(hx, hz - 0.1, hx + width, hz + 0.1) : solid(hx - 0.1, hz, hx + 0.1, hz + width);
    const sign = canvasTex(128, 64, (x, w, h) => { x.fillStyle = '#5a1f1a'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8d8c0'; x.font = 'bold 15px Arial'; x.textAlign = 'center'; x.fillText('RESTRICTED', 64, 26); x.font = '11px Arial'; x.fillText('AUTHORIZED STAFF', 64, 44); });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: sign })); d.sign = sg;
    if (axis === 'x') { sg.position.set(width / 2, 1.5, 0.04); } else { sg.rotation.y = Math.PI / 2; sg.position.set(0.04, 1.5, width / 2); }
    pivot.add(sg);
  }
  interact(pivot, { label: () => d.locked ? 'Locked (unlocks Day ' + d.unlockDay + ')' : '', action: () => { if (d.locked) say('Locked. Restricted until Day ' + d.unlockDay + '.', 'warn'); } });
  World.doors[name] = d; return d;
}
function setDoorLocked(name, locked) {
  const d = World.doors[name]; if (!d) return;
  d.locked = locked; d.pivot.rotation.y = locked ? 0 : 1.45;
  if (d.sign) d.sign.visible = locked;
  if (d.collider) { const i = World.colliders.indexOf(d.collider); if (locked && i < 0) World.colliders.push(d.collider); if (!locked && i >= 0) World.colliders.splice(i, 1); }
}
function fixture(x, z, len, parent) {           // fluorescent ceiling fixture
  const g = new THREE.Group(); g.position.set(x, 2.94, z); World.scene.add(g);
  B(len, 0.06, 0.32, '#3b3d3b', 0, 0, 0, g);
  const p = new THREE.Mesh(new THREE.BoxGeometry(len - 0.06, 0.02, 0.26), new THREE.MeshBasicMaterial({ color: 0xe6efe0 })); p.position.y = -0.04; g.add(p);
  return p;
}
function cable(pts, color, r) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, r || 0.012, 5, false), M(color || '#111')); World.scene.add(m); return m;
}

/* ---------- build the building shell ---------- */
World.buildShell = function () {
  const s = this.scene;
  const wallMain = new THREE.MeshLambertMaterial({ map: dirtyTex('#8a8d7a', { cracks: true }) });
  const wallHall = new THREE.MeshLambertMaterial({ map: dirtyTex('#7b8474', { cracks: true }), color: 0xbfc8b8 });
  const wallSrv = new THREE.MeshLambertMaterial({ map: dirtyTex('#6f716c', { tiles: 64, cracks: true }), color: 0xb0b4b0 });
  const wallBoss = new THREE.MeshLambertMaterial({ map: dirtyTex('#6b5a48'), color: 0xd0c0a8 });
  const wallBrk = new THREE.MeshLambertMaterial({ map: dirtyTex('#8b8c72'), color: 0xd0d0b0 });
  const carpet = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#4d534c'; x.fillRect(0, 0, w, h); for (let i = 0; i < 4000; i++) { x.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '0,0,0' : '200,200,180') + ',' + Math.random() * 0.1 + ')'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); } x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 2; x.strokeRect(0, 0, w, h); for (let i = 0; i < 6; i++) { const px = Math.random() * w, py = Math.random() * h, r = 8 + Math.random() * 26, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(30,20,10,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); } });
  const lino = dirtyTex('#7a7c70', { tiles: 128, grime: false });
  const conc = dirtyTex('#5e605c', { tiles: 128, grime: false });
  const ceil = canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#6d6f68'; x.fillRect(0, 0, w, h); x.strokeStyle = '#3d3f3a'; x.lineWidth = 3; x.strokeRect(0, 0, w, h); for (let i = 0; i < 300; i++) { x.fillStyle = 'rgba(0,0,0,' + Math.random() * 0.08 + ')'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
  const floorM = (t, w, d, k) => new THREE.MeshLambertMaterial({ map: tiled(t, w / (k || 2), d / (k || 2)) });
  const ceilM = (w, d) => new THREE.MeshLambertMaterial({ map: tiled(ceil, w / 0.6, d / 0.6) });

  floorPlane(-9, -5, 9, 7, floorM(carpet, 18, 12)); ceilPlane(-9, -5, 9, 7, ceilM(18, 12));
  floorPlane(-9, -8, 9, -5, floorM(lino, 18, 3, 2.5)); ceilPlane(-9, -8, 9, -5, ceilM(18, 3));
  floorPlane(-9, -14, -1, -8, floorM(conc, 8, 6, 2.5)); ceilPlane(-9, -14, -1, -8, ceilM(8, 6));
  floorPlane(1, -14, 9, -8, floorM(carpet, 8, 6)); ceilPlane(1, -14, 9, -8, ceilM(8, 6));
  floorPlane(9, -2, 15, 6, floorM(lino, 6, 8, 2.5)); ceilPlane(9, -2, 15, 6, ceilM(6, 8));
  floorPlane(-1, -14, 1, -8, floorM(conc, 2, 6)); // dead space

  // main office
  wall(-9, -5, 9, -5, [[-1, 1]], wallMain); wall(-9, 7, 9, 7, [], wallMain);
  wall(-9, -5, -9, 7, [], wallMain); wall(9, -5, 9, 7, [[1, 3]], wallMain);
  // hallway
  wall(-9, -8, 9, -8, [[-6, -4], [4, 6]], wallHall); wall(-9, -8, -9, -5, [], wallHall); wall(9, -8, 9, -5, [], wallHall);
  // server room, boss office
  wall(-9, -14, -1, -14, [], wallSrv); wall(-9, -14, -9, -8, [], wallSrv); wall(-1, -14, -1, -8, [], wallSrv);
  wall(1, -14, 9, -14, [], wallBoss); wall(1, -14, 1, -8, [], wallBoss); wall(9, -14, 9, -8, [], wallBoss);
  // break room
  wall(9, -2, 15, -2, [], wallBrk); wall(9, 6, 15, 6, [], wallBrk); wall(15, -2, 15, 6, [], wallBrk);

  // doors
  const doorMat = M('#5d5a4a');
  makeDoor('main1', -1, -5, 1, 'x', false, 0, doorMat).pivot.rotation.y = 1.45;
  const r = makeDoor('main2', 1, -5, 1, 'x', false, 0, doorMat); r.pivot.children[0].position.x = -0.5; r.pivot.children[1].position.x = -0.88; r.pivot.rotation.y = -1.45;
  makeDoor('boss', 4, -8, 2, 'x', false, 0, doorMat).pivot.rotation.y = 1.45;
  makeDoor('server', -6, -8, 2, 'x', true, 3, M('#4a4d4a'));
  makeDoor('break', 9, 1, 2, 'z', true, 2, doorMat);

  // fluorescent lights
  const mk = (x, z, y, col, inten, dist) => { const l = new THREE.PointLight(col, inten, dist, 1.6); l.position.set(x, y, z); s.add(l); return l; };
  for (let ix = -6; ix <= 6; ix += 3) for (let iz of [-3, 1, 5]) { const p = fixture(ix, iz, 1.3); this.lightsFluor.push({ panel: p, base: 0xe6efe0, light: null }); }
  [[-4.5, -1], [4.5, -1], [-4.5, 4], [4.5, 4], [0, 1.5]].forEach(p => { const l = mk(p[0], p[1], 2.7, 0xdfe8d6, 0.85, 12); this.lightsFluor.push({ light: l, base: 0.85 }); });
  [[-6, -6.5], [0, -6.5], [6, -6.5]].forEach(p => { fixture(p[0], p[1], 1.0); });
  this.hallLight = mk(0, -6.5, 2.7, 0xcfd8c0, 0.7, 10); this.lightsFluor.push({ light: this.hallLight, base: 0.7 });
  this.hallLight2 = mk(-6, -6.5, 2.7, 0xcfd8c0, 0.5, 8);
  this.serverLight = mk(-5, -10.5, 2.6, 0xffd08a, 0.9, 9); this.serverBulb = B(0.08, 0.1, 0.08, BasicM(0xffe0a0), -5, 2.6, -10.5);
  this.serverBlue = mk(-8, -13, 1.6, 0x5c7fbf, 0.35, 6);
  fixture(5, -11, 1.0);
  this.bossLight = mk(5, -11, 2.6, 0xf0d9b0, 0.7, 9);
  this.breakLight = mk(12, 2, 2.7, 0xdfe8d6, 0.8, 9); fixture(12, 2, 1.3);
  s.add(new THREE.HemisphereLight(0x8a9a90, 0x1d1c1a, 0.42));

  // windows with night city (west wall + south wall)
  const city = cityTex();
  const win = (x, z, rotY, w) => {
    const g = new THREE.Group(); g.position.set(x, 1.85, z); g.rotation.y = rotY; s.add(g);
    const t = city.clone(); t.needsUpdate = true; t.repeat.set(0.3, 1); t.offset.set(Math.random() * 0.7, 0);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.5), new THREE.MeshBasicMaterial({ map: t, fog: false })); pane.position.z = 0.02; g.add(pane);
    const fm = '#2c2e2b';
    B(w + 0.2, 0.1, 0.12, fm, 0, 0.8, 0.05, g); B(w + 0.2, 0.1, 0.12, fm, 0, -0.8, 0.05, g); B(0.1, 1.7, 0.12, fm, -w / 2 - 0.05, 0, 0.05, g); B(0.1, 1.7, 0.12, fm, w / 2 + 0.05, 0, 0.05, g); B(0.05, 1.6, 0.08, fm, 0, 0, 0.05, g);
    for (let i = 0; i < 9; i++) { const sl = B(w - 0.1, 0.03, 0.02, '#8d8a78', 0, 0.7 - i * 0.045 - (Math.random() < 0.3 ? 0.02 : 0), 0.08, g); sl.rotation.x = 0.25 + Math.random() * 0.2; }
    B(w + 0.4, 0.05, 0.25, '#5d5b50', 0, -0.85, 0.12, g);
  };
  [-2.5, 1.5, 5.4].forEach(z => win(-8.89, z, Math.PI / 2, 2.2));
  [-4.5, 4.5].forEach(x => win(x, 6.89, Math.PI, 2.6));
};

World.applyUnlocks = function (u) { setDoorLocked('break', !u.breakRoom); setDoorLocked('server', !u.serverRoom); };
