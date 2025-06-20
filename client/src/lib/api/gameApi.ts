import { apiRequest } from "../queryClient";
import CryptoJS from 'crypto-js';

export interface GameSession {
  id: string;
  betAmount: number;
  status: 'active' | 'completed';
  result?: 'won' | 'lost';
  winAmount?: number;
  createdAt: string;
}

// Função para descriptografar posições das cartas localmente
export function decryptCardPositions(encryptedData: string, gameKey: string, sessionId: string): number[] {
  try {
    // Separar IV e dados criptografados
    const [ivHex, encryptedHex] = encryptedData.split(':');
    if (!ivHex || !encryptedHex) {
      throw new Error('Formato de dados criptografados inválido');
    }
    
    // Derivar chave usando SHA256 (compatível com servidor)
    const keyString = gameKey + sessionId;
    const key = CryptoJS.SHA256(keyString);
    
    // Converter IV e dados criptografados
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    
    // Criar objeto de parâmetros de cifra
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Hex.parse(encryptedHex)
    });
    
    // Descriptografar
    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedText) {
      throw new Error('Descriptografia resultou em texto vazio');
    }
    
    const positions = JSON.parse(decryptedText);
    return positions;
  } catch (error) {
    throw new Error('Falha na descriptografia das posições das cartas');
  }
}

export async function createGameSession(betAmount: number, theme: string = 'UNI'): Promise<{
  sessionId: string;
  maxMoves: number;
  maxTime: number;
  difficulty: number;
  newBalance: number;
  encryptedPositions: string;
  gameKey: string;
  themeIcons: string[];
}> {
  try {
    const response = await apiRequest('POST', '/api/game/memory/start', {
      betAmount,
      theme
    });
    
    const data = await response.json();
    return {
      sessionId: data.sessionId,
      maxMoves: data.maxMoves,
      maxTime: data.maxTime,
      difficulty: data.difficulty,  
      newBalance: data.newBalance,
      encryptedPositions: data.encryptedPositions,
      gameKey: data.gameKey,
      themeIcons: data.themeIcons
    };
  } catch (error: any) {
    // Verificar se é erro de múltiplas sessões
    if (error.message && error.message.includes('jogo ativo')) {
      throw new Error('Você já tem um jogo ativo. Termine o jogo atual antes de iniciar outro.');
    }
    throw error;
  }
}

// NEW: Send individual card flips to server for validation
export async function sendCardFlip(
  sessionId: string,
  cardIndex: number,
  timestamp: number
): Promise<{ 
  valid: boolean; 
  cardValue?: number; 
  isMatch?: boolean;
  gameComplete?: boolean;
  matchedPairs?: number;
  movesLeft?: number;
  error?: string;
}> {
  const response = await apiRequest('POST', '/api/game/memory/flip-card', {
    sessionId,
    cardIndex,
    timestamp
  });
  return response.json();
}

export async function updateGameResult(
  sessionId: string, 
  won: boolean, 
  matchedPairs: number,
  gameTime: number,
  moves: Array<{ cardIndex: number; timestamp: number }>
): Promise<void> {
  await apiRequest('POST', '/api/game/memory/result', {
    sessionId,
    won,
    matchedPairs,
    gameTime,
    moves
  });
}

export async function getGameHistory(): Promise<GameSession[]> {
  const response = await apiRequest('GET', '/api/game/memory/history');
  return response.json();
}

export async function getUserBalance(): Promise<number> {
  const response = await apiRequest('GET', '/api/user/balance');
  const data = await response.json();
  return data.balance;
}
