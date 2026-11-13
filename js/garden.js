/* The gardens of Starlight Castle. There are no walls any more: the lawns around the keep are open parkland that you can ride
   across in any direction, with a few well-spaced things to ride around (and nothing that can pinch a unicorn: every solid
   thing stands at least six steps from the next one).

     front:   two formal parterres (heart-shaped beds on the west side, star-shaped on the east) either side of the avenue, with a
              crystal unicorn statue and a golden spinning sundial in the middle of them, hedged in with low flowering hedges
     west:    the lily pond with a weeping candy willow and a bench
     east:    a tea gazebo with a table laid for the princess, ringed with rose beds
     back:    the Moonflower Walk (candy fruit trees, two more statues) to a spinning unicorn carousel, a tree swing, wildflower beds
     air:     butterflies (one draw call, flapped in the vertex shader)

   Everything static is merged into the castle's body mesh (castle.js hands this file its accumulators); the flowers are one
   instanced mesh; paths, beds and ponds are flat decals. Local coordinates, like castle.js. */
(function () {
  const UA = window.UA,
    T = THREE,
    PI = Math.PI,
    TAU = PI * 2;
  const Realm = UA.Realm,
    R = UA.REALM,
    GH = R.gh;
  const { M } = Realm;
  const FLOWER_COLS = [0xff9ccb, 0xc3a4ff, 0xffe27a, 0xffffff, 0x9fd8ff, 0xffb48a];

  Realm.buildGarden = function (k) {
    const { g, A, Wn, P, rnd, col, softCol, lamp, topiary, roseArch, bench } = k;
    const WD = UA.World;
    const flowers = []; // { x, z, s, c }
    const pad = (shape) => Realm.pads.push(shape);
    const poly = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
    const css = (c) => '#' + c.toString(16).padStart(6, '0');

    /* ---------- flat decals ---------- */
    function decal(geo, tex, x, z, order, glow) {
      const m = new T.Mesh(geo, UA.addGlow(new T.MeshToonMaterial(Object.assign({ map: tex, gradientMap: UA.gradient, transparent: true }, poly)), glow || 0.25));
      m.position.set(x, GH + 0.05, z);
      m.renderOrder = order || 1;
      m.userData.noOutline = true;
      g.add(m);
      return m;
    }
    const plane = (w, d, x, z, tex, order) => decal(new T.PlaneGeometry(w, d).rotateX(-PI / 2), tex, x, z, order);
    const gravel = Realm.canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = '#fff1e0';
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        c.fillStyle = rnd() < 0.5 ? 'rgba(235,205,215,0.55)' : 'rgba(255,255,255,0.7)';
        c.beginPath();
        c.ellipse(rnd() * w, rnd() * h, 2 + rnd() * 3, 1.5 + rnd() * 2, rnd() * 3, 0, TAU);
        c.fill();
      }
    });
    // a gravel path strip, with a pad so no grass pokes through
    function path(x0, z0, x1, z1) {
      const w = x1 - x0,
        d = z1 - z0;
      const tex = gravel.clone();
      tex.needsUpdate = true;
      tex.repeat.set(w / 5, d / 5);
      plane(w, d, (x0 + x1) / 2, (z0 + z1) / 2, tex, 1);
      pad({ x0, x1, z0, z1 });
    }
    function gravelDisc(x, z, r) {
      const tex = gravel.clone();
      tex.needsUpdate = true;
      tex.repeat.set(r / 2.5, r / 2.5);
      decal(new T.CircleGeometry(r, 40).rotateX(-PI / 2), tex, x, z, 1);
      pad({ x, z, r: r + 0.6 });
    }
    function rr(c, x, y, w, h, r) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    }

    /* ---------- little builders ---------- */
    // a low, round-topped hedge along x (hedgeX) or z (hedgeZ), with blossoms on top
    function blossoms(n, fn) {
      for (let i = 0; i < n; i++) {
        const q = fn(i);
        A.sph(i % 3 === 0 ? 0xffffff : i % 3 === 1 ? P.rose : 0xffe27a, q[0], 1.12, q[1], 0.2);
      }
    }
    function hedgeX(xa, xb, z) {
      A.cyl(0x7fd9a0, (xa + xb) / 2, 0.5, z, 0.62, Math.abs(xb - xa), 0, 0, PI / 2);
      const n = Math.floor(Math.abs(xb - xa) / 1.7);
      blossoms(n, (i) => [Math.min(xa, xb) + ((i + 0.5) * Math.abs(xb - xa)) / n, z + (rnd() - 0.5) * 0.4]);
    }
    function hedgeZ(x, za, zb) {
      A.cyl(0x7fd9a0, x, 0.5, (za + zb) / 2, 0.62, Math.abs(zb - za), PI / 2, 0, 0);
      const n = Math.floor(Math.abs(zb - za) / 1.7);
      blossoms(n, (i) => [x + (rnd() - 0.5) * 0.4, Math.min(za, zb) + ((i + 0.5) * Math.abs(zb - za)) / n]);
    }
    // a round flower bed (flat, so it is fine to ride across)
    function roundBed(x, z, r, cols) {
      A.cyl(P.cream, x, 0.14, z, r, 0.28);
      A.cyl(0x7fd9a0, x, 0.17, z, r - 0.5, 0.34);
      const n = Math.round(r * r * 2.4);
      for (let i = 0; i < n; i++) {
        const a = rnd() * TAU,
          rr2 = Math.sqrt(rnd()) * (r - 0.8);
        flowers.push({ x: x + Math.cos(a) * rr2, z: z + Math.sin(a) * rr2, y: 0.32, s: 0.8 + rnd() * 0.7, c: UA.pick(cols || FLOWER_COLS, rnd) });
      }
      pad({ x, z, r: r + 0.4 });
    }
    // a pastel lollipop tree
    function lolly(x, z, s, c) {
      A.cyl(P.cream, x, 1.0 * s, z, 0.38 * s, 2.0 * s);
      A.cyl(P.rose, x, 2.3 * s, z, 0.34 * s, 0.6 * s);
      A.sph(c, x, 4.6 * s, z, 2.3 * s, 2.1 * s, 2.3 * s, true);
      A.sph(c, x + 1.4 * s, 3.9 * s, z + 0.3 * s, 1.3 * s);
      A.sph(c, x - 1.3 * s, 3.8 * s, z - 0.6 * s, 1.2 * s);
      for (let i = 0; i < 9; i++) {
        const a = rnd() * TAU,
          e = rnd() * 1.6 - 0.2;
        A.sph(UA.pick([0xffffff, P.rose, 0xffe27a], rnd), x + Math.cos(a) * Math.cos(e) * 2.2 * s, 4.6 * s + Math.sin(e) * 2.0 * s, z + Math.sin(a) * Math.cos(e) * 2.2 * s, 0.26 * s);
      }
      col(x, z, 0.8 * s, 9 * s);
    }
    // a weeping willow: soft canopy with hanging strands
    function willow(x, z, s) {
      A.cyl(P.wood, x, 2.2 * s, z, 0.7 * s, 4.4 * s);
      A.sph(0xb6efc9, x, 6.2 * s, z, 3.4 * s, 2.2 * s, 3.4 * s, true);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU,
          rr2 = 3.0 * s;
        A.cyl(0xa6e8be, x + Math.cos(a) * rr2, 3.7 * s, z + Math.sin(a) * rr2, 0.11 * s, 4.2 * s);
        A.sph(P.rose, x + Math.cos(a) * rr2, 1.6 * s, z + Math.sin(a) * rr2, 0.2 * s);
      }
      col(x, z, 1.0 * s, 9 * s);
    }
    // a crystal unicorn statue on a pedestal
    function statue(x, z, yaw, s) {
      s = s || 1;
      A.push(M(x, 0, z, yaw));
      A.cyl(P.gold, 0, 0.2, 0, 2.3 * s, 0.4);
      A.cyl(P.stone, 0, 1.0 * s, 0, 1.8 * s, 1.6 * s);
      A.cyl(P.cream, 0, 1.9 * s, 0, 2.05 * s, 0.4);
      const y0 = 2.1 * s;
      const W = 0xfff6fb;
      A.sph(W, 0, y0 + 1.5 * s, 0, 0.8 * s, 0.75 * s, 1.5 * s);
      A.cyl(W, 0, y0 + 2.5 * s, 1.1 * s, 0.4 * s, 1.7 * s, 0.6, 0, 0);
      A.sph(W, 0, y0 + 3.3 * s, 1.55 * s, 0.42 * s, 0.46 * s, 0.62 * s);
      A.sph(W, 0, y0 + 3.05 * s, 2.05 * s, 0.26 * s, 0.26 * s, 0.34 * s);
      A.cone(P.gold, 0, y0 + 4.2 * s, 1.85 * s, 0.12 * s, 1.1 * s, 0.55, 0, 0);
      A.cone(W, -0.2 * s, y0 + 3.85 * s, 1.35 * s, 0.1 * s, 0.4 * s);
      A.cone(W, 0.2 * s, y0 + 3.85 * s, 1.35 * s, 0.1 * s, 0.4 * s);
      for (let i = 0; i < 4; i++) A.sph(i % 2 ? P.lilac : P.rose, 0, y0 + 3.4 * s - i * 0.32 * s, 0.55 * s - i * 0.18 * s, 0.2 * s, 0.34 * s, 0.3 * s);
      A.sph(P.rose, 0, y0 + 1.9 * s, -1.6 * s, 0.26 * s, 0.7 * s, 0.26 * s, false);
      A.sph(P.lilac, 0, y0 + 1.4 * s, -1.75 * s, 0.22 * s, 0.6 * s, 0.22 * s);
      for (const lx of [-0.45, 0.45])
        for (const lz of [-0.9, 0.9]) {
          A.cyl(W, lx * s, y0 + 0.5 * s, lz * s, 0.16 * s, 1.1 * s);
          A.cyl(P.gold, lx * s, y0 + 0.05 * s, lz * s, 0.18 * s, 0.14 * s);
        }
      A.pop();
      col(x, z, 2.0 * s, 11 * s);
    }

    /* ---------- the front: parterres either side of the avenue ---------- */
    // The canvas shows the gravel floor, four quadrant beds and a centre pad; the 3D flowers are then planted on whatever
    // coloured bed pixels the canvas has, so the picture and the blossoms always agree.
    const BEDPAL = [
      [0xff9ccb, 1],
      [0xc3a4ff, 1],
      [0xffe27a, 1],
      [0xffffff, 1],
    ];
    function parterre(cx, cz, kind) {
      const W = 22,
        D = 26,
        S = 24;
      const cv = document.createElement('canvas');
      cv.width = W * S;
      cv.height = D * S;
      const c = cv.getContext('2d');
      const px = (x) => (x + W / 2) * S,
        py = (z) => (z + D / 2) * S;
      c.fillStyle = '#fff2e2';
      rr(c, px(-W / 2 + 1.1), py(-D / 2 + 1.1), (W - 2.2) * S, (D - 2.2) * S, 1.4 * S);
      c.fill();
      for (let i = 0; i < 260; i++) {
        c.fillStyle = rnd() < 0.5 ? 'rgba(235,205,215,0.5)' : 'rgba(255,255,255,0.8)';
        c.beginPath();
        c.ellipse(px((rnd() - 0.5) * (W - 3)), py((rnd() - 0.5) * (D - 3)), 3 + rnd() * 3, 2 + rnd() * 2, rnd() * 3, 0, TAU);
        c.fill();
      }
      const heart = (x, z, sz, color) => {
        c.fillStyle = color;
        c.beginPath();
        for (let i = 0; i <= 40; i++) {
          const t = (i / 40) * TAU;
          const hx = 16 * Math.pow(Math.sin(t), 3),
            hz = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          c.lineTo(px(x + (hx / 17) * sz), py(z + (hz / 17) * sz + sz * 0.1));
        }
        c.closePath();
        c.fill();
      };
      const star = (x, z, sz, color) => {
        c.fillStyle = color;
        c.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU - PI / 2,
            rad = i % 2 ? sz * 0.46 : sz;
          c.lineTo(px(x + Math.cos(a) * rad), py(z + Math.sin(a) * rad));
        }
        c.closePath();
        c.fill();
      };
      for (const qx of [-1, 1])
        for (const qz of [-1, 1]) {
          const bx = qx * 5.45,
            bz = qz * 6.5;
          c.fillStyle = '#7fd9a0';
          rr(c, px(bx - 4.2), py(bz - 5.2), 8.4 * S, 10.4 * S, 1.6 * S);
          c.fill();
          c.strokeStyle = '#fffaf4';
          c.lineWidth = 5;
          c.stroke();
          const shape = kind === 'heart' ? heart : star;
          shape(bx, bz, kind === 'heart' ? 4.0 : 4.1, '#ff9ccb');
          shape(bx, bz, kind === 'heart' ? 2.9 : 2.9, '#c3a4ff');
          shape(bx, bz, kind === 'heart' ? 1.8 : 1.7, '#ffe27a');
          c.fillStyle = '#ffffff';
          c.beginPath();
          c.arc(px(bx), py(bz + (kind === 'heart' ? 0.2 : 0)), 0.5 * S, 0, TAU);
          c.fill();
          // white and gold dots in the corners
          for (const [ox, oz] of [
            [-3.2, -4.2],
            [3.2, -4.2],
            [-3.2, 4.2],
            [3.2, 4.2],
          ]) {
            c.fillStyle = (ox + oz) % 2 ? '#ffffff' : '#ffe27a';
            c.beginPath();
            c.arc(px(bx + ox), py(bz + oz), 0.55 * S, 0, TAU);
            c.fill();
          }
        }
      // centre: a round stone pad ringed with gold
      c.fillStyle = '#ffd45e';
      c.beginPath();
      c.arc(px(0), py(0), 3.5 * S, 0, TAU);
      c.fill();
      c.fillStyle = '#efe3f6';
      c.beginPath();
      c.arc(px(0), py(0), 3.2 * S, 0, TAU);
      c.fill();
      const tex = new T.CanvasTexture(cv);
      tex.colorSpace = T.SRGBColorSpace;
      tex.anisotropy = 4;
      plane(W, D, cx, cz, tex, 1);
      pad({ x0: cx - W / 2, x1: cx + W / 2, z0: cz - D / 2, z1: cz + D / 2 });
      // plant the blossoms on the coloured pixels
      const data = c.getImageData(0, 0, cv.width, cv.height).data;
      let placed = 0;
      for (let tries = 0; tries < 9000 && placed < 330; tries++) {
        const ix = Math.floor(rnd() * cv.width),
          iy = Math.floor(rnd() * cv.height);
        const o = (iy * cv.width + ix) * 4;
        if (data[o + 3] < 200) continue;
        const r = data[o],
          gg = data[o + 1],
          b = data[o + 2];
        let hit = -1;
        for (let q = 0; q < BEDPAL.length; q++) {
          const pr = (BEDPAL[q][0] >> 16) & 255,
            pg = (BEDPAL[q][0] >> 8) & 255,
            pb = BEDPAL[q][0] & 255;
          if (Math.abs(r - pr) + Math.abs(gg - pg) + Math.abs(b - pb) < 40) hit = q;
        }
        if (hit < 0) continue;
        flowers.push({ x: cx + ix / S - W / 2, z: cz + iy / S - D / 2, y: 0.04, s: 0.8 + rnd() * 0.55, c: BEDPAL[hit][0] });
        placed++;
      }
      // hedges around it, with a round topiary at each corner
      const hx = W / 2 - 0.55,
        hz = D / 2 - 0.55;
      hedgeX(cx - hx + 0.6, cx + hx - 0.6, cz - hz);
      hedgeX(cx - hx + 0.6, cx + hx - 0.6, cz + hz);
      hedgeZ(cx - hx, cz - hz + 0.6, cz + hz - 0.6);
      hedgeZ(cx + hx, cz - hz + 0.6, cz + hz - 0.6);
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
          A.cyl(P.cream, cx + sx * hx, 0.4, cz + sz * hz, 0.8, 0.8);
          A.sph(P.leaf, cx + sx * hx, 1.9, cz + sz * hz, 1.1, 1.1, 1.1, true);
          A.sph(P.rose, cx + sx * hx + 0.5, 2.3, cz + sz * hz + 0.4, 0.22);
          softCol(cx + sx * hx, cz + sz * hz, 1.0, 3);
        }
    }
    parterre(-24, -9, 'heart');
    parterre(24, -9, 'star');
    // centre pieces
    statue(-24, -9, 0, 1.0);
    {
      // a golden armillary sundial: a pedestal and three spinning rings
      A.cyl(P.gold, 24, 0.2, -9, 2.2, 0.4);
      A.cyl(P.stone, 24, 1.1, -9, 1.2, 2.0);
      A.cyl(P.cream, 24, 2.2, -9, 1.6, 0.35);
      const grp = new T.Group();
      grp.position.set(24, GH + 4.4, -9);
      const gold = UA.addGlow(new T.MeshToonMaterial({ color: P.gold, gradientMap: UA.gradient, emissive: 0xffb000, emissiveIntensity: 0.4 }), 1.3);
      const tg = new T.TorusGeometry(1.7, 0.1, 8, 44);
      const r1 = new T.Mesh(tg, gold),
        r2 = new T.Mesh(tg, gold),
        r3 = new T.Mesh(tg, gold);
      r2.rotation.y = PI / 2;
      r3.rotation.x = PI / 2;
      const core = new T.Mesh(new T.OctahedronGeometry(0.55, 0), gold);
      core.scale.set(1, 1.4, 1);
      [r1, r2, r3, core].forEach((m) => {
        m.userData.noOutline = true;
        grp.add(m);
      });
      g.add(grp);
      col(24, -9, 1.9, 8);
      Realm.anims.push((t) => {
        grp.rotation.y = t * 0.7;
        grp.rotation.x = Math.sin(t * 0.5) * 0.25;
        core.rotation.y = -t * 2;
        grp.position.y = GH + 4.4 + Math.sin(t * 1.3) * 0.18;
      });
    }
    // benches and lamps where the avenue meets the parterres
    [-1, 1].forEach((sx) => {
      bench(sx * 9.6, 6.5, sx * (PI / 2));
      lamp(sx * 16, 9, 5);
    });
    // two flower rings just outside each parterre, along the side
    roundBed(-40, -9, 3.6);
    roundBed(40, -9, 3.6);

    /* ---------- paths to the side gardens ---------- */
    path(-25.6, -39, -22.4, -22.4);
    path(22.4, -39, 25.6, -22.4);
    path(-31, -41.6, -22.4, -38.4);
    path(22.4, -41.6, 31, -38.4);
    roseArch(-31, -24, 0, 2.4);
    roseArch(-31, 24, 0, 2.4);

    /* ---------- west: the lily pond ---------- */
    const PX = -40,
      PZ = -40,
      PR = 9.5;
    {
      A.cyl(P.stone, PX, 0.12, PZ, PR + 0.9, 0.24);
      A.cyl(P.cream, PX, 0.14, PZ, PR + 0.55, 0.28);
      const wat = new T.Mesh(
        new T.CircleGeometry(PR, 44).rotateX(-PI / 2),
        new T.MeshToonMaterial({ color: 0x9fe0ff, gradientMap: UA.gradient, emissive: 0x6fc4ff, emissiveIntensity: 0.4, transparent: true, opacity: 0.92 })
      );
      wat.position.set(PX, GH + 0.3, PZ);
      wat.userData.noOutline = true;
      g.add(wat);
      for (let i = 0; i < 16; i++) {
        const a = rnd() * TAU,
          rr2 = 1.5 + Math.sqrt(rnd()) * (PR - 2.5);
        const x = PX + Math.cos(a) * rr2,
          z = PZ + Math.sin(a) * rr2,
          s = 0.8 + rnd() * 0.5;
        A.cyl(0x6fcf8f, x, 0.32, z, s, 0.06);
        if (i % 3 === 0) {
          A.sph(P.rose, x, 0.5, z, 0.32, 0.22, 0.32);
          A.sph(0xffffff, x, 0.62, z, 0.15);
        }
      }
      // reeds and cattails around the rim
      for (let i = 0; i < 14; i++) {
        const a = 0.2 + (i / 14) * 5.7,
          rr2 = PR + 0.1 + rnd() * 0.5;
        const x = PX + Math.cos(a) * rr2,
          z = PZ + Math.sin(a) * rr2,
          h = 2.0 + rnd() * 1.4;
        A.cyl(0x8fdca0, x, h / 2, z, 0.06, h);
        if (i % 2) A.cyl(0xc99a73, x, h, z, 0.14, 0.7);
      }
      pad({ x: PX, z: PZ, r: PR + 1.8 });
      willow(PX - 11.5, PZ - 8, 1.15);
      bench(PX + 1, PZ + PR + 3.2, PI);
      lamp(PX - 10, PZ + 8, 5);
      lamp(PX + 11, PZ - 6, 5);
      lamp(PX + 11, PZ + 6, 5);
      roundBed(PX + 8, PZ + 12, 3.2, [0xc3a4ff, 0x9fd8ff, 0xffffff]);
      Realm.ponds.push({ x: R.x + PX, z: R.z + PZ, r: PR - 0.3 });
    }

    /* ---------- east: the tea gazebo ---------- */
    const GXc = 40,
      GZc = -40;
    {
      gravelDisc(GXc, GZc, 9.4);
      A.cyl(P.cream, GXc, 0.1, GZc, 8.6, 0.2);
      A.cyl(P.gold, GXc, 0.06, GZc, 8.9, 0.14);
      const CR = 7.4;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + PI / 6,
          x = GXc + Math.cos(a) * CR,
          z = GZc + Math.sin(a) * CR;
        A.cyl(P.cream, x, 3.6, z, 0.45, 7.2);
        A.cyl(P.gold, x, 0.25, z, 0.7, 0.5);
        A.cyl(P.gold, x, 7.3, z, 0.7, 0.4);
        for (let q = 0; q < 6; q++) A.sph(q % 2 ? 0xffffff : P.rose, x + (rnd() - 0.5) * 0.7, 1 + q * 1.0, z + (rnd() - 0.5) * 0.7, 0.3);
        softCol(x, z, 0.75, 7.6);
      }
      A.cyl(P.rose, GXc, 7.8, GZc, CR + 1.0, 0.7);
      A.cyl(P.gold, GXc, 7.45, GZc, CR + 1.15, 0.2);
      A.cone(P.lilac, GXc, 11.2, GZc, CR + 1.8, 6.4);
      A.cone(P.rose, GXc, 14.9, GZc, 1.4, 2.4);
      A.sph(P.gold, GXc, 16.3, GZc, 0.45);
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * TAU;
        A.sph(i % 2 ? 0xffffff : P.rose, GXc + Math.cos(a) * (CR + 1.75), 8.1, GZc + Math.sin(a) * (CR + 1.75), 0.38);
      }
      // the tea table
      A.cyl(P.wood, GXc, 0.55, GZc, 0.4, 1.1);
      A.cyl(P.rose, GXc, 1.15, GZc, 1.7, 0.16);
      A.cyl(P.cream, GXc, 1.28, GZc, 1.45, 0.08);
      A.sph(P.gold, GXc, 1.75, GZc, 0.4, 0.34, 0.4);
      A.cone(P.gold, GXc, 2.15, GZc, 0.14, 0.3);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + 0.4;
        A.cyl(0xffffff, GXc + Math.cos(a) * 1.0, 1.42, GZc + Math.sin(a) * 1.0, 0.2, 0.2);
      }
      col(GXc, GZc, 2.1, 3);
      // lanterns hang between the pillars
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU,
          x = GXc + Math.cos(a) * CR * 0.62,
          z = GZc + Math.sin(a) * CR * 0.62;
        A.cyl(P.gold, x, 7.0, z, 0.03, 1.2);
        Wn.sph(P.glass, x, 6.2, z, 0.5, 0.65, 0.5);
        Realm.lamps.push({ x, y: GH + 6.2, z });
      }
      // rose beds ringing the gazebo
      for (let i = 0; i < 5; i++) {
        const a = -0.6 + (i / 5) * 3.3 + 0.2,
          rr2 = 15.5;
        if (i === 2) continue;
        roundBed(GXc + Math.cos(a) * rr2, GZc + Math.sin(a) * rr2 * 0.9, 3.0, [P.rose, 0xffffff, 0xff8fb8, 0xffe27a]);
      }
    }

    /* ---------- back: the Moonflower Walk and the carousel ---------- */
    const CZ = -84; // the carousel
    {
      path(-3.5, -58, 3.5, -76);
      gravelDisc(0, CZ, 12);
      [-1, 1].forEach((sx) => {
        statue(sx * 9, -62, sx * 0.5, 0.9);
        lamp(sx * 4.6, -66, 5);
        lamp(sx * 4.6, -74, 5);
        lolly(sx * 13, -69, 1.0, sx < 0 ? 0xffb4d8 : 0xcfaaff);
        lolly(sx * 13, -78, 1.05, sx < 0 ? 0xffd0a8 : 0xb4d6ff);
      });
      // wildflower beds in the back corners
      [-1, 1].forEach((sx) => {
        roundBed(sx * 32, -84, 5.4, FLOWER_COLS);
        roundBed(sx * 22, -90, 3.6, FLOWER_COLS);
        lolly(sx * 42, -72, 1.1, sx < 0 ? 0xffc8e6 : 0xa4d4ff);
        lolly(sx * 24, -78, 0.95, sx < 0 ? 0xcfaaff : 0xffb4d8);
      });
      // the carousel: a still base, and a roof + horses that turn
      A.cyl(P.stone, 0, 0.25, CZ, 8.2, 0.5);
      A.cyl(P.gold, 0, 0.5, CZ, 8.5, 0.16);
      col(0, CZ, 8.2, 12);
      const B = new UA.Town.Acc(),
        BW = new UA.Town.Acc();
      const horse = (a, hy, c1, c2) => {
        const hx = Math.cos(a) * 5.0,
          hz = Math.sin(a) * 5.0;
        B.cyl(P.gold, hx, 4.0, hz, 0.09, 7.2);
        B.push(M(hx, hy, hz, -a + PI / 2));
        B.sph(c1, 0, 0, 0, 0.55, 0.62, 1.15);
        B.cyl(c1, 0, 0.7, 0.85, 0.25, 1.0, 0.5, 0, 0);
        B.sph(c1, 0, 1.2, 1.25, 0.32, 0.34, 0.5);
        B.cone(P.gold, 0, 1.75, 1.45, 0.09, 0.8, 0.5, 0, 0);
        B.sph(c2, 0, 0.9, 0.55, 0.16, 0.45, 0.3);
        B.sph(c2, 0, 0.2, -1.2, 0.2, 0.6, 0.2);
        B.sph(P.gold, 0, 0.7, 0.2, 0.3, 0.12, 0.45);
        for (const lx of [-0.28, 0.28]) for (const lz of [-0.6, 0.6]) B.cyl(c1, lx, -0.65, lz, 0.1, 0.7);
        B.pop();
      };
      const hcols = [
        [0xfff6fb, P.rose],
        [0xe9dcff, P.lilac],
        [0xd8f4ff, P.sky],
        [0xfff0d0, P.gold],
        [0xe3ffe9, P.mint],
        [0xffe0ef, 0xff8fb8],
      ];
      hcols.forEach((hc, i) => horse((i / 6) * TAU, 2.2 + (i % 2) * 0.8, hc[0], hc[1]));
      B.cyl(P.rose, 0, 4.0, 0, 1.1, 8.0);
      for (let i = 0; i < 4; i++) B.cyl(i % 2 ? P.gold : 0xffffff, 0, 1.0 + i * 2.0, 0, 1.14, 0.5);
      B.cyl(P.lilac, 0, 0.75, 0, 7.4, 0.35);
      B.cyl(P.rose, 0, 8.3, 0, 7.8, 0.5);
      B.cyl(P.gold, 0, 8.65, 0, 7.95, 0.2);
      B.cone(P.lilac, 0, 11.6, 0, 7.6, 5.4);
      B.cone(P.rose, 0, 15.2, 0, 2.2, 3.0);
      B.sph(P.gold, 0, 17.1, 0, 0.5);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        B.sph(i % 2 ? 0xffffff : P.rose, Math.cos(a) * 7.7, 8.35, Math.sin(a) * 7.7, 0.42);
        BW.sph(P.glass, Math.cos(a) * 7.9, 7.7, Math.sin(a) * 7.9, 0.3);
      }
      const cm = new T.Mesh(B.build(), UA.addGlow(new T.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient }), 0.3));
      const cw = new T.Mesh(BW.build(), UA.addGlow(new T.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient }), 2.2));
      const spin = new T.Group();
      spin.position.set(0, GH, CZ);
      spin.add(cm, cw);
      cm.frustumCulled = cw.frustumCulled = false;
      g.add(spin);
      Realm.anims.push((t) => (spin.rotation.y = t * 0.45));
      Realm.carousel = spin;
    }
    // a big tree with a swing
    {
      const sx = -28,
        sz = -68;
      A.cyl(P.wood, sx, 3.6, sz, 1.0, 7.2);
      A.sph(0xffc2dc, sx, 9.2, sz, 4.6, 3.6, 4.6, true);
      A.sph(0xffd0e8, sx + 2.8, 8.2, sz + 0.6, 2.6);
      A.sph(0xffb4d8, sx - 2.6, 8.4, sz - 1.0, 2.4);
      A.box(P.wood, sx + 3.6, 7.2, sz, 7.2, 0.5, 0.5);
      col(sx, sz, 1.2, 12);
      const B = new UA.Town.Acc();
      B.cyl(P.cream, -0.8, -3.4, 0, 0.05, 6.8);
      B.cyl(P.cream, 0.8, -3.4, 0, 0.05, 6.8);
      B.box(P.rose, 0, -6.9, 0, 2.0, 0.16, 0.7);
      const sw = new T.Mesh(B.build(), new T.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient }));
      const pivot = new T.Group();
      pivot.position.set(sx + 5.4, GH + 7.0, sz);
      pivot.add(sw);
      sw.frustumCulled = false;
      g.add(pivot);
      Realm.anims.push((t) => (pivot.rotation.z = Math.sin(t * 1.5) * 0.32));
    }
    // a fruit orchard on the east lawn (well apart from the gazebo)
    for (const [x, z, c] of [
      [54, -14, 0xffb4d8],
      [54, -28, 0xffd0a8],
      [-54, -14, 0xcfaaff],
      [-54, -28, 0xb4d6ff],
    ])
      lolly(x, z, 1.0, c);

    /* ---------- the flowers (one instanced mesh) ---------- */
    {
      const stem = new T.CylinderGeometry(0.02, 0.028, 0.6, 4);
      stem.translate(0, 0.3, 0);
      const head = new T.IcosahedronGeometry(0.3, 0);
      head.scale(1, 0.72, 1);
      head.translate(0, 0.68, 0);
      const stems = new T.InstancedMesh(stem, new T.MeshToonMaterial({ color: 0x7fd9a0, gradientMap: UA.gradient }), flowers.length);
      const heads = new T.InstancedMesh(head, UA.addGlow(new T.MeshToonMaterial({ color: 0xffffff, gradientMap: UA.gradient }), 1.0), flowers.length);
      const m = new T.Matrix4(),
        q = new T.Quaternion(),
        up = new T.Vector3(0, 1, 0),
        col2 = new T.Color();
      flowers.forEach((f, i) => {
        q.setFromAxisAngle(up, rnd() * 6.28);
        m.compose(new T.Vector3(f.x, GH + f.y, f.z), q, new T.Vector3(f.s, f.s, f.s));
        stems.setMatrixAt(i, m);
        heads.setMatrixAt(i, m);
        heads.setColorAt(i, col2.set(f.c));
      });
      stems.frustumCulled = heads.frustumCulled = false;
      stems.userData.noOutline = heads.userData.noOutline = true;
      g.add(stems, heads);
      Realm.gardenFlowers = flowers.length;
    }

    /* ---------- butterflies (one mesh; the wings flap in the vertex shader) ---------- */
    {
      const N = 46;
      const pos = [],
        side = [],
        cen = [],
        prm = [],
        clr = [],
        idx = [];
      const spots = flowers.filter((_, i) => i % 9 === 0);
      const pal = [0xffb0d4, 0xffe27a, 0xb9a0ff, 0x9fe0ff, 0xffffff, 0xffa77a];
      for (let b = 0; b < N; b++) {
        const f = spots[Math.floor(rnd() * spots.length)] || { x: 0, z: 10 };
        const c = new T.Color(pal[b % pal.length]);
        const cx = f.x + (rnd() - 0.5) * 6,
          cy = GH + 1.8 + rnd() * 3.2,
          cz = f.z + (rnd() - 0.5) * 6;
        const p = [1.2 + rnd() * 3.5, 0.35 + rnd() * 0.5, rnd() * 6.28, 13 + rnd() * 7];
        for (const sd of [-1, 1]) {
          const base = pos.length / 3;
          pos.push(0, 0, 0.18, 0, 0, -0.18, 0.55, 0, 0.36, 0.5, 0, -0.42);
          for (let v = 0; v < 4; v++) {
            side.push(sd);
            cen.push(cx, cy, cz);
            prm.push(p[0], p[1], p[2], p[3]);
            clr.push(c.r, c.g, c.b);
          }
          idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
        }
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      geo.setAttribute('aSide', new T.Float32BufferAttribute(side, 1));
      geo.setAttribute('aC', new T.Float32BufferAttribute(cen, 3));
      geo.setAttribute('aP', new T.Float32BufferAttribute(prm, 4));
      geo.setAttribute('color', new T.Float32BufferAttribute(clr, 3));
      geo.setIndex(idx);
      const mat = new T.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uNight: { value: 0 } },
        vertexShader:
          'attribute vec3 aC; attribute vec4 aP; attribute float aSide; attribute vec3 color; uniform float uTime; varying vec3 vCol;' +
          'void main(){ float t = uTime * aP.y + aP.z; vec3 c = aC + vec3(cos(t) * aP.x, sin(t * 1.7) * 0.6, sin(t) * aP.x * 0.8);' +
          ' float yaw = atan(-sin(t), cos(t) * 0.8); float flap = sin(uTime * aP.w + aP.z * 3.0); float ang = flap * 0.85 + 0.35;' +
          ' vec3 w = vec3(aSide * position.x * cos(ang), position.x * sin(ang), position.z);' +
          ' float cy = cos(yaw), sy = sin(yaw); vec3 r = vec3(w.x * cy + w.z * sy, w.y, -w.x * sy + w.z * cy);' +
          ' vCol = color * (0.88 + 0.12 * flap); gl_Position = projectionMatrix * modelViewMatrix * vec4(c + r, 1.0); }',
        fragmentShader: 'varying vec3 vCol; uniform float uNight; void main(){ gl_FragColor = linearToOutputTexel(vec4(vCol * (1.0 - 0.55 * uNight), 1.0)); }',
        side: T.DoubleSide,
      });
      const bm = new T.Mesh(geo, mat);
      bm.frustumCulled = false;
      bm.userData.noOutline = true;
      g.add(bm);
      Realm.butterflies = bm;
      Realm.anims.push((t) => {
        mat.uniforms.uTime.value = t;
        mat.uniforms.uNight.value = UA.Time ? UA.Time.night : 0;
      });
    }

    /* ---------- a splash when you ride through the pond ---------- */
    Realm.anims.push((t, dt, uni) => {
      for (const p of Realm.ponds) {
        const d = Math.hypot(uni.pos.x - p.x, uni.pos.z - p.z);
        if (d < p.r && uni.grounded && uni.speed > 2 && Math.random() < dt * 12) {
          UA.FX.splash(new T.Vector3(uni.pos.x, GH + 0.35, uni.pos.z), 2);
        }
      }
    });
  };
})();
