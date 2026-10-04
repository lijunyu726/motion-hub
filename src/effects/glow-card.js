// 小交互：DOM + CSS，没有画布。用 canvasHost 的无画布模式拿到“真实指针或幽灵光标”的位置。

// ───── 边框高光卡片：只在边框那 1.5px 上画一个跟着指针的径向渐变（不给文字铺底色），外加轻微 3D 倾斜 ─────
MH.register({
  id: 'glow-card', name: '边框高光卡片', cat: '交互', tech: 'CSS Mask · mask-composite · 3D Tilt',
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
