const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d", { alpha: true });

function resize(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
addEventListener("resize", resize);
resize();

/* Heart implicit: (x^2+y^2-1)^3 - x^2*y^3 <= 0 */
function insideHeart(x, y){
  const a = x*x + y*y - 1;
  return (a*a*a - x*x*y*y*y) <= 0;
}
const rand = (a,b)=>a+Math.random()*(b-a);
const clamp01 = (v)=>Math.max(0, Math.min(1, v));

const NAMES = "Thành Đạt & Thanh Thúy";

// ===== LOOK TUNING =====
const COUNT = 5200;          // ít nhưng vẫn đủ rõ (không bệt)
const DEPTH = 0.55;          // “độ dày” tim (0..1)
const BASE_SCALE = 0.235;    // size tim
const SWAY = 0.10;           // lắc ngang nhẹ
const PULSE = 0.015;         // nhịp thở
const DRIFT = 0.006;         // drift rất nhỏ
const TWINKLE = 0.45;        // nhấp nháy mềm
const STAR_CHANCE = 0.08;    // ít “tia sao” để sang

// vignette nền nhẹ để có chiều sâu
const VIGNETTE = 0.11;

// ===== Build 3D-ish particles (x,y,z) =====
const pts = [];

function build(){
  pts.length = 0;

  const xmin = -1.35, xmax = 1.35;
  const ymin = -1.35, ymax = 1.35;

  for (let i=0;i<COUNT;i++){
    let x,y;
    do {
      x = rand(xmin, xmax);
      y = rand(ymin, ymax);
    } while(!insideHeart(x,y));

    // phân bố đẹp: vừa có ruột vừa có khoảng đen
    const k = Math.pow(Math.random(), 0.95); // gần 1 -> đều
    x *= 0.82 + 0.18 * k;
    y *= 0.82 + 0.18 * k;

    // z depth: bias nhiều điểm gần giữa để “liền khối”
    const z = (Math.random()*2 - 1) * DEPTH * (0.55 + Math.random()*0.45);

    pts.push({
      x,y,z,
      r: rand(0.75, 1.55),
      phase: rand(0, Math.PI*2),
      speed: rand(0.75, 1.55),
      base: rand(0.18, 0.34),
      dx: rand(-1,1),
      dy: rand(-1,1),
    });
  }
}
build();

// shear ngang (không xoay chéo)
function swayHoriz(x, y, a){
  return { x: x + (y*0.52) * Math.sin(a), y };
}

function drawStar(px, py, r, alpha){
  // core
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI*2);
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fill();

  // soft rays
  const ray = r * 2.0;
  ctx.strokeStyle = `rgba(255,255,255,${alpha*0.35})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px-ray, py); ctx.lineTo(px+ray, py);
  ctx.moveTo(px, py-ray); ctx.lineTo(px, py+ray);
  ctx.stroke();
}

function roundRect(x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

function drawText(cx, cy, shear, scalePx){
  ctx.save();
  ctx.translate(cx, cy);

  // shear ngang đồng bộ với tim
  ctx.transform(1, 0, Math.sin(shear)*0.18, 1, 0, 0);

  // vị trí chữ: 1/3 từ trên xuống trong tim
  // (tim center ở cy, nên kéo lên một đoạn)
  const yOffset = -scalePx * 0.18;
  ctx.translate(0, yOffset);

  const fontSize = Math.max(18, Math.min(50, scalePx * 0.23));
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, Segoe UI, Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // nền “glass” mỏng, không tách khối
  const padX = fontSize * 0.70;
  const padY = fontSize * 0.55;
  const textW = ctx.measureText(NAMES).width + padX;
  const textH = fontSize + padY;

  // glass plate
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  roundRect(-textW/2, -textH/2, textW, textH, textH/2);
  ctx.fill();

  // highlight viền glass nhẹ
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;
  roundRect(-textW/2, -textH/2, textW, textH, textH/2);
  ctx.stroke();

  // extrude 3D-ish
  for (let i=8;i>=1;i--){
    ctx.fillStyle = `rgba(255,255,255,${0.045 + i*0.016})`;
    ctx.fillText(NAMES, i*0.55, -i*0.25);
  }

  // main
  ctx.shadowColor = "rgba(255,255,255,0.25)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "rgba(255,255,255,0.98)";
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

  // vignette
  const vg = ctx.createRadialGradient(cx, cy, 40, cx, cy, Math.max(w,h)*0.70);
  vg.addColorStop(0, `rgba(255,255,255,${VIGNETTE})`);
  vg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = vg;
  ctx.fillRect(0,0,w,h);

  // sort by z (far -> near) để có cảm giác depth
  pts.sort((a,b)=>a.z-b.z);

  for (const p of pts){
    const sp = swayHoriz(p.x, p.y, shear);

    // micro drift
    const driftX = Math.sin(t*0.7 + p.phase) * DRIFT * p.dx;
    const driftY = Math.cos(t*0.7 + p.phase) * DRIFT * p.dy;

    // pseudo perspective theo z: gần -> to + sáng
    const zf = 1 + p.z * 0.55;

    const px = cx + (sp.x + driftX) * scalePx * pulse * zf;
    const py = (cy + bob) - (sp.y + driftY) * scalePx * pulse * zf;

    const tw0 = (Math.sin(t*p.speed + p.phase) + 1) / 2;
    const tw = Math.pow(tw0, 1.18);

    // alpha: base + twinkle, thêm depthLight theo z
    const depthLight = 0.55 + (p.z + DEPTH) / (2*DEPTH) * 0.45; // 0.55..1
    let alpha = (p.base + tw * TWINKLE) * depthLight;
    alpha = clamp01(alpha);

    // radius: theo z
    const rr = p.r * zf;

    // glow mềm (không chói)
    ctx.shadowColor = "rgba(255,255,255,0.16)";
    ctx.shadowBlur = 6 * zf;

    if (tw > (1 - STAR_CHANCE)){
      drawStar(px, py, rr * 0.95, alpha);
    } else {
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.arc(px, py, rr, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // chữ tại 1/3, nổi bật
  drawText(cx, cy + bob*0.25, shear, scalePx);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
