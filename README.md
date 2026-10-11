# alpesh.me

Personal site of Alpesh Shinde. A scroll-driven walk through five real-time 3D worlds:
a Kyoto tea garden, Yosemite Valley, the Zhangjiajie pillars, the Golden Gate Bridge, and a
samurai sunset. Everything is generated in code with Three.js. There are no models, photos,
or audio files.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. Add `?w=2.3` to pin the scenery to a world position while tuning.

## Edit the words

All copy lives in `src/content.js`: profile, about, experience, project categories, education, extras,
quest hints, and the secret note. The page and the recruiter view both render from it.

## Layout

- `src/main.js`: page markup, scroll-to-world mapping, quests, overlays, contact form
- `src/three/engine.js`: renderer, ink transition, light shafts, bloom, adaptive resolution
- `src/three/worlds/*.js`: one file per world
- `src/three/parts.js`: sky, trees, grass, clouds, particles, props
- `src/audio.js`: synthesized wind, koto plucks, temple bell
- `src/terminal.js`: the hidden terminal (press the backtick key)

## Deploy

Pushing to `main` builds and publishes to GitHub Pages through
`.github/workflows/deploy.yml`. In the repository settings, set Pages to deploy from
GitHub Actions. For a custom domain, add `public/CNAME` containing the domain.

## Contact form

Set `WEB3FORMS_KEY` in `src/content.js` to a Web3Forms access key. Without a key, the
form opens the visitor's mail app instead.

## Resume PDF

Put the public resume at `public/resume.pdf`. The recruiter view links to it.
