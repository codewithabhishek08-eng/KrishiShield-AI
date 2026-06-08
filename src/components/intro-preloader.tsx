"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export function IntroPreloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Sky gradient dome
    const skyGeo = new THREE.SphereGeometry(500, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      color: 0x0f1123, // Zenith indigo
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // Light
    const sun = new THREE.DirectionalLight(0xfff0d2, 1);
    sun.position.set(10, 2, -10);
    scene.add(sun);

    // Wheat field
    const isMobile = window.innerWidth < 768;
    const stalkCount = isMobile ? 20000 : 80000;
    const geometry = new THREE.CylinderGeometry(0.01, 0.01, 1, 4);
    geometry.translate(0, 0.5, 0);
    const material = new THREE.MeshStandardMaterial({ color: 0xe3d1a4 });
    const mesh = new THREE.InstancedMesh(geometry, material, stalkCount);

    const dummy = new THREE.Object3D();
    const rows = Math.sqrt(stalkCount);
    for (let i = 0; i < stalkCount; i++) {
      const x = (i % rows) - rows / 2;
      const z = Math.floor(i / rows) - rows / 2;
      dummy.position.set(x * 0.2, 0, z * 0.2);
      dummy.scale.set(1, 0.8 + Math.random() * 0.4, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(mesh);

    // Dust particles
    const dustCount = 2000;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i++) {
      dustPos[i] = (Math.random() - 0.5) * 50;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, transparent: true, opacity: 0.3 });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    camera.position.set(0, 2, 10);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      
      // Wind effect
      const time = Date.now() * 0.001;
      for (let i = 0; i < stalkCount; i++) {
        mesh.getMatrixAt(i, dummy.matrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
        const wave = Math.sin(time + dummy.position.x * 0.5 + dummy.position.z * 0.5) * 0.05;
        dummy.rotation.x = wave;
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;

      // Dust drift
      dust.position.y += 0.005;
      if (dust.position.y > 5) dust.position.y = -5;

      // Camera motion
      camera.position.z -= 0.0003;
      camera.rotation.x += 0.00005;

      renderer.render(scene, camera);
    };

    animate();

    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            setFaded(true);
            setTimeout(onComplete, 1400);
          }, 500);
          return 100;
        }
        return p + 1;
      });
    }, 50);

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

  return (
    <div 
      className={`fixed inset-0 z-[1000] bg-[#0F1123] overflow-hidden transition-all duration-[1400ms] ${faded ? 'clip-path-reveal' : ''}`}
      style={faded ? { clipPath: 'polygon(0 100%, 100% 0, 100% 100%, 0 100%)' } : {}}
    >
      <div ref={containerRef} className="absolute inset-0" />
      
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <h1 className="font-headline text-anybody-animated text-[clamp(3rem,8vw,6.5rem)] text-[rgba(255,240,210,0.92)] tracking-tight leading-none mb-4">
          KrishiShield
        </h1>
        <p className="font-body font-light text-white/60 text-lg opacity-0 animate-fade-in-delayed">
          Intelligence grows here.
        </p>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/10">
        <div 
          className="h-full bg-[#1B5E20] transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <style jsx>{`
        .animate-fade-in-delayed {
          animation: fade-in 1.2s forwards 1.2s;
        }
        @keyframes fade-in {
          to { opacity: 1; }
        }
        .clip-path-reveal {
          clip-path: polygon(0 0, 100% 0, 100% 0, 0 0) !important;
        }
      `}</style>
    </div>
  );
}
