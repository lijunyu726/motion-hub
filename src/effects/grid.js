// 背景动效：画在 canvas 上，尺寸跟随容器，h.s 是缩放系数（全屏约 1，缩略图约 0.45）。

// ───── 坐标网格：坐标纸 + 十字准线 + 坐标读数；鼠标经过的格子“加热”，四角亮起角标后慢慢冷却 ─────
MH.register({
  id: 'grid', name: '坐标网格', cat: '背景', tech: 'Canvas 2D · Heat Decay',
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
