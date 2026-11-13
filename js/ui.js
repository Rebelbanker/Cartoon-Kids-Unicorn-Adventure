/* UI: HUD, toasts, speech bubbles, creature prompt, friends book, touch controls */
(function () {
  const UA = window.UA;
  const UI = (UA.UI = {});
  const $ = (id) => document.getElementById(id);

  const ICON = {
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2 0 3.6 1 5.4 3 1.8-2 3.4-3 5.4-3 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z" fill="currentColor"/></svg>',
    heartOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2 0 3.6 1 5.4 3 1.8-2 3.4-3 5.4-3 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    candy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4c4 0 7 2.5 7 7v3H5v-3c0-4.5 3-7 7-7z" fill="currentColor"/><rect x="4" y="15" width="16" height="4" rx="2" fill="currentColor" opacity=".7"/></svg>',
    ring: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="3.5"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4V4z" fill="currentColor"/><path d="M9 8h6M9 12h6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
    mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 17v.2" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l7 8h-4v8H9v-8H5l7-8z" fill="currentColor"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2L12 2z" fill="currentColor"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="currentColor"/><path d="M4.5 10c5 1 10 1 15 0M4.5 14c5-1 10-1 15 0" stroke="#fff" stroke-width="1.6" fill="none"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L5 14h6l-1 8 8-12h-6l1-8z" fill="currentColor"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9L12 2.5z" fill="currentColor"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="currentColor"/></svg>',
    bubble: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9.5" cy="14.5" r="6" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="17.5" cy="7" r="3.4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M7 12.5a3 3 0 0 1 2-1.6" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    butterfly: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12C9.5 3.5 2.5 4 3 9.2 3.4 13 8 14 12 12z" fill="currentColor"/><path d="M12 12c2.5-8.500 9.500-8 9-2.800-.4 3.800-5 4.800-9 2.800z" fill="currentColor"/><path d="M12 12.500c-4 .5-6.500 4.500-4.500 7 1.700 2 4.500-1.500 4.500-7zM12 12.500c4 .5 6.500 4.500 4.500 7-1.700 2-4.500-1.500-4.500-7z" fill="currentColor" opacity=".65"/></svg>',
    rainbow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.500 19a9.500 9.500 0 0 1 19 0" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round"/><path d="M6.500 19a5.500 5.500 0 0 1 11 0" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round" opacity=".6"/></svg>',
    mountain: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 20L9.500 6l4 7 2.500-3.500L22 20H2z" fill="currentColor"/><path d="M9.500 6l1.800 3.300-1.800-1-1.800 1L9.500 6z" fill="#fff"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="3" fill="currentColor"/><path d="M8 10V8a4 4 0 0 1 8 0v2" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    crown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18V8l4.5 4L12 5l4.500 7L21 8v10H3z" fill="currentColor"/><rect x="3" y="19" width="18" height="2.400" rx="1.200" fill="currentColor" opacity=".7"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20l-7-8h4V4h6v8h4l-7 8z" fill="currentColor"/></svg>',
    gift: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.500" y="10" width="17" height="11" rx="2" fill="currentColor"/><rect x="2" y="6.500" width="20" height="5" rx="2" fill="currentColor" opacity=".8"/><path d="M12 6.500C9 1.500 4.500 3.500 7 6.500zM12 6.500c3-5 7.500-3 5 0z" fill="currentColor"/><rect x="11" y="6.500" width="2" height="14.500" fill="#fff" opacity=".7"/></svg>',
  };
  UI.ICON = ICON;

  const bubbles = [];
  let toastTimer = null;

  UI.init = function () {
    // HUD buttons
    $('btn-book').innerHTML = ICON.book;
    $('btn-sound').innerHTML = UA.Audio.muted ? ICON.mute : ICON.sound;
    $('btn-help').innerHTML = ICON.help;
    $('ico-heart').innerHTML = ICON.heart;
    $('ico-candy').innerHTML = ICON.candy;
    $('ico-ring').innerHTML = ICON.ring;
    $('ico-quest').innerHTML = ICON.star;
    $('ico-climb').innerHTML = ICON.mountain;
    $('btn-time').innerHTML = ICON.sun;
    $('pill-spell').onclick = () => UA.Magic.next();
    $('ico-rider').innerHTML = ICON.crown;
    $('pill-rider').onclick = () => {
      if (UA.hopOff) UA.hopOff();
    };
    $('btn-time').onclick = () => UA.Time.skip();
    $('btn-book').onclick = () => UI.toggleBook();
    $('btn-help').onclick = () => UI.toggleHelp();
    $('btn-quality').onclick = () => {
      $('btn-quality').blur();
      if (UA.toggleQuality) UA.toggleQuality();
    };
    $('compass').onclick = () => {
      $('compass').blur(); // so Space and Enter never "press" it by accident
      if (UA.toggleView) UA.toggleView();
    };
    $('compass').addEventListener('mousedown', (e) => e.preventDefault());
    $('btn-sound').onclick = () => {
      UA.Audio.init();
      UA.Audio.setMuted(!UA.Audio.muted);
      $('btn-sound').innerHTML = UA.Audio.muted ? ICON.mute : ICON.sound;
    };
    $('book-close').onclick = () => UI.toggleBook(false);
    $('help-close').onclick = () => UI.toggleHelp(false);
    for (let i = 0; i < 4; i++) {
      const b = document.createElement('div');
      b.className = 'bubble';
      $('tags').appendChild(b);
      bubbles.push({ el: b, c: null, t: 0 });
    }
    UI.buildTouch();
  };

  // the "Hop off" pill: shown while a princess rides with you (name = her name, or null)
  let riderName = null;
  UI.setRider = function (name) {
    if (name === riderName) return;
    riderName = name;
    const p = $('pill-rider');
    p.classList.toggle('hidden', !name);
    if (name) {
      $('hud-rider').textContent = 'Hop off';
      p.title = 'Ask Princess ' + name + ' to hop off (J)';
      p.setAttribute('aria-label', p.title);
    }
  };

  UI.setSpell = function (sp) {
    $('ico-spell').innerHTML = ICON[sp.icon] || ICON.spark;
    $('hud-spell').textContent = sp.name;
    const tb = document.getElementById('t-spell');
    if (tb) tb.innerHTML = (ICON[sp.icon] || ICON.spark) + '<span>Spell</span>';
  };

  UI.flash = function () {
    const f = $('flash');
    f.classList.add('on');
    setTimeout(() => f.classList.remove('on'), 180);
  };

  /* ---------- context prompts ----------
     Everything you can interact with right now (wild friends, townspeople, the wishing fountain) offers a card.
     Each frame the game calls beginOffers(), then offer() for each thing in reach, then endOffers(input).
     The nearest one is "focused": it is the one big card with the buttons, it takes E / F / R, and tapping anywhere
     on it does its main action. Any other friends close by shrink to small name tags (tap one, or press Tab, to
     talk to them instead). Up to three cards in all (two on touch screens). */
  const cards = new Map(); // key -> { el, sig, seq, acts, out }
  const offers = [];
  let cardSeq = 0;
  let focusKey = null,
    manualKey = null;
  let hintEl = null;

  UI.beginOffers = function () {
    offers.length = 0;
  };

  /* o: { name, sub, hearts (0..3 or undefined), btns: [{ a: 'pet'|'feed'|'play', key: 'E', icon, label, dim }], acts: { pet, feed, play }, sig } */
  UI.offer = function (key, dist, o) {
    offers.push({ key, d: dist, o });
  };

  UI.creatureOffer = function (c, dist, state, acts) {
    // Pet and Feed are always there; Play shows up once you are friends, so there is never a greyed-out button
    const btns = [
      { a: 'pet', key: 'E', icon: ICON.heart, label: 'Pet' },
      { a: 'feed', key: 'F', icon: ICON.candy, label: 'Feed' },
    ];
    if (c.bond) btns.push({ a: 'play', key: 'R', icon: ICON.play, label: 'Play' });
    UI.offer('c' + c.id, dist, {
      name: c.name,
      sub: c.S.label,
      hearts: c.bond,
      btns,
      acts,
      sig: c.bond + '',
    });
  };

  function buildCard(key) {
    const el = document.createElement('div');
    el.className = 'pcard';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const cd = cards.get(key);
      if (!cd) return;
      const b = e.target.closest && e.target.closest('button');
      if (b) {
        const fn = cd.acts && cd.acts[b.dataset.a];
        if (fn) fn();
      } else if (focusKey !== key) {
        manualKey = key; // a small name tag: tap it to talk to that friend instead
      } else if (cd.acts && cd.main && cd.acts[cd.main]) {
        cd.acts[cd.main](); // the big card itself is a big button: tap anywhere on it for the main action
      }
    });
    $('prompts').insertBefore(el, hintEl);
    const cd = { el, sig: null, seq: ++cardSeq, acts: null, main: null, out: 0 };
    cards.set(key, cd);
    el.style.order = cd.seq;
    // fade in on the next frame
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    return cd;
  }

  function cardHTML(o) {
    const touch = UA.Input.isTouch;
    let h = '<div class="pname">' + o.name + (o.sub ? ' <small>' + o.sub + '</small>' : '');
    if (o.hearts !== undefined) h += '<span class="hearts">' + heartsHTML(o.hearts) + '</span>';
    h += '</div><div class="pacts">';
    for (const b of o.btns) h += '<button data-a="' + b.a + '"' + (b.dim ? ' class="dim"' : '') + '>' + (touch ? '' : '<kbd>' + b.key + '</kbd>') + b.icon + b.label + '</button>';
    return h + '</div>';
  }

  UI.endOffers = function (input) {
    if (!hintEl) hintEl = $('phint');
    const maxCards = window.innerWidth < 700 || UA.Input.isTouch ? 2 : 3;
    offers.sort((x, y) => x.d - y.d);
    const shown = offers.slice(0, maxCards);
    const byKey = {};
    for (const s of shown) byKey[s.key] = s;

    // who is focused: the nearest one, unless the player picked someone else who is still close by
    let focus = null;
    if (shown.length) {
      const near = shown[0];
      if (input && input.next && shown.length > 1) {
        const seqOf = (k) => (cards.has(k) ? cards.get(k).seq : 1e9);
        const order = shown.slice().sort((x, y) => seqOf(x.key) - seqOf(y.key));
        const cur = Math.max(0, order.findIndex((s) => s.key === (manualKey || focusKey)));
        manualKey = order[(cur + 1) % order.length].key;
      }
      if (manualKey && byKey[manualKey] && byKey[manualKey].d < near.d + 3) focus = byKey[manualKey];
      else {
        manualKey = null;
        focus = focusKey && byKey[focusKey] && byKey[focusKey].d < near.d + 0.8 ? byKey[focusKey] : near;
      }
    }
    focusKey = focus ? focus.key : null;

    // keys act on the focused card
    if (focus && input) {
      const acts = focus.o.acts;
      if (input.pet && acts.pet) acts.pet();
      if (input.feed && acts.feed) acts.feed();
      if (input.play && acts.play) acts.play();
    }

    // draw
    for (const s of shown) {
      let cd = cards.get(s.key);
      if (!cd) cd = buildCard(s.key);
      cd.out = 0;
      cd.acts = s.o.acts;
      cd.main = s.o.btns.length ? s.o.btns[0].a : null;
      const sig = s.o.sig + '|' + UA.Input.isTouch;
      if (cd.sig !== sig) {
        cd.sig = sig;
        cd.el.innerHTML = cardHTML(s.o);
      }
      cd.el.classList.add('show');
      cd.el.classList.toggle('focus', s === focus);
    }
    for (const [key, cd] of cards) {
      if (byKey[key]) continue;
      if (!cd.out) {
        cd.out = 1;
        cd.el.classList.remove('show', 'focus');
        setTimeout(() => {
          const c2 = cards.get(key);
          if (c2 === cd && cd.out) {
            cd.el.remove();
            cards.delete(key);
            if (focusKey === key) focusKey = null;
          }
        }, 320);
      }
    }
    $('prompts').classList.toggle('touch', !!UA.Input.isTouch);
    if (hintEl) hintEl.classList.toggle('on', shown.length > 1 && !UA.Input.isTouch);
  };


  // The compass chip: in the map view North is always up and the rose stands still; in the behind view the rose turns
  // with the camera. The pink arrow shows which way the unicorn is facing on screen.
  let lastCompass = '';
  UI.setCompass = function (camYaw, uniYaw, mode) {
    const r = $('rose'),
      h = $('heading');
    if (!r || !h) return;
    const a = camYaw - Math.PI,
      b = camYaw - uniYaw;
    const key = Math.round(a * 80) + ':' + Math.round(b * 80) + mode;
    if (key === lastCompass) return;
    lastCompass = key;
    $('compass').classList.toggle('hidden', mode !== 'top');
    r.style.transform = 'rotate(' + a.toFixed(3) + 'rad)';
    h.style.transform = 'rotate(' + b.toFixed(3) + 'rad)';
  };

  UI.setTimeIcon = function (night) {
    $('btn-time').innerHTML = night ? ICON.moon : ICON.sun;
  };

  UI.updateHUD = function (state, total, friends) {
    $('hud-friends').textContent = friends + ' / ' + total;
    $('hud-treats').textContent = state.treats;
  };

  UI.setQuest = function (text) {
    $('pill-quest').classList.toggle('hidden', !text);
    if (text) $('hud-quest').textContent = text;
  };

  // the climb meter on Frostglow Peak: null hides it, -1 means 'at the top', otherwise 0..1
  UI.setClimb = function (f) {
    const el = $('pill-climb');
    if (f === null || f === undefined) {
      if (!el.classList.contains('hidden')) el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    const txt = f <= -2 ? 'Say hi to Flurry!' : f < 0 ? 'At the top!' : 'Climb ' + Math.round(f * 100) + '%';
    const h = $('hud-climb');
    if (h.textContent !== txt) h.textContent = txt;
  };

  UI.setRings = function (n, total, show) {
    $('pill-rings').classList.toggle('hidden', !show);
    $('hud-rings').textContent = n + ' / ' + total;
  };

  UI.toast = function (html, ms) {
    const t = $('toast');
    t.innerHTML = html;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms || 3200);
  };

  UI.say = function (creature, text) {
    let b = bubbles.find((x) => x.c === creature) || bubbles.find((x) => x.t <= 0) || bubbles[0];
    b.c = creature;
    b.t = 2.4;
    b.el.textContent = text;
    b.el.classList.add('show');
  };

  function heartsHTML(n) {
    let s = '';
    for (let i = 0; i < 3; i++) s += '<span class="' + (i < n ? 'on' : 'off') + '">' + (i < n ? ICON.heart : ICON.heartOff) + '</span>';
    return s;
  }

  // project bubbles and name tag to the screen
  const _v = new THREE.Vector3();
  UI.update = function (dt, camera, w, h) {
    for (const b of bubbles) {
      if (b.t > 0 && b.c) {
        b.t -= dt;
        _v.set(b.c.pos.x, b.c.pos.y + 2.9 * b.c.scale, b.c.pos.z).project(camera);
        if (_v.z < 1 && _v.z > -1) {
          b.el.style.transform = 'translate(-50%,-100%) translate(' + ((_v.x * 0.5 + 0.5) * w).toFixed(1) + 'px,' + ((-_v.y * 0.5 + 0.5) * h).toFixed(1) + 'px)';
          b.el.style.opacity = Math.min(1, b.t * 2.5);
        } else b.el.style.opacity = 0;
        if (b.t <= 0) b.el.classList.remove('show');
      }
    }
  };

  /* ---------- friends book ---------- */
  UI.toggleBook = function (force) {
    const el = $('book');
    const open = force === undefined ? el.classList.contains('hidden') : force;
    el.classList.toggle('hidden', !open);
    if (open) UI.renderBook();
    UA.paused = open;
  };
  UI.toggleHelp = function (force) {
    const el = $('help');
    const open = force === undefined ? el.classList.contains('hidden') : force;
    el.classList.toggle('hidden', !open);
    UA.paused = open;
  };

  UI.renderBook = function () {
    const cr = UA.Creatures;
    let html = '<div class="bk-grid">';
    for (const type in cr.species) {
      const S = cr.species[type];
      const all = cr.list.filter((c) => c.type === type);
      const friends = all.filter((c) => c.bond > 0);
      html +=
        '<div class="bk-card' +
        (friends.length ? '' : ' unseen') +
        '"><div class="bk-title">' +
        (friends.length ? S.label : '???') +
        '</div><div class="bk-sub">' +
        (friends.length ? S.blurb : 'Make a friend to discover this creature.') +
        '</div><div class="bk-count">' +
        friends.length +
        ' / ' +
        all.length +
        ' friends</div><div class="bk-names">' +
        friends.map((c) => '<span class="chip">' + c.name + '<i>' + heartsHTML(c.bond) + '</i></span>').join('') +
        '</div></div>';
    }
    html += '</div><h3>Unicorn gear</h3><div class="bk-gear">';
    UA.UNLOCKS.forEach((u) => {
      const got = UA.state.unlocked.indexOf(u.id) >= 0;
      html += '<div class="gear' + (got ? ' got' : '') + '"><b>' + u.name + '<small>' + u.power + '</small></b><span>' + (got ? 'Unlocked!' : ICON.lock + ' Make ' + u.need + ' friends') + '</span></div>';
    });
    html += '</div><h3>Horn spells</h3><div class="bk-gear">';
    UA.Magic.spells.forEach((sp) => {
      const got = cr.friendCount() >= sp.need;
      html += '<div class="gear' + (got ? ' got' : '') + '"><b>' + sp.name + '<small>' + sp.note + '</small></b><span>' + (got ? 'Learned!' : ICON.lock + ' Make ' + sp.need + (sp.need === 1 ? ' friend' : ' friends')) + '</span></div>';
    });
    html += '</div>';
    $('book-body').innerHTML = html;
  };

  /* ---------- touch controls ---------- */
  UI.buildTouch = function () {
    const root = $('touch');
    root.innerHTML =
      '<div id="stick"><div id="knob"></div></div>' +
      '<div id="tbtns">' +
      '<button class="tb big" id="t-jump" aria-label="Jump and glide">' + ICON.up + '<span>Jump</span></button>' +
      '<button class="tb" id="t-gallop" aria-label="Gallop">' + ICON.bolt + '<span>Gallop</span></button>' +
      '<button class="tb" id="t-magic" aria-label="Cast magic">' + ICON.spark + '<span>Magic</span></button>' +
      '<button class="tb" id="t-spell" aria-label="Change spell">' + ICON.spark + '<span>Spell</span></button>' +
      '</div>';
    const stick = $('stick'),
      knob = $('knob');
    let sid = null,
      cx = 0,
      cy = 0;
    const R = 56;
    const setKnob = (dx, dy) => {
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    };
    stick.addEventListener('pointerdown', (e) => {
      sid = e.pointerId;
      stick.setPointerCapture(sid);
      const r = stick.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      UA.Input.isTouch = true;
      move(e);
    });
    const move = (e) => {
      let dx = e.clientX - cx,
        dy = e.clientY - cy;
      const m = Math.hypot(dx, dy);
      if (m > R) {
        dx = (dx / m) * R;
        dy = (dy / m) * R;
      }
      setKnob(dx, dy);
      UA.Input.setTouchMove(dx / R, -dy / R, true);
    };
    stick.addEventListener('pointermove', (e) => {
      if (e.pointerId === sid) move(e);
    });
    const end = (e) => {
      if (e.pointerId !== sid) return;
      sid = null;
      setKnob(0, 0);
      UA.Input.setTouchMove(0, 0, false);
    };
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
    const hold = (id, name) => {
      const b = $(id);
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        UA.Input.isTouch = true;
        UA.Input.setHeld(name, true);
        b.classList.add('down');
      });
      const up = () => {
        UA.Input.setHeld(name, false);
        b.classList.remove('down');
      };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
    };
    hold('t-jump', 'jump');
    hold('t-gallop', 'gallopBtn');
    $('t-magic').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      UA.Input.isTouch = true;
      UA.Input.trigger('magic');
    });
    $('t-spell').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      UA.Input.isTouch = true;
      UA.Input.trigger('spell');
    });
    // show only on touch devices (or after the first touch)
    const showIfTouch = () => root.classList.toggle('on', !!UA.Input.isTouch);
    if ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0) UA.Input.isTouch = true;
    showIfTouch();
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' && !UA.Input.isTouch) UA.Input.isTouch = true;
      showIfTouch();
    });
  };
})();
