const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const NAMES = "Thành Đạt & Thanh Thúy";

// ===== CONFIG =====
const COUNT = 9500;         // mật độ vừa
const DEPTH_LAYERS = 18;    // độ “dày” khối 3D (tăng = hợp nhất hơn)
const DEPTH = 0.35;         // chiều sâu (0..1)
const BASE_SCALE = 0.24;    // size tim
const SWAY = 0.22;          // lắc ngang
const TWINKLE_POWER = 1.45;
const GLOW = 7;

// ===== Parametric heart (đầu tim đầy + cân) =====
// x = 16 sin^3(t)
// y = 13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t)
function heartXY(t) {
  const s = Math.sin(t);
  const c = Math.cos(t);
  const x = 16 * s * s * s;
  const y = 13 * c - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
  return { x, y };
}

// Normalize to [-1..1] box
// x range ~ [-16..16], y range ~ [-17..13]
function normHeart(p) {
  return {
    x: p.x / 18,          // scale x
    y: (p.y + 2) / 18     // shift+scale y to center nicely
  };
}

function rand(a,b){ return a + Math.random()*(b-a); }

// ===== Build 3D particles: volume + edge =====
const pts = [];

function build() {
  pts.length = 0;

  // 1) Volume: sample layers along depth, and sample t along curve but jitter inward
  for (let i = 0; i < COUNT; i++) {
    const t = Math.random() * Math.PI * 2;
    const p = normHeart(heartXY(t));

    // inward jitter: pull points toward center for solid fill
    const k = Math.pow(Math.random(), 1.8); // more points closer to boundary but still fill
    const jx = p.x * (0.72 + 0.28 * k) + rand(-0.02, 0.02);
    const jy = p.y * (0.72 + 0.28 * k) + rand(-0.02, 0.02);
