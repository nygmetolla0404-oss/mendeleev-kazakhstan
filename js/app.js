/* ============================================================
   Қазақстан картасындағы Менделеев кестесі — 3D қозғалтқыш
   ============================================================ */
(async () => {
  // Қазақ әріптері бар қаріптер жүктелгенше күтеміз (интернетсіз — 3 секундтан кейін жүйелік қаріп)
  try {
    if (document.fonts && document.fonts.load) await Promise.race([
      Promise.all(["900 40px Unbounded", "700 40px Unbounded", "700 30px Montserrat", "600 30px Montserrat", "500 30px Montserrat"].map(f => document.fonts.load(f, "ӘҒҚҢӨҰҮІ Aa"))),
      new Promise(r => setTimeout(r, 3000))
    ]);
  } catch (e) { /* жалғастырамыз */ }
  const D = window.APPDATA;
  const PE = window.PHOTOS_EL || {}, PD = window.PHOTOS_DEP || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const rand = (a, b) => a + Math.random() * (b - a);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const FONT_H = "'Unbounded','Montserrat',sans-serif", FONT_B = "'Montserrat',system-ui,sans-serif";

  function shade(hex, amt) {
    const c = new THREE.Color(hex);
    return amt >= 0 ? c.lerp(new THREE.Color("#ffffff"), amt) : c.lerp(new THREE.Color("#000000"), -amt);
  }

  /* ---------------- Рендерер ---------------- */
  const canvas = $("#bg");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 3000);
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  const MAXANISO = renderer.capabilities.getMaxAnisotropy();

  /* ---------------- Твиндер ---------------- */
  const tweens = [];
  function tween(dur, fn, ez = ease) { return new Promise(res => tweens.push({ t: 0, dur, fn, ez, res })); }
  function updateTweens(dt) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i]; tw.t += dt;
      const k = Math.min(tw.t / tw.dur, 1); tw.fn(tw.ez(k));
      if (k >= 1) { tweens.splice(i, 1); tw.res(); }
    }
  }
  function flyTo(pos, target, dur = 1.6) {
    const p0 = camera.position.clone(), t0 = controls.target.clone();
    return tween(dur, k => { camera.position.lerpVectors(p0, pos, k); controls.target.lerpVectors(t0, target, k); });
  }

  /* ---------------- Мәтін текстуралары ---------------- */
  function canvasTex(c) {
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding; t.anisotropy = MAXANISO; return t;
  }
  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function makeLabel(text, { size = 44, color = "#fff", bg = "rgba(6,12,26,.78)", border = null, font = FONT_B, weight = 700, scale = 1, pad = 18 } = {}) {
    const c = document.createElement("canvas"), g = c.getContext("2d");
    g.font = `${weight} ${size}px ${font}`;
    const w = Math.ceil(g.measureText(text).width) + pad * 2, h = size + pad * 1.4;
    c.width = w; c.height = h;
    g.font = `${weight} ${size}px ${font}`;
    if (bg) { g.fillStyle = bg; rr(g, 2, 2, w - 4, h - 4, h / 2.4); g.fill(); }
    if (border) { g.strokeStyle = border; g.lineWidth = 4; rr(g, 2, 2, w - 4, h - 4, h / 2.4); g.stroke(); }
    g.fillStyle = color; g.textBaseline = "middle"; g.textAlign = "center"; g.fillText(text, w / 2, h / 2 + 2);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(c), transparent: true, depthWrite: false }));
    const k = 0.01 * scale; s.scale.set(w * k, h * k, 1);
    return s;
  }
  function glowTexture(inner = "rgba(255,255,255,1)", outer = "rgba(255,255,255,0)") {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, inner); gr.addColorStop(0.25, inner.replace(/[\d.]+\)$/, "0.5)")); gr.addColorStop(1, outer);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return canvasTex(c);
  }
  const GLOW = glowTexture();

  const tileTexCache = {};
  function tileTexture(e) {
    if (tileTexCache[e.z]) return tileTexCache[e.z];
    const W = 256, H = 300, c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d"), col = D.CATS[e.cat].color;
    const gr = g.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, "#" + shade(col, -0.15).getHexString()); gr.addColorStop(1, "#" + shade(col, -0.7).getHexString());
    g.fillStyle = gr; rr(g, 0, 0, W, H, 26); g.fill();
    g.fillStyle = "rgba(255,255,255,.08)"; rr(g, 10, 10, W - 20, H / 2 - 10, 18); g.fill();
    g.lineWidth = e.kz ? 12 : 4; g.strokeStyle = e.kz ? "#fec50c" : col; rr(g, g.lineWidth / 2, g.lineWidth / 2, W - g.lineWidth, H - g.lineWidth, 24); g.stroke();
    g.fillStyle = "#fff"; g.textBaseline = "top";
    g.font = `700 34px ${FONT_B}`; g.fillText(e.z, 22, 20);
    g.textAlign = "center"; g.font = `900 ${e.sym.length > 2 ? 84 : 108}px ${FONT_H}`; g.fillText(e.sym, W / 2, 74);
    g.font = `700 ${e.name.length > 10 ? 22 : 27}px ${FONT_B}`; g.fillText(e.name, W / 2, 206);
    g.fillStyle = "rgba(255,255,255,.75)"; g.font = `500 22px ${FONT_B}`; g.fillText(e.mass, W / 2, 246);
    if (e.kz) {
      g.fillStyle = "#fec50c"; g.beginPath(); g.arc(W - 40, 40, 24, 0, 7); g.fill();
      g.fillStyle = "#1a1200"; g.font = `900 20px ${FONT_H}`; g.textBaseline = "middle"; g.fillText("KZ", W - 40, 41);
    }
    return (tileTexCache[e.z] = canvasTex(c));
  }

  function starfield(n = 2500, r = 400) {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection ? new THREE.Vector3().randomDirection() : new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
      v.multiplyScalar(r * rand(0.4, 1)); pos.set([v.x, v.y, v.z], i * 3);
      const c = new THREE.Color().setHSL(rand(0.5, 0.65), 0.6, rand(0.6, 1)); col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.4, vertexColors: true, transparent: true, opacity: .9, depthWrite: false, sizeAttenuation: true }));
  }

  /* ---------------- Қазақстан проекциясы ---------------- */
  const KX = 0.68;
  const proj2 = (lon, lat) => [(lon - 67) * KX, lat - 48];
  const SHAPE_PTS = window.KZ_SHAPE.map(([lo, la]) => proj2(lo, la));
  { const a = SHAPE_PTS[0], b = SHAPE_PTS[SHAPE_PTS.length - 1]; if (a[0] === b[0] && a[1] === b[1]) SHAPE_PTS.pop(); }
  function inKZ(x, y) {
    let ins = false;
    for (let i = 0, j = SHAPE_PTS.length - 1; i < SHAPE_PTS.length; j = i++) {
      const [xi, yi] = SHAPE_PTS[i], [xj, yj] = SHAPE_PTS[j];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) ins = !ins;
    }
    return ins;
  }

  /* ============================================================
     СЦЕНА 1 — Басты бет (ғарыштағы элементтер әлемі)
     ============================================================ */
  const home = (() => {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050913, 0.011);
    scene.add(starfield());
    scene.add(new THREE.AmbientLight(0x6688cc, 0.7));
    const l1 = new THREE.PointLight(0x3fe0ff, 2.2, 120); l1.position.set(14, 8, 14); scene.add(l1);
    const l2 = new THREE.PointLight(0xfec50c, 1.8, 120); l2.position.set(-16, -6, 10); scene.add(l2);

    // ұшып жүрген элемент тақташалары
    const cubes = [];
    const pick = D.ELEMENTS.filter(e => e.kz).concat(D.ELEMENTS.filter(e => !e.kz && e.z <= 92).sort(() => Math.random() - .5).slice(0, 34));
    const boxGeo = new THREE.BoxGeometry(1.6, 1.85, 0.22);
    pick.forEach((e, i) => {
      const side = new THREE.MeshStandardMaterial({ color: D.CATS[e.cat].color, metalness: .6, roughness: .35 });
      const face = new THREE.MeshStandardMaterial({ map: tileTexture(e), emissive: 0xffffff, emissiveMap: tileTexture(e), emissiveIntensity: .55, roughness: .4 });
      const m = new THREE.Mesh(boxGeo, [side, side, side, side, face, face]);
      const a = rand(0, Math.PI * 2), r = rand(7, 30), y = rand(-14, 14);
      m.position.set(Math.cos(a) * r + 12, y, Math.sin(a) * r - 14);
      m.rotation.set(rand(-.5, .5), rand(-.8, .8), rand(-.3, .3));
      m.userData = { e, a, r, y, sp: rand(.02, .06) * (Math.random() < .5 ? -1 : 1), rs: new THREE.Vector3(rand(-.3, .3), rand(-.4, .4), rand(-.2, .2)), ph: rand(0, 6) };
      scene.add(m); cubes.push(m);
    });

    // Орталықта — үлкен атом және Қазақстан голограммасы
    const atom = new THREE.Group(); atom.position.set(10, 1, 0); scene.add(atom);
    const nuc = new THREE.Mesh(new THREE.SphereGeometry(1.1, 48, 48), new THREE.MeshStandardMaterial({ color: 0xfec50c, emissive: 0xff8a00, emissiveIntensity: .8, metalness: .3, roughness: .3 }));
    atom.add(nuc);
    const ng = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffb300, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    ng.scale.set(7, 7, 1); atom.add(ng);
    const orbits = [];
    for (let i = 0; i < 3; i++) {
      const og = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4 + i * 0.9, 0.025, 8, 160), new THREE.MeshBasicMaterial({ color: 0x3fe0ff, transparent: true, opacity: .6 }));
      og.add(ring);
      const el = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 20), new THREE.MeshBasicMaterial({ color: 0xbff6ff }));
      const eg = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0x3fe0ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      eg.scale.set(1.6, 1.6, 1); el.add(eg); og.add(el);
      og.rotation.set(Math.PI / 2 + (i - 1) * 1.0, (i - 1) * 0.6, 0);
      og.userData = { el, r: 4 + i * 0.9, sp: 1.6 - i * 0.3, ph: i * 2 };
      atom.add(og); orbits.push(og);
    }
    // KZ hologram ring
    const holo = new THREE.Group(); holo.position.set(10, -4.2, 0); scene.add(holo);
    const outline = new THREE.BufferGeometry().setFromPoints(SHAPE_PTS.map(([x, y]) => new THREE.Vector3(x * 0.34, 0, -y * 0.34)));
    const holoLine = new THREE.LineLoop(outline, new THREE.LineBasicMaterial({ color: 0x3fe0ff, transparent: true, opacity: .9 }));
    holo.add(holoLine);
    const holoFill = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(SHAPE_PTS.map(([x, y]) => new THREE.Vector2(x * 0.34, y * 0.34)))), new THREE.MeshBasicMaterial({ color: 0x00afca, transparent: true, opacity: .18, side: THREE.DoubleSide, depthWrite: false }));
    holoFill.rotation.x = -Math.PI / 2; holo.add(holoFill);
    for (let i = 0; i < 3; i++) {
      const rg = new THREE.Mesh(new THREE.RingGeometry(5 + i * .6, 5.05 + i * .6, 128), new THREE.MeshBasicMaterial({ color: i ? 0x3fe0ff : 0xfec50c, transparent: true, opacity: .35 - i * .08, side: THREE.DoubleSide }));
      rg.rotation.x = -Math.PI / 2; rg.position.y = -.05 - i * .15; holo.add(rg);
    }
    const mouse = { x: 0, y: 0 };
    addEventListener("pointermove", e => { mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5; });
    let view = { pos: new THREE.Vector3(0, 0, 30), look: new THREE.Vector3(3, 0, 0) };
    let flying = false;
    return {
      scene, controlsOn: false,
      views: { home: [new THREE.Vector3(0, 0, 30), new THREE.Vector3(3, 0, 0)], quiz: [new THREE.Vector3(-8, 6, 40), new THREE.Vector3(6, 0, 0)], idea: [new THREE.Vector3(10, -6, 38), new THREE.Vector3(6, 0, 0)], author: [new THREE.Vector3(20, 4, 26), new THREE.Vector3(8, 0, 0)] },
      enter(name, fromOther) {
        const [p, l] = this.views[name] || this.views.home;
        if (fromOther) { camera.position.copy(p).add(new THREE.Vector3(0, 0, 40)); controls.target.copy(l); }
        view.pos = p.clone(); view.look = l.clone();
      },
      async warp() {
        flying = true;
        const p0 = camera.position.clone();
        await tween(1.5, k => { camera.position.lerpVectors(p0, new THREE.Vector3(10, 1, 6), k); camera.fov = 50 + k * 40; camera.updateProjectionMatrix(); }, t => t * t * t);
        camera.fov = 50; camera.updateProjectionMatrix(); flying = false;
      },
      update(dt, t) {
        cubes.forEach(m => {
          const u = m.userData; u.a += u.sp * dt;
          m.position.x = Math.cos(u.a) * u.r + 12; m.position.z = Math.sin(u.a) * u.r - 14; m.position.y = u.y + Math.sin(t * .6 + u.ph) * .6;
          m.rotation.x += u.rs.x * dt; m.rotation.y += u.rs.y * dt;
        });
        orbits.forEach(o => { const u = o.userData, a = t * u.sp + u.ph; u.el.position.set(Math.cos(a) * u.r, Math.sin(a) * u.r, 0); });
        atom.rotation.y = t * .15; nuc.scale.setScalar(1 + Math.sin(t * 3) * .04);
        holo.rotation.y = t * .12;
        if (!flying) {
          const tgt = view.pos.clone().add(new THREE.Vector3(mouse.x * 6, -mouse.y * 4, 0));
          camera.position.lerp(tgt, 1 - Math.exp(-dt * 2));
          controls.target.lerp(view.look, 1 - Math.exp(-dt * 2));
          camera.lookAt(controls.target);
        }
      }
    };
  })();

  /* ============================================================
     Элемент текшелері (3D айналатын кубтар) және HTML белгілер
     ============================================================ */
  const EL_COL = { Fe: "#b5523a", Cu: "#d9773b", Au: "#e0a91c", Ag: "#8f9fae", U: "#4fbf2c", Cr: "#2f9e63", Zn: "#6f8fbf", Pb: "#5f6a80", C: "#3b3b3b", H: "#3fa9e0", S: "#d4b414", P: "#d84a92", B: "#24a9c4", Ti: "#7f93a8", Mg: "#9aa8b5", Be: "#3fbf8f", Al: "#8d9cad", W: "#5f76cf", Mn: "#9a5bd6", Ce: "#d06ac2", La: "#c95fb8", Nd: "#bf4fae", Y: "#b46bd6", Mo: "#6d7e96", Re: "#7a8598", Ni: "#7f9a6a", Co: "#3557bf", Ga: "#8aa0b8", Si: "#6f8096", K: "#d94f4f", Na: "#d98f45", Cl: "#7fbf45", Ba: "#c98a30", Cd: "#b8963f", Ta: "#5e6f96", Nb: "#5f8fa8", As: "#7f7f5c" };
  const elColor = e => EL_COL[e.sym] || D.CATS[e.cat].color;
  const cubeTexCache = {}, cubeMatCache = {};
  function cubeTexture(e) {
    if (cubeTexCache[e.z]) return cubeTexCache[e.z];
    const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
    const g = c.getContext("2d"), col = elColor(e);
    const gr = g.createLinearGradient(0, 0, S, S);
    gr.addColorStop(0, "#" + shade(col, .35).getHexString()); gr.addColorStop(.55, col); gr.addColorStop(1, "#" + shade(col, -.45).getHexString());
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = 8; g.strokeRect(10, 10, S - 20, S - 20);
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = "rgba(0,0,0,.55)"; g.shadowBlur = 10;
    g.font = `900 ${e.sym.length > 1 ? 112 : 132}px ${FONT_H}`; g.fillText(e.sym, S / 2, S / 2 - 8);
    g.shadowBlur = 4; g.font = `700 26px ${FONT_B}`; g.fillText(e.name, S / 2, S - 40);
    g.textAlign = "left"; g.font = `700 26px ${FONT_B}`; g.fillText(e.z, 24, 36);
    return (cubeTexCache[e.z] = canvasTex(c));
  }
  const CUBE_GEO = new THREE.BoxGeometry(1, 1, 1);
  function cubeMat(e) {
    if (!cubeMatCache[e.z]) { const t = cubeTexture(e); cubeMatCache[e.z] = new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .55, roughness: .3, metalness: .3 }); }
    return cubeMatCache[e.z];
  }
  // HTML белгілер — кез келген жақындатуда анық көрінеді
  function labelLayer(container) {
    const items = [], v = new THREE.Vector3();
    return {
      add(html, target, cls = "", offset = new THREE.Vector3()) {
        const d = document.createElement("div"); d.className = "lbl " + cls; d.innerHTML = html; container.appendChild(d);
        const it = { d, target, offset }; items.push(it); return d;
      },
      clear() { items.forEach(i => i.d.remove()); items.length = 0; },
      update() {
        const w = innerWidth, h = innerHeight, placed = [];
        // алдымен кен орындары, сосын қалалар — бір-бірін жаппайтындай
        const order = items.slice().sort((a, b) => (b.d.classList.contains("dep") || b.d.classList.contains("part") || b.d.classList.contains("el")) - (a.d.classList.contains("dep") || a.d.classList.contains("part") || a.d.classList.contains("el")));
        order.forEach(it => {
          if (it.target.isObject3D) it.target.getWorldPosition(v); else v.copy(it.target);
          v.add(it.offset).project(camera);
          let vis = v.z < 1 && v.x > -1.15 && v.x < 1.15 && v.y > -1.15 && v.y < 1.15 && !it.d.hidden;
          const x = (v.x * .5 + .5) * w, y = (-v.y * .5 + .5) * h;
          if (vis) {
            if (!it.w) { it.w = it.d.offsetWidth; it.h = it.d.offsetHeight; }
            const r = [x - it.w / 2 - 2, y - it.h - 2, x + it.w / 2 + 2, y + 2];
            if (placed.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) vis = false; else placed.push(r);
          }
          it.d.style.visibility = vis ? "visible" : "hidden";
          if (vis) it.d.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
        });
      }
    };
  }

  /* ============================================================
     СЦЕНА 2 — Қазақстанның 3D картасы
     ============================================================ */
  const map = (() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x061224);
    scene.fog = new THREE.Fog(0x061224, 45, 120);
    scene.add(new THREE.HemisphereLight(0xdff1ff, 0x1a2238, .8));
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.05); sun.position.set(-10, 25, 12); scene.add(sun);
    const sky = starfield(1500, 300); scene.add(sky);
    const labels = labelLayer($("#lbl-map"));

    const xs = SHAPE_PTS.map(p => p[0]), ys = SHAPE_PTS.map(p => p[1]);
    const minX = Math.min(...xs) - .3, maxX = Math.max(...xs) + .3, minY = Math.min(...ys) - .3, maxY = Math.max(...ys) + .3;
    const W = maxX - minX, H = maxY - minY;

    // --- Жер бетінің текстурасы ---
    const tc = document.createElement("canvas"); tc.width = 2048; tc.height = Math.round(2048 * H / W);
    const g = tc.getContext("2d");
    const TX = (lon, lat) => { const [x, y] = proj2(lon, lat); return [(x - minX) / W * tc.width, (1 - (y - minY) / H) * tc.height]; };
    const lat2y = lat => TX(67, lat)[1];
    const grd = g.createLinearGradient(0, lat2y(55.5), 0, lat2y(40.5));
    [[0, "#4d8a52"], [.22, "#7da35a"], [.42, "#b3ad66"], [.62, "#cfb676"], [.8, "#dcc287"], [1, "#d3b47a"]].forEach(([o, c]) => grd.addColorStop(o, c));
    g.fillStyle = grd; g.fillRect(0, 0, tc.width, tc.height);
    for (let i = 0; i < 20000; i++) {
      g.fillStyle = `rgba(${Math.random() < .5 ? "40,30,10" : "255,250,220"},${rand(.02, .06)})`;
      g.fillRect(rand(0, tc.width), rand(0, tc.height), rand(1, 4), rand(1, 4));
    }
    const blob = (lon, lat, rx, ry, c0, c1) => {
      const [x, y] = TX(lon, lat), sx = rx / W * tc.width * KX, sy = ry / H * tc.height;
      g.save(); g.translate(x, y); g.scale(1, sy / sx);
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, sx); rg.addColorStop(0, c0); rg.addColorStop(1, c1);
      g.fillStyle = rg; g.beginPath(); g.arc(0, 0, sx, 0, 7); g.fill(); g.restore();
    };
    [[77.5, 43.1, 3.5, .7], [80, 45.1, 1.8, .6], [85.2, 49.4, 2.4, 1.2], [82.8, 47.2, 1.6, .4]].forEach(([lo, la, rx, ry]) => blob(lo, la, rx, ry, "rgba(120,96,70,.7)", "rgba(120,96,70,0)"));
    [[65, 44.2, 3, 1.2], [71.5, 44.5, 2.2, .7], [60.5, 45.5, 2, 1]].forEach(([lo, la, rx, ry]) => blob(lo, la, rx, ry, "rgba(236,210,150,.7)", "rgba(236,210,150,0)"));
    const river = (pts, w) => {
      g.strokeStyle = "#2f86d6"; g.lineWidth = w; g.lineJoin = g.lineCap = "round"; g.beginPath();
      pts.forEach(([lo, la], i) => { const [x, y] = TX(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    };
    river([[86.5, 47.9], [84.6, 48.0], [83.2, 49.3], [82.6, 49.95], [80.25, 50.41], [78.5, 51.5], [76.95, 52.29], [75.5, 53.4], [74.6, 54.3]], 6);
    river([[69.0, 41.0], [68.5, 42.5], [68.2, 43.3], [66.5, 44.4], [65.5, 44.85], [63.5, 45.6], [61.6, 46.1]], 5);
    river([[80.6, 43.9], [79, 43.85], [77.1, 43.9], [76, 44.6], [74.9, 45.4]], 5);
    river([[55.2, 51.7], [53.5, 51.4], [51.37, 51.23], [51.5, 49.8], [51.9, 48.2], [51.92, 47.1], [51.9, 46.9]], 5);
    river([[71.45, 51.17], [70.2, 52.4], [69.6, 53.6], [69.15, 54.87]], 4);
    river([[62.5, 51.6], [63.2, 52.5], [63.62, 53.21], [64.2, 54.2]], 4);
    river([[66.5, 49.5], [65.6, 48.5], [65, 47.4]], 3);
    const lake = (pts) => { g.fillStyle = "#2a7fd0"; g.strokeStyle = "#7fd2ff"; g.lineWidth = 3; g.beginPath(); pts.forEach(([lo, la], i) => { const [x, y] = TX(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill(); g.stroke(); };
    lake([[73.5, 46.45], [74.2, 46.95], [75.1, 46.75], [76.2, 46.6], [77.4, 46.45], [78.6, 46.65], [79.2, 46.4], [78.6, 46.1], [77.2, 46.2], [76, 46.3], [75, 46.5], [74.2, 46.3]]);
    lake([[59.5, 46.6], [60.6, 46.85], [61.6, 46.6], [61.4, 46.05], [60.4, 45.95], [59.7, 46.2]]);
    lake([[81.2, 46.2], [81.9, 46.35], [82.1, 46.0], [81.5, 45.85]]);
    lake([[83.5, 48.0], [84.6, 48.15], [84.9, 47.9], [84.0, 47.8]]);
    lake([[68.7, 50.5], [69.3, 50.55], [69.3, 50.25], [68.8, 50.25]]);
    g.strokeStyle = "rgba(255,255,255,.06)"; g.lineWidth = 1.5;
    for (let lo = 48; lo <= 88; lo += 2) { const [x] = TX(lo, 48); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, tc.height); g.stroke(); }
    for (let la = 40; la <= 56; la += 2) { const y = lat2y(la); g.beginPath(); g.moveTo(0, y); g.lineTo(tc.width, y); g.stroke(); }
    const groundTex = canvasTex(tc);
    groundTex.repeat.set(1 / W, 1 / H); groundTex.offset.set(-minX / W, -minY / H);

    const DEPTH = 0.4;
    const shape = new THREE.Shape(SHAPE_PTS.map(([x, y]) => new THREE.Vector2(x, y)));
    const land = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: false }),
      [new THREE.MeshStandardMaterial({ map: groundTex, roughness: .95, metalness: 0 }), new THREE.MeshStandardMaterial({ color: 0x5b4632, roughness: .9 })]);
    land.rotation.x = -Math.PI / 2; scene.add(land);
    scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(SHAPE_PTS.map(([x, y]) => new THREE.Vector3(x, DEPTH + .01, -y))), new THREE.LineBasicMaterial({ color: 0xfec50c })));
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshStandardMaterial({ color: 0x0a1f3a, roughness: .6, metalness: .2 }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -0.01; scene.add(sea);
    const grid = new THREE.GridHelper(200, 100, 0x16365e, 0x0e2444); grid.position.y = 0.005; grid.material.transparent = true; grid.material.opacity = .45; scene.add(grid);
    const casp = [[47, 47.2], [49, 46.75], [51.2, 46.95], [53, 46.55], [53.2, 45.3], [52.6, 44.6], [51.3, 44.4], [50.9, 43.2], [52.4, 41.9], [53, 40.6], [53.9, 39.2], [53.6, 37.4], [51, 36.7], [49, 38.4], [49.5, 40.4], [48.2, 41.8], [47.4, 43.2], [47, 44.6], [46.7, 46]];
    const caspMesh = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(casp.map(([lo, la]) => new THREE.Vector2(...proj2(lo, la))))),
      new THREE.MeshStandardMaterial({ color: 0x1f6fc0, roughness: .15, metalness: .4, transparent: true, opacity: .85 }));
    caspMesh.rotation.x = -Math.PI / 2; caspMesh.position.y = 0.03; scene.add(caspMesh);

    // таулар — тек ірі жоталар, аласа
    const zones = [[75.5, 80.2, 42.7, 43.6, .5, .9, 26], [78.6, 81, 44.6, 45.5, .4, .7, 10], [83, 87, 48.7, 50.6, .4, .8, 22], [69.6, 72.6, 41.6, 42.6, .35, .6, 8]];
    const peaks = [];
    zones.forEach(([lo0, lo1, la0, la1, h0, h1, n]) => {
      for (let i = 0, tries = 0; i < n && tries < n * 20; tries++) {
        const [x, y] = proj2(rand(lo0, lo1), rand(la0, la1)); if (!inKZ(x, y)) continue; i++; peaks.push([x, y, rand(h0, h1)]);
      }
    });
    const coneGeo = new THREE.ConeGeometry(1, 1, 6); coneGeo.translate(0, .5, 0);
    const mtn = new THREE.InstancedMesh(coneGeo, new THREE.MeshStandardMaterial({ color: 0x6e5a44, flatShading: true, roughness: .95 }), peaks.length);
    const snowPk = peaks.filter(p => p[2] > .6);
    const snow = new THREE.InstancedMesh(coneGeo, new THREE.MeshStandardMaterial({ color: 0xf4f8ff, flatShading: true }), snowPk.length);
    const dm = new THREE.Object3D();
    peaks.forEach(([x, y, h], i) => { dm.position.set(x, DEPTH - .02, -y); dm.scale.set(h * .6, h, h * .6); dm.rotation.y = rand(0, 3); dm.updateMatrix(); mtn.setMatrixAt(i, dm.matrix); });
    snowPk.forEach(([x, y, h], i) => { dm.position.set(x, DEPTH - .02 + h * .65, -y); dm.scale.set(h * .6 * .35, h * .35, h * .6 * .35); dm.updateMatrix(); snow.setMatrixAt(i, dm.matrix); });
    scene.add(mtn, snow);

    // қалалар (HTML белгілер)
    D.CITIES.forEach(([n, la, lo, cap]) => {
      const [x, y] = proj2(lo, la);
      const dot = new THREE.Mesh(new THREE.CylinderGeometry(cap ? .1 : .06, cap ? .1 : .06, .05, 16), new THREE.MeshBasicMaterial({ color: cap ? 0xfec50c : 0xffffff }));
      dot.position.set(x, DEPTH + .03, -y); scene.add(dot);
      labels.add(cap ? "★ " + n : n, new THREE.Vector3(x, DEPTH + .05, -y), "city" + (cap ? " cap" : ""));
    });
    labels.add("Каспий теңізі", new THREE.Vector3(...(() => { const [x, y] = proj2(50.2, 43.8); return [x, .2, -y]; })()), "water");
    labels.add("Балқаш", new THREE.Vector3(...(() => { const [x, y] = proj2(76.2, 46.3); return [x, .5, -y]; })()), "water");
    labels.add("Арал", new THREE.Vector3(...(() => { const [x, y] = proj2(60.6, 46.1); return [x, .5, -y]; })()), "water");

    // --- Кен орындары: айналып тұрған 3D элемент текшелері ---
    const markers = [], hits = [];
    const HH = 1.35;
    D.DEPOSITS.forEach(dep => {
      const [x, y] = proj2(dep.lon, dep.lat);
      const e0 = D.BY_SYM[dep.els[0]], col = new THREE.Color(elColor(e0));
      const grp = new THREE.Group(); grp.position.set(x, DEPTH, -y);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, HH, 8, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false }));
      beam.position.y = HH / 2; grp.add(beam);
      const ring = new THREE.Mesh(new THREE.RingGeometry(.16, .24, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = .02; grp.add(ring);
      const pivot = new THREE.Group(); pivot.position.y = HH + .35; grp.add(pivot);
      const cube = new THREE.Mesh(CUBE_GEO, cubeMat(e0)); cube.scale.setScalar(.85); cube.rotation.x = .35; pivot.add(cube);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: col, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.scale.set(2.1, 2.1, 1); pivot.add(halo);
      const minis = dep.els.slice(1, 4).map(s => { const m = new THREE.Mesh(CUBE_GEO, cubeMat(D.BY_SYM[s])); m.scale.setScalar(.3); pivot.add(m); return m; });
      const hit = new THREE.Mesh(new THREE.SphereGeometry(.75, 12, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      hit.userData.dep = dep; pivot.add(hit); hits.push(hit);
      const lbl = labels.add(`${esc(dep.short)}`, pivot, "dep", new THREE.Vector3(0, .7, 0));
      grp.userData = { dep, ring, beam, pivot, cube, halo, minis, ph: rand(0, 6), s: 1, ts: 1, lbl };
      scene.add(grp); markers.push(grp);
    });

    let filter = null, hoverDep = null;
    const OVER = [new THREE.Vector3(0, 19, 15.5), new THREE.Vector3(0, 0, -.8)];
    function setFilter(sym) {
      filter = sym;
      markers.forEach(m => { const on = !sym || m.userData.dep.els.includes(sym); m.userData.ts = on ? (sym ? 1.25 : 1) : .35; m.userData.lbl.hidden = !on; });
      $$("#map-chips .chip").forEach(c => c.classList.toggle("on", c.dataset.sym === (sym || "")));
      if (!sym) { $("#map-info").classList.add("hidden"); flyTo(OVER[0], OVER[1]); return; }
      const ms = markers.filter(m => m.userData.dep.els.includes(sym));
      if (ms.length) {
        const c = new THREE.Vector3(); ms.forEach(m => c.add(m.position)); c.divideScalar(ms.length);
        let spread = 0; ms.forEach(m => spread = Math.max(spread, m.position.distanceTo(c)));
        const d = Math.max(8, spread * 1.5 + 5);
        flyTo(c.clone().add(new THREE.Vector3(0, d * .85, d * .7)), c);
      }
      showElementOnMap(sym, ms.map(m => m.userData.dep));
    }
    function lookAtDep(dep) {
      const m = markers.find(m => m.userData.dep === dep); if (!m) return;
      flyTo(m.position.clone().add(new THREE.Vector3(1.5, 7, 7.5)), m.position.clone().add(new THREE.Vector3(0, .8, 0)), 1.6);
    }
    return {
      scene, controlsOn: true, markers, setFilter, lookAtDep,
      enter(name, fromOther) {
        controls.minDistance = 3; controls.maxDistance = 60; controls.maxPolarAngle = Math.PI * .45; controls.enablePan = true;
        if (fromOther) { camera.position.set(-10, 55, 50); controls.target.set(0, 0, 0); flyTo(OVER[0], OVER[1], 2.2); }
      },
      pickables: () => hits,
      hover(o) {
        hoverDep = o ? o.userData.dep : null;
        if (!o) return null; const d = o.userData.dep;
        return `<b>${esc(d.els.join(" · "))}</b><br>${esc(d.name)}<br><small style="color:#9fb0cc">${esc(d.region)} · ${esc(D.METHODS[d.type].name)}</small><br><small style="color:#fec50c">Басыңыз — кен орнына виртуалды саяхат</small>`;
      },
      click(o) { if (o) enterSite(o.userData.dep); },
      update(dt, t) {
        sky.rotation.y = t * .005;
        caspMesh.material.color.setHSL(.58, .7, .42 + Math.sin(t * 1.5) * .03);
        const near = camera.position.distanceTo(controls.target) < 30;
        $("#lbl-map").classList.toggle("far", !near);
        markers.forEach(m => {
          const u = m.userData, hov = hoverDep === u.dep;
          u.s += ((hov ? 1.35 : 1) * u.ts - u.s) * (1 - Math.exp(-dt * 8));
          m.scale.setScalar(u.s);
          u.pivot.position.y = HH + .35 + Math.sin(t * 2 + u.ph) * .1;
          u.cube.rotation.y += dt * 1.3;
          u.minis.forEach((mm, i) => { const a = t * 1.6 + u.ph + i * Math.PI * 2 / u.minis.length; mm.position.set(Math.cos(a) * .72, Math.sin(a * 1.4) * .18, Math.sin(a) * .72); mm.rotation.y += dt * 2; mm.rotation.x += dt; });
          const f = (t * .7 + u.ph) % 1; u.ring.scale.setScalar(1 + f * 2.6); u.ring.material.opacity = (1 - f) * (u.ts < 1 ? .2 : .9);
          u.halo.material.opacity = (u.ts < 1 ? .15 : .45) + Math.sin(t * 3 + u.ph) * .12;
        });
        labels.update();
      }
    };
  })();

  /* ============================================================
     СЦЕНА 3 — 3D Менделеев кестесі
     ============================================================ */
  const table = (() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050913);
    scene.fog = new THREE.Fog(0x050913, 40, 120);
    scene.add(starfield(1800, 260));
    const tiles = [];
    const geo = new THREE.BoxGeometry(1.1, 1.3, 0.08);
    D.ELEMENTS.forEach(e => {
      const face = new THREE.MeshBasicMaterial({ map: tileTexture(e), transparent: true });
      const side = new THREE.MeshBasicMaterial({ color: e.kz ? 0xfec50c : D.CATS[e.cat].color, transparent: true });
      const m = new THREE.Mesh(geo, [side, side, side, side, face, face]);
      m.position.set(rand(-60, 60), rand(-40, 40), rand(-80, -20));
      m.userData = { e, tp: new THREE.Vector3(), tq: new THREE.Quaternion(), ts: 1, k: rand(2.2, 4.2), dim: 1, tdim: 1 };
      if (e.kz) {
        const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xfec50c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: .55 }));
        gl.scale.set(2.6, 2.8, 1); gl.position.z = -.12; m.add(gl); m.userData.glow = gl;
      }
      scene.add(m); tiles.push(m);
    });
    // кесте үстіндегі тақырып
    const title = makeLabel("Д.И. Менделеевтің химиялық элементтердің периодтық жүйесі", { size: 44, bg: null, color: "#cfe3ff", weight: 700, scale: 1.05 });
    scene.add(title);
    const look = new THREE.Object3D();
    let layout = "table", hoverTile = null, search = null;

    function setLayout(name) {
      layout = name;
      $$("#layouts button").forEach(b => b.classList.toggle("on", b.dataset.layout === name));
      const n = tiles.length;
      const kzList = tiles.filter(t => t.userData.e.kz), others = tiles.filter(t => !t.userData.e.kz);
      tiles.forEach((t, i) => {
        const u = t.userData, e = u.e; u.ts = 1; u.tdim = 1;
        if (name === "table") {
          const y = (e.row > 7 ? (5.4 - (e.row - .75)) * 1.45 : (5.4 - e.row) * 1.45) + .3;
          u.tp.set((e.col - 9.5) * 1.22, y, 0); u.tq.identity();
        } else if (name === "sphere") {
          const phi = Math.acos(-1 + (2 * i) / n), th = Math.sqrt(n * Math.PI) * phi;
          u.tp.setFromSphericalCoords(11, phi, th);
          look.position.copy(u.tp); look.lookAt(u.tp.clone().multiplyScalar(2)); u.tq.copy(look.quaternion);
        } else if (name === "helix") {
          const th = i * .26 + Math.PI, y = -(i * .13) + 7.5;
          u.tp.setFromCylindricalCoords(10, th, y);
          look.position.copy(u.tp); look.lookAt(new THREE.Vector3(u.tp.x * 2, u.tp.y, u.tp.z * 2)); u.tq.copy(look.quaternion);
        } else if (name === "kz") {
          if (e.kz) {
            const j = kzList.indexOf(t), cols = 10;
            u.tp.set((j % cols - (cols - 1) / 2) * 1.75, 3.2 - Math.floor(j / cols) * 2.0, 3); u.ts = 1.35;
          } else {
            const j = others.indexOf(t), cols = 20;
            u.tp.set((j % cols - (cols - 1) / 2) * 1.25, 4.5 - Math.floor(j / cols) * 1.5, -12); u.tdim = .22;
          }
          u.tq.identity();
        }
      });
      title.visible = name === "table";
      applySearch(search);
      const cams = { table: [0, .6, 24.5], sphere: [0, 0, 30], helix: [0, 2, 32], kz: [0, 0, 19] };
      flyTo(new THREE.Vector3(...cams[name]), new THREE.Vector3(0, name === "kz" ? 1 : name === "table" ? .6 : 0, 0), 1.6);
    }
    function applySearch(q) {
      search = q;
      tiles.forEach(t => {
        const e = t.userData.e;
        if (!q) { if (layout !== "kz" || e.kz) t.userData.tdim = 1; return; }
        const s = q.toLowerCase().trim();
        const m = e.sym.toLowerCase() === s || String(e.z) === s || e.name.toLowerCase().startsWith(s) || (s.length > 1 && e.sym.toLowerCase().startsWith(s));
        t.userData.tdim = m ? 1 : .15;
      });
    }
    title.position.set(0, 8.0, 0);
    return {
      scene, controlsOn: true, setLayout, applySearch, tiles,
      get layout() { return layout; },
      enter(name, fromOther) {
        controls.minDistance = 6; controls.maxDistance = 60; controls.maxPolarAngle = Math.PI; controls.enablePan = true;
        if (fromOther) { camera.position.set(0, 0, 70); controls.target.set(0, 0, 0); setLayout(layout); }
      },
      pickables: () => tiles,
      hover(o) {
        hoverTile = o;
        if (!o) return null; const e = o.userData.e;
        return `<b>${e.sym}</b> — ${esc(e.name)}<br><small style="color:#9fb0cc">${esc(D.CATS[e.cat].name)} · №${e.z}${e.kz ? " · <span style='color:#fec50c'>Қазақстанда бар</span>" : ""}</small>`;
      },
      click(o) { if (o) openElement(o.userData.e); },
      focus(sym) {
        const t = tiles.find(t => t.userData.e.sym === sym); if (!t) return;
        const p = t.userData.tp.clone();
        flyTo(p.clone().add(new THREE.Vector3(0, 0, 7)), p, 1.3);
      },
      update(dt, t) {
        tiles.forEach(m => {
          const u = m.userData, k = 1 - Math.exp(-dt * u.k);
          m.position.lerp(u.tp, k); m.quaternion.slerp(u.tq, k);
          const hs = (m === hoverTile ? 1.18 : 1) * u.ts;
          m.scale.x += (hs - m.scale.x) * .2; m.scale.y = m.scale.z = m.scale.x;
          u.dim += (u.tdim - u.dim) * (1 - Math.exp(-dt * 6));
          m.material[4].opacity = m.material[0].opacity = .15 + u.dim * .85;
          m.material[4].color.setScalar(.35 + u.dim * .65);
          if (u.glow) u.glow.material.opacity = (.35 + Math.sin(t * 2.5 + u.e.z) * .2) * u.dim;
        });
      }
    };
  })();

  /* ============================================================
     СЦЕНА 4 — Виртуалды химия зертханасы
     ============================================================ */
  const lab = (() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1222);
    scene.fog = new THREE.Fog(0x0a1222, 18, 40);
    scene.add(new THREE.HemisphereLight(0xdfeeff, 0x2a2030, .75));
    const key = new THREE.SpotLight(0xffffff, 1.4, 40, .7, .5); key.position.set(3, 12, 8); scene.add(key);
    const fxLight = new THREE.PointLight(0xffffff, 0, 14); fxLight.position.set(0, 3, 1); scene.add(fxLight);

    // үстел, қабырға, сөрелер
    const wood = (() => { const c = document.createElement("canvas"); c.width = 512; c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#5a3b22"; g.fillRect(0, 0, 512, 256); for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(${rand(20, 60)},${rand(10, 30)},0,${rand(.15, .4)})`; g.lineWidth = rand(1, 4); g.beginPath(); const y = rand(0, 256); g.moveTo(0, y); g.bezierCurveTo(170, y + rand(-12, 12), 340, y + rand(-12, 12), 512, y + rand(-8, 8)); g.stroke(); } return canvasTex(c); })();
    const desk = new THREE.Mesh(new THREE.BoxGeometry(18, .4, 8), new THREE.MeshStandardMaterial({ map: wood, roughness: .55 }));
    desk.position.y = -.2; scene.add(desk);
    const tiles = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#16233d"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#0d1628"; g.lineWidth = 6; for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 4); return t; })();
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), new THREE.MeshStandardMaterial({ map: tiles, roughness: .8 }));
    wall.position.set(0, 6, -4); scene.add(wall);
    // қабырғадағы кесте-постер
    const poster = (() => {
      const c = document.createElement("canvas"); c.width = 1024; c.height = 620; const g = c.getContext("2d");
      g.fillStyle = "#0b1428"; g.fillRect(0, 0, 1024, 620); g.fillStyle = "#fec50c"; g.font = `700 34px ${FONT_H}`; g.fillText("ПЕРИОДТЫҚ ЖҮЙЕ", 30, 50);
      D.ELEMENTS.forEach(e => { const x = 30 + (e.col - 1) * 53, y = 80 + (e.row - 1) * 54 + (e.row > 7 ? 12 : 0); g.fillStyle = D.CATS[e.cat].color; g.fillRect(x, y, 49, 50); g.fillStyle = "#0b1428"; g.font = `700 20px ${FONT_B}`; g.fillText(e.sym, x + 6, y + 32); if (e.kz) { g.strokeStyle = "#fec50c"; g.lineWidth = 3; g.strokeRect(x + 1.5, y + 1.5, 46, 47); } });
      return canvasTex(c);
    })();
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 5), new THREE.MeshStandardMaterial({ map: poster, roughness: .6, emissive: 0xffffff, emissiveMap: poster, emissiveIntensity: .35 }));
    pm.position.set(-3.5, 5.6, -3.95); scene.add(pm);
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(6, .15, 1), new THREE.MeshStandardMaterial({ map: wood }));
    shelf.position.set(5, 4.2, -3.5); scene.add(shelf);
    ["#ff5d5d", "#3fa7ff", "#7bd65b", "#fec50c", "#a78bfa", "#ff9f43", "#2ed3a5"].forEach((c, i) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(.22, .25, .8 + (i % 3) * .2, 16), new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: .8, roughness: .1 }));
      b.position.set(2.6 + i * .8, 4.3 + (.8 + (i % 3) * .2) / 2, -3.5); scene.add(b);
    });
    const kzSign = makeLabel("Қазақстан жер қойнауының химиясы", { size: 40, bg: "rgba(0,0,0,.4)", color: "#9fe0ff", scale: .9 }); kzSign.position.set(5, 6.6, -3.9); scene.add(kzSign);

    // Стакан
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xdff4ff, transparent: true, opacity: .2, roughness: .03, metalness: 0, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
    const prof = [[0, 0], [1.1, 0], [1.15, .06], [1.15, 2.7], [1.28, 2.85], [1.22, 2.9], [1.08, 2.75], [1.08, .08], [0, .08]].map(([x, y]) => new THREE.Vector2(x, y));
    const beaker = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), glassMat); beaker.renderOrder = 5; scene.add(beaker);
    for (let i = 1; i <= 4; i++) { const tick = new THREE.Mesh(new THREE.BoxGeometry(.25, .02, .01), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .6 })); tick.position.set(-.3, i * .5, 1.16); scene.add(tick); }
    const liqMat = new THREE.MeshPhongMaterial({ color: 0x9fd0ff, transparent: true, opacity: .82, shininess: 90, depthWrite: false });
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.06, 1, 48), liqMat);
    liquid.position.y = .09; liquid.scale.y = .0001; liquid.renderOrder = 4; scene.add(liquid);
    const setLevel = h => { liquid.scale.y = Math.max(h, .0001); liquid.position.y = .09 + h / 2; };
    const pile = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.05, 1, 40), new THREE.MeshStandardMaterial({ color: 0x2f8cff, roughness: 1 }));
    pile.visible = false; scene.add(pile);
    const setPile = h => { pile.visible = h > .001; pile.scale.y = Math.max(h, .001); pile.position.y = .09 + h / 2; };

    // Спиртовка және тостаған
    const burner = new THREE.Group(); burner.position.set(2.7, 0, -.4); scene.add(burner);
    burner.add(new THREE.Mesh(new THREE.SphereGeometry(.65, 32, 16, 0, Math.PI * 2, 0, Math.PI / 1.6), new THREE.MeshPhysicalMaterial({ color: 0xcfe8ff, transparent: true, opacity: .35, roughness: .05 })));
    const bl = new THREE.Mesh(new THREE.CylinderGeometry(.5, .6, .45, 24), new THREE.MeshStandardMaterial({ color: 0x8fd0ff, transparent: true, opacity: .55 })); bl.position.y = .22; burner.add(bl);
    const capm = new THREE.Mesh(new THREE.CylinderGeometry(.15, .18, .3, 16), new THREE.MeshStandardMaterial({ color: 0x777777, metalness: .8, roughness: .3 })); capm.position.y = .7; burner.add(capm);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,170,60,1)", "rgba(255,80,0,0)"), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    flame.position.y = 1.2; flame.scale.set(.6, 1.1, 1); flame.visible = false; burner.add(flame);
    const plate = new THREE.Group(); plate.position.set(-2.8, 0, -.4); scene.add(plate);
    plate.add(new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.1, .12, 40), new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: .4 })));
    const volc = new THREE.Mesh(new THREE.ConeGeometry(.6, .6, 24), new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: .95, flatShading: true }));
    volc.position.y = .36; volc.visible = false; plate.add(volc);

    // Реагент ыдыстары
    function makeBottle(rg) {
      const grp = new THREE.Group();
      if (rg.kind === "liquid") {
        grp.add(new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, 1.3, 32), new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, transparent: true, opacity: .28, roughness: .05, depthWrite: false })));
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(.16, .3, .35, 24), new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, transparent: true, opacity: .3 })); neck.position.y = .82; grp.add(neck);
        const liq = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, .9, 32), new THREE.MeshPhongMaterial({ color: rg.color, transparent: true, opacity: .9 })); liq.position.y = -.17; grp.add(liq);
        grp.userData.mouth = new THREE.Vector3(0, 1.0, 0); grp.userData.liq = liq;
        grp.position.y = .65;
      } else {
        const dish = new THREE.Mesh(new THREE.CylinderGeometry(.6, .55, .1, 32), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .45 })); grp.add(dish);
        grp.position.y = .06;
      }
      return grp;
    }
    function makeSolid(key) {
      const rg = D.REAGENTS[key], grp = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: rg.color, metalness: key === "CaCO3" || key === "NH4Cr" ? 0 : .85, roughness: key === "CaCO3" ? .9 : .3 });
      if (key === "Fe") { const n = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.6, 12), mat); const hd = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .05, 16), mat); hd.position.y = .8; n.add(hd); n.rotation.z = .35; grp.add(n); }
      else if (key === "Zn") { for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.DodecahedronGeometry(.14), mat); p.position.set(rand(-.3, .3), rand(0, .1), rand(-.3, .3)); grp.add(p); } }
      else if (key === "Mg") { const r = new THREE.Mesh(new THREE.BoxGeometry(.08, 1.2, .02), mat); grp.add(r); }
      else if (key === "Na") { const p = new THREE.Mesh(new THREE.BoxGeometry(.28, .2, .24), mat); grp.add(p); }
      else if (key === "CaCO3") { for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(rand(.15, .25), rand(.12, .2), rand(.15, .25)), mat); p.position.set(rand(-.3, .3), 0, rand(-.3, .3)); p.rotation.set(rand(0, 3), rand(0, 3), 0); grp.add(p); } }
      else { const p = new THREE.Mesh(new THREE.ConeGeometry(.4, .4, 16), mat); grp.add(p); }
      grp.userData.mat = mat;
      return grp;
    }
    const tmpObjs = [];
    const clearTmp = () => { tmpObjs.forEach(o => scene.remove(o)); tmpObjs.length = 0; };
    const addTmp = o => { scene.add(o); tmpObjs.push(o); return o; };

    // Ағын (құю)
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(.06, .05, 1, 12), new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: .85 }));
    stream.visible = false; scene.add(stream);
    function placeStream(a, b) { const mid = a.clone().add(b).multiplyScalar(.5); stream.position.copy(mid); stream.scale.set(1, a.distanceTo(b), 1); stream.lookAt(b); stream.rotateX(Math.PI / 2); }

    // --- Бөлшектер жүйелері ---
    // көпіршіктер
    const NB = 90, bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(.05, 10, 10), new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: .7, shininess: 120 }), NB);
    const bub = Array.from({ length: NB }, () => ({ p: new THREE.Vector3(), v: 0, s: 0, live: false }));
    scene.add(bubbles);
    // тұнба
    const NP = 260, precGeo = new THREE.BufferGeometry(), precPos = new Float32Array(NP * 3);
    precGeo.setAttribute("position", new THREE.BufferAttribute(precPos, 3));
    const precip = new THREE.Points(precGeo, new THREE.PointsMaterial({ size: .09, color: 0x2f8cff, transparent: true, opacity: .95, depthWrite: false }));
    const prec = Array.from({ length: NP }, () => ({ p: new THREE.Vector3(), v: 0, live: false }));
    precip.visible = false; scene.add(precip);
    // ұшқындар
    const NS = 400, sparkGeo = new THREE.BufferGeometry(), sparkPos = new Float32Array(NS * 3);
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: .12, map: GLOW, color: 0xffc040, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    const spk = Array.from({ length: NS }, () => ({ p: new THREE.Vector3(0, -99, 0), v: new THREE.Vector3(), life: 0 }));
    scene.add(sparks);
    // көбік
    const NF = 220, foam = new THREE.InstancedMesh(new THREE.SphereGeometry(.16, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .7 }), NF);
    const fm = Array.from({ length: NF }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), s: 0, live: false, rest: false }));
    foam.count = 0; scene.add(foam);
    // бу
    const steamMats = [];
    const steams = Array.from({ length: 14 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xdfe8f2, transparent: true, opacity: 0, depthWrite: false })); s.userData = { life: 0 }; scene.add(s); steamMats.push(s); return s; });
    const glare = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false })); glare.scale.set(6, 6, 1); scene.add(glare);

    const fx = { steamAt: new THREE.Vector3(0, 2.8, 0), bubbles: 0, precip: 0, sparks: 0, sparkAt: new THREE.Vector3(), sparkCol: new THREE.Color(), foam: 0, steam: 0, runner: null, flash: 0, swirl: 0, sparkle: 0, volcano: 0 };
    const tmpM = new THREE.Object3D();
    let liquidTop = () => .09 + liquid.scale.y;

    function emitSpark(at, spread, up, col) {
      const s = spk.find(s => s.life <= 0); if (!s) return;
      s.p.copy(at); s.v.set(rand(-spread, spread), rand(up * .5, up), rand(-spread, spread)); s.life = rand(.5, 1.2);
    }
    function updateFx(dt, t) {
      // көпіршіктер
      let bi = 0;
      bub.forEach(b => {
        if (!b.live && fx.bubbles > 0 && Math.random() < fx.bubbles * dt * 8) { b.live = true; b.p.set(rand(-.8, .8), .15, rand(-.8, .8)); if (fx.runner) b.p.copy(fx.runner.position).add(new THREE.Vector3(rand(-.1, .1), -.05, rand(-.1, .1))); b.v = rand(.6, 1.4); b.s = rand(.5, 1.4); }
        if (b.live) { b.p.y += b.v * dt; b.p.x += Math.sin(t * 8 + b.v * 10) * .002; if (b.p.y > liquidTop()) b.live = false; }
        tmpM.position.copy(b.live ? b.p : new THREE.Vector3(0, -50, 0)); tmpM.scale.setScalar(b.s); tmpM.updateMatrix(); bubbles.setMatrixAt(bi++, tmpM.matrix);
      });
      bubbles.instanceMatrix.needsUpdate = true;
      // тұнба
      if (precip.visible) {
        prec.forEach((p, i) => {
          if (!p.live && fx.precip > 0 && Math.random() < fx.precip * dt * 3) { p.live = true; p.p.set(rand(-.9, .9), liquidTop() - rand(0, .3), rand(-.9, .9)); p.v = rand(.15, .45); }
          if (p.live) { p.p.y -= p.v * dt; p.p.x += Math.sin(t * 2 + i) * .002; if (p.p.y < .1 + pile.scale.y * (pile.visible ? 1 : 0)) { p.live = false; if (pile.scale.y < .32) setPile(pile.scale.y + .0016); } }
          precPos.set(p.live ? [p.p.x, p.p.y, p.p.z] : [0, -50, 0], i * 3);
        });
        precGeo.attributes.position.needsUpdate = true;
      }
      // ұшқындар
      if (fx.sparks > 0) for (let i = 0; i < fx.sparks * dt * 60; i++) emitSpark(fx.sparkAt, 1.4, 3.2);
      spk.forEach((s, i) => {
        if (s.life > 0) { s.life -= dt; s.v.y -= 6 * dt; s.p.addScaledVector(s.v, dt); }
        sparkPos.set(s.life > 0 ? [s.p.x, s.p.y, s.p.z] : [0, -99, 0], i * 3);
      });
      sparkGeo.attributes.position.needsUpdate = true;
      // көбік
      if (fx.foam > 0) {
        for (let i = 0; i < fx.foam * dt * 40; i++) {
          const f = fm.find(f => !f.live); if (!f) break;
          f.live = true; f.rest = false; f.p.set(rand(-.6, .6), liquidTop(), rand(-.6, .6)); f.v.set(rand(-.6, .6), rand(1.5, 3.2) * fx.foam, rand(-.6, .6)); f.s = rand(.6, 1.5);
        }
      }
      let fi = 0;
      fm.forEach(f => {
        if (!f.live) return;
        if (!f.rest) {
          f.v.y -= 3.2 * dt; f.p.addScaledVector(f.v, dt);
          const r = Math.hypot(f.p.x, f.p.z);
          if (r < 1.05 && f.p.y < 2.9 && f.v.y < 0 && f.p.y < liquidTop() + .2) { f.p.y = liquidTop() + .2; f.v.y = Math.abs(f.v.y) * .3; }
          if (r >= 1.05 && f.p.y < .1) { f.p.y = .1; f.rest = true; }
          if (r < 1.25 && r > .95 && f.p.y < 2.95 && f.p.y > .2 && f.v.y < 0) { f.v.x += f.p.x * dt * 4; f.v.z += f.p.z * dt * 4; }
        }
        tmpM.position.copy(f.p); tmpM.scale.setScalar(f.s); tmpM.updateMatrix(); foam.setMatrixAt(fi++, tmpM.matrix);
      });
      foam.count = fi; foam.instanceMatrix.needsUpdate = true;
      // бу
      steams.forEach(s => {
        const u = s.userData;
        if (u.life <= 0 && fx.steam > 0 && Math.random() < fx.steam * dt * 2) { u.life = 1; s.position.copy(fx.steamAt).add(new THREE.Vector3(rand(-.5, .5), 0, rand(-.5, .5))); }
        if (u.life > 0) { u.life -= dt * .35; s.position.y += dt * .9; s.scale.setScalar(1 + (1 - u.life) * 2.2); s.material.opacity = Math.sin(u.life * Math.PI) * .35; }
        else s.material.opacity = 0;
      });
      // натрий «жүгіруі»
      if (fx.runner) { const r = fx.runner; r.position.set(Math.sin(t * 2.3) * .7, liquidTop() + .05, Math.cos(t * 3.1) * .6); fx.sparkAt.copy(r.position); }
      // жарқыл
      fxLight.intensity += ((fx.flash > 0 ? 5 + Math.random() * 4 : 0) - fxLight.intensity) * .3;
      glare.material.opacity = fx.flash > 0 ? .7 + Math.random() * .3 : glare.material.opacity * .9;
      // жанартау
      if (fx.volcano > 0) { fxLight.intensity = 2 + Math.random() * 2; fxLight.color.set(0xff8a2a); }
      // жалын
      if (flame.visible) { flame.scale.set(.55 + Math.sin(t * 20) * .05, 1.05 + Math.sin(t * 13) * .1, 1); }
      // сұйықтың толқуы
      if (fx.swirl > 0) liquid.rotation.y += dt * 3;
      if (fx.sparkle > 0) { const p = precip.material; p.size = .09 + Math.sin(t * 10) * .02; }
    }

    // --- Анимация көмекшілері ---
    async function moveObj(o, to, dur = 1, rotZ = null) {
      const p0 = o.position.clone(), r0 = o.rotation.z;
      await tween(dur, k => { o.position.lerpVectors(p0, to, k); if (rotZ !== null) o.rotation.z = r0 + (rotZ - r0) * k; });
    }
    async function pour(key, upTo) {
      const rg = D.REAGENTS[key], b = addTmp(makeBottle(rg));
      const home = new THREE.Vector3(-2.4, .65, 1.6); b.position.copy(home);
      const lbl = addTmp(makeLabel(rg.label, { size: 34, scale: .8 })); lbl.position.set(-2.4, 2.2, 1.6);
      await wait(400);
      lbl.visible = false;
      await moveObj(b, new THREE.Vector3(-1.45, 3.7, .2), .9);
      await moveObj(b, b.position.clone(), .5, -1.9);
      const c0 = liqMat.color.clone(), h0 = liquid.scale.y, cNew = new THREE.Color(rg.color), empty = h0 < .01;
      stream.material.color.copy(cNew); stream.visible = true;
      await tween(1.6, k => {
        const m = b.localToWorld(b.userData.mouth.clone()); placeStream(m, new THREE.Vector3(m.x + .15, liquidTop(), m.z));
        setLevel(h0 + (upTo - h0) * k);
        if (empty) liqMat.color.copy(cNew); else liqMat.color.copy(c0).lerp(cNew, k * .35);
        b.userData.liq.scale.y = 1 - k * .7; b.userData.liq.position.y = -.17 - k * .3;
      }, t => t);
      stream.visible = false;
      await moveObj(b, b.position.clone(), .4, 0);
      await moveObj(b, home, .7);
      scene.remove(b);
    }
    async function drop(key) {
      const rg = D.REAGENTS[key], dish = addTmp(makeBottle(rg)); dish.position.set(2.4, .06, 1.6);
      const s = addTmp(makeSolid(key)); s.position.set(2.4, .3, 1.6);
      const lbl = addTmp(makeLabel(rg.label, { size: 34, scale: .8 })); lbl.position.set(2.4, 1.8, 1.6);
      await wait(400); lbl.visible = false;
      await moveObj(s, new THREE.Vector3(.2, 3.8, 0), .9);
      const p0 = s.position.clone(), bottom = key === "Fe" ? .85 : key === "Mg" ? .7 : key === "Na" ? liquidTop() + .05 : .25;
      await tween(.7, k => { s.position.lerpVectors(p0, new THREE.Vector3(.2, bottom, 0), k); }, t => t * t);
      return s;
    }
    function setLiquidColor(c) { liqMat.color.set(c); }

    function reset() {
      clearTmp();
      fx.steamAt.set(0, 2.8, 0);
      Object.assign(fx, { bubbles: 0, precip: 0, sparks: 0, foam: 0, steam: 0, runner: null, flash: 0, swirl: 0, sparkle: 0, volcano: 0 });
      setLevel(0); setPile(0); liqMat.color.set(0x9fd0ff);
      prec.forEach(p => p.live = false); precip.visible = false;
      fm.forEach(f => f.live = false); foam.count = 0;
      spk.forEach(s => s.life = 0); flame.visible = false; volc.visible = false; volc.scale.set(1, 1, 1);
      fxLight.color.set(0xffffff); glare.material.opacity = 0;
    }

    let busy = false, current = null;
    async function run(r, custom) {
      if (busy) return; busy = true; current = r;
      reset();
      $$("#rx-list .rx").forEach(b => b.classList.toggle("on", r && b.dataset.id === r.id));
      showRxInfo(r, custom, false);
      flyTo(new THREE.Vector3(0, 5, 13), new THREE.Vector3(0, 1.3, 0), 1.2);
      try {
        if (!r) { await runNone(custom); return; }
        if (r.mode === "beaker") await runBeaker(r);
        else if (r.mode === "burner") await runBurner(r);
        else await runPlate(r);
        showRxInfo(r, null, true);
        await say(narrRx(r));
      } finally { busy = false; }
    }
    async function runBeaker(r) {
      const A = D.REAGENTS[r.a], B = D.REAGENTS[r.b];
      let first = r.first === "b" ? r.b : r.a, second = first === r.a ? r.b : r.a;
      if (D.REAGENTS[first].kind === "solid") [first, second] = [second, first];
      await pour(first, 1.3);
      setLiquidColor(r.c0);
      let solid = null;
      if (D.REAGENTS[second].kind === "solid") solid = await drop(second); else await pour(second, 2.0);
      // реакция
      const c0 = new THREE.Color(r.c0), c1 = new THREE.Color(r.c1);
      if (r.fx.includes("bubbles")) fx.bubbles = 1;
      if (r.fx.includes("precip")) { precip.visible = true; precip.material.color.set(r.pc); pile.material.color.set(r.pc); fx.precip = 1; }
      if (r.fx.includes("sparkle")) fx.sparkle = 1;
      if (r.fx.includes("foam")) fx.foam = r.id === "elephant" ? 1.3 : .35;
      if (r.fx.includes("steam")) fx.steam = 1;
      if (r.fx.includes("swirl")) fx.swirl = 1;
      if (r.fx.includes("runner") && solid) { fx.runner = solid; fx.sparks = .6; fx.sparkAt.copy(solid.position); sparks.material.color.set(0xffd27a); }
      if (r.id === "elephant") foam.material.color.set(0xfff1c9); else foam.material.color.set(0xffffff);
      const nailMat = solid && solid.userData.mat, nail0 = nailMat && nailMat.color.clone();
      await tween(r.id === "elephant" ? 3.5 : 5, k => {
        liqMat.color.copy(c0).lerp(c1, k);
        if (r.fx.includes("coat") && nailMat) nailMat.color.copy(nail0).lerp(new THREE.Color("#c4622d"), k);
        if (r.fx.includes("runner") && solid) solid.scale.setScalar(Math.max(.05, 1 - k));
      }, t => t);
      if (r.fx.includes("pop")) {
        const lb = addTmp(makeLabel("ПОП!", { size: 70, font: FONT_H, color: "#ffdf6b", bg: null, scale: 1.2 })); lb.position.set(0, 3.6, 0);
        fx.flash = 1; glare.position.set(0, 3, 0); await wait(220); fx.flash = 0;
      }
      if (fx.runner) { scene.remove(fx.runner); fx.runner = null; fx.sparks = 0; }
      fx.bubbles *= .3; fx.foam = 0; fx.precip = 0; fx.steam *= .4;
    }
    async function runBurner(r) {
      flame.visible = true;
      const s = addTmp(makeSolid("Mg")); s.position.set(1.4, 2.5, -.4); s.rotation.z = 1.1;
      await wait(600);
      await moveObj(s, new THREE.Vector3(2.5, 1.75, -.4), 1.2);
      fx.flash = 1; glare.position.set(2.65, 1.4, -.4); fx.sparkAt.set(2.65, 1.4, -.4); fx.sparks = 1.2; sparks.material.color.set(0xffffff);
      fx.steamAt.set(2.65, 1.7, -.4); fx.steam = 1.5;
      await tween(4, k => { s.scale.y = 1 - k * .85; s.position.y = 1.75 + k * .5; s.userData.mat.color.set(k > .5 ? 0xffffff : 0xd9dde2); });
      fx.flash = 0; fx.sparks = 0; fx.steam = 0; flame.visible = false;
    }
    async function runPlate(r) {
      volc.visible = true; volc.material.color.set(0xff7a1a); volc.scale.set(1, 1, 1);
      flame.visible = true;
      const match = addTmp(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.1, 8), new THREE.MeshStandardMaterial({ color: 0xe8d0a0 })));
      match.position.set(-1.2, 2.6, -.4); match.rotation.z = -.9;
      const mf = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffa040, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); mf.scale.set(.5, .7, 1); mf.position.y = -.6; match.add(mf);
      await moveObj(match, new THREE.Vector3(-2.3, 1.4, -.4), 1.2);
      fx.volcano = 1; fx.sparks = 1.5; sparks.material.color.set(0xffa53a); fx.sparkAt.set(-2.8, .9, -.4); fx.steam = .5;
      fx.steamAt.set(-2.8, 1.4, -.4);
      scene.remove(match);
      const cA = new THREE.Color(0xff7a1a), cB = new THREE.Color(0x2e5220);
      await tween(5, k => { volc.material.color.copy(cA).lerp(cB, k); volc.scale.set(1 + k * 1.3, 1 + k * 1.9, 1 + k * 1.3); volc.position.y = .36 + k * .55; fx.sparkAt.set(-2.8, .7 + (1 + k * 1.9) * .6, -.4); }, t => t);
      fx.volcano = 0; fx.sparks = 0; fx.steam = 0; fxLight.intensity = 0; flame.visible = false;
    }
    async function runNone([a, b]) {
      const A = D.REAGENTS[a], B = D.REAGENTS[b];
      if (A.kind === "fire" || B.kind === "fire") {
        flame.visible = true; const o = A.kind === "fire" ? b : a;
        if (D.REAGENTS[o].kind === "liquid") { await pour(o, 1.2); } else { const s = addTmp(makeSolid(o)); s.position.set(2.7, 1.6, -.4); }
        await wait(1500); flame.visible = false;
      } else {
        const L = [a, b].filter(k => D.REAGENTS[k].kind === "liquid"), S = [a, b].filter(k => D.REAGENTS[k].kind === "solid");
        for (const k of L) await pour(k, L.indexOf(k) ? 2 : 1.3);
        if (!L.length) { setLevel(1.2); liqMat.color.set(0xdff0ff); }
        for (const k of S) await drop(k);
        fx.swirl = 1; await wait(1800); fx.swirl = 0;
      }
      showRxInfo(null, [a, b], true);
      await say(MSG_NONE);
    }
    return {
      scene, controlsOn: true, run, reset,
      get busy() { return busy; },
      enter(name, fromOther) {
        controls.minDistance = 4; controls.maxDistance = 22; controls.maxPolarAngle = Math.PI * .49; controls.enablePan = false;
        if (fromOther) { camera.position.set(0, 9, 22); controls.target.set(0, 1.5, 0); flyTo(new THREE.Vector3(0, 5, 13), new THREE.Vector3(0, 1.3, 0), 2); }
      },
      pickables: () => [],
      update: updateFx
    };
  })();

  /* ============================================================
     СЦЕНА 5 — Кен орнына виртуалды саяхат (карьер, шахта, ұңғыма, зауыт…)
     ============================================================ */
  const site = (() => {
    const scene = new THREE.Scene();
    const skyTex = (() => { const c = document.createElement("canvas"); c.width = 4; c.height = 512; const g = c.getContext("2d"); const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#2f6fc4"); gr.addColorStop(.48, "#93c4ec"); gr.addColorStop(.72, "#efe7d2"); gr.addColorStop(1, "#cbb68e"); g.fillStyle = gr; g.fillRect(0, 0, 4, 512); return canvasTex(c); })();
    scene.background = skyTex;
    scene.fog = new THREE.Fog(0xe6e4d8, 130, 360);
    scene.add(new THREE.HemisphereLight(0xe2f1ff, 0x6a5a3a, .75));
    const sun = new THREE.DirectionalLight(0xfff0d0, 1.1); sun.position.set(60, 90, 40); scene.add(sun);
    const glowLight = new THREE.PointLight(0xff8a2a, 0, 70); scene.add(glowLight);
    let root = new THREE.Group(); scene.add(root);
    const anims = [], picks = [];
    const labels = labelLayer($("#lbl-site"));
    let view = [new THREE.Vector3(60, 40, 60), new THREE.Vector3(0, 0, 0)], maxPolar = Math.PI * .48;

    const Mat = (color, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ roughness: .85, metalness: .05 }, extra, { color: new THREE.Color(color).convertSRGBToLinear() }, extra.emissive !== undefined ? { emissive: new THREE.Color(extra.emissive).convertSRGBToLinear() } : {}));
    const box = (w, h, d, mat, x = 0, y = 0, z = 0, parent = root) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; };
    const cyl = (rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 20, parent = root) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); parent.add(m); return m; };
    const cone = (r, h, mat, x = 0, y = 0, z = 0, seg = 10, parent = root) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat); m.position.set(x, y + h / 2, z); parent.add(m); return m; };
    const texCache = {};
    function noiseTex(key, base, spots, n = 9000) {
      if (texCache[key]) return texCache[key];
      const S = 512, c = document.createElement("canvas"); c.width = c.height = S; const g = c.getContext("2d");
      g.fillStyle = base; g.fillRect(0, 0, S, S);
      for (let i = 0; i < n; i++) { g.globalAlpha = rand(.06, .3); g.fillStyle = spots[i % spots.length]; const r = rand(1, 6); g.fillRect(rand(0, S), rand(0, S), r, r); }
      g.globalAlpha = 1; const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return (texCache[key] = t);
    }
    const STEPPE = () => noiseTex("steppe", "#b7a46e", ["#8f7f4f", "#d0bf8a", "#7d8a4a", "#a08f5c", "#6f7d42"]);
    function ground(tex, { hole = 0, front = null, color = 0xffffff } = {}) {
      const F = front === null ? 260 : front;
      const sh = new THREE.Shape([new THREE.Vector2(-260, -F), new THREE.Vector2(260, -F), new THREE.Vector2(260, 260), new THREE.Vector2(-260, 260)]);
      if (hole) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); sh.holes.push(h); }
      const geo = new THREE.ShapeGeometry(sh, 96);
      tex.repeat.set(1 / 14, 1 / 14);
      const m = new THREE.Mesh(geo, Mat(color, { map: tex, roughness: 1 })); m.rotation.x = -Math.PI / 2; root.add(m); return m;
    }
    function hills(color = 0xa89468, r0 = 150) {
      const mat = Mat(color, { flatShading: true });
      for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2 + rand(-.1, .1), r = r0 + rand(0, 60); cone(rand(18, 40), rand(6, 18), mat, Math.cos(a) * r, -1, Math.sin(a) * r, 7); }
    }
    function lattice(h, w, mat, parent = root) {
      const g = new THREE.Group(); parent.add(g);
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => box(.35, h, .35, mat, sx * w / 2, h / 2, sz * w / 2, g));
      for (let y = 2; y < h; y += 2.6) { box(w, .25, .25, mat, 0, y, w / 2, g); box(w, .25, .25, mat, 0, y, -w / 2, g); box(.25, .25, w, mat, w / 2, y, 0, g); box(.25, .25, w, mat, -w / 2, y, 0, g); }
      return g;
    }
    function smoke(x, y, z, n = 10, color = 0xc9c9c9, size = 6) {
      const ps = Array.from({ length: n }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, depthWrite: false })); s.userData.l = i / n; root.add(s); return s; });
      anims.push(dt => ps.forEach(s => { const u = s.userData; u.l += dt * .12; if (u.l > 1) u.l -= 1; s.position.set(x + u.l * 8, y + u.l * 22, z + Math.sin(u.l * 6) * 2); s.scale.setScalar(size * (.4 + u.l * 1.6)); s.material.opacity = Math.sin(u.l * Math.PI) * .55; }));
    }
    function flame(x, y, z, s = 5) {
      const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,170,60,1)", "rgba(255,60,0,0)"), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      f.position.set(x, y, z); root.add(f);
      anims.push((dt, t) => f.scale.set(s * (.8 + Math.sin(t * 17) * .1), s * (1.6 + Math.sin(t * 11) * .25), 1));
      return f;
    }
    function truck(load) {
      const g = new THREE.Group(), y = Mat(0xf2b705, { metalness: .3, roughness: .5 }), dk = Mat(0x1b1b1b);
      box(1.5, 1.5, 1.8, y, 1.7, 1.3, 0, g); box(3, 1.2, 2.2, y, -.5, 1.5, 0, g); box(2.6, .8, 1.9, Mat(load, { flatShading: true }), -.5, 2.4, 0, g);
      [[1.7, 1], [1.7, -1], [-1.3, 1], [-1.3, -1]].forEach(([x, z]) => { const w = cyl(.6, .6, .45, dk, x, .6, z, 14, g); w.rotation.x = Math.PI / 2; });
      root.add(g); return g;
    }
    function excavator() {
      const g = new THREE.Group(), y = Mat(0xf2b705, { metalness: .3, roughness: .5 }), dk = Mat(0x2a2a2a);
      box(4.4, 1, 3.4, dk, 0, .5, 0, g);
      const body = new THREE.Group(); body.position.y = 1; g.add(body);
      box(3.2, 2.2, 2.6, y, -.4, 1.1, 0, body); box(1.2, 1.4, 1.2, Mat(0x9fd6ff, { metalness: .4, roughness: .1 }), .9, 2.1, .6, body);
      const boom = new THREE.Group(); boom.position.set(1, 1.8, 0); body.add(boom);
      box(4.6, .6, .6, y, 2.3, 0, 0, boom);
      const arm = new THREE.Group(); arm.position.x = 4.6; boom.add(arm);
      box(.5, 3.4, .5, y, 0, -1.7, 0, arm); box(1.3, 1, 1.4, dk, .3, -3.4, 0, arm);
      root.add(g); g.userData = { body, boom, arm }; return g;
    }
    function addCubes(dep, pos) {
      const e0 = D.BY_SYM[dep.els[0]];
      const big = new THREE.Mesh(CUBE_GEO, cubeMat(e0)); big.scale.setScalar(5.5); big.position.copy(pos); big.userData.e = e0; root.add(big); picks.push(big);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: new THREE.Color(elColor(e0)), transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.scale.setScalar(19); big.add(halo); halo.scale.setScalar(3.4);
      const minis = dep.els.slice(1, 6).map(s => { const m = new THREE.Mesh(CUBE_GEO, cubeMat(D.BY_SYM[s])); m.scale.setScalar(2.2); m.userData.e = D.BY_SYM[s]; root.add(m); picks.push(m); return m; });
      anims.push((dt, t) => {
        big.rotation.y += dt * .7; big.rotation.x = Math.sin(t * .6) * .25; big.position.y = pos.y + Math.sin(t * 1.3) * .7;
        minis.forEach((m, i) => { const a = t * .8 + i * Math.PI * 2 / minis.length; m.position.set(pos.x + Math.cos(a) * 7, pos.y + Math.sin(a * 1.3) * 1.5, pos.z + Math.sin(a) * 7); m.rotation.y += dt * 1.4; m.rotation.x += dt * .6; });
      });
      labels.add(`<b>${e0.sym}</b> ${esc(e0.name)} — басып ашыңыз`, big, "el", new THREE.Vector3(0, -4.2, 0));
    }
    const part = (txt, target, off = new THREE.Vector3(0, 2, 0)) => labels.add(txt, target, "part", off);
    const V = (x, y, z) => new THREE.Vector3(x, y, z);

    const ROCK = { Cu: ["#7a7466", "#958e7e", "#4f8a6e"], Fe: ["#8a4a35", "#6f3a2a", "#a35d3f"], C: ["#2c2c2c", "#3d3934", "#1b1b1b"], Cr: ["#4a4a50", "#3a3a40", "#2c5a40"], P: ["#a39d90", "#8d877a", "#bdb6a6"], Au: ["#b49f78", "#9c8866", "#c9b48a"], W: ["#8a847b", "#6f6a62", "#9aa3b5"], Al: ["#b5653c", "#9a5132", "#c97a4f"], Mn: ["#5a4b52", "#463a40", "#6a4f63"], Ce: ["#a6907c", "#8f7b6a", "#c08aa8"], Zn: ["#8a8276", "#756e63", "#9c9aa8"], Pb: ["#7f7a72", "#6a655e", "#8e8a96"], U: ["#c9b07a", "#b39a66", "#9fbf6a"], Ag: ["#8a8276", "#756e63", "#b7bec8"] };
    const rockOf = d => ROCK[d.els[0]] || ROCK.Cu;

    /* ---- Ашық карьер ---- */
    function buildPit(dep) {
      const rock = rockOf(dep), n = 7, R = 36, depth = 20, h = depth / n, slope = 1.9, bw = (R - 6 - n * slope) / (n - 1);
      ground(STEPPE(), { hole: R - .4 }); hills();
      const prof = [[R, 0]]; let r = R, y = 0;
      for (let k = 0; k < n; k++) { r -= slope; y -= h; prof.push([r, y]); if (k < n - 1) { r -= bw; prof.push([r, y]); } }
      prof.push([0, y]);
      const geo = new THREE.LatheGeometry(prof.slice().reverse().map(([a, b]) => new THREE.Vector2(a, b)), 120);
      const pos = geo.attributes.position, cols = [], c = new THREE.Color(), ca = new THREE.Color(rock[0]).convertSRGBToLinear(), cb = new THREE.Color(rock[1]).convertSRGBToLinear(), cv = new THREE.Color(rock[2]).convertSRGBToLinear();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), yy = pos.getY(i), z = pos.getZ(i), a = Math.atan2(z, x);
        if (yy < -.2 && Math.hypot(x, z) > .1) { const k = 1 + .025 * Math.sin(a * 7 + yy * .7) + .012 * Math.sin(a * 19); pos.setX(i, x * k); pos.setZ(i, z * k); }
        const band = Math.floor(-yy / h + .01);
        c.copy(band % 2 ? ca : cb).lerp(cv, Math.max(0, Math.sin(a * 4 + band * 1.7)) * .45); c.multiplyScalar(rand(.9, 1.1));
        cols.push(c.r, c.g, c.b);
      }
      geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals();
      root.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide })));
      const pool = new THREE.Mesh(new THREE.CircleGeometry(3, 24), Mat(0x3f8fb0, { roughness: .2, metalness: .3 })); pool.rotation.x = -Math.PI / 2; pool.position.set(-2.5, -depth + .06, -1.5); root.add(pool);
      const heightAt = rr => { for (let i = 0; i < prof.length - 1; i++) { const [r0, y0] = prof[i], [r1, y1] = prof[i + 1]; if (rr <= r0 && rr >= r1) return r0 === r1 ? y1 : y0 + (y1 - y0) * (r0 - rr) / (r0 - r1); } return -depth; };
      const trucks = [0, .27, .52, .78].map(o => ({ g: truck(rock[2] === "#1b1b1b" ? "#111" : rock[0]), o }));
      trucks.forEach(tk => tk.g.scale.setScalar(.8));
      anims.push((dt, t) => trucks.forEach(tk => {
        const p = ((t * .018 + tk.o) % 1), s = p < .5 ? p * 2 : 2 - p * 2;
        const f = s2 => { const rr = R - 2 - s2 * (R - 9), a = s2 * Math.PI * 2 * 2.1 + tk.o * 3; return [Math.cos(a) * rr, heightAt(rr), Math.sin(a) * rr]; };
        const [x, yy, z] = f(s), [x2, , z2] = f(Math.min(1, s + .003 * (p < .5 ? 1 : -1)) || s);
        tk.g.position.set(x, yy, z); tk.g.rotation.y = -Math.atan2(z2 - z, x2 - x);
      }));
      const ex = excavator(); ex.position.set(3, -depth, 2); ex.scale.setScalar(.9);
      anims.push((dt, t) => { ex.userData.body.rotation.y = Math.sin(t * .45) * 1.3; ex.userData.boom.rotation.z = .25 + Math.sin(t * .9) * .25; ex.userData.arm.rotation.z = -.3 + Math.sin(t * .9 + 1) * .3; });
      const pile = cone(9, 7, Mat(rock[0], { flatShading: true }), R + 14, 0, 12, 9);
      const plant = box(16, 10, 12, Mat(0x8d969e), R + 32, 5, -8); box(17, 1, 13, Mat(0x5c646b), R + 32, 10.5, -8);
      cyl(1.2, 1.4, 18, Mat(0xb5b9bd), R + 38, 9, -12); smoke(R + 38, 19, -12, 8, 0xdedede, 5);
      const conv = box(1.4, .5, 26, Mat(0x444444), R + 23, 5, 2); conv.rotation.x = .25; conv.rotation.y = -.75;
      addCubes(dep, V(0, 22, 0));
      part("Карьер", V(0, -depth + 6, 0)); part("Кертпештер", V(-24, -h * 1.2, 15)); part("Экскаватор", ex, V(0, 7, 0));
      part("Автосамосвал", trucks[0].g, V(0, 4.5, 0)); part("Кен үйіндісі", V(R + 14, 9, 12)); part("Байыту фабрикасы", V(R + 32, 13, -8));
      view = [V(70, 52, 74), V(10, -6, 0)]; maxPolar = Math.PI * .47;
    }

    /* ---- Шахта (кесінді-диорама) ---- */
    function buildMine(dep) {
      const rock = rockOf(dep), FR = 12, fz = FR + .06, e0 = D.BY_SYM[dep.els[0]], ecol = new THREE.Color(elColor(e0));
      ground(STEPPE(), { front: FR }); hills();
      [[-.05, -3, "#6b4f33"], [-3, -12, "#b49a6a"], [-12, -24, rock[1]], [-24, -46, "#55524e"]].forEach(([y0, y1, c]) => box(140, y0 - y1, FR + 70, Mat(c, { flatShading: true }), 0, (y0 + y1) / 2, (FR - 70) / 2));
      const dark = Mat(0x15110e), lamp = new THREE.SpriteMaterial({ map: GLOW, color: 0xffd27a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
      box(3, 38, .12, dark, 0, -19, fz);
      const tunnels = [[-14, -30, 26], [-25, -32, 28], [-36, -26, 30]];
      tunnels.forEach(([y, x0, x1]) => {
        box(x1 - x0, 2.6, .12, dark, (x0 + x1) / 2, y, fz);
        for (let x = x0 + 2; x < x1; x += 5) { const s = new THREE.Sprite(lamp); s.position.set(x, y + 1, fz + .1); s.scale.setScalar(1.4); root.add(s); }
      });
      const veinMat = Mat("#" + ecol.getHexString(), { emissive: "#" + ecol.getHexString(), emissiveIntensity: .35, roughness: .35, metalness: .6 });
      [[-29, -13], [24, -15], [-30, -24], [27, -26], [-24, -36], [29, -35], [12, -19], [-14, -30]].forEach(([x, y]) => { const v = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), veinMat); v.scale.set(rand(3, 5.5), rand(1, 1.8), .3); v.position.set(x, y, fz); v.rotation.z = rand(-.5, .5); root.add(v); });
      const cage = box(2.4, 2.4, .3, Mat(0x9a9a9a, { metalness: .6 }), 0, -10, fz + .1);
      anims.push((dt, t) => (cage.position.y = -19 + Math.sin(t * .45) * 16.5));
      const carts = tunnels.map(([y, x0, x1], i) => { const c = new THREE.Group(); box(2.4, 1.3, .3, Mat(0x6b6f74, { metalness: .5 }), 0, 0, 0, c); box(2, .6, .32, Mat("#" + ecol.getHexString()), 0, .8, 0, c); c.position.set(0, y - .5, fz + .15); root.add(c); c.userData = { x0: x0 + 3, x1: i % 2 ? x1 - 3 : x0 + 3, ph: i }; return c; });
      anims.push((dt, t) => carts.forEach((c, i) => { const u = c.userData, k = (Math.sin(t * .35 + i * 2) + 1) / 2; c.position.x = (i % 2 ? 2.2 : -2.2) + ((i % 2 ? tunnels[i][2] - 3 : tunnels[i][1] + 3) - (i % 2 ? 2.2 : -2.2)) * k; }));
      const steel = Mat(0x3d5a80, { metalness: .5, roughness: .4 });
      const tower = lattice(17, 4, steel); tower.position.set(0, 0, FR - 3);
      const wheels = [0, 1].map(i => { const w = new THREE.Mesh(new THREE.TorusGeometry(1.7, .22, 8, 28), Mat(0xc0392b, { metalness: .4 })); w.position.set(i ? 1 : -1, 18, FR - 3); root.add(w); return w; });
      anims.push((dt, t) => wheels.forEach((w, i) => (w.rotation.z = t * (i ? -1.2 : 1.2))));
      box(9, 6, 7, Mat(0xa0522d), -14, 3, FR - 8); box(9.5, .8, 7.5, Mat(0x5c5c5c), -14, 6.4, FR - 8);
      box(6, 5, 5, Mat(0x8d969e), 11, 2.5, FR - 7); cone(10, 9, Mat(rock[0], { flatShading: true }), 26, 0, -14, 9);
      addCubes(dep, V(-30, 17, -2));
      part("Копёр — шахта мұнарасы", V(0, 20.5, FR - 3)); part("Оқпан", V(0, -6, fz)); part("Штрек", V(-20, -12.3, fz), V(0, 1, 0));
      part("Кен желісі", V(24, -14, fz), V(0, 1.5, 0)); part("Вагонетка", carts[1], V(0, 1.8, 0)); part("Тау жынысы қабаттары", V(-36, -7, fz), V(0, 0, 0));
      part("Үйінді", V(26, 10, -14), V(0, 0, 0));
      view = [V(8, -4, 92), V(6, -12, 0)]; maxPolar = Math.PI * .66;
    }

    /* ---- Уранды жерасты ұңғымалық шаймалау ---- */
    function buildISR(dep) {
      const FR = 12, fz = FR + .06;
      ground(noiseTex("sand", "#d6c08a", ["#c2a873", "#e6d4a6", "#b39a66"]), { front: FR }); hills(0xc9b07a);
      [[-.05, -5, "#d8c08a"], [-5, -15, "#7d8a94"], [-15, -23, "#d9c06a"], [-23, -36, "#6f7b85"]].forEach(([y0, y1, c]) => box(140, y0 - y1, FR + 70, Mat(c, { flatShading: true }), 0, (y0 + y1) / 2, (FR - 70) / 2));
      const gm = Mat(0x5fd13a, { emissive: 0x3fae2a, emissiveIntensity: .5 });
      for (let i = 0; i < 70; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(rand(.2, .45), 8, 6), gm); s.position.set(rand(-60, 60), rand(-22.5, -15.5), fz); root.add(s); }
      const wells = [[-18, 0x2f7bff], [0, 0x3fbf2c], [18, 0x2f7bff]];
      wells.forEach(([x, c]) => { box(.7, 20, .14, Mat(c, { emissive: c, emissiveIntensity: .35 }), x, -10, fz + .02); const wh = new THREE.Group(); cyl(.5, .5, 2.4, Mat(c, { metalness: .5 }), 0, 1.2, 0, 14, wh); box(1.6, .5, 1.6, Mat(0x666666), 0, 2.5, 0, wh); wh.position.set(x, 0, FR - 1.5); root.add(wh); });
      // ерітінді ағысы
      const N = 220, pg = new THREE.BufferGeometry(), pp = new Float32Array(N * 3), pc = new Float32Array(N * 3);
      pg.setAttribute("position", new THREE.BufferAttribute(pp, 3)); pg.setAttribute("color", new THREE.BufferAttribute(pc, 3));
      root.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: .9, map: GLOW, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
      const pts = Array.from({ length: N }, (_, i) => ({ s: Math.random(), side: i % 2 ? 1 : -1, sp: rand(.05, .08) }));
      const blue = new THREE.Color(0x4fa3ff), green = new THREE.Color(0xb6ff3a);
      anims.push(dt => pts.forEach((p, i) => {
        p.s = (p.s + dt * p.sp) % 1; const sx = 18 * p.side; let x, y, c;
        if (p.s < .33) { const k = p.s / .33; x = sx; y = -k * 19; c = blue; }
        else if (p.s < .66) { const k = (p.s - .33) / .33; x = sx * (1 - k); y = -19 + Math.sin(k * 9 + i) * 1.4; c = k < .5 ? blue : green; }
        else { const k = (p.s - .66) / .34; x = 0; y = -19 + k * 19; c = green; }
        pp.set([x + rand(-.25, .25), y, fz + .3], i * 3); pc.set([c.r, c.g, c.b], i * 3);
      }) || (pg.attributes.position.needsUpdate = pg.attributes.color.needsUpdate = true));
      const wm = Mat(0x2f7bff, { metalness: .4 }), gm2 = Mat(0x3fbf2c, { metalness: .4 });
      for (let i = -4; i <= 4; i++) for (let j = 1; j <= 6; j++) { const isP = (i + j) % 2 === 0; cyl(.4, .4, 1.8, isP ? gm2 : wm, i * 9, .9, FR - 6 - j * 9, 10); }
      for (let j = 1; j <= 6; j++) box(80, .35, .35, Mat(0x8a8a8a, { metalness: .5 }), 0, .4, FR - 6 - j * 9 + 1);
      box(18, 8, 12, Mat(0xe8e8e8), -40, 4, -30); box(19, .8, 13, Mat(0x3a6ea5), -40, 8.4, -30);
      [0, 1, 2].forEach(i => cyl(3, 3, 7, Mat(0xd0d6dc, { metalness: .4 }), -22 + i * 7, 3.5, -36));
      addCubes(dep, V(-30, 15, -4));
      part("Айдау ұңғымасы", V(-18, -8, fz), V(0, 0, 0)); part("Сорып шығару ұңғымасы", V(0, -5, fz), V(0, 0, 0));
      part("Кенді қабат — уран", V(36, -18.5, fz), V(0, 0, 0)); part("Су өткізбейтін саз", V(-40, -9, fz), V(0, 0, 0));
      part("Ұңғымалар алаңы", V(0, 3, -16), V(0, 0, 0)); part("Өңдеу цехы", V(-40, 10, -30), V(0, 0, 0));
      view = [V(8, 0, 84), V(6, -9, 0)]; maxPolar = Math.PI * .66;
    }

    /* ---- Мұнай/газ кен орны ---- */
    function pumpjack(x, z, ph) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rand(0, 3); root.add(g);
      const gray = Mat(0x7d838a, { metalness: .5 }), red = Mat(0xa8322a, { metalness: .3 });
      box(9, .6, 2.4, gray, 0, .3, 0, g);
      const l1 = box(.4, 5.4, .4, gray, .4, 3, .7, g), l2 = box(.4, 5.4, .4, gray, .4, 3, -.7, g); l1.rotation.z = l2.rotation.z = .12;
      const beam = new THREE.Group(); beam.position.set(0, 5.6, 0); g.add(beam);
      box(9.5, .6, .6, red, 0, 0, 0, beam); box(1.1, 2.6, 1, red, 4.9, -.7, 0, beam);
      const crank = new THREE.Group(); crank.position.set(-3, 1.8, 0); g.add(crank); box(1.6, 2.6, .5, gray, 0, -.6, .7, crank);
      cyl(.12, .12, 4.6, Mat(0x222222), 4.9, 2.3, 0, 8, g);
      anims.push((dt, t) => { beam.rotation.z = Math.sin(t * 1.6 + ph) * .3; crank.rotation.z = t * 1.6 + ph; });
      return g;
    }
    function buildOil(dep) {
      ground(noiseTex("desert", "#cdb78a", ["#b9a170", "#e0cfa5", "#a89060"]), {}); hills(0xc2a87a);
      const pj = [[-22, -8], [0, -20], [20, -6], [-8, 12], [16, 18], [-30, 20], [34, -24]].map(([x, z], i) => pumpjack(x, z, i));
      [0, 1, 2, 3].forEach(i => { cyl(4.5, 4.5, 8, Mat(0xeeeeee, { metalness: .3 }), 40, 4, -14 + i * 11); });
      const steel = Mat(0x9aa3ab, { metalness: .5 });
      [0, 1, 2].forEach(i => cyl(1.4, 1.4, 22, steel, -40, 11, -30 + i * 5)); [0, 1].forEach(i => { const s = new THREE.Mesh(new THREE.SphereGeometry(4.5, 20, 14), Mat(0xe0e0e0, { metalness: .3 })); s.position.set(-26 + i * 11, 6, -40); root.add(s); });
      const pipeM = Mat(0x6f6f6f, { metalness: .5 });
      [[-30, 0, 70, 0], [0, 25, 0, -50]].forEach(([x, z, lx, lz]) => { const p = cyl(.5, .5, Math.hypot(lx, lz), pipeM, x, .6, z, 10); p.rotation.z = lx ? Math.PI / 2 : 0; p.rotation.x = lz ? Math.PI / 2 : 0; });
      cyl(.7, .9, 26, Mat(0xb22222), -50, 13, 14); const fl = flame(-50, 28.5, 14, 5);
      glowLight.position.set(-50, 28, 14); anims.push((dt, t) => (glowLight.intensity = 1.6 + Math.sin(t * 13) * .4));
      if (dep.els.includes("S")) { box(18, 4, 12, Mat(0xf2d22a, { flatShading: true }), 30, 2, 30); box(12, 3, 8, Mat(0xf5dc4a, { flatShading: true }), 30, 5.5, 30); part("Күкірт қоймасы", V(30, 9, 30)); }
      addCubes(dep, V(0, 24, 0));
      part("Тербелмелі станок", pj[0], V(0, 8.5, 0)); part("Резервуарлар", V(40, 10, 2)); part("Газ өңдеу қондырғысы", V(-36, 25, -30)); part("Алау (факел)", V(-50, 34, 14), V(0, 0, 0));
      view = [V(58, 34, 66), V(0, 4, 0)]; maxPolar = Math.PI * .47;
    }

    /* ---- Теңіздегі кен орны (Қашаған) ---- */
    function buildOffshore(dep) {
      scene.fog.color.set(0xcfe2ef);
      const wg = new THREE.PlaneGeometry(600, 600, 90, 90); wg.rotateX(-Math.PI / 2);
      const water = new THREE.Mesh(wg, Mat(0x1f6f9f, { roughness: .25, metalness: .25, flatShading: true })); root.add(water);
      const wp = wg.attributes.position, base = Float32Array.from(wp.array);
      anims.push((dt, t) => { for (let i = 0; i < wp.count; i++) { const x = base[i * 3], z = base[i * 3 + 2]; wp.setY(i, Math.sin(x * .07 + t) * .35 + Math.cos(z * .06 + t * 1.2) * .35); } wp.needsUpdate = true; wg.computeVertexNormals(); });
      cyl(31, 34, 2.4, Mat(0x8a8178, { flatShading: true }), 0, .2, 0, 8); cyl(28, 30, 3.4, Mat(0xd9c79c, { flatShading: true }), 0, 1.4, 0, 8);
      const steel = Mat(0xd0d4d8, { metalness: .5 });
      const tower = lattice(26, 4.5, Mat(0xc0392b, { metalness: .4 })); tower.position.set(-4, 3, 0);
      [[10, -8, 10, 7, 9, 0xe8e8e8], [10, 8, 12, 9, 7, 0xf0b429], [-14, 12, 9, 6, 7, 0x3a6ea5], [-14, -12, 8, 10, 8, 0xe0e0e0]].forEach(([x, z, w, h, d, c]) => box(w, h, d, Mat(c), x, 3 + h / 2, z));
      [0, 1, 2].forEach(i => cyl(2.5, 2.5, 6, steel, 18, 6, -18 + i * 6));
      const br = box(40, .8, 1.6, Mat(0x666666), 44, 4, -6); cyl(.6, .8, 18, Mat(0xb22222), 64, 9, -6); flame(64, 19.5, -6, 4.5);
      const boats = [0, 1].map(i => { const b = new THREE.Group(); box(7, 1.6, 2.6, Mat(0xf2f2f2), 0, .8, 0, b); box(2.6, 1.6, 2, Mat(0x2f6fb0), -1, 2.4, 0, b); root.add(b); return b; });
      anims.push((dt, t) => boats.forEach((b, i) => { const a = t * .06 + i * Math.PI; b.position.set(Math.cos(a) * 60, .3, Math.sin(a) * 60); b.rotation.y = -a; }));
      addCubes(dep, V(-4, 40, 0));
      part("Жасанды арал", V(20, 6, 22), V(0, 0, 0)); part("Бұрғылау мұнарасы", V(-4, 30, 0), V(0, 0, 0)); part("Алау (факел)", V(64, 24, -6), V(0, 0, 0)); part("Каспий теңізі", V(-50, 2, 40), V(0, 0, 0));
      view = [V(72, 44, 78), V(4, 4, 0)]; maxPolar = Math.PI * .47;
    }

    /* ---- Тұзды көл (Индер) ---- */
    function buildSalt(dep) {
      const t = (() => { if (texCache.salt) return texCache.salt; const S = 512, c = document.createElement("canvas"); c.width = c.height = S; const g = c.getContext("2d"); g.fillStyle = "#f1ece6"; g.fillRect(0, 0, S, S); g.strokeStyle = "rgba(180,150,140,.55)"; g.lineWidth = 2; for (let i = 0; i < 160; i++) { g.beginPath(); let x = rand(0, S), y = rand(0, S); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += rand(-40, 40); y += rand(-40, 40); g.lineTo(x, y); } g.stroke(); } const tx = canvasTex(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; return (texCache.salt = tx); })();
      ground(t, {}); hills(0xc9a77a);
      [[-20, -10, 16], [18, -24, 11], [-6, 20, 9], [30, 14, 7]].forEach(([x, z, r]) => { const w = new THREE.Mesh(new THREE.CircleGeometry(r, 28), Mat(0x5fc9c9, { roughness: .15, metalness: .2, transparent: true, opacity: .85 })); w.rotation.x = -Math.PI / 2; w.position.set(x, .05, z); w.scale.set(1, rand(.6, 1), 1); root.add(w); });
      const sm = Mat(0xffffff, { flatShading: true, roughness: .7 });
      [0, 1, 2, 3, 4].forEach(i => cone(5.5, 5, sm, -30 + i * 13, 0, 34, 9));
      [[-60, -40], [-45, -55], [55, -45], [70, -30]].forEach(([x, z]) => cone(rand(12, 18), rand(8, 13), Mat(0xd2b48c, { flatShading: true }), x, 0, z, 7));
      const tk = truck("#ffffff"); tk.scale.setScalar(.9);
      anims.push((dt, tt) => { const k = (Math.sin(tt * .25) + 1) / 2; tk.position.set(-10 + k * 30, 0, 28 - k * 30); tk.rotation.y = Math.atan2(30, 30) * (Math.cos(tt * .25) > 0 ? -1 : 1) + Math.PI / 4; });
      addCubes(dep, V(0, 20, 0));
      part("Тұз қабаты", V(6, 1, -2), V(0, 0, 0)); part("Ащы көл суы", V(-20, 1.5, -10), V(0, 0, 0)); part("Тұз үйінділері", V(-4, 8, 34), V(0, 0, 0)); part("Бор минералдары бар төбелер", V(-52, 12, -48), V(0, 0, 0)); part("Тиегіш көлік", tk, V(0, 4.5, 0));
      view = [V(52, 34, 62), V(0, 2, 0)]; maxPolar = Math.PI * .47;
    }

    /* ---- Металлургия зауыты ---- */
    function buildPlant(dep) {
      ground(noiseTex("concrete", "#9a9a94", ["#888882", "#b0b0aa", "#7a7a74"]), {}); hills(0xa89468, 170);
      const wall = Mat(0x8a939c), roof = Mat(0x4a5560), e0 = D.BY_SYM[dep.els[0]], ecol = new THREE.Color(elColor(e0));
      box(44, 14, 20, wall, 6, 7, 0); box(45, 1.2, 21, roof, 6, 14.6, 0);
      box(18, 20, 16, Mat(0x7a6a5a), -30, 10, -6); box(19, 1.2, 17, roof, -30, 20.6, -6);
      const mouth = box(6, 5, .4, Mat(0xff7a1a, { emissive: 0xff5a00, emissiveIntensity: 1.6 }), -30, 4, 2.1);
      glowLight.position.set(-30, 5, 7); anims.push((dt, t) => (glowLight.intensity = 2.2 + Math.sin(t * 9) * .6 + Math.random() * .4));
      const stripe = (() => { const c = document.createElement("canvas"); c.width = 8; c.height = 64; const g = c.getContext("2d"); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#ffffff" : "#c0392b"; g.fillRect(0, i * 8, 8, 8); } return canvasTex(c); })();
      [[-38, -20], [-28, -20], [24, -16]].forEach(([x, z]) => { cyl(1.4, 2, 36, Mat(0xffffff, { map: stripe }), x, 18, z, 18); smoke(x, 37, z, 10, 0xd8d8d8, 7); });
      const conv = box(1.6, .6, 30, Mat(0x444444), -12, 9, 14); conv.rotation.x = .3; conv.rotation.y = Math.PI / 2;
      const im = Mat("#" + ecol.getHexString(), { metalness: .7, roughness: .35 });
      for (let r = 0; r < 4; r++) for (let i = 0; i < 6 - r; i++) for (let k = 0; k < 3; k++) box(3, .9, 1.4, im, 26 + i * 3.1 + r * 1.55, .45 + r * .95, 18 + k * 1.6);
      [-1.2, 1.2].forEach(dz => box(240, .3, .3, Mat(0x555555, { metalness: .6 }), 0, .2, 30 + dz));
      const wagons = [0, 1, 2, 3, 4].map(i => { const w = new THREE.Group(); box(9, 3.4, 3, Mat(i ? 0x6b4a2b : 0x2f6f3f), 0, 2.2, 0, w); root.add(w); return w; });
      anims.push((dt, t) => wagons.forEach((w, i) => { w.position.set(((t * 6 + i * 10.5) % 240) - 120, 0, 30); }));
      const sp = new THREE.BufferGeometry(), spp = new Float32Array(60 * 3); sp.setAttribute("position", new THREE.BufferAttribute(spp, 3));
      root.add(new THREE.Points(sp, new THREE.PointsMaterial({ size: .6, map: GLOW, color: 0xffa040, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })));
      const sps = Array.from({ length: 60 }, () => ({ l: Math.random(), v: V(rand(-2, 2), rand(2, 6), rand(2, 6)) }));
      anims.push(dt => { sps.forEach((s, i) => { s.l += dt * .8; if (s.l > 1) { s.l = 0; s.v.set(rand(-2, 2), rand(2, 6), rand(2, 6)); } spp.set([-30 + s.v.x * s.l, 3 + s.v.y * s.l - 6 * s.l * s.l, 2.5 + s.v.z * s.l], i * 3); }); sp.attributes.position.needsUpdate = true; });
      addCubes(dep, V(6, 30, 0));
      part("Балқыту пеші", mouth, V(0, 4, 0)); part("Мұржалар", V(-33, 38, -20), V(0, 0, 0)); part("Негізгі цех", V(10, 16, 0), V(0, 0, 0));
      part("Дайын өнім — " + esc(e0.name.toLowerCase()), V(34, 5, 20), V(0, 0, 0)); part("Теміржол", V(-60, 4, 30), V(0, 0, 0));
      view = [V(58, 38, 70), V(0, 6, 0)]; maxPolar = Math.PI * .47;
    }

    const BUILD = { pit: buildPit, mine: buildMine, isr: buildISR, oil: buildOil, offshore: buildOffshore, salt: buildSalt, plant: buildPlant };
    function build(dep) {
      scene.remove(root);
      root.traverse(o => { if (o.geometry && o.geometry !== CUBE_GEO) o.geometry.dispose(); });
      root = new THREE.Group(); scene.add(root);
      anims.length = 0; picks.length = 0; labels.clear(); glowLight.intensity = 0; scene.fog.color.set(0xe6e4d8);
      BUILD[dep.type](dep);
    }
    let hovered = null;
    return {
      scene, controlsOn: true, build,
      enter(name, fromOther) {
        controls.minDistance = 8; controls.maxDistance = 190; controls.maxPolarAngle = maxPolar; controls.enablePan = true;
        if (fromOther) {
          const [p, l] = view;
          camera.position.copy(p).multiplyScalar(2.2).add(V(0, 70, 0)); controls.target.copy(l);
          flyTo(p, l, 2.4);
        }
      },
      pickables: () => picks,
      hover(o) { hovered = o; return o ? `<b>${o.userData.e.sym}</b> — ${esc(o.userData.e.name)}<br><small style="color:#fec50c">Басыңыз — 3D модель және қасиеттері</small>` : null; },
      click(o) { if (o) openElement(o.userData.e); },
      update(dt, t) { anims.forEach(f => f(dt, t)); labels.update(); }
    };
  })();

  /* ============================================================
     Атом моделі (элемент терезесі)
     ============================================================ */
  const atomView = (() => {
    const cv = $("#atom");
    const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.outputEncoding = THREE.sRGBEncoding;
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(45, 1, .1, 200);
    cam.position.set(0, 4, 16);
    const ctl = new THREE.OrbitControls(cam, cv); ctl.enableDamping = true; ctl.autoRotate = true; ctl.autoRotateSpeed = 1.2; ctl.enablePan = false; ctl.minDistance = 5; ctl.maxDistance = 40;
    sc.add(new THREE.AmbientLight(0xffffff, .55));
    const pl = new THREE.PointLight(0xffffff, 1.2); pl.position.set(6, 8, 10); sc.add(pl);
    let grp = null, shellsArr = [], open = false;
    const pGeo = new THREE.SphereGeometry(.32, 20, 20);
    const pMat = new THREE.MeshStandardMaterial({ color: 0xff4d4d, roughness: .35, metalness: .1 });
    const nMat = new THREE.MeshStandardMaterial({ color: 0x8fa8c8, roughness: .35, metalness: .1 });
    const eGeo = new THREE.SphereGeometry(.16, 14, 14);
    function build(e) {
      if (grp) sc.remove(grp);
      grp = new THREE.Group(); sc.add(grp); shellsArr = [];
      const N = Math.round(e.mass) - e.z, total = e.z + N, cap = 70, f = Math.min(1, cap / total);
      const np = Math.max(1, Math.round(e.z * f)), nn = Math.round(N * f), cnt = np + nn;
      const nuc = new THREE.Group(), R = .32 * Math.cbrt(cnt) * 1.05;
      const types = Array.from({ length: cnt }, (_, i) => i < np).sort(() => Math.random() - .5);
      for (let i = 0; i < cnt; i++) {
        const y = 1 - (i / Math.max(1, cnt - 1)) * 2, rad = Math.sqrt(1 - y * y), th = i * 2.399963;
        const rr = R * Math.cbrt((i + 1) / cnt);
        const m = new THREE.Mesh(pGeo, types[i] ? pMat : nMat);
        m.position.set(Math.cos(th) * rad * rr, y * rr, Math.sin(th) * rad * rr); nuc.add(m);
      }
      grp.add(nuc);
      const ng = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: new THREE.Color(D.CATS[e.cat].color), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: .8 }));
      ng.scale.setScalar(R * 6 + 2); grp.add(ng);
      const col = new THREE.Color(D.CATS[e.cat].color);
      e.shells.forEach((n, i) => {
        if (!n) return;
        const rad = R + 1.3 + i * 1.05, sg = new THREE.Group();
        const pts = []; for (let a = 0; a <= 128; a++) pts.push(new THREE.Vector3(Math.cos(a / 128 * Math.PI * 2) * rad, 0, Math.sin(a / 128 * Math.PI * 2) * rad));
        sg.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .45 })));
        const em = new THREE.MeshBasicMaterial({ color: 0xbff6ff });
        for (let k = 0; k < n; k++) {
          const a = k / n * Math.PI * 2, el = new THREE.Mesh(eGeo, em); el.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad);
          const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0x3fe0ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); gl.scale.setScalar(.9); el.add(gl);
          sg.add(el);
        }
        sg.rotation.set(rand(-.5, .5), 0, rand(-.5, .5));
        sg.userData.sp = 1.4 / (i + 1);
        grp.add(sg); shellsArr.push(sg);
      });
      const maxR = R + 1.3 + (e.shells.length - 1) * 1.05;
      cam.position.set(0, maxR * .55, maxR * 2.6 + 3); ctl.target.set(0, 0, 0);
    }
    function resize() { const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    return {
      show(e) { open = true; build(e); requestAnimationFrame(resize); },
      hide() { open = false; },
      resize,
      update(dt) { if (!open) return; shellsArr.forEach(s => (s.rotation.y += s.userData.sp * dt)); ctl.update(); r.render(sc, cam); }
    };
  })();

  /* ============================================================
     Дауыс (қазақ тілінде оқу) және субтитр
     ============================================================ */
  // Дыбыстау мәтіндері (дайын қазақша аудио файлдармен сәйкес келеді)
  const CLEAN = t => String(t).replace(/\s*\([^)]*[A-Za-z₀-₉][^)]*\)/g, "").replace(/[«»"]/g, "").replace(/\s+/g, " ").replace(/\s+([.,!?])/g, "$1").trim();
  function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, "0"); }
  const narrEl = e => { const kz = D.KZ[e.sym], f = D.FACTS[e.sym]; return `${e.name}. Реттік нөмірі ${e.z}. ${e.period}-период. ${D.CATS[e.cat].name}. ${f || ""} ${kz ? "Қазақстанда: " + kz.text + " Қолданылуы: " + kz.uses : ""}`; };
  const narrElMap = e => { const kz = D.KZ[e.sym]; return `${e.name}. ${kz ? kz.text : ""}`; };
  const narrDep = d => `${d.name}. ${d.region}. ${d.desc}`;
  const narrSite = d => `${d.name}. ${d.region}. ${D.METHODS[d.type].name}. ${D.METHODS[d.type].text}`;
  const narrRx = r => `${r.title}. ${r.text} ${r.kz}`;
  const MSG_NONE = "Байқалатын өзгеріс жоқ. Бұл заттар өзара әрекеттеспейді немесе өзгеріс көзге көрінбейді. Басқа жұпты байқап көріңіз!";
  const MSG_START = "Қазақстан картасына қош келдіңіз! Айналып тұрған элементті басыңыз — сол кен орнына виртуалды саяхат басталады.";
  const QUIZ_MSGS = ["Керемет! Сен — нағыз жас химик-геологсың!", "Жақсы нәтиже! Картаны тағы зерттеп көр.", "Картаны мен кестені тағы бір қарап шық — сен міндетті түрде үйренесің!"];
  const TOUR_TXT = [
    "Сәлеметсіздер ме! «Қазақстан картасындағы Менделеев кестесі» атты виртуалды әлемге қош келдіңіздер! Жобаның авторы — Маулен Айдана, Васильковка негізгі мектебі.",
    "Бұл — Қазақстанның үш өлшемді картасы. Әрбір айналып тұрған текше — кен орнындағы химиялық элемент. Текшені бассаңыз, сол кен орнына виртуалды саяхат жасайсыз.",
    "Ал бұл — Менделеевтің периодтық жүйесі. Алтын жиекті элементтер — Қазақстанда өндірілетін элементтер.",
    `Оларды бөліп көрсетейік: картада белгіленген ${D.ELEMENTS.filter(e => e.kz).length} элемент — біздің еліміздің байлығы.`,
    "Әр элементтің үш өлшемді атом моделі, нақты фотосуреті, кестедегі орны, қасиеттері және Қазақстандағы кен орны көрсетіледі.",
    "Виртуалды зертханада реакцияларды қауіпсіз бақылаймыз.",
    "Химияны туған жермен байланыстыра оқысақ, ол әлдеқайда қызықты! Назарларыңызға рахмет!"
  ];
  const TOUR_SITES = ["aktogay", "inkai", "zhezkazgan", "tengiz", "oskemen"];

  const AUD = window.AUDIO_KEYS || {};
  const Voice = {
    on: true, kk: null, token: 0, audio: new Audio(),
    init() {
      if (!("speechSynthesis" in window)) return;
      const pick = () => { const vs = speechSynthesis.getVoices(); this.kk = vs.find(v => /^kk/i.test(v.lang)) || null; };
      pick(); speechSynthesis.onvoiceschanged = pick;
    },
    stop() { this.token++; this.audio.pause(); if ("speechSynthesis" in window) speechSynthesis.cancel(); subtitle(null); Music.duck(false); },
    async speak(raw) {
      const my = ++this.token; this.audio.pause();
      if ("speechSynthesis" in window) speechSynthesis.cancel();
      const text = CLEAN(raw), parts = (text.match(/[^.!?]+[.!?]*/g) || [text]).map(s => s.trim()).filter(Boolean), key = fnv(text);
      Music.duck(true);
      if (this.on && AUD[key]) {
        await new Promise(res => {
          const a = this.audio; let fin = false;
          const done = () => { if (!fin) { fin = true; clearInterval(iv); res(); } };
          a.src = `audio/${key}.mp3`; a.onended = done; a.onerror = done;
          const total = parts.reduce((s, p) => s + p.length, 0);
          const iv = setInterval(() => {
            if (my !== this.token) return done();
            if (a.duration) { const pos = a.currentTime / a.duration * total; let acc = 0; for (const p of parts) { acc += p.length; if (pos <= acc) { subtitle(p); break; } } }
          }, 150);
          subtitle(parts[0]); a.currentTime = 0; a.play().catch(done);
        });
      } else {
        for (const p of parts) {
          if (my !== this.token) return;
          subtitle(p);
          if (this.on && this.kk) await new Promise(res => { const u = new SpeechSynthesisUtterance(p); u.voice = this.kk; u.lang = this.kk.lang; u.onend = u.onerror = res; setTimeout(res, p.length * 120 + 4000); speechSynthesis.speak(u); });
          else await wait(Math.max(1800, p.length * 65));
        }
      }
      if (my === this.token) { subtitle(null); Music.duck(false); }
    }
  };
  const say = t => Voice.speak(t);
  function subtitle(t) { const el = $("#subtitle"); if (t) { el.firstElementChild.textContent = t; el.classList.add("on"); } else el.classList.remove("on"); }
  function toast(msg) {
    const t = document.createElement("div"); t.className = "glass";
    Object.assign(t.style, { position: "fixed", top: "76px", left: "50%", transform: "translateX(-50%)", zIndex: 60, padding: "10px 16px", fontSize: "13px", maxWidth: "90vw", textAlign: "center", transition: "opacity .5s" });
    t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.remove(), 600); }, 6000);
  }

  /* ============================================================
     Әуен — домбыра үніне ұқсас түпнұсқа генеративті әуен
     ============================================================ */
  const Music = {
    ctx: null, on: false, timer: null, bufs: {}, ducked: false,
    init() {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      const c = this.ctx = new AC();
      this.master = c.createGain(); this.master.gain.value = 0;
      const comp = c.createDynamicsCompressor(); this.master.connect(comp); comp.connect(c.destination);
      // реверб
      const len = c.sampleRate * 2.6, ir = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      this.rev = c.createConvolver(); this.rev.buffer = ir; const wet = c.createGain(); wet.gain.value = .35; this.rev.connect(wet); wet.connect(this.master);
      this.bus = c.createGain(); this.bus.connect(this.master); this.bus.connect(this.rev);
      // бурдон
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 380; lp.connect(this.bus);
      const dg = c.createGain(); dg.gain.value = .035; dg.connect(lp);
      [73.42, 110, 146.83].forEach((f, i) => { const o = c.createOscillator(); o.type = i ? "triangle" : "sawtooth"; o.frequency.value = f; o.detune.value = rand(-6, 6); o.connect(dg); o.start(); });
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .07; lg.gain.value = 160; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
      this.scale = [146.83, 174.61, 196, 220, 261.63, 293.66, 349.23, 392, 440, 523.25];
      this.step = 0; this.next = 0; this.motif = this.newMotif(); this.bar = 0;
      return true;
    },
    buf(f) {
      if (this.bufs[f]) return this.bufs[f];
      const c = this.ctx, sr = c.sampleRate, len = sr * 2.2, b = c.createBuffer(1, len, sr), d = b.getChannelData(0), N = Math.round(sr / f);
      for (let i = 0; i < N; i++) d[i] = Math.random() * 2 - 1;
      for (let i = N; i < len; i++) d[i] = .497 * (d[i - N] + d[i - N - 1]);
      return (this.bufs[f] = b);
    },
    pluck(f, t, v, pan = 0) {
      const c = this.ctx, s = c.createBufferSource(); s.buffer = this.buf(f);
      const g = c.createGain(); g.gain.value = v;
      const bp = c.createBiquadFilter(); bp.type = "peaking"; bp.frequency.value = 900; bp.gain.value = 5;
      const p = c.createStereoPanner ? c.createStereoPanner() : null;
      s.connect(bp); bp.connect(g); if (p) { p.pan.value = pan; g.connect(p); p.connect(this.bus); } else g.connect(this.bus);
      s.start(t); s.stop(t + 2.2);
    },
    newMotif() { let i = 5; return Array.from({ length: 16 }, (_, k) => { if (k % 2 && Math.random() < .35) return -1; i = Math.max(2, Math.min(9, i + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)])); return i; }); },
    tick() {
      const c = this.ctx, sd = 60 / 138 / 2;
      while (this.next < c.currentTime + .15) {
        const st = this.step % 16, t = this.next;
        const strum = [1, 0, 1, 1, 1, 0, 1, 1][st % 8];
        const roots = [73.42, 73.42, 65.41, 55, 73.42, 87.31, 65.41, 73.42], root = roots[(this.bar) % 8];
        if (strum) { this.pluck(root * 2, t, st % 8 === 0 ? .32 : .18, -.3); this.pluck(root * 3, t + .012, .12, -.2); }
        const m = this.motif[st]; if (m >= 0) this.pluck(this.scale[m], t + .02, .26, .25);
        this.next += sd; this.step++;
        if (this.step % 16 === 0) { this.bar++; if (this.bar % 4 === 0) this.motif = this.newMotif(); }
      }
    },
    start() {
      if (!this.ctx && !this.init()) return;
      this.ctx.resume(); this.on = true; this.next = this.ctx.currentTime + .1;
      this.master.gain.setTargetAtTime(this.ducked ? .18 : .55, this.ctx.currentTime, .6);
      if (!this.timer) this.timer = setInterval(() => this.on && this.tick(), 40);
      $("#btn-music").classList.add("on");
    },
    stop() { this.on = false; if (this.ctx) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, .3); $("#btn-music").classList.remove("on"); },
    duck(d) { this.ducked = d; if (this.ctx && this.on) this.master.gain.setTargetAtTime(d ? .16 : .55, this.ctx.currentTime, .4); }
  };

  /* ============================================================
     Бөлімдерді басқару
     ============================================================ */
  const SCENE_OF = { home, quiz: home, idea: home, author: home, map, table, lab, site };
  let current = "home", active = home, switching = false;
  async function go(name) {
    if (name === current || switching) return;
    switching = true;
    $("#nav").classList.remove("open");
    $$("#nav button").forEach(b => b.classList.toggle("on", b.dataset.go === (name === "site" ? "map" : name)));
    controls.autoRotate = name === "site"; controls.autoRotateSpeed = .35;
    $$(".sec").forEach(s => s.classList.toggle("on", s.id === "sec-" + name));
    const next = SCENE_OF[name], other = next !== active;
    hideTip();
    if (other) {
      $("#flash").classList.add("on"); await wait(380);
      active = next; controls.enabled = !!next.controlsOn;
      next.enter(name, true);
      $("#flash").classList.remove("on");
    } else next.enter(name, false);
    current = name; switching = false;
  }
  $$("[data-go]").forEach(b => b.addEventListener("click", () => go(b.dataset.go)));
  $("#btn-menu").onclick = () => $("#nav").classList.toggle("open");

  /* ---------------- Тінтуір / раycast ---------------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let downAt = null, hovered = null;
  const tip = $("#tooltip");
  function hideTip() { tip.classList.remove("on"); hovered = null; canvas.style.cursor = ""; if (active.hover) active.hover(null); }
  function pick(e) {
    if (!active.pickables) return null;
    const list = active.pickables(); if (!list.length) return null;
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(list, false)[0];
    return hit ? hit.object : null;
  }
  canvas.addEventListener("pointermove", e => {
    const o = pick(e);
    if (o !== hovered) { hovered = o; const html = active.hover ? active.hover(o) : null; if (html) { tip.innerHTML = html; tip.classList.add("on"); } else tip.classList.remove("on"); canvas.style.cursor = o ? "pointer" : ""; }
    tip.style.left = e.clientX + "px"; tip.style.top = e.clientY + "px";
  });
  canvas.addEventListener("pointerdown", e => (downAt = [e.clientX, e.clientY]));
  canvas.addEventListener("pointerup", e => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    const o = pick(e); if (o && active.click) active.click(o);
  });
  canvas.addEventListener("pointerleave", hideTip);

  /* ============================================================
     UI — Карта
     ============================================================ */
  const mapSyms = [...new Set(D.DEPOSITS.flatMap(d => d.els))].map(s => D.BY_SYM[s]).sort((a, b) => a.z - b.z);
  $("#map-chips").innerHTML = `<button class="chip on" data-sym="">Барлығы</button>` + mapSyms.map(e => `<button class="chip" data-sym="${e.sym}"><span class="dot" style="background:${D.CATS[e.cat].color}"></span><b>${e.sym}</b>${esc(e.name)}</button>`).join("");
  $("#map-chips").addEventListener("click", ev => { const b = ev.target.closest(".chip"); if (b) map.setFilter(b.dataset.sym || null); });

  function photoFig(src, cap, credit) {
    return `<figure class="info-photo"><img src="${src}" alt="${esc(cap)}" loading="lazy"><figcaption>${esc(cap)}${credit ? `<span class="credit">Фото: Wikimedia Commons · ${esc(credit)}</span>` : ""}</figcaption></figure>`;
  }
  function depPhotos(dep) {
    const ph = PD[dep.id];
    if (ph && ph.length) return ph;
    const e = D.BY_SYM[dep.els[0]], p = PE[e.z];
    return p ? [{ f: p.f, cap: `${e.name} (${e.sym}) — осы кен орнының басты элементі`, c: p.c }] : [];
  }
  function showSiteInfo(dep) {
    const box = $("#site-info"), ph = depPhotos(dep), m = D.METHODS[dep.type];
    $("#site-title").textContent = dep.name; $("#site-type").textContent = m.name + " · " + dep.region;
    box.innerHTML = `
      ${ph.length ? photoFig(ph[0].f, ph[0].cap, ph[0].c) : ""}
      ${ph.length > 1 ? `<div class="gallery">${ph.map((p, i) => `<button data-i="${i}"><img src="${p.f}" alt=""></button>`).join("")}</div>` : ""}
      <h2>${esc(dep.name)}</h2>
      <span class="region">📍 ${esc(dep.region)}</span>
      <div class="chips">${dep.els.map(s => { const e = D.BY_SYM[s]; return `<button class="chip" data-el="${s}"><span class="dot" style="background:${elColor(e)}"></span><b>${s}</b>${esc(e.name)}</button>`; }).join("")}</div>
      <p>${esc(dep.desc)}</p>
      <div class="method"><h4>⛏ ${esc(m.name)}</h4><p>${esc(m.text)}</p></div>
      <div class="row-btns"><button class="mini gold" data-say-site>🔊 Өндіру әдісін тыңдау</button><button class="mini" data-say>🔊 Кен орны туралы</button></div>
      <p class="muted small">Айналып тұрған текшені немесе элементті басып, 3D атом моделін ашыңыз.</p>`;
    box.classList.remove("hidden");
    box.onclick = ev => {
      const el = ev.target.closest("[data-el]"); if (el) return openElement(D.BY_SYM[el.dataset.el]);
      const gi = ev.target.closest(".gallery button"); if (gi) { const p = ph[+gi.dataset.i]; box.querySelector(".info-photo").outerHTML = photoFig(p.f, p.cap, p.c); return; }
      if (ev.target.closest("[data-say-site]")) return say(narrSite(dep));
      if (ev.target.closest("[data-say]")) return say(narrDep(dep));
    };
  }
  let siteDep = null;
  async function enterSite(dep, speak = true) {
    closeModal(); hideTip(); siteDep = dep;
    if (current === "site") {
      $("#flash").classList.add("on"); await wait(350);
      site.build(dep); site.enter("site", true);
      $("#flash").classList.remove("on");
    } else { site.build(dep); await go("site"); }
    showSiteInfo(dep);
    if (speak && !touring) say(narrSite(dep));
  }
  $("#site-back").onclick = async () => { const d = siteDep; await go("map"); if (d) setTimeout(() => map.lookAtDep(d), 400); };
  const stepSite = k => { const i = D.DEPOSITS.indexOf(siteDep); enterSite(D.DEPOSITS[(i + k + D.DEPOSITS.length) % D.DEPOSITS.length]); };
  $("#site-prev").onclick = () => stepSite(-1); $("#site-next").onclick = () => stepSite(1);
  $("#map-filter h3").onclick = () => $("#map-filter").classList.toggle("collapsed");
  function showElementOnMap(sym, deps) {
    const e = D.BY_SYM[sym], kz = D.KZ[sym], p = PE[e.z], box = $("#map-info");
    box.innerHTML = `
      ${p ? photoFig(p.f, `${e.name} (${e.sym})`, p.c) : ""}
      <h2>${esc(e.name)} <span class="muted">(${e.sym})</span></h2>
      ${kz ? `<span class="region">★ ${esc(kz.rank)}</span><p>${esc(kz.text)}</p><p><b>Қолданылуы:</b> ${esc(kz.uses)}</p>` : ""}
      <h3 class="mt">Кен орындары (${deps.length})</h3>
      <div class="chips" style="flex-direction:column;align-items:stretch">${deps.map(d => `<button class="chip" data-dep="${d.id}">📍 ${esc(d.name)}</button>`).join("")}</div>
      <div class="row-btns"><button class="mini gold" data-open>⚛ 3D модель және қасиеттері</button><button class="mini" data-say>🔊 Тыңдау</button></div>`;
    box.classList.remove("hidden");
    box.onclick = ev => {
      const d = ev.target.closest("[data-dep]"); if (d) return enterSite(D.DEPOSITS.find(x => x.id === d.dataset.dep));
      if (ev.target.closest("[data-open]")) return openElement(e);
      if (ev.target.closest("[data-say]")) return say(narrElMap(e));
    };
  }

  /* ============================================================
     UI — Кесте
     ============================================================ */
  $("#layouts").addEventListener("click", ev => { const b = ev.target.closest("button"); if (b) table.setLayout(b.dataset.layout); });
  $("#search").addEventListener("input", ev => {
    const q = ev.target.value; table.applySearch(q || null);
    const s = q.trim().toLowerCase(); if (!s) return;
    const e = D.ELEMENTS.find(e => e.sym.toLowerCase() === s || String(e.z) === s || e.name.toLowerCase().startsWith(s));
    if (e) table.focus(e.sym);
  });
  $("#search").addEventListener("keydown", ev => {
    if (ev.key !== "Enter") return; const s = ev.target.value.trim().toLowerCase();
    const e = D.ELEMENTS.find(e => e.sym.toLowerCase() === s || String(e.z) === s || e.name.toLowerCase().startsWith(s)); if (e) openElement(e);
  });
  $("#legend").innerHTML = Object.entries(D.CATS).map(([k, c]) => `<span data-cat="${k}"><i style="background:${c.color}"></i>${c.name}</span>`).join("") + `<span class="kz"><i></i>Қазақстанда өндіріледі</span>`;
  $("#legend").addEventListener("mouseover", ev => { const s = ev.target.closest("[data-cat]"); table.tiles.forEach(t => (t.userData.tdim = !s || t.userData.e.cat === s.dataset.cat ? 1 : .15)); });
  $("#legend").addEventListener("mouseleave", () => table.applySearch($("#search").value || null));

  /* ============================================================
     Элемент терезесі
     ============================================================ */
  let modalEl = null;
  function openElement(e) {
    modalEl = e;
    const c = D.CATS[e.cat], kz = D.KZ[e.sym], p = PE[e.z], fact = D.FACTS[e.sym];
    const deps = D.DEPOSITS.filter(d => d.els.includes(e.sym));
    const rx = D.REACTIONS.filter(r => r.els.includes(e.sym));
    const grp = e.row > 7 ? `3 (${e.cat === "lanthanide" ? "лантаноид" : "актиноид"})` : e.group;
    $("#el-body").innerHTML = `
      <div class="el-head">
        <div class="el-tile" style="background:linear-gradient(135deg,${c.color},#${shade(c.color, -0.35).getHexString()})"><small>${e.z}</small><b>${e.sym}</b><i>${e.mass}</i></div>
        <div><h2>${esc(e.name)}</h2><p>${esc(c.name)} · ${esc(e.state)}</p></div>
      </div>
      ${p ? photoFig(p.f, `${e.name} — нақты үлгі`, p.c).replace('class="info-photo"', 'class="info-photo" style="margin:16px 0 0"') : ""}
      <div class="props">
        <div><span>Реттік нөмірі</span><b>${e.z}</b></div>
        <div><span>Атомдық масса</span><b>${e.mass}</b></div>
        <div><span>Период / топ</span><b>${e.period} / ${grp}</b></div>
        <div><span>Протон / электрон</span><b>${e.z} / ${e.z}</b></div>
        <div><span>Нейтрон (≈)</span><b>${Math.round(e.mass) - e.z}</b></div>
        <div><span>Қабаттар</span><b>${e.shells.join(", ")}</b></div>
      </div>
      ${fact ? `<p>💡 ${esc(fact)}</p>` : ""}
      ${kz ? `<div class="kzbox"><h4>🇰🇿 Қазақстанда <small>${esc(kz.rank)}</small></h4><p>${esc(kz.text)}</p><p><b>Қолданылуы:</b> ${esc(kz.uses)}</p></div>`
           : `<div class="nokz">Қазақстанда бұл элементтің ірі өнеркәсіптік кен орны белгісіз. ${e.z > 92 ? "Бұл — зертханада синтезделген жасанды элемент." : ""}</div>`}
      <div class="row-btns">
        <button class="mini gold" data-say>🔊 Тыңдау</button>
        ${deps.length ? `<button class="mini" data-map>🗺 Картадан көрсету (${deps.length})</button>` : ""}
        ${rx.length ? `<button class="mini" data-lab="${rx[0].id}">⚗ Тәжірибе: ${esc(rx[0].title)}</button>` : ""}
        <button class="mini" data-table>▦ Кестеде көрсету</button>
      </div>`;
    $("#atom-shells").textContent = e.shells.join(" · ");
    $("#el-modal").classList.remove("hidden");
    atomView.show(e);
  }
  function closeModal() { $("#el-modal").classList.add("hidden"); atomView.hide(); }
  $("#el-modal").addEventListener("click", async ev => {
    const e = modalEl;
    if (ev.target === ev.currentTarget || ev.target.closest("[data-close]")) return closeModal();
    if (ev.target.closest("[data-say]")) {
      const kz = D.KZ[e.sym], f = D.FACTS[e.sym];
      return say(narrEl(e));
    }
    if (ev.target.closest("[data-map]")) { closeModal(); await go("map"); setTimeout(() => map.setFilter(e.sym), 500); return; }
    const l = ev.target.closest("[data-lab]");
    if (l) { closeModal(); await go("lab"); setTimeout(() => lab.run(D.REACTIONS.find(r => r.id === l.dataset.lab)), 700); return; }
    if (ev.target.closest("[data-table]")) { closeModal(); await go("table"); setTimeout(() => table.focus(e.sym), 400); }
  });
  $("#credits").addEventListener("click", ev => { if (ev.target === ev.currentTarget || ev.target.closest("[data-close]")) $("#credits").classList.add("hidden"); });
  $("#btn-credits").onclick = () => $("#credits").classList.remove("hidden");
  addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); $("#credits").classList.add("hidden"); } });

  /* ============================================================
     UI — Зертхана
     ============================================================ */
  $("#rx-list").innerHTML = D.REACTIONS.map(r => `<button class="rx" data-id="${r.id}"><span class="sw" style="background:linear-gradient(135deg,${r.c0 || "#ffb347"},${r.c1 || "#ff5d00"})"></span><span><b>${esc(r.title)}</b><small>${esc(D.REAGENTS[r.a].label.split(" (")[0])} + ${esc(D.REAGENTS[r.b].label.split(" (")[0])}</small></span></button>`).join("");
  $("#rx-list").addEventListener("click", ev => { const b = ev.target.closest(".rx"); if (b) lab.run(D.REACTIONS.find(r => r.id === b.dataset.id)); });
  const opts = Object.entries(D.REAGENTS).map(([k, r]) => `<option value="${k}">${esc(r.label)}</option>`).join("");
  $("#mix-a").innerHTML = opts; $("#mix-b").innerHTML = opts; $("#mix-a").value = "Fe"; $("#mix-b").value = "CuSO4";
  $("#mix-go").onclick = () => {
    const a = $("#mix-a").value, b = $("#mix-b").value;
    if (a === b) return toast("Екі түрлі зат таңдаңыз.");
    const r = D.REACTIONS.find(r => (r.a === a && r.b === b) || (r.a === b && r.b === a));
    lab.run(r || null, [a, b]);
  };
  function showRxInfo(r, custom, done) {
    const box = $("#rx-info"); box.classList.remove("hidden");
    if (!r) {
      const [a, b] = custom;
      box.innerHTML = `<h2>${esc(D.REAGENTS[a].label)} + ${esc(D.REAGENTS[b].label)}</h2>${done ? `<div class="eq">Реакция байқалмайды</div><p>Бұл жұп өзара әрекеттеспейді немесе өзгеріс көзге көрінбейді. Тізімдегі тәжірибелерді немесе басқа жұпты байқап көріңіз.</p>` : `<p class="muted">Араластырудамыз…</p>`}`;
      return;
    }
    box.innerHTML = `
      <h2>${esc(r.title)}</h2>
      <p class="muted">${esc(D.REAGENTS[r.a].label)} + ${esc(D.REAGENTS[r.b].label)}</p>
      ${done ? `<div class="eq">${esc(r.eq)}</div><p>${esc(r.text)}</p><div class="kzlink">🇰🇿 ${esc(r.kz)}</div>
      <div class="chips">${r.els.map(s => `<button class="chip" data-el="${s}"><b>${s}</b>${esc(D.BY_SYM[s].name)}</button>`).join("")}</div>
      <div class="row-btns"><button class="mini gold" data-again>↻ Қайталау</button><button class="mini" data-say>🔊 Тыңдау</button></div>`
      : `<p class="muted">Бақылаңыз: түс, газ, тұнба, жылу, жарық — реакцияның белгілері!</p><div class="eq">? → ?</div>`}`;
    box.onclick = ev => {
      const el = ev.target.closest("[data-el]"); if (el) return openElement(D.BY_SYM[el.dataset.el]);
      if (ev.target.closest("[data-again]")) return lab.run(r);
      if (ev.target.closest("[data-say]")) return say(narrRx(r));
    };
  }

  /* ============================================================
     Викторина
     ============================================================ */
  const Quiz = {
    i: 0, score: 0, order: [],
    start() { this.order = D.QUIZ.map((_, i) => i).sort(() => Math.random() - .5).slice(0, 10); this.i = 0; this.score = 0; this.render(); },
    render() {
      $("#quiz-score").textContent = `${this.score} ұпай`;
      $("#quiz-bar").style.width = (this.i / this.order.length * 100) + "%";
      if (this.i >= this.order.length) {
        const n = this.order.length, s = this.score, msg = s >= n * .8 ? QUIZ_MSGS[0] : s >= n * .5 ? QUIZ_MSGS[1] : QUIZ_MSGS[2];
        $("#quiz-body").innerHTML = `<div class="quiz-end"><div class="big">${s} / ${n}</div><p>${msg}</p><div class="hero-btns" style="justify-content:center"><button class="btn primary" id="quiz-again">Қайта бастау</button><button class="btn" data-go="map">Картаға өту</button></div></div>`;
        $("#quiz-again").onclick = () => this.start();
        $("#quiz-body [data-go]").onclick = () => go("map");
        say(msg);
        return;
      }
      const q = D.QUIZ[this.order[this.i]];
      $("#quiz-body").innerHTML = `<div class="q">${this.i + 1}. ${esc(q.q)}</div><div class="answers">${q.a.map((a, k) => `<button data-k="${k}">${"ABCD"[k]}) ${esc(a)}</button>`).join("")}</div>`;
      $("#quiz-body .answers").onclick = ev => {
        const b = ev.target.closest("button"); if (!b) return;
        const k = +b.dataset.k, ok = k === q.c;
        $$("#quiz-body .answers button").forEach((x, j) => { x.disabled = true; if (j === q.c) x.classList.add("ok"); else if (j === k) x.classList.add("bad"); });
        if (ok) this.score++;
        $("#quiz-score").textContent = `${this.score} ұпай`;
        const e = D.BY_SYM[q.el], kz = D.KZ[q.el];
        const note = document.createElement("div"); note.className = "qnote";
        note.innerHTML = `${ok ? "✅ Дұрыс!" : "❌ Қате."} <b>${esc(e.name)} (${e.sym})</b>${kz ? " — " + esc(kz.text) : ""}<div class="row-btns"><button class="mini gold" id="qnext">Келесі →</button><button class="mini" id="qel">⚛ Элементті ашу</button></div>`;
        $("#quiz-body").appendChild(note);
        $("#qnext").onclick = () => { this.i++; this.render(); };
        $("#qel").onclick = () => openElement(e);
      };
    }
  };
  Quiz.start();

  /* ============================================================
     Авто-тур (баяндамаға арналған дауыстық саяхат)
     ============================================================ */
  let touring = false;
  const DEP = id => D.DEPOSITS.find(d => d.id === id);
  const TOUR = [
    async () => { await go("home"); await say(TOUR_TXT[0]); },
    async () => { await go("map"); await wait(1500); await say(TOUR_TXT[1]); },
    ...TOUR_SITES.map(id => async () => { const d = DEP(id); await enterSite(d, false); await wait(1500); await say(narrSite(d)); }),
    async () => { await go("table"); table.setLayout("table"); await wait(1200); await say(TOUR_TXT[2]); },
    async () => { table.setLayout("kz"); await wait(1500); await say(TOUR_TXT[3]); },
    async () => { openElement(D.BY_SYM.Cu); await wait(800); await say(TOUR_TXT[4]); closeModal(); },
    async () => { await go("lab"); await wait(1800); await say(TOUR_TXT[5]); await lab.run(D.REACTIONS[0]); },
    async () => { await go("author"); await say(TOUR_TXT[6]); }
  ];
  async function runTour() {
    touring = true; $("#btn-tour").classList.add("playing"); $("#btn-tour").textContent = "■ Тоқтату";
    if (!Music.on) Music.start();
    for (const step of TOUR) { if (!touring) break; closeModal(); await step(); await wait(500); }
    stopTour();
  }
  function stopTour() { touring = false; Voice.stop(); $("#btn-tour").classList.remove("playing"); $("#btn-tour").textContent = "▶ Авто-тур"; }
  $("#btn-tour").onclick = () => (touring ? stopTour() : runTour());
  $("#btn-music").onclick = () => (Music.on ? Music.stop() : Music.start());
  $("#btn-voice").onclick = ev => { Voice.on = !Voice.on; ev.currentTarget.classList.toggle("on", Voice.on); ev.currentTarget.textContent = Voice.on ? "🔊" : "🔈"; if (!Voice.on) Voice.stop(); };

  $("#btn-start").onclick = async () => {
    if (!Music.on) Music.start();
    await home.warp();
    await go("map");
    say(MSG_START);
  };

  /* ---------------- Сандар анимациясы ---------------- */
  const counts = { 118: 118, 28: D.DEPOSITS.length, 40: D.ELEMENTS.filter(e => e.kz).length, 14: D.REACTIONS.length };
  $$("[data-count]").forEach(b => {
    const n = counts[b.dataset.count];
    tween(2.2, k => (b.textContent = Math.round(n * k)));
  });

  /* ---------------- Цикл ---------------- */
  Voice.init();
  home.enter("home", false);
  camera.position.set(0, 0, 60);
  controls.enabled = false;
  const clock = new THREE.Clock();
  function loop() {
    const raw = clock.getDelta(), dt = Math.min(raw, .05), t = clock.elapsedTime;
    updateTweens(Math.min(raw, .25));
    active.update(dt, t);
    if (active.controlsOn && controls.enabled) controls.update();
    renderer.render(active.scene, camera);
    atomView.update(dt);
    requestAnimationFrame(loop);
  }
  loop();
  addEventListener("resize", () => {
    renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); atomView.resize();
  });
  // жүктеу экраны
  $("#sec-home").classList.add("on");
  setTimeout(() => $("#loader").classList.add("done"), 300);
  // URL арқылы бөлімге өту: index.html#map, #table, #lab, #el=Cu, #rx=fe_cu
  async function fromHash() {
    const h = decodeURIComponent(location.hash.slice(1)); if (!h) return;
    const [k, v] = h.split("=");
    if (SCENE_OF[k]) await go(k);
    else if (k === "el" && D.BY_SYM[v]) { await go("table"); openElement(D.BY_SYM[v]); }
    else if (k === "rx") { await go("lab"); const r = D.REACTIONS.find(r => r.id === v); if (r) setTimeout(() => lab.run(r), 600); }
    else if (k === "dep") { const d = D.DEPOSITS.find(d => d.id === v); if (d) enterSite(d, false); }
    else if (k === "f") { await go("map"); setTimeout(() => map.setFilter(v), 900); }
  }
  addEventListener("hashchange", fromHash); fromHash();
  window.__app = { go, openElement, lab, map, table, enterSite };
  // Дыбыстау мәтіндерінің тізімі (?dump) — аудио файлдарды дайындау үшін
  if (/[?&]dump/.test(location.search)) {
    const set = new Map(), add = t => { const c = CLEAN(t); set.set(fnv(c), c); };
    D.ELEMENTS.forEach(e => add(narrEl(e)));
    mapSyms.forEach(e => add(narrElMap(e)));
    D.DEPOSITS.forEach(d => { add(narrDep(d)); add(narrSite(d)); });
    D.REACTIONS.forEach(r => add(narrRx(r)));
    [MSG_NONE, MSG_START, ...QUIZ_MSGS, ...TOUR_TXT].forEach(add);
    const pre = document.createElement("pre"); pre.id = "dump"; pre.textContent = JSON.stringify([...set].map(([k, t]) => ({ k, t })));
    document.body.innerHTML = ""; document.body.appendChild(pre);
  }
  // Тексеру режимі (?ff): анимацияны таймермен жүргізеді
  if (/[?&]ff/.test(location.search)) {
    $("#loader").style.display = "none";
    setInterval(() => { const t = performance.now() / 1000; updateTweens(.06); active.update(.04, t); if (active.controlsOn) controls.update(); renderer.render(active.scene, camera); atomView.update(.04); }, 40);
  }
})();
