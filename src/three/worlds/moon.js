import * as THREE from 'three';
import { baseWorld } from './base.js';
import { seeded, addDetail } from '../util.js';
import { rock, stoneLantern, leafyTree, drifters, sunDisc } from '../parts.js';

// The secret: a karesansui rock garden under a full moon.
export function createMoon(renderer, { mobile }) {
  const moonDir = new THREE.Vector3(-0.35, 0.32, -1).normalize();
  const W = baseWorld({
    fov: 50,
    from: new THREE.Vector3(0, 6, 34), to: new THREE.Vector3(2, 7, 26),
    lookFrom: new THREE.Vector3(0, 4, -40), lookTo: new THREE.Vector3(0, 5, -40),
    focal: new THREE.Vector3(0, 10, -60),
    sunDir: moonDir, exposure: 1.1, enterPush: 10, sway: 0.8,
  });
  W.rays = 0.6;
  const { scene } = W;
  scene.background = new THREE.Color(0x05070f);
  scene.fog = new THREE.FogExp2(0x0a0e1c, 0.012);

  const stars = new THREE.BufferGeometry();
  const r = seeded(3);
  const sp = new Float32Array(3000 * 3);
  for (let i = 0; i < 3000; i++) {
    const v = new THREE.Vector3(r(-1, 1), r(0.02, 1), r(-1, 1)).normalize().multiplyScalar(4000);
    sp.set([v.x, v.y, v.z], i * 3);
  }
  stars.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xc8d4ff, size: 2, sizeAttenuation: false, fog: false })));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(110, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.0), fog: false }));
  moon.position.copy(moonDir).multiplyScalar(3500);
  scene.add(moon);
  scene.add(sunDisc(moonDir, { distance: 3400, size: 1600, color: 0x9ab0ff, intensity: 0.9 }));

  const light = new THREE.DirectionalLight(0xaabbff, 1.4);
  light.position.copy(moonDir).multiplyScalar(100);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, far: 400 });
  scene.add(light, new THREE.HemisphereLight(0x3a4a7a, 0x0a0a12, 0.6));

  // raked gravel
  const sand = new THREE.MeshStandardMaterial({ color: 0x9aa0b4, roughness: 1 });
  const rocks = [[-8, -8, 3.2], [9, -18, 4.5], [-2, -30, 2.4], [14, -4, 1.6], [-16, -24, 2]];
  sand.onBeforeCompile = (sh) => {
    sh.uniforms.uRocks = { value: rocks.map(([x, z, s]) => new THREE.Vector3(x, z, s)) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vW;\nuniform vec3 uRocks[5];')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        float best = 1e5;
        for (int i = 0; i < 5; i++) best = min(best, length(vW.xz - uRocks[i].xy) - uRocks[i].z * 1.2);
        float phase = best < 7.0 ? best : vW.z;
        float ridge = cos(phase * 6.2831 / 0.7);
        vec3 bump = vec3(0.0, 0.0, 0.0);
        vec2 dir = best < 7.0 ? normalize(vW.xz - vec2(0.0)) : vec2(0.0, 1.0);
        normal = normalize(normal + (viewMatrix * vec4(dir.x * ridge * 0.25, 0.0, dir.y * ridge * 0.25, 0.0)).xyz);`);
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 1, 1), sand);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  rocks.forEach(([x, z, s], i) => {
    const rk = rock(s, i + 70, 0x3a3c44);
    rk.position.set(x, s * 0.25, z);
    scene.add(rk);
  });

  // temple hall with lit shoji
  const hall = new THREE.Group();
  const wood = addDetail(new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: 0.9 }), { scale: 1, strength: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(40, 9, 14), wood);
  body.position.y = 5.5;
  const roofG = new THREE.ConeGeometry(30, 9, 4);
  roofG.rotateY(Math.PI / 4);
  roofG.scale(1.25, 1, 0.55);
  const roof = new THREE.Mesh(roofG, new THREE.MeshStandardMaterial({ color: 0x15161c, roughness: 0.6 }));
  roof.position.y = 14;
  hall.add(body, roof);
  for (let i = 0; i < 6; i++) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.9, 0.9) }));
    win.position.set(-15 + i * 6, 5.5, 7.05);
    hall.add(win);
  }
  hall.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  hall.position.set(6, 0, -62);
  scene.add(hall);
  const warm = new THREE.PointLight(0xffa860, 40, 60, 1.6);
  warm.position.set(6, 6, -48);
  scene.add(warm);

  for (const [x, z] of [[-20, 4], [22, 8], [-28, -40]]) {
    const ln = stoneLantern(1.6);
    ln.position.set(x, 0, z);
    ln.userData.glow.visible = true;
    scene.add(ln);
    const pl = new THREE.PointLight(0xffb060, 12, 18, 1.8);
    pl.position.set(x, 3.2, z);
    scene.add(pl);
  }
  const maple = leafyTree({ height: 11, spread: 7, leaf: 'maple', colors: [0x6a1410, 0xa02a14], cards: mobile ? 180 : 320, cardSize: 2.2, seed: 9 });
  maple.position.set(-30, 0, -20);
  scene.add(maple);
  scene.add(drifters({ count: mobile ? 80 : 160, box: [80, 10, 80], center: [0, 0.5, -10], color: 0xffe890, color2: 0xfff4c0, size: 1.2, fall: -0.1, wind: [0.3, 0.2], kind: 'firefly', glow: true }));
  return W;
}
