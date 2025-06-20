import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, User, Search, Key, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import AdminHeader from '../components/ui/AdminHeader';
import { AdminProtectedRoute } from '../components/ui/AdminProtectedRoute';

interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  createdAt: string;
}

export default function AdminPasswordManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  
  // User password form
  const [userNewPassword, setUserNewPassword] = useState('');
  const [userConfirmPassword, setUserConfirmPassword] = useState('');
  
  // Admin password form
  const [adminCurrentPassword, setAdminCurrentPassword] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast.error('Erro ao carregar usuários');
      }
    } catch (error) {
      toast.error('Erro ao conectar com servidor');
    }
    setLoading(false);
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const handleUserPasswordChange = async () => {
    if (!selectedUser) {
      toast.error('Selecione um usuário');
      return;
    }

    if (userNewPassword.length < 6) {
      toast.error('Nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (userNewPassword !== userConfirmPassword) {
      toast.error('Confirmação de senha não confere');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/change-user-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          newPassword: userNewPassword
        }),
        credentials: 'include'
      });

      if (response.ok) {
        toast.success(`Senha do usuário ${selectedUser.username} alterada com sucesso!`);
        setUserNewPassword('');
        setUserConfirmPassword('');
        setSelectedUser(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao alterar senha do usuário');
      }
    } catch (error) {
      toast.error('Erro ao conectar com servidor');
    }
    setLoading(false);
  };

  const handleAdminPasswordChange = async () => {
    if (adminCurrentPassword.length < 1) {
      toast.error('Digite sua senha atual');
      return;
    }

    if (adminNewPassword.length < 6) {
      toast.error('Nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (adminNewPassword !== adminConfirmPassword) {
      toast.error('Confirmação de senha não confere');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/change-admin-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: adminCurrentPassword,
          newPassword: adminNewPassword
        }),
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('Senha do administrador alterada com sucesso!');
        setAdminCurrentPassword('');
        setAdminNewPassword('');
        setAdminConfirmPassword('');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao alterar senha do administrador');
      }
    } catch (error) {
      toast.error('Erro ao conectar com servidor');
    }
    setLoading(false);
  };

  return (
    <AdminProtectedRoute>
      <div className="mobile-viewport-fix bg-gray-50">
        <AdminHeader currentPage="passwords" />
        
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <div className="flex items-center space-x-2 mb-6">
            <Key className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Senhas</h1>
          </div>

          <Tabs defaultValue="users" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="users" className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Senhas de Usuários</span>
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Senha do Admin</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Alterar Senha de Usuário
                  </CardTitle>
                  <CardDescription>
                    Selecione um usuário e defina uma nova senha
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search Users */}
                  <div className="space-y-2">
                    <Label htmlFor="search">Buscar Usuário</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="search"
                        placeholder="Buscar por nome, email ou username..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* User Selection */}
                  <div className="space-y-2">
                    <Label>Selecionar Usuário</Label>
                    <Select
                      value={selectedUser?.id.toString() || ''}
                      onValueChange={(value) => {
                        const user = users.find(u => u.id.toString() === value);
                        setSelectedUser(user || null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            <div className="flex flex-col">
                              <span className="font-medium">{user.name || user.username}</span>
                              <span className="text-sm text-gray-500">{user.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedUser && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">Usuário Selecionado:</h4>
                      <div className="text-sm text-blue-800">
                        <p><strong>Nome:</strong> {selectedUser.name}</p>
                        <p><strong>Email:</strong> {selectedUser.email}</p>
                        <p><strong>Username:</strong> {selectedUser.username}</p>
                      </div>
                    </div>
                  )}

                  {/* Password Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="userNewPassword">Nova Senha</Label>
                      <Input
                        id="userNewPassword"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={userNewPassword}
                        onChange={(e) => setUserNewPassword(e.target.value)}
                        disabled={!selectedUser}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="userConfirmPassword">Confirmar Nova Senha</Label>
                      <Input
                        id="userConfirmPassword"
                        type="password"
                        placeholder="Repita a nova senha"
                        value={userConfirmPassword}
                        onChange={(e) => setUserConfirmPassword(e.target.value)}
                        disabled={!selectedUser}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleUserPasswordChange}
                    disabled={loading || !selectedUser || !userNewPassword || !userConfirmPassword}
                    className="w-full"
                  >
                    {loading ? 'Alterando...' : 'Alterar Senha do Usuário'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admin" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Alterar Senha do Administrador
                  </CardTitle>
                  <CardDescription>
                    Altere sua própria senha de administrador
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Atenção:</p>
                      <p>Ao alterar sua senha, você precisará fazer login novamente.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="adminCurrentPassword">Senha Atual</Label>
                      <Input
                        id="adminCurrentPassword"
                        type="password"
                        placeholder="Digite sua senha atual"
                        value={adminCurrentPassword}
                        onChange={(e) => setAdminCurrentPassword(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="adminNewPassword">Nova Senha</Label>
                        <Input
                          id="adminNewPassword"
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          value={adminNewPassword}
                          onChange={(e) => setAdminNewPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="adminConfirmPassword">Confirmar Nova Senha</Label>
                        <Input
                          id="adminConfirmPassword"
                          type="password"
                          placeholder="Repita a nova senha"
                          value={adminConfirmPassword}
                          onChange={(e) => setAdminConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleAdminPasswordChange}
                    disabled={loading || !adminCurrentPassword || !adminNewPassword || !adminConfirmPassword}
                    className="w-full"
                  >
                    {loading ? 'Alterando...' : 'Alterar Senha do Administrador'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}