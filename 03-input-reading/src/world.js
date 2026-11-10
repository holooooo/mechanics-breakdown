// World renderer: reads a chemistry sim (see CONTRACT.md) and draws a floating sky-island diorama.
// Pure function of (sim state, view params) — no internal clocks. Original art, procedural only.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const fract = v => v - Math.floor(v);
const hash = (n, s = 0) => { let v = Math.imul((n + 1) ^ (s * 0x27d4eb2d + 0x9e3779b9), 0x85ebca6b); v = Math.imul(v ^ (v >>> 13), 0xc2b2ae35); return ((v ^ (v >>> 16)) >>> 0) / 4294967296; };

const NOISE_GLSL = /* glsl */`
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*vnoise(p);p=p*2.03+vec2(17.1,9.7);a*=.5;}return s;}
`;

// ---------- sky presets ----------
export const SKIES = {
  dawn:  { top: '#24477e', mid: '#6f9bcf', hor: '#f0b88c', sun: '#ffd29a', sunDir: [-0.55, 0.32, -0.8], cloud: 0.55, storm: 0, fog: '#c9b8b0', light: 2.2, amb: 0.45, exposure: 0.85 },
  day:   { top: '#2462bd', mid: '#72aae4', hor: '#cfe6f2', sun: '#fff1d0', sunDir: [-0.45, 0.62, -0.55], cloud: 0.45, storm: 0, fog: '#b9d3e6', light: 2.5, amb: 0.5, exposure: 0.82 },
  storm: { top: '#1b2430', mid: '#3a4656', hor: '#66727f', sun: '#b9c4cf', sunDir: [-0.3, 0.7, -0.4], cloud: 1.0, storm: 1, fog: '#56616c', light: 0.9, amb: 0.55, exposure: 1.05 },
  dusk:  { top: '#1d1f4a', mid: '#6a4f8a', hor: '#ff9a6a', sun: '#ffb27a', sunDir: [0.6, 0.12, -0.75], cloud: 0.5, storm: 0, fog: '#a8789a', light: 1.9, amb: 0.5, exposure: 1.0 },
  night: { top: '#050a18', mid: '#101c36', hor: '#24345a', sun: '#9fb6ff', sunDir: [0.3, 0.5, -0.8], cloud: 0.35, storm: 0, fog: '#1a2440', light: 0.55, amb: 0.35, exposure: 1.1 },
};
const mixSky = (a, b, k) => {
  const out = {};
  for (const key of Object.keys(a)) {
    const x = a[key], y = b[key];
    if (typeof x === 'string') out[key] = new THREE.Color(x).lerp(new THREE.Color(y), k);
    else if (Array.isArray(x)) out[key] = x.map((v, i) => lerp(v, y[i], k));
    else out[key] = lerp(x, y, k);
  }
  return out;
};

export async function createWorld(canvas, { width = 1920, height = 1080, pixelRatio = 1, quality = 1 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 400);
  camera.position.set(10, 8, 12);

  // ---------- lights ----------
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048 * quality, 2048 * quality);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 60 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xbfdcff, 0x5a4a32, 0.7);
  scene.add(hemi);
  const fireLight = new THREE.PointLight(0xff8a3a, 0, 14, 1.6);
  scene.add(fireLight);
  const zapLight = new THREE.PointLight(0x7fe8ff, 0, 8, 1.8);
  scene.add(zapLight);
  const beaconLight = new THREE.PointLight(0xffd27a, 0, 9, 1.6);
  scene.add(beaconLight);

  // ---------- sky dome + cloud sea ----------
  const skyU = {
    uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHor: { value: new THREE.Color() },
    uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uCloud: { value: 0.5 }, uStorm: { value: 0 }, uTime: { value: 0 }, uFlash: { value: 0 },
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position.z = gl_Position.w; }`,
    fragmentShader: NOISE_GLSL + `
      uniform vec3 uTop,uMid,uHor,uSun,uSunDir; uniform float uCloud,uStorm,uTime,uFlash; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir); float y = d.y;
        vec3 c = mix(uHor, uMid, smoothstep(-0.05, 0.25, y)); c = mix(c, uTop, smoothstep(0.25, 0.9, y));
        c = mix(c, uHor*0.9, smoothstep(0.02,-0.35,y));
        float sd = max(dot(d, normalize(uSunDir)), 0.);
        c += uSun * (pow(sd, 900.)*6.0 + pow(sd, 18.)*0.35 + pow(sd,4.)*0.12) * (1.-uStorm*0.85);
        // clouds on a dome
        vec2 uv = d.xz / max(y + 0.18, 0.06);
        float n = fbm(uv*0.55 + vec2(uTime*0.012, 0.)) ;
        float n2 = fbm(uv*1.3 - vec2(uTime*0.02, 0.));
        float cov = mix(0.62, 0.32, uCloud);
        float cl = smoothstep(cov, cov+0.28, n*0.75 + n2*0.35) * smoothstep(-0.02, 0.18, y);
        vec3 cloudCol = mix(vec3(1.0,0.97,0.94), uHor*1.05, 0.35) * (0.75 + 0.35*n2);
        cloudCol = mix(cloudCol, vec3(0.32,0.36,0.42)*(0.7+0.5*n2), uStorm);
        cloudCol += uSun*pow(sd,6.)*0.6*(1.-uStorm);
        c = mix(c, cloudCol, cl*0.92);
        c += vec3(0.75,0.82,1.0)*uFlash*(0.5+0.8*cl);
        gl_FragColor = vec4(c,1.);
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -10;
  scene.add(sky);

  const seaU = { uTime: { value: 0 }, uCol: { value: new THREE.Color() }, uShade: { value: new THREE.Color() }, uSunDir: skyU.uSunDir, uSun: skyU.uSun, uFlash: skyU.uFlash, uFogCol: { value: new THREE.Color() } };
  const cloudSea = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 1, 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: seaU,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: NOISE_GLSL + `uniform float uTime,uFlash; uniform vec3 uCol,uShade,uSun,uSunDir,uFogCol; varying vec3 vW;
      void main(){ vec2 p = vW.xz*0.06; float n = fbm(p + vec2(uTime*0.01, uTime*0.004)); float n2 = fbm(p*2.7 - uTime*0.015);
        float puff = smoothstep(0.3, 0.75, n*0.8+n2*0.3);
        vec3 c = mix(uShade, uCol, puff*puff); c += uSun*0.08*puff*max(uSunDir.y,0.);
        float dist = length(vW.xz); float fade = smoothstep(160., 60., dist);
        c = mix(uFogCol, c, smoothstep(150.,30.,dist)*0.85+0.15);
        c += uFlash*0.4*puff;
        gl_FragColor = vec4(c, (0.35+0.65*puff)*fade);
        #include <colorspace_fragment>
      }`,
  }));
  cloudSea.position.y = -7.5;
  scene.add(cloudSea);

  // distant floating islets (silhouettes in fog)
  const farIslands = new THREE.Group();
  {
    const rockM = new THREE.MeshStandardMaterial({ color: 0x6f6658, roughness: 1, flatShading: true });
    const grassM = new THREE.MeshStandardMaterial({ color: 0x5f8f4a, roughness: 1, flatShading: true });
    for (let k = 0; k < 7; k++) {
      const g = new THREE.Group();
      const r = 1.2 + hash(k, 1) * 2.4;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, 0.5, 9), grassM);
      const bottom = new THREE.Mesh(new THREE.ConeGeometry(r * 0.95, r * 1.6, 9), rockM);
      bottom.rotation.x = Math.PI; bottom.position.y = -r * 0.8 - 0.2;
      g.add(top, bottom);
      const a = -3.4 + k * 0.95 + hash(k, 2) * 0.3, d = 48 + hash(k, 3) * 45;
      g.position.set(Math.cos(a) * d, -5 + hash(k, 4) * 6, Math.sin(a) * d);
      g.rotation.y = hash(k, 5) * TAU;
      farIslands.add(g);
    }
    scene.add(farIslands);
  }

  scene.fog = new THREE.Fog(0xcfe2ee, 60, 220);

  // ---------- env map for reflections (water, wet ground, ice, metal) ----------
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = sky.clone(); envScene.add(envSky);
  function bakeEnv() { const rt = pmrem.fromScene(envScene, 0.02); scene.environment = rt.texture; return rt; }

  // ---------- state textures (filled from sim each frame) ----------
  const N = 48;
  const stateA = new Float32Array(N * N * 4), stateB = new Float32Array(N * N * 4), matData = new Uint8Array(N * N * 4);
  const texA = new THREE.DataTexture(stateA, N, N, THREE.RGBAFormat, THREE.FloatType); // r ash, g wet, b burn, a fuel
  const texB = new THREE.DataTexture(stateB, N, N, THREE.RGBAFormat, THREE.FloatType); // r temp01, g charge, b ice, a steam
  const texM = new THREE.DataTexture(matData, N, N, THREE.RGBAFormat); // r mat id*20
  for (const t of [texA, texB]) { t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
  texM.magFilter = texM.minFilter = THREE.NearestFilter;
  const shared = {
    uA: { value: texA }, uB: { value: texB }, uM: { value: texM }, uTime: { value: 0 },
    uWind: { value: new THREE.Vector2() }, uData: { value: 0 }, uField: { value: new THREE.Vector4(1, 0, 0, 0) },
    uFocus: { value: new THREE.Vector4(-99, -99, 0, 1) }, uHalf: { value: 6 }, uGrid: { value: 0 },
  };

  // ---------- terrain (top + rocky underside) ----------
  const terrainMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, envMapIntensity: 0.6 });
  terrainMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, shared);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP; uniform sampler2D uA,uB,uM; uniform float uTime,uData,uHalf,uGrid; uniform vec4 uField,uFocus;
      ${NOISE_GLSL}
      vec3 inferno(float t){ t=clamp(t,0.,1.); return mix(mix(vec3(0.02,0.01,0.08),vec3(0.55,0.08,0.38),smoothstep(0.,.35,t)),mix(vec3(0.95,0.36,0.08),vec3(1.,0.95,0.6),smoothstep(.65,1.,t)),smoothstep(.3,.7,t)); }
      vec3 gEmit; float gWet;`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
      vec2 uv = (vWP.xz + uHalf) / (2.*uHalf);
      vec4 A = texture2D(uA, uv), B = texture2D(uB, uv); float mid = texture2D(uM, uv).r*255./20.;
      float n = fbm(vWP.xz*1.7), n2 = vnoise(vWP.xz*9.);
      vec3 grass = mix(vec3(0.20,0.33,0.11), vec3(0.36,0.47,0.16), n) * (0.85+0.3*n2);
      vec3 soil = mix(vec3(0.36,0.26,0.16), vec3(0.47,0.35,0.22), n2);
      vec3 stone = mix(vec3(0.42,0.43,0.42), vec3(0.58,0.58,0.55), n2);
      vec3 bed = vec3(0.16,0.24,0.22);
      vec3 base = grass;
      base = mix(base, soil, step(1.5, mid)*step(mid, 2.5));
      base = mix(base, stone, step(2.5, mid)*step(mid, 3.5));
      base = mix(base, soil*0.8, step(3.5, mid)*step(mid, 4.5));
      base = mix(base, vec3(0.30,0.32,0.34), step(4.5, mid)*step(mid, 5.5));
      base = mix(base, bed, step(5.5, mid));
      float ash = A.r, wet = A.g, burn = A.b;
      base = mix(base, vec3(0.07,0.06,0.055)*(0.8+0.4*n2), smoothstep(0.05,0.9,ash));
      gWet = smoothstep(0.25, 0.9, wet);
      base *= mix(1., 0.5, gWet);
      float ember = burn * (0.6+0.4*sin(uTime*7.+n2*20.)) + smoothstep(0.35,0.9,B.r)*ash*0.6*(0.5+0.5*vnoise(vWP.xz*6.+uTime));
      gEmit = vec3(1.0,0.32,0.06)*ember*2.2;
      // data view: per-cell quantised field + grid lines + focus outline
      vec2 cell = floor(uv*48.); vec2 cuv = (cell+0.5)/48.;
      vec4 Aq = texture2D(uA, cuv), Bq = texture2D(uB, cuv);
      vec3 dc = inferno(Bq.r)*uField.x + mix(vec3(0.05,0.08,0.12), vec3(0.25,0.6,1.0), Aq.g)*uField.y
              + mix(vec3(0.03,0.05,0.08), vec3(0.5,1.0,1.0), Bq.g)*uField.z + mix(vec3(0.05,0.04,0.02), vec3(0.85,0.7,0.3), Aq.a)*uField.w;
      vec2 gl = abs(fract(uv*48.)-0.5); float line = smoothstep(0.43, 0.49, max(gl.x, gl.y));
      vec2 fd = abs(cell - uFocus.xy); float inFocus = step(max(fd.x,fd.y), 1.5) * uFocus.z; float isCentre = step(max(fd.x,fd.y), 0.5)*uFocus.z;
      float fl = inFocus * smoothstep(0.38, 0.48, max(gl.x,gl.y));
      vec3 dataCol = mix(dc, vec3(0.0), line*0.55);
      base = mix(base, dataCol*0.35, uData);
      gEmit = mix(gEmit, dataCol*0.9, uData);
      base = mix(base, base*0.7 + 0.04, uGrid*line);
      gEmit += vec3(1.0,0.85,0.4)*fl*2.0 + vec3(1.0,0.9,0.5)*isCentre*0.25*(1.-line);
      vec4 diffuseColor = vec4(base, opacity);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.12, gWet*(1.-uData));')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += gEmit;');
  };
  const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
  const islandGroup = new THREE.Group();
  scene.add(islandGroup);

  // ---------- grass blades (instanced, GPU wind + state) ----------
  const bladeGeo = new THREE.BufferGeometry();
  {
    const p = [-0.022, 0, 0, 0.022, 0, 0, -0.016, 0.45, 0, 0.016, 0.45, 0, 0, 1, 0];
    bladeGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    bladeGeo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0.3, 0, 1, 0.3, 0, 1, 0.3, 0, 1, 0.3, 0, 1, 0.3], 3));
    bladeGeo.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]);
  }
  const grassMat = new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide, envMapIntensity: 0.3 });
  grassMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, shared);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute vec2 aCell; attribute float aRand; uniform sampler2D uA,uB; uniform float uTime,uData; uniform vec2 uWind;
      varying vec3 vGC; varying vec3 vGE;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 A = texture2D(uA, aCell), B = texture2D(uB, aCell);
      float ash = A.r, wet = A.g, burn = A.b, fuel = A.a, ice = B.b;
      float alive = clamp(fuel*1.25, 0., 1.);
      float hgt = mix(0.12, 1.0, alive) * (1. - smoothstep(0.1, 0.5, ice));
      float k = transformed.y; transformed.y *= hgt;
      vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
      float sway = sin(uTime*2.1 + ip.x*1.3 + ip.y*0.9 + aRand*6.28)*0.07 + sin(uTime*3.7 + aRand*12.)*0.03;
      vec2 bend = (uWind*0.16 + vec2(sway, sway*0.6) + vec2(0., burn*0.05)) * k*k;
      // bend expressed in instance-local space: approximate by rotating with instance yaw
      mat2 R = mat2(instanceMatrix[0][0], instanceMatrix[0][2], instanceMatrix[2][0], instanceMatrix[2][2]);
      vec2 lb = inverse(R) * bend;
      transformed.x += lb.x; transformed.z += lb.y;
      vec3 g0 = mix(vec3(0.16,0.30,0.07), vec3(0.42,0.58,0.16), aRand); g0 = mix(g0, vec3(0.62,0.62,0.26), step(0.93, aRand)*0.7);
      vec3 col = mix(g0*0.55, g0*1.15, k);
      col = mix(col, vec3(0.05,0.045,0.04), smoothstep(0.05, 0.8, ash));
      col *= mix(1.0, 0.62, smoothstep(0.3,0.9,wet)); col = mix(col, col*vec3(0.85,1.0,1.1), wet);
      col = mix(col, vec3(0.75,0.86,0.95), smoothstep(0.1,0.5,ice));
      vGC = col;
      vGE = vec3(1.0,0.38,0.08) * burn * k * 2.5 + vec3(1.,0.25,0.05)*smoothstep(0.4,0.8,B.r)*(1.-alive)*0.6;
      vGE *= (1.-uData);
      `);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vGC; varying vec3 vGE; uniform float uData;')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( vGC, opacity );')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vGE;');
  };
  let grass = null;

  // ---------- billboard particle system (flames / smoke / steam / embers) ----------
  function makeSprites(max, frag, blending, extraUniforms = {}) {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, -0.5, 1, 0, 0.5, 1, 0], 3));
    g.setIndex([0, 1, 2, 2, 1, 3]);
    const iPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    const iData = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); // w, h, seed, intensity
    iPos.setUsage(THREE.DynamicDrawUsage); iData.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', iPos); g.setAttribute('iData', iData);
    g.instanceCount = 0;
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uWind: { value: new THREE.Vector2() }, uLean: { value: 0.12 }, ...extraUniforms }]),
      vertexShader: `#include <fog_pars_vertex>
        attribute vec3 iPos; attribute vec4 iData; uniform vec2 uWind; uniform float uLean; varying vec2 vUv; varying vec4 vD;
        void main(){ vUv = position.xy + vec2(0.5,0.); vD = iData;
          vec3 base = iPos + vec3(uWind.x,0.,uWind.y)*uLean*position.y*iData.y;
          vec4 mv = viewMatrix*vec4(base,1.);
          mv.xy += vec2(position.x*iData.x, position.y*iData.y);
          vec4 mvPosition = mv; gl_Position = projectionMatrix*mv;
          #include <fog_vertex>
        }`,
      fragmentShader: `#include <fog_pars_fragment>
        uniform float uTime; varying vec2 vUv; varying vec4 vD; ${NOISE_GLSL}
        ${frag}`,
    });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false;
    return { mesh, iPos, iData, max, n: 0, mat: m,
      begin() { this.n = 0; },
      push(x, y, z, w, h, seed, k) { if (this.n >= max) return; const j = this.n++; iPos.setXYZ(j, x, y, z); iData.setXYZW(j, w, h, seed, k); },
      end() { g.instanceCount = this.n; iPos.needsUpdate = iData.needsUpdate = true; iPos.clearUpdateRanges(); iData.clearUpdateRanges(); iPos.addUpdateRange(0, this.n * 3); iData.addUpdateRange(0, this.n * 4); } };
  }
  const flames = makeSprites(9000, `void main(){
      vec2 uv = vUv; float seed = vD.z; float k = vD.w;
      float n = fbm(vec2(uv.x*2.6 + seed*7., uv.y*2.2 - uTime*3.2 - seed*3.));
      float n2 = vnoise(vec2(uv.x*6.+seed, uv.y*5. - uTime*6.));
      float w = 0.42*pow(1.-uv.y, 0.85) * (0.7+0.6*n);
      float dx = abs(uv.x-0.5 + (n-0.5)*0.32*uv.y);
      float body = smoothstep(w, w*0.25, dx) * smoothstep(0., 0.1, uv.y) * smoothstep(1.0, 0.45, uv.y + (n2-0.5)*0.35);
      if (body < 0.01) discard;
      float core = smoothstep(0.55, 1.0, body) * smoothstep(0.6, 0.05, uv.y);
      vec3 col = mix(vec3(0.75,0.10,0.02), vec3(1.0,0.42,0.05), smoothstep(0.05,0.55,body));
      col = mix(col, vec3(1.0,0.78,0.35), core);
      float a = clamp(body*1.6,0.,1.) * smoothstep(1.0, 0.55, uv.y) * k;
      gl_FragColor = vec4(col*(0.9 + core*0.9), a*0.9);
      #include <fog_fragment>
    }`, THREE.NormalBlending);
  flames.mesh.renderOrder = 5;
  const smoke = makeSprites(3000, `uniform vec3 uCol; void main(){
      vec2 uv = vUv - vec2(0.5,0.5); float r = length(uv)*2.;
      float n = fbm(vUv*3. + vD.z*11. + vec2(0., -uTime*0.4));
      float a = smoothstep(1.0, 0.2, r + (n-0.5)*0.6) * vD.w;
      if (a < 0.004) discard;
      gl_FragColor = vec4(uCol*(0.75+0.35*n), a);
      #include <fog_fragment>
    }`, THREE.NormalBlending, { uCol: { value: new THREE.Color(0.36, 0.34, 0.33) } });
  smoke.mat.uniforms.uLean.value = 0;
  smoke.mesh.renderOrder = 4;
  const steam = makeSprites(1500, `void main(){
      vec2 uv = vUv - vec2(0.5,0.5); float r = length(uv)*2.;
      float n = fbm(vUv*2.5 + vD.z*13. + vec2(0., -uTime*0.6));
      float a = smoothstep(1.0, 0.1, r + (n-0.5)*0.7) * vD.w;
      if (a < 0.004) discard;
      gl_FragColor = vec4(vec3(0.92,0.95,0.98)*(0.85+0.2*n), a);
      #include <fog_fragment>
    }`, THREE.NormalBlending);
  steam.mat.uniforms.uLean.value = 0;
  steam.mesh.renderOrder = 6;
  const glows = makeSprites(4000, `uniform vec3 uCol; void main(){
      vec2 uv = vUv - vec2(0.5,0.5); float r = length(uv)*2.;
      float a = pow(max(1.-r,0.), 2.2) * vD.w;
      if (a < 0.003) discard;
      vec3 base = vD.z < 0.5 ? uCol : vD.z < 1.5 ? vec3(0.25,0.65,1.0) : vD.z < 2.5 ? vec3(0.75,0.45,1.0) : vD.z < 3.5 ? vec3(0.6,0.95,1.0) : vec3(1.0,0.5,0.15);
      gl_FragColor = vec4(mix(base, vec3(1.), pow(max(1.-r,0.),6.)) * a * 1.6, 1.);
      #include <fog_fragment>
    }`, THREE.AdditiveBlending, { uCol: { value: new THREE.Color(1.0, 0.55, 0.15) } });
  glows.mat.uniforms.uLean.value = 0; glows.mesh.renderOrder = 7;
  const sparks = makeSprites(2000, `uniform vec3 uCol; void main(){
      vec2 uv = vUv - vec2(0.5,0.5); float r = length(uv)*2.;
      float a = pow(max(1.-r,0.), 2.0) * vD.w;
      if (a < 0.003) discard;
      gl_FragColor = vec4(mix(uCol, vec3(1.), pow(max(1.-r,0.),5.)) * a * 3., 1.);
      #include <fog_fragment>
    }`, THREE.AdditiveBlending, { uCol: { value: new THREE.Color(0.45, 0.9, 1.0) } });
  sparks.mat.uniforms.uLean.value = 0; sparks.mesh.renderOrder = 7;
  scene.add(flames.mesh, smoke.mesh, steam.mesh, glows.mesh, sparks.mesh);

  // ---------- rain ----------
  const RAIN = 5000;
  const rainGeo = new THREE.InstancedBufferGeometry();
  rainGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, -0.5, 1, 0, 0.5, 1, 0], 3));
  rainGeo.setIndex([0, 1, 2, 2, 1, 3]);
  {
    const seeds = new Float32Array(RAIN * 3);
    for (let j = 0; j < RAIN; j++) { seeds[j * 3] = hash(j, 91); seeds[j * 3 + 1] = hash(j, 92); seeds[j * 3 + 2] = hash(j, 93); }
    rainGeo.setAttribute('iSeed', new THREE.InstancedBufferAttribute(seeds, 3));
  }
  rainGeo.instanceCount = RAIN;
  const rainMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uRain: { value: 0 }, uWind: shared.uWind, uCam: { value: new THREE.Vector3() } },
    vertexShader: `attribute vec3 iSeed; uniform float uTime,uRain; uniform vec2 uWind; uniform vec3 uCam; varying float vA; varying vec2 vUv;
      void main(){ vUv = position.xy+vec2(0.5,0.);
        float fall = fract(iSeed.z - uTime*0.9);
        vec3 p = vec3((iSeed.x-0.5)*16., -0.2 + fall*11., (iSeed.y-0.5)*16.);
        vec3 dir = normalize(vec3(-uWind.x*0.18 - 0.08, 1., -uWind.y*0.18));
        vec3 side = normalize(cross(dir, normalize(uCam - p)));
        vec3 w = p + side*position.x*0.012 + dir*position.y*0.55;
        vA = step(iSeed.x, uRain) * smoothstep(0.,0.1,fall) * 0.38;
        gl_Position = projectionMatrix*viewMatrix*vec4(w,1.); }`,
    fragmentShader: `varying float vA; varying vec2 vUv; void main(){ float a = vA*smoothstep(0.,0.4,vUv.y)*(1.-abs(vUv.x-0.5)*2.); if(a<0.002) discard; gl_FragColor = vec4(vec3(0.75,0.85,0.95)*a,1.); }`,
  });
  const rain = new THREE.Mesh(rainGeo, rainMat); rain.frustumCulled = false; rain.renderOrder = 8;
  scene.add(rain);

  // ---------- electric arcs (dynamic ribbons) ----------
  const ARC_MAX = 6000;
  const arcPos = new Float32Array(ARC_MAX * 3), arcA = new Float32Array(ARC_MAX);
  const arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute('position', new THREE.BufferAttribute(arcPos, 3).setUsage(THREE.DynamicDrawUsage));
  arcGeo.setAttribute('aA', new THREE.BufferAttribute(arcA, 1).setUsage(THREE.DynamicDrawUsage));
  const arcMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `attribute float aA; varying float vA; void main(){ vA = aA; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(vec3(0.35,0.8,1.0)*vA*1.1 + vec3(0.6,0.9,1.)*vA*vA*0.5, 1.); }`,
  });
  const arcs = new THREE.Mesh(arcGeo, arcMat); arcs.frustumCulled = false; arcs.renderOrder = 9;
  scene.add(arcs);

  // ---------- glider (original character + striped canopy) ----------
  const glider = new THREE.Group();
  {
    const cloth = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });
    const cg = new THREE.BufferGeometry(); const pos = [], col = [], idx = [];
    const S = 16;
    for (let i = 0; i <= S; i++) {
      const a = (i / S - 0.5) * 2.1, x = Math.sin(a) * 0.95, y = Math.cos(a) * 0.42;
      const stripe = Math.floor(i / 2) % 2 ? [0.95, 0.88, 0.72] : [0.86, 0.24, 0.16];
      for (const z of [-0.26, 0.26]) { pos.push(x, y, z * (1 - Math.abs(i / S - 0.5) * 0.5)); col.push(...stripe); }
    }
    for (let i = 0; i < S; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); cg.setIndex(idx); cg.computeVertexNormals();
    const canopy = new THREE.Mesh(cg, cloth); canopy.position.y = 0.95; canopy.castShadow = true;
    const body = new THREE.Group();
    const jacket = new THREE.MeshStandardMaterial({ color: 0x2f5f9e, roughness: 0.8, flatShading: true });
    const skin = new THREE.MeshStandardMaterial({ color: 0xf0c9a0, roughness: 0.8 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.9, flatShading: true });
    const scarf = new THREE.MeshStandardMaterial({ color: 0xe8a33c, roughness: 0.8, flatShading: true });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.16, 4, 8), jacket); torso.position.y = 0.0;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), skin); head.position.y = 0.2;
    const hairM = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8, 0, TAU, 0, 1.6), hair); hairM.position.y = 0.215;
    const sc = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 6, 12), scarf); sc.rotation.x = Math.PI / 2; sc.position.y = 0.12;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.22), scarf); tail.position.set(0, 0.12, 0.14); tail.rotation.x = 0.4;
    const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.12, 3, 6), new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.9 })); legs.position.y = -0.18;
    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.22, 3, 6), jacket); armL.position.set(-0.11, 0.2, 0); armL.rotation.z = 0.35;
    const armR = armL.clone(); armR.position.x = 0.11; armR.rotation.z = -0.35;
    for (const m of [torso, head, legs, armL, armR]) m.castShadow = true;
    body.add(torso, head, hairM, sc, tail, legs, armL, armR);
    const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.11, 0.32, 0), new THREE.Vector3(-0.85, 1.1, 0), new THREE.Vector3(-0.11, 0.32, 0), new THREE.Vector3(-0.45, 1.33, 0),
      new THREE.Vector3(0.11, 0.32, 0), new THREE.Vector3(0.85, 1.1, 0), new THREE.Vector3(0.11, 0.32, 0), new THREE.Vector3(0.45, 1.33, 0)]),
      new THREE.LineBasicMaterial({ color: 0x3a3a3a }));
    glider.add(canopy, body, lines);
    glider.scale.setScalar(0.75);
    glider.userData.tail = tail;
  }
  scene.add(glider);

  // updraft column visual: spiral heat motes
  const UP = 700;
  const upGeo = new THREE.BufferGeometry();
  upGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(UP * 3), 3).setUsage(THREE.DynamicDrawUsage));
  upGeo.setAttribute('aA', new THREE.BufferAttribute(new Float32Array(UP), 1).setUsage(THREE.DynamicDrawUsage));
  const upMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aA; varying float vA; void main(){ vA=aA; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = 70./-mv.z * (0.6+aA); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; void main(){ float r = length(gl_PointCoord-0.5)*2.; float a = pow(max(1.-r,0.),2.)*vA; if(a<0.003) discard; gl_FragColor = vec4(vec3(1.0,0.82,0.55)*a*1.4,1.); }` });
  const updraftPts = new THREE.Points(upGeo, upMat); updraftPts.frustumCulled = false; updraftPts.renderOrder = 7;
  scene.add(updraftPts);

  // ---------- post: bloom + grade ----------
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(width * pixelRatio, height * pixelRatio, { type: THREE.HalfFloatType, samples: 4 }));
  composer.setPixelRatio(pixelRatio); composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.5, 0.45, 1.05);
  composer.addPass(bloom);
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.32 }, uGrain: { value: 0.035 }, uSat: { value: 1.08 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uFade: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime,uVig,uGrain,uSat,uFade; uniform vec3 uTint; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 col = c.rgb;
        float l = dot(col, vec3(0.2126,0.7152,0.0722)); col = mix(vec3(l), col, uSat); col *= uTint;
        vec2 d = vUv-0.5; col *= 1. - uVig*smoothstep(0.25, 0.95, length(d*vec2(1.25,1.)));
        col += (h(vUv*vec2(1920.,1080.) + fract(uTime*7.31)*100.)-0.5)*uGrain;
        col = mix(col, vec3(0.), uFade);
        gl_FragColor = vec4(col, c.a); }`,
  });
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  // ---------- per-layout static content ----------
  let sim = null, layoutKey = '', envRT = null, lastEnvKey = '';
  const dyn = { trees: [], stones: null, metal: null, ice: null, water: null, source: null, receiver: null, beam: null };
  const disposeGroup = g => { g.traverse(o => { o.geometry?.dispose?.(); }); };

  function buildIsland(s) {
    disposeGroup(islandGroup); islandGroup.clear();
    const half = (N * s.CELL) / 2; shared.uHalf.value = half;
    const C = s.CELL;
    // boundary radius per angle from mat mask
    const ANG = 128, boundary = new Float32Array(ANG);
    for (let a = 0; a < ANG; a++) {
      const th = a / ANG * TAU, cx = Math.cos(th), cz = Math.sin(th);
      let r = 0;
      for (let rr = 0; rr < half; rr += 0.02) { const i = s.cellAt(cx * rr, cz * rr); if (i < 0 || s.mat[i] === 0) break; r = rr; }
      boundary[a] = r;
    }
    const sm = new Float32Array(ANG);
    for (let a = 0; a < ANG; a++) { let acc = 0; for (let k = -3; k <= 3; k++) acc += boundary[(a + k + ANG) % ANG]; sm[a] = acc / 7; }
    const heightAt = (x, z) => {
      const fx = x / C + N / 2 - 0.5, fz = z / C + N / 2 - 0.5;
      const x0 = Math.floor(fx), z0 = Math.floor(fz), tx = fx - x0, tz = fz - z0;
      const H = (xx, zz) => { xx = clamp(xx, 0, N - 1); zz = clamp(zz, 0, N - 1); const i = zz * N + xx; return s.mat[i] ? s.height[i] : 0; };
      return lerp(lerp(H(x0, z0), H(x0 + 1, z0), tx), lerp(H(x0, z0 + 1), H(x0 + 1, z0 + 1), tx), tz);
    };
    // top disk (polar grid)
    const RINGS = 70;
    const pos = [], idx = [];
    for (let r = 0; r <= RINGS; r++) for (let a = 0; a < ANG; a++) {
      const th = a / ANG * TAU, rad = sm[a] * Math.pow(r / RINGS, 0.9) + 0.12 * (r === RINGS);
      const x = Math.cos(th) * rad, z = Math.sin(th) * rad;
      const edge = r / RINGS;
      pos.push(x, heightAt(x, z) - Math.pow(Math.max(0, edge - 0.93) / 0.07, 2) * 0.12, z);
    }
    for (let r = 0; r < RINGS; r++) for (let a = 0; a < ANG; a++) {
      const a1 = (a + 1) % ANG, p = r * ANG + a, q = r * ANG + a1, p2 = (r + 1) * ANG + a, q2 = (r + 1) * ANG + a1;
      idx.push(p, q, p2, q, q2, p2);
    }
    const topGeo = new THREE.BufferGeometry();
    topGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); topGeo.setIndex(idx); topGeo.computeVertexNormals();
    const top = new THREE.Mesh(topGeo, terrainMat); top.receiveShadow = true;
    islandGroup.add(top);
    // underside: strata cliff tapering to a point
    const LAY = 14, upos = [], ucol = [], uidx = [];
    for (let l = 0; l <= LAY; l++) {
      const f = l / LAY;
      for (let a = 0; a <= ANG; a++) {
        const aa = a % ANG, th = aa / ANG * TAU;
        const shrink = l === 0 ? 1 : Math.pow(1 - f, 0.85) * (0.97 + 0.08 * hash(aa * 31 + l, 7)) * (1 - 0.06 * Math.sin(th * 5 + l));
        const rad = (sm[aa] + 0.12) * shrink;
        const y = l === 0 ? heightAt(Math.cos(th) * sm[aa], Math.sin(th) * sm[aa]) - 0.12 : -0.25 - f * 5.2 - 0.25 * hash(aa + l * 7, 3);
        upos.push(Math.cos(th) * rad, y, Math.sin(th) * rad);
        const band = l < 2 ? [0.36, 0.27, 0.17] : (l % 3 === 0 ? [0.52, 0.45, 0.36] : l % 3 === 1 ? [0.44, 0.38, 0.31] : [0.38, 0.33, 0.28]);
        const k = 0.85 + 0.25 * hash(aa * 7 + l, 9);
        ucol.push(band[0] * k, band[1] * k, band[2] * k);
      }
    }
    for (let l = 0; l < LAY; l++) for (let a = 0; a < ANG; a++) {
      const p = l * (ANG + 1) + a, q = p + 1, p2 = p + ANG + 1, q2 = p2 + 1;
      uidx.push(p, q, p2, q, q2, p2);
    }
    const ug = new THREE.BufferGeometry();
    ug.setAttribute('position', new THREE.Float32BufferAttribute(upos, 3)); ug.setAttribute('color', new THREE.Float32BufferAttribute(ucol, 3)); ug.setIndex(uidx);
    const under = new THREE.Mesh(ug.toNonIndexed(), rockMat); under.geometry.computeVertexNormals(); under.castShadow = true; under.receiveShadow = true;
    islandGroup.add(under);
    // hanging roots / small floating rocks under the island
    for (let k = 0; k < 9; k++) {
      const th = hash(k, 40) * TAU, rr = 1.5 + hash(k, 41) * 4;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + hash(k, 42) * 0.35, 0), new THREE.MeshStandardMaterial({ color: 0x8a7a66, roughness: 1, flatShading: true }));
      rock.position.set(Math.cos(th) * (rr + 2.5), -1.5 - hash(k, 43) * 3.5, Math.sin(th) * (rr + 2.5));
      rock.userData.float = { base: rock.position.y, ph: hash(k, 44) * TAU };
      islandGroup.add(rock);
    }

    // grass instances on GRASS cells
    if (grass) { scene.remove(grass); grass.geometry.dispose(); }
    const per = Math.round(18 * quality);
    const cells = [];
    for (let i = 0; i < N * N; i++) if (s.mat[i] === 1) cells.push(i);
    const count = cells.length * per;
    const ig = bladeGeo.clone();
    const aCell = new Float32Array(count * 2), aRand = new Float32Array(count);
    grass = new THREE.InstancedMesh(ig, grassMat, count);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    let j = 0;
    for (const i of cells) {
      const cx = i % N, cz = (i / N) | 0;
      for (let k = 0; k < per; k++, j++) {
        const fx = cx + hash(j, 1), fz = cz + hash(j, 2);
        const x = (fx - N / 2) * C, z = (fz - N / 2) * C;
        pp.set(x, heightAt(x, z) - 0.01, z);
        q.setFromAxisAngle(up, hash(j, 3) * TAU);
        const hgt = 0.17 + hash(j, 4) * 0.2;
        sc.set(0.9 + hash(j, 5) * 0.8, hgt, 1);
        m4.compose(pp, q, sc); grass.setMatrixAt(j, m4);
        aCell[j * 2] = (fx) / N; aCell[j * 2 + 1] = (fz) / N; aRand[j] = hash(j, 6);
      }
    }
    ig.setAttribute('aCell', new THREE.InstancedBufferAttribute(aCell, 2));
    ig.setAttribute('aRand', new THREE.InstancedBufferAttribute(aRand, 1));
    grass.receiveShadow = true; grass.frustumCulled = false;
    scene.add(grass);

    // material id texture
    for (let i = 0; i < N * N; i++) { matData[i * 4] = s.mat[i] * 20; matData[i * 4 + 3] = 255; }
    texM.needsUpdate = true;

    // trees
    const trunkM = new THREE.MeshStandardMaterial({ color: 0x5b3d26, roughness: 1, flatShading: true });
    dyn.trees = (s.trees || []).map((t, k) => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 0.9, 6), trunkM.clone()); trunk.position.y = 0.45; trunk.castShadow = true;
      g.add(trunk);
      const leaves = [];
      for (let c = 0; c < 3; c++) {
        const lm = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.27 + hash(k * 3 + c, 8) * 0.06, 0.45, 0.28 + hash(k * 3 + c, 9) * 0.08), roughness: 0.9, flatShading: true, emissive: 0x000000 });
        const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 - c * 0.08, 0), lm);
        leaf.position.set((hash(k, 10 + c) - 0.5) * 0.3, 0.95 + c * 0.32, (hash(k, 20 + c) - 0.5) * 0.3);
        leaf.rotation.set(hash(k, 30 + c) * 3, hash(k, 31 + c) * 3, 0);
        leaf.castShadow = true; g.add(leaf); leaves.push(leaf);
      }
      g.position.set(t.x, heightAt(t.x, t.z), t.z);
      g.scale.setScalar(0.95 + hash(k, 50) * 0.35);
      islandGroup.add(g);
      return { g, trunk, leaves, x: t.x, z: t.z, base: leaves.map(l => l.material.color.clone()) };
    });

    // stones, metal, water as instanced boxes per cell
    const rockM2 = new THREE.MeshStandardMaterial({ color: 0x8a8a84, roughness: 0.95, flatShading: true });
    const stonesIdx = [], metalIdx = [], waterIdx = [];
    for (let i = 0; i < N * N; i++) { if (s.mat[i] === 3) stonesIdx.push(i); if (s.mat[i] === 5) metalIdx.push(i); if (s.mat[i] === 6) waterIdx.push(i); }
    if (stonesIdx.length) {
      const im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.2, 0), rockM2, stonesIdx.length);
      stonesIdx.forEach((i, k) => { const c = s.cellCenter(i); m4.compose(pp.set(c.x + (hash(i, 1) - 0.5) * 0.1, heightAt(c.x, c.z) + 0.03, c.z + (hash(i, 2) - 0.5) * 0.1), q.setFromEuler(new THREE.Euler(hash(i, 3) * 3, hash(i, 4) * 3, 0)), sc.set(1 + hash(i, 5) * 0.6, 0.6 + hash(i, 6) * 0.7, 1 + hash(i, 7) * 0.5)); im.setMatrixAt(k, m4); });
      im.castShadow = im.receiveShadow = true; islandGroup.add(im);
    }
    dyn.metal = null;
    if (metalIdx.length) {
      const mm = new THREE.MeshStandardMaterial({ color: 0x8d969e, roughness: 0.55, metalness: 0.6, envMapIntensity: 0.5, emissive: 0x2ad8ff, emissiveIntensity: 0 });
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(C * 0.98, 0.07, C * 0.62), mm, metalIdx.length);
      metalIdx.forEach((i, k) => { const c = s.cellCenter(i); m4.compose(pp.set(c.x, heightAt(c.x, c.z) + 0.035, c.z), q.identity(), sc.set(1, 1, 1)); im.setMatrixAt(k, m4); });
      im.castShadow = im.receiveShadow = true; islandGroup.add(im);
      dyn.metal = { im, mm, idx: metalIdx };
      // rail posts
      const postM = new THREE.MeshStandardMaterial({ color: 0x6d747a, roughness: 0.4, metalness: 0.8 });
      metalIdx.forEach((i, k) => { if (k % 4) return; const c = s.cellCenter(i); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.22, 6), postM); p.position.set(c.x, heightAt(c.x, c.z) + 0.11, c.z); p.castShadow = true; islandGroup.add(p); });
    }
    dyn.water = null;
    if (waterIdx.length) {
      const wm = new THREE.MeshStandardMaterial({ color: 0x1f5a68, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.88, envMapIntensity: 1.2 });
      wm.onBeforeCompile = sh => {
        sh.uniforms.uTime = shared.uTime;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP2;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP2 = (modelMatrix*vec4(transformed,1.)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP2; uniform float uTime;\n' + NOISE_GLSL)
          .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
            float e=0.05; vec2 pp=vWP2.xz*3.; float h0=fbm(pp+uTime*0.4), hx=fbm(pp+vec2(e,0.)+uTime*0.4), hz=fbm(pp+vec2(0.,e)+uTime*0.4);
            normal = normalize(normal + (vec3((h0-hx)/e,0.,(h0-hz)/e)*0.18) * mat3(viewMatrix));`);
      };
      const geos = [];
      waterIdx.forEach(i => { const c = s.cellCenter(i); const g = new THREE.PlaneGeometry(C, C).rotateX(-Math.PI / 2); g.translate(c.x, heightAt(c.x, c.z) + 0.05, c.z); geos.push(g); });
      const merged = mergeGeos(geos);
      const water = new THREE.Mesh(merged, wm); water.receiveShadow = true; islandGroup.add(water);
      dyn.water = water;
    }
    // ice blocks (per cell instanced, scaled by ice mass)
    const iceIdx = []; for (let i = 0; i < N * N; i++) if (s.ice[i] > 0.01 || s.layoutIce?.includes?.(i)) iceIdx.push(i);
    dyn.ice = null; dyn.iceAll = true;
    {
      const icm = new THREE.MeshStandardMaterial({ color: 0xbfe9ff, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.82, emissive: 0x2a8fc0, emissiveIntensity: 0.25, envMapIntensity: 1.6, flatShading: true });
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(C * 1.02, 0.5, C * 1.02, 1, 2, 1), icm, N * N);
      im.count = 0; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.renderOrder = 3;
      islandGroup.add(im); dyn.ice = im;
    }
    // charge source (crystal on plinth) + receiver (stone lantern with orb)
    dyn.source = null; dyn.receiver = null;
    const plinthM = new THREE.MeshStandardMaterial({ color: 0x7c7a72, roughness: 0.9, flatShading: true });
    for (const src of s.sources || []) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.3, 7), plinthM); base.position.y = 0.15; base.castShadow = true;
      const cm = new THREE.MeshStandardMaterial({ color: 0x9ff3ff, emissive: 0x44d8ff, emissiveIntensity: 0.6, roughness: 0.2, flatShading: true });
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), cm); crystal.scale.y = 1.7; crystal.position.y = 0.75; crystal.castShadow = true;
      g.add(base, crystal); g.position.set(src.x, heightAt(src.x, src.z), src.z); islandGroup.add(g);
      dyn.source = { g, crystal, cm };
    }
    for (const rc of s.receivers || []) {
      const g = new THREE.Group();
      const pillarM = new THREE.MeshStandardMaterial({ color: 0x8e887a, roughness: 0.9, flatShading: true });
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.2, 6), pillarM); p.position.y = 0.6; p.castShadow = true;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.2, 0.16, 6), pillarM); cap.position.y = 1.28; cap.castShadow = true;
      const ringM = new THREE.MeshStandardMaterial({ color: 0xb8964e, roughness: 0.35, metalness: 0.8, emissive: 0xffb84a, emissiveIntensity: 0 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 32), ringM); ring.position.y = 1.75;
      const orbM = new THREE.MeshStandardMaterial({ color: 0x555048, roughness: 0.4, emissive: 0xffc35a, emissiveIntensity: 0 });
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 2), orbM); orb.position.y = 1.75;
      const beamM = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 14, 16, 1, true), beamM); beam.position.y = 1.75 + 7;
      g.add(p, cap, ring, orb, beam); g.position.set(rc.x, heightAt(rc.x, rc.z), rc.z); islandGroup.add(g);
      dyn.receiver = { g, ring, ringM, orb, orbM, beam, beamM, rc };
    }
    dyn.heightAt = heightAt;
  }

  function mergeGeos(geos) {
    let total = 0; for (const g of geos) total += g.attributes.position.count;
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2), idx = [];
    let off = 0;
    for (const g of geos) {
      pos.set(g.attributes.position.array, off * 3); nor.set(g.attributes.normal.array, off * 3); uv.set(g.attributes.uv.array, off * 2);
      for (const i of g.index.array) idx.push(i + off);
      off += g.attributes.position.count; g.dispose();
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); m.setIndex(idx);
    return m;
  }

  // ---------- per-frame dynamic update ----------
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3();
  function updateDynamic(t, view) {
    const s = sim, C = s.CELL, H = dyn.heightAt;
    // state textures
    for (let i = 0; i < N * N; i++) {
      const o = i * 4;
      stateA[o] = s.ash[i]; stateA[o + 1] = s.wet[i]; stateA[o + 2] = s.burn[i]; stateA[o + 3] = s.fuel[i];
      stateB[o] = clamp((s.temp[i] - 20) / 600); stateB[o + 1] = s.charge[i]; stateB[o + 2] = s.ice[i]; stateB[o + 3] = s.steam[i];
    }
    texA.needsUpdate = texB.needsUpdate = true;
    const wind = s.wind || { x: 0, z: 0 };
    shared.uWind.value.set(wind.x, wind.z);
    for (const sp of [flames, smoke, steam]) { sp.mat.uniforms.uTime.value = t; sp.mat.uniforms.uWind.value.set(wind.x, wind.z); }

    // flames, embers, smoke, steam from cells
    flames.begin(); smoke.begin(); steam.begin(); glows.begin(); sparks.begin();
    let burnSum = 0, bx = 0, bz = 0;
    for (let i = 0; i < N * N; i++) {
      const b = s.burn[i];
      const cx = ((i % N) - N / 2 + 0.5) * C, cz = (((i / N) | 0) - N / 2 + 0.5) * C;
      if (b > 0.02) {
        burnSum += b; bx += cx * b; bz += cz * b;
        const y = H(cx, cz);
        const fuelK = 0.45 + 0.55 * clamp(s.fuel[i] * 1.6);
        for (let k = 0; k < 2; k++) {
          const sd = hash(i * 2 + k, 61);
          const flick = 0.85 + 0.25 * Math.sin(t * (6 + sd * 5) + sd * 40);
          flames.push(cx + (hash(i * 2 + k, 62) - 0.5) * C * 0.9, y, cz + (hash(i * 2 + k, 63) - 0.5) * C * 0.9,
            0.26 + sd * 0.16, (0.45 + sd * 0.6) * b * fuelK * flick, sd, b);
        }
        // embers rising
        for (let k = 0; k < 2; k++) {
          const n = i * 2 + k, life = fract(t * (0.35 + hash(n, 71) * 0.4) + hash(n, 72));
          const a = hash(n, 73) * TAU;
          glows.push(cx + Math.cos(a) * life * 0.4 + wind.x * life * 0.9, y + 0.2 + life * (1.6 + hash(n, 74) * 1.8), cz + Math.sin(a) * life * 0.4 + wind.z * life * 0.9,
            0.07, 0.07, 0, (1 - life) * b * 0.9);
        }
      }
      const smokeK = b * 0.6 + (s.ash[i] > 0.2 && s.temp[i] > 90 ? clamp((s.temp[i] - 90) / 300) * 0.5 : 0);
      if (smokeK > 0.03 && (i & 1) === 0) {
        const y = H(cx, cz);
        for (let k = 0; k < 2; k++) {
          const n = i * 3 + k, life = fract(t * (0.16 + hash(n, 81) * 0.1) + hash(n, 82));
          const a = hash(n, 83) * TAU, sz = 0.5 + life * 1.8;
          smoke.push(cx + Math.cos(a) * life * 0.5 + wind.x * life * 2.2, y + 0.6 + life * 4.2 - sz * 0.5, cz + Math.sin(a) * life * 0.5 + wind.z * life * 2.2,
            sz, sz, hash(n, 84), Math.sin(life * Math.PI) * smokeK * 0.2);
        }
      }
      const st = s.steam[i];
      if (st > 0.04) {
        const y = H(cx, cz);
        for (let k = 0; k < 2; k++) {
          const n = i * 5 + k, life = fract(t * (0.5 + hash(n, 91) * 0.3) + hash(n, 92));
          const sz = 0.3 + life * 1.1;
          steam.push(cx + (hash(n, 93) - 0.5) * 0.3 + wind.x * life * 0.6, y + 0.1 + life * 1.8 - sz * 0.5, cz + (hash(n, 94) - 0.5) * 0.3, sz, sz, hash(n, 95), Math.sin(life * Math.PI) * st * 0.55);
        }
      }
    }
    // tree fires
    for (const tr of dyn.trees) {
      tr.g.visible = !view.noTrees;
      if (view.noTrees) continue;
      const i = s.cellAt(tr.x, tr.z); if (i < 0) continue;
      let b = 0, ash = 0;
      for (const [dx, dz] of [[0, 0], [C, 0], [0, C], [C, C]]) { const j = s.cellAt(tr.x - C / 2 + dx, tr.z - C / 2 + dz); if (j >= 0) { b = Math.max(b, s.burn[j]); ash = Math.max(ash, s.ash[j]); } }
      tr.leaves.forEach((lf, c) => {
        lf.material.color.copy(tr.base[c]).lerp(new THREE.Color(0.06, 0.05, 0.045), clamp(ash * 1.3));
        lf.material.emissive.setRGB(1.0 * b, 0.32 * b, 0.05 * b);
        lf.material.emissiveIntensity = 1.4;
        lf.scale.setScalar(1 - 0.55 * clamp(ash * 1.2));
        if (b > 0.05) {
          for (let k = 0; k < 4; k++) {
            const sd = hash(c * 17 + k + i, 64);
            const wp = lf.getWorldPosition(p3);
            flames.push(wp.x + (sd - 0.5) * 0.4, wp.y - 0.3, wp.z + (hash(k + i, 65) - 0.5) * 0.4, 0.5 + sd * 0.3, (0.9 + sd * 0.6) * b, sd, b);
          }
        }
      });
      tr.trunk.material.color.setRGB(0.36, 0.24, 0.15).lerp(new THREE.Color(0.07, 0.06, 0.05), clamp(ash * 1.5));
    }
    // electric arcs along charged conductive neighbour pairs
    let av = 0;
    const put = (x, y, z, a) => { if (av >= ARC_MAX) return; arcPos[av * 3] = x; arcPos[av * 3 + 1] = y; arcPos[av * 3 + 2] = z; arcA[av] = a; av++; };
    const tick = Math.floor(t * 20);
    let chargeSum = 0, cxs = 0, czs = 0;
    for (let i = 0; i < N * N; i++) {
      const ch = s.charge[i]; if (ch < 0.15) continue;
      chargeSum += ch; const x0 = ((i % N) - N / 2 + 0.5) * C, z0 = (((i / N) | 0) - N / 2 + 0.5) * C; cxs += x0 * ch; czs += z0 * ch;
      for (const nb of [1, N]) {
        const j = i + nb; if (j >= N * N || (nb === 1 && (i % N) === N - 1)) continue;
        if (s.charge[j] < 0.15) continue;
        const x1 = ((j % N) - N / 2 + 0.5) * C, z1 = (((j / N) | 0) - N / 2 + 0.5) * C;
        const a = Math.min(ch, s.charge[j]) * (0.55 + 0.45 * hash(i, tick));
        const y0 = H(x0, z0) + 0.1;
        let px = x0, py = y0, pz = z0;
        const SEG = 3;
        for (let k = 1; k <= SEG; k++) {
          const f = k / SEG, jit = k < SEG ? 1 : 0;
          const nx = lerp(x0, x1, f) + (hash(i * 7 + k, tick) - 0.5) * 0.12 * jit;
          const ny = H(lerp(x0, x1, f), lerp(z0, z1, f)) + 0.1 + hash(i * 9 + k, tick + 3) * 0.16 * jit;
          const nz = lerp(z0, z1, f) + (hash(i * 11 + k, tick) - 0.5) * 0.12 * jit;
          const w = 0.007 + 0.006 * a;
          put(px, py - w, pz, a); put(nx, ny - w, nz, a); put(px, py + w, pz, a);
          put(px, py + w, pz, a); put(nx, ny - w, nz, a); put(nx, ny + w, nz, a);
          px = nx; py = ny; pz = nz;
        }
        if (hash(i, tick + 9) > 0.96) sparks.push(x0, y0 + 0.05 + hash(i, tick + 4) * 0.2, z0, 0.08, 0.08, 0, a * 0.6);
      }
    }
    arcGeo.setDrawRange(0, av); arcGeo.attributes.position.needsUpdate = arcGeo.attributes.aA.needsUpdate = true;
    zapLight.intensity = Math.min(3, chargeSum * 0.04);
    if (chargeSum > 0) zapLight.position.set(cxs / chargeSum, 0.8, czs / chargeSum);
    updateDummies(t, view.dummies); updateFx(t, view.fx); updateFighters(t, view.fighters);
    flames.end(); smoke.end(); steam.end(); glows.end(); sparks.end();

    fireLight.intensity = Math.min(4.5, burnSum * 0.05);
    if (burnSum > 0) fireLight.position.set(bx / burnSum, 2.6, bz / burnSum);

    // ice instances
    if (dyn.ice) {
      let k = 0;
      for (let i = 0; i < N * N; i++) {
        const ic = s.ice[i]; if (ic < 0.02) continue;
        const c = s.cellCenter(i), hh = 0.55 * Math.pow(ic, 0.8), sx = 0.55 + 0.45 * Math.pow(ic, 0.5);
        m4.compose(p3.set(c.x, H(c.x, c.z) + hh / 2, c.z), q4.identity(), s3.set(sx, hh / 0.5, sx)); dyn.ice.setMatrixAt(k++, m4);
      }
      dyn.ice.count = k; dyn.ice.instanceMatrix.needsUpdate = true;
    }
    // metal glow
    if (dyn.metal) { let m = 0; for (const i of dyn.metal.idx) m = Math.max(m, s.charge[i]); dyn.metal.mm.emissiveIntensity = m * 0.9 * (0.8 + 0.2 * Math.sin(t * 40)); }
    if (dyn.source) {
      const on = s.shocking ?? s.charge[s.cellAt(s.sources[0].x, s.sources[0].z)] > 0.5;
      dyn.source.crystal.rotation.y = t * 0.8; dyn.source.crystal.position.y = 0.75 + Math.sin(t * 1.6) * 0.05;
      dyn.source.cm.emissiveIntensity = on ? 2.6 + Math.sin(t * 30) * 0.6 : 0.5;
    }
    if (dyn.receiver) {
      const rc = s.receivers[0];
      const since = rc.powered && rc.poweredAt >= 0 ? t - rc.poweredAt : -1;
      const k = since < 0 ? 0 : clamp(since / 0.8);
      dyn.receiver.orbM.emissiveIntensity = k * 4; dyn.receiver.ringM.emissiveIntensity = k * 2.5;
      dyn.receiver.ring.rotation.set(Math.PI / 2 + Math.sin(t) * 0.2, t * 0.9 * k, 0);
      dyn.receiver.beamM.opacity = k * 0.35 * (0.85 + 0.15 * Math.sin(t * 5));
      beaconLight.intensity = k * 14;
      beaconLight.position.copy(dyn.receiver.g.position).add(p3.set(0, 1.8, 0));
    } else beaconLight.intensity = 0;
    // floating rocks bob
    islandGroup.children.forEach(o => { if (o.userData.float) o.position.y = o.userData.float.base + Math.sin(t * 0.6 + o.userData.float.ph) * 0.12; });

    // glider
    const gl = s.glider;
    glider.visible = !!(gl && gl.active);
    if (glider.visible) {
      glider.position.set(gl.x, gl.y, gl.z);
      const ux = (s.updraft?.x ?? 0) - gl.x, uz = (s.updraft?.z ?? 0) - gl.z, ud = Math.hypot(ux, uz) + 1e-6;
      const vx = -uz / ud + ux / ud * (ud - 1.3) * 0.8, vz = ux / ud + uz / ud * (ud - 1.3) * 0.8; // swirl + inward (matches gliderRule)
      const yaw = Math.atan2(vx, vz);
      glider.rotation.set(0.06 * Math.sin(t * 1.3), yaw, -0.22 + 0.06 * Math.sin(t * 1.9));
      glider.userData.tail.rotation.y = Math.sin(t * 9) * 0.4;
    }
    // updraft column
    const up = s.updraft || { strength: 0, x: 0, z: 0 };
    const ustr = clamp(up.strength / (view.updraftNorm || 6));
    const upos = upGeo.attributes.position, ua = upGeo.attributes.aA;
    for (let j = 0; j < UP; j++) {
      const life = fract(hash(j, 101) + t * (0.18 + hash(j, 102) * 0.12));
      const hgt = life * 7.5, ang = hash(j, 103) * TAU + hgt * 0.9 + t * 0.7;
      const rad = (0.35 + hash(j, 104) * 0.9) * (1 + hgt * 0.06);
      upos.setXYZ(j, up.x + Math.cos(ang) * rad + wind.x * hgt * 0.08, 0.4 + hgt, up.z + Math.sin(ang) * rad + wind.z * hgt * 0.08);
      ua.setX(j, Math.sin(life * Math.PI) * ustr * (view.updraftVis ?? 1) * 0.8);
    }
    upos.needsUpdate = ua.needsUpdate = true;
    updraftPts.visible = ustr * (view.updraftVis ?? 1) > 0.01;

    // rain
    rainMat.uniforms.uTime.value = t; rainMat.uniforms.uRain.value = s.raining || 0; rainMat.uniforms.uCam.value.copy(camera.position);
    rain.visible = (s.raining || 0) > 0.01;
  }


  // ---------- training dummies + elemental hit FX (episode 2) ----------
  const dummyGroup = new THREE.Group(); scene.add(dummyGroup);
  const dummies = [];
  const GSEED = { pyro: 4, hydro: 1, electro: 2, cryo: 3 };
  const ELC = { pyro: [1.0, 0.45, 0.12], hydro: [0.25, 0.65, 1.0], electro: [0.72, 0.45, 1.0], cryo: [0.6, 0.95, 1.0], anemo: [0.4, 1.0, 0.8], geo: [1.0, 0.8, 0.3], dendro: [0.55, 0.95, 0.3] };
  function makeDummy() {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.9, flatShading: true });
    const straw = new THREE.MeshStandardMaterial({ color: 0xd8b56a, roughness: 1, flatShading: true, emissive: 0x000000 });
    const cloth = new THREE.MeshStandardMaterial({ color: 0xb8433a, roughness: 0.85, flatShading: true });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.5, 7), wood); post.position.y = 0.75;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.7, 9), straw); body.position.y = 1.05;
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.1, 9), cloth); belt.position.y = 0.92;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), straw); head.position.y = 1.62;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.0, 6), wood); arm.rotation.z = Math.PI / 2; arm.position.y = 1.25;
    const tgtM = new THREE.MeshStandardMaterial({ color: 0xf2e8d0, roughness: 0.8, emissive: 0x000000 });
    const target = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), tgtM); target.position.set(0, 1.08, 0.305);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.1, 20), cloth); ring.position.set(0, 1.08, 0.31);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0x6f6a60, roughness: 1, flatShading: true })); base.position.y = 0.06;
    for (const m of [post, body, head, arm, base]) m.castShadow = true;
    g.add(post, body, belt, head, arm, target, ring, base);
    g.userData = { straw, tgtM };
    dummyGroup.add(g);
    return g;
  }
  function updateDummies(t, list) {
    list = list || [];
    while (dummies.length < list.length) dummies.push(makeDummy());
    dummies.forEach((g, k) => {
      const d = list[k]; g.visible = !!d; if (!d) return;
      const y = dyn.heightAt ? dyn.heightAt(d.x, d.z) : 0;
      const shake = (d.flash || 0) * 0.06 * Math.sin(t * 60);
      g.position.set(d.x + shake, y, d.z); g.rotation.y = d.yaw ?? 0;
      const c = ELC[d.aura] || null, k2 = d.auraK ?? 1;
      g.userData.straw.emissive.setRGB(...(c ? c.map(v => v * 0.35 * k2) : [0, 0, 0]));
      g.userData.tgtM.emissive.setRGB((d.flash || 0) * 1.2, (d.flash || 0) * 1.0, (d.flash || 0) * 0.8);
      if (c && k2 > 0.02) {   // soft aura glow around dummy
        for (let j = 0; j < 10; j++) {
          const life = fract(hash(j + k * 31, 201) + t * 0.6), a = hash(j + k * 31, 202) * TAU + t * 0.8;
          glows.push(d.x + Math.cos(a) * 0.38, y + 0.6 + life * 1.3, d.z + Math.sin(a) * 0.38, 0.14, 0.14, GSEED[d.aura] || 0, Math.sin(life * Math.PI) * 0.35 * k2);
        }
      }
    });
  }
  // fx: [{type, x, y, z, age, big}] — bursts and projectiles, pure function of age
  function updateFx(t, fx) {
    for (const f of fx || []) {
      const a = f.age; if (a < 0 || a > 1.6) continue;
      const c = ELC[f.type] || [1, 1, 1];
      const big = f.big ? 1.8 : 1;
      if (f.from && a < 0.35) {           // projectile streak
        const k = a / 0.35;
        for (let j = 0; j < 8; j++) {
          const q = Math.max(0, k - j * 0.03);
          glows.push(lerp(f.from[0], f.x, q), lerp(f.from[1], f.y, q) + Math.sin(q * Math.PI) * 0.4, lerp(f.from[2], f.z, q), 0.22 - j * 0.02, 0.22 - j * 0.02, GSEED[f.type] || 0, (1 - j / 8) * 1.2);
        }
        continue;
      }
      const b = f.from ? a - 0.35 : a; if (b < 0) continue;
      const n = Math.round(26 * big);
      for (let j = 0; j < n; j++) {
        const th = hash(j, 211 + (f.seed || 0)) * TAU, ph = (hash(j, 212 + (f.seed || 0)) - 0.3) * 1.6;
        const sp = (1.2 + hash(j, 213) * 1.6) * big, r = sp * b * (1.4 - b * 0.6);
        const life = 1 - b / 1.1; if (life <= 0) continue;
        const px = f.x + Math.cos(th) * Math.cos(ph) * r, py = f.y + Math.sin(ph) * r * 0.8 + (f.type === 'pyro' ? b * 0.8 : 0) - (f.type === 'hydro' ? b * b * 1.6 : 0), pz = f.z + Math.sin(th) * Math.cos(ph) * r;
        if (f.type === 'electro') sparks.push(px, py, pz, 0.1, 0.1, 0, life * 1.3);
        else glows.push(px, py, pz, 0.16 * big, 0.16 * big, GSEED[f.type] || 0, life * 1.1);
      }
      if (f.type === 'pyro' && b < 0.9) for (let j = 0; j < 6 * big; j++) flames.push(f.x + (hash(j, 221) - 0.5) * 0.5, f.y - 0.6, f.z + (hash(j, 222) - 0.5) * 0.5, 0.45, (0.9 + hash(j, 223)) * (1 - b) * big, hash(j, 224), 1 - b);
      if ((f.type === 'hydro' || f.steam) && b < 1.3) for (let j = 0; j < 8 * big; j++) { const life = b / 1.3; steam.push(f.x + (hash(j, 231) - 0.5) * 0.6, f.y - 0.4 + life * 1.4, f.z + (hash(j, 232) - 0.5) * 0.6, 0.5 + life, 0.5 + life, hash(j, 233), (1 - life) * (f.steam ? 0.7 : 0.35)); }
    }
  }


  // ---------- wuxia fighters (episode 3) ----------
  // pose is data: {lean, armR:[x,z], armL:[x,z], sword: angle, legSpread, crouch, drink}
  const fighters = [];
  function makeFighter(kind) {
    const enemy = kind === 'enemy';
    const g = new THREE.Group();
    const cloth = new THREE.MeshStandardMaterial({ color: enemy ? 0x5a1d1d : 0x23324a, roughness: 0.85, flatShading: true, emissive: 0x000000 });
    const cloth2 = new THREE.MeshStandardMaterial({ color: enemy ? 0x2a1414 : 0xd9d2c0, roughness: 0.9, flatShading: true });
    const skin = new THREE.MeshStandardMaterial({ color: 0xe8c4a0, roughness: 0.8 });
    const hatM = new THREE.MeshStandardMaterial({ color: enemy ? 0x8a6a3a : 0x1a1a1e, roughness: 0.9, flatShading: true });
    const steel = new THREE.MeshStandardMaterial({ color: 0xdfe6ee, roughness: 0.25, metalness: 0.9, emissive: 0x000000 });
    const sash = new THREE.MeshStandardMaterial({ color: enemy ? 0xc23a2a : 0x3a8fd8, roughness: 0.8, flatShading: true });
    const hips = new THREE.Group(); hips.position.y = 0.9; g.add(hips);
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 0.75, 8), cloth); robe.position.y = -0.3; hips.add(robe);
    const chest = new THREE.Group(); hips.add(chest);
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.55, 8), cloth); torso.position.y = 0.28; chest.add(torso);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.08, 8), sash); belt.position.y = 0.03; chest.add(belt);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), skin); head.position.y = 0.68; chest.add(head);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(enemy ? 0.34 : 0.3, 0.16, 16), hatM); hat.position.y = 0.8; chest.add(hat);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.42), sash); tail.position.set(0, 0.5, -0.2); tail.rotation.x = 0.6; chest.add(tail);
    const mkArm = side => {
      const sh = new THREE.Group(); sh.position.set(0.24 * side, 0.5, 0); chest.add(sh);
      const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.26, 3, 6), cloth); up.position.y = -0.17; sh.add(up);
      const el = new THREE.Group(); el.position.y = -0.34; sh.add(el);
      const lo = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.22, 3, 6), cloth2); lo.position.y = -0.14; el.add(lo);
      const hand = new THREE.Group(); hand.position.y = -0.3; el.add(hand);
      return { sh, el, hand };
    };
    const R = mkArm(-1), Lf = mkArm(1);
    const sword = new THREE.Group(); R.hand.add(sword);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.18, 6), hatM); sword.add(grip);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.04), sash); guard.position.y = -0.1; sword.add(guard);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.95, 0.008), steel); blade.position.y = -0.58; sword.add(blade);
    sword.rotation.x = Math.PI;
    const gourd = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshStandardMaterial({ color: 0xb8892e, roughness: 0.5 })); gourd.visible = false; Lf.hand.add(gourd);
    const legs = [];
    for (const side of [-1, 1]) { const lg = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.55, 3, 6), cloth2); lg.position.set(0.1 * side, -0.55, 0); hips.add(lg); legs.push(lg); }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.userData = { hips, chest, R, Lf, sword, steel, cloth, gourd, legs, blade };
    scene.add(g);
    return g;
  }
  const trail = makeSprites(600, `uniform vec3 uCol; void main(){ vec2 uv = vUv - vec2(0.5,0.5); float r = length(uv)*2.; float a = pow(max(1.-r,0.),1.6)*vD.w; if(a<0.003) discard; gl_FragColor = vec4(vec3(0.85,0.95,1.0)*a*1.4,1.);
      #include <fog_fragment>
    }`, THREE.AdditiveBlending);
  trail.mat.uniforms.uLean.value = 0; trail.mesh.renderOrder = 9; scene.add(trail.mesh);
  const tmpV = new THREE.Vector3();
  function updateFighters(t, list) {
    list = list || [];
    while (fighters.length < list.length) fighters.push(makeFighter(list[fighters.length].kind));
    trail.begin();
    fighters.forEach((g, k) => {
      const f = list[k]; g.visible = !!f; if (!f) return;
      const u = g.userData, P = f.pose || {};
      const y = dyn.heightAt ? dyn.heightAt(f.x, f.z) : 0;
      g.position.set(f.x, y, f.z); g.rotation.y = f.yaw || 0;
      const breathe = Math.sin(t * 2.2 + k) * 0.015;
      u.hips.position.y = 0.9 - (P.crouch || 0) * 0.22 + breathe;
      u.hips.rotation.z = (P.tilt || 0);
      u.chest.rotation.set((P.lean || 0) * 0.5, (P.twist || 0), 0);
      u.R.sh.rotation.set(-(P.armR?.[0] ?? 0.3), 0, -(P.armR?.[1] ?? 0.15));
      u.R.el.rotation.set(-(P.elbowR ?? 0.5), 0, 0);
      u.Lf.sh.rotation.set(-(P.armL?.[0] ?? 0.2), 0, (P.armL?.[1] ?? 0.2));
      u.Lf.el.rotation.set(-(P.elbowL ?? 0.6), 0, 0);
      u.sword.rotation.set(-Math.PI / 2 + (P.sword ?? 0), 0, 0);
      u.gourd.visible = !!P.drink;
      u.legs[0].rotation.x = (P.legSpread || 0) * 0.5; u.legs[1].rotation.x = -(P.legSpread || 0) * 0.5;
      u.cloth.emissive.setRGB((f.flash || 0) * 1.2, (f.flash || 0) * 0.2, (f.flash || 0) * 0.1);
      u.steel.emissive.setRGB((f.glint || 0) * 0.6, (f.glint || 0) * 0.8, (f.glint || 0) * 1.0);
      // ghost-step afterimage while invulnerable
      if (f.ghost) for (let j = 0; j < 14; j++) glows.push(f.x - Math.sin(f.yaw || 0) * 0.0 + (hash(j, 301) - 0.5) * 0.5, y + 0.3 + hash(j, 302) * 1.3, f.z + (hash(j, 303) - 0.5) * 0.5, 0.18, 0.18, f.kind === 'enemy' ? 4 : 1, f.ghost * 0.5);
      // sword trail during swing
      if (f.swing > 0) { u.blade.getWorldPosition(tmpV); for (let j = 0; j < 10; j++) trail.push(tmpV.x + (hash(j + Math.floor(t * 60), 311) - 0.5) * 0.25, tmpV.y + (hash(j, 312) - 0.5) * 0.25, tmpV.z + (hash(j, 313) - 0.5) * 0.25, 0.3, 0.3, 0, f.swing * 0.5); }
    });
    trail.end();
  }

  // ---------- public API ----------
  const camTarget = new THREE.Vector3();
  const api = {
    THREE, scene, camera, renderer,
    setSim(next) {
      sim = next;
      const key = next.layout + ':' + (next.layoutVersion || 0);
      if (key !== layoutKey) { layoutKey = key; buildIsland(next); }
    },
    /** view: {cam:{pos:[x,y,z], target:[x,y,z], fov}, sky:'day'|{a,b,k}, data, field:[t,w,c,f], grid, focus:{i, amount}, flash, fade, updraftVis, bloom, exposure} */
    render(t, view = {}) {
      // sky
      const skyP = typeof view.sky === 'object' && view.sky.a ? mixSky(SKIES[view.sky.a], SKIES[view.sky.b], view.sky.k) : mixSky(SKIES[view.sky || 'day'], SKIES[view.sky || 'day'], 0);
      skyU.uTop.value.copy(skyP.top); skyU.uMid.value.copy(skyP.mid); skyU.uHor.value.copy(skyP.hor); skyU.uSun.value.copy(skyP.sun);
      skyU.uSunDir.value.set(...skyP.sunDir).normalize(); skyU.uCloud.value = skyP.cloud; skyU.uStorm.value = skyP.storm; skyU.uTime.value = t; skyU.uFlash.value = view.flash || 0;
      seaU.uTime.value = t; seaU.uCol.value.copy(skyP.hor).lerp(new THREE.Color(1, 1, 1), 0.35).multiplyScalar(0.92); seaU.uShade.value.copy(skyP.mid).multiplyScalar(0.62); seaU.uFogCol.value.copy(skyP.fog);
      scene.fog.color.copy(skyP.fog);
      sun.color.copy(skyP.sun); sun.intensity = skyP.light + (view.flash || 0) * 3;
      sun.position.copy(skyU.uSunDir.value).multiplyScalar(30); sun.target.position.set(0, 0, 0);
      hemi.intensity = skyP.amb; hemi.color.copy(skyP.mid).lerp(new THREE.Color(1, 1, 1), 0.4); hemi.groundColor.copy(skyP.hor).multiplyScalar(0.35);
      renderer.toneMappingExposure = (view.exposure ?? 1) * skyP.exposure;
      const envKey = typeof view.sky === 'object' ? view.sky.a + view.sky.b + Math.round(view.sky.k * 4) : (view.sky || 'day');
      if (envKey !== lastEnvKey) {
        lastEnvKey = envKey;
        for (const k of Object.keys(skyU)) envSky.material.uniforms[k].value = skyU[k].value?.clone ? skyU[k].value.clone() : skyU[k].value;
        envSky.material.uniforms.uFlash.value = 0;
        envRT?.dispose(); envRT = bakeEnv();
      }
      // data view uniforms
      shared.uTime.value = t; shared.uData.value = view.data || 0; shared.uGrid.value = view.grid || 0;
      const f = view.field || [1, 0, 0, 0]; shared.uField.value.set(...f);
      if (view.focus && view.focus.i >= 0) shared.uFocus.value.set(view.focus.i % N, (view.focus.i / N) | 0, view.focus.amount ?? 1, 1);
      else shared.uFocus.value.set(-99, -99, 0, 1);
      // camera
      const c = view.cam || { pos: [10, 8, 12], target: [0, 0, 0], fov: 32 };
      camera.position.set(...c.pos); camTarget.set(...c.target); camera.lookAt(camTarget);
      if (c.roll) camera.rotateZ(c.roll);
      if (camera.fov !== c.fov) { camera.fov = c.fov || 32; camera.updateProjectionMatrix(); }
      glows.mat.uniforms.uCol.value.setRGB(...(view.glowCol || [1.0, 0.55, 0.15]));
    if (sim) updateDynamic(t, view);
      bloom.strength = view.bloom ?? 0.6;
      grade.uniforms.uTime.value = t; grade.uniforms.uFade.value = view.fade || 0;
      grade.uniforms.uSat.value = view.sat ?? 1.08;
      composer.render();
    },
    project(x, y, z) {
      const v = new THREE.Vector3(x, y, z).project(camera);
      return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height, z: v.z };
    },
    heightAt(x, z) { return dyn.heightAt ? dyn.heightAt(x, z) : 0; },
    resize(w, h) {
      width = w; height = h; renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    },
  };
  return api;
}
