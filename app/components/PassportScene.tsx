"use client";

import { Canvas } from "@react-three/fiber";

export default function PassportScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.4], fov: 35 }}
      gl={{ antialias: true, alpha: true }}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
      }}
    >
      <ambientLight intensity={1} />

      <mesh>
        <planeGeometry args={[1.4, 1.9]} />
        <meshBasicMaterial color="#ff4545" />
      </mesh>
    </Canvas>
  );
}