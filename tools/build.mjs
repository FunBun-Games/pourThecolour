// Builds two outputs from src/game.html + levels/levels.json:
//   www/index.html (+ platform.js, fonts) — the iOS app (Capacitor webDir)
//   dist/prototype.html                   — the single-file web prototype (shared as a Claude artifact)
// Usage: node tools/build.mjs [--release]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const release = process.argv.includes('--release');

// levels: keep only what the game needs
const levels = JSON.parse(rd('levels/levels.json')).map((l) => {
  const o = { tubes: l.tubes, minMoves: l.minMoves, hard: l.hard ? 1 : 0 };
  if (l.lock) o.lock = l.lock;
  if (l.hidden && l.hidden.flat().some(Boolean)) o.hidden = l.hidden;
  return o;
});
// /*@include parts/x.js*/ markers pull in source parts (kept as separate files to stay readable)
const game = rd('src/game.html')
  .replace(/\/\*@include ([\w/.-]+)\*\//g, (_, p) => rd('src/' + p))
  .replace('__LEVELS__', JSON.stringify(levels));

// env: release builds switch debug tools off; ad unit ids come from src/env.json
const env = JSON.parse(rd('src/env.json'));
if (release) env.debug = false;
// CI (Codemagic) passes the real AdMob unit ids and the privacy-policy URL as environment variables
const E = process.env;
if (E.ADMOB_BANNER_ID && E.ADMOB_INTERSTITIAL_ID && E.ADMOB_REWARDED_ID) {
  env.admob = { testing: false, appId: E.ADMOB_APP_ID, banner: E.ADMOB_BANNER_ID, interstitial: E.ADMOB_INTERSTITIAL_ID, rewarded: E.ADMOB_REWARDED_ID };
}
if (E.PRIVACY_URL) env.privacyUrl = E.PRIVACY_URL;

/* ---------- app ---------- */
const www = path.join(root, 'www');
fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(path.join(www, 'fonts'), { recursive: true });
const fonts = [
  ['Unbounded', 500, 'unbounded', ['latin', 'cyrillic']], ['Unbounded', 700, 'unbounded', ['latin', 'cyrillic']],
  ['Manrope', 500, 'manrope', ['latin', 'cyrillic']], ['Manrope', 600, 'manrope', ['latin', 'cyrillic']], ['Manrope', 700, 'manrope', ['latin', 'cyrillic']],
];
let faces = '';
for (const [family, weight, pkg, subsets] of fonts) {
  for (const sub of subsets) {
    const file = `${pkg}-${sub}-${weight}-normal.woff2`;
    fs.copyFileSync(path.join(root, 'node_modules/@fontsource', pkg, 'files', file), path.join(www, 'fonts', file));
    const range = sub === 'cyrillic' ? 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116' : 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
    faces += `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(fonts/${file}) format('woff2');unicode-range:${range}}\n`;
  }
}
const appHtml = `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="format-detection" content="telephone=no">
<style>
${faces}html{height:100%;box-sizing:border-box;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px);background:#191c35;color-scheme:dark}
body{margin:0;height:100%;font:14px system-ui;-webkit-touch-callout:none;-webkit-text-size-adjust:100%}
[hidden]{display:none!important}
</style>
<script src="platform.js"></script>
</head>
<body>
${game.replace('<!--FONTS-->', '')}
</body>
</html>
`;
fs.writeFileSync(path.join(www, 'index.html'), appHtml);

await build({
  entryPoints: [path.join(root, 'src/platform.js')],
  bundle: true,
  format: 'iife',
  target: ['safari15'],
  minify: release,
  outfile: path.join(www, 'platform.js'),
  define: { __APP_ENV__: JSON.stringify(env) },
  logLevel: 'warning',
});

/* ---------- web prototype ---------- */
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const googleFonts = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700&family=Manrope:wght@500;600;700&display=swap">`;
fs.writeFileSync(path.join(root, 'dist/prototype.html'), game.replace('<!--FONTS-->', googleFonts));

console.log(`built ${levels.length} levels → www/ (${release ? 'release' : 'debug'}, ads: ${env.admob && env.admob.testing ? 'TEST ids' : 'live ids'}) and dist/prototype.html`);
