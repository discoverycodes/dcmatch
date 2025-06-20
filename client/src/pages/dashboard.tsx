import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  User, 
  Wallet, 
  TrendingUp, 
  History, 
  Settings, 
  Trophy,
  DollarSign,
  Clock,
  Shield,
  Phone,
  Mail,
  CreditCard,
  Eye,
  Download,
  Sun,
  Moon,
  Monitor,
  Play,
  Users,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import Header from '../components/ui/Header';
import { useTheme } from '../hooks/useTheme';

interface UserData {
  id: number;
  username: string;
  email: string;
  name?: string;
  balance: string;
}

interface GameHistory {
  id: string;
  date: string;
  betAmount: number;
  result: 'won' | 'lost';
  winAmount: number;
  pairs: number;
  timeUsed: number;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'game_win' | 'game_bet';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  method?: string;
  description: string;
}

export default function UserDashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { theme, setTheme } = useTheme();
  
  // Pagination states
  const [gamePage, setGamePage] = useState(1);
  const [transactionPage, setTransactionPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const loadUserData = async () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Load user-specific data including current balance
        try {
          const [balanceResponse, gameHistoryResponse, transactionsResponse] = await Promise.all([
            fetch('/api/user/balance', { credentials: 'include' }),
            fetch('/api/user/game-history', { credentials: 'include' }),
            fetch('/api/user/transactions', { credentials: 'include' })
          ]);
          
          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            setUser(prev => prev ? { ...prev, balance: balanceData.balance } : null);
          }
          
          if (gameHistoryResponse.ok) {
            const gameData = await gameHistoryResponse.json();
            setGameHistory(gameData);
          }
          
          if (transactionsResponse.ok) {
            const transactionData = await transactionsResponse.json();
            // Map database fields to frontend expected fields
            const mappedTransactions = transactionData.map((transaction: any) => ({
              ...transaction,
              date: transaction.createdAt || transaction.date,
              amount: parseFloat(transaction.amount) || 0
            }));
            setTransactions(mappedTransactions);
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      } else {
        window.location.href = '/login';
      }
      setLoading(false);
    };

    loadUserData();
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    toast.success(`Tema alterado para ${newTheme === 'light' ? 'claro' : newTheme === 'dark' ? 'escuro' : 'sistema'}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    toast.success('Logout realizado com sucesso');
    window.location.href = '/login';
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data não disponível';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Data inválida';
    return date.toLocaleString('pt-BR');
  };

  const getStatusBadge = (status: string, type: string) => {
    // Para todos os tipos exceto deposit, mostrar "Sucesso"
    if (type !== 'deposit') {
      return <Badge className="bg-green-100 text-green-800">Sucesso</Badge>;
    }
    
    // Para deposits, usar o status real
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completo</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Falhou</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejeitado</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
    }
  };

  // Pagination calculations
  const getPaginatedGames = () => {
    const startIndex = (gamePage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return gameHistory.slice(startIndex, endIndex);
  };

  const getPaginatedTransactions = () => {
    const startIndex = (transactionPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return transactions.slice(startIndex, endIndex);
  };

  const getTotalGamePages = () => Math.ceil(gameHistory.length / itemsPerPage);
  const getTotalTransactionPages = () => Math.ceil(transactions.length / itemsPerPage);

  // Pagination component
  const PaginationControls = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    itemType 
  }: { 
    currentPage: number; 
    totalPages: number; 
    onPageChange: (page: number) => void; 
    itemType: string;
  }) => {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, itemType === 'games' ? gameHistory.length : transactions.length);
    const totalItems = itemType === 'games' ? gameHistory.length : transactions.length;

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center text-sm text-gray-700">
          <span>
            Mostrando {startItem} a {endItem} de {totalItems} {itemType === 'games' ? 'jogos' : 'transações'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          
          {/* Page numbers */}
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className="w-10 h-8"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center"
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const totalWins = gameHistory.filter(g => g.result === 'won').length;
  const totalGames = gameHistory.length;
  const winRate = totalGames > 0 ? (totalWins / totalGames * 100).toFixed(1) : '0';
  const totalWinnings = gameHistory.reduce((sum, game) => sum + game.winAmount, 0);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-viewport-fix bg-gray-50">
      <div className="h-screen mobile-scroll-container">
        <Header currentPage="dashboard" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Olá, {user.name ? user.name.split(' ')[0] : user.username}! 👋
          </h1>
          <p className="text-gray-600">
            Bem-vindo ao seu painel pessoal. Acompanhe seus jogos e transações.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="games">Jogos</TabsTrigger>
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(user.balance)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Disponível para jogos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Vitória</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {winRate}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {totalWins} vitórias de {totalGames} jogos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Ganho</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(totalWinnings)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ganhos totais
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Jogos Hoje</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {gameHistory.filter(game => 
                      new Date(game.date).toDateString() === new Date().toDateString()
                    ).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Partidas jogadas hoje
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-500 to-purple-600 text-white" onClick={() => window.location.href = '/'}>
                <CardContent className="p-4 text-center">
                  <Play className="h-8 w-8 text-white mx-auto mb-2" />
                  <h3 className="font-medium text-white">Jogar Agora</h3>
                  <p className="text-sm text-purple-100">Iniciar nova partida</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-green-500 to-green-600 text-white" onClick={() => window.location.href = '/payments'}>
                <CardContent className="p-4 text-center">
                  <Wallet className="h-8 w-8 text-white mx-auto mb-2" />
                  <h3 className="font-medium text-white">Depositar</h3>
                  <p className="text-sm text-green-100">Adicionar saldo</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-500 to-blue-600 text-white" onClick={() => window.location.href = '/affiliates'}>
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 text-white mx-auto mb-2" />
                  <h3 className="font-medium text-white">Afiliados</h3>
                  <p className="text-sm text-blue-100">Indique e ganhe</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <History className="w-5 h-5 mr-2" />
                    Jogos Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {gameHistory.slice(0, 3).map((game) => (
                      <div key={game.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg space-y-3 sm:space-y-0">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            game.result === 'won' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                            {game.result === 'won' ? '🏆' : '❌'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">
                              Jogo da Memória - {game.result === 'won' ? 'Vitória' : 'Derrota'}
                            </div>
                            <div className="text-sm text-gray-600 truncate">
                              {formatDate(game.date)} • {game.pairs}/8 pares
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:text-right space-y-1 sm:flex-shrink-0">
                          <div className="font-medium text-sm sm:text-base">
                            Aposta: {formatCurrency(game.betAmount)}
                          </div>
                          <div className={`text-sm ${game.result === 'won' ? 'text-green-600' : 'text-red-600'}`}>
                            {game.result === 'won' ? `Ganhou: ${formatCurrency(game.winAmount)}` : 'Perdeu'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-4" onClick={() => setActiveTab('games')}>
                    Ver Todos os Jogos
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Transações Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transactions.slice(0, 3).map((transaction) => (
                      <div key={transaction.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg space-y-3 sm:space-y-0">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            transaction.type === 'deposit' ? 'bg-green-100 text-green-600' :
                            transaction.type === 'withdrawal' ? 'bg-blue-100 text-blue-600' :
                            transaction.type === 'game_win' ? 'bg-purple-100 text-purple-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {transaction.type === 'deposit' ? '⬇️' :
                             transaction.type === 'withdrawal' ? '⬆️' :
                             transaction.type === 'game_win' ? '🏆' : '🎮'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{transaction.description}</div>
                            <div className="text-sm text-gray-600 truncate">
                              {formatDate(transaction.date)}
                              {transaction.method && ` • ${transaction.method}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:text-right space-y-1 sm:flex-shrink-0">
                          <div className={`font-medium text-sm sm:text-base ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                          </div>
                          {getStatusBadge(transaction.status, transaction.type)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-4" onClick={() => setActiveTab('transactions')}>
                    Ver Todas as Transações
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="games" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="w-5 h-5 mr-2" />
                  Histórico de Jogos
                </CardTitle>
                <CardDescription>
                  Acompanhe seu desempenho em todos os jogos
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-4 p-6">
                  {getPaginatedGames().map((game) => (
                    <div key={game.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg space-y-3 sm:space-y-0">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          game.result === 'won' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {game.result === 'won' ? '🏆' : '❌'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            Jogo da Memória - {game.result === 'won' ? 'Vitória' : 'Derrota'}
                          </div>
                          <div className="text-sm text-gray-600 truncate">
                            {formatDate(game.date)} • {game.pairs}/8 pares
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:text-right space-y-1 sm:flex-shrink-0">
                        <div className="font-medium text-sm sm:text-base">
                          Aposta: {formatCurrency(game.betAmount)}
                        </div>
                        <div className={`text-sm ${game.result === 'won' ? 'text-green-600' : 'text-red-600'}`}>
                          {game.result === 'won' ? `Ganhou: ${formatCurrency(game.winAmount)}` : 'Perdeu'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationControls
                  currentPage={gamePage}
                  totalPages={getTotalGamePages()}
                  onPageChange={setGamePage}
                  itemType="games"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Histórico de Transações
                </CardTitle>
                <CardDescription>
                  Todas as suas transações financeiras
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-4 p-6">
                  {getPaginatedTransactions().map((transaction) => (
                    <div key={transaction.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg space-y-3 sm:space-y-0">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          transaction.type === 'deposit' ? 'bg-green-100 text-green-600' :
                          transaction.type === 'withdrawal' ? 'bg-blue-100 text-blue-600' :
                          transaction.type === 'game_win' ? 'bg-purple-100 text-purple-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {transaction.type === 'deposit' ? '⬇️' :
                           transaction.type === 'withdrawal' ? '⬆️' :
                           transaction.type === 'game_win' ? '🏆' : '🎮'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{transaction.description}</div>
                          <div className="text-sm text-gray-600 truncate">
                            {formatDate(transaction.date)}
                            {transaction.method && ` • ${transaction.method}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:text-right space-y-1 sm:flex-shrink-0">
                        <div className={`font-medium text-sm sm:text-base ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                        </div>
                        {getStatusBadge(transaction.status, transaction.type)}
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationControls
                  currentPage={transactionPage}
                  totalPages={getTotalTransactionPages()}
                  onPageChange={setTransactionPage}
                  itemType="transactions"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Informações Pessoais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                    <div className="p-3 bg-gray-50 rounded-lg text-gray-900 font-medium">{user.name}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="p-3 bg-gray-50 rounded-lg flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-gray-600" />
                      <span className="text-gray-900 font-medium">{user.email}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID do Usuário</label>
                    <div className="p-3 bg-gray-50 rounded-lg text-gray-900 font-medium">#{user.id}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Preferências
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium text-gray-900">Tema da Interface</div>
                        <div className="text-sm text-gray-600 mt-1">
                          • <strong>Claro:</strong> Interface clara para uso diurno<br/>
                          • <strong>Escuro:</strong> Interface escura para reduzir cansaço visual<br/>
                          • <strong>Sistema:</strong> Segue automaticamente as preferências do seu dispositivo
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant={theme === 'light' ? 'default' : 'outline'}
                        onClick={() => handleThemeChange('light')}
                        className="flex-1"
                      >
                        <Sun className={`w-4 h-4 mr-1 ${theme === 'light' ? 'text-white' : 'text-gray-700'}`} />
                        Claro
                      </Button>
                      <Button
                        size="sm"
                        variant={theme === 'dark' ? 'default' : 'outline'}
                        onClick={() => handleThemeChange('dark')}
                        className="flex-1"
                      >
                        <Moon className={`w-4 h-4 mr-1 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`} />
                        Escuro
                      </Button>
                      <Button
                        size="sm"
                        variant={theme === 'system' ? 'default' : 'outline'}
                        onClick={() => handleThemeChange('system')}
                        className="flex-1"
                      >
                        <Monitor className={`w-4 h-4 mr-1 ${theme === 'system' ? 'text-white' : 'text-gray-700'}`} />
                        Sistema
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">Conta Ativa</div>
                      <div className="text-sm text-gray-600">Status da conta</div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">Saldo Disponível</div>
                      <div className="text-sm text-gray-600">Para jogos</div>
                    </div>
                    <div className="text-sm font-medium text-green-600">
                      {formatCurrency(user.balance)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
}