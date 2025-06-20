import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

export const useAdminAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/admin/auth-check', {
        credentials: 'include'
      });

      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        // Redirect to admin login
        setLocation('/dcmemocontroll/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setLocation('/dcmemocontroll/login');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setIsAuthenticated(false);
      setLocation('/dcmemocontroll/login');
    } catch (error) {
      console.error('Logout failed:', error);
      setLocation('/dcmemocontroll/login');
    }
  };

  return {
    isAuthenticated,
    loading,
    logout,
    checkAuthStatus
  };
};