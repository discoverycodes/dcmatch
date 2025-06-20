import { useState, useEffect } from 'react';

interface AdminAuthState {
  isAuthenticated: boolean;
  loading: boolean;
}

export const useAdminAuth = (): AdminAuthState => {
  const [state, setState] = useState<AdminAuthState>({
    isAuthenticated: false,
    loading: true
  });

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const response = await fetch('/api/admin/verify', {
          credentials: 'include'
        });

        if (response.ok) {
          setState({ isAuthenticated: true, loading: false });
        } else {
          // Redirect to login if not authenticated
          window.location.href = '/login';
          setState({ isAuthenticated: false, loading: false });
        }
      } catch (error) {
        console.error('Admin auth check failed:', error);
        window.location.href = '/login';
        setState({ isAuthenticated: false, loading: false });
      }
    };

    checkAdminAuth();
  }, []);

  return state;
};