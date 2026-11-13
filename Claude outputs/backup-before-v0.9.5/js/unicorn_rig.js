/* Rig helpers for the unicorn:
   - Loft: smooth tube-like meshes (body, neck, head, legs) built from a row of elliptical rings
   - ik2: two-bone leg solver, so hooves stay planted while the body moves
   - Hair: mane and tail locks, each a tapered tube that trails behind like real hair (verlet chains)
   All of it is CPU-light: a few hundred vertices rewritten per frame, three draw calls in total. */
(function () {
  const UA = window.UA;
  const R = (UA.Rig = {});
  const V3 = THREE.Vector3;
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

  function crom(a, b, c, d, t) {
    const t2 = t * t,
      t3 = t2 * t;
    return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  }

  /* Smooth rings through stations. station = { c:[x,y,z], rx, ry }.
     per = samples between stations; capA / capB = length of the rounded cap at each end (0 = open end). */
  R.sampleRings = function (st, per, capA, capB, steps) {
    steps = steps || 4;
    const n = st.length;
    const g = (i) => st[clamp(i, 0, n - 1)];
    const main = [];
    for (let i = 0; i < n - 1; i++) {
      const a = g(i - 1),
        b = g(i),
        c = g(i + 1),
        d = g(i + 2);
      for (let j = 0; j < per; j++) {
        const t = j / per;
        main.push({
          c: [0, 1, 2].map((k) => crom(a.c[k], b.c[k], c.c[k], d.c[k], t)),
          rx: crom(a.rx, b.rx, c.rx, d.rx, t),
          ry: crom(a.ry, b.ry, c.ry, d.ry, t),
        });
      }
    }
    const L = st[n - 1];
    main.push({ c: L.c.slice(), rx: L.rx, ry: L.ry });
    const out = [];
    const dirOf = (p, q) => {
      const v = new V3(q.c[0] - p.c[0], q.c[1] - p.c[1], q.c[2] - p.c[2]);
      return v.lengthSq() > 1e-9 ? v.normalize() : new V3(0, 0, 1);
    };
    if (capA > 0) {
      const f = main[0],
        dv = dirOf(f, main[1]);
      for (let k = steps; k >= 1; k--) {
        const a = (k / steps) * (Math.PI / 2),
          s = Math.sin(a),
          co = Math.max(0.004, Math.cos(a));
        out.push({ c: [f.c[0] - dv.x * capA * s, f.c[1] - dv.y * capA * s, f.c[2] - dv.z * capA * s], rx: f.rx * co, ry: f.ry * co });
      }
    }
    for (const m of main) out.push(m);
    if (capB > 0) {
      const f = main[main.length - 1],
        dv = dirOf(main[main.length - 2], f);
      for (let k = 1; k <= steps; k++) {
        const a = (k / steps) * (Math.PI / 2),
          s = Math.sin(a),
          co = Math.max(0.004, Math.cos(a));
        out.push({ c: [f.c[0] + dv.x * capB * s, f.c[1] + dv.y * capB * s, f.c[2] + dv.z * capB * s], rx: f.rx * co, ry: f.ry * co });
      }
    }
    return out;
  };

  /* A lofted tube. rings = output of sampleRings. Rings are ellipses (rx across X, ry across the direction
     perpendicular to both X and the path). build() rewrites positions and normals from this.c / rx / ry. */
  R.Loft = class Loft {
    constructor(rings, seg) {
      const n = (this.n = rings.length);
      this.seg = seg;
      this.c = new Float32Array(n * 3);
      this.rx = new Float32Array(n);
      this.ry = new Float32Array(n);
      rings.forEach((r, i) => {
        this.c[i * 3] = r.c[0];
        this.c[i * 3 + 1] = r.c[1];
        this.c[i * 3 + 2] = r.c[2];
        this.rx[i] = r.rx;
        this.ry[i] = r.ry;
      });
      this.base = { c: this.c.slice(), rx: this.rx.slice(), ry: this.ry.slice() };
      const idx = [];
      for (let i = 0; i < n - 1; i++)
        for (let j = 0; j < seg; j++) {
          const a = i * seg + j,
            b = i * seg + ((j + 1) % seg),
            c = (i + 1) * seg + j,
            d = (i + 1) * seg + ((j + 1) % seg);
          idx.push(a, c, b, b, c, d);
        }
      this.geo = new THREE.BufferGeometry();
      this.pos = new Float32Array(n * seg * 3);
      const pa = new THREE.BufferAttribute(this.pos, 3);
      pa.setUsage(THREE.DynamicDrawUsage);
      this.geo.setAttribute('position', pa);
      this.geo.setIndex(idx);
      this.cs = new Float32Array(seg);
      this.sn = new Float32Array(seg);
      for (let j = 0; j < seg; j++) {
        this.cs[j] = Math.cos((j / seg) * Math.PI * 2);
        this.sn[j] = Math.sin((j / seg) * Math.PI * 2);
      }
      this.checked = false;
      this.build();
    }
    reset() {
      this.c.set(this.base.c);
      this.rx.set(this.base.rx);
      this.ry.set(this.base.ry);
    }
    build() {
      const n = this.n,
        seg = this.seg,
        c = this.c,
        p = this.pos;
      for (let i = 0; i < n; i++) {
        const a = Math.max(0, i - 1) * 3,
          b = Math.min(n - 1, i + 1) * 3;
        let tx = c[b] - c[a],
          ty = c[b + 1] - c[a + 1],
          tz = c[b + 2] - c[a + 2];
        const tl = Math.hypot(tx, ty, tz) || 1;
        tx /= tl;
        ty /= tl;
        tz /= tl;
        // n = t x X, with X = (1, 0, 0)  ->  (0, tz, -ty)
        let nx = 0,
          ny = tz,
          nz = -ty;
        const nl = Math.hypot(ny, nz);
        if (nl < 1e-4) {
          ny = 1;
          nz = 0;
        } else {
          ny /= nl;
          nz /= nl;
        }
        const rx = this.rx[i],
          ry = this.ry[i];
        for (let j = 0; j < seg; j++) {
          const o = (i * seg + j) * 3;
          const cx = this.cs[j] * rx,
            cn = this.sn[j] * ry;
          p[o] = c[i * 3] + cx;
          p[o + 1] = c[i * 3 + 1] + ny * cn;
          p[o + 2] = c[i * 3 + 2] + nz * cn;
        }
      }
      this.geo.attributes.position.needsUpdate = true;
      if (!this.checked) {
        // make sure the faces point outward (decided once from the first interior quad)
        this.checked = true;
        const ix = this.geo.index.array,
          i0 = Math.floor(n / 2),
          a = i0 * seg,
          cI = (i0 + 1) * seg,
          bI = i0 * seg + 1;
        const ax = p[a * 3],
          ay = p[a * 3 + 1],
          az = p[a * 3 + 2];
        const e1 = [p[cI * 3] - ax, p[cI * 3 + 1] - ay, p[cI * 3 + 2] - az],
          e2 = [p[bI * 3] - ax, p[bI * 3 + 1] - ay, p[bI * 3 + 2] - az];
        const nrm = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        const out = [ax - c[i0 * 3], ay - c[i0 * 3 + 1], az - c[i0 * 3 + 2]];
        if (nrm[0] * out[0] + nrm[1] * out[1] + nrm[2] * out[2] < 0) {
          for (let k = 0; k < ix.length; k += 3) {
            const t = ix[k + 1];
            ix[k + 1] = ix[k + 2];
            ix[k + 2] = t;
          }
          this.geo.index.needsUpdate = true;
        }
      }
      this.geo.computeVertexNormals();
    }
  };

  /* Two-bone planar IK. dy / dz = target minus hip (dy is negative below the hip).
     Returns the world angles [upper, lower] measured from straight down toward +Z. */
  R.ik2 = function (l1, l2, dy, dz, kneeFwd) {
    let d = Math.hypot(dy, dz);
    d = clamp(d, Math.abs(l1 - l2) + 0.02, (l1 + l2) * 0.9995);
    const psi = Math.atan2(dz, -dy);
    const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const g = Math.acos(clamp((l2 * l2 + d * d - l1 * l1) / (2 * l2 * d), -1, 1));
    return kneeFwd ? [psi + a, psi - g] : [psi - a, psi + g];
  };

  /* Hair: every lock is a chain of points that follows an anchor on the body.
     The chain is pulled toward a target pose (hanging, or streaming back when the unicorn runs), has real
     inertia, and keeps its length. One merged mesh draws all of them. */
  R.Hair = class Hair {
    constructor(material) {
      this.locks = [];
      this.material = material;
      this.mesh = null;
      this.SEG = 6;
      this.tmp = new V3();
      this.tmp2 = new V3();
      this.sideW = new V3();
      this.upW = new V3(0, 1, 0);
    }
    /* o: anchor (Object3D), rest (V3[] in anchor space), r0 (root radius), color, fan (V3 local direction the lock
       spreads toward when streaming), lift, stiff0 / stiff1, damp, flat, stream (0..1 how strongly it streams back) */
    add(o) {
      const n = o.rest.length;
      const L = {
        anchor: o.anchor,
        rest: o.rest.map((v) => v.clone()),
        n,
        r0: o.r0 || 0.1,
        color: new THREE.Color(o.color),
        fan: o.fan ? o.fan.clone() : new V3(),
        lift: o.lift === undefined ? 0.2 : o.lift,
        stiff0: o.stiff0 || 16,
        stiff1: o.stiff1 || 5,
        damp: o.damp || 3.2,
        flat: o.flat || 1.35,
        stream: o.stream === undefined ? 1 : o.stream,
        wave: o.wave === undefined ? 1 : o.wave,
        flut: o.flut === undefined ? 1 : o.flut, // how much of the flutter goes sideways (the rest is up and down)
        ref: (o.ref || new V3(1, 0, 0)).clone().normalize(),
        phase: Math.random() * 6.283,
        cum: new Float32Array(n),
        p: new Float32Array(n * 3),
        q: new Float32Array(n * 3),
        rw: new Float32Array(n * 3),
        init: false,
        v0: 0,
      };
      for (let k = 1; k < n; k++) L.cum[k] = L.cum[k - 1] + L.rest[k].distanceTo(L.rest[k - 1]);
      this.locks.push(L);
      return L;
    }
    finalize(scene) {
      const SEG = this.SEG;
      let nv = 0,
        ni = 0;
      for (const L of this.locks) {
        L.v0 = nv;
        nv += L.n * SEG;
        ni += (L.n - 1) * SEG * 6;
      }
      this.pos = new Float32Array(nv * 3);
      this.nor = new Float32Array(nv * 3);
      const col = new Float32Array(nv * 3);
      const idx = new Uint16Array(ni);
      let w = 0;
      const c = new THREE.Color();
      for (const L of this.locks) {
        for (let k = 0; k < L.n; k++) {
          const u = k / (L.n - 1);
          c.copy(L.color).lerp(new THREE.Color(0xffffff), 0.12 + u * 0.3);
          for (let j = 0; j < SEG; j++) {
            const o = (L.v0 + k * SEG + j) * 3;
            col[o] = c.r;
            col[o + 1] = c.g;
            col[o + 2] = c.b;
          }
        }
        for (let k = 0; k < L.n - 1; k++)
          for (let j = 0; j < SEG; j++) {
            const a = L.v0 + k * SEG + j,
              b = L.v0 + k * SEG + ((j + 1) % SEG),
              cc = L.v0 + (k + 1) * SEG + j,
              d = L.v0 + (k + 1) * SEG + ((j + 1) % SEG);
            idx[w++] = a;
            idx[w++] = cc;
            idx[w++] = b;
            idx[w++] = b;
            idx[w++] = cc;
            idx[w++] = d;
          }
      }
      const g = new THREE.BufferGeometry();
      const pa = new THREE.BufferAttribute(this.pos, 3),
        na = new THREE.BufferAttribute(this.nor, 3);
      pa.setUsage(THREE.DynamicDrawUsage);
      na.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('position', pa);
      g.setAttribute('normal', na);
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      this.geo = g;
      this.mesh = new THREE.Mesh(g, this.material);
      this.mesh.frustumCulled = false;
      this.mesh.userData.outline = true; // two-sided ribbons still get an inked edge
      this.mesh.userData.dyn = true; // positions change every frame
      this.windingChecked = false;
      scene.add(this.mesh);
    }
    reset() {
      for (const L of this.locks) L.init = false;
    }
    /* vel: unicorn velocity (world), speedFrac 0..1, t: seconds */
    update(dt, vel, speedFrac, t, gust) {
      const tmp = this.tmp,
        SEG = this.SEG;
      dt = Math.min(dt, 1 / 24);
      const dirW = this.tmp2.copy(vel);
      const sp = dirW.length();
      if (sp > 0.01) dirW.multiplyScalar(1 / sp);
      else dirW.set(0, 0, 0);
      const amt = Math.pow(speedFrac, 0.85);
      for (const L of this.locks) {
        const n = L.n,
          p = L.p,
          q = L.q,
          rw = L.rw;
        const me = L.anchor.matrixWorld;
        for (let k = 0; k < n; k++) {
          tmp.copy(L.rest[k]).applyMatrix4(me);
          rw[k * 3] = tmp.x;
          rw[k * 3 + 1] = tmp.y;
          rw[k * 3 + 2] = tmp.z;
        }
        const sc = me.elements[0] * me.elements[0] + me.elements[1] * me.elements[1] + me.elements[2] * me.elements[2];
        const scale = Math.sqrt(sc);
        if (!L.init) {
          for (let i = 0; i < n * 3; i++) p[i] = q[i] = rw[i];
          L.init = true;
        }
        // jumped far from the rest pose (teleport, size change): snap back
        const dx0 = p[(n - 1) * 3] - rw[(n - 1) * 3],
          dy0 = p[(n - 1) * 3 + 1] - rw[(n - 1) * 3 + 1],
          dz0 = p[(n - 1) * 3 + 2] - rw[(n - 1) * 3 + 2];
        if (dx0 * dx0 + dy0 * dy0 + dz0 * dz0 > 40 * scale * scale) for (let i = 0; i < n * 3; i++) p[i] = q[i] = rw[i];
        p[0] = rw[0];
        p[1] = rw[1];
        p[2] = rw[2];
        // side vector (anchor X axis, world) for fanning and fluttering
        this.sideW.set(me.elements[0], me.elements[1], me.elements[2]).normalize();
        const fan = tmp.copy(L.fan).transformDirection(me);
        const fx = fan.x,
          fy = fan.y,
          fz = fan.z;
        const dampF = Math.exp(-L.damp * dt);
        const a = amt * L.stream;
        for (let k = 1; k < n; k++) {
          const cum = L.cum[k] * scale,
            kf = k / (n - 1);
          // streaming target: straight back from the root, a little up, fanned out, with a flutter
          const fl = Math.sin(t * 9 - k * 0.85 + L.phase) * 0.1 * cum * L.wave + Math.sin(t * 5.3 - k * 0.5 + L.phase * 1.7) * 0.06 * cum * L.wave;
          const fs = fl * L.flut;
          const sx = rw[0] - dirW.x * cum * 0.95 + fx * cum * 0.45 + this.sideW.x * fs;
          const sy = rw[1] - dirW.y * cum * 0.95 + L.lift * cum + fy * cum * 0.45 + this.sideW.y * fs + Math.sin(t * 7 - k * 0.7 + L.phase) * 0.05 * cum * L.wave;
          const sz = rw[2] - dirW.z * cum * 0.95 + fz * cum * 0.45 + this.sideW.z * fs;
          const tx = rw[k * 3] + (sx - rw[k * 3]) * a,
            ty = rw[k * 3 + 1] + (sy - rw[k * 3 + 1]) * a,
            tz = rw[k * 3 + 2] + (sz - rw[k * 3 + 2]) * a;
          const o = k * 3;
          const vx = (p[o] - q[o]) * dampF,
            vy = (p[o + 1] - q[o + 1]) * dampF,
            vz = (p[o + 2] - q[o + 2]) * dampF;
          q[o] = p[o];
          q[o + 1] = p[o + 1];
          q[o + 2] = p[o + 2];
          p[o] += vx;
          p[o + 1] += vy - 4.5 * dt * dt * (1 - a * 0.7);
          p[o + 2] += vz;
          const st = L.stiff0 + (L.stiff1 - L.stiff0) * kf;
          const kk = 1 - Math.exp(-st * dt);
          p[o] += (tx - p[o]) * kk;
          p[o + 1] += (ty - p[o + 1]) * kk;
          p[o + 2] += (tz - p[o + 2]) * kk;
        }
        // keep each segment its rest length (exact from the root outward)
        for (let k = 1; k < n; k++) {
          const o = k * 3,
            m = (k - 1) * 3;
          const len = Math.hypot(rw[o] - rw[m], rw[o + 1] - rw[m + 1], rw[o + 2] - rw[m + 2]);
          let ex = p[o] - p[m],
            ey = p[o + 1] - p[m + 1],
            ez = p[o + 2] - p[m + 2];
          const el = Math.hypot(ex, ey, ez) || 1e-6;
          const s = len / el;
          p[o] = p[m] + ex * s;
          p[o + 1] = p[m + 1] + ey * s;
          p[o + 2] = p[m + 2] + ez * s;
        }
        // ---- mesh: tapered tube along the chain ----
        let nx = 0,
          ny = 0,
          nz = 0;
        const ref = tmp.copy(L.ref).transformDirection(me);
        nx = ref.x;
        ny = ref.y;
        nz = ref.z;
        for (let k = 0; k < n; k++) {
          const k0 = Math.max(0, k - 1) * 3,
            k1 = Math.min(n - 1, k + 1) * 3;
          let tx = p[k1] - p[k0],
            ty = p[k1 + 1] - p[k0 + 1],
            tz = p[k1 + 2] - p[k0 + 2];
          const tl = Math.hypot(tx, ty, tz) || 1;
          tx /= tl;
          ty /= tl;
          tz /= tl;
          // wide axis: previous one made perpendicular to the new tangent
          const dn = nx * tx + ny * ty + nz * tz;
          nx -= tx * dn;
          ny -= ty * dn;
          nz -= tz * dn;
          let nl = Math.hypot(nx, ny, nz);
          if (nl < 1e-4) {
            nx = ty;
            ny = -tx;
            nz = 0;
            nl = Math.hypot(nx, ny, nz) || 1;
          }
          nx /= nl;
          ny /= nl;
          nz /= nl;
          const bx = ty * nz - tz * ny,
            by = tz * nx - tx * nz,
            bz = tx * ny - ty * nx;
          const u = k / (n - 1);
          const r = L.r0 * scale * (Math.pow(1 - u, 0.8) * 0.95 + 0.05) * (1 + 0.25 * Math.sin(u * 3.1));
          for (let j = 0; j < SEG; j++) {
            const ang = (j / SEG) * 6.28318,
              cs = Math.cos(ang),
              sn = Math.sin(ang);
            const o = (L.v0 + k * SEG + j) * 3;
            this.pos[o] = p[k * 3] + (nx * cs * L.flat + bx * sn) * r;
            this.pos[o + 1] = p[k * 3 + 1] + (ny * cs * L.flat + by * sn) * r;
            this.pos[o + 2] = p[k * 3 + 2] + (nz * cs * L.flat + bz * sn) * r;
            this.nor[o] = nx * cs + bx * sn * 1.2;
            this.nor[o + 1] = ny * cs + by * sn * 1.2;
            this.nor[o + 2] = nz * cs + bz * sn * 1.2;
          }
        }
      }
      this.geo.attributes.position.needsUpdate = true;
      this.geo.attributes.normal.needsUpdate = true;
      if (!this.windingChecked) {
        // make sure the tubes face outward (decided once)
        this.windingChecked = true;
        const L = this.locks[0],
          ix = this.geo.index.array,
          k = Math.max(1, Math.floor(L.n / 2));
        const a = L.v0 + k * SEG,
          cI = L.v0 + (k + 1) * SEG,
          bI = L.v0 + k * SEG + 1;
        const P = this.pos;
        const ax = P[a * 3],
          ay = P[a * 3 + 1],
          az = P[a * 3 + 2];
        const e1 = [P[cI * 3] - ax, P[cI * 3 + 1] - ay, P[cI * 3 + 2] - az],
          e2 = [P[bI * 3] - ax, P[bI * 3 + 1] - ay, P[bI * 3 + 2] - az];
        const nm = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        const out = [ax - L.p[k * 3], ay - L.p[k * 3 + 1], az - L.p[k * 3 + 2]];
        if (nm[0] * out[0] + nm[1] * out[1] + nm[2] * out[2] < 0) {
          for (let i = 0; i < ix.length; i += 3) {
            const t = ix[i + 1];
            ix[i + 1] = ix[i + 2];
            ix[i + 2] = t;
          }
          this.geo.index.needsUpdate = true;
        }
      }
    }
  };
})();
