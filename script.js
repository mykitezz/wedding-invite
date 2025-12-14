// ===== Music toggle (optional) =====
(() => {
  const music = document.getElementById("bg-music");
  const btn = document.getElementById("music-btn");
  if (!music || !btn) return;

  let isPlaying = false;
  btn.addEventListener("click", () => {
    if (isPlaying) music.pause();
    else music.play();
    isPlaying = !isPlaying;
  });
})();


// ===== 3D Heart Volume + 3D Text inside (Canvas) =====
(() => {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });

  function resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);

  function rand(a, b) { return a + Math.random() * (b - a); }

  // Heart implicit equation (normalized):
  // (x^2 + y^2 - 1)^3 - x^2*y^3 <= 0
  // with x,y in roughly [-1.5..1.5]
  function insideHeart(x, y) {
    const a = x*x + y*y - 1;
    return (a*a*a - (x*x) * (y*y*y)) <= 0;
  }

  // ===== Controls (chỉnh ở đây nếu cần) =====
  const STAR_COUNT = 7200;      // dày hơn (tăng/giảm tùy máy)
  const HEART_SIZE = 0.95;      // kích thước trái tim tổng thể
  const THICKNESS = 44;         // độ dày 3D (tăng lên = dày hơn)
  const HEART_Y_OFFSET = 0;     // + xuống, - lên (px)

  // tốc độ/biên độ dao động 3D
  const SWAY_Y = 0.55;          // xoay ngang (rad * sin)
  const SWAY_X = 0.28;          // xoay dọc (rad * sin)

  // camera/perspective
  const CAMERA_DIST = 95;

  // Text
  const NAMES = "Thành Đạt & Thanh Thúy";

  // ===== Star points =====
  const pts = [];
  let start = performance.now();

  function initPoints() {
    pts.length = 0;

    // Mix: 80% volume fill + 20% surface-ish to make edge crisp
    const fillCount = Math.floor(STAR_COUNT * 0.80);
    const edgeCount = STAR_COUNT - fillCount;

    // 1) Volume fill: rejection sampling inside heart region
    // sample in box, accept if inside
    let attempts = 0;
    while (pts.length < fillCount && attempts < fillCount * 20) {
      attempts++;
      const x = rand(-1.45, 1.45);
      const y = rand(-1.35, 1.35);
      if (!insideHeart(x, y)) continue;

      // Give it 3D thickness:
      // make more density near center depth to look like "solid"
      const z = (Math.random() * 2 - 1) * THICKNESS;

      // star size + twinkle
      pts.push({
        x, y, z,
        r: rand(0.55, 1.75),
        phase: rand(0, Math.PI * 2),
        tw: rand(0.8, 2.1),
        b: rand(0.50, 1.0)
      });
    }

    // 2) Edge points: sample near boundary to define heart shape clearly
    // We'll take random points and keep those "close to boundary"
    attempts = 0;
    while (pts.length < STAR_COUNT && attempts < edgeCount * 60) {
      attempts++;
      const x = rand(-1.45, 1.45);
      const y = rand(-1.35, 1.35);
      const in0 = insideHeart(x, y);
      if (!in0) continue;

      // boundary test: if a nearby point falls outside, it's near edge
      const eps = 0.02;
      const in1 = insideHeart(x + eps, y);
      const in2 = insideHeart(x - eps, y);
      const in3 = insideHeart(x, y + eps);
      const in4 = insideHeart(x, y - eps);
      const nearEdge = !(in1 && in2 && in3 && in4);
      if (!nearEdge) continue;

      const z = (Math.random() * 2 - 1) * (THICKNESS * 0.95);

      pts.push({
        x: x + rand(-0.015, 0.015),
        y: y + rand(-0.015, 0.015),
        z,
        r: rand(0.75, 2.05),
        phase: rand(0, Math.PI * 2),
        tw: rand(0.9, 2.3),
        b: rand(0.65, 1.0)
      });
    }
  }

  // 3D rotate helpers
  function rotY(p, a) {
    const ca = Math.cos(a), sa = Math.sin(a);
    return { x: p.x * ca + p.z * sa, y: p.y, z: -p.x * sa + p.z * ca };
  }
  function rotX(p, a) {
    const ca = Math.cos(a), sa = Math.sin(a);
    return { x: p.x, y: p.y * ca - p.z * sa, z: p.y * sa + p.z * ca };
  }

  function drawVignette(cx, cy, w, h) {
    const g = ctx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(w, h) * 0.62);
    g.addColorStop(0, "rgba(255,255,255,0.07)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // Draw 3D-ish text INSIDE heart and rotate with same sway
  function draw3DText(cx, cy, aY, aX, scalePx) {
    // Fake 3D by:
    // - skew + scale based on aY/aX (simulate perspective)
    // - extrude with multiple draws offset (white "block")
    const degY = aY; // in radians
    const degX = aX;

    const sx = 1 - Math.min(0.28, Math.abs(degY) * 0.55);  // horizontal compress when turning
    const sy = 1 - Math.min(0.18, Math.abs(degX) * 0.55);  // vertical compress
    const skew = degY * 0.55;                               // shear a bit

    // Centered inside heart
    ctx.save();
    ctx.translate(cx, cy);

    // Apply a “3D-ish” transform
    ctx.transform(sx, 0, skew, sy, 0, 0);

    // Text size responsive to screen + heart size
    const fontSize = Math.max(18, Math.min(56, scalePx * 0.12));
    ctx.font = `800 ${fontSize}px system-ui, -apple-system, "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Extrude direction depends on rotation
    const ex = -degY * 18;
    const ey = degX * 12;

    // Draw “block” layers (white) to look like thickness
    const layers = 10;
    for (let i = layers; i >= 1; i--) {
      ctx.fillStyle = `rgba(255,255,255,${0.09 + i * 0.01})`;
      ctx.fillText(NAMES, ex * (i / layers), ey * (i / layers));
    }

    // Front face + glow
    ctx.fillStyle = "rgba(255,255,255,0.98)";
    ctx.shadowColor = "rgba(255,255,255,0.22)";
    ctx.shadowBlur = 16;
    ctx.fillText(NAMES, 0, 0);

    ctx.restore();
  }

  function render(now) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const t = (now - start) / 1000;

    // Sway 3D
    const aY = Math.sin(t * 0.62) * SWAY_Y;
    const aX = Math.sin(t * 0.46) * SWAY_X;

    // Center and scale
    const cx = w / 2;
    const cy = h / 2 + HEART_Y_OFFSET;
    const scalePx = Math.min(w, h) * 0.30 * HEART_SIZE;

    // Background glow
    drawVignette(cx, cy, w, h);

    // Sort by z for better depth feel
    pts.sort((a, b) => a.z - b.z);

    // Draw points
    for (const s of pts) {
      // rotate point
      let p = rotY(s, aY);
      p = rotX(p, aX);

      // perspective
      const persp = CAMERA_DIST / (CAMERA_DIST - p.z);
      const px = cx + p.x * scalePx * persp;
      const py = cy + p.y * scalePx * persp;

      // twinkle
      const twinkle = (Math.sin(t * s.tw + s.phase) * 0.5 + 0.5);
      const alpha = (s.b * (0.35 + 0.65 * twinkle)) * 0.98;

      // size with depth
      const rr = s.r * persp;

      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.arc(px, py, rr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw text LAST so it's clearly "inside" the heart volume
    // (tim dày + chữ ngay tâm -> nhìn đúng “lồng bên trong”)
    draw3DText(cx, cy, aY, aX, scalePx);

    requestAnimationFrame(render);
  }

  resize();
  initPoints();
  requestAnimationFrame(render);

  // Re-init on resize to keep density consistent
  window.addEventListener("resize", () => {
    resize();
    initPoints();
  });
})();
