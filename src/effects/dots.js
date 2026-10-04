// 背景动效：画在 canvas 上，尺寸跟随容器，h.s 是缩放系数（全屏约 1，缩略图约 0.45）。

// ───── 磁性点阵：每个点有静止位置，被鼠标推开、被弹簧拉回；推得越远越大、越接近强调色；点击发出冲击波 ─────
function dotField(quiet) {
  return (el, opts) => MH.canvasHost(el, opts, h => {
    let C = h.colors(), dots = [], GAP, R;
    const waves = [];
    return {
      resize(W, H) {
        GAP = Math.max(8, opts.gap * h.s); R = opts.radius * h.s; dots = [];
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
          d.vx += (d.hx - d.x) * opts.spring; d.vy += (d.hy - d.y) * opts.spring; d.vx *= opts.damping; d.vy *= opts.damping; d.x += d.vx; d.y += d.vy;
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
// 可调参数：点间距、推开半径、弹簧刚度（拉回的力）、阻尼（每帧保留的速度，越大越“弹”）
const dotParams = radius => [
  { k: 'gap', label: '点间距', type: 'range', min: 12, max: 60, step: 1, def: 26, unit: 'px' },
  { k: 'radius', label: '推开半径', type: 'range', min: 40, max: 320, step: 5, def: radius, unit: 'px' },
  { k: 'spring', label: '弹簧刚度', type: 'range', min: 0.01, max: 0.2, step: 0.005, def: 0.06 },
  { k: 'damping', label: '阻尼', type: 'range', min: 0.6, max: 0.95, step: 0.01, def: 0.82 },
];
MH.register({ id: 'dots', name: '磁性点阵', cat: '背景', tech: 'Canvas 2D · Spring-Damper Physics', desc: '整屏点阵被鼠标推开再弹回，推开的点变大、变成强调色；点击发出一圈冲击波。', params: dotParams(150), mount: dotField(false) });
MH.register({ id: 'dots-quiet', name: '安静点阵', cat: '背景', tech: 'Canvas 2D · Spring-Damper Physics', params: dotParams(110), desc: '同一套点阵的阅读版：点更淡、推开的范围和力度更小，没有冲击波，适合长文页面。', mount: dotField(true) });
