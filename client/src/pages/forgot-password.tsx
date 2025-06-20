import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailSent(true);
        toast.success('Email de recuperação enviado!');
      } else {
        toast.error(data.error || 'Erro ao enviar email de recuperação');
      }
    } catch (error) {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    window.location.href = '/login';
  };

  if (emailSent) {
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
                  <div className="mx-auto mb-4 w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">Email Enviado!</CardTitle>
                  <CardDescription className="text-gray-300">
                    Verifique sua caixa de entrada para continuar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center space-y-4">
                    <p className="text-gray-300">
                      Enviamos um link de recuperação de senha para:
                    </p>
                    <p className="text-white font-medium bg-white/10 p-3 rounded-lg">
                      {email}
                    </p>
                    <div className="text-sm text-gray-400 space-y-2">
                      <p>• Verifique também a pasta de spam</p>
                      <p>• O link é válido por 1 hora</p>
                      <p>• Não compartilhe o link com ninguém</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleBackToLogin}
                    variant="outline"
                    className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao Login
                  </Button>
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
                <div className="mx-auto mb-4 w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-blue-400" />
                </div>
                <CardTitle className="text-2xl font-bold text-white">Recuperar Senha</CardTitle>
                <CardDescription className="text-gray-300">
                  Informe seu email para receber o link de recuperação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Enviando...
                      </div>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Enviar Link de Recuperação
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    onClick={handleBackToLogin}
                    variant="ghost"
                    className="w-full text-gray-300 hover:text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
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