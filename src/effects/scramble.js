// 小交互：DOM + CSS，没有画布。用 canvasHost 的无画布模式拿到“真实指针或幽灵光标”的位置。

// ───── 乱码落定：文字先变成一串随机符号，再从左到右一个个落定 ─────
MH.register({
  id: 'scramble', name: '乱码落定', cat: '交互', tech: 'requestAnimationFrame · Text Scramble',
  desc: '指针经过时，文字先变成乱码，再从左到右一个个落回原字，适合导航和标题。',
  params: [
    { k: 'words', label: '文字（一行一条）', type: 'lines', def: 'MOTION HUB\n背景 · 过渡 · 翻页\nHELLO, LJY' },
    { k: 'pool', label: '乱码字符', type: 'text', def: '01#/<>+=*[]{}%$&' },
    { k: 'step', label: '每字落定间隔', type: 'range', min: 15, max: 160, step: 5, def: 55, unit: 'ms' },
  ],
  mount(el, opts) {
    const WORDS = MH.lines(opts.words);
    el.insertAdjacentHTML('beforeend', `<div class="sc">${WORDS.map(w => `<div class="sc-w" data-s="${w}">${w}</div>`).join('')}</div>`);
    const box = el.lastElementChild, items = [...box.children], pool = opts.pool || '01#/<>+=*[]{}%$&';
    const play = a => {
      if (a._busy || MH.still()) return; a._busy = true;
      const s = a.dataset.s, t0 = performance.now();
      const tick = now => {
        const k = Math.floor((now - t0) / opts.step);
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
