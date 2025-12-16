const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d", { alpha: true });

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

/* Heart implicit equation (giống bản đầu): (x^2+y^2-1)^3 - x^2*y^3 <= 0 */
function insideHeart(x, y) {
  const a = x*x + y*y - 1;
  return (a*a*a - x*x*y*y*y) <= 0;
}

const NAMES = "Thành Đạt & Thanh Thúy";

// ====== TUNING (thẩm mỹ) ======
const FILL_COUNT = 3200;     // ít nhưng đủ rõ
const EDGE_COUNT = 1200;     // viền giúp “gom hình” đẹp dù ít hạt
const BASE_SCALE = 0.23;     // size tim (theo min(w,h))
const SWAY = 0.14;           // lắc ngang nhẹ
const PULSE = 0.020;         // nhịp thở/pulse nhẹ
const DRIFT = 0.010;         // drift rất nhỏ (không phá form)
const TWINKLE = 0.55;        // độ nhấp nháy (mềm)
const STAR_CHANCE = 0.12;    // thỉnh thoảng hạt lóe kiểu “star”
const VIGNETTE = 0.22;       // nền vignette nhẹ

function rand(a, b) { return a + Math.random() * (b - a); }
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

// Tạo điểm tim: 1 lớp fill + 1 lớp edge
const pts = [];
function build() {
  pts.length = 0;

  // vùng lấy mẫu để không bị cụt đầu
  const xmin = -1.35, xmax = 1.35;
  const ymin = -1.35, ymax = 1.35;

  // 1) FILL
  for (let i = 0; i < FILL_COUNT; i++) {
    let x, y;
    do {
      x = rand(xmin, xmax);
      y = rand(ymin, ymax);
    } while (!insideHeart(x, y));

    // “gom hình” mà vẫn có khoảng đen: kéo hơi về biên, không đổ đặc
    const k = Math.pow(Math.random(), 0.55); // bias gần biên hơn
    x *= 0.68 + 0.32 * k;
    y *= 0.68 + 0.32 * k;

    pts.push(makePoint(x, y, false));
  }

  // 2) EDGE: phát hiện gần biên để silhouette rõ
  const eps = 0.030;
  let count = 0;
  let guard = 0;
  while (count < EDGE_COUNT && guard < EDGE_COUNT * 80) {
    guard++;
    let x = rand(xmin, xmax);
    let y = rand(ymin, ymax);
    if (!insideHeart(x, y)) continue;

    const nearEdge = !(
      insideHeart(x + eps, y) &&
      insideHeart(x - eps, y) &&
      insideHeart(x, y + eps) &&
      insideHeart(x, y - eps)
    );
    if (!nearEdge) continue;

    // edge ít jitter để đường viền mượt
    x += rand(-0.010, 0.010);
    y += rand(-0.010, 0.010);

    pts.push(makePoint(x, y, true));
    count++;
  }
}

function makePoint(x, y, edge) {
  return {
    x, y,
    edge,
    // kích thước: edge hơi to hơn 1 chút
    r: edge ? rand(0.9, 1.8) : rand(0.7, 1.5),
    // twinkle riêng từng hạt
    phase: rand(0, Math.PI * 2),
    speed: rand(0.7, 1.6),
    // drift riêng (siêu nhỏ)
    dx: rand(-1, 1),
    dy: rand(-1, 1),
    // độ sáng base: edge sáng hơn chút để rõ hình
    base: edge ? rand(0.35, 0.55) : rand(0.18, 0.38),
  };
}

build();

// Shear ngang (lắc “ngang”, không xoay chéo)
function swayHoriz(x, y, a) {
  return { x: x + (y * 0.55) * Math.sin(a), y };
}

// vẽ “hạt sao” nhẹ: chấm tròn + 4 tia mờ khi lóe
function drawStar(px, py, r, alpha) {
  // core
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fill();

  // rays (mềm)
  const ray = r * 2.2;
  ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.55})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px - ray, py);
  ctx.lineTo(px + ray, py);
  ctx.moveTo(px, py - ray);
  ctx.lineTo(px, py + ray);
  ctx.stroke();
}

function drawText(cx, cy, shear, scalePx) {
  ctx.save();
  ctx.translate(cx, cy);

  // shear ngang đồng bộ với tim
  ctx.transform(1, 0, Math.sin(shear) * 0.22, 1, 0, 0);

  // chữ nằm gọn trong tim
  const fontSize = Math.max(18, Math.min(46, scalePx * 0.22));
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, Segoe UI, Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // nền mờ sau chữ để đọc rõ nhưng vẫn sang
  const padX = fontSize * 0.65;
  const padY = fontSize * 0.55;
  const metrics = ctx.measureText(NAMES);
  const w = metrics.width + padX;
  const h = fontSize + padY;

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  roundRect(-w/2, -h/2, w, h, h/2);
  ctx.fill();

  // extrude nhẹ (3D-ish)
  for (let i = 7; i >= 1; i--) {
    ctx.fillStyle = `rgba(255,255,255,${0.05 + i * 0.018})`;
    ctx.fillText(NAMES, i * 0.55, -i * 0.25);
  }

  ctx.shadowColor = "rgba(255,255,255,0.20)";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "rgba(255,255,255,0.98)";
  ctx.fillText(NAMES, 0, 0);

  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

let t0 = performance.now();

function draw(now) {
  const t = (now - t0) / 1000;

  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;

  const scalePx = Math.min(w, h) * BASE_SCALE;

  // chuyển động mềm: sway + bob + pulse
  const shear = Math.sin(t * 0.55) * SWAY;
  const bob = Math.sin(t * 0.85) * 5;
  const pulse = 1 + Math.sin(t * 1.05) * PULSE;

  // vignette nền (tạo chiều sâu)
  const vg = ctx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(w, h) * 0.65);
  vg.addColorStop(0, `rgba(255,255,255,${VIGNETTE})`);
  vg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  // draw particles
  for (const p of pts) {
    const sp = swayHoriz(p.x, p.y, shear);

    // drift siêu nhỏ (mềm, không phá form)
    const driftX = Math.sin(t * 0.7 + p.phase) * DRIFT * p.dx;
    const driftY = Math.cos(t * 0.7 + p.phase) * DRIFT * p.dy;

    const px = cx + (sp.x + driftX) * scalePx * pulse;
    const py = (cy + bob) - (sp.y + driftY) * scalePx * pulse;

    // twinkle mềm
    const tw0 = (Math.sin(t * p.speed + p.phase) + 1) / 2; // 0..1
    const tw = Math.pow(tw0, 1.25);

    // alpha tổng: edge rõ, fill mềm
    const alpha = clamp01(p.base + tw * TWINKLE);

    // glow rất nhẹ (không chói)
    ctx.shadowColor = "rgba(255,255,255,0.18)";
    ctx.shadowBlur = p.edge ? 8 : 5;

    // thỉnh thoảng mới lóe sao
    if (tw > (1 - STAR_CHANCE * (p.edge ? 1.25 : 1.0))) {
      drawStar(px, py, p.r * 0.95, alpha);
    } else {
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // chữ nằm trong tim
  drawText(cx, cy + bob * 0.25, shear, scalePx);

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
