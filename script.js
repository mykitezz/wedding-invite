(() => {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });

  const rand = (a, b) => a + Math.random() * (b - a);

  function resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Heart implicit: (x^2 + y^2 - 1)^3 - x^2*y^3 <= 0
  function insideHeart(x, y) {
    const a = x*x + y*y - 1;
    return (a*a*a - (x*x) * (y*y*y)) <= 0;
  }

  // Draw small 5-point star
  function drawStar(x, y, r, alpha) {
    const spikes = 5;
    const inner = r * 0.45;
    let rot = -Math.PI / 2;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(x + Math.cos(rot) * r, y + Math.sin(rot) * r);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(x + Math.cos(rot) * r, y + Math.sin(rot) * r);
      rot += step;
      ctx.lineTo(x + Math.cos(rot) * inner, y + Math.sin(rot) * inner);
      rot += step;
    }
    ctx.closePath();

    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();
  }

  // ===== Controls =====
  const NAMES = "Thành Đạt & Thanh Thúy";

  // Nếu máy lag, giảm STAR_COUNT xuống 8000
  const STAR_COUNT = 14000;    // DÀY
  const EDGE_RATIO = 0.33;     // biên rõ form tim
  const THICKNESS = 95;        // dày 3D

  const HEART_SIZE = 0.92;
  const CAMERA = 120;
  const Y_OFFSET = 0;

  // dao động nhẹ (giữ form tim)
  const SWAY_Y = 0.52;
  const SWAY_X = 0.20;

  const points = [];
  let start = performance.now();

  function initPoints() {
    points.length = 0;

    const edgeCount = Math.floor(STAR_COUNT * EDGE_RATIO);
    const fillCount = STAR_COUNT - edgeCount;

    // “shape tuning” để tim tròn-lobes + đáy nhọn kiểu hình mẫu
    const xScale = 1.10;
    const yScale = 0.95;

    // 1) Solid fill
    let tries = 0;
    while (points.length < fillCount && tries < fillCount * 40) {
      tries++;
      let x = rand(-1.35, 1.35) / xScale;
      let y = rand(-1.25, 1.25) / yScale;
      if (!insideHeart(x, y)) continue;

      // depth bias: dày ở giữa để “ra khối”
      const z = (Math.random() * 2 - 1) * THICKNESS * (0.55 + Math.random() * 0.45);

      points.push({
        x: x * xScale,
        y: y * yScale,
        z,
        r: rand(0.65, 1.75),
        phase: rand(0, Math.PI * 2),
        tw: rand(0.9, 2.3),
        b: rand(0.45, 1.0),
      });
    }

    // 2) Edge shell (giữ silhouette tim)
    tries = 0;
    while (points.length < STAR_COUNT && tries < edgeCount * 180) {
      tries++;
      let x = rand(-1.35, 1.35) / xScale;
      let y = rand(-1.25, 1.25) / yScale;
      if (!insideHeart(x, y)) continue;

      const eps = 0.018;
      const nearEdge = !(
        insideHeart(x + eps, y) &&
        insideHeart(x - eps, y) &&
        insideHeart(x, y + eps) &&
        insideHeart(x, y - eps)
      );
      if (!nearEdge) continue;

      const z = (Math.random() * 2 - 1) * THICKNESS;

      points.push({
        x: (x * xScale) + rand(-0.010, 0.010),
        y: (y * yScale) + rand(-0.010, 0.010),
        z,
        r: rand(0.90, 2.25),
        phase: rand(0, Math.PI * 2),
        tw: rand(1.1, 2.7),
        b: rand(0.70, 1.0),
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
    g.addColorStop(0, "rgba(255,255,255,0.06)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function draw3DText(cx, cy, aY, aX, scalePx) {
    ctx.save();
    ctx.translate(cx, cy);

    const fontSize = Math.max(16, Math.min(58, scalePx * 0.12));
    ctx.font = `800 ${fontSize}px system-ui, -apple-system, "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const sx = 1 - Math.min(0.28, Math.abs(aY) * 0.55);
    const sy = 1 - Math.min(0.20, Math.abs(aX) * 0.55);
    const skew = aY * 0.55;
    ctx.transform(sx, 0, skew, sy, 0, 0);

    const ex = -aY * 26;
    const ey =  aX * 18;

    const layers = 12;
    for (let i = layers; i >= 1; i--) {
      ctx.fillStyle = `rgba(255,255,255,${0.08 + i * 0.012})`;
      ctx.fillText(NAMES, ex * (i / layers), ey * (i / layers));
    }

    ctx.fillStyle = "rgba(255,255,255,0.98)";
    ctx.shadowColor = "rgba(255,255,255,0.26)";
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

    // ✅ Watermark để xác nhận file V11 đã chạy
    ctx.save();
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Arial";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText("HEART v11 LOADED", 14, 20);
    ctx.restore();

    // sort by depth
    points.sort((a, b) => a.z - b.z);

    for (const s of points) {
      let p = rotY(s, aY);
      p = rotX(p, aX);

      const persp = CAMERA / (CAMERA - p.z);
      const px = cx + p.x * scalePx * persp;
      const py = cy + p.y * scalePx * persp;

      const twinkle = (Math.sin(t * s.tw + s.phase) * 0.5 + 0.5);
      const alpha = (s.b * (0.35 + 0.65 * twinkle)) * 0.98;

      const rr = s.r * persp;

      ctx.save();
      ctx.shadowColor = "rgba(255,255,255,0.18)";
      ctx.shadowBlur = 6 * persp;
      drawStar(px, py, rr, alpha);
      ctx.restore();
    }

    draw3DText(cx, cy, aY, aX, scalePx);

    requestAnimationFrame(render);
  }

  resize();
  initPoints();
  requestAnimationFrame(render);

  window.addEventListener("resize", () => {
    resize();
    initPoints();
  });
})();
