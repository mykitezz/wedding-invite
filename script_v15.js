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
scene.fog = new THREE.Fog(0x000000, 4, 14);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0.1, 8.5);

// ---------- Postprocessing (Bloom) ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.85,   // strength
  0.65,   // radius
  0.14    // threshold
);
composer.addPass(bloom);

// ---------- Lights (nhẹ thôi, chủ yếu bloom) ----------
const amb = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(amb);

const key = new THREE.DirectionalLight(0xffffff, 0.55);
key.position.set(2, 3, 5);
scene.add(key);

// ---------- Heart volume point cloud (3D) ----------
// Dùng implicit heart 2D, rồi “đùn” theo Z để có độ dày.
function insideHeart(x, y) {
  // Công thức tim chuẩn (ổn định, cân đối)
  // (x^2 + y^2 - 1)^3 - x^2*y^3 <= 0
  const a = x*x + y*y - 1;
  return (a*a*a - x*x*y*y*y) <= 0;
}

function rand(a, b) { return a + Math.random() * (b - a); }

const COUNT = 14000;     // mật độ đẹp, không bệt
const THICKNESS = 1.15;  // “dày” 3D
const EDGE_RATIO = 0.28; // tăng biên để silhouette rõ

const positions = new Float32Array(COUNT * 3);
const sizes = new Float32Array(COUNT);
const phases = new Float32Array(COUNT);

function buildHeart() {
  let i = 0;

  const edgeCount = Math.floor(COUNT * EDGE_RATIO);
  const fillCount = COUNT - edgeCount;

  // Tuning form: nở đầu tim hơn, cân trái/phải
  const xScale = 1.06;
  const yScale = 0.97;

  // (1) Fill volume
  let tries = 0;
  while (i < fillCount && tries < fillCount * 60) {
    tries++;
    let x = rand(-1.25, 1.25) / xScale;
    let y = rand(-1.20, 1.15) / yScale;

    if (!insideHeart(x, y)) continue;

    // depth bias: nhiều điểm gần giữa → “hợp khối” hơn
    const z = (Math.random() * 2 - 1) * THICKNESS * (0.55 + Math.random() * 0.45);

    positions[i*3 + 0] = x * xScale * 2.05;
    positions[i*3 + 1] = y * yScale * 2.05;
    positions[i*3 + 2] = z;

    sizes[i] = rand(2.0, 5.2);     // size point trong WebGL
    phases[i] = rand(0, Math.PI*2);
    i++;
  }

  // (2) Edge shell (biên tim rõ, không bị “thiếu đầu”)
  tries = 0;
  const eps = 0.02;
  while (i < COUNT && tries < edgeCount * 220) {
    tries++;
    let x = rand(-1.25, 1.25) / xScale;
    let y = rand(-1.20, 1.15) / yScale;

    if (!insideHeart(x, y)) continue;

    const nearEdge = !(
      insideHeart(x + eps, y) &&
      insideHeart(x - eps, y) &&
      insideHeart(x, y + eps) &&
      insideHeart(x, y - eps)
    );
    if (!nearEdge) continue;

    const z = (Math.random() * 2 - 1) * THICKNESS;

    positions[i*3 + 0] = (x * xScale + rand(-0.012, 0.012)) * 2.05;
    positions[i*3 + 1] = (y * yScale + rand(-0.012, 0.012)) * 2.05;
    positions[i*3 + 2] = z;

    sizes[i] = rand(2.8, 6.0);
    phases[i] = rand(0, Math.PI*2);
    i++;
  }
}

buildHeart();

// Geometry
const geom = new THREE.BufferGeometry();
geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geom.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
geom.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

// Material (shader để twinkle + depth fade)
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

      // twinkle (0..1)
      float tw = sin(uTime * 2.0 + aPhase) * 0.5 + 0.5;
      tw = pow(tw, 1.35); // mạnh hơn chút
      vTw = tw;

      // depth shading theo z
      vDepth = (p.z + 1.2) / 2.4;

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;

      // size attenuation theo khoảng cách
      float size = aSize * (1.0 + tw * 0.75) * uPixelRatio;
      gl_PointSize = size * (10.0 / -mv.z);
    }
  `,
  fragmentShader: `
    varying float vTw;
    varying float vDepth;

    void main() {
      // hình “hạt sao” mềm: radial falloff
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);

      // core + glow
      float core = smoothstep(0.35, 0.0, d);
      float glow = smoothstep(0.55, 0.15, d) * 0.65;

      float a = (core + glow) * (0.20 + vTw * 0.95);

      // depth: gần camera sáng hơn
      a *= (0.55 + vDepth * 0.65);

      gl_FragColor = vec4(vec3(1.0), a);
    }
  `
});

const heart = new THREE.Points(geom, mat);
scene.add(heart);

// ---------- Animation ----------
const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();
  mat.uniforms.uTime.value = t;

  // Lắc “ngang” (yaw) + chút pitch cực nhẹ để có cảm giác 3D
  const yaw = Math.sin(t * 0.55) * 0.28;
  const pitch = Math.sin(t * 0.35) * 0.08;
  heart.rotation.set(pitch, yaw, 0);

  // pulse nhẹ (rất “wedding intro”)
  const pulse = 1.0 + Math.sin(t * 1.15) * 0.02;
  heart.scale.set(pulse, pulse, pulse);

  // Chữ lắc theo tim, nằm bên trong tim (không chéo)
  // translate(-50%,-50%) giữ tâm; rotateY/rotateX tạo 3D-ish
  title.style.transform =
    `translate(-50%, -50%) ` +
    `rotateY(${yaw * 0.9}rad) rotateX(${pitch * 0.9}rad) ` +
    `skewX(${yaw * 10}deg)`;

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
