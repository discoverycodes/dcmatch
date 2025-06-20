import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { QrCode, Copy, CreditCard, Wallet, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import Header from '../components/ui/Header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';

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
  payment_method?: string;
  paymentMethod?: string;
  metadata?: any;
}

export default function PaymentInterface() {
  const [user, setUser] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [userBalance, setUserBalance] = useState(0.00);
  const [activeTab, setActiveTab] = useState('deposit');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random'>('cpf');
  const [recipientName, setRecipientName] = useState('');
  const [recipientDocument, setRecipientDocument] = useState('');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showPixForm, setShowPixForm] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUserData();
    fetchUserBalance();
    fetchTransactions();
    fetchPaymentMethods();
  }, []);

  const fetchUserData = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Update balance from server
        const balanceResponse = await fetch('/api/user/balance', { credentials: 'include' });
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          setUser((prev: any) => prev ? { ...prev, balance: balanceData.balance } : null);
          setUserBalance(parseFloat(balanceData.balance) || 0);
        }
      } else {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      window.location.href = '/login';
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/payment-methods');
      
      if (response.ok) {
        const methods = await response.json();
        setPaymentMethods(methods);
      } else {
        console.error('Failed to fetch payment methods');
        // Fallback com valores padrão apenas se necessário
        setPaymentMethods([
          {
            id: 'pix',
            name: 'PIX',
            type: 'pix',
            currency: 'BRL',
            min_amount: 10,
            max_amount: 50000,
            fee_percentage: 2.5,
            fee_fixed: 0
          },
          {
            id: 'crypto',
            name: 'USDT (BSC)',
            type: 'crypto',
            currency: 'USDT_BSC',
            min_amount: 10,
            max_amount: 100000,
            fee_percentage: 1.0,
            fee_fixed: 0
          }
        ]);
      }

    } catch (error) {
      console.error('Error fetching payment methods:', error);
      // Fallback com valores padrão apenas em caso de erro
      setPaymentMethods([
        {
          id: 'pix',
          name: 'PIX',
          type: 'pix',
          currency: 'BRL',
          min_amount: 10,
          max_amount: 50000,
          fee_percentage: 2.5,
          fee_fixed: 0
        },
        {
          id: 'crypto',
          name: 'USDT (BSC)',
          type: 'crypto',
          currency: 'USDT_BSC',
          min_amount: 10,
          max_amount: 100000,
          fee_percentage: 1.0,
          fee_fixed: 0
        }
      ]);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        window.location.href = '/login';
      }
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  };

  const formatCurrency = (value: string | number, currency?: string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (currency === 'USDT_BSC' || currency === 'USDT') {
      return `${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} USDT`;
    }
    
    return numValue.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });
  };

  const formatLimits = (min: number, max: number, currency?: string) => {
    if (currency === 'USDT_BSC' || currency === 'USDT') {
      return `${min.toLocaleString('pt-BR')} - ${max.toLocaleString('pt-BR')} USDT`;
    }
    
    return `${min.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} - ${max.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
  };

  const fetchUserBalance = async () => {
    try {
      const response = await fetch('/api/user/balance', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUserBalance(parseFloat(data.balance) || 0);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const refetchBalance = async () => {
    await fetchUserBalance();
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/user/transactions', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        // Filter only deposits and withdrawals, exclude game/security transactions
        const paymentTransactions = data.filter((transaction: any) => 
          transaction.type === 'deposit' || transaction.type === 'withdrawal'
        );
        // Map database fields to frontend expected fields
        const mappedTransactions = paymentTransactions.map((transaction: any) => ({
          ...transaction,
          created_at: transaction.createdAt || transaction.created_at,
          amount: parseFloat(transaction.amount) || 0
        }));
        setTransactions(mappedTransactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleDeposit = async () => {
    console.log('handleDeposit called', { selectedMethod, amount });
    
    if (!selectedMethod || !amount) {
      toast.error('Selecione um método de pagamento e digite um valor');
      return;
    }

    setLoading(true);
    try {
      if (selectedMethod.type === 'pix') {
        console.log('Creating PIX payment...');
        
        // Criar pagamento PIX real via PRIMEPAG
        const response = await fetch('/api/payments/pix/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: parseFloat(amount),
            description: `Depósito via PIX - R$ ${amount}`
          }),
        });

        console.log('API response:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('API error:', errorData);
          throw new Error(errorData.details || 'Erro ao criar pagamento PIX');
        }

        const pixData = await response.json();
        console.log('PIX Payment created successfully:', pixData);

        setPaymentData({
          pix_code: pixData.pix_code,
          qr_code_image: pixData.qr_code,
          expires_at: pixData.expires_at,
          payment_id: pixData.payment_id,
          amount: pixData.amount
        });

        // Adicionar transação ao histórico
        const newTransaction: Transaction = {
          id: `pix_${Date.now()}`,
          type: 'deposit',
          amount: parseFloat(amount),
          status: 'pending',
          created_at: new Date().toISOString(),
          payment_method: selectedMethod.name,
          metadata: {
            pix_code: pixData.pix_code
          }
        };
        
        setTransactions(prev => [newTransaction, ...prev]);
        toast.success('QR Code PIX gerado com sucesso!');
      } else {
        console.log('Creating crypto payment...');
        
        // Criar invoice Plisio real
        const response = await fetch('/api/payments/crypto/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: parseFloat(amount),
            currency: selectedMethod.currency,
            walletAddress: walletAddress
          }),
        });

        console.log('Crypto API response:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Crypto API error:', errorData);
          throw new Error(errorData.details || 'Erro ao criar pagamento crypto');
        }

        const cryptoData = await response.json();
        console.log('Crypto payment created successfully:', cryptoData);

        setPaymentData({
          wallet_address: cryptoData.wallet_address,
          amount_crypto: cryptoData.amount,
          currency: cryptoData.currency,
          qr_code: cryptoData.qr_code
        });

        // Adicionar transação ao histórico
        const newTransaction: Transaction = {
          id: `crypto_${Date.now()}`,
          type: 'deposit',
          amount: parseFloat(amount),
          status: 'pending',
          created_at: new Date().toISOString(),
          payment_method: selectedMethod.name,
          metadata: {
            wallet_address: cryptoData.wallet_address,
            currency: cryptoData.currency
          }
        };
        
        setTransactions(prev => [newTransaction, ...prev]);
        toast.success('Invoice crypto criado com sucesso!');
      }
    } catch (error) {
      console.error('Deposit error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!selectedMethod || !amount) return;

    if (parseFloat(amount) > userBalance) {
      toast.error('Saldo insuficiente');
      return;
    }

    setLoading(true);
    try {
      let response;

      if (selectedMethod.type === 'crypto') {
        // Validate required fields for crypto withdrawals
        if (!walletAddress) {
          toast.error('Endereço da carteira é obrigatório');
          return;
        }

        response = await fetch('/api/payments/crypto/withdraw', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: parseFloat(amount),
            currency: selectedMethod.currency,
            walletAddress
          }),
        });
      } else if (selectedMethod.type === 'pix') {
        // Validate required fields for PIX withdrawals
        if (!pixKey || !recipientName || !recipientDocument) {
          toast.error('Todos os campos PIX são obrigatórios');
          return;
        }

        response = await fetch('/api/payments/pix/withdraw', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: parseFloat(amount),
            pixKey,
            pixKeyType,
            recipientName,
            recipientDocument
          }),
        });
      }

      if (!response || !response.ok) {
        let errorData = { error: 'Erro de conexão' };
        if (response) {
          try {
            errorData = await response.json();
          } catch (e) {
            errorData = { error: `HTTP ${response.status}` };
          }
        }
        console.error('Withdrawal API error:', errorData);
        throw new Error(errorData.error || 'Erro ao processar saque');
      }

      const withdrawalData = await response.json();
      console.log('Withdrawal created successfully:', withdrawalData);
      
      toast.success(withdrawalData.message || 'Saque processado com sucesso!');
      setShowPaymentModal(false);
      
      // Refresh user balance
      await fetchUserBalance();
      
      // Add new transaction to history
      const newTransaction: Transaction = {
        id: withdrawalData.transaction_id || `withdrawal_${Date.now()}`,
        type: 'withdrawal',
        amount: parseFloat(amount),
        status: 'pending',
        created_at: new Date().toISOString(),
        payment_method: selectedMethod.name
      };
      setTransactions(prev => [newTransaction, ...prev]);
      
      resetForm();
    } catch (error) {
      toast.error('Erro ao criar saque');
    } finally {
      setLoading(false);
    }
  };

  const handlePixWithdrawal = async (pixData: {
    amount: number;
    pixKey: string;
    pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
    recipientName: string;
    recipientDocument: string;
  }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/payments/pix/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: pixData.amount,
          pixKey: pixData.pixKey,
          pixKeyType: pixData.pixKeyType,
          recipientName: pixData.recipientName,
          recipientDocument: pixData.recipientDocument
        }),
      });

      if (!response.ok) {
        let errorData = { error: 'Erro de conexão' };
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `HTTP ${response.status}` };
        }
        console.error('PIX Withdrawal API error:', errorData);
        throw new Error(errorData.error || 'Erro ao processar saque PIX');
      }

      const withdrawalData = await response.json();
      console.log('PIX Withdrawal created successfully:', withdrawalData);
      
      toast.success(withdrawalData.message || 'Saque PIX processado com sucesso!');
      setShowPaymentModal(false);
      setShowPixForm(false);
      
      // Refresh user balance
      await fetchUserBalance();
      
      // Add new transaction to history
      const newTransaction: Transaction = {
        id: withdrawalData.transaction_id || `pix_withdrawal_${Date.now()}`,
        type: 'withdrawal',
        amount: pixData.amount,
        status: 'pending',
        created_at: new Date().toISOString(),
        payment_method: 'PIX'
      };
      setTransactions(prev => [newTransaction, ...prev]);
      
      resetForm();
    } catch (error) {
      toast.error('Erro ao criar saque PIX');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setWalletAddress('');
    setPixKey('');
    setPixKeyType('cpf');
    setRecipientName('');
    setRecipientDocument('');
    setPaymentData(null);
    setShowPixForm(false);
  };

  const openPaymentModal = (method: PaymentMethod, type: 'deposit' | 'withdrawal') => {
    resetForm();
    setSelectedMethod(method);
    setActiveTab(type);
    setShowPaymentModal(true);
  };

  const getOperationLimits = (method: PaymentMethod, operationType: 'deposit' | 'withdrawal') => {
    if (!method) return { min: 0, max: 0 };
    
    // Se o método tem limites específicos para cada operação, use-os
    if ((method as any).deposit_limits && (method as any).withdrawal_limits) {
      const limits = operationType === 'deposit' ? (method as any).deposit_limits : (method as any).withdrawal_limits;
      return { 
        min: Number(limits.min || 0), 
        max: Number(limits.max || 0) 
      };
    }
    
    // Caso contrário, use os limites gerais
    return { 
      min: Number(method.min_amount || 0), 
      max: Number(method.max_amount || 0) 
    };
  };

  const validateAmount = (amount: string, method: PaymentMethod, operationType: 'deposit' | 'withdrawal') => {
    if (!amount || !method) return null;
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return 'Valor inválido';
    
    const limits = getOperationLimits(method, operationType);
    
    if (numAmount < limits.min) {
      return `Valor mínimo para ${operationType === 'deposit' ? 'depósito' : 'saque'}: ${formatCurrency(limits.min, method.currency)}`;
    }
    
    if (numAmount > limits.max) {
      return `Valor máximo para ${operationType === 'deposit' ? 'depósito' : 'saque'}: ${formatCurrency(limits.max, method.currency)}`;
    }
    
    return null;
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        toast.success('Copiado para a área de transferência!');
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          toast.success('Copiado para a área de transferência!');
        } catch (err) {
          console.error('Fallback copy failed:', err);
          toast.error('Não foi possível copiar. Tente copiar manualmente.');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      toast.error('Não foi possível copiar. Tente copiar manualmente.');
    }
  };

  const calculateFee = (method: PaymentMethod, amount: number, type: 'deposit' | 'withdrawal' = 'deposit') => {
    // No fees for deposits, only for withdrawals
    if (type === 'deposit') {
      return 0;
    }
    
    // Use withdrawal fee percentage for withdrawals
    const withdrawalFeePercentage = Number((method as any).withdrawal_fee_percentage || method.fee_percentage || 0);
    const feeFixed = Number(method.fee_fixed || 0);
    const percentageFee = (amount * withdrawalFeePercentage) / 100;
    return percentageFee + feeFixed;
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

  const getStatusBadge = (status: string, type: string) => {
    // Para todos os tipos exceto deposit, mostrar "Sucesso"
    if (type !== 'deposit') {
      return 'bg-green-100 text-green-800';
    }
    
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return badges[status as keyof typeof badges] || 'bg-yellow-100 text-yellow-800';
  };

  const getStatusText = (status: string, type: string) => {
    // Para todos os tipos exceto deposit, mostrar "Sucesso"
    if (type !== 'deposit') {
      return 'Sucesso';
    }
    
    // Para deposits, usar o status real
    switch (status) {
      case 'completed':
        return 'Completo';
      case 'pending':
        return 'Pendente';
      case 'failed':
        return 'Falhou';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Pendente';
    }
  };

  if (!user) {
    return (
      <div className="mobile-viewport-fix bg-gray-50">
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-viewport-fix bg-gray-50">
      <div className="h-screen mobile-scroll-container">
        <Header currentPage="payments" />

        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 pb-20">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Centro de Pagamentos
            </h1>
            <p className="text-gray-600">
              Gerencie seus depósitos e saques com segurança
            </p>
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
                      Limites: {formatLimits(method.min_amount, method.max_amount, method.currency)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-gray-600">
                      Taxa: {Number(method.fee_percentage || 0).toFixed(1)}% {Number(method.fee_fixed || 0) > 0 && `+ ${formatCurrency(Number(method.fee_fixed || 0), method.currency)}`}
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
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma transação encontrada
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {(() => {
                        const totalPages = Math.ceil(transactions.length / itemsPerPage);
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const paginatedTransactions = transactions.slice(startIndex, startIndex + itemsPerPage);
                        
                        return paginatedTransactions.map((transaction) => (
                          <div 
                            key={transaction.id} 
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg space-y-3 sm:space-y-0"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                {getStatusIcon(transaction.status)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium truncate">
                                  {transaction.type === 'deposit' ? `Depósito via ${transaction.paymentMethod || transaction.payment_method || 'Sistema'}` : 
                                   transaction.type === 'withdrawal' ? `Saque via ${transaction.paymentMethod || transaction.payment_method || 'Sistema'}` : 'Pagamento'}
                                </div>
                                <div className="text-sm text-gray-500 truncate">
                                  {transaction.created_at ? (() => {
                                    const date = new Date(transaction.created_at);
                                    return isNaN(date.getTime()) ? 'Data não disponível' : date.toLocaleString('pt-BR');
                                  })() : 'Data não disponível'}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:text-right space-y-1 sm:flex-shrink-0">
                              <div className="font-semibold text-sm sm:text-base">
                                {transaction.type === 'withdrawal' ? '-' : '+'}
                                R$ {parseFloat(transaction.amount.toString()).toFixed(2)}
                              </div>
                              <Badge className={getStatusBadge(transaction.status, transaction.type)}>
                                {getStatusText(transaction.status, transaction.type)}
                              </Badge>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                    
                    {/* Pagination */}
                    {Math.ceil(transactions.length / itemsPerPage) > 1 && (
                      <div className="flex items-center justify-center space-x-2 mt-6 pt-6 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="flex items-center"
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Anterior
                        </Button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.ceil(transactions.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                            <Button
                              key={page}
                              variant={page === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-10 h-10"
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(transactions.length / itemsPerPage)))}
                          disabled={currentPage === Math.ceil(transactions.length / itemsPerPage)}
                          className="flex items-center"
                        >
                          Próxima
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
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
                    min={selectedMethod ? getOperationLimits(selectedMethod, activeTab as 'deposit' | 'withdrawal').min : undefined}
                    max={selectedMethod ? getOperationLimits(selectedMethod, activeTab as 'deposit' | 'withdrawal').max : undefined}
                  />
                  {amount && selectedMethod && (
                    <div className="text-xs text-gray-500 mt-1">
                      Taxa: {formatCurrency(calculateFee(selectedMethod, parseFloat(amount), activeTab as 'deposit' | 'withdrawal'), selectedMethod.currency)}
                      {activeTab === 'deposit' && ' (Depósitos são gratuitos)'}
                    </div>
                  )}
                  {(() => {
                    const error = amount && selectedMethod ? validateAmount(amount, selectedMethod, activeTab as 'deposit' | 'withdrawal') : null;
                    return error ? (
                      <div className="text-xs text-red-500 mt-1">
                        {error}
                      </div>
                    ) : null;
                  })()}
                  {amount && selectedMethod && !validateAmount(amount, selectedMethod, activeTab as 'deposit' | 'withdrawal') && (
                    <div className="text-xs text-green-600 mt-1">
                      ✓ Valor válido para {activeTab === 'deposit' ? 'depósito' : 'saque'}
                    </div>
                  )}
                </div>

                {activeTab === 'withdrawal' && selectedMethod?.type === 'crypto' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Carteira USDT BEP-20</label>
                    <Input
                      placeholder="0x742d35Cc6639C0532fFE9f2fA4a32F4A9C8b7432"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Insira seu endereço de carteira USDT na rede BEP-20 (Binance Smart Chain)
                    </div>
                  </div>
                )}

                {activeTab === 'withdrawal' && selectedMethod?.type === 'pix' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Tipo de Chave PIX</label>
                      <Select value={pixKeyType} onValueChange={(value: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random') => {
                        setPixKeyType(value);
                        setPixKey('');
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de chave PIX" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpf">
                            <div>
                              <div className="font-medium">CPF</div>
                              <div className="text-sm text-gray-500">Documento de pessoa física (11 dígitos)</div>
                            </div>
                          </SelectItem>
                          <SelectItem value="cnpj">
                            <div>
                              <div className="font-medium">CNPJ</div>
                              <div className="text-sm text-gray-500">Documento de pessoa jurídica (14 dígitos)</div>
                            </div>
                          </SelectItem>
                          <SelectItem value="email">
                            <div>
                              <div className="font-medium">E-mail</div>
                              <div className="text-sm text-gray-500">Endereço de e-mail válido</div>
                            </div>
                          </SelectItem>
                          <SelectItem value="phone">
                            <div>
                              <div className="font-medium">Telefone</div>
                              <div className="text-sm text-gray-500">Número de celular (será formatado com +55)</div>
                            </div>
                          </SelectItem>
                          <SelectItem value="random">
                            <div>
                              <div className="font-medium">Chave Aleatória</div>
                              <div className="text-sm text-gray-500">Chave UUID gerada pelo banco</div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Chave PIX</label>
                      <Input
                        type="text"
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                        placeholder={
                          pixKeyType === 'cpf' ? '000.000.000-00' :
                          pixKeyType === 'cnpj' ? '00.000.000/0000-00' :
                          pixKeyType === 'email' ? 'seu@email.com' :
                          pixKeyType === 'phone' ? '(11) 99999-9999' :
                          'chave-aleatoria-uuid'
                        }
                      />
                      {pixKeyType === 'phone' && (
                        <p className="text-blue-600 text-sm mt-1">
                          O número será automaticamente formatado com +55
                        </p>
                      )}
                      {(pixKeyType === 'cpf' || pixKeyType === 'cnpj') && (
                        <p className="text-blue-600 text-sm mt-1">
                          Apenas números, formatação será removida automaticamente
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Nome do Destinatário</label>
                      <Input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Nome completo do destinatário"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Documento do Destinatário</label>
                      <Input
                        type="text"
                        value={recipientDocument}
                        onChange={(e) => setRecipientDocument(e.target.value)}
                        placeholder="CPF ou CNPJ do destinatário"
                      />
                    </div>
                  </div>
                )}

                <Button 
                  onClick={activeTab === 'deposit' ? handleDeposit : handleWithdrawal}
                  disabled={
                    loading || 
                    !amount || 
                    !selectedMethod || 
                    parseFloat(amount || '0') <= 0 ||
                    !!validateAmount(amount, selectedMethod, activeTab as 'deposit' | 'withdrawal') ||
                    (activeTab === 'withdrawal' && selectedMethod.type === 'crypto' && !walletAddress) ||
                    (activeTab === 'withdrawal' && selectedMethod.type === 'pix' && (!pixKey || !recipientName || !recipientDocument))
                  }
                  className="w-full"
                >
                  {loading ? 'Processando...' : (
                    activeTab === 'deposit' ? 
                      (selectedMethod?.type === 'pix' ? 'Gerar QR Code PIX' : 'Gerar Invoice USDT') :
                      'Solicitar Saque'
                  )}
                </Button>
                

              </div>
            ) : (
              <div className="space-y-4">
                {selectedMethod?.type === 'crypto' ? (
                  <div className="text-center space-y-4">
                    <div className="text-lg font-medium">Envie {paymentData?.currency || selectedMethod.currency} para:</div>
                    
                    <div className="bg-gray-100 p-4 rounded-lg">
                      {paymentData?.qr_code ? (
                        <img 
                          src={paymentData.qr_code} 
                          alt="QR Code" 
                          className="w-48 h-48 mx-auto"
                        />
                      ) : (
                        <div className="w-48 h-48 mx-auto bg-white flex items-center justify-center border">
                          QR Code {selectedMethod.currency}
                        </div>
                      )}
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

                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="text-sm font-medium text-blue-800">Valor a pagar:</div>
                      <div className="text-lg font-bold text-blue-900">
                        {Number(paymentData.amount_crypto).toFixed(8)} {paymentData.currency}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        Equivalente a {formatCurrency(parseFloat(amount), 'BRL')}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="text-lg font-medium">Escaneie o QR Code PIX:</div>
                    
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <div className="w-48 h-48 mx-auto bg-white flex items-center justify-center border">
                        QR Code PIX
                      </div>
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

        {/* PIX Withdrawal Form Dialog */}
        <Dialog open={showPixForm} onOpenChange={setShowPixForm}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Saque PIX - Selecione sua Chave</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (pixKey && pixKeyType && recipientName && recipientDocument && amount) {
                handlePixWithdrawal({
                  amount: parseFloat(amount),
                  pixKey,
                  pixKeyType,
                  recipientName,
                  recipientDocument
                });
              }
            }} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Valor do Saque (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Chave PIX</label>
                  <Select value={pixKeyType} onValueChange={(value: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random') => {
                    setPixKeyType(value);
                    setPixKey('');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de chave PIX" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">
                        <div>
                          <div className="font-medium">CPF</div>
                          <div className="text-sm text-gray-500">Documento de pessoa física (11 dígitos)</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="cnpj">
                        <div>
                          <div className="font-medium">CNPJ</div>
                          <div className="text-sm text-gray-500">Documento de pessoa jurídica (14 dígitos)</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="email">
                        <div>
                          <div className="font-medium">E-mail</div>
                          <div className="text-sm text-gray-500">Endereço de e-mail válido</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="phone">
                        <div>
                          <div className="font-medium">Telefone</div>
                          <div className="text-sm text-gray-500">Número de celular (será formatado com +55)</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="random">
                        <div>
                          <div className="font-medium">Chave Aleatória</div>
                          <div className="text-sm text-gray-500">Chave UUID gerada pelo banco</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Chave PIX</label>
                  <Input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder={
                      pixKeyType === 'cpf' ? '000.000.000-00' :
                      pixKeyType === 'cnpj' ? '00.000.000/0000-00' :
                      pixKeyType === 'email' ? 'seu@email.com' :
                      pixKeyType === 'phone' ? '(11) 99999-9999' :
                      'chave-aleatoria-uuid'
                    }
                    required
                  />
                  {pixKeyType === 'phone' && (
                    <p className="text-blue-600 text-sm mt-1">
                      O número será automaticamente formatado com +55 se necessário
                    </p>
                  )}
                  {(pixKeyType === 'cpf' || pixKeyType === 'cnpj') && (
                    <p className="text-blue-600 text-sm mt-1">
                      Apenas números, formatação será removida automaticamente
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Nome do Destinatário</label>
                  <Input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Nome completo do destinatário"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Documento do Destinatário</label>
                  <Input
                    type="text"
                    value={recipientDocument}
                    onChange={(e) => setRecipientDocument(e.target.value)}
                    placeholder="CPF ou CNPJ do destinatário"
                    required
                  />
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Importante:</strong> Verifique todas as informações antes de confirmar. 
                  O saque PIX será processado automaticamente e não poderá ser cancelado.
                  {pixKeyType === 'phone' && (
                    <><br /><strong>Telefone:</strong> Será automaticamente formatado com +55 se necessário.</>
                  )}
                </AlertDescription>
              </Alert>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !amount || !pixKey || !recipientName || !recipientDocument}
              >
                {loading ? 'Processando Saque...' : 'Confirmar Saque PIX'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </div>
  );
}