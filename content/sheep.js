/*
 * 小羊起身提醒 · 页面动画层
 *
 * 草地纹理移植自 github.com/aosgu/web / pastoral-meadow-diorama
 * src/utils/textureGenerator.ts：generateMeadowTexture + stippleDioramaBorder，
 * 改为纯 Canvas 2D，去掉 Three.js 依赖，保留原微缩地块的手绘羽化纸边。
 * 羊群状态机参考同项目 ThreeCanvas.tsx 的 walk / graze / idle 行为。
 */
(() => {
  'use strict';

  const ROOT_ID = 'sheep-break-root';
  const DURATION = 12000;
  const FADE_AT = 10000;
  const ENTER_MS = 2200;
  const FLOCK_SIZE = 9;
  const OUT = 130;

  const WOOL_COLORS = [
    '#fcfbf7', '#fcfbf7', '#fcfbf7', '#f5ecd8', '#f5ecd8',
    '#fbcfe8', '#e9d5ff', '#a7f3d0', '#fef08a',
  ];
  const DARK = '#1c1917';

  if (document.getElementById(ROOT_ID)) return;

  /* ------------------------------------------------------------------ *
   * 手绘纸边：原项目 stippleDioramaBorder，按输出像素绘制遮罩
   * ------------------------------------------------------------------ */
  function stippleDioramaBorder(ctx, size) {
    const mask = document.createElement('canvas');
    mask.width = size;
    mask.height = size;
    const m = mask.getContext('2d');
    if (!m) return;

    const blobPath = (target) => {
      const steps = 220;
      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const ex = Math.sign(cos) * Math.pow(Math.abs(cos), 0.62);
        const ey = Math.sign(sin) * Math.pow(Math.abs(sin), 0.62);
        const wobble = 1 + Math.sin(angle * 5.3) * 0.022 + Math.cos(angle * 9.1 + 1.4) * 0.016;
        const x = size * 0.5 + ex * size * 0.446 * wobble;
        const y = size * 0.5 + ey * size * 0.445 * wobble;
        if (i === 0) target.moveTo(x, y);
        else target.lineTo(x, y);
      }
      target.closePath();
    };

    m.fillStyle = '#ffffff';
    m.beginPath();
    blobPath(m);
    m.fill();

    // 与原项目同密度，点收紧到轮廓附近，避免放大后变成离散碎斑
    const dots = Math.round((size * size) / 320);
    for (let i = 0; i < dots; i++) {
      const angle = Math.random() * Math.PI * 2;
      const edgeFactor = Math.random();
      const depth = size * (0.414 + edgeFactor * 0.052);
      const wobble = 1 + Math.sin(angle * 5.3) * 0.022 + Math.cos(angle * 9.1 + 1.4) * 0.016;
      const ex = Math.sign(Math.cos(angle)) * Math.pow(Math.abs(Math.cos(angle)), 0.62);
      const ey = Math.sign(Math.sin(angle)) * Math.pow(Math.abs(Math.sin(angle)), 0.62);
      const x = size * 0.5 + ex * depth * wobble;
      const y = size * 0.5 + ey * depth * wobble;
      const r = 0.8 + Math.pow(Math.random(), 2.4) * 6;
      m.fillStyle = `rgba(255,255,255,${0.45 + Math.random() * 0.4})`;
      m.beginPath();
      m.arc(x, y, r, 0, Math.PI * 2);
      m.fill();
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.filter = `blur(${Math.max(4, size / 150)}px)`;
    ctx.drawImage(mask, 0, 0);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ *
   * 草地：原项目 generateMeadowTexture 的 Canvas 2D 绘制逻辑
   * 用 ctx.scale 保持原始 2048 坐标系，输出尺寸可缩。
   * ------------------------------------------------------------------ */
  function generateMeadowTexture(size) {
    const S = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.scale(size / S, size / S);
    const s = S;

    // 1. 草底与渐变
    ctx.fillStyle = '#7ac348';
    ctx.fillRect(0, 0, s, s);
    const grad = ctx.createLinearGradient(0, 0, s, s);
    grad.addColorStop(0, '#82cc4a');
    grad.addColorStop(0.5, '#76bf42');
    grad.addColorStop(1, '#6eb63b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);

    for (let i = 0; i < 120; i++) {
      const rx = Math.random() * s;
      const ry = Math.random() * s;
      const rad = 60 + Math.random() * 180;
      const g = ctx.createRadialGradient(rx, ry, 0, rx, ry, rad);
      const lighter = Math.random() > 0.4;
      g.addColorStop(0, lighter ? 'rgba(145,215,80,0.25)' : 'rgba(95,165,45,0.2)');
      g.addColorStop(1, 'rgba(120,195,65,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(rx, ry, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. 右下角麦田
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(s * 0.58, s * 0.65);
    ctx.lineTo(s * 0.95, s * 0.48);
    ctx.lineTo(s * 0.95, s * 0.92);
    ctx.lineTo(s * 0.52, s * 0.92);
    ctx.closePath();
    const wheat = ctx.createLinearGradient(s * 0.6, s * 0.6, s * 0.9, s * 0.9);
    wheat.addColorStop(0, '#d9b147');
    wheat.addColorStop(1, '#e8c459');
    ctx.fillStyle = wheat;
    ctx.fill();
    ctx.clip();
    ctx.strokeStyle = 'rgba(180,140,40,0.2)';
    ctx.lineWidth = 4;
    for (let x = s * 0.5; x < s * 0.95; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, s * 0.6);
      ctx.lineTo(x + 120, s * 0.92);
      ctx.stroke();
    }
    ctx.restore();

    // 3. 树篱
    ctx.save();
    ctx.strokeStyle = '#3d7821';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(s * 0.48, s * 0.12);
    ctx.quadraticCurveTo(s * 0.42, s * 0.35, s * 0.36, s * 0.62);
    ctx.quadraticCurveTo(s * 0.32, s * 0.78, s * 0.28, s * 0.92);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.65, s * 0.15);
    ctx.quadraticCurveTo(s * 0.72, s * 0.32, s * 0.78, s * 0.46);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.36, s * 0.62);
    ctx.quadraticCurveTo(s * 0.22, s * 0.58, s * 0.15, s * 0.52);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.58, s * 0.65);
    ctx.quadraticCurveTo(s * 0.54, s * 0.78, s * 0.52, s * 0.92);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.58, s * 0.65);
    ctx.quadraticCurveTo(s * 0.75, s * 0.56, s * 0.95, s * 0.48);
    ctx.stroke();
    ctx.restore();

    // 4. 沙土小路
    ctx.save();
    ctx.strokeStyle = '#e2cd9f';
    ctx.lineWidth = 38;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(s * 0.6, s * 0.12);
    ctx.bezierCurveTo(s * 0.54, s * 0.35, s * 0.57, s * 0.65, s * 0.64, s * 0.92);
    ctx.stroke();
    ctx.strokeStyle = '#eedcb2';
    ctx.lineWidth = 20;
    ctx.stroke();
    ctx.restore();

    // 5. 左侧蜿蜒小河
    ctx.save();
    ctx.strokeStyle = '#62a838';
    ctx.lineWidth = 104;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(s * 0.26, s * 0.14);
    ctx.bezierCurveTo(s * 0.18, s * 0.35, s * 0.27, s * 0.65, s * 0.15, s * 0.92);
    ctx.stroke();
    ctx.strokeStyle = '#2b7fff';
    ctx.lineWidth = 78;
    ctx.stroke();
    ctx.strokeStyle = '#64aaff';
    ctx.lineWidth = 44;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      const t = (i + 1) / 9;
      const px = s * (0.24 - Math.sin(t * Math.PI) * 0.08);
      const py = s * (0.16 + t * 0.72);
      ctx.beginPath();
      ctx.moveTo(px - 15, py);
      ctx.quadraticCurveTo(px, py + 8, px + 15, py);
      ctx.stroke();
    }
    ctx.restore();

    // 6. 野花
    const flowerColors = ['#fffbe8', '#ffe853', '#fbcfe8', '#fed7aa', '#fef08a'];
    for (let i = 0; i < 1800; i++) {
      const fx = s * (0.12 + Math.random() * 0.76);
      const fy = s * (0.12 + Math.random() * 0.76);
      if (fx < s * 0.3 && fx > s * 0.12 && fy > s * 0.2 && fy < s * 0.85) continue;
      ctx.fillStyle = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      const r = 2.5 + Math.random() * 3.5;
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(fx, fy, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. 手绘羽化纸边（原微缩地块）
    stippleDioramaBorder(ctx, size);

    const webp = canvas.toDataURL('image/webp', 0.92);
    return webp.indexOf('data:image/webp') === 0
      ? webp
      : canvas.toDataURL('image/png');
  }

  /* ------------------------------------------------------------------ *
   * 云朵小羊（2D 复刻原项目 createSheepMesh 的球簇羊毛造型）
   * ------------------------------------------------------------------ */
  function sheepSVG(wool) {
    const leg = (alt) =>
      `<g class="swing${alt ? ' alt' : ''}">` +
      `<rect x="-4" y="0" width="8" height="23" rx="4" fill="${DARK}"/>` +
      `<ellipse cx="0" cy="23" rx="5" ry="3" fill="${DARK}"/></g>`;

    return `<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
      <g class="legs-back">
        <g transform="translate(48,64)">${leg(false)}</g>
        <g transform="translate(59,64)">${leg(true)}</g>
      </g>
      <g class="body-wrap">
        <g class="wool" fill="${wool}" stroke="rgba(31,61,16,0.10)" stroke-width="1">
          <circle cx="52" cy="47" r="21"/>
          <circle cx="72" cy="39" r="23"/>
          <circle cx="93" cy="47" r="20"/>
          <circle cx="37" cy="57" r="16"/>
          <circle cx="60" cy="59" r="21"/>
          <circle cx="84" cy="59" r="20"/>
          <circle cx="105" cy="57" r="14"/>
          <circle cx="28" cy="43" r="10"/>
        </g>
        <g transform="translate(110,50)">
          <g class="head-tilt">
            <ellipse cx="-8" cy="0" rx="9" ry="4.5" transform="rotate(-28 -8 0)" fill="${DARK}"/>
            <ellipse cx="1" cy="7" rx="10" ry="13" fill="${DARK}"/>
            <circle cx="-1" cy="-2" r="7.5" fill="${wool}"/>
            <circle cx="5" cy="5" r="2.6" fill="#ffffff"/>
            <circle cx="5.7" cy="5" r="1.3" fill="#111111"/>
          </g>
        </g>
      </g>
      <g class="legs-front">
        <g transform="translate(86,64)">${leg(true)}</g>
        <g transform="translate(97,64)">${leg(false)}</g>
      </g>
    </svg>`;
  }

  const CSS = `
    :host {
      all: initial; display: block; position: fixed !important;
      inset: 0 !important; z-index: 2147483647 !important;
      pointer-events: none !important; margin: 0 !important;
      padding: 0 !important; border: 0 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
    }
    .stage { position: absolute; inset: 0; overflow: hidden; opacity: 0; transition: opacity 1.8s ease; }
    .stage.in { opacity: 1; transition-duration: .5s; }
    .meadow {
      position: absolute; left: 50%; top: 50%;
      transform: translate(-50%, -50%);
      opacity: .9;
      background-position: center; background-size: 100% 100%; background-repeat: no-repeat;
    }
    .flock { position: absolute; inset: 0; }
    .sheep { position: absolute; left: 0; top: 0; opacity: 0; will-change: transform; }
    .sheep-inner { position: relative; width: 112px; height: 80px; transform-origin: 50% 100%; }
    .sheep-inner svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .sheep-shadow {
      position: absolute; left: 6%; right: 6%; bottom: 3px; height: 11px;
      border-radius: 50%;
      background: radial-gradient(ellipse at center, rgba(31,61,16,.34), rgba(31,61,16,0) 72%);
    }
    .swing { transform-box: fill-box; transform-origin: 50% 0%; }
    .head-tilt { transform-box: fill-box; transform-origin: 0% 30%; }
    .body-wrap { transform-box: fill-box; transform-origin: 50% 80%; }
    .wool { transform-box: fill-box; transform-origin: 50% 90%; }
    .walking .swing { animation: swing .28s ease-in-out infinite alternate; }
    .walking .swing.alt { animation-direction: alternate-reverse; }
    .walking .body-wrap { animation: bob .28s ease-in-out infinite alternate; }
    .grazing .head-tilt { transform: rotate(34deg) translateY(4px); }
    .grazing .body-wrap { transform: translateY(2px); }
    .idle .head-tilt { animation: look 3.2s ease-in-out infinite; }
    .idle .wool { animation: breathe 1.8s ease-in-out infinite; }
    @keyframes swing { from { transform: rotate(-22deg); } to { transform: rotate(22deg); } }
    @keyframes bob { from { transform: translateY(0); } to { transform: translateY(-2px); } }
    @keyframes look { 0%,100% { transform: rotate(-5deg); } 50% { transform: rotate(6deg); } }
    @keyframes breathe { 0%,100% { transform: scale(1,1); } 50% { transform: scale(1.015,.985); } }
    .card {
      position: absolute; right: 24px; bottom: 24px;
      display: flex; align-items: center; gap: 14px;
      padding: 10px 12px 10px 16px;
      background: rgba(246,243,235,.95);
      border: 1px solid rgba(61,120,33,.18);
      border-radius: 14px;
      box-shadow: 0 8px 28px rgba(31,61,16,.18);
      pointer-events: auto;
    }
    .card-copy { display: flex; flex-direction: column; line-height: 1.35; }
    .card-copy b { font-size: 13px; font-weight: 650; color: #23301c; }
    .card-copy span { font-size: 11px; color: #7a8a6e; }
    .snooze {
      font: inherit; font-size: 12px; color: #fff; background: #65a30d;
      border: none; border-radius: 9px; padding: 7px 12px;
      cursor: pointer; white-space: nowrap;
    }
    .snooze:hover { background: #4d8210; }
  `;

  /* ------------------------------------------------------------------ *
   * 构建 Shadow DOM
   * ------------------------------------------------------------------ */
  let meadowURL = '';
  try {
    meadowURL = generateMeadowTexture(768);
  } catch (e) {
    meadowURL = '';
  }

  const W = window.innerWidth;
  const H = window.innerHeight;
  // 页面中心的微缩草地，其余区域露出原页面
  const FIELD = Math.min(Math.min(W, H) * 0.72, 860);
  const PAD = FIELD * 0.13; // 羽化边内缩，羊只在实心草地上活动
  const BOUNDS = {
    left: (W - FIELD) / 2 + PAD,
    top: (H - FIELD) / 2 + PAD,
    right: (W + FIELD) / 2 - PAD,
    bottom: (H + FIELD) / 2 - PAD,
  };

  function spotInField(scale) {
    const maxX = Math.max(BOUNDS.left, BOUNDS.right - 112 * scale);
    const maxY = Math.max(BOUNDS.top, BOUNDS.bottom - 80 * scale);
    return {
      x: BOUNDS.left + Math.random() * Math.max(1, maxX - BOUNDS.left),
      y: BOUNDS.top + Math.random() * Math.max(1, maxY - BOUNDS.top),
    };
  }

  const host = document.createElement('div');
  host.id = ROOT_ID;
  const root = host.attachShadow({ mode: 'open' });

  root.innerHTML = `
    <style>${CSS}</style>
    <div class="stage">
      <div class="meadow"></div>
      <div class="flock"></div>
      <div class="card">
        <div class="card-copy"><b>起来动一动</b><span>小羊们来接你啦</span></div>
        <button class="snooze" type="button">稍后 10 分钟</button>
      </div>
    </div>`;

  // 超长 data URL 直接写样式，不拼进 HTML 属性
  const meadowEl = root.querySelector('.meadow');
  meadowEl.style.width = `${FIELD}px`;
  meadowEl.style.height = `${FIELD}px`;
  meadowEl.style.backgroundImage = meadowURL
    ? `url(${meadowURL})`
    : 'linear-gradient(145deg,#9fd866,#6eb63b)';

  try {
    (document.documentElement || document.body).appendChild(host);
  } catch (e) {
    return;
  }

  const stage = root.querySelector('.stage');
  const flock = root.querySelector('.flock');
  const DIRS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

  const sheep = [];
  for (let i = 0; i < FLOCK_SIZE; i++) {
    const d = DIRS[i % DIRS.length];
    const sx = d[0] === 0 ? W * (0.15 + Math.random() * 0.7) : d[0] > 0 ? W + OUT : -OUT;
    const sy = d[1] === 0 ? H * (0.15 + Math.random() * 0.7) : d[1] > 0 ? H + OUT : -OUT;
    const scale = 0.62 + Math.random() * 0.36;
    const spot = spotInField(scale);
    const tx = spot.x;
    const ty = spot.y;

    const el = document.createElement('div');
    el.className = 'sheep';
    const inner = document.createElement('div');
    inner.className = 'sheep-inner walking';
    inner.innerHTML = `<div class="sheep-shadow"></div>${sheepSVG(WOOL_COLORS[i % WOOL_COLORS.length])}`;
    el.appendChild(inner);
    flock.appendChild(el);

    sheep.push({
      el, inner,
      x: sx, y: sy, sx, sy, tx, ty, scale,
      dirX: tx > sx ? 1 : -1,
      delay: i * 110,
      action: 'walk',
      until: 0,
    });
  }

  function setAction(s, action) {
    if (s.action === action) return;
    s.action = action;
    s.inner.className = `sheep-inner ${action === 'graze' ? 'grazing' : action === 'idle' ? 'idle' : 'walking'}`;
  }

  let stopped = false;
  let fading = false;
  let rafId = 0;
  const start = performance.now();

  function dismiss(snooze) {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(rafId);
    if (snooze && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage({ type: 'snooze' });
      } catch (e) { /* 预览页面无扩展环境 */ }
    }
    host.remove();
  }

  root.querySelector('.snooze').addEventListener('click', () => dismiss(true));
  requestAnimationFrame(() => stage.classList.add('in'));

  function frame(now) {
    if (stopped) return;
    const t = now - start;
    if (t >= DURATION) {
      stopped = true;
      host.remove();
      return;
    }
    if (!fading && t >= FADE_AT) {
      fading = true;
      stage.classList.remove('in');
    }

    for (const s of sheep) {
      const st = t - s.delay;
      if (st < 0) continue;
      if (s.el.style.opacity !== '1') s.el.style.opacity = '1';

      if (st < ENTER_MS) {
        const p = Math.min(1, st / ENTER_MS);
        const e = 1 - Math.pow(1 - p, 3);
        const nx = s.sx + (s.tx - s.sx) * e;
        const ny = s.sy + (s.ty - s.sy) * e;
        if (Math.abs(nx - s.x) > 0.01) s.dirX = nx > s.x ? 1 : -1;
        s.x = nx;
        s.y = ny;
        setAction(s, 'walk');
      } else {
        if (t > s.until) {
          const r = Math.random();
          const action = r < 0.45 ? 'walk' : r < 0.78 ? 'graze' : 'idle';
          setAction(s, action);
          s.until = t + (action === 'walk' ? 1200 + Math.random() * 1400 : 1400 + Math.random() * 1800);
          if (action === 'walk') {
            const angle = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 90;
            const maxX = Math.max(BOUNDS.left, BOUNDS.right - 112 * s.scale);
            const maxY = Math.max(BOUNDS.top, BOUNDS.bottom - 80 * s.scale);
            s.tx = Math.max(BOUNDS.left, Math.min(maxX, s.x + Math.cos(angle) * dist));
            s.ty = Math.max(BOUNDS.top, Math.min(maxY, s.y + Math.sin(angle) * dist));
            s.dirX = s.tx > s.x ? 1 : -1;
          }
        }
        if (s.action === 'walk') {
          const dx = s.tx - s.x;
          const dy = s.ty - s.y;
          const len = Math.hypot(dx, dy);
          if (len > 2) {
            const step = Math.min(len, 1.1);
            s.x += (dx / len) * step;
            s.y += (dy / len) * step;
          }
        }
      }

      s.el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`;
      s.inner.style.transform = `scaleX(${s.dirX < 0 ? -1 : 1}) scale(${s.scale})`;
    }
    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);
})();
