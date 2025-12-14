(() => {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });

  // ===== Helpers =====
  const rand = (a, b) => a + Math.random() * (b - a);

  function resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Implicit heart: (x^2 + y^2 - 1)^3 - x^2*y^3 <= 0
  // Đây là “form tim” chuẩn, cho lobes tròn + đáy nhọn giống tim 3D mẫu.
  function insideHeart(x, y) {
    const a = x*x + y*y - 1;
    return (a*a*a - (x*x) * (y*y*y)) <= 0;
  }

  // Vẽ “ngôi sao nhỏ” (không phải chấm tròn)
  function drawStar(cx, cy, outerR, alpha) {
    const spikes = 5;
    const innerR = outerR * 0.45;

    let rot = -Math.PI / 2;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.closePath();

    // mặt sao trắng + glow nhẹ
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();
  }

  // ===== Controls (chỉnh ở đây nếu muốn) =====
  const NAMES = "Thành Đạt & Thanh Thúy";

  const STAR_COUNT = 12000;     // DÀY (nếu máy yếu -> giảm 8000)
  const EDGE_RATIO = 0.28;      // % hạt nằm gần biên để tim rõ form
  const THICKNESS = 85;         // độ dày 3D (tăng = “khối tim” dày hơn)

  const HEART_SIZE = 0.92;      // tổng size tim
  const HEART_Y = 0;            // dịch tim lên/xuống (px). 0 = giữa
  const CAMERA = 110;           // perspective

  // Dao động 3D nhẹ (không làm “tan” hình)
  const SWAY_Y = 0.55;
  const SWAY_X = 0.22;

  // ===== Point cloud =====
  const pts = [];
  let start = performance.now();

  // Tạo khối tim đặc + lớp biên
  function initPoints() {
    pts.length = 0;

    const edgeCount = Math.floor(STAR_COUNT * EDGE_RATIO);
    const fillCount = STAR_COUNT - edgeCount;

    // “Định hình” tim giống hình 3D mẫu:
    // - hơi rộng ngang hơn (xScale)
    // - hơi gọn dọc (yScale)
    const xScale = 1.08;
    const yScale = 0.96;

    // 1) Volume fill (đặc bên trong)
    let tries = 0;
    while (pts.length < fillCount && tries < fillCount * 35) {
      tries++;

      // sample box
      let x = rand(-1.35, 1.35) / xScale;
      let y = rand(-1.25, 1.25) / yScale;

      if (!insideHeart(x, y)) continue;

      // depth distribution: nhiều điểm ở giữa -> nhìn “khối” hơn
      const z = (Math.random() * 2 - 1) * THICKNESS * (0.55 + Math.random() * 0.45);

      pts.push({
        x: x * xScale,
        y: y * yScale,
        z,
        // sao nhỏ, nhiều size
        r: rand(0.65, 1.75),
        // twinkle
        phase: rand(0, Math.PI * 2),
        tw: rand(0.9, 2.3),
        b: rand(0.45, 1.0),
      });
    }

    // 2) Edge shell (giữ form tim sắc nét như mẫu)
    tries = 0;
    while (pts.length < STAR_COUNT && tries < edgeCount * 160) {
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

      pts.push({
        x: (x * xScale) + rand(-0.010, 0.010),
        y: (y * yScale) + rand(-0.010, 0.010),
        z,
        r: rand(0.85, 2.10),
        phase: rand(0, Math.PI * 2),
        tw: rand(1.1, 2.6),
        b: rand(0.70, 1.0),
      });
    }
  }

  // 3D rotations
  function rotY(p, a) {
    const ca = Math.cos(a), sa = Math.sin(a);
    return { x: p.x * ca + p.z * sa, y: p.y, z: -p.x * sa + p.z * ca };
  }
  function rotX(p, a) {
    const ca = Math.cos(a), sa = Math.sin(a);
    return { x: p.x, y: p.y * ca - p.z * sa, z: p.y * sa + p.z * ca };
  }

  // Vignette nhẹ để “ra 3D” hơn
  function vignette(cx, cy, w, h) {
    const g = ctx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(w, h) * 0.62);
    g.addColorStop(0, "rgba(255,255,255,0.06)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // Text vẽ trực tiếp trên canvas để xoay đồng bộ 100%
  function draw3DText(cx, cy, aY, aX, scalePx) {
    ctx.save();
    ctx.translate(cx, cy);

    const fontSize = Math.max(16, Math.min(58, scalePx * 0.12));
    ctx.font = `800 ${fontSize}px system-ui, -apple-system, "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // “3D-ish” mặt chữ theo góc xoay
    const sx = 1 - Math.min(0.28, Math.abs(aY) * 0.55);
    const sy = 1 - Math.min(0.20, Math.abs(aX) * 0.55);
    const skew = aY * 0.55;
    ctx.transform(sx, 0, skew, sy, 0, 0);

    // extrude (khối chữ trắng)
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

    // dao động nhẹ, giữ form tim (không “tan”)
    const aY = Math.sin(t * 0.62) * SWAY_Y;
    const aX = Math.sin(t * 0.46) * SWAY_X;

    const cx = w / 2;
    const cy = h / 2 + HEART_Y;

    const scalePx = Math.min(w, h) * 0.30 * HEART_SIZE;

    vignette(cx, cy, w, h);

    // sort theo z để nhìn có chiều sâu
    pts.sort((a, b) => a.z - b.z);

    for (const s of pts) {
      let p = rotY(s, aY);
      p = rotX(p, aX);

      const persp = CAMERA / (CAMERA - p.z);
      const px = cx + p.x * scalePx * persp;
      const py = cy + p.y * scalePx * persp;

      // nhấp nháy
      const twinkle = (Math.sin(t * s.tw + s.phase) * 0.5 + 0.5);
      const alpha = (s.b * (0.35 + 0.65 * twinkle)) * 0.98;

      // size theo chiều sâu
      const rr = s.r * persp;

      // glow nhẹ (đừng quá mạnh để không thành “mờ hình”)
      ctx.save();
      ctx.shadowColor = "rgba(255,255,255,0.18)";
      ctx.shadowBlur = 6 * persp;

      drawStar(px, py, rr, alpha);
      ctx.restore();
    }

    // chữ nằm trong tim
    draw3DText(cx, cy, aY, aX, scalePx);

    requestAnimationFrame(render);
  }

  // Init
  resize();
  initPoints();
  requestAnimationFrame(render);

  window.addEventListener("resize", () => {
    resize();
    initPoints();
  });
})();
