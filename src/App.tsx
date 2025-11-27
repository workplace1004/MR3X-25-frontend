import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardHome } from './pages/dashboard/DashboardHome';
import { Properties } from './pages/dashboard/Properties';
import { Contracts } from './pages/dashboard/Contracts';
import { Payments } from './pages/dashboard/Payments';
import { UsersPage } from './pages/dashboard/UsersPage';
import { UserNewPage } from './pages/dashboard/UserNewPage';
import { UserDetailPage } from './pages/dashboard/UserDetailPage';
import { UserEditPage } from './pages/dashboard/UserEditPage';
import { Tenants } from './pages/dashboard/Tenants';
import { Brokers } from './pages/dashboard/Brokers';
import { Owners } from './pages/dashboard/Owners';
import { Managers } from './pages/dashboard/Managers';
import { Agencies } from './pages/dashboard/Agencies';
import { AgencyAdmin } from './pages/dashboard/AgencyAdmin';
import { Audit } from './pages/dashboard/Audit';
import { Notifications } from './pages/dashboard/Notifications';
import { Chat } from './pages/dashboard/Chat';
import { Settings } from './pages/dashboard/Settings';
import { ChangePassword } from './pages/dashboard/ChangePassword';
import Reports from './pages/dashboard/Reports';
import Plans from './pages/dashboard/Plans';
import Billing from './pages/dashboard/Billing';
import Communications from './pages/dashboard/Communications';
import Integrations from './pages/dashboard/Integrations';
import Documents from './pages/dashboard/Documents';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Placeholder components for routes not yet fully implemented
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-muted-foreground">Esta pagina esta em desenvolvimento.</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/forgot-password" element={<PlaceholderPage title="Recuperar Senha" />} />
            <Route path="/reset-password" element={<PlaceholderPage title="Redefinir Senha" />} />
            <Route path="/terms" element={<PlaceholderPage title="Termos de Uso" />} />

            {/* Protected routes with Dashboard Layout */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="properties" element={<Properties />} />
              <Route path="properties/new" element={<PlaceholderPage title="Nova Propriedade" />} />
              <Route path="properties/:id" element={<PlaceholderPage title="Detalhes da Propriedade" />} />
              <Route path="properties/:id/edit" element={<PlaceholderPage title="Editar Propriedade" />} />

              <Route path="contracts" element={<Contracts />} />
              <Route path="contracts/new" element={<PlaceholderPage title="Novo Contrato" />} />
              <Route path="contracts/:id" element={<PlaceholderPage title="Detalhes do Contrato" />} />
              <Route path="contracts/:id/edit" element={<PlaceholderPage title="Editar Contrato" />} />

              <Route path="payments" element={<Payments />} />
              <Route path="payments/new" element={<PlaceholderPage title="Novo Pagamento" />} />
              <Route path="payments/:id" element={<PlaceholderPage title="Detalhes do Pagamento" />} />
              <Route path="payments/:id/edit" element={<PlaceholderPage title="Editar Pagamento" />} />

              <Route path="users" element={<UsersPage />} />
              <Route path="users/new" element={<UserNewPage />} />
              <Route path="users/:id" element={<UserDetailPage />} />
              <Route path="users/:id/edit" element={<UserEditPage />} />

              <Route path="tenants" element={<Tenants />} />
              <Route path="tenants/new" element={<PlaceholderPage title="Novo Inquilino" />} />
              <Route path="tenants/:id" element={<PlaceholderPage title="Detalhes do Inquilino" />} />
              <Route path="tenants/:id/edit" element={<PlaceholderPage title="Editar Inquilino" />} />

              <Route path="brokers" element={<Brokers />} />
              <Route path="brokers/new" element={<PlaceholderPage title="Novo Corretor" />} />
              <Route path="brokers/:id" element={<PlaceholderPage title="Detalhes do Corretor" />} />
              <Route path="brokers/:id/edit" element={<PlaceholderPage title="Editar Corretor" />} />

              <Route path="owners" element={<Owners />} />
              <Route path="owners/new" element={<PlaceholderPage title="Novo Proprietario" />} />
              <Route path="owners/:id" element={<PlaceholderPage title="Detalhes do Proprietario" />} />
              <Route path="owners/:id/edit" element={<PlaceholderPage title="Editar Proprietario" />} />

              <Route path="managers" element={<Managers />} />
              <Route path="agency-admin" element={<AgencyAdmin />} />
              <Route path="agency-split-config" element={<PlaceholderPage title="Split Configuration" />} />
              <Route path="agency-plan-config" element={<PlaceholderPage title="Plano da Agencia" />} />

              <Route path="agencies" element={<Agencies />} />
              <Route path="agencies/new" element={<PlaceholderPage title="Nova Agencia" />} />
              <Route path="agencies/:id" element={<PlaceholderPage title="Detalhes da Agencia" />} />
              <Route path="agencies/:id/edit" element={<PlaceholderPage title="Editar Agencia" />} />

              <Route path="reports" element={<Reports />} />
              <Route path="plans" element={<Plans />} />
              <Route path="billing" element={<Billing />} />
              <Route path="communications" element={<Communications />} />
              <Route path="integrations" element={<Integrations />} />
              <Route path="audit" element={<Audit />} />
              <Route path="documents" element={<Documents />} />
              <Route path="settings" element={<Settings />} />

              <Route path="chat" element={<Chat />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="change-password" element={<ChangePassword />} />
            </Route>

            {/* Redirect root to dashboard or login */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
