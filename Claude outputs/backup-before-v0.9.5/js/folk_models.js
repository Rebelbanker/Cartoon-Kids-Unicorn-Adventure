/* Twinkle Town residents: model builders. Every resident is an upright chubby biped made of a handful of merged,
   vertex-coloured meshes (body, head, eyes, two arms, two legs, plus tail or wings when needed), all sharing one toon material.
   Model space: feet at y = 0, facing +z, about 2.3 units tall. Head parts are relative to the neck pivot (0, NECK, 0),
   eyes relative to (0, EYE) on the head, arms to the shoulder pivots, legs to the hip pivots. */
(function () {
  const UA = window.UA;
  const Town = UA.Town;
  const Acc = Town.Acc,
    GEO = Town.GEO;
  const M = (UA.FolkModels = {});
  const K = (M.K = { NECK: 1.5, EYE: 0.31, SHX: 0.52, SHY: 1.36, HIPX: 0.22, HIPY: 0.66, TAILY: 0.6, TAILZ: -0.42 });

  const LO = {
    sph: new THREE.SphereGeometry(1, 8, 6),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 9, 1),
    cone: new THREE.ConeGeometry(1, 1, 9, 1),
  };
  const ball = (A, c, x, y, z, rx, ry, rz) => A.geo(LO.sph, c, x, y, z, rx, ry === undefined ? rx : ry, rz === undefined ? rx : rz);
  const ballR = (A, c, x, y, z, rx, ry, rz, ex, ey, ez) => A.geo(LO.sph, c, x, y, z, rx, ry, rz, ex, ey, ez);
  const cyl = (A, c, x, y, z, r, h, rx, ry, rz) => A.geo(LO.cyl, c, x, y, z, r, h, r, rx, ry, rz);
  const cone = (A, c, x, y, z, r, h, rx, ry, rz) => A.geo(LO.cone, c, x, y, z, r, h, r, rx, ry, rz);
  const dome = (A, c, x, y, z, rx, ry, rz, ex, ey, ez) => A.geo(GEO.dome, c, x, y, z, rx, ry, rz, ex, ey, ez);
  const ring = (A, c, x, y, z, s, ex, ey, ez) => A.geo(GEO.tor, c, x, y, z, s, s, s, ex, ey, ez);
  M.ball = ball;
  M.cyl = cyl;
  M.cone = cone;

  const _up = new THREE.Vector3(0, 1, 0),
    _d = new THREE.Vector3(),
    _q = new THREE.Quaternion(),
    _e = new THREE.Euler();
  // add a geometry whose +y axis points along (dx, dy, dz)
  function aim(A, geo, col, x, y, z, dx, dy, dz, sx, sy, sz) {
    _d.set(dx, dy, dz).normalize();
    _q.setFromUnitVectors(_up, _d);
    _e.setFromQuaternion(_q);
    A.geo(geo, col, x, y, z, sx, sy, sz, _e.x, _e.y, _e.z);
  }

  M.parts = () => ({ body: new Acc(), head: new Acc(), eyes: new Acc(), armL: new Acc(), armR: new Acc(), legL: new Acc(), legR: new Acc(), tail: new Acc(), wingL: new Acc(), wingR: new Acc() });

  const DARK = 0x3b2a52;
  // shared base: torso, legs, arms, head, face
  function base(P, o) {
    const w = o.w || 1,
      B = P.body,
      H = P.head;
    B.sph(o.body, 0, 1.0, 0, 0.54 * w, 0.58, 0.47 * w, true);
    B.sph(o.body, 0, 0.74, 0, 0.47 * w, 0.32, 0.42 * w);
    if (o.belly) B.sph(o.belly, 0, 0.93, 0.31 * w, 0.36 * w, 0.42, 0.22, true);
    for (const s of [-1, 1]) {
      const Lg = s < 0 ? P.legL : P.legR,
        Ar = s < 0 ? P.armL : P.armR;
      cyl(Lg, o.legs, 0, -0.26, 0, 0.15, 0.5);
      ball(Lg, o.feet, 0, -0.54, 0.1, 0.19, 0.12, 0.28);
      cyl(Ar, o.arms, 0, -0.25, 0, 0.115, 0.52);
      ball(Ar, o.hands, 0, -0.56, 0, 0.15);
    }
    H.sph(o.head, 0, 0.25, 0.04, 0.58, 0.52, 0.54, true);
    if (!o.noCheeks) for (const s of [-1, 1]) ball(H, o.cheek, s * 0.36, 0.1, 0.4, 0.1, 0.07, 0.05);
    if (!o.noNose) ball(H, o.nose, 0, 0.19, 0.56, 0.07, 0.055, 0.05);
    if (!o.noMouth) {
      ball(H, 0x6a3f5c, 0, 0.085, 0.55, 0.022);
      for (const s of [-1, 1]) ball(H, 0x6a3f5c, s * 0.07, 0.105, 0.545, 0.02);
    }
    if (!o.noEyes) for (const s of [-1, 1]) {
      ball(P.eyes, o.eye || DARK, s * 0.2, 0, 0.5, 0.118, 0.155, 0.06);
      ball(P.eyes, 0xffffff, s * 0.2 + 0.035, 0.06, 0.55, 0.045, 0.045, 0.03);
      ball(P.eyes, 0xffffff, s * 0.2 - 0.04, -0.06, 0.55, 0.02, 0.02, 0.02);
    }
  }

  /* ---------- Pixel, the postal fox ---------- */
  function fox(P) {
    const OR = 0xffa24d,
      CR = 0xfff3e6;
    base(P, { body: OR, belly: CR, head: OR, legs: 0x8a5a44, feet: 0x7a4a3a, arms: OR, hands: CR, cheek: 0xff8f8f, nose: 0x4a3040, noNose: true });
    const H = P.head,
      B = P.body;
    ball(H, CR, 0, 0.13, 0.5, 0.24, 0.17, 0.2);
    ball(H, 0x4a3040, 0, 0.18, 0.7, 0.07, 0.055, 0.05);
    for (const s of [-1, 1]) {
      ball(H, CR, s * 0.4, 0.1, 0.28, 0.2, 0.17, 0.15);
      cone(H, OR, s * 0.47, 0.84, -0.04, 0.19, 0.58, 0, 0, -s * 0.38);
      cone(H, 0xffb8b8, s * 0.465, 0.82, 0.03, 0.1, 0.4, 0, 0, -s * 0.38);
    }
    // postman cap
    dome(H, 0x6aa8ff, 0, 0.58, 0.0, 0.5, 0.36, 0.5);
    H.box(0x4f86e0, 0, 0.6, 0.5, 0.52, 0.05, 0.32, 0.25);
    ball(H, 0xffd45e, 0, 0.77, 0.47, 0.09, 0.09, 0.04);
    // satchel and strap
    B.box(0x6aa8ff, -0.62, 0.78, 0.0, 0.24, 0.46, 0.56);
    B.box(0x4f86e0, -0.62, 1.0, 0.0, 0.26, 0.1, 0.58);
    B.box(0x4f86e0, -0.12, 1.12, 0.42, 0.1, 1.05, 0.04, 0, 0, -0.62);
    ball(B, 0xffd45e, -0.62, 1.0, 0.3, 0.05);
    // tail
    ball(P.tail, OR, 0, 0.05, -0.35, 0.3, 0.3, 0.55);
    ball(P.tail, CR, 0, 0.1, -0.8, 0.26, 0.26, 0.28);
    // a letter in the hand (thin axis = y so it faces forward when the arm is raised)
    P.armR.box(0xffffff, 0, -0.6, 0.16, 0.32, 0.03, 0.22);
    ball(P.armR, 0xff6f8f, 0, -0.585, 0.2, 0.045);
    return { top: 2.35 };
  }

  /* ---------- Baker Bun, the bunny ---------- */
  function bunny(P) {
    const W = 0xfffafa;
    base(P, { body: W, belly: 0xffd9e6, head: W, legs: 0xfff0f4, feet: 0xffe1ea, arms: W, hands: W, cheek: 0xffb3cb, nose: 0xff8fb0 });
    const H = P.head,
      B = P.body;
    for (const s of [-1, 1]) {
      ballR(H, W, s * 0.46, 0.98, -0.05, 0.14, 0.58, 0.1, 0, 0, -s * 0.32);
      ballR(H, 0xffb3cb, s * 0.455, 0.98, 0.03, 0.08, 0.44, 0.05, 0, 0, -s * 0.32);
    }
    H.box(0xffffff, 0, 0.12, 0.555, 0.1, 0.09, 0.03);
    // chef hat
    cyl(H, 0xffffff, 0, 0.82, 0.02, 0.34, 0.34);
    H.sph(0xffffff, 0, 1.06, 0.02, 0.45, 0.3, 0.45);
    ball(H, 0xffffff, 0.2, 1.22, 0.05, 0.26, 0.2, 0.26);
    ball(H, 0xffffff, -0.2, 1.2, -0.05, 0.25, 0.2, 0.25);
    H.box(0xff9fc4, 0, 0.7, 0.0, 0.7, 0.07, 0.7, 0, 0, 0);
    // apron
    B.box(0xff9fc4, 0, 0.9, 0.43, 0.7, 0.72, 0.08);
    B.box(0xff9fc4, 0, 1.32, 0.38, 0.4, 0.3, 0.07);
    B.box(0xffffff, 0, 0.78, 0.48, 0.3, 0.2, 0.03);
    B.box(0xff7fa8, 0, 1.22, 0.0, 1.12, 0.07, 0.92);
    ball(B, 0xffffff, 0, 0.7, -0.45, 0.24);
    // rolling pin
    cyl(P.armR, 0xe9bf9c, 0, -0.6, 0.12, 0.08, 0.72, 0, 0, Math.PI / 2);
    cyl(P.armR, 0xff9fc4, 0.4, -0.6, 0.12, 0.06, 0.12, 0, 0, Math.PI / 2);
    cyl(P.armR, 0xff9fc4, -0.4, -0.6, 0.12, 0.06, 0.12, 0, 0, Math.PI / 2);
    return { top: 2.5 };
  }

  /* ---------- Gumbo, the dragon candy-maker ---------- */
  function dragon(P) {
    const G = 0x7fdca0;
    base(P, { body: G, belly: 0xfff0b0, head: G, legs: 0x6cc98c, feet: 0x6cc98c, arms: G, hands: G, cheek: 0xff9ec9, nose: 0x3d7a5a, noNose: true, w: 1.12 });
    const H = P.head,
      B = P.body;
    ball(H, 0x9be8b4, 0, 0.13, 0.5, 0.3, 0.2, 0.24);
    for (const s of [-1, 1]) {
      ball(H, 0x2f6a4a, s * 0.09, 0.18, 0.72, 0.045);
      cone(H, 0xffd45e, s * 0.32, 0.83, -0.02, 0.11, 0.46, 0, 0, -s * 0.4);
    }
    for (let i = 0; i < 3; i++) cone(H, 0xff9ec9, 0, 0.8 - i * 0.02, -0.08 - i * 0.2, 0.08 - i * 0.012, 0.3, -0.7 - i * 0.2);
    [[1.52, -0.26], [1.26, -0.43], [1.0, -0.5], [0.76, -0.46]].forEach((p, i) => cone(B, 0xff9ec9, 0, p[0], p[1], 0.13 - i * 0.015, 0.4 - i * 0.04, -0.95));
    for (const s of [-1, 1]) ballR(B, 0xffb3d6, s * 0.42, 1.35, -0.42, 0.4, 0.3, 0.05, 0.1, s * 0.7, s * 0.35);
    // stripy apron
    for (let i = 0; i < 5; i++) B.box(i % 2 ? 0xffffff : 0xff9ec9, -0.32 + i * 0.16, 0.88, 0.51, 0.16, 0.66, 0.06);
    // tail
    ball(P.tail, G, 0, 0.0, -0.32, 0.3, 0.28, 0.46);
    ball(P.tail, G, 0, 0.1, -0.78, 0.2, 0.2, 0.32);
    ball(P.tail, 0xff9ec9, 0, 0.2, -1.12, 0.15, 0.17, 0.2);
    // giant lollipop in the left hand (stick along local +z; the swirl faces the viewer when the arm is raised)
    cyl(P.armL, 0xffffff, 0, -0.6, 0.5, 0.04, 0.9, Math.PI / 2);
    cyl(P.armL, 0xff7fb0, 0, -0.6, 1.0, 0.34, 0.07);
    cyl(P.armL, 0xffffff, 0, -0.6, 1.0, 0.24, 0.09);
    cyl(P.armL, 0xff7fb0, 0, -0.6, 1.0, 0.14, 0.11);
    return { top: 2.3 };
  }

  /* ---------- Professor Hoot, the owl librarian ---------- */
  function owl(P) {
    const BR = 0xb48a66;
    base(P, { body: BR, belly: 0xfff0d9, head: BR, legs: 0xf2a65a, feet: 0xf2a65a, arms: 0xa57a58, hands: 0xa57a58, noCheeks: true, noNose: true, noMouth: true, noEyes: true });
    const H = P.head,
      B = P.body,
      E = P.eyes;
    for (const s of [-1, 1]) {
      ballR(H, 0xfff0d9, s * 0.22, 0.31, 0.4, 0.27, 0.27, 0.13);
      ball(E, 0xffb347, s * 0.22, 0, 0.52, 0.17, 0.17, 0.05);
      ball(E, DARK, s * 0.22, 0, 0.56, 0.1, 0.1, 0.04);
      ball(E, 0xffffff, s * 0.22 + 0.04, 0.05, 0.595, 0.035, 0.035, 0.025);
      ring(H, 0xffd45e, s * 0.22, 0.31, 0.585, 0.215);
      cone(H, 0xa57a58, s * 0.38, 0.84, 0.0, 0.12, 0.42, 0, 0, -s * 0.4);
      cone(B, 0x8f6fe0, s * 0.14, 1.4, 0.42, 0.1, 0.24, 0, 0, s * Math.PI / 2);
      ballR(s < 0 ? P.armL : P.armR, 0x9b7050, 0, -0.3, -0.05, 0.08, 0.38, 0.2);
    }
    H.box(0xffd45e, 0, 0.33, 0.6, 0.12, 0.03, 0.03);
    cone(H, 0xf2a65a, 0, 0.14, 0.6, 0.1, 0.22, Math.PI / 2);
    ball(B, 0x8f6fe0, 0, 1.4, 0.43, 0.065);
    for (let r = 0; r < 3; r++) for (let c = -1; c <= 1; c++) ball(B, 0xf3dcc0, c * 0.2 + (r % 2 ? 0.1 : 0), 1.15 - r * 0.22, 0.4 - r * 0.02, 0.1, 0.08, 0.04);
    cone(P.tail, 0xa57a58, 0, -0.1, -0.2, 0.2, 0.5, -1.9);
    // book
    P.armL.box(0x8f6fe0, 0, -0.6, 0.24, 0.5, 0.1, 0.38);
    P.armL.box(0xfff4de, 0, -0.6, 0.24, 0.45, 0.115, 0.34);
    P.armL.box(0x6f4fc0, 0, -0.6, 0.24, 0.04, 0.12, 0.38);
    return { top: 2.35 };
  }

  /* ---------- Nimbus, the sleepy sheep innkeeper ---------- */
  function sheep(P) {
    const WL = 0xfffdf8;
    base(P, { body: WL, belly: 0xffffff, head: 0xffe3d3, legs: 0x7a6aa8, feet: 0x6f5a96, arms: WL, hands: 0x7a6aa8, cheek: 0xffb3cb, nose: 0xff9fb0, w: 1.1 });
    const H = P.head,
      B = P.body;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * 6.283 + (i % 2) * 0.2,
        y = 0.62 + ((i * 37) % 10) * 0.095;
      ball(B, i % 3 ? WL : 0xf1ecff, Math.cos(a) * 0.5, y, Math.sin(a) * 0.46 - 0.03, 0.25 + (i % 3) * 0.02);
    }
    ball(B, WL, 0, 0.7, -0.5, 0.26);
    for (const s of [-1, 1]) ballR(H, 0xf5c6b0, s * 0.6, 0.2, 0.0, 0.26, 0.1, 0.18, 0, 0, s * 0.55);
    ball(H, WL, 0, 0.78, 0.05, 0.3);
    ball(H, WL, -0.28, 0.7, 0.1, 0.22);
    ball(H, WL, 0.28, 0.7, 0.1, 0.22);
    // nightcap
    cyl(H, 0x6f8fe0, 0, 0.72, 0.0, 0.5, 0.14);
    cone(H, 0x8fb2ff, 0, 1.02, -0.12, 0.38, 0.8, -0.6);
    ball(H, 0xffffff, 0, 1.33, -0.38, 0.14);
    // pillow
    P.armR.box(0xffc0d9, 0, -0.6, 0.3, 0.62, 0.14, 0.44);
    P.armR.box(0xff9ec9, 0, -0.6, 0.3, 0.05, 0.16, 0.45);
    return { top: 2.5, eyeOpen: 0.55 };
  }

  /* ---------- Madame Maple, the hedgehog hat-maker ---------- */
  function hedgehog(P) {
    const CR = 0xffe6cf;
    base(P, { body: CR, belly: 0xfff6ea, head: CR, legs: 0xe8c6a4, feet: 0xb98763, arms: CR, hands: CR, cheek: 0xffb3a3, nose: 0x3a2a30, noNose: true });
    const H = P.head,
      B = P.body;
    // spikes on the back and the back of the head
    for (let k = 0; k < 26; k++) {
      const a = Math.PI * (0.62 + 0.76 * ((k * 7) % 13) / 12),
        y = 0.55 + (((k * 5) % 9) / 8) * 0.95;
      const x = Math.sin(a) * 0.46,
        z = Math.cos(a) * 0.42;
      aim(B, LO.cone, k % 3 ? 0x7a5236 : 0xa5754d, x, y, z, x * 1.4, (y - 1.0) * 0.7 + 0.1, z * 1.4, 0.13, 0.5, 0.13);
    }
    for (let k = 0; k < 7; k++) {
      const a = -0.9 + k * 0.3;
      aim(H, LO.cone, k % 2 ? 0x7a5236 : 0xa5754d, Math.sin(a) * 0.45, 0.55, -0.2 - Math.cos(a) * 0.15, Math.sin(a) * 0.8, 0.5, -0.9, 0.1, 0.38, 0.1);
    }
    ball(H, CR, 0, 0.12, 0.52, 0.22, 0.17, 0.22);
    ball(H, 0x3a2a30, 0, 0.16, 0.72, 0.07, 0.06, 0.06);
    for (const s of [-1, 1]) ball(H, 0xc9a07a, s * 0.52, 0.5, 0.0, 0.14, 0.14, 0.08);
    // big fancy hat
    cyl(H, 0xbf9bff, 0, 0.66, 0.0, 0.88, 0.07, -0.1, 0, 0.14);
    cyl(H, 0xbf9bff, 0, 0.92, 0.0, 0.44, 0.52);
    ball(H, 0xbf9bff, 0, 1.18, 0.0, 0.44, 0.2, 0.44);
    cyl(H, 0xff7fb0, 0, 0.75, 0.0, 0.455, 0.14);
    ball(H, 0xffd45e, 0.4, 0.86, 0.3, 0.1);
    for (let k = 0; k < 5; k++) ball(H, 0xff9ec9, 0.4 + Math.cos(k * 1.257) * 0.14, 0.86 + Math.sin(k * 1.257) * 0.14, 0.31, 0.09, 0.09, 0.05);
    ballR(H, 0x6fd8c8, -0.4, 1.12, -0.12, 0.06, 0.5, 0.12, 0, 0, 0.7);
    // measuring tape
    ring(B, 0xffd45e, 0, 1.42, 0.0, 0.5, Math.PI / 2);
    B.box(0xffd45e, 0.18, 1.1, 0.46, 0.1, 0.55, 0.03, 0, 0, -0.1);
    // a little pink hat
    cyl(P.armL, 0xff9ec9, 0, -0.6, 0.3, 0.3, 0.05, Math.PI / 2);
    cyl(P.armL, 0xff9ec9, 0, -0.6, 0.4, 0.18, 0.2, Math.PI / 2);
    ball(P.armL, 0xffffff, 0, -0.6, 0.52, 0.07);
    return { top: 2.45 };
  }

  /* ---------- Misty, the cloud-cat ice cream seller ---------- */
  function cat(P) {
    const BL = 0xeaf4ff;
    base(P, { body: BL, belly: 0xffffff, head: BL, legs: 0xdcecff, feet: 0xffffff, arms: BL, hands: 0xffffff, cheek: 0xffb3d0, nose: 0xff8fb0 });
    const H = P.head,
      B = P.body;
    for (const s of [-1, 1]) {
      A_ear(H, s, BL);
      for (let k = 0; k < 3; k++) H.box(0xb7c6dd, s * 0.56, 0.12 + k * 0.06, 0.44, 0.34, 0.014, 0.014, 0, s * 0.35, (k - 1) * 0.2 * s);
    }
    for (let k = 0; k < 8; k++) ball(B, k % 2 ? 0xffffff : 0xf3f9ff, Math.cos((k / 8) * 6.283) * 0.46, 1.42, Math.sin((k / 8) * 6.283) * 0.4, 0.21);
    // cone hat with scoops
    cone(H, 0xe8b878, 0, 0.9, 0.0, 0.24, 0.5, Math.PI);
    ball(H, 0xff9ec9, 0, 1.2, 0, 0.27);
    ball(H, 0xa6ec9a, 0, 1.42, 0, 0.22);
    ball(H, 0xff4f6f, 0, 1.62, 0, 0.08);
    // curly tail with a cloud tip
    ball(P.tail, BL, 0, 0.1, -0.3, 0.14, 0.14, 0.3);
    ball(P.tail, BL, 0, 0.38, -0.62, 0.13, 0.25, 0.14);
    ball(P.tail, 0xffffff, 0, 0.66, -0.7, 0.22);
    // ice cream cone (apex in the hand, scoops along local +z)
    cone(P.armR, 0xe8b878, 0, -0.6, 0.24, 0.17, 0.42, -Math.PI / 2);
    ball(P.armR, 0xff9ec9, 0, -0.6, 0.5, 0.2);
    ball(P.armR, 0xa6ec9a, 0, -0.6, 0.7, 0.18);
    ball(P.armR, 0xffe58a, 0, -0.6, 0.88, 0.15);
    return { top: 2.75 };
  }
  function A_ear(H, s, col) {
    H.geo(GEO.cone4, col, s * 0.38, 0.84, 0.0, 0.26, 0.46, 0.2, 0, 0, -s * 0.3);
    H.geo(GEO.cone4, 0xd9c8ff, s * 0.375, 0.82, 0.06, 0.15, 0.3, 0.12, 0, 0, -s * 0.3);
  }

  /* ---------- Petal, the flower fairy ---------- */
  function fairy(P) {
    base(P, { body: 0xffa3cf, belly: null, head: 0xffe3cf, legs: 0xffe3cf, feet: 0xff8fb8, arms: 0xffe3cf, hands: 0xffe3cf, cheek: 0xffa3a3, nose: 0xffc9b0, w: 0.82 });
    const H = P.head,
      B = P.body;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * 6.283;
      aim(B, LO.sph, k % 2 ? 0xffc2dc : 0xff8fb8, Math.cos(a) * 0.32, 0.68, Math.sin(a) * 0.3, Math.cos(a) * 0.8, -0.6, Math.sin(a) * 0.8, 0.14, 0.4, 0.2);
    }
    // green leafy hair and a flower crown
    ballR(H, 0x9fe3a0, 0, 0.44, -0.12, 0.63, 0.5, 0.58);
    ballR(H, 0x9fe3a0, -0.3, 0.62, 0.27, 0.3, 0.2, 0.2);
    ballR(H, 0x9fe3a0, 0.3, 0.62, 0.27, 0.3, 0.2, 0.2);
    for (let k = 0; k < 6; k++) ball(H, k % 2 ? 0xffc2dc : 0xff8fb8, Math.cos(k * 1.047) * 0.38, 0.84, Math.sin(k * 1.047) * 0.36 - 0.05, 0.13);
    ball(H, 0xffd45e, 0.34, 0.86, 0.3, 0.1);
    for (let k = 0; k < 5; k++) ball(H, 0xff8fb8, 0.34 + Math.cos(k * 1.257) * 0.14, 0.86 + Math.sin(k * 1.257) * 0.14, 0.31, 0.09, 0.09, 0.05);
    // wings
    for (const s of [-1, 1]) {
      const W = s < 0 ? P.wingL : P.wingR;
      ballR(W, 0xd9c8ff, s * 0.5, 0.32, 0, 0.5, 0.42, 0.035, 0, 0, s * 0.3);
      ballR(W, 0xaee3ff, s * 0.38, -0.12, 0, 0.34, 0.28, 0.035, 0, 0, -s * 0.3);
    }
    // wand with a star
    cyl(P.armR, 0x8f6fe0, 0, -0.6, 0.38, 0.035, 0.76, Math.PI / 2);
    ball(P.armR, 0xffd45e, 0, -0.6, 0.78, 0.1);
    cone(P.armR, 0xffd45e, 0, -0.6, 0.78, 0.07, 0.34, Math.PI / 2);
    cone(P.armR, 0xffd45e, 0, -0.6, 0.78, 0.07, 0.34, -Math.PI / 2);
    return { top: 2.3, wingPivot: [0.12, 1.32, -0.34], tip: [0, -0.6, 0.8] };
  }

  /* ---------- Wizzle, the gnome wand-maker ---------- */
  function gnome(P) {
    base(P, { body: 0x8f6fe0, belly: null, head: 0xffd2b0, legs: 0x6f5a96, feet: 0x4f3a76, arms: 0x8f6fe0, hands: 0xffd2b0, cheek: 0xffa3a3, nose: 0xffa08a, noNose: true, noMouth: true });
    const H = P.head,
      B = P.body;
    ball(H, 0xffa08a, 0, 0.19, 0.6, 0.14, 0.12, 0.12);
    // beard
    ball(H, 0xffffff, 0, -0.05, 0.38, 0.44, 0.42, 0.28);
    ball(H, 0xffffff, -0.3, 0.06, 0.34, 0.2, 0.26, 0.2);
    ball(H, 0xffffff, 0.3, 0.06, 0.34, 0.2, 0.26, 0.2);
    ball(B, 0xffffff, 0, 1.12, 0.38, 0.4, 0.55, 0.2);
    ball(B, 0xffffff, 0, 0.72, 0.38, 0.22, 0.3, 0.14);
    for (const s of [-1, 1]) H.box(0xffffff, s * 0.2, 0.46, 0.5, 0.26, 0.07, 0.07, 0, 0, -s * 0.15);
    // tall wizard hat
    cyl(H, 0x7a5cc9, 0, 0.7, 0.0, 0.7, 0.08);
    cone(H, 0x7a5cc9, 0, 1.0, -0.05, 0.5, 0.65, -0.12);
    cone(H, 0x7a5cc9, 0, 1.52, -0.28, 0.32, 0.6, -0.5);
    cyl(H, 0xffd45e, 0, 0.78, 0.0, 0.5, 0.1);
    [[0.3, 0.95, 0.34], [-0.3, 1.1, 0.25], [0.08, 1.35, 0.18], [-0.15, 1.52, -0.1]].forEach((p) => ball(H, 0xffd45e, p[0], p[1], p[2], 0.07));
    // robe stars and belt
    B.box(0xffd45e, 0, 0.82, 0.0, 1.0, 0.09, 0.88);
    [[-0.3, 1.1], [0.25, 0.6], [0.3, 1.2], [-0.2, 0.55]].forEach((p) => ball(B, 0xffd45e, p[0], p[1], 0.46, 0.06, 0.06, 0.03));
    // wand
    cyl(P.armR, 0x6f4a2a, 0, -0.6, 0.4, 0.035, 0.8, Math.PI / 2);
    ball(P.armR, 0xffd45e, 0, -0.6, 0.84, 0.11);
    cone(P.armR, 0xffd45e, 0, -0.6, 0.84, 0.07, 0.38, Math.PI / 2);
    cone(P.armR, 0xffd45e, 0, -0.6, 0.84, 0.07, 0.38, -Math.PI / 2);
    return { top: 3.0, tip: [0, -0.6, 0.86] };
  }

  /* ---------- Toby, the toadstool toy-maker ---------- */
  function toad(P) {
    const ST = 0xfff2d8;
    base(P, { body: ST, belly: 0xffffff, head: ST, legs: ST, feet: 0xc98f6a, arms: ST, hands: ST, cheek: 0xffb3a3, nose: 0xffc9b0 });
    const H = P.head;
    dome(H, 0xff6f8f, 0, 0.5, -0.02, 0.94, 0.64, 0.92);
    cyl(H, 0xffe1c7, 0, 0.5, -0.02, 0.9, 0.05);
    [[0.3, 0.6], [1.3, 0.35], [2.4, 0.6], [3.4, 0.4], [4.4, 0.62], [5.4, 0.35], [0.9, 0.9], [3.9, 0.95]].forEach((p) => {
      const th = p[0],
        ph = p[1];
      const x = 0.92 * Math.cos(ph) * Math.cos(th) * 0.97,
        y = 0.5 + 0.64 * Math.sin(ph) * 0.97,
        z = -0.02 + 0.92 * Math.cos(ph) * Math.sin(th) * 0.97;
      aim(H, LO.sph, 0xffffff, x, y, z, x / 0.85, (y - 0.5) / 0.41, (z + 0.02) / 0.85, 0.18, 0.06, 0.18);
    });
    return { top: 2.3 };
  }

  /* ---------- Mayor Marshmallow ---------- */
  function mayor(P) {
    const W = 0xfffaf2;
    base(P, { body: W, belly: 0xfff0f4, head: W, legs: W, feet: 0x6f5a96, arms: W, hands: W, cheek: 0xffc0a0, nose: 0xffb3a3, w: 1.15 });
    const H = P.head,
      B = P.body;
    cyl(H, 0x6f5a96, 0, 0.99, 0.0, 0.4, 0.72);
    cyl(H, 0x6f5a96, 0, 0.66, 0.0, 0.64, 0.07);
    cyl(H, 0xff8fb8, 0, 0.74, 0.0, 0.415, 0.15);
    H.box(0xffd45e, 0, 0.74, 0.41, 0.15, 0.13, 0.04);
    for (const s of [-1, 1]) {
      ballR(H, 0xc2865a, s * 0.15, 0.09, 0.54, 0.18, 0.07, 0.08, 0, 0, -s * 0.25);
      ball(H, 0xc2865a, s * 0.31, 0.14, 0.51, 0.06);
    }
    B.box(0xff8fb8, 0.0, 1.05, 0.46, 0.2, 1.3, 0.05, 0, 0, -0.62);
    ball(B, 0xffd45e, 0.3, 1.38, 0.48, 0.09, 0.09, 0.04);
    return { top: 2.75 };
  }

  /* ---------- the jelly-bean kids ---------- */
  function kid(P, idx, color) {
    const B = P.body;
    B.sph(color, 0, 0.74, 0, 0.5, 0.64, 0.46, true);
    ball(B, 0xffffff, -0.18, 0.95, 0.3, 0.12, 0.2, 0.08);
    for (const s of [-1, 1]) {
      ball(B, color, s * 0.2, 0.1, 0.12, 0.17, 0.1, 0.24);
      ball(B, color, s * 0.55, 0.62, 0.05, 0.13);
      ball(B, 0xff9ec0, s * 0.3, 0.76, 0.41, 0.09, 0.06, 0.04);
      ball(P.eyes, DARK, s * 0.16, 0, 0.43, 0.095, 0.125, 0.05);
      ball(P.eyes, 0xffffff, s * 0.16 + 0.03, 0.045, 0.475, 0.036, 0.036, 0.025);
      ball(P.eyes, 0xffffff, s * 0.16 - 0.03, -0.045, 0.475, 0.016, 0.016, 0.02);
    }
    ball(B, 0x6a3f5c, 0, 0.72, 0.455, 0.022);
    for (const s of [-1, 1]) ball(B, 0x6a3f5c, s * 0.06, 0.74, 0.45, 0.018);
    // little hats and bits
    const k = idx % 5;
    if (k === 0) {
      cyl(B, 0xffd45e, 0, 1.38, 0.0, 0.3, 0.1);
      B.box(0xff6f8f, 0, 1.5, 0, 0.62, 0.04, 0.1, 0, 0.4, 0);
      B.box(0x8fd2ff, 0, 1.5, 0, 0.62, 0.04, 0.1, 0, 2.0, 0);
    } else if (k === 1) {
      for (const s of [-1, 1]) cone(B, 0xff6f8f, s * 0.2, 1.36, 0.1, 0.17, 0.3, 0, 0, s * Math.PI / 2);
      ball(B, 0xff6f8f, 0, 1.36, 0.1, 0.07);
    } else if (k === 2) {
      cyl(B, 0xffe58a, 0, 1.38, 0, 0.04, 0.3);
      ball(B, 0xffd45e, 0, 1.58, 0, 0.14);
    } else if (k === 3) {
      for (let i = 0; i < 5; i++) cone(B, 0xffd45e, Math.cos(i * 1.257) * 0.22, 1.38, Math.sin(i * 1.257) * 0.2, 0.07, 0.3);
    } else {
      cyl(B, 0x7fd88a, 0, 1.36, 0, 0.03, 0.22);
      ball(B, 0xff8fb8, 0.07, 1.5, 0, 0.1);
      ball(B, 0xff8fb8, -0.07, 1.5, 0, 0.1);
      ball(B, 0xffd45e, 0, 1.5, 0.04, 0.06);
    }
    return { top: 1.7, kidEye: 0.88 };
  }

  M.fox = fox;
  M.bunny = bunny;
  M.dragon = dragon;
  M.owl = owl;
  M.sheep = sheep;
  M.hedgehog = hedgehog;
  M.cat = cat;
  M.fairy = fairy;
  M.gnome = gnome;
  M.toad = toad;
  M.mayor = mayor;
  M.kid = kid;
})();
