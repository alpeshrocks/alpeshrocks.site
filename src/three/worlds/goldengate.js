import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { baseWorld } from './base.js';
import { makeTerrain, makeNoise, fbm, ridged, smoothstep, seeded, sunVector, waterNormals, addDetail } from '../util.js';
import { setupSky, cloudPuffs, drifters } from '../parts.js';

// The Golden Gate at golden hour, seen from the Marin headlands, with the
// marine layer rolling in under the deck and the city glowing behind it.
// Real proportions: 1280 m main span, towers 227 m above the water, deck at 67 m.
const SPAN = 1280, SIDE = 343, TOWER_H = 227, DECK_Y = 67, HALF_W = 13.5;
const NORTH = SPAN / 2, SOUTH = -SPAN / 2;

function cableY(z) {
  // parabola between tower tops, sagging to just above the deck at midspan
  if (Math.abs(z) <= SPAN / 2) {
    const t = z / (SPAN / 2);
    return DECK_Y + 4 + (TOWER_H - DECK_Y - 6) * t * t;
  }
  // side spans fall toward the anchorages
  const d = Math.abs(z) - SPAN / 2;
  const t = d / SIDE;
  return TOWER_H - 2 - (TOWER_H - DECK_Y - 20) * (t * 0.85 + 0.15 * t * t);
}

function buildTower(orange) {
  const g = new THREE.Group();
  const add = (geo, x, y, z) => {
    const m = new THREE.Mesh(geo, orange);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  // each leg steps in as it rises, like the real cellular steel towers
  const steps = [[0, 60, 10, 16], [60, 120, 9, 14], [120, 175, 8, 12.5], [175, 227, 7, 11]];
  for (const sx of [-HALF_W - 4, HALF_W + 4]) {
    for (const [y0, y1, w, d] of steps) {
      add(new THREE.BoxGeometry(w, y1 - y0, d), sx, (y0 + y1) / 2, 0);
      // recessed fluting on the faces reads as the art-deco ribs
      add(new THREE.BoxGeometry(w * 0.3, y1 - y0 - 2, d + 0.6), sx, (y0 + y1) / 2, 0);
    }
  }
  // portal struts above the deck, with the stepped deco panels
  for (const y of [100, 150, 195, 222]) {
    const h = y === 222 ? 10 : 12;
    add(new THREE.BoxGeometry(HALF_W * 2 + 8, h, 6), 0, y, 0);
    for (let i = -2; i <= 2; i++) add(new THREE.BoxGeometry(2.2, h * 0.7, 6.8), i * 6, y, 0);
  }
  // pier at the waterline
  const pier = new THREE.Mesh(new THREE.BoxGeometry(HALF_W * 2 + 30, 14, 40), addDetail(new THREE.MeshStandardMaterial({ color: 0x8c8478, roughness: 1 }), { scale: 0.5, strength: 0.4 }));
  pier.position.y = 3;
  g.add(pier);
  return g;
}

export function createGoldenGate(renderer, { mobile }) {
  // ---------------- land: Marin headlands to the north, San Francisco to the south
  const n = makeNoise(17);
  const heightFn = (x, z) => {
    const marin = smoothstep(NORTH + 150, NORTH + 420, z) * (1 - smoothstep(1400, 2600, Math.abs(x - 300)));
    const sf = smoothstep(SOUTH - 160, SOUTH - 420, z) * smoothstep(-900, -200, x);
    const coast = Math.max(marin, sf);
    let h = -12 + coast * 20;
    h += marin * (50 + 25 * fbm(n, x * 0.006, z * 0.006, 3) + smoothstep(1200, 2400, z + Math.abs(x) * 0.35) * (140 + 170 * ridged(n, x * 0.0016, z * 0.0016, 4)));
    h += sf * (40 + 45 * fbm(n, x * 0.002, z * 0.002, 4));
    return h;
  };
  const sunDir = sunVector(3.6, 288);
  const above = (v, clear) => { v.y = Math.max(v.y, heightFn(v.x, v.z) + clear); return v; };
  const W = baseWorld({
    fov: 46,
    from: above(new THREE.Vector3(-330, 150, 1320), 70), to: above(new THREE.Vector3(-250, 125, 1120), 55),
    lookFrom: new THREE.Vector3(60, 120, 180), lookTo: new THREE.Vector3(90, 110, 80),
    focal: new THREE.Vector3(0, TOWER_H - 30, NORTH),
    sunDir, exposure: 0.8, enterPush: 90, sway: 4,
  });
  W.tint = new THREE.Vector3(1.14, 0.98, 0.86);
  W.rays = 0.4;
  const { scene } = W;
  setupSky(scene, renderer, { sun: sunDir, turbidity: 6, rayleigh: 3.2, mie: 0.007, mieG: 0.9, sunColor: 0xffb878, sunIntensity: 5.2, fog: 0xc8a898, fogDensity: 0.00028, shadowBox: 900, shadowAt: new THREE.Vector3(0, 80, 300), hemi: 0.3 });
  const light = scene.children.find((o) => o.isDirectionalLight);
  light.position.copy(sunDir).multiplyScalar(2000).add(new THREE.Vector3(0, 80, 300));
  light.shadow.camera.far = 4000;
  light.shadow.bias = -0.0006;

  scene.add(makeTerrain({
    width: 7000, depth: 7000, segX: mobile ? 220 : 400, segZ: mobile ? 220 : 400, center: [0, 0], heightFn,
    colorFn: (x, y, z, slope, c) => {
      const m = fbm(n, x * 0.01, z * 0.01, 3);
      if (y < 2) { c.setRGB(0.42, 0.36, 0.28); return; }
      if (z > 0) {
        // golden summer grass with dark coastal scrub in the folds
        c.setRGB(0.62 + m * 0.12, 0.48 + m * 0.08, 0.24);
        const scrub = smoothstep(0.05, 0.35, fbm(n, x * 0.012 + 5, z * 0.012, 3)) * (0.4 + slope);
        c.lerp(new THREE.Color(0.14, 0.2, 0.1), Math.min(1, scrub));
        if (slope > 0.55) c.lerp(new THREE.Color(0.38, 0.3, 0.24), 0.6);
      } else {
        c.setRGB(0.34 + m * 0.08, 0.36 + m * 0.06, 0.26);
      }
    },
  }));

  // ---------------- the bay
  const water = new Water(new THREE.PlaneGeometry(12000, 12000), {
    textureWidth: mobile ? 256 : 512, textureHeight: mobile ? 256 : 512,
    waterNormals: waterNormals(), sunDirection: sunDir.clone(), sunColor: 0xffd8b0,
    waterColor: 0x0c2630, distortionScale: 3.2, fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.material.uniforms.size.value = 0.8;
  scene.add(water);

  // ---------------- the bridge
  const orange = addDetail(new THREE.MeshStandardMaterial({ color: 0xc0362c, roughness: 0.55, metalness: 0.15 }), { scale: 0.6, strength: 0.18 });
  const north = buildTower(orange);
  north.position.z = NORTH;
  const south = buildTower(orange);
  south.position.z = SOUTH;
  scene.add(north, south);

  const total = SPAN + SIDE * 2 + 200;
  const deck = new THREE.Group();
  const roadway = new THREE.Mesh(new THREE.BoxGeometry(HALF_W * 2, 1.2, total), new THREE.MeshStandardMaterial({ color: 0x3a3634, roughness: 0.9 }));
  roadway.position.y = DECK_Y + 0.6;
  deck.add(roadway);
  // stiffening truss along both edges, drawn as an orange lattice
  for (const sx of [-HALF_W, HALF_W]) {
    const chordTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, total), orange);
    chordTop.position.set(sx, DECK_Y, 0);
    const chordBot = chordTop.clone();
    chordBot.position.y = DECK_Y - 7.6;
    deck.add(chordTop, chordBot);
  }
  const bays = Math.floor(total / 7.6);
  const diag = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 10.6, 0.5), orange, bays * 2);
  const post = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 7.6, 0.6), orange, bays * 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  let di = 0;
  for (let i = 0; i < bays; i++) {
    const z = -total / 2 + i * 7.6;
    for (const sx of [-HALF_W, HALF_W]) {
      e.set((i % 2 ? 1 : -1) * 0.785, 0, 0);
      q.setFromEuler(e);
      m4.compose(new THREE.Vector3(sx, DECK_Y - 3.8, z + 3.8), q, new THREE.Vector3(1, 1, 1));
      diag.setMatrixAt(di, m4);
      m4.compose(new THREE.Vector3(sx, DECK_Y - 3.8, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      post.setMatrixAt(di, m4);
      di++;
    }
  }
  diag.castShadow = post.castShadow = true;
  deck.add(diag, post);
  const under = new THREE.Mesh(new THREE.BoxGeometry(HALF_W * 2, 0.6, total), new THREE.MeshStandardMaterial({ color: 0x5a2018, roughness: 0.8 }));
  under.position.y = DECK_Y - 7.6;
  deck.add(under);
  scene.add(deck);

  // main cables and suspenders
  const end = NORTH + SIDE;
  const cablePts = [];
  for (let i = 0; i <= 160; i++) {
    const z = -end + (i / 160) * end * 2;
    cablePts.push(z);
  }
  const suspenders = [];
  for (const sx of [-HALF_W - 2, HALF_W + 2]) {
    const curve = new THREE.CatmullRomCurve3(cablePts.map((z) => new THREE.Vector3(sx, cableY(z), z)));
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 320, 1.1, 8), orange);
    cable.castShadow = true;
    scene.add(cable);
    for (let z = -end + 15; z < end; z += 15.2) {
      if (Math.abs(Math.abs(z) - NORTH) < 8) continue;
      suspenders.push(sx, cableY(z), z, sx, DECK_Y, z);
    }
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(suspenders, 3));
  scene.add(new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0xa83024, transparent: true, opacity: 0.85 })));

  // anchorage blocks where the cables come to ground
  for (const z of [end + 30, -end - 30]) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(60, 70, 60), addDetail(new THREE.MeshStandardMaterial({ color: 0x8a8276, roughness: 1 }), { scale: 0.3, strength: 0.4 }));
    a.position.set(0, 30, z);
    a.castShadow = a.receiveShadow = true;
    scene.add(a);
  }

  // ---------------- the city across the water
  const r = seeded(33);
  const glass = addDetail(new THREE.MeshStandardMaterial({ color: 0xd8c8b4, roughness: 0.35, metalness: 0.4 }), { scale: 0.15, strength: 0.5 });
  const towers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), glass, 420);
  for (let i = 0; i < 420; i++) {
    const cx = 1500 + r(-500, 500), cz = -2100 + r(-450, 450);
    const core = Math.exp(-((cx - 1500) ** 2 + (cz + 2100) ** 2) / 160000);
    const hgt = 15 + r(0, 40) + core * r(40, 180);
    const w = r(18, 40);
    m4.compose(new THREE.Vector3(cx, heightFn(cx, cz) + hgt / 2 - 2, cz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r(-0.2, 0.2)), new THREE.Vector3(w, hgt, w * r(0.8, 1.3)));
    towers.setMatrixAt(i, m4);
  }
  towers.castShadow = true;
  scene.add(towers);
  const pyramid = new THREE.Mesh(new THREE.ConeGeometry(22, 260, 4), glass);
  pyramid.position.set(1470, heightFn(1470, -2080) + 130, -2080);
  pyramid.rotation.y = Math.PI / 4;
  const spire = new THREE.Mesh(new THREE.CapsuleGeometry(26, 300, 6, 16), glass);
  spire.position.set(1600, heightFn(1600, -2200) + 170, -2200);
  spire.scale.z = 0.8;
  scene.add(pyramid, spire);
  const homes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), addDetail(new THREE.MeshStandardMaterial({ color: 0xe8dccb, roughness: 0.9 }), { scale: 0.2, strength: 0.4 }), 1400);
  let hi = 0;
  for (let i = 0; i < 4000 && hi < 1400; i++) {
    const x = r(-400, 2200), z = r(-3200, -900);
    const h = heightFn(x, z);
    if (h < 6) continue;
    m4.compose(new THREE.Vector3(x, h + 4, z), new THREE.Quaternion(), new THREE.Vector3(r(10, 20), r(8, 14), r(10, 20)));
    homes.setMatrixAt(hi++, m4);
  }
  homes.count = hi;
  scene.add(homes);

  // Alcatraz, small and pale out in the bay
  const alca = new THREE.Mesh(new THREE.CylinderGeometry(60, 90, 30, 10), new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 1 }));
  alca.position.set(2300, 0, -900);
  scene.add(alca);

  // ---------------- the marine layer rolling in from the ocean
  const fog = [];
  for (let i = 0; i < (mobile ? 50 : 110); i++) {
    const z = r(-900, 900);
    const x = r(-2600, 300) - Math.abs(z) * 0.2;
    fog.push([x, r(8, 55), z]);
  }
  const fogBank = cloudPuffs(fog, { size: [140, 320], color: 0xfff2e8, shade: 0xa8a0a8, opacity: 0.75, seed: 21 });
  scene.add(fogBank);
  const ocean = [];
  for (let i = 0; i < 40; i++) ocean.push([r(-5000, -2200), r(20, 140), r(-3000, 3000)]);
  scene.add(cloudPuffs(ocean, { size: [500, 900], color: 0xffe6d6, shade: 0x9a90a0, opacity: 0.8, seed: 22 }));
  scene.add(drifters({ count: mobile ? 120 : 300, box: [600, 200, 600], center: [-250, 60, 1100], color: 0xffffff, color2: 0xfff0e0, size: 1.2, fall: 0.2, wind: [3, 0], kind: 'dust' }));

  // a sailboat crossing under the bridge
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 14), new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.5 }));
  hull.position.y = 1;
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0);
  sailShape.lineTo(0, 18);
  sailShape.lineTo(7, 0);
  sailShape.lineTo(0, 0);
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailShape), new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.7, side: THREE.DoubleSide, emissive: 0x332a20 }));
  sail.rotation.y = Math.PI / 2;
  sail.position.set(0, 2, -3);
  boat.add(hull, sail);
  boat.scale.setScalar(1.6);
  scene.add(boat);
  W.targets.sail = new THREE.Vector3();

  W.update = (t) => {
    water.material.uniforms.time.value = t * 0.6;
    fogBank.position.x = Math.sin(t * 0.03) * 80;
    const u = ((t * 0.012) % 1);
    boat.position.set(-120 + u * 300, 0, 420 - u * 900);
    boat.rotation.y = Math.atan2(300, -900);
    boat.rotation.z = Math.sin(t * 0.8) * 0.05;
    W.targets.sail.copy(boat.position).add(new THREE.Vector3(0, 14, 0));
  };
  return W;
}
