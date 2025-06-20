import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { 
  Users, 
  DollarSign, 
  Activity, 
  AlertTriangle, 
  TrendingUp,
  Shield,
  Settings,
  FileText,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Globe,
  Gamepad2,
  Edit,
  Plus,
  Minus,
  Lock,
  Unlock
} from 'lucide-react';
import { toast } from 'sonner';
import AdminHeader from '../components/ui/AdminHeader';
import { AdminProtectedRoute } from '../components/ui/AdminProtectedRoute';

interface DashboardStats {
  totalUsers: number;
  newUsersToday: number;
  totalRevenue: number;
  revenueToday: number;
  totalGames: number;
  gamesToday: number;
  pendingWithdrawals: number;
  pendingWithdrawalsAmount: number;
  houseEdge: number;
  activeUsers24h: number;
}

interface RecentTransaction {
  id: string;
  userName: string;
  userEmail: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  balance: number;
  status: string;
  kycStatus: string;
  totalGames: number;
  lastActivity: string;
  withdrawalBlocked?: boolean;
  depositBlocked?: boolean;
  accountBlocked?: boolean;
}

export default function AdminDashboard() {
  // Security: Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    newUsersToday: 0,
    totalRevenue: 0,
    revenueToday: 0,
    totalGames: 0,
    gamesToday: 0,
    pendingWithdrawals: 0,
    pendingWithdrawalsAmount: 0,
    houseEdge: 4.8,
    activeUsers24h: 0
  });

  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  
  // Security data
  const [securityStats, setSecurityStats] = useState({
    failedLogins24h: 0,
    blockedIPs: 0,
    suspiciousTransactions: 0,
    adminSessions: 0,
    lastSecurityScan: '',
    systemUptime: 0,
    activeSessions: 0,
    securityLevel: 'High'
  });
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([]);
  
  // User management modals
  const [editUserModal, setEditUserModal] = useState(false);
  const [balanceModal, setBalanceModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    withdrawalBlocked: false,
    depositBlocked: false,
    accountBlocked: false
  });
  const [balanceForm, setBalanceForm] = useState({
    amount: '',
    type: 'add' as 'add' | 'subtract',
    reason: ''
  });



  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats', {
        credentials: 'include'
      });
      
      if (response.ok) {
        setIsAuthenticated(true);
        loadDashboardData();
      } else {
        // Not authenticated, redirect immediately
        window.location.href = '/dcmemocontroll';
        return;
      }
    } catch (error) {
      // Network error, redirect immediately
      window.location.href = '/dcmemocontroll';
      return;
    }
    setAuthChecking(false);
  };



  const loadDashboardData = async () => {
    try {
      // Load dashboard stats
      const statsResponse = await fetch('/api/admin/dashboard/stats', {
        credentials: 'include'
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Load recent transactions
      const transactionsResponse = await fetch('/api/admin/dashboard/transactions', {
        credentials: 'include'
      });
      
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setRecentTransactions(transactionsData);
      }

      // Load real users from database
      const usersResponse = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData);
      }

      // Load security stats
      const securityResponse = await fetch('/api/admin/security/stats', {
        credentials: 'include'
      });
      
      if (securityResponse.ok) {
        const securityData = await securityResponse.json();
        setSecurityStats(securityData.stats);
        setSecurityAlerts(securityData.alerts);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
    setLoading(false);
  };

  // User management functions
  const openEditUserModal = (user: User) => {
    setSelectedUser(user);
    setEditUserForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      cpf: user.cpf || '',
      withdrawalBlocked: user.withdrawalBlocked || false,
      depositBlocked: user.depositBlocked || false,
      accountBlocked: user.accountBlocked || false
    });
    setEditUserModal(true);
  };

  const openBalanceModal = (user: User) => {
    setSelectedUser(user);
    setBalanceForm({
      amount: '',
      type: 'add',
      reason: ''
    });
    setBalanceModal(true);
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(editUserForm)
      });

      if (response.ok) {
        toast.success('Usuário atualizado com sucesso!');
        setEditUserModal(false);
        loadDashboardData(); // Reload data
      } else {
        toast.error('Erro ao atualizar usuário');
      }
    } catch (error) {
      toast.error('Erro ao atualizar usuário');
    }
  };

  const handleBalanceChange = async () => {
    if (!selectedUser || !balanceForm.amount) return;

    const amount = parseFloat(balanceForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Digite um valor válido');
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          amount,
          type: balanceForm.type,
          reason: balanceForm.reason || (balanceForm.type === 'add' ? 'Saldo adicionado pela administração' : 'Saldo descontado pela administração')
        })
      });

      if (response.ok) {
        toast.success(`Saldo ${balanceForm.type === 'add' ? 'adicionado' : 'descontado'} com sucesso!`);
        setBalanceModal(false);
        loadDashboardData(); // Reload data
      } else {
        toast.error('Erro ao modificar saldo');
      }
    } catch (error) {
      toast.error('Erro ao modificar saldo');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      deposit: 'bg-blue-100 text-blue-800',
      withdrawal: 'bg-purple-100 text-purple-800',
      payout: 'bg-green-100 text-green-800'
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };



  // SECURITY: Block rendering if not authenticated
  if (authChecking) {
    return (
      <div className="mobile-viewport-fix bg-gray-50">
        <div className="h-screen mobile-scroll-container flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verificando autenticação...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mobile-viewport-fix bg-gray-50">
        <div className="h-screen mobile-scroll-container flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
            <p className="text-gray-600 mb-4">Você não tem permissão para acessar esta área.</p>
            <Button onClick={() => window.location.href = '/dcmemocontroll'}>
              Fazer Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-viewport-fix bg-gray-50">
      <AdminHeader currentPage="dashboard" />
      <div className="h-screen mobile-scroll-container">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-20">

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+{stats.newUsersToday}</span> hoje
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground">
                R$ {stats.revenueToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} hoje
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Jogos</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGames.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stats.gamesToday} hoje
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saques Pendentes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingWithdrawals}</div>
              <p className="text-xs text-muted-foreground">
                R$ {stats.pendingWithdrawalsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Additional Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Métricas de Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">House Edge</span>
                    <span className="font-semibold text-green-600">{stats.houseEdge}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Usuários Ativos (24h)</span>
                    <span className="font-semibold">{stats.activeUsers24h}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Taxa de Conversão</span>
                    <span className="font-semibold text-blue-600">18.5%</span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle>Transações Recentes</CardTitle>
                  <CardDescription>Últimas atividades financeiras</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{transaction.userName}</div>
                          <div className="text-sm text-gray-500">{transaction.userEmail}</div>
                        </div>
                        <div className="text-center">
                          <Badge className={getStatusBadge(transaction.type)}>
                            {transaction.type}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">R$ {transaction.amount.toFixed(2)}</div>
                          <Badge className={getStatusBadge(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciamento de Usuários</CardTitle>
                <CardDescription>Controle total sobre contas de usuários</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="space-y-4 min-w-[800px]">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {user.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-lg">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            {user.phone && <div className="text-xs text-gray-400">📱 {user.phone}</div>}
                            {user.cpf && <div className="text-xs text-gray-400">🆔 {user.cpf}</div>}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <div className="text-sm text-gray-500">Saldo</div>
                            <div className="font-bold text-green-600 text-lg">R$ {Number(user.balance || 0).toFixed(2)}</div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-sm text-gray-500">Status</div>
                            <Badge className={getStatusBadge(user.status)}>
                              {user.status}
                            </Badge>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-sm text-gray-500">Bloqueios</div>
                            <div className="flex flex-col space-y-1">
                              {user.accountBlocked && <Badge variant="destructive" className="text-xs">Conta</Badge>}
                              {user.withdrawalBlocked && <Badge variant="outline" className="text-xs border-red-500 text-red-600">Saque</Badge>}
                              {user.depositBlocked && <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">Depósito</Badge>}
                              {!user.accountBlocked && !user.withdrawalBlocked && !user.depositBlocked && 
                                <Badge variant="outline" className="text-xs border-green-500 text-green-600">Liberado</Badge>
                              }
                            </div>
                          </div>
                          
                          <div className="flex flex-col space-y-2">
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline" onClick={() => openEditUserModal(user)}>
                                <Edit className="w-4 h-4 mr-1" />
                                Editar
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openBalanceModal(user)} className="bg-green-50 hover:bg-green-100">
                                <DollarSign className="w-4 h-4 mr-1" />
                                Saldo
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Edit User Modal */}
            <Dialog open={editUserModal} onOpenChange={setEditUserModal}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Editar Usuário</DialogTitle>
                  <DialogDescription>
                    Modifique as informações e configurações do usuário
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Nome</Label>
                    <Input
                      id="name"
                      value={editUserForm.name}
                      onChange={(e) => setEditUserForm({...editUserForm, name: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editUserForm.email}
                      onChange={(e) => setEditUserForm({...editUserForm, email: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone" className="text-right">Telefone</Label>
                    <Input
                      id="phone"
                      value={editUserForm.phone}
                      onChange={(e) => setEditUserForm({...editUserForm, phone: e.target.value})}
                      className="col-span-3"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cpf" className="text-right">CPF</Label>
                    <Input
                      id="cpf"
                      value={editUserForm.cpf}
                      onChange={(e) => setEditUserForm({...editUserForm, cpf: e.target.value})}
                      className="col-span-3"
                      placeholder="000.000.000-00"
                    />
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-4">Configurações de Bloqueio</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="accountBlocked" className="font-medium">Bloquear Conta</Label>
                          <p className="text-sm text-gray-500">Usuário não pode fazer login</p>
                        </div>
                        <Switch
                          id="accountBlocked"
                          checked={editUserForm.accountBlocked}
                          onCheckedChange={(checked) => setEditUserForm({...editUserForm, accountBlocked: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="withdrawalBlocked" className="font-medium">Bloquear Saques</Label>
                          <p className="text-sm text-gray-500">Usuário não pode sacar</p>
                        </div>
                        <Switch
                          id="withdrawalBlocked"
                          checked={editUserForm.withdrawalBlocked}
                          onCheckedChange={(checked) => setEditUserForm({...editUserForm, withdrawalBlocked: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="depositBlocked" className="font-medium">Bloquear Depósitos</Label>
                          <p className="text-sm text-gray-500">Usuário não pode depositar</p>
                        </div>
                        <Switch
                          id="depositBlocked"
                          checked={editUserForm.depositBlocked}
                          onCheckedChange={(checked) => setEditUserForm({...editUserForm, depositBlocked: checked})}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditUserModal(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={handleEditUser}>
                    Salvar Alterações
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Balance Modification Modal */}
            <Dialog open={balanceModal} onOpenChange={setBalanceModal}>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Modificar Saldo</DialogTitle>
                  <DialogDescription>
                    {selectedUser && `Saldo atual de ${selectedUser.name}: R$ ${Number(selectedUser.balance || 0).toFixed(2)}`}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex space-x-4">
                    <Button
                      type="button"
                      variant={balanceForm.type === 'add' ? 'default' : 'outline'}
                      onClick={() => setBalanceForm({...balanceForm, type: 'add'})}
                      className="flex-1"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                    <Button
                      type="button"
                      variant={balanceForm.type === 'subtract' ? 'default' : 'outline'}
                      onClick={() => setBalanceForm({...balanceForm, type: 'subtract'})}
                      className="flex-1"
                    >
                      <Minus className="w-4 h-4 mr-2" />
                      Subtrair
                    </Button>
                  </div>
                  
                  <div>
                    <Label htmlFor="amount">Valor (R$)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={balanceForm.amount}
                      onChange={(e) => setBalanceForm({...balanceForm, amount: e.target.value})}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="reason">Motivo (opcional)</Label>
                    <Input
                      id="reason"
                      value={balanceForm.reason}
                      onChange={(e) => setBalanceForm({...balanceForm, reason: e.target.value})}
                      placeholder={balanceForm.type === 'add' ? 'Saldo adicionado pela administração' : 'Saldo descontado pela administração'}
                      className="mt-1"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setBalanceModal(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleBalanceChange}
                    className={balanceForm.type === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                  >
                    {balanceForm.type === 'add' ? 'Adicionar' : 'Subtrair'} R$ {balanceForm.amount || '0,00'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Controle de Transações</CardTitle>
                <CardDescription>Aprovação e monitoramento de transações</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="space-y-4 min-w-[600px]">
                    {recentTransactions.filter(t => t.status === 'pending').map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50">
                      <div>
                        <div className="font-medium">{transaction.userName}</div>
                        <div className="text-sm text-gray-500">
                          {transaction.type} - R$ {transaction.amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400">{transaction.createdAt}</div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button size="sm" variant="destructive">
                          <XCircle className="w-4 h-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <div className="overflow-x-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-[600px]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Status de Segurança
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Tentativas de Login Falhadas (24h)</span>
                    <Badge className={securityStats.failedLogins24h > 10 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                      {securityStats.failedLogins24h}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>IPs Bloqueados</span>
                    <Badge className={securityStats.blockedIPs > 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                      {securityStats.blockedIPs}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Transações Suspeitas</span>
                    <Badge className={securityStats.suspiciousTransactions > 0 ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}>
                      {securityStats.suspiciousTransactions}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Sessões Admin Ativas</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {securityStats.adminSessions}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Nível de Segurança</span>
                    <Badge className={securityStats.securityLevel === 'High' ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                      {securityStats.securityLevel === 'High' ? 'Alto' : securityStats.securityLevel === 'Medium' ? 'Médio' : 'Baixo'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tempo Online do Sistema</span>
                    <span className="text-sm font-medium">
                      {Math.floor(securityStats.systemUptime / 3600)}h {Math.floor((securityStats.systemUptime % 3600) / 60)}m
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alertas Recentes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {securityAlerts.length > 0 ? (
                    securityAlerts.map((alert) => (
                      <div 
                        key={alert.id} 
                        className={`p-3 border rounded-lg ${
                          alert.severity === 'high' ? 'bg-red-50 border-red-200' :
                          alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                          'bg-green-50 border-green-200'
                        }`}
                      >
                        <div className={`font-medium ${
                          alert.severity === 'high' ? 'text-red-800' :
                          alert.severity === 'medium' ? 'text-yellow-800' :
                          'text-green-800'
                        }`}>
                          {alert.title}
                        </div>
                        <div className={`text-sm ${
                          alert.severity === 'high' ? 'text-red-600' :
                          alert.severity === 'medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {alert.message}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(alert.timestamp).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                      <div className="text-gray-600">Carregando alertas de segurança...</div>
                    </div>
                  )}
                </CardContent>
              </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Relatórios e Analytics
                </CardTitle>
                <CardDescription>Gere relatórios personalizados do sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-[500px]">
                  <Button variant="outline" className="h-20 flex-col">
                    <TrendingUp className="w-6 h-6 mb-2" />
                    Relatório Financeiro
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Users className="w-6 h-6 mb-2" />
                    Relatório de Usuários
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Activity className="w-6 h-6 mb-2" />
                    Relatório de Jogos
                  </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>


      </div>
    </div>
  );
}