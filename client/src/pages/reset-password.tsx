import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validToken, setValidToken] = useState(true);

  useEffect(() => {
    // Extract token from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setValidToken(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token, 
          newPassword 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast.success('Senha redefinida com sucesso!');
      } else {
        toast.error(data.error || 'Erro ao redefinir senha');
        if (data.error?.includes('Invalid or expired')) {
          setValidToken(false);
        }
      }
    } catch (error) {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    window.location.href = '/login';
  };

  if (!validToken) {
    return (
      <div className="mobile-viewport-fix bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative">
        <div className="h-screen mobile-scroll-container overflow-y-auto pb-20">
          <div className="relative z-10 flex items-center justify-center py-8 px-4 min-h-full">
            <div className="w-full max-w-md space-y-8">
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">Link Inválido</CardTitle>
                  <CardDescription className="text-gray-300">
                    O link de recuperação é inválido ou expirou
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <p className="text-gray-300">
                      O link que você acessou pode estar:
                    </p>
                    <div className="text-sm text-gray-400 space-y-2">
                      <p>• Expirado (válido por apenas 1 hora)</p>
                      <p>• Já utilizado anteriormente</p>
                      <p>• Corrompido ou incompleto</p>
                    </div>
                    <Button
                      onClick={() => window.location.href = '/forgot-password'}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      Solicitar Novo Link
                    </Button>
                    <Button
                      onClick={handleGoToLogin}
                      variant="ghost"
                      className="w-full text-gray-300 hover:text-white hover:bg-white/10"
                    >
                      Voltar ao Login
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mobile-viewport-fix bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative">
        <div className="h-screen mobile-scroll-container overflow-y-auto pb-20">
          <div className="relative z-10 flex items-center justify-center py-8 px-4 min-h-full">
            <div className="w-full max-w-md space-y-8">
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">Senha Redefinida!</CardTitle>
                  <CardDescription className="text-gray-300">
                    Sua senha foi alterada com sucesso
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <p className="text-gray-300">
                      Você já pode fazer login com sua nova senha.
                    </p>
                    <Button
                      onClick={handleGoToLogin}
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                    >
                      Fazer Login
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-viewport-fix bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative">
      <div className="h-screen mobile-scroll-container overflow-y-auto pb-20">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-purple-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-pink-500/10 rounded-full blur-xl animate-pulse delay-2000"></div>
          <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-indigo-500/10 rounded-full blur-xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 flex items-center justify-center py-8 px-4 min-h-full">
          <div className="w-full max-w-md space-y-8">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Lock className="w-8 h-8 text-purple-400" />
                </div>
                <CardTitle className="text-2xl font-bold text-white">Nova Senha</CardTitle>
                <CardDescription className="text-gray-300">
                  Digite sua nova senha para redefinir
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-white">Nova Senha</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Digite sua nova senha"
                        required
                        minLength={6}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-white">Confirmar Senha</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirme sua nova senha"
                        required
                        minLength={6}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="text-sm text-gray-400 space-y-1">
                    <p>A senha deve ter:</p>
                    <p>• Pelo menos 6 caracteres</p>
                    <p>• Ser diferente da senha anterior</p>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Redefinindo...
                      </div>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Redefinir Senha
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    onClick={handleGoToLogin}
                    variant="ghost"
                    className="w-full text-gray-300 hover:text-white hover:bg-white/10"
                  >
                    Voltar ao Login
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}