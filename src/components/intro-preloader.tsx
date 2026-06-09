
"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { ArrowRight } from 'lucide-react';

/**
 * KRISHISHIELD AI — ANCIENT MONSOON VALLEY
 * A high-fidelity procedural ecosystem representing 5,000 years of agricultural wisdom.
 */

// --- SHADERS ---

const MonsoonSkyShader = {
  uniforms: {
    uTime: { value: 0 },
    uLightning: { value: 0 },
    uDawnColor: { value: new THREE.Color(0x00695C) },
    uCoralColor: { value: new THREE.Color(0xFF7043) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform float uTime;
    uniform float uLightning;
    uniform vec3 uDawnColor;
    uniform vec3 uCoralColor;

    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec3 skyBase = mix(vec3(0.17, 0.2, 0.27), vec3(0.4, 0.45, 0.55), vUv.y);
      float clouds = 0.0;
      clouds += noise(vUv * 3.0 + uTime * 0.05) * 0.2;
      clouds += noise(vUv * 6.0 - uTime * 0.02) * 0.1;
      
      vec3 horizon = mix(uDawnColor, uCoralColor, smoothstep(0.0, 0.4, vUv.y));
      vec3 finalSky = mix(skyBase, horizon, (1.0 - vUv.y) * 0.3);
      
      finalSky += vec3(uLightning * 0.8, uLightning * 0.7, uLightning * 1.0) * clouds;
      
      gl_FragColor = vec4(finalSky, 1.0);
    }
  `
};

const PaddyWaterShader = {
  uniforms: {
    uTime: { value: 0 },
    uRainIntensity: { value: 1.0 },
    uCursorPos: { value: new THREE.Vector2(0, 0) },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    uniform float uTime;
    
    void main() {
      vUv = uv;
      vec3 pos = position;
      // Subtle Gerstner-like undulation
      pos.y += sin(pos.x * 0.5 + uTime * 0.8) * 0.01;
      pos.y += cos(pos.z * 0.5 + uTime * 0.6) * 0.01;
      
      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    uniform float uTime;
    uniform vec2 uCursorPos;

    void main() {
      vec3 color = vec3(0.05, 0.1, 0.08); // Dark paddy water
      float ripple = 0.0;
      
      // Procedural rain ripples
      for(int i=0; i<4; i++) {
        float t = uTime * 1.5 + float(i) * 0.7;
        vec2 center = vec2(fract(sin(float(i)*14.3)*543.1), fract(cos(float(i)*12.1)*321.4));
        float d = distance(vUv, center);
        ripple += sin(max(0.0, d * 40.0 - t * 10.0)) * exp(-d * 5.0) * smoothstep(0.0, 0.1, d);
      }

      // Cursor interaction ripple
      float distToCursor = distance(vWorldPos.xz, uCursorPos);
      float cursorRipple = sin(distToCursor * 8.0 - uTime * 12.0) * exp(-distToCursor * 0.5) * 0.05;

      color += (ripple * 0.05) + cursorRipple;
      gl_FragColor = vec4(color, 0.95);
    }
  `
};

const PlantSSSShader = {
  uniforms: {
    uTime: { value: 0 },
    uWindDir: { value: new THREE.Vector2(1, 0.5) },
    uCursorPos: { value: new THREE.Vector2(0, 0) },
  },
  vertexShader: `
    varying vec2 vUv;
    varying float vSway;
    uniform float uTime;
    uniform vec2 uWindDir;
    uniform vec2 uCursorPos;
    
    void main() {
      vUv = uv;
      vec3 pos = position;
      
      vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
      float distToCursor = distance(worldPos.xz, uCursorPos);
      
      // Wind sway
      float sway = sin(uTime * 1.2 + worldPos.x * 0.1 + worldPos.z * 0.1) * pos.y * 0.2;
      pos.x += sway * uWindDir.x;
      pos.z += sway * uWindDir.y;
      
      // Cursor repulsion
      float repulsion = smoothstep(15.0, 0.0, distToCursor) * 2.0;
      vec2 dir = normalize(worldPos.xz - uCursorPos);
      pos.x += dir.x * repulsion * pos.y;
      pos.z += dir.y * repulsion * pos.y;
      
      vSway = sway;
      gl_Position = projectionMatrix * viewMatrix * instanceMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vSway;
    void main() {
      vec3 baseColor = vec3(0.1, 0.35, 0.15); // Deep green
      vec3 tipColor = vec3(0.5, 0.78, 0.52); // Translucent tip
      vec3 finalColor = mix(baseColor, tipColor, vUv.y);
      finalColor += abs(vSway) * 0.1; // Highlights on sway
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

// --- COMPONENT ---

export function IntroPreloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const [monsoonPhase, setMonsoonPhase] = useState('genesis');
  const [performanceTier, setPerformanceTier] = useState('Ultra');

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0A0D1A);
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 8, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // Performance detection
    const tier = navigator.hardwareConcurrency > 8 ? 'Ultra' : navigator.hardwareConcurrency > 4 ? 'High' : 'Medium';
    setPerformanceTier(tier);

    // 2. MONSOON SKY
    const skyGeo = new THREE.SphereGeometry(1000, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(MonsoonSkyShader.uniforms),
      vertexShader: MonsoonSkyShader.vertexShader,
      fragmentShader: MonsoonSkyShader.fragmentShader,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // 3. TERRACED PADDIES
    const paddyCount = 5;
    const paddies: THREE.Mesh[] = [];
    const paddyMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(PaddyWaterShader.uniforms),
      vertexShader: PaddyWaterShader.vertexShader,
      fragmentShader: PaddyWaterShader.fragmentShader,
      transparent: true,
    });

    for (let i = 0; i < paddyCount; i++) {
      const paddyGeo = new THREE.PlaneGeometry(200, 150);
      paddyGeo.rotateX(-Math.PI / 2);
      const paddy = new THREE.Mesh(paddyGeo, paddyMat);
      paddy.position.set(0, -i * 5, -i * 120);
      scene.add(paddy);
      paddies.push(paddy);
    }

    // 4. RICE SEEDLINGS (Instanced)
    const seedlingCount = tier === 'Ultra' ? 40000 : tier === 'High' ? 15000 : 5000;
    const seedlingGeo = new THREE.PlaneGeometry(0.1, 1.2, 1, 4);
    seedlingGeo.translate(0, 0.6, 0);
    const seedlingMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(PlantSSSShader.uniforms),
      vertexShader: PlantSSSShader.vertexShader,
      fragmentShader: PlantSSSShader.fragmentShader,
      side: THREE.DoubleSide,
    });
    const seedlingMesh = new THREE.InstancedMesh(seedlingGeo, seedlingMat, seedlingCount);
    
    const dummy = new THREE.Object3D();
    for (let i = 0; i < seedlingCount; i++) {
      const row = Math.floor(i / 100);
      const col = i % 100;
      const paddyIdx = Math.floor(i / (seedlingCount / paddyCount));
      dummy.position.set(
        (col - 50) * 1.5 + (Math.random() - 0.5) * 0.3,
        -paddyIdx * 5 + 0.1,
        -paddyIdx * 120 + (row % 20 - 10) * 2
      );
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      seedlingMesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(seedlingMesh);

    // 5. MONSOON RAIN (Instanced Lines)
    const rainCount = tier === 'Ultra' ? 150000 : tier === 'High' ? 60000 : 20000;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    const rainVelocities = new Float32Array(rainCount);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 600;
      rainPositions[i * 3 + 1] = Math.random() * 400;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 800;
      rainVelocities[i] = 1.5 + Math.random() * 2.0;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.LineBasicMaterial({ color: 0xAAAAAA, transparent: true, opacity: 0.15 });
    const rainLines = new THREE.Points(rainGeo, rainMat);
    scene.add(rainLines);

    // 6. LIFE: MURMURATION (Instanced Birds)
    const birdCount = 200;
    const birdGeo = new THREE.ConeGeometry(0.1, 0.4, 3);
    birdGeo.rotateX(Math.PI / 2);
    const birdMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const birdMesh = new THREE.InstancedMesh(birdGeo, birdMat, birdCount);
    const birds = Array.from({ length: birdCount }, () => ({
      pos: new THREE.Vector3((Math.random() - 0.5) * 100, 30 + Math.random() * 40, -200 + Math.random() * 100),
      vel: new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), -Math.random()).normalize().multiplyScalar(0.2),
    }));
    scene.add(birdMesh);

    // 7. FIREFLIES
    const ffCount = tier === 'Ultra' ? 1500 : 500;
    const ffGeo = new THREE.BufferGeometry();
    const ffPos = new Float32Array(ffCount * 3);
    for(let i=0; i<ffCount; i++) {
      ffPos[i*3] = (Math.random()-0.5)*200;
      ffPos[i*3+1] = Math.random()*15;
      ffPos[i*3+2] = (Math.random()-0.5)*400;
    }
    ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
    const ffMat = new THREE.PointsMaterial({ color: 0xFFD54F, size: 0.15, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    const fireflies = new THREE.Points(ffGeo, ffMat);
    scene.add(fireflies);

    // 8. LIGHTING
    const ambi = new THREE.HemisphereLight(0xB0BEC5, 0x2E7D32, 0.8);
    scene.add(ambi);
    const dawnSun = new THREE.DirectionalLight(0xFF8A65, 0.6);
    dawnSun.position.set(100, 20, -400);
    scene.add(dawnSun);

    // 9. POST PROCESSING
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderRenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.1, 0.7, 0.35);
    composer.addPass(bloom);

    // 10. ANIMATION LOOP
    const clock = new THREE.Clock();
    const cursor = new THREE.Vector2(0, 0);

    const handleMouseMove = (e: MouseEvent) => {
      cursor.x = (e.clientX / window.innerWidth) * 2 - 1;
      cursor.y = -(e.clientY / window.innerHeight) * 2 + 1;
      
      // Project to XZ plane roughly
      const projX = cursor.x * 100;
      const projZ = cursor.y * 100 - 50;
      seedlingMat.uniforms.uCursorPos.value.set(projX, projZ);
      paddyMat.uniforms.uCursorPos.value.set(projX, projZ);
    };
    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Update Sky & Weather
      skyMat.uniforms.uTime.value = time;
      if (Math.random() > 0.995) { // Random Lightning
        gsap.to(skyMat.uniforms.uLightning, { value: 1.0, duration: 0.05, yoyo: true, repeat: 1 });
      }

      // Update Rain
      const positions = rainLines.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < rainCount; i++) {
        positions[i * 3 + 1] -= rainVelocities[i];
        if (positions[i * 3 + 1] < -20) positions[i * 3 + 1] = 200;
      }
      rainLines.geometry.attributes.position.needsUpdate = true;

      // Update Paddies & Plants
      paddyMat.uniforms.uTime.value = time;
      seedlingMat.uniforms.uTime.value = time;

      // Update Fireflies
      fireflies.rotation.y = time * 0.1;
      ffMat.opacity = 0.5 + Math.sin(time * 2.0) * 0.3;

      // Update Boids
      birds.forEach((b, i) => {
        // Drift
        b.pos.add(b.vel);
        if (b.pos.x > 150) b.pos.x = -150;
        if (b.pos.x < -150) b.pos.x = 150;
        if (b.pos.z > 50) b.pos.z = -500;
        if (b.pos.z < -500) b.pos.z = 50;
        
        dummy.position.copy(b.pos);
        dummy.lookAt(b.pos.clone().add(b.vel));
        dummy.updateMatrix();
        birdMesh.setMatrixAt(i, dummy.matrix);
      });
      birdMesh.instanceMatrix.needsUpdate = true;

      // Subtle Camera Path
      camera.position.x = Math.sin(time * 0.15) * 5;
      camera.position.y = 8 + Math.sin(time * 0.1) * 2;
      camera.lookAt(0, 2, -200);

      composer.render();
      requestAnimationFrame(animate);
    };
    animate();

    // 11. GENESIS SEQUENCE
    gsap.fromTo(paddyMat.uniforms.uRainIntensity, { value: 0 }, { value: 1.0, duration: 4, ease: "power2.inOut", delay: 1 });
    gsap.from(".hero-text-letter", {
      opacity: 0,
      y: 100,
      stagger: 0.1,
      duration: 2,
      ease: "power4.out",
      delay: 5
    });

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      renderer.dispose();
      composer.dispose();
    };
  }, []);

  const handleEnter = () => {
    gsap.to(".intro-overlay", { 
      opacity: 0, 
      scale: 1.2, 
      duration: 2, 
      ease: "expo.inOut",
      onComplete: () => {
        setActive(false);
        onComplete();
      }
    });
  };

  if (!active) return null;

  const heroLetters = "KrishiShield AI".split("");

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0A0D1A] overflow-hidden intro-overlay">
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* HUD & Cinematic Overlays */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-12 flex gap-[0.1em] justify-center overflow-hidden">
          {heroLetters.map((l, i) => (
            <span key={i} className="hero-text-letter text-5xl md:text-8xl font-headline font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              {l === " " ? "\u00A0" : l}
            </span>
          ))}
        </div>
        
        <div className="hero-tagline opacity-0 animate-mist-reveal" style={{ animationDelay: '6.5s' }}>
          <p className="max-w-xl text-lg md:text-2xl text-white/80 font-light tracking-widest italic mb-16 px-4">
            Where Every Field Becomes Intelligent
          </p>
        </div>

        <button 
          onClick={handleEnter}
          className="pointer-events-auto group relative px-12 py-6 overflow-hidden rounded-full transition-all active:scale-95 shadow-2xl opacity-0 animate-mist-reveal"
          style={{ animationDelay: '7.5s' }}
        >
          <div className="absolute inset-0 bg-primary/20 backdrop-blur-xl border border-white/20 rounded-full" />
          <div className="absolute inset-0 bg-primary/40 translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-expo" />
          
          <span className="relative z-10 flex items-center gap-4 text-white font-bold uppercase tracking-[0.4em] text-xs">
            Enter The Field <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform duration-500 text-primary" />
          </span>
        </button>
      </div>

      {/* Atmospheric Telemetry */}
      <div className="absolute bottom-12 left-12 hidden md:block pointer-events-none opacity-40 font-code">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_#4CAF50]" />
            <span className="text-[10px] text-white uppercase tracking-widest">Monsoon Uplink: Active</span>
          </div>
          <span className="text-[9px] text-white/60 uppercase tracking-[0.2em] ml-4.5">Humidity: 94% | Visibility: 1.2km</span>
          <span className="text-[9px] text-white/40 uppercase tracking-[0.2em] ml-4.5">Valley Tier: {performanceTier}</span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes mist-reveal {
          from { opacity: 0; filter: blur(10px); transform: scale(1.1); }
          to { opacity: 1; filter: blur(0); transform: scale(1); }
        }
        .animate-mist-reveal {
          animation: mist-reveal 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .ease-expo {
          transition-timing-function: cubic-bezier(0.19, 1, 0.22, 1);
        }
      `}</style>
    </div>
  );
}

// Wrapper for RenderPass to avoid issues with Three.js type naming in some environments
class RenderRenderPass extends RenderPass {
  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    super(scene, camera);
  }
}
