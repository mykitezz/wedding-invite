const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

/*
  Công thức tim CHUẨN – không thể sai:
  (x^2 + y^2 - 1)^3 - x^2*y^3 = 0
*/
function isHeart(x, y) {
  const a = x*x + y*y - 1;
  return (a*a*a - x*x*y*y*y) <= 0;
}

// Tạo hạt sao
const particles = [];
const COUNT = 9000;

for (let i = 0; i < COUNT; i++) {
  let x, y;
  do {
    x = (Math.random() * 2 - 1.0) * 1.4;
    y = (Math.random() * 2 - 1.2) * 1.4;
  } while (!isHeart(x, y));

  particles.push({
    x,
    y,
    r: Math.random() * 1.5 + 0.3,
    phase: Math.random() * Math.PI * 2
  });
}

function draw(time) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const scale = Math.min(canvas.width, canvas.height) * 0.28;

  for (const p of particles) {
    const twinkle = (Math.sin(time * 0.002 + p.phase) + 1) / 2;

    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${0.4 + twinkle * 0.6})`;
    ctx.arc(
      cx + p.x * scale,
      cy - p.y * scale,
      p.r,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  requestAnimationFrame(draw);
}

draw(0);
