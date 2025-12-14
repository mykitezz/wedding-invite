// ===== 3D Heart Starfield (Canvas) =====
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

  // Heart param (2D), then we give it depth (z) to fake 3D.
  function heart(t) {
    // classic heart curve
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);
    return { x, y };
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  const STAR_COUNT = 1400;
  const stars = [];
  let start = performance.now();

  function initStars() {
    stars.length = 0;

    // Build a heart "volume": points on heart curve + thickness + depth
    for (let i = 0; i < STAR_COUNT; i++) {
      const t = rand(0, Math.PI * 2);
      const p = heart(t);

      // thickness: scatter around curve (more natural than exact curve)
      const s = rand(0.65, 1.1);
      const jitter = rand(-1.2, 1.2);

      // base coordinates
      let x = (p.x * s) + jitter;
      let y = (-p.y * s) + jitter;

      // give some depth (z) for 3D feeling
      let z = rand(-18, 18);

      // additional spread to make it a "filled" heart instead of a thin line
      // pull points slightly toward center
      const pull = rand(0.0, 0.35);
      x *= (1 - pull);
      y *= (1 - pull);

      stars.push({
        x, y, z,
        r: rand(0.7, 1.8),         // star radius
        phase: rand(0, Math.PI * 2),
        tw: rand(0.6, 1.6),        // twinkle speed
        b: rand(0.55, 1.0)         // base brightness
      });
    }
  }

  // 3D rotate
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

    // clear
    ctx.clearRect(0, 0, w, h);

    const t = (now - start) / 1000;

    // Gentle sway for the whole scene (this is your “dao động nhẹ qua lại”)
    const swayY = Math.sin(t * 0.6) * 0.55;   // rotate around Y
    const swayX = Math.sin(t * 0.45) * 0.18;  // rotate around X

    // Camera + projection params
    const scale = Math.min(w, h) * 0.035;
    const cx = w / 2;
    const cy = h / 2;

    // soft vignette glow
    const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(w, h) * 0.55);
    grad.addColorStop(0, "rgba(255,255,255,0.06)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // draw stars
    for (const s of stars) {
      // rotate point
      let p = rotateY(s, swayY);
      p = rotateX(p, swayX);

      // perspective projection
      const depth = 70;              // camera distance
      const persp = depth / (depth - p.z);
      const px = cx + p.x * scale * persp;
      const py = cy + p.y * scale * persp;

      // twinkle
      const twinkle = (Math.sin(t * s.tw + s.phase) * 0.5 + 0.5);
      const alpha = (s.b * (0.35 + 0.65 * twinkle)) * 0.95;

      // size with perspective
      const rr = s.r * persp;

      // star glow
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
