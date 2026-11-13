/* Look UI: the dress-up screen. Seven tabs of big picture tiles (no words needed to play it), a name box, a "Surprise me!" dice
   and a big "Let's ride!" button. Things not found yet show as faded pictures with a little gift on them: tap one and the
   unicorn's hint says to look for the gift box in the world. main.js opens and closes the screen (see openLook / closeLook) and
   draws the unicorn behind it; this file only builds the panel and writes the picks into UA.state.look (look.js).

   The top-right brush button (btn-look) and its NEW badge live here too. */
(function () {
  const UA = window.UA,
    Look = UA.Look,
    $ = (id) => document.getElementById(id);
  const LU = (UA.LookUI = { tab: 'coat', uni: null, hooks: {} });

  /* ---------- small helpers ---------- */
  const hx = (c) => (typeof c === 'number' ? '#' + c.toString(16).padStart(6, '0') : '#' + c.getHexString());
  const svg = (inner, vb) => '<svg viewBox="' + (vb || '0 0 48 48') + '" aria-hidden="true">' + inner + '</svg>';
  const cycle = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length];
  // a circle cut into wedges of the given colours
  function wedges(cols) {
    const n = cols.length,
      st = [];
    cols.forEach((c, i) => st.push(hx(c) + ' ' + (i / n) * 360 + 'deg ' + ((i + 1) / n) * 360 + 'deg'));
    return '<div class="dot" style="background:conic-gradient(' + st.join(',') + ')"></div>';
  }
  const GIFT = '<span class="giftbadge">' + svg('<rect x="6" y="20" width="36" height="24" rx="4" fill="#ff8fc0"/><rect x="3" y="13" width="42" height="11" rx="4" fill="#ff6fa6"/><rect x="21" y="13" width="6" height="31" fill="#ffe27a"/><path d="M24 13 C16 2 8 8 14 13Z M24 13 C32 2 40 8 34 13Z" fill="#ffe27a"/>') + '</span>';

  /* ---------- the tab pictures (one colour, they take the colour of the button) ---------- */
  const TAB_ICON = {
    coat: svg('<path d="M24 4 C24 4 10 20 10 30 a14 14 0 0 0 28 0 C38 20 24 4 24 4z" fill="currentColor"/><path d="M16 31 a8 8 0 0 0 6 7" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".75"/>'),
    hair: svg('<g fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"><path d="M12 8 C8 22 16 34 11 44"/><path d="M24 6 C20 22 28 34 23 46"/><path d="M36 8 C32 22 40 34 35 44"/></g>'),
    horn: svg('<path d="M24 3 L34 42 H14Z" fill="currentColor"/><path d="M18 30 L30 23 M16 38 L33 29" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".75"/>'),
    sparkle: svg('<path d="M20 6 L24 20 L38 24 L24 28 L20 42 L16 28 L2 24 L16 20Z" fill="currentColor" transform="translate(4 0)"/><path d="M38 4 L40 10 L46 12 L40 14 L38 20 L36 14 L30 12 L36 10Z" fill="currentColor"/>'),
    mark: svg('<path d="M24 3 L30 18 L46 19 L34 29 L38 45 L24 36 L10 45 L14 29 L2 19 L18 18Z" fill="currentColor"/>'),
    saddle: svg('<rect x="5" y="25" width="38" height="14" rx="7" fill="currentColor"/><ellipse cx="24" cy="24" rx="14" ry="9" fill="currentColor" opacity=".75"/><circle cx="24" cy="23" r="4.2" fill="#fff" opacity=".85"/>'),
    size: svg('<path d="M24 4 L35 17 H28 V31 H35 L24 44 L13 31 H20 V17 H13Z" fill="currentColor"/>'),
  };
  LU.BRUSH = svg('<path d="M38 5 C41 4 44 7 43 10 C41 16 33 26 26 31 L18 23 C23 16 32 8 38 5Z" fill="currentColor"/><path d="M16 25 L24 33 C22 41 12 44 4 43 C8 40 8 36 9 31 C10 28 13 26 16 25Z" fill="currentColor" opacity=".7"/>');

  /* ---------- the tile pictures ---------- */
  const PONY = (s) =>
    svg(
      '<g transform="translate(24 43) scale(' + s + ') translate(-24 -43)"><g fill="currentColor"><ellipse cx="22" cy="28" rx="13" ry="7.5"/><rect x="11" y="31" width="3.6" height="12" rx="1.8"/><rect x="16.5" y="32" width="3.6" height="11" rx="1.8"/><rect x="26" y="32" width="3.6" height="11" rx="1.8"/><rect x="31" y="31" width="3.6" height="12" rx="1.8"/><path d="M30 24 L36 12 L42 14 L39 24Z"/><ellipse cx="40" cy="13.5" rx="6" ry="4" transform="rotate(20 40 13.5)"/><path d="M10 24 C4 22 3 30 6 36 C8 31 10 29 12 28Z"/></g><path d="M42 9 L47 0 L45 10Z" fill="#ffc94a"/></g>'
    );
  const STYLE_PIC = {
    classic: (c) => '<g fill="none" stroke-width="6" stroke-linecap="round"><path stroke="' + c(0) + '" d="M12 8 C8 22 16 34 11 44"/><path stroke="' + c(1) + '" d="M24 6 C20 22 28 34 23 46"/><path stroke="' + c(2) + '" d="M36 8 C32 22 40 34 35 44"/></g>',
    bouncy: (c) => '<g fill="none" stroke-width="6" stroke-linecap="round"><path stroke="' + c(0) + '" d="M12 10 c-7 4 -3 11 4 9 c-6 5 0 10 4 7"/><path stroke="' + c(1) + '" d="M26 8 c-7 4 -3 11 4 9 c-6 5 0 10 4 7"/><path stroke="' + c(2) + '" d="M20 28 c-7 4 -3 11 4 9 c-6 4 0 8 4 6"/></g>',
    flowy: (c) => '<g fill="none" stroke-width="5" stroke-linecap="round"><path stroke="' + c(0) + '" d="M9 3 C19 13 -1 25 9 36 C13 40 11 44 9 46"/><path stroke="' + c(1) + '" d="M23 2 C33 12 13 24 23 35 C27 39 25 43 23 45"/><path stroke="' + c(2) + '" d="M37 3 C47 13 27 25 37 36 C41 40 39 44 37 46"/></g>',
    fluffy: (c) => '<g><circle cx="14" cy="18" r="9" fill="' + c(0) + '"/><circle cx="27" cy="13" r="9" fill="' + c(1) + '"/><circle cx="37" cy="21" r="9" fill="' + c(2) + '"/><circle cx="17" cy="32" r="9" fill="' + c(1) + '"/><circle cx="31" cy="33" r="9" fill="' + c(0) + '"/></g>',
    pixie: (c) => '<g><path fill="' + c(0) + '" d="M7 12 L19 10 L12 30Z"/><path fill="' + c(1) + '" d="M19 8 L31 8 L25 32Z"/><path fill="' + c(2) + '" d="M31 10 L43 12 L36 30Z"/></g>',
  };
  function hornCone(h, tall) {
    // a cone in the horn's own colours (a gradient up the cone, and slanting stripes)
    const id = 'hg' + Math.random().toString(36).slice(2, 7),
      cp = 'hc' + Math.random().toString(36).slice(2, 7);
    const top = 44 - tall,
      w = 7 + tall * 0.14;
    const path = 'M24 ' + top + ' L' + (24 + w) + ' 44 H' + (24 - w) + 'Z';
    let s = '<defs><linearGradient id="' + id + '" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="' + hx(h.base(0.05)) + '"/><stop offset=".5" stop-color="' + hx(h.base(0.5)) + '"/><stop offset="1" stop-color="' + hx(h.base(0.95)) + '"/></linearGradient><clipPath id="' + cp + '"><path d="' + path + '"/></clipPath></defs>';
    s += '<path d="' + path + '" fill="url(#' + id + ')"/><g clip-path="url(#' + cp + ')" stroke="' + hx(h.stripe(0.5)) + '" stroke-width="3.4" opacity="' + Math.min(1, h.mix + 0.1) + '">';
    for (let i = 0; i < 4; i++) {
      const y = 44 - (i + 0.7) * (tall / 4.2);
      s += '<path d="M' + (24 - w - 2) + ' ' + (y + 5) + ' L' + (24 + w + 2) + ' ' + (y - 5) + '"/>';
    }
    s += '</g><path d="' + path + '" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round" opacity=".7"/>';
    s += '<path d="M24 ' + (top - 2) + ' l1.4 3.4 3.4 1.4 -3.4 1.4 -1.4 3.4 -1.4 -3.4 -3.4 -1.4 3.4 -1.4z" fill="' + hx(h.star) + '"/>';
    return s;
  }
  const SPARK_PIC = {
    stars: (c) => '<path d="M24 3 L29 19 L45 24 L29 29 L24 45 L19 29 L3 24 L19 19Z" fill="' + c + '"/>',
    hearts: (c) => '<path d="M24 43 C8 31 4 21 8 14 C13 7 21 9 24 16 C27 9 35 7 40 14 C44 21 40 31 24 43Z" fill="' + c + '"/>',
    diamonds: (c) => '<path d="M24 3 L41 18 L24 45 L7 18Z" fill="' + c + '"/><path d="M7 18 H41 M24 3 L17 18 L24 45 L31 18Z" fill="none" stroke="#fff" stroke-width="2" opacity=".7" stroke-linejoin="round"/>',
    flowers: (c) => {
      let s = '';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        s += '<circle cx="' + (24 + Math.cos(a) * 12).toFixed(1) + '" cy="' + (24 + Math.sin(a) * 12).toFixed(1) + '" r="9" fill="' + c + '"/>';
      }
      return s + '<circle cx="24" cy="24" r="7" fill="#ffe27a"/>';
    },
    bubbles: (c) => '<circle cx="24" cy="24" r="18" fill="' + c + '" fill-opacity=".28" stroke="' + c + '" stroke-width="3.4"/><path d="M14 20 a11 11 0 0 1 8 -7" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round"/><circle cx="35" cy="36" r="2.6" fill="#fff" opacity=".8"/>',
  };
  function markPic(id) {
    const defs = Look.MARK_DEFS[id] || Look.MARK_DEFS.star;
    let s = '<g transform="scale(1 -1)">';
    for (const d of defs) s += '<polygon points="' + d.pts.map((p) => p[0].toFixed(3) + ',' + p[1].toFixed(3)).join(' ') + '" fill="' + hx(d.col) + '"/>';
    return svg(s + '</g>', '-1.15 -1.15 2.3 2.3');
  }
  function saddlePic(it) {
    if (!it.cols) return svg('<circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="5 4" opacity=".7"/><path d="M12 36 L36 12" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity=".7"/>');
    const c = it.cols.map(hx);
    return svg('<rect x="4" y="25" width="40" height="15" rx="7.5" fill="' + c[0] + '"/><path d="M10 40 V44 M38 40 V44" stroke="' + c[0] + '" stroke-width="3.4" stroke-linecap="round"/><ellipse cx="24" cy="24" rx="15" ry="10" fill="' + c[1] + '"/><ellipse cx="24" cy="21" rx="9" ry="4.4" fill="#fff" opacity=".25"/><circle cx="24" cy="25" r="4.6" fill="' + c[2] + '"/>');
  }

  /* what a tile looks like, for each kind of choice */
  function tilePic(key, it) {
    const cur = Look.cur();
    switch (key) {
      case 'coat':
        return '<div class="dot" style="background:' + hx(it.color) + '"></div>';
      case 'hair':
        return wedges(it.cols);
      case 'style': {
        const cols = Look.item('hair', cur.hair).cols;
        return svg(STYLE_PIC[it.id]((i) => hx(cycle(cols, i))));
      }
      case 'hornSize':
        return svg(hornCone(Look.item('horn', cur.horn), it.id === 'small' ? 19 : it.id === 'tall' ? 43 : 31));
      case 'horn':
        return svg(hornCone(it, 34));
      case 'sparkle': {
        const co = Look.item('sparkleColor', cur.sparkleColor);
        const c = co.id === 'match' ? Look.item('hair', cur.hair).cols[0] : co.show[0];
        return svg(SPARK_PIC[it.id](hx(c)));
      }
      case 'sparkleColor':
        return it.id === 'match' ? wedges(Look.item('hair', cur.hair).cols) : wedges(it.show.concat(it.cols.slice(0, 2)));
      case 'mark':
        return markPic(it.id);
      case 'saddle':
        return saddlePic(it);
      case 'size':
        return PONY(0.8 * it.k);
    }
    return '';
  }
  const ROW_LABEL = { coat: 'Coat colour', hair: 'Mane and tail colours', style: 'Hair style', hornSize: 'Horn size', horn: 'Horn look', sparkle: 'Sparkle shape', sparkleColor: 'Sparkle colour', mark: 'Cutie mark', saddle: 'Saddle', size: 'How big am I?' };
  const TAB_HINT = { coat: 'Pick a coat colour!', hair: 'Colours and style for the mane and tail', hair2: '', horn: 'Choose a horn!', sparkle: 'What kind of sparkles do you like?', mark: 'Pick a cutie mark!', saddle: 'Pick a saddle!', size: 'How big is your unicorn?' };

  /* ---------- the panel ---------- */
  let tabsBuilt = false,
    statusTimer = null;
  function tabDef(id) {
    return Look.TABS.find((t) => t.id === id) || Look.TABS[0];
  }
  function freshIn(tab) {
    let n = 0;
    for (const k of tab.rows) for (const it of Look.items[k]) if (Look.isFresh(k, it.id)) n++;
    return n;
  }
  function buildTabs() {
    const box = $('look-tabs');
    box.innerHTML = '';
    Look.TABS.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab';
      b.dataset.tab = t.id;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', t.name);
      b.title = t.name;
      b.innerHTML = TAB_ICON[t.id];
      b.onclick = () => LU.setTab(t.id, true);
      box.appendChild(b);
    });
    tabsBuilt = true;
  }
  function paintTabs() {
    $('look-tabs')
      .querySelectorAll('.tab')
      .forEach((b) => {
        const t = tabDef(b.dataset.tab);
        b.classList.toggle('sel', t.id === LU.tab);
        b.setAttribute('aria-selected', t.id === LU.tab ? 'true' : 'false');
        let nb = b.querySelector('.nb');
        const n = freshIn(t);
        if (n && !nb) {
          nb = document.createElement('span');
          nb.className = 'nb';
          b.appendChild(nb);
        }
        if (nb) {
          if (n) nb.textContent = n;
          else nb.remove();
        }
      });
  }
  function renderRows() {
    const t = tabDef(LU.tab);
    const cur = Look.cur();
    let h = '';
    for (const key of t.rows) {
      h += '<div class="row"><div class="rowlabel">' + ROW_LABEL[key] + '</div><div class="tiles" role="listbox" aria-label="' + ROW_LABEL[key] + '">';
      for (const it of Look.items[key]) {
        const own = Look.has(key, it.id);
        const fresh = own && Look.isFresh(key, it.id);
        h += '<button type="button" class="tile' + (cur[key] === it.id ? ' sel' : '') + (own ? '' : ' locked') + '" data-k="' + key + '" data-id="' + it.id + '" role="option" aria-selected="' + (cur[key] === it.id) + '" aria-label="' + it.name + (own ? '' : ' (find a gift box to get this)') + '">' + tilePic(key, it) + (own ? '' : GIFT) + (fresh ? '<span class="nb">NEW</span>' : '') + '</button>';
      }
      h += '</div></div>';
    }
    $('look-rows').innerHTML = h;
  }
  function say(txt, hold) {
    const el = $('look-status');
    el.textContent = txt;
    clearTimeout(statusTimer);
    if (hold) statusTimer = setTimeout(idleStatus, hold);
  }
  function idleStatus() {
    const tt = Look.totals();
    say(TAB_HINT[LU.tab] + (tt.have < tt.all ? '   (Gifts found: ' + tt.have + ' of ' + tt.all + ')' : '   (You found every gift!)'));
  }

  LU.setTab = function (id, user) {
    // the NEW badges of the tab we are leaving have been seen
    if (LU.tab !== id) LU.markSeen();
    LU.tab = id;
    paintTabs();
    renderRows();
    idleStatus();
    if (user && LU.hooks.onTab) LU.hooks.onTab(id);
    if (user && UA.Audio && UA.Audio.started) UA.Audio.pop();
  };
  // everything on this tab has been looked at
  LU.markSeen = function () {
    const t = tabDef(LU.tab);
    for (const k of t.rows) for (const it of Look.items[k]) Look.markSeen(k, it.id);
    LU.updateBadge();
  };
  LU.refresh = function () {
    paintTabs();
    renderRows();
  };

  function pick(key, id) {
    const it = Look.item(key, id);
    if (!Look.has(key, id)) {
      const tile = $('look-rows').querySelector('.tile[data-k="' + key + '"][data-id="' + id + '"]');
      if (tile) {
        tile.classList.remove('wob');
        void tile.offsetWidth;
        tile.classList.add('wob');
      }
      say('Find a gift box in the world to get this one!', 3600);
      if (UA.Audio && UA.Audio.started && UA.Audio.yawn) UA.Audio.yawn();
      return;
    }
    Look.markSeen(key, id);
    if (UA.Audio && UA.Audio.init && !UA.Audio.started) UA.Audio.init();
    Look.set(LU.uni, key, id);
    if (UA.save) UA.save();
    renderRows();
    paintTabs();
    LU.updateBadge();
    say(it.name + '!', 2600);
    if (LU.hooks.onPick) LU.hooks.onPick(key, id);
  }

  LU.init = function (uni, hooks) {
    LU.uni = uni;
    LU.hooks = hooks || {};
    $('look-rows').addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('.tile');
      if (b) pick(b.dataset.k, b.dataset.id);
    });
    $('look-dice').onclick = () => {
      if (UA.Audio && UA.Audio.init && !UA.Audio.started) UA.Audio.init();
      Look.randomize(LU.uni);
      if (UA.save) UA.save();
      LU.refresh();
      say('Ta-da!', 2400);
      if (LU.hooks.onDice) LU.hooks.onDice();
    };
    $('name').addEventListener('input', () => {
      if (UA.state) UA.state.name = ($('name').value || '').slice(0, 14);
    });
    // the brush button at the top right
    const b = $('btn-look');
    if (b) {
      b.innerHTML = LU.BRUSH + '<span class="nb hidden"></span>';
      b.onclick = () => {
        b.blur();
        if (UA.openLook) UA.openLook();
      };
    }
    LU.updateBadge();
  };

  // open the dress-up panel (main.js shows the overlay around it)
  LU.show = function (tab) {
    if (!tabsBuilt) buildTabs();
    LU.tab = tab || LU.tab || 'coat';
    paintTabs();
    renderRows();
    idleStatus();
    $('name').value = (UA.state && UA.state.name) || 'Sparkle';
  };
  LU.hide = function () {
    LU.markSeen();
  };
  // the round brush button shows how many new things are waiting
  LU.updateBadge = function () {
    const b = $('btn-look');
    if (!b) return;
    const nb = b.querySelector('.nb');
    const n = Look.freshCount();
    if (nb) {
      nb.classList.toggle('hidden', !n);
      nb.textContent = n;
    }
    b.classList.toggle('glow', n > 0);
  };
})();
