import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { CreditCard, Settings, Key, Save } from 'lucide-react';
import { toast } from 'sonner';
import AdminHeader from '../components/ui/AdminHeader';
import { AdminProtectedRoute } from '../components/ui/AdminProtectedRoute';

interface PaymentConfig {
  primepag: {
    isTestMode: boolean;
    clientId: string;
    clientSecret: string;
    isActive: boolean;
    minDepositAmount: number;
    maxDepositAmount: number;
    minWithdrawalAmount: number;
    maxWithdrawalAmount: number;
    withdrawalFeePercentage: number;
  };
  plisio: {
    secretKey: string;
    isActive: boolean;
    minDepositAmount: number;
    maxDepositAmount: number;
    minWithdrawalAmount: number;
    maxWithdrawalAmount: number;
    withdrawalFeePercentage: number;
  };
}

export default function AdminPaymentConfigSimple() {
  const [config, setConfig] = useState<PaymentConfig>({
    primepag: {
      isTestMode: true,
      clientId: '98e38184-8d95-4be1-97bb-abe5b8f8d886',
      clientSecret: 'ad35160d-4e84-4371-a190-c442588fe2e4',
      isActive: true,
      minDepositAmount: 10,
      maxDepositAmount: 1000,
      minWithdrawalAmount: 10,
      maxWithdrawalAmount: 1000,
      withdrawalFeePercentage: 5.0
    },
    plisio: {
      secretKey: '',
      isActive: true,
      minDepositAmount: 10,
      maxDepositAmount: 100000,
      minWithdrawalAmount: 10,
      maxWithdrawalAmount: 100000,
      withdrawalFeePercentage: 1.0
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const [primepagRes, plisioRes] = await Promise.all([
        fetch('/api/admin/payment-config/primepag', { credentials: 'include' }),
        fetch('/api/admin/payment-config/plisio', { credentials: 'include' })
      ]);

      if (primepagRes.ok) {
        const primepagData = await primepagRes.json();
        setConfig(prev => ({
          ...prev,
          primepag: {
            isTestMode: primepagData.isTestMode !== false,
            clientId: primepagData.clientId || '98e38184-8d95-4be1-97bb-abe5b8f8d886',
            clientSecret: primepagData.clientSecret || 'ad35160d-4e84-4371-a190-c442588fe2e4',
            isActive: primepagData.isActive !== false,
            minDepositAmount: primepagData.minDepositAmount || 10,
            maxDepositAmount: primepagData.maxDepositAmount || 1000,
            minWithdrawalAmount: primepagData.minWithdrawalAmount || 10,
            maxWithdrawalAmount: primepagData.maxWithdrawalAmount || 1000,
            withdrawalFeePercentage: primepagData.withdrawalFeePercentage || 5.0
          }
        }));
      } else if (primepagRes.status === 403) {
        toast.error('Acesso negado. Faça login como administrador.');
        setTimeout(() => {
          window.location.href = '/dcmemocontroll/login';
        }, 2000);
        return;
      }

      if (plisioRes.ok) {
        const plisioData = await plisioRes.json();
        setConfig(prev => ({
          ...prev,
          plisio: {
            secretKey: plisioData.secretKey || '',
            isActive: plisioData.isActive !== false,
            minDepositAmount: plisioData.minDepositAmount || 10,
            maxDepositAmount: plisioData.maxDepositAmount || 100000,
            minWithdrawalAmount: plisioData.minWithdrawalAmount || 10,
            maxWithdrawalAmount: plisioData.maxWithdrawalAmount || 100000,
            withdrawalFeePercentage: plisioData.withdrawalFeePercentage || 1.0
          }
        }));
      } else if (plisioRes.status === 403) {
        toast.error('Acesso negado. Faça login como administrador.');
        setTimeout(() => {
          window.location.href = '/dcmemocontroll/login';
        }, 2000);
        return;
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (provider: 'primepag' | 'plisio') => {
    setSaving(true);
    try {
      const configToSave = config[provider];
      
      const response = await fetch(`/api/admin/payment-config/${provider}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(configToSave)
      });

      if (response.ok) {
        toast.success(`Configuração ${provider} salva com sucesso!`);
        
        // Restart services
        await fetch('/api/admin/restart-payment-services', {
          method: 'POST',
          credentials: 'include'
        });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader currentPage="payments" />
        <div className="h-screen overflow-y-auto">
          <div className="container mx-auto p-6 pb-20">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Primepag Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Configurações PRIMEPAG (PIX)
                  </CardTitle>
                  <CardDescription>
                    Configure as credenciais da API PRIMEPAG para pagamentos PIX
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Modo de Teste</Label>
                      <p className="text-sm text-gray-500">
                        {config.primepag.isTestMode 
                          ? 'Usando ambiente de testes (api-stg.primepag.com.br)'
                          : 'Usando ambiente de produção (api.primepag.com.br)'
                        }
                      </p>
                    </div>
                    <Switch
                      checked={config.primepag.isTestMode}
                      onCheckedChange={(checked) => 
                        setConfig(prev => ({
                          ...prev,
                          primepag: { ...prev.primepag, isTestMode: checked }
                        }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="primepag-client-id">Client ID</Label>
                      <Input
                        id="primepag-client-id"
                        value={config.primepag.clientId}
                        onChange={(e) => 
                          setConfig(prev => ({
                            ...prev,
                            primepag: { ...prev.primepag, clientId: e.target.value }
                          }))
                        }
                        placeholder="Digite o Client ID da Primepag"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="primepag-client-secret">Client Secret</Label>
                      <Input
                        id="primepag-client-secret"
                        type="password"
                        value={config.primepag.clientSecret}
                        onChange={(e) => 
                          setConfig(prev => ({
                            ...prev,
                            primepag: { ...prev.primepag, clientSecret: e.target.value }
                          }))
                        }
                        placeholder="Digite o Client Secret da Primepag"
                      />
                    </div>
                  </div>

                  {/* Deposit Limits */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Limites de Depósito</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="primepag-min-deposit">Depósito Mínimo (R$)</Label>
                        <Input
                          id="primepag-min-deposit"
                          type="number"
                          value={config.primepag.minDepositAmount}
                          onChange={(e) => 
                            setConfig(prev => ({
                              ...prev,
                              primepag: { ...prev.primepag, minDepositAmount: parseFloat(e.target.value) || 0 }
                            }))
                          }
                          placeholder="10"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="primepag-max-deposit">Depósito Máximo (R$)</Label>
                        <Input
                          id="primepag-max-deposit"
                          type="number"
                          value={config.primepag.maxDepositAmount}
                          onChange={(e) => 
                            setConfig(prev => ({
                              ...prev,
                              primepag: { ...prev.primepag, maxDepositAmount: parseFloat(e.target.value) || 0 }
                            }))
                          }
                          placeholder="1000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Withdrawal Limits */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Limites de Saque</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="primepag-min-withdrawal">Saque Mínimo (R$)</Label>
                        <Input
                          id="primepag-min-withdrawal"
                          type="number"
                          value={config.primepag.minWithdrawalAmount}
                          onChange={(e) => 
                            setConfig(prev => ({
                              ...prev,
                              primepag: { ...prev.primepag, minWithdrawalAmount: parseFloat(e.target.value) || 0 }
                            }))
                          }
                          placeholder="10"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="primepag-max-withdrawal">Saque Máximo (R$)</Label>
                        <Input
                          id="primepag-max-withdrawal"
                          type="number"
                          value={config.primepag.maxWithdrawalAmount}
                          onChange={(e) => 
                            setConfig(prev => ({
                              ...prev,
                              primepag: { ...prev.primepag, maxWithdrawalAmount: parseFloat(e.target.value) || 0 }
                            }))
                          }
                          placeholder="1000"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="primepag-withdrawal-fee">Taxa de Saque (%)</Label>
                        <Input
                          id="primepag-withdrawal-fee"
                          type="number"
                          step="0.1"
                          value={config.primepag.withdrawalFeePercentage}
                          onChange={(e) => 
                            setConfig(prev => ({
                              ...prev,
                              primepag: { ...prev.primepag, withdrawalFeePercentage: parseFloat(e.target.value) || 0 }
                            }))
                          }
                          placeholder="5.0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Ativo</Label>
                    <Switch
                      checked={config.primepag.isActive}
                      onCheckedChange={(checked) => 
                        setConfig(prev => ({
                          ...prev,
                          primepag: { ...prev.primepag, isActive: checked }
                        }))
                      }
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => saveConfig('primepag')} disabled={saving}>
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Salvando...' : 'Salvar PRIMEPAG'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Plisio Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Key className="w-5 h-5 mr-2" />
                    Configurações PLISIO (USDT)
                  </CardTitle>
                  <CardDescription>
                    Configure a chave secreta da API Plisio para pagamentos USDT
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="plisio-secret-key">Secret Key</Label>
                    <Input
                      id="plisio-secret-key"
                      type="password"
                      value={config.plisio.secretKey}
                      onChange={(e) => 
                        setConfig(prev => ({
                          ...prev,
                          plisio: { ...prev.plisio, secretKey: e.target.value }
                        }))
                      }
                      placeholder="Digite a Secret Key da Plisio"
                    />
                  </div>

                  {/* Deposit Limits */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Limites de Depósito</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="plisio-min-deposit">Depósito Mínimo (USDT)</Label>
                        <Input
                          id="plisio-min-deposit"
                          type="number"
                          value={config.plisio.minDepositAmount}
                          onChange={(e) => 
                            setConfig(prev => ({
                              ...prev,
                              plisio: { ...prev.plisio, minDepositAmount: parseFloat(e.target.value) || 0 }
                            }))
                          }
                          placeholder="10"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="plisio-max-deposit">Depósito Máximo (USDT)</Label>
                        <Input
                          id="plisio-max-deposit"
                          type="number"
                          value={config.plisio.maxDepositAmount}
                          onChange={(e) => 
                            setConfig(prev => ({
                              ...prev,
                              plisio: { ...prev.plisio, maxDepositAmount: parseFloat(e.target.value) || 0 }
                            }))
                          }
                          placeholder="100000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Withdrawal Limits */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Limites de Saque</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="plisio-min-withdrawal">Saque Mínimo (USDT)</Label>
                        <Input
                          id="plisio-min-withdrawal"
                          type="number"
                          value={config.plisio.minWithdrawalAmount}
                          onChange={(e) => 
                            setConfig(prev => ({
                              ...prev,
                              plisio: { ...prev.plisio, minWithdrawalAmount: parseFloat(e.target.value) || 0 }
                            }))
                          }
                          placeholder="10"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="plisio-max-withdrawal">Saque Máximo (USDT)</Label>
                        <Input
                          id="plisio-max-withdrawal"
                          type="number"
                          value={config.plisio.maxWithdrawalAmount}
                          onChange={(e) => 
                            setConfig(prev => ({
                              ...prev,
                              plisio: { ...prev.plisio, maxWithdrawalAmount: parseFloat(e.target.value) || 0 }
                            }))
                          }
                          placeholder="100000"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="plisio-withdrawal-fee">Taxa de Saque (%)</Label>
                        <Input
                          id="plisio-withdrawal-fee"
                          type="number"
                          step="0.1"
                          value={config.plisio.withdrawalFeePercentage}
                          onChange={(e) => 
                            setConfig(prev => ({
                              ...prev,
                              plisio: { ...prev.plisio, withdrawalFeePercentage: parseFloat(e.target.value) || 0 }
                            }))
                          }
                          placeholder="1.0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Ativo</Label>
                    <Switch
                      checked={config.plisio.isActive}
                      onCheckedChange={(checked) => 
                        setConfig(prev => ({
                          ...prev,
                          plisio: { ...prev.plisio, isActive: checked }
                        }))
                      }
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => saveConfig('plisio')} disabled={saving}>
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Salvando...' : 'Salvar PLISIO'}
                    </Button>
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