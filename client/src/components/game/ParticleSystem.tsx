import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useMemoryGame } from "@/lib/stores/useMemoryGame";
import * as THREE from "three";

export default function ParticleSystem() {
  const { gameState } = useMemoryGame();
  const particlesRef = useRef<THREE.Points>(null);
  
  // Create particle system
  const particleData = useMemo(() => {
    const count = 100;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Random positions around the game area
      positions[i3] = (Math.random() - 0.5) * 20;
      positions[i3 + 1] = Math.random() * 10;
      positions[i3 + 2] = (Math.random() - 0.5) * 20;
      
      // Golden particles
      colors[i3] = 1; // R
      colors[i3 + 1] = 0.84; // G
      colors[i3 + 2] = 0; // B
      
      sizes[i] = Math.random() * 3 + 1;
    }
    
    return { positions, colors, sizes, count };
  }, []);

  // Animate particles
  useFrame((state) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleData.count; i++) {
        const i3 = i * 3;
        
        // Floating motion
        positions[i3 + 1] += Math.sin(state.clock.elapsedTime + i) * 0.01;
        
        // Reset particle if it goes too high
        if (positions[i3 + 1] > 12) {
          positions[i3 + 1] = -2;
        }
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      
      // Rotate the entire particle system slowly
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  // Show more intense particles when winning
  const intensity = gameState.phase === 'won' ? 1 : 0.3;

  return (
    <group>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleData.count}
            array={particleData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particleData.count}
            array={particleData.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={2}
          sizeAttenuation={true}
          vertexColors={true}
          transparent={true}
          opacity={intensity}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
