"use client";

import { ContactShadows } from "@react-three/drei";

export function StudioEnvironment() {
  return (
    <group>
      {/* Warm white background — matches LookBuilder studio feel */}
      <color attach="background" args={["#f5f0eb"]} />

      {/* Subtle atmospheric depth — very short and white so it doesn't muddy */}
      <fog attach="fog" args={["#f5f0eb", 10, 28]} />

      {/* === Lighting === */}
      {/* Warm key light from top-left — mimics a large softbox */}
      <directionalLight
        position={[-3, 6, 4]}
        intensity={1.6}
        color="#fff8f0"
        castShadow={false}
      />
      {/* Cool fill from right — balances the key */}
      <directionalLight position={[4, 4, -2]} intensity={0.7} color="#e8f0ff" />
      {/* Rim / back light for depth */}
      <directionalLight position={[0, 3, -5]} intensity={0.4} color="#ffe8d6" />
      {/* Soft ambient */}
      <ambientLight intensity={0.65} color="#fff4e8" />
      {/* Hemisphere sky/ground */}
      <hemisphereLight args={["#f0e8d8", "#c8b8a8", 0.45]} />

      {/* === Backdrop — seamless white cyclorama === */}
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[10, 64]} />
        <meshStandardMaterial color="#f2ede8" roughness={0.9} metalness={0} />
      </mesh>

      {/* Rear curved wall — creates the cyclorama effect */}
      <mesh position={[0, 4, -5]} receiveShadow>
        <cylinderGeometry args={[7, 7, 10, 48, 1, true, -Math.PI * 0.38, Math.PI * 0.76]} />
        <meshStandardMaterial
          color="#f5f0eb"
          roughness={1}
          metalness={0}
          side={2}
        />
      </mesh>

      {/* Soft left curtain panel — decorative depth like reference */}
      <mesh position={[-4.2, 3.5, -3.5]} rotation={[0, 0.35, 0]}>
        <planeGeometry args={[2.5, 8]} />
        <meshStandardMaterial color="#e8e0d8" roughness={1} side={2} />
      </mesh>
      {/* Soft right curtain panel */}
      <mesh position={[4.2, 3.5, -3.5]} rotation={[0, -0.35, 0]}>
        <planeGeometry args={[2.5, 8]} />
        <meshStandardMaterial color="#e8e0d8" roughness={1} side={2} />
      </mesh>

      {/* Contact shadow — very soft under feet */}
      <ContactShadows
        position={[0, 0.005, 0]}
        opacity={0.22}
        scale={8}
        blur={2.5}
        far={2.5}
        resolution={512}
        color="#5a4030"
      />
    </group>
  );
}
