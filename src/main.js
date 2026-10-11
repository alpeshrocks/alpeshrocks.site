import './styles.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { profile, about, worlds, experience, projectCategories, education, extras, interludes, quests, secret, WEB3FORMS_KEY } from './content.js';
import { createEngine } from './three/engine.js';
import { createKyoto } from './three/worlds/kyoto.js';
import { createYosemite } from './three/worlds/yosemite.js';
import { createZhangjiajie } from './three/worlds/zhangjiajie.js';
import { createGoldenGate } from './three/worlds/goldengate.js';
import { createSunset } from './three/worlds/sunset.js';
import { createMoon } from './three/worlds/moon.js';
import { createFx, visibility } from './fx.js';
import { audio } from './audio.js';
import { createTerminal } from './terminal.js';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const h = (tag, attrs = {}, html = '') => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.innerHTML = html;
  return el;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

// ================================================================ markup

const walk = $('#walk');

function head(i, title, sub = '') {
  const w = worlds[i];
  return `
    <div class="world-kanji" aria-hidden="true">${w.kanji}</div>
    <div class="world-head">
      <p class="eyebrow"><b>${w.kanji}</b> &nbsp;${w.place} · ${String(i).padStart(2, '0')}</p>
      <h2 class="world-title split">${title}</h2>
      ${sub ? `<p class="world-sub">${sub}</p>` : ''}
    </div>`;
}

const sections = [];

// 0. Kyoto hero
sections.push(`
  <div class="world-kanji" aria-hidden="true">${worlds[0].kanji}</div>
  <div class="world-head">
    <p class="kana">${profile.kana}</p>
    <h1 class="split">${profile.name}</h1>
    <p class="tagline">${esc(profile.tagline)}</p>
    <p class="meta">${profile.role} · ${profile.location}</p>
    <div class="hero-actions">
      <button class="pill primary" data-action="begin">Begin the walk</button>
      <button class="pill" data-action="resume">Skip the journey</button>
    </div>
  </div>
  <div class="scroll-cue" aria-hidden="true">Scroll<i></i></div>
  <div class="stack">
    <article class="card about-card reveal">
      <p class="eyebrow">About</p>
      ${about.map((p) => `<p>${esc(p)}</p>`).join('')}
    </article>
  </div>`);

// 1. Yosemite, experience
sections.push(`${head(1, 'The Climb', '')}
  <div class="stack right">
    ${experience.map((e) => `
      <article class="card reveal">
        <div class="role-head"><h3>${esc(e.company)}</h3><span class="role-dates">${e.dates}</span></div>
        <p class="role-title">${esc(e.title)} · ${e.place}</p>
        <ul>${e.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
      </article>`).join('')}
  </div>`);

// 2. Zhangjiajie, projects grouped by category
const projectCards = (cat) => cat.projects.map((p, i) => `
  <article class="card project">
    <span class="num">${String(i + 1).padStart(2, '0')}</span>
    <h3>${esc(p.name)}</h3>
    <p>${esc(p.body)}</p>
    ${p.link ? `<a class="go" href="${p.link}" target="_blank" rel="noopener">View the code <span aria-hidden="true">→</span></a>` : ''}
  </article>`).join('');
sections.push(`${head(2, 'The Work', 'A lot of things, built for a lot of reasons. Pick a peak.')}
  <div class="cat-tabs reveal" role="tablist" aria-label="Project categories">
    ${projectCategories.map((c, i) => `<button role="tab" id="tab-${c.id}" aria-controls="cat-panel" aria-selected="${i === 0}" data-cat="${i}">${esc(c.name)}<span>${c.projects.length}</span></button>`).join('')}
  </div>
  <div id="cat-panel" class="cat-panel" role="tabpanel" aria-labelledby="tab-${projectCategories[0].id}">
    <p class="cat-blurb">${esc(projectCategories[0].blurb)}</p>
    <div class="projects">${projectCards(projectCategories[0])}</div>
  </div>`);

// 3. Golden Gate, foundations
sections.push(`${head(3, 'Foundations')}
  <div class="stack">
    ${education.map((e) => `
      <article class="card edu reveal">
        <h3>${esc(e.school)}</h3>
        <p class="role-title" style="margin:0">${esc(e.degree)}</p>
        <span class="gpa">GPA ${e.gpa} · ${e.dates}</span>
      </article>`).join('')}
    <div class="extras">
      ${extras.map((x) => `<article class="card reveal"><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p></article>`).join('')}
    </div>
  </div>`);

// 4. Sunset, contact
sections.push(`${head(4, 'The Way Forward')}
  <div class="stack">
    <article class="card contact reveal">
      <h3>Let's build something.</h3>
      <p>If you are hiring for AI or ML engineering, or you just want to talk about agents, data, or mountains, send a note. I read everything.</p>
      <form id="contact-form" novalidate>
        <div class="field"><label for="f-name">Name</label><input id="f-name" name="name" required autocomplete="name" /></div>
        <div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" required autocomplete="email" /></div>
        <div class="field"><label for="f-msg">Message</label><textarea id="f-msg" name="message" rows="4" required></textarea></div>
        <input type="checkbox" name="botcheck" style="display:none" tabindex="-1" autocomplete="off" />
        <div class="form-foot">
          <span class="form-status" aria-live="polite"></span>
          <button class="pill primary" type="submit">Send</button>
        </div>
      </form>
      <div class="links">
        <a href="mailto:${profile.email}">${profile.email}</a>
        <a href="${profile.github}" target="_blank" rel="noopener">GitHub</a>
        <a href="${profile.linkedin}" target="_blank" rel="noopener">LinkedIn</a>
        <a href="#resume" data-action="resume">Resume</a>
      </div>
      <p class="footer-note">Every world is real-time 3D built in code, with no photographs or models. Five stamps are hidden along the way, and there is a terminal for anyone who presses the backtick key, or taps the red seal five times.</p>
    </article>
  </div>`);

sections.forEach((html, i) => {
  const sec = h('section', { class: `world${i === 0 ? ' hero' : ''}`, id: worlds[i].id, 'aria-label': worlds[i].title }, html);
  if (i < sections.length - 1) sec.appendChild(h('div', { class: 'passage', 'aria-hidden': 'true' }));
  walk.appendChild(sec);
});

const interlude = h('p', { class: 'interlude', 'aria-hidden': 'true' });
document.body.appendChild(interlude);

// split titles into letters for the brush reveal
$$('.split').forEach((el) => {
  el.innerHTML = el.textContent.split(' ').map((word) =>
    `<span class="word">${[...word].map((c) => `<span class="ch">${c}</span>`).join('')}</span>`).join(' ');
});

// world nav
const nav = $('.worlds');
worlds.forEach((w, i) => {
  const b = h('button', { 'data-goto': i, 'aria-label': `${w.title}, ${w.place}` }, `<span class="lbl">${w.place}</span><span class="k">${w.kanji}</span>`);
  nav.appendChild(b);
});

// ================================================================ scroll to world

let layout = [];
function measure() {
  const vh = innerHeight;
  const secs = $$('.world');
  layout = secs.map((s, k) => {
    const a = s.offsetTop;
    const passage = $('.passage', s);
    if (!passage) return { a, b: document.documentElement.scrollHeight - vh, c: Infinity, last: true };
    const pTop = s.offsetTop + passage.offsetTop;
    const b = Math.max(a + vh * 0.5, pTop - vh * 0.35);
    const c = pTop + passage.offsetHeight - vh;
    return { a, b, c };
  });
}

function scrollToWorld(s) {
  let w = 0;
  for (let k = 0; k < layout.length; k++) {
    const L = layout[k];
    if (L.last) { w = k + Math.min(0.5, Math.max(0, 0.5 * (s - L.a) / Math.max(1, L.b - L.a))); break; }
    if (s >= L.c) { w = k + 1; continue; }
    if (s < L.a) { w = k; break; }
    w = s < L.b ? k + 0.5 * (s - L.a) / (L.b - L.a) : k + 0.5 + 0.5 * (s - L.b) / Math.max(1, L.c - L.b);
    break;
  }
  return Math.min(4.5, w);
}

function goToWorld(k) {
  const L = layout[k];
  if (!L) return;
  closeOverlays();
  gsap.to(window, { scrollTo: L.a + (k === 0 ? 0 : 2), duration: reduced ? 0 : 1.6, ease: 'power2.inOut' });
}

// ================================================================ state

const state = {
  time: 0,
  world: 0,
  targetWorld: 0,
  secret: 0,
  secretTarget: 0,
  night: 0,
  nightTarget: 0,
  mouse: { x: 0, y: 0 },
  mouseTarget: { x: 0, y: 0 },
  slash: -10,
  draw: 0,
};

const canvas = $('#scene');
let engine = null;
try {
  engine = createEngine(canvas);
} catch (err) {
  console.warn('WebGL unavailable, showing the painted fallback.', err);
}
if (!engine) document.body.classList.add('no-gl');

// Worlds build one at a time so the first one shows up fast.
const builders = [
  (opts) => createKyoto(engine.renderer, opts),
  (opts) => createYosemite(engine.renderer, opts),
  (opts) => createZhangjiajie(engine.renderer, opts),
  (opts) => createGoldenGate(engine.renderer, opts),
  (opts) => createSunset(engine.renderer, opts),
  (opts) => createMoon(engine.renderer, opts),
];
const buildOpts = () => ({ mobile: engine.mobile, onFed: () => award('koi') });
function buildFirst() {
  if (!engine) return;
  try { engine.add(0, builders[0](buildOpts())); } catch (err) { console.error('world', 0, err); }
}
// Remaining worlds build one per idle slot so the hero stays responsive.
async function buildWorlds() {
  if (!engine) return;
  const opts = buildOpts();
  const idle = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 400 }) : setTimeout(r, 30)));
  for (let i = 1; i < builders.length; i++) {
    await idle();
    const t0 = performance.now();
    try { engine.add(i, builders[i](opts)); } catch (err) { console.error('world', i, err); }
    if (import.meta.env.DEV) console.info(`world ${i} built in ${Math.round(performance.now() - t0)} ms`);
  }
}

// ================================================================ stamps

let stamps = store.get('alpesh.stamps', []).filter((id) => quests.some((q) => q.id === id));
const stampsEl = $('.stamps');
const hintsEl = $('.hints');

function renderStamps(popId) {
  stampsEl.innerHTML = quests.map((q) => `<i class="${stamps.includes(q.id) ? 'got' : ''}${q.id === popId ? ' pop' : ''}" title="${q.name}">印</i>`).join('');
  hintsEl.innerHTML = quests.map((q) => `<li class="${stamps.includes(q.id) ? 'got' : ''}"><strong>${worlds[q.world].place}.</strong> ${esc(q.hint)}</li>`).join('');
  $('.secret-btn').hidden = stamps.length < quests.length;
}
renderStamps();

function award(id) {
  if (stamps.includes(id)) return;
  stamps.push(id);
  store.set('alpesh.stamps', stamps);
  renderStamps(id);
  audio.stamp();
  const q = quests.find((x) => x.id === id);
  if (stamps.length === quests.length) toast('All five stamps. The moon garden is open. Check your passport.', 5000);
  else toast(`Stamp collected: ${q.name} (${stamps.length} of ${quests.length})`);
}

let toastTimer = 0;
function toast(msg, ms = 2800) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), ms);
}

// ================================================================ fx + quest targets

const fx = createFx($('#fx'));
const qLayer = $('#quest-layer');
const lamp = h('button', { class: 'q-target q-lamp', 'aria-label': 'A light on the cliff' });
const coin = h('button', { class: 'q-target q-sail', 'aria-label': 'A sailboat crossing under the bridge' });
const samurai = h('button', { class: 'q-target q-samurai', 'aria-label': 'The figure at sunset. Press and hold.' }, '<span class="q-hold"><i></i></span>');
qLayer.append(lamp, coin, samurai);

lamp.addEventListener('click', () => {
  fx.burst(parseFloat(lamp.style.left), parseFloat(lamp.style.top), '#fff2b0', 24, 0.4);
  audio.plip();
  award('climber');
  toast('A climber waves back from the wall.');
});
coin.addEventListener('click', () => {
  fx.burst(parseFloat(coin.style.left), parseFloat(coin.style.top), '#fff4e0', 30, 0.5);
  audio.horn();
  coin.dataset.used = '1';
  award('sail');
  toast('The boat sounds its horn and slips under the bridge.');
});

let holdStart = 0;
let holdRaf = 0;
function holdTick() {
  const p = Math.min(1, (performance.now() - holdStart) / 1500);
  state.draw = p;
  $('i', samurai).style.width = `${p * 100}%`;
  if (p >= 1) {
    holdStart = 0;
    state.slash = state.time;
    audio.slash();
    fx.burst(innerWidth * 0.55, innerHeight * 0.45, '#f6a07f', 70, 1.2);
    award('blade');
    setTimeout(() => { state.draw = 0; $('i', samurai).style.width = '0'; }, 1400);
    return;
  }
  holdRaf = requestAnimationFrame(holdTick);
}
samurai.addEventListener('pointerdown', (e) => { e.preventDefault(); holdStart = performance.now(); holdTick(); });
const release = () => {
  if (!holdStart) return;
  holdStart = 0;
  cancelAnimationFrame(holdRaf);
  gsap.to(state, { draw: 0, duration: 0.5 });
  $('i', samurai).style.width = '0';
};
samurai.addEventListener('pointerup', release);
samurai.addEventListener('pointerleave', release);

function placeTargets() {
  const w = state.world;
  const f = w - Math.floor(w);
  const settled = (k) => engine && Math.floor(w) === k && visibility(k, w) > 0.9 && f < 0.55 && state.secret < 0.1 && !document.body.classList.contains('zen');
  const put = (el, k, key, live) => {
    const world = engine && engine.worlds[k];
    const pos = world && world.targets[key] ? engine.project(k, world.targets[key]) : null;
    el.classList.toggle('live', !!pos && live);
    if (pos) { el.style.left = `${pos.x}px`; el.style.top = `${pos.y}px`; }
    return pos;
  };
  put(lamp, 1, 'lamp', settled(1));
  put(coin, 3, 'sail', settled(3) && !coin.dataset.used);
  const sp = put(samurai, 4, 'samurai', settled(4));
  if (sp) {
    const top = engine.project(4, engine.worlds[4].targets.samuraiTop);
    const sh = top ? Math.max(40, Math.abs(sp.y - top.y) * 2) : 120;
    samurai.style.height = `${sh}px`;
    samurai.style.width = `${sh * 0.5}px`;
  }
}

// clicks on the scenery itself
window.addEventListener('click', (e) => {
  if (e.target.closest('.card, button, a, input, textarea, .terminal, .resume, .sheet, .topbar, .worlds, .passport')) return;
  if (!engine || state.secret > 0.5) return;
  const hit = engine.pick(e.clientX, e.clientY);
  if (!hit) return;
  if (hit.name === 'water' && hit.world === 0) {
    engine.worlds[0].feed(hit.point);
    audio.plip();
  } else if (hit.name === 'pagoda') {
    audio.bell();
    toast('The temple bell rings out over the garden.');
  } else if (hit.name === 'rider') {
    fx.burst(e.clientX, e.clientY, '#2f6b74', 30, 0.6);
    award('rider');
    toast('You caught the rider. It circles once and is gone.');
  }
});

// ================================================================ overlays

const resumeEl = $('#resume');
resumeEl.innerHTML = `
  <div class="resume-inner">
    <div class="resume-top">
      <div>
        <h2>${profile.name}</h2>
        <p class="sub">${profile.role} · ${profile.location}</p>
        <p class="sub"><a href="mailto:${profile.email}">${profile.email}</a> · <a href="${profile.github}" target="_blank" rel="noopener">GitHub</a> · <a href="${profile.linkedin}" target="_blank" rel="noopener">LinkedIn</a></p>
      </div>
      <div class="resume-actions">
        <a class="pill" href="${profile.resumePdf}" download>Download PDF</a>
        <button class="pill" data-action="print">Print</button>
        <button class="pill primary" data-action="close-resume">Back to the walk</button>
      </div>
    </div>
    <p>${esc(profile.tagline)}</p>
    <h4>Experience</h4>
    ${experience.map((e) => `<div class="r-item"><div class="row"><strong>${esc(e.company)}</strong><span class="dim">${e.dates}</span></div><div class="row"><span>${esc(e.title)}</span><span class="dim">${e.place}</span></div><ul>${e.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`).join('')}
    <h4>Projects</h4>
    ${projectCategories.map((c) => `<div class="r-item"><strong>${esc(c.name)}</strong><ul>${c.projects.map((p) => `<li><strong>${esc(p.name)}.</strong> ${esc(p.body)}${p.link ? ` <a class="dim" href="${p.link}" target="_blank" rel="noopener">code</a>` : ''}</li>`).join('')}</ul></div>`).join('')}
    <h4>Education</h4>
    ${education.map((e) => `<div class="r-item"><div class="row"><strong>${esc(e.school)}</strong><span class="dim">${e.dates}</span></div><span>${esc(e.degree)} · GPA ${e.gpa}</span></div>`).join('')}
    <h4>Also</h4>
    ${extras.slice(0, 2).map((x) => `<div class="r-item"><strong>${esc(x.title)}.</strong> ${esc(x.body)}</div>`).join('')}
  </div>`;

function openResume() {
  resumeEl.hidden = false;
  document.body.style.overflow = 'hidden';
  resumeEl.scrollTop = 0;
  if (location.hash !== '#resume') history.replaceState(null, '', '#resume');
}
function closeResume() {
  resumeEl.hidden = true;
  document.body.style.overflow = '';
  if (location.hash === '#resume') history.replaceState(null, '', location.pathname);
}

const secretView = $('#secret-view');
secretView.innerHTML = `<div>
  <p class="eyebrow" style="color:#9a98b0">月 · ${secret.title}</p>
  <p class="haiku">${secret.haiku.map(esc).join('<br/>')}</p>
  <p>${esc(secret.note)}</p>
  <button class="pill" data-action="leave-secret">Return to the walk</button>
</div>`;

function enterSecret() {
  $('#passport-sheet').hidden = true;
  state.secretTarget = 1;
  document.body.classList.add('in-secret');
  secretView.hidden = false;
  gsap.fromTo(secretView.firstElementChild, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 2, delay: 1 });
  audio.bell();
}
function leaveSecret() {
  state.secretTarget = 0;
  document.body.classList.remove('in-secret');
  secretView.hidden = true;
}

function setNight(on) {
  state.nightTarget = on ? 1 : 0;
  document.documentElement.dataset.night = on ? 'true' : 'false';
  $('[data-action="night"]').setAttribute('aria-pressed', String(on));
  $('meta[name="theme-color"]').setAttribute('content', on ? '#0b0d14' : '#f3ebe0');
}

function closeOverlays() {
  closeResume();
  $('#passport-sheet').hidden = true;
  document.body.classList.remove('zen');
}

const terminal = createTerminal({
  el: $('#terminal'),
  input: $('#term-input'),
  out: $('.term-out'),
  actions: {
    resume: openResume,
    goto: (k) => { terminal.close(); goToWorld(k); },
    stamps: () => stamps,
    night: () => setNight(state.nightTarget < 0.5),
    zen: () => { terminal.close(); document.body.classList.add('zen'); },
  },
});

// ================================================================ actions

function showCategory(i) {
  const cat = projectCategories[i];
  if (!cat) return;
  $$('.cat-tabs [role="tab"]').forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
  const panel = $('#cat-panel');
  panel.setAttribute('aria-labelledby', `tab-${cat.id}`);
  $('.cat-blurb', panel).textContent = cat.blurb;
  const grid = $('.projects', panel);
  grid.innerHTML = projectCards(cat);
  if (!reduced) gsap.from(grid.children, { y: 24, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.05 });
}

let sealTaps = [];
document.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-cat]');
  if (tab) { showCategory(+tab.dataset.cat); return; }
  const goto = e.target.closest('[data-goto]');
  if (goto) { goToWorld(+goto.dataset.goto); return; }
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (a === 'resume') { e.preventDefault(); openResume(); }
  else if (a === 'close-resume') closeResume();
  else if (a === 'print') window.print();
  else if (a === 'begin') goToWorld(1);
  else if (a === 'top') {
    sealTaps = sealTaps.filter((t) => performance.now() - t < 2500).concat(performance.now());
    if (sealTaps.length >= 5) { sealTaps = []; terminal.open(); } else goToWorld(0);
  }
  else if (a === 'sound') { const on = audio.toggle(); el.setAttribute('aria-pressed', String(on)); toast(on ? 'Wind and strings. Turn it up a little.' : 'Silence.'); }
  else if (a === 'night') setNight(state.nightTarget < 0.5);
  else if (a === 'passport') $('#passport-sheet').hidden = false;
  else if (a === 'close-sheet') $('#passport-sheet').hidden = true;
  else if (a === 'secret') enterSecret();
  else if (a === 'leave-secret') leaveSecret();
  else if (a === 'close-term') terminal.close();
});
$('#passport-sheet').addEventListener('click', (e) => { if (e.target.id === 'passport-sheet') e.currentTarget.hidden = true; });

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konami = 0;
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea')) return;
  konami = e.key === KONAMI[konami] || e.key.toLowerCase() === KONAMI[konami] ? konami + 1 : (e.key === KONAMI[0] ? 1 : 0);
  if (konami === KONAMI.length) {
    konami = 0;
    setNight(state.nightTarget < 0.5);
    toast('Lanterns lit. The fireflies were waiting for you.');
    return;
  }
  if (e.key === '`' || e.key === '~') { e.preventDefault(); terminal.toggle(); }
  else if (e.key === 'Escape') {
    if (state.secretTarget > 0) leaveSecret();
    closeOverlays();
    terminal.close();
  }
});

// ================================================================ contact form

$('#contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const status = $('.form-status', form);
  const data = Object.fromEntries(new FormData(form));
  if (!data.name || !data.email || !data.message || !/^\S+@\S+\.\S+$/.test(data.email)) {
    status.textContent = 'Please fill in your name, a valid email, and a message.';
    return;
  }
  if (!WEB3FORMS_KEY) {
    const body = encodeURIComponent(`${data.message}\n\n${data.name}\n${data.email}`);
    window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(`Hello from ${data.name}`)}&body=${body}`;
    status.textContent = 'Opening your mail app.';
    return;
  }
  status.textContent = 'Sending...';
  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ access_key: WEB3FORMS_KEY, subject: `alpesh.me: message from ${data.name}`, from_name: 'alpesh.me', ...data }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    form.reset();
    status.textContent = 'Sent. Thank you, I will write back soon.';
    audio.bell();
  } catch {
    status.textContent = `That did not go through. You can write to ${profile.email} directly.`;
  }
});

// ================================================================ motion

function reveals() {
  if (reduced) return;
  gsap.utils.toArray('.reveal').forEach((el) => {
    gsap.from(el, { y: 50, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  $$('.split').forEach((el) => {
    gsap.from($$('.ch', el), {
      opacity: 0, y: '0.4em', filter: 'blur(8px)', duration: 1.4, ease: 'expo.out', stagger: 0.035,
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });
}

const cursor = $('#cursor');
let cx = innerWidth / 2, cy = innerHeight / 2, mx = cx, my = cy;
window.addEventListener('pointermove', (e) => {
  mx = e.clientX;
  my = e.clientY;
  state.mouseTarget.x = (e.clientX / innerWidth) * 2 - 1;
  state.mouseTarget.y = (e.clientY / innerHeight) * 2 - 1;
  cursor.classList.toggle('big', !!e.target.closest('a, button, input, textarea, .q-target'));
});

// ?w=2.3 pins the scenery to a world position, handy when tuning a scene
let PIN_WORLD = new URLSearchParams(location.search).has('w') ? parseFloat(new URLSearchParams(location.search).get('w')) : null;
if (import.meta.env.DEV) { window.__pin = (v) => { PIN_WORLD = v; }; window.__engine = engine; }
const navButtons = $$('.worlds button');
let last = performance.now();
let lastNav = -1;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  state.time += dt * (reduced ? 0.25 : 1);

  state.targetWorld = PIN_WORLD !== null ? PIN_WORLD : scrollToWorld(scrollY);
  const k = reduced ? 1 : 1 - Math.exp(-dt * 4.5);
  state.world = PIN_WORLD !== null ? PIN_WORLD : state.world + (state.targetWorld - state.world) * k;
  if (import.meta.env.DEV) window.__fps = (window.__fps || 60) * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05;
  state.secret += (state.secretTarget - state.secret) * (1 - Math.exp(-dt * 1.2));
  state.night += (state.nightTarget - state.night) * (1 - Math.exp(-dt * 1.5));
  state.mouse.x += (state.mouseTarget.x - state.mouse.x) * (1 - Math.exp(-dt * 2));
  state.mouse.y += (state.mouseTarget.y - state.mouse.y) * (1 - Math.exp(-dt * 2));

  if (engine && resumeEl.hidden) engine.render(state, dt);
  fx.frame(dt);
  placeTargets();

  // interlude line inside each passage
  const wi = Math.floor(state.world);
  const f = state.world - wi;
  const io = wi < 4 ? Math.min(1, Math.max(0, (f - 0.58) / 0.08)) * Math.min(1, Math.max(0, (0.9 - f) / 0.08)) : 0;
  if (io > 0 && interlude.dataset.i !== String(wi)) { interlude.textContent = interludes[wi] || ''; interlude.dataset.i = wi; }
  interlude.style.opacity = io * (1 - state.secret);
  interlude.style.transform = `translate(-50%, ${(1 - io) * 12}px)`;

  const active = Math.min(4, Math.round(state.targetWorld - 0.25));
  if (active !== lastNav) {
    navButtons.forEach((b, i) => b.classList.toggle('on', i === active));
    lastNav = active;
  }

  cx += (mx - cx) * 0.25;
  cy += (my - cy) * 0.25;
  cursor.style.transform = `translate(${cx}px, ${cy}px)`;
  requestAnimationFrame(loop);
}

// ================================================================ boot

ScrollTrigger.config({ ignoreMobileResize: true });
let lastW = innerWidth;
window.addEventListener('resize', () => {
  if (Math.abs(innerWidth - lastW) < 2 && engine && engine.mobile) return;
  lastW = innerWidth;
  measure();
  ScrollTrigger.refresh();
});
window.addEventListener('load', measure);

async function boot() {
  const minWait = new Promise((r) => setTimeout(r, reduced ? 200 : 1900));
  try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]); } catch { /* fonts optional */ }
  measure();
  buildFirst();
  requestAnimationFrame(loop);
  await minWait;
  $('#loader').classList.add('done');
  reveals();
  if (location.hash === '#resume') openResume();
  buildWorlds();
}
boot();

console.log(
  '%c ア %c Hello, fellow engineer.\n\nEvery world is real-time 3D built in code with Three.js, no models or photos, and the sounds are synthesized.\nPress ` to open the terminal. Try the Konami code too.',
  'background:#b8322a;color:#f6efe4;font-size:16px;padding:4px 8px;border-radius:4px',
  'font-size:12px;color:#7a6f63',
);
