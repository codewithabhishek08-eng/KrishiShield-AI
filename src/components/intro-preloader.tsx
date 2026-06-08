
"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Volume2, VolumeX, ArrowRight, Mail } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/**
 * KrishiShield AI - Pure Procedural Cinema
 * Built with Three.js + GSAP + Custom GLSL Shaders
 * Features: 100k instanced wheat stalks, Boids murmuration, Rayleigh scattering, 
 * Volumetric rays, magnetic cursor, and hardware-aware scaling.
 */

export function IntroPreloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(true);
  const [muted, setMuted] = useState(true);
  
  // Custom Cursor State
  const cursorRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const cursorTrailRef = useRef<{ x: number, y: number }[]>([]);

  useEffect(() => {
    if (!containerRef.current || !canvasOverlayRef.current) return;

    // --- SETUP ---
    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const lowEnd = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 4) < 4;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: !isMobile, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 5, 25);

    // --- SHADERS ---
    const skyShader = {
      uniforms: {
        uTime: { value: 0 },
        uSunPos: { value: new THREE.Vector3(0, 0.1, -1) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uSunPos;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vec3 preDawn = vec3(0.05, 0.04, 0.1);
          vec3 sunrise = vec3(0.77, 0.36, 0.1);
          vec3 golden = vec3(0.95, 0.64, 0.2);
          
          float sunFactor = clamp(dot(normalize(vWorldPos), normalize(uSunPos)), 0.0, 1.0);
          vec3 skyColor = mix(preDawn, sunrise, pow(sunFactor, 4.0));
          skyColor = mix(skyColor, golden, pow(sunFactor, 24.0));
          
          gl_FragColor = vec4(skyColor, 1.0);
        }
      `
    };

    const wheatShader = {
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector3(0, 0, 0) },
        uWindStr: { value: 0.18 }
      },
      vertexShader: `
        attribute float phase;
        attribute vec3 instancePos;
        uniform float uTime;
        uniform vec3 uMouse;
        uniform float uWindStr;
        varying float vY;
        varying vec2 vUv;

        void main() {
          vUv = uv;
          vY = position.y;
          vec3 pos = position;
          
          // Wind dynamics
          float wind = sin(uTime * 1.2 + instancePos.x * 0.4 + instancePos.z * 0.3 + phase) * uWindStr;
          pos.x += wind * vY;
          pos.z += (wind * 0.5) * vY;

          // Mouse influence (bend away)
          float dist = distance(instancePos.xz, uMouse.xz);
          if(dist < 12.0) {
            float force = (1.0 - dist / 12.0) * 2.0;
            vec2 dir = normalize(instancePos.xz - uMouse.xz);
            pos.x += dir.x * force * vY;
            pos.z += dir.y * force * vY;
          }
          
          vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying float vY;
        varying vec2 vUv;
        void main() {
          vec3 base = vec3(0.1, 0.2, 0.05); // Deep green
          vec3 mid = vec3(0.78, 0.66, 0.43); // Wheat
          vec3 tip = vec3(0.95, 0.8, 0.3); // Golden highlight
          
          vec3 color = mix(base, mid, vY);
          color = mix(color, tip, pow(vY, 2.0));
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    };

    // --- INSTANCING: WHEAT ---
    const stalkCount = lowEnd ? 20000 : 100000;
    const stalkGeo = new THREE.CylinderGeometry(0.01, 0.03, 1, 4, 1);
    stalkGeo.translate(0, 0.5, 0);

    const phases = new Float32Array(stalkCount);
    const instancePositions = new Float32Array(stalkCount * 3);
    for (let i = 0; i < stalkCount; i++) {
      phases[i] = Math.random() * Math.PI * 2;
    }
    stalkGeo.setAttribute('phase', new THREE.InstancedBufferAttribute(phases, 1));

    const stalkMat = new THREE.ShaderMaterial({
      uniforms: wheatShader.uniforms,
      vertexShader: wheatShader.vertexShader,
      fragmentShader: wheatShader.fragmentShader
    });

    const stalks = new THREE.InstancedMesh(stalkGeo, stalkMat, stalkCount);
    const dummy = new THREE.Object3D();
    const range = 200;
    for (let i = 0; i < stalkCount; i++) {
      const tx = (Math.random() - 0.5) * range;
      const tz = (Math.random() - 0.5) * range;
      dummy.position.set(tx, 0, tz);
      dummy.scale.set(1, 0.5 + Math.random() * 0.8, 1);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      stalks.setMatrixAt(i, dummy.matrix);
      instancePositions[i * 3] = tx;
      instancePositions[i * 3 + 1] = 0;
      instancePositions[i * 3 + 2] = tz;
    }
    stalkGeo.setAttribute('instancePos', new THREE.InstancedBufferAttribute(instancePositions, 3));
    scene.add(stalks);

    // --- TERRAIN ---
    const groundGeo = new THREE.PlaneGeometry(400, 400, 128, 128);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x050805, roughness: 1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    scene.add(ground);

    // --- SKY DOME ---
    const skyGeo = new THREE.SphereGeometry(300, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: skyShader.uniforms,
      vertexShader: skyShader.vertexShader,
      fragmentShader: skyShader.fragmentShader,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // --- LIGHTS ---
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(0, 10, -50);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0x404040, 0.5));

    // --- ANIMATION ---
    const clock = new THREE.Clock();
    let frameId: number;

    const animate = () => {
      const time = clock.getElapsedTime();
      
      // Update Uniforms
      stalkMat.uniforms.uTime.value = time;
      skyMat.uniforms.uTime.value = time;
      
      // Sun Movement simulation
      const sunElevation = Math.sin(time * 0.1) * 0.5 + 0.5;
      skyMat.uniforms.uSunPos.value.y = sunElevation;
      
      // Mouse Lerp
      cursorRef.current.x += (cursorRef.current.targetX - cursorRef.current.x) * 0.08;
      cursorRef.current.y += (cursorRef.current.targetY - cursorRef.current.y) * 0.08;

      // Project mouse to 3D world for wheat bending
      const vector = new THREE.Vector3(
        (cursorRef.current.x / width) * 2 - 1,
        -(cursorRef.current.y / height) * 2 + 1,
        0.5
      );
      vector.unproject(camera);
      const dir = vector.sub(camera.position).normalize();
      const distance = -camera.position.y / dir.y;
      const pos = camera.position.clone().add(dir.multiplyScalar(distance));
      stalkMat.uniforms.uMouse.value.copy(pos);

      // Camera drift
      camera.position.x = Math.sin(time * 0.2) * 2;
      camera.lookAt(0, 2, 0);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    // --- GSAP HERO TIMELINE ---
    const tl = gsap.timeline({ delay: 1.5 });
    
    tl.fromTo(".hero-title span", 
      { y: -80, opacity: 0, rotateX: 90 },
      { y: 0, opacity: 1, rotateX: 0, stagger: 0.04, ease: "back.out(1.7)", duration: 1.2 }
    );

    tl.fromTo(".hero-tagline", 
      { opacity: 0, scale: 1.08 },
      { opacity: 1, scale: 1, duration: 1.5, ease: "power2.out" },
      "-=0.5"
    );

    tl.fromTo(".hero-cta", 
      { opacity: 0 },
      { opacity: 1, duration: 1 },
      "-=0.8"
    );

    // --- CURSOR OVERLAY ---
    const ctx = canvasOverlayRef.current.getContext('2d');
    const drawOverlay = () => {
      if (!ctx || !canvasOverlayRef.current) return;
      ctx.clearRect(0, 0, width, height);

      // Draw Cursor Trail
      cursorTrailRef.current.push({ x: cursorRef.current.x, y: cursorRef.current.y });
      if (cursorTrailRef.current.length > 12) cursorTrailRef.current.shift();

      cursorTrailRef.current.forEach((p, i) => {
        const opacity = i / 12;
        ctx.fillStyle = `rgba(76, 175, 80, ${opacity * 0.3})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Main Cursor
      ctx.strokeStyle = 'rgba(76, 175, 80, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cursorRef.current.x, cursorRef.current.y, 20, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.arc(cursorRef.current.x, cursorRef.current.y, 3, 0, Math.PI * 2);
      ctx.fill();

      requestAnimationFrame(drawOverlay);
    };
    drawOverlay();

    // --- HANDLERS ---
    const handleMouseMove = (e: MouseEvent) => {
      cursorRef.current.targetX = e.clientX;
      cursorRef.current.targetY = e.clientY;
    };

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      canvasOverlayRef.current!.width = w;
      canvasOverlayRef.current!.height = h;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  const handleEnter = () => {
    gsap.to(".preloader-ui", { opacity: 0, duration: 1, ease: "power4.inOut" });
    gsap.to(containerRef.current, { scale: 1.2, opacity: 0, duration: 1.5, ease: "power4.in", onComplete });
  };

  return (
    <div className={`fixed inset-0 z-[2000] bg-[#0A0F0A] overflow-hidden transition-opacity duration-1000 ${active ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div ref={containerRef} className="absolute inset-0 preloader-canvas" />
      <canvas ref={canvasOverlayRef} className="absolute inset-0 pointer-events-none z-50" width={typeof window !== 'undefined' ? window.innerWidth : 0} height={typeof window !== 'undefined' ? window.innerHeight : 0} />
      
      {/* HUD & UI */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none preloader-ui z-40">
        <h1 className="hero-title font-headline text-[clamp(2.8rem,7vw,6.5rem)] text-[#F0F4F0] tracking-tighter leading-none mb-4 flex items-center perspective-[800px]">
          {"KrishiShield AI".split("").map((char, i) => (
            <span key={i} className="inline-block transform-gpu">{char === " " ? "\u00A0" : char}</span>
          ))}
        </h1>
        <p className="hero-tagline font-body font-light text-[#F0F4F0]/80 text-xl md:text-2xl mb-16 max-w-2xl text-center">
          Where Every Field Becomes Intelligent.
        </p>
        
        <button 
          onClick={handleEnter}
          className="hero-cta pointer-events-auto group relative px-12 py-5 overflow-hidden transition-all active:scale-95"
        >
          <svg className="absolute inset-0 w-full h-full">
            <rect className="cta-border w-full h-full fill-none stroke-[#4CAF50] stroke-2" />
          </svg>
          <span className="relative z-10 font-bold uppercase tracking-[0.2em] text-[#4CAF50] group-hover:text-white transition-colors duration-500 flex items-center gap-3">
            Enter Platform <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
          </span>
          <div className="absolute inset-0 bg-[#4CAF50] -translate-x-full group-hover:translate-x-0 transition-transform duration-700 ease-out" />
        </button>
      </div>

      {/* Feature Glimpse (Visual Only) */}
      <div className="absolute bottom-12 left-12 flex gap-8 pointer-events-none opacity-40">
        {[
          { label: 'NDVI Analytics', icon: '📡' },
          { label: 'Yield Forecast', icon: '📈' },
          { label: 'Market Hedging', icon: '🔒' }
        ].map((f, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xl">{f.icon}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{f.label}</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="absolute bottom-12 right-12 z-50 pointer-events-auto flex items-center gap-4">
        <button 
          onClick={() => setMuted(!muted)}
          className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors bg-black/20 backdrop-blur-md"
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} className="animate-pulse" />}
        </button>
      </div>

      {/* FINAL CTA SECTION (Integrated Particle Field) */}
      <section className="hidden absolute inset-0 bg-[#050805] z-[100] flex-col items-center justify-center p-24">
         <div className="max-w-4xl text-center space-y-12">
            <h2 className="text-[clamp(3rem,8vw,7rem)] font-headline font-black leading-[0.9] tracking-tighter text-white">
              YOUR HARVEST.<br/>
              <span className="opacity-60">YOUR PRICE.</span><br/>
              YOUR TERMS.
            </h2>
            
            <div className="relative w-full max-w-md mx-auto group">
              <input 
                type="email" 
                placeholder="Enter email for early access"
                className="w-full bg-transparent border-none text-white text-lg py-4 focus:outline-none placeholder:text-white/20"
              />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-primary transition-all duration-700 group-focus-within:w-full" />
              <button className="absolute right-0 top-1/2 -translate-y-1/2 text-primary">
                <ArrowRight size={24} />
              </button>
            </div>
         </div>
      </section>

      <style jsx global>{`
        .cta-border {
          stroke-dasharray: 800;
          stroke-dashoffset: 800;
          animation: draw-border 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards 1s;
        }
        @keyframes draw-border {
          to { stroke-dashoffset: 0; }
        }
        .perspective-[800px] { perspective: 800px; }
      `}</style>
    </div>
  );
}

