
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
      
      // Dramatic rolling hills logic
      float elevation = cnoise(pos.xz * 0.01) * 12.0;
      elevation += cnoise(pos.xz * 0.03) * 4.0;
      elevation += cnoise(pos.xz * 0.08) * 1.5;
      
      pos.y += elevation;
      vElevation = elevation;

      vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
      vViewDir = normalize(cameraPosition - worldPosition.xyz);
      vNormal = normalMatrix * normal;

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
      float diff = max(0.3, dot(vNormal, lightDir));
      
      // Elite agricultural palette
      vec3 deepGreen = vec3(0.02, 0.12, 0.04);
      vec3 vibrantGreen = vec3(0.1, 0.38, 0.15);
      vec3 fieldGold = vec3(0.4, 0.6, 0.1);
      
      vec3 color = mix(deepGreen, vibrantGreen, smoothstep(-5.0, 8.0, vElevation));
      color = mix(color, fieldGold, smoothstep(8.0, 15.0, vElevation));
      
      // Atmospheric drone haze
      float haze = smoothstep(150.0, 500.0, length(vViewDir));
      vec3 hazeColor = vec3(0.6, 0.75, 0.85);
      
      gl_FragColor = vec4(mix(color * diff, hazeColor, haze * 0.4), 1.0);
    }
  `
};

const GrassShader = {
  uniforms: {
    uTime: { value: 0 },
    uSunPos: { value: new THREE.Vector3(100, 50, -100) },
  },
  vertexShader: `
    attribute float phase;
    varying vec2 vUv;
    varying float vSway;
    uniform float uTime;

    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Wind fluid waves
      float wind = sin(uTime * 1.2 + phase + instanceMatrix[3][0] * 0.3) * pos.y * 0.5;
      pos.x += wind;
      pos.z += wind * 0.4;
      vSway = wind;

      vec4 worldPosition = instanceMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vSway;

    void main() {
      vec3 base = vec3(0.05, 0.22, 0.08);
      vec3 tip = vec3(0.25, 0.62, 0.15);
      vec3 color = mix(base, tip, vUv.y);
      color += abs(vSway) * 0.15; // Specular highlights from motion

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
    scene.background = new THREE.Color(0x91b5d1);
    scene.fog = new THREE.FogExp2(0x91b5d1, 0.005);

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1500);
    camera.position.set(0, 40, 150);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    containerRef.current.appendChild(renderer.domElement);

    // 1. Cinematic Terrain
    const terrainGeo = new THREE.PlaneGeometry(1200, 1200, 256, 256);
    terrainGeo.rotateX(-Math.PI / 2);
    const terrainMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(TerrainShader.uniforms),
      vertexShader: TerrainShader.vertexShader,
      fragmentShader: TerrainShader.fragmentShader,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    scene.add(terrain);

    // 2. Endless Fields (Dense Grass)
    const grassCount = 160000;
    const grassGeo = new THREE.PlaneGeometry(0.2, 1.8, 1, 4);
    grassGeo.translate(0, 0.9, 0);
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
      const x = (Math.random() - 0.5) * 600;
      const z = (Math.random() - 0.5) * 600;
      dummy.position.set(x, 0, z);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.scale.setScalar(0.8 + Math.random() * 0.5);
      dummy.updateMatrix();
      grassMesh.setMatrixAt(i, dummy.matrix);
      phases[i] = Math.random() * Math.PI * 2;
    }
    grassGeo.setAttribute('phase', new THREE.InstancedBufferAttribute(phases, 1));
    scene.add(grassMesh);

    // 3. Lighting System
    const sun = new THREE.DirectionalLight(0xfff5e6, 2.0);
    sun.position.set(100, 80, -150);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0x404040, 1.2));

    // 4. Post Processing Stack
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.9);
    composer.addPass(bloom);
    
    const film = new FilmPass(0.08, 0.02, 648, false);
    composer.addPass(film);

    // 5. Drone Glide Path
    const droneTimeline = gsap.timeline({ repeat: -1, yoyo: true });
    droneTimeline.to(camera.position, {
      z: -180,
      y: 25,
      x: 60,
      duration: 35,
      ease: "sine.inOut"
    });

    gsap.from(".hero-text", {
      opacity: 0,
      y: 60,
      duration: 2.5,
      delay: 0.8,
      ease: "expo.out"
    });

    // 6. Animation Loop
    const clock = new THREE.Clock();
    const animate = () => {
      const time = clock.getElapsedTime();
      terrainMat.uniforms.uTime.value = time;
      grassMat.uniforms.uTime.value = time;

      // Subtle drone tilt
      camera.rotation.z = Math.sin(time * 0.15) * 0.02;
      camera.lookAt(0, 0, -300);

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
      scale: 1.15, 
      duration: 1.8, 
      ease: "power4.inOut",
      onComplete: () => {
        setActive(false);
        onComplete();
      }
    });
  };

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0A0F0A] overflow-hidden intro-overlay">
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Cinematic Overlays */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/20" />

      {/* High-End Hero UI */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center hero-text">
        <div className="mb-6">
          <span className="text-[11px] font-black uppercase tracking-[0.6em] text-primary mb-3 block animate-pulse">Uplink Established</span>
          <h1 className="text-6xl md:text-9xl font-headline font-black text-white tracking-tighter drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
            KrishiShield AI
          </h1>
        </div>
        
        <p className="max-w-xl text-lg md:text-2xl text-white/90 font-light tracking-tight italic mb-14 drop-shadow-lg">
          Where Every Field Becomes Intelligent
        </p>

        <button 
          onClick={handleEnter}
          className="pointer-events-auto group relative px-14 py-6 overflow-hidden rounded-full transition-all active:scale-95 shadow-2xl"
        >
          <div className="absolute inset-0 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full" />
          <div className="absolute inset-0 bg-primary/25 translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-expo" />
          
          <span className="relative z-10 flex items-center gap-4 text-white font-bold uppercase tracking-[0.3em] text-sm">
            Enter The Field <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform duration-500" />
          </span>
        </button>
      </div>

      {/* HUD Telemetry */}
      <div className="absolute bottom-12 left-12 hidden md:block pointer-events-none opacity-40">
        <div className="flex flex-col gap-2 font-code">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
            <span className="text-[10px] text-white uppercase tracking-widest">Drone Telemetry: Active</span>
          </div>
          <span className="text-[9px] text-white/60 uppercase tracking-[0.2em] ml-5">Altitude: 45m | Vel: 12km/h</span>
        </div>
      </div>

      <style jsx global>{`
        @font-face {
          font-family: 'Anybody';
          src: url('https://fonts.googleapis.com/css2?family=Anybody:wght@900&display=swap');
        }
        .ease-expo {
          transition-timing-function: cubic-bezier(0.19, 1, 0.22, 1);
        }
      `}</style>
    </div>
  );
}

