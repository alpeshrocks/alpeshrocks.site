import * as THREE from 'three';
import { baseWorld } from './base.js';
import { makeTerrain, makeNoise, fbm, ridged, smoothstep, seeded, sunVector } from '../util.js';
import { setupSky, conifers, cloudPuffs, drifters } from '../parts.js';

// Yosemite Valley from near Tunnel View: El Capitan on the left, Bridalveil
// Fall on the right, Half Dome at the far end, morning light.
export function createYosemite(renderer, { mobile }) {
  const sunDir = sunVector(16, 210);
  const W = baseWorld({
    fov: 50,
    from: new THREE.Vector3(60, 170, 420), to: new THREE.Vector3(10, 130, 160),
    lookFrom: new THREE.Vector3(0, 160, -900), lookTo: new THREE.Vector3(30, 150, -1000),
    focal: new THREE.Vector3(80, 380, -1500),
    sunDir, exposure: 0.62, enterPush: 160, sway: 4,
  });
  const { scene } = W;
  setupSky(scene, renderer, { sun: sunDir, turbidity: 2.4, rayleigh: 1.2, mie: 0.004, mieG: 0.85, sunColor: 0xfff0d8, sunIntensity: 3.2, fog: 0xb9c8d8, fogDensity: 0.00042, shadowBox: 900, shadowAt: new THREE.Vector3(0, 0, -600), hemi: 0.25 });
  const light = scene.children.find((o) => o.isDirectionalLight);
  light.shadow.camera.far = 3000;
  light.position.copy(sunDir).multiplyScalar(1500).add(new THREE.Vector3(0, 0, -600));
  light.shadow.bias = -0.0008;

  const n = makeNoise(5);
  const halfWidth = (x, z) => {
    let hw = 250 + 50 * fbm(n, z * 0.002, 3.7, 3);
    if (x < 0) hw -= 110 * Math.exp(-(((z + 380) / 200) ** 2)); // El Capitan juts into the valley
    hw -= 120 * smoothstep(-1100, -1700, z);
    return hw;
  };
  const heightFn = (x, z) => {
    const hw = halfWidth(x, z);
    const d = Math.abs(x) - hw;
    let h = 2 * fbm(n, x * 0.01, z * 0.01, 3);
    if (d > 0) {
      const wallH = x < 0 ? 420 + 160 * Math.exp(-(((z + 380) / 220) ** 2)) : 360 + 60 * fbm(n, z * 0.004, 1.3, 3);
      const rise = Math.pow(smoothstep(0, 70, d), 0.45);
      h += wallH * rise + 90 * ridged(n, x * 0.004, z * 0.004, 4) * smoothstep(40, 260, d);
      h += 14 * fbm(n, x * 0.03, z * 0.03, 3) * rise;
    }
    // Half Dome
    const u = x - 90, v = z + 1520;
    const rr = Math.hypot(u, v * 1.15);
    let dome = 640 * Math.sqrt(Math.max(0, 1 - (rr / 260) ** 2));
    const s = u * 0.82 + v * 0.57;
    dome *= smoothstep(-60, -40, s);
    h = Math.max(h, dome + (dome > 0 ? 6 * fbm(n, x * 0.05, z * 0.05, 2) : 0));
    // far rim
    h += Math.max(0, -z - 1700) * 0.25;
    return h;
  };

  const terrain = makeTerrain({
    width: 3200, depth: 3400, segX: mobile ? 260 : 460, segZ: mobile ? 280 : 480, center: [0, -900], heightFn,
    colorFn: (x, y, z, slope, c) => {
      const m = fbm(n, x * 0.02, z * 0.02 + 7, 3);
      if (slope > 0.42 || y > 60) {
        const streak = smoothstep(0.1, 0.5, fbm(n, x * 0.05, y * 0.004 + z * 0.01, 3));
        const warm = 0.42 + 0.2 * m;
        c.setRGB(warm, warm * 0.95, warm * 0.88);
        c.multiplyScalar(1 - streak * 0.55);
        if (slope < 0.3 && y > 60) c.lerp(new THREE.Color(0.16, 0.22, 0.13), 0.6);
      } else {
        const meadow = smoothstep(0.0, 0.35, fbm(n, x * 0.006, z * 0.006, 3));
        c.setRGB(0.12, 0.19, 0.1);
        c.lerp(new THREE.Color(0.5, 0.46, 0.24), meadow * 0.7);
      }
    },
  });
  scene.add(terrain);

  // forest on the valley floor and the rims
  const r = seeded(9);
  const floor = [], rim = [];
  for (let i = 0; i < (mobile ? 3500 : 9000); i++) {
    const x = r(-700, 700), z = r(-1700, 300);
    const h = heightFn(x, z);
    const d = Math.abs(x) - halfWidth(x, z);
    if (d < -12 && fbm(n, x * 0.006, z * 0.006, 3) < 0.15) floor.push([x, h, z]);
    else if (d > 220 && h > 380 && h < 560 && r() < 0.5) rim.push([x, h, z]);
  }
  scene.add(conifers(floor, { color: 0x29462e, scale: [18, 38], seed: 3, shadows: true }));
  scene.add(conifers(rim, { color: 0x2a4630, scale: [14, 26], seed: 8, shadows: false }));

  // Bridalveil Fall on the right wall
  const fz = -330;
  let fx = 0;
  for (let x = 100; x < 400; x += 1) { if (heightFn(x, fz) > 250) { fx = x - 6; break; } }
  const fallH = heightFn(fx + 25, fz) - 8;
  const fallMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){
        float w = 1.0 - abs(vUv.x - 0.5) * 2.0;
        float spread = mix(0.25, 1.0, 1.0 - vUv.y);
        float core = smoothstep(1.0 - spread, 1.0, w);
        float flow = n(vec2(vUv.x * 30.0, vUv.y * 18.0 + uTime * 2.4)) * 0.6 + n(vec2(vUv.x * 80.0, vUv.y * 40.0 + uTime * 4.0)) * 0.4;
        float a = core * (0.35 + 0.65 * flow) * smoothstep(0.0, 0.15, vUv.y);
        gl_FragColor = vec4(vec3(1.4, 1.45, 1.5) * a, a);
      }`,
  });
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(26, fallH), fallMat);
  fall.position.set(fx, fallH / 2, fz);
  fall.rotation.y = -Math.PI / 2 + 0.25;
  scene.add(fall);
  const spray = [];
  for (let i = 0; i < 10; i++) spray.push([fx + r(-30, 10), r(5, 40), fz + r(-30, 30)]);
  scene.add(cloudPuffs(spray, { size: [30, 60], color: 0xffffff, shade: 0xc8d4dc, opacity: 0.5, seed: 4 }));

  // valley haze and clouds hanging on the walls
  const haze = [];
  for (let i = 0; i < 30; i++) haze.push([r(-400, 400), r(20, 90), r(-1600, -300)]);
  scene.add(cloudPuffs(haze, { size: [140, 260], color: 0xf4f6fa, shade: 0xa8b4c4, opacity: 0.32, seed: 6 }));
  scene.add(drifters({ count: mobile ? 200 : 450, box: [160, 60, 160], center: [0, 50, 160], color: 0xfff4d8, color2: 0xffffff, size: 0.9, fall: 0.3, wind: [0.6, 0.2], kind: 'dust' }));

  // the climber's headlamp on El Capitan
  let lx = -100;
  const lz = -380;
  for (let x = -40; x > -500; x -= 1) { if (heightFn(x, lz) > 220) { lx = x + 2; break; } }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 7.5, 5) }));
  lamp.position.set(lx, 220, lz);
  scene.add(lamp);
  W.targets.lamp = lamp.position.clone();

  W.update = (t) => {
    fallMat.uniforms.uTime.value = t;
    lamp.visible = Math.sin(t * 2.2) > -0.7;
  };
  return W;
}
