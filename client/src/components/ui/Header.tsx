import { useState, useEffect } from 'react';
import { Button } from './button';
import { Play, LogOut, Wallet, Users, Home } from 'lucide-react';
import { toast } from 'sonner';
import { useSiteSettings } from '../../hooks/useSiteSettings';

interface HeaderProps {
  currentPage?: 'dashboard' | 'payments' | 'affiliates';
}

export default function Header({ currentPage }: HeaderProps) {
  const { settings } = useSiteSettings();
  const [user, setUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState(0);

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

  if (!user) {
    return null; // Don't render header if user is not loaded
  }

  return (
    <div className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {settings?.logoLight ? (
              <img 
                src={settings.logoLight} 
                alt="Logo" 
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-white">
                  {settings?.siteName?.charAt(0)?.toUpperCase() || 'M'}
                </span>
              </div>
            )}
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              variant="outline"
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-purple-500 to-blue-500"
            >
              <Play className="w-4 h-4 mr-2" />
              Jogar
            </Button>
            
            {currentPage !== 'payments' && (
              <Button 
                onClick={() => window.location.href = '/payments'}
                variant="outline"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Carteira
              </Button>
            )}
            
            {currentPage !== 'affiliates' && (
              <Button 
                onClick={() => window.location.href = '/affiliates'}
                variant="outline"
              >
                <Users className="w-4 h-4 mr-2" />
                Afiliados
              </Button>
            )}
            
            <Button 
              onClick={handleLogout}
              variant="outline"
              size="sm"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          {/* Mobile Actions */}
          <div className="flex lg:hidden items-center space-x-2">
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              size="sm"
              variant="outline"
            >
              <Home className="w-4 h-4" />
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/'}
              size="sm"
              className="bg-gradient-to-r from-purple-500 to-blue-500"
            >
              <Play className="w-4 h-4" />
            </Button>
            
            {currentPage !== 'payments' && (
              <Button 
                onClick={() => window.location.href = '/payments'}
                variant="outline"
                size="sm"
              >
                <Wallet className="w-4 h-4" />
              </Button>
            )}
            
            {currentPage !== 'affiliates' && (
              <Button 
                onClick={() => window.location.href = '/affiliates'}
                variant="outline"
                size="sm"
              >
                <Users className="w-4 h-4" />
              </Button>
            )}
            
            <Button 
              onClick={handleLogout}
              variant="outline"
              size="sm"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}