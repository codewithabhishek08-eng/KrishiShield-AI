"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

// --- SHADERS ---

const GROUND_VERTEX_SHADER = `
  varying vec2 vUv;
  varying float vHeight;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  // 6 octave fBm
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
               mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
  }
  float fBm(vec2 p) {
    float v = 0.0; float a = 0.5; vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 6; ++i) {
      v += a * noise(p);
      p = rot * p * 2.1 + shift;
      a *= 0.45;
    }
    return v;
  }

  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Large scale valley bowl (amp 3.0)
    float dist = length(pos.xz) / 150.0;
    float bowl = pow(dist, 2.0) * 8.0;
    pos.y -= bowl;

    // Surface roughness (amp 0.15)
    float roughness = fBm(pos.xz * 0.15) * 0.15;
    pos.y += roughness;

    vHeight = pos.y;
    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const GROUND_FRAGMENT_SHADER = `
  varying vec2 vUv;
  varying float vHeight;
  varying vec3 vNormal;
  uniform float uTime;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float voronoi(vec2 x) {
    vec2 n = floor(x); vec2 f = fract(x);
    float m = 8.0;
    for(int j=-1; j<=1; j++)
    for(int i=-1; i<=1; i++) {
      vec2 g = vec2(float(i),float(j));
      vec2 o = vec2(hash(n + g));
      vec2 r = g + o - f;
      float d = dot(r,r);
      if(d<m) m = d;
    }
    return sqrt(m);
  }

  void main() {
    float slope = 1.0 - vNormal.y;
    
    vec3 valleyFloor = vec3(0.1, 0.04, 0.0);  // #1A0A00 (Wet dark soil)
    vec3 midSlope = vec3(0.48, 0.25, 0.0);     // #7B3F00 (Red laterite)
    vec3 terraceClay = vec3(0.36, 0.25, 0.22);  // #5D4037 (Paddy clay)
    vec3 bundTops = vec3(0.18, 0.08, 0.01);    // #2E1503 (Humus)
    vec3 highEdges = vec3(0.47, 0.33, 0.28);    // #795548 (Cracked earth)

    vec3 color = mix(valleyFloor, midSlope, smoothstep(-5.0, -1.0, vHeight));
    
    // Blend terrace surfaces based on height and low slope
    if(slope < 0.15) {
      color = mix(color, terraceClay, smoothstep(-3.0, 2.0, vHeight));
      // Subtle shimmer
      float shimmer = pow(max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0))), 20.0);
      color += shimmer * 0.05;
    }

    // High edges Voronoi cracks
    if(vHeight > 2.0) {
      float v = voronoi(vUv * 60.0);
      float cracks = smoothstep(0.0, 0.04, v);
      color = mix(color * 1.3, color, cracks);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

const WATER_VERTEX_SHADER = `
  uniform float uTime;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Gerstner wave function approximation (8 overlapping)
    float w = 0.0;
    w += sin(pos.x * 3.0 + uTime * 1.5) * 0.004;
    w += cos(pos.z * 2.5 + uTime * 1.2) * 0.003;
    w += sin(pos.x * 1.5 + pos.z * 1.5 + uTime * 2.0) * 0.002;
    pos.y += w;

    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const WATER_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform samplerCube uEnvMap;
  uniform vec3 uCameraPos;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  void main() {
    vec3 viewDir = normalize(vWorldPos - uCameraPos);
    vec3 reflDir = reflect(viewDir, vNormal);
    
    // Fresnel reflection (95% grazing, 30% perp)
    float fresnel = pow(1.0 - max(dot(-viewDir, vNormal), 0.0), 5.0);
    
    vec3 env = textureCube(uEnvMap, reflDir).rgb;
    vec3 waterBase = vec3(0.11, 0.23, 0.18); // #1B3A2F monsoon tint
    
    vec3 final = mix(waterBase, env, clamp(fresnel + 0.3, 0.0, 0.95));
    
    // Subtle foam / contact line shimmer
    float foam = smoothstep(0.45, 0.5, 0.5 + 0.5 * sin(uTime * 0.5 + vWorldPos.x * 4.0));
    final = mix(final, final + 0.05, foam * 0.1);

    gl_FragColor = vec4(final, 0.95);
  }
`;

export function IntroPreloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- PHASE 1: A Film Camera inside a World ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060A0F);

    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.2, 14); // Set back to witness the valley amphitheatre
    camera.rotation.x = -8 * (Math.PI / 180);

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

    // --- PHASE 2: The Sacred Ground ---
    const groundGeo = new THREE.PlaneGeometry(300, 300, 512, 512);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: GROUND_VERTEX_SHADER,
      fragmentShader: GROUND_FRAGMENT_SHADER
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    scene.add(ground);

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
        uCameraPos: { value: new THREE.Vector3() }
      },
      vertexShader: WATER_VERTEX_SHADER,
      fragmentShader: WATER_FRAGMENT_SHADER,
      transparent: true
    });

    const terraceHeights = [-0.5, -1.2, -2.1, -3.2, -4.5];
    const terraceRadius = [40, 55, 75, 95, 120];

    terraceHeights.forEach((h, i) => {
      // RingGeometry creates the flat terrace surface
      const ringGeo = new THREE.RingGeometry(i === 0 ? 0 : terraceRadius[i-1], terraceRadius[i], 64);
      ringGeo.rotateX(-Math.PI / 2);
      const water = new THREE.Mesh(ringGeo, waterMat.clone());
      water.position.y = h + 0.02;
      scene.add(water);

      // Earthen Bunds using TorusGeometry
      const bundGeo = new THREE.TorusGeometry(terraceRadius[i], 0.15, 8, 100);
      bundGeo.rotateX(Math.PI / 2);
      const bund = new THREE.Mesh(bundGeo, groundMat);
      bund.position.y = h;
      scene.add(bund);
    });

    // Lighting (Basic setup calibrated for cinematic tone)
    const hemiLight = new THREE.HemisphereLight(0xB0BEC5, 0x2E7D32, 0.6);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xFF8A65, 0.4);
    dirLight.position.set(50, 10, 50);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // --- Animation Loop ---
    const animate = () => {
      const t = clock.getElapsedTime();
      
      // Phase 1: Camera breathing (6s period) and slow drift (11s period)
      camera.position.y = 1.2 + Math.sin(t * (Math.PI / 3.0)) * 0.008;
      camera.position.x = Math.sin(t * (Math.PI / 5.5)) * 0.003;
      
      // Update Uniforms
      groundMat.uniforms.uTime.value = t;
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
          if (child.material.uniforms.uTime) child.material.uniforms.uTime.value = t;
          if (child.material.uniforms.uCameraPos) child.material.uniforms.uCameraPos.value.copy(camera.position);
        }
      });

      // Reflection pass (every 4 frames)
      if (Math.floor(t * 60) % 4 === 0) {
        // Temporarily hide water for environment capture
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.geometry instanceof THREE.RingGeometry) child.visible = false;
        });
        cubeCamera.position.copy(camera.position);
        cubeCamera.update(renderer, scene);
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.geometry instanceof THREE.RingGeometry) child.visible = true;
        });
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
        <button onClick={handleEnter} className="pointer-events-auto px-12 py-5 bg-white/5 hover:bg-primary/10 border border-white/10 rounded-full transition-all backdrop-blur-xl group">
          <span className="text-white/60 text-[11px] font-black uppercase tracking-[0.4em] group-hover:text-white transition-colors">Enter the Field</span>
        </button>
      </div>
      <style jsx global>{`body { cursor: none !important; }`}</style>
    </div>
  );
}
