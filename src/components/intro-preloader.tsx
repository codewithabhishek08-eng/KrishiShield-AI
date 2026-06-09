
"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { ArrowRight } from 'lucide-react';

/**
 * KRISHISHIELD AI — ANCIENT INDIAN MONSOON VALLEY
 * A living simulation of a monsoon morning.
 * Zero assets. Pure Procedural WebGL.
 */

// --- SHADERS ---

const CloudShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x2C3344) },
    uLightning: { value: 0 },
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
    uniform vec3 uColor;
    uniform float uLightning;

    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      float n = noise(vUv * 3.0 + uTime * 0.05);
      float alpha = smoothstep(0.4, 0.6, n) * 0.4;
      vec3 finalColor = mix(uColor, vec3(1.0, 0.9, 1.0), uLightning * alpha * 2.0);
      gl_FragColor = vec4(finalColor, alpha);
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
    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    uniform float uTime;
    uniform float uRainIntensity;
    uniform vec2 uCursorPos;

    void main() {
      vec3 skyReflect = vec3(0.17, 0.2, 0.27);
      float ripples = 0.0;
      
      // Rain Ripples
      for(int i=0; i<8; i++) {
        float t = uTime * 1.2 + float(i) * 0.5;
        vec2 center = vec2(fract(sin(float(i)*14.3)*543.1), fract(cos(float(i)*12.1)*321.4));
        float d = distance(vUv, center);
        ripples += sin(max(0.0, d * 50.0 - t * 10.0)) * exp(-d * 8.0) * uRainIntensity;
      }

      // Cursor Ripples
      float distToCursor = distance(vWorldPos.xz, uCursorPos);
      float cursorRipple = sin(distToCursor * 10.0 - uTime * 15.0) * exp(-distToCursor * 0.5) * 0.1;

      vec3 color = skyReflect + (ripples * 0.05) + cursorRipple;
      gl_FragColor = vec4(color, 0.9);
    }
  `
};

const RiceSeedlingShader = {
  uniforms: {
    uTime: { value: 0 },
    uWindDir: { value: new THREE.Vector2(1.0, 0.2) },
    uCursorPos: { value: new THREE.Vector2(0, 0) },
  },
  vertexShader: `
    attribute vec3 instancePosition;
    attribute float instancePhase;
    varying vec2 vUv;
    uniform float uTime;
    uniform vec2 uWindDir;
    uniform vec2 uCursorPos;

    void main() {
      vUv = uv;
      vec3 pos = position;
      
      float dist = distance(instancePosition.xz, uCursorPos);
      float wind = sin(uTime * 2.0 + instancePhase + instancePosition.x * 0.1) * pos.y * 0.3;
      float repulsion = smoothstep(10.0, 0.0, dist) * 2.5;
      
      pos.x += wind * uWindDir.x + repulsion * pos.y;
      pos.z += wind * uWindDir.y;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos + instancePosition, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    void main() {
      vec3 baseColor = vec3(0.5, 0.78, 0.52);
      vec3 tipColor = vec3(0.7, 0.9, 0.6);
      gl_FragColor = vec4(mix(baseColor, tipColor, vUv.y), 1.0);
    }
  `
};

export function IntroPreloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const [tier, setTier] = useState('Ultra');

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0A0D1A);
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 3, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    containerRef.current.appendChild(renderer.domElement);

    // Performance detection
    const perfTier = navigator.hardwareConcurrency > 8 ? 'Ultra' : navigator.hardwareConcurrency > 4 ? 'High' : 'Medium';
    setTier(perfTier);

    // 2. TERRAIN & PADDIES
    const groundGeo = new THREE.PlaneGeometry(200, 200, 128, 128);
    groundGeo.rotateX(-Math.PI / 2);
    
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x1A2618,
      roughness: 0.9,
      metalness: 0.1
    });

    groundMat.onBeforeCompile = (shader) => {
      // Fix for vUv error in MeshStandardMaterial
      shader.vertexShader = `
        varying vec2 vCustomUv;
        ${shader.vertexShader.replace(
          '#include <uv_vertex>',
          '#include <uv_vertex>\nvCustomUv = uv;'
        )}
      `;
      shader.fragmentShader = `
        varying vec2 vCustomUv;
        ${shader.fragmentShader.replace(
          '#include <common>',
          '#include <common>\nfloat noise(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }'
        ).replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          `
          float n = noise(vCustomUv * 100.0);
          vec3 soilColor = mix(vec3(0.24, 0.15, 0.14), vec3(0.18, 0.49, 0.2), n * 0.4);
          vec4 diffuseColor = vec4( soilColor, opacity );
          `
        )}
      `;
    };

    const ground = new THREE.Mesh(groundGeo, groundMat);
    scene.add(ground);

    const paddyMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(PaddyWaterShader.uniforms),
      vertexShader: PaddyWaterShader.vertexShader,
      fragmentShader: PaddyWaterShader.fragmentShader,
      transparent: true,
    });

    for(let i=0; i<5; i++) {
      const paddyGeo = new THREE.PlaneGeometry(40, 30);
      paddyGeo.rotateX(-Math.PI / 2);
      const paddy = new THREE.Mesh(paddyGeo, paddyMat);
      paddy.position.set(0, 0.05, -i * 35);
      scene.add(paddy);
    }

    // 3. RICE SEEDLINGS (Instanced)
    const seedlingCount = perfTier === 'Ultra' ? 40000 : 15000;
    const seedlingGeo = new THREE.PlaneGeometry(0.05, 0.4);
    seedlingGeo.translate(0, 0.2, 0);
    
    const seedlingInstancedGeo = new THREE.InstancedBufferGeometry().copy(seedlingGeo);
    const instancePositions = new Float32Array(seedlingCount * 3);
    const instancePhases = new Float32Array(seedlingCount);

    for(let i=0; i<seedlingCount; i++) {
      instancePositions[i*3] = (Math.random() - 0.5) * 150;
      instancePositions[i*3+1] = 0.1;
      instancePositions[i*3+2] = (Math.random() - 0.5) * 150;
      instancePhases[i] = Math.random() * Math.PI * 2;
    }

    seedlingInstancedGeo.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(instancePositions, 3));
    seedlingInstancedGeo.setAttribute('instancePhase', new THREE.InstancedBufferAttribute(instancePhases, 1));

    const seedlingMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(RiceSeedlingShader.uniforms),
      vertexShader: RiceSeedlingShader.vertexShader,
      fragmentShader: RiceSeedlingShader.fragmentShader,
      side: THREE.DoubleSide
    });

    const seedlingMesh = new THREE.Mesh(seedlingInstancedGeo, seedlingMat);
    scene.add(seedlingMesh);

    // 4. MONSOON RAIN (Points)
    const rainCount = perfTier === 'Ultra' ? 200000 : 50000;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    const rainVel = new Float32Array(rainCount);

    for(let i=0; i<rainCount; i++) {
      rainPos[i*3] = (Math.random() - 0.5) * 100;
      rainPos[i*3+1] = Math.random() * 50;
      rainPos[i*3+2] = (Math.random() - 0.5) * 100;
      rainVel[i] = 1.0 + Math.random() * 1.5;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 0.05, transparent: true, opacity: 0.4 });
    const rain = new THREE.Points(rainGeo, rainMat);
    scene.add(rain);

    // 5. LIGHTING
    const hemiLight = new THREE.HemisphereLight(0xB0BEC5, 0x2E7D32, 1.2);
    scene.add(hemiLight);
    
    const dawnLight = new THREE.DirectionalLight(0xFF8A65, 0.8);
    dawnLight.position.set(50, 10, -100);
    scene.add(dawnLight);

    // 6. POST PROCESSING
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.1, 0.7, 0.35);
    composer.addPass(bloom);

    // 7. ANIMATION LOOP
    const clock = new THREE.Clock();
    const cursor = new THREE.Vector2(0, 0);

    const onMouseMove = (e: MouseEvent) => {
      cursor.x = (e.clientX / window.innerWidth) * 2 - 1;
      cursor.y = -(e.clientY / window.innerHeight) * 2 + 1;
      
      const projX = cursor.x * 20;
      const projZ = cursor.y * 20;
      seedlingMat.uniforms.uCursorPos.value.set(projX, projZ);
      paddyMat.uniforms.uCursorPos.value.set(projX, projZ);
    };
    window.addEventListener('mousemove', onMouseMove);

    const animate = () => {
      const time = clock.getElapsedTime();
      
      // Rain Update
      const positions = rain.geometry.attributes.position.array as Float32Array;
      for(let i=0; i<rainCount; i++) {
        positions[i*3+1] -= rainVel[i];
        if(positions[i*3+1] < 0) positions[i*3+1] = 50;
      }
      rain.geometry.attributes.position.needsUpdate = true;

      // Uniforms
      seedlingMat.uniforms.uTime.value = time;
      paddyMat.uniforms.uTime.value = time;

      // Camera Drift
      camera.position.x = Math.sin(time * 0.1) * 2;
      camera.lookAt(0, 1, -50);

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
      window.removeEventListener('mousemove', onMouseMove);
      renderer.dispose();
      composer.dispose();
    };
  }, []);

  const handleEnter = () => {
    gsap.to(".intro-overlay", { 
      opacity: 0, 
      scale: 1.1, 
      duration: 1.5, 
      ease: "power3.inOut",
      onComplete: () => {
        setActive(false);
        onComplete();
      }
    });
  };

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0A0D1A] overflow-hidden intro-overlay">
      <div ref={containerRef} className="absolute inset-0" />
      
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-8 text-center">
        <div className="mb-12 overflow-hidden">
          <h1 className="text-6xl md:text-9xl font-headline font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-mist-reveal">
            KrishiShield AI
          </h1>
        </div>
        
        <p className="max-w-xl text-lg md:text-2xl text-white/70 font-light tracking-widest italic mb-16 px-4 animate-mist-reveal [animation-delay:1s]">
          Where Every Field Becomes Intelligent
        </p>

        <button 
          onClick={handleEnter}
          className="pointer-events-auto group relative px-12 py-6 overflow-hidden rounded-full transition-all active:scale-95 shadow-2xl animate-mist-reveal [animation-delay:2s]"
        >
          <div className="absolute inset-0 bg-primary/20 backdrop-blur-xl border border-white/20 rounded-full" />
          <div className="absolute inset-0 bg-primary/40 translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-expo" />
          
          <span className="relative z-10 flex items-center gap-4 text-white font-bold uppercase tracking-[0.4em] text-xs">
            Enter The Field <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform duration-500 text-primary" />
          </span>
        </button>
      </div>

      <div className="absolute bottom-12 left-12 hidden md:block pointer-events-none opacity-40 font-code">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_#4CAF50]" />
            <span className="text-[10px] text-white uppercase tracking-widest">Monsoon Uplink: Active</span>
          </div>
          <span className="text-[9px] text-white/60 uppercase tracking-[0.2em] ml-4.5">Valley Tier: {tier}</span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes mist-reveal {
          from { opacity: 0; filter: blur(10px); transform: translateY(20px); }
          to { opacity: 1; filter: blur(0); transform: translateY(0); }
        }
        .animate-mist-reveal {
          animation: mist-reveal 2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          opacity: 0;
        }
        .ease-expo {
          transition-timing-function: cubic-bezier(0.19, 1, 0.22, 1);
        }
      `}</style>
    </div>
  );
}
