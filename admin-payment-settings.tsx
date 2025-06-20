import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Settings, Eye, EyeOff, Save, Plus, Edit, Trash2, Key } from 'lucide-react';
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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      name: 'USDT BEP-20',
      type: 'crypto',
      provider: 'plisio',
      currency: 'USDT',
      is_active: true,
      min_amount: 10,
      max_amount: 100000,
      fee_percentage: 1.0,
      fee_fixed: 0
    },
    {
      id: '2',
      name: 'PIX',
      type: 'pix',
      provider: 'primepag',
      currency: 'BRL',
      is_active: true,
      min_amount: 10,
      max_amount: 50000,
      fee_percentage: 2.5,
      fee_fixed: 0
    }
  ]);

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      provider: 'plisio',
      name: 'Plisio API Key',
      key_name: 'PLISIO_API_KEY',
      key_value: 'sk_test_1234567890abcdef',
      is_active: true,
      last_used: '2025-01-14 10:30:00'
    },
    {
      id: '2',
      provider: 'primepag',
      name: 'PRIMEPAG Client ID',
      key_name: 'PRIMEPAG_CLIENT_ID',
      key_value: 'primepag_test_client_123',
      is_active: true,
      last_used: '2025-01-14 09:15:00'
    }
  ]);

  const [systemSettings, setSystemSettings] = useState({
    min_withdrawal: 10,
    max_withdrawal: 100000,
    daily_withdrawal_limit: 50000,
    require_kyc_for_withdrawal: true,
    auto_approve_withdrawals: false,
    withdrawal_fee_usdt: 5.0,
    withdrawal_fee_pix: 2.5,
    maintenance_mode: false
  });

  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [showKeyValue, setShowKeyValue] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const handleSaveMethod = async (method: PaymentMethod) => {
    setLoading(true);
    try {
      if (editingMethod) {
        setPaymentMethods(prev => prev.map(m => m.id === method.id ? method : m));
        toast.success('Método de pagamento atualizado');
      } else {
        const newMethod = { ...method, id: String(Date.now()) };
        setPaymentMethods(prev => [...prev, newMethod]);
        toast.success('Método de pagamento criado');
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
      if (editingKey) {
        setApiKeys(prev => prev.map(k => k.id === key.id ? key : k));
        toast.success('Chave API atualizada');
      } else {
        const newKey = { ...key, id: String(Date.now()), last_used: 'Nunca' };
        setApiKeys(prev => [...prev, newKey]);
        toast.success('Chave API criada');
      }
      setShowKeyModal(false);
      setEditingKey(null);
    } catch (error) {
      toast.error('Erro ao salvar chave');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMethod = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este método?')) {
      setPaymentMethods(prev => prev.filter(m => m.id !== id));
      toast.success('Método excluído');
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta chave?')) {
      setApiKeys(prev => prev.filter(k => k.id !== id));
      toast.success('Chave excluída');
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
      // API call to save settings
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configurações de Pagamento</h1>
            <p className="text-gray-600">Gerencie métodos de pagamento, APIs e configurações</p>
          </div>
          <Button onClick={handleSaveSystemSettings} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            Salvar Configurações
          </Button>
        </div>

        <Tabs defaultValue="methods" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="methods">Métodos de Pagamento</TabsTrigger>
            <TabsTrigger value="apis">Chaves de API</TabsTrigger>
            <TabsTrigger value="settings">Configurações Gerais</TabsTrigger>
          </TabsList>

          <TabsContent value="methods" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Métodos de Pagamento</h2>
              <Button onClick={() => {
                setEditingMethod(null);
                setShowMethodModal(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Método
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {paymentMethods.map((method) => (
                <Card key={method.id} className={`border-2 ${method.is_active ? 'border-green-200' : 'border-gray-200'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        {method.name}
                        <Badge variant="outline" className="ml-2">{method.provider}</Badge>
                      </span>
                      <Switch 
                        checked={method.is_active}
                        onCheckedChange={() => handleToggleMethod(method.id)}
                      />
                    </CardTitle>
                    <CardDescription>
                      {method.type} • {method.currency}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Mínimo:</span>
                        <div className="font-medium">R$ {method.min_amount}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Máximo:</span>
                        <div className="font-medium">R$ {method.max_amount.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Taxa %:</span>
                        <div className="font-medium">{method.fee_percentage}%</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Taxa Fixa:</span>
                        <div className="font-medium">R$ {method.fee_fixed}</div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingMethod(method);
                          setShowMethodModal(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeleteMethod(method.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="apis" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Chaves de API</h2>
              <Button onClick={() => {
                setEditingKey(null);
                setShowKeyModal(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Chave
              </Button>
            </div>

            <div className="space-y-4">
              {apiKeys.map((key) => (
                <Card key={key.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{key.name}</h3>
                          <Badge variant="outline">{key.provider}</Badge>
                          {key.is_active ? (
                            <Badge className="bg-green-100 text-green-800">Ativa</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">Inativa</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          Último uso: {key.last_used}
                        </div>
                        <div className="flex items-center space-x-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                            {showKeyValue[key.id] ? key.key_value : '••••••••••••••••'}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleKeyVisibility(key.id)}
                          >
                            {showKeyValue[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setEditingKey(key);
                            setShowKeyModal(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteKey(key.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Saque</CardTitle>
                <CardDescription>Defina limites e regras para saques</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Saque Mínimo (R$)</label>
                    <Input
                      type="number"
                      value={systemSettings.min_withdrawal}
                      onChange={(e) => setSystemSettings(prev => ({
                        ...prev,
                        min_withdrawal: parseFloat(e.target.value)
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Saque Máximo (R$)</label>
                    <Input
                      type="number"
                      value={systemSettings.max_withdrawal}
                      onChange={(e) => setSystemSettings(prev => ({
                        ...prev,
                        max_withdrawal: parseFloat(e.target.value)
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Limite Diário (R$)</label>
                    <Input
                      type="number"
                      value={systemSettings.daily_withdrawal_limit}
                      onChange={(e) => setSystemSettings(prev => ({
                        ...prev,
                        daily_withdrawal_limit: parseFloat(e.target.value)
                      }))}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Exigir verificação KYC para saques</span>
                    <Switch
                      checked={systemSettings.require_kyc_for_withdrawal}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({
                        ...prev,
                        require_kyc_for_withdrawal: checked
                      }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Aprovar saques automaticamente</span>
                    <Switch
                      checked={systemSettings.auto_approve_withdrawals}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({
                        ...prev,
                        auto_approve_withdrawals: checked
                      }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Modo manutenção</span>
                    <Switch
                      checked={systemSettings.maintenance_mode}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({
                        ...prev,
                        maintenance_mode: checked
                      }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Taxas de Saque</CardTitle>
                <CardDescription>Configure as taxas aplicadas nos saques</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Taxa USDT (USDT)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={systemSettings.withdrawal_fee_usdt}
                      onChange={(e) => setSystemSettings(prev => ({
                        ...prev,
                        withdrawal_fee_usdt: parseFloat(e.target.value)
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Taxa PIX (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={systemSettings.withdrawal_fee_pix}
                      onChange={(e) => setSystemSettings(prev => ({
                        ...prev,
                        withdrawal_fee_pix: parseFloat(e.target.value)
                      }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Method Modal */}
        <Dialog open={showMethodModal} onOpenChange={setShowMethodModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingMethod ? 'Editar Método' : 'Novo Método de Pagamento'}
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

        {/* API Key Modal */}
        <Dialog open={showKeyModal} onOpenChange={setShowKeyModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingKey ? 'Editar Chave API' : 'Nova Chave API'}
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
    </div>
  );
}

// Form components would be implemented separately
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
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="PIX, USDT BEP-20, etc."
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Mínimo (R$)</label>
          <Input
            type="number"
            value={formData.min_amount}
            onChange={(e) => setFormData(prev => ({ ...prev, min_amount: parseFloat(e.target.value) }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Máximo (R$)</label>
          <Input
            type="number"
            value={formData.max_amount}
            onChange={(e) => setFormData(prev => ({ ...prev, max_amount: parseFloat(e.target.value) }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Taxa (%)</label>
          <Input
            type="number"
            step="0.1"
            value={formData.fee_percentage}
            onChange={(e) => setFormData(prev => ({ ...prev, fee_percentage: parseFloat(e.target.value) }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Taxa Fixa (R$)</label>
          <Input
            type="number"
            step="0.01"
            value={formData.fee_fixed}
            onChange={(e) => setFormData(prev => ({ ...prev, fee_fixed: parseFloat(e.target.value) }))}
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
    provider: 'plisio',
    name: '',
    key_name: '',
    key_value: '',
    is_active: true
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Nome</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Plisio API Key"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Nome da Variável</label>
        <Input
          value={formData.key_name}
          onChange={(e) => setFormData(prev => ({ ...prev, key_name: e.target.value }))}
          placeholder="PLISIO_API_KEY"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Valor da Chave</label>
        <Input
          type="password"
          value={formData.key_value}
          onChange={(e) => setFormData(prev => ({ ...prev, key_value: e.target.value }))}
          placeholder="sk_test_1234567890abcdef"
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