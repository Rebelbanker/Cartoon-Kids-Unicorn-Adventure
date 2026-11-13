/* Cartoon look: bolder cel shading, tinted shadows, richer colour (a patch to three's toon shader, so it costs almost
   nothing), plus inked outlines (an inverted-hull shell around each solid mesh, fattened in screen space so every line is
   the same thickness on screen). Outlines are the "Fancy" graphics setting; "Simple" turns them off. */
(function () {
  const UA = (window.UA = window.UA || {});
  const T = THREE;

  /* ---------- 1. the toon shader: tinted shadow bands, colour grade, highlight dabs ---------- */
  const K = (UA.Cartoon = {
    // light amounts for the four lighting bands, darkest to brightest (sun facing away ... sun facing)
    bands: [0.2, 0.42, 0.86, 1.0],
    // shadows lean lavender-blue instead of just going grey
    shadeTint: [0.8, 0.66, 1.16],
    saturation: 1.3,
    outlineColor: 0x3a2060,
    outlineWidth: 2.3, // CSS pixels, near the camera
  });

  const SC = T.ShaderChunk;
  const t = K.shadeTint;
  SC.gradientmap_pars_fragment = SC.gradientmap_pars_fragment.replace(
    'return vec3( texture2D( gradientMap, coord ).r );',
    'float g = texture2D( gradientMap, coord ).r;\n\t\treturn vec3( g ) * mix( vec3( ' + t.map((v) => v.toFixed(3)).join(', ') + ' ), vec3( 1.0 ), smoothstep( 0.3, 1.0, g ) );'
  );
  // Nudge the band lookup a hair so a flat wall that squares up exactly to the sun (a wall facing east or west at noon,
  // say) does not sit right on the boundary between two bands: there, float rounding speckles it with dots.
  SC.gradientmap_pars_fragment = SC.gradientmap_pars_fragment.replace('vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );', 'vec2 coord = vec2( dotNL * 0.5 + 0.512, 0.0 );');
  const GRADE = [
    '{',
    '  float lumG = dot( outgoingLight, vec3( 0.2126, 0.7152, 0.0722 ) );',
    '  outgoingLight = mix( vec3( lumG ), outgoingLight, ' + K.saturation.toFixed(3) + ' );',
    '  #if defined( GLOSS ) && NUM_DIR_LIGHTS > 0',
    '  vec3 hv = normalize( directionalLights[ 0 ].direction + normalize( vViewPosition ) );',
    '  float dab = smoothstep( 0.955, 0.972, dot( normal, hv ) );',
    '  outgoingLight = mix( outgoingLight, vec3( 1.0 ), dab * 0.9 );',
    '  #endif',
    '}',
  ].join('\n');
  T.ShaderLib.toon.fragmentShader = T.ShaderLib.toon.fragmentShader.replace('#include <opaque_fragment>', GRADE + '\n#include <opaque_fragment>');

  // the lighting-band lookup texture (core.js asks for it)
  K.gradient = function () {
    const d = new Uint8Array(K.bands.map((v) => Math.round(v * 255)));
    const tex = new T.DataTexture(d, d.length, 1, T.RedFormat);
    tex.minFilter = tex.magFilter = T.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
  };

  // make a material shiny: it gets a crisp white highlight dab where the sun glints off it
  K.gloss = function (mat) {
    mat.defines = Object.assign(mat.defines || {}, { GLOSS: 1 });
    return mat;
  };

  /* ---------- 2. outlines ---------- */
  const O = (UA.Outline = { enabled: true, list: [] });
  let scene = null;
  const uniforms = T.UniformsUtils.merge([T.UniformsLib.fog, { uWidth: { value: K.outlineWidth }, uRes: { value: new T.Vector2(960, 540) }, uColor: { value: new T.Color(K.outlineColor) } }]);

  const VERT = [
    'uniform float uWidth;',
    'uniform vec2 uRes;',
    '#ifdef USE_ONRM',
    'attribute vec3 onrm;',
    '#endif',
    '#include <fog_pars_vertex>',
    'void main() {',
    '  #ifdef USE_ONRM',
    '  vec3 n = onrm;',
    '  #else',
    '  vec3 n = normal;',
    '  #endif',
    '  vec4 mvPosition = vec4( position, 1.0 );',
    '  #ifdef USE_INSTANCING',
    '  mvPosition = instanceMatrix * mvPosition;',
    '  n = mat3( instanceMatrix ) * n;',
    '  #endif',
    '  mvPosition = modelViewMatrix * mvPosition;',
    '  vec3 vn = normalize( normalMatrix * n );',
    '  vec4 clip = projectionMatrix * mvPosition;',
    // push each vertex outwards along its (screen-projected) normal by a fixed number of pixels
    '  vec2 dir = ( projectionMatrix * vec4( vn, 0.0 ) ).xy;',
    '  float dl = length( dir );',
    '  dir = dl > 0.0001 ? dir / dl : vec2( 0.0 );',
    '  float d = -mvPosition.z;',
    '  float w = uWidth * mix( 1.0, 0.5, smoothstep( 30.0, 150.0, d ) );',
    '  clip.xy += dir * w * 2.0 / uRes * clip.w;',
    '  gl_Position = clip;',
    '  #include <fog_vertex>',
    '}',
  ].join('\n');
  const FRAG = ['uniform vec3 uColor;', '#include <fog_pars_fragment>', 'void main() {', '  gl_FragColor = vec4( uColor, 1.0 );', '  #include <colorspace_fragment>', '  #include <fog_fragment>', '}'].join('\n');

  const mats = {};
  function getMat(smooth) {
    const k = smooth ? 's' : 'n';
    if (!mats[k]) {
      mats[k] = new T.ShaderMaterial({
        uniforms,
        vertexShader: VERT,
        fragmentShader: FRAG,
        fog: true,
        side: T.BackSide,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
        defines: smooth ? { USE_ONRM: 1 } : {},
      });
    }
    return mats[k];
  }

  // Corner-safe push directions: average the normals of vertices that sit at the same spot, so hard-edged boxes
  // keep one connected shell instead of tearing open at their corners.
  function prepare(geo) {
    if (geo.userData.onrm !== undefined) return geo.userData.onrm;
    const pos = geo.attributes.position,
      nor = geo.attributes.normal;
    if (!pos || !nor) return (geo.userData.onrm = false);
    const n = pos.count;
    const gid = new Int32Array(n);
    const map = new Map();
    const sum = [];
    for (let i = 0; i < n; i++) {
      const key = ((Math.round(pos.getX(i) * 100) + 50000) * 131072 + (Math.round(pos.getY(i) * 100) + 50000)) * 131072 + (Math.round(pos.getZ(i) * 100) + 50000);
      let g = map.get(key);
      if (g === undefined) {
        g = sum.length / 3;
        map.set(key, g);
        sum.push(0, 0, 0);
      }
      gid[i] = g;
      sum[g * 3] += nor.getX(i);
      sum[g * 3 + 1] += nor.getY(i);
      sum[g * 3 + 2] += nor.getZ(i);
    }
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const g = gid[i] * 3;
      let x = sum[g],
        y = sum[g + 1],
        z = sum[g + 2];
      const l = Math.hypot(x, y, z) || 1;
      out[i * 3] = x / l;
      out[i * 3 + 1] = y / l;
      out[i * 3 + 2] = z / l;
    }
    geo.setAttribute('onrm', new T.BufferAttribute(out, 3));
    return (geo.userData.onrm = true);
  }

  const _s = new T.Vector3();
  function eligible(m) {
    const u = m.userData;
    if (u.noOutline || u.isOutline || u.ol) return false;
    const mat = m.material;
    if (!mat || Array.isArray(mat) || !mat.isMeshToonMaterial) return false;
    if (mat.transparent || mat.opacity < 1 || mat.depthWrite === false) return false;
    if (mat.side === T.DoubleSide && !u.outline) return false;
    const g = m.geometry;
    if (!g || !g.attributes || !g.attributes.normal) return false;
    if (!g.boundingSphere) g.computeBoundingSphere();
    m.getWorldScale(_s);
    const r = g.boundingSphere.radius * Math.max(_s.x, _s.y, _s.z);
    if (!m.isInstancedMesh && !u.dyn && r < (u.minR !== undefined ? u.minR : 0.05)) return false;
    if (r > 160) return false;
    return true;
  }

  function addTo(m) {
    m.userData.ol = 1;
    const g = m.geometry;
    const smooth = !m.userData.dyn && prepare(g);
    let o;
    if (m.isInstancedMesh) {
      o = new T.InstancedMesh(g, getMat(smooth), m.instanceMatrix.count);
      o.instanceMatrix = m.instanceMatrix;
      o.count = m.count;
    } else o = new T.Mesh(g, getMat(smooth));
    o.userData.isOutline = 1;
    o.frustumCulled = m.frustumCulled;
    o.renderOrder = m.renderOrder;
    o.matrixAutoUpdate = false;
    o.visible = O.enabled;
    m.add(o);
    if (!g.boundingSphere) g.computeBoundingSphere();
    m.getWorldScale(_s);
    O.list.push({ o, p: m, r: m.isInstancedMesh ? 1e9 : g.boundingSphere.radius * Math.max(_s.x, _s.y, _s.z) });
  }

  // outline everything eligible under `root` (the whole scene, or a newly added model)
  O.apply = function (root) {
    const found = [];
    (root || scene).traverse((m) => {
      if (m.isMesh && !m.userData.isOutline && eligible(m)) found.push(m);
    });
    for (const m of found) addTo(m);
    return found.length;
  };
  O.init = function (sc) {
    scene = sc;
    O.apply(scene);
  };
  O.setEnabled = function (on) {
    O.enabled = !!on;
    for (const e of O.list) e.o.visible = O.enabled && e.near !== false;
  };

  // each frame: keep the line width and screen size in step; a few times a second: hide outlines on far things and
  // outline anything new that has appeared (accessories, spawned toys)
  let acc = 0,
    scanAcc = 0;
  const _v = new T.Vector2();
  O.update = function (dt, camera, renderer) {
    renderer.getDrawingBufferSize(_v);
    uniforms.uRes.value.copy(_v);
    uniforms.uWidth.value = K.outlineWidth * renderer.getPixelRatio();
    acc += dt;
    scanAcc += dt;
    if (scanAcc > 1.2 && scene) {
      scanAcc = 0;
      O.apply(scene);
    }
    if (acc < 0.35) return;
    acc = 0;
    const cx = camera.position.x,
      cy = camera.position.y,
      cz = camera.position.z;
    for (const e of O.list) {
      const el = e.p.matrixWorld.elements;
      const dx = el[12] - cx,
        dy = el[13] - cy,
        dz = el[14] - cz;
      const lim = 95 + e.r;
      e.near = dx * dx + dy * dy + dz * dz < lim * lim;
      e.o.visible = O.enabled && e.near;
      if (e.p.isInstancedMesh) e.o.count = e.p.count;
    }
  };
})();
