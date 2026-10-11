import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const CompositeShader = {
  defines: { RAY_STEPS: 36 },
  uniforms: {
    tDiffuse: { value: null },
    tA: { value: null },
    tB: { value: null },
    uMix: { value: 0 },
    uFocal: { value: new THREE.Vector2(0.5, 0.5) },
    uSunA: { value: new THREE.Vector3(0.5, 0.5, 0) },
    uSunB: { value: new THREE.Vector3(0.5, 0.5, 0) },
    uExpA: { value: 1 },
    uExpB: { value: 1 },
    uTintA: { value: new THREE.Vector3(1, 1, 1) },
    uTintB: { value: new THREE.Vector3(1, 1, 1) },
    uRaysA: { value: 1 },
    uRaysB: { value: 1 },
    uAspect: { value: 1 },
    uTime: { value: 0 },
    uNight: { value: 0 },
    uSlash: { value: 0 },
    uSoft: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tA, tB;
    uniform float uMix, uExpA, uExpB, uRaysA, uRaysB, uAspect, uTime, uNight, uSlash, uSoft;
    uniform vec2 uFocal;
    uniform vec3 uSunA, uSunB, uTintA, uTintB;
    varying vec2 vUv;

    float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * n(p); p = p * 2.03 + 1.7; a *= 0.5; } return v; }

    vec3 rays(sampler2D t, vec2 uv, vec3 sun) {
      if (sun.z <= 0.001) return vec3(0.0);
      vec2 d = (sun.xy - uv) / float(RAY_STEPS);
      vec2 p = uv;
      vec3 acc = vec3(0.0);
      float decay = 1.0;
      for (int i = 0; i < RAY_STEPS; i++) {
        p += d;
        vec3 s = texture2D(t, clamp(p, 0.001, 0.999)).rgb;
        float l = dot(s, vec3(0.2126, 0.7152, 0.0722));
        acc += s * smoothstep(1.2, 5.0, l) * decay;
        decay *= 0.96;
      }
      float fall = exp(-length((uv - sun.xy) * vec2(uAspect, 1.0)) * 1.6);
      return acc / float(RAY_STEPS) * sun.z * fall * 1.6;
    }

    void main() {
      vec3 a = texture2D(tA, vUv).rgb;
      a += rays(tA, vUv, uSunA) * uRaysA;
      a *= uExpA * uTintA;
      vec3 col = a;
      if (uMix > 0.001) {
        vec3 b = texture2D(tB, vUv).rgb;
        b += rays(tB, vUv, uSunB) * uRaysB;
        b *= uExpB * uTintB;
        vec2 q = (vUv - uFocal) * vec2(uAspect, 1.0);
        float nz = fbm(vUv * vec2(uAspect, 1.0) * 3.2 + 4.0);
        float edge = uMix * 2.2 - 0.35;
        float m = uSoft > 0.5 ? 1.0 - uMix : smoothstep(edge - 0.1, edge + 0.04, length(q) * 0.9 + nz * 0.5);
        float rim = smoothstep(0.0, 0.5, m) * smoothstep(1.0, 0.5, m);
        col = mix(b, a, m);
        col = mix(col, vec3(0.012, 0.01, 0.01), rim * 0.65 * (1.0 - uSoft));
      }
      if (uNight > 0.001) {
        float l = dot(col, vec3(0.3, 0.59, 0.11));
        vec3 nc = mix(vec3(l), col, 0.35) * vec3(0.16, 0.22, 0.42);
        col = mix(col, nc, uNight);
      }
      float sa = uTime - uSlash;
      if (sa > 0.0 && sa < 1.2) {
        vec2 dir = normalize(vec2(1.0, 0.3));
        vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
        float dl = abs(dot(p - vec2(0.1, -0.05), vec2(-dir.y, dir.x)));
        col += vec3(6.0, 5.6, 5.2) * exp(-dl * 700.0) * (1.0 - smoothstep(0.0, 1.0, sa));
        col += vec3(1.0, 0.9, 0.85) * exp(-sa * 5.0) * 0.8;
      }
      gl_FragColor = vec4(col, 1.0);
    }`,
};

const FinishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAspect: { value: 1 } },
  vertexShader: CompositeShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uAspect;
    varying vec2 vUv;
    float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec2 off = c * r2 * 0.012;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      col = mix(col, col * col * (3.0 - 2.0 * col), 0.35);
      col *= 1.0 - r2 * 0.75;
      col += (h(vUv * 1000.0 + fract(uTime) * 91.0) - 0.5) * 0.03;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

const ONE = new THREE.Vector3(1, 1, 1);

export function createEngine(canvas) {
  const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = mobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;

  const baseRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.5);
  let scale = mobile ? 0.7 : 1.0;
  const samples = mobile ? 0 : 4;
  const rtOpts = { type: THREE.HalfFloatType, samples, colorSpace: THREE.LinearSRGBColorSpace };
  const rtA = new THREE.WebGLRenderTarget(1, 1, rtOpts);
  const rtB = new THREE.WebGLRenderTarget(1, 1, rtOpts);

  const composer = new EffectComposer(renderer);
  const composite = new ShaderPass({ ...CompositeShader, defines: { RAY_STEPS: mobile ? 14 : 36 } });
  composite.uniforms.tA.value = rtA.texture;
  composite.uniforms.tB.value = rtB.texture;
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.45, 1.1);
  const output = new OutputPass();
  const finish = new ShaderPass(FinishShader);
  composer.addPass(composite);
  composer.addPass(bloom);
  composer.addPass(output);
  composer.addPass(finish);

  let lastSize = '';
  function resize(force = false) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const pr = baseRatio * scale;
    const key = `${w}x${h}@${pr}`;
    if (!force && key === lastSize) return;
    lastSize = key;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    rtA.setSize(Math.floor(w * pr), Math.floor(h * pr));
    rtB.setSize(Math.floor(w * pr), Math.floor(h * pr));
    bloom.resolution.set(w * 0.5, h * 0.5);
    for (const world of worlds) if (world) { world.camera.aspect = w / h; world.camera.updateProjectionMatrix(); }
    composite.uniforms.uAspect.value = w / h;
    finish.uniforms.uAspect.value = w / h;
  }

  const worlds = [];
  let frameTimes = [];
  function adapt(dt) {
    // ignore throttled frames from hidden tabs; they say nothing about the GPU
    if (dt > 100 || document.hidden) { frameTimes = []; return; }
    frameTimes.push(dt);
    if (frameTimes.length < 45) return;
    const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    frameTimes = [];
    if (avg > 26 && scale > 0.45) { scale *= 0.85; resize(true); }
    else if (avg < 13 && scale < (mobile ? 0.8 : 1.0)) { scale = Math.min(mobile ? 0.8 : 1.0, scale * 1.08); resize(true); }
  }

  const tmp = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  function sunScreen(world) {
    const cam = world.camera;
    tmp.copy(world.sunDir).multiplyScalar(5000).add(cam.position).project(cam);
    cam.getWorldDirection(fwd);
    const facing = fwd.dot(world.sunDir);
    const inView = facing > 0 ? 1 : 0;
    const edge = Math.max(0, 1 - Math.max(Math.abs(tmp.x), Math.abs(tmp.y)) * 0.6);
    return new THREE.Vector3(tmp.x * 0.5 + 0.5, tmp.y * 0.5 + 0.5, inView * edge);
  }

  const ease = (x) => x * x * (3 - 2 * x);

  // On tall screens, open the vertical field of view so the horizontal view
  // does not collapse to a sliver of the scene.
  function fitFov(fov, aspect) {
    if (aspect >= 1) return fov;
    const t = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * Math.min(1.75, 0.95 / aspect);
    return Math.min(70, THREE.MathUtils.radToDeg(2 * Math.atan(t)));
  }

  // Places a world's camera for local progress f in 0..1 (zoom applied past 0.5).
  function poseWorld(world, f, t, mouse, entering = 0) {
    const cam = world.camera;
    world.pose(Math.min(f, 0.5) * 2, t, mouse, cam);
    const tr = f > 0.5 ? ease((f - 0.5) * 2) : 0;
    const fov = fitFov(world.fov, cam.aspect);
    if (tr > 0) {
      tmp.copy(world.focal).sub(cam.position);
      cam.position.addScaledVector(tmp, tr * 0.72);
      cam.fov = fov * (1 - tr * 0.45);
      cam.lookAt(world.focal);
    } else {
      cam.fov = fov;
    }
    if (entering > 0) {
      cam.getWorldDirection(fwd);
      cam.position.addScaledVector(fwd, -entering * world.enterPush);
      cam.fov = Math.min(80, fov * (1 + entering * 0.15));
    }
    cam.updateProjectionMatrix();
    return tr;
  }

  function focalScreen(world) {
    tmp.copy(world.focal).project(world.camera);
    return new THREE.Vector2(THREE.MathUtils.clamp(tmp.x * 0.5 + 0.5, 0.1, 0.9), THREE.MathUtils.clamp(tmp.y * 0.5 + 0.5, 0.1, 0.9));
  }

  function renderWorld(world, target, t, dt, ctx) {
    world.update(t, dt, ctx);
    world.scene.traverseVisible((o) => { if (o.userData.update) o.userData.update(t, dt); });
    renderer.setRenderTarget(target);
    renderer.render(world.scene, world.camera);
  }

  let active = { a: 0, b: -1 };
  function render(state, dt) {
    adapt(dt * 1000);
    const t = state.time;
    const w = Math.min(4, Math.max(0, state.world));
    const id = Math.floor(w);
    const f = w - id;
    const A = worlds[id];
    if (!A) return;
    const tr = poseWorld(A, id < 4 ? f : Math.min(f, 0.5), t, state.mouse);
    const ctx = { night: state.night, draw: state.draw, local: f };
    renderWorld(A, rtA, t, dt, ctx);
    const U = composite.uniforms;
    U.uSunA.value.copy(sunScreen(A));
    U.uExpA.value = A.exposure;
    U.uRaysA.value = A.rays ?? 1;
    U.uTintA.value.copy(A.tint || ONE);
    U.uMix.value = 0;
    U.uSoft.value = 0;
    active = { a: id, b: -1 };

    const moon = worlds[5];
    if (state.secret > 0.001 && moon) {
      poseWorld(moon, 0.25 + Math.sin(t * 0.05) * 0.1, t, state.mouse);
      renderWorld(moon, rtB, t, dt, ctx);
      U.uSunB.value.copy(sunScreen(moon));
      U.uExpB.value = moon.exposure;
      U.uRaysB.value = moon.rays ?? 1;
      U.uTintB.value.copy(moon.tint || ONE);
      U.uMix.value = state.secret;
      U.uSoft.value = 1;
      active.b = 5;
    } else if (tr > 0.001 && worlds[id + 1]) {
      const B = worlds[id + 1];
      poseWorld(B, 0, t, state.mouse, 1 - tr);
      renderWorld(B, rtB, t, dt, ctx);
      U.uSunB.value.copy(sunScreen(B));
      U.uExpB.value = B.exposure;
      U.uRaysB.value = B.rays ?? 1;
      U.uTintB.value.copy(B.tint || ONE);
      U.uMix.value = tr;
      U.uFocal.value.copy(focalScreen(A));
      active.b = id + 1;
    }
    U.uTime.value = t;
    U.uNight.value = state.night;
    U.uSlash.value = state.slash;
    finish.uniforms.uTime.value = t;
    renderer.setRenderTarget(null);
    composer.render(dt);
  }

  // Screen position of a world-space point in a world's current camera.
  function project(index, v) {
    const world = worlds[index];
    if (!world) return null;
    tmp.copy(v).project(world.camera);
    if (tmp.z > 1) return null;
    return { x: (tmp.x * 0.5 + 0.5) * canvas.clientWidth, y: (-tmp.y * 0.5 + 0.5) * canvas.clientHeight };
  }

  const ray = new THREE.Raycaster();
  function pick(x, y) {
    const world = worlds[active.b === 5 ? 5 : active.a];
    if (!world || !world.pickables) return null;
    ray.setFromCamera(new THREE.Vector2((x / canvas.clientWidth) * 2 - 1, -(y / canvas.clientHeight) * 2 + 1), world.camera);
    const hits = ray.intersectObjects(world.pickables, true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && !o.userData.pick) o = o.parent;
    return o ? { name: o.userData.pick, point: hits[0].point, world: active.a } : null;
  }

  function add(index, world) {
    if (mobile) world.scene.traverse((o) => { if (o.isLight && o.shadow) o.shadow.mapSize.set(1024, 1024); });
    world.camera.aspect = canvas.clientWidth / canvas.clientHeight;
    world.camera.updateProjectionMatrix();
    worlds[index] = world;
    // compile up front so the first transition does not hitch
    renderer.compile(world.scene, world.camera);
  }

  window.addEventListener('resize', () => resize());
  resize(true);
  let lost = false;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; document.body.classList.add('no-gl'); });
  return { renderer, render: (s, dt) => { if (!lost) render(s, dt); }, project, pick, add, worlds, mobile };
}
