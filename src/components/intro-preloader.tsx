
"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const noiseHelpers = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 a0 = x - floor(x + 0.5);
    vec3 g = a0 * vec3(x0.x,x12.xz) + h * vec3(x0.y,x12.yw);
    return 130.0 * dot(m, g);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    for (int i = 0; i < 5; ++i) {
      v += a * snoise(p);
      p = p * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }
`;

export function IntroPreloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0A0D1A);
    // ATMOSPHERIC DEPTH HAZE
    scene.fog = new THREE.FogExp2(0xB0BEC5, 0.008);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 15);
    camera.lookAt(0, 2, -20);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    containerRef.current.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0xB0BEC5, 0x2E7D32, 0.6);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xFF8A65, 0.4);
    dirLight.position.set(10, 5, 10); 
    scene.add(dirLight);

    // TERRAIN
    const terrainMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        varying float vHeight;
        ${noiseHelpers}
        void main() {
          vUv = uv;
          vec3 pos = position;
          float h = fbm(pos.xz * 0.05) * 8.0;
          vHeight = h;
          pos.y += h;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vHeight;
        void main() {
          vec3 soil = vec3(0.17, 0.09, 0.06);
          vec3 grass = vec3(0.18, 0.35, 0.18);
          vec3 color = mix(soil, grass, smoothstep(-2.0, 5.0, vHeight));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    const terrainGeo = new THREE.PlaneGeometry(200, 200, 128, 128);
    terrainGeo.rotateX(-Math.PI / 2);
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    scene.add(terrain);

    // WATER
    const waterMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x1A3A2A) }
      },
      vertexShader: `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float angle = pos.x * 2.0 + pos.z * 1.5 + uTime * 1.5;
          pos.y += sin(angle) * 0.008;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 uColor;
        uniform float uTime;
        void main() {
          float shimmer = sin(vUv.x * 20.0 + uTime) * 0.03;
          gl_FragColor = vec4(uColor + shimmer, 0.9);
        }
      `
    });

    const terraceGeo = new THREE.PlaneGeometry(30, 40);
    terraceGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 5; i++) {
      const terrace = new THREE.Mesh(terraceGeo, waterMat);
      terrace.position.set(0, 3 - i * 1.5, -20 - i * 10);
      scene.add(terrace);
    }

    // RICE SHOOTS (40,000 count)
    const shootCount = 40000;
    const shootGeo = new THREE.CylinderGeometry(0.005, 0.018, 0.3, 3, 4);
    shootGeo.translate(0, 0.15, 0);
    const shootMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x81C784) } },
      vertexShader: `
        varying vec2 vUv;
        varying float vY;
        uniform float uTime;
        void main() {
          vUv = uv;
          vY = position.y;
          vec4 worldInstancePos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float wind = sin(uTime * 1.8 + worldInstancePos.x * 0.5 + worldInstancePos.z * 0.4) * 0.06;
          wind *= (position.y + 0.15) / 0.3;
          vec3 pos = position;
          pos.x += wind;
          pos.z += wind * 0.5;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vY;
        uniform vec3 uColor;
        void main() {
          float grad = smoothstep(-0.15, 0.15, vY);
          vec3 baseColor = mix(uColor * 0.5, uColor, grad);
          gl_FragColor = vec4(baseColor, 0.9);
        }
      `
    });
    const riceMesh = new THREE.InstancedMesh(shootGeo, shootMat, shootCount);
    const dummy = new THREE.Object3D();
    let currentIdx = 0;
    for (let i = 0; i < 5; i++) {
      const pY = 3 - i * 1.5;
      const pZ = -20 - i * 10;
      for (let s = 0; s < 8000; s++) {
        const x = (s % 80 - 40) * 0.25 + (Math.random() - 0.5) * 0.1;
        const z = (Math.floor(s / 80) - 25) * 0.25 + (Math.random() - 0.5) * 0.1;
        dummy.position.set(x, pY, pZ + z);
        dummy.rotation.y = Math.random() * Math.PI;
        dummy.updateMatrix();
        riceMesh.setMatrixAt(currentIdx++, dummy.matrix);
      }
    }
    scene.add(riceMesh);

    // TREELINE (50,000 Forest Trees)
    const trunkGeo = new THREE.CylinderGeometry(0.02, 0.05, 1.2, 4);
    trunkGeo.translate(0, 0.6, 0);
    const leafClusterGeo = new THREE.SphereGeometry(0.4, 5, 4);
    leafClusterGeo.translate(0, 1.2, 0);
    
    const treeGeo = BufferGeometryUtils.mergeGeometries([trunkGeo, leafClusterGeo]);
    
    const treeMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying float vY;
        uniform float uTime;
        void main() {
          vY = position.y;
          vec4 worldPos = instanceMatrix * vec4(position, 1.0);
          float sway = sin(uTime * 0.8 + worldPos.x * 0.1) * 0.05 * position.y;
          vec3 pos = position;
          pos.x += sway;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying float vY;
        void main() {
          vec3 trunkColor = vec3(0.17, 0.09, 0.06);
          vec3 leafColor = vec3(0.1, 0.37, 0.12);
          vec3 highlights = vec3(0.64, 0.84, 0.65);
          vec3 color = vY < 0.9 ? trunkColor : mix(leafColor, highlights, step(0.95, sin(vY * 10.0)));
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    const forestMesh = new THREE.InstancedMesh(treeGeo, treeMat, 50000);
    for (let i = 0; i < 50000; i++) {
      const rx = (Math.random() - 0.5) * 200;
      const rz = (Math.random() - 0.5) * 200;
      if (Math.abs(rx) < 20 && rz > -60 && rz < 30) continue; 
      
      const rh = 1.0 + Math.random() * 2.0;
      dummy.position.set(rx, rh - 2.0, rz);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.scale.setScalar(0.8 + Math.random() * 1.5);
      dummy.updateMatrix();
      forestMesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(forestMesh);

    // BAMBOO CLUSTERS
    const bambooGeo = new THREE.CylinderGeometry(0.01, 0.04, 8, 5);
    bambooGeo.translate(0, 4, 0);
    const bambooMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying float vY;
        uniform float uTime;
        void main() {
          vY = position.y;
          vec3 pos = position;
          float sway = sin(uTime * 1.2 + instanceMatrix[3][0] * 0.5) * 0.8 * (vY / 8.0);
          pos.x += sway;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying float vY;
        void main() {
          vec3 color = vec3(0.33, 0.54, 0.18);
          float nodes = step(0.9, fract(vY * 2.0));
          gl_FragColor = vec4(mix(color, color * 0.5, nodes), 1.0);
        }
      `
    });
    const bambooMesh = new THREE.InstancedMesh(bambooGeo, bambooMat, 400);
    let bIdx = 0;
    for (let i = 0; i < 20; i++) {
      const cx = (Math.random() - 0.5) * 100;
      const cz = (Math.random() - 0.5) * 100 - 50;
      for (let j = 0; j < 20; j++) {
        dummy.position.set(cx + (Math.random() - 0.5) * 3, 0, cz + (Math.random() - 0.5) * 3);
        dummy.rotation.y = Math.random() * Math.PI;
        dummy.scale.set(1, 0.8 + Math.random() * 0.4, 1);
        dummy.updateMatrix();
        bambooMesh.setMatrixAt(bIdx++, dummy.matrix);
      }
    }
    scene.add(bambooMesh);

    // BANYAN TREE (Hero)
    const banyanGroup = new THREE.Group();
    const gnarledTrunkGeo = new THREE.CylinderGeometry(0.4, 0.8, 6, 6);
    const banyanTrunk = new THREE.Mesh(gnarledTrunkGeo, new THREE.MeshStandardMaterial({ color: 0x2C1810 }));
    banyanTrunk.position.y = 3;
    banyanGroup.add(banyanTrunk);

    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const rootGeo = new THREE.CylinderGeometry(0.02, 0.02, 5, 4);
      rootGeo.translate(0, -2.5, 0);
      const root = new THREE.Mesh(rootGeo, new THREE.MeshStandardMaterial({ color: 0x1A0F0A }));
      root.position.set(Math.cos(angle) * 2, 5, Math.sin(angle) * 2);
      root.rotation.z = (Math.random() - 0.5) * 0.2;
      banyanGroup.add(root);
    }
    const banyanCanopy = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 8), new THREE.MeshStandardMaterial({ color: 0x0A260C }));
    banyanCanopy.position.y = 6;
    banyanGroup.add(banyanCanopy);
    banyanGroup.position.set(-15, 0, -10);
    scene.add(banyanGroup);

    // RAIN (200,000 drops)
    const rainCount = 200000;
    const rainGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.5, 3);
    const rainMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xFFFFFF) } },
      vertexShader: `
        uniform float uTime;
        varying float vOpacity;
        void main() {
          vec4 instancePos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float speed = 18.0 + fract(instancePos.x * 12.3) * 6.0;
          float yOffset = mod(instancePos.y - uTime * speed, 50.0);
          float xShift = (50.0 - yOffset) * 0.14; // SW wind angle (8 deg approx)
          vec3 pos = position;
          vec3 worldPos = instancePos.xyz + vec3(xShift, yOffset - instancePos.y, 0.0);
          vOpacity = smoothstep(80.0, 20.0, length(instancePos.xz)) * 0.35;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos + pos, 1.0);
        }
      `,
      fragmentShader: `varying float vOpacity; uniform vec3 uColor; void main() { gl_FragColor = vec4(uColor, vOpacity); }`
    });
    const rainMesh = new THREE.InstancedMesh(rainGeo, rainMat, rainCount);
    for (let i = 0; i < rainCount; i++) {
      dummy.position.set((Math.random() - 0.5) * 120, Math.random() * 50, (Math.random() - 0.5) * 120);
      dummy.updateMatrix();
      rainMesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(rainMesh);

    // RIPPLES (300 pool)
    const rippleCount = 300;
    const rippleGeo = new THREE.RingGeometry(0.1, 0.12, 32);
    rippleGeo.rotateX(-Math.PI / 2);
    const rippleMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0, side: THREE.DoubleSide });
    const rippleMesh = new THREE.InstancedMesh(rippleGeo, rippleMat, rippleCount);
    scene.add(rippleMesh);
    const ripples = Array.from({ length: rippleCount }, () => ({ active: false, startTime: 0, x: 0, y: 0, z: 0 }));
    let ripplePointer = 0;
    let hitCounter = 0;

    // GROUND MIST (Spec: 6,000 particles, soft edges, 8% opacity)
    const mistCount = 6000;
    const mistPositions = new Float32Array(mistCount * 3);
    const mistVelocities = new Float32Array(mistCount);
    for (let i = 0; i < mistCount; i++) {
      mistPositions[i * 3] = (Math.random() - 0.5) * 120;
      mistPositions[i * 3 + 1] = Math.random() * 8; // Valley floor focus
      mistPositions[i * 3 + 2] = (Math.random() - 0.5) * 120;
      mistVelocities[i] = 0.001 + Math.random() * 0.003;
    }
    const mistGeo = new THREE.BufferGeometry();
    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));
    const mistMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        uniform float uTime;
        varying float vOpacity;
        varying float vY;
        void main() {
          vec3 pos = position;
          vY = pos.y;
          pos.x += sin(uTime * 0.5 + position.z) * 0.2; // lateral wind drift
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = 150.0 * (1.0 / -mvPosition.z);
          vOpacity = 0.08 * (1.0 - (pos.y / 10.0)); // Fade with height
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = vOpacity * (1.0 - dist * 2.0); // radial gradient alpha
          gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
        }
      `
    });
    const mistParticles = new THREE.Points(mistGeo, mistMat);
    scene.add(mistParticles);

    // CLOUDS & HORIZON
    const cloudBaseMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color() }, uSpeed: { value: 0 }, uFlash: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uSpeed; uniform vec3 uColor; uniform float uFlash; ${noiseHelpers}
        void main() {
          float n = fbm(vUv * 3.0 + vec2(uTime * uSpeed, uTime * uSpeed * 0.2));
          float alpha = smoothstep(0.4, 0.9, n);
          vec3 finalColor = mix(uColor, vec3(0.8, 0.7, 1.0), uFlash * n);
          gl_FragColor = vec4(finalColor, alpha * 0.8);
        }`
    });
    const cloudColors = [0x2C3344, 0x4A5568, 0x8899AA, 0xD4DDE8];
    const cloudSpeeds = [0.002, 0.004, 0.007, 0.011];
    const clouds: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const mat = cloudBaseMat.clone();
      mat.uniforms.uColor.value.set(cloudColors[i]);
      mat.uniforms.uSpeed.value = cloudSpeeds[i];
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), mat);
      mesh.position.y = 40 + i * 20;
      mesh.rotation.x = Math.PI / 2;
      scene.add(mesh);
      clouds.push(mesh);
    }

    const horizonMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uC1: { value: new THREE.Color(0x00695C) }, uC2: { value: new THREE.Color(0xFF7043) } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform vec3 uC1; uniform vec3 uC2; void main() { float g = smoothstep(0.0, 1.0, vUv.y); gl_FragColor = vec4(mix(uC1, uC2, g), (1.0 - g) * 0.5); }`
    });
    const horizon = new THREE.Mesh(new THREE.PlaneGeometry(500, 100), horizonMat);
    horizon.position.set(0, 10, -300);
    scene.add(horizon);

    // LIGHTNING
    const lightningState = { flash: 0 };
    let lightningTimer = 15000 + Math.random() * 10000;
    let lastLightningTime = performance.now();
    let shakeIntensity = 0;

    let animationFrameId: number;
    const animate = (time: number) => {
      const t = time * 0.001;
      const now = performance.now();

      terrainMat.uniforms.uTime.value = t;
      waterMat.uniforms.uTime.value = t;
      shootMat.uniforms.uTime.value = t;
      rainMat.uniforms.uTime.value = t;
      treeMat.uniforms.uTime.value = t;
      bambooMat.uniforms.uTime.value = t;
      mistMat.uniforms.uTime.value = t;

      // Mist Animation & Impact Respawn
      const posAttr = mistGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < mistCount; i++) {
        posAttr.setY(i, posAttr.getY(i) + mistVelocities[i]);
        if (posAttr.getY(i) > 10) posAttr.setY(i, 0);
      }
      posAttr.needsUpdate = true;

      // Lightning Logic
      if (now - lastLightningTime > lightningTimer) {
        lastLightningTime = now;
        lightningTimer = 15000 + Math.random() * 10000;
        gsap.to(lightningState, { flash: 1, duration: 0.08, onComplete: () => gsap.to(lightningState, { flash: 0, duration: 0.4 }) });
        shakeIntensity = 1.0;
      }

      camera.position.set(0, 8, 15);
      if (shakeIntensity > 0) {
        camera.position.y += Math.sin(t * 50.0) * 0.03 * shakeIntensity;
        shakeIntensity -= 0.015;
      }
      camera.lookAt(0, 2, -20);

      clouds.forEach(c => {
        (c.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
        (c.material as THREE.ShaderMaterial).uniforms.uFlash.value = lightningState.flash;
      });

      // Ripples & Impact Mist
      for (let i = 0; i < rippleCount; i++) {
        const r = ripples[i];
        if (r.active) {
          const age = now - r.startTime;
          if (age > 800) r.active = false;
          else {
            const p = age / 800;
            dummy.position.set(r.x, r.y + 0.01, r.z);
            dummy.scale.set(p * 1.8, p * 1.8, p * 1.8);
            dummy.updateMatrix();
            rippleMesh.setMatrixAt(i, dummy.matrix);
          }
        }
      }
      rippleMesh.instanceMatrix.needsUpdate = true;

      if (Math.random() > 0.4) {
        const rx = (Math.random() - 0.5) * 60;
        const rz = (Math.random() - 0.5) * 80 - 30;
        const r = ripples[ripplePointer];
        r.active = true; r.startTime = now; r.x = rx; r.y = 1.0; r.z = rz;
        ripplePointer = (ripplePointer + 1) % rippleCount;
        
        hitCounter++;
        // Rain mist on impact (every 50th drop hit, spawn 3 particles)
        if (hitCounter % 50 === 0) {
          for(let m = 0; m < 3; m++) {
             const mIdx = (hitCounter + m) % mistCount;
             posAttr.setXYZ(mIdx, rx + (Math.random()-0.5), 1.0, rz + (Math.random()-0.5));
          }
        }
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate(0);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (containerRef.current) containerRef.current.removeChild(renderer.domElement);
    };
  }, []);

  const handleEnter = () => {
    setActive(false);
    onComplete();
  };

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0A0D1A] overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <h1 className="text-white/10 text-4xl font-headline font-black uppercase tracking-[1em] mb-8">KrishiShield AI</h1>
        <button 
          onClick={handleEnter} 
          className="pointer-events-auto px-12 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/40 text-xs font-bold uppercase tracking-[0.4em] transition-all active:scale-95 backdrop-blur-md"
        >
          Initialize App
        </button>
      </div>
    </div>
  );
}
