# AGENTS.md

给在本仓库工作的智能体看的约束和背景。用途、运行方式见 README.md。

## 技术约束

- **不引入运行时依赖，不加构建步骤。** 页面必须能直接双击 `index.html`（file://）打开。
- **效果文件是普通 `<script>`，不是 ES 模块。** file:// 下 Chrome 会拦截模块加载，所以全部挂在全局 `window.MH` 上。
- `package.json` 只有测试用的 `puppeteer-core`（devDependency），不要往页面里引入 npm 包。
- 颜色只用 CSS 变量 `--paper / --paper2 / --ink / --body / --dim / --rule / --accent / --on-accent`，不在效果里写死颜色（画布通过 `MH.colors(el)` 读变量，并在 `data-theme` / `data-palette` 变化时刷新）。
- 样式分两份：`src/effects.css`（配色变量 + 效果样式 + 整页过渡遮罩，会被“复制完整代码”带走）和 `src/hub.css`（只有实验台版式）。效果需要的样式只能写进 `effects.css`。

## 加一个新效果

1. 在 `src/effects/` 下新建一个文件（一个效果一个文件；共用代码的变体可以放同一个文件），并在 `index.html` 里加 `<script>`。`MH.register` 会用 `document.currentScript` 自动记下文件名（`e.file`），“只复制代码”就只带这个文件。
2. 调用 `MH.register({ id, name, cat, tech, desc, usage?, mount })`。
   - `cat` 只能是：背景 / 过渡 / 翻页 / 片头 / 交互（`index.html` 里的 `CATS` 决定顺序；新增分类要同步改 `CATS` 和 `FILE`）。
   - `mount(el, opts)` 必须返回 `{ pause(), resume(), destroy() }`，`destroy` 要移除自己加的 DOM、监听器和定时器。
3. 画布类效果用 `MH.canvasHost(el, opts, setup)`：它负责建画布、按容器尺寸重设、局部指针坐标、暂停/恢复、主题变化回调和幽灵光标。无画布的交互传 `{ canvas: false }`。
4. 尺寸按 `h.s`（`MH.scaleOf(W)`，全屏约 1、小尺寸约 0.45）缩放，不要写死像素。
5. 必须处理 `MH.still()`（系统“减少动态效果”）：只画静止的一帧，不开循环。
6. 在 `src/prompts.js` 里写这个效果的说明（look / how / params / notes），复制代码时会写进文件开头的注释；踩过的坑写进 notes。
7. 效果用到的样式写进 `effects.css`，前面加 `/* @css 名称 */` 标记，并在 `index.html` 的 `CSS_OF` 里登记这个效果需要哪几段。
8. 运行 `npm run sources` 更新打包的源码，再跑 `npm run smoke`，确认没有错误、没有空白、源码没过期。

## 验证

- `npm run smoke`：无头 Chrome 逐个切换全部效果，报告帧率、是否画出东西、脚本错误，截图在 `scratch/smoke/`。退出码非 0 表示有错误或空白。
- 加 `--night` 看深色，加 `--mobile` 看 390 宽。
- 改了 `hub.css` 布局后，额外确认：`.info` 面板里的按钮没被挤出（面板是固定高度，说明文字最多三行）、手机宽度没有横向溢出。
- `scratch/` 已在 `.gitignore`，临时脚本和截图都放这里。

## 关键设计决策和踩坑

- **复制代码（代码和提示词一体）**：`fullCode()` 拼一个独立 `.html`：开头一段注释由 `header()` 用 `src/prompts.js` 生成（怎么用、效果、原理、参数、注意、代码结构），后面是 `effects.css` 里 base + 这个效果的 `@css` 段、`core.js`、效果自己的文件。注释里不能出现 `-->`（`header()` 会替换）。源码取自 `src/sources.js`（`npm run sources` 生成并提交），因为 `file://` 下浏览器禁止 `fetch` 读本地文件；取不到时才退回 `fetch`。**改了 `src/effects.css`、`src/core.js` 或 `src/effects/` 后必须重新运行 `npm run sources`**，冒烟测试会检查并在过期时失败。内联 `<script>` 里的模板字符串必须写 `<\/script>`，否则会提前结束脚本块（踩过）。CSS 注释里不能出现 `*/`（踩过）。
- **配色**：黑白朱砂（浅色纸白 + 朱砂红 `#C8281E`，深色纯黑 + 亮红 `#FF3B30`），写在 `effects.css` 的 `:root` / `[data-theme=night]` / `[data-theme=day]` 三处，改配色要三处一起改。

- **实验台而不是预览墙**：同一时间只运行一个效果（切换时 `destroy` 旧的），避免二十多个画布同时跑。
- **幽灵光标**（`MH.ghostAt`）：2.5 秒没有真实指针时接管，沿利萨如曲线移动，每 4.2 秒替有 `down` 的效果“点”一下。片头设 `ghostClick: false`，否则会被不断重播。
- **`.info` 固定高度**：否则说明文字长短不同会让舞台高度跳动。
- **拉扯翻页只做竖向拉伸**：每条横切带如果再做横向缩放，同一个字跨几条时边缘会错开成台阶。快照只复制信息、背景透明；切条按整数像素对齐、互不重叠（重叠会让透明条在接缝处把文字画两遍）。
- **拉扯翻页不牵动背景**：试过让抓点附近的点被吸过去，观感干扰，已去掉。
- **深浅过渡的两套实现**：舞台里用两层 DOM（浅色、深色）+ WAAPI，不依赖 View Transitions，缩略尺寸也能跑；整页用 `MH.themeSwitch` + View Transitions。两者共用 `transitions.js` 里同一组形状函数。
- **遮罩类过渡**依赖 `CSS.registerProperty` 注册的 `--vr / --vw`（在 `core.js`），否则自定义属性没法补间。
- **点阵扩散的遮罩**是三层合成：实心圆 ∪（网点 ∩ 前沿环），`mask-composite: add, intersect`（WebKit 写法 `source-over, source-in`）。
- **片头是纯函数** `frame(t)`：可以随时跳到结尾、按任意尺寸重画最后一帧。文字遮罩用离屏画布采样，描边加粗细笔画，否则点阵字太稀。
- 同名 class 冲突踩过坑：别用 `.strip`、`.card` 这类通用名，效果内部的类名加前缀（`pd-`、`tt-`、`gc` 等）。

## 安全边界

- 不提交任何密钥、`.env`、个人数据。页面没有网络请求，也不应加入统计或第三方脚本。
- 页脚的 ICP 备案号是部署到个人子域名的合规要求，不要删除。
- 许可证 MIT。仓库目前私有，不要擅自改可见性，公开由作者决定。

## 回退

- 每个效果是独立文件 / 独立 `register` 调用，出问题时可以先从 `index.html` 去掉对应 `<script>`，或删掉那个 `register` 块。
- 用 `git log` / `git revert` 回退，不要改写已推送的历史。

## 推送

- 远程是 `ssh://git@ssh.github.com:443/lijunyu726/motion-hub.git`：当前网络下 GitHub 的 SSH 22 端口不通，走 443。只在本仓库设置，不改全局 git 配置。
- `docs/` 里的 README 用图由临时脚本截取；改了版式或配色后需要重新截图。
