// 冒烟测试：用本机 Chrome 无头打开 index.html，逐个切换全部效果，检查：
//   1. 页面没有脚本错误
//   2. 舞台上确实画出了东西（截图后统计非背景色像素）
//   3. 动画帧率（每个效果跑 1 秒）
// 截图写到 scratch/smoke/（已在 .gitignore 里）。用法：npm run smoke  或  node tools/smoke.mjs [--night] [--mobile]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'scratch', 'smoke'); fs.mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const night = process.argv.includes('--night'), mobile = process.argv.includes('--mobile');

// 打包的源码是否过期：src/sources.js 必须和当前源文件一致（否则“复制完整代码”会给出旧代码）
const { render } = await import('./build-sources.mjs');
const stale = fs.readFileSync(path.join(root, 'src/sources.js'), 'utf8') !== render();
if (stale) console.log('⚠ src/sources.js 已过期，请运行 npm run sources');

const browser = await puppeteer.launch({ executablePath: CHROME });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => m.type() === 'error' && errors.push(m.text()));
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: night ? 'dark' : 'light' }]);
await page.setViewport(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
await page.goto('file://' + path.join(root, 'index.html'), { waitUntil: 'load' });
// 默认浅色、不跟随系统；--night 时直接存深色设置
await page.evaluate(n => { if (n) localStorage.setItem('mh-theme', 'night'); else localStorage.removeItem('mh-theme'); }, night);
await page.reload({ waitUntil: 'load' });

const ids = await page.evaluate(() => [...document.querySelectorAll('#list button')].map(b => b.dataset.id));
const rows = [];
for (const id of ids) {
  await page.evaluate(id => { location.hash = id; }, id);
  await new Promise(r => setTimeout(r, 300));
  // 指针在舞台上划一下，触发交互
  const box = await (await page.$('#stage')).boundingBox();
  for (let i = 0; i < 12; i++) { await page.mouse.move(box.x + box.width * (.3 + i * .03), box.y + box.height * (.4 + i * .01)); await new Promise(r => setTimeout(r, 16)); }
  await page.mouse.click(box.x + box.width * .5, box.y + box.height * .5);
  const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 1000 ? requestAnimationFrame(f) : r(n); }; requestAnimationFrame(f); }));
  const file = path.join(out, `${id}${night ? '-night' : ''}${mobile ? '-m' : ''}.png`);
  await page.screenshot({ path: file, clip: box });
  // 画出东西了吗：把舞台截图画到画布上，统计和左上角背景色差别明显的像素比例
  const ink = await page.evaluate(async src => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data, [r0, g0, b0] = [d[0], d[1], d[2]];
    let k = 0; for (let i = 0; i < d.length; i += 16) if (Math.abs(d[i] - r0) + Math.abs(d[i + 1] - g0) + Math.abs(d[i + 2] - b0) > 40) k++;
    return k / (d.length / 16);
  }, 'data:image/png;base64,' + fs.readFileSync(file).toString('base64'));
  rows.push({ id, fps, ink: +(ink * 100).toFixed(2) });
}
console.table(rows);
const blank = rows.filter(r => r.ink < .2);
console.log('总数', rows.length, '｜疑似空白', blank.map(r => r.id).join(', ') || '无', '｜错误', errors.length ? errors : '无');
console.log('横向溢出', await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
await browser.close();
process.exit(errors.length || blank.length || stale ? 1 : 0);
