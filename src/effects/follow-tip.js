// 小交互：DOM + CSS，没有画布。用 canvasHost 的无画布模式拿到“真实指针或幽灵光标”的位置。

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
