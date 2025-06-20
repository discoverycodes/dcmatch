import { Route, Router, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import MemoryGame from "./components/game/MemoryGame";
import AdminDashboard from "./pages/admin-dashboard";
import AdminPaymentSettings from "./pages/admin-payment-settings";
import AdminPaymentConfigSimple from "./pages/admin-payment-config-simple";
import AdminSiteSettings from "./pages/admin-site-settings";
import AdminGameSettings from "./pages/admin-game-settings";
import AdminPasswordManagement from "./pages/admin-password-management";
import AdminLoginPage from "./pages/admin-login";
import PaymentInterface from "./pages/payments";
import AffiliatesPage from "./pages/affiliates";
import LoginPage from "./pages/login";
import ForgotPasswordPage from "./pages/forgot-password";
import ResetPasswordPage from "./pages/reset-password";
import UserDashboard from "./pages/dashboard";
import SecureGamePage from "./pages/secure-game";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useTheme } from "./hooks/useTheme";
import { sessionMonitor } from "./lib/sessionMonitor";
import { useEffect } from "react";
import "@fontsource/inter";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const { theme } = useTheme();

  // Start session monitoring for logged-in users
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      sessionMonitor.startMonitoring();
    }
    
    return () => {
      sessionMonitor.stopMonitoring();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Switch>
          <Route path="/" component={() => (
            <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 dark:from-gray-800 dark:via-purple-800 dark:to-gray-800 overflow-hidden">
              <MemoryGame />
            </div>
          )} />
          <Route path="/login" component={() => <LoginPage />} />
          <Route path="/forgot-password" component={() => <ForgotPasswordPage />} />
          <Route path="/reset-password" component={() => <ResetPasswordPage />} />
          <Route path="/dashboard" component={() => 
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dcmemocontroll" component={() => <AdminLoginPage />} />
          <Route path="/dcmemocontroll/dashboard" component={() => <AdminDashboard />} />
          <Route path="/dcmemocontroll/payments" component={() => <AdminPaymentConfigSimple />} />
          <Route path="/dcmemocontroll/site-settings" component={() => <AdminSiteSettings />} />
          <Route path="/dcmemocontroll/game-settings" component={() => <AdminGameSettings />} />
          <Route path="/dcmemocontroll/passwords" component={() => <AdminPasswordManagement />} />
          <Route path="/payments" component={() => 
            <ProtectedRoute>
              <PaymentInterface />
            </ProtectedRoute>
          } />
          <Route path="/affiliates" component={() => 
            <ProtectedRoute>
              <AffiliatesPage />
            </ProtectedRoute>
          } />

        </Switch>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
