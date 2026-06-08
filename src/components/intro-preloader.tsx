"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { Volume2, VolumeX, ArrowRight } from 'lucide-react';

/**
 * KrishiShield AI - Cinematic Nature Landing
 * Procedural world generation via Three.js + GLSL
 */

// --- SHADERS ---

const TerrainShader = {
  uniforms: {
    uTime: { value: 0 },
    uBiolum: { value: 0.2 },
  },
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    
    // Simple noise for displacement
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise(vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p);
      f = f*f*(3.0-2.0*f);
      return mix(mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), f.x),
                 mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
    }

    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Breathing earth logic
      float disp = noise(pos.xz * 0.05 + uTime * 0.1) * 2.0;
      disp += sin(uTime * 0.7) * 0.4; // Heartbeat
      pos.y += disp;
      
      vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uBiolum;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      vec3 soilColor = vec3(0.05, 0.04, 0.03);
      vec3 crackColor = vec3(0.0, 0.8, 0.7); // Mycorrhizal teal
      
      float crack = step(0.92, fract(vWorldPos.x * 2.0 + sin(vWorldPos.z * 1.5 + uTime)));
      vec3 finalColor = mix(soilColor, crackColor, crack * uBiolum * (0.5 + 0.5 * sin(uTime * 2.0)));
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

const FoliageShader = {
  uniforms: {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector3(0,0,0) },
    uWind: { value: 1.0 },
    uSeason: { value: 0.0 } // 0 Green -> 1 Gold
  },
  vertexShader: `
    attribute vec3 instancePos;
    attribute float instanceSeed;
    uniform float uTime;
    uniform vec3 uMouse;
    uniform float uWind;
    varying float vY;
    varying float vType;

    void main() {
      vY = position.y;
      vec3 pos = position;
      
      // Wind wave
      float wind = sin(uTime * 1.2 + instancePos.x * 0.2 + instancePos.z * 0.1 + instanceSeed) * 0.15 * uWind;
      pos.x += wind * vY;
      
      // Mouse repulsion
      float dist = distance(instancePos.xz, uMouse.xz);
      if(dist < 15.0) {
        float force = (1.0 - dist / 15.0) * 1.5;
        vec2 dir = normalize(instancePos.xz - uMouse.xz);
        pos.xz += dir * force * vY;
      }

      vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * modelViewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float uSeason;
    varying float vY;
    void main() {
      vec3 green = mix(vec3(0.02, 0.1, 0.02), vec3(0.1, 0.3, 0.1), vY);
      vec3 gold = mix(vec3(0.3, 0.2, 0.05), vec3(0.95, 0.8, 0.3), vY);
      gl_FragColor = vec4(mix(green, gold, uSeason), 1.0);
    }
  `
};

const SkyShader = {
  uniforms: {
    uTime: { value: 0 },
    uPhase: { value: 0 }, // 0: Dawn, 1: Sunrise, 2: Golden, 3: Storm, 4: Night
    uStorm: { value: 0.0 }
  },
  vertexShader: `
    varying vec3 vWorldPos;
    void main() {
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uStorm;
    varying vec3 vWorldPos;

    void main() {
      vec3 sky = vec3(0.01, 0.01, 0.02); // Base Night
      float d = dot(normalize(vWorldPos), vec3(0, 1, 0));
      
      // Storm lightning logic
      float lightning = step(0.998, sin(uTime * 20.0)) * uStorm;
      sky += vec3(0.5, 0.6, 0.8) * lightning;
      
      gl_FragColor = vec4(sky, 1.0);
    }
  `
};

export function IntroPreloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uiRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- SETUP ---
    const width = window.innerWidth;
    const height = window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    containerRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 8, 40);

    const isLowEnd = (navigator.hardwareConcurrency || 4) < 4;

    // --- POST PROCESSING ---
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 1.2, 0.4, 0.8);
    composer.addPass(bloom);
    composer.addPass(new FilmPass(0.18, 0, 0, false));

    // --- ASSETS ---
    // Terrain
    const groundGeo = new THREE.PlaneGeometry(600, 600, 256, 256);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.ShaderMaterial(TerrainShader);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    scene.add(ground);

    // Wheat Field (120k Stalks)
    const stalkCount = isLowEnd ? 25000 : 120000;
    const stalkGeo = new THREE.CylinderGeometry(0.01, 0.02, 1, 3);
    stalkGeo.translate(0, 0.5, 0);
    const wheatMesh = new THREE.InstancedMesh(stalkGeo, new THREE.ShaderMaterial(FoliageShader), stalkCount);
    const dummy = new THREE.Object3D();
    const seeds = new Float32Array(stalkCount);
    const positions = new Float32Array(stalkCount * 3);

    for(let i=0; i<stalkCount; i++) {
      const tx = (Math.random() - 0.5) * 200;
      const tz = (Math.random() - 0.5) * 150 + 50;
      dummy.position.set(tx, 0, tz);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.scale.set(1, 0.8 + Math.random() * 0.4, 1);
      dummy.updateMatrix();
      wheatMesh.setMatrixAt(i, dummy.matrix);
      seeds[i] = Math.random() * Math.PI * 2;
      positions[i*3] = tx; positions[i*3+1] = 0; positions[i*3+2] = tz;
    }
    stalkGeo.setAttribute('instanceSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    stalkGeo.setAttribute('instancePos', new THREE.InstancedBufferAttribute(positions, 3));
    scene.add(wheatMesh);

    // Forest (40k Trees)
    const treeCount = isLowEnd ? 8000 : 40000;
    const treeGeo = new THREE.ConeGeometry(0.5, 2, 4);
    treeGeo.translate(0, 1, 0);
    const forestMesh = new THREE.InstancedMesh(treeGeo, new THREE.ShaderMaterial(FoliageShader), treeCount);
    for(let i=0; i<treeCount; i++) {
      const tx = (Math.random() - 0.5) * 300;
      const tz = -(Math.random() * 200 + 50);
      dummy.position.set(tx, 0, tz);
      dummy.scale.set(1, 1 + Math.random() * 2, 1);
      dummy.updateMatrix();
      forestMesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(forestMesh);

    // Sky
    const skyGeo = new THREE.SphereGeometry(400, 32, 32);
    const skyMat = new THREE.ShaderMaterial({ ...SkyShader, side: THREE.BackSide });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // Starfield
    const starCount = isLowEnd ? 20000 : 80000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for(let i=0; i<starCount; i++) {
      const r = 350;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i*3+2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true }));
    scene.add(stars);

    // Birds (Boids simplified)
    const birdCount = isLowEnd ? 300 : 1200;
    const birdGeo = new THREE.PlaneGeometry(0.2, 0.1);
    const birds = new THREE.InstancedMesh(birdGeo, new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }), birdCount);
    const birdStates = Array.from({ length: birdCount }, () => ({
      pos: new THREE.Vector3((Math.random()-0.5)*100, 20 + Math.random()*20, (Math.random()-0.5)*100),
      vel: new THREE.Vector3((Math.random()-0.5), 0, (Math.random()-0.5)).normalize().multiplyScalar(0.2)
    }));
    scene.add(birds);

    // Cursor Follower
    const mouse = new THREE.Vector2();
    const cursorDummy = new THREE.Vector3();
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / width) * 2 - 1;
      mouse.y = -(e.clientY / height) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // --- ANIMATION LOOP ---
    const clock = new THREE.Clock();
    const animate = () => {
      const time = clock.getElapsedTime();
      
      // Update Uniforms
      groundMat.uniforms.uTime.value = time;
      wheatMesh.material.uniforms.uTime.value = time;
      forestMesh.material.uniforms.uTime.value = time;
      skyMat.uniforms.uTime.value = time;

      // Mouse project
      cursorDummy.set(mouse.x * 100, 0, mouse.y * 100);
      wheatMesh.material.uniforms.uMouse.value.copy(cursorDummy);

      // Murmuration update
      for(let i=0; i<birdCount; i++) {
        const b = birdStates[i];
        b.pos.add(b.vel);
        if(Math.abs(b.pos.x) > 150) b.vel.x *= -1;
        if(Math.abs(b.pos.z) > 150) b.vel.z *= -1;
        dummy.position.copy(b.pos);
        dummy.lookAt(b.pos.clone().add(b.vel));
        dummy.updateMatrix();
        birds.setMatrixAt(i, dummy.matrix);
      }
      birds.instanceMatrix.needsUpdate = true;

      // Camera drift
      camera.position.x = Math.sin(time * 0.1) * 5;
      camera.lookAt(0, 5, 0);

      composer.render();
      requestAnimationFrame(animate);
    };
    animate();

    // --- GSAP TIMELINE ---
    const tl = gsap.timeline({ delay: 1 });
    
    // Dissolve in
    tl.fromTo(groundMat.uniforms.uBiolum, { value: 0 }, { value: 0.8, duration: 4, ease: "sine.inOut" });

    // Hero Text assembly
    const chars = document.querySelectorAll('.hero-char');
    chars.forEach((char) => {
      const rect = char.getBoundingClientRect();
      gsap.fromTo(char, 
        { 
          x: (Math.random() - 0.5) * window.innerWidth, 
          y: (Math.random() - 0.5) * window.innerHeight, 
          opacity: 0,
          scale: 0.5,
          rotation: Math.random() * 360
        }, 
        { 
          x: 0, y: 0, opacity: 1, scale: 1, rotation: 0, 
          duration: 2, ease: "back.out(2.2)", delay: 2 + Math.random() * 0.5 
        }
      );
    });

    // Tagline mist-condensation
    tl.fromTo(".tagline-word", 
      { filter: "blur(8px)", opacity: 0, scale: 1.15 },
      { filter: "blur(0px)", opacity: 1, scale: 1, duration: 1.5, stagger: 0.15, ease: "power2.out" },
      "-=0.5"
    );

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      renderer.dispose();
    };
  }, []);

  const handleEnter = () => {
    gsap.to(".intro-overlay", { 
      opacity: 0, 
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
      
      {/* Custom Cursor */}
      <div id="custom-cursor" className="hidden lg:block fixed w-3 h-3 bg-white rounded-full pointer-events-none z-[10000] mix-blend-difference" />

      {/* Hero UI */}
      <div ref={uiRef} className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6">
        <h1 className="flex gap-1 md:gap-4 perspective-[1000px] mb-6">
          {"KrishiShield AI".split("").map((char, i) => (
            <span key={i} className="hero-char inline-block font-headline text-5xl md:text-9xl text-white font-black tracking-tighter">
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </h1>

        <div className="flex gap-3 mb-16">
          {"Where Every Field Becomes Intelligent".split(" ").map((word, i) => (
            <span key={i} className="tagline-word font-body text-white/80 text-lg md:text-2xl font-light">
              {word}
            </span>
          ))}
        </div>

        <button 
          onClick={handleEnter}
          className="pointer-events-auto group relative px-16 py-6 overflow-hidden transition-all active:scale-95"
        >
          <svg className="absolute inset-0 w-full h-full">
            <rect className="svg-border w-full h-full fill-none stroke-white/40 stroke-2" />
          </svg>
          <span className="relative z-10 font-bold uppercase tracking-[0.4em] text-white flex items-center gap-4 group-hover:gap-8 transition-all">
            Enter the Field <ArrowRight size={20} />
          </span>
          <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
        </button>
      </div>

      {/* Controls */}
      <div className="absolute bottom-12 right-12 flex gap-6 z-[10001]">
        <button 
          onClick={() => setMuted(!muted)}
          className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white/40 hover:text-white transition-colors backdrop-blur-md"
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      <style jsx global>{`
        .svg-border {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: draw 1.5s forwards 4s;
        }
        @keyframes draw { to { stroke-dashoffset: 0; } }
        
        #custom-cursor {
          transition: transform 0.06s cubic-bezier(0.23, 1, 0.32, 1);
        }
      `}</style>
    </div>
  );
}
