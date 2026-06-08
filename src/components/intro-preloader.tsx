
"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { ArrowRight, Volume2, VolumeX, Settings } from 'lucide-react';

/**
 * KRISHISHIELD AI — TRANSCENDENT NATURE LANDING PAGE
 * A living ecosystem replacement.
 * Every pixel computed in real-time. Zero Assets.
 */

// --- SHADERS ---

const LeafShader = {
  uniforms: {
    uTime: { value: 0 },
    uWindDir: { value: new THREE.Vector2(1, 0.5) },
    uSunPos: { value: new THREE.Vector3() },
    uSunIntensity: { value: 1.0 },
    uCursorPos: { value: new THREE.Vector3(0,0,0) },
  },
  vertexShader: `
    attribute float aSize;
    attribute float aPhase;
    attribute vec3 aOffset;
    varying vec2 vUv;
    varying float vBacklight;
    varying float vTranslucency;
    uniform float uTime;
    uniform vec2 uWindDir;
    uniform vec3 uSunPos;
    uniform vec3 uCursorPos;

    void main() {
      vUv = uv;
      vec3 pos = position * aSize;
      
      // Wind front propagation
      float windOffset = dot(aOffset.xz, uWindDir) * 0.15;
      float sway = sin(uTime * 0.8 + aPhase + windOffset) * 0.2;
      pos.x += sway * position.y;
      pos.z += sway * position.y * 0.5;

      // Phototropism (leaning toward cursor)
      float distToCursor = distance(aOffset, uCursorPos);
      float phototrop = smoothstep(30.0, 0.0, distToCursor) * 0.15;
      pos += normalize(uCursorPos - aOffset) * phototrop * position.y;

      vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
      vec3 worldNormal = normalize(mat3(instanceMatrix) * normal);
      vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
      vec3 sunDir = normalize(uSunPos - worldPos.xyz);

      vBacklight = max(0.0, dot(worldNormal, -sunDir));
      vTranslucency = pow(max(0.0, dot(-viewDir, sunDir)), 3.0);

      gl_Position = projectionMatrix * modelViewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vBacklight;
    varying float vTranslucency;
    uniform float uSunIntensity;

    void main() {
      // Procedural leaf shape and veins
      float distToMid = abs(vUv.x - 0.5);
      float edge = smoothstep(0.45, 0.5, distToMid + vUv.y * 0.1);
      if (edge > 0.9) discard;

      vec3 baseColor = mix(vec3(0.1, 0.37, 0.12), vec3(0.78, 0.9, 0.78), vUv.y * 0.5);
      
      // Vein network
      float veins = sin(vUv.x * 40.0 + vUv.y * 10.0) * 0.1;
      baseColor -= veins * 0.2;

      // Subsurface scattering
      vec3 sssColor = vec3(0.4, 0.8, 0.2) * uSunIntensity;
      vec3 final = mix(baseColor, sssColor, vBacklight * 0.5 + vTranslucency * 0.4);

      gl_FragColor = vec4(final, 1.0);
    }
  `
};

const SkyShader = {
  uniforms: {
    uSunPos: { value: new THREE.Vector3() },
    uTime: { value: 0 },
    uPhase: { value: 0.0 }, // 0 to 1
  },
  vertexShader: `
    varying vec3 vWorldPos;
    void main() {
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vWorldPos;
    uniform vec3 uSunPos;
    uniform float uPhase;
    uniform float uTime;

    void main() {
      vec3 dir = normalize(vWorldPos);
      float sunDot = max(0.0, dot(dir, normalize(uSunPos)));
      
      vec3 space = vec3(0.01, 0.01, 0.05);
      vec3 dawn = vec3(0.8, 0.4, 0.2);
      vec3 day = vec3(0.3, 0.6, 0.9);
      
      vec3 sky = mix(space, day, smoothstep(-0.2, 0.2, uSunPos.y / 500.0));
      sky += dawn * pow(sunDot, 8.0) * 0.5 * (1.0 - smoothstep(0.0, 0.5, uSunPos.y / 500.0));
      
      // Procedural Stars
      if (uSunPos.y < 50.0) {
        float stars = fract(sin(dot(dir.xyz ,vec3(12.9898,78.233,45.164))) * 43758.5453);
        if (stars > 0.999) sky += vec3(1.0) * (1.0 - uPhase);
      }

      gl_FragColor = vec4(sky, 1.0);
    }
  `
};

// --- MAIN COMPONENT ---

export function IntroPreloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const [muted, setMuted] = useState(true);
  const [tier, setTier] = useState<number>(1);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- SETUP ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 4000);
    camera.position.set(0, 8, 40);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // --- PERFORMANCE DETECTION ---
    const cores = navigator.hardwareConcurrency || 4;
    const currentTier = cores > 8 ? 1 : cores > 4 ? 2 : 3;
    setTier(currentTier);

    // --- ECOSYSTEM ELEMENTS ---
    
    // 1. Spore Genesis (Initial Phase)
    const sporeCount = 512;
    const sporeGeo = new THREE.BufferGeometry();
    const sporePos = new Float32Array(sporeCount * 3);
    const sporeTargetPos = new Float32Array(sporeCount * 3);
    for (let i = 0; i < sporeCount; i++) {
      const angle = i * 0.1;
      const radius = 0.5 * Math.log(1 + i * 0.5);
      sporeTargetPos[i*3] = Math.cos(angle) * radius;
      sporeTargetPos[i*3+1] = Math.sin(angle) * radius;
      sporeTargetPos[i*3+2] = 0;
    }
    sporeGeo.setAttribute('position', new THREE.BufferAttribute(sporePos, 3));
    const sporeMat = new THREE.PointsMaterial({ color: 0x00FF88, size: 0.1, transparent: true, opacity: 0 });
    const spores = new THREE.Points(sporeGeo, sporeMat);
    scene.add(spores);

    // 2. The Canopy (80,000 Leaves)
    const leafCount = currentTier === 1 ? 80000 : currentTier === 2 ? 40000 : 15000;
    const leafGeo = new THREE.PlaneGeometry(1, 1.5);
    const instLeaf = new THREE.InstancedMesh(leafGeo, new THREE.ShaderMaterial(LeafShader), leafCount);
    
    const dummy = new THREE.Object3D();
    const sizes = new Float32Array(leafCount);
    const phases = new Float32Array(leafCount);
    const offsets = new Float32Array(leafCount * 3);

    for (let i = 0; i < leafCount; i++) {
      const x = (Math.random() - 0.5) * 400;
      const y = 30 + Math.random() * 60;
      const z = (Math.random() - 0.5) * 400;
      
      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      dummy.updateMatrix();
      instLeaf.setMatrixAt(i, dummy.matrix);
      
      sizes[i] = 0.3 + Math.random() * 1.8;
      phases[i] = Math.random() * Math.PI * 2;
      offsets[i*3] = x; offsets[i*3+1] = y; offsets[i*3+2] = z;
    }
    leafGeo.setAttribute('aSize', new THREE.InstancedBufferAttribute(sizes, 1));
    leafGeo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
    leafGeo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    instLeaf.visible = false;
    scene.add(instLeaf);

    // 3. Forest Floor ( fBm Terrain )
    const terrainGeo = new THREE.PlaneGeometry(600, 600, 256, 256);
    terrainGeo.rotateX(-Math.PI / 2);
    const terrainMat = new THREE.MeshStandardMaterial({ 
      color: 0x1A0A00, 
      roughness: 0.9,
      metalness: 0.1,
      onBeforeCompile: (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <map_fragment>',
          `
          float v = fract(sin(dot(vUv.xy ,vec2(12.9898,78.233))) * 43758.5453);
          diffuseColor.rgb = mix(vec3(0.24, 0.15, 0.14), vec3(0.18, 0.49, 0.2), v * 0.4);
          `
        );
      }
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.receiveShadow = true;
    terrain.position.y = -5;
    terrain.visible = false;
    scene.add(terrain);

    // 4. Sky & Sun
    const skyGeo = new THREE.SphereGeometry(2000, 32, 32);
    const skyMat = new THREE.ShaderMaterial({ ...SkyShader, side: THREE.BackSide });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    const sun = new THREE.DirectionalLight(0xFFF176, 1.2);
    sun.castShadow = true;
    scene.add(sun);

    // 5. Birds (Murmuration)
    const birdCount = 1400;
    const birdGeo = new THREE.ConeGeometry(0.1, 0.5, 3);
    birdGeo.rotateX(Math.PI / 2);
    const birds = new THREE.InstancedMesh(birdGeo, new THREE.MeshBasicMaterial({ color: 0x000000 }), birdCount);
    birds.visible = false;
    scene.add(birds);

    const birdData = Array.from({ length: birdCount }, () => ({
      pos: new THREE.Vector3((Math.random()-0.5)*100, 40 + Math.random()*20, (Math.random()-0.5)*100),
      vel: new THREE.Vector3(Math.random()-0.5, 0, Math.random()-0.5),
      acc: new THREE.Vector3()
    }));

    // --- POST PROCESSING ---
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.8, 0.9, 0.5);
    composer.addPass(bloom);
    
    const film = new FilmPass(0.09, 0.025, 648, false);
    composer.addPass(film);

    // --- GENESIS TIMELINE ---
    const tl = gsap.timeline();
    
    // Spore division
    tl.to(sporeMat, { opacity: 0.4, duration: 0.5 });
    tl.to(sporePos, {
      duration: 2.5,
      ease: "power2.inOut",
      onUpdate: () => {
        for(let i=0; i<sporeCount; i++) {
          sporePos[i*3] = sporeTargetPos[i*3];
          sporePos[i*3+1] = sporeTargetPos[i*3+1];
        }
        sporeGeo.attributes.position.needsUpdate = true;
      }
    });

    // Big Bang collapse & erupt
    tl.to(sporeMat, { color: "#FFFFFF", opacity: 1, duration: 0.3 });
    tl.to(sporePos, {
      duration: 0.4,
      ease: "back.in(2)",
      onUpdate: () => {
        for(let i=0; i<sporeCount; i++) {
          sporePos[i*3] *= 0.1;
          sporePos[i*3+1] *= 0.1;
        }
        sporeGeo.attributes.position.needsUpdate = true;
      },
      onComplete: () => {
        spores.visible = false;
        terrain.visible = true;
        instLeaf.visible = true;
        birds.visible = true;
        gsap.to(camera.position, { z: 80, y: 15, duration: 4, ease: "power4.out" });
        gsap.from(".hero-char", { opacity: 0, y: 100, stagger: 0.08, ease: "back.out(1.7)", duration: 2 });
        gsap.from(".tagline-word", { opacity: 0, y: 20, delay: 1, stagger: 0.2, duration: 1.5 });
      }
    });

    // --- INTERACTION ---
    const mouse = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    window.addEventListener('mousemove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(mouse.x, mouse.y), camera);
      const intersect = new THREE.Vector3();
      raycaster.ray.at(30, intersect);
      instLeaf.material.uniforms.uCursorPos.value.copy(intersect);
    });

    // --- LOOP ---
    const clock = new THREE.Clock();
    const animate = () => {
      const time = clock.getElapsedTime();
      
      // Sky Cycle (120s)
      const cycle = (time % 120) / 120;
      const sunAngle = cycle * Math.PI * 2 - Math.PI/2;
      sun.position.set(Math.cos(sunAngle) * 500, Math.sin(sunAngle) * 500, 200);
      
      skyMat.uniforms.uSunPos.value.copy(sun.position);
      skyMat.uniforms.uPhase.value = Math.max(0, Math.sin(sunAngle));
      instLeaf.material.uniforms.uTime.value = time;
      instLeaf.material.uniforms.uSunPos.value.copy(sun.position);
      instLeaf.material.uniforms.uSunIntensity.value = Math.max(0.1, Math.sin(sunAngle));

      // Murmuration (Boids)
      if (birds.visible) {
        for (let i = 0; i < birdCount; i++) {
          const bird = birdData[i];
          // Simple circular drift + boundary logic
          bird.acc.set(Math.sin(time + i) * 0.01, 0, Math.cos(time + i) * 0.01);
          bird.vel.add(bird.acc).clampLength(0, 0.5);
          bird.pos.add(bird.vel);
          
          if (Math.abs(bird.pos.x) > 200) bird.pos.x *= -0.9;
          if (Math.abs(bird.pos.z) > 200) bird.pos.z *= -0.9;

          dummy.position.copy(bird.pos);
          dummy.lookAt(bird.pos.clone().add(bird.vel));
          dummy.updateMatrix();
          birds.setMatrixAt(i, dummy.matrix);
        }
        birds.instanceMatrix.needsUpdate = true;
      }

      composer.render();
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      renderer.dispose();
      composer.dispose();
    };
  }, [tier]);

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
      
      {/* Cinematic HUD */}
      <div className="absolute top-12 left-12 flex flex-col gap-2 pointer-events-none">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Ecosystem Uplink Established</span>
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#00FF88]" />
          <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Tier {tier}: Transcendent Rendering</span>
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
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 240 80" preserveAspectRatio="none">
            <rect className="vine-border w-full h-full fill-none stroke-primary/30 stroke-2" x="1" y="1" width="238" height="78" rx="12" />
          </svg>
          <span className="relative z-10 font-bold uppercase tracking-[0.5em] text-white flex items-center gap-6 group-hover:gap-10 transition-all text-sm">
            Enter The Living World <ArrowRight size={24} className="text-primary" />
          </span>
          <div className="absolute inset-0 bg-primary/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-1000" />
        </button>
      </div>

      {/* Atmospheric Controls */}
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
          text-shadow: 0 0 40px rgba(0, 255, 136, 0.4);
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
