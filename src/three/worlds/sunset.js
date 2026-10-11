import * as THREE from 'three';
import { baseWorld } from './base.js';
import { makeTerrain, makeNoise, fbm, ridged, seeded, sunVector, smoothstep } from '../util.js';
import { setupSky, leafyTree, cloudPuffs, cloudSea, drifters, grassField, sunDisc } from '../parts.js';

// A lone samurai on a ridge of tall grass, facing a sun sinking into a sea of cloud.
function buildSamurai() {
  const g = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: 0x1a1c24, roughness: 0.95 });
  const cloth2 = new THREE.MeshStandardMaterial({ color: 0x2a1a1c, roughness: 0.9 });
  const straw = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x8a5a40, roughness: 0.8 });
  const lacquer = new THREE.MeshStandardMaterial({ color: 0x120c0a, roughness: 0.3, metalness: 0.3 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xd8dde4, roughness: 0.15, metalness: 1, emissive: 0x222222 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const hakama = new THREE.LatheGeometry([new THREE.Vector2(0.0, 0), new THREE.Vector2(0.42, 0), new THREE.Vector2(0.36, 0.4), new THREE.Vector2(0.26, 0.85), new THREE.Vector2(0.22, 0.95), new THREE.Vector2(0, 0.96)], 20);
  add(hakama, cloth, 0, 0, 0);
  add(new THREE.CylinderGeometry(0.2, 0.23, 0.55, 14), cloth2, 0, 1.2, 0);
  add(new THREE.CylinderGeometry(0.235, 0.235, 0.12, 14), new THREE.MeshStandardMaterial({ color: 0x5a1a14, roughness: 0.8 }), 0, 0.98, 0);
  add(new THREE.SphereGeometry(0.26, 14, 10), cloth2, 0, 1.42, 0).scale.set(1.3, 0.55, 0.9);
  const armL = add(new THREE.CylinderGeometry(0.07, 0.1, 0.62, 8), cloth2, 0.27, 1.17, 0.1, 0.5, 0, 0.35);
  add(new THREE.CylinderGeometry(0.075, 0.1, 0.62, 8), cloth2, -0.27, 1.17, 0.1, 0.4, 0, -0.35);
  add(new THREE.SphereGeometry(0.11, 12, 10), skin, 0, 1.62, 0);
  add(new THREE.ConeGeometry(0.46, 0.2, 28), straw, 0, 1.78, 0);
  // the sheathed sword at the left hip
  const saya = add(new THREE.CylinderGeometry(0.025, 0.03, 1.0, 6), lacquer, 0.2, 0.95, -0.12, 1.2, 0, 0.25);
  add(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12), lacquer, 0.14, 1.03, 0.24, 1.2, 0, 0.25);
  // the drawn blade, hidden until the draw
  const bladePivot = new THREE.Group();
  bladePivot.position.set(0.18, 1.05, 0.25);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.95, 0.045), steel);
  blade.position.y = 0.55;
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.25, 6), lacquer);
  bladePivot.add(blade, hilt);
  bladePivot.visible = false;
  g.add(bladePivot);
  // a cloth tail that streams in the wind
  const scarfGeo = new THREE.PlaneGeometry(1.4, 0.12, 24, 1);
  scarfGeo.translate(0.7, 0, 0);
  const scarf = new THREE.Mesh(scarfGeo, new THREE.MeshStandardMaterial({ color: 0x9a1c18, roughness: 0.8, side: THREE.DoubleSide }));
  scarf.position.set(0, 1.5, -0.12);
  scarf.rotation.y = Math.PI * 0.85;
  g.add(scarf);
  const base = scarfGeo.attributes.position.array.slice();
  g.userData = { bladePivot, saya, armL, scarf, base };
  return g;
}

export function createSunset(renderer, { mobile }) {
  const sunDir = sunVector(3.2, 182);
  const W = baseWorld({
    fov: 42,
    from: new THREE.Vector3(-3, 5.4, 26), to: new THREE.Vector3(2, 5.8, 10),
    lookFrom: new THREE.Vector3(4, 7.5, -60), lookTo: new THREE.Vector3(6, 7.8, -60),
    focal: new THREE.Vector3(0, 30, -900),
    sunDir, exposure: 0.6, enterPush: 14, sway: 0.6,
    portraitLook: new THREE.Vector3(5, 5, -40), portraitShift: new THREE.Vector3(3, 0.4, -10),
  });
  const { scene } = W;
  setupSky(scene, renderer, { sun: sunDir, turbidity: 10, rayleigh: 3.2, mie: 0.012, mieG: 0.96, sunColor: 0xff8a50, sunIntensity: 3.2, fog: 0xa85a52, fogDensity: 0.00055, shadowBox: 60, shadowAt: new THREE.Vector3(6, 4, -20), hemi: 0.28 });
  scene.add(sunDisc(sunDir, { size: 520, color: 0xffc080, intensity: 3.2 }));
  W.rays = 0.3;
  W.tint = new THREE.Vector3(1.08, 0.94, 0.92);

  const n = makeNoise(42);
  const heightFn = (x, z) => {
    let h = 4 * Math.sin(x * 0.02 + 0.6) + 6 * smoothstep(-40, 60, x) * smoothstep(40, -60, z) + fbm(n, x * 0.02, z * 0.02, 3) * 2;
    const far = Math.max(0, -z - 140);
    h -= smoothstep(0, 260, far) * 70;
    h += Math.pow(smoothstep(500, 2600, far), 0.8) * (200 + 240 * ridged(n, x * 0.0012, z * 0.0012, 5)) * (0.25 + 0.75 * smoothstep(200, 1400, Math.abs(x)));
    return h;
  };
  scene.add(makeTerrain({
    width: 5200, depth: 5200, segX: mobile ? 200 : 360, segZ: mobile ? 200 : 360, center: [0, -2400], heightFn,
    colorFn: (x, y, z, slope, c) => {
      const m = fbm(n, x * 0.03, z * 0.03, 3);
      if (z > -200) c.setRGB(0.24 + m * 0.08, 0.2 + m * 0.06, 0.08);
      else c.setRGB(0.09, 0.07, 0.11);
    },
  }));
  scene.add(cloudSea({ y: -55, size: 6000, layers: 5, gap: 6, color: 0xffb08a, shade: 0x7a4a5a, density: 0.95 }));

  const samuraiAt = new THREE.Vector3(7, 0, -22);
  samuraiAt.y = heightFn(samuraiAt.x, samuraiAt.z) - 0.05;
  scene.add(grassField({
    count: mobile ? 34000 : 90000, area: mobile ? [56, 56] : [150, 130], center: mobile ? [5, -20] : [4, -20], heightFn,
    base: 0x1c2008, tip: 0xc89848, sunDir, sunColor: 0xff9050, bladeH: [0.7, 1.5],
    fogColor: 0xa85a52, fogDensity: 0.00055,
    avoid: (x, z) => Math.hypot(x - samuraiAt.x, z - samuraiAt.z) < 1.2 || (z > 16 && Math.abs(x) < 8) || (mobile && z > -1.5 && Math.abs(x - 4) < 3),
  }));

  const samurai = buildSamurai();
  samurai.position.copy(samuraiAt);
  samurai.scale.setScalar(1.4);
  samurai.rotation.y = Math.PI + 0.35;
  scene.add(samurai);
  W.targets.samurai = samuraiAt.clone().add(new THREE.Vector3(0, 1.1, 0));
  W.targets.samuraiTop = samuraiAt.clone().add(new THREE.Vector3(0, 2.6, 0));

  const tree = leafyTree({ height: 12, spread: 7, leaf: 'maple', colors: [0xb8281a, 0xf08a2a], cards: mobile ? 220 : 420, cardSize: 2.4, seed: 77, lean: 0.8 });
  tree.position.set(-24, heightFn(-24, -48) - 0.4, -48);
  scene.add(tree);

  const r = seeded(4);
  const far = [];
  for (let i = 0; i < 30; i++) far.push([r(-2000, 2000), r(60, 220), r(-3000, -900)]);
  scene.add(cloudPuffs(far, { size: [300, 700], color: 0xffb890, shade: 0x6a3a50, opacity: 0.6, seed: 12 }));
  scene.add(drifters({ count: mobile ? 260 : 700, box: [90, 24, 90], center: [0, 0, -20], color: 0xe8502a, color2: 0xffd0b8, size: 1.6, fall: 0.5, wind: [6, -1.5] }));

  W.update = (t, dt, ctx) => {
    const u = samurai.userData;
    const d = ctx.draw || 0;
    u.bladePivot.visible = d > 0.05;
    u.bladePivot.rotation.set(-Math.PI * 0.15 - d * 1.9, 0, -0.3 + d * 0.3);
    u.armL.rotation.x = 0.5 - d * 1.6;
    const p = u.scarf.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = u.base[i * 3];
      p.setZ(i, Math.sin(t * 6 - x * 4) * 0.08 * x + Math.sin(t * 2.3 + x) * 0.05 * x);
      p.setY(i, u.base[i * 3 + 1] + Math.sin(t * 4 - x * 3) * 0.05 * x);
    }
    p.needsUpdate = true;
    samurai.scale.y = 1.4 * (1 + Math.sin(t * 1.1) * 0.004);
  };
  return W;
}
