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
- **参数面板**：效果用 `params: [{ k, label, type: 'range'|'text'|'lines', def, min, max, step, unit }]` 声明可调参数，`MH.register` 会把 `def` 补进 `mount` 的 `opts`，效果代码直接读 `opts.k`。实验台据此生成控件，改动后重新挂载效果（不做逐帧热更新）；强调色是所有效果共用的，设在舞台的 `--accent` 上。“复制 Prompt + 代码”会把当前参数写进文件末尾的 `mount(…, {…})`，文件头【opts 参数】列出所有参数和默认值。加新效果时要给它写 `params`。
- **风格**：Acid（2026-10-04 起）。作者要求和个人网站（暖纸色 + 朱红 + 衬线、刊物感）明显不同，用来展示不同的设计能力。配色：浅色暖灰 `#F1F0EC` + 紫罗兰 `#6B4EFF`，深色近黑 `#111113` + 酸橙绿 `#C6F21E`；`--hi` 是另一种高亮色（标签、小圆点）。写在 `effects.css` 的 `:root` / `[data-theme=night]` / `[data-theme=day]` 三处，改配色要三处一起改。实验台界面用无衬线粗体（`hub.css` 的 `--ui`）、大圆角面板、胶囊按钮；效果演示里的文字仍用 effects.css 的字体变量。

- **深浅切换：过渡播完之前再点不生效**：试过“点一次切一次”（打断上一次过渡），作者觉得连点时被打断很生硬，改回等播完。舞台演示用 `settle` 判断是否在播；整页用 `MH.themeSwitch` 里的 `active`。
- **默认浅色、预览舞台固定浅色**：页面默认浅色，不跟随系统（用户切过才记住 `mh-theme`）；`#stage` 上有 `data-theme="day"`，网站切到深色时预览不变。`MH.colors()` 的深浅以离元素最近的 `data-theme` 为准，不能只看有没有祖先是 night。
- **实验台的深浅开关用专用的“胶囊展开”**（写在 `index.html` 里，样式在 `hub.css` 的 `data-hubfx`）：作者要求不用名单里那 11 个过渡，也不要让它跟着舞台上选中的效果变。过渡播完之前再点不生效；WAAPI 动画必须带 `fill: 'forwards'`，否则结束时闪回旧颜色。
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
- 许可证 MIT + Commons Clause（参照 React Bits）：任何项目都能用，但不能售卖效果本身。仓库 2026-10-04 由作者决定公开；不要擅自改可见性。

## Agent Skill

- `skill/motion-hub/` 由 `npm run skill`（`tools/build-skill.mjs`）生成，进仓库；不要手改，改效果 / 参数 / `prompts.js` 后重新生成。单文件是用无头 Chrome 打开实验台、调用页面里的 `fullCode()` 生成的，和“复制 Prompt + 代码”同一套逻辑（默认参数、不带强调色）。
- 设计决策：Skill 自带全部代码，使用时不联网、不访问本站或仓库（作者确认）。原因：有的 Agent 运行环境不能联网；从网上取指令有被篡改的风险。
- 部署时会重新生成并打成 `skill/motion-hub.zip`（不进仓库）放到网站上，实验台右上角「Skill ↓」下载。
- 2026-10-04 用 Claude Code（`claude -p`）实测过：把 Skill 放进 `.claude/skills/`，让它“给首屏加等高线背景、强调色 #ff6600”，它会读 Skill 里的 contour 文件并改进页面，页面运行无报错。

## 部署（2026-10-04 上线 https://motion.lijunyu.com.cn）

- `bash deploy/deploy.sh`：先检查 `src/sources.js` 没过期，再用 rsync 只同步 `index.html`、`favicon.svg`、`robots.txt`、`LICENSE`、`src/` 到服务器 `/www/wwwroot/motion.lijunyu.com.cn/`（ssh 别名 `tc`）。其他文件（文档、tools、docs、node_modules、scratch）都不传；新加了网页要用的顶层文件，要同时加进脚本的 `--include`。
- nginx 由宝塔管理（`/www/server/nginx/sbin/nginx`，改完先 `-t` 再 `-s reload`），配置 `/www/server/panel/vhost/nginx/motion.lijunyu.com.cn.conf`，副本在 `deploy/nginx-motion.lijunyu.com.cn.conf`。手写配置，宝塔“网站”列表里看不到。
- 证书：Let's Encrypt，用宝塔 `class/acme_v2.py --type http --path /www/wwwroot/panel_ssl_site` 签发（命令行运行要加 `PYTHONPATH=/www/server/panel:/www/server/panel/class`），复制到 `/www/server/panel/vhost/cert/motion.lijunyu.com.cn/`。宝塔每天的续签任务会替换 `vhost/cert/` 下同域名的证书并重载 nginx（看代码得出，还没实际经历过一次续签）。80 端口的 `/.well-known/acme-challenge/` 指向 `panel_ssl_site`，别删。
- HTML / JS / CSS 是 `no-cache`（每次确认，没变返回 304），图片缓存 7 天。

## 回退

- 每个效果是独立文件 / 独立 `register` 调用，出问题时可以先从 `index.html` 去掉对应 `<script>`，或删掉那个 `register` 块。
- 用 `git log` / `git revert` 回退，不要改写已推送的历史。

- 线上回退：`git revert` 后重新 `bash deploy/deploy.sh`；整站下线：删掉 nginx 配置 `motion.lijunyu.com.cn.conf` 后 reload，再到 DNSPod 删掉 `motion` 记录。

## 推送

- 远程是 `ssh://git@ssh.github.com:443/lijunyu726/motion-hub.git`：当前网络下 GitHub 的 SSH 22 端口不通，走 443。只在本仓库设置，不改全局 git 配置。
- `docs/` 里的 README 用图由临时脚本截取；改了版式或配色后需要重新截图。
