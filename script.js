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


// ===== 3D Heart Starfield (Canvas) + Centered 3D Text =====
(() => {
  const canvas = document.getElementById("hero-canvas");
  const heroText = document.getElementById("hero-text");
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

  // Classic heart curve
  function heart(t) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);
    return { x, y };
  }

  // ===== Controls (bạn chỉ cần chỉnh ở đây nếu muốn) =====
  const STAR_COUNT = 2600;        // tăng số lượng điểm sáng
  const HEART_SIZE = 0.72;        // nhỏ/gọn trái tim (0.6 nhỏ hơn, 0.85 to hơn)
  const DEPTH_RANGE = 18;         // độ dày 3D (z)
  const FILL_PULL_MAX = 0.42;     // mức “đặc” bên trong tim
  const HEART_CENTER_Y = 0;       // dịch tim lên/xuống (px). 0 = đúng giữa màn

  // ===== Star data =====
  const stars = [];
  let start = performance.now();

  function initStars() {
    stars.length = 0;

    // Tạo “khối” trái tim: điểm trên curve + jitter + pull vào tâm + depth Z
    for (let i = 0; i < STAR_COUNT; i++) {
      const t = rand(0, Math.PI * 2);
      const p = heart(t);

      const s = rand(0.72, 1.08) * HEART_SIZE;  // scale heart
      const jitter = rand(-1.3, 1.3);

      let x = (p.x * s) + jitter;
      let y = (-p.y * s) + jitter;

      // Fill volume: kéo điểm vào trung tâm để tim “đặc” thay vì chỉ viền
      const pull = rand(0.0, FILL_PULL_MAX);
      x *= (1 - pull);
      y *= (1 - pull);

      const z = rand(-DEPTH_RANGE, DEPTH_RANGE);

      stars.push({
        x, y, z,
        r: rand(0.6, 1.9),
        phase: rand(0, Math.PI * 2),
        tw: rand(0.8, 1.9),
        b: rand(0.55, 1.0)
      });
    }
  }

  // 3D rotate helpers
  function rotateY(p, a) {
    const ca = Math.cos(a), sa = Math.sin(a);
    return { x: p.x * ca + p.z * sa, y: p.y, z: -p.x * sa + p.z * ca };
  }
  function rotateX(p, a) {
    const ca = Math.cos(a), sa = Math.sin(a);
    return { x: p.x, y: p.y * ca - p.z * sa, z: p.y * sa + p.z * ca };
  }

  function render(now) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    const t = (now - start) / 1000;

    // Dao động 3D nhẹ
    const swayY = Math.sin(t * 0.60) * 0.40;
    const swayX = Math.sin(t * 0.45) * 0.20;

    // Đồng bộ chữ xoay cùng tim + giữ chữ đúng tâm tim
    if (heroText) {
      const degY = swayY * 42;
      const degX = -swayX * 42;
      heroText.style.transform =
        `translateY(${HEART_CENTER_Y}px) translateZ(-18px) rotateY(${degY}deg) rotateX(${degX}deg)`;
    }

    // Projection params
    const cx = w / 2;
    const cy = h / 2 + HEART_CENTER_Y;

    // scale nhỏ gọn trái tim
    const scale = Math.min(w, h) * 0.020;

    // camera distance (perspective strength)
    const depth = 78;

    // Vignette glow nhẹ
    const glow = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(w, h) * 0.55);
    glow.addColorStop(0, "rgba(255,255,255,0.06)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Draw stars (để đẹp hơn: sort theo z để lớp trước/ sau nhìn có chiều sâu)
    // (sort nhẹ, vẫn ổn)
    stars.sort((a, b) => a.z - b.z);

    for (const s of stars) {
      // rotate point
      let p = rotateY(s, swayY);
      p = rotateX(p, swayX);

      // perspective
      const persp = depth / (depth - p.z);
      const px = cx + p.x * scale * persp;
      const py = cy + p.y * scale * persp;

      // twinkle
      const twinkle = (Math.sin(t * s.tw + s.phase) * 0.5 + 0.5);
      const alpha = (s.b * (0.35 + 0.65 * twinkle)) * 0.98;

      // size
      const rr = s.r * persp;

      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.arc(px, py, rr, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(render);
  }

  resize();
  initStars();
  requestAnimationFrame(render);
})();
