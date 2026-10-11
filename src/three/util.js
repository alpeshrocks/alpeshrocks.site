import * as THREE from 'three';

// ---------------------------------------------------------------- noise

// Seeded 2D simplex noise, returns roughly -1..1.
export function makeNoise(seed = 1) {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed * 9301 + 49297;
  for (let i = 255; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  return function noise(xin, yin) {
    const t0 = (xin + yin) * F2;
    const i = Math.floor(xin + t0), j = Math.floor(yin + t0);
    const t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0;
    let c = 0.5 - x0 * x0 - y0 * y0;
    if (c > 0) { const g = grad[perm[ii + perm[jj]] & 7]; c *= c; n += c * c * (g[0] * x0 + g[1] * y0); }
    c = 0.5 - x1 * x1 - y1 * y1;
    if (c > 0) { const g = grad[perm[ii + i1 + perm[jj + j1]] & 7]; c *= c; n += c * c * (g[0] * x1 + g[1] * y1); }
    c = 0.5 - x2 * x2 - y2 * y2;
    if (c > 0) { const g = grad[perm[ii + 1 + perm[jj + 1]] & 7]; c *= c; n += c * c * (g[0] * x2 + g[1] * y2); }
    return 70 * n;
  };
}

export function fbm(noise, x, y, oct = 5, lac = 2.0, gain = 0.5) {
  let v = 0, a = 1, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { v += a * noise(x * f, y * f); norm += a; a *= gain; f *= lac; }
  return v / norm;
}

export function ridged(noise, x, y, oct = 5) {
  let v = 0, a = 0.5, f = 1, prev = 1;
  for (let i = 0; i < oct; i++) {
    let n = 1 - Math.abs(noise(x * f, y * f));
    n *= n;
    v += n * a * prev;
    prev = n;
    a *= 0.5;
    f *= 2.0;
  }
  return v;
}

export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);

// Deterministic random for layouts that should look the same on every visit.
export function seeded(seed = 1) {
  let s = seed >>> 0;
  return (a = 0, b = 1) => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return a + (s / 4294967296) * (b - a);
  };
}

// ---------------------------------------------------------------- terrain

// Heightfield mesh. heightFn(x, z) -> y, colorFn(x, y, z, slope, out Color).
export function makeTerrain({ width, depth, segX, segZ, center = [0, 0], heightFn, colorFn, material }) {
  const geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate(center[0], 0, center[1]);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightFn(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    colorFn(pos.getX(i), pos.getY(i), pos.getZ(i), 1 - nrm.getY(i), c);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = material || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  addDetail(mat, { scale: 0.35, strength: 0.32 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

// Injects world-space value noise into a standard material so surfaces hold
// up when the camera gets close.
const detailNoise = /* glsl */ `
  float dHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float dNoise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dHash(i), dHash(i + vec3(1,0,0)), f.x), mix(dHash(i + vec3(0,1,0)), dHash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(dHash(i + vec3(0,0,1)), dHash(i + vec3(1,0,1)), f.x), mix(dHash(i + vec3(0,1,1)), dHash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float dFbm(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * dNoise(p); p *= 2.13; a *= 0.5; } return v; }
`;

export function addDetail(material, { scale = 0.4, strength = 0.3, streak = 0 } = {}) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, r) => {
    if (prev) prev(shader, r);
    shader.uniforms.uDetailScale = { value: scale };
    shader.uniforms.uDetailStrength = { value: strength };
    shader.uniforms.uStreak = { value: streak };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDetailPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vec4 dwp = vec4(transformed, 1.0);\n #ifdef USE_INSTANCING\n dwp = instanceMatrix * dwp;\n #endif\n vDetailPos = (modelMatrix * dwp).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vDetailPos;\nuniform float uDetailScale;\nuniform float uDetailStrength;\nuniform float uStreak;\n${detailNoise}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 dp = vDetailPos * uDetailScale;
        float dn = dFbm(dp) * 0.65 + dFbm(dp * 6.0) * 0.35;
        float st = uStreak > 0.0 ? dFbm(vec3(dp.x * 3.0, dp.y * 0.15, dp.z * 3.0)) : 0.5;
        diffuseColor.rgb *= 1.0 + (dn - 0.5) * uDetailStrength * 2.0;
        diffuseColor.rgb *= 1.0 - smoothstep(0.55, 0.8, st) * uStreak;`);
  };
  material.customProgramCacheKey = () => `detail-${scale}-${strength}-${streak}`;
  return material;
}

// ---------------------------------------------------------------- textures

function canvasTex(size, draw, { repeat = false, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// A cluster of leaves on transparent background, for leaf cards.
export function leafTexture(kind = 'maple') {
  const r = seeded(kind.length * 77);
  return canvasTex(256, (g, S) => {
    g.clearRect(0, 0, S, S);
    const n = kind === 'needle' ? 70 : 34;
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * S * 0.38;
      const x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d;
      const l = 0.7 + r() * 0.5;
      g.save();
      g.translate(x, y);
      g.rotate(r() * Math.PI * 2);
      g.fillStyle = `rgb(${Math.floor(255 * l)},${Math.floor(255 * l)},${Math.floor(255 * l)})`;
      if (kind === 'maple') {
        const s = S * 0.06;
        g.beginPath();
        for (let k = 0; k < 10; k++) {
          const rr = k % 2 ? s * 0.45 : s;
          const aa = (k / 10) * Math.PI * 2;
          g.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
        }
        g.fill();
      } else if (kind === 'needle') {
        g.strokeStyle = g.fillStyle;
        g.lineWidth = 2;
        for (let k = 0; k < 7; k++) {
          g.beginPath();
          g.moveTo(0, 0);
          g.lineTo(Math.cos(k) * S * 0.07, Math.sin(k) * S * 0.07);
          g.stroke();
        }
      } else {
        g.beginPath();
        g.ellipse(0, 0, S * 0.045, S * 0.025, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
  });
}

// Soft cloud puff with ragged edges.
export function puffTexture() {
  const r = seeded(11);
  return canvasTex(256, (g, S) => {
    g.clearRect(0, 0, S, S);
    for (let i = 0; i < 40; i++) {
      const x = S / 2 + (r() - 0.5) * S * 0.5;
      const y = S / 2 + (r() - 0.5) * S * 0.32;
      const rad = S * (0.1 + r() * 0.16);
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, 'rgba(255,255,255,0.22)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, S, S);
    }
  }, { srgb: false });
}

export function glowTexture() {
  return canvasTex(128, (g, S) => {
    const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.5)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, S, S);
  }, { srgb: false });
}

// Tileable water normal map built from integer-frequency waves.
export function waterNormals(size = 256) {
  const data = new Uint8Array(size * size * 4);
  const waves = [];
  const r = seeded(5);
  for (let i = 0; i < 24; i++) waves.push([Math.round(r(1, 9)) * (r() < 0.5 ? -1 : 1), Math.round(r(1, 9)) * (r() < 0.5 ? -1 : 1), r(0, 6.28), 1 / (1 + i * 0.35)]);
  const h = (x, y) => waves.reduce((s, [a, b, p, amp]) => s + amp * Math.sin((a * x + b * y) * Math.PI * 2 / size + p), 0);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = h(x + 1, y) - h(x - 1, y);
      const dy = h(x, y + 1) - h(x, y - 1);
      const v = new THREE.Vector3(-dx * 0.5, -dy * 0.5, 1).normalize();
      const i = (y * size + x) * 4;
      data[i] = (v.x * 0.5 + 0.5) * 255;
      data[i + 1] = (v.y * 0.5 + 0.5) * 255;
      data[i + 2] = (v.z * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

export function sunVector(elevationDeg, azimuthDeg) {
  const phi = THREE.MathUtils.degToRad(90 - elevationDeg);
  const theta = THREE.MathUtils.degToRad(azimuthDeg);
  return new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
}
