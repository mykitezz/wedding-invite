const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

/* ==== HEART FORMULA – chỉnh để đầu tim đầy hơn ==== */
function isHeart(x, y) {
  // scale y nhẹ để 2 múi trên đầy hơn
  y *= 0.92;
  const a = x*x + y*y - 1;
  return (a*a*a - x*x*y*y*y) <= 0;
}

/* ==== CONFIG ==== */
const NAMES = "Thành Đạt & Thanh Thúy";

const COUNT = 9000;           // ↓ giảm mật độ (~15–20%)
const BASE_SCALE = 0.22;      // kích thước tim
const SWAY = 0.18;            // lắc NGANG (rad)
const TWINKLE_POWER = 1.4;    // nhấp nháy vừa phải
const GLOW = 8;

/* ==== CREATE PARTICLES ==== */
const particles = [];
for (let i = 0; i < COUNT; i++) {
  let x, y;
  do {
    x = (Math.random() * 2 - 1.0) * 1.35;
    y = (Math.random() * 2 - 1.1) * 1.35;
  } while (!isHeart(x, y));

  particles.push({
    x,
    y,
    r: Math.random() * 1.5 + 0.4,
    phase: Math.random() * Math.PI * 2,
    speed: 0.8 + Math.random() * 1.4
  });
}

/* ==== HORIZONTAL SWAY (XOAY NGANG) ==== */
function swayX(x, y, a) {
  return {
    x: x + Math.sin(a) * y * 0.35,
    y
  };
}

/* ==== DRAW TEXT INSIDE HEART ==== */
function drawText(cx, cy, sway, scale) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(1, 0, sway * 0.45, 1, 0, 0); // nghiêng NGANG nhẹ

  const fontSize = Math.max(18, Math.min(46, scale * 190));
  ctx.font = `800 ${fontSize}px system-ui, -apple-system, Segoe UI, Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // extrude nhẹ
  for (let i = 6; i >= 1; i--) {
    ctx.fillStyle = `rgba(255,255,255,${0.05 + i * 0.02})`;
    ctx.fillText(NAMES, i * 0.6, -i * 0.3);
  }

  ctx.fillStyle = "rgba(255,255,255,0.98)";
  ctx.shadowColor = "rgba(255,255,255,0.25)";
  ctx.shadowBlur = 16;
  ctx.fillText(NAMES, 0, 0);

  ctx.restore();
}

let t0 = performance.now();

function draw(now) {
  const t = (now - t0) / 1000;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const scale = Math.min(canvas.width, canvas.height) * BASE_SCALE;

  // lắc NGANG (không xoay chéo)
  const sway = Math.sin(t * 0.7) * SWAY;
  const bob = Math.sin(t * 0.9) * 6;

  /* ==== PARTICLES ==== */
  for (const p of particles) {
    const sp = swayX(p.x, p.y, sway);

    const tw0 = (Math.sin(t * p.speed + p.phase) + 1) / 2;
    const tw = Math.pow(tw0, TWINKLE_POWER);
    const alpha = 0.18 + tw * 0.75;

    const px = cx + sp.x * scale;
    const py = cy + bob - sp.y * scale;

    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,0.20)";
    ctx.shadowBlur = GLOW;

    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.arc(px, py, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ==== TEXT INSIDE HEART ==== */
  drawText(cx, cy + bob * 0.4, sway, BASE_SCALE);

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
