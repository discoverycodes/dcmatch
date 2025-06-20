import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Copy, Users, DollarSign, TrendingUp, Gift } from 'lucide-react';
import { toast } from 'sonner';
import Header from '../components/ui/Header';

interface ReferralInfo {
  referralCode: string;
  referredBy: string | null;
  hasReceivedReferralBonus: boolean;
  stats: {
    totalReferrals: number;
    totalCommissions: number;
    pendingCommissions: number;
  };
  referrals: Array<{
    id: number;
    username: string;
    createdAt: string;
  }>;
}

interface ReferralCommission {
  id: number;
  betAmount: string;
  commissionAmount: string;
  commissionPercentage: string;
  status: string;
  createdAt: string;
}

export default function AffiliatesPage() {
  const [user, setUser] = useState<any>(null);
  const [referralCode, setReferralCode] = useState('');
  const [userBalance, setUserBalance] = useState(0);
  const queryClient = useQueryClient();

  // Load user data from localStorage on component mount
  useEffect(() => {
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
    
    fetchUserData();
  }, []);

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

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `R$ ${numValue.toFixed(2).replace('.', ',')}`;
  };

  const { data: referralInfo, isLoading } = useQuery<ReferralInfo>({
    queryKey: ['referral-info'],
    queryFn: async () => {
      const response = await fetch('/api/user/referral-info', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch referral info');
      }
      return response.json();
    },
  });

  const { data: commissions } = useQuery<ReferralCommission[]>({
    queryKey: ['referral-commissions'],
    queryFn: async () => {
      const response = await fetch('/api/user/referral-commissions', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch commissions');
      }
      return response.json();
    },
  });

  const setReferralMutation = useMutation({
    mutationFn: async (referralCode: string) => {
      const response = await fetch('/api/user/set-referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao definir código de indicação');
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      toast.success("Sucesso!", {
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['referral-info'] });
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
      setReferralCode('');
    },
    onError: (error: any) => {
      toast.error("Erro", {
        description: error.message || "Erro ao definir código de indicação",
      });
    },
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado!", {
        description: "Código copiado para a área de transferência",
      });
    } catch (err) {
      toast.error("Erro ao copiar código");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (referralCode.trim()) {
      setReferralMutation.mutate(referralCode.trim());
    }
  };

  if (isLoading || !user) {
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
        <Header currentPage="affiliates" />

        <div className="max-w-4xl mx-auto space-y-6 p-4 pb-20">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Sistema de Afiliados
            </h1>
            <p className="text-gray-600">
              Indique amigos e ganhe comissões em cada aposta!
            </p>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total de Indicações</p>
                    <p className="text-2xl font-bold text-gray-900">{referralInfo?.stats?.totalReferrals || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Comissões Totais</p>
                    <p className="text-2xl font-bold text-gray-900">R$ {referralInfo?.stats?.totalCommissions?.toFixed(2) || '0.00'}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Comissões Pendentes</p>
                    <p className="text-2xl font-bold text-gray-900">R$ {referralInfo?.stats?.pendingCommissions?.toFixed(2) || '0.00'}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Código de Indicação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Seu Código de Indicação
              </CardTitle>
              <CardDescription className="text-gray-600">
                Compartilhe este código com seus amigos para ganhar comissões
              </CardDescription>
            </CardHeader>
            <CardContent>
              {referralInfo?.referralCode ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-gray-100 rounded-lg text-gray-900 font-mono text-lg">
                    {referralInfo.referralCode}
                  </div>
                  <Button
                    onClick={() => copyToClipboard(referralInfo.referralCode)}
                    variant="outline"
                    size="icon"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-gray-400">Código de indicação não encontrado</p>
              )}
            </CardContent>
          </Card>

          {/* Definir Código de Indicação */}
          {!referralInfo?.referredBy && (
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-900">Usar Código de Indicação</CardTitle>
                <CardDescription className="text-gray-600">
                  Digite o código de quem te indicou para ganhar R$ 1,00 de bônus!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="referralCode" className="text-gray-900">Código de Indicação</Label>
                    <Input
                      id="referralCode"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      placeholder="Digite o código aqui..."
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={setReferralMutation.isPending}
                    className="w-full"
                  >
                    {setReferralMutation.isPending ? 'Salvando...' : 'Usar Código'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Quem te indicou */}
          {referralInfo?.referredBy && (
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-900">Indicado por</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {referralInfo.referredBy}
                  </Badge>
                  <span className="text-gray-600">te indicou para o jogo!</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de Indicações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900">Suas Indicações</CardTitle>
              <CardDescription className="text-gray-600">
                Pessoas que usaram seu código de indicação
              </CardDescription>
            </CardHeader>
            <CardContent>
              {referralInfo?.referrals && referralInfo.referrals.length > 0 ? (
                <div className="space-y-2">
                  {referralInfo.referrals.map((referral) => (
                    <div key={referral.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg space-y-2 sm:space-y-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-900 font-medium truncate">{referral.username}</p>
                        <p className="text-sm text-gray-600 truncate">
                          Indicado em {new Date(referral.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma indicação ainda</p>
                  <p className="text-sm text-gray-500">Compartilhe seu código para começar a ganhar!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico de Comissões */}
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900">Histórico de Comissões</CardTitle>
              <CardDescription className="text-gray-600">
                Suas comissões das apostas dos seus indicados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commissions && commissions.length > 0 ? (
                <div className="space-y-2">
                  {commissions.map((commission) => (
                    <div key={commission.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg space-y-2 sm:space-y-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-900 font-medium truncate">Comissão de R$ {parseFloat(commission.commissionAmount).toFixed(2)}</p>
                        <p className="text-sm text-gray-600 truncate">
                          {new Date(commission.createdAt).toLocaleDateString('pt-BR')} • 
                          {parseFloat(commission.commissionPercentage).toFixed(1)}%
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <Badge 
                          variant={commission.status === 'paid' ? 'default' : 'secondary'}
                          className={commission.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                        >
                          {commission.status === 'paid' ? 'Pago' : 'Pendente'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma comissão ainda</p>
                  <p className="text-sm text-gray-500">Quando seus indicados apostarem, você ganhará comissões!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}