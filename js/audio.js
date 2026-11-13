/* Audio: tiny WebAudio synth for sound effects and a gentle generative lullaby. No audio files needed. */
(function () {
  const UA = window.UA;
  const A = (UA.Audio = { ctx: null, muted: false, started: false });
  let master, bus, noiseBuf, musicTimer;
  // C major pentatonic across octaves
  const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];

  A.init = function () {
    if (A.started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      A.ctx = new AC();
      master = A.ctx.createGain();
      master.gain.value = A.muted ? 0 : 0.7;
      master.connect(A.ctx.destination);
      // dreamy echo
      bus = A.ctx.createGain();
      const delay = A.ctx.createDelay(1.0);
      delay.delayTime.value = 0.27;
      const fb = A.ctx.createGain();
      fb.gain.value = 0.32;
      const wet = A.ctx.createGain();
      wet.gain.value = 0.35;
      bus.connect(master);
      bus.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(wet);
      wet.connect(master);
      // noise buffer for splashes
      noiseBuf = A.ctx.createBuffer(1, A.ctx.sampleRate * 0.5, A.ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      A.started = true;
      A.startMusic();
    } catch (e) {
      /* audio is optional */
    }
  };

  A.setMuted = function (m) {
    A.muted = m;
    if (master) master.gain.value = m ? 0 : 0.7;
    UA.store.set('ua_muted', m);
  };

  function tone(freq, delay, dur, type, vol, slideTo) {
    if (!A.ctx || A.muted) return;
    const t0 = A.ctx.currentTime + (delay || 0);
    const o = A.ctx.createOscillator();
    const g = A.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(bus);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  A.jump = () => tone(320, 0, 0.18, 'sine', 0.22, 640);
  A.flap = () => {
    tone(520, 0, 0.14, 'triangle', 0.14, 900);
    tone(780, 0.06, 0.14, 'sine', 0.1, 1200);
  };
  A.land = () => tone(180, 0, 0.12, 'sine', 0.18, 90);
  A.pop = () => tone(640, 0, 0.1, 'sine', 0.22, 1300);
  // the glitter-poop gag: a little wobbling hum while she concentrates, then a bubbly "bloop" for each layer that plops out
  A.strain = () => {
    tone(210, 0, 0.55, 'triangle', 0.07, 300);
    tone(214, 0.04, 0.5, 'sine', 0.05, 308);
    tone(330, 0.5, 0.2, 'sine', 0.05, 260);
  };
  A.plop = (i) => {
    const k = i || 0;
    tone(430 + k * 90, 0, 0.16, 'sine', 0.3, 130 + k * 25);
    tone(900 + k * 230, 0.05, 0.12, 'triangle', 0.08, 1500 + k * 250);
  };
  A.chirp = (base) => {
    const b = base || 520;
    tone(b, 0, 0.1, 'sine', 0.2, b * 1.25);
    tone(b * 1.5, 0.09, 0.16, 'sine', 0.2, b * 1.8);
  };
  A.yum = (base) => {
    const b = (base || 520) * 0.9;
    tone(b, 0, 0.08, 'triangle', 0.18);
    tone(b * 1.25, 0.1, 0.08, 'triangle', 0.18);
    tone(b * 1.5, 0.2, 0.18, 'triangle', 0.2);
  };
  A.sparkle = () => {
    for (let i = 0; i < 7; i++) tone(SCALE[5 + ((i * 2) % 7)], i * 0.055, 0.35, 'sine', 0.13);
  };
  A.ring = (i) => {
    const f = SCALE[Math.min(SCALE.length - 1, 3 + i)];
    tone(f, 0, 0.4, 'triangle', 0.22);
    tone(f * 2, 0.02, 0.35, 'sine', 0.1);
  };
  A.fanfare = () => {
    [0, 2, 4, 7, 9, 11].forEach((s, i) => tone(SCALE[s], i * 0.1, 0.5, 'triangle', 0.2));
    tone(SCALE[11], 0.7, 0.9, 'sine', 0.18);
  };
  A.splash = () => {
    if (!A.ctx || A.muted) return;
    const t0 = A.ctx.currentTime;
    const src = A.ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = A.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    f.Q.value = 0.8;
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + 0.3);
  };

  A.whoosh = () => {
    tone(220, 0, 0.5, 'sine', 0.12, 1320);
    tone(330, 0.05, 0.5, 'triangle', 0.08, 1760);
  };
  A.shimmer = () => {
    for (let i = 0; i < 5; i++) tone(SCALE[7 + i], i * 0.07, 0.6, 'sine', 0.09);
  };
  // soft marimba-ish note for the chimes (index into the pentatonic scale, 0..7)
  const CHIME = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
  A.chime = (i) => {
    const f = CHIME[i % CHIME.length];
    tone(f, 0, 0.9, 'sine', 0.26);
    tone(f * 2, 0, 0.45, 'triangle', 0.09);
    tone(f * 3.01, 0, 0.18, 'sine', 0.05);
  };
  A.boing = (pitch) => {
    const p = pitch || 1;
    tone(150 * p, 0, 0.28, 'sine', 0.26, 520 * p);
    tone(300 * p, 0.02, 0.2, 'triangle', 0.1, 900 * p);
  };
  A.bubble = () => tone(420, 0, 0.16, 'sine', 0.13, 880);
  A.bubblePop = () => {
    tone(900, 0, 0.07, 'sine', 0.2, 1700);
    tone(1500, 0.03, 0.09, 'sine', 0.08);
  };
  A.wish = () => {
    [0, 2, 4, 6, 8].forEach((s, i) => tone(SCALE[s + 3], i * 0.09, 0.8, 'triangle', 0.16));
    tone(SCALE[11], 0.5, 1.2, 'sine', 0.14);
  };
  A.portal = () => {
    for (let i = 0; i < 8; i++) tone(SCALE[i], i * 0.045, 0.5, 'sine', 0.1, SCALE[i] * 1.5);
  };
  A.yawn = () => tone(400, 0, 0.7, 'sine', 0.08, 210);
  // Princess Starla: a little giggle, and a twinkly hello
  A.giggle = () => {
    for (let i = 0; i < 4; i++) tone(820 + (i % 2) * 300, i * 0.09, 0.08, 'sine', 0.11, 1250 + (i % 2) * 260);
  };
  A.hello = () => {
    tone(784, 0, 0.14, 'triangle', 0.14, 880);
    tone(1046, 0.12, 0.14, 'triangle', 0.14, 1175);
    tone(1318, 0.24, 0.3, 'sine', 0.14);
  };

  // gentle generative lullaby
  A.startMusic = function () {
    if (musicTimer) return;
    let step = 0;
    const play = () => {
      if (A.ctx && !A.muted && A.ctx.state === 'running') {
        // slow arpeggio on pentatonic with occasional pad
        const idx = [0, 2, 4, 5, 4, 2, 3, 1][step % 8] + (Math.random() < 0.25 ? 2 : 0);
        tone(SCALE[idx], 0, 2.2, 'triangle', 0.045);
        if (step % 4 === 0) {
          tone(SCALE[idx % 5] / 2, 0, 3.6, 'sine', 0.05);
          tone(SCALE[(idx % 5) + 2] / 2, 0, 3.6, 'sine', 0.035);
        }
        if (Math.random() < 0.3) tone(SCALE[6 + Math.floor(Math.random() * 6)], 0.25, 1.4, 'sine', 0.03);
      }
      step++;
      musicTimer = setTimeout(play, 900 + Math.random() * 500);
    };
    play();
  };
})();
