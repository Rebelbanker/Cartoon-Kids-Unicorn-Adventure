/* Input: keyboard, mouse-drag camera, gamepad, and touch (virtual joystick + buttons) */
(function () {
  const UA = window.UA;
  const I = (UA.Input = {});
  const keys = {};
  const edges = { jump: false, pet: false, feed: false, play: false, next: false, view: false, quality: false, magic: false, book: false, help: false, time: false, spell: false, pick: -1 };
  const held = { jump: false, gallop: false };
  let camDX = 0,
    camDY = 0,
    zoomD = 0;
  const touchMove = { x: 0, y: 0, active: false };
  const pad = { prev: [] };
  let padMoved = false;
  I.isTouch = false;
  I.enabled = false;

  const KEYMAP = {
    KeyE: 'pet',
    KeyF: 'feed',
    KeyR: 'play',
    KeyQ: 'magic',
    KeyB: 'book',
    KeyH: 'help',
    Enter: 'magic',
    KeyN: 'time',
    KeyC: 'spell',
    Tab: 'next',
    KeyV: 'view',
    KeyG: 'quality',
  };

  I.trigger = (n) => {
    if (I.enabled || n === 'book' || n === 'help') edges[n] = true;
    if (n.indexOf('pick') === 0) edges.pick = parseInt(n.slice(4), 10);
  };
  I.setHeld = (n, v) => {
    held[n] = v;
    if (n === 'jump' && v) edges.jump = true;
  };

  I.init = function (canvas) {
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow')) e.preventDefault();
      if (e.repeat) return;
      keys[e.code] = true;
      if (I.auto && /^(KeyW|KeyA|KeyS|KeyD|Arrow)/.test(e.code)) I.auto = null; // taking the reins stops the dream ride
      if (e.code === 'KeyP' && I.enabled) I.toggleAuto();
      if (e.code === 'Space') {
        edges.jump = true;
        held.jump = true;
      }
      if (KEYMAP[e.code]) I.trigger(KEYMAP[e.code]);
      if (/^Digit[1-9]$/.test(e.code) && I.enabled) edges.pick = parseInt(e.code.slice(5), 10) - 1;
    });
    window.addEventListener('keyup', (e) => {
      keys[e.code] = false;
      if (e.code === 'Space') held.jump = false;
    });
    window.addEventListener('blur', () => {
      for (const k in keys) keys[k] = false;
      held.jump = false;
    });

    // drag to look around (mouse and touch on the 3D view)
    let dragging = false,
      lx = 0,
      ly = 0,
      pid = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') I.isTouch = true;
      dragging = true;
      pid = e.pointerId;
      lx = e.clientX;
      ly = e.clientY;
      try {
        canvas.setPointerCapture(pid);
      } catch (err) {}
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging || e.pointerId !== pid) return;
      camDX += e.clientX - lx;
      camDY += e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
    });
    const end = (e) => {
      if (e.pointerId === pid) dragging = false;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener(
      'wheel',
      (e) => {
        zoomD += e.deltaY * 0.01;
        e.preventDefault();
      },
      { passive: false }
    );
    I.dragging = () => dragging;
  };

  // used by the touch joystick UI
  I.setTouchMove = (x, y, active) => {
    touchMove.x = x;
    touchMove.y = y;
    touchMove.active = active;
    if (active) I.isTouch = true;
  };

  function pollGamepad(out) {
    let pads = [];
    try {
      pads = navigator.getGamepads ? navigator.getGamepads() : [];
    } catch (e) {
      /* gamepads can be blocked inside embedded pages */
    }
    for (const gp of pads) {
      if (!gp) continue;
      const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
      out.x += dz(gp.axes[0] || 0);
      out.y += -dz(gp.axes[1] || 0);
      if (dz(gp.axes[0] || 0) || dz(gp.axes[1] || 0)) padMoved = true;
      camDX += dz(gp.axes[2] || 0) * 14;
      camDY += dz(gp.axes[3] || 0) * 10;
      const b = gp.buttons.map((x) => x.pressed);
      const prev = pad.prev;
      const down = (i) => b[i] && !prev[i];
      if (down(0)) {
        edges.jump = true;
      }
      held.padJump = !!b[0];
      if (down(2)) I.trigger('magic');
      if (down(1)) I.trigger('pet');
      if (down(3)) I.trigger('feed');
      if (down(4)) I.trigger('play');
      if (down(9)) I.trigger('help');
      if (down(15)) I.trigger('spell');
      if (down(14)) I.trigger('next');
      if (down(12)) I.trigger('time');
      out.gallop = out.gallop || !!b[7] || !!b[5];
      pad.prev = b;
      break;
    }
  }

  // Dream ride (P): the unicorn wanders, gallops, hops and glides, and casts magic now and then. For little ones
  // who want to sit back and watch, and handy for testing.
  I.auto = null;
  // main.js keeps these current so the dream ride can steer in world terms (the north-up camera never turns to follow it)
  I.camYaw = 0;
  I.uniYaw = 0;
  I.toggleAuto = function () {
    I.auto = I.auto ? null : { t0: performance.now() / 1000, hop: -1, mag: -1, spell: -1, h: I.uniYaw, last: 0 };
    if (UA.UI && UA.UI.toast) UA.UI.toast(I.auto ? 'Dream ride!<small>Press P again, or steer, to take over</small>' : 'Your turn!', 2200);
  };
  function dreamRide(out) {
    const a = I.auto,
      t = performance.now() / 1000 - a.t0;
    // wander: a desired compass heading that drifts left and right, turned into stick input relative to the camera
    const dt = Math.min(0.1, Math.max(0, t - a.last));
    a.last = t;
    a.h += (Math.sin(t * 0.45) * 0.7 + Math.sin(t * 0.17) * 0.4) * 0.5 * dt;
    out.y = Math.cos(a.h - I.camYaw);
    out.x = -Math.sin(a.h - I.camYaw);
    out.gallop = t % 14 < 9;
    const cyc = t % 9;
    const hop = Math.floor(t / 9);
    out.jumpHeld = cyc > 4.6 && cyc < 7;
    if (cyc > 4 && a.hop < hop * 2) {
      out.jumpPressed = true;
      a.hop = hop * 2;
    }
    if (cyc > 4.5 && a.hop < hop * 2 + 1) {
      out.jumpPressed = true;
      a.hop = hop * 2 + 1;
    }
    const mg = Math.floor(t / 6);
    if (mg !== a.mag && t % 6 > 3) {
      out.magic = true;
      a.mag = mg;
    }
    const sp = Math.floor(t / 20);
    if (sp !== a.spell && t % 20 > 10) {
      out.spell = true;
      a.spell = sp;
    }
  }

  // read this frame's input; clears one-shot edges
  I.read = function () {
    const out = { x: 0, y: 0, gallop: false };
    if (keys.KeyW || keys.ArrowUp) out.y += 1;
    if (keys.KeyS || keys.ArrowDown) out.y -= 1;
    if (keys.KeyA || keys.ArrowLeft) out.x -= 1;
    if (keys.KeyD || keys.ArrowRight) out.x += 1;
    out.gallop = !!(keys.ShiftLeft || keys.ShiftRight);
    if (touchMove.active) {
      out.x += touchMove.x;
      out.y += touchMove.y;
    }
    held.padJump = false;
    padMoved = false;
    pollGamepad(out);
    // true when the arrow keys alone are steering (not a touch stick, a gamepad or the dream ride)
    out.keyOnly = !touchMove.active && !padMoved;
    if (held.gallopBtn) out.gallop = true;
    const m = Math.hypot(out.x, out.y);
    if (m > 1) {
      out.x /= m;
      out.y /= m;
    }
    out.jumpHeld = held.jump || held.padJump;
    out.jumpPressed = edges.jump;
    out.pet = edges.pet;
    out.feed = edges.feed;
    out.play = edges.play;
    out.next = edges.next;
    out.view = edges.view;
    out.quality = edges.quality;
    out.magic = edges.magic;
    out.book = edges.book;
    out.help = edges.help;
    out.time = edges.time;
    out.spell = edges.spell;
    out.pick = edges.pick;
    out.camDX = camDX;
    out.camDY = camDY;
    out.zoom = zoomD;
    edges.jump = edges.pet = edges.feed = edges.play = edges.next = edges.view = edges.quality = edges.magic = edges.book = edges.help = edges.time = edges.spell = false;
    edges.pick = -1;
    camDX = camDY = zoomD = 0;
    if (I.auto && I.enabled) {
      dreamRide(out);
      out.keyOnly = false;
    }
    if (!I.enabled) {
      out.x = out.y = 0;
      out.jumpPressed = false;
      out.pet = out.feed = out.play = out.next = out.view = out.quality = out.magic = out.time = out.spell = false;
      out.pick = -1;
    }
    return out;
  };
})();
