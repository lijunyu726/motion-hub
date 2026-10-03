// ───── 太阳 ⇄ 月亮：一个圆 + 一个“咬掉一口”的遮罩 + 八条光芒；遮罩移进来、光芒收起就是月亮 ─────
MH.register({
  id: 'sun-moon', name: '太阳月亮开关', cat: '交互', tech: 'SVG 遮罩 · CSS 变换',
  desc: '深浅模式开关的图标：浅色时是月亮（点了变深色），深色时是太阳；切换时光芒收起、圆被咬掉一口变成月牙。',
  mount(el, opts) {
    const rays = [0, 45, 90, 135, 180, 225, 270, 315].map(a => `<line x1="12" y1="2.5" x2="12" y2="4.5" transform="rotate(${a} 12 12)"/>`).join('');
    const id = 'sm' + Math.random().toString(36).slice(2, 7);
    el.insertAdjacentHTML('beforeend', `<div class="ui-center"><button class="sm moon" type="button" aria-label="切换"><svg viewBox="0 0 24 24"><mask id="${id}"><rect x="-4" y="-4" width="32" height="32" fill="#fff"/><circle class="bite" cx="28" cy="2" r="7.5" fill="#000"/></mask><circle class="core" cx="12" cy="12" r="5" fill="currentColor" mask="url(#${id})"/><g class="rays" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">${rays}</g></svg></button><span class="sm-tip">点一下</span></div>`);
    const box = el.lastElementChild, btn = box.querySelector('.sm');
    let running = false, timer = 0, lastReal = -1e9;
    btn.addEventListener('click', () => { lastReal = performance.now(); btn.classList.toggle('moon'); });
    const auto = () => { if (!running) return; if (performance.now() - lastReal > 3000) btn.classList.toggle('moon'); timer = setTimeout(auto, 1800); };
    return { pause() { running = false; clearTimeout(timer); }, resume() { if (running || MH.still()) return; running = true; timer = setTimeout(auto, 1200); }, destroy() { this.pause(); box.remove(); } };
  },
});
