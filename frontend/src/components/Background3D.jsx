import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Float, PerspectiveCamera, Environment } from "@react-three/drei";

function FloatingShapes() {
  const groupRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.05;
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Abstract Books / Cubes */}
      <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
        <mesh position={[-3, 1, -5]} rotation={[0.5, 0.5, 0]}>
          <boxGeometry args={[1.5, 2, 0.3]} />
          <meshStandardMaterial color="#6d28d9" roughness={0.2} metalness={0.8} />
        </mesh>
      </Float>

      <Float speed={1.5} rotationIntensity={2} floatIntensity={1.5}>
        <mesh position={[4, -2, -6]} rotation={[-0.2, 0.8, 0.1]}>
          <boxGeometry args={[2, 2.5, 0.4]} />
          <meshStandardMaterial color="#0ea5e9" roughness={0.1} metalness={0.9} />
        </mesh>
      </Float>

      {/* Glowing Spheres (Ideas) */}
      <Float speed={3} rotationIntensity={1} floatIntensity={3}>
        <mesh position={[2, 3, -4]}>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshStandardMaterial 
            color="#a78bfa" 
            emissive="#a78bfa" 
            emissiveIntensity={0.5} 
            roughness={0.4} 
          />
        </mesh>
      </Float>

      <Float speed={2.5} rotationIntensity={1} floatIntensity={2}>
        <mesh position={[-4, -1, -3]}>
          <capsuleGeometry args={[0.5, 1, 4, 16]} />
          <meshStandardMaterial 
            color="#38bdf8" 
            emissive="#38bdf8" 
            emissiveIntensity={0.4} 
            roughness={0.3} 
            metalness={0.5} 
          />
        </mesh>
      </Float>
    </group>
  );
}

export default function Background3D() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none opacity-60">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={60} />
        
        {/* Subtle Ambient Light */}
        <ambientLight intensity={0.4} />
        
        {/* Dramatic Directional Lights */}
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#818cf8" />
        <directionalLight position={[-10, -10, -5]} intensity={1} color="#0ea5e9" />
        
        {/* Environment mapping for reflections */}
        <Environment preset="city" />
        
        {/* Stars/Particles in the background */}
        <Stars 
          radius={50} 
          depth={50} 
          count={3000} 
          factor={4} 
          saturation={0} 
          fade 
          speed={0.5} 
        />
        
        <FloatingShapes />
      </Canvas>
    </div>
  );
}
