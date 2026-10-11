import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { addDetail, leafTexture, puffTexture, glowTexture, seeded, makeNoise } from './util.js';

// ---------------------------------------------------------------- sky + light

// Physically based sky, image-based lighting from it, a sun light with shadows.
export function setupSky(scene, renderer, { sun, turbidity = 6, rayleigh = 2, mie = 0.005, mieG = 0.8, sunColor = 0xffffff, sunIntensity = 3, fog, fogDensity = 0.002, shadowBox = 120, shadowAt = new THREE.Vector3(), hemi = 0.4 }) {
  const sky = new Sky();
  sky.scale.setScalar(20000);
  const u = sky.material.uniforms;
  u.turbidity.value = turbidity;
  u.rayleigh.value = rayleigh;
  u.mieCoefficient.value = mie;
  u.mieDirectionalG.value = mieG;
  u.sunPosition.value.copy(sun);
  scene.add(sky);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new Sky();
  envSky.scale.setScalar(1000);
  Object.assign(envSky.material.uniforms.turbidity, { value: turbidity });
  envSky.material.uniforms.rayleigh.value = rayleigh;
  envSky.material.uniforms.mieCoefficient.value = mie;
  envSky.material.uniforms.mieDirectionalG.value = mieG;
  envSky.material.uniforms.sunPosition.value.copy(sun);
  envScene.add(envSky);
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const light = new THREE.DirectionalLight(sunColor, sunIntensity);
  light.position.copy(sun).multiplyScalar(400).add(shadowAt);
  light.target.position.copy(shadowAt);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  const cam = light.shadow.camera;
  cam.left = cam.bottom = -shadowBox;
  cam.right = cam.top = shadowBox;
  cam.near = 1;
  cam.far = 1200;
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.6;
  scene.add(light, light.target);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x404030, hemi);
  scene.add(hemiLight);

  if (fog) scene.fog = new THREE.FogExp2(fog, fogDensity);
  return { sky, light };
}

// ---------------------------------------------------------------- trees

// Instanced conifers: stacked jittered cones merged into one geometry.
export function conifers(points, { color = 0x1f3a2a, scale = [6, 12], seed = 3, shadows = true } = {}) {
  const r = seeded(seed);
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.06, 0.09, 0.4, 5);
  trunk.translate(0, 0.2, 0);
  parts.push(trunk);
  for (let i = 0; i < 4; i++) {
    const cone = new THREE.ConeGeometry(0.42 - i * 0.085, 0.45, 7, 1);
    cone.translate(0, 0.35 + i * 0.2, 0);
    parts.push(cone);
  }
  const geo = mergeGeometries(parts.map((g) => g.toNonIndexed()));
  const mat = addDetail(new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }), { scale: 2, strength: 0.25 });
  const mesh = new THREE.InstancedMesh(geo, mat, points.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const col = new THREE.Color();
  points.forEach((pt, i) => {
    const h = r(scale[0], scale[1]);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r(0, 6.28));
    s.set(h * r(0.55, 0.75), h, h * r(0.55, 0.75));
    p.set(pt[0], pt[1] - 0.2, pt[2]);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
    col.setHSL(0.36 + r(-0.04, 0.04), 0.35, r(0.45, 0.85));
    mesh.setColorAt(i, col);
  });
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  return mesh;
}

// A broadleaf or umbrella tree: tube trunk and branches, instanced leaf cards.
export function leafyTree({ height = 8, spread = 4, shape = 'round', leaf = 'maple', colors = [0xc0392b, 0xe67e22], cards = 260, cardSize = 2.2, seed = 1, lean = 0.3 }) {
  const r = seeded(seed);
  const g = new THREE.Group();
  const barkMat = addDetail(new THREE.MeshStandardMaterial({ color: 0x3b2c22, roughness: 1 }), { scale: 3, strength: 0.4 });
  const trunkPts = [];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    trunkPts.push(new THREE.Vector3(Math.sin(t * 2.2 + seed) * lean * t * height * 0.2, t * height * (shape === 'umbrella' ? 1 : 0.7), Math.cos(t * 1.7 + seed) * lean * t * height * 0.15));
  }
  const trunkCurve = new THREE.CatmullRomCurve3(trunkPts);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 16, height * 0.035, 7), barkMat);
  trunk.castShadow = true;
  g.add(trunk);

  const top = trunkCurve.getPoint(1);
  const blobs = [];
  const nb = shape === 'umbrella' ? 6 : 7;
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + r(-0.3, 0.3);
    const d = spread * r(0.35, 0.8);
    const c = shape === 'umbrella'
      ? new THREE.Vector3(top.x + Math.cos(a) * d, top.y + r(-0.3, 0.6), top.z + Math.sin(a) * d)
      : new THREE.Vector3(top.x + Math.cos(a) * d * 0.7, top.y + r(-0.6, 1.4) * spread * 0.4, top.z + Math.sin(a) * d * 0.7);
    blobs.push(c);
    const start = trunkCurve.getPoint(r(0.55, 0.85));
    const br = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([start, start.clone().lerp(c, 0.5).add(new THREE.Vector3(0, 0.4, 0)), c]), 6, height * 0.014, 5), barkMat);
    br.castShadow = true;
    g.add(br);
  }
  blobs.push(top.clone().add(new THREE.Vector3(0, shape === 'umbrella' ? 0.5 : spread * 0.3, 0)));

  const tex = leafTexture(leaf);
  const leafMat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75, color: 0xffffff });
  leafMat.onBeforeCompile = (sh) => {
    // light bleeding through leaves when the sun is behind them
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.18;');
  };
  const plane = new THREE.PlaneGeometry(cardSize, cardSize);
  const leaves = new THREE.InstancedMesh(plane, leafMat, cards);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  const ca = new THREE.Color(colors[0]), cb = new THREE.Color(colors[1]), col = new THREE.Color();
  for (let i = 0; i < cards; i++) {
    const b = blobs[Math.floor(r() * blobs.length)];
    const rad = spread * (shape === 'umbrella' ? 0.55 : 0.6);
    const u = r(0, 6.28), v = Math.acos(r(-1, 1)), rr = Math.cbrt(r()) * rad;
    p.set(b.x + Math.sin(v) * Math.cos(u) * rr, b.y + Math.cos(v) * rr * (shape === 'umbrella' ? 0.28 : 0.75), b.z + Math.sin(v) * Math.sin(u) * rr);
    e.set(r(-1.2, 1.2), r(0, 6.28), r(-1.2, 1.2));
    q.setFromEuler(e);
    s.setScalar(r(0.7, 1.3));
    m.compose(p, q, s);
    leaves.setMatrixAt(i, m);
    col.copy(ca).lerp(cb, r()).multiplyScalar(r(0.7, 1.1));
    leaves.setColorAt(i, col);
  }
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  g.add(leaves);
  g.userData.leafCenter = top;
  return g;
}

// ---------------------------------------------------------------- clouds and mist

// Camera-facing cloud puffs, lit from above.
export function cloudPuffs(points, { size = [40, 90], color = 0xffffff, shade = 0x9aa6b4, opacity = 0.8, seed = 2 } = {}) {
  const r = seeded(seed);
  const geo = new THREE.InstancedBufferGeometry();
  const base = new THREE.PlaneGeometry(1, 1);
  geo.index = base.index;
  geo.attributes.position = base.attributes.position;
  geo.attributes.uv = base.attributes.uv;
  const offs = new Float32Array(points.length * 4);
  points.forEach((p, i) => { offs.set([p[0], p[1], p[2], r(size[0], size[1])], i * 4); });
  geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(offs, 4));
  geo.instanceCount = points.length;
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTex: { value: puffTexture() }, uColor: { value: new THREE.Color(color) }, uShade: { value: new THREE.Color(shade) }, uOpacity: { value: opacity }, uTime: { value: 0 },
    }]),
    vertexShader: /* glsl */ `
      attribute vec4 aOff;
      varying vec2 vUv;
      varying float vSeed;
      uniform float uTime;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vSeed = fract(aOff.x * 0.137 + aOff.z * 0.291);
        vec3 c = aOff.xyz + vec3(sin(uTime * 0.03 + vSeed * 6.0) * 6.0, 0.0, 0.0);
        vec4 mv = modelViewMatrix * vec4(c, 1.0);
        mv.xy += position.xy * aOff.w * vec2(1.6, 0.8);
        gl_Position = projectionMatrix * mv;
        vec4 mvPosition = mv;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uTex;
      uniform vec3 uColor, uShade;
      uniform float uOpacity;
      varying vec2 vUv;
      varying float vSeed;
      #include <fog_pars_fragment>
      void main() {
        vec2 uv = vUv;
        if (vSeed > 0.5) uv.x = 1.0 - uv.x;
        float a = texture2D(uTex, uv).r * smoothstep(0.5, 0.22, length(vUv - 0.5));
        vec3 col = mix(uShade, uColor, smoothstep(0.2, 0.8, vUv.y));
        gl_FragColor = vec4(col, a * uOpacity);
        #include <fog_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.userData.update = (t) => { mat.uniforms.uTime.value = t; };
  return mesh;
}

// A slab of rolling cloud sea seen from above, faked with stacked noisy layers.
export function cloudSea({ y = 0, size = 3000, layers = 5, gap = 4, color = 0xffffff, shade = 0xb7c4cc, density = 1 }) {
  const g = new THREE.Group();
  for (let i = 0; i < layers; i++) {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uLayer: { value: i / Math.max(1, layers - 1) }, uColor: { value: new THREE.Color(color) }, uShade: { value: new THREE.Color(shade) }, uDensity: { value: density } }]),
      vertexShader: /* glsl */ `
        varying vec3 vW;
        #include <fog_pars_vertex>
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vW = w.xyz;
          vec4 mvPosition = viewMatrix * w;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uLayer, uDensity;
        uniform vec3 uColor, uShade;
        varying vec3 vW;
        #include <fog_pars_fragment>
        float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * n(p); p = p * 2.03 + 3.1; a *= 0.5; } return v; }
        void main() {
          vec2 p = vW.xz * 0.004 + vec2(uTime * 0.004, uTime * 0.002);
          float d = fbm(p) * 0.7 + fbm(p * 3.0 - uTime * 0.01) * 0.3;
          float thr = mix(0.38, 0.6, uLayer) / uDensity;
          float a = smoothstep(thr, thr + 0.22, d);
          vec3 col = mix(uShade, uColor, uLayer * 0.6 + smoothstep(thr, thr + 0.4, d) * 0.5);
          gl_FragColor = vec4(col, a * 0.85);
          #include <fog_fragment>
        }`,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = y + i * gap;
    m.renderOrder = 1;
    g.add(m);
  }
  g.userData.update = (t) => g.children.forEach((m) => { m.material.uniforms.uTime.value = t; });
  return g;
}

// ---------------------------------------------------------------- particles

// GPU-animated drifting particles: petals, embers, dust, fireflies.
export function drifters({ count = 600, box = [200, 60, 200], center = [0, 20, 0], color = 0xf2b8bd, color2 = 0xc8402a, size = 3, fall = 2, wind = [3, 0], kind = 'petal', glow = false }) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const r = seeded(count + size * 10);
  for (let i = 0; i < count; i++) {
    pos.set([r(-0.5, 0.5) * box[0], r(0, 1) * box[1], r(-0.5, 0.5) * box[2]], i * 3);
    seed[i] = r();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 }, uBox: { value: new THREE.Vector3(...box) }, uCenter: { value: new THREE.Vector3(...center) },
      uFall: { value: fall }, uWind: { value: new THREE.Vector2(...wind) }, uSize: { value: size },
      uC1: { value: new THREE.Color(color) }, uC2: { value: new THREE.Color(color2) }, uKind: { value: kind === 'petal' ? 0 : kind === 'dust' ? 1 : 2 },
      uPixel: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uFall, uSize, uPixel;
      uniform vec3 uBox, uCenter;
      uniform vec2 uWind;
      varying float vSeed;
      varying float vRot;
      void main() {
        vSeed = aSeed;
        vec3 p = position;
        float t = uTime * (0.6 + aSeed * 0.8);
        p.y = mod(p.y - t * uFall, uBox.y);
        p.x = mod(p.x + t * uWind.x + sin(t * 0.7 + aSeed * 30.0) * 3.0 + uBox.x * 0.5, uBox.x) - uBox.x * 0.5;
        p.z = mod(p.z + t * uWind.y + cos(t * 0.5 + aSeed * 20.0) * 3.0 + uBox.z * 0.5, uBox.z) - uBox.z * 0.5;
        vec4 mv = modelViewMatrix * vec4(p + uCenter - vec3(0.0, 0.0, 0.0), 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(uSize * uPixel * (0.6 + aSeed * 0.8) * (300.0 / -mv.z), 14.0 * uPixel);
        vRot = t * (aSeed - 0.5) * 6.0;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uC1, uC2;
      uniform float uKind, uTime;
      varying float vSeed;
      varying float vRot;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float a;
        vec3 col = mix(uC1, uC2, step(0.82, vSeed));
        if (uKind < 0.5) {
          float s = sin(vRot), co = cos(vRot);
          c = mat2(co, -s, s, co) * c;
          c.y *= 1.0 + 0.8 * abs(sin(vRot * 0.7));
          a = smoothstep(0.5, 0.35, length(c * vec2(1.0, 2.2)));
        } else if (uKind < 1.5) {
          a = smoothstep(0.5, 0.0, length(c)) * 0.7;
        } else {
          a = smoothstep(0.5, 0.0, length(c)) * (0.5 + 0.5 * sin(uTime * 2.5 + vSeed * 40.0));
        }
        if (a < 0.01) discard;
        gl_FragColor = vec4(col, a);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 3;
  pts.userData.update = (t) => { mat.uniforms.uTime.value = t; mat.uniforms.uPixel.value = Math.min(2, window.devicePixelRatio || 1) * 0.8; };
  return pts;
}

// ---------------------------------------------------------------- grass

// Wind-blown instanced grass blades on a heightfield.
export function grassField({ count = 60000, area = [160, 160], center = [0, 0], heightFn, base = 0x2e3b14, tip = 0xc8b45a, sunDir = new THREE.Vector3(0, 1, 0), sunColor = 0xffb070, bladeH = [0.6, 1.4], fogColor = 0xffffff, fogDensity = 0.002, avoid = null }) {
  const blade = new THREE.BufferGeometry();
  const segs = 4;
  const verts = [], uvs = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const w = 0.035 * (1 - t * 0.85);
    verts.push(-w, t, 0, w, t, 0);
    uvs.push(0, t, 1, t);
  }
  const idx = [];
  for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  blade.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  blade.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  blade.setIndex(idx);

  const geo = new THREE.InstancedBufferGeometry();
  geo.index = blade.index;
  geo.attributes.position = blade.attributes.position;
  geo.attributes.uv = blade.attributes.uv;
  const data = new Float32Array(count * 4);
  const r = seeded(77);
  let n = 0;
  for (let i = 0; i < count; i++) {
    const x = center[0] + r(-0.5, 0.5) * area[0];
    const z = center[1] + r(-0.5, 0.5) * area[1];
    if (avoid && avoid(x, z)) continue;
    data.set([x, heightFn(x, z), z, r()], n * 4);
    n++;
  }
  geo.setAttribute('aData', new THREE.InstancedBufferAttribute(data, 4));
  geo.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 }, uBase: { value: new THREE.Color(base) }, uTip: { value: new THREE.Color(tip) },
      uSun: { value: sunDir.clone().normalize() }, uSunColor: { value: new THREE.Color(sunColor) }, uH: { value: new THREE.Vector2(...bladeH) },
      uFog: { value: new THREE.Color(fogColor) }, uFogD: { value: fogDensity }, uGust: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aData;
      uniform float uTime, uGust;
      uniform vec2 uH;
      varying float vT;
      varying float vSeed;
      varying vec3 vW;
      varying float vDepth;
      void main() {
        vT = uv.y;
        vSeed = aData.w;
        float ang = aData.w * 6.2831;
        float h = mix(uH.x, uH.y, fract(aData.w * 7.31));
        vec3 p = vec3(position.x * cos(ang), position.y * h, position.x * sin(ang));
        float wave = sin(uTime * 1.6 + aData.x * 0.12 + aData.z * 0.05) * 0.5 + 0.5;
        float gust = sin(uTime * 0.6 + aData.x * 0.03) * 0.5 + 0.5;
        float bend = (0.15 + 0.35 * wave * gust + uGust) * vT * vT;
        p.x += bend * h * 0.8;
        p.z += bend * h * 0.25 * sin(aData.w * 20.0 + uTime);
        p.y *= 1.0 - bend * 0.25;
        vec3 w = aData.xyz + p;
        vW = w;
        vec4 mv = viewMatrix * vec4(w, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase, uTip, uSun, uSunColor, uFog;
      uniform float uFogD;
      varying float vT;
      varying float vSeed;
      varying vec3 vW;
      varying float vDepth;
      void main() {
        float tt = clamp(vT, 0.0, 1.0);
        vec3 col = mix(uBase, uTip * (0.75 + 0.5 * vSeed), tt * sqrt(tt));
        vec3 view = normalize(cameraPosition - vW + vec3(0.0, 1e-4, 0.0));
        float b = max(0.0, dot(-view, uSun));
        float back = b * b * b * b;
        col += uSunColor * back * tt * 1.4;
        col *= 0.55 + 0.6 * tt;
        float fd = uFogD * max(vDepth, 0.0);
        float f = 1.0 - exp(-fd * fd);
        col = mix(col, uFog, f);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.userData.update = (t) => { mat.uniforms.uTime.value = t; };
  return mesh;
}

// ---------------------------------------------------------------- props

export function rock(size = 3, seed = 1, color = 0x77736c) {
  const g = new THREE.IcosahedronGeometry(1, 3);
  const n = makeNoise(seed);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const d = 1 + 0.25 * n(v.x * 1.3 + seed, v.y * 1.3 + v.z) + 0.1 * n(v.x * 4, v.z * 4 + v.y);
    v.multiplyScalar(d);
    v.y *= 0.65;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, addDetail(new THREE.MeshStandardMaterial({ color, roughness: 0.95 }), { scale: 1.5, strength: 0.45 }));
  m.scale.setScalar(size);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function stoneLantern(scale = 1) {
  const g = new THREE.Group();
  const mat = addDetail(new THREE.MeshStandardMaterial({ color: 0x8a867c, roughness: 1 }), { scale: 4, strength: 0.5 });
  const add = (geo, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  add(new THREE.CylinderGeometry(0.5, 0.6, 0.3, 6), 0.15);
  add(new THREE.CylinderGeometry(0.16, 0.2, 1.2, 8), 0.9);
  add(new THREE.CylinderGeometry(0.55, 0.45, 0.22, 6), 1.6);
  add(new THREE.BoxGeometry(0.62, 0.55, 0.62), 1.98);
  add(new THREE.ConeGeometry(0.85, 0.5, 6), 2.5);
  add(new THREE.SphereGeometry(0.13, 8, 6), 2.82);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.64), new THREE.MeshBasicMaterial({ color: 0xffb35c }));
  glow.position.y = 1.98;
  glow.visible = false;
  g.add(glow);
  g.userData.glow = glow;
  g.scale.setScalar(scale);
  return g;
}

export function sunDisc(direction, { distance = 9000, size = 900, color = 0xfff0d0, intensity = 6 } = {}) {
  const mat = new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(color).multiplyScalar(intensity), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
  const s = new THREE.Sprite(mat);
  s.position.copy(direction).normalize().multiplyScalar(distance);
  s.scale.setScalar(size);
  s.renderOrder = -1;
  return s;
}
