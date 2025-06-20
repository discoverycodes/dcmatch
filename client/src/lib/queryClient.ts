import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { toast } from "sonner";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Check for concurrent login error
    if (res.status === 401) {
      try {
        const errorData = JSON.parse(text);
        if (errorData.code === 'CONCURRENT_LOGIN' || errorData.code === 'SESSION_EXPIRED') {
          // Clear local storage
          localStorage.removeItem('user');
          sessionStorage.clear();
          
          // Show elegant notification
          toast.error('Sessão Encerrada', {
            description: 'Sua sessão foi encerrada porque você fez login em outro dispositivo.',
            duration: 4000,
            action: {
              label: 'Fazer Login',
              onClick: () => window.location.href = '/login'
            }
          });
          
          // Redirect after short delay
          setTimeout(() => {
            window.location.href = '/login?message=session_expired';
          }, 2000);
          return;
        }
      } catch (e) {
        // Not JSON, continue with normal error handling
      }
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
