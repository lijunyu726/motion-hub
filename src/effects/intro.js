// 点阵拼字片头：画面是时间 t 的纯函数 frame(t)，同一个 t 永远画出同一帧，所以能随时跳到结尾、重播、在任意尺寸重画最后一帧。
//   0.0–1.3s  网格点从文字中心一圈圈亮起
//   1.2–3.4s  屏幕外的点沿弧线飞进来，在网格缝隙里拼出文字；字形里的网格点同时变成强调色
//   3.4–6.0s  字幕依次闪过，每出现一个，从文字中心荡开一圈波纹
//   6.0–6.8s  收住，最后一帧可以直接当背景“定格”
MH.register({
  id: 'intro', name: '点阵拼字片头', cat: '片头', tech: 'Canvas · 纯函数时间轴 · 文字采样',
  desc: '网格点亮起，屏幕外的点飞进来拼成文字，字幕依次闪过并荡开波纹；播完定格。点一下重播。',
  usage: `MH.effects.find(e => e.id === 'intro').mount(el, { text: 'LJY', captions: ['…'] }).resume();`,
  mount(el, opts) {
    const TEXT = opts.text || 'LJY', CAPS = opts.captions || ['背景', '过渡', '翻页', '交互'];
    const T_END = 6.8, HOLD = 2.6, { clamp, hash } = MH;
    const ease = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    const PULSES = [1.0, 3.4, 4.05, 4.7, 5.35], CAP_AT = k => 3.4 + k * .65;
    let L = null, C, t0 = performance.now();
    const layout = (W, H, s) => {
      const GAP = Math.max(8, 22 * s), cx = W / 2, cy = H * .44, fs = Math.min(H * .42, W * .3);
      const off = document.createElement('canvas'); off.width = Math.ceil(W); off.height = Math.ceil(H);
      const c = off.getContext('2d');
      c.font = `700 ${fs}px "Iowan Old Style", Palatino, Georgia, serif`;
      if ('letterSpacing' in c) c.letterSpacing = `${fs * .06}px`;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(TEXT, cx, cy);
      c.lineWidth = fs * .05; c.lineJoin = 'round'; c.strokeText(TEXT, cx, cy); // 加粗细笔画，点阵字才压得住
      const mask = c.getImageData(0, 0, off.width, off.height).data;
      const inside = (x, y) => { x = Math.round(x); y = Math.round(y); return x >= 0 && y >= 0 && x < off.width && y < off.height && mask[(y * off.width + x) * 4 + 3] > 120; };
      const ox = (W % GAP) / 2, oy = (H % GAP) / 2, diag = Math.hypot(W, H), grid = [], fly = [];
      let k = 0;
      for (let y = oy; y < H; y += GAP) for (let x = ox; x < W; x += GAP) {
        grid.push({ x, y, d: Math.hypot(x - cx, y - cy), letter: inside(x, y), h: hash(k++) });
        if (inside(x + GAP / 2, y + GAP / 2)) {
          const i = fly.length, a = hash(i * 3 + 1) * Math.PI * 2, R0 = diag * (.6 + .3 * hash(i * 3 + 2));
          fly.push({ tx: x + GAP / 2, ty: y + GAP / 2, sx: cx + Math.cos(a) * R0, sy: cy + Math.sin(a) * R0, bend: (hash(i * 3 + 3) - .5) * .9, delay: 1.2 + 1.05 * hash(i * 7 + 5) });
        }
      }
      return { W, H, s, cx, cy, grid, fly, diag };
    };
    const frame = (ctx, t) => {
      const { W, H, s, grid, fly, diag, cx, cy } = L;
      ctx.clearRect(0, 0, W, H);
      const base = new Path2D(), hot = new Path2D(), add = (p, x, y, r) => { p.moveTo(x + r, y); p.arc(x, y, r, 0, Math.PI * 2); };
      for (const g of grid) {
        const appear = clamp((t - g.d / diag * 1.2) / .3); if (appear <= 0) continue;
        let bump = 0;
        for (const p of PULSES) { const age = t - p; if (age > 0 && age < 1.6) bump += Math.exp(-(((g.d - age * 900 * s) / (46 * s)) ** 2)) * (1 - age / 1.6); }
        const ang = Math.atan2(g.y - cy, g.x - cx), push = bump * 7 * s;
        const lit = g.letter ? clamp((t - 2.5 - g.h * .6) / .4) : 0;
        add(lit > .5 || bump > .45 ? hot : base, g.x + Math.cos(ang) * push, g.y + Math.sin(ang) * push, (1.05 + bump * 1.6 + lit * 1.2) * Math.max(.6, s) * (.4 + .6 * appear));
      }
      for (const f of fly) {
        const p = clamp((t - f.delay) / 1.15); if (p <= 0) continue;
        const e = ease(p), mx = (f.sx + f.tx) / 2 - (f.ty - f.sy) * f.bend, my = (f.sy + f.ty) / 2 + (f.tx - f.sx) * f.bend;
        add(hot, (1 - e) ** 2 * f.sx + 2 * (1 - e) * e * mx + e * e * f.tx, (1 - e) ** 2 * f.sy + 2 * (1 - e) * e * my + e * e * f.ty, (1.2 + 1.1 * e) * Math.max(.6, s));
      }
      ctx.fillStyle = C.dim; ctx.globalAlpha = C.night ? .4 : .45; ctx.fill(base);
      ctx.fillStyle = C.accent; ctx.globalAlpha = 1; ctx.fill(hot);
      CAPS.forEach((cap, k) => { // 字幕：文字下方居中，带编号
        const a = t - CAP_AT(k), life = .62; if (a < 0 || a > life) return;
        const o = clamp(a / .12) * clamp((life - a) / .14), dy = (1 - clamp(a / .2)) * 18 * s, fs = Math.max(14, Math.min(W * .05, 56 * s));
        ctx.globalAlpha = o; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = C.ink; ctx.font = `900 ${fs}px "Songti SC","STSong","Noto Serif SC",serif`; ctx.fillText(cap, W / 2, H * .86 + dy);
        ctx.fillStyle = C.accent; ctx.font = `500 ${Math.max(9, fs * .24)}px "SF Mono",Menlo,monospace`;
        ctx.fillText(`${String(k + 1).padStart(2, '0')} / ${String(CAPS.length).padStart(2, '0')}`, W / 2, H * .86 - fs * 1.05 + dy);
      });
      ctx.globalAlpha = 1;
    };
    return MH.canvasHost(el, opts, h => {
      C = h.colors();
      return {
        ghostClick: false,
        resize(W, H) { L = layout(W, H, h.s); },
        theme() { C = h.colors(); },
        down() { t0 = performance.now(); },
        frame(now) {
          if (!L) return;
          if (MH.still()) return frame(h.ctx, T_END);
          const t = ((now - t0) / 1000) % (T_END + HOLD); // 播完定格一会儿，再从头播
          frame(h.ctx, Math.min(t, T_END));
        },
      };
    });
  },
});
