import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import AppRouter from './router';
import Loader from './components/ui/Loader';
import { useAuthStore } from './store/authStore';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

export default function App() {
  // Attend la réhydratation de la session avant de router (évite le flash /login),
  // via l'API officielle de zustand/persist.
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useAuthStore.persist.hasHydrated());
    return unsub;
  }, []);

  if (!hydrated) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Loader center label="Chargement…" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3200,
          style: {
            background: '#0A1628',
            color: '#fff',
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            fontSize: '14px',
            fontWeight: 500,
            borderRadius: '10px',
            padding: '12px 16px',
            boxShadow: '0 12px 32px rgba(10,22,40,0.28)',
          },
          success: { iconTheme: { primary: '#E89A0A', secondary: '#0A1628' } },
          error: { iconTheme: { primary: '#A32020', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}
