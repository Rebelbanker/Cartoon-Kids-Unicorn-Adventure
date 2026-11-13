/* Finds: gift boxes hidden around the three worlds, one for each look in look.js that does not come free (34 of them).
   Ride into a box and it opens: the look is yours (UA.state.found, saved) and a "Wear it!" card pops up at once. A box you have
   opened never comes back, so what is still out there is simply every look you have not found yet.

   Each box floats above the ground under a coloured column of light so it can be seen from far away. Where the boxes go is
   worked out once, when the game starts, from the world itself (clear, flat, dry ground that is not in the way of anything)
   with a fixed random seed, so a box is always in the same place from one visit to the next. */
(function () {
  const UA = window.UA,
    C = UA.C,
    T = THREE,
    Look = UA.Look;
  const Finds = (UA.Finds = { gifts: [], group: null, offer: null, placed: 0, missed: [] });

  /* ---------- what is hidden where ---------- */
  // zone: meadow (the home meadow), town (Twinkle Town), star (Starlight Castle and its grounds), road (up the icy road),
  // valley (the forest clearings at the foot of Frostglow Peak)
  const PLAN = [
    ['meadow', 'coat', 'berry'], ['meadow', 'coat', 'coral'], ['meadow', 'hair', 'bubblegum'], ['meadow', 'hair', 'sunset'], ['meadow', 'style', 'flowy'],
    ['meadow', 'style', 'fluffy'], ['meadow', 'sparkle', 'flowers'], ['meadow', 'sparkleColor', 'purple'], ['meadow', 'mark', 'flower'], ['meadow', 'mark', 'sun'],
    ['meadow', 'mark', 'butterfly'], ['meadow', 'saddle', 'sunny'], ['meadow', 'mark', 'rainbow'],
    ['town', 'mark', 'cupcake'], ['town', 'horn', 'rose'], ['town', 'sparkle', 'bubbles'],
    ['star', 'mark', 'crown'], ['star', 'mark', 'moon'], ['star', 'horn', 'crystal'], ['star', 'horn', 'rainbow'], ['star', 'hair', 'galaxy'],
    ['star', 'coat', 'midnight'], ['star', 'saddle', 'starry'], ['star', 'sparkle', 'diamonds'], ['star', 'saddle', 'rainbowsaddle'],
    ['road', 'coat', 'silver'], ['road', 'hair', 'snow'], ['road', 'horn', 'ice'], ['road', 'mark', 'snowflake'], ['road', 'mark', 'bolt'],
    ['valley', 'coat', 'aqua'], ['valley', 'hair', 'mermaid'], ['valley', 'style', 'pixie'], ['valley', 'sparkleColor', 'blue'],
  ];
  const WORLD_OF = { meadow: 'main', town: 'main', star: 'star', road: 'ice', valley: 'ice' };
  // the colour of the box and its ribbon, by kind of look
  const CAT = { coat: [0xff9ac4, 0xfff0f8], hair: [0xb89bff, 0xffe27a], style: [0x8fd2ff, 0xffffff], horn: [0xffd45e, 0xff7fa8], sparkle: [0x7fe8cc, 0xffffff], sparkleColor: [0x7fe8cc, 0xffe27a], mark: [0xff9f7a, 0xfff3a6], saddle: [0x9ad87a, 0xffffff] };
  const LABEL = {
    coat: (n) => n + ' coat',
    hair: (n) => n + ' mane and tail',
    style: (n) => n + ' hair',
    horn: (n) => n + ' horn',
    sparkle: (n) => 'Sparkly ' + n.toLowerCase(),
    sparkleColor: (n) => n + ' sparkles',
    mark: (n) => n + ' cutie mark',
    saddle: (n) => n + ' saddle',
  };
  Finds.label = (key, id) => LABEL[key](Look.item(key, id).name);

  const rngFor = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------- the box ---------- */
  let boxMats = {},
    pillarTex = {};
  function boxGeometry(cat) {
    const [bc, rc] = CAT[cat];
    const M = (x, y, z, sx, sy, sz) => new T.Matrix4().makeTranslation(x, y, z).multiply(new T.Matrix4().makeScale(sx || 1, sy || 1, sz || 1));
    const box = (w, h, d, x, y, z, color) => ({ geo: new T.BoxGeometry(w, h, d), color, matrix: M(x, y, z) });
    const ball = (r, x, y, z, sx, sy, sz, color) => ({ geo: new T.SphereGeometry(r, 9, 7), color, matrix: M(x, y, z, sx, sy, sz) });
    const light = new T.Color(bc).lerp(new T.Color(0xffffff), 0.28).getHex();
    const list = [
      box(1.5, 1.2, 1.5, 0, -0.15, 0, bc),
      box(1.66, 0.42, 1.66, 0, 0.66, 0, light),
      box(0.32, 1.22, 1.54, 0, -0.15, 0, rc),
      box(1.54, 1.22, 0.32, 0, -0.15, 0, rc),
      box(0.34, 0.44, 1.7, 0, 0.66, 0, rc),
      box(1.7, 0.44, 0.34, 0, 0.66, 0, rc),
      ball(0.4, -0.38, 1.12, 0, 1.25, 0.8, 0.8, rc),
      ball(0.4, 0.38, 1.12, 0, 1.25, 0.8, 0.8, rc),
      ball(0.22, 0, 1.0, 0, 1, 1, 1, rc),
    ];
    const g = UA.mergeGeos(list);
    list.forEach((l) => l.geo.dispose());
    return g;
  }
  const boxGeos = {};
  function boxMat() {
    if (!boxMats.m) boxMats.m = UA.addGlow(new T.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient, emissive: 0xffffff, emissiveIntensity: 0.12 }), 1.0);
    return boxMats.m;
  }
  // the column of light: a soft gradient, brightest low down and fading out at the top (normal blending, in real colours)
  function pillarMat(color) {
    if (pillarTex[color]) return pillarTex[color];
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 128, 0, 0);
    const col = new T.Color(color);
    const rgb = (k) => 'rgba(' + Math.round(col.r * 255) + ',' + Math.round(col.g * 255) + ',' + Math.round(col.b * 255) + ',' + k + ')';
    gr.addColorStop(0, rgb(0.0));
    gr.addColorStop(0.08, rgb(0.9));
    gr.addColorStop(0.6, rgb(0.7));
    gr.addColorStop(1, rgb(0));
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, 128);
    const m = new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, opacity: 0.55, depthWrite: false, side: T.DoubleSide, fog: false });
    pillarTex[color] = m;
    return m;
  }
  let pillarGeo = null;

  function makeGift(def) {
    const g = new T.Group();
    const cat = def.key;
    if (!boxGeos[cat]) boxGeos[cat] = boxGeometry(cat);
    const box = new T.Mesh(boxGeos[cat], boxMat());
    box.position.y = 1.9;
    g.add(box);
    if (!pillarGeo) {
      pillarGeo = new T.CylinderGeometry(0.35, 1.15, 30, 12, 1, true);
      pillarGeo.translate(0, 15, 0);
    }
    const pillar = new T.Mesh(pillarGeo, pillarMat(CAT[cat][0]).clone());
    pillar.material.map = pillarMat(CAT[cat][0]).map;
    pillar.renderOrder = 6;
    g.add(pillar);
    if (UA.Outline && UA.Outline.apply) UA.Outline.apply(box);
    g.visible = false;
    g.userData.box = box;
    g.userData.pillar = pillar;
    return g;
  }

  /* ---------- finding places for them ---------- */
  function placeAll() {
    const W = UA.World,
      Rm = UA.Realm,
      R = UA.REALM,
      I = UA.ICE,
      TN = UA.TOWN;
    const dist = (a, b, c, d) => Math.hypot(a - c, b - d);
    const placed = []; // { x, z, world }
    const solidFree = (x, z, pad) => {
      const cs = W.colliders;
      for (let i = 0; i < cs.length; i++) {
        const c = cs[i];
        if (Math.abs(c.x - x) > c.r + pad || Math.abs(c.z - z) > c.r + pad) continue;
        if (Math.hypot(c.x - x, c.z - z) < c.r + pad) return false;
      }
      for (const b of W.bushes) if (Math.hypot(b.x - x, b.z - z) < 3.4) return false;
      return true;
    };
    const flat = (x, z, maxSlope) => W.slopeAt(x, z) < maxSlope && isFinite(W.heightAt(x, z));
    const farFromPortals = (x, z, r) => Rm.portals.every((p) => Math.hypot(p.wx - x, p.wz - z) > r);
    const nearest = (x, z, world) => {
      let m = 1e9;
      for (const p of placed) if (p.world === world) m = Math.min(m, dist(p.x, p.z, x, z));
      return m;
    };
    const zoneCount = {};
    PLAN.forEach((d) => (zoneCount[d[0]] = (zoneCount[d[0]] || 0) + 1));
    const zoneIdx = {};
    const ice = Rm.ice;

    const zones = {
      meadow: {
        sep: 36,
        sample(rnd, k, n) {
          const a = ((k + rnd()) / n) * Math.PI * 2 + 0.4;
          const r = 30 + Math.sqrt(rnd()) * 108;
          return [Math.cos(a) * r, Math.sin(a) * r];
        },
        ok(x, z) {
          if (W.inWater(x, z) || W.heightAt(x, z) < 1.2 || !flat(x, z, 0.28)) return false;
          if (W.inTown(x, z, 14) || Math.hypot(x, z) < 22 || W.outOfBounds(x, z, 50)) return false;
          if (!solidFree(x, z, 2.8) || !farFromPortals(x, z, 14)) return false;
          const Wd = UA.Wonders;
          if (Wd) {
            if (Wd.fountain && dist(Wd.fountain.x, Wd.fountain.z, x, z) < 16) return false;
            for (const r of Wd.rings || []) if (dist(r.x, r.z, x, z) < 12) return false;
            for (const p of Wd.pads || []) if (dist(p.x, p.z, x, z) < 7) return false;
          }
          return true;
        },
      },
      town: {
        sep: 30,
        sample(rnd) {
          return [TN.ox + TN.u0 + 6 + rnd() * (TN.u1 - TN.u0 - 12), TN.oz + (rnd() * 2 - 1) * (TN.hv - 6)];
        },
        ok(x, z) {
          if (!W.inTown(x, z, -4) || !flat(x, z, 0.3) || !solidFree(x, z, 3.2) || !farFromPortals(x, z, 12)) return false;
          const f = UA.Town && UA.Town.fountain;
          if (f && dist(f.x, f.z, x, z) < 9) return false;
          return true;
        },
      },
      star: {
        sep: 26,
        sample(rnd, k, n) {
          const a = ((k + rnd()) / n) * Math.PI * 2 + 0.2;
          const r = 22 + Math.sqrt(rnd()) * 56;
          return [R.x + Math.cos(a) * r, R.z - 18 + Math.sin(a) * r];
        },
        ok(x, z) {
          const lx = x - R.x,
            lz = z - R.z;
          if (Rm.hard(lx, lz, 3) || W.outOfBounds(x, z, 8) || !flat(x, z, 0.3)) return false;
          if (Math.hypot(lx - Rm.ARRIVE.lx, lz - Rm.ARRIVE.lz) < 24 || Math.hypot(lx, lz - Rm.PORTAL_Z) < 20) return false;
          return solidFree(x, z, 2.6);
        },
      },
      valley: {
        sep: 30,
        sample(rnd, k) {
          const gl = ice.glades;
          const g = gl[k % gl.length];
          const a = rnd() * Math.PI * 2,
            r = Math.sqrt(rnd()) * g.r * 0.62;
          return [I.x + g.x + Math.cos(a) * r, I.z + g.z + Math.sin(a) * r];
        },
        ok(x, z) {
          const lx = x - I.x,
            lz = z - I.z;
          if (ice.hard(lx, lz, 3) || W.outOfBounds(x, z, 8) || !flat(x, z, 0.35)) return false;
          return solidFree(x, z, 2.4);
        },
      },
    };

    const rnd = rngFor(C.SEED + 4242);
    for (const def of PLAN) {
      const [zone, key, id] = def;
      const world = WORLD_OF[zone];
      const k = (zoneIdx[zone] = (zoneIdx[zone] === undefined ? 0 : zoneIdx[zone] + 1));
      let spot = null;
      if (zone === 'road') {
        // up the icy road: one every so often, a little to the side of the middle line
        const us = [0.14, 0.3, 0.46, 0.63, 0.8];
        const u = us[k % us.length];
        const p = I.roadPoint(u);
        const rho = Math.hypot(p.x, p.z - I.mz) || 1;
        const side = k % 2 ? 2.6 : -2.6;
        spot = [I.x + p.x + (p.x / rho) * side, I.z + p.z + ((p.z - I.mz) / rho) * side];
      } else {
        const Z = zones[zone];
        let best = null,
          bestS = -1,
          valid = 0;
        for (let i = 0; i < 400 && valid < 24; i++) {
          const q = Z.sample(rnd, k, zoneCount[zone]);
          if (!Z.ok(q[0], q[1])) continue;
          const s = nearest(q[0], q[1], world);
          if (s < Z.sep * 0.5) continue;
          valid++;
          const score = Math.min(s, Z.sep * 2);
          if (score > bestS) {
            bestS = score;
            best = q;
          }
        }
        spot = best;
      }
      if (!spot) {
        Finds.missed.push(key + ':' + id);
        continue;
      }
      placed.push({ x: spot[0], z: spot[1], world });
      const mesh = makeGift({ key });
      const gift = { zone, world, key, id, x: spot[0], z: spot[1], y: Math.max(W.heightAt(spot[0], spot[1]), 0), mesh, ph: rnd() * 6, taken: false };
      mesh.position.set(gift.x, gift.y, gift.z);
      Finds.group.add(mesh);
      Finds.gifts.push(gift);
    }
    Finds.placed = Finds.gifts.length;
  }

  Finds.build = function (scene) {
    if (Finds.group) return;
    Finds.group = new T.Group();
    scene.add(Finds.group);
    placeAll();
  };

  /* ---------- picking one up ---------- */
  const _v = new T.Vector3();
  function collect(g, uni) {
    g.taken = true;
    g.mesh.visible = false;
    Look.find(g.key, g.id);
    if (UA.save) UA.save();
    const k = (uni.size || 1) * (uni.scaleK || 1);
    _v.set(g.x, g.y + 2.2, g.z);
    UA.FX.burst(_v, 46);
    for (let i = 0; i < 5; i++) UA.FX.hearts(_v, 1);
    Look.burst(_v, 22);
    if (UA.Audio.fanfare) UA.Audio.fanfare();
    const label = Finds.label(g.key, g.id);
    UA.UI.toast('A new look!<small>' + label + '</small>', 4800);
    Finds.offer = { key: g.key, id: g.id, label, t: 14 };
    if (UA.LookUI) UA.LookUI.updateBadge();
    return k;
  }
  Finds.collect = collect;

  function wear(uni) {
    const o = Finds.offer;
    if (!o) return;
    Look.set(uni, o.key, o.id);
    Look.markSeen(o.key, o.id);
    if (UA.save) UA.save();
    Finds.offer = null;
    const k = (uni.size || 1) * (uni.scaleK || 1);
    _v.set(uni.pos.x, uni.pos.y + 2.4 * k, uni.pos.z);
    Look.burst(_v, 26);
    if (UA.Audio.chirp) UA.Audio.chirp(820);
    UA.UI.toast(o.label + '!<small>Looking lovely</small>', 2600);
    if (UA.LookUI) UA.LookUI.updateBadge();
  }

  /* ---------- every frame ---------- */
  Finds.update = function (dt, t, uni) {
    if (!Finds.group) return;
    const cur = UA.Realm.cur;
    let hinted = false;
    for (const g of Finds.gifts) {
      const here = g.world === cur && !g.taken && !Look.has(g.key, g.id);
      if (g.mesh.visible !== here) g.mesh.visible = here;
      if (!here) continue;
      const dx = uni.pos.x - g.x,
        dz = uni.pos.z - g.z;
      const d = Math.hypot(dx, dz);
      const U = g.mesh.userData;
      // turning and bobbing
      U.box.rotation.y = t * 1.3 + g.ph;
      U.box.position.y = 1.9 + Math.sin(t * 2 + g.ph) * 0.22;
      const near = UA.clamp((d - 4) / 12, 0.25, 1);
      U.pillar.material.opacity = (0.5 + 0.1 * Math.sin(t * 2.4 + g.ph)) * near;
      if (d > 170) continue;
      // a twinkle now and then, so it catches the eye
      if (d < 70 && Math.random() < dt * 4) {
        UA.FX.emit({
          x: g.x + (Math.random() - 0.5) * 2.4,
          y: g.y + 1 + Math.random() * 2.6,
          z: g.z + (Math.random() - 0.5) * 2.4,
          vx: 0,
          vy: 0.8 + Math.random(),
          vz: 0,
          color: Math.random() < 0.5 ? CAT[g.key][0] : 0xffffff,
          size: 0.45 + Math.random() * 0.3,
          shape: 1,
          life: 1.1,
          grow: -0.6,
          gravity: -0.2,
          drag: 0.6,
          twinkle: 6,
        });
      }
      if (d < 3.4 && Math.abs(uni.pos.y - g.y) < 5) {
        collect(g, uni);
        continue;
      }
      // the first time one is close, say what it is
      if (d < 26 && !hinted && !UA.state.giftHint && !Finds.offer) {
        hinted = true;
        UA.state.giftHint = true;
        UA.UI.toast('A gift box!<small>Ride into it to open it</small>', 4200);
        if (UA.save) UA.save();
      }
    }
    // "Wear it!" for a little while after opening one
    const o = Finds.offer;
    if (o) {
      o.t -= dt;
      if (o.t <= 0) Finds.offer = null;
      else
        UA.UI.offer('gift', 0.4, {
          name: o.label,
          sub: 'New!',
          btns: [{ a: 'pet', key: 'E', icon: UA.UI.ICON.gift, label: 'Wear it!' }],
          acts: { pet: () => wear(uni) },
          sig: o.label,
        });
    }
  };
})();
