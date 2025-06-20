/**
 * SECURE GAME PAGE - 100% Server-Side Validation
 * 
 * Esta página implementa o jogo da memória com segurança total:
 * - Zero confiança no cliente
 * - Todos os cálculos server-side
 * - Proteção completa contra manipulação
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { SecureMemoryGame } from '../components/SecureMemoryGame';
import { Wallet, Shield, ArrowLeft, Info } from 'lucide-react';
import Header from '../components/ui/Header';

interface UserData {
  id: number;
  username: string;
  balance: string;
}

interface BalanceData {
  balance: string;
  withdrawable: string;
  bonus: string;
  earnings: string;
}

export default function SecureGamePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [betAmount, setBetAmount] = useState<number>(1);
  const [gameActive, setGameActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gameSettings, setGameSettings] = useState<any>(null);

  useEffect(() => {
    loadUserData();
    loadGameSettings();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }

      const balanceResponse = await fetch('/api/user/balance', { 
        credentials: 'include' 
      });
      
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setBalance(balanceData);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      toast.error('Erro ao carregar dados do usuário');
    } finally {
      setLoading(false);
    }
  };

  const loadGameSettings = async () => {
    try {
      const response = await fetch('/api/game-settings');
      if (response.ok) {
        const settings = await response.json();
        setGameSettings(settings);
      }
    } catch (error) {
      console.error('Failed to load game settings:', error);
    }
  };

  const handleGameEnd = async (won: boolean, winAmount: number, newBalance: number) => {
    console.log(`Game ended: won=${won}, winAmount=${winAmount}, newBalance=${newBalance}`);
    
    setGameActive(false);
    
    // Atualizar saldo local
    if (balance) {
      setBalance(prev => prev ? { ...prev, balance: newBalance.toString() } : null);
    }
    
    if (won) {
      toast.success(`Parabéns! Você ganhou R$ ${winAmount.toFixed(2)}!`);
    } else {
      toast.info('Que pena! Tente novamente.');
    }
    
    // Recarregar dados atualizados
    await loadUserData();
  };

  const handleGameError = (error: string) => {
    console.error('Game error:', error);
    setGameActive(false);
    toast.error(`Erro no jogo: ${error}`);
  };

  const startGame = () => {
    if (!balance) return;
    
    const currentBalance = parseFloat(balance.balance);
    
    if (currentBalance < betAmount) {
      toast.error('Saldo insuficiente para esta aposta');
      return;
    }
    
    if (betAmount < 0.01 || betAmount > 1000) {
      toast.error('Valor da aposta deve estar entre R$ 0,01 e R$ 1.000,00');
      return;
    }
    
    console.log(`Starting secure game with bet: R$ ${betAmount}`);
    setGameActive(true);
  };

  const goBack = () => {
    window.history.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando jogo seguro...</p>
          </div>
        </div>
      </div>
    );
  }

  if (gameActive) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => setGameActive(false)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
          
          <SecureMemoryGame
            betAmount={betAmount}
            onGameEnd={handleGameEnd}
            onError={handleGameError}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button variant="outline" onClick={goBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Jogo da Memória Seguro
            </h1>
            <p className="text-gray-600">
              Sistema 100% protegido contra manipulação
            </p>
          </div>
        </div>

        {/* Security Features */}
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <Shield className="w-5 h-5 mr-2" />
              Recursos de Segurança
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>Validação 100% server-side</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>Proteção contra manipulação client-side</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>Cartas embaralhadas pelo servidor</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>Resultados calculados pelo servidor</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Balance */}
        {balance && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className="w-5 h-5 mr-2" />
                Seu Saldo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    R$ {parseFloat(balance.balance).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Saldo Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    R$ {parseFloat(balance.withdrawable).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Sacável</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    R$ {parseFloat(balance.bonus).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Bônus</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    R$ {parseFloat(balance.earnings).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Ganhos</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Game Setup */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Configurar Jogo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor da Aposta
                </label>
                <div className="flex items-center space-x-4">
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
                    min="0.01"
                    max="1000"
                    step="0.01"
                    className="w-40"
                    placeholder="0.00"
                  />
                  <span className="text-gray-600">BRL</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Mínimo: R$ 0,01 • Máximo: R$ 1.000,00
                </p>
              </div>

              {gameSettings && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Configurações do Jogo</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Multiplicador de Vitória:</span>
                      <span className="font-medium ml-2">{gameSettings.winMultiplier}x</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Tempo Máximo:</span>
                      <span className="font-medium ml-2">{gameSettings.maxTime}s</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Movimentos Máximos:</span>
                      <span className="font-medium ml-2">{gameSettings.maxMoves}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-4">
                <Button 
                  onClick={startGame}
                  size="lg"
                  className="flex-1"
                  disabled={!balance || parseFloat(balance.balance) < betAmount}
                >
                  Iniciar Jogo Seguro
                </Button>
              </div>

              {betAmount > 0 && gameSettings && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 mb-1">
                        Prêmio Potencial: R$ {(betAmount * gameSettings.winMultiplier).toFixed(2)}
                      </p>
                      <p className="text-blue-700">
                        Encontre todos os 8 pares para ganhar {gameSettings.winMultiplier}x sua aposta
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
              <div className="text-sm">
                <p className="font-medium text-yellow-900 mb-1">
                  Sistema Anti-Trapaça Ativo
                </p>
                <p className="text-yellow-800">
                  Este jogo utiliza validação 100% server-side. Todas as jogadas são processadas 
                  e validadas pelo servidor, tornando impossível qualquer forma de manipulação 
                  ou trapaça client-side.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}