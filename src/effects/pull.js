// 拉扯翻页：一页一屏，换页时只有页面上的信息被扯长、扯走，背景不动。
// 做法：把要被扯走的那一页复制一份，横切成很多细条；每条按离“抓点”的远近做竖向位移和拉伸，拼起来就是被拉长的样子。
// 只做竖向（横向不缩放），字的边缘才是连续的，没有台阶。
MH.register({
  id: 'pull', name: '拉扯翻页', cat: '翻页', tech: 'DOM Slicing · Exponential Decay · Pointer Drag',
  desc: '往下翻，当前页的信息先被扯长，再整体拽走；往上翻，上一页从底部被拉上来。也可以按住拖动，拖过两成或甩得够快就翻页，否则弹回。',
  usage: `const deck = MH.effects.find(e => e.id === 'pull').mount(el, { slides: ['…', '…'] });\ndeck.resume();`,
  mount(el, opts) {
    const PAGES = opts.slides || [['01', '背景', '等高线 · 点阵 · 风场 · 网格'], ['02', '过渡', '11 种深浅切换'], ['03', '翻页', '拉扯翻页'], ['04', '交互', '片头 · 开关 · 卡片 · 光标']];
    el.insertAdjacentHTML('beforeend', `<div class="pd">${PAGES.map(([n, t, d]) => `<section class="pd-slide"><div class="pd-n">${n}</div><div><h3>${t}</h3><p>${d}</p></div></section>`).join('')}<div class="pd-pn"></div></div>`);
    const box = el.lastElementChild, slides = [...box.querySelectorAll('.pd-slide')], pn = box.querySelector('.pd-pn');
    const { clamp, lerp, ease, tween } = MH;
    let cur = 0, busy = false, dirStep = 1, running = false, timer = 0, lastReal = -1e9;
    slides[0].classList.add('on');
    const paint = () => { pn.textContent = `${String(cur + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`; };
    paint();

    // 快照切条：整数像素对齐，静止时不重叠也没有缝
    function sheetOf(node) {
      const W = box.clientWidth, H = box.clientHeight, N = Math.max(16, Math.round(H / 24));
      const sheet = document.createElement('div'); sheet.className = 'pd-sheet';
      const strips = [];
      for (let i = 0; i < N; i++) {
        const y0 = Math.floor(i * H / N), y1 = Math.floor((i + 1) * H / N);
        const s = document.createElement('div'); s.className = 'pd-band'; s.style.top = y0 + 'px'; s.style.height = y1 - y0 + 'px';
        const c = node.cloneNode(true); c.classList.add('on'); c.style.cssText = `top:${-y0}px;height:${H}px;opacity:1;transform:none`;
        s.append(c); sheet.append(s); strips.push({ el: s, y0, y1 });
      }
      box.append(sheet);
      return { sheet, strips, H };
    }
    // dir=down：抓点 gy 上方按距离指数衰减地跟随（被拉长），下方整体跟走；dir=up：上沿领先、下面落后。g 是整体跟上的比例
    function place(S, { dir, p, g, L, gy }) {
      const H = S.H;
      const D = dir === 'down' ? y => p * (g + (1 - g) * (y >= gy ? 1 : Math.exp(-(gy - y) / L))) : y => H - p * (g + (1 - g) * Math.exp(-y / L));
      for (const s of S.strips) { const a = D(s.y0), b = D(s.y1), h = s.y1 - s.y0; s.el.style.transform = `translate3d(0,${a}px,0) scaleY(${Math.max(.2, (h + b - a) / h)})`; }
    }
    const enter = (e, k, from) => { e.style.opacity = k; e.style.transform = `translateY(${(1 - k) * from}px)`; };
    const reset = e => { e.style.opacity = ''; e.style.transform = ''; };

    async function go(to) {
      if (busy || to === cur) return;
      const H = box.clientHeight, off = 28 * MH.scaleOf(box.clientWidth);
      if (to < 0 || to >= slides.length) { // 到头：拽动一点又弹回
        busy = true; const e = slides[cur], d = to > cur ? 1 : -1;
        await tween(160, k => e.style.transform = `translateY(${d * 34 * ease.out(k)}px) scaleY(${1 + .03 * ease.out(k)})`);
        await tween(380, k => e.style.transform = `translateY(${d * 34 * (1 - ease.back(k))}px)`);
        reset(e); busy = false; return;
      }
      busy = true;
      const from = slides[cur], next = slides[to];
      if (to > cur) { // 下一页：当前页的信息先被往下扯长，再整体拽走、淡出；下一页稍后从上方浮现
        const S = sheetOf(from), L = H * .35;
        from.classList.remove('on'); next.classList.add('on'); enter(next, 0, -off); cur = to; paint();
        await tween(320, k => place(S, { dir: 'down', p: H * .14 * ease.out(k), g: 0, L, gy: H }));
        await tween(440, k => { place(S, { dir: 'down', p: lerp(H * .14, H * 1.1, ease.in(k)), g: ease.inOut(k), L, gy: H }); S.sheet.style.opacity = 1 - clamp((k - .1) / .6); enter(next, ease.out(clamp((k - .45) / .55)), -off); });
        reset(next); S.sheet.remove();
      } else { // 上一页：从底部探出头，被扯着上沿拉到顶，轻轻回弹；当前页往上淡出
        const S = sheetOf(next), L = H * .4;
        place(S, { dir: 'up', p: 0, g: 0, L, gy: 0 }); S.sheet.style.opacity = 0;
        await tween(180, k => { place(S, { dir: 'up', p: 46 * ease.out(k), g: 0, L, gy: 0 }); S.sheet.style.opacity = k; });
        await tween(300, k => { place(S, { dir: 'up', p: lerp(46, H * .32, ease.out(k)), g: 0, L, gy: 0 }); from.style.opacity = 1 - .6 * k; from.style.transform = `translateY(${-24 * k}px)`; });
        await tween(460, k => { place(S, { dir: 'up', p: lerp(H * .32, H, ease.back(k)), g: ease.out(k), L, gy: 0 }); from.style.opacity = .4 * (1 - ease.out(k)); });
        from.classList.remove('on'); reset(from); next.classList.add('on'); cur = to; paint(); S.sheet.remove();
      }
      busy = false;
    }

    // 输入：舞台上滚轮、方向键；按住拖动（指针按住的地方就是抓点）
    let acc = 0, coolUntil = 0, drag = null;
    const onWheel = e => {
      e.preventDefault(); lastReal = performance.now();
      if (busy || performance.now() < coolUntil) return;
      acc += e.deltaY;
      if (Math.abs(acc) > 40) { const d = acc > 0 ? 1 : -1; acc = 0; coolUntil = performance.now() + 900; go(cur + d); }
    };
    const onKey = e => {
      if (!box.isConnected || !running) return;
      if (['ArrowDown', 'PageDown'].includes(e.key)) { e.preventDefault(); lastReal = performance.now(); go(cur + 1); }
      if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); lastReal = performance.now(); go(cur - 1); }
    };
    const pose = (dir, dy, H) => dir === 'down'
      ? (p => ({ p, g: clamp(p / (H * .9)) ** 2, q: clamp(p / (H * .5)) }))(Math.max(0, dy))
      : (p => ({ p, g: clamp(p / (H * .9)) ** 2, q: clamp(p / (H * .6)) }))(clamp(-dy * 1.15, 0, H));
    const onDown = e => {
      if (busy || e.button > 0 || e.target.closest('a, button')) return;
      const r = box.getBoundingClientRect(); lastReal = performance.now();
      drag = { y: e.clientY, gy: e.clientY - r.top, v: 0, ly: e.clientY, lt: performance.now(), S: null, dir: null };
      box.setPointerCapture(e.pointerId);
    };
    const onMove = e => {
      if (!drag) return;
      const dy = e.clientY - drag.y, now = performance.now(), H = box.clientHeight, off = 28 * MH.scaleOf(box.clientWidth);
      drag.v = (e.clientY - drag.ly) / Math.max(1, now - drag.lt); drag.ly = e.clientY; drag.lt = now; lastReal = now;
      if (!drag.dir) {
        if (Math.abs(dy) < 8) return;
        drag.dir = dy > 0 ? 'down' : 'up';
        const to = cur + (drag.dir === 'down' ? 1 : -1);
        if (to < 0 || to >= slides.length) { drag.edge = true; return; }
        busy = true; drag.to = to;
        if (drag.dir === 'down') { drag.S = sheetOf(slides[cur]); slides[cur].classList.remove('on'); slides[to].classList.add('on'); enter(slides[to], 0, -off); }
        else drag.S = sheetOf(slides[to]);
      }
      if (drag.edge) { const d = dy * .18; slides[cur].style.transform = `translateY(${d}px) scaleY(${1 + Math.abs(d) / H * .6})`; return; }
      const { p, g, q } = pose(drag.dir, dy, H);
      if (drag.dir === 'down') { place(drag.S, { dir: 'down', p, g, L: H * .3, gy: drag.gy }); drag.S.sheet.style.opacity = 1 - .7 * q; enter(slides[drag.to], .8 * q, -off); }
      else { place(drag.S, { dir: 'up', p, g, L: H * .4, gy: 0 }); drag.S.sheet.style.opacity = clamp(p / (H * .15)); slides[cur].style.opacity = 1 - .8 * q; slides[cur].style.transform = `translateY(${-30 * q}px)`; }
    };
    const onUp = async e => {
      const d = drag; drag = null;
      if (!d || !d.dir) return;
      const H = box.clientHeight, off = 28 * MH.scaleOf(box.clientWidth);
      if (d.edge) { const e2 = slides[cur], m = /translateY\(([-\d.]+)px\)/.exec(e2.style.transform), y0 = m ? +m[1] : 0; await tween(320, k => e2.style.transform = `translateY(${y0 * (1 - ease.back(k))}px)`); reset(e2); return; }
      const dy = e.clientY - d.y, { p: p0, g: g0, q: q0 } = pose(d.dir, dy, H);
      const done = d.dir === 'down' ? (dy > H * .22 || d.v > .9) : (-dy > H * .22 || d.v < -.9);
      const from = slides[cur], next = slides[d.to];
      if (d.dir === 'down') {
        if (done) { await tween(360, k => { place(d.S, { dir: 'down', p: lerp(p0, H * 1.1, ease.in(k)), g: lerp(g0, 1, ease.out(k)), L: H * .3, gy: d.gy }); d.S.sheet.style.opacity = (1 - .7 * q0) * (1 - k); enter(next, lerp(.8 * q0, 1, ease.out(k)), -off); }); reset(next); cur = d.to; paint(); }
        else { await tween(420, k => { place(d.S, { dir: 'down', p: p0 * (1 - ease.back(k)), g: g0 * (1 - k), L: H * .3, gy: d.gy }); d.S.sheet.style.opacity = lerp(1 - .7 * q0, 1, k); enter(next, .8 * q0 * (1 - k), -off); }); next.classList.remove('on'); reset(next); from.classList.add('on'); }
      } else {
        if (done) { await tween(420, k => { place(d.S, { dir: 'up', p: lerp(p0, H, ease.back(k)), g: lerp(g0, 1, ease.out(k)), L: H * .4, gy: 0 }); d.S.sheet.style.opacity = 1; from.style.opacity = (1 - .8 * q0) * (1 - k); }); from.classList.remove('on'); reset(from); next.classList.add('on'); cur = d.to; paint(); }
        else { await tween(360, k => { place(d.S, { dir: 'up', p: p0 * (1 - ease.out(k)), g: g0 * (1 - k), L: H * .4, gy: 0 }); enter(from, lerp(1 - .8 * q0, 1, k), 0); from.style.transform = `translateY(${-30 * q0 * (1 - k)}px)`; }); reset(from); }
      }
      d.S.sheet.remove(); busy = false;
    };
    box.addEventListener('wheel', onWheel, { passive: false });
    box.addEventListener('pointerdown', onDown); box.addEventListener('pointermove', onMove); box.addEventListener('pointerup', onUp); box.addEventListener('pointercancel', onUp);
    addEventListener('keydown', onKey);
    // 没人操作时自动来回翻：到最后一页就往回翻
    const auto = () => {
      if (!running) return;
      if (performance.now() - lastReal > 3500 && !busy) {
        if (cur + dirStep < 0 || cur + dirStep >= slides.length) dirStep = -dirStep;
        go(cur + dirStep);
      }
      timer = setTimeout(auto, 2400);
    };
    return {
      pause() { running = false; clearTimeout(timer); },
      resume() { if (running) return; running = true; if (!MH.still()) timer = setTimeout(auto, 1600); },
      destroy() { this.pause(); removeEventListener('keydown', onKey); box.remove(); },
    };
  },
});
