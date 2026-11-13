/* The Ice Castle (the buildings): a crystal palace on the flat summit of Frostglow Peak, built from faceted six-sided towers
   with glittering crystal roofs, a great hall with a snowflake window, a frozen fountain in a snowflake courtyard, a carpet
   to the door, and two frost gardens full of glowing crystal flowers. There are NO enclosing walls or gate towers: the
   grounds are open on every side, and the few solid things (the hall, the towers, the fountain, a handful of sculptures)
   are spaced so that nothing makes a pocket a unicorn could get stuck in.

   Local coordinates (the group sits at ICE.x, ICE.z): the summit's middle is (0, -120), the road arrives from the south
   at (0, -86), the hall's front face is z = -118 and the door faces the courtyard. Items stand on y = SUMMIT (the summit
   is level out to a radius of about 28); things further out follow the ground. */
(function () {
  const UA = window.UA,
    T = THREE,
    V3 = T.Vector3;
  const I = UA.ICE,
    Realm = UA.Realm,
    Ice = Realm.ice;
  const { M, trans } = Realm;
  const PI = Math.PI,
    TAU = Math.PI * 2;
  const P = Ice.P;
  const SUMMIT = Ice.SUMMIT;
  const HEXP = new T.CylinderGeometry(1, 1, 1, 6, 1);
  const HEXC = new T.ConeGeometry(1, 1, 6, 1);
  const HALF = new T.TorusGeometry(1, 0.1, 6, 24, PI);
  const R30 = PI / 6;

  Realm.buildIceCastle = function (ctx) {
    const { g, A, Wn, rnd, col, softCol, W } = ctx;
    const gy = (x, z) => W.heightAt(I.x + x, I.z + z);
    A.push(trans(0, SUMMIT, 0));
    Wn.push(trans(0, SUMMIT, 0));

    /* ----- little builders ----- */
    // an arched, glowing window facing yaw, centred at (px, py, pz)
    function archWin(px, py, pz, yaw, w, h) {
      Wn.push(M(px, py, pz, yaw));
      Wn.box(P.glass, 0, 0, 0.06, w, h, 0.3);
      Wn.cyl(P.glass, 0, h / 2, 0.06, w / 2, 0.3, PI / 2, 0, 0);
      Wn.pop();
      A.push(M(px, py, pz, yaw));
      A.box(P.deep, 0, 0, 0, w + 0.55, h + 0.2, 0.2);
      A.cyl(P.deep, 0, h / 2 + 0.05, 0, (w + 0.55) / 2, 0.2, PI / 2, 0, 0);
      A.box(P.ice2, 0, -h / 2 - 0.25, 0.22, w + 1.0, 0.3, 0.7);
      A.pop();
    }
    // a six-sided tower with a crystal roof, a pennant and a few windows
    function tower(x, z, r, h, roofC, roofH, o) {
      o = o || {};
      A.geo(HEXP, o.wallC || P.ice, x, h / 2, z, r, h, r, 0, R30, 0);
      for (const yy of o.bands || [h * 0.34, h * 0.68]) A.geo(HEXP, P.ice2, x, yy, z, r + 0.28, 0.5, r + 0.28, 0, R30, 0);
      A.geo(HEXP, P.ice2, x, h + 0.4, z, r + 0.7, 0.8, r + 0.7, 0, R30, 0);
      A.geo(HEXP, P.silver, x, h + 0.9, z, r + 0.8, 0.22, r + 0.8, 0, R30, 0);
      const baseY = h + 0.8;
      A.geo(HEXC, o.roof2 || roofC, x, baseY + 0.9, z, r + 1.9, 1.8, r + 1.9, 0, R30, 0);
      A.geo(HEXC, roofC, x, baseY + roofH / 2, z, r + 1.0, roofH, r + 1.0, 0, R30, 0);
      A.cyl(P.silver, x, baseY + roofH + 1.2, z, 0.08, 2.6);
      Wn.sph(P.cool, x, baseY + roofH + 0.1, z, 0.34, 0.5, 0.34);
      ctx.flag(x, SUMMIT + baseY + roofH + 2.2, z, o.flagC || 0x8fd2ff, 2.4, 1.3);
      const angs = o.angs || [0, PI / 2, -PI / 2];
      const wy = o.winY || h * 0.62;
      angs.forEach((a) => archWin(x + Math.sin(a) * (r * 0.87), wy, z + Math.cos(a) * (r * 0.87), a, 1.4, 2.6));
      if (h > 20) angs.forEach((a, i) => i % 2 === 0 && archWin(x + Math.sin(a) * (r * 0.87), wy - h * 0.3, z + Math.cos(a) * (r * 0.87), a, 1.1, 2.0));
      col(x, z, r + 0.4, SUMMIT + h + roofH);
    }
    // a lone crystal sculpture: a tall hexagonal spike with smaller ones round its foot
    function obelisk(x, z, h, c) {
      const y = gy(x, z) - SUMMIT;
      A.geo(HEXP, P.silver, x, y + 0.4, z, 1.1, 0.8, 1.1, 0, R30, 0);
      A.geo(HEXP, c, x, y + h * 0.45 + 0.6, z, 0.62, h * 0.9, 0.62, 0, R30, 0);
      A.geo(HEXC, c, x, y + h * 0.9 + 0.6 + h * 0.12, z, 0.62, h * 0.26, 0.62, 0, R30, 0);
      Wn.sph(P.cool, x, y + h * 1.06 + 0.9, z, 0.22, 0.34, 0.22);
      softCol(x, z, 0.9, SUMMIT + y + h + 1);
    }
    // little ice sculptures for the garden corners: 0 swan, 1 heart, 2 bunny, 3 star
    function sculpture(kind, x, z, yaw) {
      const y = gy(x, z) - SUMMIT;
      A.push(M(x, y, z, yaw));
      A.geo(HEXP, P.silver, 0, 0.5, 0, 1.4, 1.0, 1.4, 0, R30, 0);
      if (kind === 0) {
        A.sph(P.cool, 0, 2.0, 0, 1.0, 0.75, 1.5);
        A.sph(P.cool, 0, 3.4, 0.95, 0.38, 0.9, 0.38);
        A.sph(P.cool, 0, 4.15, 1.2, 0.42, 0.42, 0.5);
        A.cone(0xffb06a, 0, 4.1, 1.7, 0.16, 0.5, PI / 2, 0, 0);
        A.sph(P.ice2, -0.75, 2.35, -0.2, 0.7, 0.9, 1.2, false);
        A.sph(P.ice2, 0.75, 2.35, -0.2, 0.7, 0.9, 1.2, false);
        A.sph(0x35467a, 0.17, 4.25, 1.55, 0.07);
        A.sph(0x35467a, -0.17, 4.25, 1.55, 0.07);
      } else if (kind === 1) {
        A.sph(P.pink, -0.62, 3.0, 0, 0.82, 0.82, 0.55, true);
        A.sph(P.pink, 0.62, 3.0, 0, 0.82, 0.82, 0.55, true);
        A.geo(HEXC, P.pink, 0, 2.15, 0, 1.2, 1.6, 0.55, PI, R30, 0);
      } else if (kind === 2) {
        A.sph(P.cool, 0, 2.0, 0, 1.0, 0.95, 1.2, true);
        A.sph(P.cool, 0, 3.35, 0.35, 0.72, 0.68, 0.7, true);
        for (const s of [-1, 1]) A.sph(P.cool, s * 0.3, 4.55, 0.25, 0.2, 0.8, 0.14);
        A.sph(P.ice2, 0, 1.8, -1.1, 0.34, 0.34, 0.34);
        for (const s of [-1, 1]) A.sph(0x35467a, s * 0.24, 3.45, 0.95, 0.07);
      } else {
        A.geo(new T.OctahedronGeometry(1, 0), P.lilac, 0, 3.0, 0, 1.0, 1.9, 0.5, 0, 0, 0);
        A.geo(new T.OctahedronGeometry(1, 0), P.lilac, 0, 3.0, 0, 1.9, 1.0, 0.5, 0, 0, 0);
      }
      A.pop();
      softCol(x, z, 1.25, SUMMIT + y + 4.5);
    }

    /* ----- the great hall ----- */
    const HZ0 = -140,
      HZ1 = -118,
      HX = 17;
    A.box(P.ice, 0, 7.5, (HZ0 + HZ1) / 2, HX * 2, 15, HZ1 - HZ0);
    A.box(P.ice2, 0, 0.45, (HZ0 + HZ1) / 2, HX * 2 + 1.2, 0.9, HZ1 - HZ0 + 1.2); // plinth
    A.box(P.ice2, 0, 15.3, (HZ0 + HZ1) / 2, HX * 2 + 1.0, 0.7, HZ1 - HZ0 + 1.0);
    A.box(P.silver, 0, 11.2, HZ1 + 0.05, HX * 2 + 0.1, 0.35, 0.3); // silver band over the door
    // a crown of ice spikes along the roof edge
    for (let i = 0; i <= 11; i++) {
      const x = -15.4 + i * 2.8,
        hh = 2.2 + (i % 3) * 1.1;
      A.geo(HEXC, i % 2 ? P.cool : P.ice2, x, 15.6 + hh / 2, HZ1 + 0.1, 0.62, hh, 0.62, 0, 0, 0);
      A.geo(HEXC, i % 2 ? P.ice2 : P.cool, x, 15.6 + hh / 2, HZ0 - 0.1, 0.62, hh, 0.62, 0, 0, 0);
    }
    for (let i = 0; i <= 6; i++) {
      const z = HZ0 + 1.6 + i * 3.2,
        hh = 2.0 + (i % 2) * 1.2;
      A.geo(HEXC, P.cool, -HX + 0.1, 15.6 + hh / 2, z, 0.6, hh, 0.6, 0, 0, 0);
      A.geo(HEXC, P.cool, HX - 0.1, 15.6 + hh / 2, z, 0.6, hh, 0.6, 0, 0, 0);
    }
    // the hall's solid walls (a ring of colliders, spaced so they touch)
    const colLine = (x1, z1, x2, z2, r, top) => {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const n = Math.max(1, Math.ceil(len / (r * 1.25)));
      for (let i = 0; i <= n; i++) col(x1 + ((x2 - x1) * i) / n, z1 + ((z2 - z1) * i) / n, r, top);
    };
    colLine(-HX + 0.4, HZ1 - 0.4, HX - 0.4, HZ1 - 0.4, 1.9, SUMMIT + 17);
    colLine(-HX + 0.4, HZ0 + 0.4, HX - 0.4, HZ0 + 0.4, 1.9, SUMMIT + 17);
    colLine(-HX + 0.4, HZ0 + 0.4, -HX + 0.4, HZ1 - 0.4, 1.9, SUMMIT + 17);
    colLine(HX - 0.4, HZ0 + 0.4, HX - 0.4, HZ1 - 0.4, 1.9, SUMMIT + 17);

    /* ----- the central spire and the turrets ----- */
    // (the tower's six flat faces look at 0, 60, 120 ... degrees, so windows go there)
    tower(0, -131, 6.2, 36, 0xb9b6ff, 26, { roof2: P.cool, bands: [20, 26, 32], angs: [0, PI / 3, -PI / 3, PI], winY: 28, flagC: 0xb9a8ff, wallC: P.ice });
    // front turrets, mid-side turrets, rear turrets
    [
      [-19, -118, 3.2, 25, 0x9fd8ff, 11, 0x8fd2ff],
      [19, -118, 3.2, 25, 0xffc8ea, 11, 0xffa6d9],
      [-19.5, -129, 2.5, 20, 0xc9c4ff, 9, 0xb9a8ff],
      [19.5, -129, 2.5, 20, 0xc9c4ff, 9, 0xb9a8ff],
      [-18, -142, 3.6, 29, 0xffc8ea, 12, 0xffa6d9],
      [18, -142, 3.6, 29, 0x9fd8ff, 12, 0x8fd2ff],
    ].forEach((t) => {
      const s = t[0] < 0 ? -1 : 1;
      tower(t[0], t[1], t[2], t[3], t[4], t[5], { flagC: t[6], angs: [(s * 2 * PI) / 3, t[1] > -122 ? 0 : t[1] < -139 ? PI : s * (PI / 3)] });
    });

    /* ----- windows, banners, snowflake window and the door ----- */
    [-12.5, -8, 8, 12.5].forEach((x) => archWin(x, 8.2, HZ1 + 0.05, 0, 2.1, 3.7));
    [-12, 12].forEach((x) => archWin(x, 12.6, HZ1 + 0.05, 0, 1.7, 2.1));
    [-130, -136].forEach((z) => {
      archWin(HX, 8.2, z, PI / 2, 2.0, 3.4);
      archWin(-HX, 8.2, z, -PI / 2, 2.0, 3.4);
    });
    // the snowflake window above the door
    Wn.cyl(P.glass, 0, 12.7, HZ1 + 0.1, 2.2, 0.3, PI / 2, 0, 0);
    A.cyl(P.silver, 0, 12.7, HZ1 + 0.12, 2.8, 0.2, PI / 2, 0, 0);
    for (let k = 0; k < 6; k++) {
      A.box(P.silver, 0, 12.7, HZ1 + 0.34, 0.2, 5.0, 0.14, 0, 0, (k * PI) / 6);
      for (const s of [-1, 1]) A.box(P.silver, Math.sin((k * PI) / 6) * 1.5 * s * -1, 12.7 + Math.cos((k * PI) / 6) * 1.5 * s, HZ1 + 0.34, 0.12, 0.9, 0.12, 0, 0, (k * PI) / 6 + 0.9 * s);
    }
    // two long pale banners either side of the door
    [-7.2, 7.2].forEach((x, i) => {
      const c = i ? P.pink : 0x9fd8ff;
      A.box(c, x, 8.0, HZ1 + 0.1, 2.0, 8.2, 0.15);
      A.geo(HEXC, c, x, 3.6, HZ1 + 0.1, 1.0, 1.4, 0.15, PI, 0, 0);
      A.sph(P.snow, x, 8.5, HZ1 + 0.2, 0.55, 0.55, 0.16);
    });
    // the big door, in an arched frame, under a crystal porch
    A.box(P.ice2, 0, 4.7, HZ1 + 0.05, 9.0, 9.4, 0.3);
    A.cyl(P.ice2, 0, 9.4, HZ1 + 0.05, 4.5, 0.3, PI / 2, 0, 0);
    A.box(P.dark, 0, 4.3, HZ1 + 0.3, 6.6, 8.6, 0.3);
    A.cyl(P.dark, 0, 8.6, HZ1 + 0.3, 3.3, 0.3, PI / 2, 0, 0);
    Wn.box(0xfff4d0, 0, 4.0, HZ1 + 0.46, 0.22, 8.0, 0.1);
    for (let i = 0; i < 4; i++) A.sph(P.silver, -2.6 + (i % 2) * 5.2, 1.4 + i * 1.7, HZ1 + 0.5, 0.2);
    for (const sx of [-1, 1]) {
      A.geo(HEXP, P.ice2, sx * 5.6, 5.6, HZ1 + 2.4, 0.8, 11.2, 0.8, 0, R30, 0);
      A.geo(HEXP, P.silver, sx * 5.6, 0.3, HZ1 + 2.4, 1.15, 0.6, 1.15, 0, R30, 0);
      A.geo(HEXP, P.silver, sx * 5.6, 11.2, HZ1 + 2.4, 1.15, 0.5, 1.15, 0, R30, 0);
      softCol(sx * 5.6, HZ1 + 2.4, 1.0, SUMMIT + 12);
    }
    A.box(P.lilac, 0, 11.7, HZ1 + 1.5, 14.4, 0.7, 4.2);
    A.box(P.silver, 0, 12.1, HZ1 + 3.5, 14.4, 0.22, 0.3);
    for (let i = 0; i < 7; i++) A.geo(HEXC, i % 2 ? P.cool : P.ice2, -6 + i * 2, 12.9 + (i % 2) * 0.4, HZ1 + 1.4, 0.45, 1.8 + (i % 2) * 0.8, 0.45, 0, 0, 0);
    // icicles along the porch edge
    for (let i = 0; i < 14; i++) A.cone(P.cool, -6.5 + i * 1, 11.2 - (i % 3) * 0.2, HZ1 + 3.5, 0.13, 0.8 + (i % 3) * 0.35, PI, 0, 0);

    /* ----- the courtyard: a snowflake rosette, a carpet, the frozen fountain ----- */
    const CZ = -102;
    const groundPlane = (w, d, cx, cz, sw, sd, mat, lift, order) => {
      const geo = new T.PlaneGeometry(w, d, sw, sd).rotateX(-PI / 2);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setY(i, gy(cx + pos.getX(i), cz + pos.getZ(i)) + lift);
      geo.computeVertexNormals();
      const nr = geo.attributes.normal;
      for (let i = 0; i < nr.count; i++) nr.setXYZ(i, 0, 1, 0);
      const m = new T.Mesh(geo, mat);
      m.position.set(cx, 0, cz);
      m.renderOrder = order || 1;
      m.userData.noOutline = true;
      g.add(m);
      return m;
    };
    const poly = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
    const decalMat = (tex, extra) => UA.addGlow(new T.MeshToonMaterial(Object.assign({ map: tex, gradientMap: UA.gradient }, poly, extra || {})), 0.3);
    const rosette = Realm.canvasTex(1024, 1024, (c) => {
      c.scale(4, 4);
      const cx = 128,
        cy = 128;
      const ring = (r, colr) => {
        c.fillStyle = colr;
        c.beginPath();
        c.arc(cx, cy, r, 0, TAU);
        c.fill();
      };
      ring(127, '#c9e2ff');
      ring(119, '#f7fbff');
      ring(104, '#e0dcff');
      ring(96, '#f7fbff');
      c.fillStyle = '#b9d8ff';
      c.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU - PI / 2,
          rad = i % 2 ? 46 : 90;
        c.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
      }
      c.closePath();
      c.fill();
      ring(40, '#f7fbff');
      ring(28, '#d6c9ff');
    });
    rosette.wrapS = rosette.wrapT = T.ClampToEdgeWrapping;
    groundPlane(30, 30, 0, CZ, 30, 30, decalMat(rosette, { transparent: true, alphaTest: 0.5 }), 0.07, 2);
    const carpetTex = Realm.canvasTex(64, 256, (c) => {
      c.fillStyle = '#9fd0ff';
      c.fillRect(0, 0, 64, 256);
      c.fillStyle = '#f2f9ff';
      c.fillRect(8, 0, 48, 256);
      c.fillStyle = '#d8d0ff';
      c.fillRect(14, 0, 36, 256);
      c.fillStyle = '#ffffff';
      for (let y = 20; y < 256; y += 64) {
        c.beginPath();
        c.moveTo(32, y - 16);
        c.lineTo(46, y);
        c.lineTo(32, y + 16);
        c.lineTo(18, y);
        c.closePath();
        c.fill();
      }
      c.fillStyle = '#c0e8ff';
      c.fillRect(0, 0, 4, 256);
      c.fillRect(60, 0, 4, 256);
    });
    carpetTex.repeat.set(1, 5);
    groundPlane(5.6, 33, 0, -102, 2, 33, decalMat(carpetTex), 0.1, 3);

    // the frozen fountain
    const FZ = CZ;
    A.cyl(P.ice, 0, 0.5, FZ, 5.0, 1.0);
    A.cyl(P.ice2, 0, 1.15, FZ, 5.3, 0.45);
    A.cyl(P.lilac, 0, 1.2, FZ, 5.5, 0.2);
    A.cyl(P.ice2, 0, 2.5, FZ, 0.95, 2.8);
    A.cyl(P.cool, 0, 3.8, FZ, 2.5, 0.5);
    A.cyl(P.silver, 0, 4.1, FZ, 2.65, 0.14);
    A.geo(HEXP, P.ice2, 0, 4.9, FZ, 0.7, 1.4, 0.7, 0, R30, 0);
    A.geo(HEXC, 0xb9d8ff, 0, 8.4, FZ, 1.1, 6.8, 1.1, 0, R30, 0);
    A.geo(HEXC, P.cool, 0, 8.1, FZ, 0.6, 7.2, 0.6, 0, 0, 0);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      A.geo(HEXC, k % 2 ? P.cool : P.pink, Math.cos(a) * 1.9, 4.9 + (k % 2) * 0.4, FZ + Math.sin(a) * 1.9, 0.42, 2.4 + (k % 2) * 0.9, 0.42, Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
    }
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * TAU;
      A.cone(P.cool, Math.cos(a) * 2.5, 3.5 - (k % 3) * 0.1, FZ + Math.sin(a) * 2.5, 0.12, 0.7 + (k % 3) * 0.3, PI, 0, 0);
      A.cone(P.ice2, Math.cos(a) * 5.1, 1.9, FZ + Math.sin(a) * 5.1, 0.12, 0.7 + ((k + 1) % 3) * 0.25, PI, 0, 0);
    }
    const wat = new T.Mesh(new T.CircleGeometry(4.7, 40).rotateX(-PI / 2), new T.MeshToonMaterial({ color: 0xbfeaff, gradientMap: UA.gradient, emissive: 0x7fd0ff, emissiveIntensity: 0.4, transparent: true, opacity: 0.92 }));
    wat.position.set(0, SUMMIT + 1.4, FZ);
    wat.userData.noOutline = true;
    g.add(wat);
    const top = new T.Mesh(new T.OctahedronGeometry(0.7, 0), UA.addGlow(new T.MeshToonMaterial({ color: 0xe8f8ff, gradientMap: UA.gradient, emissive: 0x9fe0ff, emissiveIntensity: 0.7 }), 1.5));
    top.scale.set(1, 1.5, 0.6);
    top.position.set(0, SUMMIT + 12.4, FZ);
    top.userData.noOutline = true;
    g.add(top);
    Ice.starTop = top;
    W.addCollider(I.x, I.z + FZ, 5.3, SUMMIT + 9, false);
    Ice.fountain = { x: I.x, z: I.z + FZ, y: SUMMIT + 11 };

    /* ----- the gate, lamps, benches, obelisks ----- */
    ctx.iceArch(0, SUMMIT, -92, 0, 7.4, 1.05);
    [[-9.5, -90], [9.5, -90], [-10.5, -110], [10.5, -110], [-8.5, -114.5], [8.5, -114.5]].forEach((p) => ctx.lamp(p[0], gy(p[0], p[1]), p[1], 4.6));
    [
      [-14.2, -97, 1],
      [14.2, -97, -1],
      [-13.4, -111, 1],
      [13.4, -111, -1],
    ].forEach((b) => ctx.bench(b[0], gy(b[0], b[1]), b[1], (b[2] * PI) / 2));
    obelisk(-12, -88.5, 7, 0xb9d8ff);
    obelisk(12, -88.5, 7, 0xffc8ea);

    /* ----- the frost gardens ----- */
    const FLOWER_COLS = [
      ['#ffb8e2', 0xff8fcf],
      ['#c9b8ff', 0xa98cff],
      ['#a8f0f0', 0x6fe0e8],
      ['#9ec9ff', 0x6fa8ff],
      ['#ffffff', 0xffffff],
    ];
    const heads = [],
      stems = [];
    function bed(cx, cz, sgn) {
      const w = 14,
        d = 23,
        S = 32;
      const plant = [];
      const tex = Realm.canvasTex(w * S, d * S, (c, tw, th) => {
        const rr = (x, y, ww, hh, r) => {
          c.beginPath();
          c.moveTo(x + r, y);
          c.arcTo(x + ww, y, x + ww, y + hh, r);
          c.arcTo(x + ww, y + hh, x, y + hh, r);
          c.arcTo(x, y + hh, x, y, r);
          c.arcTo(x, y, x + ww, y, r);
          c.closePath();
        };
        c.fillStyle = '#eef6ff';
        c.fillRect(0, 0, tw, th);
        c.fillStyle = '#b9d8ff';
        rr(8, 8, tw - 16, th - 16, 34);
        c.fill();
        c.fillStyle = '#f7fbff';
        rr(24, 24, tw - 48, th - 48, 26);
        c.fill();
        // a pink band of flowers round the edge
        c.fillStyle = '#ffb8e2';
        rr(46, 46, tw - 92, th - 92, 22);
        c.fill();
        c.fillStyle = '#f7fbff';
        rr(86, 86, tw - 172, th - 172, 16);
        c.fill();
        // the inner garden: a blue lawn of flowers with a snowflake of wedges
        c.fillStyle = '#9ec9ff';
        rr(106, 106, tw - 212, th - 212, 12);
        c.fill();
        const mx = tw / 2;
        [[th * 0.25, 1], [th * 0.5, 0], [th * 0.75, 1]].forEach((m) => {
          c.fillStyle = '#f7fbff';
          c.beginPath();
          c.arc(mx, m[0], 112, 0, TAU);
          c.fill();
          for (let k = 0; k < 6; k++) {
            c.fillStyle = (k + m[1]) % 2 ? '#c9b8ff' : '#ffffff';
            c.beginPath();
            c.moveTo(mx, m[0]);
            c.arc(mx, m[0], 100, (k * PI) / 3, ((k + 1) * PI) / 3);
            c.closePath();
            c.fill();
          }
          c.fillStyle = '#a8f0f0';
          c.beginPath();
          c.arc(mx, m[0], 30, 0, TAU);
          c.fill();
        });
        // plant on the coloured pixels
        const img = c.getImageData(0, 0, tw, th).data;
        const step = 0.78;
        for (let ux = 0.8; ux < w - 0.8; ux += step) {
          for (let uz = 0.8; uz < d - 0.8; uz += step) {
            const jx = ux + (rnd() - 0.5) * 0.4,
              jz = uz + (rnd() - 0.5) * 0.4;
            const px = Math.floor(jx * S),
              py = Math.floor(jz * S);
            const o = (py * tw + px) * 4;
            const r = img[o],
              gg = img[o + 1],
              b = img[o + 2];
            for (const fc of FLOWER_COLS) {
              const hx = parseInt(fc[0].slice(1), 16);
              if (Math.abs(r - (hx >> 16)) + Math.abs(gg - ((hx >> 8) & 255)) + Math.abs(b - (hx & 255)) < 30) {
                plant.push({ x: cx + jx - w / 2, z: cz + jz - d / 2, c: fc[1] });
                break;
              }
            }
          }
        }
      });
      tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
      groundPlane(w, d, cx, cz, w, d, decalMat(tex), 0.07, 2);
      plant.forEach((p) => {
        p.y = gy(p.x, p.z);
        p.s = 0.8 + rnd() * 0.7;
        p.rot = rnd() * 6.28;
        heads.push(p);
      });
      // each bed's corners: a sculpture (swan, heart, bunny, star)
      const sx = sgn * (w / 2 + 1.7);
      sculpture(sgn > 0 ? 0 : 2, cx + sx, cz - d / 2 + 1.5, sgn > 0 ? -PI / 2 : PI / 2);
      sculpture(sgn > 0 ? 1 : 3, cx + sx, cz + d / 2 - 1.5, sgn > 0 ? -PI / 2 : PI / 2);
      // pads so nothing random grows here
      Ice.pads.push({ x: cx, z: cz, r: 15 });
    }
    bed(-23.5, -102.5, -1);
    bed(23.5, -102.5, 1);
    // instanced crystal flowers: a stem and a glowing six-sided bloom
    {
      const stemGeo = new T.CylinderGeometry(0.018, 0.024, 0.5, 4);
      stemGeo.translate(0, 0.25, 0);
      const headGeo = new T.ConeGeometry(0.17, 0.34, 6);
      headGeo.rotateX(PI);
      headGeo.translate(0, 0.62, 0);
      const sM = new T.InstancedMesh(stemGeo, new T.MeshToonMaterial({ color: 0x8fe0c8, gradientMap: UA.gradient }), heads.length);
      const hM = new T.InstancedMesh(headGeo, UA.addGlow(new T.MeshToonMaterial({ color: 0xffffff, gradientMap: UA.gradient }), 1.1), heads.length);
      const _m = new T.Matrix4(),
        _q = new T.Quaternion(),
        _up = new V3(0, 1, 0),
        tc = new T.Color();
      heads.forEach((p, i) => {
        _q.setFromAxisAngle(_up, p.rot);
        _m.compose(new V3(p.x, p.y - 0.05, p.z), _q, new V3(p.s, p.s, p.s));
        sM.setMatrixAt(i, _m);
        hM.setMatrixAt(i, _m);
        hM.setColorAt(i, tc.set(p.c));
      });
      sM.frustumCulled = hM.frustumCulled = false;
      sM.userData.noOutline = hM.userData.noOutline = true;
      g.add(sM, hM);
      Ice.flowerCount = heads.length;
    }

    A.pop();
    Wn.pop();

    /* ----- animation: the spinning star, a gentle fountain glitter, the pennants (ice.js) ----- */
    Ice.update2 = function (dt, t, uni) {
      if (Ice.starTop) Ice.starTop.rotation.y = t * 1.2;
      const f = Ice.fountain;
      if (f) {
        const d = Math.hypot(uni.pos.x - f.x, uni.pos.z - f.z);
        if (d < 60) {
          f.acc = (f.acc || 0) + dt * 14;
          while (f.acc > 1) {
            f.acc -= 1;
            const a = Math.random() * TAU,
              sp = 0.6 + Math.random() * 1.4;
            UA.FX.emit({ x: f.x + Math.cos(a) * 0.3, y: f.y - 5.5 + Math.random() * 3, z: f.z + Math.sin(a) * 0.3, vx: Math.cos(a) * sp, vy: 2.5 + Math.random() * 2.5, vz: Math.sin(a) * sp, color: Math.random() < 0.4 ? 0xffffff : 0xb8e4ff, size: 0.22 + Math.random() * 0.14, shape: 1, life: 1.4, grow: -0.3, gravity: 3, drag: 0.4, twinkle: 6 });
          }
        }
      }
    };
  };
})();
