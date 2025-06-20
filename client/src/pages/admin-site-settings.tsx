import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Save, RefreshCw, Image, Palette, Globe } from 'lucide-react';
import { toast } from 'sonner';
import AdminHeader from '../components/ui/AdminHeader';
import { AdminProtectedRoute } from '../components/ui/AdminProtectedRoute';

export default function AdminSiteSettings() {
  const [settings, setSettings] = useState({
    siteName: 'Memory Casino',
    favicon: null,
    logoLight: null,
    logoDark: null,
    primaryColor: '#6366f1',
    theme: 'light'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/site-settings', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/site-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('Configurações salvas com sucesso!');
        // Apply changes to current page
        document.title = settings.siteName;
        if (settings.favicon) {
          const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (link) link.href = settings.favicon;
        }
      } else {
        toast.error('Erro ao salvar configurações');
      }
    } catch (error) {
      toast.error('Erro ao conectar com servidor');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'favicon' | 'logoLight' | 'logoDark') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const response = await fetch('/api/admin/upload-asset', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({
          ...prev,
          [type]: data.url
        }));
        toast.success(`${type === 'favicon' ? 'Favicon' : 'Logo'} carregado com sucesso!`);
      } else {
        toast.error('Erro ao fazer upload do arquivo');
      }
    } catch (error) {
      toast.error('Erro ao conectar com servidor');
    }
  };

  const presetColors = [
    { name: 'Azul', value: '#6366f1' },
    { name: 'Roxo', value: '#8b5cf6' },
    { name: 'Verde', value: '#10b981' },
    { name: 'Vermelho', value: '#ef4444' },
    { name: 'Laranja', value: '#f59e0b' },
    { name: 'Rosa', value: '#ec4899' },
  ];

  if (loading) {
    return (
      <div className="mobile-viewport-fix bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminProtectedRoute>
      <div className="mobile-viewport-fix bg-gray-50">
        <AdminHeader currentPage="site-settings" />
        <div className="h-screen mobile-scroll-container">
          <div className="p-4 md:p-6 pb-20">
            <div className="max-w-7xl mx-auto mb-6">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="float-right"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <div className="clear-both"></div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto">
              <Tabs defaultValue="general" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">
                  <Globe className="w-4 h-4 mr-2" />
                  Geral
                </TabsTrigger>
                <TabsTrigger value="branding">
                  <Image className="w-4 h-4 mr-2" />
                  Visual
                </TabsTrigger>
                <TabsTrigger value="theme">
                  <Palette className="w-4 h-4 mr-2" />
                  Tema
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Gerais</CardTitle>
                    <CardDescription>
                      Configure as informações básicas do seu site
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="siteName">Nome do Site</Label>
                      <Input
                        id="siteName"
                        value={settings.siteName}
                        onChange={(e) => setSettings(prev => ({ ...prev, siteName: e.target.value }))}
                        placeholder="Memory Casino"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="branding" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Image className="w-5 h-5 mr-2" />
                        Favicon
                      </CardTitle>
                      <CardDescription>
                        Ícone do site (16x16px, formato .ico ou .png)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {settings.favicon && (
                        <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                          <img src={settings.favicon} alt="Favicon" className="w-4 h-4" />
                          <span className="text-sm text-gray-600">Favicon atual</span>
                        </div>
                      )}
                      
                      <Input
                        type="file"
                        accept=".ico,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'favicon');
                        }}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Image className="w-5 h-5 mr-2" />
                        Logo Claro
                      </CardTitle>
                      <CardDescription>
                        Logo para tema claro (PNG transparente recomendado)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {settings.logoLight && (
                        <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                          <img src={settings.logoLight} alt="Logo claro" className="h-8 w-auto" />
                          <span className="text-sm text-gray-600">Logo atual</span>
                        </div>
                      )}
                      
                      <Input
                        type="file"
                        accept=".png,.jpg,.jpeg,.svg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'logoLight');
                        }}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Image className="w-5 h-5 mr-2" />
                        Logo Escuro
                      </CardTitle>
                      <CardDescription>
                        Logo para tema escuro (PNG transparente recomendado)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {settings.logoDark && (
                        <div className="flex items-center space-x-2 p-2 bg-gray-900 rounded">
                          <img src={settings.logoDark} alt="Logo escuro" className="h-8 w-auto" />
                          <span className="text-sm text-white">Logo atual</span>
                        </div>
                      )}
                      
                      <Input
                        type="file"
                        accept=".png,.jpg,.jpeg,.svg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'logoDark');
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="theme" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Palette className="w-5 h-5 mr-2" />
                      Cor Principal
                    </CardTitle>
                    <CardDescription>
                      Escolha a cor principal do seu site
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                      {presetColors.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setSettings(prev => ({ ...prev, primaryColor: color.value }))}
                          className={`w-full h-12 rounded-lg border-2 transition-all ${
                            settings.primaryColor === color.value
                              ? 'border-gray-800 scale-105'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="customColor">Cor Personalizada</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="customColor"
                          type="color"
                          value={settings.primaryColor}
                          onChange={(e) => setSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="w-16 h-10 p-1 rounded"
                        />
                        <Input
                          type="text"
                          value={settings.primaryColor}
                          onChange={(e) => setSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                          placeholder="#6366f1"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}