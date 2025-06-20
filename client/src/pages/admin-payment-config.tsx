import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { Settings, CreditCard, Key, AlertTriangle } from 'lucide-react';


interface PaymentConfig {
  id: number;
  provider: string;
  isTestMode: boolean;
  clientId: string;
  clientSecret: string;
  secretKey: string;
  isActive: boolean;
}

export default function AdminPaymentConfig() {
  const [primepagConfig, setPrimepagConfig] = useState<PaymentConfig | null>(null);
  const [plisioConfig, setPlisioConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPaymentConfigs();
  }, []);

  const loadPaymentConfigs = async () => {
    try {
      setLoading(true);
      
      // Load Primepag config
      const primepagResponse = await fetch('/api/admin/payment-config/primepag', {
        credentials: 'include'
      });
      if (primepagResponse.ok) {
        const primepagData = await primepagResponse.json();
        setPrimepagConfig(primepagData);
      }

      // Load Plisio config
      const plisioResponse = await fetch('/api/admin/payment-config/plisio', {
        credentials: 'include'
      });
      if (plisioResponse.ok) {
        const plisioData = await plisioResponse.json();
        setPlisioConfig(plisioData);
      }
    } catch (error) {
      console.error('Error loading payment configs:', error);
      toast.error('Erro ao carregar configurações de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrimepag = async () => {
    if (!primepagConfig) return;
    
    try {
      setSaving(true);
      const response = await fetch('/api/admin/payment-config/primepag', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          isTestMode: primepagConfig.isTestMode,
          clientId: primepagConfig.clientId,
          clientSecret: primepagConfig.clientSecret,
          isActive: primepagConfig.isActive
        }),
      });

      if (response.ok) {
        toast.success('Configurações da Primepag salvas com sucesso');
        // Restart server to apply new settings
        await fetch('/api/admin/restart-payment-services', {
          method: 'POST',
          credentials: 'include'
        });
      } else {
        throw new Error('Failed to save config');
      }
    } catch (error) {
      console.error('Error saving Primepag config:', error);
      toast.error('Erro ao salvar configurações da Primepag');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePlisio = async () => {
    if (!plisioConfig) return;
    
    try {
      setSaving(true);
      const response = await fetch('/api/admin/payment-config/plisio', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          secretKey: plisioConfig.secretKey,
          isActive: plisioConfig.isActive
        }),
      });

      if (response.ok) {
        toast.success('Configurações da Plisio salvas com sucesso');
      } else {
        throw new Error('Failed to save config');
      }
    } catch (error) {
      console.error('Error saving Plisio config:', error);
      toast.error('Erro ao salvar configurações da Plisio');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando configurações...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Configurações de Pagamento
          </h1>
          <p className="text-gray-600">
            Configure as credenciais e ambiente dos provedores de pagamento
          </p>
        </div>

        {/* Primepag Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Primepag (PIX)
            </CardTitle>
            <CardDescription>
              Configurações para pagamentos via PIX através da Primepag
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {primepagConfig && (
              <>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="primepag-test-mode"
                    checked={primepagConfig.isTestMode}
                    onCheckedChange={(checked) => 
                      setPrimepagConfig({ ...primepagConfig, isTestMode: checked })
                    }
                  />
                  <Label htmlFor="primepag-test-mode">
                    Modo de Teste
                  </Label>
                  {primepagConfig.isTestMode && (
                    <span className="text-sm text-orange-600 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Ambiente de testes ativo
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primepag-client-id">Client ID</Label>
                    <Input
                      id="primepag-client-id"
                      type="text"
                      value={primepagConfig.clientId}
                      onChange={(e) => 
                        setPrimepagConfig({ ...primepagConfig, clientId: e.target.value })
                      }
                      placeholder="Client ID da Primepag"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="primepag-client-secret">Client Secret</Label>
                    <Input
                      id="primepag-client-secret"
                      type="password"
                      value={primepagConfig.clientSecret}
                      onChange={(e) => 
                        setPrimepagConfig({ ...primepagConfig, clientSecret: e.target.value })
                      }
                      placeholder="Client Secret da Primepag"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="primepag-active"
                    checked={primepagConfig.isActive}
                    onCheckedChange={(checked) => 
                      setPrimepagConfig({ ...primepagConfig, isActive: checked })
                    }
                  />
                  <Label htmlFor="primepag-active">
                    Ativo
                  </Label>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Ambiente atual:</strong> {primepagConfig.isTestMode ? 'Teste (https://api-stg.primepag.com.br)' : 'Produção (https://api.primepag.com.br)'}
                  </p>
                </div>

                <Button 
                  onClick={handleSavePrimepag} 
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? 'Salvando...' : 'Salvar Configurações Primepag'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Plisio Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Key className="w-5 h-5 mr-2" />
              Plisio (Crypto)
            </CardTitle>
            <CardDescription>
              Configurações para pagamentos em criptomoedas através da Plisio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {plisioConfig && (
              <>
                <div>
                  <Label htmlFor="plisio-secret-key">Secret Key</Label>
                  <Input
                    id="plisio-secret-key"
                    type="password"
                    value={plisioConfig.secretKey}
                    onChange={(e) => 
                      setPlisioConfig({ ...plisioConfig, secretKey: e.target.value })
                    }
                    placeholder="Secret Key da Plisio"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Plisio não possui ambiente de teste. Use sempre chaves reais.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="plisio-active"
                    checked={plisioConfig.isActive}
                    onCheckedChange={(checked) => 
                      setPlisioConfig({ ...plisioConfig, isActive: checked })
                    }
                  />
                  <Label htmlFor="plisio-active">
                    Ativo
                  </Label>
                </div>

                <Button 
                  onClick={handleSavePlisio} 
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? 'Salvando...' : 'Salvar Configurações Plisio'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}