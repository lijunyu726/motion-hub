// 背景动效：全部画在 canvas 上，尺寸跟随容器，h.s 是缩放系数（全屏约 1，缩略图约 0.45）。

// ───── 等高线：平滑噪声当地形，每隔一个高度描一圈线（marching squares）；鼠标处隆起，点击泛起波纹 ─────
MH.register({
  id: 'contour', name: '等高线', cat: '背景', tech: 'Canvas · Perlin 噪声 · Marching Squares',
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

// ───── 磁性点阵：每个点有静止位置，被鼠标推开、被弹簧拉回；推得越远越大、越接近强调色；点击发出冲击波 ─────
function dotField(quiet) {
  return (el, opts) => MH.canvasHost(el, opts, h => {
    let C = h.colors(), dots = [], GAP, R;
    const waves = [];
    return {
      resize(W, H) {
        GAP = Math.max(10, 26 * h.s); R = (quiet ? 110 : 150) * h.s; dots = [];
        const ox = (W % GAP) / 2, oy = (H % GAP) / 2;
        for (let y = oy; y < H; y += GAP) for (let x = ox; x < W; x += GAP) dots.push({ hx: x, hy: y, x, y, vx: 0, vy: 0 });
      },
      theme() { C = h.colors(); },
      down: quiet ? null : (x, y) => { waves.push({ x, y, t0: performance.now() }); if (waves.length > 3) waves.shift(); },
      frame(now) {
        const { ctx, W, H, P, s } = h, t = now / 1000, live = waves.filter(w => now - w.t0 < 1800);
        const push = quiet ? 1.6 : 3.2, base = new Path2D(), hot = new Path2D();
        for (const d of dots) {
          const dx = d.x - P.x, dy = d.y - P.y, dist = Math.hypot(dx, dy);
          if (dist < R && dist > .1) { const f = (1 - dist / R) ** 2 * push * s; d.vx += dx / dist * f; d.vy += dy / dist * f; }
          for (const w of live) {
            const age = (now - w.t0) / 1000, wx = d.hx - w.x, wy = d.hy - w.y, wd = Math.hypot(wx, wy), front = age * 700 * s;
            const g = Math.exp(-(((wd - front) / (40 * s)) ** 2)) * (1 - age / 1.8) * 1.3 * s;
            if (g > .01 && wd > 1) { d.vx += wx / wd * g; d.vy += wy / wd * g; }
          }
          d.vx += (d.hx - d.x) * .06; d.vy += (d.hy - d.y) * .06; d.vx *= .82; d.vy *= .82; d.x += d.vx; d.y += d.vy;
          const off = Math.hypot(d.x - d.hx, d.y - d.hy) / s;
          const breathe = quiet ? 0 : Math.sin(d.hx * .012 / s + d.hy * .008 / s - t * 1.2) * .25;
          const r = Math.min(1.1 + breathe + off * (quiet ? .06 : .09), quiet ? 2.4 : 3.6) * Math.max(.7, s);
          const p = off > (quiet ? 6 : 7) ? hot : base;
          p.moveTo(d.x + r, d.y); p.arc(d.x, d.y, r, 0, Math.PI * 2);
        }
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = C.dim; ctx.globalAlpha = quiet ? (C.night ? .26 : .3) : (C.night ? .38 : .42); ctx.fill(base);
        ctx.fillStyle = C.accent; ctx.globalAlpha = quiet ? .6 : .85; ctx.fill(hot); ctx.globalAlpha = 1;
      },
    };
  });
}
MH.register({ id: 'dots', name: '磁性点阵', cat: '背景', tech: 'Canvas · 弹簧阻尼', desc: '整屏点阵被鼠标推开再弹回，推开的点变大、变成强调色；点击发出一圈冲击波。', mount: dotField(false) });
MH.register({ id: 'dots-quiet', name: '安静点阵', cat: '背景', tech: 'Canvas · 弹簧阻尼', desc: '同一套点阵的阅读版：点更淡、推开的范围和力度更小，没有冲击波，适合长文页面。', mount: dotField(true) });

// ───── 风场：粒子顺着噪声角度流动，画布每帧轻微擦掉一点形成拖尾；鼠标附近卷成漩涡 ─────
MH.register({
  id: 'flow', name: '风场', cat: '背景', tech: 'Canvas · 粒子 · 噪声流场',
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

// ───── 坐标网格：坐标纸 + 十字准线 + 坐标读数；鼠标经过的格子“加热”，四角亮起角标后慢慢冷却 ─────
MH.register({
  id: 'grid', name: '坐标网格', cat: '背景', tech: 'Canvas · 热度衰减',
  desc: '坐标纸背景，鼠标拖出十字准线和实时坐标；经过的格子四角亮起红色角标，再慢慢暗下去。',
  mount: (el, opts) => MH.canvasHost(el, opts, h => {
    let C = h.colors(), S, cols, rows, heat;
    const m = { px: -999, py: -999 };
    return {
      resize(W, H) { S = Math.max(16, 40 * h.s); cols = Math.ceil(W / S) + 1; rows = Math.ceil(H / S) + 1; heat = new Float32Array(cols * rows); },
      theme() { C = h.colors(); },
      frame() {
        const { ctx, W, H, P, s } = h, on = P.x > -999;
        ctx.clearRect(0, 0, W, H); ctx.strokeStyle = C.dim; ctx.lineWidth = 1;
        for (let pass = 0; pass < 2; pass++) {
          ctx.globalAlpha = pass ? (C.night ? .22 : .26) : (C.night ? .07 : .09); ctx.beginPath();
          for (let i = 0; i < cols; i++) if ((i % 4 === 0) === !!pass) { ctx.moveTo(i * S + .5, 0); ctx.lineTo(i * S + .5, H); }
          for (let j = 0; j < rows; j++) if ((j % 4 === 0) === !!pass) { ctx.moveTo(0, j * S + .5); ctx.lineTo(W, j * S + .5); }
          ctx.stroke();
        }
        if (on && m.px > -999) { // 沿移动路径加热，快速划过也不跳格
          const steps = Math.max(1, Math.ceil(Math.hypot(P.x - m.px, P.y - m.py) / (S / 2)));
          for (let k = 0; k <= steps; k++) {
            const i = Math.floor((m.px + (P.x - m.px) * k / steps) / S), j = Math.floor((m.py + (P.y - m.py) * k / steps) / S);
            if (i >= 0 && i < cols && j >= 0 && j < rows) heat[j * cols + i] = 1;
          }
        }
        m.px = on ? P.x : -999; m.py = on ? P.y : -999;
        ctx.strokeStyle = C.accent; ctx.lineWidth = 1.5;
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          const v = heat[j * cols + i]; if (v < .02) continue;
          heat[j * cols + i] = v * .955;
          const x = i * S, y = j * S, L = (6 + v * 4) * s;
          ctx.globalAlpha = v * .9; ctx.beginPath();
          ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y);
          ctx.moveTo(x + S - L, y); ctx.lineTo(x + S, y); ctx.lineTo(x + S, y + L);
          ctx.moveTo(x + S, y + S - L); ctx.lineTo(x + S, y + S); ctx.lineTo(x + S - L, y + S);
          ctx.moveTo(x + L, y + S); ctx.lineTo(x, y + S); ctx.lineTo(x, y + S - L);
          ctx.stroke();
        }
        if (on) {
          ctx.globalAlpha = C.night ? .45 : .5; ctx.lineWidth = 1; ctx.beginPath();
          ctx.moveTo(0, Math.round(P.y) + .5); ctx.lineTo(W, Math.round(P.y) + .5);
          ctx.moveTo(Math.round(P.x) + .5, 0); ctx.lineTo(Math.round(P.x) + .5, H); ctx.stroke();
          ctx.globalAlpha = .9; ctx.fillStyle = C.accent; ctx.font = `500 ${Math.max(9, 11 * s)}px "SF Mono",Menlo,monospace`;
          ctx.fillText(`${Math.round(P.x)}, ${Math.round(P.y)}`, P.x + 10, P.y - 10);
        }
        ctx.globalAlpha = 1;
      },
    };
  }),
});
