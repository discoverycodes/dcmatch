import { useMemoryGame } from "@/lib/stores/useMemoryGame";
import { useAudio } from "@/lib/stores/useAudio";
import Card3D from "./Card3D";

export default function GameBoard() {
  const { gameState, flipCard } = useMemoryGame();
  const { playHit } = useAudio();

  const handleCardClick = (index: number) => {
    playHit();
    flipCard(index);
  };

  // Create 4x4 grid layout
  const getCardPosition = (index: number): [number, number, number] => {
    const row = Math.floor(index / 4);
    const col = index % 4;
    return [
      (col - 1.5) * 2, // X position
      0, // Y position
      (row - 1.5) * 2.5 // Z position
    ];
  };

  return (
    <>
      {/* Game Table */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[12, 0.2, 12]} />
        <meshStandardMaterial 
          color="#0f172a" 
          metalness={0.1} 
          roughness={0.8}
        />
      </mesh>
      
      {/* Table Edge Glow */}
      <mesh position={[0, -0.4, 0]}>
        <boxGeometry args={[12.2, 0.1, 12.2]} />
        <meshStandardMaterial 
          color="#ffd700" 
          emissive="#ffd700"
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Cards */}
      {gameState.cards.map((card, index) => (
        <Card3D
          key={index}
          position={getCardPosition(index)}
          isFlipped={card.isFlipped}
          isMatched={card.isMatched}
          icon={card.icon}
          onClick={() => handleCardClick(index)}
          disabled={gameState.phase !== 'playing' || gameState.flippedCards.length >= 2}
        />
      ))}
    </>
  );
}
