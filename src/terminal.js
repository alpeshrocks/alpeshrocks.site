import { profile, about, experience, projectCategories, education, quests } from './content.js';

export function createTerminal({ el, input, out, actions }) {
  const history = [];
  let hIndex = 0;

  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  function print(text, cls = '') {
    const div = document.createElement('div');
    if (cls) div.className = cls;
    div.innerHTML = text;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
  }

  const commands = {
    help: () => print([
      '<span class="c">help</span>        this list',
      '<span class="c">whoami</span>      the short version',
      '<span class="c">about</span>       the longer version',
      '<span class="c">experience</span>  where I have worked',
      '<span class="c">projects</span> [n] things I have built, by category',
      '<span class="c">education</span>   where I studied',
      '<span class="c">contact</span>     how to reach me',
      '<span class="c">resume</span>      open the one-page view',
      '<span class="c">goto</span> &lt;n&gt;    walk to world 1 to 5',
      '<span class="c">stamps</span>      passport progress',
      '<span class="c">night</span>       toggle night',
      '<span class="c">zen</span>         hide everything but the view',
      '<span class="c">clear</span>       clear the screen',
      '<span class="c">exit</span>        close the terminal',
    ].join('\n')),
    whoami: () => print(`${profile.name}. ${profile.role} in ${profile.location}.\n${profile.tagline}`),
    about: () => print(about.map(esc).join('\n\n')),
    experience: () => print(experience.map((e) => `<span class="c">${esc(e.company)}</span>  ${esc(e.title)}\n<span class="d">${e.dates} · ${e.place}</span>`).join('\n\n')),
    projects: (n) => {
      const k = parseInt(n, 10);
      const cat = projectCategories[k - 1];
      if (!cat) {
        print(projectCategories.map((c, i) => `<span class="c">${i + 1}</span>  ${esc(c.name)}  <span class="d">(${c.projects.length})</span>`).join('\n') + '\n<span class="d">Type projects &lt;n&gt; to open a category.</span>');
        return;
      }
      print(`<span class="c">${esc(cat.name)}</span>  <span class="d">${esc(cat.blurb)}</span>\n` + cat.projects.map((p) => `· ${esc(p.name)}: ${esc(p.body)}${p.link ? `\n  <a href="${p.link}" target="_blank" rel="noopener">${p.link.replace('https://', '')}</a>` : ''}`).join('\n'));
    },
    education: () => print(education.map((e) => `<span class="c">${esc(e.school)}</span>\n${esc(e.degree)} · GPA ${e.gpa}\n<span class="d">${e.dates}</span>`).join('\n\n')),
    contact: () => print(`email     <a href="mailto:${profile.email}">${profile.email}</a>\ngithub    <a href="${profile.github}" target="_blank" rel="noopener">${profile.github.replace('https://', '')}</a>\nlinkedin  <a href="${profile.linkedin}" target="_blank" rel="noopener">${profile.linkedin.replace('https://www.', '')}</a>`),
    resume: () => { actions.resume(); print('Opening the one-page view.', 'd'); },
    goto: (n) => {
      const k = parseInt(n, 10);
      if (k >= 1 && k <= 5) { actions.goto(k - 1); print(`Walking to world ${k}.`, 'd'); }
      else print('Usage: goto 1 to 5', 'd');
    },
    stamps: () => {
      const got = actions.stamps();
      print(quests.map((q) => `${got.includes(q.id) ? '<span class="c">[印]</span>' : '[  ]'} ${q.name}${got.includes(q.id) ? '' : `  <span class="d">${esc(q.hint)}</span>`}`).join('\n'));
    },
    night: () => { actions.night(); print('The light changes.', 'd'); },
    zen: () => { actions.zen(); print('Press Esc to come back.', 'd'); },
    clear: () => { out.innerHTML = ''; },
    exit: () => close(),
    ls: () => print('about  experience  projects  education  contact  secrets/'),
    'cd': (d) => print(d === 'secrets' || d === 'secrets/' ? 'Permission denied. Some things are found by walking.' : 'You are already exactly where you need to be.', 'd'),
    cat: (f) => (commands[f] ? commands[f]() : print(`cat: ${esc(f || '')}: no such file`, 'd')),
    sudo: (...rest) => print(rest.join(' ').includes('hire') ? 'Permission granted. Use the form at the end of the walk, or type <span class="c">contact</span>.' : 'Nice try.', 'd'),
    tea: () => print('The water is hot. The tea is ready. Sit for a moment.', 'd'),
    matcha: () => commands.tea(),
  };

  function run(line) {
    const [cmd, ...args] = line.trim().split(/\s+/);
    print(`<span class="c">›</span> ${esc(line)}`);
    if (!cmd) return;
    const fn = commands[cmd.toLowerCase()];
    if (fn) fn(...args);
    else print(`command not found: ${esc(cmd)}. Try <span class="c">help</span>.`, 'd');
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = input.value;
      if (v.trim()) { history.push(v); hIndex = history.length; }
      input.value = '';
      run(v);
    } else if (e.key === 'ArrowUp') {
      hIndex = Math.max(0, hIndex - 1);
      input.value = history[hIndex] || '';
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      hIndex = Math.min(history.length, hIndex + 1);
      input.value = history[hIndex] || '';
      e.preventDefault();
    } else if (e.key === 'Escape') {
      close();
    }
    e.stopPropagation();
  });

  let greeted = false;
  function open() {
    el.hidden = false;
    if (!greeted) {
      print('Welcome to the back room. Type <span class="c">help</span> to look around.', 'd');
      greeted = true;
    }
    setTimeout(() => input.focus(), 30);
  }
  function close() { el.hidden = true; }
  function toggle() { (el.hidden ? open : close)(); }

  return { open, close, toggle };
}
