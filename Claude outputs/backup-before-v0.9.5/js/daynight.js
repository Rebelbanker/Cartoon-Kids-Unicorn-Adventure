/* Day and night: sky colors, lights, fog, sleepy moon, stars, aurora, fireflies, glow, shooting stars */
(function () {
  const UA = window.UA,
    C = UA.C;
  const V3 = THREE.Vector3;
  const T = (UA.Time = {
    hour: 9,
    auto: true,
    night: 0,
    skipTo: null,
    hoursPerSec: 24 / 600, // a full day takes 10 minutes
    sunDir: new V3(0.45, 0.5, -0.8).normalize(),
    moonDir: new V3(-0.45, -0.5, -0.8),
    wishT: 0,
    nextStar: 20,
  });

  // key: hour, sky top, sky middle, horizon, fog, hemi sky, hemi ground, hemi intensity, sun/moon color, sun/moon intensity, night amount
  const K = (h, top, mid, hor, fog, hs, hg, hi, sc, si, night) => ({
    h,
    top: new THREE.Color(top),
    mid: new THREE.Color(mid),
    hor: new THREE.Color(hor),
    fog: new THREE.Color(fog),
    hs: new THREE.Color(hs),
    hg: new THREE.Color(hg),
    hi,
    sc: new THREE.Color(sc),
    si,
    night,
  });
  const NIGHT = [0x1d1b5e, 0x4a2f94, 0xa85bb8, 0x56408c, 0x6f7cf0, 0x4d3f8f, 0.8, 0x9fb0ff, 0.5, 1];
  const DAY = [C.SKY_TOP, C.SKY_MID, C.SKY_HORIZON, C.FOG, 0xfff2f9, 0xd8f2e6, 2.15, 0xfff4e0, 1.3, 0];
  const KEYS = [
    K(0, ...NIGHT),
    K(5.2, 0x2c2878, 0x7a4aa8, 0xf08fb0, 0x9a70b0, 0x9a9cff, 0x7a62a8, 1.1, 0xffb0b8, 0.6, 0.8),
    K(7, 0x8f9af0, 0xffbddf, 0xffd2a8, 0xffd2c8, 0xffe4ee, 0xe0cce8, 1.9, 0xffd0a0, 1.0, 0.1),
    K(9.2, ...DAY),
    K(16, ...DAY),
    K(18, 0xa392f2, 0xffb0d6, 0xffc08c, 0xffcfc2, 0xffe2ee, 0xdcc4e8, 1.95, 0xffb085, 1.0, 0.1),
    K(19.6, 0x3a3190, 0xb45ab8, 0xff8f9c, 0xc07fa8, 0xb4a2ff, 0x7a62a8, 1.3, 0xc3a3ff, 0.7, 0.55),
    K(21.2, ...NIGHT),
    K(24, ...NIGHT),
  ];
  const PHASES = [
    { name: 'Sunrise', note: 'A new day begins', h: 7 },
    { name: 'Sunny day', note: 'Bright and cheerful', h: 11 },
    { name: 'Sunset', note: 'The sky is turning pink', h: 18.3 },
    { name: 'Starry night', note: 'Fireflies are out!', h: 22.5 },
  ];
  const cur = { top: new THREE.Color(), mid: new THREE.Color(), hor: new THREE.Color(), fog: new THREE.Color(), hs: new THREE.Color(), hg: new THREE.Color(), sc: new THREE.Color(), hi: 2, si: 1, night: 0 };

  let scene, hemi, dirLight, hornLight, moon, moonMat, sunBase;
  let ff, ffGeo, ffMat, ffPos, ffCol, ffSize, ffAlpha;
  const FF = 220,
    FR = 55;
  const ffd = [];
  let star = null;
  let iconNight = null;
  let phaseSeen = '';

  function moonTexture() {
    const s = 256,
      c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(s / 2, s / 2, s * 0.2, s / 2, s / 2, s / 2);
    grd.addColorStop(0, 'rgba(255,246,214,0.6)');
    grd.addColorStop(1, 'rgba(255,246,214,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#fff6d8';
    g.beginPath();
    g.arc(s / 2, s / 2, s * 0.26, 0, 6.283);
    g.fill();
    g.fillStyle = 'rgba(236,218,166,0.65)';
    [[0.58, 0.4, 0.045], [0.42, 0.62, 0.055], [0.62, 0.63, 0.03], [0.4, 0.4, 0.025]].forEach((q) => {
      g.beginPath();
      g.arc(s * q[0], s * q[1], s * q[2], 0, 6.283);
      g.fill();
    });
    g.fillStyle = 'rgba(255,150,175,0.5)';
    [[0.385, 0.555], [0.615, 0.555]].forEach((q) => {
      g.beginPath();
      g.ellipse(s * q[0], s * q[1], s * 0.03, s * 0.018, 0, 0, 6.283);
      g.fill();
    });
    g.strokeStyle = '#8a6f9e';
    g.lineWidth = s * 0.013;
    g.lineCap = 'round';
    [0.43, 0.57].forEach((x) => {
      g.beginPath();
      g.arc(s * x, s * 0.5, s * 0.03, 1.15 * Math.PI, 1.85 * Math.PI);
      g.stroke();
    });
    g.beginPath();
    g.arc(s * 0.5, s * 0.535, s * 0.04, 0.2 * Math.PI, 0.8 * Math.PI);
    g.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function initFireflies() {
    ffPos = new Float32Array(FF * 3);
    ffCol = new Float32Array(FF * 3);
    ffSize = new Float32Array(FF);
    ffAlpha = new Float32Array(FF);
    const rnd = UA.rng(C.SEED + 77);
    for (let i = 0; i < FF; i++) {
      ffd.push({ x: (rnd() - 0.5) * FR * 2, z: (rnd() - 0.5) * FR * 2, hy: 0.6 + rnd() * 4.5, ph: rnd() * 40, sp: 1.2 + rnd() * 2.2, a: rnd() * 6.28, hue: rnd() });
      const warm = ffd[i].hue < 0.7;
      ffCol[i * 3] = warm ? 1.0 : 0.65;
      ffCol[i * 3 + 1] = warm ? 0.93 : 1.0;
      ffCol[i * 3 + 2] = warm ? 0.45 : 0.75;
    }
    ffGeo = new THREE.BufferGeometry();
    const at = (arr, n, name) => {
      const a = new THREE.BufferAttribute(arr, n);
      a.setUsage(THREE.DynamicDrawUsage);
      ffGeo.setAttribute(name, a);
    };
    at(ffPos, 3, 'position');
    at(ffCol, 3, 'color');
    at(ffSize, 1, 'size');
    at(ffAlpha, 1, 'alpha');
    ffMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uScale: { value: 600 } },
      vertexShader:
        'attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vColor; varying float vAlpha; uniform float uScale;' +
        'void main(){ vColor = color; vAlpha = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader:
        'varying vec3 vColor; varying float vAlpha; void main(){ float d = length(gl_PointCoord*2.0-1.0); float a = pow(max(0.0,1.0-d),2.2) + smoothstep(0.28,0.0,d);' +
        'gl_FragColor = vec4(vColor * a * vAlpha, 1.0); gl_FragColor = linearToOutputTexel(gl_FragColor); }',
    });
    ff = new THREE.Points(ffGeo, ffMat);
    ff.frustumCulled = false;
    ff.renderOrder = 6;
    ff.visible = false;
    scene.add(ff);
    UA.FX.extraMats.push(ffMat);
  }

  T.init = function (sc) {
    scene = sc;
    hemi = new THREE.HemisphereLight(0xfff2f9, 0xd8f2e6, 2.15);
    dirLight = new THREE.DirectionalLight(0xfff4e0, 1.3);
    hornLight = new THREE.PointLight(0xffc4ec, 0, 24, 2);
    scene.add(hemi, dirLight, hornLight);
    moonMat = new THREE.SpriteMaterial({ map: moonTexture(), fog: false, depthWrite: false, transparent: true });
    moon = new THREE.Sprite(moonMat);
    moon.scale.set(150, 150, 1);
    moon.renderOrder = -9;
    scene.add(moon);
    sunBase = UA.World.sun.material.color.clone();
    initFireflies();
    T.apply(0);
  };

  function sample() {
    const h = ((T.hour % 24) + 24) % 24;
    let i = 0;
    while (i < KEYS.length - 2 && h >= KEYS[i + 1].h) i++;
    const a = KEYS[i],
      b = KEYS[i + 1];
    const k = UA.smoothstep(a.h, b.h, h);
    cur.top.lerpColors(a.top, b.top, k);
    cur.mid.lerpColors(a.mid, b.mid, k);
    cur.hor.lerpColors(a.hor, b.hor, k);
    cur.fog.lerpColors(a.fog, b.fog, k);
    cur.hs.lerpColors(a.hs, b.hs, k);
    cur.hg.lerpColors(a.hg, b.hg, k);
    cur.sc.lerpColors(a.sc, b.sc, k);
    cur.hi = UA.lerp(a.hi, b.hi, k);
    cur.si = UA.lerp(a.si, b.si, k);
    cur.night = UA.lerp(a.night, b.night, k);
    return h;
  }

  // push the current time of day into lights, sky, fog and glow
  T.apply = function (t) {
    const W = UA.World;
    const h = sample();
    const a = ((h - 6) / 24) * Math.PI * 2;
    T.sunDir.set(Math.cos(a) * 0.9, Math.sin(a) * 0.5, -0.8).normalize();
    T.moonDir.set(-Math.cos(a) * 0.9, -Math.sin(a) * 0.5, -0.8).normalize();
    T.night = cur.night;
    UA.glowU.value = cur.night;
    scene.fog.color.copy(cur.fog);
    scene.background.copy(cur.fog);
    hemi.color.copy(cur.hs);
    hemi.groundColor.copy(cur.hg);
    // cartoon lighting: less flat sky light, more punchy sun, so the cel-shaded bands read clearly (hiK / siK can be overridden to tune)
    hemi.intensity = cur.hi * (T.hiK !== undefined ? T.hiK : 0.66);
    // light comes from the sun by day and the moon by night, blending through twilight
    const w = UA.smoothstep(0.12, -0.12, T.sunDir.y);
    const ld = new V3().lerpVectors(T.sunDir, T.moonDir, w);
    ld.y = Math.max(ld.y, 0.3);
    ld.normalize();
    dirLight.position.copy(ld).multiplyScalar(100);
    dirLight.color.copy(cur.sc);
    dirLight.intensity = cur.si * (T.siK !== undefined ? T.siK : 1.7);
    const u = W.sky.material.uniforms;
    u.top.value.copy(cur.top);
    u.mid.value.copy(cur.mid);
    u.hor.value.copy(cur.hor);
    u.uNight.value = cur.night;
    u.uTime.value = t;
    // sun and moon discs
    const sm = W.sun.material;
    sm.opacity = UA.smoothstep(-0.12, 0.05, T.sunDir.y);
    sm.color.copy(sunBase).lerp(new THREE.Color(0xff9a6a), 1 - UA.smoothstep(0.0, 0.35, T.sunDir.y));
    moonMat.opacity = UA.smoothstep(-0.05, 0.12, T.moonDir.y) * UA.smoothstep(0.2, 0.7, cur.night);
    // soft things dim a little at night
    if (W.cloudMat) {
      W.cloudMat.emissiveIntensity = UA.lerp(0.55, 0.16, cur.night);
      W.cloudMat.emissive.setHex(cur.night > 0.4 ? 0xcdbbff : 0xffeef8);
    }
    if (W.water) {
      W.water.material.emissive.setHex(0x5fa8ff);
      W.water.material.emissiveIntensity = cur.night * 0.35;
    }
  };

  function phaseOf(h) {
    if (h >= 5.2 && h < 9.2) return 'Sunrise';
    if (h >= 9.2 && h < 17) return 'Sunny day';
    if (h >= 17 && h < 20.6) return 'Sunset';
    return 'Starry night';
  }

  // jump to the next part of the day with a quick time-lapse
  T.skip = function () {
    const h = T.hour % 24;
    let next = PHASES.find((p) => p.h > h + 0.3);
    if (!next) next = PHASES[0];
    T.skipTo = next.h;
    T.skipPhase = next;
    if (UA.Audio && UA.Audio.whoosh) UA.Audio.whoosh();
  };
  T.goTo = function (h) {
    T.skipTo = h;
    T.skipPhase = PHASES.find((p) => p.h === h) || null;
    if (UA.Audio.whoosh) UA.Audio.whoosh();
  };
  T.setHour = function (h) {
    T.hour = h;
    T.skipTo = null;
  };

  function launchStar(camera) {
    const dir = new V3();
    camera.getWorldDirection(dir);
    const yaw = Math.atan2(dir.x, dir.z) + (Math.random() - 0.5) * 1.3;
    const el = 0.35 + Math.random() * 0.5;
    const o = camera.position;
    const sgn = Math.random() < 0.5 ? -1 : 1;
    star = {
      x: o.x + Math.sin(yaw) * Math.cos(el) * 300,
      y: o.y + Math.sin(el) * 300,
      z: o.z + Math.cos(yaw) * Math.cos(el) * 300,
      vx: Math.cos(yaw) * 120 * sgn,
      vy: -42,
      vz: -Math.sin(yaw) * 120 * sgn,
      t: 1.5,
    };
    T.wishT = 6.5;
    UA.UI.toast('A shooting star!<small>Cast your magic to make a wish</small>', 3600);
    if (UA.Audio.shimmer) UA.Audio.shimmer();
  }

  // called when the unicorn casts a spell; returns true if a wish was granted
  T.onCast = function (uni) {
    if (T.wishT <= 0) return false;
    T.wishT = 0;
    const s = UA.state;
    s.treats = Math.min(30, s.treats + 2);
    const tip = uni.hornTip(new V3());
    UA.FX.burst(tip, 46);
    UA.FX.growFlowers(uni.pos.x, uni.pos.z, 11, 40);
    UA.Audio.fanfare();
    UA.UI.toast('Your wish came true!<small>+2 gumdrop treats</small>', 3600);
    if (UA.refreshHUD) UA.refreshHUD();
    UA.save();
    return true;
  };

  T.update = function (dt, t, camera, uni, playing) {
    // time passes
    if (T.skipTo !== null) {
      const diff = (((T.skipTo - T.hour) % 24) + 24) % 24;
      const step = 5.5 * dt;
      if (diff <= step) {
        T.hour = T.skipTo;
        T.skipTo = null;
        if (T.skipPhase && playing) UA.UI.toast(T.skipPhase.name + '<small>' + T.skipPhase.note + '</small>', 2800);
        if (T.skipPhase) UA.Audio.shimmer && UA.Audio.shimmer();
        T.skipPhase = null;
      } else T.hour += step;
    } else if (T.auto) T.hour += dt * T.hoursPerSec;
    T.hour = ((T.hour % 24) + 24) % 24;
    T.apply(t);

    const W = UA.World;
    W.sun.position.copy(camera.position).addScaledVector(T.sunDir, 700);
    moon.position.copy(camera.position).addScaledVector(T.moonDir, 700);

    // HUD icon follows day/night
    const isN = T.night > 0.5;
    if (isN !== iconNight) {
      iconNight = isN;
      if (UA.UI.setTimeIcon) UA.UI.setTimeIcon(isN);
    }
    // announce the part of the day when it rolls by on its own
    if (playing && T.skipTo === null) {
      const ph = phaseOf(T.hour);
      if (phaseSeen && ph !== phaseSeen) {
        const info = PHASES.find((p) => p.name === ph);
        if (info) UA.UI.toast(info.name + '<small>' + info.note + '</small>', 2800);
      }
      phaseSeen = ph;
    } else if (!phaseSeen) phaseSeen = phaseOf(T.hour);

    // the horn lights the way at night
    if (uni) {
      const tip = uni.hornTip(new V3());
      hornLight.position.set(tip.x, tip.y + 0.6, tip.z);
      const gearStar = UA.state.unlocked && UA.state.unlocked.indexOf('star') >= 0;
      hornLight.intensity = cur.night * (gearStar ? 55 : 32) + uni.hornGlow * 60;
    }

    // fireflies
    if (cur.night > 0.04 && uni) {
      ff.visible = true;
      const px = uni.pos.x,
        pz = uni.pos.z;
      for (let i = 0; i < FF; i++) {
        const d = ffd[i];
        d.a += Math.sin(t * 0.7 + d.ph) * dt * 1.5;
        d.x += Math.cos(d.a) * 0.7 * dt;
        d.z += Math.sin(d.a) * 0.7 * dt;
        const dx = d.x - px,
          dz = d.z - pz;
        if (dx > FR) d.x -= FR * 2;
        else if (dx < -FR) d.x += FR * 2;
        if (dz > FR) d.z -= FR * 2;
        else if (dz < -FR) d.z += FR * 2;
        ffPos[i * 3] = d.x;
        ffPos[i * 3 + 1] = Math.max(W.groundAt(d.x, d.z), 0) + d.hy + Math.sin(t * 1.3 + d.ph) * 0.4;
        ffPos[i * 3 + 2] = d.z;
        const blink = 0.5 + 0.5 * Math.sin(t * d.sp + d.ph);
        const near = UA.clamp(1 - Math.hypot(d.x - px, d.z - pz) / 7, 0, 1);
        const edge = 1 - UA.smoothstep(FR * 0.7, FR, Math.max(Math.abs(d.x - px), Math.abs(d.z - pz)));
        ffAlpha[i] = cur.night * (0.25 + 0.75 * blink * blink + near * 0.6) * edge;
        ffSize[i] = 0.3 + blink * 0.15 + near * 0.22;
      }
      ffGeo.attributes.position.needsUpdate = true;
      ffGeo.attributes.size.needsUpdate = true;
      ffGeo.attributes.alpha.needsUpdate = true;
    } else if (ff) ff.visible = false;

    // shooting stars
    if (playing) {
      T.wishT = Math.max(0, T.wishT - dt);
      if (cur.night > 0.75) {
        T.nextStar -= dt;
        if (T.nextStar <= 0 && !star) {
          T.nextStar = 25 + Math.random() * 35;
          launchStar(camera);
        }
      }
    }
    if (star) {
      star.t -= dt;
      star.x += star.vx * dt;
      star.y += star.vy * dt;
      star.z += star.vz * dt;
      for (let k = 0; k < 2; k++) {
        UA.FX.emit({ x: star.x - star.vx * 0.012 * k, y: star.y - star.vy * 0.012 * k, z: star.z - star.vz * 0.012 * k, color: k ? 0xfff2a8 : 0xffffff, size: k ? 7 : 11, shape: 1, life: 0.9, grow: -0.9, drag: 3 });
      }
      if (star.t <= 0) star = null;
    }
  };
})();
