
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
 * KrishiShield AI - Next-Level Cinematic Nature Portal
 * Procedural world generation via Three.js + Custom GLSL
 */

// --- SHADERS ---

const NatureShader = {
  uniforms: {
    uTime: { value: 0 },
    uSunPos: { value: new THREE.Vector3(0, 10, 0) },
    uRain: { value: 0 },
    uWind: { value: 1.0 },
    uDayCycle: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying float vDist;
    uniform float uTime;
    
    void main() {
      vUv = uv;
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uDayCycle;
    uniform float uRain;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      vec3 forestDark = vec3(0.01, 0.04, 0.01);
      vec3 goldenHour = vec3(0.9, 0.5, 0.2);
      vec3 skyBlue = vec3(0.1, 0.3, 0.8);
      
      vec3 finalColor = mix(forestDark, skyBlue, uDayCycle);
      finalColor = mix(finalColor, goldenHour, sin(uTime * 0.1) * 0.5 + 0.5);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

const FoliageShader = {
  uniforms: {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector3(0, 0, 0) },
    uSunPos: { value: new THREE.Vector3(0, 20, 0) },
    uWind: { value: 1.0 },
    uRain: { value: 0.0 },
  },
  vertexShader: `
    attribute vec3 instancePos;
    attribute float instanceSeed;
    uniform float uTime;
    uniform vec3 uMouse;
    uniform float uWind;
    varying float vY;
    varying float vSeed;

    void main() {
      vY = position.y;
      vSeed = instanceSeed;
      vec3 pos = position;
      
      // Dynamic wind swaying
      float wind = sin(uTime * 1.5 + instancePos.x * 0.3 + instanceSeed) * 0.15 * uWind;
      pos.x += wind * vY;
      
      // Cursor repulsion (Magnetic force)
      float dist = distance(instancePos.xz, uMouse.xz);
      if(dist < 20.0) {
        float force = (1.0 - dist / 20.0) * 2.5;
        vec2 dir = normalize(instancePos.xz - uMouse.xz);
        pos.xz += dir * force * vY;
      }

      vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * modelViewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uRain;
    varying float vY;
    varying float vSeed;
    
    void main() {
      vec3 deepGreen = vec3(0.01, 0.1, 0.02);
      vec3 brightGreen = vec3(0.2, 0.5, 0.1);
      vec3 seasonalColor = mix(deepGreen, brightGreen, vY + sin(vSeed) * 0.2);
      
      // Wetness factor during rain
      seasonalColor *= (1.0 - uRain * 0.4);
      
      gl_FragColor = vec4(seasonalColor, 1.0);
    }
  `
};

export function IntroPreloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uiRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const [muted, setMuted] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- SETUP ---
    const width = window.innerWidth;
    const height = window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    containerRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 2000);
    camera.position.set(0, 15, 60);

    const isLowEnd = (navigator.hardwareConcurrency || 4) < 4;

    // --- POST PROCESSING ---
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 1.4, 0.4, 0.7);
    composer.addPass(bloom);
    composer.addPass(new FilmPass(0.12, 0, 0, false));

    // --- CINEMATIC NATURE LAYERS ---
    
    // 1. Terrain (Micro-displacement)
    const groundGeo = new THREE.PlaneGeometry(800, 800, 256, 256);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.ShaderMaterial({
      ...NatureShader,
      uniforms: {
        ...NatureShader.uniforms,
        uBiolum: { value: 0.5 }
      }
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    scene.add(ground);

    // 2. Forest Cathedral (60k Trees)
    const treeCount = isLowEnd ? 8000 : 60000;
    const treeGeo = new THREE.ConeGeometry(0.5, 3, 4);
    treeGeo.translate(0, 1.5, 0);
    const forest = new THREE.InstancedMesh(treeGeo, new THREE.ShaderMaterial(FoliageShader), treeCount);
    const dummy = new THREE.Object3D();
    const seeds = new Float32Array(treeCount);
    const positions = new Float32Array(treeCount * 3);

    for(let i=0; i<treeCount; i++) {
      const tx = (Math.random() - 0.5) * 500;
      const tz = (Math.random() - 0.5) * 400 - 50;
      dummy.position.set(tx, 0, tz);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.scale.set(0.8 + Math.random(), 1 + Math.random() * 2, 0.8 + Math.random());
      dummy.updateMatrix();
      forest.setMatrixAt(i, dummy.matrix);
      seeds[i] = Math.random() * 10.0;
      positions[i*3] = tx; positions[i*3+1] = 0; positions[i*3+2] = tz;
    }
    treeGeo.setAttribute('instanceSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    treeGeo.setAttribute('instancePos', new THREE.InstancedBufferAttribute(positions, 3));
    scene.add(forest);

    // 3. Wheat Plain (120k Stalks)
    const stalkCount = isLowEnd ? 20000 : 120000;
    const stalkGeo = new THREE.CylinderGeometry(0.02, 0.04, 1.2, 3);
    stalkGeo.translate(0, 0.6, 0);
    const wheatField = new THREE.InstancedMesh(stalkGeo, new THREE.ShaderMaterial(FoliageShader), stalkCount);
    for(let i=0; i<stalkCount; i++) {
      const tx = (Math.random() - 0.5) * 300;
      const tz = (Math.random() * 150) + 100;
      dummy.position.set(tx, 0, tz);
      dummy.scale.set(1, 0.8 + Math.random() * 0.4, 1);
      dummy.updateMatrix();
      wheatField.setMatrixAt(i, dummy.matrix);
    }
    scene.add(wheatField);

    // 4. Atmosphere (Stars & Fireflies)
    const starCount = isLowEnd ? 10000 : 120000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for(let i=0; i<starCount; i++) {
      const r = 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i*3+2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true }));
    scene.add(stars);

    // 5. Murmuration (Boids - 1200 Birds)
    const birdCount = isLowEnd ? 200 : 1200;
    const birdGeo = new THREE.PlaneGeometry(0.3, 0.1);
    const birds = new THREE.InstancedMesh(birdGeo, new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }), birdCount);
    const birdData = Array.from({ length: birdCount }, () => ({
      pos: new THREE.Vector3((Math.random()-0.5)*100, 30 + Math.random()*20, (Math.random()-0.5)*100),
      vel: new THREE.Vector3((Math.random()-0.5), 0, (Math.random()-0.5)).normalize().multiplyScalar(0.2)
    }));
    scene.add(birds);

    // 6. Rain System (100k segments)
    const rainCount = isLowEnd ? 0 : 100000;
    const rainGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.8);
    const rain = new THREE.InstancedMesh(rainGeo, new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.3 }), rainCount);
    const rainData = Array.from({ length: rainCount }, () => ({
      pos: new THREE.Vector3((Math.random()-0.5)*400, Math.random()*100, (Math.random()-0.5)*400),
      speed: 1.5 + Math.random() * 2.5
    }));
    scene.add(rain);

    // --- INTERACTIONS ---
    const mouse = new THREE.Vector2();
    const cursor3D = new THREE.Vector3();
    
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      
      // Magnetic cursor trail
      gsap.to("#custom-cursor", {
        x: e.clientX,
        y: e.clientY,
        duration: 0.1,
        ease: "power2.out"
      });
    };
    window.addEventListener('mousemove', handleMouseMove);

    // --- ANIMATION LOOP ---
    const clock = new THREE.Clock();
    const animate = () => {
      const time = clock.getElapsedTime();
      const delta = clock.getDelta();

      // Update Uniforms
      groundMat.uniforms.uTime.value = time;
      forest.material.uniforms.uTime.value = time;
      wheatField.material.uniforms.uTime.value = time;

      // Project mouse to 3D plane for interactive foliage
      cursor3D.set(mouse.x * 200, 0, -mouse.y * 200);
      forest.material.uniforms.uMouse.value.copy(cursor3D);
      wheatField.material.uniforms.uMouse.value.copy(cursor3D);

      // Rain movement
      if (rainCount > 0) {
        for(let i=0; i<rainCount; i++) {
          const r = rainData[i];
          r.pos.y -= r.speed;
          if(r.pos.y < 0) r.pos.y = 100;
          dummy.position.copy(r.pos);
          dummy.updateMatrix();
          rain.setMatrixAt(i, dummy.matrix);
        }
        rain.instanceMatrix.needsUpdate = true;
      }

      // Bird murmuration update
      for(let i=0; i<birdCount; i++) {
        const b = birdData[i];
        b.pos.add(b.vel);
        if(Math.abs(b.pos.x) > 200) b.vel.x *= -1;
        if(Math.abs(b.pos.z) > 200) b.vel.z *= -1;
        dummy.position.copy(b.pos);
        dummy.lookAt(b.pos.clone().add(b.vel));
        dummy.updateMatrix();
        birds.setMatrixAt(i, dummy.matrix);
      }
      birds.instanceMatrix.needsUpdate = true;

      // Camera drift (Nature Documentary style)
      camera.position.x = Math.sin(time * 0.15) * 8;
      camera.position.z = 60 + Math.cos(time * 0.1) * 5;
      camera.lookAt(0, 10, 0);

      composer.render();
      requestAnimationFrame(animate);
    };
    animate();

    // --- GSAP CINEMATIC SEQUENCE ---
    const tl = gsap.timeline({ delay: 0.5 });

    // Assemble Hero Text
    tl.fromTo(".hero-char", 
      { 
        opacity: 0, 
        scale: 2, 
        y: (i) => Math.sin(i) * 100, 
        x: (i) => Math.cos(i) * 100,
        filter: "blur(20px)" 
      },
      { 
        opacity: 1, 
        scale: 1, 
        y: 0, 
        x: 0, 
        filter: "blur(0px)",
        duration: 2.5, 
        stagger: 0.08, 
        ease: "back.out(1.8)" 
      },
      "+=1"
    );

    // Condense Tagline from Mist
    tl.fromTo(".tagline-word",
      { filter: "blur(12px)", opacity: 0, scale: 1.2 },
      { filter: "blur(0px)", opacity: 1, scale: 1, duration: 1.8, stagger: 0.15, ease: "power3.out" },
      "-=1"
    );

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      renderer.dispose();
    };
  }, []);

  const handleEnter = () => {
    gsap.to(".intro-overlay", { 
      opacity: 0, 
      scale: 1.1,
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
    <div className="fixed inset-0 z-[9999] bg-black overflow-hidden intro-overlay">
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Living Magnetic Cursor */}
      <div id="custom-cursor" className="hidden lg:block fixed w-1.5 h-1.5 bg-white rounded-full pointer-events-none z-[10000] mix-blend-difference">
        <div className="absolute inset-0 w-8 h-8 -translate-x-1/2 -translate-y-1/2 border border-white/20 rounded-full scale-100" />
        <div className="absolute inset-0 w-14 h-14 -translate-x-1/2 -translate-y-1/2 border border-white/5 rounded-full scale-100" />
      </div>

      {/* Hero Narrative UI */}
      <div ref={uiRef} className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6">
        <h1 className="flex gap-1 md:gap-4 perspective-[1000px] mb-8">
          {"KrishiShield AI".split("").map((char, i) => (
            <span key={i} className="hero-char inline-block font-headline text-5xl md:text-9xl text-white font-black tracking-tighter mix-blend-overlay">
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </h1>

        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-20 max-w-2xl text-center">
          {"Where Every Field Becomes Intelligent".split(" ").map((word, i) => (
            <span key={i} className="tagline-word font-body text-white/90 text-xl md:text-3xl font-light tracking-tight">
              {word}
            </span>
          ))}
        </div>

        <button 
          onClick={handleEnter}
          className="pointer-events-auto group relative px-20 py-8 overflow-hidden transition-all active:scale-95"
        >
          {/* Growing Vine Border SVG */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
            <rect className="vine-border w-full h-full fill-none stroke-primary/40 stroke-2" x="1" y="1" width="198" height="58" />
          </svg>
          <span className="relative z-10 font-bold uppercase tracking-[0.5em] text-white flex items-center gap-6 group-hover:gap-10 transition-all text-sm">
            Enter the Field <ArrowRight size={22} className="text-primary" />
          </span>
          <div className="absolute inset-0 bg-primary/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-1000" />
        </button>
      </div>

      {/* Environmental Controls */}
      <div className="absolute bottom-12 right-12 flex gap-8 z-[10001]">
        <button 
          onClick={() => setMuted(!muted)}
          className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center text-white/30 hover:text-white transition-all backdrop-blur-xl bg-white/5 hover:scale-110"
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      <style jsx global>{`
        .vine-border {
          stroke-dasharray: 600;
          stroke-dashoffset: 600;
          animation: vine-grow 2.5s forwards 4.5s;
        }
        @keyframes vine-grow { 
          to { stroke-dashoffset: 0; } 
        }
        
        #custom-cursor {
          transition: transform 0.08s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .hero-char {
          text-shadow: 0 0 40px rgba(76, 175, 80, 0.4);
        }
      `}</style>
    </div>
  );
}

    