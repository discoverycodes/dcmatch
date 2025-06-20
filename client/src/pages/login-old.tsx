import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Eye, EyeOff, User, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useSiteSettings } from '../hooks/useSiteSettings';

export default function LoginPage() {
  const { settings, loading: settingsLoading } = useSiteSettings();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    cpf: ''
  });

  // Update page title and favicon when settings load
  useEffect(() => {
    if (settings) {
      document.title = `${isLogin ? 'Login' : 'Cadastro'} - ${settings.siteName}`;
      
      if (settings.favicon) {
        let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (!favicon) {
          favicon = document.createElement('link');
          favicon.rel = 'icon';
          document.head.appendChild(favicon);
        }
        favicon.href = settings.favicon;
      }
    }
  }, [settings, isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (!isLogin) {
        // Validações de registro
        if (formData.password !== formData.confirmPassword) {
          toast.error('Senhas não coincidem');
          return;
        }
        if (formData.password.length < 6) {
          toast.error('Senha deve ter pelo menos 6 caracteres');
          return;
        }
        if (!formData.email || !formData.email.includes('@')) {
          toast.error('Email inválido');
          return;
        }
      }

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin ? 
        { 
          username: formData.email, 
          password: formData.password 
        } : 
        { 
          username: formData.email, 
          password: formData.password,
          email: formData.email,
          name: formData.name || formData.email
        };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Operação falhou');
      }

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success(isLogin ? 'Login realizado com sucesso!' : 'Conta criada com sucesso!');
        window.location.href = '/';
      } else {
        throw new Error('Operação falhou');
      }
      
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  return (
    <div className="mobile-viewport-fix min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-purple-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-pink-500/10 rounded-full blur-xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-indigo-500/10 rounded-full blur-xl animate-pulse delay-500"></div>
      </div>
      
      {/* Memory Cards Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="grid grid-cols-8 gap-4 p-8 transform rotate-12">
          {Array.from({ length: 32 }).map((_, i) => (
            <div key={i} className="aspect-square bg-white/10 rounded-lg border border-white/20"></div>
          ))}
        </div>
      </div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Logo/Header */}
        <div className="text-center">
          {settings?.logoLight ? (
            <div className="mx-auto mb-4 flex justify-center">
              <img 
                src={settings.logoLight} 
                alt={settings.siteName || 'Logo'} 
                className="h-16 w-auto object-contain"
                onError={(e) => {
                  // Fallback se a imagem não carregar
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center hidden">
                <span className="text-2xl font-bold text-white">
                  {settings?.siteName?.charAt(0)?.toUpperCase() || 'M'}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">
                {settings?.siteName?.charAt(0)?.toUpperCase() || 'M'}
              </span>
            </div>
          )}
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-3">
            {settings?.siteName || 'Memory Casino'}
          </h1>
          <p className="text-blue-200/80 text-lg">Teste sua memória e ganhe prêmios reais</p>
        </div>

        {/* Login/Register Card */}
        <Card className="border-0 shadow-2xl bg-gradient-to-b from-white/95 to-white/90 backdrop-blur-xl border border-white/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {isLogin ? 'Entrar' : 'Criar Conta'}
            </CardTitle>
            <CardDescription className="text-center">
              {isLogin 
                ? 'Entre com suas credenciais para jogar' 
                : 'Crie sua conta e comece a jogar'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium mb-1">Nome Completo</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Seu nome completo"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">CPF</label>
                    <Input
                      type="text"
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        cpf: formatCPF(e.target.value) 
                      }))}
                      maxLength={14}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Telefone</label>
                    <Input
                      type="text"
                      placeholder="(11) 99999-9999"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        phone: formatPhone(e.target.value) 
                      }))}
                      maxLength={15}
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={isLogin ? "Sua senha" : "Crie uma senha (min. 8 caracteres)"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium mb-1">Confirmar Senha</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="Confirme sua senha"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {isLogin ? 'Entrando...' : 'Criando conta...'}
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    {isLogin ? <LogIn className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    {isLogin ? 'Entrar' : 'Criar Conta'}
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {isLogin 
                  ? 'Não tem conta? Criar uma agora' 
                  : 'Já tem conta? Fazer login'
                }
              </button>
            </div>

            {isLogin && (
              <div className="mt-4 text-center">
                <button className="text-sm text-gray-600 hover:text-gray-800 underline">
                  Esqueceu sua senha?
                </button>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}