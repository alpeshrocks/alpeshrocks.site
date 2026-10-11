import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { baseWorld } from './base.js';
import { makeTerrain, makeNoise, fbm, smoothstep, seeded, sunVector, waterNormals, addDetail } from '../util.js';
import { setupSky, leafyTree, conifers, cloudPuffs, drifters, rock, stoneLantern } from '../parts.js';

// Kyoto: a tea garden pond at dawn in autumn, a torii in the water, a pagoda on the hill.
export function createKyoto(renderer, { mobile, onFed }) {
  const sunDir = sunVector(7, 168);
  const W = baseWorld({
    fov: 48,
    from: new THREE.Vector3(-6, 3.2, 16), to: new THREE.Vector3(4, 4.6, -4),
    lookFrom: new THREE.Vector3(6, 7, -120), lookTo: new THREE.Vector3(12, 9, -130),
    focal: new THREE.Vector3(12, 10, -78),
    sunDir, exposure: 0.78, enterPush: 22,
  });
  W.tint = new THREE.Vector3(1.04, 0.99, 0.96);
  const { scene } = W;
  setupSky(scene, renderer, { sun: sunDir, turbidity: 3.5, rayleigh: 1.6, mie: 0.005, sunColor: 0xffd2a8, sunIntensity: 3, fog: 0xe0b49a, fogDensity: 0.0011, shadowBox: 130, shadowAt: new THREE.Vector3(0, 0, -70), hemi: 0.35 });

  // ---------------- terrain: pond basin, mossy garden, autumn hills
  const n = makeNoise(11);
  const PZ = -58, PRX = 92, PRZ = 64;
  const pond = (x, z) => Math.hypot(x / PRX, (z - PZ) / PRZ);
  const heightFn = (x, z) => {
    const pd = pond(x, z);
    let h = smoothstep(0.92, 1.25, pd) * 2.2 - 1.8 + fbm(n, x * 0.02, z * 0.02, 3) * 1.2 * smoothstep(1.0, 1.5, pd);
    const far = Math.max(0, -z - 160) + Math.max(0, Math.abs(x) - 260) * 0.6;
    h += Math.pow(smoothstep(0, 520, far), 1.4) * (150 + 90 * fbm(n, x * 0.003, z * 0.003, 4)) + fbm(n, x * 0.01, z * 0.01, 4) * 14 * smoothstep(60, 300, far);
    return h;
  };
  const leaf = new THREE.Color();
  const terrain = makeTerrain({
    width: 2400, depth: 2400, segX: mobile ? 220 : 380, segZ: mobile ? 220 : 380, center: [0, -700], heightFn,
    colorFn: (x, y, z, slope, c) => {
      const m = fbm(n, x * 0.012 + 40, z * 0.012, 3);
      if (y < -0.6) { c.setRGB(0.16, 0.14, 0.11); return; }
      if (y < 12) {
        c.setRGB(0.11 + m * 0.06, 0.19 + m * 0.08, 0.06);
        if (y < 0.4) c.multiplyScalar(0.6);
        return;
      }
      const autumn = smoothstep(0.1, 0.45, fbm(n, x * 0.008, z * 0.008 + 9, 3));
      c.setRGB(0.10, 0.17, 0.09);
      leaf.setRGB(0.55 + m * 0.2, 0.18 + m * 0.18, 0.06);
      c.lerp(leaf, autumn * 0.85);
      if (slope > 0.45) c.lerp(new THREE.Color(0.3, 0.27, 0.22), 0.5);
    },
  });
  scene.add(terrain);

  // ---------------- water
  const water = new Water(new THREE.PlaneGeometry(900, 700), {
    textureWidth: mobile ? 256 : 512, textureHeight: mobile ? 256 : 512,
    waterNormals: waterNormals(), sunDirection: sunDir.clone(), sunColor: 0xffe0c0,
    waterColor: 0x0a1f1f, distortionScale: 1.2, fog: true, alpha: 0.9,
  });
  water.material.transparent = true;
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0, -150);
  water.material.uniforms.size.value = 6;
  water.userData.pick = 'water';
  scene.add(water);
  W.pickables.push(water);

  // ---------------- torii in the water
  const vermilion = new THREE.MeshStandardMaterial({ color: 0xc23a1e, roughness: 0.55, emissive: 0x2a0600 });
  const black = new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.6 });
  const torii = new THREE.Group();
  const pillar = new THREE.CylinderGeometry(0.42, 0.5, 10, 20);
  for (const sx of [-3.6, 3.6]) {
    const pm = new THREE.Mesh(pillar, vermilion);
    pm.position.set(sx, 5, 0);
    pm.rotation.z = -sx * 0.008;
    torii.add(pm);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.2, 20), black);
    base.position.set(sx, 0.2, 0);
    torii.add(base);
  }
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.55, 0.42), vermilion);
  nuki.position.y = 7.4;
  torii.add(nuki);
  const bentBox = (w, h, d, lift, mat) => {
    const g = new THREE.BoxGeometry(w, h, d, 30, 1, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2); p.setY(i, p.getY(i) + Math.pow(Math.abs(x), 2.4) * lift); }
    g.computeVertexNormals();
    return new THREE.Mesh(g, mat);
  };
  const kasagi = bentBox(13.2, 0.6, 1.0, 0.9, black);
  kasagi.position.y = 9.6;
  const shimaki = bentBox(12.4, 0.55, 0.85, 0.7, vermilion);
  shimaki.position.y = 9.05;
  const gaku = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.3), black);
  gaku.position.y = 8.25;
  torii.add(kasagi, shimaki, gaku);
  torii.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  torii.position.set(12, 0, -78);
  torii.rotation.y = -0.12;
  torii.scale.setScalar(1.35);
  scene.add(torii);

  // ---------------- five-storey pagoda on the hillside
  const pagoda = new THREE.Group();
  const wood = addDetail(new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.85 }), { scale: 2, strength: 0.3 });
  const tile = addDetail(new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.7, metalness: 0.1 }), { scale: 3, strength: 0.25 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xb8a070, roughness: 0.6 });
  let y = 0;
  const roofGeo = (w) => {
    const g = new THREE.ConeGeometry(w * 0.95, 2.4, 4, 6);
    g.rotateY(Math.PI / 4);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), yy = p.getY(i);
      const r = Math.max(Math.abs(x), Math.abs(z)) / (w * 0.68);
      p.setY(i, yy + Math.pow(Math.min(r, 1.4), 4) * 0.9 - (1 - (yy + 1.2) / 2.4) * 0.6);
    }
    g.computeVertexNormals();
    return g;
  };
  for (let i = 0; i < 5; i++) {
    const w = 9 - i * 0.9;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 3.6, w * 0.62), wood);
    body.position.y = y + 1.8;
    const roof = new THREE.Mesh(roofGeo(w), tile);
    roof.position.y = y + 4.4;
    const band = new THREE.Mesh(new THREE.BoxGeometry(w * 0.66, 0.25, w * 0.66), trim);
    band.position.y = y + 3.4;
    pagoda.add(body, roof, band);
    y += 4.7;
  }
  const sorin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 8, 8), trim);
  sorin.position.y = y + 3.2;
  pagoda.add(sorin);
  for (let i = 0; i < 9; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 6, 16), trim);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y + 1 + i * 0.6;
    pagoda.add(ring);
  }
  pagoda.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const px = -62, pz = -250;
  pagoda.position.set(px, heightFn(px, pz) - 0.5, pz);
  pagoda.scale.setScalar(1.25);
  pagoda.userData.pick = 'pagoda';
  scene.add(pagoda);
  W.pickables.push(pagoda);

  // ---------------- arched bridge
  const bridge = new THREE.Group();
  const deckGeo = new THREE.BoxGeometry(4, 0.45, 34, 1, 1, 40);
  const dp = deckGeo.attributes.position;
  for (let i = 0; i < dp.count; i++) { const z = dp.getZ(i); dp.setY(i, dp.getY(i) + Math.cos((z / 34) * Math.PI) * 3.4); }
  deckGeo.computeVertexNormals();
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xb33520, roughness: 0.6 });
  bridge.add(new THREE.Mesh(deckGeo, bridgeMat));
  for (const sx of [-1.9, 1.9]) {
    const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 11 }, (_, i) => { const z = -17 + i * 3.4; return new THREE.Vector3(sx, Math.cos((z / 34) * Math.PI) * 3.4 + 1.2, z); })), 30, 0.09, 6), bridgeMat);
    bridge.add(rail);
    for (let i = 0; i <= 10; i++) {
      const z = -17 + i * 3.4;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.3, 6), bridgeMat);
      post.position.set(sx, Math.cos((z / 34) * Math.PI) * 3.4 + 0.6, z);
      bridge.add(post);
    }
  }
  bridge.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  bridge.position.set(-66, 0.2, -70);
  bridge.rotation.y = 0.5;
  scene.add(bridge);

  // ---------------- tea house on the right shore
  const tea = new THREE.Group();
  const shoji = new THREE.MeshStandardMaterial({ color: 0xf1e6d0, roughness: 0.9, emissive: 0x3a2a12, emissiveIntensity: 0.6 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 10), wood);
  deck.position.y = 1.2;
  const walls = new THREE.Mesh(new THREE.BoxGeometry(11, 3.6, 7.5), shoji);
  walls.position.y = 3.2;
  const roof = new THREE.Mesh(roofGeo(14), tile);
  roof.scale.set(1.15, 0.9, 0.85);
  roof.position.y = 6.2;
  tea.add(deck, walls, roof);
  for (const [x, z] of [[-6.5, -4.5], [6.5, -4.5], [-6.5, 4.5], [6.5, 4.5]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 5.5, 8), wood);
    post.position.set(x, 2.8, z);
    tea.add(post);
  }
  tea.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  tea.position.set(88, heightFn(88, -20), -20);
  tea.rotation.y = -0.9;
  scene.add(tea);

  // ---------------- trees, rocks, lanterns
  const r = seeded(21);
  const trees = [
    [-58, 4, 'maple', [0xb52a14, 0xe0601c], 12, 7], [46, 4, 'maple', [0xd04a12, 0xf0a020], 11, 6.5], [-70, -30, 'maple', [0x9c1c12, 0xd8401a], 13, 7.5],
    [60, -12, 'maple', [0xe07818, 0xf4c030], 10, 6], [-18, -132, 'maple', [0xb02a14, 0xe85a1a], 14, 8], [48, -128, 'maple', [0xc8401a, 0xf09028], 13, 7],
    [-40, -150, 'cherry', [0xf0b8c4, 0xfde4ea], 10, 6], [-36, 2, 'maple', [0xc8341a, 0xf07a22], 9, 5.5], [92, -70, 'maple', [0xa42010, 0xd84818], 12, 7],
  ];
  trees.forEach(([x, z, kind, colors, h, s], i) => {
    const t = leafyTree({ height: h, spread: s, leaf: kind === 'cherry' ? 'round' : 'maple', colors, cards: mobile ? 150 : 300, cardSize: kind === 'cherry' ? 2 : 2.4, seed: i + 3 });
    t.position.set(x, heightFn(x, z) - 0.3, z);
    t.rotation.y = r(0, 6.28);
    scene.add(t);
  });
  const pines = [];
  for (let i = 0; i < (mobile ? 900 : 2200); i++) {
    const x = r(-900, 900), z = r(-1500, -150);
    const h = heightFn(x, z);
    if (h < 6 || pond(x, z) < 1.3) continue;
    pines.push([x, h, z]);
  }
  scene.add(conifers(pines, { color: 0x24402a, scale: [10, 22], seed: 4, shadows: false }));
  for (let i = 0; i < 14; i++) {
    const a = r(0, 6.28);
    const x = Math.cos(a) * (PRX + 3), z = PZ + Math.sin(a) * (PRZ + 3);
    const rk = rock(r(1.2, 3.2), i + 1, 0x6c6a62);
    rk.position.set(x, heightFn(x, z) - 0.3, z);
    rk.rotation.y = r(0, 6);
    scene.add(rk);
  }
  const lanterns = [];
  for (const [x, z] of [[-26, 12], [30, 10], [-40, -128], [96, -50]]) {
    const ln = stoneLantern(1.3);
    ln.position.set(x, heightFn(x, z), z);
    scene.add(ln);
    lanterns.push(ln);
  }

  // lily pads
  const pad = new THREE.CircleGeometry(1, 18, 0.3, Math.PI * 1.85);
  pad.rotateX(-Math.PI / 2);
  const pads = new THREE.InstancedMesh(pad, new THREE.MeshStandardMaterial({ color: 0x2f4a22, roughness: 0.6 }), 60);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 60; i++) {
    const a = r(0, 6.28), d = r(0.55, 0.95);
    m4.compose(new THREE.Vector3(Math.cos(a) * PRX * d + r(-4, 4), 0.06, PZ + Math.sin(a) * PRZ * d), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r(0, 6)), new THREE.Vector3().setScalar(r(0.6, 1.4)));
    pads.setMatrixAt(i, m4);
  }
  scene.add(pads);

  // ---------------- koi
  const koiColors = [[0xf3ede2, 0xe0441c], [0xf09a2a, 0xf7e4c0], [0xf3ede2, 0x1a1816], [0xe8561c, 0xf3ede2], [0xf4f0e8, 0xd03a18], [0xe8b030, 0xf8f0d8]];
  const koi = koiColors.map(([c1, c2], i) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.5, 4, 10), new THREE.MeshStandardMaterial({ color: c1, roughness: 0.4 }));
    body.rotation.z = Math.PI / 2;
    body.scale.set(1, 1, 0.75);
    const patch = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshStandardMaterial({ color: c2, roughness: 0.4 }));
    patch.scale.set(1.4, 0.5, 0.9);
    patch.position.set(0.2, 0.14, 0);
    const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), new THREE.MeshStandardMaterial({ color: c1, roughness: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
    tail.rotation.x = Math.PI / 2;
    tail.position.x = -1.3;
    g.add(body, patch, tail);
    g.userData = { tail, a: r(0, 6.28), x: r(-25, 25), z: -12 + r(-12, 8), v: 2, wander: r(0, 100) };
    g.position.set(g.userData.x, -0.25, g.userData.z);
    scene.add(g);
    return g;
  });
  const foods = [];
  let fed = 0;
  const ripples = [];
  const rippleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false });
  W.feed = (point) => {
    const pellet = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshStandardMaterial({ color: 0xd9b36a }));
    pellet.position.set(point.x, 0.05, point.z);
    scene.add(pellet);
    foods.push({ mesh: pellet, born: performance.now() });
    for (let k = 0; k < 2; k++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), rippleMat.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(point.x, 0.08, point.z);
      ring.userData.age = -k * 0.35;
      scene.add(ring);
      ripples.push(ring);
    }
  };

  // ---------------- atmosphere
  const mist = [];
  for (let i = 0; i < 40; i++) mist.push([r(-700, 700), r(25, 90), r(-1100, -320)]);
  scene.add(cloudPuffs(mist, { size: [120, 260], color: 0xffe6d8, shade: 0xb79c9a, opacity: 0.55 }));
  scene.add(drifters({ count: mobile ? 250 : 600, box: [140, 40, 160], center: [0, 0, -40], color: 0xd8461c, color2: 0xf2b8bd, size: 2.6, fall: 1.4, wind: [1.5, 0.4] }));

  W.targets = { pagoda: new THREE.Vector3(px, heightFn(px, pz) + 22, pz) };

  const tmp = new THREE.Vector3();
  W.update = (t, dt, ctx) => {
    water.material.uniforms.time.value = t * 0.5;
    lanterns.forEach((ln) => { ln.userData.glow.visible = ctx.night > 0.3; });
    for (const k of koi) {
      const u = k.userData;
      let target = null, best = 60;
      for (const f of foods) { const d = Math.hypot(f.mesh.position.x - u.x, f.mesh.position.z - u.z); if (d < best) { best = d; target = f; } }
      let tx, tz;
      if (target) { tx = target.mesh.position.x; tz = target.mesh.position.z; }
      else { u.wander += dt * 0.3; tx = u.x + Math.cos(u.a + Math.sin(u.wander) * 1.5) * 10; tz = u.z + Math.sin(u.a + Math.sin(u.wander) * 1.5) * 10; }
      if (pond(tx, tz) > 0.85 || tz > -2) { tx *= 0.5; tz = PZ + (tz - PZ) * 0.5; }
      let da = Math.atan2(tz - u.z, tx - u.x) - u.a;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      u.a += da * Math.min(1, dt * (target ? 3 : 1));
      const sp = target ? 7 : 2.2;
      u.v += (sp - u.v) * Math.min(1, dt * 2);
      u.x += Math.cos(u.a) * u.v * dt;
      u.z += Math.sin(u.a) * u.v * dt;
      k.position.set(u.x, target ? -0.12 : -0.3, u.z);
      k.rotation.y = -u.a;
      u.tail.rotation.y = Math.sin(t * (target ? 14 : 6) + u.wander) * 0.5;
      if (target && best < 1) {
        scene.remove(target.mesh);
        foods.splice(foods.indexOf(target), 1);
        fed++;
        if (fed === 3 && onFed) onFed();
      }
    }
    for (let i = foods.length - 1; i >= 0; i--) if (performance.now() - foods[i].born > 12000) { scene.remove(foods[i].mesh); foods.splice(i, 1); }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.userData.age += dt;
      const a = rp.userData.age;
      rp.visible = a > 0;
      rp.scale.setScalar(1 + Math.max(0, a) * 4);
      rp.material.opacity = Math.max(0, 0.5 - a * 0.22);
      if (a > 2.4) { scene.remove(rp); ripples.splice(i, 1); }
    }
    tmp.set(0, 0, 0);
  };
  return W;
}
