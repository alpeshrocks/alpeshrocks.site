// Screen-space effects drawn over the 3D scene: petal bursts and the tossed coin.

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// How visible world k is at continuous scroll position w.
export function visibility(k, w) {
  const enter = k === 0 ? 1 : smooth(k - 0.35, k - 0.02, w);
  const leave = k === 4 ? 0 : smooth(k + 0.6, k + 0.9, w);
  return enter * (1 - leave);
}

export function createFx(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const bursts = [];
  const coins = [];

  function burst(sx, sy, color, n = 40, spread = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = rand(60, 320) * spread;
      bursts.push({ x: sx, y: sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: rand(1.2, 2.6), age: 0, color, r: rand(1.5, 3.5), spin: Math.random() * TAU });
    }
  }
  function tossCoin(sx, sy) {
    coins.push({ x: sx, y: sy, vx: -rand(120, 180), vy: -620, age: 0 });
  }

  function frame(dt) {
    ctx.clearRect(0, 0, W, H);
    if (!bursts.length && !coins.length) return;
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.age += dt;
      if (b.age > b.life) { bursts.splice(i, 1); continue; }
      b.vy += 160 * dt;
      b.vx *= 1 - dt * 0.8;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.spin += dt * 5;
      ctx.save();
      ctx.globalAlpha = 1 - b.age / b.life;
      ctx.translate(b.x, b.y);
      ctx.rotate(b.spin);
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, b.r * 1.6, b.r * 0.8, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.age += dt;
      c.vy += 900 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      const sq = Math.abs(Math.cos(c.age * 18));
      ctx.fillStyle = '#e7c06a';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 7, 7 * sq + 0.5, 0, 0, TAU);
      ctx.fill();
      if (c.age > 1.1) {
        burst(c.x, c.y, '#cfe6f0', 26, 0.5);
        coins.splice(i, 1);
      }
    }
  }

  return { frame, burst, tossCoin, smooth };
}
