
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/**
 * KrishiShield AI — Cinematic 3D Nature Landing Page
 * Full Replacement: Ancient Indian Monsoon Valley
 */

export function IntroPreloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const [tier, setTier] = useState<'Ultra' | 'High' | 'Medium' | 'Low'>('Ultra');
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- PHASE 1: Cinema Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060A0F);
    
    // Performance detection
    const perfScore = (navigator.hardwareConcurrency || 4) * (Number((navigator as any).deviceMemory) || 4);
    const initialTier = perfScore > 32 ? 'Ultra' : perfScore > 16 ? 'High' : perfScore > 8 ? 'Medium' : 'Low';
    setTier(initialTier);

    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.2, 0);
    camera.rotation.x = -Math.PI * 0.044; // 8 degrees tilt down

    const renderer = new THREE.WebGLRenderer({ 
      antialias: false, 
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    const clock = new THREE.Clock();
    const mouse = new THREE.Vector2();
    const cursorWorldPos = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xB0BEC5, 0x2E7D32, 0.6);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xFF8A65, 0.4);
    dirLight.position.set(50, 10, 50);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // --- SHARED SHADER CHUNKS ---
    const NOISE_GLSL = `
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
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }
      float fbm(vec2 p) {
        float v = 0.0; float a = 0.5; vec2 shift = vec2(100);
        for (int i = 0; i < 6; ++i) { v += a * snoise(p); p = p * 2.0 + shift; a *= 0.5; }
        return v;
      }
    `;

    // --- PHASE 2: Sacred Ground ---
    const groundGeo = new THREE.PlaneGeometry(300, 300, 512, 512);
    groundGeo.rotateX(-Math.PI / 2);
    
    const groundMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSunDir: { value: dirLight.position.clone().normalize() }
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vElevation;
        varying vec3 vWorldPos;
        ${NOISE_GLSL}
        void main() {
          vUv = uv;
          vec3 pos = position;
          float elev = fbm(pos.xz * 0.02) * 3.0; // Valley shape
          elev += fbm(pos.xz * 0.2) * 0.15; // Surface roughness
          pos.y += elev;
          vElevation = elev;
          vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vElevation;
        varying vec3 vWorldPos;
        uniform vec3 uSunDir;
        void main() {
          vec3 wetSoil = vec3(0.1, 0.04, 0.0);
          vec3 laterite = vec3(0.48, 0.25, 0.0);
          vec3 clay = vec3(0.36, 0.25, 0.22);
          
          float mixFactor = smoothstep(-1.0, 2.0, vElevation);
          vec3 color = mix(wetSoil, laterite, mixFactor);
          
          // Specular for wetness
          float spec = pow(max(dot(reflect(-uSunDir, vec3(0,1,0)), normalize(cameraPosition - vWorldPos)), 0.0), 32.0);
          color += spec * 0.1;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    scene.add(ground);

    // --- PHASE 3: Paddy Water ---
    const waterLevels = [-0.5, -1.2, -2.1, -3.2, -4.5];
    const waterGeos = waterLevels.map(y => {
      const g = new THREE.PlaneGeometry(80, 80);
      g.rotateX(-Math.PI / 2);
      g.translate(0, y + 0.02, 0);
      return g;
    });
    
    const waterMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uSkyColor: { value: new THREE.Color(0x060A1A) },
        uRipplePos: { value: new Array(10).fill(new THREE.Vector4()) } // x,z,age,amp
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
        varying vec2 vUv;
        varying vec3 vWorldPos;
        uniform float uTime;
        uniform vec3 uSkyColor;
        void main() {
          vec3 baseColor = vec3(0.1, 0.23, 0.18);
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(viewDir, vec3(0,1,0)), 0.0), 5.0);
          vec3 color = mix(baseColor, uSkyColor, fresnel * 0.6);
          gl_FragColor = vec4(color, 0.85);
        }
      `
    });
    
    waterGeos.forEach(geo => scene.add(new THREE.Mesh(geo, waterMat)));

    // --- PHASE 4: Rice Seedlings ---
    const riceCount = initialTier === 'Ultra' ? 50000 : initialTier === 'High' ? 25000 : 10000;
    const riceGeo = new THREE.CylinderGeometry(0.005, 0.02, 0.3, 4);
    riceGeo.translate(0, 0.15, 0);
    const riceMesh = new THREE.InstancedMesh(riceGeo, new THREE.MeshStandardMaterial({ color: 0x81C784, side: THREE.DoubleSide }), riceCount);
    
    const dummy = new THREE.Object3D();
    for(let i=0; i<riceCount; i++) {
      const x = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 60;
      const y = -1.2; // approx terrace level
      dummy.position.set(x, y, z);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      riceMesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(riceMesh);

    // --- PHASE 6: Monsoon Rain ---
    const rainCount = initialTier === 'Ultra' ? 200000 : 80000;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    const rainVelocities = new Float32Array(rainCount);
    for(let i=0; i<rainCount; i++) {
      rainPositions[i*3] = (Math.random() - 0.5) * 100;
      rainPositions[i*3+1] = Math.random() * 50;
      rainPositions[i*3+2] = (Math.random() - 0.5) * 100;
      rainVelocities[i] = 0.2 + Math.random() * 0.2;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.LineBasicMaterial({ color: 0xAAAAAA, transparent: true, opacity: 0.4 });
    const rain = new THREE.LineSegments(rainGeo, rainMat);
    scene.add(rain);

    // --- PHASE 12: Hero Text ---
    const loader = new FontLoader();
    let textMesh: THREE.Mesh;
    loader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/fonts/helvetiker_bold.typeface.json', (font) => {
      const textGeo = new TextGeometry('KrishiShield AI', {
        font: font,
        size: 0.8,
        height: 0.2,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
      });
      textGeo.center();
      const textMat = new THREE.MeshStandardMaterial({ color: 0xE8F5E9, emissive: 0x4CAF50, emissiveIntensity: 0.2 });
      textMesh = new THREE.Mesh(textGeo, textMat);
      textMesh.position.set(0, 2.5, -12);
      textMesh.scale.set(0,0,0);
      scene.add(textMesh);
      
      gsap.to(textMesh.scale, { x: 1, y: 1, z: 1, duration: 2, delay: 5, ease: "elastic.out(1, 0.3)" });
    });

    // --- PHASE 13: Post Processing ---
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.1, 0.7, 0.35);
    composer.addPass(bloomPass);

    // --- LOOP & INTERACTION ---
    window.addEventListener('mousemove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    const animate = () => {
      const t = clock.getElapsedTime();
      
      // Camera Breathing
      camera.position.y = 1.2 + Math.sin(t * 0.5) * 0.01;
      camera.position.x = Math.sin(t * 0.3) * 0.005;
      
      // Update Rain
      const positions = rain.geometry.attributes.position.array as Float32Array;
      for(let i=0; i<rainCount; i++) {
        positions[i*3+1] -= rainVelocities[i];
        positions[i*3] += 0.02; // wind angle
        if(positions[i*3+1] < -5) {
          positions[i*3+1] = 50;
          positions[i*3] = (Math.random() - 0.5) * 100;
        }
      }
      rain.geometry.attributes.position.needsUpdate = true;

      // Cursor Raycast
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(ground);
      if(intersects.length > 0) {
        cursorWorldPos.copy(intersects[0].point);
      }

      // Shader Uniforms
      groundMat.uniforms.uTime.value = t;
      waterMat.uniforms.uTime.value = t;

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
      renderer.dispose();
      if (containerRef.current) containerRef.current.removeChild(renderer.domElement);
    };
  }, []);

  const handleEnter = () => {
    gsap.to(containerRef.current, { 
      opacity: 0, 
      duration: 1.2, 
      onComplete: () => {
        setActive(false);
        onComplete();
      } 
    });
  };

  if (!active) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 z-[9999] bg-[#060A0F] overflow-hidden cursor-none">
      {/* UI Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-32 pointer-events-none">
        <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-1000">
          <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.6em] mb-4">
            A Living Monsoon Intelligence
          </p>
          
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary/40 to-transparent mx-auto" />
          
          <button 
            onClick={handleEnter} 
            className="pointer-events-auto group relative px-12 py-5 bg-white/5 hover:bg-primary/10 border border-white/10 hover:border-primary/40 rounded-full transition-all active:scale-95 backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-primary/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
            <span className="relative text-white/60 group-hover:text-primary text-[11px] font-black uppercase tracking-[0.4em] transition-colors">
              Enter the Field
            </span>
          </button>
        </div>
      </div>

      {/* Performance & Meta HUD */}
      <div className="absolute bottom-8 right-8 flex items-center gap-6 pointer-events-none opacity-20 hover:opacity-100 transition-opacity">
        <div className="flex flex-col items-end">
          <span className="text-[8px] font-bold text-white uppercase tracking-widest">Environment</span>
          <span className="text-[10px] font-black text-primary uppercase">{tier} Tier</span>
        </div>
        <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center">
           <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
        </div>
      </div>

      <style jsx global>{`
        body { cursor: none !important; }
        .cursor-none * { cursor: none !important; }
      `}</style>
    </div>
  );
}

