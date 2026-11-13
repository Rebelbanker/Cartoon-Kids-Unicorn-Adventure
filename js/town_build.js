/* Twinkle Town (static part): a cobbled Main Street lined with candy-coloured shops, a gate, a plaza with a fountain,
   a town hall with a working clock. Everything is merged into a handful of meshes so the town costs few draw calls.
   Town space: u runs along Main Street (world +x), v across it (world +z). The street gate is at the east end (u = +46),
   the plaza and town hall at the west end. The flat pad itself is carved by World.heightAt (UA.TOWN). */
(function () {
  const UA = window.UA;
  const V3 = THREE.Vector3;
  const T = UA.TOWN;
  const Town = (UA.Town = { shops: {}, lamps: [], chimneys: [], fountain: null, clock: null, built: false });
  const H = T.H;
  Town.toWorld = (u, v) => new V3(T.ox + u, H, T.oz + v);
  Town.toLocal = (x, z) => ({ u: x - T.ox, v: z - T.oz });

  const PAL = {
    stone: 0xe9dcef,
    trim: 0xfffaf6,
    glass: 0xfff0bd,
    dark: 0x6f5a96,
    gold: 0xffd45e,
    leaf: 0x9fe3b4,
    wood: 0xe9bf9c,
    brick: 0xffb7b0,
  };

  /* ---------- tiny geometry accumulator with a transform stack ---------- */
  const GEO = {
    box: new THREE.BoxGeometry(1, 1, 1),
    sph: new THREE.SphereGeometry(1, 10, 7),
    sphHi: new THREE.SphereGeometry(1, 14, 10),
    dome: new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 14, 1),
    cone: new THREE.ConeGeometry(1, 1, 14, 1),
    cone4: new THREE.ConeGeometry(1, 1, 4, 1).rotateY(Math.PI / 4),
    tor: new THREE.TorusGeometry(1, 0.2, 6, 20),
  };
  const _q = new THREE.Quaternion(),
    _e = new THREE.Euler(),
    _p = new V3(),
    _s = new V3();
  class Acc {
    constructor() {
      this.items = [];
      this.base = new THREE.Matrix4();
      this.stack = [];
    }
    push(m) {
      this.stack.push(this.base.clone());
      this.base.multiply(m);
    }
    pop() {
      this.base = this.stack.pop();
    }
    add(geo, color, x, y, z, sx, sy, sz, rx, ry, rz) {
      _e.set(rx || 0, ry || 0, rz || 0);
      _q.setFromEuler(_e);
      const m = new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
      m.premultiply(this.base);
      this.items.push({ geo, color, matrix: m });
    }
    box(c, x, y, z, w, h, d, rx, ry, rz) {
      this.add(GEO.box, c, x, y, z, w, h, d, rx, ry, rz);
    }
    sph(c, x, y, z, rx, ry, rz, hi) {
      this.add(hi ? GEO.sphHi : GEO.sph, c, x, y, z, rx, ry === undefined ? rx : ry, rz === undefined ? rx : rz);
    }
    cyl(c, x, y, z, r, h, rx, ry, rz) {
      this.add(GEO.cyl, c, x, y, z, r, h, r, rx, ry, rz);
    }
    cone(c, x, y, z, r, h, rx, ry, rz) {
      this.add(GEO.cone, c, x, y, z, r, h, r, rx, ry, rz);
    }
    geo(g, c, x, y, z, sx, sy, sz, rx, ry, rz) {
      this.add(g, c, x, y, z, sx || 1, sy || 1, sz || 1, rx, ry, rz);
    }
    build() {
      return UA.mergeGeos(this.items);
    }
  }
  Town.Acc = Acc;
  Town.GEO = GEO;
  const rotY = (a) => new THREE.Matrix4().makeRotationY(a);
  const trans = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);

  /* ---------- sign atlas (one canvas, one draw call for every sign in town) ---------- */
  const AW = 1024,
    AH = 1024;
  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = AW;
  atlasCanvas.height = AH;
  const ax = atlasCanvas.getContext('2d');
  const cellBoard = (i) => ({ x: (i % 2) * 512, y: Math.floor(i / 2) * 112, w: 512, h: 112 });
  const cellIcon = (i) => ({ x: (i % 9) * 112, y: 672 + Math.floor(i / 9) * 112, w: 112, h: 112 });
  const cellClock = { x: 0, y: 896, w: 128, h: 128 };
  const css = (c) => '#' + c.toString(16).padStart(6, '0');
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function star(c, cx, cy, R, r, col) {
    c.fillStyle = col;
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * 6.2832 - Math.PI / 2,
        rad = i % 2 ? r : R;
      c.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    c.closePath();
    c.fill();
  }
  // simple vector icons (readable for kids who cannot read yet), drawn in a 100 x 100 box
  const ICONS = {
    envelope(c) {
      c.fillStyle = '#fff';
      rr(c, 12, 26, 76, 50, 8);
      c.fill();
      c.strokeStyle = '#7fb5ff';
      c.lineWidth = 5;
      c.stroke();
      c.beginPath();
      c.moveTo(14, 30);
      c.lineTo(50, 56);
      c.lineTo(86, 30);
      c.stroke();
      c.fillStyle = '#ff8fb8';
      c.beginPath();
      c.arc(50, 58, 8, 0, 7);
      c.fill();
    },
    cupcake(c) {
      c.fillStyle = '#ffd9b3';
      c.beginPath();
      c.moveTo(26, 52);
      c.lineTo(74, 52);
      c.lineTo(66, 84);
      c.lineTo(34, 84);
      c.closePath();
      c.fill();
      c.fillStyle = '#ff8fb8';
      c.beginPath();
      c.arc(50, 44, 26, Math.PI, 0);
      c.fill();
      c.beginPath();
      c.arc(50, 24, 12, 0, 7);
      c.fill();
      c.fillStyle = '#fff';
      [[40, 38], [58, 34], [50, 46]].forEach((p) => c.fillRect(p[0], p[1], 7, 3));
      c.fillStyle = '#ff5c8a';
      c.beginPath();
      c.arc(50, 13, 5, 0, 7);
      c.fill();
    },
    candy(c) {
      c.fillStyle = '#ff9ec9';
      c.beginPath();
      c.arc(50, 50, 24, 0, 7);
      c.fill();
      c.strokeStyle = '#fff';
      c.lineWidth = 6;
      c.beginPath();
      c.arc(50, 50, 14, 0.4, 5);
      c.stroke();
      c.fillStyle = '#ffb48a';
      c.beginPath();
      c.moveTo(14, 40);
      c.lineTo(30, 50);
      c.lineTo(14, 62);
      c.closePath();
      c.fill();
      c.beginPath();
      c.moveTo(86, 40);
      c.lineTo(70, 50);
      c.lineTo(86, 62);
      c.closePath();
      c.fill();
    },
    book(c) {
      c.fillStyle = '#bf9bff';
      rr(c, 14, 22, 72, 58, 6);
      c.fill();
      c.fillStyle = '#fff';
      rr(c, 22, 28, 56, 46, 4);
      c.fill();
      c.strokeStyle = '#bf9bff';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(50, 28);
      c.lineTo(50, 74);
      c.stroke();
      star(c, 36, 50, 9, 4, '#ffd45e');
      star(c, 64, 50, 9, 4, '#ffd45e');
    },
    moon(c) {
      c.fillStyle = '#ffe58a';
      c.beginPath();
      c.arc(50, 50, 28, 0, 7);
      c.fill();
      c.fillStyle = '#ffd1b3';
      c.beginPath();
      c.arc(62, 42, 24, 0, 7);
      c.fill();
      star(c, 74, 26, 10, 4, '#fff');
      star(c, 26, 74, 7, 3, '#fff');
    },
    flower(c) {
      c.fillStyle = '#8fd8a0';
      c.fillRect(47, 50, 6, 36);
      c.fillStyle = '#ff8fb8';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * 6.2832;
        c.beginPath();
        c.arc(50 + Math.cos(a) * 17, 38 + Math.sin(a) * 17, 13, 0, 7);
        c.fill();
      }
      c.fillStyle = '#ffe58a';
      c.beginPath();
      c.arc(50, 38, 11, 0, 7);
      c.fill();
    },
    icecream(c) {
      c.fillStyle = '#ffd9b3';
      c.beginPath();
      c.moveTo(34, 52);
      c.lineTo(66, 52);
      c.lineTo(50, 92);
      c.closePath();
      c.fill();
      c.fillStyle = '#ff9ec9';
      c.beginPath();
      c.arc(50, 44, 20, 0, 7);
      c.fill();
      c.fillStyle = '#9fe0ff';
      c.beginPath();
      c.arc(50, 26, 15, 0, 7);
      c.fill();
      c.fillStyle = '#ff5c8a';
      c.beginPath();
      c.arc(50, 12, 5, 0, 7);
      c.fill();
    },
    hat(c) {
      c.fillStyle = '#ff9ec9';
      c.beginPath();
      c.ellipse(50, 68, 40, 11, 0, 0, 7);
      c.fill();
      c.fillStyle = '#ff7fb0';
      rr(c, 28, 30, 44, 40, 12);
      c.fill();
      c.fillStyle = '#ffe58a';
      c.fillRect(28, 56, 44, 8);
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(64, 54, 8, 0, 7);
      c.fill();
    },
    wand(c) {
      c.strokeStyle = '#7a5cc9';
      c.lineWidth = 8;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(24, 82);
      c.lineTo(62, 44);
      c.stroke();
      star(c, 66, 36, 24, 10, '#ffd45e');
      star(c, 24, 28, 8, 3, '#fff');
      star(c, 84, 74, 7, 3, '#ff9ec9');
    },
    mushroom(c) {
      c.fillStyle = '#fff3e0';
      rr(c, 38, 50, 24, 36, 8);
      c.fill();
      c.fillStyle = '#ff6f8f';
      c.beginPath();
      c.arc(50, 52, 36, Math.PI, 0);
      c.closePath();
      c.fill();
      c.fillStyle = '#fff';
      [[34, 38, 6], [58, 30, 7], [68, 46, 5], [48, 44, 4]].forEach((p) => {
        c.beginPath();
        c.arc(p[0], p[1], p[2], 0, 7);
        c.fill();
      });
    },
    townhall(c) {
      star(c, 50, 52, 38, 18, '#ffd45e');
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(50, 52, 16, 0, 7);
      c.fill();
      c.strokeStyle = '#6f5a96';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(50, 52);
      c.lineTo(50, 40);
      c.moveTo(50, 52);
      c.lineTo(59, 56);
      c.stroke();
    },
  };
  const ICON_ORDER = Object.keys(ICONS);
  function drawIconCell(ci, name, bg) {
    const cell = cellIcon(ci);
    ax.save();
    ax.translate(cell.x, cell.y);
    ax.fillStyle = css(bg);
    ax.beginPath();
    ax.arc(56, 56, 54, 0, 7);
    ax.fill();
    ax.strokeStyle = '#ffffff';
    ax.lineWidth = 5;
    ax.stroke();
    ax.translate(6, 6);
    ax.scale(1.0, 1.0);
    ICONS[name](ax);
    ax.restore();
  }
  function drawBoardCell(bi, name, bg, iconName) {
    const cell = cellBoard(bi);
    ax.save();
    ax.translate(cell.x, cell.y);
    ax.fillStyle = css(bg);
    rr(ax, 4, 4, 504, 104, 30);
    ax.fill();
    ax.strokeStyle = '#ffffff';
    ax.lineWidth = 8;
    ax.stroke();
    ax.strokeStyle = 'rgba(111,90,150,0.35)';
    ax.lineWidth = 3;
    rr(ax, 14, 14, 484, 84, 22);
    ax.stroke();
    // icon medallion
    ax.save();
    ax.translate(18, 8);
    ax.scale(0.92, 0.92);
    ax.fillStyle = '#ffffff';
    ax.beginPath();
    ax.arc(56, 56, 52, 0, 7);
    ax.fill();
    ax.translate(6, 6);
    ICONS[iconName](ax);
    ax.restore();
    // name
    let fs = 44;
    ax.textBaseline = 'middle';
    ax.textAlign = 'center';
    do {
      ax.font = '800 ' + fs + 'px "Avenir Next","Trebuchet MS","Segoe UI",system-ui,sans-serif';
      fs -= 2;
    } while (ax.measureText(name).width > 340 && fs > 20);
    ax.fillStyle = 'rgba(255,255,255,0.9)';
    ax.fillText(name, 322, 58);
    ax.fillStyle = '#4a3470';
    ax.fillText(name, 322, 55);
    ax.restore();
  }
  function drawClockFace() {
    const c = cellClock;
    ax.save();
    ax.translate(c.x, c.y);
    ax.fillStyle = '#fffaf6';
    ax.beginPath();
    ax.arc(64, 64, 62, 0, 7);
    ax.fill();
    ax.strokeStyle = '#ffb3d9';
    ax.lineWidth = 8;
    ax.stroke();
    ax.fillStyle = '#6f5a96';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 6.2832;
      ax.beginPath();
      ax.arc(64 + Math.sin(a) * 48, 64 - Math.cos(a) * 48, i % 3 === 0 ? 5 : 3, 0, 7);
      ax.fill();
    }
    star(ax, 64, 64, 8, 3.5, '#ffd45e');
    ax.restore();
  }
  const signs = []; // {matrix, w, h, cell, double}
  const atlasTex = new THREE.CanvasTexture(atlasCanvas);
  atlasTex.colorSpace = THREE.SRGBColorSpace;
  atlasTex.anisotropy = 4;
  function signGeo(list) {
    const pos = [],
      uv = [],
      nor = [],
      idx = [];
    let base = 0;
    for (const s of list) {
      const g = new THREE.PlaneGeometry(s.w, s.h);
      const p = g.attributes.position,
        t = g.attributes.uv;
      const u0 = s.cell.x / AW,
        u1 = (s.cell.x + s.cell.w) / AW,
        v1 = 1 - s.cell.y / AH,
        v0 = 1 - (s.cell.y + s.cell.h) / AH;
      for (let i = 0; i < p.count; i++) {
        const v = new V3(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(s.matrix);
        pos.push(v.x, v.y, v.z);
        uv.push(u0 + (u1 - u0) * t.getX(i), v0 + (v1 - v0) * t.getY(i));
        const n = new V3(0, 0, 1).transformDirection(s.matrix);
        nor.push(n.x, n.y, n.z);
      }
      g.index.array.forEach((k) => idx.push(base + k));
      base += p.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setIndex(idx);
    return out;
  }

  /* ---------- cobblestone texture ---------- */
  function cobbleTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    const rnd = UA.rng(UA.C.SEED + 77);
    g.fillStyle = '#9d78b8'; // the grout between the stones: a deep grape, so every candy stone pops
    g.fillRect(0, 0, 512, 512);
    const cols = ['#ffc4de', '#ffdca6', '#c4f0d2', '#bfe2ff', '#e2c8ff', '#fff2a8'];
    const rows = 14,
      rh = 512 / rows;
    for (let r = 0; r < rows; r++) {
      let x = -(rnd() * 20);
      const off = r % 2 ? 22 : 0;
      x -= off;
      while (x < 512) {
        const w = 30 + rnd() * 20;
        g.fillStyle = cols[Math.floor(rnd() * cols.length)];
        rr(g, x + 2, r * rh + 2, w - 4, rh - 4, 9);
        g.fill();
        // soft highlight
        g.fillStyle = 'rgba(255,255,255,0.28)';
        rr(g, x + 5, r * rh + 4, w - 12, rh * 0.35, 6);
        g.fill();
        x += w;
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  // flat quad / disc placed on the ground with planar uvs (one texture tile = 12 world units)
  function groundGeo(geo, y, tintCol) {
    const p = geo.attributes.position;
    const uv = new Float32Array(p.count * 2),
      col = new Float32Array(p.count * 3);
    const c = new THREE.Color(tintCol);
    for (let i = 0; i < p.count; i++) {
      p.setY(i, y);
      uv[i * 2] = p.getX(i) / 12;
      uv[i * 2 + 1] = p.getZ(i) / 12;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  }
  /* ---------- buildings ---------- */
  const SHOPS = [
    { id: 'post', name: 'Post Office', side: -1, u: 30, wall: 0xffeaa8, roof: 0x7fb5ff, roofKind: 'gable', door: 0x7fb5ff, awning: [0x7fb5ff, 0xffffff], icon: 'envelope', board: 0xcfe4ff },
    { id: 'bakery', name: 'Sprinkle Bakery', side: -1, u: 18, wall: 0xffc4dc, roof: 0xff8fb8, roofKind: 'hip', door: 0xff8fb8, awning: [0xff8fb8, 0xffffff], icon: 'cupcake', board: 0xffd9e8, chimney: true },
    { id: 'candy', name: 'Gumdrop Candy Shop', side: -1, u: 6, wall: 0xbdf2d5, roof: 0xffb48a, roofKind: 'dome', door: 0xffb48a, awning: [0xff9ec9, 0xffffff], icon: 'candy', board: 0xd7f7e6 },
    { id: 'library', name: 'Starlight Library', side: -1, u: -6, wall: 0xdcc8ff, roof: 0x8f6fe0, roofKind: 'gable', door: 0x8f6fe0, awning: [0xbf9bff, 0xffffff], icon: 'book', board: 0xe9ddff, floors: 2 },
    { id: 'inn', name: 'Cozy Cloud Inn', side: -1, u: -18, wall: 0xffd9b8, roof: 0xff9f7a, roofKind: 'hip', door: 0xff9f7a, awning: [0xffb48a, 0xffffff], icon: 'moon', board: 0xffe8d3, floors: 2, chimney: true },
    { id: 'flowers', name: 'Blossom Flowers', side: 1, u: 30, wall: 0xcbf2c8, roof: 0xff8fb8, roofKind: 'gable', door: 0xff8fb8, awning: [0x9fe3b4, 0xffffff], icon: 'flower', board: 0xe0f8de },
    { id: 'icecream', name: 'Sundae Scoops', side: 1, u: 18, wall: 0xbfe9ff, roof: 0xff9ec9, roofKind: 'dome', door: 0xff9ec9, awning: [0x8fd2ff, 0xffffff], icon: 'icecream', board: 0xd8f1ff },
    { id: 'hats', name: 'Twirl Top Hats', side: 1, u: 6, wall: 0xffd0e4, roof: 0xbf9bff, roofKind: 'hip', door: 0xbf9bff, awning: [0xff9ec9, 0xfff2a8], icon: 'hat', board: 0xffe3ef },
    { id: 'wands', name: 'Wands & Wonders', side: 1, u: -6, wall: 0xcdbcff, roof: 0x7a5cc9, roofKind: 'witch', door: 0xffd45e, awning: [0x9a7be0, 0xffe58a], icon: 'wand', board: 0xe3d9ff, floors: 2 },
    { id: 'toys', name: 'Toadstool Toys', side: 1, u: -18, wall: 0xfff0c9, roof: 0xff6f8f, roofKind: 'mush', door: 0xff6f8f, awning: [0xff8fb8, 0xffffff], icon: 'mushroom', board: 0xfff3d6 },
  ];
  Town.SHOPS = SHOPS;

  function roofGable(w, d, rh) {
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2, 0);
    sh.lineTo(w / 2, 0);
    sh.lineTo(0, rh);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    return g;
  }

  function buildShop(A, Wn, sg, spec, bi, ii) {
    const w = 10.2,
      d = 9;
    const floors = spec.floors || 1;
    const Hh = floors === 2 ? 9.6 : 6.4;
    const cu = spec.u,
      cv = spec.side * (7.2 + d / 2);
    const yaw = spec.side < 0 ? 0 : Math.PI; // front faces the street
    const m = trans(T.ox + cu, H, T.oz + cv).multiply(rotY(yaw));
    A.push(m);
    Wn.push(m);
    const trim = PAL.trim;
    // base, walls, cornice
    A.box(PAL.stone, 0, 0.18, 0, w + 0.5, 0.36, d + 0.5);
    A.box(spec.wall, 0, Hh / 2, 0, w, Hh, d);
    A.box(trim, 0, Hh + 0.2, 0, w + 0.7, 0.4, d + 0.7);
    // roof
    const rh = spec.roofKind === 'gable' ? 3.4 : spec.roofKind === 'hip' ? 3.3 : spec.roofKind === 'dome' ? 3.6 : spec.roofKind === 'mush' ? 3.6 : 6.6;
    const ry = Hh + 0.4;
    if (spec.roofKind === 'gable') {
      A.geo(roofGable(w + 1.3, d + 1.3, rh), spec.roof, 0, ry, 0);
      A.box(trim, 0, ry + 0.02, 0, w + 1.4, 0.18, d + 1.4);
      Wn.cyl(PAL.glass, 0, ry + rh * 0.36, (d + 1.3) / 2 + 0.02, 0.6, 0.12, Math.PI / 2);
      A.cyl(trim, 0, ry + rh * 0.36, (d + 1.3) / 2 - 0.02, 0.78, 0.1, Math.PI / 2);
    } else if (spec.roofKind === 'hip') {
      A.geo(GEO.cone4, spec.roof, 0, ry + rh / 2, 0, (w / 2 + 0.7) / 0.7071, rh, (d / 2 + 0.7) / 0.7071);
      A.sph(PAL.gold, 0, ry + rh + 0.05, 0, 0.3, 0.3, 0.3);
    } else if (spec.roofKind === 'dome') {
      A.geo(GEO.dome, spec.roof, 0, ry, 0, w / 2 + 0.6, rh, d / 2 + 0.6);
      A.cyl(trim, 0, ry + 0.05, 0, Math.max(w, d) / 2 + 0.7, 0.2);
      A.sph(PAL.gold, 0, ry + rh + 0.1, 0, 0.42, 0.42, 0.42);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * 6.2832;
        A.sph(trim, Math.cos(a) * (w / 2 + 0.2) * 0.86, ry + rh * 0.45 + (k % 2) * 0.5, Math.sin(a) * (d / 2 + 0.2) * 0.86, 0.2, 0.2, 0.2);
      }
    } else if (spec.roofKind === 'mush') {
      A.geo(GEO.dome, spec.roof, 0, ry, 0, w / 2 + 1.4, rh, d / 2 + 1.4);
      for (let k = 0; k < 11; k++) {
        const a = k * 2.4,
          e = 0.35 + (k % 4) * 0.28;
        const rx = (w / 2 + 1.4) * Math.cos(e) * 0.97,
          rz = (d / 2 + 1.4) * Math.cos(e) * 0.97;
        A.sph(0xffffff, Math.cos(a) * rx, ry + Math.sin(e) * rh * 0.97, Math.sin(a) * rz, 0.55, 0.3, 0.55);
      }
    } else if (spec.roofKind === 'witch') {
      A.cyl(spec.roof, 0, ry + 0.15, 0, Math.max(w, d) / 2 + 1.3, 0.3);
      A.cone(spec.roof, 0, ry + 0.3 + rh / 2, 0, (Math.min(w, d) / 2 + 0.6), rh);
      A.cone(PAL.gold, 0, ry + 0.8, 0, (Math.min(w, d) / 2 + 0.65), 0.6);
      Wn.sph(PAL.gold, 0, ry + 0.3 + rh + 0.2, 0, 0.5, 0.5, 0.5);
      for (let k = 0; k < 5; k++) {
        const a = k * 1.7,
          hh = 0.9 + k * 1.0,
          rad = (Math.min(w, d) / 2 + 0.6) * (1 - hh / (rh + 0.3)) + 0.05;
        Wn.sph(0xfff2a8, Math.cos(a) * rad, ry + 0.3 + hh, Math.sin(a) * rad, 0.2, 0.2, 0.2);
      }
    }
    if (spec.chimney) {
      A.box(PAL.brick, -w * 0.28, ry + 1.2, -d * 0.15, 1.2, 3.2, 1.2);
      A.box(trim, -w * 0.28, ry + 2.9, -d * 0.15, 1.5, 0.3, 1.5);
      const wp = new V3(-w * 0.28, ry + 3.2, -d * 0.15).applyMatrix4(m);
      Town.chimneys.push(wp);
    }
    // front: door (right), shop window (left), upper windows
    const fz = d / 2;
    const dx = w * 0.22;
    A.box(trim, dx, 1.65, fz + 0.02, 2.3, 3.0, 0.2);
    A.cyl(trim, dx, 3.15, fz + 0.02, 1.15, 0.2, Math.PI / 2);
    A.box(spec.door, dx, 1.55, fz + 0.12, 1.9, 2.8, 0.2);
    A.cyl(spec.door, dx, 2.95, fz + 0.12, 0.95, 0.2, Math.PI / 2);
    A.box(0xffffff, dx, 1.55, fz + 0.24, 0.1, 2.7, 0.05);
    A.sph(PAL.gold, dx + 0.6, 1.45, fz + 0.3, 0.1, 0.1, 0.1);
    A.box(PAL.stone, dx, 0.18, fz + 0.65, 2.8, 0.36, 1.1);
    // shop window
    const wx = -w * 0.22;
    A.box(trim, wx, 2.0, fz + 0.05, 3.9, 2.4, 0.2);
    Wn.box(PAL.glass, wx, 2.0, fz + 0.16, 3.4, 1.95, 0.1);
    A.box(trim, wx, 2.0, fz + 0.24, 0.12, 1.95, 0.06);
    A.box(trim, wx, 2.0, fz + 0.24, 3.4, 0.12, 0.06);
    A.box(PAL.stone, wx, 0.72, fz + 0.3, 4.2, 0.2, 0.6);
    // goods on the window sill (little candy-coloured shapes)
    for (let k = 0; k < 5; k++) A.sph(UA.C.RAINBOW[(k + bi) % 6], wx - 1.5 + k * 0.75, 0.98, fz + 0.32, 0.22, 0.22, 0.22);
    // flower box under the shop window
    A.box(PAL.wood, wx, 0.5, fz + 0.62, 3.0, 0.4, 0.5);
    for (let k = 0; k < 7; k++) {
      A.sph(PAL.leaf, wx - 1.3 + k * 0.43, 0.8, fz + 0.62, 0.3, 0.25, 0.3);
      A.sph(UA.C.RAINBOW[(k * 2 + bi) % 6], wx - 1.3 + k * 0.43, 1.0, fz + 0.66, 0.16, 0.16, 0.16);
    }
    // striped awning over door and window
    const nS = 8,
      aw = (w - 0.6) / nS;
    for (let k = 0; k < nS; k++) {
      const col = spec.awning[k % 2];
      const x = -w / 2 + 0.3 + aw * (k + 0.5);
      A.box(col, x, 4.25, fz + 0.95, aw, 0.12, 1.9, -0.5);
      A.sph(col, x, 3.62, fz + 1.65, aw / 2, 0.22, 0.2);
    }
    // facade sign board
    const boardY = 5.65;
    A.box(trim, 0, boardY, fz + 0.06, w * 0.82, 1.3, 0.14);
    sg.push({ matrix: m.clone().multiply(trans(0, boardY, fz + 0.16)), w: w * 0.78, h: 1.2, cell: cellBoard(bi), double: false });
    // projecting icon sign
    A.cyl(PAL.dark, w / 2 - 0.5, 6.5, fz + 1.0, 0.07, 2.0, Math.PI / 2);
    A.cyl(PAL.dark, w / 2 - 0.5, 6.3, fz + 1.9, 0.02, 0.4);
    A.cyl(PAL.dark, w / 2 - 0.5, 6.3, fz + 1.2, 0.02, 0.4);
    sg.push({ matrix: m.clone().multiply(trans(w / 2 - 0.5, 5.55, fz + 1.55)).multiply(rotY(Math.PI / 2)), w: 1.35, h: 1.35, cell: cellIcon(ii), double: true });
    // upper floor
    if (floors === 2) {
      A.box(trim, 0, 6.55, 0, w + 0.45, 0.28, d + 0.45);
      for (const x of [-w * 0.3, 0, w * 0.3]) {
        A.box(trim, x, 8.0, fz + 0.04, 2.1, 2.2, 0.18);
        Wn.box(PAL.glass, x, 8.0, fz + 0.14, 1.7, 1.8, 0.1);
        A.box(trim, x, 8.0, fz + 0.22, 0.1, 1.8, 0.06);
        A.box(trim, x, 8.0, fz + 0.22, 1.7, 0.1, 0.06);
        A.box(PAL.wood, x, 6.85, fz + 0.45, 2.1, 0.34, 0.4);
        for (let k = 0; k < 4; k++) A.sph(UA.C.RAINBOW[(k + bi + 2) % 6], x - 0.7 + k * 0.47, 7.15, fz + 0.45, 0.2, 0.2, 0.2);
      }
    } else {
      // little round window above the awning on one-floor shops is replaced by side windows
      for (const sxn of [-1, 1]) {
        A.box(trim, sxn * (w / 2 + 0.02), 2.7, 0, 0.12, 1.6, 1.7);
        Wn.box(PAL.glass, sxn * (w / 2 + 0.07), 2.7, 0, 0.1, 1.2, 1.3);
      }
    }
    // door lanterns (glow at night)
    for (const lx of [dx - 1.55, dx + 1.55]) {
      A.cyl(PAL.dark, lx, 3.35, fz + 0.2, 0.03, 0.5);
      Wn.sph(0xfff0b0, lx, 3.0, fz + 0.3, 0.2, 0.26, 0.2);
      Town.lamps.push(new V3(lx, 3.0, fz + 0.3).applyMatrix4(m));
    }
    A.pop();
    Wn.pop();

    // world-space data for residents, colliders and the camera
    const front = spec.side < 0 ? 1 : -1; // world z direction of the front
    const door = new V3(T.ox + cu + dx * (spec.side < 0 ? 1 : -1), H, T.oz + cv + front * (d / 2 + 0.9));
    Town.shops[spec.id] = {
      spec,
      door,
      stand: new V3(door.x - (spec.side < 0 ? 1 : -1) * 3.2, H, T.oz + cv + front * (d / 2 + 1.7)),
      center: new V3(T.ox + cu, H, T.oz + cv),
      front,
    };
    const nx = Math.ceil((w + 0.6) / 2.4),
      nz = Math.ceil((d + 0.6) / 2.4);
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x = T.ox + cu - (w + 0.6) / 2 + ((i + 0.5) * (w + 0.6)) / nx;
        const z = T.oz + cv - (d + 0.6) / 2 + ((j + 0.5) * (d + 0.6)) / nz;
        UA.World.addCollider(x, z, 1.75, H + Hh + rh + 1, true);
      }
    UA.World.addBlocker(T.ox + cu, T.oz + cv, spec.roofKind === 'mush' ? 6.6 : spec.roofKind === 'dome' ? 5.9 : 5.0, H + 0.5, H + Hh + rh);
  }

  /* ---------- top-surface map ----------
     A coarse height map of everything solid in the town that is taller than a bench (roofs, awnings, stall canopies,
     the clock tower, the fountain). The unicorn lands on these from above, can stand and ride on them and falls off
     their edges. It only counts a surface when the unicorn's feet are at or above it (give or take a small step), so
     riding along the street under an awning still works. Built from the real merged mesh, so it always matches what
     you see. */
  function buildSurfaceMap(geo) {
    const CS = 0.6;
    const x0 = T.ox + T.u0 - 4,
      z0 = T.oz - T.hv - 4;
    const nx = Math.ceil((T.u1 - T.u0 + 8) / CS),
      nz = Math.ceil((T.hv * 2 + 8) / CS);
    const h = new Float32Array(nx * nz).fill(-1e9);
    const p = geo.attributes.position.array;
    const minY = H + 1.6;
    for (let i = 0; i + 8 < p.length; i += 9) {
      const ax = p[i], ay = p[i + 1], az = p[i + 2];
      const bx = p[i + 3], by = p[i + 4], bz = p[i + 5];
      const cx = p[i + 6], cy = p[i + 7], cz = p[i + 8];
      if (Math.max(ay, by, cy) < minY) continue;
      // facing: skip walls (mostly vertical triangles)
      const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nxv = uy * vz - uz * vy, nyv = uz * vx - ux * vz, nzv = ux * vy - uy * vx;
      const nl = Math.hypot(nxv, nyv, nzv);
      if (nl < 1e-7 || Math.abs(nyv) / nl < 0.3) continue;
      const ix0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - x0) / CS)),
        ix1 = Math.min(nx - 1, Math.floor((Math.max(ax, bx, cx) - x0) / CS)),
        iz0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - z0) / CS)),
        iz1 = Math.min(nz - 1, Math.floor((Math.max(az, bz, cz) - z0) / CS));
      // barycentric set-up in the xz plane
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(d) < 1e-9) continue;
      for (let iz = iz0; iz <= iz1; iz++) {
        const pz = z0 + (iz + 0.5) * CS;
        for (let ix = ix0; ix <= ix1; ix++) {
          const px = x0 + (ix + 0.5) * CS;
          const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / d;
          const l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / d;
          const l3 = 1 - l1 - l2;
          if (l1 < -0.02 || l2 < -0.02 || l3 < -0.02) continue;
          const y = l1 * ay + l2 * by + l3 * cy;
          if (y > h[iz * nx + ix]) h[iz * nx + ix] = y;
        }
      }
    }
    Town.surf = { x0, z0, cs: CS, nx, nz, h };
  }
  // top surface height at (x, z), or -Infinity when there is nothing solid up there
  Town.surfaceAt = function (x, z) {
    const s = Town.surf;
    if (!s) return -Infinity;
    const ix = Math.floor((x - s.x0) / s.cs),
      iz = Math.floor((z - s.z0) / s.cs);
    if (ix < 0 || iz < 0 || ix >= s.nx || iz >= s.nz) return -Infinity;
    const v = s.h[iz * s.nx + ix];
    return v < -1e8 ? -Infinity : v;
  };

  /* ---------- town hall with a clock tower ---------- */
  function buildHall(A, Wn, sg) {
    const w = 17,
      d = 11,
      Hh = 8.4;
    const m = trans(T.ox - 57, H, T.oz).multiply(rotY(Math.PI / 2)); // front faces +x (toward the plaza)
    A.push(m);
    Wn.push(m);
    const trim = PAL.trim,
      wall = 0xffe3ef;
    A.box(PAL.stone, 0, 0.25, 0, w + 0.8, 0.5, d + 0.8);
    A.box(wall, 0, Hh / 2, 0, w, Hh, d);
    A.box(trim, 0, Hh + 0.25, 0, w + 0.9, 0.5, d + 0.9);
    A.box(trim, 0, 4.4, 0, w + 0.4, 0.3, d + 0.4);
    // hip roof in rainbow bands
    const rh = 4.4;
    A.geo(GEO.cone4, 0xff8fb8, 0, Hh + 0.5 + rh / 2, 0, (w / 2 + 0.9) / 0.7071, rh, (d / 2 + 0.9) / 0.7071);
    A.geo(GEO.cone4, 0xffb48a, 0, Hh + 0.5 + rh * 0.62, 0, (w / 2 + 0.9) / 0.7071 * 0.62, rh * 0.5, (d / 2 + 0.9) / 0.7071 * 0.62);
    // columns and pediment at the front
    const fz = d / 2;
    for (const x of [-4.6, -1.55, 1.55, 4.6]) {
      A.cyl(trim, x, 3.4, fz + 1.6, 0.5, 6.0);
      A.cyl(0xffd9ec, x, 0.8, fz + 1.6, 0.68, 0.5);
      A.cyl(0xffd9ec, x, 6.55, fz + 1.6, 0.68, 0.4);
    }
    A.box(trim, 0, 7.0, fz + 1.6, 11.6, 0.5, 2.2);
    A.geo(roofGable(11.6, 2.2, 2.2), 0xff8fb8, 0, 7.25, fz + 1.6);
    Wn.cyl(PAL.glass, 0, 8.2, fz + 2.72, 0.55, 0.1, Math.PI / 2);
    A.cyl(trim, 0, 8.2, fz + 2.68, 0.72, 0.1, Math.PI / 2);
    // steps
    for (let k = 0; k < 4; k++) A.box(PAL.stone, 0, 0.17 + k * 0.17, fz + 3.6 - k * 0.55, 11 - k * 0.5, 0.34 + k * 0.0, 0.7 + 0.0);
    // big door
    A.box(trim, 0, 2.2, fz + 0.04, 3.4, 4.2, 0.2);
    A.cyl(trim, 0, 4.3, fz + 0.04, 1.7, 0.2, Math.PI / 2);
    A.box(0xff8fb8, 0, 2.05, fz + 0.16, 3.0, 3.9, 0.2);
    A.cyl(0xff8fb8, 0, 4.0, fz + 0.16, 1.5, 0.2, Math.PI / 2);
    A.box(0xffffff, 0, 2.05, fz + 0.28, 0.1, 3.8, 0.05);
    A.sph(PAL.gold, 0.5, 2.1, fz + 0.34, 0.13, 0.13, 0.13);
    A.sph(PAL.gold, -0.5, 2.1, fz + 0.34, 0.13, 0.13, 0.13);
    // windows
    for (const x of [-7, -5.6, 5.6, 7]) {
      if (Math.abs(x) < 6) continue;
      for (const y of [2.5, 6.3]) {
        A.box(trim, x, y, fz + 0.04, 1.5, 2.0, 0.18);
        Wn.box(PAL.glass, x, y, fz + 0.14, 1.15, 1.65, 0.1);
        A.box(trim, x, y, fz + 0.22, 0.08, 1.65, 0.06);
      }
    }
    for (const sxn of [-1, 1])
      for (const z of [-3, 0, 3])
        for (const y of [2.5, 6.3]) {
          A.box(trim, sxn * (w / 2 + 0.02), y, z, 0.16, 2.0, 1.5);
          Wn.box(PAL.glass, sxn * (w / 2 + 0.1), y, z, 0.1, 1.65, 1.15);
        }
    // clock tower
    const tH = 8.4,
      ty = Hh + 1.4;
    A.box(0xfff0f7, 0, ty + tH / 2, 0, 5.2, tH, 5.2);
    A.box(trim, 0, ty + tH + 0.2, 0, 5.8, 0.4, 5.8);
    A.box(trim, 0, ty + 0.2, 0, 5.8, 0.4, 5.8);
    A.geo(GEO.cone4, 0xbf9bff, 0, ty + tH + 0.4 + 2.6, 0, 3.0 / 0.7071 * 1.0, 5.2, 3.0 / 0.7071 * 1.0);
    A.cyl(PAL.dark, 0, ty + tH + 0.4 + 5.5, 0, 0.06, 1.6);
    Wn.sph(PAL.gold, 0, ty + tH + 0.4 + 6.4, 0, 0.5, 0.5, 0.5, true);
    // rainbow flag
    for (let k = 0; k < 6; k++) A.box(UA.C.RAINBOW[k], 0.7, ty + tH + 0.4 + 6.0 - k * 0.2, 0, 1.4, 0.2, 0.04);
    // belfry openings
    for (const sxn of [-1, 1]) {
      A.box(0xe8dff7, sxn * 2.62, ty + 1.2, 0, 0.1, 1.2, 1.2);
    }
    A.pop();
    Wn.pop();
    // clock faces (4 sides) with moving hands
    const cy = ty + tH * 0.58;
    const faces = [];
    [
      [0, 0, 1],
      [0, 0, -1],
      [1, 0, 0],
      [-1, 0, 0],
    ].forEach((n, i) => {
      const ang = Math.atan2(n[0], n[2]);
      const g = new THREE.Group();
      const local = new V3(n[0] * 2.64, 0, n[2] * 2.64);
      const wp = local.clone().applyMatrix4(m);
      g.position.set(wp.x, H + cy, wp.z);
      g.rotation.y = ang + Math.PI / 2; // local rotation is +90deg for the hall
      faces.push(g);
      sg.push({ matrix: new THREE.Matrix4().compose(new V3(wp.x, H + cy, wp.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ang + Math.PI / 2, 0)), new V3(1, 1, 1)).multiply(trans(0, 0, 0.04)), w: 3.3, h: 3.3, cell: cellClock, double: false });
    });
    Town.clock = { faces };
    Town.shops.hall = { door: new V3(T.ox - 57 + d / 2 + 4.8, H, T.oz), stand: new V3(T.ox - 57 + d / 2 + 5.4, H, T.oz + 1.5), center: new V3(T.ox - 57, H, T.oz), front: 1 };
    // colliders: the main block
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 5; j++) UA.World.addCollider(T.ox - 57 - 5 + j * 2.5, T.oz - 8.2 + i * 2.35, 1.75, H + 12, true);
    UA.World.addBlocker(T.ox - 57, T.oz, 7.5, H + 0.5, H + 12);
  }

  /* ---------- gate, fountain, street furniture ---------- */
  function buildGate(A, Wn, sg) {
    const u = 47;
    for (const s of [-1, 1]) {
      const x = T.ox + u,
        z = T.oz + s * 6.6;
      for (let k = 0; k < 5; k++) A.cyl(k % 2 ? 0xffc2dc : 0xfff0de, x, H + 0.6 + k * 1.2, z, 0.62 - k * 0.02, 1.2);
      A.sph(PAL.gold, x, H + 6.4, z, 0.5, 0.5, 0.5);
      for (let k = 0; k < 4; k++) A.sph(0xffffff, x + Math.cos(k * 1.6) * 0.9, H + 0.45 + (k % 2) * 0.3, z + Math.sin(k * 1.6) * 0.9, 0.85, 0.6, 0.85);
      UA.World.addCollider(x, z, 0.9, H + 8, true);
      UA.World.addBlocker(x, z, 0.9, H + 0.5, H + 8);
    }
    // rainbow arch between the pillars
    const arch = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const rad = 6.6 + 0.9 - i * 0.28 - 0.0;
      const g = new THREE.TorusGeometry(rad - 0.5, 0.17, 6, 28, Math.PI);
      const mesh = new THREE.Mesh(g, UA.addGlow(new THREE.MeshToonMaterial({ color: UA.C.RAINBOW[5 - i], gradientMap: UA.gradient, emissive: UA.C.RAINBOW[5 - i], emissiveIntensity: 0.2 }), 0.8));
      mesh.rotation.y = Math.PI / 2;
      mesh.position.set(T.ox + u, H + 6.7, T.oz);
      arch.add(mesh);
    }
    Town.gateArch = arch;
    // welcome sign hanging from the arch: reuse the town hall icon plus text drawn into the atlas (board index 11)
    sg.push({ matrix: trans(T.ox + u, H + 10.4, T.oz).multiply(rotY(Math.PI / 2)), w: 5.6, h: 1.22, cell: cellBoard(11), double: true });
    for (const zz of [-2.4, 2.4]) A.cyl(PAL.dark, T.ox + u, H + 11.4, T.oz + zz, 0.04, 1.4);
    A.box(PAL.trim, T.ox + u - 0.05, H + 10.4, T.oz, 0.08, 1.3, 5.9);
  }

  function buildFountain(A, Wn) {
    const c = Town.toWorld(-34, 0);
    A.push(trans(c.x, H, c.z));
    A.cyl(PAL.stone, 0, 0.45, 0, 4.4, 0.9);
    A.cyl(0xffffff, 0, 0.92, 0, 4.6, 0.14);
    A.cyl(0xf0e4f7, 0, 1.25, 0, 1.0, 2.4);
    A.cyl(PAL.stone, 0, 2.4, 0, 2.5, 0.28);
    A.cyl(0xffffff, 0, 2.6, 0, 2.6, 0.12);
    A.cyl(0xf0e4f7, 0, 3.2, 0, 0.55, 1.4);
    A.sph(0xffffff, 0, 4.0, 0, 0.7, 0.4, 0.7);
    A.pop();
    Wn.push(trans(c.x, H, c.z));
    Wn.sph(PAL.gold, 0, 4.75, 0, 0.55, 0.55, 0.55, true);
    Wn.pop();
    UA.World.addCollider(c.x, c.z, 4.9, H + 6, true);
    UA.World.addBlocker(c.x, c.z, 4.5, H + 0.4, H + 6);
    Town.fountain = { x: c.x, z: c.z, y: H + 4.0 };
    // water
    const wm = new THREE.Mesh(new THREE.CylinderGeometry(3.9, 3.9, 0.06, 28), new THREE.MeshToonMaterial({ color: 0x9fdcff, gradientMap: UA.gradient, transparent: true, opacity: 0.85, emissive: 0x9fdcff, emissiveIntensity: 0.25 }));
    wm.position.set(c.x, H + 0.88, c.z);
    Town.fountain.water = wm;
    return wm;
  }

  function lamp(A, Wn, x, z) {
    A.cyl(PAL.dark, x, H + 0.15, z, 0.34, 0.3);
    A.cyl(PAL.dark, x, H + 1.9, z, 0.1, 3.6);
    A.sph(PAL.dark, x, H + 0.4, z, 0.22, 0.22, 0.22);
    A.cone(0xffb3d9, x, H + 4.15, z, 0.5, 0.45);
    Wn.sph(0xfff0b0, x, H + 3.75, z, 0.32, 0.4, 0.32, true);
    A.cyl(PAL.dark, x, H + 3.45, z, 0.2, 0.1);
    Town.lamps.push(new V3(x, H + 3.75, z));
    UA.World.addCollider(x, z, 0.3, H + 4.5);
  }

  function bench(A, x, z, yaw) {
    A.push(trans(x, H, z).multiply(rotY(yaw)));
    A.box(PAL.wood, 0, 0.62, 0, 2.2, 0.14, 0.7);
    A.box(PAL.wood, 0, 1.05, -0.32, 2.2, 0.55, 0.1, -0.12);
    A.box(0xff9ec9, -1.0, 0.3, 0, 0.14, 0.6, 0.6);
    A.box(0xff9ec9, 1.0, 0.3, 0, 0.14, 0.6, 0.6);
    A.pop();
    UA.World.addCollider(x, z, 0.8, H + 1.5);
  }

  function stall(A, Wn, x, z, yaw, cols, goods) {
    A.push(trans(x, H, z).multiply(rotY(yaw)));
    A.box(PAL.wood, 0, 0.55, 0, 3.4, 1.1, 1.4);
    A.box(PAL.trim, 0, 1.15, 0, 3.6, 0.12, 1.6);
    for (const sx of [-1.65, 1.65]) for (const sz of [-0.65, 0.65]) A.cyl(PAL.trim, sx, 1.9, sz, 0.07, 3.2);
    const nS = 6;
    for (let k = 0; k < nS; k++) {
      const xx = -1.9 + (3.8 / nS) * (k + 0.5);
      A.box(cols[k % 2], xx, 3.5, 0.15, 3.8 / nS, 0.1, 2.0, 0.25);
      A.sph(cols[k % 2], xx, 3.28, 1.1, 3.8 / nS / 2, 0.2, 0.2);
    }
    for (let k = 0; k < 7; k++) A.sph(goods[k % goods.length], -1.3 + k * 0.43, 1.35, 0.15 + ((k * 7) % 3) * 0.12, 0.2, 0.2, 0.2);
    A.pop();
    UA.World.addCollider(x, z, 1.5, H + 3.5, true);
    UA.World.addBlocker(x, z, 2.0, H + 0.5, H + 3.7);
    const wp = new V3(x, H + 3.2, z);
    Town.lamps.push(wp.clone());
  }

  /* ---------- bunting across the street ---------- */
  function bunting(list, u, y, v0, v1) {
    const x = T.ox + u,
      N = 15;
    for (let i = 0; i < N; i++) {
      const t0 = i / N,
        t1 = (i + 0.78) / N;
      const pt = (t) => ({ z: T.oz + v0 + (v1 - v0) * t, y: H + y - Math.sin(t * Math.PI) * 0.9 });
      const a = pt(t0),
        b = pt(t1);
      const midz = (a.z + b.z) / 2,
        midy = (a.y + b.y) / 2 - 0.95;
      const col = new THREE.Color(UA.C.RAINBOW[i % 6]);
      list.push({ p: [x, a.y, a.z, x, b.y, b.z, x, midy, midz], c: [col.r, col.g, col.b] });
    }
  }

  /* ---------- put it all together ---------- */
  Town.build = function (scene) {
    if (Town.built) return;
    Town.built = true;
    const A = new Acc(),
      Wn = new Acc(),
      sg = [];
    // draw the sign atlas
    ax.clearRect(0, 0, AW, AH);
    SHOPS.forEach((s, i) => {
      drawBoardCell(i, s.name, s.board, s.icon);
      drawIconCell(i, s.icon, s.board);
    });
    drawBoardCell(10, 'Town Hall', 0xffd9ec, 'townhall');
    drawBoardCell(11, 'Welcome to Twinkle Town!', 0xfff0c9, 'townhall');
    drawIconCell(10, 'townhall', 0xffd9ec);
    drawClockFace();
    atlasTex.needsUpdate = true;

    SHOPS.forEach((s, i) => buildShop(A, Wn, sg, s, i, i));
    buildHall(A, Wn, sg);
    sg.push({ matrix: trans(T.ox - 57 + 11 / 2 + 3.4, H + 8.2, T.oz).multiply(rotY(Math.PI / 2)), w: 5.2, h: 1.1, cell: cellBoard(10), double: false });
    buildGate(A, Wn, sg);
    const fountainWater = buildFountain(A, Wn);

    // lamps along both sidewalks and around the plaza
    for (const u of [40, 26, 12, 0, -12, -24]) {
      lamp(A, Wn, T.ox + u, T.oz - 5.2);
      lamp(A, Wn, T.ox + u + 3, T.oz + 5.2);
    }
    for (const a of [0.75, 2.4, 3.9, 5.55]) lamp(A, Wn, T.ox - 34 + Math.cos(a) * 12.2, T.oz + Math.sin(a) * 12.2);
    // benches and stalls in the plaza
    for (const a of [0.9, 2.4, 3.9, 5.4]) bench(A, T.ox - 34 + Math.cos(a) * 7.4, T.oz + Math.sin(a) * 7.4, -a + Math.PI / 2 + Math.PI);
    stall(A, Wn, T.ox - 34, T.oz - 9.8, 0, [0xff9ec9, 0xffffff], [0xff8fb8, 0xffe58a, 0xa6ec9a]);
    stall(A, Wn, T.ox - 34, T.oz + 9.8, Math.PI, [0x9fd8ff, 0xffffff], [0xffb48a, 0xbf9bff, 0xffe58a]);
    stall(A, Wn, T.ox - 43, T.oz - 8, 0.84, [0xffe58a, 0xffffff], [0xff8fb8, 0xa6ec9a, 0x8fd2ff]);
    // benches and bushes along the street
    for (const u of [34, 12, -12]) {
      bench(A, T.ox + u, T.oz - 6.1, 0);
      bench(A, T.ox + u + 2.5, T.oz + 6.1, Math.PI);
    }
    // little hedges and planters at the gate and plaza
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * 6.2832;
      const x = T.ox - 34 + Math.cos(a) * 5.3,
        z = T.oz + Math.sin(a) * 5.3;
      if (k % 2) continue;
      A.sph(PAL.leaf, x, H + 0.45, z, 0.55, 0.45, 0.55);
      A.sph(UA.C.RAINBOW[k % 6], x, H + 0.9, z, 0.22, 0.22, 0.22);
    }
    // mailbox by the post office
    {
      const p = Town.shops.post.center;
      const mx = p.x + 4.7,
        mz = p.z + 6.2;
      A.cyl(PAL.dark, mx, H + 0.6, mz, 0.1, 1.2);
      A.box(0x7fb5ff, mx, H + 1.45, mz, 0.9, 0.7, 0.7);
      A.cyl(0x7fb5ff, mx, H + 1.8, mz, 0.35, 0.9, 0, 0, Math.PI / 2);
      A.box(0xff6f8f, mx + 0.5, H + 1.7, mz, 0.05, 0.4, 0.14);
      UA.World.addCollider(mx, mz, 0.5, H + 2);
    }
    // barrels and crates by a few shops
    ['candy', 'bakery', 'icecream', 'toys'].forEach((id, i) => {
      const sh = Town.shops[id];
      const x = sh.stand.x + Math.sign(sh.stand.x - sh.door.x) * 2.4, // on the far side from the door so residents can walk in
        z = sh.stand.z;
      A.cyl(0xffd9b3, x, H + 0.6, z, 0.55, 1.2);
      A.cyl(0xff9ec9, x, H + 0.3, z, 0.57, 0.12);
      A.cyl(0xff9ec9, x, H + 0.9, z, 0.57, 0.12);
      for (let k = 0; k < 4; k++) A.sph(UA.C.RAINBOW[(k + i) % 6], x + (k % 2) * 0.3 - 0.15, H + 1.3, z + (k > 1 ? 0.25 : -0.15), 0.2, 0.2, 0.2);
      UA.World.addCollider(x, z, 0.6, H + 1.5);
    });

    // bunting
    const flags = [];
    [[24, 6.3], [0, 6.5], [-12, 6.3]].forEach((b) => bunting(flags, b[0], b[1], -7.0, 7.0));
    {
      const pos = [],
        col = [];
      flags.forEach((f) => {
        pos.push(...f.p);
        for (let k = 0; k < 3; k++) col.push(...f.c);
      });
      const fg = new THREE.BufferGeometry();
      fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      fg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      fg.computeVertexNormals();
      const fm = new THREE.Mesh(fg, UA.addGlow(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient, side: THREE.DoubleSide }), 0.5));
      fm.frustumCulled = false;
      scene.add(fm);
      // little string-light bulbs among the flags for night
      flags.forEach((f, i) => {
        if (i % 3 === 0) Town.lamps.push(new V3(f.p[0], f.p[1] - 0.1, f.p[2]));
      });
    }

    // cobbles: road, sidewalks, plaza disc and ring
    const cobbles = [];
    const addGround = (geo) => cobbles.push(geo);
    const flat = (x0, z0, x1, z1, y, tint) => {
      const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
      g.rotateX(-Math.PI / 2);
      g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
      addGround(groundGeo(g, H + y, tint));
    };
    const X = T.ox,
      Z = T.oz;
    flat(X - 36, Z - 4.6, X + 52, Z + 4.6, 0.05, 0xffffff); // road
    flat(X - 36, Z - 7.4, X + 52, Z - 4.6, 0.09, 0xfff3f8); // sidewalks
    flat(X - 36, Z + 4.6, X + 52, Z + 7.4, 0.09, 0xfff3f8);
    flat(X - 52, Z - 3.2, X - 46, Z + 3.2, 0.06, 0xffffff); // path to the hall steps
    {
      const g = new THREE.CircleGeometry(13.4, 48).rotateX(-Math.PI / 2);
      addGround(groundGeo(g, H + 0.06, 0xfff7fb));
      const r = new THREE.RingGeometry(11.9, 13.4, 48).rotateX(-Math.PI / 2);
      addGround(groundGeo(r, H + 0.075, 0xd9c2f2));
      const r2 = new THREE.RingGeometry(5.2, 6.6, 40).rotateX(-Math.PI / 2);
      addGround(groundGeo(r2, H + 0.075, 0xffd0e6));
    }
    // move the plaza geometry to its centre (planar uvs were built at the origin, so translate after)
    const plaza = [cobbles[cobbles.length - 3], cobbles[cobbles.length - 2], cobbles[cobbles.length - 1]];
    plaza.forEach((g) => {
      const p = g.attributes.position,
        uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        p.setX(i, p.getX(i) + X - 34);
        p.setZ(i, p.getZ(i) + Z);
        uv.setXY(i, p.getX(i) / 12, p.getZ(i) / 12);
      }
    });
    const mergeGround = (list) => {
      const pos = [],
        uv = [],
        col = [],
        idx = [];
      let base = 0;
      list.forEach((g) => {
        const p = g.attributes.position,
          u = g.attributes.uv,
          c = g.attributes.color;
        for (let i = 0; i < p.count; i++) {
          pos.push(p.getX(i), p.getY(i), p.getZ(i));
          uv.push(u.getX(i), u.getY(i));
          col.push(c.getX(i), c.getY(i), c.getZ(i));
        }
        g.index.array.forEach((k) => idx.push(base + k));
        base += p.count;
      });
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      out.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0).flatMap(() => [0, 1, 0]), 3));
      out.setIndex(idx);
      return out;
    };
    const groundMat = new THREE.MeshToonMaterial({ map: cobbleTexture(), vertexColors: true, gradientMap: UA.gradient, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    UA.addGlow(groundMat, 0.25);
    const ground = new THREE.Mesh(mergeGround(cobbles), groundMat);
    ground.renderOrder = 1;
    scene.add(ground);

    // the big merged meshes
    const bodyMat = UA.addGlow(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient }), 0.3);
    const bodyGeo = A.build();
    buildSurfaceMap(bodyGeo);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    const glowMat = UA.addGlow(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient }), 2.2);
    const glow = new THREE.Mesh(Wn.build(), glowMat);
    const signMesh = new THREE.Mesh(signGeo(sg), UA.addGlow(new THREE.MeshToonMaterial({ map: atlasTex, gradientMap: UA.gradient, side: THREE.DoubleSide, transparent: true, alphaTest: 0.1 }), 0.6));
    body.frustumCulled = glow.frustumCulled = signMesh.frustumCulled = false;
    scene.add(body, glow, signMesh, fountainWater, Town.gateArch);
    Town.meshes = { ground, body, glow, signMesh };

    // clock hands (their own meshes so they can move)
    const handMat = new THREE.MeshToonMaterial({ color: 0x6f5a96, gradientMap: UA.gradient });
    Town.clock.hands = Town.clock.faces.map((g) => {
      const hour = new THREE.Group(),
        min = new THREE.Group();
      const hh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.05), handMat);
      hh.position.y = 0.3;
      const mh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.95, 0.05), handMat);
      mh.position.y = 0.46;
      hour.add(hh);
      min.add(mh);
      hour.position.z = 0.1;
      min.position.z = 0.14;
      g.add(hour, min);
      scene.add(g);
      return { hour, min };
    });

    // glowing halos for lamps, lanterns and string lights (additive, one draw call, fade in at dusk)
    {
      const pts = Town.lamps;
      const pos = new Float32Array(pts.length * 3);
      pts.forEach((p, i) => pos.set([p.x, p.y, p.z], i * 3));
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const tex = UA.radialTexture('rgba(255,236,170,1)', 'rgba(255,236,170,0)', 64);
      const mat = new THREE.PointsMaterial({ map: tex, size: 3.2, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
      const pts3 = new THREE.Points(g, mat);
      pts3.frustumCulled = false;
      pts3.renderOrder = 3;
      scene.add(pts3);
      Town.halo = mat;
    }
    // a soft cottage-green lawn tint under the town so it does not look like bare ground (vertex colours of the terrain stay)
  };

  // called every frame (cheap): clock hands follow game time, lamps fade in at dusk, fountain sparkles
  Town.updateStatic = function (dt, t, uni) {
    if (!Town.built) return;
    const hour = UA.Time ? UA.Time.hour : 12;
    const night = UA.Time ? UA.Time.night : 0;
    if (Town.clock && Town.clock.hands) {
      const hh = hour % 12,
        mm = (hour % 1) * 60;
      for (const h of Town.clock.hands) {
        h.hour.rotation.z = -(hh / 12) * Math.PI * 2;
        h.min.rotation.z = -(mm / 60) * Math.PI * 2;
      }
    }
    if (Town.halo) Town.halo.opacity = UA.clamp(night * 1.1, 0, 0.95);
    const f = Town.fountain;
    if (f) {
      const d = Math.hypot(uni.pos.x - f.x, uni.pos.z - f.z);
      if (d < 70) {
        f.acc = (f.acc || 0) + dt * 22;
        while (f.acc > 1) {
          f.acc -= 1;
          const a = Math.random() * 6.283,
            sp = 1.4 + Math.random() * 1.6;
          UA.FX.emit({ x: f.x + Math.cos(a) * 0.2, y: f.y + 0.1, z: f.z + Math.sin(a) * 0.2, vx: Math.cos(a) * sp, vy: 5.6 + Math.random() * 1.4, vz: Math.sin(a) * sp, color: Math.random() < 0.3 ? 0xffffff : 0x9fdcff, size: 0.2 + Math.random() * 0.12, shape: 0, life: 1.1, grow: 0, gravity: 9.5, drag: 0.05, glow: 0.4 });
        }
        if (Math.random() < dt * 3) UA.FX.emit({ x: f.x + (Math.random() - 0.5) * 3, y: f.y - 3, z: f.z + (Math.random() - 0.5) * 3, vx: 0, vy: 0.6, vz: 0, color: 0xffffff, size: 0.35, shape: 1, life: 1.2, grow: -0.5, gravity: -0.2, drag: 0.5 });
      }
    }
    // chimney puffs
    if (Town.chimneys.length) {
      Town.chimT = (Town.chimT || 0) - dt;
      if (Town.chimT <= 0) {
        Town.chimT = 0.7;
        for (const c of Town.chimneys) if (Math.hypot(uni.pos.x - c.x, uni.pos.z - c.z) < 80) UA.FX.emit({ x: c.x, y: c.y, z: c.z, vx: 0.5, vy: 1.4, vz: 0.1, color: 0xfff6fb, size: 0.9, shape: 0, life: 2.4, grow: 1.1, gravity: -0.1, drag: 0.5 });
      }
    }
  };
})();
