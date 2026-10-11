import * as THREE from 'three';
import { baseWorld } from './base.js';
import { makeTerrain, makeNoise, fbm, seeded, sunVector, addDetail, smoothstep } from '../util.js';
import { setupSky, leafyTree, cloudPuffs, drifters, rock } from '../parts.js';

// One arcade bay: a wall panel with an arched opening, extruded for depth.
function bayGeometry(width, height, depth, kind) {
  const s = new THREE.Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(width / 2, height);
  s.lineTo(-width / 2, height);
  s.lineTo(-width / 2, 0);
  const hole = new THREE.Path();
  if (kind === 'arch') {
    const aw = width * 0.31, spring = height * 0.5;
    hole.moveTo(-aw, height * 0.08);
    hole.lineTo(aw, height * 0.08);
    hole.lineTo(aw, spring);
    hole.absarc(0, spring, aw, 0, Math.PI, false);
    hole.lineTo(-aw, height * 0.08);
  } else {
    const ww = width * 0.14;
    hole.moveTo(-ww, height * 0.45);
    hole.lineTo(ww, height * 0.45);
    hole.lineTo(ww, height * 0.68);
    hole.lineTo(-ww, height * 0.68);
    hole.lineTo(-ww, height * 0.45);
  }
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -depth / 2);
  // engaged half-columns on the face between arches
  const parts = [g];
  if (kind === 'arch') {
    const col = new THREE.CylinderGeometry(width * 0.06, width * 0.065, height * 0.92, 12, 1, false, 0, Math.PI);
    col.rotateY(-Math.PI / 2);
    col.translate(-width / 2, height * 0.46, depth / 2);
    parts.push(col);
  }
  const cornice = new THREE.BoxGeometry(width * 1.02, height * 0.06, depth * 1.25);
  cornice.translate(0, height * 0.97, 0);
  parts.push(cornice);
  return parts;
}

export function createRome(renderer, { mobile }) {
  const sunDir = sunVector(6, 212);
  const W = baseWorld({
    fov: 46,
    from: new THREE.Vector3(-48, 7, 70), to: new THREE.Vector3(-22, 10, 18),
    lookFrom: new THREE.Vector3(30, 24, -260), lookTo: new THREE.Vector3(36, 26, -260),
    focal: new THREE.Vector3(10, 18, -178),
    sunDir, exposure: 0.7, enterPush: 40, sway: 1.5,
  });
  W.tint = new THREE.Vector3(1.14, 0.98, 0.8);
  const { scene } = W;
  setupSky(scene, renderer, { sun: sunDir, turbidity: 9, rayleigh: 2.6, mie: 0.008, mieG: 0.9, sunColor: 0xffa860, sunIntensity: 5.5, fog: 0xe0a070, fogDensity: 0.0007, shadowBox: 200, shadowAt: new THREE.Vector3(10, 0, -180), hemi: 0.3 });

  const n = makeNoise(31);
  const heightFn = (x, z) => {
    const far = Math.max(0, Math.hypot(x, z + 200) - 340);
    return fbm(n, x * 0.01, z * 0.01, 3) * 1.2 + Math.pow(smoothstep(0, 900, far), 1.3) * (60 + 50 * fbm(n, x * 0.003, z * 0.003, 3));
  };
  scene.add(makeTerrain({
    width: 3000, depth: 3000, segX: mobile ? 160 : 260, segZ: mobile ? 160 : 260, center: [0, -600], heightFn,
    colorFn: (x, y, z, slope, c) => {
      const m = fbm(n, x * 0.02, z * 0.02 + 3, 3);
      c.setRGB(0.5 + m * 0.1, 0.4 + m * 0.08, 0.22);
      const path = smoothstep(14, 6, Math.abs(x * 0.25 + z * 0.14 + 4));
      c.lerp(new THREE.Color(0.62, 0.52, 0.38), path * 0.8);
      if (y > 20) c.lerp(new THREE.Color(0.25, 0.28, 0.16), 0.6);
    },
  }));

  // ---------------- the Colosseum
  const travertine = addDetail(new THREE.MeshStandardMaterial({ color: 0xd6bf98, roughness: 0.92 }), { scale: 0.45, strength: 0.38, streak: 0.32 });
  const C = new THREE.Vector3(30, 0, -260);
  const A = 94, B = 78, bays = 80, tierH = 11.5, depth = 3.2;
  const perim = 2 * Math.PI * Math.sqrt((A * A + B * B) / 2);
  const bw = perim / bays;
  const archGeo = bayGeometry(bw, tierH, depth, 'arch');
  const atticGeo = bayGeometry(bw, tierH * 1.05, depth, 'attic');
  const instances = { arch: [], attic: [], innerArch: [] };
  const r = seeded(7);
  for (let i = 0; i < bays; i++) {
    const t = (i / bays) * Math.PI * 2;
    const x = C.x + Math.cos(t) * A, z = C.z + Math.sin(t) * B;
    const ang = Math.atan2(Math.sin(t) * A, Math.cos(t) * B);
    // ruin the north-east side: the upper rings have fallen there
    const ruinT = Math.cos(t - (-0.9));
    const keep = ruinT > 0.55 ? Math.max(1, Math.round(3 - (ruinT - 0.55) * 7 + r(-0.6, 0.6))) : 4;
    for (let k = 0; k < Math.min(3, keep); k++) instances.arch.push({ x, z, y: k * tierH, ang });
    if (keep >= 4) instances.attic.push({ x, z, y: 3 * tierH, ang });
  }
  for (let i = 0; i < 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    const x = C.x + Math.cos(t) * (A - 14), z = C.z + Math.sin(t) * (B - 14);
    const ang = Math.atan2(Math.sin(t) * (A - 14), Math.cos(t) * (B - 14));
    for (let k = 0; k < 2; k++) instances.innerArch.push({ x, z, y: k * tierH, ang });
  }
  const build = (parts, list, scale = 1) => {
    parts.forEach((g) => {
      const mesh = new THREE.InstancedMesh(g, travertine, list.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      list.forEach((b, i) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -b.ang + Math.PI / 2);
        m.compose(new THREE.Vector3(b.x, b.y, b.z), q, new THREE.Vector3(scale, 1, 1));
        mesh.setMatrixAt(i, m);
      });
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    });
  };
  build(archGeo, instances.arch);
  build(atticGeo, instances.attic);
  build(bayGeometry((2 * Math.PI * Math.sqrt(((A - 14) ** 2 + (B - 14) ** 2) / 2)) / 64, tierH, depth, 'arch'), instances.innerArch);
  for (let i = 0; i < 26; i++) {
    const rk = rock(r(1.5, 4), i + 40, 0xbfa888);
    const t = r(-1.8, 0.2);
    rk.position.set(C.x + Math.cos(t) * (A + r(4, 18)), 0.5, C.z + Math.sin(t) * (B + r(4, 18)));
    scene.add(rk);
  }

  // ---------------- the Forum: a temple front, broken columns
  const marble = addDetail(new THREE.MeshStandardMaterial({ color: 0xe2d2b4, roughness: 0.8 }), { scale: 0.8, strength: 0.35, streak: 0.3 });
  const colGeo = new THREE.CylinderGeometry(0.85, 0.95, 13, 28, 8);
  const cp = colGeo.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i), z = cp.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 - 0.04 * Math.pow(Math.abs(Math.sin(a * 12)), 0.5);
    cp.setX(i, x * k);
    cp.setZ(i, z * k);
  }
  colGeo.computeVertexNormals();
  const temple = new THREE.Group();
  const podium = new THREE.Mesh(new THREE.BoxGeometry(30, 3, 12), marble);
  podium.position.y = 1.5;
  temple.add(podium);
  for (let i = 0; i < 8; i++) {
    if (i === 6) continue;
    const col = new THREE.Mesh(colGeo, marble);
    col.position.set(-12.5 + i * 3.6, 3 + 6.5, 3);
    temple.add(col);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 2.4), marble);
    cap.position.set(col.position.x, 16.4, 3);
    temple.add(cap);
  }
  const ent = new THREE.Mesh(new THREE.BoxGeometry(22, 3, 2.8), marble);
  ent.position.set(-5.3, 18.3, 3);
  temple.add(ent);
  const frieze = new THREE.Mesh(new THREE.BoxGeometry(22.6, 0.6, 3.2), marble);
  frieze.position.set(-5.3, 20, 3);
  temple.add(frieze);
  temple.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  temple.position.set(-70, 0, -40);
  temple.rotation.y = 0.55;
  scene.add(temple);
  for (let i = 0; i < 9; i++) {
    const h = r(2, 8);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, h, 22), marble);
    const x = r(-60, 20), z = r(-110, 10);
    col.position.set(x, h / 2, z);
    col.castShadow = col.receiveShadow = true;
    scene.add(col);
    if (r() < 0.5) {
      const fallen = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.85, r(4, 7), 22), marble);
      fallen.rotation.z = Math.PI / 2;
      fallen.rotation.y = r(0, 3);
      fallen.position.set(x + r(-6, 6), 0.8, z + r(-6, 6));
      fallen.castShadow = fallen.receiveShadow = true;
      scene.add(fallen);
    }
  }

  // ---------------- stone pines and cypresses
  const pines = [[-20, -120], [80, -150], [-110, -150], [130, -230], [-40, -330], [150, -90]];
  pines.forEach(([x, z], i) => {
    const t = leafyTree({ height: 19, spread: 10, shape: 'umbrella', leaf: 'needle', colors: [0x22381a, 0x3b5424], cards: mobile ? 180 : 360, cardSize: 3.2, seed: 50 + i, lean: 0.5 });
    t.position.set(x, 0, z);
    scene.add(t);
  });
  const cyGeo = new THREE.SphereGeometry(1, 12, 16);
  cyGeo.scale(1, 5, 1);
  const cyp = cyGeo.attributes.position;
  for (let i = 0; i < cyp.count; i++) {
    const y = cyp.getY(i);
    const k = 1 - Math.max(0, y / 5) * 0.55 + n(cyp.getX(i) * 3, y * 2) * 0.08;
    cyp.setX(i, cyp.getX(i) * k);
    cyp.setZ(i, cyp.getZ(i) * k);
  }
  cyGeo.computeVertexNormals();
  cyGeo.translate(0, 5, 0);
  const cyMat = addDetail(new THREE.MeshStandardMaterial({ color: 0x1d2e16, roughness: 1 }), { scale: 2.5, strength: 0.6 });
  const cypress = new THREE.InstancedMesh(cyGeo, cyMat, 22);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 22; i++) {
    const side = i < 11 ? -1 : 1;
    m.compose(new THREE.Vector3(30 + side * (120 + r(0, 40)), 0, -120 - (i % 11) * 24 + r(-4, 4)), new THREE.Quaternion(), new THREE.Vector3(r(1.6, 2.2), r(1.8, 2.6), r(1.6, 2.2)));
    cypress.setMatrixAt(i, m);
  }
  cypress.castShadow = true;
  scene.add(cypress);

  // ---------------- the distant city and a dome on the skyline
  const roofs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), addDetail(new THREE.MeshStandardMaterial({ color: 0xc8845a, roughness: 0.9 }), { scale: 0.2, strength: 0.5 }), 500);
  for (let i = 0; i < 500; i++) {
    const a = r(-2.6, -0.5), d = r(420, 900);
    const x = Math.cos(a) * d, z = -200 + Math.sin(a) * d;
    const h = r(8, 26);
    m.compose(new THREE.Vector3(x, heightFn(x, z) + h / 2 - 2, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r(0, 3)), new THREE.Vector3(r(12, 30), h, r(12, 30)));
    roofs.setMatrixAt(i, m);
  }
  scene.add(roofs);
  const dome = new THREE.Group();
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 22, 32), marble);
  drum.position.y = 60;
  const cupola = new THREE.Mesh(new THREE.SphereGeometry(24, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8c9a9c, roughness: 0.6, metalness: 0.2 }));
  cupola.scale.y = 1.3;
  cupola.position.y = 71;
  const base = new THREE.Mesh(new THREE.BoxGeometry(80, 50, 80), marble);
  base.position.y = 25;
  dome.add(base, drum, cupola);
  dome.position.set(-620, 0, -900);
  scene.add(dome);

  // ---------------- air
  const haze = [];
  for (let i = 0; i < 26; i++) haze.push([r(-900, 900), r(60, 160), r(-1400, -500)]);
  scene.add(cloudPuffs(haze, { size: [200, 420], color: 0xffd7a8, shade: 0xb07a6a, opacity: 0.45, seed: 9 }));
  scene.add(drifters({ count: mobile ? 200 : 500, box: [120, 30, 120], center: [-20, 0, 0], color: 0xffe0a0, color2: 0xfff4d8, size: 0.8, fall: 0.2, wind: [0.5, 0.1], kind: 'dust' }));

  // a coin glinting on the path
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 24), new THREE.MeshStandardMaterial({ color: 0xe0b450, metalness: 1, roughness: 0.25 }));
  coin.position.set(-26, 0.45, 26);
  coin.rotation.z = 0.25;
  scene.add(coin);
  W.targets.coin = coin.position.clone();

  W.update = (t) => { coin.rotation.y = t * 0.6; };
  return W;
}
