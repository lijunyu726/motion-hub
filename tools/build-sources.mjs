// 生成 src/sources.js：把“复制完整代码”要用到的源文件内容存成字符串。
// 这样直接双击 index.html（file://）时也能拼出完整代码——浏览器不允许 file:// 页面用 fetch 读其他文件。
// 改了 src/ 下任何被打包的文件后都要重新运行：npm run sources（冒烟测试会检查是否过期）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FILES = ['src/effects.css', 'src/core.js', 'src/effects/backgrounds.js', 'src/effects/transitions.js', 'src/effects/pull.js', 'src/effects/intro.js', 'src/effects/ui.js'];

export function render() {
  const map = Object.fromEntries(FILES.map(f => [f, fs.readFileSync(path.join(root, f), 'utf8')]));
  return `// 自动生成，不要手改。来源：tools/build-sources.mjs（npm run sources）\nwindow.MH_SOURCES = ${JSON.stringify(map, null, 0)};\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(path.join(root, 'src/sources.js'), render());
  console.log('已生成 src/sources.js');
}
