import * as THREE from 'three';
import { baseWorld } from './base.js';
import { makeNoise, fbm, seeded, sunVector, addDetail, smoothstep } from '../util.js';
import { setupSky, conifers, cloudPuffs, cloudSea, drifters } from '../parts.js';

// Sandstone pillar: displaced cylinder with strata, cracks, and a mossy crown.
function pillarGeometry(seed, { floating = false } = {}) {
  const n = makeNoise(seed);
  const geo = new THREE.CylinderGeometry(1, 1, 1, 40, 90, false);
  geo.translate(0, 0.5, 0);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  const rock = new THREE.Color(0.46, 0.4, 0.33);
  const dark = new THREE.Color(0.18, 0.17, 0.15);
  const moss = new THREE.Color(0.17, 0.24, 0.12);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ang = Math.atan2(z, x);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    let r = Math.hypot(x, z);
    const isCap = r < 0.999 && (y > 0.999 || y < 0.001);
    let profile = floating
      ? Math.pow(Math.max(0, y), 0.6) * (1 + 0.12 * Math.sin(y * 7 + seed))
      : 0.9 + 0.12 * Math.sin(y * 5 + seed) - 0.18 * smoothstep(0.75, 1, y);
    const crack = 0.14 * n(ca * 2 + seed, y * 6) + 0.07 * n(ca * 7, sa * 7 + y * 18) + 0.04 * Math.sin(y * 70 + n(ca * 3, y * 4) * 3);
    const strata = 0.03 * Math.round(Math.sin(y * 34 + seed) * 2) / 2;
    r *= Math.max(0.05, profile * (1 + crack + strata));
    if (isCap && y > 0.5) y = 1 + 0.03 * n(x * 4, z * 4);
    x = ca * r; z = sa * r;
    p.setXYZ(i, x, y, z);
    const shade = 0.5 + 0.5 * n(ca * 3 + 9, y * 10);
    c.copy(rock).lerp(dark, 0.55 - shade * 0.5 + (floating ? 0 : (1 - y) * 0.25));
    const m = smoothstep(0.82, 0.97, y) + smoothstep(0.55, 0.75, n(ca * 5, y * 14)) * 0.5;
    c.lerp(moss, Math.min(1, m) * 0.8);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

// Zhangjiajie: sandstone pillars rising out of a sea of cloud, and mountains that float.
export function createZhangjiajie(renderer, { mobile }) {
  const sunDir = sunVector(24, 125);
  const W = baseWorld({
    fov: 52,
    from: new THREE.Vector3(0, 175, 160), to: new THREE.Vector3(30, 190, -40),
    lookFrom: new THREE.Vector3(-20, 170, -500), lookTo: new THREE.Vector3(-60, 200, -520),
    focal: new THREE.Vector3(-110, 250, -380),
    sunDir, exposure: 0.62, enterPush: 120, sway: 3,
  });
  W.tint = new THREE.Vector3(0.96, 1.02, 1.0);
  W.rays = 0.6;
  const { scene } = W;
  setupSky(scene, renderer, { sun: sunDir, turbidity: 5, rayleigh: 1.4, mie: 0.006, sunColor: 0xfff1d6, sunIntensity: 3, fog: 0x9fb4b4, fogDensity: 0.0007, shadowBox: 500, shadowAt: new THREE.Vector3(0, 100, -400), hemi: 0.55 });
  const light = scene.children.find((o) => o.isDirectionalLight);
  light.position.copy(sunDir).multiplyScalar(1200).add(new THREE.Vector3(0, 100, -400));
  light.shadow.camera.far = 3000;

  const mat = addDetail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), { scale: 0.25, strength: 0.4, streak: 0.25 });
  const variants = [1, 2, 3, 4, 5, 6].map((s) => pillarGeometry(s));
  const r = seeded(14);
  const placements = variants.map(() => []);
  const tops = [];
  for (let i = 0; i < (mobile ? 110 : 190); i++) {
    const x = r(-900, 900), z = r(-1800, 60);
    if (Math.abs(x - 10) < 70 && z > -260) continue;
    if (Math.hypot(x + 110, z + 380) < 70) continue;
    const rad = r(10, 30) * (z < -900 ? 1.4 : 1);
    const h = r(150, 330) + (z < -900 ? 60 : 0);
    placements[i % variants.length].push({ x, z, rad, h, rot: r(0, 6.28) });
    tops.push({ x, z, rad, top: h - 40 });
  }
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  variants.forEach((geo, k) => {
    const list = placements[k];
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((pl, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pl.rot);
      sc.set(pl.rad, pl.h, pl.rad * r(0.8, 1.2));
      ps.set(pl.x, -40, pl.z);
      mtx.compose(ps, q, sc);
      mesh.setMatrixAt(i, mtx);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  // pines crowning the pillars
  const crowns = [];
  for (const t of tops) {
    const count = Math.floor(t.rad * 0.6);
    for (let j = 0; j < count; j++) {
      const a = r(0, 6.28), d = Math.sqrt(r()) * t.rad * 0.7;
      crowns.push([t.x + Math.cos(a) * d, t.top - 2, t.z + Math.sin(a) * d]);
    }
  }
  scene.add(conifers(crowns, { color: 0x284a2c, scale: [6, 14], seed: 5, shadows: !mobile }));

  // floating mountains with vines and falling water
  const floatGeo = pillarGeometry(9, { floating: true });
  const islands = [];
  const vineMat = new THREE.MeshStandardMaterial({ color: 0x2c4a26, roughness: 1 });
  const islandSpecs = [[-110, 250, -380, 34, 95], [190, 285, -640, 46, 120], [-320, 330, -980, 60, 150], [420, 220, -1100, 40, 100]];
  islandSpecs.forEach(([x, y, z, rad, h], i) => {
    const g = new THREE.Group();
    const rockMesh = new THREE.Mesh(floatGeo, mat);
    rockMesh.scale.set(rad, h, rad);
    rockMesh.position.y = -h;
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;
    g.add(rockMesh);
    const trees = [];
    for (let j = 0; j < rad * 0.9; j++) { const a = r(0, 6.28), d = Math.sqrt(r()) * rad * 0.75; trees.push([Math.cos(a) * d, -2, Math.sin(a) * d]); }
    g.add(conifers(trees, { color: 0x2a4c2a, scale: [7, 15], seed: 20 + i }));
    for (let j = 0; j < 22; j++) {
      const a = r(0, 6.28), d = rad * r(0.5, 0.95), len = r(10, 45);
      const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.12, len, 4), vineMat);
      vine.position.set(Math.cos(a) * d, -len / 2 - r(0, 6), Math.sin(a) * d);
      g.add(vine);
    }
    const fallMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.7, 1.8), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(4, 220), fallMat);
    fall.position.set(rad * 0.7, -110, 0);
    fall.rotation.y = Math.PI / 2;
    g.add(fall);
    g.position.set(x, y, z);
    g.userData.baseY = y;
    g.userData.phase = i * 1.7;
    scene.add(g);
    islands.push(g);
  });

  // the sea of cloud below everything
  scene.add(cloudSea({ y: 10, layers: 6, gap: 7, color: 0xe8eeee, shade: 0x7d9096, density: 1.0 }));
  const puffs = [];
  for (let i = 0; i < (mobile ? 40 : 80); i++) puffs.push([r(-900, 900), r(20, 70), r(-1800, -200)]);
  scene.add(cloudPuffs(puffs, { size: [70, 150], color: 0xf2f4f2, shade: 0x8a9a9e, opacity: 0.45, seed: 3 }));
  scene.add(drifters({ count: mobile ? 150 : 350, box: [200, 80, 200], center: [0, 140, 60], color: 0xffffff, color2: 0xe8f4ec, size: 1.4, fall: 0.4, wind: [1.2, 0], kind: 'dust' }));

  // the rider: a long-tailed flyer that circles the floating peak
  const rider = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x1f5a66, roughness: 0.5, metalness: 0.1, emissive: 0x05161a });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 6, 4, 10), skin);
  body.rotation.z = Math.PI / 2;
  rider.add(body);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3, 8), skin);
  head.rotation.z = -Math.PI / 2;
  head.position.x = 5;
  rider.add(head);
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.quadraticCurveTo(4, 9, 1, 16);
  wingShape.quadraticCurveTo(-2, 9, -4, 0);
  wingShape.lineTo(0, 0);
  const wingGeo = new THREE.ShapeGeometry(wingShape);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x2a7480, roughness: 0.6, side: THREE.DoubleSide, emissive: 0x081c20 });
  const wl = new THREE.Mesh(wingGeo, wingMat);
  const wr = new THREE.Mesh(wingGeo, wingMat);
  wl.rotation.x = -Math.PI / 2;
  wr.rotation.x = Math.PI / 2;
  const pivotL = new THREE.Group(); pivotL.add(wl);
  const pivotR = new THREE.Group(); pivotR.add(wr);
  rider.add(pivotL, pivotR);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.6, 12, 6), skin);
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -9;
  rider.add(tail);
  rider.scale.setScalar(1.4);
  rider.userData.pick = 'rider';
  // a generous invisible hit area so the creature is catchable
  const hit = new THREE.Mesh(new THREE.SphereGeometry(16, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  rider.add(hit);
  scene.add(rider);
  W.pickables.push(rider);

  const birds = new THREE.InstancedMesh(new THREE.ConeGeometry(0.6, 2.2, 3), new THREE.MeshBasicMaterial({ color: 0x1c2420 }), 14);
  scene.add(birds);

  const tmp = new THREE.Vector3(), next = new THREE.Vector3();
  const riderPath = (t) => {
    const a = t * 0.16;
    return tmp.set(-110 + Math.cos(a) * 170, 265 + Math.sin(a * 2) * 25, -380 + Math.sin(a) * 120);
  };
  W.update = (t) => {
    islands.forEach((g) => { g.position.y = g.userData.baseY + Math.sin(t * 0.25 + g.userData.phase) * 4; });
    const pnow = riderPath(t).clone();
    riderPath(t + 0.1);
    next.copy(tmp);
    rider.position.copy(pnow);
    rider.lookAt(next);
    rider.rotateY(-Math.PI / 2);
    const flap = Math.sin(t * 4) * 0.6;
    pivotL.rotation.x = flap;
    pivotR.rotation.x = -flap;
    for (let i = 0; i < 14; i++) {
      const a = t * 0.05 + i * 0.012;
      mtx.compose(
        ps.set(200 + Math.cos(a) * 400 + (i % 3) * 6, 320 + Math.sin(t + i) * 2 + (i % 4) * 3, -700 + Math.sin(a) * 300 + i * 5),
        q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, -a + Math.sin(t * 6 + i) * 0.3)),
        sc.set(1, 1, 0.2),
      );
      birds.setMatrixAt(i, mtx);
    }
    birds.instanceMatrix.needsUpdate = true;
  };
  return W;
}
