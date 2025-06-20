import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useSpring, animated } from "@react-spring/three";
import * as THREE from "three";
import { Text } from "@react-three/drei";

interface Card3DProps {
  position: [number, number, number];
  isFlipped: boolean;
  isMatched: boolean;
  icon: string;
  onClick: () => void;
  disabled: boolean;
}

export default function Card3D({ 
  position, 
  isFlipped, 
  isMatched, 
  icon, 
  onClick, 
  disabled 
}: Card3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Animation for card flip
  const { rotation, scale } = useSpring({
    rotation: isFlipped ? [0, Math.PI, 0] : [0, 0, 0],
    scale: isMatched ? [1.1, 1.1, 1.1] : hovered ? [1.05, 1.05, 1.05] : [1, 1, 1],
    config: { mass: 1, tension: 180, friction: 12 }
  });

  // Floating animation for matched cards
  useFrame((state) => {
    if (meshRef.current && isMatched) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const handleClick = () => {
    if (!disabled && !isFlipped && !isMatched) {
      onClick();
    }
  };

  return (
    <animated.mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={handleClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      castShadow
      receiveShadow
    >
      {/* Card Back */}
      <boxGeometry args={[1.5, 2, 0.1]} />
      <meshStandardMaterial
        color={isMatched ? "#ffd700" : hovered ? "#4338ca" : "#1e1b4b"}
        metalness={0.8}
        roughness={0.2}
        emissive={isMatched ? "#ffd700" : "#000000"}
        emissiveIntensity={isMatched ? 0.2 : 0}
      />
      
      {/* Card Front - Icon */}
      {isFlipped && (
        <Text
          position={[0, 0, 0.06]}
          fontSize={0.8}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          rotation={[0, Math.PI, 0]}
        >
          {icon}
        </Text>
      )}
      
      {/* Card Back Pattern */}
      {!isFlipped && (
        <>
          <Text
            position={[0, 0, 0.06]}
            fontSize={0.3}
            color="#ffd700"
            anchorX="center"
            anchorY="middle"
          >
            ★
          </Text>
          <mesh position={[0, 0, 0.055]}>
            <ringGeometry args={[0.4, 0.5, 8]} />
            <meshStandardMaterial color="#ffd700" transparent opacity={0.3} />
          </mesh>
        </>
      )}
    </animated.mesh>
  );
}
