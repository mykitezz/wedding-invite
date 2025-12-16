const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d", { alpha: true });

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

function insideHeart(x, y) {
  const a = x*x + y*y - 1;
  return (a*a*a - x*x*y*y*y) <= 0;
}

const NAMES = "Thành Đạt & Thanh Thúy";

// ====== TUNING (liền khối) ======
const FILL_COUNT = 4200;     // tăng nhẹ fill để “liền ruột”
const EDGE_COUNT = 900;      // giảm edge để không thành “vòng”
const BASE_SCALE = 0.235;

const SWAY = 0.11;
const PULSE = 0.016;
const DRIFT = 0.007;

const TWINKLE = 0.48;        // mềm hơn
const STAR_CHANCE = 0.09;

const VIGNETTE = 0.12;       // giảm vignette để không tách nền
const EDGE_BOOST = 0.10;     // edge chỉ nhỉnh hơn nhẹ
const EDGE_BLUR = 6;
const FILL_BLUR = 5;

function rand(a, b) { return a + Math.random() * (b - a); }
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

const pts = [];
function makePoint(x, y, edge) {
  return {
    x, y, edge,
    r: edge ? rand(0.85, 1.65) : rand(0.75, 1.45),
    phase: rand(0, Math.PI * 2),
    speed: rand(0.75, 1.55),
    dx: rand(-1, 1),
    dy: rand(-1, 1),
    // base gần nhau để “liền” (không tách lớp)
    base: edge ? rand(0.26, 0.40) : rand(0.22, 0.36),
  };
}

function build() {
  pts.length = 0;

  const xmin = -1.35, xmax = 1.35;
  const ymin = -1.35, ymax = 1.35;

  // 1) FILL: phân bố đều hơn (giảm bias về biên)
  for (let i = 0; i < FILL_COUNT; i++) {
    let x, y;
    do {
      x = rand(xmin, xmax);
      y = rand(ymin, ymax);
    } while (!insideHeart(x, y));

    // thay vì kéo về biên -> kéo “nhẹ” để vẫn có ruột
    // k lớn => gần biên hơn, nhưng vẫn giữ nhiều điểm ở giữa
    const k = Math.pow(Math.random(), 1.05); // gần 1 => phân bố đều hơn
    x *= 0.80 + 0.20 * k;
    y *= 0.80 + 0.20 * k;

    pts.push(makePoint(x, y, false));
  }

  // 2) EDGE: ít hơn và mượt hơn, không thành “vòng”
  const eps = 0.030;
  let count = 0, guard = 0;
  while (count < EDGE_COUNT && guard < EDGE_COUNT * 110) {
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

    // jitter nhỏ để biên mềm
    x += rand(-0.012, 0.012);
    y += rand(-0.012, 0.012);

    pts.push(makePoint(x, y, true));
    count++;
  }
}

build();

function swayHoriz(x, y, a) {
  return { x: x + (y * 0.52) * Math.sin(a), y };
}

function drawStar(px, py, r, alpha) {
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fill();

  const ray = r * 2.0;
  ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.45})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px - ray, py);
  ctx.lineTo(px + ray, py);
  ctx.moveTo(px, py - ray);
  ctx.lineTo(px, py + ray);
  ctx.stroke();
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

function drawText(cx, cy, shear, scalePx) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(1, 0, Math.sin(shear) * 0.20, 1, 0, 0);

  const fontSize = Math.max(18, Math.min(46, scalePx * 0.22));
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, Segoe UI, Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // ✅ nền chữ “mỏng” hơn để không tách khối
  const padX = fontSize * 0.55;
  const padY = fontSize * 0.45;
  const metrics = ctx.measureText(NAMES);
  const w = metrics.width + padX;
  const h = fontSize + padY;

  ctx.fillStyle = "rgba(0,0,0,0.16)";
  roundRect(-w/2, -h/2, w, h, h/2);
  ctx.fill();

  // extrude nhẹ
  for (let i = 6; i >= 1; i--) {
    ctx.fillStyle = `rgba(255,255,255,${0.045 + i * 0.016})`;
    ctx.fillText(NAMES, i * 0.5, -i * 0.22);
  }

  ctx.shadowColor = "rgba(255,255,255,0.18)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "rgba(255,255,255,0.98)";
  ctx.fillText(NAMES, 0, 0);

  ctx.restore();
}

let t0 = performance.now();

function tick(now) {
  const t = (now - t0) / 1000;
  const w = canvas.width, h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const scalePx = Math.min(w, h) * BASE_SCALE;

  const shear = Math.sin(t * 0.55) * SWAY;
  const bob = Math.sin(t * 0.85) * 4;
  const pulse = 1 + Math.sin(t * 1.05) * PULSE;

  // vignette nhẹ (ít tách nền)
  const vg = ctx.createRadialGradient(cx, cy, 40, cx, cy, Math.max(w, h) * 0.70);
  vg.addColorStop(0, `rgba(255,255,255,${VIGNETTE})`);
  vg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  for (const p of pts) {
    const sp = swayHoriz(p.x, p.y, shear);

    const driftX = Math.sin(t * 0.7 + p.phase) * DRIFT * p.dx;
    const driftY = Math.cos(t * 0.7 + p.phase) * DRIFT * p.dy;

    const px = cx + (sp.x + driftX) * scalePx * pulse;
    const py = (cy + bob) - (sp.y + driftY) * scalePx * pulse;

    const tw0 = (Math.sin(t * p.speed + p.phase) + 1) / 2;
    const tw = Math.pow(tw0, 1.18);

    // edge chỉ nhỉnh hơn nhẹ để “liền khối”
    let alpha = p.base + tw * TWINKLE + (p.edge ? EDGE_BOOST : 0);
    alpha = clamp01(alpha);

    ctx.shadowColor = "rgba(255,255,255,0.16)";
    ctx.shadowBlur = p.edge ? EDGE_BLUR : FILL_BLUR;

    if (tw > (1 - STAR_CHANCE * (p.edge ? 1.2 : 1.0))) {
      drawStar(px, py, p.r * 0.95, alpha);
    } else {
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawText(cx, cy + bob * 0.25, shear, scalePx);

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
