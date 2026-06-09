
"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * KrishiShield AI — Ancient Indian Monsoon Valley Landing
 * Step 2: Terraced Rice Paddies & Water Surface
 */

export function IntroPreloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0A0D1A);

    // 2. CAMERA SETUP
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 15);
    camera.lookAt(0, 2, -20);

    // 3. RENDERER SETUP
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      powerPreference: 'high-performance' 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    containerRef.current.appendChild(renderer.domElement);

    // 4. LIGHTING
    const hemiLight = new THREE.HemisphereLight(0xB0BEC5, 0x2E7D32, 0.6);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xFF8A65, 0.4);
    dirLight.position.set(10, 5, 10); 
    scene.add(dirLight);

    // 5. TERRAIN & WATER SHADERS
    
    // Noise & fBm Helpers for GLSL
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

    // Terrain Material
    const terrainMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
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
          vec3 soil = vec3(0.17, 0.09, 0.06); // #2C1810
          vec3 grass = vec3(0.18, 0.35, 0.18);
          vec3 color = mix(soil, grass, smoothstep(-2.0, 5.0, vHeight));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    // Base Terrain
    const terrainGeo = new THREE.PlaneGeometry(200, 200, 256, 256);
    terrainGeo.rotateX(-Math.PI / 2);
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    scene.add(terrain);

    // Water Material (Gerstner Waves)
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
          
          // Simplified Gerstner-like displacement
          float angle = pos.x * 2.0 + pos.z * 1.5 + uTime * 2.0;
          pos.y += sin(angle) * 0.008;
          pos.y += cos(pos.x * 3.0 + uTime) * 0.005;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 uColor;
        uniform float uTime;
        void main() {
          float shimmer = sin(vUv.x * 20.0 + uTime) * 0.05;
          gl_FragColor = vec4(uColor + shimmer, 0.85);
        }
      `
    });

    // Create Terraces
    const terraceCount = 5;
    const terraceGeo = new THREE.PlaneGeometry(30, 40);
    terraceGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < terraceCount; i++) {
      const terrace = new THREE.Mesh(terraceGeo, waterMat);
      terrace.position.set(0, 3 - i * 1.5, -20 - i * 10);
      scene.add(terrace);

      // Earthen Bunds (Borders)
      const bundGeo = new THREE.BoxGeometry(32, 0.5, 42);
      const bundMat = new THREE.MeshStandardMaterial({ color: 0x2C1810 });
      const bund = new THREE.Mesh(bundGeo, bundMat);
      bund.position.set(0, 2.8 - i * 1.5, -20 - i * 10);
      scene.add(bund);
    }

    // 6. RENDER LOOP
    let animationFrameId: number;
    const animate = (time: number) => {
      const t = time * 0.001;
      terrainMat.uniforms.uTime.value = t;
      waterMat.uniforms.uTime.value = t;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate(0);

    // 7. WINDOW RESIZE HANDLER
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
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
        <h1 className="text-white/20 text-4xl font-headline font-black uppercase tracking-[1em] mb-8">
          KrishiShield AI
        </h1>
        <button 
          onClick={handleEnter}
          className="pointer-events-auto px-12 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/40 text-xs font-bold uppercase tracking-[0.4em] transition-all active:scale-95"
        >
          Initialize App
        </button>
      </div>
    </div>
  );
}
