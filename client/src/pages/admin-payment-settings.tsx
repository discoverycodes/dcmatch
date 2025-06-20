import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { CreditCard, Settings, Plus, Edit, Eye, EyeOff, Key, DollarSign } from 'lucide-react';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

interface PaymentMethod {
  id: string;
  name: string;
  type: 'crypto' | 'pix';
  provider: 'plisio' | 'primepag';
  currency: string;
  is_active: boolean;
  min_amount: number;
  max_amount: number;
  fee_percentage: number;
  fee_fixed: number;
}

interface ApiKey {
  id: string;
  provider: 'plisio' | 'primepag';
  name: string;
  key_name: string;
  key_value: string;
  is_active: boolean;
  last_used: string;
}

export default function AdminPaymentSettings() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [paymentConfig, setPaymentConfig] = useState({
    primepag: {
      isTestMode: true,
      clientId: '',
      clientSecret: '',
      isActive: true
    },
    plisio: {
      secretKey: '',
      isActive: true
    }
  });

  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [showKeyValue, setShowKeyValue] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    setLoading(true);
    try {
      // First check if we're logged in as admin
      const authCheck = await fetch('/api/admin/dashboard/stats', { credentials: 'include' });
      if (!authCheck.ok) {
        toast.error('Acesso negado. Faça login como admin.');
        window.location.href = '/dcmemocontroll';
        return;
      }

      // Load payment methods
      const methodsResponse = await fetch('/api/admin/payment-methods', { credentials: 'include' });
      if (methodsResponse.ok) {
        const methodsData = await methodsResponse.json();
        setPaymentMethods(methodsData);
        console.log('Payment methods loaded:', methodsData);
      }

      // Load payment configurations
      const primepagResponse = await fetch('/api/admin/payment-config/primepag', { credentials: 'include' });
      if (primepagResponse.ok) {
        const primepagData = await primepagResponse.json();
        console.log('Primepag config loaded:', primepagData);
        
        setPaymentConfig(prev => ({
          ...prev,
          primepag: {
            isTestMode: primepagData.isTestMode !== false,
            clientId: primepagData.clientId || '',
            clientSecret: primepagData.clientSecret || '',
            isActive: primepagData.isActive !== false
          }
        }));

        // Convert to API keys format
        const primepagKeys = [
          {
            id: 'primepag_client_id',
            provider: 'primepag' as const,
            name: 'PRIMEPAG Client ID',
            key_name: 'CLIENT_ID',
            key_value: primepagData.clientId || '',
            is_active: primepagData.isActive !== false,
            last_used: primepagData.updatedAt || new Date().toISOString()
          },
          {
            id: 'primepag_client_secret',
            provider: 'primepag' as const,
            name: 'PRIMEPAG Client Secret',
            key_name: 'CLIENT_SECRET',
            key_value: primepagData.clientSecret || '',
            is_active: primepagData.isActive !== false,
            last_used: primepagData.updatedAt || new Date().toISOString()
          }
        ];
        
        setApiKeys(prev => [
          ...prev.filter(key => key.provider !== 'primepag'),
          ...primepagKeys
        ]);
      } else {
        console.error('Failed to load Primepag config:', primepagResponse.status);
      }

      const plisioResponse = await fetch('/api/admin/payment-config/plisio', { credentials: 'include' });
      if (plisioResponse.ok) {
        const plisioData = await plisioResponse.json();
        console.log('Plisio config loaded:', plisioData);
        
        setPaymentConfig(prev => ({
          ...prev,
          plisio: {
            secretKey: plisioData.secretKey || '',
            isActive: plisioData.isActive !== false
          }
        }));

        // Convert to API keys format
        const plisioKey = {
          id: 'plisio_secret_key',
          provider: 'plisio' as const,
          name: 'Plisio Secret Key',
          key_name: 'SECRET_KEY',
          key_value: plisioData.secretKey || '',
          is_active: plisioData.isActive !== false,
          last_used: plisioData.updatedAt || new Date().toISOString()
        };
        
        setApiKeys(prev => [
          ...prev.filter(key => key.provider !== 'plisio'),
          plisioKey
        ]);
      } else {
        console.error('Failed to load Plisio config:', plisioResponse.status);
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
      toast.error('Erro ao carregar configurações de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMethod = async (method: PaymentMethod) => {
    setLoading(true);
    try {
      if (editingMethod) {
        setPaymentMethods(prev => prev.map(m => m.id === method.id ? method : m));
        toast.success('Método atualizado com sucesso');
      } else {
        const newMethod = { ...method, id: Date.now().toString() };
        setPaymentMethods(prev => [...prev, newMethod]);
        toast.success('Método adicionado com sucesso');
      }
      setShowMethodModal(false);
      setEditingMethod(null);
    } catch (error) {
      toast.error('Erro ao salvar método');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = async (key: ApiKey) => {
    setLoading(true);
    try {
      const provider = key.provider;
      let configToSave: any = {};

      if (provider === 'primepag') {
        // Determine if it's client_id or client_secret based on key_name
        if (key.key_name === 'CLIENT_ID') {
          configToSave = {
            ...paymentConfig.primepag,
            clientId: key.key_value
          };
        } else if (key.key_name === 'CLIENT_SECRET') {
          configToSave = {
            ...paymentConfig.primepag,
            clientSecret: key.key_value
          };
        }
      } else if (provider === 'plisio') {
        configToSave = {
          ...paymentConfig.plisio,
          secretKey: key.key_value
        };
      }

      const response = await fetch(`/api/admin/payment-config/${provider}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(configToSave)
      });

      if (response.ok) {
        toast.success('Chave atualizada com sucesso');
        setShowKeyModal(false);
        setEditingKey(null);
        
        // Reload data to get updated configuration
        await loadPaymentData();
        
        // Restart payment services
        await fetch('/api/admin/restart-payment-services', {
          method: 'POST',
          credentials: 'include'
        });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao salvar chave');
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error('Erro ao salvar chave');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMethod = async (id: string) => {
    setPaymentMethods(prev => prev.map(m => 
      m.id === id ? { ...m, is_active: !m.is_active } : m
    ));
    toast.success('Status atualizado');
  };

  const handleSaveSystemSettings = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Configurações do sistema salvas');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeyValue(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  return (
    <div className="mobile-viewport-fix bg-gray-50">
      <div className="h-screen mobile-scroll-container">
        <div className="p-4 md:p-6 pb-20">
          {/* Header */}
          <div className="bg-white shadow-sm border-b rounded-lg mb-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center h-auto md:h-16 py-4 md:py-0 space-y-3 md:space-y-0">
                <div className="flex items-center">
                  <CreditCard className="w-6 h-6 mr-3 text-blue-500" />
                  <h1 className="text-xl font-bold text-gray-900">Configurações de Pagamento</h1>
                </div>
                
                <Button
                  onClick={() => window.location.href = '/dcmemocontroll'}
                  variant="outline"
                >
                  Voltar ao Admin
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto">
            <Tabs defaultValue="methods" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="methods">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Métodos
                </TabsTrigger>
                <TabsTrigger value="keys">
                  <Key className="w-4 h-4 mr-2" />
                  Chaves API
                </TabsTrigger>
                <TabsTrigger value="system">
                  <Settings className="w-4 h-4 mr-2" />
                  Sistema
                </TabsTrigger>
              </TabsList>

              <TabsContent value="methods" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Métodos de Pagamento</h2>
                  <Dialog open={showMethodModal} onOpenChange={setShowMethodModal}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setEditingMethod(null)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Método
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingMethod ? 'Editar Método' : 'Adicionar Método'}
                        </DialogTitle>
                      </DialogHeader>
                      <PaymentMethodForm
                        method={editingMethod}
                        onSave={handleSaveMethod}
                        onCancel={() => setShowMethodModal(false)}
                        loading={loading}
                      />
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid gap-4">
                  {paymentMethods.map((method) => (
                    <Card key={method.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">{method.name}</h3>
                              <Badge variant={method.is_active ? "default" : "secondary"}>
                                {method.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                              <Badge variant="outline">
                                {method.provider.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={method.is_active}
                              onCheckedChange={() => handleToggleMethod(method.id)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingMethod(method);
                                setShowMethodModal(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Min:</span> {method.currency} {method.min_amount}
                          </div>
                          <div>
                            <span className="font-medium">Max:</span> {method.currency} {method.max_amount}
                          </div>
                          <div>
                            <span className="font-medium">Taxa:</span> {method.fee_percentage}%
                          </div>
                          <div>
                            <span className="font-medium">Taxa Fixa:</span> {method.currency} {method.fee_fixed}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="keys" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Chaves de API</h2>
                  <Dialog open={showKeyModal} onOpenChange={setShowKeyModal}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setEditingKey(null)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Chave
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingKey ? 'Editar Chave' : 'Adicionar Chave'}
                        </DialogTitle>
                      </DialogHeader>
                      <ApiKeyForm
                        apiKey={editingKey}
                        onSave={handleSaveKey}
                        onCancel={() => setShowKeyModal(false)}
                        loading={loading}
                      />
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid gap-4">
                  {apiKeys.map((key) => (
                    <Card key={key.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">{key.name}</h3>
                              <Badge variant={key.is_active ? "default" : "secondary"}>
                                {key.is_active ? 'Ativa' : 'Inativa'}
                              </Badge>
                              <Badge variant="outline">
                                {key.provider.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleKeyVisibility(key.id)}
                            >
                              {showKeyValue[key.id] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingKey(key);
                                setShowKeyModal(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-4 space-y-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Tipo:</span> {key.key_name}
                          </div>
                          <div>
                            <span className="font-medium">Valor:</span>{' '}
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {showKeyValue[key.id] ? key.key_value : '••••••••••••'}
                            </code>
                          </div>
                          <div>
                            <span className="font-medium">Último uso:</span> {key.last_used}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="system" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Configurações PRIMEPAG</CardTitle>
                    <CardDescription>
                      Configure as opções da API PRIMEPAG
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Modo de Teste</Label>
                        <p className="text-sm text-gray-500">
                          {paymentConfig.primepag.isTestMode 
                            ? 'Usando ambiente de testes (api-stg.primepag.com.br)'
                            : 'Usando ambiente de produção (api.primepag.com.br)'
                          }
                        </p>
                      </div>
                      <Switch
                        checked={paymentConfig.primepag.isTestMode}
                        onCheckedChange={async (checked) => {
                          const newConfig = {
                            ...paymentConfig.primepag,
                            isTestMode: checked
                          };
                          
                          try {
                            const response = await fetch('/api/admin/payment-config/primepag', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify(newConfig)
                            });
                            
                            if (response.ok) {
                              setPaymentConfig(prev => ({
                                ...prev,
                                primepag: newConfig
                              }));
                              toast.success('Modo PRIMEPAG atualizado');
                              
                              // Restart services
                              await fetch('/api/admin/restart-payment-services', {
                                method: 'POST',
                                credentials: 'include'
                              });
                            }
                          } catch (error) {
                            toast.error('Erro ao atualizar configuração');
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Configurações do Sistema</CardTitle>
                    <CardDescription>
                      Configure as opções gerais do sistema de pagamentos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Timeout de Transação (minutos)</label>
                        <Input type="number" defaultValue="30" />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Max Tentativas de Pagamento</label>
                        <Input type="number" defaultValue="3" />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">URL de Callback</label>
                        <Input defaultValue="https://seu-site.com/webhook" />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">URL de Sucesso</label>
                        <Input defaultValue="https://seu-site.com/success" />
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <Button onClick={handleSaveSystemSettings} disabled={loading}>
                        {loading ? 'Salvando...' : 'Salvar Configurações'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentMethodForm({ method, onSave, onCancel, loading }: any) {
  const [formData, setFormData] = useState(method || {
    name: '',
    type: 'pix',
    provider: 'primepag',
    currency: 'BRL',
    is_active: true,
    min_amount: 10,
    max_amount: 50000,
    fee_percentage: 2.5,
    fee_fixed: 0
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Nome</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
          placeholder="PIX, USDT BEP-20, etc."
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tipo</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, type: e.target.value }))}
            className="w-full p-2 border rounded-md"
          >
            <option value="pix">PIX</option>
            <option value="crypto">Criptomoeda</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Provedor</label>
          <select
            value={formData.provider}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, provider: e.target.value }))}
            className="w-full p-2 border rounded-md"
          >
            <option value="primepag">PRIMEPAG</option>
            <option value="plisio">Plisio</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Moeda</label>
        <Input
          value={formData.currency}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, currency: e.target.value }))}
          placeholder="BRL, USDT, etc."
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Valor Mínimo</label>
          <Input
            type="number"
            value={formData.min_amount}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, min_amount: parseFloat(e.target.value) || 0 }))}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Valor Máximo</label>
          <Input
            type="number"
            value={formData.max_amount}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, max_amount: parseFloat(e.target.value) || 0 }))}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(formData)} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}

function ApiKeyForm({ apiKey, onSave, onCancel, loading }: any) {
  const [formData, setFormData] = useState(apiKey || {
    provider: 'primepag',
    name: '',
    key_name: '',
    key_value: '',
    is_active: true
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Provedor</label>
        <select
          value={formData.provider}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, provider: e.target.value }))}
          className="w-full p-2 border rounded-md"
        >
          <option value="primepag">PRIMEPAG</option>
          <option value="plisio">Plisio</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Nome da Chave</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
          placeholder="Chave Principal, Teste, etc."
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Tipo</label>
        <Input
          value={formData.key_name}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, key_name: e.target.value }))}
          placeholder="CLIENT_ID, SECRET_KEY, etc."
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Valor</label>
        <Input
          type="password"
          value={formData.key_value}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, key_value: e.target.value }))}
          placeholder="Valor da chave API"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(formData)} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}