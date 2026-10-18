/* ============================================================
 * textures.js — 日系花海场景的程序化贴图（Canvas 现画，零素材）
 * 依赖全局 THREE
 * ============================================================ */
(function () {
  'use strict';
  const T = {};

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function toTex(c, opt) {
    opt = opt || {};
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (opt.repeat) t.repeat.set(opt.repeat[0], opt.repeat[1]);
    if (opt.clamp) t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 8;
    if (opt.srgb !== false) t.encoding = THREE.sRGBEncoding;
    t.needsUpdate = true;
    return t;
  }

  /* ---------- 草地 ---------- */
  T.meadow = function (seed) {
    const R = rng(seed || 11);
    const W = 512, H = 512;
    const c = canvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#5c763a'; g.fillRect(0, 0, W, H);
    // 色块
    for (let i = 0; i < 900; i++) {
      const greens = [[92, 118, 58], [74, 100, 46], [110, 132, 68], [60, 84, 38], [128, 142, 80]];
      const col = greens[(R() * greens.length) | 0];
      g.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (0.12 + R() * 0.2).toFixed(2) + ')';
      g.beginPath();
      g.ellipse(R() * W, R() * H, 6 + R() * 30, 4 + R() * 18, R() * 3, 0, 6.28);
      g.fill();
    }
    // 细草
    for (let i = 0; i < 3200; i++) {
      const x = R() * W, y = R() * H;
      const col = 70 + R() * 60;
      g.strokeStyle = 'rgba(' + Math.round(col * 0.72) + ',' + Math.round(col) + ',' + Math.round(col * 0.42) + ',' + (0.14 + R() * 0.24).toFixed(2) + ')';
      g.lineWidth = 0.6 + R() * 0.8;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (R() - 0.5) * 5, y - 2 - R() * 5);
      g.stroke();
    }
    // 零星小花点（让草地更像花海）
    for (let i = 0; i < 1400; i++) {
      const white = R() < 0.52;
      const pink = !white && R() < 0.6;
      g.fillStyle = white ? 'rgba(246,244,226,' + (0.3 + R() * 0.4).toFixed(2) + ')'
        : pink ? 'rgba(248,196,214,' + (0.3 + R() * 0.45).toFixed(2) + ')'
          : 'rgba(244,208,120,' + (0.3 + R() * 0.4).toFixed(2) + ')';
      g.beginPath();
      g.arc(R() * W, R() * H, 0.8 + R() * 1.6, 0, 6.28);
      g.fill();
    }
    return toTex(c);
  };

  /* ---------- 波斯菊（粉色小花） ---------- */
  T.cosmos = function (seed) {
    const R = rng(seed || 31);
    const W = 256, H = 256;
    const c = canvas(W, H), g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    // 茎与细叶
    for (let i = 0; i < 14; i++) {
      const bx = 20 + R() * 216;
      const top = 40 + R() * 120;
      g.strokeStyle = 'rgba(74,102,44,0.9)';
      g.lineWidth = 1.2 + R() * 1.2;
      g.beginPath();
      g.moveTo(bx, 254);
      g.quadraticCurveTo(bx + (R() - 0.5) * 14, (254 + top) / 2, bx + (R() - 0.5) * 30, top);
      g.stroke();
      // 羽状叶
      for (let k = 0; k < 4; k++) {
        const t = 0.25 + k * 0.18;
        const x = bx + (R() - 0.5) * 8, y = 254 - (254 - top) * t;
        g.strokeStyle = 'rgba(66,94,40,0.75)';
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - 6 - R() * 6, y - 6 - R() * 8);
        g.stroke();
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 6 + R() * 6, y - 6 - R() * 8);
        g.stroke();
      }
    }
    // 花
    function flower(cx, cy, r, hue) {
      const petals = 8;
      for (let p = 0; p < petals; p++) {
        const a = (p / petals) * 6.28 + R() * 0.15;
        const px = cx + Math.cos(a) * r * 0.55;
        const py = cy + Math.sin(a) * r * 0.55;
        const grad = g.createRadialGradient(px, py, 0, px, py, r * 0.55);
        grad.addColorStop(0, hue[0]);
        grad.addColorStop(1, hue[1]);
        g.fillStyle = grad;
        g.save();
        g.translate(px, py);
        g.rotate(a);
        g.beginPath();
        g.ellipse(0, 0, r * 0.52, r * 0.26, 0, 0, 6.28);
        g.fill();
        g.restore();
      }
      g.fillStyle = '#f2c94c';
      g.beginPath(); g.arc(cx, cy, r * 0.22, 0, 6.28); g.fill();
      g.fillStyle = '#d8a72e';
      g.beginPath(); g.arc(cx, cy, r * 0.12, 0, 6.28); g.fill();
    }
    const pinks = [['rgba(255,210,224,1)', 'rgba(240,150,180,1)'], ['rgba(252,232,240,1)', 'rgba(236,176,196,1)'], ['rgba(255,236,246,1)', 'rgba(232,160,190,0.9)']];
    for (let i = 0; i < 9; i++) {
      flower(24 + R() * 208, 16 + R() * 130, 9 + R() * 9, pinks[(R() * pinks.length) | 0]);
    }
    return toTex(c, { clamp: true });
  };

  /* ---------- 白色雏菊 / 满天星 ---------- */
  T.daisy = function (seed) {
    const R = rng(seed || 47);
    const W = 256, H = 256;
    const c = canvas(W, H), g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) {
      const bx = 10 + R() * 236;
      const top = 70 + R() * 150;
      g.strokeStyle = 'rgba(84,110,52,0.85)';
      g.lineWidth = 0.9 + R() * 0.8;
      g.beginPath();
      g.moveTo(bx, 254);
      g.quadraticCurveTo(bx + (R() - 0.5) * 10, (254 + top) / 2, bx + (R() - 0.5) * 18, top);
      g.stroke();
      const isBaby = R() < 0.55;
      const r = isBaby ? 1.6 + R() * 1.4 : 3.2 + R() * 2.6;
      const px = bx + (R() - 0.5) * 12, py = top;
      if (isBaby) {
        g.fillStyle = 'rgba(250,250,244,0.95)';
        for (let k = 0; k < 4; k++) {
          g.beginPath();
          g.arc(px + (R() - 0.5) * 14, py + (R() - 0.5) * 12, 0.9 + R() * 1.2, 0, 6.28);
          g.fill();
        }
      } else {
        const n = 7 + ((R() * 4) | 0);
        for (let p = 0; p < n; p++) {
          const a = (p / n) * 6.28;
          g.fillStyle = 'rgba(252,252,246,0.98)';
          g.beginPath();
          g.ellipse(px + Math.cos(a) * r * 0.6, py + Math.sin(a) * r * 0.6, r * 0.55, r * 0.28, a, 0, 6.28);
          g.fill();
        }
        g.fillStyle = '#f0c64a';
        g.beginPath(); g.arc(px, py, r * 0.3, 0, 6.28); g.fill();
      }
    }
    return toTex(c, { clamp: true });
  };

  /* ---------- 油菜花（黄色） ---------- */
  T.rapeseed = function (seed) {
    const R = rng(seed || 59);
    const W = 256, H = 256;
    const c = canvas(W, H), g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) {
      const bx = 8 + R() * 240;
      const top = 30 + R() * 140;
      g.strokeStyle = 'rgba(78,108,46,0.9)';
      g.lineWidth = 1.1 + R() * 1.0;
      g.beginPath();
      g.moveTo(bx, 254);
      g.quadraticCurveTo(bx + (R() - 0.5) * 12, (254 + top) / 2, bx + (R() - 0.5) * 26, top);
      g.stroke();
      // 黄花簇
      const px = bx + (R() - 0.5) * 26, py = top;
      for (let k = 0; k < 9; k++) {
        const fx = px + (R() - 0.5) * 16, fy = py + (R() - 0.5) * 14;
        const r = 1.6 + R() * 2.2;
        const grad = g.createRadialGradient(fx, fy, 0, fx, fy, r);
        grad.addColorStop(0, 'rgba(255,238,150,1)');
        grad.addColorStop(1, 'rgba(244,196,52,0.95)');
        g.fillStyle = grad;
        g.beginPath(); g.arc(fx, fy, r, 0, 6.28); g.fill();
      }
    }
    // 底部叶
    for (let i = 0; i < 8; i++) {
      g.fillStyle = 'rgba(88,116,52,0.9)';
      g.beginPath();
      g.ellipse(20 + R() * 216, 230 + R() * 20, 16 + R() * 14, 6 + R() * 5, R() * 3, 0, 6.28);
      g.fill();
    }
    return toTex(c, { clamp: true });
  };

  /* ---------- 草叶簇 ---------- */
  T.grassTuft = function (seed) {
    const R = rng(seed || 123);
    const W = 256, H = 256;
    const c = canvas(W, H), g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    for (let i = 0; i < 46; i++) {
      const lean = (R() - 0.5) * 190;
      const h = 70 + R() * 180;
      const tipX = 128 + lean, tipY = 252 - h;
      const shade = 0.55 + R() * 0.6;
      g.strokeStyle = 'rgba(' + Math.round(58 + 54 * shade) + ',' + Math.round(84 + 66 * shade) + ',' + Math.round(34 + 26 * shade) + ',0.95)';
      g.lineWidth = 1.3 + R() * 3.0;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(128 + (R() - 0.5) * 26, 252);
      g.quadraticCurveTo(128 + lean * 0.35, 252 - h * 0.55, tipX, tipY);
      g.stroke();
    }
    return toTex(c, { clamp: true });
  };

  /* ---------- 樱花瓣（粒子用） ---------- */
  T.petal = function () {
    const W = 64, H = 64;
    const c = canvas(W, H), g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 26, 2, 32, 34, 30);
    grad.addColorStop(0, 'rgba(255,240,246,0.98)');
    grad.addColorStop(0.55, 'rgba(252,196,216,0.95)');
    grad.addColorStop(1, 'rgba(240,150,182,0.55)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(32, 4);
    g.bezierCurveTo(52, 12, 58, 34, 32, 60);
    g.bezierCurveTo(6, 34, 12, 12, 32, 4);
    g.fill();
    // 花瓣缺口
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.moveTo(32, 2); g.lineTo(38, 12); g.lineTo(26, 12); g.closePath(); g.fill();
    g.globalCompositeOperation = 'source-over';
    return toTex(c, { clamp: true });
  };

  /* ---------- 樱花树冠（蓬松花团） ---------- */
  T.blossomCluster = function (seed) {
    const R = rng(seed || 71);
    const W = 512, H = 512;
    const c = canvas(W, H), g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    const cx = 256, cy = 256;
    // 枝
    g.strokeStyle = 'rgba(96,68,56,0.75)';
    for (let i = 0; i < 10; i++) {
      const a = R() * 6.28, l = 100 + R() * 130;
      g.lineWidth = 1.6 + R() * 3;
      g.beginPath();
      g.moveTo(cx, cy);
      g.quadraticCurveTo(cx + Math.cos(a) * l * 0.5, cy + Math.sin(a) * l * 0.5, cx + Math.cos(a) * l, cy + Math.sin(a) * l);
      g.stroke();
    }
    // 花瓣团：模仿树叶簇的密度，但用粉色
    const pinks = [
      [255, 214, 230], [255, 190, 214], [255, 236, 244],
      [250, 168, 198], [255, 226, 238], [255, 200, 220],
    ];
    for (let i = 0; i < 2800; i++) {
      const a = R() * 6.28;
      const rad = Math.pow(R(), 0.62) * 240;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad * 0.92;
      const edge = rad / 240;
      const shade = (0.78 + R() * 0.32) * (1 - edge * 0.22);
      const col = pinks[(R() * pinks.length) | 0];
      g.fillStyle = 'rgba(' + Math.round(col[0] * shade) + ',' + Math.round(col[1] * shade) + ',' + Math.round(col[2] * shade) + ',' + (0.82 + R() * 0.18).toFixed(2) + ')';
      g.save();
      g.translate(x, y);
      g.rotate(R() * 6.28);
      g.beginPath();
      g.ellipse(0, 0, 2.6 + R() * 5.6, 1.4 + R() * 3.0, 0, 0, 6.28);
      g.fill();
      g.restore();
    }
    // 白色小高光花瓣
    for (let i = 0; i < 420; i++) {
      const a = R() * 6.28;
      const rad = Math.pow(R(), 0.7) * 232;
      g.fillStyle = 'rgba(255,250,252,' + (0.5 + R() * 0.4).toFixed(2) + ')';
      g.save();
      g.translate(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.92);
      g.rotate(R() * 6.28);
      g.beginPath();
      g.ellipse(0, 0, 1.4 + R() * 2.6, 0.8 + R() * 1.4, 0, 0, 6.28);
      g.fill();
      g.restore();
    }
    return toTex(c, { clamp: true });
  };

  /* ---------- 树皮 ---------- */
  T.bark = function (seed) {
    const R = rng(seed || 81);
    const W = 256, H = 512;
    const c = canvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#4a3b30'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 240; i++) {
      const x = R() * W, w = 1 + R() * 5;
      const tone = 0.6 + R() * 0.8;
      g.fillStyle = 'rgba(' + Math.round(88 * tone) + ',' + Math.round(70 * tone) + ',' + Math.round(54 * tone) + ',' + (0.25 + R() * 0.35).toFixed(2) + ')';
      g.fillRect(x, -10, w, H + 20);
    }
    for (let i = 0; i < 360; i++) {
      g.strokeStyle = 'rgba(20,14,10,' + (0.2 + R() * 0.3).toFixed(2) + ')';
      g.lineWidth = 0.6 + R() * 1.4;
      const x = R() * W, y = R() * H;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (R() - 0.5) * 10, y + 8 + R() * 36);
      g.stroke();
    }
    return toTex(c);
  };

  /* ---------- 云 ---------- */
  T.cloud = function (seed) {
    const R = rng(seed || 91);
    const W = 512, H = 256;
    const c = canvas(W, H), g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    g.filter = 'blur(3px)';
    for (let i = 0; i < 46; i++) {
      const x = 70 + R() * 372;
      const y = 120 + R() * 90;
      const r = 26 + R() * 62;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(255,252,246,0.55)');
      grad.addColorStop(0.6, 'rgba(255,246,236,0.22)');
      grad.addColorStop(1, 'rgba(255,240,226,0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(x, y, r, 0, 6.28); g.fill();
    }
    g.filter = 'none';
    // 边缘柔化（避免精灵出现矩形边）
    g.globalCompositeOperation = 'destination-in';
    const mask = g.createRadialGradient(256, 128, 40, 256, 128, 250);
    mask.addColorStop(0, 'rgba(0,0,0,1)');
    mask.addColorStop(0.72, 'rgba(0,0,0,0.92)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = mask;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    // 底部暖色（只做小幅渐隐，避免出现整块矩形）
    const grad2 = g.createRadialGradient(256, 220, 40, 256, 220, 220);
    grad2.addColorStop(0, 'rgba(255,226,190,0.18)');
    grad2.addColorStop(1, 'rgba(255,226,190,0)');
    g.fillStyle = grad2;
    g.beginPath(); g.arc(256, 220, 220, 0, 6.28); g.fill();
    return toTex(c, { clamp: true });
  };

  /* ---------- 远山（含富士山剪影） ---------- */
  T.mountains = function (seed) {
    const R = rng(seed || 101);
    const W = 2048, H = 512;
    const c = canvas(W, H), g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    // 远层山脊
    g.fillStyle = 'rgba(158,182,208,0.92)';
    g.beginPath();
    g.moveTo(0, H);
    g.lineTo(0, H - 120);
    for (let px = 0; px <= W; px += 160) {
      g.lineTo(px + R() * 60, H - 150 - R() * 110);
    }
    g.lineTo(W, H);
    g.closePath();
    g.fill();
    // 富士山
    const fx = W * 0.5, fb = H - 26, fh = 340, fw = 780;
    const grad = g.createLinearGradient(0, fb - fh, 0, fb);
    grad.addColorStop(0, 'rgba(250,252,255,0.99)');
    grad.addColorStop(0.2, 'rgba(231,240,250,0.98)');
    grad.addColorStop(0.58, 'rgba(176,200,228,0.96)');
    grad.addColorStop(1, 'rgba(130,162,198,0.92)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(fx - fw / 2, fb);
    g.bezierCurveTo(fx - fw * 0.25, fb - fh * 0.52, fx - fw * 0.13, fb - fh * 0.9, fx - fw * 0.05, fb - fh);
    g.lineTo(fx + fw * 0.05, fb - fh);
    g.bezierCurveTo(fx + fw * 0.13, fb - fh * 0.9, fx + fw * 0.25, fb - fh * 0.52, fx + fw / 2, fb);
    g.closePath();
    g.fill();
    // 雪顶
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath();
    g.moveTo(fx - fw * 0.085, fb - fh * 0.78);
    g.lineTo(fx - fw * 0.05, fb - fh);
    g.lineTo(fx + fw * 0.05, fb - fh);
    g.lineTo(fx + fw * 0.085, fb - fh * 0.78);
    g.lineTo(fx + fw * 0.02, fb - fh * 0.84);
    g.lineTo(fx - fw * 0.015, fb - fh * 0.78);
    g.lineTo(fx - fw * 0.06, fb - fh * 0.84);
    g.closePath();
    g.fill();
    // 山脚雾化
    const foot = g.createLinearGradient(0, fb - 90, 0, fb + 20);
    foot.addColorStop(0, 'rgba(250,236,214,0)');
    foot.addColorStop(1, 'rgba(250,236,214,0.8)');
    g.fillStyle = foot;
    g.fillRect(0, fb - 90, W, 110);
    return toTex(c, { clamp: true });
  };

  /* ---------- 土路 ---------- */
  T.dirtPath = function (seed) {
    const R = rng(seed || 111);
    const W = 256, H = 512;
    const c = canvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#b9a482'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 500; i++) {
      const tone = 0.7 + R() * 0.6;
      g.fillStyle = 'rgba(' + Math.round(186 * tone) + ',' + Math.round(166 * tone) + ',' + Math.round(132 * tone) + ',' + (0.1 + R() * 0.25).toFixed(2) + ')';
      g.beginPath();
      g.ellipse(R() * W, R() * H, 3 + R() * 16, 2 + R() * 9, R() * 3, 0, 6.28);
      g.fill();
    }
    // 小石子
    for (let i = 0; i < 90; i++) {
      g.fillStyle = 'rgba(' + (120 + R() * 50 | 0) + ',' + (116 + R() * 44 | 0) + ',' + (104 + R() * 36 | 0) + ',0.85)';
      g.beginPath();
      g.ellipse(R() * W, R() * H, 1 + R() * 3.6, 1 + R() * 2.4, R() * 3, 0, 6.28);
      g.fill();
    }
    // 边缘草
    for (let i = 0; i < 160; i++) {
      const edge = R() < 0.5;
      const x = edge ? R() * 22 : W - R() * 22;
      g.strokeStyle = 'rgba(84,110,50,' + (0.3 + R() * 0.5).toFixed(2) + ')';
      g.lineWidth = 0.8 + R() * 1.2;
      g.beginPath();
      g.moveTo(x, R() * H);
      g.lineTo(x + (R() - 0.5) * 8, R() * H - 6 - R() * 10);
      g.stroke();
    }
    return toTex(c);
  };

  /* ---------- 木纹（长椅） ---------- */
  T.wood = function (seed) {
    const R = rng(seed || 121);
    const W = 256, H = 256;
    const c = canvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#8a6b48'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 180; i++) {
      const y = R() * H;
      g.strokeStyle = 'rgba(' + (52 + R() * 30 | 0) + ',' + (36 + R() * 20 | 0) + ',' + (22 + R() * 14 | 0) + ',' + (0.08 + R() * 0.14).toFixed(2) + ')';
      g.lineWidth = 0.6 + R() * 1.6;
      g.beginPath();
      g.moveTo(0, y);
      for (let px = 0; px <= W; px += 32) g.lineTo(px, y + Math.sin(px * 0.02 + i) * (1 + R()));
      g.stroke();
    }
    return toTex(c);
  };

  /* ---------- 光晕 ---------- */
  T.glow = function (softness) {
    const W = 128, H = 128;
    const c = canvas(W, H), g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 62);
    const k = softness || 0.5;
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(k * 0.5, 'rgba(255,248,232,0.6)');
    grad.addColorStop(k, 'rgba(255,230,190,0.2)');
    grad.addColorStop(1, 'rgba(255,220,170,0)');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    return toTex(c, { clamp: true });
  };

  window.FLOWER_TEX = T;
})();
