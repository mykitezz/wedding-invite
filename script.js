const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d", { alpha: true });

function resize(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
addEventListener("resize", resize);
resize();

// Heart implicit: (x^2+y^2-1)^3 - x^2*y^3 <= 0
function insideHeart(x, y){
  const a = x*x + y*y - 1;
  return (a*a*a - x*x*y*y*y) <= 0;
}
const rand = (a,b)=>a+Math.random()*(b-a);
const clamp01 = (v)=>Math.max(0, Math.min(1, v));
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

const NAMES = "Thành Đạt & Thanh Thúy";

// ===== LOOK =====
const COUNT = 5200;         // tổng điểm giữ lại (đủ đẹp, không bệt)
const BASE_SCALE = 0.235;

const SWAY = 0.11;
const PULSE = 0.016;
const DRIFT = 0.007;

const TWINKLE = 0.45;
const STAR_CHANCE = 0.08;

const VIGNETTE = 0.10;

// “độ dày” giả 3D nhẹ
const DEPTH = 0.40;

// ===== Build points with EDGE-GRADIENT density =====
// Ý tưởng: tạo nhiều candidate rồi “lọc” theo độ gần biên.
// Gần biên -> xác suất giữ cao hơn + sáng hơn.
const pts = [];
function edgeDistanceHint(x, y){
  // Ước lượng “gần biên” bằng cách kiểm tra neighbor
  // inside nhiều hướng => sâu trong tim (dist lớn)
  // thiếu 1-2 hướng => gần biên (dist nhỏ)
  const e = 0.028;
  let ok = 0;
  if (insideHeart(x+e, y)) ok++;
  if (insideHeart(x-e, y)) ok++;
  if (insideHeart(x, y+e)) ok++;
  if (insideHeart(x, y-e)) ok++;
  // ok=4 => trong sâu, ok=0..2 => sát biên
  // return edgeFactor 0..1 (1 = sát biên)
  return clamp01((4 - ok) / 4);
}

function build(){
  pts.length = 0;

  // Candidate nhiều hơn COUNT để lọc theo gradient
  const CANDIDATES = Math.floor(COUNT * 3.2);

  const xmin = -1.35, xmax = 1.35;
  const ymin = -1.35, ymax = 1.35;

  while (pts.length < COUNT) {
    // lấy 1 batch candidate rồi lọc
    for (let k = 0; k < 900 && pts.length < COUNT; k++){
      let x,y;
      do {
        x = rand(xmin, xmax);
        y = rand(ymin, ymax);
      } while (!insideHeart(x,y));

      // phân bố đẹp: vẫn có ruột nhưng không trống
      const m = Math.pow(Math.random(), 1.05);
      x *= 0.84 + 0.16 * m;
      y *= 0.84 + 0.16 * m;

      // edge factor 0..1 (1 sát biên)
      const ef = edgeDistanceHint(x, y);

      // ✅ Gradient mật độ: gần biên dễ được giữ hơn
      // trong sâu: keep ~ 0.25..0.45
      // sát biên:  keep ~ 0.75..0.95
      const keepProb = 0.28 + 0.67 * Math.pow(ef, 0.65);

      if (Math.random() > keepProb) continue;

      // depth nhẹ
      const z = (Math.random()*2 - 1) * DEPTH * (0.55 + Math.random()*0.45);
      const zf = 1 + z * 0.55;

      // alpha theo gradient: biên sáng hơn chút nhưng không thành “vòng”
      const edgeLight = 0.85 + 0.35 * Math.pow(ef, 1.1); // ~0.85..1.2

      pts.push({
        x,y,z,zf,
        ef,
        r: rand(0.75, 1.55) * (0.9 + 0.2 * ef), // biên hơi to hơn nhẹ
        phase: rand(0, Math.PI*2),
        speed: rand(0.75, 1.55),
        base: rand(0.16, 0.30) * edgeLight,
        dx: rand(-1,1),
        dy: rand(-1,1),
      });
    }

    // nếu khó fill đủ (hiếm), giảm nhẹ yêu cầu
    if (pts.length < COUNT && pts.length > CANDIDATES) break;
  }
}
build();

// shear ngang
function swayHoriz(x, y, a){
  return { x: x + (y*0.52) * Math.sin(a), y };
}

function drawStar(px, py, r, alpha){
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI*2);
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fill();

  const ray = r * 2.0;
  ctx.strokeStyle = `rgba(255,255,255,${alpha*0.35})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px-ray, py); ctx.lineTo(px+ray, py);
  ctx.moveTo(px, py-ray); ctx.lineTo(px, py+ray);
  ctx.stroke();
}

function drawTextInsideHeart(cx, cy, shear, scalePx){
  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(1, 0, Math.sin(shear)*0.18, 1, 0, 0);

  // ✅ 1/3 từ trên trong tim: đẩy lên vừa đủ, nhưng vẫn nằm trong
  const yOffset = -scalePx * 0.18;
  ctx.translate(0, yOffset);

  // Auto-fit để chắc chắn chữ nằm trong tim
  // bề ngang “an toàn” trong tim tại vị trí yOffset:
  // dùng số đo thực nghiệm ổn định (khoảng 1.25*scale)
  const safeW = scalePx * 2.05; // khung an toàn trong tim
  let fontSize = Math.max(18, Math.min(50, scalePx * 0.23));

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // giảm font nếu vượt safeW
  while (fontSize > 16) {
    ctx.font = `900 ${fontSize}px system-ui, -apple-system, Segoe UI, Arial`;
    const w = ctx.measureText(NAMES).width;
    if (w <= safeW) break;
    fontSize -= 1;
  }

  // ✅ làm chữ nổi bật: glow + extrude + outline mỏng
  // extrude
  for (let i=8;i>=1;i--){
    ctx.fillStyle = `rgba(255,255,255,${0.04 + i*0.016})`;
    ctx.fillText(NAMES, i*0.55, -i*0.25);
  }

  // outline mỏng để tách nền sao
  ctx.lineWidth = Math.max(2, fontSize * 0.06);
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.strokeText(NAMES, 0, 0);

  // main glow
  ctx.shadowColor = "rgba(255,255,255,0.35)";
  ctx.shadowBlur = 22;
  ctx.fillStyle = "rgba(255,255,255,0.985)";
  ctx.fillText(NAMES, 0, 0);

  ctx.restore();
}

let t0 = performance.now();

function frame(now){
  const t = (now - t0) / 1000;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);

  const cx = w/2, cy = h/2;
  const scalePx = Math.min(w,h) * BASE_SCALE;

  const shear = Math.sin(t*0.55) * SWAY;
  const bob = Math.sin(t*0.85) * 3.6;
  const pulse = 1 + Math.sin(t*1.05) * PULSE;

  // vignette nhẹ
  const vg = ctx.createRadialGradient(cx, cy, 50, cx, cy, Math.max(w,h)*0.72);
  vg.addColorStop(0, `rgba(255,255,255,${VIGNETTE})`);
  vg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = vg;
  ctx.fillRect(0,0,w,h);

  // sort theo z để có “độ dày”
  pts.sort((a,b)=>a.z-b.z);

  for (const p of pts){
    const sp = swayHoriz(p.x, p.y, shear);

    const driftX = Math.sin(t*0.7 + p.phase) * DRIFT * p.dx;
    const driftY = Math.cos(t*0.7 + p.phase) * DRIFT * p.dy;

    const px = cx + (sp.x + driftX) * scalePx * pulse * p.zf;
    const py = (cy + bob) - (sp.y + driftY) * scalePx * pulse * p.zf;

    const tw0 = (Math.sin(t*p.speed + p.phase) + 1)/2;
    const tw = Math.pow(tw0, 1.18);

    // alpha + depth
    // ef tăng => gần biên => sáng hơn nhẹ, nhưng không “đóng vòng”
    const edgeBoost = 0.85 + 0.35 * Math.pow(p.ef, 0.9);
    const depthLight = 0.70 + (p.z + DEPTH) / (2*DEPTH) * 0.30;

    let alpha = (p.base + tw * TWINKLE) * edgeBoost * depthLight;
    alpha = clamp01(alpha);

    const rr = p.r * p.zf;

    ctx.shadowColor = "rgba(255,255,255,0.14)";
    ctx.shadowBlur = 6 * p.zf;

    if (tw > (1 - STAR_CHANCE * (0.85 + 0.4*p.ef))) {
      drawStar(px, py, rr*0.95, alpha);
    } else {
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.arc(px, py, rr, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // ✅ chữ nằm bên trong tim (1/3) + nổi bật
  drawTextInsideHeart(cx, cy + bob*0.25, shear, scalePx);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
