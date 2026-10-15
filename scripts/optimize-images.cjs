// Requires Node.js and cwebp (https://developers.google.com/speed/webp/download).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
process.chdir(path.join(__dirname, '..'));
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('dist/story.js', 'utf8'), context);
const originals = JSON.parse(fs.readFileSync('art-direction.json', 'utf8')).assets;
const hash = bytes => createHash('sha256').update(bytes).digest('hex').slice(0, 12);
function convert(source, stem, resize = []) {
  const bytes = execFileSync('cwebp', ['-quiet', '-q', '86', '-m', '6', '-mt', '-metadata', 'none', ...resize, source, '-o', '-'], { maxBuffer: 10 * 1024 * 1024 });
  const file = `assets/${stem}.${hash(bytes)}.webp`;
  fs.writeFileSync(`dist/${file}`, bytes);
  return file;
}
let before = 0, after = 0;
for (const { page, file } of originals) {
  const output = convert(file, `page-${String(page).padStart(2, '0')}`);
  context.window.STORY[page - 1].artwork = output;
  before += fs.statSync(file).size;
  after += fs.statSync(`dist/${output}`).size;
}
fs.writeFileSync('dist/story.js', `window.ARTICLE = ${JSON.stringify(context.window.ARTICLE, null, 2)};\nwindow.STORY = ${JSON.stringify(context.window.STORY, null, 2)};\n`);
const hero = convert(originals.find(a => a.page === 9).file, 'cover', ['-resize', '960', '0']);
let html = fs.readFileSync('dist/index.html', 'utf8').replace(/(<div class="hero-art"><img )[^>]+>/, `$1src="${hero}" width="960" height="640" decoding="async" alt="中国水彩描绘刘天财骑着脚车沿路谋生的四幅画面" fetchpriority="high">`);
for (const file of ['style.css', 'story.js', 'app.js']) {
  html = html.replace(new RegExp(`(["'])${file.replace('.', '\\.')}[^"']*(["'])`), `$1${file}?v=${hash(fs.readFileSync(`dist/${file}`))}$2`);
}
fs.writeFileSync('dist/index.html', html);
console.log(JSON.stringify({ originalComicBytes: before, optimizedComicBytes: after, reductionPercent: Math.round((1 - after / before) * 100), coverBytes: fs.statSync(`dist/${hero}`).size }));
