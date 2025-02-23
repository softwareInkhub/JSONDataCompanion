import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

export default function Scene3D() {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <div className="absolute top-0 left-0 w-full h-[70vh] -z-10 opacity-20">
      <Canvas camera={{ position: [0, 0, 10] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />
        <mesh ref={meshRef}>
          <torusKnotGeometry args={[2, 0.5, 128, 32]} />
          <meshStandardMaterial color="#000000" wireframe={true} />
        </mesh>
        <OrbitControls enableZoom={false} autoRotate />
      </Canvas>
    </div>
  );
}