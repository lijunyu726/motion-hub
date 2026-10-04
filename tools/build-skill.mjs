// 生成 Agent Skill：skill/motion-hub/
//   SKILL.md          给 AI 的入口说明：什么时候用、怎么挑效果、怎么改进项目、全部效果的索引
//   effects/<id>.html 每个效果一个“Prompt + 代码”单文件，和实验台“复制 Prompt + 代码”拿到的完全一样（默认参数）
// 单文件直接用实验台页面里的 fullCode() 生成（无头 Chrome 打开 index.html），所以两边永远一致，不另写一套导出逻辑。
// 用法：npm run skill   （改了效果、参数或提示词后重新运行；deploy 会检查它是否过期）
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'skill', 'motion-hub');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await puppeteer.launch({ executablePath: CHROME });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('file://' + path.join(root, 'index.html'), { waitUntil: 'load' });
const data = await page.evaluate(async () => {
  const list = MH.effects.slice().sort((a, b) => CATS.indexOf(a.cat) - CATS.indexOf(b.cat));
  const items = [];
  for (const e of list) items.push({
    id: e.id, name: e.name, cat: e.cat, catEn: CAT_EN[e.cat], tech: e.tech, desc: e.desc,
    params: (e.params || []).map(({ k, label, type, def, min, max, unit }) => ({ k, label, type, def, min, max, unit })),
    html: await fullCode(e),
  });
  return items;
});
await browser.close();
if (errors.length) { console.error('页面报错：', errors); process.exit(1); }

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'effects'), { recursive: true });
for (const e of data) fs.writeFileSync(path.join(out, 'effects', e.id + '.html'), e.html);

const paramText = e => e.params.length
  ? e.params.map(p => `\`${p.k}\`（${p.label}${p.type === 'range' ? `，${p.min}–${p.max}${p.unit || ''}` : p.type === 'lines' ? '，多行文字 / 数组' : '，文字'}，默认 ${JSON.stringify(p.def).replace(/\\n/g, ' / ')}）`).join('；')
  : '无';
const cats = [...new Set(data.map(e => e.cat))];
const index = cats.map(c => {
  const es = data.filter(e => e.cat === c);
  return `### ${c} · ${es[0].catEn}\n\n` + es.map(e => `- **${e.name}**（\`${e.id}\`，文件 \`effects/${e.id}.html\`）：${e.desc}\n  - 技术：${e.tech}\n  - 参数：${paramText(e)}`).join('\n');
}).join('\n\n');

const skill = `---
name: motion-hub
description: 网页动效合集（Motion Hub，${data.length} 个效果）。用户想给网站加动效时使用：动态背景（等高线、磁性点阵、风场粒子、坐标网格）、深浅色切换过渡（圆形揭开、点阵扩散、百叶窗、液面上涨等，基于 View Transitions）、拉扯翻页、点阵拼字片头、乱码文字、跟随光标的信息卡、边框高光卡片、太阳月亮开关等。Use when the user asks to add a web animation, animated background, dark-mode toggle transition, page transition, intro animation or micro-interaction to a web project (vanilla JS, React, Vue, etc.). 每个效果都是原生 JavaScript、零依赖的单文件，自带实现原理和可调参数。
---

# Motion Hub 网页动效

这个 Skill 带着 ${data.length} 个网页动效的完整源码，每个效果一个独立的 \`.html\` 文件（\`effects/<id>.html\`）。文件开头的注释是这个效果的说明（效果、实现原理、可调参数、注意事项、代码结构），后面是能直接运行的代码。在线预览：https://motion.lijunyu.com.cn

## 怎么用

1. **挑效果**：根据用户的描述，在下面的索引里选一个或几个。拿不准时把候选的名字和一句话说明给用户看，或者请用户去在线预览页对比。
2. **读文件**：打开对应的 \`effects/<id>.html\`，先读开头注释里的【实现原理】【注意】，再看代码。
3. **放进用户的项目**，按用户的技术栈改写，不要原样塞一个独立 HTML：
   - 需要的部分：\`<style>\` 里的配色变量和这个效果的样式、MH 核心（第一段 \`<script>\`）、效果本身（第二段 \`<script>\`）。MH 核心也可以只保留这个效果用到的函数。
   - React / Vue 等框架：在挂载时调用 \`mount(容器, opts)\`，卸载时调用返回值的 \`destroy()\`；容器要有确定的宽高。
   - 颜色全部来自 CSS 变量（\`--paper\` 背景、\`--ink\` 正文、\`--dim\` 次要、\`--rule\` 分隔线、\`--accent\` 强调色），换成项目自己的颜色。
   - 参数通过 \`mount\` 的第二个参数 \`opts\` 传，不传就用默认值（见下面索引里每个效果的“参数”）。
4. **保留这些行为**：\`prefers-reduced-motion\` 时只显示静止画面；组件卸载时停掉动画循环、移除监听；深浅切换过渡在播完之前忽略重复点击。

## 许可

MIT + Commons Clause：可以免费用在任何项目里（包括商业项目），可以修改；不能把这些效果本身拿去售卖。作者：LJY（李俊宇），https://lijunyu.com.cn

## 效果索引

${index}
`;
fs.writeFileSync(path.join(out, 'SKILL.md'), skill);
console.log(`已生成 skill/motion-hub/：SKILL.md + ${data.length} 个效果文件`);
