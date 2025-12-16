import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const canvas = document.getElementById("webgl");
const title = document.getElementById("title3d");

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);

// ---------- Scene / Camera ----------
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 4.5, 16);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0.05, 9.0);

// ---------- Postprocessing (Bloom) - GIẢM CHÓI ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.45,   // strength ↓ (trước ~0.85)
  0.55,   // radius
  0.28    // threshold ↑ (lọc bớt chói)
);
composer.addPass(bloom);

// ---------- Lights (nhẹ) ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.18));
const key = new THREE.DirectionalLight(0xffffff, 0.35);
key.position.set(2, 3, 5);
scene.add(key);

// ---------- Heart sampling ----------
function insideHeart(x, y) {
  const a = x*x + y*y - 1;
  return (a*a*a - x*x*y*y*y) <= 0;
}
const rand = (a, b) => a + Math.random() * (b - a);

// ===== CONFIG GIẢM MẬT ĐỘ + ĐẦY ĐẦU =====
const COUNT = 9200;       // ↓ giảm mật độ (trước 14000)
const THICKNESS = 1.05;
const EDGE_RATIO = 0.32;

const positions = new Float32Array(COUNT * 3);
const sizes = new Float32Array(COUNT);
const phases = new Float32Array(COUNT);

function buildHeart() {
  let i = 0;

  const edgeCount = Math.floor(COUNT * EDGE_RATIO);
  const fillCount = COUNT - edgeCount;

  // Tuning để 2 múi trên đầy hơn và cân
  const xScale = 1.03;
  const yScale = 0.92;

  // 1) Fill
  let tries = 0;
  while (i < fillCount && tries < fillCount * 70) {
    tries++;

    // ✅ MỞ RỘNG VÙNG Y để không mất phần đầu
    let x = rand(-1.30, 1.30) / xScale;
    let y = rand(-1.25, 1.30) / yScale;  // mở lên 1.30

    if (!insideHeart(x, y)) continue;

    const z = (Math.random() * 2 - 1) * THICKNESS * (0.50 + Math.random() * 0.50);

    positions[i*3 + 0] = x * xScale * 2.00;
    positions[i*3 + 1] = y * yScale * 2.00;
    positions[i*3 + 2] = z;

    sizes[i] = rand(1.6, 3.9);  // ↓ nhỏ hơn để bớt chói
    phases[i] = rand(0, Math.PI * 2);
    i++;
  }

  // 2) Edge for crisp silhouette
  tries = 0;
  const eps = 0.018; // ↓ nhẹ để biên mượt hơn
  while (i < COUNT && tries < edgeCount * 260) {
    tries++;

    let x = rand(-1.30, 1.30) / xScale;
    let y = rand(-1.25, 1.30) / yScale;

    if (!insideHeart(x, y)) continue;

    const nearEdge = !(
      insideHeart(x + eps, y) &&
      insideHeart(x - eps, y) &&
      insideHeart(x, y + eps) &&
      insideHeart(x, y - eps)
    );
    if (!nearEdge) continue;

    const z = (Math.random() * 2 - 1) * THICKNESS;

    positions[i*3 + 0] = (x * xScale + rand(-0.010, 0.010)) * 2.00;
    positions[i*3 + 1] = (y * yScale + rand(-0.010, 0.010)) * 2.00;
    positions[i*3 + 2] = z;

    sizes[i] = rand(2.0, 4.4);  // ↓ bớt chói
    phases[i] = rand(0, Math.PI * 2);
    i++;
  }
}
buildHeart();

// Geometry
const geom = new THREE.BufferGeometry();
geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geom.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
geom.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

// Material (shader giảm alpha + bớt additive)
const mat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: {
    uTime: { value: 0 },
    uPixelRatio: { value: renderer.getPixelRatio() }
  },
  vertexShader: `
    uniform float uTime;
    uniform float uPixelRatio;
    attribute float aSize;
    attribute float aPhase;
    varying float vTw;
    varying float vDepth;

    void main() {
      vec3 p = position;

      float tw = sin(uTime * 1.9 + aPhase) * 0.5 + 0.5;
      tw = pow(tw, 1.2);     // ↓ bớt nhấp nháy chói
      vTw = tw;

      vDepth = (p.z + 1.2) / 2.4;

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;

      float size = aSize * (1.0 + tw * 0.45) * uPixelRatio;
      gl_PointSize = size * (10.0 / -mv.z);
    }
  `,
  fragmentShader: `
    varying float vTw;
    varying float vDepth;

    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);

      float core = smoothstep(0.36, 0.0, d);
      float glow = smoothstep(0.55, 0.18, d) * 0.45;

      float a = (core + glow);

      // ✅ GIẢM ALPHA tổng để đỡ chói
      a *= (0.10 + vTw * 0.55);

      // depth shading nhẹ
      a *= (0.65 + vDepth * 0.35);

      gl_FragColor = vec4(vec3(1.0), a);
    }
  `
});

const heart = new THREE.Points(geom, mat);
scene.add(heart);

// ---------- Make text readable ----------
function updateTitleStyle(yaw, pitch) {
  // nền mờ sau chữ để nổi bật (không cần sửa CSS)
  title.style.padding = "10px 16px";
  title.style.borderRadius = "999px";
  title.style.background = "rgba(0,0,0,0.28)";
  title.style.backdropFilter = "blur(6px)";
  title.style.webkitBackdropFilter = "blur(6px)";

  title.style.transform =
    `translate(-50%, -50%) ` +
    `rotateY(${yaw * 0.9}rad) rotateX(${pitch * 0.9}rad) ` +
    `skewX(${yaw * 8}deg)`;
}

// ---------- Animation ----------
const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();
  mat.uniforms.uTime.value = t;

  // xoay nhẹ, không gắt
  const yaw = Math.sin(t * 0.55) * 0.22;
  const pitch = Math.sin(t * 0.35) * 0.06;
  heart.rotation.set(pitch, yaw, 0);

  // pulse nhẹ
  const pulse = 1.0 + Math.sin(t * 1.15) * 0.018;
  heart.scale.set(pulse, pulse, pulse);

  updateTitleStyle(yaw, pitch);

  composer.render();
  requestAnimationFrame(animate);
}
animate();

// ---------- Resize ----------
window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(w, h);

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  composer.setSize(w, h);
  bloom.setSize(w, h);

  mat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
});
