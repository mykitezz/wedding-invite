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


// ===== 3D Solid Heart + 3D Text Inside (Canvas) =====
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
  window.addEventListener("resize", () => {
    resize();
    initPoints();
  });

  function rand(a, b) { return a + Math.random() * (b - a); }

  // Heart implicit equation:
  // (x^2 + y^2 - 1)^3 - x^2*y^3 <= 0
  function insideHeart(x, y) {
    const a = x*x + y*y - 1;
    return (a*a*a - (x*x) * (y*y*y)) <= 0;
  }

  // ===== Controls =====
  const NAMES = "Thành Đạt & Thanh Thúy";
  const STAR_COUNT = 9500;     // tăng mạnh để thấy “đặc”
  const EDGE_RATIO = 0.22;     // % điểm nằm gần biên để tim rõ
  const THICKNESS = 70;        // độ dày 3D (tăng rõ)
  const HEART_SIZE = 0.92;     // size tổng thể
  const Y_OFFSET = 0;          // dịch lên/xuống nếu cần

  const CAMERA_DIST = 105;     // perspective
  const SWAY_Y = 0.65;
  const SWAY_X = 0.30;

  const points = [];
  let start = performance.now();

  function initPoints() {
    points.length = 0;

    const edgeCount = Math.floor(STAR_COUNT * EDGE_RATIO);
    const fillCount = STAR_COUNT - edgeCount;

    // 1) Solid fill (volume)
    let tries = 0;
    while (points.length < fillCount && tries < fillCount * 30) {
      tries++;

      // sample inside a bounding box
      const x = rand(-1.35, 1.35);
      const y = rand(-1.25, 1.25);
      if (!insideHeart(x, y)) continue;

      // thickness: uniform depth, with slight bias to center
      const z = (Math.random() * 2 - 1) * THICKNESS * (0.55 + Math.random() * 0.45);

      points.push({
        x, y, z,
        r: rand(0.55, 1.65),
        phase: rand(0, Math.PI * 2),
        tw: rand(0.9, 2.2),
        b: rand(0.45, 1.0)
      });
    }

    // 2) Edge layer (near boundary) to make heart silhouette crisp
    tries = 0;
    while (points.length < STAR_COUNT && tries < edgeCount * 120) {
      tries++;

      const x = rand(-1.35, 1.35);
      const y = rand(-1.25, 1.25);
      if (!insideHeart(x, y)) continue;

      const eps = 0.018;
      const nearEdge = !(insideHeart(x+eps, y) && insideHeart(x-eps, y) && insideHeart(x, y+eps) && insideHeart(x, y-eps));
      if (!nearEdge) continue;

      const z = (Math.random() * 2 - 1) * THICKNESS;

      points.push({
        x: x + rand(-0.01, 0.01),
        y: y + rand(-0.01, 0.01),
        z,
        r: rand(0.85, 2.15),
        phase: rand(0, Math.PI * 2),
        tw: rand(1.0, 2.4),
        b: rand(0.70, 1.0)
      });
    }
  }

  function rotY(p, a) {
    const ca = Math.cos(a), sa = Math.sin(a);
    return { x: p.x * ca + p.z * sa, y: p.y, z: -p.x * sa + p.z * ca };
  }
  function rotX(p, a) {
    const ca = Math.cos(a), sa = Math.sin(a);
    return { x: p.x, y: p.y * ca - p.z * sa, z: p.y * sa + p.z * ca };
  }

  function vignette(cx, cy, w, h) {
    const g = ctx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(w, h) * 0.60);
    g.addColorStop(0, "rgba(255,255,255,0.07)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function draw3DText(cx, cy, aY, aX, scalePx) {
    // keep text INSIDE heart: scale tied to heart size
    const fontSize = Math.max(18, Math.min(60, scalePx * 0.12));
    ctx.save();
    ctx.translate(cx, cy);

    // simulate 3D face orientation
    const sx = 1 - Math.min(0.28, Math.abs(aY) * 0.55);
    const sy = 1 - Math.min(0.18, Math.abs(aX) * 0.55);
    const skew = aY * 0.60;
    ctx.transform(sx, 0, skew, sy, 0, 0);

    ctx.font = `800 ${fontSize}px system-ui, -apple-system, "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // extrude direction (depend on rotation)
    const ex = -aY * 28;
    const ey =  aX * 18;

    // draw extrude layers (white “block”)
    const layers = 14;
    for (let i = layers; i >= 1; i--) {
      ctx.fillStyle = `rgba(255,255,255,${0.08 + i * 0.012})`;
      ctx.fillText(NAMES, ex * (i / layers), ey * (i / layers));
    }

    // front face + glow
    ctx.fillStyle = "rgba(255,255,255,0.98)";
    ctx.shadowColor = "rgba(255,255,255,0.28)";
    ctx.shadowBlur = 18;
    ctx.fillText(NAMES, 0, 0);

    ctx.restore();
  }

  function render(now) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const t = (now - start) / 1000;

    const aY = Math.sin(t * 0.62) * SWAY_Y;
    const aX = Math.sin(t * 0.46) * SWAY_X;

    const cx = w / 2;
    const cy = h / 2 + Y_OFFSET;

    const scalePx = Math.min(w, h) * 0.30 * HEART_SIZE;

    vignette(cx, cy, w, h);

    // depth sort
    points.sort((a, b) => a.z - b.z);

    for (const s of points) {
      let p = rotY(s, aY);
      p = rotX(p, aX);

      const persp = CAMERA_DIST / (CAMERA_DIST - p.z);
      const px = cx + p.x * scalePx * persp;
      const py = cy + p.y * scalePx * persp;

      const twinkle = (Math.sin(t * s.tw + s.phase) * 0.5 + 0.5);
      const alpha = (s.b * (0.35 + 0.65 * twinkle)) * 0.98;

      const rr = s.r * persp;

      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.arc(px, py, rr, 0, Math.PI * 2);
      ctx.fill();
    }

    // draw text on top (but visually still “inside” because heart is volumetric)
    draw3DText(cx, cy, aY, aX, scalePx);

    requestAnimationFrame(render);
  }

  resize();
  initPoints();
  requestAnimationFrame(render);
})();
