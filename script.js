const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

/* Heart formula */
function isHeart(x, y) {
  const a = x*x + y*y - 1;
  return (a*a*a - x*x*y*y*y) <= 0;
}

// ===== CONFIG =====
const NAMES = "Thành Đạt & Thanh Thúy";

const COUNT = 11000;          // độ dày hạt
const BASE_SCALE = 0.22;      // nhỏ hơn (trước bạn đang ~0.28)
const ROT_STRENGTH = 0.22;    // độ xoay (rad) nhẹ
const TWINKLE_POWER = 1.6;    // nhấp nháy mạnh hơn (>=1 là mạnh)
const GLOW = 10;              // glow hạt

// ===== Create particles =====
const particles = [];
for (let i = 0; i < COUNT; i++) {
  let x, y;
  do {
    x = (Math.random() * 2 - 1.0) * 1.4;
    y = (Math.random() * 2 - 1.2) * 1.4;
  } while (!isHeart(x, y));

  particles.push({
    x, y,
    r: Math.random() * 1.6 + 0.35,
    phase: Math.random() * Math.PI * 2,
    speed: 0.8 + Math.random() * 1.6
  });
}

// ===== Helpers for rotating 2D =====
function rotate2D(x, y, a) {
  const ca = Math.cos(a), sa = Math.sin(a);
  return { x: x * ca - y * sa, y: x * sa + y * ca };
}

// ===== Draw 3D-ish text (extrude) =====
function draw3DText(cx, cy, rot, scale) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);

  const fontSize = Math.max(18, Math.min(56, scale * 220)); // theo kích thước tim
  ctx.font = `800 ${fontSize}px system-ui, -apple-system, "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // extrude direction theo góc xoay
  const ex = Math.sin(rot) * 10;
  const ey = -Math.cos(rot) * 6;

  const layers = 10;
  for (let i = layers; i >= 1; i--) {
    ctx.fillStyle = `rgba(255,255,255,${0.06 + i * 0.012})`;
    ctx.fillText(NAMES, ex * (i / layers), ey * (i / layers));
  }

  ctx.fillStyle = "rgba(255,255,255,0.98)";
  ctx.shadowColor = "rgba(255,255,255,0.28)";
  ctx.shadowBlur = 18;
  ctx.fillText(NAMES, 0, 0);

  ctx.restore();
}

let t0 = performance.now();

function draw(now) {
  const t = (now - t0) / 1000;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Xoay nhẹ + lắc nhẹ
  const rot = Math.sin(t * 0.7) * ROT_STRENGTH;
  const bob = Math.sin(t * 1.0) * 8; // lắc lên xuống
  const scale = Math.min(canvas.width, canvas.height) * BASE_SCALE;

  // Vignette nhẹ (tăng cảm giác nổi)
  const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(canvas.width, canvas.height) * 0.6);
  g.addColorStop(0, "rgba(255,255,255,0.05)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Hạt sao
  for (const p of particles) {
    const rp = rotate2D(p.x, p.y, rot);

    // twinkle mạnh hơn: nâng twinkle lên power
    const baseTw = (Math.sin(t * p.speed + p.phase) + 1) / 2; // 0..1
    const tw = Math.pow(baseTw, TWINKLE_POWER);

    const alpha = 0.15 + tw * 0.85;

    const px = cx + rp.x * scale;
    const py = (cy + bob) - rp.y * scale;

    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,0.22)";
    ctx.shadowBlur = GLOW;

    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.arc(px, py, p.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Chữ ở giữa tim, xoay + bob cùng tim
  draw3DText(cx, cy + bob, rot, BASE_SCALE);

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
