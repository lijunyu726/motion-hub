# 参与 Motion Hub

欢迎提问题、提新效果，也欢迎直接提交代码。

## 提问题 / 提想法

在 Issues 里选“问题反馈”或“新效果建议”。问题反馈请写清是哪个效果、什么浏览器，能附截图或录屏最好。

## 提交一个新效果

1. Fork 后新建分支。
2. 在 `src/effects/` 下新建一个文件，用 `MH.register({ id, name, cat, tech, desc, mount })` 登记；`mount(el, opts)` 返回 `{ pause, resume, destroy }`。画布类效果用 `MH.canvasHost`，详见 [AGENTS.md](AGENTS.md) 的“加一个新效果”。
3. 在 `index.html` 里加 `<script>`；样式写进 `src/effects.css` 并加 `/* @css 名称 */` 标记，在 `index.html` 的 `CSS_OF` 里登记。
4. 在 `src/prompts.js` 里写这个效果的说明：效果、原理、可调参数、注意事项（复制代码时会写进文件开头）。
5. 运行：

   ```bash
   npm install
   npm run sources   # 更新打包的源码
   npm run smoke     # 冒烟测试：不能有报错、空白或过期的源码
   ```

6. 提交 Pull Request，附一张截图或一段录屏。

## 约定

- 不引入运行时依赖，不加构建步骤；双击 `index.html` 必须能用。
- 颜色只用 CSS 变量，不写死。
- 必须支持“减少动态效果”（`MH.still()` 时只画静止的一帧）。
- 提交的代码按本仓库的许可证（MIT + Commons Clause）发布。
