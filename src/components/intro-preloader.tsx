
"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { ArrowRight } from 'lucide-react';

/**
 * KRISHISHIELD AI — ELITE CINEMATIC LANDING
 * Photorealistic 3D drone flythrough over rolling agricultural hills.
 * 100% Procedural | Zero Assets | Ultra-High Fidelity
 */

const TerrainShader = {
  uniforms: {
    uTime: { value: 0 },
    uSunPos: { value: new THREE.Vector3(100, 50, -100) },
  },
  vertexShader: `
    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    uniform float uTime;

    // Classic Perlin Noise
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    float fade(float t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}
    float cnoise(vec2 P){
      vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
      vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
      Pi = mod(Pi, 289.0);
      vec4 ix = Pi.xzxz;
      vec4 iy = Pi.yyww;
      vec4 fx = Pf.xzxz;
      vec4 fy = Pf.yyww;
      vec4 i = permute(permute(ix) + iy);
      vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0;
      vec4 gy = abs(gx) - 0.5;
      vec4 tx = floor(gx + 0.5);
      gx = gx - tx;
      vec2 g00 = vec2(gx.x,gy.x);
      vec2 g10 = vec2(gx.y,gy.y);
      vec2 g01 = vec2(gx.z,gy.z);
      vec2 g11 = vec2(gx.w,gy.w);
      vec4 norm = 1.79284291400159 - 0.85373472095314 * vec4(dot(g00, g00), dot(g10, g10), dot(g01, g01), dot(g11, g11));
      g00 *= norm.x; g10 *= norm.y; g01 *= norm.z; g11 *= norm.w;
      float n00 = dot(g00, vec2(fx.x, fy.x));
      float n10 = dot(g10, vec2(fx.y, fy.y));
      float n01 = dot(g01, vec2(fx.z, fy.z));
      float n11 = dot(g11, vec2(fx.w, fy.w));
      return 2.3 * mix(mix(n00, n10, fade(fx.x)), mix(n01, n11, fade(fx.x)), fade(fy.z));
    }

    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Generate rolling hills
      float elevation = cnoise(pos.xz * 0.015) * 8.0;
      elevation += cnoise(pos.xz * 0.04) * 2.5;
      elevation += cnoise(pos.xz * 0.1) * 0.5;
      
      pos.y += elevation;
      vElevation = elevation;

      vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
      vViewDir = normalize(cameraPosition - worldPosition.xyz);
      vNormal = normalMatrix * normal; // Simplified for procedural terrain

      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    uniform vec3 uSunPos;

    void main() {
      vec3 lightDir = normalize(uSunPos);
      float diff = max(0.2, dot(vNormal, lightDir));
      
      // Deep agricultural green palette
      vec3 deepGreen = vec3(0.04, 0.18, 0.06);
      vec3 lushGreen = vec3(0.12, 0.42, 0.18);
      vec3 highlightGreen = vec3(0.45, 0.72, 0.22);
      
      vec3 color = mix(deepGreen, lushGreen, smoothstep(-5.0, 5.0, vElevation));
      color = mix(color, highlightGreen, smoothstep(5.0, 10.0, vElevation));
      
      // Atmospheric haze
      float distanceHaze = smoothstep(100.0, 400.0, length(vViewDir));
      vec3 skyColor = vec3(0.5, 0.7, 0.9);
      
      gl_FragColor = vec4(mix(color * diff, skyColor, distanceHaze * 0.3), 1.0);
    }
  `
};

const GrassShader = {
  uniforms: {
    uTime: { value: 0 },
    uSunPos: { value: new THREE.Vector3(100, 50, -100) },
  },
  vertexShader: `
    attribute vec3 offset;
    attribute float phase;
    varying vec2 vUv;
    varying float vSway;
    uniform float uTime;

    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Wind sway logic
      float sway = sin(uTime * 1.5 + phase + offset.x * 0.5) * pos.y * 0.4;
      pos.x += sway;
      pos.z += sway * 0.3;
      vSway = sway;

      vec4 worldPosition = instanceMatrix * vec4(pos, 1.0);
      worldPosition.xyz += offset;

      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vSway;

    void main() {
      // Grass color gradient
      vec3 base = vec3(0.08, 0.25, 0.12);
      vec3 tip = vec3(0.35, 0.65, 0.25);
      vec3 color = mix(base, tip, vUv.y);
      
      // Add subtle sheen
      color += abs(vSway) * 0.1;

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

export function IntroPreloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.FogExp2(0x91b5d1, 0.006);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // 1. Cinematic Terrain
    const terrainGeo = new THREE.PlaneGeometry(1000, 1000, 256, 256);
    terrainGeo.rotateX(-Math.PI / 2);
    const terrainMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(TerrainShader.uniforms),
      vertexShader: TerrainShader.vertexShader,
      fragmentShader: TerrainShader.fragmentShader,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    scene.add(terrain);

    // 2. Infinite Field (Instanced Grass)
    const grassCount = 120000;
    const grassGeo = new THREE.PlaneGeometry(0.15, 1.2, 1, 4);
    grassGeo.translate(0, 0.6, 0);
    const grassMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(GrassShader.uniforms),
      vertexShader: GrassShader.vertexShader,
      fragmentShader: GrassShader.fragmentShader,
      side: THREE.DoubleSide,
    });
    const grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);
    
    const dummy = new THREE.Object3D();
    const phases = new Float32Array(grassCount);

    for (let i = 0; i < grassCount; i++) {
      const x = (Math.random() - 0.5) * 400;
      const z = (Math.random() - 0.5) * 400;
      
      const y = 0; 
      
      dummy.position.set(x, y, z);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      grassMesh.setMatrixAt(i, dummy.matrix);
      
      phases[i] = Math.random() * Math.PI * 2;
    }
    grassGeo.setAttribute('phase', new THREE.InstancedBufferAttribute(phases, 1));
    scene.add(grassMesh);

    // 3. Sun & Atmospheric Light
    const sun = new THREE.DirectionalLight(0xfff1e0, 1.5);
    sun.position.set(100, 50, -100);
    scene.add(sun);

    const ambient = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambient);

    // 4. Post Processing
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.85);
    composer.addPass(bloom);
    
    const film = new FilmPass(0.08, 0.02, 648, false);
    composer.addPass(film);

    // 5. Cinematic Path Animation
    const tl = gsap.timeline();
    tl.to(camera.position, {
      z: -100,
      y: 8,
      duration: 30,
      ease: "none",
      repeat: -1,
      yoyo: true
    });
    
    gsap.from(".hero-ui", {
      opacity: 0,
      y: 40,
      duration: 2,
      delay: 0.5,
      ease: "power4.out"
    });

    // 6. Main Loop
    const clock = new THREE.Clock();
    const animate = () => {
      const time = clock.getElapsedTime();
      
      terrainMat.uniforms.uTime.value = time;
      grassMat.uniforms.uTime.value = time;

      // Gentle camera sway
      camera.position.x = Math.sin(time * 0.2) * 5;
      camera.lookAt(0, 2, -200);

      composer.render();
      requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      composer.dispose();
    };
  }, []);

  const handleEnter = () => {
    gsap.to(".intro-overlay", { 
      opacity: 0, 
      scale: 1.1, 
      duration: 1.5, 
      ease: "power4.inOut",
      onComplete: () => {
        setActive(false);
        onComplete();
      }
    });
  };

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black overflow-hidden intro-overlay">
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Visual Overlays */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/20" />

      {/* Hero Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center hero-ui">
        <div className="mb-4">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary mb-2 block animate-pulse">Ecosystem Uplink Active</span>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-headline font-black text-white tracking-tighter drop-shadow-2xl">
            KrishiShield AI
          </h1>
        </div>
        
        <p className="max-w-2xl text-lg md:text-2xl text-white/80 font-light tracking-tight italic mb-12">
          Where Every Field Becomes Intelligent
        </p>

        <button 
          onClick={handleEnter}
          className="pointer-events-auto group relative px-12 py-5 overflow-hidden rounded-full transition-all active:scale-95"
        >
          {/* Glass Button Effect */}
          <div className="absolute inset-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-full" />
          <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          
          <span className="relative z-10 flex items-center gap-3 text-white font-bold uppercase tracking-[0.2em] text-sm">
            Enter The Field <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
      </div>

      {/* HUD Details */}
      <div className="absolute bottom-10 left-10 hidden md:block pointer-events-none">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <span className="text-[10px] font-code text-white/40 uppercase tracking-widest">Drone Telemetry: 4K_RAW</span>
          </div>
          <span className="text-[9px] font-code text-white/20 uppercase tracking-widest ml-3.5">Lat: 18.5204° N | Lon: 73.8567° E</span>
        </div>
      </div>

      <style jsx global>{`
        @font-face {
          font-family: 'Anybody';
          src: url('https://fonts.googleapis.com/css2?family=Anybody:wght@900&display=swap');
        }
      `}</style>
    </div>
  );
}
