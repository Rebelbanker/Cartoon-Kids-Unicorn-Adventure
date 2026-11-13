/* Mini-games: Rainbow Ring Run (gallop, jump and glide through floating rings) */
(function () {
  const UA = window.UA,
    C = UA.C;
  const V3 = THREE.Vector3;

  const Rings = (UA.Rings = { rings: [], count: 0, total: 8, done: false, resetT: 0, t: 0 });

  Rings.build = function (scene) {
    const W = UA.World;
    const heights = [2.0, 2.0, 2.6, 3.8, 5.0, 6.2, 7.2, 7.8];
    const geo = new THREE.TorusGeometry(2.5, 0.3, 10, 30);
    const pts = [];
    for (let k = 0; k < Rings.total; k++) {
      const x = 22 + k * 9.5;
      const z = -2 + Math.sin(k * 0.6) * 12;
      pts.push(new V3(x, W.groundAt(x, z) + heights[k], z));
    }
    for (let k = 0; k < Rings.total; k++) {
      const col = C.RAINBOW[k % C.RAINBOW.length];
      const mat = new THREE.MeshToonMaterial({ color: col, gradientMap: UA.gradient, emissive: col, emissiveIntensity: 0.45, transparent: true, opacity: 1 });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pts[k]);
      const next = pts[Math.min(k + 1, Rings.total - 1)];
      const look = k < Rings.total - 1 ? next : pts[k].clone().add(pts[k].clone().sub(pts[k - 1]));
      m.lookAt(look);
      scene.add(m);
      // little cloud base so rings feel anchored
      Rings.rings.push({ mesh: m, mat, pos: pts[k], taken: false, k, pulse: Math.random() * 6 });
    }
    Rings.nextIdx = 0;
  };

  Rings.reset = function () {
    Rings.count = 0;
    Rings.done = false;
    Rings.rings.forEach((r) => {
      r.taken = false;
      r.mesh.visible = true;
      r.mesh.scale.setScalar(0.01);
    });
    if (UA.UI) UA.UI.setRings(0, Rings.total, false);
  };

  Rings.update = function (dt, t, uni) {
    Rings.t = t;
    const c = uni.center(new V3());
    let nextFound = false;
    for (const r of Rings.rings) {
      if (r.taken) continue;
      // appear / pulse
      const isNext = !nextFound;
      nextFound = true;
      const target = isNext ? 1.12 + Math.sin(t * 5 + r.pulse) * 0.06 : 0.92;
      const s = r.mesh.scale.x;
      r.mesh.scale.setScalar(s + (target - s) * Math.min(1, dt * 6));
      r.mat.opacity = isNext ? 1 : 0.5;
      r.mat.emissiveIntensity = isNext ? 0.7 : 0.25;
      r.mesh.rotation.z += dt * (isNext ? 0.8 : 0.2);
      if (isNext && Math.random() < dt * 5) UA.FX.sparkles(r.pos, 1, C.RAINBOW[r.k % 6], 4, 0);
      const d = c.distanceTo(r.pos);
      if (d < 3.4) {
        r.taken = true;
        r.mesh.visible = false;
        Rings.count++;
        UA.FX.burst(r.pos, 26);
        UA.FX.hearts(r.pos, 3);
        UA.Audio.ring(Rings.count - 1);
        if (UA.UI) UA.UI.setRings(Rings.count, Rings.total, true);
        if (Rings.count >= Rings.total) {
          Rings.done = true;
          Rings.resetT = 14;
          UA.Audio.fanfare();
          // fireworks along the course
          Rings.rings.forEach((rr, i) => setTimeout(() => UA.FX.burst(rr.pos, 24), i * 120));
          if (UA.onRingsDone) UA.onRingsDone();
        }
      }
    }
    if (Rings.done) {
      Rings.resetT -= dt;
      if (Rings.resetT <= 0) Rings.reset();
    }
  };
})();
