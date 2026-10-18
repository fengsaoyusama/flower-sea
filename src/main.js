/* ============================================================
 * main.js — 「花見の丘」日系浪漫花海（Three.js 全程序化）
 * 樱花树 / 波斯菊花海 / 油菜花 / 夕阳 / 富士山 / 风摆 / 花瓣 / 后处理
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

  /* ---------------- 工具 ---------------- */
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

  /* ---------------- 地形 ---------------- */
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
  scene.fog = new THREE.FogExp2(HAZE.getHex(), 0.0045);
  scene.background = HAZE.clone();

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(0, terrainH(0, 20) + 2.0, 20);

  /* ---------------- 天空 ---------------- */
  (function sky() {
    const geo = new THREE.SphereGeometry(600, 32, 20);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cTop = new THREE.Color(0x2f78c4);
    const cMid = new THREE.Color(0x86bce6);
    const cHorizon = new THREE.Color(0xffdcb0);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = clamp(pos.getY(i) / 600, -0.25, 1);
      if (y > 0.05) tmp.copy(cMid).lerp(cTop, clamp((y - 0.05) / 0.45, 0, 1));
      else tmp.copy(cHorizon).lerp(cMid, clamp((y + 0.18) / 0.23, 0, 1));
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = -10;
    scene.add(mesh);
  })();

  /* ---------------- 灯光（夕阳） ---------------- */
  const hemi = new THREE.HemisphereLight(0xd8e8fa, 0x6d7a45, 0.5);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffc487, 2.5);
  sun.position.set(120, 26, -120);
  sun.target.position.set(5, 3, -20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.camera.near = 5;
  sun.shadow.camera.far = 160;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(sun.target);

  const fill = new THREE.DirectionalLight(0xbcd2ea, 0.3);
  fill.position.set(-20, 14, 20);
  scene.add(fill);

  // 夕阳辉光
  const glowTex = T.glow(0.45);
  (function sunGlow() {
    const g1 = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xffe7bd, blending: THREE.AdditiveBlending, transparent: true,
      opacity: 0.55, depthWrite: false, fog: false,
    }));
    g1.position.set(300, 95, -320);
    g1.scale.set(150, 150, 1);
    scene.add(g1);
    const g2 = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xffd08a, blending: THREE.AdditiveBlending, transparent: true,
      opacity: 0.6, depthWrite: false, fog: false,
    }));
    g2.position.set(300, 88, -319);
    g2.scale.set(60, 60, 1);
    scene.add(g2);
    // 地平线暖雾
    const haze = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xffe3b8, blending: THREE.NormalBlending, transparent: true,
      opacity: 0.32, depthWrite: false, fog: false,
    }));
    haze.position.set(120, 16, -230);
    haze.scale.set(260, 86, 1);
    scene.add(haze);
  })();

  /* ---------------- 云 ---------------- */
  (function clouds() {
    const R = rng(555);
    const cloudTex = T.cloud(91);
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: cloudTex, color: 0xfff6ea, transparent: true, opacity: 0.26 + R() * 0.18,
        depthWrite: false, fog: false, blending: THREE.NormalBlending,
      }));
      const x = -280 + R() * 560;
      const y = 70 + R() * 60;
      const z = -170 - R() * 150;
      s.position.set(x, y, z);
      const sc = 110 + R() * 100;
      s.scale.set(sc, sc * (0.42 + R() * 0.1), 1);
      s.material.rotation = (R() - 0.5) * 0.08;
      scene.add(s);
    }
  })();

  /* ---------------- 远山 / 富士山 ---------------- */
  (function mountains() {
    const tex = T.mountains(101);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(640, 200), new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, fog: false, opacity: 1.0,
      color: 0x3f6288,
    }));
    m.position.set(-20, 52, -360);
    m.renderOrder = -8;
    m.name = 'mountains';
    scene.add(m);
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
      map: tex, vertexColors: true, color: 0xaebd8e, roughness: 1, metalness: 0,
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
  const flowerDefs = [];
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
    flowerDefs.push({ name: opts.key, count: n });
    return mesh;
  }

  const cosmosTex = T.cosmos(31);
  const daisyTex = T.daisy(47);
  const rapeseedTex = T.rapeseed(59);
  const grassTex = T.grassTuft(123);

  // 主花海：粉色波斯菊
  scatterFlowers(cosmosTex, 3200, { cx: 4, cz: -6, r: 62, rx: 1.15, rz: 1 }, {
    key: 'cosmos', seed: 3101, min: 0.6, max: 1.15, color: 0xffd9e6,
    filter: (x, z, R) => {
      if (Math.hypot(x - 13, z + 46) < 6) return false; // 树下留白
      if (Math.hypot(x + 3.8, z - 6.5) < 2.6) return false; // 长椅留白
      if (R() > 0.92 && Math.hypot(x, z + 10) > 40) return false;
      return true;
    },
  });
  // 白色雏菊 / 满天星
  scatterFlowers(daisyTex, 3800, { cx: 2, cz: -4, r: 60, rx: 1.2, rz: 1 }, {
    key: 'daisy', seed: 4701, min: 0.45, max: 0.9, color: 0xffffff,
    filter: (x, z, R) => {
      if (Math.hypot(x - 13, z + 46) < 5) return false;
      if (Math.hypot(x + 3.8, z - 6.5) < 2.4) return false;
      return true;
    },
  });
  // 草地
  scatterFlowers(grassTex, 6000, { cx: 0, cz: 0, r: 70, rx: 1.2, rz: 1 }, {
    key: 'grass', seed: 1234, min: 0.35, max: 0.8, color: 0x9fb27f, alphaTest: 0.45,
    filter: (x, z) => Math.hypot(x + 3.8, z - 6.5) > 2.4,
  });
  // 油菜花田（左侧远处一块黄色）
  scatterFlowers(rapeseedTex, 700, { cx: -34, cz: -28, r: 17, rx: 1.4, rz: 1 }, {
    key: 'rapeseed', seed: 5901, min: 0.6, max: 1.0, color: 0xfff0b8,
    filter: (x, z) => true,
  });
  // 近景加密：让画面下半部分铺满花
  scatterFlowers(cosmosTex, 1000, { cx: -2, cz: 14, r: 16, rx: 1.5, rz: 1 }, {
    key: 'cosmos-near', seed: 3111, min: 0.7, max: 1.25, color: 0xffd9e6,
    filter: (x, z) => true,
  });
  scatterFlowers(daisyTex, 900, { cx: 4, cz: 15, r: 15, rx: 1.4, rz: 1 }, {
    key: 'daisy-near', seed: 4711, min: 0.45, max: 0.85, color: 0xffffff,
    filter: (x, z) => true,
  });

  /* ---------------- 樱花树 ---------------- */
  const blossomMats = [
    new THREE.MeshStandardMaterial({ map: T.blossomCluster(71), color: 0xffdce9, roughness: 1, alphaTest: 0.38, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ map: T.blossomCluster(72), color: 0xffc6da, roughness: 1, alphaTest: 0.38, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ map: T.blossomCluster(73), color: 0xfff2f7, roughness: 1, alphaTest: 0.38, side: THREE.DoubleSide }),
  ];
  const blossomGeo = new THREE.PlaneGeometry(1, 1);

  function makeCherryTree(x, z, s, seed, opts) {
    opts = opts || {};
    const R = rng(seed);
    const y0 = terrainH(x, z);
    const g = new THREE.Group();
    g.position.set(x, y0 - 0.15, z);
    const h = (7.5 + R() * 3.0) * s;
    const barkTex = T.bark(81);
    const trunkMat = new THREE.MeshStandardMaterial({ map: barkTex, color: 0x6e5a48, roughness: 1 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * s, 0.30 * s, h, 9, 4), trunkMat);
    trunk.position.y = h / 2;
    trunk.rotation.z = (R() - 0.5) * 0.08;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    g.add(trunk);
    // 主枝
    for (let i = 0; i < 7; i++) {
      const bh = h * (0.45 + R() * 0.4);
      const a = R() * Math.PI * 2;
      const len = (2.8 + R() * 3.2) * s;
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s, 0.10 * s, len, 6), trunkMat);
      br.position.set(Math.cos(a) * len * 0.45, bh, Math.sin(a) * len * 0.45);
      br.rotation.set(Math.sin(a) * 1.05, 0, -Math.cos(a) * 1.05);
      br.castShadow = true;
      g.add(br);
    }
    // 花冠：三层堆出蓬松感
    const crownY = h * 0.9;
    const layers = [
      { n: 10, rad: 1.3, size: 4.2, spread: 1.2 },
      { n: 14, rad: 3.0, size: 3.4, spread: 2.0 },
      { n: 18, rad: 4.6, size: 2.6, spread: 2.6 },
    ];
    for (const L of layers) {
      for (let i = 0; i < L.n; i++) {
        const a = R() * Math.PI * 2;
        const rad = (R() * L.rad + L.rad * 0.35) * s;
        const size = (L.size * (0.75 + R() * 0.5)) * s;
        const leaf = new THREE.Mesh(blossomGeo, blossomMats[(R() * blossomMats.length) | 0]);
        leaf.position.set(
          Math.cos(a) * rad,
          crownY + (R() - 0.4) * L.spread * s,
          Math.sin(a) * rad * 0.9
        );
        leaf.scale.set(size, size, 1);
        leaf.rotation.set((R() - 0.5) * 1.2, R() * Math.PI, (R() - 0.5) * 1.2);
        leaf.receiveShadow = true;
        g.add(leaf);
      }
    }
    scene.add(g);
    return g;
  }

  // 远丘上的一本樱（主景）
  makeCherryTree(13.5, -47, 1.55, 6101);
  // 右侧近景樱花（取景框）
  makeCherryTree(9.5, 2.0, 1.05, 6102);
  // 左侧点缀
  makeCherryTree(-26, -18, 0.95, 6103);
  makeCherryTree(-38, 6, 0.85, 6104);

  /* ---------------- 长椅 + 草帽 ---------------- */
  (function bench() {
    const bx = -3.8, bz = 6.5;
    const by = terrainH(bx, bz);
    const woodTex = T.wood(121);
    const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, color: 0xe8c898, roughness: 0.9 });
    const darkMat = new THREE.MeshStandardMaterial({ map: woodTex, color: 0xa07850, roughness: 0.9 });
    const g = new THREE.Group();
    g.position.set(bx, by, bz);
    g.rotation.y = -1.3;
    g.scale.setScalar(1.15);
    function bxBox(w, h, d, mat, x, y, z) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
      return m;
    }
    // 座板条
    for (let i = -1; i <= 1; i++) {
      bxBox(1.85, 0.055, 0.15, woodMat, 0, 0.42, i * 0.17);
    }
    // 靠背条
    for (let i = 0; i < 3; i++) {
      bxBox(1.85, 0.13, 0.06, woodMat, 0, 0.62 + i * 0.18, -0.27 - i * 0.045);
    }
    // 侧腿板
    for (const sx of [-0.82, 0.82]) {
      bxBox(0.09, 0.42, 0.5, darkMat, sx, 0.21, 0);
      bxBox(0.08, 0.62, 0.08, darkMat, sx, 0.62, -0.4);
    }
    // 扶手
    for (const sx of [-0.82, 0.82]) {
      bxBox(0.07, 0.06, 0.52, woodMat, sx, 0.58, -0.06);
    }
    scene.add(g);
  })();

  /* ---------------- 花瓣 / 光斑 ---------------- */
  const petalTex = T.petal();
  const petals = (function () {
    const N = 380;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const base = [];
    const R = rng(777);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const x = -60 + R() * 120, y = 1 + R() * 14, z = -60 + R() * 80;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      base.push({ x, y, z, sp: 0.6 + R() * 1.4, ph: R() * 10, sw: 0.5 + R() * 1.2 });
      c.setRGB(1, 0.72 + R() * 0.2, 0.82 + R() * 0.15);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.22, map: petalTex, vertexColors: true, transparent: true, opacity: 0.95,
      depthWrite: false, sizeAttenuation: true, alphaTest: 0.25, fog: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData.base = base;
    scene.add(pts);
    return pts;
  })();

  const sparkles = (function () {
    const N = 90;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const base = [];
    const R = rng(888);
    for (let i = 0; i < N; i++) {
      const x = -14 + R() * 28, y = 0.4 + R() * 4.5, z = 2 + R() * 22;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      base.push({ x, y, z, ph: R() * 10, sp: 0.4 + R() * 0.8, sz: 0.06 + R() * 0.16 });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.14, map: glowTex, color: 0xffe6b0, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData.base = base;
    scene.add(pts);
    return pts;
  })();

  /* ---------------- 近景光斑（梦幻感） ---------------- */
  (function bokeh() {
    const R = rng(999);
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: 0xffe6c0, blending: THREE.AdditiveBlending,
        transparent: true, opacity: 0.10 + R() * 0.12, depthWrite: false, fog: false,
      }));
      s.position.set(-11 + R() * 22, 0.7 + R() * 2.8, 6 + R() * 12);
      const sc = 0.3 + R() * 0.85;
      s.scale.set(sc, sc, 1);
      scene.add(s);
    }
  })();

  /* ---------------- 近景花瓣 ---------------- */
  const nearPetals = (function () {
    const N = 150;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const base = [];
    const R = rng(6161);
    for (let i = 0; i < N; i++) {
      const x = -11 + R() * 22, y = 0.6 + R() * 4.0, z = 3 + R() * 15;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      base.push({ x, y, z, sp: 0.5 + R() * 1.2, ph: R() * 10, sw: 0.4 + R() * 1.0 });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.3, map: petalTex, color: 0xffd8e6, transparent: true, opacity: 0.9,
      depthWrite: false, sizeAttenuation: true, alphaTest: 0.25, fog: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData.base = base;
    scene.add(pts);
    return pts;
  })();

  /* ---------------- 光柱（梦幻感） ---------------- */
  (function lightShafts() {
    const R = rng(4321);
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: T.glow(0.5), color: 0xffe2b4, transparent: true, opacity: 0.07 + R() * 0.05,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 26), mat);
      m.position.set(24 + i * 6, 13, -20 - i * 5);
      m.rotation.set(0.1, -0.5, 0.3);
      scene.add(m);
    }
  })();

  /* ---------------- 相机 / 预设 ---------------- */
  const treeLook = new THREE.Vector3(13.5, terrainH(13.5, -47) + 8.0, -47);
  const PRESETS = [
    { name: '远望', pos: [-1.8, terrainH(-1.8, 19) + 1.75, 19], look: [11, terrainH(11, -46) + 6.2, -46], fov: 44 },
    { name: '花间', pos: [-4.2, terrainH(-4.2, 13) + 1.15, 13], look: [6, terrainH(6, -30) + 4.0, -34], fov: 52 },
    { name: '树下', pos: [2.0, terrainH(2.0, -26) + 2.4, -26], look: [13.5, terrainH(13.5, -47) + 7.5, -47], fov: 48 },
    { name: '回望', pos: [5.5, terrainH(5.5, -14) + 2.0, -14], look: [-10, terrainH(-10, 16) + 3.0, 12], fov: 48 },
  ];

  const camState = {
    mode: 'auto',
    yaw: 0, pitch: 0,
    vel: new THREE.Vector3(),
    keys: {},
    targetLook: new THREE.Vector3(),
    trans: null,
  };

  function applyPreset(i, instant) {
    const p = PRESETS[i % PRESETS.length];
    const pos = new THREE.Vector3(p.pos[0], p.pos[1], p.pos[2]);
    const look = new THREE.Vector3(p.look[0], p.look[1], p.look[2]);
    camera.fov = p.fov;
    camera.updateProjectionMatrix();
    if (instant) {
      camera.position.copy(pos);
      camera.lookAt(look);
      camState.targetLook.copy(look);
      const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      camState.yaw = e.y; camState.pitch = e.x;
      camState.trans = null;
    } else {
      camState.trans = { pos: camera.position.clone(), look: camState.targetLook.clone(), toPos: pos, toLook: look, t: 0, dur: 1.5 };
    }
  }

  const autoCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.6, 0, 26.5),
    new THREE.Vector3(2.6, 0, 22.0),
    new THREE.Vector3(1.2, 0, 17.5),
    new THREE.Vector3(-0.6, 0, 13.0),
    new THREE.Vector3(-2.2, 0, 9.5),
  ]);
  for (const p of autoCurve.points) p.y = terrainH(p.x, p.z) + 1.9;

  function updateCamera(dt, time) {
    if (camState.mode === 'auto') {
      const u = (time * 0.010) % 1;
      const tri = u < 0.5 ? u * 2 : 2 - u * 2;
      const e = tri * tri * (3 - 2 * tri);
      const p = autoCurve.getPointAt(clamp(e, 0.001, 0.999));
      camera.position.set(
        p.x + Math.sin(time * 0.21) * 0.06,
        p.y + Math.sin(time * 0.29 + 1) * 0.04 + (1 - e) * 0.35,
        p.z
      );
      const look = new THREE.Vector3(
        treeLook.x + Math.sin(time * 0.13) * 0.6,
        treeLook.y + Math.sin(time * 0.19) * 0.3 + (1 - e) * 0.8,
        treeLook.z
      );
      camera.lookAt(look);
      camState.targetLook.copy(look);
      camera.fov = lerp(41, 46, e);
      camera.updateProjectionMatrix();
      return;
    }
    if (camState.trans) {
      const tr = camState.trans;
      tr.t += dt;
      const k = clamp(tr.t / tr.dur, 0, 1);
      const e = k * k * (3 - 2 * k);
      camera.position.lerpVectors(tr.pos, tr.toPos, e);
      camState.targetLook.lerpVectors(tr.look, tr.toLook, e);
      const q = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().lookAt(camera.position, camState.targetLook, new THREE.Vector3(0, 1, 0))
      );
      camera.quaternion.slerp(q, 0.2);
      if (k >= 1) camState.trans = null;
      const e2 = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      camState.yaw = e2.y; camState.pitch = e2.x;
      return;
    }
    const speed = (camState.keys['shift'] ? 8 : 3.6) * dt;
    const fwd = new THREE.Vector3(-Math.sin(camState.yaw), 0, -Math.cos(camState.yaw));
    const right = new THREE.Vector3(Math.cos(camState.yaw), 0, -Math.sin(camState.yaw));
    const move = new THREE.Vector3();
    if (camState.keys['w']) move.add(fwd);
    if (camState.keys['s']) move.sub(fwd);
    if (camState.keys['d']) move.add(right);
    if (camState.keys['a']) move.sub(right);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed);
    camState.vel.lerp(move, 1 - Math.pow(0.001, dt));
    camera.position.add(camState.vel);
    camera.position.x = clamp(camera.position.x, -90, 90);
    camera.position.z = clamp(camera.position.z, -90, 60);
    const groundY = terrainH(camera.position.x, camera.position.z);
    camera.position.y = clamp(camera.position.y, groundY + 0.5, groundY + 12);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(camState.pitch, camState.yaw, 0, 'YXZ'));
    camera.quaternion.copy(q);
  }

  /* ---------------- 输入 ---------------- */
  (function input() {
    let dragging = false, lastX = 0, lastY = 0;
    canvas.addEventListener('pointerdown', (e) => {
      if (camState.mode === 'auto') setMode('free');
      dragging = true;
      lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      camState.yaw -= dx * 0.0032;
      camState.pitch = clamp(camState.pitch - dy * 0.0028, -1.2, 1.15);
    });
    window.addEventListener('pointerup', () => { dragging = false; });
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      camState.keys[k] = true;
      if (['w', 'a', 's', 'd'].includes(k) && camState.mode === 'auto') setMode('free');
    });
    window.addEventListener('keyup', (e) => { camState.keys[e.key.toLowerCase()] = false; });
    canvas.addEventListener('wheel', (e) => {
      if (camState.mode === 'auto') return;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      camera.position.addScaledVector(dir, e.deltaY * 0.004);
      e.preventDefault();
    }, { passive: false });
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
      uBloom: { value: 0.5 }, uExposure: { value: 0.9 }, uDof: { value: 0.5 },
      uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
      uVignette: { value: 0.38 }, uGrain: { value: 0.018 }, uSat: { value: 1.22 },
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
        m = max(m, smoothstep(0.02, 0.20, 0.52 - uv.y));
        m = max(m, smoothstep(0.03, 0.14, uv.y - 0.90) * 0.55);
        m = max(m, smoothstep(0.38, 0.66, abs(uv.x - 0.5)) * 0.42);
        vec3 col = mix(sharp, soft, clamp(m, 0.0, 0.7) * uDof);
        vec3 bloom = texture2D(tBloom, uv).rgb;
        col += bloom * uBloom;
        vec2 q = uv - 0.5;
        float vig = smoothstep(1.1, 0.2, length(q * vec2(1.02, 0.9)));
        col *= mix(1.0 - uVignette, 1.0, vig);
        col = aces(col * uExposure);
        col = clamp((col - 0.5) * 1.1 + 0.5, 0.0, 1.0);
        // 饱和 / 暖色分级
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

    // 景深模糊层
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

  /* ---------------- 风 / UI ---------------- */
  const windSteps = [{ name: '微风', v: 0.55 }, { name: '轻风', v: 1.0 }, { name: '劲风', v: 1.8 }];
  let windIdx = 1;
  function applyWind(idx) {
    windIdx = ((idx % windSteps.length) + windSteps.length) % windSteps.length;
    const v = windSteps[windIdx];
    for (const u of windUniforms) u.uWind.value = v.v;
    const el = document.getElementById('windLabel');
    if (el) el.textContent = v.name;
  }

  function setMode(mode) {
    camState.mode = mode;
    document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    const hint = document.getElementById('hint');
    if (hint) hint.textContent = mode === 'free' ? '拖动鼠标环视 · WASD 走动 · Shift 加速' : '';
  }
  document.querySelectorAll('[data-mode]').forEach((b) => {
    b.addEventListener('click', () => setMode(b.dataset.mode));
  });
  const windBtn = document.querySelector('[data-act="wind"]');
  if (windBtn) windBtn.addEventListener('click', () => applyWind(windIdx + 1));
  let presetIdx = 0;
  const camBtn = document.querySelector('[data-act="cam"]');
  if (camBtn) camBtn.addEventListener('click', () => {
    presetIdx = (presetIdx + 1) % PRESETS.length;
    setMode('free');
    applyPreset(presetIdx, false);
    const lbl = document.getElementById('camLabel');
    if (lbl) lbl.textContent = PRESETS[presetIdx].name;
  });
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

  /* ---------------- 启动 ---------------- */
  const camParam = Q.get('cam');
  let forcedPreset = null;
  if (camParam != null && camParam !== '' && camParam !== 'auto') {
    if (/^\d+$/.test(camParam)) forcedPreset = parseInt(camParam, 10);
    else forcedPreset = Math.max(0, PRESETS.findIndex((p) => p.name === camParam));
  }
  if (Q.get('ui') === '0') {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
  }
  applyWind(windIdx);
  if (forcedPreset != null) {
    camState.mode = 'free';
    presetIdx = forcedPreset;
    applyPreset(forcedPreset, true);
    const lbl = document.getElementById('camLabel');
    if (lbl) lbl.textContent = PRESETS[presetIdx].name;
  } else {
    camState.mode = 'auto';
    applyPreset(0, true);
  }
  setMode(camState.mode);

  window.__dbg = {
    scene: scene, camera: camera, renderer: renderer, THREE: THREE,
    post: { compositeMat: compositeMat, brightMat: brightMat, blurMat: blurMat },
    flowers: flowerDefs, petals: petals, sparkles: sparkles,
  };

  const clock = new THREE.Clock();
  let time = 0;
  let started = false;

  function updatePetals(pts, dt, time) {
    const base = pts.userData.base;
    const pos = pts.geometry.attributes.position;
    for (let i = 0; i < base.length; i++) {
      const b = base[i];
      const t = time * b.sp * 0.35 + b.ph;
      const x = b.x + ((t * 2.2) % 120) - 60 + Math.sin(t * 0.7) * b.sw;
      let y = b.y - ((time * 0.22 * b.sp + b.ph) % 12) + Math.sin(t * 1.3) * 0.4;
      if (y < 0.2) y += 12;
      const z = b.z + Math.cos(t * 0.5) * b.sw;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  }

  function updateSparkles(time) {
    const base = sparkles.userData.base;
    const pos = sparkles.geometry.attributes.position;
    for (let i = 0; i < base.length; i++) {
      const b = base[i];
      const t = time * b.sp + b.ph;
      pos.setXYZ(
        i,
        b.x + Math.sin(t * 0.8) * 0.6,
        b.y + Math.sin(t * 1.6 + 1) * 0.25,
        b.z + Math.cos(t * 0.6) * 0.6
      );
    }
    pos.needsUpdate = true;
  }

  function updateNearPetals(time) {
    const base = nearPetals.userData.base;
    const pos = nearPetals.geometry.attributes.position;
    for (let i = 0; i < base.length; i++) {
      const b = base[i];
      const t = time * b.sp * 0.5 + b.ph;
      pos.setXYZ(
        i,
        b.x + Math.sin(t * 0.9) * 1.2 + Math.sin(t * 0.37) * 0.6,
        b.y + Math.sin(t * 0.6 + 1) * 0.5,
        b.z + Math.cos(t * 0.8) * 1.0
      );
    }
    pos.needsUpdate = true;
  }

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;
    updateCamera(dt, time);
    updatePetals(petals, dt, time);
    updateNearPetals(time);
    updateSparkles(time);
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
