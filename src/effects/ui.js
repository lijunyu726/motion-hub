// 小交互：都是 DOM + CSS，没有画布。用 canvasHost 的无画布模式拿到“真实指针或幽灵光标”的位置。

// ───── 太阳 ⇄ 月亮：一个圆 + 一个“咬掉一口”的遮罩 + 八条光芒；遮罩移进来、光芒收起就是月亮 ─────
MH.register({
  id: 'sun-moon', name: '太阳月亮开关', cat: '交互', tech: 'SVG 遮罩 · CSS 变换',
  desc: '深浅模式开关的图标：浅色时是月亮（点了变深色），深色时是太阳；切换时光芒收起、圆被咬掉一口变成月牙。',
  mount(el, opts) {
    const rays = [0, 45, 90, 135, 180, 225, 270, 315].map(a => `<line x1="12" y1="2.5" x2="12" y2="4.5" transform="rotate(${a} 12 12)"/>`).join('');
    const id = 'sm' + Math.random().toString(36).slice(2, 7);
    el.insertAdjacentHTML('beforeend', `<div class="ui-center"><button class="sm moon" type="button" aria-label="切换"><svg viewBox="0 0 24 24"><mask id="${id}"><rect x="-4" y="-4" width="32" height="32" fill="#fff"/><circle class="bite" cx="28" cy="2" r="7.5" fill="#000"/></mask><circle class="core" cx="12" cy="12" r="5" fill="currentColor" mask="url(#${id})"/><g class="rays" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">${rays}</g></svg></button><span class="sm-tip">点一下</span></div>`);
    const box = el.lastElementChild, btn = box.querySelector('.sm');
    let running = false, timer = 0, lastReal = -1e9;
    btn.addEventListener('click', () => { lastReal = performance.now(); btn.classList.toggle('moon'); });
    const auto = () => { if (!running) return; if (performance.now() - lastReal > 3000) btn.classList.toggle('moon'); timer = setTimeout(auto, 1800); };
    return { pause() { running = false; clearTimeout(timer); }, resume() { if (running || MH.still()) return; running = true; timer = setTimeout(auto, 1200); }, destroy() { this.pause(); box.remove(); } };
  },
});

// ───── 边框高光卡片：只在边框那 1.5px 上画一个跟着指针的径向渐变（不给文字铺底色），外加轻微 3D 倾斜 ─────
MH.register({
  id: 'glow-card', name: '边框高光卡片', cat: '交互', tech: 'CSS 遮罩 · mask-composite · 3D 倾斜',
  desc: '指针在卡片上移动时，边框沿着指针亮起一段光，卡片同时朝指针方向轻轻倾斜。',
  mount(el, opts) {
    el.insertAdjacentHTML('beforeend', `<div class="gc-wrap">${['01', '02', '03'].map((n, i) => `<div class="gc"><span>${n}</span><b>${['等高线', '点阵扩散', '拉扯翻页'][i]}</b><em>${['背景', '过渡', '翻页'][i]}</em></div>`).join('')}</div>`);
    const wrap = el.lastElementChild, cards = [...wrap.children];
    return MH.canvasHost(el, opts, h => ({
      frame() {
        const r0 = el.getBoundingClientRect();
        for (const c of cards) {
          const r = c.getBoundingClientRect(), x = h.P.x + r0.left - r.left, y = h.P.y + r0.top - r.top;
          const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
          c.classList.toggle('hot', inside);
          if (inside) {
            c.style.setProperty('--mx', x + 'px'); c.style.setProperty('--my', y + 'px');
            if (!MH.still()) c.style.transform = `rotateX(${(.5 - y / r.height) * 8}deg) rotateY(${(x / r.width - .5) * 10}deg)`;
          } else c.style.transform = '';
        }
      },
    }), { canvas: false });
  },
});

// ───── 乱码落定：文字先变成一串随机符号，再从左到右一个个落定 ─────
MH.register({
  id: 'scramble', name: '乱码落定', cat: '交互', tech: 'requestAnimationFrame · 文本替换',
  desc: '指针经过时，文字先变成乱码，再从左到右一个个落回原字，适合导航和标题。',
  mount(el, opts) {
    const WORDS = ['MOTION HUB', '背景 · 过渡 · 翻页', 'HELLO, LJY'];
    el.insertAdjacentHTML('beforeend', `<div class="sc">${WORDS.map(w => `<div class="sc-w" data-s="${w}">${w}</div>`).join('')}</div>`);
    const box = el.lastElementChild, items = [...box.children], pool = '01#/<>+=*[]{}%$&';
    const play = a => {
      if (a._busy || MH.still()) return; a._busy = true;
      const s = a.dataset.s, t0 = performance.now();
      const tick = now => {
        const k = Math.floor((now - t0) / 55);
        a.textContent = [...s].map((ch, i) => i < k || ch === ' ' ? ch : pool[Math.random() * pool.length | 0]).join('');
        if (k <= s.length) requestAnimationFrame(tick); else { a.textContent = s; a._busy = false; }
      };
      requestAnimationFrame(tick);
    };
    let last = null;
    return MH.canvasHost(el, opts, h => ({
      frame() {
        const r0 = el.getBoundingClientRect();
        const over = items.find(a => { const r = a.getBoundingClientRect(), x = h.P.x + r0.left, y = h.P.y + r0.top; return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; });
        if (over && over !== last) play(over);
        items.forEach(a => a.classList.toggle('hot', a === over));
        last = over || null;
      },
    }), { canvas: false });
  },
});

// ───── 跟随光标的信息卡：悬停列表行时，一张小卡片带一点延迟地跟着指针；靠近右边缘时翻到指针左侧 ─────
MH.register({
  id: 'follow-tip', name: '跟随信息卡', cat: '交互', tech: '线性插值 · 指针跟随',
  desc: '悬停在某一行时，信息卡带着一点“拖拽感”跟随指针，靠近边缘会自动翻到另一侧。',
  mount(el, opts) {
    const ROWS = [['01', '等高线', 'Canvas · Marching Squares'], ['02', '磁性点阵', 'Canvas · 弹簧阻尼'], ['03', '风场', 'Canvas · 粒子'], ['04', '拉扯翻页', 'DOM 切条']];
    el.insertAdjacentHTML('beforeend', `<div class="ft">${ROWS.map(([n, t]) => `<div class="ft-row"><span>${n}</span><b>${t}</b></div>`).join('')}<div class="ft-tip"><em></em><i></i></div></div>`);
    const box = el.lastElementChild, rows = [...box.querySelectorAll('.ft-row')], tip = box.querySelector('.ft-tip');
    const p = { x: 0, y: 0 };
    return MH.canvasHost(el, opts, h => ({
      frame() {
        const r0 = el.getBoundingClientRect(), W = h.W;
        const i = rows.findIndex(r => { const b = r.getBoundingClientRect(), y = h.P.y + r0.top, x = h.P.x + r0.left; return y >= b.top && y <= b.bottom && x >= b.left && x <= b.right; });
        tip.classList.toggle('on', i >= 0);
        rows.forEach((r, k) => r.classList.toggle('hot', k === i));
        if (i >= 0) { tip.querySelector('em').textContent = `${ROWS[i][0]} / 0${ROWS.length}`; tip.querySelector('i').textContent = ROWS[i][2]; }
        const tw = tip.offsetWidth, tx = h.P.x + (h.P.x > W - tw - 30 ? -tw - 14 : 18), ty = h.P.y + 16;
        const k = MH.still() ? 1 : .18; p.x += (tx - p.x) * k; p.y += (ty - p.y) * k;
        tip.style.translate = `${p.x}px ${p.y}px`;
      },
    }), { canvas: false });
  },
});

// ───── 校验链：一个小点依次走过各道关，走过的关点亮，到终点停一下再重来 ─────
MH.register({
  id: 'pipeline', name: '校验链', cat: '交互', tech: 'SVG · 分段缓动',
  desc: '一次操作依次经过多道检查：小点在每道关前减速、通过后点亮，适合解释流程或状态机。',
  mount(el, opts) {
    const G = opts.gates || ['计划', '身份', '权限', '状态', '幂等', '限流', '审计'];
    el.insertAdjacentHTML('beforeend', `<div class="pl"><svg></svg></div>`);
    const box = el.lastElementChild, svg = box.querySelector('svg');
    let gates, labels, pl, tk, x;
    const build = () => {
      const W = Math.max(box.clientWidth, 240), gap = (W - 60) / (G.length - 1), y = 40;
      x = i => 30 + i * gap; svg.setAttribute('viewBox', `0 0 ${W} 90`);
      svg.innerHTML = `<line class="ln" x1="${x(0)}" y1="${y}" x2="${x(G.length - 1)}" y2="${y}"/><line class="lnon" x1="${x(0)}" y1="${y}" x2="${x(0)}" y2="${y}"/>` +
        G.map((g, i) => `<rect class="g" x="${x(i) - 8}" y="${y - 8}" width="16" height="16" ${i === 0 || i === G.length - 1 ? 'rx="8"' : ''}/><text x="${x(i)}" y="${y + 36}">${g}</text>`).join('') +
        `<circle class="tok" cx="${x(0)}" cy="${y}" r="5"/>`;
      gates = [...svg.querySelectorAll('.g')]; labels = [...svg.querySelectorAll('text')]; pl = svg.querySelector('.lnon'); tk = svg.querySelector('.tok');
    };
    const ro = new ResizeObserver(build); ro.observe(box); build();
    const set = p => { const px = x(0) + p * (x(1) - x(0)); pl.setAttribute('x2', px); tk.setAttribute('cx', px); gates.forEach((g, i) => { g.classList.toggle('on', p >= i - .02); labels[i].classList.toggle('on', p >= i - .02); }); };
    let running = false, raf = 0;
    const N = G.length - 1, T = 7000;
    const loop = now => {
      if (!running) return;
      const raw = Math.min((now % T) / T * 1.25, 1) * N, i = Math.floor(raw), f = raw - i;
      set(Math.min(i + (f < .5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2), N));
      raf = requestAnimationFrame(loop);
    };
    return {
      pause() { running = false; cancelAnimationFrame(raf); },
      resume() { if (running) return; if (MH.still()) return set(N); running = true; raf = requestAnimationFrame(loop); },
      destroy() { this.pause(); ro.disconnect(); box.remove(); },
    };
  },
});
