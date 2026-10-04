// 背景动效：画在 canvas 上，尺寸跟随容器，h.s 是缩放系数（全屏约 1，缩略图约 0.45）。

// ───── 风场：粒子顺着噪声角度流动，画布每帧轻微擦掉一点形成拖尾；鼠标附近卷成漩涡 ─────
MH.register({
  id: 'flow', name: '风场', cat: '背景', tech: 'Canvas 2D · Particles · Noise Flow Field',
  desc: '几千个粒子顺着看不见的风流动，留下淡淡的拖尾；鼠标附近被卷成漩涡，经过的粒子变成强调色。',
  mount: (el, opts) => MH.canvasHost(el, opts, h => {
    const noise = MH.perlin(11);
    let C = h.colors(), ps = [];
    const spawn = p => { p.x = Math.random() * h.W; p.y = Math.random() * h.H; p.life = 80 + Math.random() * 160; p.hot = 0; return p; };
    return {
      resize(W, H) { ps = Array.from({ length: Math.round(W * H / (1100 * h.s * h.s)) }, () => spawn({})); },
      theme() { C = h.colors(); h.ctx && h.ctx.clearRect(0, 0, h.W, h.H); },
      frame(now) {
        const { ctx, W, H, P, s } = h, t = now / 1000, SC = 380 * s, R2 = 32000 * s * s;
        ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,.07)'; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
        const cold = new Path2D(), warm = new Path2D();
        for (const p of ps) {
          const a = noise(p.x / SC + t * .03, p.y / SC) * Math.PI * 2.4;
          let vx = Math.cos(a) * 1.1 * s, vy = Math.sin(a) * 1.1 * s;
          const dx = p.x - P.x, dy = p.y - P.y, d2 = dx * dx + dy * dy;
          if (d2 < R2) { const d = Math.sqrt(d2) + 1, f = (1 - d2 / R2) * 5 * s; vx += -dy / d * f + dx / d * f * .25; vy += dx / d * f + dy / d * f * .25; p.hot = 1; }
          p.hot *= .97;
          const path = p.hot > .25 ? warm : cold;
          path.moveTo(p.x, p.y); p.x += vx; p.y += vy; path.lineTo(p.x, p.y);
          if (--p.life < 0 || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) spawn(p);
        }
        ctx.lineWidth = 1;
        ctx.strokeStyle = C.dim; ctx.globalAlpha = C.night ? .45 : .5; ctx.stroke(cold);
        ctx.strokeStyle = C.accent; ctx.globalAlpha = .9; ctx.stroke(warm); ctx.globalAlpha = 1;
      },
    };
  }),
});
