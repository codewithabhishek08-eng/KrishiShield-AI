
"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * KrishiShield AI — Ancient Indian Monsoon Valley
 * Phases 1-3: Filmic Camera, The Sacred Ground, & Mirror Water
 */

const NOISE_GLSL = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0);
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec4 j = p - 49.0 * floor(p * n_ * n_);
    vec4 x_ = floor(j * n_);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ * n_ + n_ * 0.5;
    vec4 y = y_ * n_ + n_ * 0.5;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }
  float fBm(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;
    for(int i=0; i<6; i++) {
      sum += amp * snoise(p);
      p *= 2.1;
      amp *= 0.45;
    }
    return sum;
  }
`;

export function IntroPreloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- PHASE 1: Cinematic Camera & Renderer ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060A0F);

    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.2, 12);
    camera.rotation.x = -Math.PI * 0.044; // ~8 deg tilt

    const renderer = new THREE.WebGLRenderer({ 
      antialias: false, 
      powerPreference: 'high-performance' 
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

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xB0BEC5, 0x2E7D32, 0.6);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xFF8A65, 0.4);
    dirLight.position.set(50, 10, 50);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // --- PHASE 2: The Sacred Ground ---
    const groundGeo = new THREE.PlaneGeometry(300, 300, 512, 512);
    groundGeo.rotateX(-Math.PI / 2);

    const groundMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSunDir: { value: dirLight.position.clone().normalize() }
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vHeight;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        ${NOISE_GLSL}
        void main() {
          vUv = uv;
          vec3 pos = position;
          float bowl = pow(length(pos.xz) / 150.0, 2.0) * 8.0;
          pos.y -= bowl;
          float roughness = fBm(pos * 0.1) * 0.15;
          pos.y += roughness;
          vHeight = pos.y;
          vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vHeight;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        uniform vec3 uSunDir;
        ${NOISE_GLSL}
        void main() {
          float slope = 1.0 - vNormal.y;
          vec3 valleyFloor = vec3(0.1, 0.04, 0.0);
          vec3 midSlope = vec3(0.48, 0.25, 0.0);
          vec3 terraceClay = vec3(0.36, 0.25, 0.22);
          vec3 highEdges = vec3(0.47, 0.33, 0.28);
          vec3 color = mix(valleyFloor, midSlope, smoothstep(-5.0, -1.0, vHeight));
          color = mix(color, terraceClay, smoothstep(-1.0, 1.0, vHeight));
          color = mix(color, highEdges, smoothstep(2.0, 8.0, vHeight));
          if(vHeight > 2.0) {
            float cracks = snoise(vec3(vUv * 50.0, 0.0));
            color = mix(color, color * 0.8, smoothstep(0.4, 0.5, cracks));
          }
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    scene.add(ground);

    // Terrace Structures
    const terraceHeights = [-0.5, -1.2, -2.1, -3.2, -4.5];
    const terraceRadius = [40, 55, 75, 95, 120];
    
    // --- PHASE 3: Paddy Water Mirror ---
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, { 
      generateMipmaps: true, 
      minFilter: THREE.LinearMipmapLinearFilter 
    });
    const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);

    const waterMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uEnvMap: { value: cubeRenderTarget.texture },
        uCameraPos: { value: camera.position }
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          vec3 pos = position;
          float w = sin(pos.x * 2.0 + uTime * 1.5) * 0.004;
          pos.y += w;
          vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        uniform samplerCube uEnvMap;
        uniform vec3 uCameraPos;
        void main() {
          vec3 viewDir = normalize(vWorldPos - uCameraPos);
          vec3 reflDir = reflect(viewDir, vNormal);
          vec3 env = textureCube(uEnvMap, reflDir).rgb;
          float fresnel = pow(1.0 - max(dot(-viewDir, vNormal), 0.0), 5.0);
          vec3 waterCol = vec3(0.1, 0.22, 0.18);
          vec3 final = mix(waterCol, env, clamp(fresnel + 0.3, 0.0, 0.95));
          gl_FragColor = vec4(final, 1.0);
        }
      `,
      transparent: true
    });

    terraceHeights.forEach((h, i) => {
      const ringGeo = new THREE.RingGeometry(i === 0 ? 0 : terraceRadius[i-1], terraceRadius[i], 64);
      ringGeo.rotateX(-Math.PI / 2);
      const water = new THREE.Mesh(ringGeo, waterMat.clone());
      water.position.y = h + 0.02;
      scene.add(water);
      
      const bundGeo = new THREE.TorusGeometry(terraceRadius[i], 0.2, 8, 100);
      bundGeo.rotateX(Math.PI / 2);
      const bund = new THREE.Mesh(bundGeo, groundMat);
      bund.position.y = h;
      scene.add(bund);
    });

    // --- Animation Loop ---
    const animate = () => {
      const t = clock.getElapsedTime();
      
      // Cinematic Breathing
      camera.position.y = 1.2 + Math.sin(t * 1.0) * 0.008;
      camera.position.x = Math.sin(t * 0.5) * 0.003;
      
      groundMat.uniforms.uTime.value = t;
      waterMat.uniforms.uTime.value = t;
      
      // Update Reflection every few frames for performance
      if (Math.floor(t * 60) % 4 === 0) {
        waterMat.visible = false;
        cubeCamera.position.copy(camera.position);
        cubeCamera.update(renderer, scene);
        waterMat.visible = true;
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
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
      opacity: 0, duration: 1.2, 
      onComplete: () => { setActive(false); onComplete(); } 
    });
  };

  if (!active) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 z-[9999] bg-[#060A0F] overflow-hidden cursor-none">
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-32 pointer-events-none">
        <button onClick={handleEnter} className="pointer-events-auto px-12 py-5 bg-white/5 hover:bg-primary/10 border border-white/10 rounded-full transition-all backdrop-blur-xl">
          <span className="text-white/60 text-[11px] font-black uppercase tracking-[0.4em]">Enter the Field</span>
        </button>
      </div>
      <style jsx global>{`body { cursor: none !important; }`}</style>
    </div>
  );
}
