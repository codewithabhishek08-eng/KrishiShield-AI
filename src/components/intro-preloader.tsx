"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { Volume2, VolumeX } from 'lucide-react';

/**
 * KrishiShield AI Opening Cinematic
 * A high-fidelity WebGL landscape built with Three.js and GSAP.
 * Features:
 * - 80,000 instanced wheat stalks with vertex shader wind
 * - Procedural sky shader with sun rise
 * - Flocking boids birds sim
 * - Weather particle system
 * - GSAP animated hero typography
 */

export function IntroPreloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(true);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- RENDERER SETUP ---
    const isMobile = window.innerWidth < 1024;
    const renderer = new THREE.WebGLRenderer({ 
      antialias: !isMobile, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    containerRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.8, 12);

    // --- SHADERS ---
    const skyShader = {
      uniforms: {
        uTime: { value: 0 },
        uSunrise: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uSunrise;
        varying vec2 vUv;
        void main() {
          vec3 preDawn = vec3(0.05, 0.07, 0.15);
          vec3 horizon = vec3(0.95, 0.6, 0.2);
          vec3 goldenHour = vec3(0.9, 0.7, 0.4);
          
          vec3 color = mix(preDawn, horizon, uSunrise * vUv.y * 1.5);
          color = mix(color, goldenHour, clamp(uSunrise - 0.5, 0.0, 1.0) * vUv.y);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    };

    const stalkShader = {
      uniforms: {
        uTime: { value: 0 },
        uWindDir: { value: new THREE.Vector2(1.0, 0.5) },
        uWindStrength: { value: 0.15 }
      },
      vertexShader: `
        attribute float phase;
        uniform float uTime;
        uniform vec2 uWindDir;
        uniform float uWindStrength;
        varying float vHeight;
        
        void main() {
          vHeight = position.y;
          vec3 pos = position;
          
          // Diagonal wind wavefront
          float wind = sin(uTime * 1.2 + instanceMatrix[3][0] * 0.4 + instanceMatrix[3][2] * 0.4 + phase) * uWindStrength;
          pos.x += wind * vHeight;
          pos.z += (wind * 0.5) * vHeight;
          
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vHeight;
        void main() {
          vec3 base = vec3(0.78, 0.66, 0.43); // Wheat
          vec3 tip = vec3(0.54, 0.41, 0.08); // Burnt amber
          gl_FragColor = vec4(mix(base, tip, vHeight), 1.0);
        }
      `
    };

    // --- OBJECTS: WHEAT ---
    const stalkCount = isMobile ? 30000 : 80000;
    const stalkGeo = new THREE.CylinderGeometry(0.005, 0.012, 1, 4);
    stalkGeo.translate(0, 0.5, 0);
    
    // Add phase attribute for individual swaying
    const phases = new Float32Array(stalkCount);
    for (let i = 0; i < stalkCount; i++) phases[i] = Math.random() * Math.PI * 2;
    stalkGeo.setAttribute('phase', new THREE.InstancedBufferAttribute(phases, 1));

    const stalkMat = new THREE.ShaderMaterial({
      uniforms: stalkShader.uniforms,
      vertexShader: stalkShader.vertexShader,
      fragmentShader: stalkShader.fragmentShader
    });
    
    const stalks = new THREE.InstancedMesh(stalkGeo, stalkMat, stalkCount);
    const dummy = new THREE.Object3D();
    const range = 60;
    for (let i = 0; i < stalkCount; i++) {
      dummy.position.set((Math.random() - 0.5) * range, 0, (Math.random() - 0.5) * range);
      dummy.scale.set(1, 0.7 + Math.random() * 0.5, 1);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      stalks.setMatrixAt(i, dummy.matrix);
    }
    scene.add(stalks);

    // --- OBJECTS: SKY DOME ---
    const skyGeo = new THREE.SphereGeometry(200, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: skyShader.uniforms,
      vertexShader: skyShader.vertexShader,
      fragmentShader: skyShader.fragmentShader,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // --- OBJECTS: BIRDS ---
    const birdCount = 200;
    const birdGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.2, 0, 0.1),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.2, 0, 0.1)
    ]);
    const birdMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    const birds = new THREE.InstancedMesh(birdGeo, birdMat, birdCount);
    birds.position.y = 15;
    scene.add(birds);

    const birdData = Array.from({ length: birdCount }, () => ({
      pos: new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 10),
      vel: new THREE.Vector3(0.05, 0, 0)
    }));

    // --- OBJECTS: RAIN ---
    const rainCount = 40000;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i++) rainPos[i] = (Math.random() - 0.5) * 100;
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.05, transparent: true, opacity: 0 });
    const rain = new THREE.Points(rainGeo, rainMat);
    scene.add(rain);

    // --- LIGHTING ---
    const sun = new THREE.DirectionalLight(0xfff0d2, 0.5);
    sun.position.set(10, 5, -10);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0x404040));

    // --- GSAP TIMELINE ---
    const tl = gsap.timeline();
    
    tl.to(skyShader.uniforms.uSunrise, { value: 1, duration: 12, ease: "power1.inOut" });
    
    tl.fromTo(".hero-title span", 
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, stagger: 0.03, ease: "elastic.out(1, 0.5)", duration: 1.5 },
      2.5
    );

    tl.fromTo(".hero-tagline", 
      { opacity: 0 },
      { opacity: 1, duration: 2, ease: "power2.out" },
      4.0
    );

    tl.to(rainMat, { opacity: 0.2, duration: 5 }, 8);

    // --- ANIMATION LOOP ---
    let frame = 0;
    const clock = new THREE.Clock();
    
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Wind dynamics
      stalkMat.uniforms.uTime.value = time;
      if (Math.floor(time) % 8 === 0) {
        gsap.to(stalkMat.uniforms.uWindDir.value, { 
          x: Math.random() * 2 - 1, 
          y: Math.random() * 2 - 1, 
          duration: 3 
        });
      }

      // Birds Sim (Boids-lite)
      if (time > 4) {
        birdData.forEach((b, i) => {
          b.pos.add(b.vel);
          if (b.pos.x > 50) b.pos.x = -50;
          dummy.position.copy(b.pos);
          dummy.rotation.z = Math.sin(time * 10 + i) * 0.5; // Flapping
          dummy.updateMatrix();
          birds.setMatrixAt(i, dummy.matrix);
        });
        birds.instanceMatrix.needsUpdate = true;
      }

      // Rain fall
      rain.position.y -= 0.5;
      if (rain.position.y < -30) rain.position.y = 30;

      // Camera Dolly
      camera.position.z -= 0.002;

      renderer.render(scene, camera);
    };
    animate();

    // --- CLEANUP ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  const initAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Procedural Wind (Brown Noise)
      const bufferSize = 2 * audioRef.current.sampleRate;
      const noiseBuffer = audioRef.current.createBuffer(1, bufferSize, audioRef.current.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // volume
      }
      const noise = audioRef.current.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      const filter = audioRef.current.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      noise.connect(filter);
      filter.connect(audioRef.current.destination);
      noise.start();
    }
    setMuted(!muted);
    if (muted) audioRef.current.resume();
    else audioRef.current.suspend();
  };

  const handleEnter = () => {
    gsap.to(".preloader-ui", { opacity: 0, duration: 1 });
    gsap.to(".preloader-canvas", { scale: 1.1, opacity: 0, duration: 1.5, ease: "power4.in", onComplete });
  };

  return (
    <div className={`fixed inset-0 z-[2000] bg-[#0D1117] transition-opacity duration-1000 ${active ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div ref={containerRef} className="absolute inset-0 preloader-canvas" />
      
      {/* HUD & UI */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none preloader-ui">
        <h1 className="hero-title font-headline text-[clamp(2.8rem,7vw,6rem)] text-[#F0F4F0] tracking-tighter leading-none mb-4 flex">
          {"KrishiShield AI".split("").map((char, i) => (
            <span key={i} className="inline-block">{char === " " ? "\u00A0" : char}</span>
          ))}
        </h1>
        <p className="hero-tagline font-body font-light text-[#F0F4F0]/80 text-xl md:text-2xl mb-12">
          Turn your field into a fortress.
        </p>
        
        <button 
          onClick={handleEnter}
          className="pointer-events-auto group relative px-10 py-4 overflow-hidden"
        >
          <svg className="absolute inset-0 w-full h-full">
            <rect className="cta-border w-full h-full fill-none stroke-[#4CAF50] stroke-2" />
          </svg>
          <span className="relative z-10 font-bold uppercase tracking-widest text-[#4CAF50] group-hover:text-white transition-colors duration-500">
            Enter Platform
          </span>
          <div className="absolute inset-0 bg-[#4CAF50] -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out" />
        </button>
      </div>

      {/* Controls */}
      <div className="absolute bottom-10 left-10 z-50">
        <button 
          onClick={initAudio}
          className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors bg-black/20 backdrop-blur-md"
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} className="animate-pulse" />}
        </button>
      </div>

      <style jsx global>{`
        .cta-border {
          stroke-dasharray: 600;
          stroke-dashoffset: 600;
          animation: draw-border 1.5s forwards 5s;
        }
        @keyframes draw-border {
          to { stroke-dashoffset: 0; }
        }
        .font-headline { font-family: 'Anybody', sans-serif; }
      `}</style>
    </div>
  );
}
