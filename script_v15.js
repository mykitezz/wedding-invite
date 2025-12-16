const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const NAMES = "Thành Đạt & Thanh Thúy";

// ===== PARAMETRIC HEART (đầu đầy, cân) =====
function heartXY(t) {
  const s = Math.sin(t);
  const c = Math.cos(t);
  const x = 16 * s * s * s;
  const y = 13 * c - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
  return { x, y };
}
function normHeart(p) {
  return { x: p.x / 18, y: (p.y + 2) / 18 };
}
const rand = (a,b)=>a+Math.random()*(b-a);

// ===== CONFIG =====
const COUNT = 9000;
const DEPTH = 0.35;
const BASE_SCALE = 0.24;
const SWAY = 0.22;            // chỉ shear ngang
const TWINKLE_POWER = 1.45;
const GLOW = 7;

// ===== Build points (volume + edge) =====
const pts = [];
function build() {
  pts.length = 0;

  for (let i = 0; i < COUNT; i++) {
    const t = Math.random() * Math.PI * 2;
    const p = normHeart(heartXY(t));

    const k = Math.pow(Math.random(), 1.8);
    const x = p.x * (0.70 + 0.30 * k) + rand(-0.02, 0.02);
    const y = p.y * (0.70 + 0.30 * k) + rand(-0.02, 0.02);
    const z = (Math.random() * 2 - 1) * DEPTH;

    pts.push({
      x,y,z,
      r: rand(0.6, 1.6),
      phase: rand(0, Math.PI*2),
      speed: rand(0.9, 2.0),
      base: rand(0.35, 1.0)
    });
  }

  const EDGE_COUNT = Math.floor(COUNT * 0.22);
  for (let i = 0; i < EDGE_COUNT; i++) {
    const t = Math.random() * Math.PI * 2;
    const p = normHeart(heartXY(t));
    const z = (Math.random() * 2 - 1) * DEPTH;

    pts.push({
      x: p.x + rand(-0.01, 0.01),
      y: p.y + rand(-0.01, 0.01),
      z,
      r: rand(0.9, 2.0),
      phase: rand(0, Math.PI*2),
      speed: rand(1.0, 2.3),
      base: rand(0.55, 1.0)
    });
  }
}
build();

// shear ngang theo y
function swayHoriz(x, y, a) {
  return { x: x + (y * 0.55) * Math.sin(a), y };
}

// text inside
function drawText(cx, cy, shear, scalePx) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(1, 0, Math.sin(shear) * 0.30, 1, 0, 0);

  const fontSize = Math.max(18, Math.min(40, scalePx * 0.22));
  ctx.font = `800 ${fontSize}px system-ui, -apple-system, Segoe UI, Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.scale(0.86, 1);

  for (let i = 7; i >= 1; i--) {
    ctx.fillStyle = `rgba(255,255,255,${0.05 + i * 0.02})`;
    ctx.fillText(NAMES, i * 0.55, -i * 0.25);
  }

  ctx.fillStyle = "rgba(255,255,255,0.98)";
  ctx.shadowColor = "rgba(255,255,255,0.18)";
  ctx.shadowBlur = 16;
  ctx.fillText(NAMES, 0, 0);

  ctx.restore();
}

let t0 = performance.now();

function render(now) {
  const t = (now - t0) / 1000;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const cx = w/2;
  const cy = h/2;
  const scalePx = Math.min(w, h) * BASE_SCALE;

  const a = Math.sin(t * 0.8) * SWAY;
  const bob = Math.sin(t * 0.95) * 4;

  // Vignette
  const vg = ctx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(w,h) * 0.65);
  vg.addColorStop(0, "rgba(255,255,255,0.05)");
  vg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  // ✅ WATERMARK V15 (bạn phải thấy nếu đúng file)
  ctx.save();
  ctx.font = "bold 28px system-ui, Arial";
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText("V15 ✅", 20, 45);
  ctx.restore();

  pts.sort((p1, p2) => p1.z - p2.z);

  for (const p of pts) {
    const sp = swayHoriz(p.x, p.y, a);

    const zf = 1 + p.z * 0.55;
    const px = cx + sp.x * scalePx * zf;
    const py = (cy + bob) - sp.y * scalePx * zf;

    const tw0 = (Math.sin(t * p.speed + p.phase) + 1) / 2;
    const tw = Math.pow(tw0, TWINKLE_POWER);

    const depthLight = 0.55 + (p.z + DEPTH) / (2*DEPTH) * 0.45;
    const alpha = (0.12 + tw * 0.78) * p.base * depthLight;

    const rr = p.r * zf;

    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,0.18)";
    ctx.shadowBlur = GLOW * zf;

    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.arc(px, py, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawText(cx, cy + bob * 0.25, a, scalePx);

  requestAnimationFrame(render);
}

requestAnimationFrame(render);
