
"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * KrishiShield AI — Cinematic 3D Nature Landing Page
 * Phase 2 — The Sacred Ground
 */

export function IntroPreloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- PHASE 1 REFINEMENT: Cinematic Camera & Renderer ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060A0F);

    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.2, 15);
    camera.rotation.x = -Math.PI * 0.044; // ~8 degrees tilt

    const renderer = new THREE.WebGLRenderer({ 
      antialias: false, 
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    const clock = new THREE.Clock();

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xB0BEC5, 0x2E7D32, 0.6);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xFF8A65, 0.4);
    dirLight.position.set(50, 10, 50);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // --- SHARED NOISE CHUNKS ---
    const NOISE_GLSL = `
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ; m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }
      float fBm(vec2 p) {
        float v = 0.0; float a = 0.5;
        for (int i = 0; i < 6; i++) {
          v += a * snoise(p);
          p *= 2.1; a *= 0.45;
        }
        return v;
      }
    `;

    // --- PHASE 2: The Sacred Ground ---
    const groundGeo = new THREE.PlaneGeometry(300, 300, 512, 512);
    groundGeo.rotateX(-Math.PI / 2);

    const groundMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSunDir: { value: dirLight.position.clone().normalize() }
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vHeight;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        ${NOISE_GLSL}
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // Large scale valley bowl (Amplitude 3.0)
          float dist = length(pos.xz);
          float bowl = pow(dist / 150.0, 2.0) * 8.0;
          pos.y -= bowl;
          
          // Micro roughness (Amplitude 0.15, 6-octave fBm)
          float roughness = fBm(pos.xz * 0.2) * 0.15;
          pos.y += roughness;
          
          vHeight = pos.y;
          vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
          
          // Approximate normals for shading
          vec3 off = vec3(0.1, 0.0, 0.0);
          float hL = fBm((pos.xz - off.xy) * 0.2) * 0.15;
          float hR = fBm((pos.xz + off.xy) * 0.2) * 0.15;
          float hD = fBm((pos.xz - off.zy) * 0.2) * 0.15;
          float hU = fBm((pos.xz + off.zy) * 0.2) * 0.15;
          vNormal = normalize(vec3(hL - hR, 0.2, hD - hU));
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vHeight;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        uniform vec3 uSunDir;
        ${NOISE_GLSL}
        void main() {
          float slope = 1.0 - vNormal.y;
          
          // Material Colors
          vec3 valleyFloor = vec3(0.1, 0.04, 0.0); // Wet dark soil #1A0A00
          vec3 midSlope = vec3(0.48, 0.25, 0.0);    // Red laterite #7B3F00
          vec3 terraceClay = vec3(0.36, 0.25, 0.22); // Paddy clay #5D4037
          vec3 highEdges = vec3(0.47, 0.33, 0.28);   // Dry earth #795548
          
          // Layering based on height and slope
          vec3 color = mix(valleyFloor, midSlope, smoothstep(-5.0, -1.0, vHeight));
          color = mix(color, terraceClay, smoothstep(-1.0, 1.0, vHeight) * (1.0 - slope));
          color = mix(color, highEdges, smoothstep(2.0, 8.0, vHeight));
          
          // Wet gloss in valley
          float wetness = smoothstep(-2.0, -8.0, vHeight);
          float spec = pow(max(dot(reflect(-uSunDir, vNormal), normalize(cameraPosition - vWorldPos)), 0.0), 32.0);
          color += spec * wetness * 0.2;
          
          // Voronoi crack pattern approximation for high edges
          if(vHeight > 2.0) {
            float cracks = snoise(vUv * 50.0);
            color = mix(color, color * 0.8, smoothstep(0.4, 0.5, cracks));
          }
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    scene.add(ground);

    // --- Terrace Levels ---
    const terraceHeights = [-0.5, -1.2, -2.1, -3.2, -4.5];
    const terraceRadius = [40, 55, 75, 95, 120];
    
    terraceHeights.forEach((h, i) => {
      // Flat surface
      const ringGeo = new THREE.RingGeometry(i === 0 ? 0 : terraceRadius[i-1], terraceRadius[i], 64);
      ringGeo.rotateX(-Math.PI / 2);
      const ring = new THREE.Mesh(ringGeo, groundMat);
      ring.position.y = h;
      scene.add(ring);
      
      // Bund (Wall)
      const bundGeo = new THREE.TorusGeometry(terraceRadius[i], 0.2, 8, 100);
      bundGeo.rotateX(Math.PI / 2);
      const bund = new THREE.Mesh(bundGeo, groundMat);
      bund.position.y = h;
      scene.add(bund);
    });

    // --- Animation Loop ---
    const animate = () => {
      const t = clock.getElapsedTime();
      
      // Camera Breathing (Handheld feel)
      camera.position.y = 1.2 + Math.sin(t * 1.3) * 0.008;
      camera.position.x = Math.sin(t * 0.7) * 0.003;
      
      groundMat.uniforms.uTime.value = t;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    // Resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current) containerRef.current.removeChild(renderer.domElement);
    };
  }, []);

  const handleEnter = () => {
    gsap.to(containerRef.current, { 
      opacity: 0, 
      duration: 1.2, 
      onComplete: () => {
        setActive(false);
        onComplete();
      } 
    });
  };

  if (!active) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 z-[9999] bg-[#060A0F] overflow-hidden cursor-none">
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-32 pointer-events-none">
        <button 
          onClick={handleEnter} 
          className="pointer-events-auto px-12 py-5 bg-white/5 hover:bg-primary/10 border border-white/10 rounded-full transition-all backdrop-blur-xl"
        >
          <span className="text-white/60 text-[11px] font-black uppercase tracking-[0.4em]">
            Enter the Field
          </span>
        </button>
      </div>
      <style jsx global>{`
        body { cursor: none !important; }
      `}</style>
    </div>
  );
}
