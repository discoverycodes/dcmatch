import React from 'react';
import { Button } from './button';
import { Badge } from './badge';
import { 
  Settings, 
  Globe, 
  Gamepad2, 
  CreditCard, 
  Users, 
  Shield,
  LogOut,
  BarChart3,
  Key
} from 'lucide-react';

interface AdminHeaderProps {
  currentPage?: string;
}

export default function AdminHeader({ currentPage }: AdminHeaderProps) {
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include'
      });
      window.location.href = '/dcmemocontroll';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navigationItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      href: '/dcmemocontroll/dashboard'
    },
    {
      key: 'payments',
      label: 'Pagamentos',
      icon: CreditCard,
      href: '/dcmemocontroll/payments'
    },
    {
      key: 'site-settings',
      label: 'Config. Site',
      icon: Globe,
      href: '/dcmemocontroll/site-settings'
    },
    {
      key: 'game-settings',
      label: 'Config. Jogo',
      icon: Gamepad2,
      href: '/dcmemocontroll/game-settings'
    },
    {
      key: 'passwords',
      label: 'Senhas',
      icon: Key,
      href: '/dcmemocontroll/passwords'
    }
  ];

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center h-auto md:h-16 py-4 md:py-0 space-y-3 md:space-y-0">
          <div className="flex items-center">
            <Shield className="w-6 h-6 mr-3 text-blue-500" />
            <h1 className="text-xl font-bold text-gray-900">Painel Administrativo</h1>
            <Badge variant="secondary" className="ml-3">
              Admin
            </Badge>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.key;
              
              return (
                <Button
                  key={item.key}
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  onClick={() => window.location.href = item.href}
                  className="w-full sm:w-auto text-xs"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
            
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={handleLogout} 
              className="w-full sm:w-auto"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}