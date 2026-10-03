# Motion Hub

网页动效合集：背景、深浅切换过渡、拉扯翻页、片头与小交互。原生 JavaScript，没有任何运行时依赖，不需要构建。

打开 `index.html` 就是一个“实验台”：左边是全部效果的名单，右边的舞台上全尺寸实时运行当前效果，下面是说明和接入代码。没人操作时，舞台上有一个“幽灵光标”自己演示交互；一动鼠标就交还给你。

## 效果一览（23 个）

| 分类 | 效果 | 技术 |
|---|---|---|
| 背景 | 等高线 | Canvas · Perlin 噪声 · Marching Squares |
| 背景 | 磁性点阵 | Canvas · 弹簧阻尼 |
| 背景 | 安静点阵 | Canvas · 弹簧阻尼（阅读版） |
| 背景 | 风场 | Canvas · 粒子 · 噪声流场 |
| 背景 | 坐标网格 | Canvas · 热度衰减 |
| 过渡 | 圆形揭开、墨水晕开、斜切扫过、光圈快门、液面上涨 | WAAPI · clip-path |
| 过渡 | 点阵扩散、百叶窗、网点溶解、柔光圆 | CSS 遮罩 · `@property` |
| 过渡 | 翻页 | WAAPI · 3D 变换 |
| 过渡 | 淡入淡出（对照） | WAAPI |
| 翻页 | 拉扯翻页 | DOM 切条 · 指数衰减位移 · 指针拖动 |
| 片头 | 点阵拼字片头 | Canvas · 纯函数时间轴 · 文字采样 |
| 交互 | 太阳月亮开关、边框高光卡片、乱码落定、跟随信息卡、校验链 | SVG · CSS 遮罩 · rAF |

## 运行

```bash
# 直接双击 index.html 即可（file:// 也能运行，效果文件都是普通 <script>）
open index.html

# 或者起一个本地静态服务器
python3 -m http.server 8080   # 然后访问 http://localhost:8080
```

网址可以带上效果 id，直接打开某一个，例如 `index.html#theme-dots`。

## 在自己的页面里用

每个效果都是 `MH.register({...})` 登记的一个对象，`mount(容器, 选项)` 返回 `{ pause, resume, destroy }`。容器需要有宽高。

```html
<div id="fx" style="height:420px"></div>
<link rel="stylesheet" href="src/hub.css">
<script src="src/core.js"></script>
<script src="src/effects/backgrounds.js"></script>
<script>
  const fx = MH.effects.find(e => e.id === 'contour').mount(document.getElementById('fx'), {});
  fx.resume();
</script>
```

整页深浅切换用 `MH.themeSwitch(事件, 真正切换主题的函数, 效果名)`，基于 View Transitions；浏览器不支持或系统开启“减少动态效果”时直接切换，不做动画：

```js
button.onclick = e => MH.themeSwitch(e, () => {
  const root = document.documentElement;
  root.dataset.theme = root.dataset.theme === 'night' ? 'day' : 'night';
}, 'dots'); // circle / ink / dots / blinds / slice / iris / wave / halftone / soft / flip / fade
```

颜色全部来自 CSS 变量 `--paper / --ink / --dim / --rule / --accent`，换配色只改变量。

## 目录

```
index.html              实验台（首页）
src/core.js             注册表 + 公共工具（噪声、缓动、画布宿主、幽灵光标）
src/hub.css             配色变量、实验台布局、各效果样式、整页过渡遮罩
src/effects/
  backgrounds.js        等高线、磁性点阵、安静点阵、风场、坐标网格
  transitions.js        11 种深浅过渡 + MH.themeSwitch
  pull.js               拉扯翻页
  intro.js              点阵拼字片头
  ui.js                 太阳月亮开关、边框高光卡片、乱码落定、跟随信息卡、校验链
tools/smoke.mjs         冒烟测试（无头 Chrome 逐个打开全部效果）
```

## 测试

```bash
npm install          # 只装测试用的 puppeteer-core
npm run smoke        # 浅色、桌面尺寸
node tools/smoke.mjs --night --mobile
```

冒烟测试检查三件事：没有脚本错误、舞台上画出了东西、动画帧率。截图在 `scratch/smoke/`（不进仓库）。需要本机安装 Chrome；路径不同时用环境变量 `CHROME` 指定。

## 浏览器支持

- 背景、翻页、片头、小交互：近两年的 Chrome / Edge / Safari / Firefox。
- 舞台里的深浅过渡用 CSS 遮罩和 `@property`，Firefox 128 以前不支持 `@property`，遮罩类过渡会直接切换。
- `MH.themeSwitch` 依赖 View Transitions（Chrome / Edge 111+、Safari 18+），其他浏览器直接切换。
- 系统开启“减少动态效果”时，所有效果都只显示静止画面。

## 部署

纯静态文件，放到任意静态服务器即可。计划部署到个人域名的子域名（尚未部署）。

## 许可证

[MIT](LICENSE) © 2026 LJY
