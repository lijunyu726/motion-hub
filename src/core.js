// Motion Hub 核心：注册表 + 公共工具。所有效果文件都是普通 <script>（不是 ES 模块），
// 这样直接双击 index.html（file://）也能运行。每个效果调用 MH.register({...}) 把自己登记进来。
//
// 效果对象的约定：
//   id      唯一标识（小写短横线）
//   name    中文名
//   cat     分类：背景 / 过渡 / 翻页 / 片头 / 交互
//   tech    用到的技术（展示用）
//   desc    一句话说明
//   mount(el, opts) → { pause(), resume(), destroy() }
//     el 是一个已经有尺寸的容器；opts.expanded 为 true 表示全屏体验（关掉幽灵光标、允许滚轮等）
window.MH = (() => {
  const effects = [];
  // 记下效果来自哪个文件（复制代码时只带这个文件）
  const register = e => { const src = document.currentScript && document.currentScript.src; e.file = e.file || (src ? src.split('/').pop() : ''); effects.push(e); };
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = {
    in: t => t * t * t,
    out: t => 1 - (1 - t) ** 3,
    inOut: t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2,
    back: t => { const c = 1.4; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; },
  };
  const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // 二维 Perlin 噪声，seed 决定排列表
  function perlin(seed = 1) {
    const P = new Uint8Array(512), p = [...Array(256).keys()];
    let s = seed;
    for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) P[i] = p[i & 255];
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10), grad = (h, x, y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
    return (x, y) => {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
      const u = fade(x), v = fade(y), a = P[X] + Y, b = P[X + 1] + Y;
      const l1 = grad(P[a], x, y) + u * (grad(P[b], x - 1, y) - grad(P[a], x, y));
      const l2 = grad(P[a + 1], x, y - 1) + u * (grad(P[b + 1], x - 1, y - 1) - grad(P[a + 1], x, y - 1));
      return l1 + v * (l2 - l1);
    };
  }

  // 画布按设备像素比放大，画的时候仍用 CSS 像素坐标
  function fit(cv, w, h) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return ctx;
  }
  // 从容器读主题色（--paper / --ink / --dim / --rule / --accent）
  function colors(el) {
    const cs = getComputedStyle(el), v = n => cs.getPropertyValue(n).trim();
    const t = el.closest('[data-theme]');
    return { paper: v('--paper'), ink: v('--ink'), dim: v('--dim'), rule: v('--rule'), accent: v('--accent'), night: !!t && t.dataset.theme === 'night' };
  }
  // 一段时长 ms 的补间，fn(k) 中 k 从 0 到 1；减少动态效果时直接到终点
  const tween = (ms, fn) => new Promise(res => {
    if (still()) { fn(1); return res(); }
    const t0 = performance.now();
    const f = now => { const k = clamp((now - t0) / ms); fn(k); k < 1 ? requestAnimationFrame(f) : res(); };
    requestAnimationFrame(f);
  });
  // 尺寸缩放系数：全屏约 1，缩略图约 0.45，让小画面像“整页缩小”而不是挤满细节
  const scaleOf = W => clamp(W / 1200, .45, 1);

  // 幽灵光标：没人操作时，沿一条利萨如曲线在容器里慢慢移动，让缩略图自己演示交互
  const ghostAt = (now, W, H, seed = 0) => {
    const t = now / 1000 + seed * 7;
    return { x: W * (.5 + .32 * Math.sin(t * .55) * Math.cos(t * .21)), y: H * (.5 + .3 * Math.sin(t * .83 + 1.3)) };
  };

  // 效果宿主：（可选）建画布、跟随尺寸、换算局部指针坐标、管动画循环和暂停。
  // setup(h) 返回 { resize(W,H), frame(now), down(x,y), theme(), ghostClick }，h 提供 ctx / W / H / P / s / colors()
  // ghostClick: false 表示幽灵光标不替它“点击”（例如片头，点一下会重播）
  function canvasHost(el, opts, setup, { canvas = true } = {}) {
    const cv = canvas ? document.createElement('canvas') : null;
    if (cv) { cv.className = 'mh-canvas'; el.append(cv); }
    let ctx, W = 0, H = 0, raf = 0, running = false, lastReal = -1e9, lastGhostClick = 0;
    const P = { x: -9999, y: -9999, real: false };
    const seed = hash(effects.length + el.childElementCount);
    const h = { cv, get ctx() { return ctx; }, get W() { return W; }, get H() { return H; }, P, s: 1, colors: () => colors(el), expanded: !!opts.expanded };
    const api = setup(h);
    const size = () => {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
      W = r.width; H = r.height; h.s = scaleOf(W); if (cv) ctx = fit(cv, W, H); api.resize && api.resize(W, H);
      if (!running) api.frame(performance.now());
    };
    const ro = new ResizeObserver(size); ro.observe(el);
    const local = e => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const onMove = e => { [P.x, P.y] = local(e); P.real = true; lastReal = performance.now(); };
    const onLeave = () => { P.real = false; P.x = P.y = -9999; };
    const onDown = e => { if (e.target.closest('a, button')) return; lastReal = performance.now(); const [x, y] = local(e); api.down && api.down(x, y); };
    el.addEventListener('pointermove', onMove); el.addEventListener('pointerleave', onLeave); el.addEventListener('pointerdown', onDown);
    const mo = new MutationObserver(() => { api.theme && api.theme(); if (!running) api.frame(performance.now()); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-palette'] });
    const tick = now => {
      if (!running) return;
      // 缩略图里 2.5 秒没人碰，就让幽灵光标接管；偶尔“点”一下展示点击效果
      if (!h.expanded && now - lastReal > 2500) {
        const g = ghostAt(now, W, H, seed); P.x = g.x; P.y = g.y;
        if (api.down && api.ghostClick !== false && now - lastGhostClick > 4200) { lastGhostClick = now; api.down(g.x, g.y); }
      }
      if (W && H) api.frame(now);
      raf = requestAnimationFrame(tick);
    };
    size();
    return {
      pause() { running = false; cancelAnimationFrame(raf); },
      resume() { if (running) return; if (still()) { api.frame(performance.now()); return; } running = true; raf = requestAnimationFrame(tick); },
      destroy() { this.pause(); ro.disconnect(); mo.disconnect(); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); el.removeEventListener('pointerdown', onDown); cv && cv.remove(); },
    };
  }

  // 让 CSS 能对自定义属性做补间（遮罩半径等）
  if (window.CSS && CSS.registerProperty) {
    for (const name of ['--vr', '--vw']) { try { CSS.registerProperty({ name, syntax: '<length>', inherits: false, initialValue: '0px' }); } catch (e) { /* 已注册 */ } }
  }

  return { effects, register, still, clamp, lerp, ease, hash, perlin, fit, colors, tween, scaleOf, ghostAt, canvasHost };
})();
