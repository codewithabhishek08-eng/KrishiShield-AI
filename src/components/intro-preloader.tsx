
"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * KrishiShield AI — Cinematic Landing Entry Point
 * Step 1: Base Scene Setup
 */

export function IntroPreloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0A0D1A);

    // 2. CAMERA SETUP
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 0);
    camera.lookAt(0, 3, -10); // Looking forward

    // 3. RENDERER SETUP
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      powerPreference: 'high-performance' 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    containerRef.current.appendChild(renderer.domElement);

    // 4. LIGHTING
    // HemisphereLight: sky #B0BEC5, ground #2E7D32, intensity 0.6
    const hemiLight = new THREE.HemisphereLight(0xB0BEC5, 0x2E7D32, 0.6);
    scene.add(hemiLight);

    // DirectionalLight: color #FF8A65, intensity 0.4, low angle
    const dirLight = new THREE.DirectionalLight(0xFF8A65, 0.4);
    dirLight.position.set(10, 2, 10); 
    scene.add(dirLight);

    // 5. RENDER LOOP
    let animationFrameId: number;
    const animate = () => {
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // 6. WINDOW RESIZE HANDLER
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleEnter = () => {
    setActive(false);
    onComplete();
  };

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0A0D1A] overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* UI Overlay for testing purposes */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <h1 className="text-white/20 text-4xl font-headline font-black uppercase tracking-[1em] mb-8">
          KrishiShield AI
        </h1>
        <button 
          onClick={handleEnter}
          className="pointer-events-auto px-12 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/40 text-xs font-bold uppercase tracking-[0.4em] transition-all active:scale-95"
        >
          Initialize App
        </button>
      </div>
    </div>
  );
}
