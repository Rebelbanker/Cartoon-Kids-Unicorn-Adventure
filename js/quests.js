/* Quests: gentle story goals given by creatures. One at a time, no failing, rewards are treats and happy friends. */
(function () {
  const UA = window.UA;
  const V3 = THREE.Vector3;
  const Q = (UA.Quests = { active: null, babies: [], scene: null });

  function exclaim() {
    const g = new THREE.Group();
    const mat = new THREE.MeshToonMaterial({ color: 0xffd23f, gradientMap: UA.gradient, emissive: 0xffb300, emissiveIntensity: 0.7 });
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.1, 0.62, 8), mat);
    bar.position.y = 0.45;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), mat);
    dot.position.y = -0.03;
    g.add(bar, dot);
    return g;
  }

  const DEFS = [
    {
      id: 'babies',
      giver: 'bunny0',
      goal: 3,
      title: (g) => 'Find ' + g.name + "'s baby bunnies",
      offer: (g) => ['My babies are playing hide and seek!', 'Can you find all three?'],
      done: (g) => 'You found them all! Thank you!',
      reward: 4,
    },
    {
      id: 'hungry',
      giver: 'dragon0',
      goal: 3,
      title: (g) => 'Feed ' + g.name + ' three gumdrops',
      offer: (g) => ['My tummy is rumbling...', 'Could you feed me three gumdrops?'],
      done: (g) => 'Yum yum yum! Thank you!',
      reward: 5,
    },
    {
      id: 'tag',
      giver: 'fox0',
      goal: 3,
      title: (g) => 'Catch ' + g.name + ' three times',
      offer: (g) => ['Wanna play tag?', 'Catch me if you can!'],
      done: (g) => 'You are SO fast! Great game!',
      reward: 4,
    },
    {
      id: 'song',
      giver: 'sheep0',
      goal: 3,
      title: (g) => 'Play ' + g.name + "'s song on the chimes",
      offer: (g) => ['I love music so much!', 'Can you play my song on the Rainbow Chimes?'],
      done: (g) => 'What a beautiful song!',
      reward: 5,
    },
  ];
  Q.defs = DEFS;

  function qs(id) {
    const all = UA.state.quests || (UA.state.quests = {});
    return all[id] || (all[id] = { s: 'idle', n: 0, found: [] });
  }

  Q.init = function (scene) {
    Q.scene = scene;
    DEFS.forEach((d) => {
      d.marker = exclaim();
      d.marker.visible = false;
      scene.add(d.marker);
    });
    // resume an active quest from a saved game
    const act = DEFS.find((d) => qs(d.id).s === 'active');
    if (act) Q.begin(act, true);
  };

  Q.hudText = function () {
    if (!Q.active) return null;
    const g = UA.Creatures.byId(Q.active.giver);
    return Q.active.title(g) + '  ' + qs(Q.active.id).n + '/' + Q.active.goal;
  };

  Q.begin = function (d, resumed) {
    const g = UA.Creatures.byId(d.giver);
    if (!g) return;
    const st = qs(d.id);
    st.s = 'active';
    Q.active = d;
    if (d.id === 'babies') Q.spawnBabies(d);
    if (d.id === 'tag') g.tag = true;
    if (d.id === 'song' && UA.Wonders) UA.Wonders.songBegin();
    UA.UI.setQuest(Q.hudText());
    if (!resumed) {
      const lines = d.offer(g);
      g.say(lines[0]);
      setTimeout(() => g.say(lines[1]), 1900);
      g.jump(6);
      UA.Audio.chirp(g.S.voice);
      UA.UI.toast('New quest!<small>' + d.title(g) + '</small>', 4200);
      UA.save();
    }
  };

  Q.progress = function (d, n) {
    const st = qs(d.id);
    st.n = n;
    UA.UI.setQuest(Q.hudText());
    UA.Audio.ring(n);
    if (n >= d.goal) Q.complete(d);
    UA.save();
  };

  Q.complete = function (d) {
    const g = UA.Creatures.byId(d.giver);
    const st = qs(d.id);
    st.s = 'done';
    Q.active = null;
    UA.UI.setQuest(null);
    if (d.id === 'tag' && g) g.tag = false;
    if (g) {
      g.bond = 3;
      g.say(d.done(g));
      g.jump(8);
      g.hearts(14);
      if (!g.follow) UA.Creatures.makeFollower(g);
      UA.FX.burst(new V3(g.pos.x, g.pos.y + 1.6, g.pos.z), 40);
    }
    UA.state.treats = Math.min(30, UA.state.treats + d.reward);
    UA.Audio.fanfare();
    UA.UI.toast('Quest complete! +' + d.reward + ' treats<small>' + (g ? g.name + ' is now a best friend' : '') + '</small>', 4600);
    if (UA.onBond) UA.onBond(g, 'quest');
    UA.save();
  };

  /* ----- baby bunny hide and seek ----- */
  function pickSpots(giver) {
    const ms = (UA.World.mushrooms || []).slice();
    const rnd = UA.rng(UA.C.SEED + 31);
    const cands = ms
      .map((m) => ({ m, d: Math.hypot(m.x - giver.home.x, m.z - giver.home.z) }))
      .filter((o) => o.d > 22 && o.d < 90)
      .sort((a, b) => a.d - b.d)
      .slice(0, 12);
    // shuffle deterministically
    for (let i = cands.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = cands[i];
      cands[i] = cands[j];
      cands[j] = t;
    }
    const spots = [];
    for (const c of cands) {
      if (spots.every((s) => Math.hypot(s.x - c.m.x, s.z - c.m.z) > 24)) {
        const a = Math.atan2(c.m.z - giver.home.z, c.m.x - giver.home.x); // hide on the far side
        const off = 1.1 * c.m.s + 0.9;
        spots.push({ x: c.m.x + Math.cos(a) * off, z: c.m.z + Math.sin(a) * off });
      }
      if (spots.length >= 3) break;
    }
    return spots;
  }

  Q.spawnBabies = function (d) {
    Q.clearBabies();
    const g = UA.Creatures.byId(d.giver);
    const st = qs(d.id);
    const spots = pickSpots(g);
    spots.forEach((p, i) => {
      if (st.found.indexOf(i) >= 0) return;
      const m = UA.Creatures.buildBaby(i);
      m.group.scale.setScalar(0.62);
      const y = UA.World.groundAt(p.x, p.z);
      m.group.position.set(p.x, y, p.z);
      m.group.rotation.y = Math.random() * 6;
      Q.scene.add(m.group);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: UA.Creatures._shadowTex, transparent: true, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2;
      sh.scale.set(1.6, 1.6, 1);
      sh.position.set(p.x, y + 0.08, p.z);
      Q.scene.add(sh);
      Q.babies.push({ idx: i, group: m.group, parts: m.parts, shadow: sh, pos: new V3(p.x, y, p.z), scale: 0.62, t: Math.random() * 5, found: false, leave: 0, beacon: 0 });
    });
  };
  Q.clearBabies = function () {
    Q.babies.forEach((b) => {
      Q.scene.remove(b.group);
      Q.scene.remove(b.shadow);
    });
    Q.babies = [];
  };

  Q.onFeed = function (c) {
    const d = Q.active;
    if (d && d.id === 'hungry' && c.id === d.giver) Q.progress(d, qs(d.id).n + 1);
  };

  Q.update = function (dt, t, uni) {
    const W = UA.World;
    // exclamation marks above quest givers, and offering quests when close
    for (const d of DEFS) {
      const g = UA.Creatures.byId(d.giver);
      const st = qs(d.id);
      const show = g && !g.far && st.s === 'idle';
      d.marker.visible = !!show;
      if (!g) continue;
      if (show) {
        d.marker.position.set(g.pos.x, g.pos.y + (g.type === 'dragon' ? 3.6 : g.type === 'bunny' ? 3.3 : 3.0) * g.scale + Math.sin(t * 3) * 0.15, g.pos.z);
        d.marker.rotation.y = t * 2;
        if (!Q.active && !(UA.Folk && UA.Folk.questActive()) && Math.hypot(uni.pos.x - g.pos.x, uni.pos.z - g.pos.z) < 8.5) Q.begin(d);
      }
    }
    const d = Q.active;
    if (!d) return;
    const st = qs(d.id);
    if (d.id === 'babies') {
      for (const b of Q.babies) {
        b.t += dt;
        if (!b.found) {
          // little ear wiggle and a pink beacon so they can be spotted from afar
          b.parts.ears.forEach((e, i) => (e.rotation.x = Math.sin(b.t * 4 + i) * 0.12));
          b.parts.body.position.y = Math.max(0, Math.sin(b.t * 2.2) * 0.03);
          b.beacon -= dt;
          if (b.beacon <= 0) {
            b.beacon = 0.45;
            UA.FX.emit({ x: b.pos.x, y: b.pos.y + 1.4, z: b.pos.z, vx: 0, vy: 2.2, vz: 0, color: 0xff9ac4, size: 0.5, shape: 1, life: 1.8, grow: -0.4, gravity: -0.2, drag: 0.1 });
            if (Math.random() < 0.35) UA.FX.hearts(new V3(b.pos.x, b.pos.y + 1.2, b.pos.z), 1);
          }
          const dist = Math.hypot(uni.pos.x - b.pos.x, uni.pos.z - b.pos.z);
          if (dist < 4.6 && Math.abs(uni.pos.y - b.pos.y) < 5) {
            b.found = true;
            b.leave = 1.8;
            st.found.push(b.idx);
            UA.UI.say(b, 'Peekaboo!');
            UA.FX.burst(new V3(b.pos.x, b.pos.y + 1, b.pos.z), 24);
            UA.FX.hearts(new V3(b.pos.x, b.pos.y + 1.2, b.pos.z), 8);
            UA.Audio.chirp(980);
            Q.progress(d, st.found.length);
          }
        } else {
          b.leave -= dt;
          const k = Math.sin(Math.min(1, (1.8 - b.leave) / 0.5) * 3.1416);
          b.parts.body.position.y = Math.abs(Math.sin(b.t * 9)) * 0.7;
          if (b.leave <= 0) {
            UA.FX.puff(new V3(b.pos.x, b.pos.y + 0.5, b.pos.z), 8, 0xffffff);
            Q.scene.remove(b.group);
            Q.scene.remove(b.shadow);
            b.gone = true;
          }
        }
      }
      Q.babies = Q.babies.filter((b) => !b.gone);
    } else if (d.id === 'tag') {
      const g = UA.Creatures.byId(d.giver);
      if (g) {
        g.tagCd = Math.max(0, (g.tagCd || 0) - dt);
        const dist = Math.hypot(uni.pos.x - g.pos.x, uni.pos.z - g.pos.z);
        if (dist < 3.0 && g.tagCd <= 0 && Math.abs(uni.pos.y - g.pos.y) < 4) {
          g.tagCd = 2.2;
          g.say(UA.pick(['You got me!', 'Tag!', 'Whoa, so quick!']));
          g.jump(8);
          UA.FX.burst(new V3(g.pos.x, g.pos.y + 1.2, g.pos.z), 22);
          UA.Audio.chirp(g.S.voice * 1.3);
          Q.progress(d, st.n + 1);
        }
      }
    }
  };
})();
