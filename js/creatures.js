/* Creatures: four cute species with wander / flee / curious / follow / play / dance behaviours and pet / feed / play interactions */
(function () {
  const UA = window.UA,
    C = UA.C;
  const V3 = THREE.Vector3;

  const NAMES = {
    bunny: ['Pip', 'Biscuit', 'Clover', 'Nibbles', 'Mochi', 'Puddle', 'Dumpling', 'Truffle', 'Pudding'],
    dragon: ['Zippy', 'Gumbo', 'Sprout', 'Bloop', 'Pebble', 'Wobbles', 'Sunny', 'Jellybean'],
    fox: ['Twinkle', 'Comet', 'Pixel', 'Fizz', 'Maple', 'Sparks', 'Nova', 'Bean'],
    sheep: ['Marshmallow', 'Fluff', 'Cotton', 'Nimbus', 'Lamby', 'Cloudy', 'Snuggles', 'Dot', 'Wooly'],
    // Frostglow Peak
    snowbunny: ['Powder', 'Snowdrop', 'Mittens', 'Flake', 'Sprinkle', 'Twirl'],
    frostfox: ['Shimmer', 'Glimmer', 'Rime', 'Sleet', 'Aurora', 'Crystal'],
    penguin: ['Waddles', 'Tux', 'Chilly', 'Slider', 'Wobble', 'Bubbles'],
    polarcub: ['Blizzard', 'Tundra', 'Snuggle', 'Nanook', 'Cocoa', 'Glacier'],
    icedragon: ['Brrr', 'Sorbet', 'Icicle', 'Chill', 'Slushie', 'Frostbite'],
  };

  const eyeMat = () => UA.mat(0x3a2b5e);
  function face(g, x, y, z, spread, size, headRef) {
    // two shiny eyes + highlights
    size *= 1.38; // big cartoon eyes
    [-1, 1].forEach((s) => {
      const e = UA.ball(size, eyeMat(), 0.85, 1.15, 0.6, x + s * spread, y, z, true);
      const sh = UA.ball(size * 0.4, UA.mat(0xffffff), 1, 1, 0.6, x + s * spread - s * size * 0.15, y + size * 0.42, z + size * 0.3, true);
      const sh2 = UA.ball(size * 0.17, UA.mat(0xffffff), 1, 1, 0.6, x + s * spread + s * size * 0.28, y - size * 0.42, z + size * 0.32, true);
      headRef.add(e, sh, sh2);
    });
  }
  function blush(headRef, x, y, z, s) {
    [-1, 1].forEach((k) => headRef.add(UA.ball(s, UA.mat(0xffa6c9), 1, 0.6, 0.3, x * k, y, z, true)));
  }

  /* ---------- species builders: return {group, parts} ---------- */
  function buildBunny(color) {
    const g = new THREE.Group(),
      body = new THREE.Group();
    g.add(body);
    const fur = UA.mat(color),
      pinkIn = UA.mat(0xffb8d4);
    body.add(UA.ball(0.52, fur, 1, 0.95, 1.1, 0, 0.55, 0));
    body.add(UA.ball(0.2, UA.mat(0xffffff), 1, 1, 1, 0, 0.6, -0.55)); // cotton tail
    const head = new THREE.Group();
    head.position.set(0, 1.0, 0.4);
    body.add(head);
    head.add(UA.ball(0.4, fur, 1.05, 0.95, 1, 0, 0, 0));
    face(g, 0, 0.05, 0.34, 0.2, 0.075, head);
    blush(head, 0.27, -0.08, 0.3, 0.07);
    head.add(UA.ball(0.06, UA.mat(0xff8fb4), 1, 0.8, 0.8, 0, -0.08, 0.4, true));
    const ears = [];
    [-1, 1].forEach((s) => {
      const e = new THREE.Group();
      e.add(UA.ball(1, fur, 0.14, 0.58, 0.1, 0, 0.5, 0));
      e.add(UA.ball(1, pinkIn, 0.08, 0.42, 0.06, 0, 0.5, 0.05));
      e.position.set(s * 0.17, 0.3, -0.02);
      e.rotation.z = -s * 0.18;
      head.add(e);
      ears.push(e);
    });
    const legs = [];
    [
      [0.25, 0.3],
      [-0.25, 0.3],
      [0.22, -0.3],
      [-0.22, -0.3],
    ].forEach((p) => {
      const l = UA.ball(0.16, fur, 1, 0.7, 1.3, p[0], 0.1, p[1], true);
      body.add(l);
      legs.push(l);
    });
    return { group: g, parts: { body, head, ears, legs, tail: null } };
  }

  function buildDragon(color, o) {
    o = o || {};
    const g = new THREE.Group(),
      body = new THREE.Group();
    g.add(body);
    const skin = UA.mat(color);
    const belly = UA.mat(o.belly || 0xfff3d6);
    const spike = UA.mat(o.spike || 0xff9ec9);
    body.add(UA.ball(0.72, skin, 0.95, 0.92, 1.05, 0, 0.85, 0));
    body.add(UA.ball(0.55, belly, 0.85, 0.85, 0.5, 0, 0.78, 0.4));
    const head = new THREE.Group();
    head.position.set(0, 1.5, 0.6);
    body.add(head);
    head.add(UA.ball(0.5, skin, 1.05, 0.95, 1, 0, 0, 0));
    head.add(UA.ball(0.26, skin, 1, 0.8, 0.9, 0, -0.12, 0.42));
    head.add(UA.ball(0.04, UA.mat(0x3a2b5e), 1, 1, 1, 0.08, -0.08, 0.64, true));
    head.add(UA.ball(0.04, UA.mat(0x3a2b5e), 1, 1, 1, -0.08, -0.08, 0.64, true));
    face(g, 0, 0.1, 0.4, 0.22, 0.1, head);
    blush(head, 0.3, -0.12, 0.38, 0.08);
    [-1, 1].forEach((s) => {
      const h = UA.cone(0.1, 0.32, UA.mat(o.horn || 0xfff3d6), s * 0.22, 0.5, 0.0);
      h.rotation.z = -s * 0.3;
      head.add(h);
    });
    // back spikes
    for (let i = 0; i < 4; i++) body.add(UA.cone(0.14 - i * 0.015, 0.34, spike, 0, 1.55 - i * 0.2, -0.05 - i * 0.28));
    // wings
    const wings = [];
    [-1, 1].forEach((s) => {
      const w = new THREE.Group();
      w.add(UA.ball(1, UA.mat(o.wing || 0xffc9e3), 0.55, 0.06, 0.4, s * 0.4, 0.25, -0.1));
      w.position.set(s * 0.5, 1.15, -0.15);
      body.add(w);
      wings.push(w);
    });
    // tail
    const tail = new THREE.Group();
    tail.position.set(0, 0.6, -0.7);
    tail.add(UA.ball(0.3, skin, 1, 1, 1.2, 0, 0.05, -0.2));
    tail.add(UA.ball(0.2, skin, 1, 1, 1.2, 0, 0.18, -0.6));
    tail.add(UA.ball(0.14, spike, 1, 1, 1, 0, 0.35, -0.95));
    body.add(tail);
    const legs = [];
    [
      [0.38, 0.4],
      [-0.38, 0.4],
      [0.38, -0.35],
      [-0.38, -0.35],
    ].forEach((p) => {
      const l = UA.ball(0.2, skin, 1, 0.9, 1.15, p[0], 0.18, p[1], true);
      body.add(l);
      legs.push(l);
    });
    return { group: g, parts: { body, head, ears: [], legs, tail, wings } };
  }

  function buildFox(color, o) {
    o = o || {};
    const g = new THREE.Group(),
      body = new THREE.Group();
    g.add(body);
    const fur = UA.mat(color),
      cream = UA.mat(o.cream || 0xfff4e6);
    body.add(UA.ball(0.5, fur, 0.85, 0.82, 1.5, 0, 0.8, 0));
    body.add(UA.ball(0.34, cream, 0.9, 0.8, 0.7, 0, 0.7, 0.4));
    const head = new THREE.Group();
    head.position.set(0, 1.15, 0.78);
    body.add(head);
    head.add(UA.ball(0.4, fur, 1.1, 0.95, 1, 0, 0, 0));
    const snout = UA.cone(0.2, 0.5, cream, 0, -0.1, 0.5);
    snout.rotation.x = Math.PI / 2;
    head.add(snout);
    head.add(UA.ball(0.06, UA.mat(0x3a2b5e), 1, 0.8, 0.8, 0, -0.1, 0.76, true));
    face(g, 0, 0.08, 0.34, 0.2, 0.075, head);
    blush(head, 0.28, -0.1, 0.3, 0.07);
    const ears = [];
    [-1, 1].forEach((s) => {
      const e = new THREE.Group();
      e.add(UA.cone(0.19, 0.5, fur, 0, 0.25, 0));
      e.add(UA.cone(0.1, 0.3, UA.mat(0xffb8d4), 0, 0.2, 0.05));
      e.position.set(s * 0.26, 0.28, -0.05);
      e.rotation.z = -s * 0.15;
      head.add(e);
      ears.push(e);
    });
    // glowing star on the forehead
    const star = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.045 : 0.11,
        a = (i / 10) * 6.283 + Math.PI / 2;
      if (i === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const sm = new THREE.Mesh(new THREE.ExtrudeGeometry(star, { depth: 0.04, bevelEnabled: false }), new THREE.MeshToonMaterial({ color: o.star || 0xffe27a, gradientMap: UA.gradient, emissive: o.starE || 0xffc400, emissiveIntensity: 0.8 }));
    sm.position.set(0, 0.27, 0.37);
    sm.rotation.x = -0.5;
    head.add(sm);
    if (o.ruff) [-1, 1].forEach((s) => head.add(UA.ball(0.2, UA.mat(o.ruff), 1, 1.1, 0.9, s * 0.36, -0.14, 0.02, true))); // fluffy cheek fur
    const tail = new THREE.Group();
    tail.position.set(0, 0.85, -0.7);
    tail.add(UA.ball(0.3, fur, 0.9, 0.9, 1.9, 0, 0.1, -0.5));
    tail.add(UA.ball(0.2, UA.mat(o.tip || 0xffffff), 1, 1, 1.1, 0, 0.12, -1.05));
    body.add(tail);
    const legs = [];
    [
      [0.22, 0.5],
      [-0.22, 0.5],
      [0.22, -0.5],
      [-0.22, -0.5],
    ].forEach((p) => {
      const l = UA.cyl(0.075, 0.55, UA.mat(o.leg || 0xffe3cf), p[0], 0.28, p[1]);
      body.add(l);
      legs.push(l);
    });
    return { group: g, parts: { body, head, ears, legs, tail } };
  }

  function buildSheep(color) {
    const g = new THREE.Group(),
      body = new THREE.Group();
    g.add(body);
    const wool = UA.mat(color);
    const faceM = UA.mat(0xb59bf0);
    // fluffy body from many puffs
    const puffs = [
      [0, 0.85, 0, 0.6],
      [0.35, 0.85, 0.2, 0.46],
      [-0.35, 0.85, 0.2, 0.46],
      [0.32, 0.8, -0.35, 0.46],
      [-0.32, 0.8, -0.35, 0.46],
      [0, 1.15, -0.05, 0.46],
      [0, 0.9, 0.5, 0.42],
      [0, 0.95, -0.5, 0.44],
    ];
    puffs.forEach((p) => body.add(UA.ball(p[3], wool, 1, 1, 1, p[0], p[1], p[2], true)));
    const head = new THREE.Group();
    head.position.set(0, 0.95, 0.85);
    body.add(head);
    head.add(UA.ball(0.34, faceM, 1, 1.05, 1.1, 0, 0, 0.05));
    head.add(UA.ball(0.3, wool, 1.1, 0.6, 1, 0, 0.32, -0.02, true)); // fringe
    face(g, 0, 0.04, 0.3, 0.15, 0.065, head);
    blush(head, 0.22, -0.1, 0.28, 0.06);
    head.add(UA.ball(0.05, UA.mat(0x3a2b5e), 1, 0.8, 0.8, 0, -0.08, 0.4, true));
    const ears = [];
    [-1, 1].forEach((s) => {
      const e = UA.ball(1, faceM, 0.24, 0.09, 0.12, s * 0.38, 0.1, 0);
      e.rotation.z = -s * 0.4;
      head.add(e);
      ears.push(e);
    });
    const legs = [];
    [
      [0.28, 0.4],
      [-0.28, 0.4],
      [0.28, -0.4],
      [-0.28, -0.4],
    ].forEach((p) => {
      const l = UA.cyl(0.08, 0.5, faceM, p[0], 0.25, p[1]);
      body.add(l);
      legs.push(l);
    });
    const tail = UA.ball(0.2, wool, 1, 1, 1, 0, 0.95, -0.88, true);
    body.add(tail);
    return { group: g, parts: { body, head, ears, legs, tail } };
  }


  /* ---------- Frostglow Peak species ---------- */
  const SCARFS = [0xff8da8, 0x7fc8ff, 0xffc16a, 0x8fe0c8, 0xb9a8ff];
  const scarfOf = (color) => SCARFS[Math.abs(color) % SCARFS.length];
  // a knitted scarf ring round the neck (a child of the head, so it nods along)
  function scarf(head, y, r, c) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.3, 6, 16), UA.mat(c));
    m.rotation.x = Math.PI / 2;
    m.position.set(0, y, -0.02);
    head.add(m);
    const tail = UA.ball(1, UA.mat(c), r * 0.28, r * 0.9, r * 0.14, r * 0.7, y - r * 0.7, r * 0.55, true);
    tail.rotation.z = -0.2;
    head.add(tail);
  }
  function buildSnowBunny(color) {
    const r = buildBunny(color);
    scarf(r.parts.head, -0.3, 0.3, scarfOf(color));
    r.parts.body.add(UA.ball(0.3, UA.mat(0xffffff), 1, 1, 1, 0, 0.62, -0.66, true)); // a big fluffy tail
    [-1, 1].forEach((s) => r.parts.head.add(UA.ball(0.16, UA.mat(0xffffff), 1, 1.1, 0.9, s * 0.32, -0.1, 0.12, true))); // cheek fluff
    return r;
  }
  function buildFrostFox(color) {
    return buildFox(color, { cream: 0xffffff, star: 0x9fe8ff, starE: 0x3fc8ff, tip: 0xbfeaff, leg: 0xdff0ff, ruff: 0xffffff });
  }
  function buildIceDragon(color) {
    const r = buildDragon(color, { belly: 0xffffff, spike: 0x9fe0ff, wing: 0xcfeeff, horn: 0xbff0ff });
    // a ring of little crystals down the back
    r.parts.body.add(UA.cone(0.1, 0.42, UA.mat(0xe8faff, 0xbff0ff), 0, 1.78, 0.2));
    return r;
  }
  function buildPenguin(color) {
    const g = new THREE.Group(),
      body = new THREE.Group();
    g.add(body);
    const coat = UA.mat(color),
      belly = UA.mat(0xffffff),
      orange = UA.mat(0xffa94d);
    body.add(UA.ball(0.55, coat, 0.95, 1.12, 0.9, 0, 0.78, 0)); // a plump body
    body.add(UA.ball(0.42, belly, 0.85, 1.0, 0.55, 0, 0.7, 0.3)); // white tummy
    body.add(UA.ball(0.14, coat, 1, 0.8, 1.4, 0, 0.3, -0.55, true)); // a stubby tail
    const head = new THREE.Group();
    head.position.set(0, 1.56, 0.1);
    body.add(head);
    head.add(UA.ball(0.42, coat, 1.05, 0.95, 1, 0, 0, 0));
    head.add(UA.ball(0.3, belly, 0.95, 0.75, 0.5, 0, -0.1, 0.3));
    face(g, 0, 0.07, 0.4, 0.17, 0.062, head);
    blush(head, 0.28, -0.12, 0.36, 0.055);
    const beak = UA.cone(0.1, 0.28, orange, 0, -0.1, 0.52);
    beak.rotation.x = Math.PI / 2;
    head.add(beak);
    scarf(head, -0.36, 0.34, scarfOf(color));
    // flippers (they flap with the waddle) and orange feet
    const wings = [];
    [-1, 1].forEach((s) => {
      const w = new THREE.Group();
      w.add(UA.ball(1, coat, 0.1, 0.42, 0.22, 0, -0.32, 0));
      w.position.set(s * 0.52, 1.15, 0);
      body.add(w);
      wings.push(w);
    });
    const legs = [];
    [-1, 1].forEach((s) => {
      const l = UA.ball(0.15, orange, 1, 0.38, 1.6, s * 0.2, 0.07, 0.2, true);
      body.add(l);
      legs.push(l);
    });
    return { group: g, parts: { body, head, ears: [], legs, tail: null, wings } };
  }
  function buildCub(color) {
    const g = new THREE.Group(),
      body = new THREE.Group();
    g.add(body);
    const fur = UA.mat(color),
      cream = UA.mat(0xfff7ee),
      dark = UA.mat(0x3a2b5e);
    body.add(UA.ball(0.62, fur, 1.0, 0.9, 1.15, 0, 0.78, 0)); // a chubby body
    body.add(UA.ball(0.2, fur, 1, 1, 1, 0, 0.82, -0.72, true));
    const head = new THREE.Group();
    head.position.set(0, 1.3, 0.62);
    body.add(head);
    head.add(UA.ball(0.48, fur, 1.05, 0.95, 1, 0, 0, 0));
    head.add(UA.ball(0.22, cream, 1.1, 0.8, 0.9, 0, -0.14, 0.38));
    head.add(UA.ball(0.07, dark, 1.2, 0.8, 0.8, 0, -0.07, 0.57, true));
    face(g, 0, 0.1, 0.41, 0.2, 0.075, head);
    blush(head, 0.3, -0.1, 0.38, 0.065);
    const ears = [];
    [-1, 1].forEach((s) => {
      const e = new THREE.Group();
      e.add(UA.ball(0.15, fur, 1, 1, 0.7, 0, 0, 0));
      e.add(UA.ball(0.09, UA.mat(0xffb8d4), 1, 1, 0.6, 0, 0, 0.05, true));
      e.position.set(s * 0.34, 0.4, -0.05);
      head.add(e);
      ears.push(e);
    });
    scarf(head, -0.4, 0.4, scarfOf(color));
    const legs = [];
    [
      [0.34, 0.36],
      [-0.34, 0.36],
      [0.34, -0.36],
      [-0.34, -0.36],
    ].forEach((p) => {
      const l = UA.ball(0.2, fur, 1, 0.85, 1.1, p[0], 0.18, p[1], true);
      body.add(l);
      legs.push(l);
    });
    return { group: g, parts: { body, head, ears, legs, tail: null } };
  }

  const SPECIES = {
    bunny: {
      label: 'Cloud Bunny',
      count: 9,
      build: buildBunny,
      colors: [0xffffff, 0xffd6e8, 0xe6d9ff, 0xd9f4ff],
      move: 'hop',
      walk: 3.4,
      run: 8.5,
      radius: 0.7,
      voice: 620,
      shy: true,
      blurb: 'Fluffy and shy. Hops away from galloping unicorns!',
      mh: 2.6, // (how high the friend heart floats, and the size of a bubble round it)
      bub: 1.9,
    },
    dragon: {
      label: 'Gumdrop Dragon',
      count: 6,
      build: buildDragon,
      colors: [0x8ee3d6, 0xffb3a7, 0xffe08a, 0xc5b3ff],
      move: 'walk',
      walk: 2.2,
      run: 5,
      radius: 1.0,
      voice: 300,
      sleepy: true,
      blurb: 'Sleepy and sweet. Blows bubbles when happy.',
      mh: 2.9,
      bub: 2.5,
    },
    fox: {
      label: 'Sparkle Fox',
      count: 6,
      build: buildFox,
      colors: [0xffb085, 0xc9b2ff, 0xa8ead0, 0xffd1e3],
      move: 'walk',
      walk: 3.8,
      run: 11,
      radius: 0.9,
      voice: 820,
      curious: true,
      blurb: 'Curious and quick. Loves to play tag!',
      mh: 2.4,
      bub: 1.9,
    },
    sheep: {
      label: 'Cotton Sheep',
      count: 9,
      build: buildSheep,
      colors: [0xffffff, 0xffe0f0, 0xe9deff, 0xdff6ea],
      move: 'walk',
      walk: 1.9,
      run: 5.5,
      radius: 1.0,
      voice: 380,
      graze: true,
      blurb: 'Soft and snuggly. Naps in the meadow.',
      mh: 2.4,
      bub: 2.1,
    },
    // ---- the animals of Frostglow Peak (area: 'ice' keeps them out of the home world; Creatures.addIce places them)
    snowbunny: {
      label: 'Snow Bunny',
      area: 'ice',
      count: 3,
      build: buildSnowBunny,
      colors: [0xffffff, 0xe8f4ff, 0xe6e0ff, 0xd9f4ff],
      move: 'hop',
      walk: 3.2,
      run: 8,
      radius: 0.7,
      voice: 700,
      shy: true,
      mh: 2.6,
      bub: 1.9,
      blurb: 'Fluffy and bundled up in a scarf. Hops through the snow!',
    },
    frostfox: {
      label: 'Frost Fox',
      area: 'ice',
      count: 2,
      build: buildFrostFox,
      colors: [0xe8f4ff, 0xc9d8ff, 0xd8f2ff, 0xf1e6ff],
      move: 'walk',
      walk: 3.6,
      run: 10.5,
      radius: 0.9,
      voice: 900,
      curious: true,
      mh: 2.4,
      bub: 1.9,
      blurb: 'Quick and curious. Leaves sparkly paw prints!',
    },
    penguin: {
      label: 'Waddle Penguin',
      area: 'ice',
      count: 3,
      build: buildPenguin,
      colors: [0x3d4c8f, 0x5a4fa0, 0x2f7f9a, 0x6f80b8],
      move: 'walk',
      walk: 2.0,
      run: 5.2,
      radius: 0.8,
      voice: 540,
      waddle: true,
      mh: 2.6,
      bub: 1.9,
      blurb: 'Waddles about on the frozen lake. Loves a cuddle!',
    },
    polarcub: {
      label: 'Polar Cub',
      area: 'ice',
      count: 2,
      build: buildCub,
      colors: [0xffffff, 0xeaf4ff, 0xfff1e6, 0xf0e8ff],
      move: 'walk',
      walk: 2.0,
      run: 5.8,
      radius: 1.0,
      voice: 340,
      sleepy: true,
      mh: 2.6,
      bub: 2.1,
      blurb: 'Chubby and cuddly. Always ready for a nap in the snow.',
    },
    icedragon: {
      label: 'Ice Dragon',
      area: 'ice',
      count: 2,
      build: buildIceDragon,
      colors: [0xa8e0ff, 0xc9c4ff, 0xe3f6ff, 0x9ff0e6],
      move: 'walk',
      walk: 2.2,
      run: 5,
      radius: 1.0,
      voice: 280,
      sleepy: true,
      mh: 2.9,
      bub: 2.5,
      blurb: 'Sleepy and sweet. Puffs sparkly snowflakes when happy.',
    },
  };

  class Creature {
    constructor(type, idx, x, z, rnd, scene) {
      const S = (this.S = SPECIES[type]);
      this.type = type;
      this.id = type + idx;
      this.name = NAMES[type][idx % NAMES[type].length];
      const color = S.colors[Math.floor(rnd() * S.colors.length)];
      const m = S.build(color);
      this.group = m.group;
      this.parts = m.parts;
      const sc = 1.0 + rnd() * 0.15;
      this.group.scale.setScalar(sc);
      this.scale = sc;
      scene.add(this.group);
      this.pos = new V3(x, UA.World.groundAt(x, z), z);
      this.home = new V3(x, 0, z);
      this.yaw = rnd() * 6.28;
      this.vel = 0;
      this.state = 'idle';
      this.timer = rnd() * 3;
      this.target = new V3(x, 0, z);
      this.bond = 0; // 0-3 hearts
      this.follow = false;
      this.hopT = rnd() * 6;
      this.happy = 0;
      this.jumpV = 0;
      this.jumpY = 0;
      this.phase = rnd() * 6;
      this.squash = 0;
      this.playT = 0;
      this.playAng = 0;
      this.playDir = 1;
      this.eatT = 0;
      this.dazzle = 0;
      this.bubbleT = 0;
      this.petCd = 0;
      this.slot = 0;
      this.far = false;
      this.sleeping = false;
      this.zT = 0;
      this.bubbleLeft = 0;
      this.floatY = 0;
      this.go = null;
      this.guide = null; // set for the trail guides of Frostglow Peak (ice_guides.js decides where they stand and when they run)
      this.fr = null; // a frolic of its own in progress: { kind: 'orbit' | 'zoom' | 'spin', t, ... }
      this.frolicCd = 2 + rnd() * 10; // seconds until it feels like frolicking (staggered so they do not all start at once)
      this.nearT = 0; // how long the unicorn has been close and slow: long enough and it comes to play, no buttons
      this.autoCd = 0;
      this.wildPlay = false; // playing with the unicorn before they are friends: all the fun, no heart
      // shadow
      const tex = UA.Creatures._shadowTex;
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2;
      sh.renderOrder = 2;
      this.shadow = sh;
      scene.add(sh);
      // friend heart marker
      const hm = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.18, 0),
        new THREE.MeshToonMaterial({ color: 0xff7fb0, gradientMap: UA.gradient, emissive: 0xff5c98, emissiveIntensity: 0.6 })
      );
      hm.scale.set(1, 0.9, 0.55);
      hm.visible = false;
      this.marker = hm;
      scene.add(hm);
      this.applyTransform();
    }
    get isFriend() {
      return this.bond > 0;
    }
    pickWander() {
      const a = Math.random() * 6.283,
        r = 3 + Math.random() * 12;
      this.target.set(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r);
    }
    say(text) {
      if (UA.UI) UA.UI.say(this, text);
    }
    hearts(n) {
      UA.FX.hearts(new V3(this.pos.x, this.pos.y + 1.7 * this.scale, this.pos.z), n || 6);
    }
    jump(v) {
      if (this.jumpY <= 0.01) this.jumpV = v || 6.5;
    }
    // pick the next place to dash to while zooming about (drifting back toward home so a long romp does not carry it away)
    frolicDash(F) {
      const a = Math.random() * 6.283,
        r = 6 + Math.random() * 7;
      const hx = this.home.x - this.pos.x,
        hz = this.home.z - this.pos.z;
      const hd = Math.hypot(hx, hz) || 1;
      const pull = hd > 18 ? 0.6 : 0.15;
      F.tx = this.pos.x + (Math.cos(a) * (1 - pull) + (hx / hd) * pull) * r;
      F.tz = this.pos.z + (Math.sin(a) * (1 - pull) + (hz / hd) * pull) * r;
    }

    update(dt, t, player) {
      const W = UA.World;
      const dxp = player.pos.x - this.pos.x,
        dzp = player.pos.z - this.pos.z;
      const dp = Math.hypot(dxp, dzp);
      // far away creatures sleep to save work
      if (dp > 150) {
        if (!this.far) {
          this.far = true;
          this.group.visible = this.shadow.visible = this.marker.visible = false;
        }
        return;
      }
      if (this.far) {
        this.far = false;
        this.group.visible = this.shadow.visible = true;
      }
      this.petCd = Math.max(0, this.petCd - dt);
      this.happy = Math.max(0, this.happy - dt);
      this.dazzle = Math.max(0, this.dazzle - dt);
      this.timer -= dt;
      this.frolicCd -= dt;
      this.autoCd -= dt;
      if (this.fr && this.state !== 'frolic') this.fr = null; // something else (eating, fleeing...) took over
      // being close to a creature while slow or still is enough: it comes over to play
      this.nearT = dp < (this.follow ? 13 : 10) && player.speed < 3.5 ? this.nearT + dt : 0;
      const S = this.S;
      let speed = 0;
      let wantYaw = this.yaw;
      const toward = (x, z) => Math.atan2(x - this.pos.x, z - this.pos.z);

      // night: wild creatures nod off, friends stay up
      const night = UA.Time ? UA.Time.night : 0;
      const wantSleep = night > 0.7 && !this.follow && !this.tag && this.dazzle <= 0 && this.state !== 'play' && this.state !== 'eat' && dp > 9 && !(this.go && this.go.t > 0) && this.bubbleLeft <= 0 && !(this.guide && this.guide.mode);
      if (wantSleep !== !!this.sleeping) {
        if (!wantSleep && night > 0.7 && dp <= 9 && this.sleeping) {
          this.say(UA.pick(['Yaaawn... hi!', 'Mmm... oh, hello!', 'Zzz... huh?']));
          if (UA.Audio.yawn) UA.Audio.yawn();
        }
        this.sleeping = wantSleep;
        this.zT = 0.5;
      }

      if (this.nearT > 1.3 && this.autoCd <= 0 && !this.sleeping && !this.guide && this.state !== 'play' && this.state !== 'eat' && this.state !== 'flee' && !this.tag && this.dazzle <= 0 && this.bubbleLeft <= 0 && !(this.go && this.go.t > 0) && Cr._playing < 2) {
        Cr.autoPlay(this, player);
      }

      // ----- state machine -----
      if (this.dazzle > 0) {
        this.state = 'dance';
      } else if (this.state === 'dance') {
        this.state = 'idle';
        this.timer = 1;
      }
      if (this.sleeping) {
        this.state = 'idle';
        this.timer = 1;
      } else if (this.go && this.go.t > 0) {
        // called over (wishing fountain party and friends)
        this.go.t -= dt;
        const gd = Math.hypot(this.go.x - this.pos.x, this.go.z - this.pos.z);
        wantYaw = toward(this.go.x, this.go.z);
        speed = gd > 2.2 ? Math.min(S.run, S.walk * 2.2) : 0;
        if (gd <= 2.2) this.go.t -= dt * 2;
      } else if (this.state === 'eat') {
        this.eatT -= dt;
        if (this.eatT <= 0) this.state = 'idle';
      } else if (this.state === 'play') {
        this.playT -= dt;
        this.playAng += this.playDir * dt * 1.5;
        const tx = player.pos.x + Math.cos(this.playAng) * 5.2,
          tz = player.pos.z + Math.sin(this.playAng) * 5.2;
        const d = Math.hypot(tx - this.pos.x, tz - this.pos.z);
        wantYaw = toward(tx, tz);
        speed = Math.min(S.run * 1.1, d * 3 + 2);
        if (Math.random() < dt * 2.2) {
          this.jump(7);
          this.hearts(2);
          UA.FX.sparkles(new V3(this.pos.x, this.pos.y + 1, this.pos.z), 4, undefined, 1.2);
        }
        if (this.playT <= 0) {
          this.state = 'idle';
          this.timer = 1.5;
          if (this.wildPlay) {
            this.hearts(4);
            Cr.chirp(this, 1);
          } else {
            this.bond = Math.min(3, this.bond + 1);
            this.say('That was fun!');
            this.hearts(8);
            UA.Audio.chirp(S.voice);
            if (UA.onBond) UA.onBond(this, 'play');
          }
        }
      } else if (this.state === 'dance') {
        wantYaw = this.yaw + 6 * dt;
        this.yaw += 5 * dt;
        if (Math.random() < dt * 3) this.jump(5.5);
      } else if (this.guide && this.guide.mode && !this.follow) {
        // a trail guide on Frostglow Peak: run to where it should be (a little way ahead of you), or stand and wave you on
        const Gd = this.guide;
        const gd = Math.hypot(Gd.tx - this.pos.x, Gd.tz - this.pos.z);
        if (Gd.mode === 'lead' && gd > 1.4) {
          wantYaw = toward(Gd.tx, Gd.tz);
          speed = Math.min(Gd.pace || S.run, 1.5 + gd * 1.5);
          this.state = 'wander';
          if (this.jumpY <= 0.01 && Math.random() < dt * 0.35) this.jump(4.6); // a happy skip on the way
        } else {
          wantYaw = toward(player.pos.x, player.pos.z);
          if (this.state !== 'idle') this.state = 'idle';
          if (Gd.beckon > 0 && this.jumpY <= 0.01 && Math.random() < dt * 2.2) this.jump(5.4); // bouncing: come on!
        }
      } else if (this.tag) {
        // playing tag: dart away from the unicorn with a little zig-zag
        this.zig = (this.zig || 0) + dt;
        if (dp < 16) {
          wantYaw = Math.atan2(-dxp, -dzp) + Math.sin(this.zig * 2.4) * 0.8;
          speed = S.run * (this.tagCd > 0 ? 1.4 : 1.15);
        } else {
          wantYaw = toward(this.home.x, this.home.z);
          speed = 0;
        }
        this.state = 'wander';
      } else if (this.follow) {
        // trail behind the unicorn
        const back = 4 + this.slot * 3.4;
        const ang = player.yaw + Math.PI + (this.slot % 2 ? 0.5 : -0.5);
        const tx = player.pos.x + Math.sin(ang) * back,
          tz = player.pos.z + Math.cos(ang) * back;
        const d = Math.hypot(tx - this.pos.x, tz - this.pos.z);
        if (d > 1.2) {
          wantYaw = toward(tx, tz);
          speed = UA.clamp(d * 1.8, 0, d > 7 ? S.run * 1.5 : S.run);
          if (speed > 2 && Math.random() < dt * 0.3) this.jump(4.6); // a happy skip now and then
        } else {
          wantYaw = this.pos.x === 0 ? this.yaw : toward(player.pos.x, player.pos.z);
        }
        if (d > 70) {
          this.pos.set(tx, W.groundAt(tx, tz), tz); // catch up if left far behind
        }
      } else if (S.shy && !this.isFriend && dp < 11 && player.speed > 11) {
        // flee from fast unicorns
        this.state = 'flee';
        this.timer = 1.6;
      } else if (this.state === 'flee') {
        wantYaw = Math.atan2(-dxp, -dzp);
        speed = S.run;
        if (this.timer <= 0) {
          this.state = 'idle';
          this.timer = 1;
        }
      } else if (this.state === 'frolic' && this.fr) {
        // frolicking on its own: nobody has to press anything for the animals to play
        const F = this.fr;
        F.t -= dt;
        if (F.kind === 'spin') {
          this.yaw += 6 * dt;
          wantYaw = this.yaw;
        } else {
          let tx, tz;
          if (F.kind === 'orbit') {
            F.a += F.dir * F.rate * dt;
            tx = F.cx + Math.cos(F.a) * F.R;
            tz = F.cz + Math.sin(F.a) * F.R;
          } else {
            if (Math.hypot(F.tx - this.pos.x, F.tz - this.pos.z) < 1.6) this.frolicDash(F);
            tx = F.tx;
            tz = F.tz;
          }
          const d = Math.hypot(tx - this.pos.x, tz - this.pos.z);
          wantYaw = toward(tx, tz);
          speed = Math.min(S.run * 1.05, d * 3 + 1.5);
        }
        if (Math.random() < dt * 1.5) this.jump(5.5);
        if (dp < 60 && Math.random() < dt * 1.4) UA.FX.sparkles(new V3(this.pos.x, this.pos.y + this.scale, this.pos.z), 2, undefined, 0.9, 0.4);
        if (dp < 60 && Math.random() < dt * 0.3) this.hearts(1);
        if (F.t <= 0) {
          this.state = 'idle';
          this.fr = null;
          this.timer = 1 + Math.random() * 2;
          this.frolicCd = (S.sleepy ? 16 : 9) + Math.random() * 14;
        }
      } else if (S.curious && !this.isFriend && dp < 24 && dp > 6 && player.speed < 8) {
        // fox comes over to say hello
        wantYaw = toward(player.pos.x, player.pos.z);
        speed = S.walk * 1.3;
        this.state = 'wander';
      } else if (dp < 7 && player.speed < 4) {
        // curious look at the unicorn when it stands nearby
        wantYaw = toward(player.pos.x, player.pos.z);
        if (this.state !== 'idle') this.state = 'idle';
        speed = 0;
        if (this.nearT > 0.6 && Math.random() < dt * 0.45) this.jump(4.8); // an excited little bounce while it waits
      } else if (this.state === 'wander') {
        const d = Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z);
        wantYaw = toward(this.target.x, this.target.z);
        speed = S.walk;
        if (d < 1 || this.timer <= 0) {
          this.state = 'idle';
          this.timer = (S.sleepy ? 6 : S.graze ? 4 : 2) + Math.random() * 4;
        }
      } else {
        // idle
        if (this.timer <= 0) {
          if (this.frolicCd > 0 || !Cr.startFrolic(this, dp)) {
            this.state = 'wander';
            this.pickWander();
            this.timer = 8;
          }
        }
      }

      // ----- movement -----
      if (speed > 0.05) {
        const dy = UA.angleDiff(this.yaw, wantYaw);
        this.yaw += UA.clamp(dy, -7 * dt, 7 * dt);
        this.vel = UA.damp(this.vel, speed, 6, dt);
      } else {
        this.vel = UA.damp(this.vel, 0, 8, dt);
        if (this.state !== 'dance') this.yaw += UA.clamp(UA.angleDiff(this.yaw, wantYaw), -4 * dt, 4 * dt);
      }
      if (this.vel > 0.05) {
        const nx = this.pos.x + Math.sin(this.yaw) * this.vel * dt,
          nz = this.pos.z + Math.cos(this.yaw) * this.vel * dt;
        const nh = W.heightAt(nx, nz);
        const blocked = nh < 0.1 || W.slopeAt(nx, nz) > 0.9 || W.outOfBounds(nx, nz, 4);
        if (blocked && this.tag) {
          this.yaw += 2.4; // bounce off rough ground and the world edge
        } else if (blocked && !this.follow && this.state !== 'play') {
          this.state = 'idle';
          this.timer = 0.5;
          this.vel = 0;
          const ac = W.areaCenter(this.pos.x, this.pos.z); // (drift back toward the middle of its own area, not toward the world origin)
          this.home.set(ac.x + (this.pos.x - ac.x) * 0.9, 0, ac.z + (this.pos.z - ac.z) * 0.9);
        } else {
          this.pos.x = nx;
          this.pos.z = nz;
        }
      }
      W.resolve(this.pos, S.radius * 0.7);
      const g = W.groundAt(this.pos.x, this.pos.z);
      // hop / jump physics
      if (S.move === 'hop' && this.vel > 0.6 && this.jumpY <= 0.01 && this.state !== 'eat') {
        this.jumpV = 4.2 + this.vel * 0.18;
      }
      if (this.jumpV !== 0 || this.jumpY > 0) {
        this.jumpV -= 22 * dt;
        this.jumpY += this.jumpV * dt;
        if (this.jumpY <= 0) {
          this.jumpY = 0;
          this.jumpV = 0;
          this.squash = 0.25;
        }
      }
      // soap bubble float (Bubble Float spell)
      if (this.bubbleLeft > 0) {
        this.bubbleLeft -= dt;
        this.floatY = UA.damp(this.floatY, 3.4 + Math.sin(t * 1.6 + this.phase) * 0.5, 2.2, dt);
        this.vel = 0;
      } else {
        this.floatY = UA.damp(this.floatY, 0, 3.5, dt);
        if (this.floatY < 0.02) this.floatY = 0;
      }
      this.pos.y = g + this.floatY;
      this.animate(dt, t, dp, player);
      this.applyTransform();
    }

    animate(dt, t, dp, player) {
      const P = this.parts,
        S = this.S;
      this.phase += dt * (3 + this.vel * 1.4);
      this.squash = Math.max(0, this.squash - dt * 2);
      const moving = this.vel > 0.4;
      let bob = 0,
        pitch = 0,
        sy = 1;
      if (S.move === 'hop') {
        pitch = UA.clamp(this.jumpV * 0.03, -0.3, 0.3) * -1;
      } else if (moving) {
        bob = Math.abs(Math.sin(this.phase)) * 0.07;
      } else {
        bob = Math.sin(t * 2 + this.phase) * 0.012;
      }
      if (this.state === 'eat') {
        sy = 1 + Math.sin(this.eatT * 18) * 0.06;
        P.head.rotation.x = 0.45 + Math.sin(this.eatT * 20) * 0.15;
      } else if (this.sleeping) {
        P.head.rotation.x = UA.damp(P.head.rotation.x, 0.85, 3, dt);
        sy = 0.94 + Math.sin(t * 1.3 + this.phase) * 0.03;
        this.zT -= dt;
        if (this.zT <= 0) {
          this.zT = 1.7;
          UA.FX.emit({ x: this.pos.x + Math.sin(this.yaw) * 0.8, y: this.pos.y + 1.6 * this.scale, z: this.pos.z + Math.cos(this.yaw) * 0.8, vx: 0.35, vy: 0.8, vz: 0, color: 0xd6dcff, size: 0.75, shape: 3, life: 2.6, grow: 0.6, gravity: -0.1, drag: 0.3 });
        }
      } else if (S.graze && !moving && this.state === 'idle' && dp > 8) {
        P.head.rotation.x = UA.damp(P.head.rotation.x, 0.65 + Math.sin(t * 2.4 + this.phase) * 0.08, 4, dt);
      } else if (S.sleepy && !moving && this.state === 'idle' && dp > 10) {
        P.head.rotation.x = UA.damp(P.head.rotation.x, 0.5, 2, dt);
        sy = 1 + Math.sin(t * 1.5 + this.phase) * 0.025;
      } else {
        P.head.rotation.x = UA.damp(P.head.rotation.x, Math.sin(t * 1.2 + this.phase) * 0.04 + (this.happy > 0 || this.state === 'frolic' || this.state === 'play' ? -0.2 : 0), 6, dt);
      }
      // squash and stretch
      const sq = this.squash;
      const jy = this.jumpY > 0.05 ? 1 + UA.clamp(this.jumpV * 0.012, 0, 0.12) : 1;
      P.body.scale.set(1 + sq * 0.5, sy * jy * (1 - sq * 0.9), 1 + sq * 0.5);
      P.body.position.y = bob + this.jumpY;
      P.body.rotation.x = pitch;
      const jig = this.state === 'dance' || (this.state === 'frolic' && this.fr && this.fr.kind === 'spin');
      P.body.rotation.z = jig ? Math.sin(t * 9) * 0.25 : this.state === 'frolic' ? Math.sin(t * 10 + this.phase) * 0.1 : 0;
      if (S.waddle && moving) P.body.rotation.z += Math.sin(this.phase * 1.5) * 0.2; // a penguin's side-to-side waddle
      // ears
      P.ears.forEach((e, i) => {
        e.rotation.x = Math.sin(t * 3 + i * 1.7 + this.phase) * 0.06 - (moving ? 0.25 : 0) + (jig ? Math.sin(t * 14) * 0.3 : 0);
      });
      // tail wag
      if (P.tail) {
        P.tail.rotation.y = Math.sin(t * (this.happy > 0 || this.state === 'play' || this.state === 'frolic' ? 14 : 3) + this.phase) * (this.happy > 0 || this.state === 'frolic' ? 0.6 : 0.2);
      }
      // legs: simple swing
      if (P.legs && S.move !== 'hop') {
        P.legs.forEach((l, i) => {
          l.rotation.x = moving ? Math.sin(this.phase * 1.5 + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.55 : 0;
        });
      }
      // dragon wings flutter
      if (P.wings) {
        P.wings.forEach((w, i) => {
          if (S.waddle) w.rotation.z = (i ? 1 : -1) * (0.3 + (moving ? 0.28 + Math.sin(this.phase * 1.5 + i * Math.PI) * 0.22 : Math.sin(t * 3 + i) * 0.05)); // flippers swing with the waddle
          else w.rotation.z = (i ? 1 : -1) * (0.45 + Math.sin(t * (moving ? 18 : 4) + i * 0.3) * (moving ? 0.5 : 0.1));
        });
      }
      // frost fox: sparkly paw prints
      if (this.type === 'frostfox' && moving && Math.random() < dt * 7) {
        UA.FX.emit({ x: this.pos.x - Math.sin(this.yaw) * 0.4 + (Math.random() - 0.5) * 0.5, y: this.pos.y + 0.15, z: this.pos.z - Math.cos(this.yaw) * 0.4 + (Math.random() - 0.5) * 0.5, vx: 0, vy: 0.3, vz: 0, color: Math.random() < 0.5 ? 0xffffff : 0x9fe8ff, size: 0.34, shape: 1, life: 1.1, grow: -0.4, twinkle: 8 });
      }
      // dragon bubbles when happy
      if (this.type === 'icedragon' && this.happy > 0) {
        // an ice dragon puffs sparkly snowflakes instead
        this.bubbleT -= dt;
        if (this.bubbleT <= 0) {
          this.bubbleT = 0.09;
          UA.FX.emit({
            x: this.pos.x + Math.sin(this.yaw) * 0.9,
            y: this.pos.y + 1.45,
            z: this.pos.z + Math.cos(this.yaw) * 0.9,
            vx: Math.sin(this.yaw) * 1.7 + (Math.random() - 0.5),
            vy: 0.8 + Math.random(),
            vz: Math.cos(this.yaw) * 1.7 + (Math.random() - 0.5),
            color: UA.pick([0xffffff, 0xcfeeff, 0xb8c4ff, 0xe3d4ff]),
            size: 0.4 + Math.random() * 0.3,
            shape: 1,
            life: 1.5,
            grow: -0.2,
            gravity: 0.6,
            drag: 0.8,
            twinkle: 6,
          });
        }
      }
      if (this.type === 'dragon' && this.happy > 0) {
        this.bubbleT -= dt;
        if (this.bubbleT <= 0) {
          this.bubbleT = 0.12;
          UA.FX.emit({
            x: this.pos.x + Math.sin(this.yaw) * 0.9,
            y: this.pos.y + 1.45,
            z: this.pos.z + Math.cos(this.yaw) * 0.9,
            vx: Math.sin(this.yaw) * 1.5 + (Math.random() - 0.5),
            vy: 1 + Math.random(),
            vz: Math.cos(this.yaw) * 1.5 + (Math.random() - 0.5),
            color: UA.pick([0xbfe3ff, 0xd8f1ff, 0xffd6f0]),
            size: 0.35 + Math.random() * 0.25,
            life: 1.6,
            grow: 0.3,
            gravity: -0.6,
            drag: 0.8,
          });
        }
      }
    }

    applyTransform() {
      this.group.position.copy(this.pos);
      this.group.rotation.y = this.yaw;
      const s = this.scale * UA.clamp(1 - this.jumpY * 0.15, 0.6, 1);
      this.shadow.position.set(this.pos.x, this.pos.y - this.floatY + 0.08, this.pos.z);
      this.shadow.scale.set(2.3 * s * this.S.radius, 2.3 * s * this.S.radius, 1);
      if (this.bond > 0) {
        this.marker.visible = !this.far;
        this.marker.position.set(this.pos.x, this.pos.y + (this.S.mh || 2.4) * this.scale + Math.sin(performance.now() / 400 + this.phase) * 0.08, this.pos.z);
        this.marker.rotation.y += 0.04;
      }
    }
  }

  /* ---------- manager ---------- */
  const Cr = (UA.Creatures = {
    list: [],
    spawn(scene) {
      Cr._shadowTex = UA.radialTexture('rgba(120,80,170,0.5)', 'rgba(120,80,170,0)', 128);
      const rnd = UA.rng(C.SEED + 7);
      const W = UA.World;
      const valid = (x, z) => {
        const h = W.heightAt(x, z);
        return h > 1.4 && W.slopeAt(x, z) < 0.4 && Math.hypot(x, z) < 176 && !W.inTown(x, z, 6);
      };
      const spot = (cx, cz, rad) => {
        for (let i = 0; i < 200; i++) {
          const a = rnd() * 6.283,
            r = Math.sqrt(rnd()) * rad;
          const x = cx + Math.cos(a) * r,
            z = cz + Math.sin(a) * r;
          if (!valid(x, z)) continue;
          let ok = true;
          for (const c of Cr.list) if (Math.hypot(c.pos.x - x, c.pos.z - z) < 7) ok = false;
          if (ok) return [x, z];
        }
        return null;
      };
      // a friendly welcome committee near the start (the arch is straight ahead)
      const welcome = [
        ['bunny', 7, -18],
        ['sheep', -12, -26],
        ['fox', 18, -36],
        ['dragon', -10, -44],
      ];
      const counts = {};
      welcome.forEach((w) => {
        const p = spot(w[1], w[2], 6);
        if (p) {
          counts[w[0]] = (counts[w[0]] || 0) + 1;
          Cr.list.push(new Creature(w[0], counts[w[0]] - 1, p[0], p[1], rnd, scene));
        }
      });
      for (const type in SPECIES) {
        if (SPECIES[type].area) continue; // (the animals of other areas are placed by their own area: addIce)
        let tries = 0;
        while ((counts[type] || 0) < SPECIES[type].count && tries++ < 300) {
          const a = rnd() * 6.283,
            r = 20 + Math.sqrt(rnd()) * 150;
          const p = spot(Math.cos(a) * r, Math.sin(a) * r, 2);
          if (!p) continue;
          counts[type] = (counts[type] || 0) + 1;
          Cr.list.push(new Creature(type, counts[type] - 1, p[0], p[1], rnd, scene));
        }
      }
    },
    // a few residents for Starlight Castle (ids start at 20 so they never clash with the main world's creatures)
    addRealm(scene, Realm) {
      const R = UA.REALM,
        W = UA.World;
      const rnd = UA.rng(C.SEED + 8080);
      const counts = {};
      ['bunny', 'bunny', 'bunny', 'sheep', 'sheep', 'fox', 'fox', 'dragon', 'dragon'].forEach((type) => {
        for (let tries = 0; tries < 300; tries++) {
          const lx = (rnd() - 0.5) * 150,
            lz = -100 + rnd() * 230;
          if (Realm.segDist(lx, lz) < 14 || Realm.hard(lx, lz, 9)) continue;
          const x = R.x + lx,
            z = R.z + lz;
          if (W.slopeAt(x, z) > 0.3 || W.outOfBounds(x, z, 10)) continue;
          if (Cr.list.some((c) => Math.hypot(c.pos.x - x, c.pos.z - z) < 9)) continue;
          counts[type] = (counts[type] || 0) + 1;
          Cr.list.push(new Creature(type, 20 + counts[type] - 1, x, z, rnd, scene));
          break;
        }
      });
    },
    // the residents of Frostglow Peak: penguins on the frozen lake, bunnies and foxes in the forest clearings, cubs near the
    // snowmen, and two ice dragons in the castle gardens
    addIce(scene, Realm) {
      const I = UA.ICE,
        W = UA.World,
        ice = Realm.ice;
      if (!ice || !ice.built) return;
      const rnd = UA.rng(C.SEED + 9090);
      const gl = ice.glades;
      const plan = {
        penguin: [[I.lake.x + 4, I.lake.z - 6], [I.lake.x - 10, I.lake.z + 6], [I.lake.x + 12, I.lake.z + 10]],
        snowbunny: [[gl[0].x, gl[0].z], [gl[3].x, gl[3].z], [gl[4].x, gl[4].z]],
        frostfox: [[gl[5].x, gl[5].z], [gl[6].x, gl[6].z]],
        polarcub: [[gl[1].x, gl[1].z], [gl[2].x, gl[2].z]],
        icedragon: [[-22, -97], [22, -97]],
      };
      const tmp = new THREE.Vector3();
      for (const type in plan) {
        plan[type].forEach((c, k) => {
          for (let tries = 0; tries < 200; tries++) {
            const a = rnd() * 6.283,
              r = Math.sqrt(rnd()) * (type === 'icedragon' ? 3 : 6);
            const x = I.x + c[0] + Math.cos(a) * r,
              z = I.z + c[1] + Math.sin(a) * r;
            if (W.slopeAt(x, z) > 0.3 || W.outOfBounds(x, z, 10)) continue;
            if (Cr.list.some((o) => Math.hypot(o.pos.x - x, o.pos.z - z) < 5)) continue;
            tmp.set(x, 0, z);
            if (W.resolve(tmp, 1.4)) continue; // not inside a tree or crystal
            Cr.list.push(new Creature(type, k, x, z, rnd, scene));
            break;
          }
        });
      }
      // and the seven trail guides who lead the way up the mountain
      if (UA.IceGuides) UA.IceGuides.build(scene, rnd);
    },
    // make one creature and add it to the world (the trail guides use this)
    makeAt(type, idx, x, z, rnd, scene) {
      const c = new Creature(type, idx, x, z, rnd, scene);
      Cr.list.push(c);
      return c;
    },
    update(dt, t, player) {
      let n = 0;
      for (const c of Cr.list) if (c.state === 'play') n++;
      Cr._playing = n; // so no more than two at once pile in to play with the unicorn
      for (const c of Cr.list) c.update(dt, t, player);
    },
    _playing: 0,
    // one happy chirp at a time, so a field of frolicking friends is a murmur and not a racket
    chirp(c, k) {
      const now = performance.now() / 1000;
      if (now - (Cr._chirpT || 0) < 1.6) return;
      Cr._chirpT = now;
      UA.Audio.chirp(c.S.voice * (k || 1));
    },
    // a creature decides to frolic on its own: chase a buddy round in a ring, dash about, or spin and leap
    startFrolic(c, dp) {
      let buddy = null,
        bd = 17;
      for (const o of Cr.list) {
        if (o === c || o.far || o.sleeping || o.follow || o.guide || o.tag || o.fr || o.dazzle > 0 || o.bubbleLeft > 0 || (o.go && o.go.t > 0)) continue;
        if (o.state !== 'idle' && o.state !== 'wander') continue;
        const d = Math.hypot(o.pos.x - c.pos.x, o.pos.z - c.pos.z);
        if (d < bd) {
          bd = d;
          buddy = o;
        }
      }
      const r = Math.random();
      c.state = 'frolic';
      c.timer = 0;
      if (buddy && bd > 2.5 && r < 0.65) {
        const cx = (c.pos.x + buddy.pos.x) / 2,
          cz = (c.pos.z + buddy.pos.z) / 2;
        const R = UA.clamp(bd / 2, 2.4, 5.5);
        const dir = Math.random() < 0.5 ? 1 : -1;
        const rate = UA.clamp((Math.min(c.S.run, buddy.S.run) * 0.8) / R, 0.5, 1.7);
        const t = 5 + Math.random() * 3;
        for (const o of [c, buddy]) {
          o.state = 'frolic';
          o.timer = 0;
          o.fr = { kind: 'orbit', cx, cz, R, a: Math.atan2(o.pos.z - cz, o.pos.x - cx), dir, rate, t };
        }
      } else if (r < 0.88) {
        c.fr = { kind: 'zoom', t: 4 + Math.random() * 3, tx: c.pos.x, tz: c.pos.z };
        c.frolicDash(c.fr);
      } else {
        c.fr = { kind: 'spin', t: 3 + Math.random() * 1.5 };
      }
      if (dp < 16) Cr.chirp(c, 1);
      return true;
    },
    // a creature near a slow or standing unicorn comes to play with her, no buttons. Friends earn their heart as usual
    autoPlay(c, player) {
      c.state = 'play';
      c.fr = null;
      c.playT = 6;
      c.playAng = Math.atan2(c.pos.z - player.pos.z, c.pos.x - player.pos.x);
      c.playDir = Math.random() < 0.5 ? 1 : -1;
      c.wildPlay = !c.isFriend;
      c.autoCd = 26 + Math.random() * 12;
      Cr._playing++;
      if (Math.random() < 0.7) c.say(UA.pick(['Catch me!', "Let's play!", 'Wheee!', 'Zoom zoom!', 'Play with me!']));
      Cr.chirp(c, 1.2);
    },
    species: SPECIES,
    buildBaby(i) {
      return buildBunny([0xffe0ee, 0xfff0c9, 0xdff0ff][i % 3]);
    },
    byId(id) {
      return Cr.list.find((c) => c.id === id);
    },
    // nearest creature within range (in front slightly preferred)
    nearest(player, range) {
      let best = null,
        bd = range;
      for (const c of Cr.list) {
        if (c.far) continue;
        const d = Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z) - c.S.radius * 0.5;
        if (d < bd && Math.abs(c.pos.y - player.pos.y) < 6) {
          bd = d;
          best = c;
        }
      }
      return best;
    },
    // every creature within range, nearest first (distance measured like nearest())
    nearby(player, range, max) {
      const out = [];
      for (const c of Cr.list) {
        if (c.far) continue;
        const d = Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z) - c.S.radius * 0.5;
        if (d < range && Math.abs(c.pos.y - player.pos.y) < 6) out.push({ c, d });
      }
      out.sort((a, b) => a.d - b.d);
      return max ? out.slice(0, max) : out;
    },
    dazzle(pos, radius) {
      if (UA.Folk) UA.Folk.dazzle(pos, radius);
      for (const c of Cr.list) {
        if (c.far) continue;
        if (Math.hypot(c.pos.x - pos.x, c.pos.z - pos.z) < radius) {
          c.dazzle = 3.2;
          c.happy = 3;
          c.jump(6);
          UA.FX.sparkles(new V3(c.pos.x, c.pos.y + 1.2, c.pos.z), 5);
        }
      }
    },

    /* ----- interactions ----- */
    pet(c, player) {
      if (c.petCd > 0) return false;
      c.petCd = 0.9;
      const first = c.bond === 0;
      c.bond = Math.max(c.bond, 1);
      if (!first && c.bond < 3 && Math.random() < 0.5) c.bond = Math.min(3, c.bond + 1);
      c.happy = 2.2;
      c.jump(7);
      c.hearts(first ? 12 : 6);
      c.yaw = Math.atan2(player.pos.x - c.pos.x, player.pos.z - c.pos.z);
      UA.Audio.chirp(c.S.voice);
      c.say(first ? UA.pick(['We are friends now!', 'Hello, unicorn!', 'Yay! A new friend!']) : UA.pick(['Hehe!', 'I love that!', 'More pets please!', 'Wheee!']));
      if (first) {
        Cr.makeFollower(c);
        UA.FX.burst(new V3(c.pos.x, c.pos.y + 1.5, c.pos.z), 22);
      }
      if (UA.onBond) UA.onBond(c, first ? 'friend' : 'pet');
      return true;
    },
    feed(c, player, state) {
      // feeding is free and unlimited: no counting, nothing to run out of
      if (c.state === 'eat') return false;
      c.state = 'eat';
      c.eatT = 1.1;
      c.happy = 2.5;
      const first = c.bond === 0;
      c.bond = Math.min(3, Math.max(1, c.bond + 1));
      UA.Audio.yum(c.S.voice);
      c.say(UA.pick(['Yum!', 'Delicious!', 'Gumdrops!', 'Nom nom nom!']));
      c.hearts(8);
      if (first) {
        Cr.makeFollower(c);
        UA.FX.burst(new V3(c.pos.x, c.pos.y + 1.5, c.pos.z), 22);
      }
      if (UA.onBond) UA.onBond(c, first ? 'friend' : 'feed');
      return true;
    },
    play(c, player) {
      if (!c.isFriend) {
        c.say('Pet me first, then we can play!');
        return false;
      }
      if (c.state === 'play') return false;
      c.state = 'play';
      c.fr = null;
      c.wildPlay = false;
      c.playT = 7;
      c.playAng = Math.atan2(c.pos.z - player.pos.z, c.pos.x - player.pos.x);
      c.playDir = Math.random() < 0.5 ? 1 : -1;
      c.say(UA.pick(['Catch me!', "Let's play!", 'Tag! You are it!']));
      UA.Audio.chirp(c.S.voice * 1.2);
      return true;
    },
    makeFollower(c) {
      if (c.follow) return;
      const followers = Cr.list.filter((x) => x.follow);
      if (followers.length >= 3) {
        const oldest = followers[0];
        oldest.follow = false;
        oldest.home.set(oldest.pos.x, 0, oldest.pos.z);
        oldest.state = 'idle';
      }
      c.follow = true;
      Cr.assignSlots();
    },
    assignSlots() {
      let i = 0;
      Cr.list.forEach((x) => {
        if (x.follow) x.slot = i++;
      });
    },
    toggleFollow(c) {
      c.follow = !c.follow;
      if (!c.follow) c.home.set(c.pos.x, 0, c.pos.z);
      Cr.assignSlots();
    },
    friendCount() {
      return Cr.list.filter((c) => c.bond > 0).length;
    },
    bestCount() {
      return Cr.list.filter((c) => c.bond >= 3).length;
    },
    save() {
      const o = {};
      Cr.list.forEach((c) => {
        if (c.bond > 0) o[c.id] = c.bond;
      });
      return o;
    },
    load(o) {
      if (!o) return;
      Cr.list.forEach((c) => {
        if (o[c.id]) {
          c.bond = o[c.id];
        }
      });
    },
  });
})();
