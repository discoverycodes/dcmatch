import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Gamepad2, Save, RefreshCw, Clock, Target, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import AdminHeader from '../components/ui/AdminHeader';
import { AdminProtectedRoute } from '../components/ui/AdminProtectedRoute';

export default function AdminGameSettings() {
  const [settings, setSettings] = useState({
    maxTime: 30,
    maxMoves: 20,
    winMultiplier: 2.0,
    minBet: 1,
    maxBet: 1000
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/game-settings', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading game settings:', error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/game-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('Configurações do jogo salvas com sucesso!');
      } else {
        toast.error('Erro ao salvar configurações');
      }
    } catch (error) {
      toast.error('Erro ao conectar com servidor');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      maxTime: 30,
      maxMoves: 20,
      winMultiplier: 2.0,
      minBet: 1,
      maxBet: 1000
    });
    toast.info('Configurações resetadas para padrão');
  };

  if (loading) {
    return (
      <div className="mobile-viewport-fix bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminProtectedRoute>
      <div className="mobile-viewport-fix bg-gray-50">
        <AdminHeader currentPage="game-settings" />
        <div className="h-screen mobile-scroll-container">
          <div className="p-4 md:p-6 pb-20">
            <div className="max-w-7xl mx-auto mb-6">
              <div className="flex items-center space-x-3 float-right">
                <Button
                  onClick={handleReset}
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resetar
                </Button>
                
                <Button
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
              <div className="clear-both"></div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Gamepad2 className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-medium text-blue-900">Configurações do Jogo da Memória</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Estas configurações serão aplicadas imediatamente no jogo para todos os usuários.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tempo e Movimentos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-blue-500" />
                    Controles do Jogo
                  </CardTitle>
                  <CardDescription>
                    Configure o tempo limite e número máximo de movimentos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxTime">Tempo Máximo (segundos)</Label>
                    <Input
                      id="maxTime"
                      type="number"
                      min="10"
                      max="300"
                      value={settings.maxTime}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        maxTime: parseInt(e.target.value) || 30 
                      }))}
                    />
                    <p className="text-xs text-gray-500">
                      Tempo que o jogador tem para completar o jogo (10-300 segundos)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxMoves">Movimentos Máximos</Label>
                    <Input
                      id="maxMoves"
                      type="number"
                      min="10"
                      max="100"
                      value={settings.maxMoves}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        maxMoves: parseInt(e.target.value) || 20 
                      }))}
                    />
                    <p className="text-xs text-gray-500">
                      Número máximo de movimentos permitidos (10-100)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Multiplicador e Apostas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-green-500" />
                    Sistema de Recompensas
                  </CardTitle>
                  <CardDescription>
                    Configure multiplicadores e limites de apostas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="winMultiplier">Multiplicador de Vitória</Label>
                    <Input
                      id="winMultiplier"
                      type="number"
                      step="0.1"
                      min="1.1"
                      max="10"
                      value={settings.winMultiplier}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        winMultiplier: parseFloat(e.target.value) || 2.0 
                      }))}
                    />
                    <p className="text-xs text-gray-500">
                      Multiplicador aplicado na vitória (1.1x - 10x)
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="minBet">Aposta Mínima (R$)</Label>
                      <Input
                        id="minBet"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={settings.minBet}
                        onChange={(e) => setSettings(prev => ({ 
                          ...prev, 
                          minBet: parseFloat(e.target.value) || 1 
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maxBet">Aposta Máxima (R$)</Label>
                      <Input
                        id="maxBet"
                        type="number"
                        step="0.01"
                        min="1"
                        value={settings.maxBet}
                        onChange={(e) => setSettings(prev => ({ 
                          ...prev, 
                          maxBet: parseFloat(e.target.value) || 1000 
                        }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview das Configurações */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2 text-purple-500" />
                  Resumo das Configurações
                </CardTitle>
                <CardDescription>
                  Visualize como as configurações afetarão o jogo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">Tempo de Jogo</p>
                        <p className="text-2xl font-bold text-blue-600">{settings.maxTime}s</p>
                      </div>
                      <Clock className="w-8 h-8 text-blue-400" />
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-900">Max Movimentos</p>
                        <p className="text-2xl font-bold text-orange-600">{settings.maxMoves}</p>
                      </div>
                      <Target className="w-8 h-8 text-orange-400" />
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-900">Multiplicador</p>
                        <p className="text-2xl font-bold text-green-600">{settings.winMultiplier}x</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-green-400" />
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Exemplo de Jogo:</h4>
                  <p className="text-sm text-gray-600">
                    • Jogador aposta R$ 10,00<br />
                    • Tem {settings.maxTime} segundos para completar<br />
                    • Máximo de {settings.maxMoves} movimentos<br />
                    • Se vencer: recebe R$ {(10 * settings.winMultiplier).toFixed(2)} (R$ 10,00 × {settings.winMultiplier}x)
                  </p>
                </div>
              </CardContent>
            </Card>
            </div>
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}