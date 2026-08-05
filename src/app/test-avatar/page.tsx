"use client";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

function AvatarTest({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const { camera } = useThree();

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    console.log("[AvatarTest] Loaded:", url);
    console.log("[AvatarTest] BBox size:", size);
    console.log("[AvatarTest] BBox center:", center);
    console.log("[AvatarTest] Camera pos:", camera.position);
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.frustumCulled = false;
        m.visible = true;
        console.log("[AvatarTest] Mesh:", m.name, "scale:", m.scale, "pos:", m.position);
      }
    });
  }, [scene, camera, url]);

  return (
    <group scale={[1, 1, 1]} position={[0, 0, 0]}>
      <primitive object={scene} />
    </group>
  );
}

export default function TestAvatarPage() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#f5f0eb" }}>
      <h1 style={{ position: "absolute", top: 10, left: 10, zIndex: 10, fontFamily: "sans-serif", fontSize: 14 }}>
        Avatar Raw Test
      </h1>
      <Canvas
        camera={{ position: [0, 1.0, 3.0], fov: 50 }}
        onCreated={({ gl }) => gl.setClearColor("#f5f0eb")}
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={3} />
        <directionalLight position={[2, 5, 2]} intensity={2} />
        <Suspense fallback={null}>
          <AvatarTest url="/models/avatars/ch36-mixamo.min.glb" />
        </Suspense>
        {/* Grid for reference */}
        <gridHelper args={[4, 20, "#cccccc", "#dddddd"]} />
      </Canvas>
    </div>
  );
}
