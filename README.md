<div align="center">

# MOTION HUB

**网页动效合集 · 背景 / 深浅过渡 / 拉扯翻页 / 片头 / 小交互**

原生 JavaScript（Vanilla JS）· Zero Dependencies · No Build · 23 个效果

[在线演示 motion.lijunyu.com.cn](https://motion.lijunyu.com.cn) · [作者官网 lijunyu.com.cn](https://lijunyu.com.cn)

<img src="https://raw.githubusercontent.com/lijunyu726/motion-hub/main/docs/bench-day.jpg" alt="Motion Hub 实验台（浅色）" width="100%">

</div>

---

## 这是什么

做个人网站的时候，一个个“能动的小想法”被做了出来：会漂移的等高线、被鼠标推开的点阵、从点击处扩散的深浅切换、被扯长再拽走的翻页……Motion Hub 把它们收在一起，做成一个**实验台**：

- **左边**是全部效果的名单，按分类编号；
- **右边的舞台**全尺寸实时运行当前效果（固定浅色，不受页面深浅切换影响），没人操作时有一个“幽灵光标”自己演示，一动鼠标就交还给你；
- **下面**是说明和用到的技术、**参数面板**（滑块调间距 / 速度 / 半径 / 时长，片头和乱码可以输入自己的文字，还能换强调色，舞台立刻按新参数重跑），以及“复制 Prompt + 代码”按钮。


<img src="https://raw.githubusercontent.com/lijunyu726/motion-hub/main/docs/bench-night.jpg" alt="Motion Hub 实验台（深色）" width="100%">

## 效果一览

<table>
<tr>
<td width="33%"><img src="https://raw.githubusercontent.com/lijunyu726/motion-hub/main/docs/fx-contour.jpg" alt="等高线"><br><b>等高线</b><br><sub>Perlin 噪声地形 + Marching Squares；鼠标处隆起，点击荡开波纹</sub></td>
<td width="33%"><img src="https://raw.githubusercontent.com/lijunyu726/motion-hub/main/docs/fx-dots.jpg" alt="磁性点阵"><br><b>磁性点阵</b><br><sub>弹簧阻尼；被推开的点变大、变成强调色，点击发出冲击波</sub></td>
<td width="33%"><img src="https://raw.githubusercontent.com/lijunyu726/motion-hub/main/docs/fx-grid.jpg" alt="坐标网格"><br><b>坐标网格</b><br><sub>十字准线 + 实时坐标；经过的格子亮起角标再冷却</sub></td>
</tr>
<tr>
<td><img src="https://raw.githubusercontent.com/lijunyu726/motion-hub/main/docs/fx-theme-dots.jpg" alt="点阵扩散"><br><b>点阵扩散</b><br><sub>深浅切换：前沿是一圈网点，后面才是实心</sub></td>
<td><img src="https://raw.githubusercontent.com/lijunyu726/motion-hub/main/docs/fx-pull.jpg" alt="拉扯翻页"><br><b>拉扯翻页</b><br><sub>信息被扯长再拽走，背景不动；可以按住拖动</sub></td>
<td><img src="https://raw.githubusercontent.com/lijunyu726/motion-hub/main/docs/fx-intro.jpg" alt="点阵拼字片头"><br><b>点阵拼字片头</b><br><sub>点从屏幕外飞进来拼成文字，字幕依次闪过并荡开波纹</sub></td>
</tr>
</table>

| 分类 | 数量 | 效果 |
|---|:---:|---|
| 背景 | 5 | 等高线 · 磁性点阵 · 安静点阵 · 风场 · 坐标网格 |
| 过渡 | 11 | 圆形揭开 · 墨水晕开 · 点阵扩散 · 百叶窗 · 斜切扫过 · 光圈快门 · 液面上涨 · 网点溶解 · 柔光圆 · 翻页 · 淡入淡出 |
| 翻页 | 1 | 拉扯翻页 |
| 片头 | 1 | 点阵拼字片头 |
| 交互 | 5 | 太阳月亮开关 · 边框高光卡片 · 乱码落定 · 跟随信息卡 · 校验链 |

## 几个有意思的实现

- **拉扯翻页**：把要被扯走的那一页复制一份、横切成几十条，每条按离“抓点”的距离做指数衰减的竖向位移和拉伸，拼起来就是被拉长的样子。只做竖向——横向一缩放，同一个字跨几条时边缘就会错成台阶。
- **点阵扩散**：三层 CSS 遮罩合成，`实心圆 ∪（网点 ∩ 前沿环）`，半径用 `@property` 注册后交给 Web Animations 补间。
- **片头是纯函数**：画面完全由时间 `t` 决定，可以随时跳到结尾、重播、在任意尺寸重画最后一帧，最后一帧直接当首屏背景“定格”。
- **深浅过渡两套实现**：舞台里叠两层小页面，用 WAAPI 做动画，任何尺寸都能跑；整页用 View Transitions（`MH.bindThemeToggle`）。两者共用同一组形状函数。

## 在你的项目里用

在实验台里选中一个效果，在参数面板里调到满意，点 **复制 Prompt + 代码**。复制出来的是一个独立的 `.html` 文件，代码和提示词（Prompt）是一体的：

- **存下来双击就能运行**，只包含这个效果本身和它用到的样式；
- **文件开头的注释就是写给 AI 的说明**：效果长什么样、实现原理、可以调的参数、要注意的坑、代码结构；
- **带着你调好的参数**：文件末尾的 `mount(el, {…})` 里就是你在面板上调的值，打开就是你看到的样子。

```html
<!--
  「等高线」 · Motion Hub · MIT License
  【怎么用】把整个文件交给 AI，再说一句你的技术栈和想要的调整……
  【效果】【实现原理】【可以调的参数】【注意】【代码结构】
-->
<html> … 可以直接运行的代码 … </html>
```

把整个文件交给 Claude、ChatGPT、Cursor 等，说一句“改写成 React 组件，放在首屏当背景，颜色换成我的品牌色”，它就能按你的项目改。原理和踩过的坑都写在里面，比只给代码更容易改对。

颜色全部来自 CSS 变量 `--paper / --ink / --dim / --rule / --accent`，换成你自己的配色即可。

<details>
<summary><b>目录结构</b></summary>

```
index.html              实验台（直接双击打开即可）
src/core.js             注册表 + 公共工具（噪声、缓动、画布宿主、幽灵光标）
src/effects.css         配色变量 + 各效果样式，按 @css 标记分段
src/hub.css             实验台版式
src/effects/            一个效果一个文件（点阵和安静点阵共用 dots.js，11 种过渡共用 transitions.js）
src/prompts.js          每个效果的说明：效果、原理、参数、注意事项（复制代码时写进文件开头的注释）
src/sources.js          打包好的源码字符串（复制代码用，npm run sources 生成）
tools/smoke.mjs         冒烟测试
tools/build-sources.mjs 生成 src/sources.js
docs/                   README 用图
```

</details>

<details>
<summary><b>测试</b></summary>

```bash
npm install                         # 只装测试用的 puppeteer-core
npm run smoke                       # 浅色、桌面尺寸
node tools/smoke.mjs --night --mobile
```

无头 Chrome 逐个打开全部效果，检查脚本错误、是否画出内容和帧率。需要本机安装 Chrome，路径不同时用环境变量 `CHROME` 指定。

</details>

<details>
<summary><b>浏览器支持</b></summary>

- 背景、翻页、片头、小交互：近两年的 Chrome / Edge / Safari / Firefox。
- 遮罩类过渡依赖 `@property`（Firefox 128+），不支持时直接切换。
- 整页深浅切换依赖 View Transitions（Chrome / Edge 111+、Safari 18+），不支持时直接切换。
- 系统开启“减少动态效果”时，所有效果只显示静止画面。

</details>

## 作为 Agent Skill 使用

`skill/motion-hub/` 是一个 [Agent Skill](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)：`SKILL.md` 是给 AI 的入口说明和全部效果的索引，`effects/` 里是 23 个“Prompt + 代码”单文件（和实验台复制出来的一样，默认参数）。装好以后直接对 AI 说“给首页加一个等高线背景”“深浅切换换成点阵扩散”，它会自己挑效果、读原理、按你的技术栈改写。

- **一行安装**（需要 Node.js 18+）：

  ```bash
  npx github:lijunyu726/motion-hub              # 装到 ~/.claude/skills/（所有项目可用）
  npx github:lijunyu726/motion-hub --project    # 装到当前项目的 .claude/skills/
  npx github:lijunyu726/motion-hub --dir <路径>  # 其他支持 Agent Skills 的工具：装到它的 skills 目录
  ```
- **手动安装**：下载 https://motion.lijunyu.com.cn/skill/motion-hub.zip ，解压到上面的目录。实验台右上角的「Skill」里也有这两种方式。

**装一次就行**：Agent 每次使用时会先从 https://motion.lijunyu.com.cn/skill/motion-hub/index.json 取最新的效果目录，新加的效果直接在线下载，不用重新安装 Skill；连不上网时用 Skill 自带的副本。源码改动后用 `npm run skill` 重新生成（部署脚本会自动生成并打包）。

## 参与

欢迎提 Issue 和 Pull Request，步骤见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

[MIT + Commons Clause](LICENSE)：可以免费用在任何项目里，包括商业项目；但不能把这些效果本身拿去卖（例如打包成付费模板或组件库）。
