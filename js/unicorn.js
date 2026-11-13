/* The player's unicorn: procedural cartoon model, movement (gallop / jump / glide), horn magic, chase camera */
(function () {
  const UA = window.UA,
    C = UA.C;
  const V3 = THREE.Vector3;

  const PIVOT = new V3(0, 1.8, 0.75); // neck/head pivot in rig space

  /* Coat shading that costs no extra draw calls: a soft pastel rim light and a little twinkling glitter.
     The glitter cells live in world-scale units but follow the model, so they do not swim when it moves. */
  const coatU = { time: { value: 0 } };
  function coatFX(mat) {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uCT = coatU.time;
      sh.uniforms.uNightG = UA.glowU;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vOP;')
        .replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n vOP = position * vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));'
        );
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying vec3 vOP; uniform float uCT; uniform float uNightG;\nfloat hh(vec3 q){ return fract(sin(dot(q, vec3(127.1, 311.7, 74.7))) * 43758.5453); }'
        )
        .replace(
          '#include <opaque_fragment>',
          `float cl = dot(outgoingLight, vec3(0.3333));
          outgoingLight *= mix(vec3(0.80, 0.70, 0.96), vec3(1.0), smoothstep(0.6, 0.93, cl));
          float rimK = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.4);
          outgoingLight += vec3(1.0, 0.74, 0.96) * rimK * (0.2 + uNightG * 0.3);
          vec3 gq = vOP * 9.0; float gh = hh(floor(gq));
          float gt = step(0.95, gh) * smoothstep(0.36, 0.0, length(fract(gq) - 0.5)) * (0.5 + 0.5 * sin(uCT * 2.6 + gh * 60.0));
          outgoingLight += vec3(1.0, 0.96, 0.82) * gt * 0.75;
          #include <opaque_fragment>`
        );
    };
    mat.customProgramCacheKey = () => 'ua-coat';
    return mat;
  }

  // a twisted, striped horn: pearl to gold along its length with a spiral of rose-gold
  function spiralHornGeometry() {
    const g = new THREE.CylinderGeometry(0.012, 0.165, 1.05, 16, 12, true);
    g.translate(0, 0.525, 0);
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const pearl = new THREE.Color(0xfff6e6),
      gold = new THREE.Color(0xffd36b),
      rose = new THREE.Color(0xffbad8),
      deep = new THREE.Color(0xffc98a),
      a = new THREE.Color(),
      b = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      const k = y / 1.05;
      a.copy(pearl).lerp(gold, Math.min(1, k * 1.2));
      b.copy(rose).lerp(deep, k);
      const u = Math.atan2(z, x) / (Math.PI * 2) + y * 2.2;
      const stripe = u - Math.floor(u) < 0.45 ? 1 : 0;
      a.lerp(b, stripe * 0.9);
      cols[i * 3] = a.r;
      cols[i * 3 + 1] = a.g;
      cols[i * 3 + 2] = a.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return g;
  }
  function starTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,244,190,0.85)');
    g.addColorStop(0.5, 'rgba(255,226,140,0.18)');
    g.addColorStop(1, 'rgba(255,226,140,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    x.globalCompositeOperation = 'lighter';
    for (const [w, h] of [[120, 7], [7, 120]]) {
      const lg = x.createRadialGradient(64, 64, 0, 64, 64, w > h ? 60 : 60);
      lg.addColorStop(0, 'rgba(255,255,255,0.95)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      x.save();
      x.translate(64, 64);
      x.scale(w / 120, h / 120);
      x.translate(-64, -64);
      x.fillStyle = lg;
      x.beginPath();
      x.arc(64, 64, 60, 0, 7);
      x.fill();
      x.restore();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  const SPARKLE_COLS = [0xffffff, 0xffe45c, 0xffb0e0, 0xff7fc4, 0xb89bff, 0x8fdcff, 0xffd23f];

  /* ---- proportions (rig space: +Z forward, +Y up, ground at y = 0, +X is the unicorn's left) ---- */
  const R = UA.Rig;
  const ZC = -0.1, // centre and half length of the spine arch
    ZH = 1.45;
  const HIP_Y = 1.88;
  const FEET_Y = 0.255; // fetlock height when the hoof is flat on the ground
  const LEGS = [
    { x: 0.31, z: 0.72, fwd: true, l1: 1.12, l2: 0.55 }, // 0 front left
    { x: -0.31, z: 0.72, fwd: true, l1: 1.12, l2: 0.55 }, // 1 front right
    { x: 0.34, z: -0.74, fwd: false, l1: 1.0, l2: 0.7 }, // 2 back left
    { x: -0.34, z: -0.74, fwd: false, l1: 1.0, l2: 0.7 }, // 3 back right
  ];
  // neck path (base inside the chest, up and forward to the poll), head hangs off the poll
  const NECK = [
    { c: [0, 1.95, 0.8], rx: 0.4, ry: 0.52 },
    { c: [0, 2.38, 1.1], rx: 0.33, ry: 0.42 },
    { c: [0, 2.8, 1.4], rx: 0.275, ry: 0.34 },
    { c: [0, 3.1, 1.72], rx: 0.26, ry: 0.3 },
  ];
  // head profile in head space (origin at the poll, +Z toward the nose)
  const HEAD = [
    { c: [0, 0.02, -0.12], rx: 0.34, ry: 0.37 },
    { c: [0, 0.02, 0.1], rx: 0.55, ry: 0.57 },
    { c: [0, -0.02, 0.38], rx: 0.59, ry: 0.57 },
    { c: [0, -0.12, 0.64], rx: 0.45, ry: 0.44 },
    { c: [0, -0.22, 0.82], rx: 0.3, ry: 0.28 },
    { c: [0, -0.26, 0.92], rx: 0.23, ry: 0.2 },
  ];
  const HEAD_SCALE = 1.1; // the whole head is a little oversized: cute proportions
  // torso: z, top, bottom, half width
  const TORSO = [
    [-1.05, 2.38, 1.56, 0.5],
    [-0.75, 2.46, 1.42, 0.57],
    [-0.4, 2.38, 1.32, 0.54],
    [0.0, 2.36, 1.22, 0.54],
    [0.4, 2.46, 1.16, 0.55],
    [0.8, 2.55, 1.2, 0.52],
    [1.12, 2.45, 1.42, 0.44],
  ];
  // limb profiles: [fraction along the bone, half width, half depth]
  const LIMB = {
    fUp: [[0, 0.23, 0.25], [0.45, 0.22, 0.23], [0.85, 0.165, 0.17], [1, 0.15, 0.155]],
    fLo: [[0, 0.14, 0.145], [0.2, 0.125, 0.128], [0.8, 0.12, 0.123], [1, 0.135, 0.14]],
    bUp: [[0, 0.32, 0.36], [0.35, 0.265, 0.29], [0.8, 0.18, 0.2], [1, 0.15, 0.175]],
    bLo: [[0, 0.145, 0.165], [0.2, 0.125, 0.135], [0.8, 0.12, 0.125], [1, 0.135, 0.14]],
  };
  const limbLoft = (prof, len, mat) => {
    const st = prof.map((p) => ({ c: [0, -p[0] * len, 0], rx: p[1], ry: p[2] }));
    const L = new R.Loft(R.sampleRings(st, 3, p0cap(prof), p0cap(prof, true), 3), 10);
    const m = new THREE.Mesh(L.geo, mat);
    return m;
  };
  function p0cap(prof, end) {
    const p = end ? prof[prof.length - 1] : prof[0];
    return p[1] * 0.9;
  }
  const spineY = (z, arch) => arch * Math.max(0, 1 - ((z - ZC) / ZH) * ((z - ZC) / ZH));
  const spineX = (z, bend) => {
    const u = (z - ZC) / ZH;
    return bend * Math.min(1.3, u * u);
  };

  function buildModel(coatColor) {
    const root = new THREE.Group();
    const rig = new THREE.Group();
    root.add(rig);
    const P = { legs: [], wings: [], accessories: {}, spineY, spineX, arch: 0, bend: 0 };

    const coat = new THREE.MeshToonMaterial({ color: coatColor, gradientMap: UA.gradient });
    const muzzleMat = new THREE.MeshToonMaterial({ color: new THREE.Color(coatColor).lerp(new THREE.Color(0xffb3d1), 0.35), gradientMap: UA.gradient });
    coatFX(coat);
    coatFX(muzzleMat);
    P.coatMat = coat;
    P.muzzleMat = muzzleMat;
    UA.Cartoon.gloss(coat); // crisp white sun-glints on the shiny coat
    UA.Cartoon.gloss(muzzleMat);
    const dark = UA.mat(0x3a2b5e),
      white = UA.mat(0xffffff),
      pink = UA.mat(0xffa6c9),
      gold = UA.mat(0xffd36b),
      goldDeep = UA.mat(0xffb84d);
    const hornMat = new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: UA.gradient, emissive: 0xffa000, emissiveIntensity: 0.25 });
    P.hornMat = hornMat;
    UA.Cartoon.gloss(hornMat);

    // ---- torso: one smooth shell, reshaped every frame (arch for the gallop, bend for turns, breathing) ----
    {
      const st = TORSO.map((t) => ({ c: [0, (t[1] + t[2]) / 2, t[0]], rx: t[3], ry: (t[1] - t[2]) / 2 }));
      const loft = new R.Loft(R.sampleRings(st, 4, 0.3, 0.32, 4), 24);
      const mesh = new THREE.Mesh(loft.geo, coat);
      mesh.frustumCulled = false;
      rig.add(mesh);
      P.torso = loft;
      P.shapeBody = function (arch, bend, breathe) {
        this.arch = arch;
        this.bend = bend;
        const b = loft.base;
        for (let i = 0; i < loft.n; i++) {
          const z = b.c[i * 3 + 2];
          loft.c[i * 3] = b.c[i * 3] + spineX(z, bend);
          loft.c[i * 3 + 1] = b.c[i * 3 + 1] + spineY(z, arch);
          loft.c[i * 3 + 2] = z;
          loft.rx[i] = b.rx[i] * (1 + breathe * 0.5);
          loft.ry[i] = b.ry[i] * (1 + breathe);
        }
        loft.build();
      };
    }
    // saddle pad rides on the back
    const saddle = new THREE.Group();
    saddle.position.set(0, 0, 0.12);
    P.saddleParts = [UA.ball(0.78, UA.mat(0xc9b2ff), 0.82, 0.14, 0.96, 0, 2.31, 0), UA.ball(0.74, UA.mat(0xff9ad0), 0.82, 0.2, 0.92, 0, 2.36, 0), UA.ball(0.12, UA.mat(0xffe27a, 0xffc400), 1, 0.5, 1, 0, 2.52, 0)];
    P.saddleParts.forEach((m) => saddle.add(m));
    rig.add(saddle);
    P.saddle = saddle;
    // cutie mark: a little glowing picture on each flank (look.js picks which, see Look.markGeometry)
    {
      const cm = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.FrontSide });
      P.cutie = [];
      [-1, 1].forEach((sd) => {
        const m = new THREE.Mesh(UA.Look.markGeometry('star'), cm);
        m.position.set(sd * 0.56, 1.85, -0.4);
        m.rotation.y = sd * (Math.PI / 2);
        rig.add(m);
        P.cutie.push(m);
      });
    }

    // ---- legs: hip -> knee/hock -> fetlock -> hoof, solved with IK every frame ----
    const socks = [0xffb3d9, 0xc9b2ff, 0xa6e3ff, 0xfff0a0];
    const hoofGeo = new THREE.CylinderGeometry(0.135, 0.175, 0.12, 12);
    LEGS.forEach((s, i) => {
      const leg = new THREE.Group();
      leg.position.set(s.x, HIP_Y, s.z);
      leg.add(limbLoft(s.fwd ? LIMB.fUp : LIMB.bUp, s.l1, coat));
      const knee = new THREE.Group();
      knee.position.y = -s.l1;
      leg.add(knee);
      knee.add(limbLoft(s.fwd ? LIMB.fLo : LIMB.bLo, s.l2, coat));
      const foot = new THREE.Group();
      foot.position.y = -s.l2;
      knee.add(foot);
      foot.add(UA.ball(0.19, UA.mat(socks[i]), 1.1, 0.8, 1.1, 0, -0.04, 0.01, true));
      const pastern = UA.cyl(0.08, 0.17, coat, 0, -0.1, 0.045);
      pastern.rotation.x = -0.5;
      foot.add(pastern);
      const hoof = new THREE.Mesh(hoofGeo, gold);
      hoof.position.set(0, -0.195, 0.085);
      foot.add(hoof);
      leg.userData = { knee, foot, l1: s.l1, l2: s.l2, spec: s };
      rig.add(leg);
      P.legs.push(leg);
    });

    // ---- neck (two pieces so it can curl), head ----
    const nk0 = new V3().fromArray(NECK[0].c),
      nk2 = new V3().fromArray(NECK[2].c),
      nk3 = new V3().fromArray(NECK[3].c);
    const relSt = (st, o) => st.map((s) => ({ c: [s.c[0] - o.x, s.c[1] - o.y, s.c[2] - o.z], rx: s.rx, ry: s.ry }));
    const neckA = new THREE.Group();
    neckA.position.copy(nk0);
    rig.add(neckA);
    neckA.add(new THREE.Mesh(new R.Loft(R.sampleRings(relSt(NECK.slice(0, 3), nk0), 5, 0.3, 0.2, 4), 16).geo, coat));
    const neckB = new THREE.Group();
    neckB.position.copy(nk2).sub(nk0);
    neckA.add(neckB);
    neckB.add(new THREE.Mesh(new R.Loft(R.sampleRings(relSt(NECK.slice(2), nk2), 5, 0.2, 0.12, 4), 16).geo, coat));
    const H = new THREE.Group();
    H.position.copy(nk3).sub(nk2);
    neckB.add(H);
    P.neck = neckA;
    P.neck2 = neckB;
    P.head = H;
    H.scale.setScalar(HEAD_SCALE);
    {
      const rings = R.sampleRings(HEAD, 5, 0.2, 0.12, 4);
      const skull = new R.Loft(rings, 22);
      const mesh = new THREE.Mesh(skull.geo, coat);
      H.add(mesh);
      // pink muzzle patch: the front rings, a hair larger
      const patch = rings.filter((r) => r.c[2] >= 0.86).map((r) => ({ c: r.c.slice(), rx: r.rx + 0.014, ry: r.ry + 0.014 }));
      if (patch.length > 3) H.add(new THREE.Mesh(new R.Loft(patch, 22).geo, muzzleMat));
    }
    const addH = (m, x, y, z) => {
      m.position.set(x, y, z);
      H.add(m);
      return m;
    };
    // nostrils and a happy smile
    addH(UA.ball(0.05, dark, 1, 1, 0.8), 0.075, -0.2, 0.96);
    addH(UA.ball(0.05, dark, 1, 1, 0.8), -0.075, -0.2, 0.96);
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.02, 6, 10, Math.PI), dark);
    smile.rotation.z = Math.PI;
    addH(smile, 0, -0.36, 0.93);
    // eyes: big glossy layers. Everything is a child of the eye so the whole eye blinks together
    P.eyes = [];
    const eyeBase = UA.mat(0x2b2150),
      irisMat = UA.mat(0x8b6bff),
      irisLight = UA.mat(0xd2b8ff),
      pupilMat = UA.mat(0x1d1540);
    [-1, 1].forEach((s) => {
      const eye = UA.ball(0.24, eyeBase, 0.85, 1.2, 0.5);
      addH(eye, s * 0.36, 0.1, 0.6);
      eye.rotation.y = s * 0.42;
      eye.add(UA.ball(0.8, irisMat, 1, 1, 1, 0, -0.03, 0.35));
      eye.add(UA.ball(0.52, irisLight, 1, 0.55, 1, 0, -0.45, 0.62));
      eye.add(UA.ball(0.4, pupilMat, 1, 1.05, 1, 0, 0.04, 0.8));
      eye.add(UA.ball(0.23, white, 1, 1, 0.6, 0.3, 0.42, 1.0));
      eye.add(UA.ball(0.1, white, 1, 1, 0.6, -0.32, -0.3, 1.02));
      addH(UA.ball(0.15, pink, 1, 0.6, 0.3), s * 0.47, -0.17, 0.62).rotation.y = s * 0.7;
      // two little lashes flicking out and up
      [[0.44, 0.31, 0.9], [0.48, 0.22, 1.35]].forEach(([lx, ly, th]) => {
        const lash = UA.cone(0.035, 0.2, dark);
        lash.rotation.z = -s * th;
        addH(lash, s * lx, ly, 0.62);
      });
      P.eyes.push(eye);
    });
    // ears
    P.ears = [];
    [-1, 1].forEach((s) => {
      const ear = new THREE.Group();
      ear.add(UA.cone(0.17, 0.46, coat, 0, 0.23, 0));
      ear.add(UA.cone(0.1, 0.34, pink, 0, 0.2, 0.05));
      ear.rotation.z = -s * 0.28;
      addH(ear, s * 0.33, 0.46, 0.0);
      P.ears.push(ear);
    });
    // horn
    const horn = new THREE.Group();
    P.hornGeo = spiralHornGeometry();
    horn.add(new THREE.Mesh(P.hornGeo, hornMat));
    const hornStar = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTexture(), color: 0xfff4c2, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    hornStar.position.set(0, 1.08, 0);
    hornStar.scale.set(0.8, 0.8, 1);
    horn.add(hornStar);
    P.hornStar = hornStar;
    horn.rotation.x = 0.5;
    addH(horn, 0, 0.47, 0.48);
    P.horn = horn;

    // ---- hair: rainbow mane locks down the crest, forelock between the ears, a fan of tail locks ----
    const hairMat = UA.addGlow(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient, side: THREE.DoubleSide, emissive: 0x000000 }), 0.5);
    UA.Cartoon.gloss(hairMat);
    const hair = new R.Hair(hairMat);
    P.hair = hair;
    const RB = C.RAINBOW;
    // helper: a chain that starts along dir0 and bends toward dir1
    const chain = (n, seg, d0, d1) => {
      const pts = [new V3()];
      const a = d0.clone().normalize(),
        b = d1.clone().normalize();
      for (let k = 1; k < n; k++) {
        const t = (k - 1) / (n - 2);
        const d = a.clone().lerp(b, t).normalize().multiplyScalar(seg * (1 - 0.1 * t));
        pts.push(pts[k - 1].clone().add(d));
      }
      return pts;
    };
    // sample the neck crest to place mane anchors
    {
      const full = R.sampleRings(NECK, 6, 0, 0);
      const nA = full.length;
      const crest = [0.16, 0.3, 0.44, 0.58, 0.72, 0.86];
      crest.forEach((u, ci) => {
        const r = full[Math.min(nA - 1, Math.round(u * (nA - 1)))];
        const r2 = full[Math.min(nA - 1, Math.round(u * (nA - 1)) + 1)];
        const r1 = full[Math.max(0, Math.round(u * (nA - 1)) - 1)];
        const t = new V3(r2.c[0] - r1.c[0], r2.c[1] - r1.c[1], r2.c[2] - r1.c[2]).normalize();
        const nrm = new V3(0, t.z, -t.y).normalize();
        const p = new V3(r.c[0], r.c[1], r.c[2]).addScaledVector(nrm, r.ry * 0.86);
        const inB = r.c[1] > NECK[2].c[1] - 0.001;
        const grp = inB ? neckB : neckA;
        const piv = inB ? nk2 : nk0;
        [-1, 1].forEach((sd) => {
          const a = new THREE.Object3D();
          a.position.set(sd * 0.03, p.y - piv.y, p.z - piv.z);
          grp.add(a);
          const len = 0.165 - ci * 0.004;
          const mLock = hair.add({
            anchor: a,
            // starts up and back from the crest, then falls down the near side of the neck (narrow, not a curtain)
            rest: chain(8, len, new V3(sd * 0.15, 0.18, -0.5), new V3(sd * 0.04, -0.78, -0.6)),
            r0: 0.1 - ci * 0.003,
            color: RB[(ci + (sd > 0 ? 0 : 1)) % 6],
            fan: new V3(sd * 0.05, 0.2, 0),
            lift: 0.22,
            stiff0: 18,
            stiff1: 6,
            damp: 3.6,
            flat: 0.95,
            flut: 0.4,
            ref: new V3(sd, 0, 0),
          });
          mLock.tag = ['mane', ci, sd]; // (look.js recolours the hair by these tags)
        });
      });
    }
    // forelock: two curls swept over the brow
    [-1, 1].forEach((sd, fi) => {
      const a = new THREE.Object3D();
      a.position.set(sd * 0.07, 0.52, 0.4);
      H.add(a);
      const fLock = hair.add({
        anchor: a,
        rest: chain(7, 0.15, new V3(sd * 0.1, 0.35, 0.8), new V3(sd * 0.2, -0.85, 0.25)),
        r0: 0.075,
        color: RB[(fi * 3) % 6],
        fan: new V3(sd * 0.06, 0.3, -0.2),
        lift: 0.3,
        stiff0: 20,
        stiff1: 8,
        damp: 4,
        flat: 1.15,
        ref: new V3(sd, 0, 0),
      });
      fLock.tag = ['fore', fi];
    });
    // tail: a fan of locks from the croup
    const tailRoot = new THREE.Group();
    tailRoot.position.set(0, 2.08, -1.28);
    rig.add(tailRoot);
    P.tailRoot = tailRoot;
    P.tailLocks = [];
    // seven slim locks bunched into one plume: narrow side to side, layered up and down so it still reads full from the side
    const NT = 7;
    for (let i = 0; i < NT; i++) {
      const u = (i - (NT - 1) / 2) / ((NT - 1) / 2); // -1..1 across the plume
      const lay = Math.sin(i * 2.3); // -1..1, staggers length and lift between neighbours
      const a = new THREE.Object3D();
      a.position.set(u * 0.075, -Math.abs(u) * 0.03 + lay * 0.02, 0);
      tailRoot.add(a);
      const seg = 0.215 - Math.abs(u) * 0.025 + lay * 0.012;
      const L = hair.add({
        anchor: a,
        rest: chain(10, seg, new V3(u * 0.06, 0.35, -1), new V3(u * 0.1, -1.0, -0.4)),
        r0: 0.15 - Math.abs(u) * 0.03, // deeper than wide: reads full from the side, still slim from behind
        color: RB[Math.round((i * 5) / (NT - 1))],
        fan: new V3(u * 0.05, 0.2, 0), // note: the rig normalises this, so it is a direction (mostly up, a hint of sideways)
        lift: 0.2 + lay * 0.07,
        stiff0: 11,
        stiff1: 3.2,
        damp: 2.3,
        flat: 0.85,
        wave: 1.15,
        flut: 0.25,
        ref: new V3(1, 0, 0),
      });
      L.tag = ['tail', i, NT];
      P.tailLocks.push(L);
    }

    // ---- wings ----
    const wingCols = [0xffffff, 0xffe0f0, 0xf0e0ff, 0xe0f0ff, 0xffffff];
    const lens = [2.0, 1.9, 1.65, 1.4, 1.1];
    [1, -1].forEach((side) => {
      const w = new THREE.Group();
      for (let k = 0; k < 5; k++) {
        const f = new THREE.Group();
        const mat = new THREE.MeshToonMaterial({ color: wingCols[k], gradientMap: UA.gradient, emissive: 0xffeef8, emissiveIntensity: 0.4 });
        f.add(UA.ball(1, mat, lens[k] / 2, 0.09, 0.3, lens[k] / 2, 0, 0));
        f.rotation.z = 0.5 - k * 0.2;
        f.position.z = -k * 0.2;
        w.add(f);
      }
      w.position.set(side * 0.5, 2.3, 0.12);
      w.scale.x = side;
      w.scale.setScalar(0.001);
      w.userData.side = side;
      rig.add(w);
      P.wings.push(w);
    });

    // ---- unlockable accessories (hidden until earned) ----
    // flower garland around the neck
    const garland = new THREE.Group();
    garland.position.set(0, 0.43, 0.3);
    garland.rotation.x = 0.6;
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * 6.283;
      const col = [0xff9ec9, 0xffe27a, 0xc3a4ff, 0xffffff, 0x9fd8ff][i % 5];
      garland.add(UA.ball(0.15, UA.mat(col), 1, 1, 1, Math.cos(a) * 0.38, -0.05, Math.sin(a) * 0.47, true));
      garland.add(UA.ball(0.09, UA.mat(0x9fe3b4), 1, 0.7, 1, Math.cos(a + 0.28) * 0.38, -0.07, Math.sin(a + 0.28) * 0.47, true));
    }
    garland.visible = false;
    neckA.add(garland);
    P.accessories.garland = garland;
    // star clip beside the forelock
    const star = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.1 : 0.24,
        a = (i / 10) * 6.283 + Math.PI / 2;
      const x = Math.cos(a) * r,
        y = Math.sin(a) * r;
      if (i === 0) star.moveTo(x, y);
      else star.lineTo(x, y);
    }
    const starGeo = new THREE.ExtrudeGeometry(star, { depth: 0.07, bevelEnabled: false });
    const starMesh = new THREE.Mesh(starGeo, new THREE.MeshToonMaterial({ color: 0xffe27a, gradientMap: UA.gradient, emissive: 0xffc400, emissiveIntensity: 0.6 }));
    starMesh.position.set(0.3, 0.46, 0.52);
    starMesh.rotation.y = 0.3;
    starMesh.visible = false;
    H.add(starMesh);
    P.accessories.star = starMesh;
    // sparkle bow at the tail + gold anklets
    const bow = new THREE.Group();
    bow.add(UA.cone(0.22, 0.5, UA.mat(0xff7fb0), 0.3, 0, 0));
    bow.children[0].rotation.z = Math.PI / 2;
    bow.add(UA.cone(0.22, 0.5, UA.mat(0xff7fb0), -0.3, 0, 0));
    bow.children[1].rotation.z = -Math.PI / 2;
    bow.add(UA.ball(0.14, UA.mat(0xffe27a, 0xffc400)));
    bow.position.set(0, 0.12, 0.05);
    bow.visible = false;
    tailRoot.add(bow);
    P.accessories.bow = bow;
    const anklets = [];
    P.legs.forEach((leg) => {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 6, 12), UA.mat(0xffd36b, 0xffa000));
      t.rotation.x = Math.PI / 2;
      t.position.y = -0.03;
      t.visible = false;
      leg.userData.foot.add(t);
      anklets.push(t);
    });
    P.accessories.anklets = anklets;

    // ---- blob shadow ----
    const tex = UA.radialTexture('rgba(120,80,170,0.55)', 'rgba(120,80,170,0)', 128);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: true }));
    sh.rotation.x = -Math.PI / 2;
    sh.scale.set(3.4, 4.6, 1);
    sh.renderOrder = 2;
    P.shadow = sh;

    root.scale.setScalar(1.0);
    P.shapeBody(0, 0, 0);
    return { root, rig, P };
  }

  /* ---- gaits ----
     Keyed by speed and blended in between. f = strides per second, d = share of the stride each hoof is down,
     off = when each hoof lands [front left, front right, back left, back right] as a share of the stride.
     walk = 4 beats, trot = diagonal pairs, canter = 3 beats, gallop = 4 beats with a stretched flight phase. */
  const GAITS = [
    { v: 0, f: 1.5, d: 0.66, off: [0.25, 0.75, 0.0, 0.5], lift: 0.2, ext: 0.0, sup: 0.02, pit: 0.01, arch: 0.0, archPh: 0.0, nod: 0.04, nodN: 1, nodPh: 0.1 },
    { v: 3.2, f: 1.5, d: 0.66, off: [0.25, 0.75, 0.0, 0.5], lift: 0.2, ext: 0.0, sup: 0.02, pit: 0.01, arch: 0.0, archPh: 0.0, nod: 0.04, nodN: 1, nodPh: 0.1 },
    { v: 6.5, f: 2.2, d: 0.48, off: [0.0, 0.5, 0.5, 0.0], lift: 0.32, ext: 0.04, sup: 0.09, pit: 0.02, arch: 0.0, archPh: 0.0, nod: 0.05, nodN: 2, nodPh: 0.0 },
    { v: 10.5, f: 2.6, d: 0.38, off: [0.3, 0.55, 0.0, 0.3], lift: 0.42, ext: 0.1, sup: 0.13, pit: 0.05, arch: 0.05, archPh: 0.96, nod: 0.12, nodN: 1, nodPh: 0.96 },
    { v: 15, f: 2.75, d: 0.25, off: [0.5, 0.64, 0.0, 0.14], lift: 0.55, ext: 0.2, sup: 0.17, pit: 0.09, arch: 0.09, archPh: 0.94, nod: 0.17, nodN: 1, nodPh: 0.94 },
  ];
  const GA = { off: [0, 0, 0, 0] };
  function gaitAt(v) {
    let i = 0;
    while (i < GAITS.length - 2 && v > GAITS[i + 1].v) i++;
    const a = GAITS[i],
      b = GAITS[i + 1];
    const t = UA.smoothstep(a.v, b.v, v);
    for (const k of ['f', 'd', 'lift', 'ext', 'sup', 'pit', 'arch', 'archPh', 'nod', 'nodN', 'nodPh']) GA[k] = a[k] + (b[k] - a[k]) * t;
    for (let j = 0; j < 4; j++) {
      const d = ((b.off[j] - a.off[j] + 1.5) % 1) - 0.5; // shortest way round the stride
      GA.off[j] = (((a.off[j] + d * t) % 1) + 1) % 1;
    }
    return GA;
  }

  // timeline of the idle glitter-poop gag, in seconds from the moment she starts (see Unicorn.updatePoop)
  const POOP = { PLOP: 0.85, RELIEF: 2.05, LOOK0: 1.9, LOOK1: 3.5, END: 3.9 };

  UA.Unicorn = class Unicorn {
    constructor(scene, coatColor) {
      const m = buildModel(coatColor);
      this.root = m.root;
      this.rig = m.rig;
      this.P = m.P;
      scene.add(this.root);
      scene.add(this.P.shadow);
      this.P.hair.finalize(scene);
      this.gs = 0; // smoothed speed that picks the gait
      this.sup = 4; // how many hooves are on the ground (smoothed)
      this.stW = [1, 1, 1, 1]; // per hoof: 1 on the ground
      this.legPrev = [0, 0, 0, 0];
      this.footQ = [];
      this.crouch = 0;
      this.arch = 0;
      this.bend = 0;
      this.vel = new V3();
      this.pos = new V3(0, 0, 0);
      this.yaw = Math.PI;
      this.speed = 0;
      this.vy = 0;
      this.grounded = true;
      this.gliding = false;
      this.rail = null; // the ice slide takes hold of the unicorn through this (ice_slide.js)
      this.flapUsed = false;
      this.coyote = 0;
      this.airTime = 0;
      this.phase = 0;
      this.airBlend = 0;
      this.sq = 0; // squash and stretch: + = tall and thin, - = squashed flat (a spring, so it overshoots and wobbles)
      this.sqv = 0;
      this.wingOpen = 0;
      this.flapKick = 0;
      this.pitch = 0;
      this.roll = 0;
      this.yawRate = 0;
      this.time = 0;
      this.hornGlow = 0;
      this.magicCd = 0;
      this.trailT = 0;
      this.glintT = 0;
      this.inWater = false;
      this.splashT = 0;
      this.boost = 0;
      this.size = 1;
      this.scaleK = 1; // how big she looks because of the dress-up size (look.js): never changes how she moves
      this.hornK = 1; // the horn's size (look.js)
      this.sizeTarget = 1;
      this.sizeT = 0;
      this.hasGarland = this.hasStar = this.walkOnWater = false;
      this.trailF = 0;
      this.strideN = 0;
      this.shedT = 0;
      this.dir = new V3(0, 0, 1);
      // the idle gag (see updatePoop): glitter poops after a few quiet seconds
      this.idleT = 0; // seconds of doing nothing
      this.poopT = -1; // -1 = not happening; otherwise seconds into the gag
      this.poopCd = 0; // no gag before this many seconds have passed since the last one (set to 20 when one starts)
      this.poopNeed = 20; // quiet seconds needed (re-rolled each time, 18 to 23, so it is not a metronome)
      this.poopLift = this.poopSquat = this.poopLook = 0; // smoothed 0..1 poses: tail up, squat, glance back
      this.poopSide = 1;
      this.poopSpot = new V3();
      this.poopMade = false;
      this.gag = false; // main.js turns this on while playing
      if (UA.GlitterPoop) UA.GlitterPoop.init(scene);
      this.setCoat(coatColor);
    }
    setCoat(color) {
      this.P.coatMat.color.set(color);
      this.P.muzzleMat.color.set(color).lerp(new THREE.Color(0xffb3d1), 0.35);
    }
    // ground height under the unicorn. With the rainbow anklets the water surface is solid. Town roofs, awnings and
    // the like count as ground when the unicorn is on or above them (so it lands on them), but not when it is below
    // them (so it can ride under an awning)
    gAt(x, z) {
      let g = UA.World.groundAt(x, z);
      if (this.walkOnWater) g = Math.max(g, C.WATER_Y + 0.02);
      const T = UA.Town;
      if (T && T.surfaceAt) {
        const s = T.surfaceAt(x, z);
        if (s > g && this.pos.y >= s - 0.6) g = s;
      }
      return g;
    }
    setAccessories(unlocked) {
      this.hasGarland = unlocked.indexOf('garland') >= 0;
      this.hasStar = unlocked.indexOf('star') >= 0;
      this.walkOnWater = unlocked.indexOf('bow') >= 0;
      const a = this.P.accessories;
      a.garland.visible = unlocked.indexOf('garland') >= 0;
      a.star.visible = unlocked.indexOf('star') >= 0;
      a.bow.visible = unlocked.indexOf('bow') >= 0;
      a.anklets.forEach((t) => (t.visible = unlocked.indexOf('bow') >= 0));
    }
    teleport(x, z, yaw) {
      this.pos.set(x, UA.World.groundAt(x, z), z);
      if (yaw !== undefined) this.yaw = yaw;
      this.speed = 0;
      this.vy = 0;
      this.grounded = true;
      this.P.hair.reset();
    }
    hornTip(out) {
      this.root.updateMatrixWorld(true);
      return this.P.horn.localToWorld(out.set(0, 1.05, 0));
    }
    tailPos(out) {
      const L = this.P.tailLocks[3];
      if (!L.init) {
        this.root.updateMatrixWorld(true);
        return this.P.tailRoot.getWorldPosition(out);
      }
      const k = 6 * 3;
      return out.set(L.p[k], L.p[k + 1], L.p[k + 2]);
    }
    center(out) {
      return out.set(this.pos.x, this.pos.y + 1.8, this.pos.z);
    }

    /* ---------- the idle gag: glitter poop ----------
       Stand still for a few seconds and she lifts her tail, squats, shuts her eyes and plops out a swirl of rainbow
       glitter (glitterpoop.js owns the pile), then glances back at it, pleased. Any input stops it before the plop. */
    updatePoop(dt, busy) {
      const GP = UA.GlitterPoop,
        Z = POOP;
      this.poopCd = Math.max(0, this.poopCd - dt);
      if (!this.gag) busy = true; // not playing (the title screen): never
      const calm = this.grounded && this.speed < 0.6 && !this.inWater && this.size < 2.2;
      if (this.poopT < 0) {
        this.idleT = busy || !calm ? 0 : this.idleT + dt;
        if (GP && this.idleT >= this.poopNeed && this.poopCd <= 0) {
          // where it will land: just behind her, if there is flat dry ground there
          const s = this.size * this.scaleK,
            bx = this.pos.x - this.dir.x * 1.95 * s,
            bz = this.pos.z - this.dir.z * 1.95 * s;
          const by = this.gAt(bx, bz);
          const ok = Math.abs(by - this.pos.y) < 0.9 && !(UA.World.inWater(bx, bz) && !this.walkOnWater);
          this.idleT = 0;
          this.poopNeed = 18 + Math.random() * 5;
          if (!ok) {
            this.poopCd = 5;
          } else {
            this.poopSpot.set(bx, by, bz);
            this.poopT = 0;
            this.poopMade = false;
            this.poopCd = 20;
            this.poopSide = Math.random() < 0.5 ? -1 : 1;
            UA.Audio.strain();
          }
        }
      } else {
        if (busy || !calm) {
          // the player moved: before the plop she thinks better of it; after it she just trots off
          if (!this.poopMade) this.poopT = -1;
          else this.poopT = Math.max(this.poopT, Z.END);
        }
        if (this.poopT >= 0) {
          const prev = this.poopT;
          this.poopT += dt;
          const t = this.poopT;
          // a trembling little shimmer of glitter at the tail while she concentrates
          if (!this.poopMade && Math.random() < dt * 22) UA.FX.sparkles(this.tailPos(new V3()), 1, undefined, 0.5, 0.3);
          if (!this.poopMade && t >= Z.PLOP) {
            this.poopMade = true;
            GP.spawn(this.poopSpot.x, this.poopSpot.y, this.poopSpot.z, this.size * this.scaleK);
            UA.FX.puff(this.tailPos(new V3()), 4, 0xfff0fa);
            this.sqv -= 1.2; // a little push
          }
          if (prev < Z.RELIEF && t >= Z.RELIEF) {
            this.sqv += 2.6; // phew! a happy little spring up
            UA.Audio.chirp(780);
            UA.FX.hearts(this.center(new V3()), 2);
          }
          if (t >= Z.END) {
            this.poopT = -1;
            this.idleT = 0;
          }
        }
      }
      // smoothed poses, so everything eases in and out
      const g = this.poopT;
      const lift = g >= 0 && g < Z.RELIEF ? 1 : 0;
      const squat = g >= 0 && g < Z.RELIEF - 0.15 ? 1 : 0;
      const look = g >= Z.LOOK0 && g < Z.LOOK1 ? this.poopSide : 0;
      this.poopLift = UA.damp(this.poopLift, lift, lift ? 7 : 6, dt);
      this.poopSquat = UA.damp(this.poopSquat, squat, squat ? 8 : 9, dt);
      this.poopLook = UA.damp(this.poopLook, look, 6, dt);
    }

    castMagic() {
      if (this.magicCd > 0) return false;
      const sp = UA.Magic ? UA.Magic.current() : null;
      const id = sp ? sp.id : 'sparkle';
      this.magicCd = sp ? sp.cd : 1.1;
      this.hornGlow = 1;
      const tip = this.hornTip(new V3());
      UA.Look.burst(tip, id === 'sparkle' ? 34 : 18);
      UA.Look.sparkles(tip, 18, 1.2, 0.5, UA.Look.hornCol());
      UA.Audio.sparkle();
      if (id === 'sparkle') {
        UA.FX.growFlowers(this.pos.x, this.pos.z, 9, 30);
        if (UA.Creatures) UA.Creatures.dazzle(this.pos, 16);
      } else UA.Magic.cast(id, this, tip);
      if (UA.Time) UA.Time.onCast(this);
      if (UA.onMagic) UA.onMagic();
      return true;
    }

    update(dt, input, camYaw) {
      const W = UA.World;
      this.time += dt;
      this.magicCd = Math.max(0, this.magicCd - dt);
      this.hornGlow = Math.max(0, this.hornGlow - dt * 1.1);
      this.boost = Math.max(0, this.boost - dt);
      if (this.sizeT > 0) {
        this.sizeT -= dt;
        if (this.sizeT <= 0) {
          this.sizeTarget = 1;
          UA.FX.puff(this.pos, 12, 0xffffff);
          if (UA.UI) UA.UI.toast('Back to normal size<small>That was fun!</small>', 2400);
        }
      }
      this.size = UA.damp(this.size, this.sizeTarget, 3, dt);

      // --- desired direction relative to camera ---
      const fx = Math.sin(camYaw),
        fz = Math.cos(camYaw);
      const rx = -Math.cos(camYaw),
        rz = Math.sin(camYaw);
      const dx = fx * input.y + rx * input.x,
        dz = fz * input.y + rz * input.x;
      const mag = Math.min(1, Math.hypot(input.x, input.y));
      const wantYaw = mag > 0.08 ? Math.atan2(dx, dz) : this.yaw;

      // on a rail (the ice slide): the slide moves the unicorn, everything else here is skipped
      const railing = !!(this.rail && this.rail.active);
      if (railing) {
        this.rail.step(this, dt, input, camYaw);
        this.dir.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
        this.inWater = false;
      } else {
      // --- speed ---
      const maxSpd = (input.gallop ? 18 : 10.5) * (this.boost > 0 ? 1.55 : 1);
      let target = mag > 0.08 ? maxSpd * (0.3 + 0.7 * mag) : 0;
      if (this.boost > 0 && mag > 0.08) target = Math.max(target, 20);
      if (mag > 0.08) {
        const err = Math.abs(UA.angleDiff(this.yaw, wantYaw));
        target *= 1 - 0.5 * UA.smoothstep(0.7, 2.8, err);
      }
      if (this.gliding) target = Math.max(target, 11.5);
      if (!this.grounded) target = Math.max(target, this.speed * 0.985);
      const rate = this.grounded ? (target > this.speed ? 26 : 38) : 6;
      this.speed += UA.clamp(target - this.speed, -rate * dt, rate * dt);
      if (this.dbgSpeed !== undefined) this.speed = this.dbgSpeed; // test hook: pin the speed

      // --- turning ---
      const turnRate = this.grounded ? (this.speed > 13 ? 3.6 : 6.2) : 2.6;
      const boost = this.speed < 2 ? 1.6 : 1;
      const dyaw = UA.clamp(UA.angleDiff(this.yaw, wantYaw), -turnRate * boost * dt, turnRate * boost * dt);
      if (mag > 0.08) this.yaw += dyaw;
      this.yawRate = UA.damp(this.yawRate, dt > 0 ? dyaw / dt : 0, 10, dt);

      // --- horizontal move ---
      const dirX = Math.sin(this.yaw),
        dirZ = Math.cos(this.yaw);
      this.dir.set(dirX, 0, dirZ);
      let step = this.speed * dt;
      if (this.dbgStatic) step = 0; // test hook: animate in place
      const gHere = this.gAt(this.pos.x, this.pos.z);
      if (this.grounded) {
        const gAhead = this.gAt(this.pos.x + dirX * 1.5, this.pos.z + dirZ * 1.5);
        const slope = (gAhead - gHere) / 1.5;
        if (slope > 0) step *= 1 - UA.clamp(slope * 0.25, 0, 0.4);
        if (slope > 1.15) step *= 0.15; // too steep to climb
      }
      const water = this.grounded && !this.walkOnWater && W.inWater(this.pos.x, this.pos.z);
      if (water) step *= 0.78;
      this.pos.x += dirX * step;
      this.pos.z += dirZ * step;

      // trees, mushrooms (near the ground) and town buildings (at any height, unless you are up on top of them)
      const gTerr = W.groundAt(this.pos.x, this.pos.z);
      const roofY = UA.Town && UA.Town.surfaceAt ? UA.Town.surfaceAt(this.pos.x, this.pos.z) : -Infinity;
      const onTop = roofY > gTerr + 1 && this.pos.y >= roofY - 0.6;
      const gBase = this.walkOnWater ? Math.max(gTerr, C.WATER_Y + 0.02) : gTerr;
      if (W.resolve(this.pos, 0.85 * this.size, this.pos.y - 0.3, this.pos.y - gBase < 2.4, onTop) && this.grounded) this.speed *= 0.9;
      // keep inside the world
      if (W.clampPlay(this.pos)) this.speed *= 0.85;

      // --- jump / flap / glide ---
      const gNow = this.gAt(this.pos.x, this.pos.z);
      if (this.grounded) this.coyote = 0.12;
      else this.coyote = Math.max(0, this.coyote - dt);
      if (input.jumpPressed) {
        if (this.grounded || this.coyote > 0) {
          this.vy = (13.2 + (this.speed > 13 ? 1.6 : 0)) * (1 + (this.size - 1) * 0.3);
          this.grounded = false;
          this.coyote = 0;
          this.flapUsed = false;
          this.airTime = 0;
          UA.Audio.jump();
          UA.FX.puff(this.pos, 5, 0xffffff);
          this.sqv += 3.6; // spring up tall
          UA.Look.ring(this.pos, 7, 3);
        } else if (!this.flapUsed) {
          this.vy = Math.max(this.vy, 0) + 9.5;
          this.sqv += 2.0;
          this.flapUsed = true;
          this.flapKick = 1;
          UA.Audio.flap();
          UA.FX.sparkles(this.center(new V3()), 10, 0xffffff, 2, 0);
        }
      }
      if (!this.grounded) {
        this.airTime += dt;
        this.vy -= 26 * dt;
        this.gliding = input.jumpHeld && this.vy < 0.5 && this.airTime > 0.22;
        if (this.gliding) this.vy = Math.max(this.vy, this.hasStar ? -1.4 : -2.4);
        const prevY = this.pos.y;
        this.pos.y += this.vy * dt;
        this.jumpHeld = input.jumpHeld;
        if (this.vy < 0 && UA.Wonders && UA.Wonders.bounce(this, prevY)) {
          this.pos.y = Math.max(this.pos.y, gNow);
        } else if (this.pos.y <= gNow) {
          const hard = this.vy < -9;
          this.sqv += UA.clamp(this.vy * 0.4, -6.2, 0); // squash flat on landing, harder falls squash more
          if (this.vy < -5) UA.Look.ring(this.pos, Math.round(8 + UA.clamp(-this.vy, 0, 16)), 3 + UA.clamp(-this.vy * 0.25, 0, 5)); // a ring of her sparkles
          this.pos.y = gNow;
          this.grounded = true;
          this.gliding = false;
          if (hard) {
            UA.Audio.land();
            UA.FX.puff(this.pos, 8, 0xffffff);
            if (this.size > 1.3) UA.FX.puff(this.pos, 14, 0xfff0f8);
          }
          this.vy = 0;
        }
      } else {
        this.gliding = false;
        // fall off ledges
        if (this.pos.y > gNow + 0.35) {
          this.grounded = false;
          this.flapUsed = false;
          this.airTime = 0.2;
        } else {
          this.pos.y = UA.damp(this.pos.y, gNow, 24, dt);
          if (Math.abs(this.pos.y - gNow) < 0.02) this.pos.y = gNow;
        }
      }
      this.inWater = water;
      if (water && this.speed > 3) {
        this.splashT -= dt;
        if (this.splashT <= 0) {
          this.splashT = 0.14;
          UA.FX.splash(new V3(this.pos.x, UA.C.WATER_Y, this.pos.z), 4);
          if (Math.random() < 0.35) UA.Audio.splash();
        }
      }
      }

      // idle gag: any input at all counts as "not idle"
      this.updatePoop(
        dt,
        railing || mag > 0.08 || input.jumpPressed || input.jumpHeld || input.magic || input.spell || input.pet || input.feed || input.play || input.next || input.view || input.quality || input.book || input.help || input.time || input.pick >= 0 || !!input.camDX || !!input.camDY || !!input.zoom
      );

      // apply transform, then pose the rig, then let the hair catch up with the new pose
      this.root.position.copy(this.pos);
      this.root.rotation.y = this.yaw;
      {
        // cartoon squash and stretch about the hooves: stretched a little in the air, squashed on landing, a gentle idle bounce
        const idle = this.grounded && this.speed < 1.2 ? Math.sin(this.time * 2.6) * 0.012 : 0;
        const stretch = this.grounded ? 0 : UA.clamp(Math.abs(this.vy) * 0.009, 0, 0.1);
        this.sqv += (-170 * (this.sq - stretch - idle) - 11.5 * this.sqv) * dt;
        this.sq = UA.clamp(this.sq + this.sqv * dt, -0.3, 0.3);
      }
      const vs = this.size * this.scaleK;
      this.root.scale.set(vs * (1 - this.sq * 0.5), vs * (1 + this.sq), vs * (1 - this.sq * 0.5));
      this.animate(dt, mag);
      this.root.updateMatrixWorld(true);
      this.vel.set(this.dir.x * this.speed, this.vy, this.dir.z * this.speed);
      this.P.hair.update(dt, this.vel, UA.clamp(this.speed / 18, 0, 1), this.time);
      this.effects(dt, input);
      if (UA.GlitterPoop) UA.GlitterPoop.update(dt, this);

      const sh = this.P.shadow;
      sh.position.set(this.pos.x, Math.max(railing ? this.rail.surfaceY + 0.12 : this.gAt(this.pos.x, this.pos.z), this.pos.y - 40) + 0.08, this.pos.z);
      const h = this.pos.y - sh.position.y;
      const s = 1 - UA.clamp(h / 14, 0, 0.7);
      sh.scale.set(3.4 * s * this.size * this.scaleK, 4.6 * s * this.size * this.scaleK, 1);
      sh.rotation.z = -this.yaw;
      sh.rotation.order = 'YXZ';
      sh.rotation.set(-Math.PI / 2, 0, 0);
      sh.rotation.z = this.yaw;
    }

    animate(dt, mag) {
      const P = this.P,
        t = this.time;
      const spd = Math.max(0, this.speed);
      const spdFrac = UA.clamp(spd / 18, 0, 1);
      const air = !this.grounded;
      this.airBlend = UA.damp(this.airBlend, air ? 1 : 0, 14, dt);
      const ab = this.airBlend;

      // ---- which gait, and how fast the legs cycle ----
      this.gs = UA.damp(this.gs, spd, 9, dt);
      const G = gaitAt(this.gs);
      const mv = UA.smoothstep(0.25, 1.4, spd) * (1 - ab); // 0 standing still, 1 travelling on the ground
      this.phase = (this.phase + G.f * dt * mv) % 1;
      const ph = this.phase;
      const S = Math.min(1.75, (spd * G.d) / G.f); // how far each hoof travels back while on the ground

      // ---- body: slope pitch, then the pose that keeps hooves reachable ----
      const rigY0 = this.rig.position.y;
      let pitchT = 0;
      if (!air) {
        const hF = this.gAt(this.pos.x + Math.sin(this.yaw) * 1.2, this.pos.z + Math.cos(this.yaw) * 1.2);
        const hB = this.gAt(this.pos.x - Math.sin(this.yaw) * 1.2, this.pos.z - Math.cos(this.yaw) * 1.2);
        pitchT = -Math.atan2(hF - hB, 2.4) * 0.9;
      } else {
        pitchT = this.gliding ? 0.14 : -UA.clamp(this.vy * 0.025, -0.28, 0.3);
      }
      if (this.rail && this.rail.active) pitchT = this.rail.pitch; // lying along the chute
      const rollT = UA.clamp(-this.yawRate * 0.045 * (0.4 + spdFrac), -0.3, 0.3);
      this.roll = UA.damp(this.roll, rollT, 8, dt);

      // hooves on the ground right now (stance), per leg. s = where the leg is in its cycle, 0 = touchdown
      let supNow = 0;
      const sw = this.stW,
        legs = P.legs;
      const zc = [G.ext * mv, G.ext * mv, -G.ext * 0.4 * mv, -G.ext * 0.4 * mv];
      const sl = new Array(4);
      for (let i = 0; i < 4; i++) {
        const s = (ph + G.off[i]) % 1;
        sl[i] = s;
        const inStance = s < G.d ? 1 : 0;
        // standing still: all four hooves down
        const w = mv > 0.02 ? inStance : 1;
        sw[i] = UA.damp(sw[i], w * (1 - ab), 30, dt);
        supNow += sw[i];
        if (this.legPrev[i] > s + 0.5 && mv > 0.5 && !air) this.footQ.push(i);
        this.legPrev[i] = s;
      }
      this.sup = UA.damp(this.sup, supNow, 24, dt);
      // the body drops a little while it travels (so planted legs can reach), and springs up between landings
      const reachNeed = (HIP_Y - FEET_Y) - Math.sqrt(Math.max(0.2, 1.66 * 1.66 - (S / 2 + G.ext) * (S / 2 + G.ext)));
      const crouchT = Math.max(0, reachNeed) * mv;
      this.crouch = UA.damp(this.crouch, crouchT, 14, dt);
      const bounce = (1 - Math.min(this.sup, 2) / 2) * G.sup * mv;
      const frontSup = sw[0] + sw[1],
        rearSup = sw[2] + sw[3];
      const slope = pitchT;
      pitchT = slope + (frontSup - rearSup) * G.pit * mv * 0.5;
      this.pitch = UA.damp(this.pitch, pitchT, 12, dt);
      const breathe = Math.sin(t * 2.2) * 0.012;
      // landing squash after a jump
      this.rig.position.y = -this.crouch - this.poopSquat * 0.3 + bounce + breathe * 0.5 - (air ? 0 : 0);
      this.rig.rotation.x = this.pitch;
      this.rig.rotation.z = this.roll;
      const bobY = this.rig.position.y;

      // spine: arches when the legs gather under it, hollows when they stretch; bends into turns
      const archT = G.arch * Math.cos((ph - G.archPh) * 6.2832) * mv + (air ? (this.gliding ? -0.05 : 0.04) : 0) * ab;
      this.arch = UA.damp(this.arch, archT, 16, dt);
      const bendT = UA.clamp(this.yawRate * 0.075, -0.3, 0.3) * UA.clamp(spd / 6, 0.2, 1);
      this.bend = UA.damp(this.bend, bendT, 10, dt);
      P.shapeBody(this.arch, this.bend, breathe);
      const aa = this.arch,
        bb = this.bend;

      // ---- legs: aim each fetlock at its footstep, solve the knee ----
      const sp = Math.sin(this.pitch),
        cp = Math.cos(this.pitch);
      const vyN = UA.clamp(this.vy / 12, -1, 1),
        asc = (vyN + 1) / 2;
      for (let i = 0; i < 4; i++) {
        const leg = legs[i],
          u = leg.userData,
          spec = u.spec;
        const front = spec.fwd;
        const s = sl[i];
        let zOff = 0,
          lift = 0,
          stand = 1;
        if (mv > 0.02) {
          if (s < G.d) {
            const k = s / G.d;
            zOff = zc[i] + S * (0.5 - k);
            const roll = Math.max(0, (k - 0.82) / 0.18);
            lift = roll * roll * 0.07 * G.lift;
            stand = 1 - roll * 0.7;
          } else {
            const uu = (s - G.d) / (1 - G.d);
            const e = uu * uu * (3 - 2 * uu);
            zOff = zc[i] + S * (e - 0.5);
            lift = G.lift * mv * Math.pow(Math.sin(uu * Math.PI), 0.85);
            stand = UA.smoothstep(0.82, 1, uu) * 0.8;
          }
        }
        // ground pose
        let tz = spec.z + zOff;
        let ty = FEET_Y + lift;
        // air pose: tucked while rising, reaching while falling, stretched out when gliding
        if (ab > 0.01) {
          let az, ay;
          if (this.gliding) {
            az = spec.z + (front ? 0.95 : -0.95);
            ay = front ? 0.95 : 1.05;
          } else if (front) {
            az = spec.z + UA.lerp(0.5, 0.55, asc);
            ay = UA.lerp(0.62, 1.05, asc);
          } else {
            az = spec.z + UA.lerp(-0.15, -0.7, asc);
            ay = UA.lerp(0.5, 0.9, asc);
          }
          ay += Math.sin(t * 5 + i * 1.7) * 0.05 * ab;
          tz = UA.lerp(tz, az, ab);
          ty = UA.lerp(ty, ay, ab);
          stand *= 1 - ab;
        }
        // keep the hoof planted in the world even though the rig bobs and pitches
        const hx = spec.x + P.spineX(spec.z, bb);
        const hy = HIP_Y + P.spineY(spec.z, aa);
        const tyRig = (ty - bobY + tz * sp) / cp;
        const ik = UA.Rig.ik2(u.l1, u.l2, tyRig - hy, tz - spec.z, front);
        const dng = front ? -0.5 : 0.45;
        const foot = ik[1] + (0 - ik[1]) * stand + dng * (1 - stand) * (1 - ab * 0.4) + this.pitch * stand;
        leg.position.set(hx, hy, spec.z);
        leg.rotation.x = -ik[0];
        u.knee.rotation.x = ik[0] - ik[1];
        u.foot.rotation.x = ik[1] - foot;
      }

      // ---- neck, head, spine details ----
      const nod = G.nod * Math.cos((G.nodN * ph - G.nodPh) * 6.2832) * mv;
      const reach = spdFrac * 0.16; // neck stretches forward at speed
      P.neck.rotation.x = reach - nod + Math.sin(t * 1.3) * 0.015 - (this.gliding ? 0.2 : 0) - ab * 0.1 + this.pitch * -0.4;
      P.neck2.rotation.x = -0.12 + nod * 0.7 + Math.sin(t * 1.1 + 1) * 0.02;
      P.head.rotation.x = 0.05 - (P.neck.rotation.x + P.neck2.rotation.x) * 0.55 + Math.sin(t * 0.9) * 0.02;
      const turnLook = UA.clamp(this.yawRate * 0.1, -0.4, 0.4);
      P.neck.rotation.y = UA.damp(P.neck.rotation.y, turnLook * 0.6 + this.poopLook * 0.55, 8, dt);
      P.head.rotation.y = UA.damp(P.head.rotation.y, turnLook * 0.5 + this.poopLook * 0.5 + Math.sin(t * 0.6) * 0.05 * (1 - spdFrac), 8, dt);
      P.head.rotation.z = -this.roll * 0.6;
      P.neck.position.set(P.spineX(0.8, bb), 1.95 + P.spineY(0.8, aa), 0.8);
      P.saddle.position.set(P.spineX(0.12, bb), P.spineY(0.12, aa), 0.12);
      P.cutie[0].position.set(-0.56 + P.spineX(-0.4, bb), 1.85 + P.spineY(-0.4, aa), -0.4);
      P.cutie[1].position.set(0.56 + P.spineX(-0.4, bb), 1.85 + P.spineY(-0.4, aa), -0.4);
      // ears flick back with speed
      P.ears.forEach((e, i) => {
        e.rotation.x = -0.1 - spdFrac * 0.5 - this.poopLift * 0.35 + Math.sin(t * 5 + i * 2) * 0.03;
      });
      // blink (and screw her eyes shut while she concentrates)
      const blink = Math.sin(t * 0.8) > 0.985 || (t % 4.3) > 4.2 || (this.poopT >= 0 && this.poopT < POOP.RELIEF - 0.1 && this.poopLift > 0.3) ? 0.1 : 1;
      P.eyes.forEach((e) => (e.scale.y = 0.2 * 1.2 * blink));
      // tail carriage: held higher the faster we go, with a lazy swish when we stand
      const tailUp = 0.1 + spdFrac * 0.55 + (this.gliding ? 0.1 : 0) + this.poopLift * 0.95;
      const shiver = this.poopLift > 0.05 && this.poopT < POOP.RELIEF ? Math.sin(t * 46) * 0.035 * this.poopLift : 0; // she is concentrating
      P.tailRoot.rotation.x = UA.damp(P.tailRoot.rotation.x, tailUp + Math.sin(ph * 6.2832 + 1) * 0.08 * mv, 8, dt);
      P.tailRoot.rotation.y = Math.sin(t * 0.9) * 0.15 * (1 - spdFrac) * (1 - this.poopLift) + Math.sin(t * 2.3) * 0.02 + shiver;
      P.tailRoot.position.set(P.spineX(-1.28, bb), 2.08 + P.spineY(-1.28, aa), -1.28);

      // wings
      this.flapKick = Math.max(0, this.flapKick - dt * 2.2);
      const open = this.gliding || this.flapKick > 0 ? 1 : 0;
      this.wingOpen = UA.damp(this.wingOpen, open, open ? 14 : 5, dt);
      const flap = this.gliding ? Math.sin(t * 5) * 0.12 + 0.25 : Math.sin(this.flapKick * 14) * 0.7 * this.flapKick + 0.1;
      P.wings.forEach((w) => {
        const sc = Math.max(0.001, this.wingOpen);
        w.scale.set(w.userData.side * sc, sc, sc);
        w.visible = this.wingOpen > 0.02;
        w.rotation.z = w.userData.side * flap;
        w.position.y = 2.3 + P.spineY(0.12, aa);
      });
      // horn glow
      coatU.time.value = t;
      if (P.hornStar) {
        const tw = 0.62 + 0.28 * Math.sin(t * 4.1) + 0.1 * Math.sin(t * 9.3);
        const hsz = (tw + this.hornGlow * 1.3) * 0.8;
        P.hornStar.scale.set(hsz, hsz, 1);
        P.hornStar.material.rotation = t * 0.5;
        P.hornStar.material.opacity = 0.75 + this.hornGlow * 0.25;
      }
      P.hornMat.emissiveIntensity = 0.25 + this.hornGlow * 1.4;
      const hs = (1 + this.hornGlow * 0.12) * (0.55 + this.hornK * 0.45); // (a longer horn is a little thicker too)
      P.horn.scale.set(hs, (1 + this.hornGlow * 0.1) * this.hornK, hs);
    }

    // star glitter pops from a hoof the moment it lands
    footfall(i, sf) {
      const fx = UA.FX,
        s = this.size;
      const dx = this.dir.x,
        dz = this.dir.z;
      const foot = this.P.legs[i].userData.foot;
      const w = foot.getWorldPosition(new V3());
      const wy = this.gAt(w.x, w.z) + 0.12 * s;
      const n = sf > 0.75 ? 3 : 2;
      for (let k = 0; k < n; k++) {
        fx.emit({
          x: w.x,
          y: wy,
          z: w.z,
          vx: (Math.random() - 0.5) * 2.6 - dx * 2.2,
          vy: 1.8 + Math.random() * 2,
          vz: (Math.random() - 0.5) * 2.6 - dz * 2.2,
          color: UA.Look.col(),
          size: (0.5 + Math.random() * 0.5) * (0.8 + s * 0.2),
          shape: UA.Look.shape(),
          life: 0.6 + Math.random() * 0.5,
          grow: -0.7,
          gravity: 6.5,
          drag: 0.8,
          twinkle: 12 + Math.random() * 10,
        });
      }
      // a tiny pastel puff of glitter dust
      fx.emit({ x: w.x, y: wy, z: w.z, vx: -dx * 1.2, vy: 0.5, vz: -dz * 1.2, color: 0xfff0fa, size: 0.3 * s, shape: 0, life: 0.45, grow: 1.4, gravity: 0, drag: 2.5 });
    }
    // glitter that drifts off the mane and tail and floats up as you run
    shedGlitter(sf) {
      const fx = UA.FX,
        s = this.size;
      const dx = this.dir.x,
        dz = this.dir.z;
      const Ls = this.P.hair.locks;
      const L = Ls[Math.random() < 0.7 ? Ls.length - 1 - ((Math.random() * 9) | 0) : (Math.random() * (Ls.length - 11)) | 0];
      if (!L || !L.init) return;
      const k = 2 + ((Math.random() * (L.n - 2)) | 0);
      fx.emit({
        x: L.p[k * 3],
        y: L.p[k * 3 + 1],
        z: L.p[k * 3 + 2],
        vx: -dx * 2.2 * sf + (Math.random() - 0.5) * 1.2,
        vy: 0.5 + Math.random() * 1.2,
        vz: -dz * 2.2 * sf + (Math.random() - 0.5) * 1.2,
        color: UA.Look.col(),
        size: (0.36 + Math.random() * 0.5) * (0.85 + s * 0.15),
        shape: UA.Look.shape(),
        life: 0.8 + Math.random() * 0.7,
        grow: -0.75,
        gravity: -0.35,
        drag: 0.9,
        twinkle: 14 + Math.random() * 12,
      });
    }

    effects(dt, input) {
      const fx = UA.FX;
      const fast = this.speed > 13.5 && this.grounded;
      // hoof sparkles when galloping
      if (fast) {
        this.trailT -= dt;
        if (this.trailT <= 0) {
          this.trailT = 0.035;
          const tp = this.tailPos(new V3());
          UA.Look.trail(tp);
        }
      } else if (this.gliding) {
        this.trailT -= dt;
        if (this.trailT <= 0) {
          this.trailT = 0.03;
          UA.Look.trail(this.tailPos(new V3()));
          if (Math.random() < 0.3) UA.Look.sparkles(this.tailPos(new V3()), 1, 0.5, 0);
        }
      }
      // sparkle magic: star glitter from the hooves on every footfall, and shed from the mane and tail
      if ((this.grounded && this.speed > 8.5) || this.gliding) {
        const sf = this.gliding ? 0.7 : UA.clamp((this.speed - 8) / 10, 0.1, 1.3);
        if (this.grounded) for (const i of this.footQ) this.footfall(i, sf);
        this.shedT -= dt;
        if (this.shedT <= 0) {
          this.shedT = 0.075 - sf * 0.03;
          this.shedGlitter(sf);
        }
      }
      this.footQ.length = 0;
      // gear powers
      if (this.hasGarland && this.grounded && this.speed > 11) {
        this.trailF -= dt;
        if (this.trailF <= 0) {
          this.trailF = 0.14;
          fx.growFlowers(this.pos.x - this.dir.x * 2.2, this.pos.z - this.dir.z * 2.2, 0.9, 1);
        }
      }
      if (this.hasStar && this.gliding && Math.random() < dt * 14) {
        const tp = this.tailPos(new V3());
        fx.emit({ x: tp.x, y: tp.y, z: tp.z, vx: (Math.random() - 0.5) * 0.8, vy: -0.3, vz: (Math.random() - 0.5) * 0.8, color: 0xffe27a, size: 0.55, shape: 1, life: 1.1, grow: -0.7, gravity: 0.3, drag: 0.5 });
      }
      if (this.walkOnWater && this.grounded && UA.World.inWater(this.pos.x, this.pos.z) && this.speed > 0.8) {
        this.rippleT = (this.rippleT || 0) - dt;
        if (this.rippleT <= 0) {
          this.rippleT = 0.12;
          fx.emit({ x: this.pos.x, y: C.WATER_Y + 0.08, z: this.pos.z, color: UA.pick(C.RAINBOW), size: 1.1, shape: 0, life: 0.8, grow: 3, gravity: 0, drag: 2 });
          fx.sparkles(new V3(this.pos.x, C.WATER_Y + 0.3, this.pos.z), 2, undefined, 1.2, 1);
        }
      }
      // idle glitter from the horn
      this.glintT -= dt;
      if (this.glintT <= 0) {
        this.glintT = 0.35 + Math.random() * 0.6;
        const tip = this.hornTip(new V3());
        UA.Look.sparkles(tip, 1, 0.4, 0.2, UA.Look.hornCol());
      }
      // footfall dust at gallop
      if (this.grounded && this.speed > 9 && Math.random() < dt * 14) {
        fx.puff(new V3(this.pos.x + (Math.random() - 0.5) * 0.8, this.pos.y + 0.05, this.pos.z + (Math.random() - 0.5) * 0.8), 1, 0xfff6fb);
      }
    }
  };

  /* ---------- chase camera ----------
     Built so the distance to the unicorn stays steady: the camera sits at a fixed offset from a smoothed focus
     point, instead of trailing behind on its own spring. In the air the focus follows height slowly (flaps and hops
     do not bob the view), and nothing pulls the camera in while flying. */
  UA.ChaseCam = class ChaseCam {
    constructor(camera) {
      this.camera = camera;
      // two views. 'chase' (the default) is the over-the-shoulder view that follows behind the unicorn. 'top' is an
      // optional map view (V) that looks down from the south and never turns, so screen-up is always North and the
      // arrow keys read like a map: Up = North, Right = East. It hides much of the landscape, so it is not the default.
      this.mode = 'chase';
      this.views = { top: { pitch: 1.0, dist: 15 }, chase: { pitch: 0.33, dist: 12.5 } };
      this.yaw = 0;
      this.pitch = this.views.chase.pitch;
      this.dist = this.views.chase.dist;
      this.dEff = this.dist;
      this.dragIdle = 9;
      this.pos = new V3();
      this.look = new V3();
      this.focus = new V3();
      this.off = new V3();
      this.lookOff = new V3();
      this.clip = 1;
      this.sp = 0;
      this.inited = false;
    }
    snap(unicorn) {
      this.yaw = this.mode === 'top' ? Math.PI : unicorn.yaw;
      this.dEff = this.dist;
      this.effPitch = undefined;
      this.inited = false;
    }
    // The yaw the arrow keys are read against. Each new key press locks in "which way is that on screen right now", and
    // that stays fixed while the key is held, even though the view is turning to follow the unicorn. So Left means "go
    // to the left of what I see" and keeps going that way instead of curling round in a circle as the view turns.
    steerYaw(input) {
      if (this.mode !== 'chase' || !input.keyOnly || !(input.x || input.y)) {
        this.lat = null;
        return this.yaw;
      }
      const sig = Math.sign(input.x) + ',' + Math.sign(input.y);
      if (!this.lat || this.lat.sig !== sig) this.lat = { sig, yaw: this.yaw };
      return this.lat.yaw;
    }
    setMode(m) {
      if (m !== 'top' && m !== 'chase') m = 'top';
      if (m === this.mode) return this.mode;
      this.views[this.mode] = { pitch: this.pitch, dist: this.dist };
      this.mode = m;
      this.pitch = this.views[m].pitch;
      this.dist = this.views[m].dist;
      this.dragIdle = 9;
      return this.mode;
    }
    toggle() {
      return this.setMode(this.mode === 'top' ? 'chase' : 'top');
    }
    update(dt, uni, input) {
      const top = this.mode === 'top';
      if (top) {
        // north-up: dragging does not turn the view (little hands drag by accident), it just settles to face North
        this.yaw = UA.dampAngle(this.yaw, Math.PI, 5, dt);
        this.dragIdle += dt;
      } else if (input.camDX || input.camDY) {
        this.yaw -= input.camDX * 0.0055;
        this.pitch = UA.clamp(this.pitch + input.camDY * 0.0042, -0.05, 1.15);
        this.dragIdle = 0;
      } else this.dragIdle += dt;
      this.dist = top ? UA.clamp(this.dist + input.zoom, 8, 28) : UA.clamp(this.dist + input.zoom, 6, 26);
      this.dEff = UA.damp(this.dEff, this.dist, 4, dt);
      const sz = (uni.size || 1) * (uni.scaleK || 1);
      const dist = this.dEff * (1 + (sz - 1) * 0.9);
      // swing behind the unicorn (chase view only)
      if (!top) {
        // Arrow keys: whichever way the child pushes (Up, Left, Right or Down), the view turns round behind the
        // unicorn so they always see where they are heading, and it keeps turning for a moment after the key is let
        // go so the next push starts from a view that matches how the unicorn is facing
        const steering = !!(input.keyOnly && (input.x || input.y));
        if (steering) this.settle = 2.4;
        else this.settle = Math.max(0, (this.settle || 0) - dt);
        if (this.dragIdle > 1.1) {
          if (uni.rail && uni.rail.active) {
            this.yaw = UA.dampAngle(this.yaw, uni.yaw, 3.4, dt); // on the ice slide the view runs down the chute behind you
          } else if (steering || this.settle > 0) {
            const err = UA.angleDiff(this.yaw, uni.yaw);
            this.yaw += UA.clamp(err * 3, -2.2, 2.2) * dt;
          } else if (uni.speed > 2.5) {
            // gamepad and touch stick: the gentle swing while running forward
            const k = UA.clamp(0.35 + input.y, 0, 1);
            this.yaw = UA.dampAngle(this.yaw, uni.yaw, 1.5 * k, dt);
          }
        }
      }
      // smoothed focus point
      const fy = uni.pos.y + 2.5 * sz;
      if (!this.inited) {
        this.focus.set(uni.pos.x, fy, uni.pos.z);
        this.fs = fy;
      }
      // sideways the camera is locked to the unicorn: any lag along the direction of travel would change the
      // distance whenever the speed changes, which reads as the view pumping in and out
      this.focus.x = uni.pos.x;
      this.focus.z = uni.pos.z;
      // height: a slow spring (so hops and flaps do not bob the view) whose lag is softly capped, so a fast climb or
      // dive can never leave the camera far above or below the unicorn. That gap is what made the view zoom in and out.
      const lagMax = 1.25 * sz;
      this.fs += (fy - this.fs) * (1 - Math.exp(-(uni.grounded ? 7 : 2.6) * dt));
      this.fs = UA.clamp(this.fs, fy - lagMax * 3, fy + lagMax * 3);
      this.focus.y = fy - lagMax * Math.tanh((fy - this.fs) / lagMax);
      const tx = this.focus.x,
        ty = this.focus.y,
        tz = this.focus.z;
      const W = UA.World;
      const sy = Math.sin(this.yaw),
        cy = Math.cos(this.yaw);
      // on the ground: if something big is in the way, lift the camera over it, then pull it in a little.
      // in the air: fly straight through (tree crowns are soft puffs), so the view never jumps
      let bestP = this.pitch,
        wantClip = 1;
      if (uni.grounded) {
        let bestFree = -1;
        for (let k = 0; k < (top ? 1 : 4); k++) {
          const p = Math.min(1.25, this.pitch + k * 0.28);
          const c = Math.cos(p);
          const f = W.camClip(tx, ty, tz, tx - sy * c * dist, ty + Math.sin(p) * dist + 0.5, tz - cy * c * dist);
          if (f > bestFree + 0.001) {
            bestFree = f;
            bestP = p;
          }
          if (f >= 0.97) break;
        }
      }
      this.effPitch = this.effPitch === undefined ? bestP : UA.damp(this.effPitch, bestP, bestP > this.effPitch ? 3 : 1.6, dt);
      const cp = Math.cos(this.effPitch);
      const idealX = tx - sy * cp * dist;
      const idealZ = tz - cy * cp * dist;
      let idealY = ty + Math.sin(this.effPitch) * dist + 0.5;
      const ground = W.groundAt(idealX, idealZ) + 1.5;
      if (idealY < ground) idealY = ground;
      if (uni.grounded) {
        const free = W.camClip(tx, ty, tz, idealX, idealY, idealZ);
        wantClip = Math.max(0.7, free - 0.1);
      }
      this.clip = wantClip < this.clip ? UA.damp(this.clip, wantClip, 3.2, dt) : UA.damp(this.clip, wantClip, uni.grounded ? 1.4 : 2.2, dt);
      const useClip = Math.min(1, this.clip);
      const wx = tx + (idealX - tx) * useClip,
        wy = ty + (idealY - ty) * useClip,
        wz = tz + (idealZ - tz) * useClip;
      // the camera keeps a smoothed OFFSET from the focus (not a smoothed position), so riding along never lags
      if (!this.inited) {
        this.clip = wantClip;
        this.off.set(wx - tx, wy - ty, wz - tz);
        this.lookOff.set(0, 0, 0);
        this.inited = true;
      }
      const ko = 1 - Math.exp(-11 * dt);
      this.off.x += (wx - tx - this.off.x) * ko;
      this.off.y += (wy - ty - this.off.y) * ko;
      this.off.z += (wz - tz - this.off.z) * ko;
      this.pos.set(tx + this.off.x, ty + this.off.y, tz + this.off.z);
      const kl = 1 - Math.exp(-6 * dt);
      // map view: peek ahead only while moving, so a resting unicorn sits in the middle of the screen
      const ahead = top ? 3 * UA.clamp(uni.speed / 7, 0, 1) : 2;
      this.lookOff.x += (uni.dir.x * ahead - this.lookOff.x) * kl;
      this.lookOff.z += (uni.dir.z * ahead - this.lookOff.z) * kl;
      this.look.set(tx + this.lookOff.x, ty, tz + this.lookOff.z);
      // north-up view: slide the camera along with the look-ahead (never turn it), so Up on screen stays exactly North
      if (top) this.pos.set(this.pos.x + this.lookOff.x, this.pos.y, this.pos.z + this.lookOff.z);
      this.camera.position.copy(this.pos);
      this.camera.lookAt(this.look);
      // a gentle widening of the view at speed, from a smoothed speed so flaps and hops do not pump the zoom
      this.sp = UA.damp(this.sp, uni.speed, 1.2, dt);
      const fovT = (top ? 52 : 62) + UA.clamp((this.sp - 8) / 10, 0, 1) * (top ? 3 : 4) + (uni.rail && uni.rail.active ? 6 : 0);
      this.camera.fov = UA.damp(this.camera.fov, fovT, 2, dt);
      this.camera.updateProjectionMatrix();
    }
  };
})();
