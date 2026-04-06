"use client";

import { useEffect, useRef, useMemo } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DomeScene } from "./GeodesicDome";
import type { DomeConfig } from "./GeodesicDome";
import { DOME_SIZES } from "./GeodesicDome";

function CameraController({ isInterior, radius, height }: { isInterior: boolean; radius: number; height: number }) {
  const { camera } = useThree();
  const prevView = useRef<string>("");

  useEffect(() => {
    const viewKey = isInterior ? "interior" : "exterior";
    if (prevView.current === viewKey) return;
    prevView.current = viewKey;

    if (isInterior) {
      camera.position.set(0, height * 0.35, -0.5);
      (camera as THREE.PerspectiveCamera).fov = 90;
    } else {
      camera.position.set(radius * -0.6, height * 0.8, radius * 2.8);
      (camera as THREE.PerspectiveCamera).fov = 40;
    }
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [isInterior, radius, height, camera]);

  return null;
}

function SunsetSky() {
  const meshRef = useRef<THREE.Mesh>(null);

  const skyTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 2; c.height = 512;
    const ctx = c.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, "#0a0a2a");     // deep night blue top
    grad.addColorStop(0.08, "#141438");  // dark blue
    grad.addColorStop(0.18, "#1e2a55");  // navy
    grad.addColorStop(0.28, "#3a3a72");  // blue-purple
    grad.addColorStop(0.38, "#6b4a7a");  // purple
    grad.addColorStop(0.46, "#9a4a5a");  // rose
    grad.addColorStop(0.52, "#cc6633");  // deep orange
    grad.addColorStop(0.57, "#e87840");  // warm orange
    grad.addColorStop(0.62, "#ff9955");  // bright horizon
    grad.addColorStop(0.67, "#ffbb66");  // golden glow
    grad.addColorStop(0.72, "#ddaa66");  // warm fade
    grad.addColorStop(0.78, "#88774a");  // hazy distance
    grad.addColorStop(0.84, "#667744");  // distant hills
    grad.addColorStop(0.92, "#445533");  // dark hills
    grad.addColorStop(1.0, "#334422");   // ground merge
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 512);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  // Very slow rotation
  useFrame((_state, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.006;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[88, 64, 32]} />
      <meshBasicMaterial map={skyTex} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}

function GrassGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.16, 0]}>
      <circleGeometry args={[80, 64]} />
      <meshStandardMaterial color="#3a5a25" roughness={0.95} metalness={0.0} />
    </mesh>
  );
}

export default function DomeViewer({ config, selectedKey }: { config: DomeConfig; selectedKey: string }) {
  const sizeData = DOME_SIZES[config.size];
  const isInterior = config.view === "interior";

  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas
        camera={{
          position: [sizeData.radius * -0.6, sizeData.height * 0.8, sizeData.radius * 2.8],
          fov: 40,
          near: 0.1,
          far: 200,
        }}
        gl={{
          antialias: true,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
      >
        <SunsetSky />
        <GrassGround />
        {/* Warm sunset directional light */}
        {!isInterior && (
          <directionalLight position={[30, 8, -10]} intensity={0.6} color="#ff9955" />
        )}
        <CameraController isInterior={isInterior} radius={sizeData.radius} height={sizeData.height} />
        <DomeScene config={config} selectedKey={selectedKey} />
      </Canvas>
    </div>
  );
}
