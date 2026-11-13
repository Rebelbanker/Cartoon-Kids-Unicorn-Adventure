/* Wonders: bouncy mushrooms, fairy-ring portals, the wishing fountain, and the rainbow chimes (with a copy-the-song game) */
(function () {
  const UA = window.UA,
    C = UA.C;
  const V3 = THREE.Vector3;
  const Wd = (UA.Wonders = { rings: [], pads: [], drops: [], fountain: null, cd: 0 });
  let scene;
  const _m = new THREE.Matrix4(),
    _q = new THREE.Quaternion(),
    _p = new V3(),
    _s = new V3(),
    _up = new V3(0, 1, 0);

  /* ---------- finding open, flat spots (deterministic) ---------- */
  function validSpot(x, z, clear) {
    const W = UA.World;
    if (Math.hypot(x, z) > 172) return false;
    if (W.heightAt(x, z) < 2.3 || W.slopeAt(x, z) > 0.2) return false;
    for (const c of W.colliders) if (Math.hypot(c.x - x, c.z - z) < c.r + clear) return false;
    for (const m of W.mushrooms) if (Math.hypot(m.x - x, m.z - z) < 1.5 * m.s + clear) return false;
    return true;
  }
  function findSpot(cx, cz, rad, clear, rnd, test) {
    for (let i = 0; i < 600; i++) {
      const a = rnd() * 6.283,
        r = Math.sqrt(rnd()) * rad;
      const x = cx + Math.cos(a) * r,
        z = cz + Math.sin(a) * r;
      if (test ? test(x, z) : validSpot(x, z, clear)) return [x, z];
    }
    return [cx, cz];
  }
  function gradTex(stops, w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, h, 0, 0);
    stops.forEach((s) => grd.addColorStop(s[0], s[1]));
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    return new THREE.CanvasTexture(c);
  }

  /* ---------- bouncy mushrooms ---------- */
  Wd.bounce = function (uni, prevY) {
    const ms = UA.World.mushrooms;
    if (!ms) return false;
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i];
      const dx = uni.pos.x - m.x,
        dz = uni.pos.z - m.z;
      const R = 1.5 * m.s;
      const d2 = dx * dx + dz * dz;
      if (d2 > R * R) continue;
      const d = Math.sqrt(d2) / R;
      const top = m.h - 0.2 + 1.5 * m.s + 0.95 * m.s * Math.sqrt(Math.max(0, 1 - d * d));
      if (prevY >= top - 0.35 && uni.pos.y <= top + 0.05) {
        uni.pos.y = top;
        uni.vy = 14 + m.s * 3.2 + (uni.jumpHeld ? 2 : 0);
        uni.grounded = false;
        uni.flapUsed = false;
        uni.airTime = 0;
        m.sq = 1;
        UA.Audio.boing(1.5 - m.s * 0.28);
        UA.FX.sparkles(new V3(uni.pos.x, top + 0.2, uni.pos.z), 10, undefined, 1.8, 1.5);
        UA.FX.puff(new V3(uni.pos.x, top, uni.pos.z), 4, 0xffffff);
        Wd.bounces = (Wd.bounces || 0) + 1;
        if (!UA.state.bounced) {
          UA.state.bounced = true;
          UA.UI.toast('Boing!<small>Giant mushrooms are bouncy. Try them in a row!</small>', 3800);
          UA.save();
        }
        return true;
      }
    }
    return false;
  };
  function updateMushrooms(dt) {
    const ms = UA.World.mushrooms,
      mm = UA.World.mushMeshes;
    if (!ms || !mm) return;
    let any = false;
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i];
      if (!(m.sq > 0)) continue;
      m.sq = Math.max(0, m.sq - dt * 1.5);
      const q = m.sq * Math.cos((1 - m.sq) * 16);
      _q.setFromAxisAngle(_up, m.rot);
      _p.set(m.x, m.h - 0.2, m.z);
      _s.set(m.s * (1 + 0.18 * q), m.s * (1 - 0.34 * q), m.s * (1 + 0.18 * q));
      _m.compose(_p, _q, _s);
      mm.caps.setMatrixAt(i, _m);
      mm.spots.setMatrixAt(i, _m);
      any = true;
    }
    if (any) {
      mm.caps.instanceMatrix.needsUpdate = true;
      mm.spots.instanceMatrix.needsUpdate = true;
    }
  }

  /* ---------- fairy rings: glowing mushroom circles that whisk you to their twin ---------- */
  const RING_COL = [0xff8fc8, 0x8fe8c0, 0xb79bff];
  function buildRings(rnd) {
    const anchors = [
      [-38, 24, 10],
      [128, 44, 14],
      [-78, -70, 16],
      [92, 100, 16],
      [22, 128, 14],
      [-122, 86, 14],
    ];
    const stemGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.75, 6);
    stemGeo.translate(0, 0.37, 0);
    const capGeo = new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    capGeo.scale(1, 0.8, 1);
    capGeo.translate(0, 0.72, 0);
    const N = 12;
    const stems = new THREE.InstancedMesh(stemGeo, new THREE.MeshToonMaterial({ color: 0xfff4e6, gradientMap: UA.gradient }), anchors.length * N);
    const caps = new THREE.InstancedMesh(capGeo, UA.addGlow(new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: UA.gradient }), 1.0), anchors.length * N);
    stems.frustumCulled = caps.frustumCulled = false;
    const pillarTex = gradTex([[0, 'rgba(255,255,255,0)'], [0.05, 'rgba(255,255,255,0.8)'], [0.5, 'rgba(255,255,255,0.28)'], [1, 'rgba(255,255,255,0)']], 4, 128);
    const discTex = UA.radialTexture('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)', 128);
    anchors.forEach((an, i) => {
      const pair = i % 2 ? i - 1 : i + 1;
      const col = RING_COL[i >> 1];
      const sp = findSpot(an[0], an[1], an[2], 5.5, rnd);
      const h = UA.World.heightAt(sp[0], sp[1]);
      for (let k = 0; k < N; k++) {
        const a = (k / N) * 6.283;
        const x = sp[0] + Math.cos(a) * 3.3,
          z = sp[1] + Math.sin(a) * 3.3;
        const y = UA.World.heightAt(x, z) - 0.05;
        const s = 0.85 + ((k * 7) % 5) * 0.12;
        _q.setFromAxisAngle(_up, a * 3);
        _p.set(x, y, z);
        _s.set(s, s, s);
        _m.compose(_p, _q, _s);
        stems.setMatrixAt(i * N + k, _m);
        caps.setMatrixAt(i * N + k, _m);
        caps.setColorAt(i * N + k, new THREE.Color(k % 3 === 0 ? 0xffffff : col));
      }
      const disc = new THREE.Mesh(new THREE.CircleGeometry(3.4, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: discTex, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
      disc.position.set(sp[0], h + 0.12, sp[1]);
      disc.renderOrder = 3;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 26, 20, 1, true).translate(0, 13, 0), new THREE.MeshBasicMaterial({ map: pillarTex, color: col, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      pillar.position.set(sp[0], h, sp[1]);
      pillar.renderOrder = 3;
      scene.add(disc, pillar);
      Wd.rings.push({ x: sp[0], z: sp[1], h, pair, col, disc, pillar, ph: i * 1.7 });
    });
    scene.add(stems, caps);
  }
  function updateRings(dt, t, uni, ctx) {
    Wd.cd = Math.max(0, Wd.cd - dt);
    for (const r of Wd.rings) {
      const d = Math.hypot(uni.pos.x - r.x, uni.pos.z - r.z);
      const pulse = 1 + Math.sin(t * 2.2 + r.ph) * 0.06;
      r.disc.scale.set(pulse, 1, pulse);
      r.pillar.rotation.y = t * 0.5;
      r.pillar.material.opacity = 0.5 + Math.sin(t * 1.6 + r.ph) * 0.12;
      if (d < 95 && Math.random() < dt * 14) {
        const a = Math.random() * 6.283,
          rr = 1 + Math.random() * 2.4;
        UA.FX.emit({ x: r.x + Math.cos(a) * rr, y: r.h + 0.3, z: r.z + Math.sin(a) * rr, vx: -Math.sin(a) * 1.2, vy: 2 + Math.random() * 2.5, vz: Math.cos(a) * 1.2, color: r.col, size: 0.45, shape: 1, life: 1.6, grow: -0.6, gravity: -0.5, drag: 0.3 });
      }
      if (Wd.cd <= 0 && d < 2.4 && uni.pos.y - r.h < 2.5) {
        const dst = Wd.rings[r.pair];
        Wd.cd = 3.2;
        Wd.teleport(uni, dst, ctx);
        break;
      }
    }
  }
  Wd.teleport = function (uni, dst, ctx) {
    const from = new V3(uni.pos.x, uni.pos.y + 1.5, uni.pos.z);
    UA.FX.burst(from, 40);
    UA.Audio.portal();
    UA.UI.flash();
    const yaw = Math.atan2(dst.x - uni.pos.x, dst.z - uni.pos.z);
    uni.teleport(dst.x + Math.sin(yaw) * 5, dst.z + Math.cos(yaw) * 5, yaw);
    if (ctx && ctx.chase) {
      ctx.chase.snap(uni);
      ctx.chase.yaw = uni.yaw;
    }
    UA.FX.burst(new V3(uni.pos.x, uni.pos.y + 1.5, uni.pos.z), 40);
    const where = UA.World.regionInfo(uni.pos.x, uni.pos.z);
    UA.UI.toast('Whoosh!<small>' + where.name + '</small>', 2400);
  };

  /* ---------- wishing fountain ---------- */
  function buildFountain(rnd) {
    const sp = findSpot(26, 12, 10, 7, rnd);
    const x = sp[0],
      z = sp[1];
    const h = UA.World.heightAt(x, z);
    const g = new THREE.Group();
    g.position.set(x, h, z);
    const stone = UA.mat(0xffd6ea),
      stone2 = UA.mat(0xd9c8ff),
      gold = UA.mat(0xffd36b, 0xffb000);
    g.add(UA.cyl(4.6, 0.9, stone, 0, 0.4, 0));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(4.45, 0.35, 8, 36).rotateX(Math.PI / 2), stone2);
    rim.position.y = 0.9;
    g.add(rim);
    const waterMat = new THREE.MeshToonMaterial({ color: 0x9fdcff, gradientMap: UA.gradient, emissive: 0x6fc4ff, emissiveIntensity: 0.45, transparent: true, opacity: 0.9 });
    const water = new THREE.Mesh(new THREE.CircleGeometry(4.2, 32).rotateX(-Math.PI / 2), waterMat);
    water.position.y = 0.86;
    g.add(water);
    g.add(UA.cyl(0.9, 2.4, stone2, 0, 1.9, 0));
    g.add(UA.cyl(2.1, 0.35, stone, 0, 2.2, 0));
    g.add(UA.ball(0.75, stone, 1, 0.7, 1, 0, 3.15, 0));
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), gold);
    star.scale.set(1, 1.3, 0.55);
    star.position.y = 4.1;
    g.add(star);
    scene.add(g);
    UA.World.addCollider(x, z, 4.9);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: UA.radialTexture('rgba(255,240,170,0.9)', 'rgba(255,240,170,0)', 128), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }));
    halo.scale.set(7, 7, 1);
    halo.position.set(x, h + 4.1, z);
    scene.add(halo);
    Wd.fountain = { x, z, h, g, star, halo, spray: 0, wishCd: 0, last: '', pending: null };
  }

  const WISHES = [
    { id: 'flowers', name: 'Flower Shower!', note: 'The whole meadow blooms' },
    { id: 'gumdrops', name: 'Gumdrop Rain!', note: 'Collect them before they melt away' },
    { id: 'party', name: 'Creature Party!', note: 'Everyone is coming to dance' },
    { id: 'rainbow', name: 'A rainbow!', note: 'Ride through it for a boost' },
    { id: 'night', name: 'Twinkle Time!', note: 'The sky changes' },
    { id: 'giant', name: 'Giant Unicorn!', note: 'Stomp stomp stomp' },
    { id: 'tiny', name: 'Teeny-Tiny Unicorn!', note: 'Zip zip zip' },
    { id: 'stars', name: 'Star Shower!', note: 'Stars land and become flowers' },
    { id: 'bubbles', name: 'Bubble Party!', note: 'Everyone floats up' },
  ];
  function pickWish() {
    const f = Wd.fountain;
    let w;
    do w = WISHES[Math.floor(Math.random() * WISHES.length)];
    while (w.id === f.last);
    f.last = w.id;
    return w;
  }
  function doWish(uni, ctx) {
    // wishes are free for everyone: no gumdrops needed, just a short rest between wishes
    const f = Wd.fountain;
    if (f.wishCd > 0 || f.pending) return;
    f.wishCd = 3.5;
    UA.Audio.wish();
    UA.UI.toast('You make a wish...<small>Close your eyes and wish</small>', 1800);
    // sparkle spiral up into the star
    for (let i = 0; i < 30; i++) {
      const a = i * 0.5;
      UA.FX.emit({ x: f.x + Math.cos(a) * 1.4, y: f.h + 1 + i * 0.1, z: f.z + Math.sin(a) * 1.4, vx: -Math.sin(a) * 1.5, vy: 3 + i * 0.12, vz: Math.cos(a) * 1.5, color: UA.pick(C.RAINBOW), size: 0.5, shape: 1, life: 1.2 + i * 0.03, grow: -0.5, gravity: -0.3, drag: 0.4 });
    }
    f.pending = { t: 1.4, w: pickWish() };
    UA.save();
  }
  function grantWish(w, uni) {
    const f = Wd.fountain;
    const c = new V3(f.x, f.h + 4, f.z);
    UA.UI.toast(w.name + '<small>' + w.note + '</small>', 3600);
    UA.FX.burst(c, 50);
    UA.Audio.fanfare();
    const near = (r) => UA.Creatures.list.filter((cr) => !cr.far && Math.hypot(cr.pos.x - f.x, cr.pos.z - f.z) < r);
    if (w.id === 'flowers') {
      UA.FX.growFlowers(f.x, f.z, 15, 120);
      UA.FX.growFlowers(uni.pos.x, uni.pos.z, 10, 60);
      UA.Creatures.dazzle({ x: f.x, z: f.z }, 30);
    } else if (w.id === 'gumdrops') {
      const cols = [0xff8fb8, 0xffb48a, 0xffe58a, 0xa6ec9a, 0x8fd2ff, 0xbf9bff];
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * 6.283,
          r = 5 + Math.random() * 9;
        const x = f.x + Math.cos(a) * r,
          z = f.z + Math.sin(a) * r;
        if (UA.World.inWater(x, z)) continue;
        const col = cols[i % 6];
        const mesh = new THREE.Mesh(UA._sphereGeo, UA.mat(col, col));
        mesh.scale.set(0.5, 0.42, 0.5);
        scene.add(mesh);
        Wd.drops.push({ mesh, x, z, y: UA.World.groundAt(x, z) + 22 + Math.random() * 8, vy: 0, life: 45, got: false, delay: Math.random() * 1.2, ph: Math.random() * 6 });
      }
    } else if (w.id === 'party') {
      UA.Creatures.list.forEach((cr) => {
        if (Math.hypot(cr.pos.x - f.x, cr.pos.z - f.z) < 90) {
          const a = Math.random() * 6.283,
            r = 6 + Math.random() * 4;
          cr.go = { x: f.x + Math.cos(a) * r, z: f.z + Math.sin(a) * r, t: 16 };
          cr.sleeping = false;
        }
      });
      UA.FX.growFlowers(f.x, f.z, 10, 40);
    } else if (w.id === 'rainbow') {
      UA.Magic.addArch(f.x, f.z, uni.yaw + 1.57, 12, 45);
      UA.Creatures.dazzle({ x: f.x, z: f.z }, 25);
    } else if (w.id === 'night') {
      if (UA.Time.night < 0.5) UA.Time.goTo(22.5);
      else UA.Time.goTo(11);
    } else if (w.id === 'giant') {
      uni.sizeTarget = 1.7;
      uni.sizeT = 20;
      UA.FX.puff(uni.pos, 12, 0xffffff);
    } else if (w.id === 'tiny') {
      uni.sizeTarget = 0.55;
      uni.sizeT = 20;
      UA.FX.puff(uni.pos, 12, 0xffffff);
    } else if (w.id === 'stars') {
      for (let i = 0; i < 16; i++) {
        setTimeout(() => {
          const a = Math.random() * 6.283,
            r = 3 + Math.random() * 14;
          const x = f.x + Math.cos(a) * r,
            z = f.z + Math.sin(a) * r;
          const gy = UA.World.groundAt(x, z);
          for (let k = 0; k < 14; k++) UA.FX.emit({ x: x, y: gy + 26 - k * 0.5, z: z, vx: 0, vy: -26, vz: 0, color: k % 2 ? 0xfff2a8 : 0xffffff, size: 1.1 - k * 0.05, shape: 1, life: 1.2, grow: -0.5, gravity: 0, drag: 0 });
          setTimeout(() => {
            UA.FX.burst(new V3(x, gy + 0.6, z), 16);
            UA.FX.growFlowers(x, z, 4, 8);
            UA.Audio.chime(Math.floor(Math.random() * 8));
          }, 900);
        }, i * 220);
      }
    } else if (w.id === 'bubbles') {
      UA.Magic.bubbleParty(f, uni);
    }
    UA.save();
  }
  function updateFountain(dt, t, uni, ctx) {
    const f = Wd.fountain;
    if (!f) return;
    f.wishCd = Math.max(0, f.wishCd - dt);
    f.star.rotation.y = t * 1.2;
    f.star.position.y = 4.1 + Math.sin(t * 2) * 0.12;
    f.halo.material.opacity = 0.35 + Math.sin(t * 2.3) * 0.12 + UA.Time.night * 0.3;
    const d = Math.hypot(uni.pos.x - f.x, uni.pos.z - f.z);
    if (d < 120) {
      f.spray -= dt;
      while (f.spray <= 0) {
        f.spray += 0.045;
        const a = Math.random() * 6.283,
          sp = 1.0 + Math.random() * 1.8;
        UA.FX.emit({ x: f.x, y: f.h + 3.4, z: f.z, vx: Math.cos(a) * sp, vy: 5.8 + Math.random() * 1.5, vz: Math.sin(a) * sp, color: UA.pick([0xd8f1ff, 0xffffff, 0xffd6f0, 0xd6ffe8]), size: 0.3, shape: 0, life: 1.1, grow: -0.2, gravity: 11, drag: 0.1 });
      }
    }
    if (f.pending) {
      f.pending.t -= dt;
      if (f.pending.t <= 0) {
        const w = f.pending.w;
        f.pending = null;
        grantWish(w, uni);
      }
    }
    // prompt: always free; the button just rests for a moment after a wish
    if (d < 8 && !f.pending) {
      const rest = f.wishCd > 0;
      UA.UI.offer('wish', d - 1.5, {
        name: 'Wishing Fountain',
        sub: rest ? 'sparkling...' : '',
        btns: [{ a: 'pet', key: 'E', icon: UA.UI.ICON.star, label: 'Make a wish', dim: rest }],
        acts: { pet: () => doWish(uni, ctx) },
        sig: rest ? 'r' : 'y',
      });
    }
  }

  // falling gumdrops from the "Gumdrop Rain" wish
  function updateDrops(dt, t, uni) {
    for (const d of Wd.drops) {
      d.life -= dt;
      d.delay -= dt;
      if (d.delay > 0) {
        d.mesh.visible = false;
        continue;
      }
      d.mesh.visible = true;
      const g = UA.World.groundAt(d.x, d.z) + 0.45;
      if (d.y > g || d.vy > 0) {
        d.vy -= 24 * dt;
        d.y += d.vy * dt;
        if (d.y <= g) {
          d.y = g;
          d.vy = -d.vy * 0.45;
          if (Math.abs(d.vy) < 2.5) d.vy = 0;
          else UA.FX.sparkles(new V3(d.x, g + 0.3, d.z), 3, undefined, 0.8, 0.5);
        }
      }
      d.mesh.position.set(d.x, d.y + (d.vy === 0 ? Math.sin(t * 3 + d.ph) * 0.06 : 0), d.z);
      d.mesh.rotation.y += dt * 2;
      const dx = d.x - uni.pos.x,
        dz = d.z - uni.pos.z;
      if (dx * dx + dz * dz < 5.5 && Math.abs(uni.pos.y - d.y) < 4 && d.y < g + 1) {
        d.got = true;
        UA.state.treats = Math.min(30, UA.state.treats + 1);
        UA.FX.sparkles(new V3(d.x, d.y + 0.6, d.z), 10, undefined, 1, 1);
        UA.Audio.pop();
        if (UA.refreshHUD) UA.refreshHUD();
      }
      if (d.life <= 0 && !d.got) UA.FX.puff(new V3(d.x, d.y, d.z), 4, 0xffffff);
    }
    Wd.drops = Wd.drops.filter((d) => {
      const dead = d.got || d.life <= 0;
      if (dead) scene.remove(d.mesh);
      return !dead;
    });
  }

  // creatures called to the party dance when they arrive
  function updateParty(dt) {
    const f = Wd.fountain;
    if (!f) return;
    for (const c of UA.Creatures.list) {
      if (c.go && c.go.t > 0 && c.dazzle <= 0 && Math.hypot(c.pos.x - c.go.x, c.pos.z - c.go.z) < 3) {
        c.dazzle = 3.5;
        c.happy = 3;
      }
    }
  }

  /* ---------- rainbow chimes ---------- */
  const PAD_COL = [0xff8fb8, 0xffb48a, 0xffe58a, 0xa6ec9a, 0x8fd2ff, 0xbf9bff, 0xff9ad0, 0xffd36b];
  // Pads sit in a row, so songs only ever step to a neighbour: riding along the row plays them in order
  const SONGS = [[0, 1, 2], [3, 2, 1, 0], [1, 2, 3, 4, 3]];
  let chimeBeacon = null;
  function buildChimes(rnd) {
    const spot = findSpot(-24, -4, 10, 0, rnd, (cx, cz) => {
      for (let i = 0; i < 8; i++) {
        const x = cx + (i - 3.5) * 3.4,
          z = cz + Math.pow(i - 3.5, 2) * 0.4;
        if (!validSpot(x, z, 2.4)) return false;
      }
      return Math.hypot(cx + 10, cz) > 4;
    });
    const cx = spot[0],
      cz = spot[1];
    const geo = new THREE.CylinderGeometry(1.55, 1.7, 0.4, 24);
    for (let i = 0; i < 8; i++) {
      const x = cx + (i - 3.5) * 3.4,
        z = cz + Math.pow(i - 3.5, 2) * 0.4;
      const mat = new THREE.MeshToonMaterial({ color: PAD_COL[i], gradientMap: UA.gradient, emissive: PAD_COL[i], emissiveIntensity: 0.2 });
      UA.addGlow(mat, 0.5);
      const mesh = new THREE.Mesh(geo, mat);
      const y = UA.World.groundAt(x, z);
      mesh.position.set(x, y + 0.12, z);
      scene.add(mesh);
      Wd.pads.push({ i, x, z, y, mesh, mat, t: 0, cd: 0, col: PAD_COL[i] });
    }
    Wd.chimeCenter = { x: cx + 0, z: cz + 1.6 };
    // a soft beacon that shows up when a song quest is active
    const tex = gradTex([[0, 'rgba(255,255,255,0)'], [0.05, 'rgba(255,255,255,0.7)'], [1, 'rgba(255,255,255,0)']], 4, 128);
    chimeBeacon = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 30, 20, 1, true).translate(0, 15, 0), new THREE.MeshBasicMaterial({ map: tex, color: 0xff8fd0, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
    chimeBeacon.position.set(Wd.chimeCenter.x, UA.World.groundAt(Wd.chimeCenter.x, Wd.chimeCenter.z), Wd.chimeCenter.z);
    chimeBeacon.visible = false;
    scene.add(chimeBeacon);
  }

  const song = (Wd.song = { on: false, round: 0, phase: 'off', seq: [], idx: 0, t: 0, idle: 0 });
  Wd.songBegin = function () {
    const st = UA.state.quests.song || (UA.state.quests.song = { s: 'active', n: 0, found: [] });
    song.on = true;
    song.round = Math.min(2, st.n || 0);
    song.phase = 'wait';
    song.t = 0;
    chimeBeacon.visible = true;
  };
  function songEnd() {
    song.on = false;
    song.phase = 'off';
    if (chimeBeacon) chimeBeacon.visible = false;
  }
  function startDemo() {
    song.seq = SONGS[song.round];
    song.phase = 'demo';
    song.idx = 0;
    song.t = 0.8;
    UA.UI.toast('Listen to the song...<small>Then play it back on the chimes</small>', 2800);
  }
  function lightPad(i, quiet) {
    const p = Wd.pads[i];
    if (!p) return;
    p.t = 1;
    UA.Audio.chime(i);
    UA.FX.sparkles(new V3(p.x, p.y + 0.6, p.z), 7, p.col, 1.2, 2);
    UA.FX.emit({ x: p.x, y: p.y + 0.25, z: p.z, color: p.col, size: 2.2, shape: 0, life: 0.7, grow: 1.5, drag: 2 });
    if (!quiet) {
      for (const c of UA.Creatures.list) {
        if (!c.far && Math.hypot(c.pos.x - p.x, c.pos.z - p.z) < 16) {
          c.jump(5);
          c.happy = Math.max(c.happy, 1.5);
        }
      }
    }
  }
  function onPad(i) {
    lightPad(i, false);
    if (!song.on || song.phase !== 'play') return;
    song.idle = 0;
    // not started yet, or still on the pad you just played: stay quiet, no penalty
    if (song.idx === 0 && song.seq[0] !== i) return;
    if (song.idx > 0 && song.seq[song.idx - 1] === i && song.seq[song.idx] !== i) return;
    if (song.seq[song.idx] === i) {
      song.idx++;
      UA.FX.hearts(new V3(Wd.pads[i].x, Wd.pads[i].y + 1, Wd.pads[i].z), 2);
      if (song.idx >= song.seq.length) {
        song.phase = 'done';
        song.t = 1.2;
        UA.Audio.fanfare();
        UA.FX.burst(new V3(Wd.chimeCenter.x, 3, Wd.chimeCenter.z), 40);
      }
    } else {
      // gentle retry, never a fail
      song.idx = 0;
      song.phase = 'retry';
      song.t = 1.0;
      UA.UI.toast('Almost! Listen again...<small>You can do it</small>', 2200);
    }
  }
  function updateChimes(dt, t, uni) {
    for (const p of Wd.pads) {
      p.cd = Math.max(0, p.cd - dt);
      if (p.t > 0) p.t = Math.max(0, p.t - dt * 2.2);
      p.mat.emissiveIntensity = 0.2 + p.t * 1.1;
      p.mesh.scale.y = 1 + p.t * 0.9;
      p.mesh.position.y = p.y + 0.12 + p.t * 0.1;
      const dx = uni.pos.x - p.x,
        dz = uni.pos.z - p.z;
      const inside = dx * dx + dz * dz < 2.9 && uni.pos.y - p.y < 2.4;
      // fire once when you step onto a pad (not again while you stand there)
      if (inside && !p.inside && p.cd <= 0) {
        p.cd = 0.25;
        onPad(p.i);
      }
      p.inside = inside;
    }
    if (!song.on) return;
    const cc = Wd.chimeCenter;
    const d = Math.hypot(uni.pos.x - cc.x, uni.pos.z - cc.z);
    if (chimeBeacon.visible && Math.random() < dt * 5) UA.FX.emit({ x: cc.x + (Math.random() - 0.5) * 3, y: UA.World.groundAt(cc.x, cc.z) + 1, z: cc.z + (Math.random() - 0.5) * 3, vy: 3, color: 0xffa6e0, size: 0.5, shape: 2, life: 2, grow: -0.4, gravity: -0.2, drag: 0.2 });
    song.t -= dt;
    if (song.phase === 'wait') {
      if (d < 18) startDemo();
    } else if (song.phase === 'demo') {
      if (song.t <= 0) {
        if (song.idx < song.seq.length) {
          lightPad(song.seq[song.idx], true);
          song.idx++;
          song.t = 0.75;
        } else {
          song.phase = 'play';
          song.idx = 0;
          song.idle = 0;
          UA.UI.toast('Your turn!<small>Ride across the chimes in the same order</small>', 2800);
        }
      }
    } else if (song.phase === 'play') {
      song.idle += dt;
      if (song.idle > 30) startDemo();
      if (d > 40) song.phase = 'wait';
    } else if (song.phase === 'retry') {
      if (song.t <= 0) startDemo();
    } else if (song.phase === 'done') {
      if (song.t <= 0) {
        const Q = UA.Quests;
        const def = Q.defs.find((x) => x.id === 'song');
        song.round++;
        if (song.round >= 3) {
          songEnd();
          Q.progress(def, 3);
        } else {
          Q.progress(def, song.round);
          song.phase = 'demo';
          song.seq = SONGS[song.round];
          song.idx = 0;
          song.t = 1.4;
          UA.UI.toast('Nice! A longer song now<small>Listen closely</small>', 2400);
        }
      }
    }
  }
  Wd.songStop = songEnd;
  Wd._grant = (id, uni) => grantWish(WISHES.find((w) => w.id === id), uni); // test hook

  /* ---------- public ---------- */
  Wd.init = function (sc) {
    scene = sc;
    const rnd = UA.rng(C.SEED + 404);
    buildFountain(rnd);
    buildChimes(rnd);
    buildRings(rnd);
  };
  Wd.update = function (dt, t, uni, ctx) {
    updateMushrooms(dt);
    updateRings(dt, t, uni, ctx);
    updateFountain(dt, t, uni, ctx);
    updateDrops(dt, t, uni);
    updateParty(dt);
    updateChimes(dt, t, uni);
  };
})();
