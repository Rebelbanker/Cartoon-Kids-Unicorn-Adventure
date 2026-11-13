/* Effects: pooled soft particles (circles, sparkles, hearts) and magic flowers */
(function () {
  const UA = window.UA,
    C = UA.C;
  const MAX = 1800;

  const FX = (UA.FX = {});
  let cursor = 0;
  let geo, points, mat, halo, hmat;
  const pos = new Float32Array(MAX * 3),
    col = new Float32Array(MAX * 3),
    size = new Float32Array(MAX),
    alpha = new Float32Array(MAX),
    shape = new Float32Array(MAX),
    glow = new Float32Array(MAX); // 0..1: how much soft light this particle throws around itself
  const vel = new Float32Array(MAX * 3),
    life = new Float32Array(MAX),
    maxLife = new Float32Array(MAX),
    base = new Float32Array(MAX),
    grow = new Float32Array(MAX),
    grav = new Float32Array(MAX),
    drag = new Float32Array(MAX),
    twk = new Float32Array(MAX); // twinkle rate (0 = steady)
  const tmpC = new THREE.Color();
  let rainbowIdx = 0;

  FX.init = function (scene) {
    geo = new THREE.BufferGeometry();
    const attr = (arr, n, name, dyn) => {
      const a = new THREE.BufferAttribute(arr, n);
      if (dyn) a.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute(name, a);
    };
    attr(pos, 3, 'position', true);
    attr(col, 3, 'color', true);
    attr(size, 1, 'size', true);
    attr(alpha, 1, 'alpha', true);
    attr(shape, 1, 'shape', true);
    attr(glow, 1, 'glow', true);
    mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uScale: { value: 600 } },
      vertexShader:
        'attribute float size; attribute float alpha; attribute vec3 color; attribute float shape;' +
        'varying vec3 vColor; varying float vAlpha; varying float vShape; uniform float uScale;' +
        'void main(){ vColor = color; vShape = shape; vec4 mv = modelViewMatrix * vec4(position,1.0); vAlpha = alpha * smoothstep(2.0, 6.5, -mv.z);' +
        'gl_PointSize = min(size * uScale / max(0.1, -mv.z), uScale * 0.16); gl_Position = projectionMatrix * mv; }',
      fragmentShader:
        'varying vec3 vColor; varying float vAlpha; varying float vShape;' +
        'void main(){ vec2 p = gl_PointCoord * 2.0 - 1.0; p.y = -p.y; float a;' +
        'if (vShape < 0.5) { a = smoothstep(1.0, 0.55, length(p)); }' +
        'else if (vShape < 1.5) { float s = 1.0 - (pow(abs(p.x), 0.55) + pow(abs(p.y), 0.55)); a = smoothstep(0.0, 0.12, s); a = max(a, smoothstep(0.42, 0.0, length(p))); }' +
        'else if (vShape < 2.5) { vec2 q = p * 1.3; q.y += 0.18; float f = pow(q.x*q.x + q.y*q.y - 1.0, 3.0) - q.x*q.x*q.y*q.y*q.y; a = 1.0 - smoothstep(-0.04, 0.04, f); }' +
        'else if (vShape < 3.5) { float bars = max(step(abs(p.y - 0.62), 0.17), step(abs(p.y + 0.62), 0.17)) * step(abs(p.x), 0.66); float dia = step(abs(p.x - p.y * 0.95), 0.2) * step(abs(p.y), 0.7); a = max(bars, dia); a *= smoothstep(1.1, 0.8, length(p)); }' +
        // 4: a cut gem (a diamond with a facet cross)
        'else if (vShape < 4.5) { float d = abs(p.x) / 0.72 + abs(p.y) / 0.98; a = smoothstep(1.0, 0.86, d); float f = max(step(abs(p.x), 0.05), step(abs(p.y + 0.12), 0.05)); a *= 1.0 - 0.3 * f * step(d, 0.8); }' +
        // 5: a flower with five round petals
        'else if (vShape < 5.5) { float ang = atan(p.y, p.x); float r = length(p); float pet = 0.52 + 0.42 * cos(5.0 * ang); a = smoothstep(pet + 0.07, pet - 0.03, r); a = max(a, smoothstep(0.24, 0.16, r)); }' +
        // 6: a soap bubble (a ring with a shine)
        'else { float r = length(p); a = smoothstep(1.0, 0.9, r) * (0.28 + 0.72 * smoothstep(0.6, 0.84, r)); a = max(a, smoothstep(0.2, 0.12, length(p - vec2(-0.42, 0.42)))); }' +
        'if (a < 0.02) discard; gl_FragColor = vec4(vColor, a * vAlpha); gl_FragColor = linearToOutputTexel(gl_FragColor); }',
    });
    points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 5;
    scene.add(points);
    /* soft light around sparkles and magic: the same particles drawn a second time, bigger, with a blurred circular
       falloff (computed in the shader, the same look as a blurred canvas texture without the texture fetch) and
       additive blending, so overlapping glows add up like light. Crisp cores above keep them readable by day,
       the halos take over at dusk and night. One extra draw call. */
    hmat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uScale: { value: 600 }, uHalo: { value: 3.0 }, uNight: UA.glowU },
      vertexShader:
        'attribute float size; attribute float alpha; attribute vec3 color; attribute float glow;' +
        'varying vec3 vColor; varying float vAlpha; varying float vGlow; uniform float uScale; uniform float uHalo;' +
        'void main(){ vColor = color; vGlow = glow; vec4 mv = modelViewMatrix * vec4(position,1.0); vAlpha = alpha * smoothstep(2.0, 6.5, -mv.z);' +
        'gl_PointSize = glow > 0.01 ? min(size * uHalo * uScale / max(0.1, -mv.z), uScale * 0.3) : 0.0; gl_Position = projectionMatrix * mv; }',
      fragmentShader:
        'varying vec3 vColor; varying float vAlpha; varying float vGlow; uniform float uNight;' +
        'void main(){ vec2 p = gl_PointCoord * 2.0 - 1.0; float r = length(p);' +
        'float f = pow(max(0.0, 1.0 - r), 2.4); float core = exp(-r * r * 9.0);' +
        'float a = (f * 0.55 + core * 0.45) * vGlow * vAlpha * (0.55 + uNight * 0.55); if (a < 0.008) discard;' +
        'gl_FragColor = vec4(vColor, a); gl_FragColor = linearToOutputTexel(gl_FragColor); }',
    });
    halo = new THREE.Points(geo, hmat);
    halo.frustumCulled = false;
    halo.renderOrder = 4;
    scene.add(halo);
    FX.initFlowers(scene);
  };

  FX.extraMats = []; // other point materials that need the same size scale
  FX.setScale = function (renderer, camera) {
    const h = renderer.domElement.height;
    const s = (h * 0.5) / Math.tan((camera.fov * Math.PI) / 360);
    mat.uniforms.uScale.value = s;
    hmat.uniforms.uScale.value = s;
    FX.extraMats.forEach((m) => (m.uniforms.uScale.value = s));
  };

  // how much soft light each particle shape gets by default (0 circle, 1 star, 2 heart, 3 plus, 4 gem, 5 flower, 6 bubble)
  const GLOWS = [0, 1, 0.7, 0.5, 0.9, 0.7, 0.5];
  // low-level emit
  FX.emit = function (o) {
    const i = cursor;
    cursor = (cursor + 1) % MAX;
    pos[i * 3] = o.x;
    pos[i * 3 + 1] = o.y;
    pos[i * 3 + 2] = o.z;
    vel[i * 3] = o.vx || 0;
    vel[i * 3 + 1] = o.vy || 0;
    vel[i * 3 + 2] = o.vz || 0;
    tmpC.set(o.color === undefined ? 0xffffff : o.color);
    col[i * 3] = tmpC.r;
    col[i * 3 + 1] = tmpC.g;
    col[i * 3 + 2] = tmpC.b;
    base[i] = o.size || 0.4;
    size[i] = base[i];
    shape[i] = o.shape || 0;
    glow[i] = o.glow !== undefined ? o.glow : GLOWS[o.shape || 0] || 0;
    life[i] = maxLife[i] = o.life || 1;
    grow[i] = o.grow || 0;
    grav[i] = o.gravity || 0;
    drag[i] = o.drag === undefined ? 0.5 : o.drag;
    twk[i] = o.twinkle || 0;
    alpha[i] = 1;
  };

  const R = () => Math.random() - 0.5;

  FX.sparkles = function (p, n, color, spread, up) {
    for (let i = 0; i < n; i++) {
      FX.emit({
        x: p.x + R() * (spread || 1),
        y: p.y + R() * (spread || 1),
        z: p.z + R() * (spread || 1),
        vx: R() * 2.2,
        vy: (up === undefined ? 1.2 : up) + Math.random() * 1.3,
        vz: R() * 2.2,
        color: color === undefined ? UA.pick(C.RAINBOW) : color,
        size: 0.35 + Math.random() * 0.4,
        shape: 1,
        life: 0.9 + Math.random() * 0.8,
        grow: -0.6,
        gravity: -0.4,
        drag: 1.2,
      });
    }
  };
  FX.hearts = function (p, n) {
    for (let i = 0; i < n; i++) {
      FX.emit({
        x: p.x + R() * 0.8,
        y: p.y + Math.random() * 0.4,
        z: p.z + R() * 0.8,
        vx: R() * 1.2,
        vy: 1.6 + Math.random() * 1.2,
        vz: R() * 1.2,
        color: UA.pick([0xff7fb0, 0xff9ac4, 0xffa6d0, 0xff6f9f]),
        size: 0.55 + Math.random() * 0.35,
        shape: 2,
        life: 1.3 + Math.random() * 0.7,
        grow: 0.2,
        gravity: -0.3,
        drag: 0.8,
      });
    }
  };
  FX.puff = function (p, n, color) {
    for (let i = 0; i < n; i++) {
      FX.emit({
        x: p.x + R() * 0.6,
        y: p.y + 0.1,
        z: p.z + R() * 0.6,
        vx: R() * 2,
        vy: 0.6 + Math.random() * 0.9,
        vz: R() * 2,
        color: color === undefined ? 0xffffff : color,
        size: 0.5 + Math.random() * 0.4,
        shape: 0,
        life: 0.5 + Math.random() * 0.4,
        grow: 1.0,
        gravity: 0,
        drag: 3,
      });
    }
  };
  FX.splash = function (p, n) {
    for (let i = 0; i < n; i++) {
      FX.emit({
        x: p.x + R() * 0.8,
        y: p.y + 0.05,
        z: p.z + R() * 0.8,
        vx: R() * 3,
        vy: 2.2 + Math.random() * 2.5,
        vz: R() * 3,
        color: UA.pick([0xd8f1ff, 0xffffff, 0xbfe3ff]),
        size: 0.2 + Math.random() * 0.22,
        shape: 0,
        life: 0.55 + Math.random() * 0.3,
        grow: -0.3,
        gravity: 9,
        drag: 0.2,
      });
    }
  };
  FX.rainbow = function (p) {
    const c = C.RAINBOW[rainbowIdx++ % C.RAINBOW.length];
    FX.emit({ x: p.x, y: p.y, z: p.z, vx: R() * 0.3, vy: 0.1, vz: R() * 0.3, color: c, size: 0.55, shape: 0, life: 0.9, grow: -0.85, gravity: 0, drag: 1, glow: 0.3 });
  };
  FX.burst = function (p, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283,
        e = (Math.random() - 0.3) * 1.6,
        s = 4 + Math.random() * 7;
      FX.emit({
        x: p.x,
        y: p.y,
        z: p.z,
        vx: Math.cos(a) * Math.cos(e) * s,
        vy: Math.sin(e) * s + 2,
        vz: Math.sin(a) * Math.cos(e) * s,
        color: UA.pick(C.RAINBOW),
        size: 0.5 + Math.random() * 0.5,
        shape: Math.random() < 0.6 ? 1 : 2,
        life: 1.1 + Math.random() * 0.9,
        grow: -0.5,
        gravity: 5,
        drag: 1.1,
      });
    }
  };

  // a ring of rainbow stars thrown out along the ground (landings and take-offs)
  FX.ring = function (p, n, speed) {
    const a0 = Math.random() * 6.283;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * 6.283 + R() * 0.25,
        s = (speed || 5) * (0.75 + Math.random() * 0.5);
      FX.emit({
        x: p.x + Math.cos(a) * 0.4,
        y: p.y + 0.25,
        z: p.z + Math.sin(a) * 0.4,
        vx: Math.cos(a) * s,
        vy: 1.4 + Math.random() * 2.2,
        vz: Math.sin(a) * s,
        color: C.RAINBOW[i % 6],
        size: 0.5 + Math.random() * 0.35,
        shape: 1,
        life: 0.7 + Math.random() * 0.5,
        grow: -0.7,
        gravity: 4,
        drag: 2.2,
      });
    }
  };

  FX.update = function (dt) {
    for (let i = 0; i < MAX; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      if (life[i] <= 0) {
        size[i] = 0;
        alpha[i] = 0;
        continue;
      }
      const k = 1 - life[i] / maxLife[i];
      const d = Math.max(0, 1 - drag[i] * dt);
      vel[i * 3] *= d;
      vel[i * 3 + 1] = vel[i * 3 + 1] * d - grav[i] * dt;
      vel[i * 3 + 2] *= d;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      size[i] = Math.max(0.01, base[i] * (1 + grow[i] * k) * (twk[i] > 0 ? 0.62 + 0.38 * Math.sin(k * twk[i] + i * 1.7) : 1));
      alpha[i] = Math.min(1, (1 - k) * 3);
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.size.needsUpdate = true;
    geo.attributes.alpha.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.attributes.shape.needsUpdate = true;
    geo.attributes.glow.needsUpdate = true;
    FX.updateFlowers(dt);
  };

  /* ---------- magic flowers: sprout around the unicorn when the horn glows ---------- */
  const FLOWER_MAX = 420;
  let fStems, fHeads;
  const fl = [];
  let fCursor = 0;
  const _m = new THREE.Matrix4(),
    _q = new THREE.Quaternion(),
    _p = new THREE.Vector3(),
    _s = new THREE.Vector3(),
    _up = new THREE.Vector3(0, 1, 0);
  let flowersDirty = false;

  FX.initFlowers = function (scene) {
    const stemGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.8, 5);
    stemGeo.translate(0, 0.4, 0);
    const headGeo = new THREE.IcosahedronGeometry(0.28, 0);
    headGeo.translate(0, 0.9, 0);
    fStems = new THREE.InstancedMesh(stemGeo, new THREE.MeshToonMaterial({ color: 0x8fdca0, gradientMap: UA.gradient }), FLOWER_MAX);
    fHeads = new THREE.InstancedMesh(headGeo, UA.addGlow(new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: UA.gradient, emissive: 0xffffff, emissiveIntensity: 0.15 }), 1.0), FLOWER_MAX);
    fStems.frustumCulled = fHeads.frustumCulled = false;
    fStems.userData.noOutline = fHeads.userData.noOutline = true; // thin stems would turn into black sticks
    _m.makeScale(0, 0, 0);
    for (let i = 0; i < FLOWER_MAX; i++) {
      fStems.setMatrixAt(i, _m);
      fHeads.setMatrixAt(i, _m);
      fHeads.setColorAt(i, tmpC.set(0xffffff));
      fl.push({ t: 99, x: 0, y: 0, z: 0, s: 1, rot: 0, delay: 0, active: false });
    }
    scene.add(fStems, fHeads);
  };

  FX.growFlowers = function (cx, cz, radius, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283,
        r = 1.5 + Math.sqrt(Math.random()) * radius;
      const x = cx + Math.cos(a) * r,
        z = cz + Math.sin(a) * r;
      if (UA.World.inWater(x, z)) continue;
      const fi = fCursor;
      const f = fl[fi];
      fCursor = (fCursor + 1) % FLOWER_MAX;
      f.x = x;
      f.z = z;
      f.y = UA.World.heightAt(x, z) - 0.05;
      f.s = 0.9 + Math.random() * 0.9;
      f.rot = Math.random() * 6.28;
      f.t = -Math.random() * 0.5; // negative = delay
      f.active = true;
      fHeads.setColorAt(fi, tmpC.set(UA.pick(C.RAINBOW)));
      if (fHeads.instanceColor) fHeads.instanceColor.needsUpdate = true;
    }
  };
  // test hook: how many sprouted flowers are visible (growing or fully grown)
  FX.flowerCount = () => {
    const a = fHeads.instanceMatrix.array;
    let n = 0;
    for (let i = 0; i < FLOWER_MAX; i++) if (Math.abs(a[i * 16 + 5]) > 1e-4) n++;
    return n;
  };

  FX.updateFlowers = function (dt) {
    let any = false;
    for (let i = 0; i < FLOWER_MAX; i++) {
      const f = fl[i];
      if (!f.active) continue;
      f.t += dt;
      if (f.t < 0) continue;
      // grow with a little overshoot, then stay
      const k = Math.min(1, f.t / 0.6);
      const e = k < 1 ? 1 + Math.sin(k * 3.14159) * 0.25 : 1;
      const s = f.s * (k < 1 ? k * e : 1);
      _q.setFromAxisAngle(_up, f.rot);
      _p.set(f.x, f.y, f.z);
      _s.set(s, s, s);
      _m.compose(_p, _q, _s);
      fStems.setMatrixAt(i, _m);
      fHeads.setMatrixAt(i, _m);
      if (k >= 1) f.active = false;
      any = true;
    }
    if (any) {
      fStems.instanceMatrix.needsUpdate = true;
      fHeads.instanceMatrix.needsUpdate = true;
    }
  };
})();
