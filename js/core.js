/* Cartoon Kids Unicorn Adventure - core helpers: config, math, noise, geometry/material helpers */
(function () {
  const UA = (window.UA = window.UA || {});

  UA.C = {
    WORLD_R: 215,
    PLAY_R: 198,
    WATER_Y: 0,
    SEED: 20261105,
    SKY_TOP: 0x78acff,
    SKY_MID: 0xcdbcff,
    SKY_HORIZON: 0xffd6ec,
    FOG: 0xffdaee,
    PASTELS: [0xffb3d9, 0xe0c6ff, 0xbdf2d5, 0xffd9b3, 0xbfe3ff, 0xfff2a8],
    RAINBOW: [0xff8fb8, 0xffb48a, 0xffe58a, 0xa6ec9a, 0x8fd2ff, 0xbf9bff],
    COATS: [
      { id: 'cloud', name: 'Cloud', color: 0xffffff },
      { id: 'rose', name: 'Rose', color: 0xffb8d4 },
      { id: 'lilac', name: 'Lilac', color: 0xd6c0ff },
      { id: 'mint', name: 'Mint', color: 0xb4efd2 },
      { id: 'sky', name: 'Sky', color: 0xb4d8ff },
      { id: 'sunny', name: 'Sunny', color: 0xffe9a0 },
      { id: 'peach', name: 'Peach', color: 0xffcfae },
    ],
  };

  /* ---------- math ---------- */
  UA.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  UA.lerp = (a, b, t) => a + (b - a) * t;
  UA.smoothstep = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  UA.damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
  UA.angleDiff = (a, b) => {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  UA.dampAngle = (a, b, lambda, dt) => a + UA.angleDiff(a, b) * (1 - Math.exp(-lambda * dt));

  UA.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------- gradient noise ---------- */
  UA.makeNoise = function (seed) {
    const r = UA.rng(seed);
    const perm = [];
    for (let i = 0; i < 256; i++) perm.push(i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = perm[i];
      perm[i] = perm[j];
      perm[j] = t;
    }
    const p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
    const gx = [1, -1, 1, -1, 1, -1, 0, 0];
    const gy = [1, 1, -1, -1, 0, 0, 1, -1];
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    return function noise(x, y) {
      const xi = Math.floor(x),
        yi = Math.floor(y);
      const xf = x - xi,
        yf = y - yi;
      const X = xi & 255,
        Y = yi & 255;
      const aa = p[p[X] + Y] & 7,
        ab = p[p[X] + Y + 1] & 7,
        ba = p[p[X + 1] + Y] & 7,
        bb = p[p[X + 1] + Y + 1] & 7;
      const g00 = gx[aa] * xf + gy[aa] * yf;
      const g10 = gx[ba] * (xf - 1) + gy[ba] * yf;
      const g01 = gx[ab] * xf + gy[ab] * (yf - 1);
      const g11 = gx[bb] * (xf - 1) + gy[bb] * (yf - 1);
      const u = fade(xf),
        v = fade(yf);
      const x1 = g00 + (g10 - g00) * u;
      const x2 = g01 + (g11 - g01) * u;
      return (x1 + (x2 - x1) * v) * 0.8; // roughly -1..1
    };
  };

  /* ---------- three.js helpers ---------- */
  UA.initMaterials = function () {
    UA.gradient = UA.Cartoon.gradient(); // the cel-shading bands (see cartoon.js)
    UA._matCache = {};
    UA._sphereGeo = new THREE.SphereGeometry(1, 26, 18);
    UA._lowSphereGeo = new THREE.SphereGeometry(1, 10, 8);
    UA._coneGeo = new THREE.ConeGeometry(1, 1, 12);
    UA._cylGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
  };

  // cached toon material by color (+ optional emissive)
  UA.mat = function (color, emissive) {
    const key = color + '_' + (emissive || 0);
    let m = UA._matCache[key];
    if (!m) {
      m = new THREE.MeshToonMaterial({ color, gradientMap: UA.gradient });
      if (emissive !== undefined) {
        m.emissive = new THREE.Color(emissive);
        m.emissiveIntensity = 0.55;
      }
      UA._matCache[key] = m;
    }
    return m;
  };

  // ellipsoid mesh helper. r = base radius, sx/sy/sz = axis multipliers
  UA.ball = function (r, color, sx, sy, sz, x, y, z, low) {
    const m = new THREE.Mesh(low ? UA._lowSphereGeo : UA._sphereGeo, typeof color === 'object' ? color : UA.mat(color));
    m.scale.set(r * (sx || 1), r * (sy === undefined ? 1 : sy), r * (sz === undefined ? 1 : sz));
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  };
  // cone mesh (apex up), radius, height
  UA.cone = function (r, h, color, x, y, z) {
    const m = new THREE.Mesh(UA._coneGeo, typeof color === 'object' ? color : UA.mat(color));
    m.scale.set(r, h, r);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  };
  // cylinder mesh, radius, height
  UA.cyl = function (r, h, color, x, y, z) {
    const m = new THREE.Mesh(UA._cylGeo, typeof color === 'object' ? color : UA.mat(color));
    m.scale.set(r, h, r);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  };

  // merge a list of {geo, color, matrix} into one vertex-colored non-indexed geometry
  UA.mergeGeos = function (list) {
    const pos = [],
      nor = [],
      col = [];
    for (const it of list) {
      const g = it.geo.index ? it.geo.toNonIndexed() : it.geo.clone();
      if (it.matrix) g.applyMatrix4(it.matrix);
      const c = new THREE.Color(it.color !== undefined ? it.color : 0xffffff);
      const p = g.attributes.position.array;
      const n = g.attributes.normal.array;
      for (let i = 0; i < p.length; i++) {
        pos.push(p[i]);
        nor.push(n[i]);
      }
      for (let i = 0; i < p.length / 3; i++) col.push(c.r, c.g, c.b);
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return out;
  };

  // soft radial texture drawn on a canvas (blob shadows, sun glow)
  UA.radialTexture = function (inner, outer, size) {
    const s = size || 128;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, inner);
    grd.addColorStop(1, outer);
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
    const t = new THREE.CanvasTexture(c);
    return t;
  };

  UA.pick = (arr, rnd) => arr[Math.floor((rnd || Math.random)() * arr.length)];

  // night glow: adds a share of the surface color as light, driven by one shared uniform (0 by day, 1 at night)
  UA.glowU = { value: 0 };
  UA.addGlow = function (mat, k) {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uGlow = UA.glowU;
      sh.fragmentShader = 'uniform float uGlow;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * uGlow * ' + k.toFixed(3) + ';');
    };
    mat.customProgramCacheKey = () => 'glow' + k;
    return mat;
  };

  // tiny safe storage wrapper
  UA.store = {
    get(k, d) {
      try {
        const v = localStorage.getItem(k);
        return v === null ? d : JSON.parse(v);
      } catch (e) {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch (e) {}
    },
  };
})();
