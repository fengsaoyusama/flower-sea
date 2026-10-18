/* ============================================================
 * main.js — 「花見の丘」固定镜头版（Three.js 全程序化）
 * 樱花树 / 波斯菊花海 / 情侣互动 / 昼夜与天气 / 远山 / 后处理
 * ============================================================ */
(function () {
  'use strict';

  const T = window.FLOWER_TEX;
  const Q = new URLSearchParams(location.search);

  const errors = [];
  window.__errors = errors;
  function showError(msg) {
    errors.push(String(msg));
    const box = document.getElementById('err');
    if (box) { box.style.display = 'block'; box.textContent = '场景错误：\n' + errors.join('\n'); }
  }
  window.addEventListener('error', (e) => showError(e.message));
  window.addEventListener('unhandledrejection', (e) => showError((e.reason && e.reason.message) || e.reason));

  /* ---------------- 基础工具 ---------------- */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = rng(20261019);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => t * t * (3 - 2 * t);
  const D2R = Math.PI / 180;

  function terrainH(x, z) {
    let h = 0;
    h += Math.exp(-(((x - 10) ** 2) / 1300 + ((z + 52) ** 2) / 1150)) * 12.5;
    h += Math.exp(-(((x + 46) ** 2) / 2400 + ((z + 84) ** 2) / 1900)) * 9.0;
    h += Math.exp(-(((x + 30) ** 2) / 1800 + ((z + 20) ** 2) / 1600)) * 2.2;
    h += Math.sin(x * 0.055 + 1.2) * 0.55 + Math.cos(z * 0.047) * 0.45;
    h += Math.sin((x + z) * 0.11) * 0.18;
    return h;
  }

  /* ---------------- 渲染器 ---------------- */
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, stencil: false });
  const PR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(PR);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputEncoding = THREE.LinearEncoding;

  const HAZE = new THREE.Color(0xf2ddbe);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(HAZE.getHex(), 0.005);
  scene.background = HAZE.clone();

  // 固定镜头
  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(-1.4, terrainH(-1.4, 15.0) + 2.3, 15.0);
  camera.lookAt(4.5, terrainH(4.5, -22) + 3.7, -22);
  const CAMERA_POS = camera.position.clone();

  /* ---------------- 天空（Shader 渐变穹顶） ---------------- */
  const skyUniforms = {
    uTop: { value: new THREE.Color(0x1e4f9c) },
    uMid: { value: new THREE.Color(0x74b0e0) },
    uHorizon: { value: new THREE.Color(0xffd9a6) },
    uSunDir: { value: new THREE.Vector3(0.6, 0.25, -0.75) },
    uSunColor: { value: new THREE.Color(0xfff2cf) },
    uGlow: { value: 0.55 },
  };
  (function sky() {
    const geo = new THREE.SphereGeometry(600, 40, 24);
    const mat = new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vec3 w = (modelMatrix * vec4(position, 1.0)).xyz;
          vDir = w - cameraPosition;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vDir;
        uniform vec3 uTop, uMid, uHorizon, uSunColor;
        uniform vec3 uSunDir;
        uniform float uGlow;
        void main() {
          vec3 d = normalize(vDir);
          float y = clamp(d.y, -0.4, 1.0);
          vec3 col = mix(uHorizon, uMid, smoothstep(-0.03, 0.32, y));
          col = mix(col, uTop, smoothstep(0.28, 0.95, y));
          float s = max(dot(d, normalize(uSunDir)), 0.0);
          col += uSunColor * (pow(s, 48.0) * 0.75 + pow(s, 9.0) * 0.22) * uGlow;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = -10;
    mesh.frustumCulled = false;
    scene.add(mesh);
  })();

  // 星星（夜樱时出现）
  const stars = (function () {
    const N = 700;
    const R = rng(4242);
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = R() * Math.PI * 2;
      const v = Math.acos(R() * 0.95);
      const r = 520;
      pos[i * 3] = Math.sin(v) * Math.cos(u) * r;
      pos[i * 3 + 1] = Math.cos(v) * r + 40;
      pos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * r;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: 1.8, color: 0xfff6e0, transparent: true, opacity: 0,
      depthWrite: false, sizeAttenuation: false, fog: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    return pts;
  })();

  const glowTex = T.glow(0.45);

  /* ---------------- 光照 ---------------- */
  const hemi = new THREE.HemisphereLight(0xd8e8fa, 0x6d7a45, 0.55);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff0d0, 2.2);
  sun.position.set(90, 70, -90);
  sun.target.position.set(5, 3, -20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -32;
  sun.shadow.camera.right = 32;
  sun.shadow.camera.top = 34;
  sun.shadow.camera.bottom = -34;
  sun.shadow.camera.near = 5;
  sun.shadow.camera.far = 200;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(sun.target);

  const fill = new THREE.DirectionalLight(0xbcd2ea, 0.28);
  fill.position.set(-20, 14, 20);
  scene.add(fill);

  // 太阳 / 月亮 光晕
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xfff0c8, blending: THREE.AdditiveBlending, transparent: true,
    opacity: 0.45, depthWrite: false, fog: false,
  }));
  sunGlow.scale.set(150, 150, 1);
  scene.add(sunGlow);

  const moon = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xe8f0ff, blending: THREE.AdditiveBlending, transparent: true,
    opacity: 0, depthWrite: false, fog: false,
  }));
  moon.scale.set(46, 46, 1);
  scene.add(moon);

  /* ---------------- 云（两层） ---------------- */
  const cloudSprites = [];
  (function clouds() {
    const R = rng(555);
    const texA = T.cloud(91);
    const texB = T.cloud2(151);
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texA, color: 0xfff6ea, transparent: true, opacity: 0.22 + R() * 0.12,
        depthWrite: false, fog: false,
      }));
      s.position.set(-300 + R() * 620, 130 + R() * 90, -210 - R() * 160);
      const sc = 80 + R() * 80;
      s.scale.set(sc, sc * (0.34 + R() * 0.1), 1);
      s.userData.baseOpacity = s.material.opacity;
      scene.add(s);
      cloudSprites.push(s);
    }
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texB, color: 0xfffcf6, transparent: true, opacity: 0.13 + R() * 0.1,
        depthWrite: false, fog: false,
      }));
      s.position.set(-320 + R() * 640, 170 + R() * 80, -240 - R() * 120);
      const sc = 260 + R() * 160;
      s.scale.set(sc, sc * (0.16 + R() * 0.06), 1);
      s.userData.baseOpacity = s.material.opacity;
      scene.add(s);
      cloudSprites.push(s);
    }
  })();

  /* ---------------- 远山 ---------------- */
  const mountain = (function mountains() {
    const tex = T.mountains(161);
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.95,
      color: 0x46688f,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(800, 250), mat);
    mesh.position.set(-20, 58, -350);
    mesh.renderOrder = -8;
    scene.add(mesh);
    return mesh;
  })();

  /* ---------------- 地面 ---------------- */
  (function ground() {
    const geo = new THREE.PlaneGeometry(480, 480, 170, 170);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cA = new THREE.Color(0x7d9452);
    const cB = new THREE.Color(0x6a8446);
    const cC = new THREE.Color(0x93a862);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, terrainH(x, z));
      const n = 0.5 + 0.5 * Math.sin(x * 0.13 + z * 0.09) * Math.cos(z * 0.11 - 0.7);
      tmp.copy(cA).lerp(cB, n).lerp(cC, 0.25 + 0.35 * Math.sin(x * 0.05) * Math.cos(z * 0.07));
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const tex = T.meadow(11);
    tex.repeat.set(90, 90);
    const mat = new THREE.MeshStandardMaterial({
      map: tex, vertexColors: true, color: 0x9fae7e, roughness: 1, metalness: 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    scene.add(mesh);
  })();

  /* ---------------- 小径 ---------------- */
  const pathSamples = [];
  (function path() {
    const pts = [
      new THREE.Vector3(0.8, 0, 26),
      new THREE.Vector3(-1.4, 0, 17),
      new THREE.Vector3(-0.9, 0, 8.5),
      new THREE.Vector3(2.2, 0, 0.5),
      new THREE.Vector3(5.6, 0, -10),
      new THREE.Vector3(8.2, 0, -25),
      new THREE.Vector3(10.4, 0, -40),
    ];
    for (const p of pts) p.y = terrainH(p.x, p.z) + 0.06;
    const curve = new THREE.CatmullRomCurve3(pts);
    const STEPS = 110;
    const positions = [], uvs = [], indices = [];
    const totalLen = curve.getLength();
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const nx = -tan.z, nz = tan.x;
      const half = 1.05 + 0.16 * Math.sin(t * 11.0) - 0.2 * t;
      const y = terrainH(p.x, p.z) + 0.06;
      positions.push(p.x + nx * half, y, p.z + nz * half);
      positions.push(p.x - nx * half, y, p.z - nz * half);
      const v = (t * totalLen) / 2.2;
      uvs.push(0, v, 1, v);
      if (i % 4 === 0) pathSamples.push({ x: p.x, z: p.z, r: half + 0.25 });
    }
    for (let i = 0; i < STEPS; i++) {
      const a = i * 2, b = a + 1, c2 = a + 2, d2 = a + 3;
      indices.push(a, c2, b, b, c2, d2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const tex = T.dirtPath(111);
    const mat = new THREE.MeshStandardMaterial({ map: tex, color: 0xdcc9a4, roughness: 1 });
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -2;
    mat.polygonOffsetUnits = -2;
    const ribbon = new THREE.Mesh(geo, mat);
    ribbon.receiveShadow = true;
    scene.add(ribbon);
  })();

  function nearPath(x, z) {
    for (let i = 0; i < pathSamples.length; i++) {
      const s = pathSamples[i];
      const dx = x - s.x, dz = z - s.z;
      if (dx * dx + dz * dz < s.r * s.r) return true;
    }
    return false;
  }

  /* ---------------- 风摆材质 ---------------- */
  const windUniforms = [];
  function windMaterial(tex, color, opts) {
    opts = opts || {};
    const mat = new THREE.MeshStandardMaterial({
      map: tex, color: color, alphaTest: opts.alphaTest || 0.42, side: THREE.DoubleSide,
      roughness: 1, metalness: 0, depthWrite: true,
    });
    mat.onBeforeCompile = function (shader) {
      const u = { uTime: { value: 0 }, uWind: { value: 1 } };
      shader.uniforms.uTime = u.uTime;
      shader.uniforms.uWind = u.uWind;
      shader.vertexShader = 'uniform float uTime;\nuniform float uWind;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        [
          '#include <begin_vertex>',
          '#ifdef USE_INSTANCING',
          '  vec2 wp = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;',
          '  float ph = uTime * 1.45 + wp.x * 0.32 + wp.y * 0.27;',
          '  float sw = (sin(ph) * 0.62 + sin(ph * 2.17 + 1.3) * 0.26) * uWind;',
          '  transformed.x += sw * 0.34 * max(position.y, 0.0);',
          '  transformed.z += sw * 0.16 * max(position.y, 0.0);',
          '#endif',
        ].join('\n')
      );
      windUniforms.push(u);
    };
    mat.customProgramCacheKey = function () { return 'wind' + (opts.key || ''); };
    return mat;
  }

  /* ---------------- 花海散布 ---------------- */
  const flowerMeshes = [];
  function scatterFlowers(tex, count, region, opts) {
    opts = opts || {};
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, 0.5, 0);
    const mat = windMaterial(tex, opts.color || 0xffffff, { key: opts.key || '', alphaTest: opts.alphaTest || 0.42 });
    const mesh = new THREE.InstancedMesh(geo, mat, count * 2);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const R = rng(opts.seed || 1);
    let n = 0;
    for (let i = 0; i < count; i++) {
      let x = 0, z = 0, ok = false;
      for (let tries = 0; tries < 12 && !ok; tries++) {
        const a = R() * Math.PI * 2;
        const rr = Math.sqrt(R()) * region.r;
        x = region.cx + Math.cos(a) * rr * (region.rx || 1);
        z = region.cz + Math.sin(a) * rr * (region.rz || 1);
        ok = terrainH(x, z) > -1 && !nearPath(x, z);
        if (opts.filter) ok = ok && opts.filter(x, z, R);
      }
      if (!ok) continue;
      const s = (opts.min || 0.5) + R() * ((opts.max || 0.9) - (opts.min || 0.5));
      const y = terrainH(x, z);
      const rot = R() * Math.PI * 2;
      const bright = 0.86 + R() * 0.26;
      col.setRGB(bright, bright * (0.96 + R() * 0.08), bright * (0.95 + R() * 0.08));
      for (let k = 0; k < 2; k++) {
        dummy.position.set(x, y, z);
        dummy.rotation.set(0, rot + k * Math.PI / 2, 0);
        dummy.scale.set(s, s * (0.9 + R() * 0.35), 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(n, dummy.matrix);
        mesh.setColorAt(n, col);
        n++;
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
    flowerMeshes.push(mesh);
    return mesh;
  }

  const cosmosTex = T.cosmos(31);
  const daisyTex = T.daisy(47);
  const rapeseedTex = T.rapeseed(59);
  const grassTex = T.grassTuft(123);

  // 主花海
  scatterFlowers(cosmosTex, 3200, { cx: 4, cz: -6, r: 62, rx: 1.15, rz: 1 }, {
    key: 'cosmos', seed: 3101, min: 0.6, max: 1.15, color: 0xffc9de,
    // 情侣野餐区留白
    filter: (x, z, R) => {
      if (Math.hypot(x - 13, z + 46) < 6) return false;
      if (Math.hypot(x + 3.6, z - 3.6) < 4.0) return false;
      if (R() > 0.92 && Math.hypot(x, z + 10) > 40) return false;
      return true;
    },
  });
  // 山坡花海（让远山丘也铺上粉色）
  scatterFlowers(cosmosTex, 1500, { cx: 8, cz: -32, r: 27, rx: 1.2, rz: 1 }, {
    key: 'cosmos-hill', seed: 3317, min: 0.5, max: 0.95, color: 0xffc9de,
    filter: () => true,
  });
  scatterFlowers(daisyTex, 3800, { cx: 2, cz: -4, r: 60, rx: 1.2, rz: 1 }, {
    key: 'daisy', seed: 4701, min: 0.45, max: 0.9, color: 0xffffff,
    filter: (x, z) => {
      if (Math.hypot(x - 13, z + 46) < 5) return false;
      if (Math.hypot(x + 3.6, z - 3.6) < 3.8) return false;
      return true;
    },
  });
  scatterFlowers(grassTex, 6000, { cx: 0, cz: 0, r: 70, rx: 1.2, rz: 1 }, {
    key: 'grass', seed: 1234, min: 0.35, max: 0.8, color: 0x9fb27f, alphaTest: 0.45,
    filter: (x, z) => Math.hypot(x + 3.6, z - 3.6) > 3.6,
  });
  scatterFlowers(rapeseedTex, 700, { cx: -34, cz: -28, r: 17, rx: 1.4, rz: 1 }, {
    key: 'rapeseed', seed: 5901, min: 0.6, max: 1.0, color: 0xfff0b8,
    filter: () => true,
  });
  // 近景加密
  scatterFlowers(cosmosTex, 1100, { cx: -2, cz: 14, r: 16, rx: 1.6, rz: 1 }, {
    key: 'cosmos-near', seed: 3111, min: 0.7, max: 1.25, color: 0xffc9de,
    filter: () => true,
  });
  scatterFlowers(daisyTex, 900, { cx: 4, cz: 15, r: 15, rx: 1.4, rz: 1 }, {
    key: 'daisy-near', seed: 4711, min: 0.45, max: 0.85, color: 0xffffff,
    filter: () => true,
  });

  /* ---------------- 樱花树 ---------------- */
  const blossomGeo = new THREE.PlaneGeometry(1, 1);
  const blossomMats = [
    new THREE.MeshStandardMaterial({ map: T.blossomCluster(71), color: 0xffdce9, roughness: 1, alphaTest: 0.34, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ map: T.blossomCluster(72), color: 0xffc6da, roughness: 1, alphaTest: 0.34, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ map: T.blossomCluster(73), color: 0xfff2f7, roughness: 1, alphaTest: 0.34, side: THREE.DoubleSide }),
  ];
  const barkTex = T.bark(81);
  const trunkMat = new THREE.MeshStandardMaterial({ map: barkTex, color: 0x6e5a48, roughness: 1 });

  function makeCherryTree(x, z, s, seed, opts) {
    opts = opts || {};
    const R = rng(seed);
    const y0 = terrainH(x, z);
    const g = new THREE.Group();
    g.position.set(x, y0 - 0.2, z);
    const h = (7.0 + R() * 2.6) * s;
    // 主干分两段，带弯曲
    const lowerH = h * 0.42;
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.19 * s, 0.42 * s, lowerH, 10, 3), trunkMat);
    lower.position.y = lowerH / 2;
    lower.rotation.z = (R() - 0.5) * 0.09;
    lower.castShadow = true; lower.receiveShadow = true;
    g.add(lower);
    const upperH = h * 0.5;
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * s, 0.21 * s, upperH, 9, 3), trunkMat);
    upper.position.set((R() - 0.5) * 0.5 * s, lowerH + upperH / 2, (R() - 0.5) * 0.4 * s);
    upper.rotation.z = (R() - 0.5) * 0.14;
    upper.castShadow = true;
    g.add(upper);
    // 主枝 + 枝端花团
    const tips = [];
    const nLimbs = 4 + ((R() * 3) | 0);
    for (let i = 0; i < nLimbs; i++) {
      const a = (i / nLimbs) * Math.PI * 2 + R() * 0.5;
      const tilt = 28 * D2R + R() * 26 * D2R;
      const startY = lowerH + upperH * (0.35 + R() * 0.55);
      const len = (2.4 + R() * 2.4) * s;
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * s, 0.11 * s, len, 6), trunkMat);
      limb.position.set(Math.cos(a) * len * 0.45, startY + Math.cos(tilt) * len * 0.4, Math.sin(a) * len * 0.45);
      limb.rotation.set(Math.sin(a) * (Math.PI / 2 - tilt), 0, -Math.cos(a) * (Math.PI / 2 - tilt));
      limb.castShadow = true;
      g.add(limb);
      // 端部小枝
      const tip = new THREE.Vector3(Math.cos(a) * len * 0.9, startY + Math.cos(tilt) * len * 0.8, Math.sin(a) * len * 0.9);
      tips.push(tip);
      for (let k = 0; k < 3; k++) {
        const ta = a + (R() - 0.5) * 1.4;
        const tl = (0.7 + R() * 0.9) * s;
        const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * s, 0.045 * s, tl, 5), trunkMat);
        tw.position.set(tip.x + Math.cos(ta) * tl * 0.4, tip.y + (R() - 0.2) * 0.6 * s, tip.z + Math.sin(ta) * tl * 0.4);
        tw.rotation.set(Math.sin(ta) * 0.9, 0, -Math.cos(ta) * 0.9);
        g.add(tw);
        tips.push(new THREE.Vector3(tip.x + Math.cos(ta) * tl * 0.8, tip.y + (R() - 0.15) * 0.7 * s, tip.z + Math.sin(ta) * tl * 0.8));
      }
    }
    // 树冠：沿枝端铺花团 + 中心大团
    const clusters = [];
    const nC = 9 + ((R() * 5) | 0);
    for (let i = 0; i < nC; i++) {
      const tip = tips[(R() * tips.length) | 0] || new THREE.Vector3(0, h * 0.9, 0);
      clusters.push(new THREE.Vector3(tip.x + (R() - 0.5) * 1.2 * s, tip.y + (R() - 0.3) * 0.9 * s, tip.z + (R() - 0.5) * 1.2 * s));
    }
    clusters.push(new THREE.Vector3((R() - 0.5) * 0.8 * s, h * 0.92, (R() - 0.5) * 0.8 * s));
    for (const c of clusters) {
      const planes = 3 + ((R() * 3) | 0);
      for (let j = 0; j < planes; j++) {
        const size = (2.1 + R() * 2.1) * s;
        const leaf = new THREE.Mesh(blossomGeo, blossomMats[(R() * blossomMats.length) | 0]);
        leaf.position.set(c.x + (R() - 0.5) * 1.4 * s, c.y + (R() - 0.4) * 1.2 * s, c.z + (R() - 0.5) * 1.4 * s);
        leaf.scale.set(size, size, 1);
        leaf.rotation.set((R() - 0.5) * 1.2, R() * Math.PI, (R() - 0.5) * 1.2);
        leaf.receiveShadow = true;
        g.add(leaf);
      }
    }
    // 树下落樱地毯
    const carpetTex = T.petalCarpet(seed + 7);
    const carpet = new THREE.Mesh(
      new THREE.PlaneGeometry(7.5 * s, 7.5 * s),
      new THREE.MeshStandardMaterial({
        map: carpetTex, transparent: true, depthWrite: false, roughness: 1,
        color: 0xffe6ef, alphaTest: 0.02, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
      })
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.y = 0.25;
    carpet.receiveShadow = false;
    g.add(carpet);
    scene.add(g);
    return g;
  }

  // 远丘一本樱（主景）
  makeCherryTree(13.5, -47, 1.5, 6101);
  // 右侧近景樱花
  makeCherryTree(9.5, 2.0, 1.0, 6102);
  // 左侧：情侣所在的樱花树
  const loveTree = makeCherryTree(-6.0, 2.0, 1.0, 6103);
  // 远处点缀
  makeCherryTree(-26, -18, 0.9, 6104);
  makeCherryTree(-38, 6, 0.85, 6105);

  /* ---------------- 樱花树下的情侣 ---------------- */
  const couple = (function coupleScene() {
    const bx = -3.6, bz = 3.6;
    const by = terrainH(bx, bz);
    const root = new THREE.Group();
    root.position.set(bx, by, bz);
    root.rotation.y = 0.15;
    root.scale.setScalar(1.45);

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf3d6bc, roughness: 0.85 });
    const boyHair = new THREE.MeshStandardMaterial({ color: 0x2b2622, roughness: 0.9 });
    const girlHair = new THREE.MeshStandardMaterial({ color: 0x3a2a24, roughness: 0.9 });
    const boyCloth = new THREE.MeshStandardMaterial({ color: 0x6f9ccc, roughness: 0.9 });
    const boyPants = new THREE.MeshStandardMaterial({ color: 0x445062, roughness: 0.9 });
    const girlDress = new THREE.MeshStandardMaterial({ color: 0xfff2f6, roughness: 0.9 });

    // 野餐布
    const blanketTex = T.blanket();
    const blanket = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.9),
      new THREE.MeshStandardMaterial({ map: blanketTex, roughness: 0.95, side: THREE.DoubleSide }));
    blanket.rotation.x = -Math.PI / 2;
    blanket.rotation.z = 0.12;
    blanket.position.y = 0.05;
    blanket.receiveShadow = true;
    root.add(blanket);

    // 人物构造
    function person(opts) {
      const g = new THREE.Group();
      const skin = skinMat, hairM = opts.hair, cloth = opts.cloth;
      // 臀部（坐地）
      const hips = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), cloth);
      hips.position.y = 0.22; hips.scale.set(1, 0.8, 0.9); hips.castShadow = true;
      g.add(hips);
      // 躯干
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.42, 8), cloth);
      torso.position.y = 0.47; torso.castShadow = true;
      g.add(torso);
      // 裙子（女生）
      if (opts.dress) {
        const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.28, 12), cloth);
        skirt.position.y = 0.2;
        skirt.castShadow = true;
        g.add(skirt);
      }
      // 头
      const head = new THREE.Group();
      head.position.y = 0.78;
      g.add(head);
      const face = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12), skin);
      face.castShadow = true;
      head.add(face);
      // 眼睛（让侧脸可读）
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2a211c, roughness: 0.55 });
      for (const ex of [-0.042, 0.042]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), eyeMat);
        eye.position.set(ex, 0.015, 0.1);
        head.add(eye);
      }
      // 头发
      const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), hairM);
      hairCap.position.y = 0.012;
      head.add(hairCap);
      if (opts.longHair) {
        const backHair = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.36, 0.1), hairM);
        backHair.position.set(0, -0.12, -0.10);
        backHair.castShadow = true;
        head.add(backHair);
        const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.08), hairM);
        sideL.position.set(-0.11, -0.06, 0.0);
        head.add(sideL);
        const sideR = sideL.clone(); sideR.position.x = 0.11; head.add(sideR);
      }
      // 手臂：肩部枢轴
      function arm(side) {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.145, 0.62, 0);
        const up = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.26, 6), opts.sleeveShort ? skin : cloth);
        up.position.y = -0.13;
        up.castShadow = true;
        pivot.add(up);
        const elbow = new THREE.Group();
        elbow.position.y = -0.26;
        pivot.add(elbow);
        const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.24, 6), skin);
        fore.position.y = -0.11;
        fore.castShadow = true;
        elbow.add(fore);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), skin);
        hand.position.y = -0.24;
        elbow.add(hand);
        g.add(pivot);
        return { pivot, elbow };
      }
      const armL = arm(-1), armR = arm(1);
      // 腿（坐着，膝盖弯曲）
      function leg(side) {
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.34, 6), opts.pantsMat || cloth);
        thigh.position.set(side * 0.09, 0.2, 0.16);
        thigh.rotation.x = 1.15;
        thigh.castShadow = true;
        g.add(thigh);
        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.32, 6), opts.pantsMat || cloth);
        shin.position.set(side * 0.09, 0.14, 0.34);
        shin.rotation.x = 0.15;
        shin.castShadow = true;
        g.add(shin);
      }
      leg(-1); leg(1);
      return { group: g, head, armL, armR };
    }

    const boy = person({ hair: boyHair, cloth: boyCloth, sleeveShort: true, pantsMat: boyPants });
    const girl = person({ hair: girlHair, cloth: girlDress, dress: true, longHair: true, sleeveShort: true });

    boy.group.position.set(-0.33, 0, 0.02);
    boy.group.rotation.y = 0.7;
    girl.group.position.set(0.33, 0, 0.06);
    girl.group.rotation.y = -0.7;
    root.add(boy.group);
    root.add(girl.group);

    // 野餐篮
    const basket = new THREE.Group();
    const bMat = new THREE.MeshStandardMaterial({ color: 0xb98d5e, roughness: 0.9 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.24), bMat);
    box.position.y = 0.1; box.castShadow = true;
    basket.add(box);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.014, 6, 14, Math.PI), bMat);
    handle.position.y = 0.2;
    basket.add(handle);
    // 篮子里的花
    for (let i = 0; i < 5; i++) {
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5),
        new THREE.MeshStandardMaterial({ color: i % 2 ? 0xffc7d8 : 0xfff2c4, roughness: 0.9 }));
      bloom.position.set(-0.08 + i * 0.035, 0.23, (Math.random() - 0.5) * 0.12);
      basket.add(bloom);
    }
    basket.position.set(0.55, 0, -0.55);
    root.add(basket);

    // 小兔子
    const rabbit = new THREE.Group();
    const furMat = new THREE.MeshStandardMaterial({ color: 0xfaf6ee, roughness: 0.95 });
    const rBody = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), furMat);
    rBody.position.y = 0.11; rBody.scale.set(1, 0.9, 1.15); rBody.castShadow = true;
    rabbit.add(rBody);
    const rHead = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), furMat);
    rHead.position.set(0, 0.21, 0.07); rHead.castShadow = true;
    rabbit.add(rHead);
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.1, 4, 6), furMat);
      ear.position.set(sx * 0.035, 0.3, 0.06);
      ear.rotation.z = sx * 0.14;
      ear.rotation.x = -0.12;
      rHead.add(ear);
    }
    const rTail = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), furMat);
    rTail.position.set(0, 0.12, -0.11);
    rabbit.add(rTail);
    rabbit.position.set(-0.85, 0, 0.5);
    rabbit.rotation.y = 2.4;
    root.add(rabbit);

    // 树下小灯笼（夜里亮）
    const lanternGroup = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.9 }));
    pole.position.y = 0.75; pole.castShadow = true;
    lanternGroup.add(pole);
    const armBar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.34, 5),
      new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.9 }));
    armBar.rotation.z = Math.PI / 2;
    armBar.position.set(0.17, 1.5, 0);
    lanternGroup.add(armBar);
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xffd9a0, emissive: 0xff9d4a, emissiveIntensity: 0.3, roughness: 0.7,
      transparent: true, opacity: 0.96,
    });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), lanternMat);
    lamp.position.set(0.32, 1.35, 0);
    lamp.scale.set(1, 1.25, 1);
    lanternGroup.add(lamp);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x3b2e24, roughness: 0.9 });
    const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.03, 8), capMat);
    capTop.position.set(0.32, 1.5, 0);
    lanternGroup.add(capTop);
    const capBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.03, 8), capMat);
    capBottom.position.set(0.32, 1.2, 0);
    lanternGroup.add(capBottom);
    const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xffc478, blending: THREE.AdditiveBlending,
      transparent: true, opacity: 0, depthWrite: false, fog: false,
    }));
    lampGlow.position.set(0.32, 1.35, 0);
    lampGlow.scale.set(1.8, 1.8, 1);
    lanternGroup.add(lampGlow);
    const lampLight = new THREE.PointLight(0xffb866, 0, 7, 2);
    lampLight.position.set(0.32, 1.35, 0);
    lanternGroup.add(lampLight);
    lanternGroup.position.set(0.55, 0, -0.85);
    root.add(lanternGroup);

    scene.add(root);

    return {
      root, boy, girl, rabbit, lampLight, lanternMat, lampGlow,
      baseY: by, time: 0,
    };
  })();

  /* ---------------- 花瓣 / 光斑 / 萤火虫 ---------------- */
  const petalTex = T.petal();
  function makePetalPoints(count, spread, size, color, seed, opacity) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const base = [];
    const R = rng(seed);
    for (let i = 0; i < count; i++) {
      const x = spread.cx + (R() - 0.5) * spread.w;
      const y = spread.y0 + R() * (spread.y1 - spread.y0);
      const z = spread.cz + (R() - 0.5) * spread.h;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      base.push({ x, y, z, sp: 0.5 + R() * 1.2, ph: R() * 10, sw: 0.4 + R() * 1.0 });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: size, map: petalTex, color: color, transparent: true, opacity: opacity,
      depthWrite: false, sizeAttenuation: true, alphaTest: 0.25, fog: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData.base = base;
    scene.add(pts);
    return pts;
  }
  const petals = makePetalPoints(380, { cx: 0, cz: -10, w: 120, h: 120, y0: 1, y1: 15 }, 0.24, 0xffd6e4, 777, 0.95);
  const nearPetals = makePetalPoints(150, { cx: -1, cz: 10, w: 22, h: 15, y0: 0.6, y1: 4.6 }, 0.3, 0xffd8e6, 6161, 0.9);

  const sparkles = (function () {
    const N = 90;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const base = [];
    const R = rng(888);
    for (let i = 0; i < N; i++) {
      const x = -14 + R() * 28, y = 0.4 + R() * 4.5, z = 2 + R() * 22;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      base.push({ x, y, z, ph: R() * 10, sp: 0.4 + R() * 0.8 });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.14, map: glowTex, color: 0xffe6b0, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData.base = base;
    scene.add(pts);
    return pts;
  })();

  // 夜晚萤火虫
  const fireflies = (function () {
    const N = 80;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const base = [];
    const R = rng(3030);
    for (let i = 0; i < N; i++) {
      const x = -8 + R() * 16, y = 0.3 + R() * 2.0, z = -4 + R() * 16;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      base.push({ x, y, z, ph: R() * 10, sp: 0.3 + R() * 0.7 });
      col[i * 3] = 1; col[i * 3 + 1] = 0.9; col[i * 3 + 2] = 0.5;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.1, map: glowTex, vertexColors: true, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData.base = base;
    scene.add(pts);
    return pts;
  })();

  // 近景光斑（梦幻感）
  (function bokeh() {
    const R = rng(999);
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: 0xffe6c0, blending: THREE.AdditiveBlending,
        transparent: true, opacity: 0.08 + R() * 0.1, depthWrite: false, fog: false,
      }));
      s.position.set(-11 + R() * 22, 0.7 + R() * 2.8, 6 + R() * 12);
      const sc = 0.3 + R() * 0.8;
      s.scale.set(sc, sc, 1);
      scene.add(s);
    }
  })();

  // 蝴蝶（小清新点缀）
  const butterflies = (function () {
    const tex = T.butterfly(51);
    const R = rng(515);
    const arr = [];
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false, fog: true,
      }));
      s.scale.set(0.32, 0.27, 1);
      s.userData = {
        cx: -7 + R() * 14, cz: 1 + R() * 11,
        r: 0.8 + R() * 2.2, sp: 0.35 + R() * 0.5,
        ph: R() * 10, h: 0.55 + R() * 1.3,
      };
      scene.add(s);
      arr.push(s);
    }
    return arr;
  })();

  /* ---------------- 后处理 ---------------- */
  const postScene = new THREE.Scene();
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  postScene.add(postQuad);

  const FS_VERT = `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `;
  const brightMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, uThreshold: { value: 0.78 } },
    vertexShader: FS_VERT,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uThreshold;
      varying vec2 vUv;
      void main() {
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        float k = smoothstep(uThreshold, uThreshold + 0.5, l);
        gl_FragColor = vec4(c * k, 1.0);
      }
    `,
    depthTest: false, depthWrite: false,
  });
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uTexel: { value: new THREE.Vector2(1 / 512, 1 / 512) } },
    vertexShader: FS_VERT,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform vec2 uDir; uniform vec2 uTexel;
      varying vec2 vUv;
      void main() {
        vec2 o = uDir * uTexel;
        vec3 c = texture2D(tDiffuse, vUv).rgb * 0.2270;
        c += texture2D(tDiffuse, vUv + o * 1.0).rgb * 0.1945;
        c += texture2D(tDiffuse, vUv - o * 1.0).rgb * 0.1945;
        c += texture2D(tDiffuse, vUv + o * 2.0).rgb * 0.1216;
        c += texture2D(tDiffuse, vUv - o * 2.0).rgb * 0.1216;
        c += texture2D(tDiffuse, vUv + o * 3.0).rgb * 0.0540;
        c += texture2D(tDiffuse, vUv - o * 3.0).rgb * 0.0540;
        c += texture2D(tDiffuse, vUv + o * 4.0).rgb * 0.0162;
        c += texture2D(tDiffuse, vUv - o * 4.0).rgb * 0.0162;
        gl_FragColor = vec4(c, 1.0);
      }
    `,
    depthTest: false, depthWrite: false,
  });
  const compositeMat = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: null }, tBloom: { value: null }, tBlur: { value: null },
      uBloom: { value: 0.44 }, uExposure: { value: 0.88 }, uDof: { value: 0.42 },
      uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
      uVignette: { value: 0.36 }, uGrain: { value: 0.018 }, uSat: { value: 1.3 },
    },
    vertexShader: FS_VERT,
    fragmentShader: `
      uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tBlur;
      uniform float uBloom; uniform float uExposure; uniform float uTime; uniform float uDof;
      uniform vec2 uRes; uniform float uVignette; uniform float uGrain; uniform float uSat;
      varying vec2 vUv;
      vec3 aces(vec3 x) {
        return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
      }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec2 uv = vUv;
        vec3 sharp = texture2D(tScene, uv).rgb;
        vec3 soft = texture2D(tBlur, uv).rgb;
        float m = 0.0;
        m = max(m, smoothstep(0.02, 0.16, 0.52 - uv.y));
        m = max(m, smoothstep(0.03, 0.14, uv.y - 0.90) * 0.55);
        m = max(m, smoothstep(0.38, 0.66, abs(uv.x - 0.5)) * 0.42);
        vec3 col = mix(sharp, soft, clamp(m, 0.0, 0.6) * uDof);
        vec3 bloom = texture2D(tBloom, uv).rgb;
        col += bloom * uBloom;
        vec2 q = uv - 0.5;
        float vig = smoothstep(1.1, 0.2, length(q * vec2(1.02, 0.9)));
        col *= mix(1.0 - uVignette, 1.0, vig);
        col = aces(col * uExposure);
        col = clamp((col - 0.5) * 1.1 + 0.5, 0.0, 1.0);
        float l = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(l), col, uSat);
        col = mix(col * vec3(0.95, 1.0, 1.04), col, smoothstep(0.0, 0.45, l));
        col = mix(col, col * vec3(1.06, 1.0, 0.94), smoothstep(0.45, 1.0, l) * 0.7);
        col = pow(max(col, vec3(0.0)), vec3(1.0 / 2.2));
        float g = hash(uv * uRes + fract(uTime) * 100.0) - 0.5;
        col += g * uGrain;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    depthTest: false, depthWrite: false,
  });

  let rtScene = null, rtA = null, rtB = null, rtC = null, rtD = null;
  function makeRT(w, h, depth) {
    const rt = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
      depthBuffer: !!depth, stencilBuffer: false,
    });
    rt.texture.generateMipmaps = false;
    return rt;
  }
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const SS = clamp(parseFloat(Q.get('ss') || '1.25'), 1, 2);
    const rw = Math.round(w * PR * SS), rh = Math.round(h * PR * SS);
    if (rtScene) { rtScene.dispose(); rtA.dispose(); rtB.dispose(); rtC.dispose(); rtD.dispose(); }
    rtScene = makeRT(rw, rh, true);
    const bw = Math.max(2, Math.round(rw / 4)), bh = Math.max(2, Math.round(rh / 4));
    rtA = makeRT(bw, bh, false);
    rtB = makeRT(bw, bh, false);
    rtC = makeRT(bw, bh, false);
    rtD = makeRT(bw, bh, false);
    compositeMat.uniforms.uRes.value.set(rw, rh);
    compositeMat.uniforms.tScene.value = rtScene.texture;
    compositeMat.uniforms.tBloom.value = rtA.texture;
    compositeMat.uniforms.tBlur.value = rtD.texture;
    blurMat.uniforms.uTexel.value.set(1 / bw, 1 / bh);
  }
  window.addEventListener('resize', resize);
  resize();

  function renderPost(time) {
    renderer.setRenderTarget(rtScene);
    renderer.render(scene, camera);

    postQuad.material = brightMat;
    brightMat.uniforms.tDiffuse.value = rtScene.texture;
    renderer.setRenderTarget(rtA);
    renderer.render(postScene, postCam);

    postQuad.material = blurMat;
    blurMat.uniforms.tDiffuse.value = rtA.texture;
    blurMat.uniforms.uDir.value.set(1, 0);
    renderer.setRenderTarget(rtB);
    renderer.render(postScene, postCam);
    blurMat.uniforms.tDiffuse.value = rtB.texture;
    blurMat.uniforms.uDir.value.set(0, 1);
    renderer.setRenderTarget(rtA);
    renderer.render(postScene, postCam);
    blurMat.uniforms.tDiffuse.value = rtA.texture;
    blurMat.uniforms.uDir.value.set(1.7, 0);
    renderer.setRenderTarget(rtB);
    renderer.render(postScene, postCam);
    blurMat.uniforms.tDiffuse.value = rtB.texture;
    blurMat.uniforms.uDir.value.set(0, 1.7);
    renderer.setRenderTarget(rtA);
    renderer.render(postScene, postCam);

    blurMat.uniforms.tDiffuse.value = rtScene.texture;
    blurMat.uniforms.uDir.value.set(1, 0);
    renderer.setRenderTarget(rtC);
    renderer.render(postScene, postCam);
    blurMat.uniforms.tDiffuse.value = rtC.texture;
    blurMat.uniforms.uDir.value.set(0, 1);
    renderer.setRenderTarget(rtD);
    renderer.render(postScene, postCam);
    blurMat.uniforms.tDiffuse.value = rtD.texture;
    blurMat.uniforms.uDir.value.set(2.2, 0);
    renderer.setRenderTarget(rtC);
    renderer.render(postScene, postCam);
    blurMat.uniforms.tDiffuse.value = rtC.texture;
    blurMat.uniforms.uDir.value.set(0, 2.2);
    renderer.setRenderTarget(rtD);
    renderer.render(postScene, postCam);

    compositeMat.uniforms.uTime.value = time;
    compositeMat.uniforms.tBloom.value = rtA.texture;
    compositeMat.uniforms.tBlur.value = rtD.texture;
    postQuad.material = compositeMat;
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
  }

  /* ---------------- 昼夜 / 天气 ---------------- */
  function C(hex) { return new THREE.Color(hex); }
  function V(x, y, z) { return new THREE.Vector3(x, y, z); }
  const TIME_CONFIGS = [
    {
      name: '清晨',
      skyTop: C(0x1d4f92), skyMid: C(0x6fa6d4), skyHorizon: C(0xffcfae),
      sunColor: C(0xffd6b0), sunIntensity: 1.55, sunDir: V(-0.55, 0.28, 0.55),
      hemiSky: C(0xc6d8ea), hemiGround: C(0x5c6642), hemiIntensity: 0.52,
      fogColor: C(0xefdcc6), fogDensity: 0.0052,
      exposure: 0.96, bloom: 0.5, dof: 0.55,
      cloudColor: C(0xffe9dc), cloudOpacity: 0.9,
      mountainColor: C(0xa8b8cc), mountainOpacity: 0.9,
      sunGlowColor: C(0xffd8ac), sunGlowOpacity: 0.5, glowSize: 170,
      moonOpacity: 0, starOpacity: 0, night: 0.0,
      sat: 1.16, vignette: 0.3,
    },
    {
      name: '正午',
      skyTop: C(0x0a2f66), skyMid: C(0x3a83c0), skyHorizon: C(0xffd9a8),
      sunColor: C(0xfff2d8), sunIntensity: 2.25, sunDir: V(0.55, 0.62, -0.55),
      hemiSky: C(0xdceeff), hemiGround: C(0x6d7a45), hemiIntensity: 0.58,
      fogColor: C(0xf2e4cb), fogDensity: 0.0042,
      exposure: 0.92, bloom: 0.44, dof: 0.5,
      cloudColor: C(0xfffaf0), cloudOpacity: 1.0,
      mountainColor: C(0x9fb8d2), mountainOpacity: 0.88,
      sunGlowColor: C(0xfff4d0), sunGlowOpacity: 0.4, glowSize: 150,
      moonOpacity: 0, starOpacity: 0, night: 0.0,
      sat: 1.2, vignette: 0.32,
    },
    {
      name: '黄昏',
      skyTop: C(0x232f5c), skyMid: C(0x9c7186), skyHorizon: C(0xff9d5c),
      sunColor: C(0xff9a58), sunIntensity: 2.1, sunDir: V(0.72, 0.2, -0.66),
      hemiSky: C(0xffcfae), hemiGround: C(0x53483c), hemiIntensity: 0.5,
      fogColor: C(0xe6bc92), fogDensity: 0.006,
      exposure: 0.98, bloom: 0.58, dof: 0.55,
      cloudColor: C(0xffc9a2), cloudOpacity: 1.0,
      mountainColor: C(0x98879a), mountainOpacity: 0.86,
      sunGlowColor: C(0xffb264), sunGlowOpacity: 0.95, glowSize: 230,
      moonOpacity: 0.12, starOpacity: 0.03, night: 0.12,
      sat: 1.22, vignette: 0.38,
    },
    {
      name: '夜樱',
      skyTop: C(0x050912), skyMid: C(0x101c33), skyHorizon: C(0x2c3c5c),
      sunColor: C(0x9fb6e0), sunIntensity: 0.4, sunDir: V(-0.5, 0.5, 0.7),
      hemiSky: C(0x25334e), hemiGround: C(0x0c0f16), hemiIntensity: 0.32,
      fogColor: C(0x16203a), fogDensity: 0.0065,
      exposure: 1.06, bloom: 0.72, dof: 0.62,
      cloudColor: C(0x2c3a58), cloudOpacity: 0.7,
      mountainColor: C(0x2c3c58), mountainOpacity: 0.95,
      sunGlowColor: C(0x8fa8d8), sunGlowOpacity: 0.18, glowSize: 120,
      moonOpacity: 1.0, starOpacity: 1.0, night: 1.0,
      sat: 1.1, vignette: 0.48,
    },
  ];

  const WEATHER_CONFIGS = [
    { name: '晴', fogMul: 1.0, fogTint: null, cloudMul: 1.0, petalMul: 1.0, windMul: 1.0, petalSizeMul: 1.0 },
    { name: '薄雾', fogMul: 2.8, fogTint: C(0xdfd8cc), cloudMul: 1.15, petalMul: 0.7, windMul: 0.75, petalSizeMul: 1.0 },
    { name: '樱吹雪', fogMul: 1.15, fogTint: null, cloudMul: 1.0, petalMul: 3.4, windMul: 1.7, petalSizeMul: 1.25 },
  ];

  const env = {
    timeFrom: 0, timeTo: 0, timeT: 1,      // 过渡进度
    timeIdx: 0, autoTime: false, autoPhase: 0,
    weatherIdx: 0, wFrom: 0, wTo: 0, wT: 1,
    curTime: null,   // 当前插值后的时间参数
    curWeather: { fogMul: 1, fogTint: new THREE.Color(0xdfd8cc), cloudMul: 1, petalMul: 1, windMul: 1, petalSizeMul: 1 },
  };

  function cloneTime(cfg) {
    return {
      skyTop: cfg.skyTop.clone(), skyMid: cfg.skyMid.clone(), skyHorizon: cfg.skyHorizon.clone(),
      sunColor: cfg.sunColor.clone(), sunIntensity: cfg.sunIntensity, sunDir: cfg.sunDir.clone(),
      hemiSky: cfg.hemiSky.clone(), hemiGround: cfg.hemiGround.clone(), hemiIntensity: cfg.hemiIntensity,
      fogColor: cfg.fogColor.clone(), fogDensity: cfg.fogDensity,
      exposure: cfg.exposure, bloom: cfg.bloom, dof: cfg.dof,
      cloudColor: cfg.cloudColor.clone(), cloudOpacity: cfg.cloudOpacity,
      mountainColor: cfg.mountainColor.clone(), mountainOpacity: cfg.mountainOpacity,
      sunGlowColor: cfg.sunGlowColor.clone(), sunGlowOpacity: cfg.sunGlowOpacity, glowSize: cfg.glowSize,
      moonOpacity: cfg.moonOpacity, starOpacity: cfg.starOpacity, night: cfg.night,
      sat: cfg.sat, vignette: cfg.vignette,
    };
  }
  function lerpTime(a, b, t, out) {
    out.skyTop.copy(a.skyTop).lerp(b.skyTop, t);
    out.skyMid.copy(a.skyMid).lerp(b.skyMid, t);
    out.skyHorizon.copy(a.skyHorizon).lerp(b.skyHorizon, t);
    out.sunColor.copy(a.sunColor).lerp(b.sunColor, t);
    out.sunIntensity = lerp(a.sunIntensity, b.sunIntensity, t);
    out.sunDir.copy(a.sunDir).lerp(b.sunDir, t).normalize();
    out.hemiSky.copy(a.hemiSky).lerp(b.hemiSky, t);
    out.hemiGround.copy(a.hemiGround).lerp(b.hemiGround, t);
    out.hemiIntensity = lerp(a.hemiIntensity, b.hemiIntensity, t);
    out.fogColor.copy(a.fogColor).lerp(b.fogColor, t);
    out.fogDensity = lerp(a.fogDensity, b.fogDensity, t);
    out.exposure = lerp(a.exposure, b.exposure, t);
    out.bloom = lerp(a.bloom, b.bloom, t);
    out.dof = lerp(a.dof, b.dof, t);
    out.cloudColor.copy(a.cloudColor).lerp(b.cloudColor, t);
    out.cloudOpacity = lerp(a.cloudOpacity, b.cloudOpacity, t);
    out.mountainColor.copy(a.mountainColor).lerp(b.mountainColor, t);
    out.mountainOpacity = lerp(a.mountainOpacity, b.mountainOpacity, t);
    out.sunGlowColor.copy(a.sunGlowColor).lerp(b.sunGlowColor, t);
    out.sunGlowOpacity = lerp(a.sunGlowOpacity, b.sunGlowOpacity, t);
    out.glowSize = lerp(a.glowSize, b.glowSize, t);
    out.moonOpacity = lerp(a.moonOpacity, b.moonOpacity, t);
    out.starOpacity = lerp(a.starOpacity, b.starOpacity, t);
    out.night = lerp(a.night, b.night, t);
    out.sat = lerp(a.sat, b.sat, t);
    out.vignette = lerp(a.vignette, b.vignette, t);
    return out;
  }

  env.curTime = cloneTime(TIME_CONFIGS[0]);

  function setTime(idx, immediate) {
    idx = ((idx % TIME_CONFIGS.length) + TIME_CONFIGS.length) % TIME_CONFIGS.length;
    if (immediate) {
      env.timeIdx = idx; env.timeTo = idx; env.timeFrom = idx; env.timeT = 1;
      const c = TIME_CONFIGS[idx];
      const t = cloneTime(c);
      for (const k in t) { if (t[k] && t[k].isColor) env.curTime[k].copy(t[k]); else if (t[k] && t[k].isVector3) env.curTime[k].copy(t[k]); else env.curTime[k] = t[k]; }
    } else {
      env.timeFrom = env.timeIdx;
      env.timeTo = idx;
      env.timeT = 0;
      env.timeIdx = idx;
    }
    const lbl = document.getElementById('timeLabel');
    if (lbl) lbl.textContent = TIME_CONFIGS[idx].name;
  }
  function setWeather(idx, immediate) {
    idx = ((idx % WEATHER_CONFIGS.length) + WEATHER_CONFIGS.length) % WEATHER_CONFIGS.length;
    env.weatherIdx = idx;
    if (immediate) {
      const w = WEATHER_CONFIGS[idx];
      env.curWeather.fogMul = w.fogMul;
      env.curWeather.cloudMul = w.cloudMul;
      env.curWeather.petalMul = w.petalMul;
      env.curWeather.windMul = w.windMul;
      env.curWeather.petalSizeMul = w.petalSizeMul;
      if (w.fogTint) env.curWeather.fogTint.copy(w.fogTint);
      env.wTo = idx; env.wFrom = idx; env.wT = 1;
    } else {
      env.wFrom = env.weatherIdx;
      env.wTo = idx;
      env.wT = 0;
    }
    const lbl = document.getElementById('weatherLabel');
    if (lbl) lbl.textContent = WEATHER_CONFIGS[idx].name;
  }

  function updateEnvironment(dt, time) {
    if (env.timeT < 1) {
      env.timeT = Math.min(1, env.timeT + dt / 1.8);
      const from = TIME_CONFIGS[env.timeFrom], to = TIME_CONFIGS[env.timeTo];
      lerpTime(from, to, easeInOut(env.timeT), env.curTime);
    }
    if (env.wT < 1) {
      env.wT = Math.min(1, env.wT + dt / 1.2);
      const a = WEATHER_CONFIGS[env.wFrom], b = WEATHER_CONFIGS[env.wTo];
      const t = easeInOut(env.wT);
      env.curWeather.fogMul = lerp(a.fogMul, b.fogMul, t);
      env.curWeather.cloudMul = lerp(a.cloudMul, b.cloudMul, t);
      env.curWeather.petalMul = lerp(a.petalMul, b.petalMul, t);
      env.curWeather.windMul = lerp(a.windMul, b.windMul, t);
      env.curWeather.petalSizeMul = lerp(a.petalSizeMul, b.petalSizeMul, t);
      const ta = a.fogTint || TIME_CONFIGS[env.timeIdx].fogColor;
      const tb = b.fogTint || TIME_CONFIGS[env.timeIdx].fogColor;
      env.curWeather.fogTint.copy(ta).lerp(tb, t);
    }
    if (env.autoTime) {
      env.autoPhase += dt / 26;
      if (env.autoPhase >= 1) {
        env.autoPhase = 0;
        setTime(env.timeIdx + 1);
      }
    }
    const c = env.curTime;
    const w = env.curWeather;
    // 天空
    skyUniforms.uTop.value.copy(c.skyTop);
    skyUniforms.uMid.value.copy(c.skyMid);
    skyUniforms.uHorizon.value.copy(c.skyHorizon);
    skyUniforms.uSunDir.value.copy(c.sunDir);
    skyUniforms.uSunColor.value.copy(c.sunGlowColor);
    skyUniforms.uGlow.value = c.sunGlowOpacity * 0.9 + 0.1;
    // 灯光
    sun.color.copy(c.sunColor);
    sun.intensity = c.sunIntensity;
    sun.position.copy(c.sunDir).multiplyScalar(160);
    hemi.color.copy(c.hemiSky);
    hemi.groundColor.copy(c.hemiGround);
    hemi.intensity = c.hemiIntensity;
    fill.intensity = 0.12 + c.night * 0.1;
    // 雾
    scene.fog.color.copy(c.fogColor).lerp(w.fogTint, clamp(w.fogMul - 1, 0, 1) * 0.35);
    scene.fog.density = c.fogDensity * w.fogMul;
    scene.background.copy(scene.fog.color);
    // 云 / 山 / 光晕
    for (const s of cloudSprites) {
      s.material.color.copy(c.cloudColor);
      s.material.opacity = s.userData.baseOpacity * c.cloudOpacity * w.cloudMul;
    }
    mountain.material.color.copy(c.mountainColor);
    mountain.material.opacity = c.mountainOpacity;
    sunGlow.material.color.copy(c.sunGlowColor);
    sunGlow.material.opacity = c.sunGlowOpacity * (env.weatherIdx === 1 ? 0.5 : 1);
    sunGlow.position.copy(CAMERA_POS).addScaledVector(c.sunDir, 420);
    sunGlow.scale.setScalar(c.glowSize);
    moon.material.opacity = c.moonOpacity;
    moon.position.copy(CAMERA_POS)
      .addScaledVector(c.sunDir, -430)
      .add(new THREE.Vector3(0, 140, 0));
    stars.material.opacity = c.starOpacity;
    // 后处理
    compositeMat.uniforms.uExposure.value = c.exposure;
    compositeMat.uniforms.uBloom.value = c.bloom;
    compositeMat.uniforms.uDof.value = c.dof;
    compositeMat.uniforms.uSat.value = c.sat;
    compositeMat.uniforms.uVignette.value = c.vignette;
    // 夜樱：灯笼 / 萤火虫
    const night = c.night;
    couple.lampLight.intensity = night * 2.4;
    couple.lanternMat.emissiveIntensity = 0.15 + night * 3.0;
    couple.lampGlow.material.opacity = night * 0.85;
    fireflies.material.opacity = night * 0.85;
    sparkles.material.opacity = (0.25 + 0.35 * (1 - night)) * (env.weatherIdx === 1 ? 0.4 : 1);
    // 风 & 花瓣
    const windPower = (env.windBase || 1) * w.windMul;
    for (const u of windUniforms) u.uWind.value = windPower;
    petalSize = 0.24 * w.petalSizeMul;
    petals.material.size = petalSize;
    petals.material.opacity = Math.min(1, 0.5 + 0.45 * w.petalMul);
    nearPetals.material.size = 0.3 * w.petalSizeMul;
    nearPetals.material.opacity = Math.min(1, 0.55 + 0.4 * w.petalMul);
    petalSpeed = 0.55 + 0.45 * w.petalMul;
  }
  let petalSize = 0.24;
  let petalSpeed = 1;

  /* ---------------- 动画更新 ---------------- */
  function updatePetals(pts, time, dt) {
    const base = pts.userData.base;
    const pos = pts.geometry.attributes.position;
    const speed = petalSpeed;
    for (let i = 0; i < base.length; i++) {
      const b = base[i];
      const t = time * b.sp * 0.3 * speed + b.ph;
      const x = b.x + ((t * 2.2 * speed) % 120) - 60 + Math.sin(t * 0.7) * b.sw;
      let y = b.y - ((time * 0.2 * b.sp * speed + b.ph) % 12) + Math.sin(t * 1.3) * 0.4;
      if (y < 0.2) y += 12;
      const z = b.z + Math.cos(t * 0.5) * b.sw;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  }
  function updateNearPetals(time) {
    const base = nearPetals.userData.base;
    const pos = nearPetals.geometry.attributes.position;
    const speed = petalSpeed;
    for (let i = 0; i < base.length; i++) {
      const b = base[i];
      const t = time * b.sp * 0.5 * speed + b.ph;
      pos.setXYZ(
        i,
        b.x + Math.sin(t * 0.9) * 1.2 + Math.sin(t * 0.37) * 0.6,
        b.y + Math.sin(t * 0.6 + 1) * 0.5 - ((time * 0.1 * b.sp * speed) % 2.4),
        b.z + Math.cos(t * 0.8) * 1.0
      );
    }
    pos.needsUpdate = true;
  }
  function updateSparkles(time) {
    const base = sparkles.userData.base;
    const pos = sparkles.geometry.attributes.position;
    for (let i = 0; i < base.length; i++) {
      const b = base[i];
      const t = time * b.sp + b.ph;
      pos.setXYZ(i, b.x + Math.sin(t * 0.8) * 0.6, b.y + Math.sin(t * 1.6 + 1) * 0.25, b.z + Math.cos(t * 0.6) * 0.6);
    }
    pos.needsUpdate = true;
  }
  function updateFireflies(time) {
    const base = fireflies.userData.base;
    const pos = fireflies.geometry.attributes.position;
    for (let i = 0; i < base.length; i++) {
      const b = base[i];
      const t = time * b.sp + b.ph;
      pos.setXYZ(i, b.x + Math.sin(t * 0.5 + 1) * 1.2, b.y + Math.sin(t * 0.8) * 0.35 + 0.1, b.z + Math.cos(t * 0.6) * 1.2);
    }
    pos.needsUpdate = true;
  }
  function updateButterflies(time) {
    for (const b of butterflies) {
      const u = b.userData;
      const t = time * u.sp + u.ph;
      b.position.set(
        u.cx + Math.sin(t) * u.r,
        u.h + Math.sin(t * 2.1 + 1) * 0.18,
        u.cz + Math.cos(t * 0.8) * u.r
      );
      const flap = 0.55 + 0.45 * Math.abs(Math.sin(time * 12 + u.ph));
      b.scale.set(0.32 * flap, 0.27, 1);
      b.material.rotation = Math.sin(t * 1.3) * 0.25;
      b.material.opacity = env.curTime.night > 0.5 ? 0 : 0.92;
    }
  }

  function updateCouple(time) {
    const c = couple;
    const t = time;
    // 呼吸 / 摇曳
    const breathe = Math.sin(t * 0.9) * 0.012;
    c.boy.group.position.y = breathe;
    c.girl.group.position.y = Math.sin(t * 0.9 + 1.7) * 0.012;
    // 女生偶尔靠向男生：周期 ~14s
    const phase = (t % 14) / 14;
    const lean = phase < 0.5 ? easeInOut(Math.min(1, phase / 0.18)) : easeInOut(Math.max(0, (1 - phase) / 0.18));
    const leanAmt = phase < 0.5 ? lean : 0;
    // 头部倾向
    c.girl.head.rotation.z = -0.22 * leanAmt + Math.sin(t * 0.7) * 0.02;
    c.girl.head.rotation.x = 0.06 * leanAmt;
    c.girl.group.rotation.z = -0.06 * leanAmt;
    c.boy.head.rotation.z = 0.16 * leanAmt + Math.sin(t * 0.6 + 2) * 0.02;
    c.boy.head.rotation.y = -0.25 * leanAmt;
    // 手臂：男生手臂搭在身后 / 女生手放腿上
    c.boy.armR.pivot.rotation.z = -0.5 - 0.35 * leanAmt;
    c.boy.armR.pivot.rotation.x = 0.3 + 0.2 * leanAmt;
    c.boy.armL.pivot.rotation.z = 0.42;
    c.girl.armL.pivot.rotation.z = 0.55;
    c.girl.armL.elbow.rotation.z = 0.3;
    c.girl.armR.pivot.rotation.z = -0.5 - 0.3 * leanAmt;
    // 兔子：小幅跳跃 + 耳朵摆动
    const hop = Math.abs(Math.sin(t * 1.6));
    c.rabbit.position.y = hop * 0.05;
    c.rabbit.rotation.y = 2.4 + Math.sin(t * 0.4) * 0.35;
    // 灯笼轻微呼吸
    const flick = 0.9 + 0.1 * Math.sin(t * 5.3) + 0.05 * Math.sin(t * 11.7);
    c.lampGlow.material.opacity = (env.curTime.night * 0.85) * flick;
    c.lampLight.intensity = env.curTime.night * 2.4 * flick;
  }

  /* ---------------- UI ---------------- */
  env.windBase = 1;
  const windSteps = [{ name: '微风', v: 0.55 }, { name: '轻风', v: 1.0 }, { name: '劲风', v: 1.8 }];
  let windIdx = 1;
  function applyWind(idx) {
    windIdx = ((idx % windSteps.length) + windSteps.length) % windSteps.length;
    env.windBase = windSteps[windIdx].v;
    const el = document.getElementById('windLabel');
    if (el) el.textContent = windSteps[windIdx].name;
  }
  const timeBtn = document.querySelector('[data-act="time"]');
  if (timeBtn) timeBtn.addEventListener('click', () => setTime(env.timeIdx + 1));
  const weatherBtn = document.querySelector('[data-act="weather"]');
  if (weatherBtn) weatherBtn.addEventListener('click', () => setWeather(env.weatherIdx + 1));
  const windBtn = document.querySelector('[data-act="wind"]');
  if (windBtn) windBtn.addEventListener('click', () => applyWind(windIdx + 1));
  const autoBtn = document.querySelector('[data-act="auto"]');
  if (autoBtn) {
    autoBtn.addEventListener('click', () => {
      env.autoTime = !env.autoTime;
      env.autoPhase = 0;
      autoBtn.classList.toggle('on', env.autoTime);
      const el = document.getElementById('autoLabel');
      if (el) el.textContent = env.autoTime ? '开' : '关';
    });
  }
  const shotBtn = document.querySelector('[data-act="shot"]');
  if (shotBtn) shotBtn.addEventListener('click', () => {
    renderPost(performance.now() / 1000);
    const a = document.createElement('a');
    a.download = '花见之丘.png';
    a.href = renderer.domElement.toDataURL('image/png');
    a.click();
  });
  const fsBtn = document.querySelector('[data-act="fullscreen"]');
  if (fsBtn) fsBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    else document.exitFullscreen && document.exitFullscreen();
  });

  // URL 参数（截图/调试用）
  const timeParam = Q.get('time');
  const weatherParam = Q.get('weather');
  if (timeParam != null && timeParam !== '') setTime(parseInt(timeParam, 10) || 0, true);
  else setTime(1, true); // 默认正午
  if (weatherParam != null && weatherParam !== '') setWeather(parseInt(weatherParam, 10) || 0, true);
  else setWeather(0, true);
  applyWind(windIdx);
  if (Q.get('ui') === '0') {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
  }

  window.__dbg = {
    scene: scene, camera: camera, renderer: renderer, THREE: THREE,
    env: env, setTime: setTime, setWeather: setWeather,
    post: { compositeMat: compositeMat, brightMat: brightMat, blurMat: blurMat },
  };

  const clock = new THREE.Clock();
  let time = 0;
  let started = false;
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;
    updateEnvironment(dt, time);
    updatePetals(petals, time, dt);
    updateNearPetals(time);
    updateSparkles(time);
    updateFireflies(time);
    updateButterflies(time);
    updateCouple(time);
    for (const u of windUniforms) u.uTime.value = time;
    renderPost(time);
    if (!started) {
      started = true;
      const ld = document.getElementById('loading');
      if (ld) { ld.classList.add('done'); setTimeout(() => { ld.style.display = 'none'; }, 700); }
    }
  }
  animate();
})();
