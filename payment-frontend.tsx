import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { QrCode, Copy, CreditCard, Wallet, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentMethod {
  id: string;
  name: string;
  type: 'crypto' | 'pix';
  currency: string;
  min_amount: number;
  max_amount: number;
  fee_percentage: number;
  fee_fixed: number;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'payout';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  payment_method: string;
  metadata?: any;
}

export default function PaymentInterface() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userBalance, setUserBalance] = useState(0);
  const [activeTab, setActiveTab] = useState('deposit');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
    loadTransactions();
    loadUserBalance();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const response = await fetch('/api/payment/methods');
      const data = await response.json();
      if (data.success) {
        setPaymentMethods(data.methods);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await fetch('/api/payment/history');
      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions.data || []);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const loadUserBalance = async () => {
    try {
      const response = await fetch('/api/user/balance');
      const data = await response.json();
      if (data.balance !== undefined) {
        setUserBalance(parseFloat(data.balance));
      }
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const handleDeposit = async () => {
    if (!selectedMethod || !amount) return;

    setLoading(true);
    try {
      const response = await fetch('/api/payment/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_method_id: selectedMethod.id,
          amount: parseFloat(amount),
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setPaymentData(data.payment_data);
        toast.success('Pagamento criado com sucesso!');
        loadTransactions();
      } else {
        toast.error(data.message || 'Erro ao criar pagamento');
      }
    } catch (error) {
      toast.error('Erro interno do servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!selectedMethod || !amount) return;

    const payload: any = {
      payment_method_id: selectedMethod.id,
      amount: parseFloat(amount),
    };

    if (selectedMethod.type === 'crypto') {
      payload.wallet_address = walletAddress;
    } else if (selectedMethod.type === 'pix') {
      payload.pix_key = pixKey;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/payment/withdrawal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Solicitação de saque criada com sucesso!');
        setShowPaymentModal(false);
        loadTransactions();
        loadUserBalance();
        resetForm();
      } else {
        toast.error(data.message || 'Erro ao criar saque');
      }
    } catch (error) {
      toast.error('Erro interno do servidor');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setWalletAddress('');
    setPixKey('');
    setPaymentData(null);
    setSelectedMethod(null);
  };

  const openPaymentModal = (method: PaymentMethod, type: 'deposit' | 'withdrawal') => {
    setSelectedMethod(method);
    setActiveTab(type);
    setShowPaymentModal(true);
    resetForm();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  const calculateFee = (method: PaymentMethod, amount: number) => {
    const percentageFee = (amount * method.fee_percentage) / 100;
    return percentageFee + method.fee_fixed;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Centro de Pagamentos</h1>
          <p className="text-gray-600">Gerencie seus depósitos e saques</p>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wallet className="w-6 h-6 mr-2" />
              Saldo Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              R$ {userBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="methods" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="methods">Métodos de Pagamento</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="methods" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {paymentMethods.map((method) => (
                <Card key={method.id} className="border-2 hover:border-blue-500 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        {method.type === 'crypto' ? (
                          <CreditCard className="w-5 h-5 mr-2" />
                        ) : (
                          <QrCode className="w-5 h-5 mr-2" />
                        )}
                        {method.name}
                      </span>
                      <Badge variant="outline">{method.currency}</Badge>
                    </CardTitle>
                    <CardDescription>
                      Limites: R$ {method.min_amount} - R$ {method.max_amount.toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-gray-600">
                      Taxa: {method.fee_percentage}% + R$ {method.fee_fixed}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        onClick={() => openPaymentModal(method, 'deposit')}
                        className="flex-1"
                        variant="outline"
                      >
                        <ArrowDownLeft className="w-4 h-4 mr-2" />
                        Depositar
                      </Button>
                      <Button 
                        onClick={() => openPaymentModal(method, 'withdrawal')}
                        className="flex-1"
                        variant="outline"
                      >
                        <ArrowUpRight className="w-4 h-4 mr-2" />
                        Sacar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Transações</CardTitle>
                <CardDescription>Suas últimas movimentações financeiras</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Nenhuma transação encontrada
                    </div>
                  ) : (
                    transactions.map((transaction) => (
                      <div 
                        key={transaction.id} 
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(transaction.status)}
                          <div>
                            <div className="font-medium">
                              {transaction.type === 'deposit' ? 'Depósito' : 
                               transaction.type === 'withdrawal' ? 'Saque' : 'Pagamento'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(transaction.created_at).toLocaleString('pt-BR')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-semibold">
                            {transaction.type === 'withdrawal' ? '-' : '+'}
                            R$ {transaction.amount.toFixed(2)}
                          </div>
                          <Badge className={getStatusBadge(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Payment Modal */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {activeTab === 'deposit' ? 'Realizar Depósito' : 'Solicitar Saque'}
              </DialogTitle>
            </DialogHeader>

            {!paymentData ? (
              <div className="space-y-4">
                {selectedMethod && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="font-medium">{selectedMethod.name}</div>
                    <div className="text-sm text-gray-600">
                      Limites: R$ {selectedMethod.min_amount} - R$ {selectedMethod.max_amount.toLocaleString()}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Valor</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.01"
                    min={selectedMethod?.min_amount}
                    max={selectedMethod?.max_amount}
                  />
                  {amount && selectedMethod && (
                    <div className="text-xs text-gray-500 mt-1">
                      Taxa: R$ {calculateFee(selectedMethod, parseFloat(amount)).toFixed(2)}
                    </div>
                  )}
                </div>

                {activeTab === 'withdrawal' && selectedMethod?.type === 'crypto' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Endereço da Carteira</label>
                    <Input
                      placeholder="Endereço USDT BEP-20"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                    />
                  </div>
                )}

                {activeTab === 'withdrawal' && selectedMethod?.type === 'pix' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Chave PIX</label>
                    <Input
                      placeholder="CPF, telefone, email ou chave aleatória"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                    />
                  </div>
                )}

                <Button 
                  onClick={activeTab === 'deposit' ? handleDeposit : handleWithdrawal}
                  disabled={loading || !amount || !selectedMethod}
                  className="w-full"
                >
                  {loading ? 'Processando...' : (
                    activeTab === 'deposit' ? 'Criar Pagamento' : 'Solicitar Saque'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedMethod?.type === 'crypto' ? (
                  <div className="text-center space-y-4">
                    <div className="text-lg font-medium">Envie USDT para:</div>
                    
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <img 
                        src={paymentData.qr_code} 
                        alt="QR Code"
                        className="w-48 h-48 mx-auto"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Endereço:</div>
                      <div className="flex items-center space-x-2">
                        <Input 
                          value={paymentData.wallet_address} 
                          readOnly 
                          className="font-mono text-xs"
                        />
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => copyToClipboard(paymentData.wallet_address)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600">
                      Valor: {paymentData.amount_crypto} {paymentData.currency}
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="text-lg font-medium">Escaneie o QR Code PIX:</div>
                    
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <img 
                        src={paymentData.qr_code_image} 
                        alt="QR Code PIX"
                        className="w-48 h-48 mx-auto"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Código PIX:</div>
                      <div className="flex items-center space-x-2">
                        <Input 
                          value={paymentData.pix_code} 
                          readOnly 
                          className="font-mono text-xs"
                        />
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => copyToClipboard(paymentData.pix_code)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500 text-center">
                  O pagamento será confirmado automaticamente
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}