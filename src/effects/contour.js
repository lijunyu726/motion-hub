// 背景动效：画在 canvas 上，尺寸跟随容器，h.s 是缩放系数（全屏约 1，缩略图约 0.45）。

// ───── 等高线：平滑噪声当地形，每隔一个高度描一圈线（marching squares）；鼠标处隆起，点击泛起波纹 ─────
MH.register({
  id: 'contour', name: '等高线', cat: '背景', tech: 'Canvas 2D · Perlin Noise · Marching Squares',
  desc: '地形缓慢漂移，鼠标处隆起一座小山，最高的几圈变成强调色；点击会荡开一圈圈波纹。',
  mount: (el, opts) => MH.canvasHost(el, opts, h => {
    const noise = MH.perlin(3), LEVELS = [], m = { x: -999, y: -999, a: 0 }, waves = [];
    for (let l = -1.2; l <= 1.65; l += .12) LEVELS.push(l);
    let C = h.colors(), CELL, cols, rows, field;
    return {
      resize(W, H) { CELL = Math.max(6, 14 * h.s); cols = Math.ceil(W / CELL) + 1; rows = Math.ceil(H / CELL) + 1; field = new Float32Array(cols * rows); },
      theme() { C = h.colors(); },
      down(x, y) { waves.push({ x, y, t0: performance.now() }); if (waves.length > 4) waves.shift(); },
      frame(now) {
        const { ctx, W, H, P, s } = h, t = now / 1000 * .02, SC = 1 / (420 * s);
        const on = P.x > -999;
        if (on && m.x < -900) { m.x = P.x; m.y = P.y; }
        m.x += ((on ? P.x : m.x) - m.x) * .12; m.y += ((on ? P.y : m.y) - m.y) * .12; m.a += ((on ? 1 : 0) - m.a) * .06;
        const R2 = 33800 * s * s, live = waves.filter(w => now - w.t0 < 2600);
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          const px = i * CELL, py = j * CELL, wx = px * SC, wy = py * SC;
          let v = noise(wx + t, wy) * 1.1 + noise(wx * 2.1 - t * .7, wy * 2.1 + 9) * .45;
          if (m.a > .01) { const dx = px - m.x, dy = py - m.y; v += .9 * m.a * Math.exp(-(dx * dx + dy * dy) / R2); }
          for (const w of live) {
            const age = (now - w.t0) / 1000, d = Math.hypot(px - w.x, py - w.y), front = age * 420 * s;
            if (Math.abs(d - front) < 160 * s) v += .35 * Math.cos((d - front) / (26 * s)) * Math.exp(-(((d - front) / (90 * s)) ** 2)) * (1 - age / 2.6);
          }
          field[j * cols + i] = v;
        }
        ctx.clearRect(0, 0, W, H); ctx.lineWidth = 1;
        for (let li = 0; li < LEVELS.length; li++) {
          const L = LEVELS[li], hot = L >= 1;
          ctx.strokeStyle = hot ? C.accent : C.dim;
          ctx.globalAlpha = hot ? .6 : (li % 5 === 0 ? (C.night ? .32 : .42) : (C.night ? .16 : .22));
          ctx.beginPath();
          for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
            const a = field[j * cols + i], b = field[j * cols + i + 1], c = field[(j + 1) * cols + i + 1], d = field[(j + 1) * cols + i];
            const k = (a > L) | ((b > L) << 1) | ((c > L) << 2) | ((d > L) << 3);
            if (k === 0 || k === 15) continue;
            const x0 = i * CELL, y0 = j * CELL, R = x0 + CELL, B = y0 + CELL;
            const Tx = x0 + (L - a) / (b - a) * CELL, Ry = y0 + (L - b) / (c - b) * CELL, Bx = x0 + (L - d) / (c - d) * CELL, Ly = y0 + (L - a) / (d - a) * CELL;
            switch (k) {
              case 1: case 14: ctx.moveTo(x0, Ly); ctx.lineTo(Tx, y0); break;
              case 2: case 13: ctx.moveTo(Tx, y0); ctx.lineTo(R, Ry); break;
              case 3: case 12: ctx.moveTo(x0, Ly); ctx.lineTo(R, Ry); break;
              case 4: case 11: ctx.moveTo(R, Ry); ctx.lineTo(Bx, B); break;
              case 6: case 9: ctx.moveTo(Tx, y0); ctx.lineTo(Bx, B); break;
              case 7: case 8: ctx.moveTo(x0, Ly); ctx.lineTo(Bx, B); break;
              case 5: ctx.moveTo(x0, Ly); ctx.lineTo(Tx, y0); ctx.moveTo(R, Ry); ctx.lineTo(Bx, B); break;
              case 10: ctx.moveTo(Tx, y0); ctx.lineTo(R, Ry); ctx.moveTo(x0, Ly); ctx.lineTo(Bx, B); break;
            }
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
    };
  }),
});
