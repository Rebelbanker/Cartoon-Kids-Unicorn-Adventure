/* Frostglow Peak guides: seven animals wait along the spiral road and lead the way up the mountain. Each one greets you, runs
   ahead and waits whenever you fall behind, cheers if you gallop past, then hands you on to the next friend. Nobody has to
   press anything: just follow them (or ignore them and ride off, nothing is ever lost). The module works out where you are
   on the road, tells each guide where to stand and whether to run or wait (the creature's update does the moving), and
   speaks up: greetings, encouragement, "halfway!" toasts, a little fanfare at the top, and a climb % in the HUD. */
(function () {
  const UA = window.UA;
  const V3 = THREE.Vector3;
  const G = (UA.IceGuides = { list: [], built: false, ps: 0, frac: 0, L: 1, hits: {}, atTop: false });

  // the guides, in climbing order: which animal (ice species) and which friendly name index
  const CAST = [
    { type: 'snowbunny', idx: 3 },
    { type: 'polarcub', idx: 2 },
    { type: 'frostfox', idx: 2 },
    { type: 'penguin', idx: 3 },
    { type: 'snowbunny', idx: 4 },
    { type: 'frostfox', idx: 3 },
    { type: 'polarcub', idx: 3 },
  ];
  const LEAD = 24; // how far ahead of you a guide likes to stay, in metres along the road (far enough to be seen well ahead of the camera)
  const POST0 = 20; // the first guide stands this far along the path from the arrival spot (the plaza edge, in plain view)

  const LINES = {
    greet: ['Hi! Follow me up the mountain!', 'Come on! The Ice Princess lives at the top!', 'This way! Up we go!', 'Climb with me! It is an adventure!', 'Follow me! I know the way!'],
    lead: ['Come on, you can do it!', 'Almost there!', 'This way, keep going!', 'Up, up, up!', 'You are doing great!', 'What a brave unicorn!', 'Wheee! Up we go!'],
    nag: ['Over here! Come on!', 'Do not stop now!', 'I will wait for you!', 'Hurry, it is so pretty up here!', 'This way up! Come on!'],
    passed: ['Go, go, go!', 'You are my hero!', 'Keep going, you can do it!', 'See you at the top!', 'Catch the Princess!'],
    handoff: ['My friend will lead you from here!', 'Keep climbing! You are doing great!', 'The castle is getting closer!', 'Off you go! Be brave!'],
    back: ['Hi again! Going up?', 'The Princess is waiting for you!', 'Come on, up we go!'],
  };

  /* ---------- the path: from the arrival spot to the foot of the road, up the spiral, and into the castle's forecourt ---------- */
  function buildPath() {
    const I = UA.ICE,
      A = UA.Realm.ICE_ARRIVE;
    const pts = [];
    const foot = I.roadPoint(0);
    for (let k = 0; k < 6; k++) {
      const f = k / 6;
      pts.push([A.lx + (foot.x - A.lx) * f, A.lz + (foot.z - A.lz) * f]);
    }
    const N = 170;
    for (let k = 0; k <= N; k++) {
      const p = I.roadPoint(k / N);
      pts.push([p.x, p.z]);
    }
    const top = I.roadPoint(1);
    pts.push([top.x, top.z - 6]);
    const px = [],
      pz = [],
      ps = [];
    let s = 0;
    pts.forEach((p, i) => {
      if (i) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      px.push(I.x + p[0]);
      pz.push(I.z + p[1]);
      ps.push(s);
    });
    return { x: px, z: pz, s: ps, L: s, n: pts.length };
  }
  // the point at path distance s
  function pointAt(P, s, out) {
    s = UA.clamp(s, 0, P.L);
    let lo = 0,
      hi = P.n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (P.s[mid] <= s) lo = mid;
      else hi = mid;
    }
    const f = (s - P.s[lo]) / Math.max(1e-6, P.s[hi] - P.s[lo]);
    out.x = P.x[lo] + (P.x[hi] - P.x[lo]) * f;
    out.z = P.z[lo] + (P.z[hi] - P.z[lo]) * f;
    return out;
  }
  // path distance of the point nearest to (x, z), searching the whole path or a window round a hint
  function nearestS(P, x, z, hintS, win) {
    let a = 0,
      b = P.n - 1;
    if (hintS !== undefined) {
      a = Math.max(0, P.s.findIndex((v) => v >= hintS - win) - 1);
      let j = P.s.findIndex((v) => v > hintS + win);
      b = j < 0 ? P.n - 1 : j;
    }
    let best = 1e18,
      bs = 0;
    for (let i = a; i <= b; i++) {
      const d = (P.x[i] - x) * (P.x[i] - x) + (P.z[i] - z) * (P.z[i] - z);
      if (d < best) {
        best = d;
        bs = P.s[i];
      }
    }
    return bs;
  }

  /* ---------- called by Creatures.addIce once the ice world is built: make the guides ---------- */
  G.build = function (scene, rnd) {
    const Cr = UA.Creatures;
    const P = (G.path = buildPath());
    G.L = P.L;
    const last = P.L - 40;
    const lane = [0, 1.8, -1.8, 1.2, -1.2, 1.8, -1.8];
    // a soft light floating over each guide so it can be spotted far up the road, and at night
    const lampTex = UA.radialTexture('rgba(225,248,255,0.95)', 'rgba(150,210,255,0)', 64);
    G.list.length = 0;
    CAST.forEach((c, i) => {
      const start = POST0 + (i * (last - POST0)) / (CAST.length - 1);
      const end = i < CAST.length - 1 ? POST0 + ((i + 1) * (last - POST0)) / (CAST.length - 1) - 10 : P.L - 3;
      const q = pointAt(P, start, {});
      const cr = Cr.makeAt(c.type, c.idx, q.x + lane[i], q.z, rnd, scene);
      cr.guide = { i, start, end, mode: null, tx: q.x, tz: q.z, beckon: 0, lane: lane[i] };
      const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: lampTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.4 }));
      lamp.scale.set(3.2, 3.2, 1);
      lamp.renderOrder = 3;
      scene.add(lamp);
      const g = { c: cr, i, start, end, s: start, greeted: false, passed: false, handed: false, saidCd: 0, nagCd: 8, runFx: 0, post: q, lamp };
      G.list.push(g);
    });
    G.built = true;
    G.reset();
    return G.list.map((g) => g.c);
  };

  // everyone back to their posts, ready to greet a fresh arrival
  G.reset = function () {
    if (!G.built) return;
    const W = UA.World;
    G.hits = {};
    G.atTop = false;
    G.list.forEach((g) => {
      const c = g.c;
      c.pos.set(g.post.x + c.guide.lane, W.groundAt(g.post.x + c.guide.lane, g.post.z), g.post.z);
      c.home.set(c.pos.x, 0, c.pos.z);
      c.vel = 0;
      c.state = 'idle';
      c.fr = null;
      c.follow = false;
      c.guide.mode = 'hold';
      c.guide.tx = g.post.x;
      c.guide.tz = g.post.z;
      g.s = g.start;
      g.greeted = g.passed = g.handed = false;
      g.saidCd = 0;
      g.nagCd = 8;
    });
    G.globalCd = 0;
    G.ps = 0;
    G.frac = 0;
    G.snap = true;
  };

  const say = (g, kind, force) => {
    if (!force && (g.saidCd > 0 || G.globalCd > 0)) return false;
    g.c.say(UA.pick(LINES[kind]));
    g.saidCd = 3.5;
    G.globalCd = 1.4;
    if (UA.Creatures.chirp) UA.Creatures.chirp(g.c, 1.1);
    return true;
  };
  G.globalCd = 0;
  // the unicorn has just come down the ice slide: the climb starts over
  G.afterSlide = function () {
    G.hits = {};
    G.atTop = false;
    G.snap = true;
  };

  /* ---------- every frame ---------- */
  const sp = new V3();
  G.update = function (dt, t, player) {
    if (!G.built) return;
    const inIce = UA.Realm && UA.Realm.cur === 'ice';
    if (!inIce) {
      if (G.shown) {
        G.shown = false;
        UA.UI.setClimb(null);
        G.list.forEach((g) => {
          g.c.guide.mode = null;
          g.lamp.visible = false;
        });
      }
      return;
    }
    G.shown = true;
    if (UA.IceSlide && UA.IceSlide.active) {
      UA.UI.setClimb(null); // (whooshing down the ice slide: the climb is not what counts now)
      return;
    }
    const P = G.path;
    G.globalCd = Math.max(0, G.globalCd - dt);
    // where are we on the climb?
    const raw = nearestS(P, player.pos.x, player.pos.z);
    if (G.snap) {
      G.ps = raw;
      G.snap = false;
    } else G.ps = UA.damp(G.ps, raw, 10, dt);
    const ps = G.ps;
    G.stillT = player.speed < 1 ? (G.stillT || 0) + dt : 0;
    G.frac = UA.clamp(ps / (P.L - 6), 0, 1);
    UA.UI.setClimb(G.atTop ? (UA.state && UA.state.iceMet ? -1 : -2) : G.frac);

    // milestones
    [[0.25, 'A quarter of the way!', 0], [0.5, 'Halfway up!', 1], [0.75, 'Nearly there!', 2]].forEach((m) => {
      if (G.frac >= m[0] && !G.hits[m[0]]) {
        G.hits[m[0]] = true;
        UA.UI.toast(m[1] + '<small>Keep climbing, you are doing great!</small>', 2600);
        UA.Audio.ring(m[2] + 1);
        UA.FX.burst(new V3(player.pos.x, player.pos.y + 1.6, player.pos.z), 18);
      }
    });
    if (G.frac >= 0.985 && !G.atTop) {
      G.atTop = true;
      const first = !(UA.state && UA.state.iceTop);
      if (UA.state) UA.state.iceTop = true;
      UA.UI.toast(first ? 'You climbed Frostglow Peak!<small>Princess Flurry is waiting by the fountain</small>' : 'Back on top!<small>Princess Flurry is waiting</small>', 3600);
      UA.Audio.fanfare();
      UA.FX.burst(new V3(player.pos.x, player.pos.y + 1.6, player.pos.z), 60);
      if (first && UA.save) UA.save();
      // every guide near enough cheers
      G.list.forEach((g) => {
        if (Math.hypot(g.c.pos.x - player.pos.x, g.c.pos.z - player.pos.z) < 60) {
          g.c.hearts(6);
          g.c.jump(7);
        }
      });
    }
    if (G.atTop && G.frac < 0.9) G.atTop = false; // (going back down: the next time up counts again)

    // each guide
    G.list.forEach((g) => {
      const c = g.c,
        Gd = c.guide;
      g.saidCd = Math.max(0, g.saidCd - dt);
      g.nagCd = Math.max(0, g.nagCd - dt);
      if (c.follow) {
        Gd.mode = null; // (a friend who has been asked to tag along just tags along)
        g.lamp.visible = false;
        return;
      }
      const dp = Math.hypot(player.pos.x - c.pos.x, player.pos.z - c.pos.z);
      g.lamp.visible = !c.far;
      g.lamp.position.set(c.pos.x, c.pos.y + (c.S.mh || 2.4) * c.scale + 0.9 + Math.sin(t * 2 + g.i) * 0.12, c.pos.z);
      g.lamp.material.opacity = 0.22 + 0.55 * (UA.Time ? UA.Time.night : 0);
      g.s = nearestS(P, c.pos.x, c.pos.z, g.s, 40);
      // the guide only works while you are somewhere on or near its stretch of the climb
      const inRange = ps >= g.start - 30 && ps <= g.end + 10;
      Gd.beckon = Math.max(0, Gd.beckon - dt);

      // greet when you first come near
      if (!g.greeted && dp < 20 && ps <= g.end + 4 && inRange) {
        g.greeted = true;
        g.nagCd = 10;
        Gd.beckon = 3;
        c.jump(6);
        say(g, UA.state && UA.state.iceTop ? 'back' : 'greet', true);
        UA.FX.sparkles(new V3(c.pos.x, c.pos.y + 1, c.pos.z), 6, undefined, 1.2);
      }

      // where should this guide be? LEAD metres ahead of you, never beyond the end of its stretch, never behind its post
      let targetS = g.start;
      if (g.passed && ps < g.s - 10) {
        g.passed = false; // you came back down below a guide you had passed: it is on duty again
        g.handed = false;
      }
      if (g.greeted && ps < g.start - 45) {
        g.greeted = g.passed = g.handed = false; // you went back down: it trots home to its post and greets you again next time
      }
      if (g.greeted && inRange) targetS = UA.clamp(ps + LEAD, g.start, g.end);
      else if (g.greeted) targetS = g.s; // (you are past: it stays where it is and cheers you on)
      pointAt(P, targetS, sp);
      // keep to its own lane so a row of guides does not stack up on one line
      Gd.tx = sp.x + Gd.lane * 0.6;
      Gd.tz = sp.z;
      const gap = targetS - g.s;
      Gd.mode = (g.greeted && inRange && Math.abs(gap) > 1.2) || (!g.greeted && Math.abs(gap) > 3.5) ? 'lead' : 'hold';
      // how fast: just a touch quicker than you, so it looks like it is leading and never gets in your way
      Gd.pace = UA.clamp(player.speed * 1.08 + 2.5, 5.5, Math.min(13, c.S.run * 1.9));
      // a word of encouragement every few seconds while it runs ahead of you
      g.talkCd = (g.talkCd === undefined ? 3 : g.talkCd) - dt;
      if (Gd.mode === 'lead' && g.greeted && dp < 30 && c.vel > 3 && player.speed > 2 && g.talkCd <= 0) {
        g.talkCd = 5 + Math.random() * 3;
        Gd.beckon = 2;
        say(g, 'lead');
      }
      // sparkly footprints while it runs
      if (Gd.mode === 'lead' && c.vel > 3) {
        g.runFx -= dt;
        if (g.runFx <= 0) {
          g.runFx = 0.18;
          UA.FX.sparkles(new V3(c.pos.x, c.pos.y + 0.3, c.pos.z), 1, undefined, 0.5, 0.2);
        }
      }

      // you went past it: cheer
      if (g.greeted && !g.passed && ps > g.s + 7) {
        g.passed = true;
        Gd.beckon = 3;
        c.jump(7);
        c.hearts(3);
        if (g.saidCd < 2) say(g, 'passed', true); // (unless it has only just spoken)
      }
      // it reached the end of its stretch and you are catching up: pass the baton
      if (g.greeted && !g.handed && g.s >= g.end - 2.5 && (dp < 16 || g.passed)) {
        g.handed = true;
        Gd.beckon = 3;
        c.jump(6);
        if (g.i < G.list.length - 1) say(g, 'handoff', true);
        else say(g, 'lead', true);
      }
      // you have stopped (or wandered off the road): the guide ahead calls you on, bouncing and waving
      if (g.greeted && !g.passed && inRange && dp < 40 && g.nagCd <= 0 && (G.stillT > 5 || dp > 26)) {
        g.nagCd = 9 + Math.random() * 4;
        Gd.beckon = 3;
        if (say(g, 'nag')) c.jump(6.5);
      }
    });
  };
})();
