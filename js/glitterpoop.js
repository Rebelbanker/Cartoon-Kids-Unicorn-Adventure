/* Glitter poop: the idle gag. After a few quiet seconds the unicorn lifts her tail, squats a little and plops out a
   soft-serve swirl of rainbow glitter. It sparkles for a while, then pops into stars and hearts (and pops early if
   you bump it). The unicorn's own side of the gag (idle timer, squat, tail, look-back) lives in unicorn.js; this
   file owns the piles. Three piles are built once and reused, so nothing is created or leaked while you stand about. */
(function () {
  const UA = window.UA,
    C = UA.C,
    T = THREE;
  const G = (UA.GlitterPoop = { piles: [], MAX: 3, LIFE: 6, total: 0 });

  // soft-serve layers, bottom to top: radius, squash, height of the centre
  const LAYERS = [
    { r: 0.68, sy: 0.5, y: 0.27 },
    { r: 0.52, sy: 0.46, y: 0.72 },
    { r: 0.36, sy: 0.44, y: 1.07 },
  ];
  const BIG = 0.7; // overall pile size (1 = the LAYERS above; v0.9.2 drew them at 1.3, which Alex found too big)
  const STAGGER = 0.34; // seconds between one layer and the next plopping out
  const PASTEL = [0xff9fc4, 0xffbf9a, 0xffec99, 0xb2f0a6, 0x9edcff, 0xcdaaff];

  const easeOutBack = (u) => {
    const c1 = 2.2,
      c3 = c1 + 1;
    return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
  };

  function glitterMat() {
    const m = new T.MeshToonMaterial({ color: 0xffffff, gradientMap: UA.gradient, emissive: 0xffffff, emissiveIntensity: 0.3 });
    return UA.Cartoon && UA.Cartoon.gloss ? UA.Cartoon.gloss(m) : m;
  }

  G.init = function (scene) {
    if (G.piles.length) return;
    for (let n = 0; n < G.MAX; n++) {
      const group = new T.Group();
      const layers = LAYERS.map((L) => {
        const mat = glitterMat();
        const mesh = UA.ball(L.r, mat, 1, L.sy, 1, 0, L.y, 0);
        group.add(mesh);
        return { mesh, mat, L };
      });
      // the little curl on top
      const tipMat = glitterMat();
      const tip = UA.cone(0.16, 0.42, tipMat, 0, 1.38, 0);
      tip.rotation.z = 0.35;
      group.add(tip);
      group.visible = false;
      scene.add(group);
      // outline it now (at full size, so it passes the size test); the group stays hidden until it is used
      if (UA.Outline && UA.Outline.apply) UA.Outline.apply(group);
      G.piles.push({ group, layers, tip, tipMat, on: false, age: 0, shown: 0, sparkT: 0, size: 1, pos: new T.Vector3() });
    }
  };

  // a pile starts plopping out at (x, y, z). `size` is the unicorn's size, so a giant unicorn leaves a giant pile
  G.spawn = function (x, y, z, size) { // `size` is the unicorn's size, so a giant unicorn leaves a giant pile
    if (!G.piles.length) return null;
    let p = G.piles.find((q) => !q.on);
    if (!p) {
      // all three are out: pop the oldest to make room
      p = G.piles.reduce((a, b) => (b.age > a.age ? b : a));
      G.pop(p);
    }
    p.on = true;
    p.age = 0;
    p.shown = 0;
    p.sparkT = 0;
    p.size = (size || 1) * BIG;
    p.pos.set(x, y, z);
    p.group.position.set(x, y - 0.02, z);
    p.group.rotation.y = Math.random() * 6.283;
    p.group.scale.setScalar(p.size);
    const PAL = G.colors || PASTEL; // (look.js: the swirl takes the unicorn's sparkle colours)
    const h0 = (Math.random() * PAL.length) | 0;
    p.layers.forEach((l, i) => {
      const c = PAL[(h0 + i) % PAL.length];
      l.mat.color.setHex(c);
      l.mat.emissive.setHex(c);
      l.mesh.scale.setScalar(0.0001);
    });
    const ct = PAL[(h0 + 3) % PAL.length];
    p.tipMat.color.setHex(ct);
    p.tipMat.emissive.setHex(ct);
    p.tip.scale.setScalar(0.0001);
    p.group.visible = true;
    G.total++;
    return p;
  };

  // make a pile burst into stars and hearts, and put it away
  G.pop = function (p, quiet) {
    if (!p.on) return;
    p.on = false;
    p.group.visible = false;
    if (quiet) return;
    const c = new T.Vector3(p.pos.x, p.pos.y + 0.8 * p.size, p.pos.z);
    UA.FX.burst(c, 14);
    UA.FX.hearts(c, 2);
    UA.FX.sparkles(c, 6, undefined, 1.0, 1);
    UA.Audio.sparkle();
  };

  G.clear = function () {
    G.piles.forEach((p) => G.pop(p, true));
  };
  G.count = () => G.piles.filter((p) => p.on).length;

  // each frame; `u` is the unicorn (so you can bump a pile)
  G.update = function (dt, u) {
    const fx = UA.FX;
    for (const p of G.piles) {
      if (!p.on) continue;
      p.age += dt;
      const s = p.size;
      // layers plop out one after another with a squishy overshoot
      for (let i = 0; i < p.layers.length; i++) {
        const k = (p.age - i * STAGGER) / 0.38;
        const l = p.layers[i];
        if (k <= 0) continue;
        if (i >= p.shown) {
          p.shown = i + 1;
          const lp = new T.Vector3(p.pos.x, p.pos.y + (l.L.y + 0.1) * s, p.pos.z);
          fx.puff(lp, 3, 0xfff4fb);
          fx.sparkles(lp, 7, undefined, 0.9 * s, 0.7);
          if (UA.Audio.plop) UA.Audio.plop(i);
        }
        const e = easeOutBack(UA.clamp(k, 0, 1));
        // each layer wobbles a touch, like jelly
        const wob = 1 + Math.sin(p.age * 7 - i) * 0.025 * UA.clamp(1 - (p.age - 1.2) / 1.5, 0.35, 1);
        l.mesh.scale.set(l.L.r * e, l.L.r * l.L.sy * e * wob, l.L.r * e);
      }
      const kt = (p.age - p.layers.length * STAGGER) / 0.3;
      if (kt > 0) {
        const e = easeOutBack(UA.clamp(kt, 0, 1));
        p.tip.scale.set(0.16 * e, 0.42 * e, 0.16 * e);
      }

      // a steady twinkle of glitter while it sits there
      p.sparkT -= dt;
      if (p.sparkT <= 0 && p.age > 0.6) {
        p.sparkT = 0.09 + Math.random() * 0.1;
        const a = Math.random() * 6.283,
          r = (0.2 + Math.random() * 0.6) * s;
        fx.emit({
          x: p.pos.x + Math.cos(a) * r,
          y: p.pos.y + (0.3 + Math.random() * 1.1) * s,
          z: p.pos.z + Math.sin(a) * r,
          vx: Math.cos(a) * 0.25,
          vy: 0.35 + Math.random() * 0.5,
          vz: Math.sin(a) * 0.25,
          color: C.RAINBOW[(Math.random() * 6) | 0],
          size: 0.3 + Math.random() * 0.25,
          shape: 1,
          life: 0.7 + Math.random() * 0.5,
          grow: -0.5,
          gravity: -0.2,
          drag: 1,
          twinkle: 9,
        });
      }

      // the end: bumped by the unicorn, or its time is up
      let boop = false;
      if (u && p.age > 2.2) {
        const dx = u.pos.x - p.pos.x,
          dz = u.pos.z - p.pos.z;
        boop = dx * dx + dz * dz < Math.pow(0.55 * s + 0.45 * u.size, 2) && u.pos.y < p.pos.y + 1.4 * s;
      }
      if (boop || p.age > G.LIFE) {
        if (boop && UA.Audio.pop) UA.Audio.pop();
        G.pop(p);
      }
    }
  };
})();
