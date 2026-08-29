import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './state/auth';
import { WSConnectionProvider } from './realtime/WSConnectionProvider';
import { ToastProvider } from './components/ui/Toast';
import { App } from './App';
import './index.css';

const BrowserRouterComp = BrowserRouter as unknown as React.ComponentType<{ children: React.ReactNode }>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WSConnectionProvider>
          <ToastProvider>
            <BrowserRouterComp>
              <App />
            </BrowserRouterComp>
          </ToastProvider>
        </WSConnectionProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
