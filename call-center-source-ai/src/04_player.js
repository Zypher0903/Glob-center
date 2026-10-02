/* =====================================================================
   04_player.js  -  Input, PlayerController (first person), InteractionSystem
   ===================================================================== */

const Input = {
  keys: {}, dx: 0, dy: 0, drag: false, locked: false, usePointerLock: true,
  down(c) { return !!this.keys[c]; },
  consumeLook() { const r = [this.dx, this.dy]; this.dx = this.dy = 0; return r; },
};

const Player = {
  camera: null, pos: null, yaw: Math.PI, pitch: 0, tYaw: Math.PI, tPitch: 0, vel: null,
  sitting: false, sitT: 0, locked: false, bobT: 0, bob: 0, radius: 0.28, slow: 1, t: 0,

  init(camera) {
    this.camera = camera; camera.rotation.order = 'YXZ';
    this.pos = new THREE.Vector3(0, 0, -3.2); this.vel = new THREE.Vector3();
    this.reset();
  },
  reset() {
    this.pos.set(0, 0, -3.2); this.vel.set(0, 0, 0); this.yaw = this.tYaw = Math.PI; this.pitch = this.tPitch = 0; this.sitting = false; this.sitT = 0; this.locked = false;
  },
  sit() {
    if (this.sitting) return;
    this.sitFrom = { x: this.pos.x, y: 1.62, z: this.pos.z };
    this.sitting = true; this.tYaw = 0; this.tPitch = -0.12;
    while (this.yaw > Math.PI) this.yaw -= Math.PI * 2;
    while (this.yaw < -Math.PI) this.yaw += Math.PI * 2;
    AudioManager.play('click', 0.5);
  },
  stand() {
    if (!this.sitting) return;
    this.sitting = false; this.pos.set(SEAT.x, 0, SEAT.z + 0.75);
    this.sitT = Math.max(this.sitT, 0.001);
  },
  collide() {
    const r = this.radius;
    for (let pass = 0; pass < 2; pass++) for (const c of World.colliders) {
      const cx = U.clamp(this.pos.x, c.minx, c.maxx), cz = U.clamp(this.pos.z, c.minz, c.maxz);
      const dx = this.pos.x - cx, dz = this.pos.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2); this.pos.x += dx / d * (r - d); this.pos.z += dz / d * (r - d); }
        else { const l = this.pos.x - c.minx, rr = c.maxx - this.pos.x, u = this.pos.z - c.minz, dn = c.maxz - this.pos.z, m = Math.min(l, rr, u, dn); if (m === l) this.pos.x = c.minx - r; else if (m === rr) this.pos.x = c.maxx + r; else if (m === u) this.pos.z = c.minz - r; else this.pos.z = c.maxz + r; }
      }
    }
  },
  update(dt, canControl) {
    this.t += dt;
    const [dx, dy] = Input.consumeLook();
    if (canControl) {
      const sens = 0.0021;
      this.tYaw -= dx * sens; this.tPitch = U.clamp(this.tPitch - dy * sens, -1.3, 1.3);
    }
    if (this.sitting) this.tYaw = U.clamp(this.tYaw, -1.9, 1.9);
    const k = 1 - Math.exp(-dt * 26);
    this.yaw += (this.tYaw - this.yaw) * k; this.pitch += (this.tPitch - this.pitch) * k;

    // movement
    let moving = 0;
    if (canControl && !this.locked) {
      const f = (Input.down('KeyW') || Input.down('ArrowUp') ? 1 : 0) - (Input.down('KeyS') || Input.down('ArrowDown') ? 1 : 0);
      const s = (Input.down('KeyD') || Input.down('ArrowRight') ? 1 : 0) - (Input.down('KeyA') || Input.down('ArrowLeft') ? 1 : 0);
      if (this.sitting && (f || s) && this.sitT > 0.9) this.stand();
      if (!this.sitting && this.sitT <= 0.001) {
        let sp = (Input.down('ShiftLeft') || Input.down('ShiftRight') ? 2.8 : 1.7) * this.slow;
        if (World.puddle && Math.hypot(this.pos.x - World.puddle.x, this.pos.z - World.puddle.z) < World.puddle.r) sp *= 0.45;
        const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
        let tx = fx * f + rx * s, tz = fz * f + rz * s; const l = Math.hypot(tx, tz) || 1; tx = tx / l * sp * (f || s ? 1 : 0); tz = tz / l * sp * (f || s ? 1 : 0);
        const a = 1 - Math.exp(-dt * 9); this.vel.x += (tx - this.vel.x) * a; this.vel.z += (tz - this.vel.z) * a;
      }
    } else { this.vel.x *= 0.8; this.vel.z *= 0.8; }
    if (!this.sitting && this.sitT <= 0.001) {
      this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt; this.collide();
      moving = Math.hypot(this.vel.x, this.vel.z);
    }
    // sit blend
    const target = this.sitting ? 1 : 0;
    this.sitT += Math.sign(target - this.sitT) * Math.min(Math.abs(target - this.sitT), dt / 0.7);
    if (this.sitT < 0.001 && !this.sitting) this.sitT = 0;

    // head bob + breathing: subtle, not a shooter
    this.bobT += dt * (2.2 + moving * 1.6);
    const bobAmt = Math.min(1, moving / 2) * 0.022;
    const bobY = Math.sin(this.bobT * 2) * bobAmt + Math.sin(this.t * 1.3) * 0.0035;
    const bobX = Math.cos(this.bobT) * bobAmt * 0.6;
    const e = this.sitT * this.sitT * (3 - 2 * this.sitT);
    const standEye = { x: this.pos.x, y: 1.62 + bobY, z: this.pos.z };
    const seatEye = { x: SEAT.x, y: SEAT.eyeY + Math.sin(this.t * 1.3) * 0.003, z: SEAT.z };
    const base = this.sitting ? this.sitFrom : standEye;
    this.camera.position.set(U.lerp(base.x, seatEye.x, e) + bobX * (1 - e), U.lerp(base.y, seatEye.y, e), U.lerp(base.z, seatEye.z, e));
    this.camera.rotation.set(this.pitch, this.yaw, Math.sin(this.bobT) * bobAmt * 0.12, 'YXZ');
  },
};

const Interaction = {
  ray: null, target: null, hintText: '',
  init() { this.ray = new THREE.Raycaster(); this.ray.far = 2.6; },
  update(canAct) {
    this.target = null; let label = '';
    if (canAct && !Player.locked) {
      this.ray.setFromCamera({ x: 0, y: 0 }, Player.camera);
      const hits = this.ray.intersectObjects(World.pickables.concat(World.blockers), false);
      if (hits.length && hits[0].object.userData.interact) {
        const def = hits[0].object.userData.interact; label = def.label ? def.label() : '';
        if (label) this.target = def;
      }
    }
    this.hintText = label; UI.setHint(label);
  },
  use() { if (this.target && this.target.action) { AudioManager.play('click', 0.6); this.target.action(); } },
};
