/* Grass: a field of wind-swaying tufts that follows the unicorn.
   One draw call, one small triangle per blade, no per-frame CPU work except recycling the few cells that
   scroll into view. Tufts vary in thickness, height and tint; they part around the unicorn and fade out
   (shrink) toward the edge so nothing pops. */
(function () {
  const UA = window.UA;
  const W = UA.World;
  const G = (UA.Grass = { clear: [], N: 0, tufts: 0 });

  const N = 96; // cells per side (ring buffer)
  const CS = 0.82; // cell size in world units
  const HALF = N / 2;
  const REACH = N * CS * 0.5; // radius at which grass is fully shrunk away
  const BLADES = 6;

  const GREENS = [0x7fd98f, 0x93e08a, 0x6fd3b0, 0xa6e87c, 0x86d6c0, 0x9be59b, 0xb4ee8c];
  const SPECIAL = [0xffb0d4, 0xd2b8ff, 0xfff0a0]; // a few pink / lilac / buttercup tufts

  let geo, mat, mesh;
  const U = { uTime: { value: 0 }, uPlayer: { value: new THREE.Vector3() }, uR: { value: REACH }, uPush: { value: 1 } };
  const tuft = new Float32Array(N * N * 4); // x, y, z, -
  const shape = new Float32Array(N * N * 4); // width mult, height mult, phase, -
  const tint = new Float32Array(N * N * 3);
  const cellI = new Int32Array(N * N).fill(-99999);
  const cellJ = new Int32Array(N * N).fill(-99999);
  let curI = -99999,
    curJ = -99999;
  const tc = new THREE.Color(),
    tr = new THREE.Color();

  // stable per-cell random numbers
  function rnd(i, j, k) {
    let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  // one tuft: a handful of tapered triangles fanned out; y in 0..1 is "how far up the blade"
  function tuftGeometry() {
    const pos = [],
      col = [],
      nor = [];
    for (let b = 0; b < BLADES; b++) {
      const a = (b / BLADES) * Math.PI * 2 + rnd(b, 3, 9) * 0.9;
      const r = 0.035 + rnd(b, 5, 2) * 0.1;
      const bx = Math.cos(a) * r,
        bz = Math.sin(a) * r;
      const tx = -Math.sin(a),
        tz = Math.cos(a); // across the blade
      const w = 0.085 + rnd(b, 7, 4) * 0.05;
      const h = 0.72 + rnd(b, 9, 6) * 0.38;
      const lean = 0.1 + rnd(b, 2, 8) * 0.16;
      const tipX = bx + Math.cos(a) * lean * h,
        tipZ = bz + Math.sin(a) * lean * h;
      pos.push(bx - tx * w, 0, bz - tz * w, bx + tx * w, 0, bz + tz * w, tipX, h, tipZ);
      // dark at the root, bright at the tip
      col.push(0.56, 0.62, 0.58, 0.56, 0.62, 0.58, 1.08, 1.06, 0.98);
      for (let q = 0; q < 3; q++) nor.push(0, 1, 0);
    }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return g;
  }

  function cleared(x, z) {
    if (UA.World.inTown && UA.World.inTown(x, z, 0)) return true; // streets and lawns of Twinkle Town stay tidy
    for (let k = 0; k < G.clear.length; k++) {
      const c = G.clear[k];
      const dx = x - c.x,
        dz = z - c.z;
      if (dx * dx + dz * dz < c.r * c.r) return true;
    }
    return false;
  }

  function setCell(slot, i, j) {
    cellI[slot] = i;
    cellJ[slot] = j;
    const x = (i + 0.08 + rnd(i, j, 1) * 0.84) * CS,
      z = (j + 0.08 + rnd(i, j, 2) * 0.84) * CS;
    const y = W.heightAt(x, z);
    const o4 = slot * 4;
    const kind = rnd(i, j, 3);
    let wm, hm;
    if (kind < 0.46) {
      // regular tufts
      wm = 0.9 + rnd(i, j, 4) * 0.35;
      hm = 0.7 + rnd(i, j, 5) * 0.35;
    } else if (kind < 0.7) {
      // thin, tall wisps
      wm = 0.42 + rnd(i, j, 4) * 0.2;
      hm = 1.15 + rnd(i, j, 5) * 0.55;
    } else if (kind < 0.9) {
      // fat, short clumps
      wm = 1.7 + rnd(i, j, 4) * 0.55;
      hm = 0.48 + rnd(i, j, 5) * 0.22;
    } else {
      // big shaggy tufts
      wm = 2.2 + rnd(i, j, 4) * 0.6;
      hm = 1.0 + rnd(i, j, 5) * 0.35;
    }
    // patchy meadow: some cells bare, and no grass in ponds, on beaches, steep rock, or under landmarks
    const patch = 0.5 + 0.5 * Math.sin(x * 0.11 + 1.3) * Math.sin(z * 0.09 - 0.4);
    const keep = rnd(i, j, 7) < 0.55 + patch * 0.4;
    const water = y < 1.6;
    const high = y > 19 || x * x + z * z > 150 * 150;
    hm *= 0.86;
    if (!keep || water || high || cleared(x, z)) hm = 0;
    tuft[o4] = x;
    tuft[o4 + 1] = y - 0.04;
    tuft[o4 + 2] = z;
    shape[o4] = wm;
    shape[o4 + 1] = hm;
    shape[o4 + 2] = rnd(i, j, 6) * 6.283;
    // colour: a pastel green, a few special tufts, nudged toward the local region's tint
    const cr = rnd(i, j, 8);
    tc.set(cr < 0.06 ? SPECIAL[Math.floor(rnd(i, j, 10) * SPECIAL.length)] : GREENS[Math.floor(rnd(i, j, 9) * GREENS.length)]);
    const rw = W.regionWeights(x, z);
    const far = UA.smoothstep(34, 84, Math.sqrt(x * x + z * z)) * 0.42;
    for (let q = 0; q < 4; q++) {
      tr.set(W.regions[q].tint);
      tc.lerp(tr, rw[q] * far);
    }
    const v = 0.93 + rnd(i, j, 11) * 0.14;
    tint[slot * 3] = tc.r * v;
    tint[slot * 3 + 1] = tc.g * v;
    tint[slot * 3 + 2] = tc.b * v;
  }

  function recycle(ci, cj) {
    for (let sy = 0; sy < N; sy++) {
      // the one cell in the window whose index is congruent to this slot row
      const jlo = cj - HALF;
      const j = jlo + ((((sy - jlo) % N) + N) % N);
      for (let sx = 0; sx < N; sx++) {
        const ilo = ci - HALF;
        const i = ilo + ((((sx - ilo) % N) + N) % N);
        const slot = sy * N + sx;
        if (cellI[slot] !== i || cellJ[slot] !== j) setCell(slot, i, j);
      }
    }
    geo.attributes.aTuft.needsUpdate = true;
    geo.attributes.aShape.needsUpdate = true;
    geo.attributes.aTint.needsUpdate = true;
  }

  G.init = function (scene) {
    geo = tuftGeometry();
    geo.instanceCount = N * N;
    const mk = (arr, n, name) => {
      const a = new THREE.InstancedBufferAttribute(arr, n);
      a.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute(name, a);
    };
    mk(tuft, 4, 'aTuft');
    mk(shape, 4, 'aShape');
    mk(tint, 3, 'aTint');
    mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
attribute vec4 aTuft; attribute vec4 aShape; attribute vec3 aTint;
uniform float uTime; uniform vec3 uPlayer; uniform float uR; uniform float uPush;`
        )
        .replace('#include <color_vertex>', '#include <color_vertex>\n vColor.rgb *= aTint;')
        .replace(
          '#include <begin_vertex>',
          `float tipF = position.y;
vec3 p = position;
p.xz *= aShape.x;
p.y *= aShape.y;
vec2 gb = aTuft.xz;
float fade = 1.0 - smoothstep(uR * 0.6, uR * 0.98, distance(gb, uPlayer.xz));
float bend = tipF * tipF;
float w = 0.5 * sin(uTime * 1.7 + gb.x * 0.31 + gb.y * 0.23 + aShape.z) + 0.5 * sin(uTime * 0.9 + gb.x * 0.07 - gb.y * 0.11);
p.x += w * 0.3 * bend * aShape.y;
p.z += w * 0.13 * bend * aShape.y;
vec2 away = gb - uPlayer.xz;
float al = max(length(away), 0.001);
float push = smoothstep(3.2, 0.3, al) * uPush;
p.xz += (away / al) * push * 0.6 * bend * aShape.y;
p.y *= 1.0 - 0.5 * push;
p *= fade;
vec3 transformed = p + aTuft.xyz;`
        );
      // blades are lit like the ground under them (flat up-normal), so back faces do not go dark
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        '#include <normal_fragment_begin>\n normal = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);'
      );
    };
    mat.customProgramCacheKey = () => 'ua-grass';
    mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    scene.add(mesh);
    G.mesh = mesh;
    G.N = N;
    G.tufts = N * N;
    G.ready = true;
    // first fill around the start
    U.uPlayer.value.set(0, 0, 0);
    recycle(0, 0);
    curI = 0;
    curJ = 0;
  };

  G.update = function (dt, t, uni) {
    if (!G.ready) return;
    U.uTime.value = t;
    U.uPlayer.value.set(uni.pos.x, uni.pos.y, uni.pos.z);
    U.uPush.value = uni.size > 1.4 ? 1.4 : 1;
    const ci = Math.floor(uni.pos.x / CS),
      cj = Math.floor(uni.pos.z / CS);
    if (ci !== curI || cj !== curJ) {
      curI = ci;
      curJ = cj;
      recycle(ci, cj);
    }
  };
  // force a full rebuild (after teleports or when landmarks change)
  G.refresh = function () {
    cellI.fill(-99999);
    cellJ.fill(-99999);
    if (G.ready) recycle(curI, curJ);
  };
  G.setVisible = (v) => {
    if (mesh) mesh.visible = v;
  };
})();
