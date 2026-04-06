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
    grad.addColorStop(0, "#3a5a8a");     // soft blue top
    grad.addColorStop(0.12, "#5a7aaa");  // light blue
    grad.addColorStop(0.25, "#8a9abb");  // pale blue
    grad.addColorStop(0.38, "#bba088");  // warm mauve
    grad.addColorStop(0.48, "#ddaa77");  // soft peach
    grad.addColorStop(0.55, "#eebb88");  // warm golden
    grad.addColorStop(0.62, "#f0cc99");  // pale golden horizon
    grad.addColorStop(0.68, "#ddbb88");  // warm fade
    grad.addColorStop(0.75, "#99aa77");  // soft green distance
    grad.addColorStop(0.82, "#778866");  // distant hills
    grad.addColorStop(0.90, "#556644");  // dark hills
    grad.addColorStop(1.0, "#445533");   // ground merge
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
          position: [sizeData.radius * -0.5, sizeData.height * 0.7, sizeData.radius * 3.8],
          fov: 35,
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
