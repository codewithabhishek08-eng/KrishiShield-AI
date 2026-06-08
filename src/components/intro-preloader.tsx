
"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { Volume2, VolumeX, ArrowRight, Settings } from 'lucide-react';

/**
 * KRISHISHIELD AI - CINEMATIC NATURE PORTAL
 * A window into a living, procedural ecosystem.
 * All geometry, textures, and animations are generated via GLSL and Three.js.
 */

// --- SHADERS ---

const TerrainShader = {
  uniforms: {
    uTime: { value: 0 },
    uSunPos: { value: new THREE.Vector3() },
    uRain: { value: 0 },
    uLightIntensity: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying float vBiolum;
    uniform float uTime;

    // Simplex Noise
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
      vec3 a0 = x - floor(x + 0.5);
      vec3 g = a0 * vec3(x0.x,x12.xz) + h * vec3(x0.y,x12.yw);
      vec3 norm = inversesqrt(vec3(dot(g.x,g.x), dot(g.y,g.y), dot(g.z,g.z)));
      g *= norm;
      return 130.0 * dot(m, g);
    }

    void main() {
      vUv = uv;
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      
      // Breathing Earth Heartbeat
      float breath = sin(uTime * 0.25) * 0.4;
      vec3 pos = position;
      float noise = snoise(pos.xz * 0.05);
      pos.y += noise * 4.0 + (sin(uTime * 0.5 + pos.x * 0.1) * breath);
      
      vBiolum = max(0.0, snoise(pos.xz * 0.2 + uTime * 0.1));
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uSunPos;
    uniform float uRain;
    uniform float uLightIntensity;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying float vBiolum;

    void main() {
      vec3 baseSoil = vec3(0.17, 0.09, 0.06);
      vec3 mossGreen = vec3(0.1, 0.35, 0.15);
      vec3 biolumColor = vec3(0.0, 0.9, 0.6);
      
      float dist = length(vWorldPos.xz);
      float mossMask = smoothstep(0.3, 0.7, sin(vWorldPos.x * 0.1) * cos(vWorldPos.z * 0.1));
      
      vec3 color = mix(baseSoil, mossGreen, mossMask);
      
      // Puddle check
      if (uRain > 0.5 && vWorldPos.y < -2.0) {
        color = mix(color, vec3(0.05, 0.1, 0.15), 0.8);
      }
      
      // Subsurface bioluminescence
      color += biolumColor * vBiolum * 0.3 * (1.0 - uLightIntensity);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

const LeafShader = {
  uniforms: {
    uTime: { value: 0 },
    uLightPos: { value: new THREE.Vector3() },
    uWindStrength: { value: 1.0 },
  },
  vertexShader: `
    attribute float instanceSeed;
    varying float vBacklight;
    uniform float uTime;
    uniform vec3 uLightPos;
    uniform float uWindStrength;

    void main() {
      vec3 pos = position;
      float sway = sin(uTime * 0.8 + instanceSeed * 10.0) * 0.2 * uWindStrength;
      pos.x += sway * (pos.y);
      
      vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
      vec3 dirToLight = normalize(uLightPos - worldPos.xyz);
      vBacklight = max(0.0, dot(normalize(normalMatrix * normal), -dirToLight));
      
      gl_Position = projectionMatrix * modelViewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    varying float vBacklight;
    void main() {
      vec3 leafColor = vec3(0.1, 0.4, 0.05);
      vec3 sssColor = vec3(0.4, 0.7, 0.1); // Subsurface scattering
      vec3 final = mix(leafColor, sssColor, vBacklight * 0.5);
      gl_FragColor = vec4(final, 1.0);
    }
  `
};

const SkyShader = {
  uniforms: {
    uTime: { value: 0 },
    uSunPos: { value: new THREE.Vector3() },
    uPhase: { value: 0 }, // 0: Dawn, 1: Day, 2: Dusk, 3: Night
  },
  vertexShader: `
    varying vec3 vWorldPos;
    void main() {
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uSunPos;
    uniform float uPhase;
    varying vec3 vWorldPos;

    void main() {
      vec3 dir = normalize(vWorldPos);
      float sunDot = max(0.0, dot(dir, normalize(uSunPos)));
      
      vec3 skyBlue = vec3(0.3, 0.6, 0.9);
      vec3 nightIndigo = vec3(0.02, 0.02, 0.1);
      vec3 horizonGold = vec3(1.0, 0.6, 0.3);
      
      vec3 color = mix(nightIndigo, skyBlue, uPhase);
      color += horizonGold * pow(sunDot, 8.0) * 0.5;
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

export function IntroPreloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(true);
  const [muted, setMuted] = useState(true);
  const [perfTier, setPerfTier] = useState<'Ultra' | 'High' | 'Medium' | 'Low'>('High');

  useEffect(() => {
    if (!containerRef.current) return;

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 3000);
    camera.position.set(0, 15, 80);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // --- PERFORMANCE DETECTION ---
    const cores = navigator.hardwareConcurrency || 4;
    let tiers: any = { 
      'Ultra': { trees: 60000, stalks: 120000, rain: 80000 },
      'High': { trees: 25000, stalks: 60000, rain: 40000 },
      'Medium': { trees: 10000, stalks: 20000, rain: 0 },
      'Low': { trees: 3000, stalks: 8000, rain: 0 }
    };
    const tier = cores > 8 ? 'Ultra' : cores > 4 ? 'High' : cores > 2 ? 'Medium' : 'Low';
    setPerfTier(tier);
    const config = tiers[tier];

    // --- POST PROCESSING ---
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.4, 0.85);
    composer.addPass(bloom);
    
    const film = new FilmPass(0.12, 0.025, 648, false);
    composer.addPass(film);

    // --- GEOMETRY GENERATION ---

    // 1. Terrain
    const terrainGeo = new THREE.PlaneGeometry(1000, 1000, 256, 256);
    terrainGeo.rotateX(-Math.PI / 2);
    const terrainMat = new THREE.ShaderMaterial(TerrainShader);
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.receiveShadow = true;
    scene.add(terrain);

    // 2. The Forest Cathedral (Instanced Trees)
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.6, 12, 6);
    trunkGeo.translate(0, 6, 0);
    const leavesGeo = new THREE.SphereGeometry(3, 8, 8);
    leavesGeo.translate(0, 12, 0);

    const forest = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x2C1810 }), config.trees);
    const canopy = new THREE.InstancedMesh(leavesGeo, new THREE.ShaderMaterial(LeafShader), config.trees);
    
    const dummy = new THREE.Object3D();
    const seeds = new Float32Array(config.trees);

    for(let i=0; i<config.trees; i++) {
      const radius = 20 + Math.random() * 400;
      const angle = Math.random() * Math.PI * 2;
      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius;
      
      dummy.position.set(tx, 0, tz);
      dummy.scale.set(0.8 + Math.random() * 0.4, 0.8 + Math.random() * 1.5, 0.8 + Math.random() * 0.4);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      
      forest.setMatrixAt(i, dummy.matrix);
      canopy.setMatrixAt(i, dummy.matrix);
      seeds[i] = Math.random();
    }
    leavesGeo.setAttribute('instanceSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    scene.add(forest, canopy);

    // 3. Wheat Stalks
    const stalkGeo = new THREE.CylinderGeometry(0.01, 0.05, 1.2, 3);
    stalkGeo.translate(0, 0.6, 0);
    const meadow = new THREE.InstancedMesh(stalkGeo, new THREE.ShaderMaterial(LeafShader), config.stalks);
    for(let i=0; i<config.stalks; i++) {
      const tx = (Math.random() - 0.5) * 200;
      const tz = Math.random() * 100 + 40;
      dummy.position.set(tx, 0, tz);
      dummy.scale.set(1, 0.5 + Math.random(), 1);
      dummy.updateMatrix();
      meadow.setMatrixAt(i, dummy.matrix);
    }
    scene.add(meadow);

    // 4. Sky System
    const skyGeo = new THREE.SphereGeometry(1500, 32, 32);
    const skyMat = new THREE.ShaderMaterial({ ...SkyShader, side: THREE.BackSide });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // 5. Rain System
    let rain: any;
    if (config.rain > 0) {
      const rainGeo = new THREE.CylinderGeometry(0.01, 0.01, 1.0);
      rain = new THREE.InstancedMesh(rainGeo, new THREE.MeshBasicMaterial({ color: 0xAAAAAA, transparent: true, opacity: 0.3 }), config.rain);
      scene.add(rain);
    }

    // --- LIGHTING ---
    const sun = new THREE.DirectionalLight(0xFFF4D6, 1.5);
    sun.castShadow = true;
    sun.shadow.camera.left = -200;
    sun.shadow.camera.right = 200;
    sun.shadow.camera.top = 200;
    sun.shadow.camera.bottom = -200;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);
    
    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambient);

    // --- INTERACTIONS ---
    const mouse = new THREE.Vector2();
    window.addEventListener('mousemove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // --- ANIMATION LOOP ---
    const clock = new THREE.Clock();
    const animate = () => {
      const time = clock.getElapsedTime();
      
      // Day/Night Cycle (90s)
      const cycle = (time % 90) / 90;
      const sunAngle = cycle * Math.PI * 2;
      sun.position.set(Math.cos(sunAngle) * 500, Math.sin(sunAngle) * 500, 200);
      
      // Update Uniforms
      terrainMat.uniforms.uTime.value = time;
      terrainMat.uniforms.uSunPos.value.copy(sun.position);
      terrainMat.uniforms.uLightIntensity.value = Math.max(0.1, Math.sin(sunAngle));
      
      skyMat.uniforms.uSunPos.value.copy(sun.position);
      skyMat.uniforms.uPhase.value = Math.max(0, Math.sin(sunAngle));

      // Camera Drift
      camera.position.x = Math.sin(time * 0.1) * 10;
      camera.position.z = 80 + Math.cos(time * 0.05) * 5;
      camera.lookAt(0, 10, 0);

      // Rain Update
      if (rain) {
        for(let i=0; i<config.rain; i++) {
           // Simple rain movement logic here...
        }
      }

      composer.render();
      requestAnimationFrame(animate);
    };
    animate();

    // --- CINEMATIC SEQUENCE ---
    const tl = gsap.timeline();
    tl.fromTo(".hero-char", 
      { opacity: 0, scale: 2, y: 100, filter: "blur(20px)" },
      { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", duration: 2.5, stagger: 0.1, ease: "back.out(2)" }
    );
    tl.fromTo(".tagline-word", 
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 1.5, stagger: 0.2, ease: "power4.out" },
      "-=1.5"
    );

    return () => {
      renderer.dispose();
      composer.dispose();
    };
  }, []);

  const handleEnter = () => {
    gsap.to(".intro-overlay", { 
      opacity: 0, 
      scale: 1.1, 
      duration: 2, 
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
      
      {/* HUD & Metadata */}
      <div className="absolute top-12 left-12 flex flex-col gap-2 pointer-events-none">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Field Simulation Active</span>
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          <span className="text-[11px] font-bold text-white/60 uppercase">Tier: {perfTier} Ecosystem</span>
        </div>
      </div>

      {/* Hero Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
        <div className="mb-8 flex flex-wrap justify-center gap-x-4 md:gap-x-8">
          {"KrishiShield AI".split("").map((char, i) => (
            <span key={i} className="hero-char inline-block font-headline text-5xl md:text-9xl text-white font-black tracking-tighter mix-blend-overlay">
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-20 max-w-3xl">
          {"Where Every Field Becomes Intelligent".split(" ").map((word, i) => (
            <span key={i} className="tagline-word font-body text-white/80 text-xl md:text-4xl font-light tracking-tight italic">
              {word}
            </span>
          ))}
        </div>

        <button 
          onClick={handleEnter}
          className="pointer-events-auto group relative px-20 py-10 overflow-hidden transition-all active:scale-95"
        >
          {/* Vine Border SVG */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 240 80" preserveAspectRatio="none">
            <rect className="vine-border w-full h-full fill-none stroke-primary/30 stroke-2" x="1" y="1" width="238" height="78" rx="8" />
          </svg>
          <span className="relative z-10 font-bold uppercase tracking-[0.5em] text-white flex items-center gap-6 group-hover:gap-10 transition-all text-sm">
            Enter the Field <ArrowRight size={24} className="text-primary" />
          </span>
          <div className="absolute inset-0 bg-primary/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-1000" />
        </button>
      </div>

      {/* Controls */}
      <div className="absolute bottom-12 right-12 flex gap-6 z-[10001]">
        <button 
          onClick={() => setMuted(!muted)}
          className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center text-white/30 hover:text-white transition-all backdrop-blur-3xl bg-white/5 hover:scale-110"
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <button className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center text-white/30 hover:text-white transition-all backdrop-blur-3xl bg-white/5 hover:scale-110">
          <Settings size={20} />
        </button>
      </div>

      <style jsx global>{`
        .hero-char {
          text-shadow: 0 0 40px rgba(76,175,80,0.5);
        }
        .vine-border {
          stroke-dasharray: 800;
          stroke-dashoffset: 800;
          animation: vine-draw 3s forwards 1s ease-out;
        }
        @keyframes vine-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
