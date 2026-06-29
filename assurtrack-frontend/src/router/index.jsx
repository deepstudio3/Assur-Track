import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import Loader from '../components/ui/Loader';
import { RequireAuth, RequireRole } from './guards';

// Découpage par route : chaque page est chargée à la demande (recharts, etc.
// ne pèsent plus sur le bundle initial).
const Login = lazy(() => import('../pages/auth/Login'));
const Dashboard = lazy(() => import('../pages/dashboard/Dashboard'));
const RelanceList = lazy(() => import('../pages/relance/RelanceList'));
const RelanceForm = lazy(() => import('../pages/relance/RelanceForm'));
const RelanceCalendar = lazy(() => import('../pages/relance/RelanceCalendar'));
const Caisse = lazy(() => import('../pages/caisse/Caisse'));
const OperationForm = lazy(() => import('../pages/caisse/OperationForm'));
const HistoriqueRemb = lazy(() => import('../pages/caisse/HistoriqueRemb'));
const ClientsList = lazy(() => import('../pages/clients/ClientsList'));
const VentesList = lazy(() => import('../pages/ventes/VentesList'));
const NouvelleVente = lazy(() => import('../pages/ventes/NouvelleVente'));
const Dettes = lazy(() => import('../pages/ventes/Dettes'));
const ProduitsConfig = lazy(() => import('../pages/produits/ProduitsConfig'));
const Settings = lazy(() => import('../pages/settings/Settings'));
const NotFound = lazy(() => import('../pages/NotFound'));

function Fallback() {
  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
      <Loader center />
    </div>
  );
}

export default function AppRouter() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />

          <Route path="relance" element={<RelanceList />} />
          <Route path="relance/nouveau" element={<RelanceForm />} />
          <Route path="relance/calendrier" element={<RelanceCalendar />} />

          <Route path="clients" element={<ClientsList />} />

          <Route path="ventes" element={<VentesList />} />
          <Route path="ventes/nouvelle" element={<NouvelleVente />} />
          <Route path="ventes/dettes" element={<Dettes />} />
          <Route
            path="produits"
            element={
              <RequireRole roles={['patronne']}>
                <ProduitsConfig />
              </RequireRole>
            }
          />

          <Route path="caisse" element={<Caisse />} />
          <Route path="caisse/nouvelle-operation" element={<OperationForm />} />
          <Route
            path="caisse/historique"
            element={
              <RequireRole roles={['patronne']}>
                <HistoriqueRemb />
              </RequireRole>
            }
          />

          <Route
            path="settings"
            element={
              <RequireRole roles={['patronne']}>
                <Settings />
              </RequireRole>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
