// ───── 校验链：一个小点依次走过各道关，走过的关点亮，到终点停一下再重来 ─────
MH.register({
  id: 'pipeline', name: '校验链', cat: '交互', tech: 'SVG · Staged Easing',
  desc: '一次操作依次经过多道检查：小点在每道关前减速、通过后点亮，适合解释流程或状态机。',
  params: [
    { k: 'gates', label: '关卡（一行一个）', type: 'lines', def: '计划\n身份\n权限\n状态\n幂等\n限流\n审计' },
    { k: 'period', label: '一轮时长', type: 'range', min: 2000, max: 15000, step: 250, def: 7000, unit: 'ms' },
  ],
  mount(el, opts) {
    const G = MH.lines(opts.gates).length > 1 ? MH.lines(opts.gates) : ['开始', '结束'];
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
    const N = G.length - 1, T = opts.period;
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
