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
    grad.addColorStop(0, "#b0b8c0");     // light grey top
    grad.addColorStop(0.15, "#bcc4cc");  // pale grey
    grad.addColorStop(0.30, "#c8d0d8");  // soft grey
    grad.addColorStop(0.45, "#d0d8dd");  // lighter grey
    grad.addColorStop(0.55, "#d5dde0");  // near white grey horizon
    grad.addColorStop(0.65, "#c0ccbb");  // grey-green fade
    grad.addColorStop(0.75, "#8aaa8a");  // soft aqua green
    grad.addColorStop(0.85, "#6a9a7a");  // aqua green hills
    grad.addColorStop(1.0, "#5a8a6a");   // ground merge
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
      <meshStandardMaterial color="#6aaa7a" roughness={0.95} metalness={0.0} />
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
          position: [sizeData.radius * -0.1, sizeData.height * 0.3, sizeData.radius * 10],
          fov: 25,
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
