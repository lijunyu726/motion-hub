// 深浅切换过渡。两种用法：
//   1. 缩略图 / 全屏体验：容器里叠两层“小页面”（浅色、深色），新的一层按选定形状盖上去。不依赖 View Transitions。
//   2. 真实网站：MH.themeSwitch(event, apply, fx) 用 View Transitions 给整页做同样的过渡（见本文件末尾）。
// 形状函数 shape(x, y, R, W, H, s) 返回 WAAPI 关键帧；x/y 是触发点，R 是触发点到最远角的距离，s 是缩放系数。
(() => {
  const FX = {
    circle: { name: '圆形揭开', dur: 650, desc: '从点击处放大一个圆，盖住整页。',
      shape: (x, y, R) => [{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${R}px at ${x}px ${y}px)` }] },
    ink: { name: '墨水晕开', dur: 900, desc: '从点击处开始，边缘是圆润的不规则形，先快后慢，像墨滴洇开。',
      shape: (x, y, R) => {
        const N = 96, ph = [0, 0, 0].map(() => Math.random() * 6.28);
        const wob = Array.from({ length: N }, (_, i) => { const a = i / N * Math.PI * 2; return .88 + .07 * Math.sin(3 * a + ph[0]) + .05 * Math.sin(5 * a + ph[1]) + .03 * Math.sin(8 * a + ph[2]); });
        const ring = k => `polygon(${wob.map((w, i) => { const a = i / N * Math.PI * 2, r = R * k * (k < 1 ? w : 1.3); return `${(x + Math.cos(a) * r).toFixed(1)}px ${(y + Math.sin(a) * r).toFixed(1)}px`; }).join(',')})`;
        return [{ clipPath: ring(0) }, { clipPath: ring(.45), offset: .4 }, { clipPath: ring(1.25) }];
      } },
    dots: { name: '点阵扩散', dur: 1000, desc: '前沿是一圈网点，后面才是实心，适合配点阵背景。',
      shape: (x, y, R, W, H, s) => [{ '--vr': '0px' }, { '--vr': `${R + 180 * s}px` }] },
    blinds: { name: '百叶窗', dur: 700, desc: '一条条竖帘同时翻开，利落、有节奏。',
      shape: (x, y, R, W, H, s) => [{ '--vw': '0px' }, { '--vw': `${72 * s}px` }] },
    slice: { name: '斜切扫过', dur: 750, desc: '一道斜边从点击的那一侧扫向另一侧。',
      shape: (x, y, R, W) => {
        const L = x < W / 2, P = k => L ? `polygon(0 0, ${k}% 0, ${k - 35}% 100%, 0 100%)` : `polygon(100% 0, ${100 - k}% 0, ${135 - k}% 100%, 100% 100%)`;
        return [{ clipPath: P(0) }, { clipPath: P(140) }];
      } },
    iris: { name: '光圈快门', dur: 800, desc: '六边形从点击处旋转着张开，像相机光圈。',
      shape: (x, y, R) => Array.from({ length: 25 }, (_, f) => {
        const k = f / 24, r = R * 1.25 * (k * k * (3 - 2 * k)), rot = k * 2.2;
        return { clipPath: `polygon(${Array.from({ length: 6 }, (_, i) => { const a = rot + i * Math.PI / 3; return `${(x + Math.cos(a) * r).toFixed(1)}px ${(y + Math.sin(a) * r).toFixed(1)}px`; }).join(',')})` };
      }) },
    wave: { name: '液面上涨', dur: 1100, desc: '新颜色像水一样从底部涨上来，水面起伏。',
      shape: (x, y, R, W, H, s) => Array.from({ length: 31 }, (_, f) => {
        const k = f / 30, level = H * (1.08 - k * 1.25), amp = 46 * s * Math.sin(Math.PI * k), N = 32;
        const top = Array.from({ length: N + 1 }, (_, i) => `${(W * i / N).toFixed(1)}px ${(level + amp * Math.sin(i / N * Math.PI * 3 + k * 9)).toFixed(1)}px`);
        return { clipPath: `polygon(0 ${H}px, ${top.join(',')}, ${W}px ${H}px)` };
      }) },
    halftone: { name: '网点溶解', dur: 750, desc: '整屏同时长出印刷网点，越长越大，直到连成一片。',
      shape: (x, y, R, W, H, s) => [{ '--vr': '0px' }, { '--vr': `${14 * s}px` }] },
    soft: { name: '柔光圆', dur: 800, desc: '和圆形揭开一样从点击处扩散，但边缘是一圈柔和的渐隐。',
      shape: (x, y, R, W, H, s) => [{ '--vr': '0px' }, { '--vr': `${R + 260 * s}px` }] },
    flip: { name: '翻页', dur: 900, desc: '整页像卡片一样绕竖轴翻过去，背面就是另一种颜色。', shape: null },
    fade: { name: '淡入淡出', dur: 400, desc: '最普通的渐变，作对照。', shape: () => [{ opacity: 0 }, { opacity: 1 }] },
  };
  const EASE = 'cubic-bezier(.6,0,.2,1)';
  // 遮罩里用到的尺寸（随缩放系数变）：点阵前沿宽度、网点格子、柔光边宽、百叶窗周期
  const sizeVars = (el, s) => {
    el.style.setProperty('--band', `${160 * s}px`); el.style.setProperty('--tile', `${18 * s}px`);
    el.style.setProperty('--soft', `${260 * s}px`); el.style.setProperty('--period', `${72 * s}px`);
  };

  // 小页面：同一份内容，浅色一层、深色一层
  const scene = theme => `<div class="tt-scene" data-theme="${theme}"><div class="tt-mock">
    <span class="tt-tag">${theme === 'night' ? '深色' : '浅色'}</span><b>Aa</b><i></i><i></i><i class="short"></i></div></div>`;

  function mountTransition(id) {
    const fx = FX[id];
    return (el, opts) => {
      el.insertAdjacentHTML('beforeend', `<div class="tt">${scene('day')}${scene('night')}</div>`);
      const box = el.lastElementChild, [day, night] = box.children;
      let cur = 'day', running = false, timer = 0, lastReal = -1e9, settle = null;
      night.style.visibility = 'hidden';
      // 过渡播完之前再点不生效，等这一次播完才能再切（连点时被打断很生硬）
      const play = (x, y) => {
        if (settle) return;
        const W = box.clientWidth, H = box.clientHeight, s = MH.scaleOf(W), R = Math.hypot(Math.max(x, W - x), Math.max(y, H - y));
        const top = cur === 'day' ? night : day, bottom = cur === 'day' ? day : night;
        cur = cur === 'day' ? 'night' : 'day'; // 目标状态立刻生效
        sizeVars(top, s); top.style.setProperty('--vx', x + 'px'); top.style.setProperty('--vy', y + 'px');
        top.dataset.fx = id; top.style.zIndex = 2; bottom.style.zIndex = 1; top.style.visibility = 'visible';
        const anims = []; let done = false;
        settle = () => {
          if (done) return; done = true; settle = null;
          anims.forEach(a => a.cancel());
          delete top.dataset.fx; top.style.visibility = 'visible'; bottom.style.visibility = 'hidden';
          top.style.zIndex = 1; bottom.style.zIndex = 0;
        };
        if (MH.still()) return settle();
        const quiet = () => {}; // 被打断时动画会被 cancel，finished 会 reject，忽略即可
        if (id === 'flip') {
          const o = { duration: fx.dur / 2, easing: 'cubic-bezier(.5,0,.5,1)', fill: 'both' };
          top.style.visibility = 'hidden';
          const a1 = bottom.animate([{ transform: 'rotateY(0)' }, { transform: 'rotateY(90deg)' }], o); anims.push(a1);
          a1.finished.then(() => {
            if (done) return;
            top.style.visibility = 'visible'; bottom.style.visibility = 'hidden';
            const a2 = top.animate([{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0)' }], o); anims.push(a2);
            a2.finished.then(settle, quiet);
          }, quiet);
        } else {
          const a = top.animate(fx.shape(x, y, R, W, H, s), { duration: fx.dur, easing: EASE, fill: 'forwards' }); anims.push(a);
          a.finished.then(settle, quiet);
        }
      };
      const onDown = e => { lastReal = performance.now(); const r = box.getBoundingClientRect(); play(e.clientX - r.left, e.clientY - r.top); };
      box.addEventListener('pointerdown', onDown);
      // 缩略图里没人点的时候，每隔一会儿在“幽灵光标”的位置自己触发一次
      const auto = () => {
        if (!running) return;
        if (!opts.expanded && performance.now() - lastReal > 3000) { const g = MH.ghostAt(performance.now(), box.clientWidth, box.clientHeight, MH.hash(id.length)); play(g.x, g.y); }
        timer = setTimeout(auto, 2600 + fx.dur);
      };
      return {
        pause() { running = false; clearTimeout(timer); },
        resume() { if (running || MH.still()) return; running = true; timer = setTimeout(auto, 900); },
        destroy() { this.pause(); box.removeEventListener('pointerdown', onDown); box.remove(); },
      };
    };
  }
  for (const [id, fx] of Object.entries(FX)) {
    MH.register({ id: `theme-${id}`, name: fx.name, cat: '过渡', tech: 'View Transitions API · ' + (id === 'flip' ? 'WAAPI · 3D Transform' : (/dots|blinds|halftone|soft/.test(id) ? 'CSS Mask · @property' : 'WAAPI · clip-path')), desc: fx.desc + ' 点画面任意位置触发。', mount: mountTransition(id) });
  }

  // ───── 真实网站用：整页深浅切换 ─────
  // apply() 负责真正改主题（例如切换 <html data-theme>）；不支持 View Transitions 或减少动态效果时直接调用 apply()。
  // 过渡播完之前再点不生效，等这一次播完才能再切。
  let active = null;
  MH.themeSwitch = (e, apply, id = 'dots') => {
    const fx = FX[id] || FX.dots, root = document.documentElement;
    if (!document.startViewTransition || MH.still()) return apply();
    if (active) return;
    const r = e.currentTarget && e.currentTarget.getBoundingClientRect ? e.currentTarget.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    const x = e.clientX || r.left + r.width / 2, y = e.clientY || r.top + r.height / 2;
    const W = innerWidth, H = innerHeight, R = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)), s = 1;
    root.dataset.vfx = id; sizeVars(root, s);
    root.style.setProperty('--vx', x + 'px'); root.style.setProperty('--vy', y + 'px');
    const vt = document.startViewTransition(apply); active = vt;
    vt.ready.then(() => {
      if (id === 'flip') {
        const o = { duration: fx.dur / 2, easing: 'cubic-bezier(.5,0,.5,1)', fill: 'both' };
        root.animate([{ transform: 'perspective(1800px) rotateY(0)' }, { transform: 'perspective(1800px) rotateY(90deg)' }], { ...o, pseudoElement: '::view-transition-old(root)' });
        root.animate([{ transform: 'perspective(1800px) rotateY(-90deg)' }, { transform: 'perspective(1800px) rotateY(0)' }], { ...o, delay: fx.dur / 2, pseudoElement: '::view-transition-new(root)' });
      } else if (fx.shape && id !== 'fade') {
        // fill: 'forwards'：停在最后一帧，否则过渡层撤掉前会有一帧遮罩归零，整屏闪回旧颜色
        root.animate(fx.shape(x, y, R, W, H, s), { duration: fx.dur, easing: EASE, fill: 'forwards', pseudoElement: '::view-transition-new(root)' });
      }
    }).catch(() => {});
    vt.finished.finally(() => { if (active === vt) { active = null; delete root.dataset.vfx; } });
  };
  // 绑定深浅开关（过渡播完之前再点不生效）
  MH.bindThemeToggle = (btn, apply, id = 'dots') => btn.addEventListener('click', e => MH.themeSwitch(e, apply, id));
  MH.themeFx = Object.keys(FX);
})();
