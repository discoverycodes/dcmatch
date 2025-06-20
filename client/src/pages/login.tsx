import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Eye, EyeOff, User, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { CustomCaptcha } from '../components/ui/CustomCaptcha';

export default function LoginPage() {
  const { settings, loading: settingsLoading } = useSiteSettings();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: "",
    confirmPassword: "",
    phone: '',
    cpf: ''
  });
  const [captchaData, setCaptchaData] = useState({
    id: '',
    answer: ''
  });
  const [captchaError, setCaptchaError] = useState('');

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

  // Check for session messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    
    if (message === 'concurrent_login' || message === 'session_expired') {
      toast.error('Sessão Encerrada', {
        description: 'Sua sessão foi encerrada devido a login em outro dispositivo ou aba.',
        duration: 5000,
        action: {
          label: 'Entendi',
          onClick: () => toast.dismiss()
        }
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setCaptchaError('');
    
    try {
      // Validate CAPTCHA first
      if (!captchaData.id || !captchaData.answer) {
        setCaptchaError('Por favor, resolva o CAPTCHA');
        setLoading(false);
        return;
      }

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
          email: formData.email, 
          password: formData.password,
          captchaId: captchaData.id,
          captchaAnswer: captchaData.answer
        } : 
        { 
          password: formData.password,
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          cpf: formData.cpf,
          captchaId: captchaData.id,
          captchaAnswer: captchaData.answer
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
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar solicitação';
      
      // Check if it's a CAPTCHA error
      if (errorMessage.includes('CAPTCHA')) {
        setCaptchaError(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCaptchaChange = (captchaId: string, answer: string) => {
    setCaptchaData({ id: captchaId, answer });
    setCaptchaError('');
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
    <div className="mobile-viewport-fix bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative">
      <div className="h-screen mobile-scroll-container overflow-y-auto pb-20">
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
        
        <div className="relative z-10 flex items-center justify-center py-8 px-4 min-h-full">
          <div className="w-full max-w-md space-y-8">
            {/* Logo/Header */}
            <div className="text-center">
            {settings?.logoLight ? (
              <div className="mx-auto mb-6 flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full blur-lg opacity-50"></div>
                  <img 
                    src={settings.logoLight} 
                    alt={settings.siteName || 'Logo'} 
                    className="relative h-20 w-auto object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="relative w-20 h-20 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center hidden shadow-2xl">
                    <span className="text-2xl font-bold text-white">
                      {settings?.siteName?.charAt(0)?.toUpperCase() || 'M'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full blur-lg opacity-50"></div>
                <div className="relative w-20 h-20 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                  <span className="text-2xl font-bold text-white">
                    {settings?.siteName?.charAt(0)?.toUpperCase() || 'M'}
                  </span>
                </div>
              </div>
            )}
            <p className="text-blue-200/80 text-lg">Teste sua memória e ganhe prêmios reais</p>
          </div>
          {/* Login/Register Card */}
          <Card className="border-0 shadow-2xl bg-gradient-to-b from-white/95 to-white/90 backdrop-blur-xl border border-white/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5"></div>
            <CardHeader className="space-y-1 relative">
              <CardTitle className="text-3xl text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent font-bold">
                {isLogin ? 'Entrar' : 'Criar Conta'}
              </CardTitle>
              <CardDescription className="text-center text-gray-600">
                {isLogin 
                  ? 'Entre com suas credenciais para começar a jogar' 
                  : 'Crie sua conta e comece a ganhar prêmios'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nome Completo</label>
                    <div className="relative group">
                      <User className="w-5 h-5 absolute left-3 top-3.5 text-gray-800 group-focus-within:text-purple-600 transition-colors z-10" />
                      <Input
                        type="text"
                        placeholder="Seu nome completo"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="pl-12 h-12 border-2 border-purple-200 focus:border-purple-500 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/90 text-black placeholder-gray-500"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <div className="relative group">
                    <Mail className="w-5 h-5 absolute left-3 top-3.5 text-gray-800 group-focus-within:text-purple-600 transition-colors z-10" />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="pl-12 h-12 border-2 border-purple-200 focus:border-purple-500 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/90 text-black placeholder-gray-500"
                      required
                    />
                  </div>
                </div>

                {!isLogin && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">CPF</label>
                      <Input
                        type="text"
                        placeholder="000.000.000-00"
                        value={formData.cpf}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          cpf: formatCPF(e.target.value) 
                        }))}
                        maxLength={14}
                        className="h-12 border-2 border-purple-200 focus:border-purple-500 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/90 text-black placeholder-gray-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Telefone</label>
                      <Input
                        type="text"
                        placeholder="(11) 99999-9999"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          phone: formatPhone(e.target.value) 
                        }))}
                        maxLength={15}
                        className="h-12 border-2 border-purple-200 focus:border-purple-500 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/90 text-black placeholder-gray-500"
                        required
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Senha</label>
                  <div className="relative group">
                    <Lock className="w-5 h-5 absolute left-3 top-3.5 text-gray-800 group-focus-within:text-purple-600 transition-colors z-10" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={isLogin ? "Sua senha" : "Crie uma senha (min. 6 caracteres)"}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="pl-12 pr-12 h-12 border-2 border-purple-200 focus:border-purple-500 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/90 text-black placeholder-gray-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-gray-800 hover:text-purple-600 transition-colors z-10"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmar Senha</label>
                    <div className="relative group">
                      <Lock className="w-5 h-5 absolute left-3 top-3.5 text-gray-800 group-focus-within:text-purple-600 transition-colors z-10" />
                      <Input
                        type="password"
                        placeholder="Confirme sua senha"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="pl-12 h-12 border-2 border-purple-200 focus:border-purple-500 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/90 text-black placeholder-gray-500"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* CAPTCHA Component */}
                <CustomCaptcha 
                  onCaptchaChange={handleCaptchaChange}
                  error={captchaError}
                />

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105" 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      {isLogin ? 'Entrando...' : 'Criando conta...'}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      {isLogin ? <LogIn className="w-5 h-5 mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
                      {isLogin ? 'Entrar' : 'Criar Conta'}
                    </div>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-purple-600 hover:text-purple-800 underline font-medium transition-colors"
                >
                  {isLogin 
                    ? 'Não tem conta? Criar uma agora' 
                    : 'Já tem conta? Fazer login'
                  }
                </button>
              </div>

              {isLogin && (
                <div className="mt-4 text-center">
                  <button 
                    onClick={() => window.location.href = '/forgot-password'}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}