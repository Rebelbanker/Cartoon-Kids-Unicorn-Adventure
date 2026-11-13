/* Look: how the player's unicorn is dressed up. A catalogue of simple choices (no colour wheels: every colour is a
   hand-picked swatch, so every mix looks good), the player's picks (saved in UA.state.look), the things they have found
   so far (UA.state.found), and the code that puts the picks onto the unicorn.

   Every choice is purely cosmetic: it never changes how the unicorn moves, jumps or collides.

   Categories (key): coat, hair (mane and tail colours), style (hair length and fluff), hornSize, horn (what the horn looks
   like), sparkle (the shape of the unicorn's sparkles), sparkleColor, mark (the cutie mark), saddle, size.
   Items marked free are there from the start; the others are found in the world (finds.js hides a gift box for each). */
(function () {
  const UA = window.UA,
    C = UA.C,
    T = THREE;
  const Look = (UA.Look = {});

  /* ---------- the catalogue ---------- */
  // coats: the first seven are the original choices (C.COATS), then the ones to find
  const COATS = C.COATS.map((c) => ({ id: c.id, name: c.name, color: c.color, free: true })).concat([
    { id: 'berry', name: 'Berry', color: 0xe9a2ee },
    { id: 'aqua', name: 'Aqua', color: 0xa0e9f0 },
    { id: 'coral', name: 'Coral', color: 0xffa9a0 },
    { id: 'silver', name: 'Silver', color: 0xdbe5f4 },
    { id: 'midnight', name: 'Midnight', color: 0x8d86e8 },
  ]);
  // mane and tail colours: the colours are handed out to the locks in turn; `tip` is a colour the ends fade towards
  const HAIR = [
    { id: 'rainbow', name: 'Rainbow', free: true, cols: C.RAINBOW },
    { id: 'candy', name: 'Cotton Candy', free: true, cols: [0xff9ccb, 0x9fd4ff] },
    { id: 'sunshine', name: 'Sunshine', free: true, cols: [0xffd95a, 0xffb347, 0xffe9a0] },
    { id: 'mermaid', name: 'Mermaid', cols: [0x7be8d0, 0x7ec8ff, 0xc3a4ff], tip: 0xfff0ff },
    { id: 'sunset', name: 'Sunset', cols: [0xff9a6b, 0xff7fa8, 0xc58bff], tip: 0xffe9a0 },
    { id: 'galaxy', name: 'Galaxy', cols: [0x7b6cf0, 0xc06bf0, 0x5aa0ff, 0xff8fe0], tip: 0xffffff },
    { id: 'snow', name: 'Snowflake', cols: [0xf4f7ff, 0xcfe4ff, 0xe9e0ff], tip: 0xffffff },
    { id: 'bubblegum', name: 'Bubblegum', cols: [0xff7fc4, 0xffa6d9, 0xff5fb0], tip: 0xffe0f2 },
  ];
  // hair styles: length and fluffiness of every lock
  const STYLES = [
    { id: 'classic', name: 'Classic', free: true, len: 1, thick: 1 },
    { id: 'bouncy', name: 'Short and bouncy', free: true, len: 0.68, thick: 1.35 },
    { id: 'flowy', name: 'Long and flowy', len: 1.4, thick: 0.9 },
    { id: 'fluffy', name: 'Fluffy', len: 1.05, thick: 1.75 },
    { id: 'pixie', name: 'Pixie', len: 0.5, thick: 1.15 },
  ];
  const HORN_SIZES = [
    { id: 'small', name: 'Little horn', free: true, k: 0.72 },
    { id: 'regular', name: 'Horn', free: true, k: 1 },
    { id: 'tall', name: 'Tall horn', free: true, k: 1.38 },
  ];
  // horn looks: `base` and `stripe` give the colour at a height k (0 base .. 1 tip)
  const lerpC = (a, b, t) => new T.Color(a).lerp(new T.Color(b), t);
  const HORNS = [
    { id: 'pearl', name: 'Pearl and Gold', free: true, glow: 0xffa000, star: 0xfff4c2, base: (k) => lerpC(0xfff6e6, 0xffd36b, Math.min(1, k * 1.2)), stripe: (k) => lerpC(0xffbad8, 0xffc98a, k), mix: 0.9 },
    { id: 'candy', name: 'Candy Cane', free: true, glow: 0xff5f98, star: 0xffc2dc, base: () => new T.Color(0xfffafc), stripe: () => new T.Color(0xff6f9f), mix: 1 },
    { id: 'rainbow', name: 'Rainbow', glow: 0xff9ad0, star: 0xffe2f4, base: (k) => lerpC(C.RAINBOW[Math.min(5, Math.floor(k * 6))], C.RAINBOW[Math.min(5, Math.floor(k * 6) + 1)], (k * 6) % 1), stripe: () => new T.Color(0xffffff), mix: 0.45 },
    { id: 'crystal', name: 'Crystal', glow: 0x7fb8ff, star: 0xcfe6ff, base: (k) => lerpC(0xcff3ff, 0xd9c6ff, k), stripe: () => new T.Color(0xffffff), mix: 0.55 },
    { id: 'rose', name: 'Rose Gold', glow: 0xff9a80, star: 0xffd2c4, base: (k) => lerpC(0xffd9c9, 0xffb09a, k), stripe: () => new T.Color(0xffefe6), mix: 0.8 },
    { id: 'ice', name: 'Icicle', glow: 0x6fd0ff, star: 0xcff2ff, base: (k) => lerpC(0xf2fcff, 0xa2defc, k), stripe: () => new T.Color(0xffffff), mix: 0.6 },
  ];
  // sparkle shapes: `shape` is the particle shape in effects.js (1 star, 2 heart, 4 diamond, 5 flower, 6 bubble)
  const SPARKLES = [
    { id: 'stars', name: 'Stars', free: true, shape: 1 },
    { id: 'hearts', name: 'Hearts', free: true, shape: 2 },
    { id: 'diamonds', name: 'Diamonds', shape: 4 },
    { id: 'flowers', name: 'Flowers', shape: 5 },
    { id: 'bubbles', name: 'Bubbles', shape: 6 },
  ];
  const SPARKLE_COLS = [0xffffff, 0xffe45c, 0xffb0e0, 0xff7fc4, 0xb89bff, 0x8fdcff, 0xffd23f];
  const SPARKLE_COLORS = [
    { id: 'rainbow', name: 'Rainbow', free: true, cols: SPARKLE_COLS, trail: C.RAINBOW, show: [0xff8fb8, 0xffe58a, 0x8fd2ff, 0xbf9bff] },
    { id: 'pink', name: 'Pink', free: true, cols: [0xffb0e0, 0xff7fc4, 0xffd6ee, 0xffffff], trail: [0xff8fb8, 0xffb0d8, 0xff7fc4, 0xffc6e4], show: [0xff7fc4, 0xffb0e0] },
    { id: 'gold', name: 'Gold', free: true, cols: [0xffe45c, 0xffd23f, 0xfff2a8, 0xffffff], trail: [0xffe58a, 0xffd36b, 0xfff0a0, 0xffc94a], show: [0xffd23f, 0xfff2a8] },
    { id: 'match', name: 'Like my hair', free: true, cols: null, trail: null, show: null },
    { id: 'blue', name: 'Blue', cols: [0x8fdcff, 0x6fb8ff, 0xd2f1ff, 0xffffff], trail: [0x8fd2ff, 0xa6e3ff, 0x7fc0ff, 0xd2f1ff], show: [0x6fb8ff, 0x8fdcff] },
    { id: 'purple', name: 'Purple', cols: [0xb89bff, 0xd7c2ff, 0xff9ae6, 0xffffff], trail: [0xbf9bff, 0xd7c2ff, 0xc08bff, 0xff9ae6], show: [0xb89bff, 0xd7c2ff] },
  ];

  /* ---------- cutie marks: little pictures drawn from simple shapes (-1..1), used for the 3D mark and the screen icons ---------- */
  const TAU = Math.PI * 2;
  const circ = (cx, cy, r, n) => {
    n = n || 22;
    const a = [];
    for (let i = 0; i < n; i++) a.push([cx + Math.cos((i / n) * TAU) * r, cy + Math.sin((i / n) * TAU) * r]);
    return a;
  };
  const ell = (cx, cy, rx, ry, rot) => {
    const a = [],
      c = Math.cos(rot || 0),
      s = Math.sin(rot || 0);
    for (let i = 0; i < 22; i++) {
      const x = Math.cos((i / 22) * TAU) * rx,
        y = Math.sin((i / 22) * TAU) * ry;
      a.push([cx + x * c - y * s, cy + x * s + y * c]);
    }
    return a;
  };
  const starPts = (cx, cy, ro, ri, n, rot) => {
    const a = [];
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? ri : ro,
        t = (i / (n * 2)) * TAU + (rot === undefined ? Math.PI / 2 : rot);
      a.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
    }
    return a;
  };
  const rectPts = (cx, cy, w, h, rot) => {
    const c = Math.cos(rot || 0),
      s = Math.sin(rot || 0);
    return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map((p) => [cx + p[0] * c - p[1] * s, cy + p[0] * s + p[1] * c]);
  };
  const band = (r0, r1, a0, a1) => {
    const a = [];
    const n = 14;
    for (let i = 0; i <= n; i++) a.push([Math.cos(a0 + ((a1 - a0) * i) / n) * r1, Math.sin(a0 + ((a1 - a0) * i) / n) * r1]);
    for (let i = n; i >= 0; i--) a.push([Math.cos(a0 + ((a1 - a0) * i) / n) * r0, Math.sin(a0 + ((a1 - a0) * i) / n) * r0]);
    return a;
  };
  const heartPts = () => {
    const a = [];
    for (let i = 0; i < 36; i++) {
      const t = (i / 36) * TAU;
      a.push([(16 * Math.pow(Math.sin(t), 3)) / 17, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 + 0.05]);
    }
    return a;
  };
  const moonPts = () => {
    // the part of the big circle that is outside a second, shifted circle
    const c2 = [0.5, 0.12],
      r2 = 0.82;
    const N = 56,
      outer = [],
      inner = [];
    for (let i = 0; i < N; i++) {
      const t = (i / N) * TAU;
      const p = [Math.cos(t), Math.sin(t)];
      if (Math.hypot(p[0] - c2[0], p[1] - c2[1]) >= r2) outer.push({ t, p });
      const q = [c2[0] + Math.cos(t) * r2, c2[1] + Math.sin(t) * r2];
      if (Math.hypot(q[0], q[1]) <= 1) inner.push({ t, q });
    }
    // rotate each list so it starts at the end of its gap
    const order = (arr) => {
      let s = 0;
      for (let i = 0; i < arr.length; i++) {
        const prev = arr[(i + arr.length - 1) % arr.length].t,
          cur = arr[i].t;
        if ((cur - prev + TAU) % TAU > 0.3) s = i;
      }
      return arr.slice(s).concat(arr.slice(0, s));
    };
    const o = order(outer).map((x) => x.p);
    const inn = order(inner).map((x) => x.q).reverse();
    return o.concat(inn);
  };
  const flowerParts = (col, mid) => {
    const parts = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + Math.PI / 2;
      parts.push({ col, pts: circ(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.4, 16) });
    }
    parts.push({ col: mid, pts: circ(0, 0, 0.32, 18) });
    return parts;
  };
  const MARK_DEFS = {
    star: [{ col: 0xffd84a, pts: starPts(0, 0.04, 1, 0.45, 5) }, { col: 0xfff3a6, pts: starPts(0, 0.04, 0.5, 0.22, 5) }],
    heart: [{ col: 0xff6fa6, pts: heartPts() }, { col: 0xffb3cf, pts: circ(-0.38, 0.38, 0.14, 10) }],
    moon: [{ col: 0xb7a2ff, pts: moonPts() }, { col: 0xffe27a, pts: starPts(0.5, 0.2, 0.26, 0.11, 5) }],
    flower: flowerParts(0xff8fc0, 0xffe27a),
    rainbow: [
      { col: 0xff7f9f, pts: band(0.78, 1, 0, Math.PI) },
      { col: 0xffd166, pts: band(0.56, 0.78, 0, Math.PI) },
      { col: 0x7fdcff, pts: band(0.34, 0.56, 0, Math.PI) },
      { col: 0xffffff, pts: ell(-0.78, -0.22, 0.24, 0.16, 0) },
      { col: 0xffffff, pts: ell(0.78, -0.22, 0.24, 0.16, 0) },
    ],
    bolt: [{ col: 0xffd84a, pts: [[0.12, 1], [-0.55, 0.0], [-0.08, 0.0], [-0.3, -1], [0.58, 0.14], [0.1, 0.14]] }, { col: 0xfff3a6, pts: [[0.12, 0.7], [-0.25, 0.1], [0.05, 0.1]] }],
    sun: (() => {
      const p = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        p.push({ col: 0xffb347, pts: [[Math.cos(a - 0.2) * 0.62, Math.sin(a - 0.2) * 0.62], [Math.cos(a) * 1, Math.sin(a) * 1], [Math.cos(a + 0.2) * 0.62, Math.sin(a + 0.2) * 0.62]] });
      }
      p.push({ col: 0xffd84a, pts: circ(0, 0, 0.62, 24) });
      p.push({ col: 0xfff3a6, pts: circ(-0.14, 0.16, 0.26, 14) });
      return p;
    })(),
    cupcake: [
      { col: 0xffd6a6, pts: [[-0.62, -0.05], [0.62, -0.05], [0.44, -0.95], [-0.44, -0.95]] },
      { col: 0xffb0d2, pts: circ(-0.34, 0.1, 0.36, 14) },
      { col: 0xffb0d2, pts: circ(0.34, 0.1, 0.36, 14) },
      { col: 0xffc6e0, pts: circ(0, 0.38, 0.42, 16) },
      { col: 0xff5f7f, pts: circ(0, 0.86, 0.2, 12) },
    ],
    butterfly: [
      { col: 0xb98cff, pts: ell(-0.5, 0.42, 0.52, 0.4, 0.5) },
      { col: 0xb98cff, pts: ell(0.5, 0.42, 0.52, 0.4, -0.5) },
      { col: 0xff8fc0, pts: ell(-0.4, -0.42, 0.36, 0.3, -0.4) },
      { col: 0xff8fc0, pts: ell(0.4, -0.42, 0.36, 0.3, 0.4) },
      { col: 0xffe27a, pts: circ(-0.56, 0.46, 0.14, 10) },
      { col: 0xffe27a, pts: circ(0.56, 0.46, 0.14, 10) },
      { col: 0x5b4a8a, pts: ell(0, 0, 0.1, 0.62, 0) },
    ],
    crown: [
      { col: 0xffd84a, pts: [[-0.95, -0.6], [-0.95, 0.5], [-0.5, 0.0], [0, 0.85], [0.5, 0.0], [0.95, 0.5], [0.95, -0.6]] },
      { col: 0xff6fa6, pts: circ(0, -0.18, 0.2, 12) },
      { col: 0x7fdcff, pts: circ(-0.58, -0.3, 0.13, 10) },
      { col: 0x7fdcff, pts: circ(0.58, -0.3, 0.13, 10) },
      { col: 0xfff3a6, pts: circ(0, 0.88, 0.14, 10) },
    ],
    snowflake: (() => {
      const p = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + Math.PI / 2;
        p.push({ col: 0x86cff8, pts: rectPts(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.18, 1, a - Math.PI / 2) });
        p.push({ col: 0xa9defc, pts: rectPts(Math.cos(a) * 0.62 + Math.cos(a + 1.1) * 0.16, Math.sin(a) * 0.62 + Math.sin(a + 1.1) * 0.16, 0.14, 0.42, a + 0.5) });
        p.push({ col: 0xa9defc, pts: rectPts(Math.cos(a) * 0.62 + Math.cos(a - 1.1) * 0.16, Math.sin(a) * 0.62 + Math.sin(a - 1.1) * 0.16, 0.14, 0.42, a - 0.5) });
      }
      p.push({ col: 0x3f9fe6, pts: circ(0, 0, 0.26, 12) });
      return p;
    })(),
  };
  const MARKS = [
    { id: 'star', name: 'Star', free: true },
    { id: 'heart', name: 'Heart', free: true },
    { id: 'moon', name: 'Moon' },
    { id: 'flower', name: 'Flower' },
    { id: 'rainbow', name: 'Rainbow' },
    { id: 'bolt', name: 'Lightning' },
    { id: 'sun', name: 'Sun' },
    { id: 'cupcake', name: 'Cupcake' },
    { id: 'butterfly', name: 'Butterfly' },
    { id: 'crown', name: 'Crown' },
    { id: 'snowflake', name: 'Snowflake' },
  ];
  // saddle pad colours: the pad under, the cushion on top, the jewel on the middle (none = ride bareback)
  const SADDLES = [
    { id: 'lilac', name: 'Lilac', free: true, cols: [0xc9b2ff, 0xff9ad0, 0xffe27a] },
    { id: 'candy', name: 'Candy', free: true, cols: [0xffffff, 0xff8fb8, 0xff5f7f] },
    { id: 'none', name: 'No saddle', free: true, cols: null },
    { id: 'sunny', name: 'Sunny', cols: [0xffe9a0, 0xffb347, 0xff7fa8] },
    { id: 'starry', name: 'Starry night', cols: [0x5b4fc9, 0x8d7cf0, 0xffe27a] },
    { id: 'rainbowsaddle', name: 'Rainbow', cols: [0x7fdcff, 0xff9ac4, 0xffe27a] },
  ];
  const SIZES = [
    { id: 'tiny', name: 'Tiny', free: true, k: 0.8 },
    { id: 'regular', name: 'Just right', free: true, k: 1 },
    { id: 'big', name: 'Big', free: true, k: 1.25 },
  ];

  Look.items = { coat: COATS, hair: HAIR, style: STYLES, hornSize: HORN_SIZES, horn: HORNS, sparkle: SPARKLES, sparkleColor: SPARKLE_COLORS, mark: MARKS, saddle: SADDLES, size: SIZES };
  Look.MARK_DEFS = MARK_DEFS;
  // the screen's tabs, each with one or two rows of choices
  Look.TABS = [
    { id: 'coat', name: 'Coat', rows: ['coat'] },
    { id: 'hair', name: 'Mane and tail', rows: ['hair', 'style'] },
    { id: 'horn', name: 'Horn', rows: ['hornSize', 'horn'] },
    { id: 'sparkle', name: 'Sparkles', rows: ['sparkle', 'sparkleColor'] },
    { id: 'mark', name: 'Cutie mark', rows: ['mark'] },
    { id: 'saddle', name: 'Saddle', rows: ['saddle'] },
    { id: 'size', name: 'Size', rows: ['size'] },
  ];
  Look.DEFAULT = { coat: 'cloud', hair: 'rainbow', style: 'classic', hornSize: 'regular', horn: 'pearl', sparkle: 'stars', sparkleColor: 'rainbow', mark: 'star', saddle: 'lilac', size: 'regular' };
  const KEYS = Object.keys(Look.DEFAULT);

  const item = (key, id) => Look.items[key].find((x) => x.id === id) || Look.items[key][0];
  Look.item = item;

  /* ---------- the player's picks and finds (saved in UA.state) ---------- */
  function ensure() {
    const S = UA.state;
    if (!S.look) {
      S.look = Object.assign({}, Look.DEFAULT);
      // saves from before the dress-up screen picked a coat by number
      if (S.coat && C.COATS[S.coat]) S.look.coat = C.COATS[S.coat].id;
    }
    if (!Array.isArray(S.found)) S.found = [];
    if (!Array.isArray(S.fresh)) S.fresh = []; // found but not yet seen on the dress-up screen
    for (const k of KEYS) if (!Look.items[k].some((x) => x.id === S.look[k])) S.look[k] = Look.DEFAULT[k];
    return S.look;
  }
  Look.cur = ensure;
  Look.has = (key, id) => {
    const it = item(key, id);
    return !!(it.free || (UA.state.found || []).indexOf(key + ':' + id) >= 0);
  };
  // a pick the player no longer owns (an old save) goes back to the first free one
  Look.sanitize = () => {
    const l = ensure();
    for (const k of KEYS) if (!Look.has(k, l[k])) l[k] = Look.DEFAULT[k];
  };
  Look.find = (key, id) => {
    const S = UA.state;
    ensure();
    const tag = key + ':' + id;
    if (S.found.indexOf(tag) < 0) {
      S.found.push(tag);
      S.fresh.push(tag);
      return true;
    }
    return false;
  };
  Look.isFresh = (key, id) => (UA.state.fresh || []).indexOf(key + ':' + id) >= 0;
  Look.markSeen = (key, id) => {
    const S = UA.state;
    const i = (S.fresh || []).indexOf(key + ':' + id);
    if (i >= 0) S.fresh.splice(i, 1);
  };
  Look.freshCount = () => (UA.state.fresh || []).length;
  Look.totals = () => {
    let have = 0,
      all = 0;
    for (const k of KEYS)
      for (const it of Look.items[k]) {
        if (it.free) continue;
        all++;
        if (Look.has(k, it.id)) have++;
      }
    return { have, all };
  };

  /* ---------- putting it on the unicorn ---------- */
  const _c = new T.Color();
  function hairColorFn(pal) {
    const cols = pal.cols,
      m = cols.length;
    return (L) => {
      const g = L.tag || ['mane', 0, 1];
      let i;
      if (g[0] === 'mane') i = g[1] + (g[2] > 0 ? 0 : 1);
      else if (g[0] === 'fore') i = g[1] * 3;
      else i = Math.round((g[1] * (m - 1)) / Math.max(1, g[2] - 1));
      return _c.set(cols[((i % m) + m) % m]);
    };
  }
  function paintHorn(P, it) {
    const g = P.hornGeo;
    if (!g) return;
    const p = g.attributes.position,
      col = g.attributes.color.array;
    const a = new T.Color(),
      b = new T.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      const k = y / 1.05;
      a.copy(it.base(k));
      b.copy(it.stripe(k));
      const u = Math.atan2(z, x) / TAU + y * 2.2;
      const stripe = u - Math.floor(u) < 0.45 ? 1 : 0;
      a.lerp(b, stripe * it.mix);
      col[i * 3] = a.r;
      col[i * 3 + 1] = a.g;
      col[i * 3 + 2] = a.b;
    }
    g.attributes.color.needsUpdate = true;
    P.hornMat.emissive.set(it.glow);
    if (P.hornStar) P.hornStar.material.color.set(it.star);
  }
  // the cutie mark: one merged, vertex-coloured picture on each flank
  const markCache = {};
  function markGeometry(id) {
    if (markCache[id]) return markCache[id];
    const defs = MARK_DEFS[id] || MARK_DEFS.star;
    const list = defs.map((d, i) => {
      const sh = new T.Shape();
      d.pts.forEach((q, j) => (j ? sh.lineTo(q[0], q[1]) : sh.moveTo(q[0], q[1])));
      sh.closePath();
      const geo = new T.ShapeGeometry(sh);
      return { geo, color: d.col, matrix: new T.Matrix4().makeTranslation(0, 0, i * 0.003).multiply(new T.Matrix4().makeScale(0.27, 0.27, 1)) };
    });
    const g = UA.mergeGeos(list);
    list.forEach((l) => l.geo.dispose());
    markCache[id] = g;
    return g;
  }
  Look.markGeometry = markGeometry;

  Look.applyOne = function (uni, key) {
    if (!uni || !uni.P) return;
    const P = uni.P,
      l = ensure(),
      it = item(key, l[key]);
    switch (key) {
      case 'coat':
        uni.setCoat(it.color);
        break;
      case 'hair': {
        const pal = it;
        P.hair.recolor(hairColorFn(pal), pal.tip);
        Look.refreshSparkles();
        break;
      }
      case 'style':
        P.hair.restyle(it.len, it.thick);
        break;
      case 'hornSize':
        uni.hornK = it.k;
        break;
      case 'horn':
        paintHorn(P, it);
        Look.hornStyle = it;
        break;
      case 'sparkle':
      case 'sparkleColor':
        Look.refreshSparkles();
        break;
      case 'mark':
        if (P.cutie) P.cutie.forEach((m) => (m.geometry = markGeometry(it.id)));
        break;
      case 'saddle': {
        const parts = P.saddleParts || [];
        if (!it.cols) P.saddle.children.forEach((c) => (c.visible = !parts.includes(c)));
        else {
          parts.forEach((m, i) => {
            m.visible = true;
            m.material = UA.mat(it.cols[i], i === 2 ? it.cols[2] : undefined);
          });
          P.saddle.children.forEach((c) => (c.visible = true));
        }
        break;
      }
      case 'size':
        uni.scaleK = it.k;
        break;
    }
  };
  Look.apply = function (uni) {
    Look.sanitize();
    for (const k of KEYS) Look.applyOne(uni, k);
  };
  Look.set = function (uni, key, id) {
    const l = ensure();
    if (!Look.has(key, id)) return false;
    l[key] = id;
    Look.applyOne(uni, key);
    return true;
  };
  // surprise me: one random owned choice for everything
  Look.randomize = function (uni) {
    const l = ensure();
    for (const k of KEYS) {
      const own = Look.items[k].filter((x) => Look.has(k, x.id) && !(k === 'saddle' && x.id === 'none'));
      l[k] = own[(Math.random() * own.length) | 0].id;
    }
    Look.apply(uni);
  };

  /* ---------- the sparkle style: what the unicorn's own sparkles look like ---------- */
  Look.sp = { shape: 1, cols: SPARKLE_COLS, trail: C.RAINBOW, show: [0xffffff] };
  let trailI = 0;
  Look.refreshSparkles = function () {
    const l = ensure();
    const sh = item('sparkle', l.sparkle),
      co = item('sparkleColor', l.sparkleColor);
    Look.sp.shape = sh.shape;
    if (co.id === 'match') {
      const hp = item('hair', l.hair);
      const lights = hp.cols.map((c) => lerpC(c, 0xffffff, 0.25).getHex());
      Look.sp.cols = lights.concat([0xffffff]);
      Look.sp.trail = hp.cols;
      Look.sp.show = hp.cols.slice(0, 4);
    } else {
      Look.sp.cols = co.cols;
      Look.sp.trail = co.trail;
      Look.sp.show = co.show;
    }
    // the glitter-poop swirl takes the same colours
    if (UA.GlitterPoop) UA.GlitterPoop.colors = co.id === 'rainbow' ? null : Look.sp.trail;
  };
  Look.shape = () => Look.sp.shape;
  Look.col = () => Look.sp.cols[(Math.random() * Look.sp.cols.length) | 0];
  Look.hornCol = () => (Look.hornStyle ? Look.hornStyle.star : 0xfff2a8);
  const R = () => Math.random() - 0.5;
  Look.sparkles = function (p, n, spread, up, color) {
    for (let i = 0; i < n; i++) {
      UA.FX.emit({
        x: p.x + R() * (spread || 1),
        y: p.y + R() * (spread || 1),
        z: p.z + R() * (spread || 1),
        vx: R() * 2.2,
        vy: (up === undefined ? 1.2 : up) + Math.random() * 1.3,
        vz: R() * 2.2,
        color: color === undefined ? Look.col() : color,
        size: 0.35 + Math.random() * 0.4,
        shape: Look.sp.shape,
        life: 0.9 + Math.random() * 0.8,
        grow: -0.6,
        gravity: -0.4,
        drag: 1.2,
      });
    }
  };
  Look.burst = function (p, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU,
        e = (Math.random() - 0.3) * 1.6,
        s = 4 + Math.random() * 7;
      UA.FX.emit({
        x: p.x,
        y: p.y,
        z: p.z,
        vx: Math.cos(a) * Math.cos(e) * s,
        vy: Math.sin(e) * s + 2,
        vz: Math.sin(a) * Math.cos(e) * s,
        color: Look.col(),
        size: 0.5 + Math.random() * 0.5,
        shape: Look.sp.shape,
        life: 1.1 + Math.random() * 0.9,
        grow: -0.5,
        gravity: 5,
        drag: 1.1,
      });
    }
  };
  // a ring thrown out along the ground (landings and take-offs)
  Look.ring = function (p, n, speed) {
    const a0 = Math.random() * TAU;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * TAU + R() * 0.25,
        s = (speed || 5) * (0.75 + Math.random() * 0.5);
      UA.FX.emit({
        x: p.x + Math.cos(a) * 0.4,
        y: p.y + 0.25,
        z: p.z + Math.sin(a) * 0.4,
        vx: Math.cos(a) * s,
        vy: 1.4 + Math.random() * 2.2,
        vz: Math.sin(a) * s,
        color: Look.sp.cols === SPARKLE_COLS ? C.RAINBOW[i % 6] : Look.sp.trail[i % Look.sp.trail.length],
        size: 0.5 + Math.random() * 0.35,
        shape: Look.sp.shape,
        life: 0.7 + Math.random() * 0.5,
        grow: -0.7,
        gravity: 4,
        drag: 2.2,
      });
    }
  };
  // the soft coloured puffs of the gallop trail
  Look.trail = function (p) {
    const tr = Look.sp.trail;
    const c = tr[trailI++ % tr.length];
    UA.FX.emit({ x: p.x, y: p.y, z: p.z, vx: R() * 0.3, vy: 0.1, vz: R() * 0.3, color: c, size: 0.55, shape: 0, life: 0.9, grow: -0.85, gravity: 0, drag: 1, glow: 0.3 });
  };
})();
