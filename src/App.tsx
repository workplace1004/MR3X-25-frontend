import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ContractVerification } from './pages/public/ContractVerification';
import { ExternalSigning } from './pages/public/ExternalSigning';
import { DashboardHome } from './pages/dashboard/DashboardHome';
import { Properties } from './pages/dashboard/Properties';
import { Contracts } from './pages/dashboard/Contracts';
import { Payments } from './pages/dashboard/Payments';
import { UsersPage } from './pages/dashboard/UsersPage';
import { UserNewPage } from './pages/dashboard/UserNewPage';
import { UserDetailPage } from './pages/dashboard/UserDetailPage';
import { UserEditPage } from './pages/dashboard/UserEditPage';
import { Tenants } from './pages/dashboard/Tenants';
import { TenantAnalysis } from './pages/dashboard/TenantAnalysis';
import { Brokers } from './pages/dashboard/Brokers';
import { Owners } from './pages/dashboard/Owners';
import { Managers } from './pages/dashboard/Managers';
import { AgencyUsers } from './pages/dashboard/AgencyUsers';
import { Agencies } from './pages/dashboard/Agencies';
import { AgencyAdmin } from './pages/dashboard/AgencyAdmin';
import { AgencyPlanConfig } from './pages/dashboard/AgencyPlanConfig';
import { AgencySplitConfig } from './pages/dashboard/AgencySplitConfig';
import { OwnerPlanConfig } from './pages/dashboard/OwnerPlanConfig';
import { TenantDashboard } from './pages/dashboard/TenantDashboard';
import { TenantContract } from './pages/dashboard/TenantContract';
import { TenantPayments } from './pages/dashboard/TenantPayments';
import { TenantProfile } from './pages/dashboard/TenantProfile';
import { ExtrajudicialAcknowledgment } from './pages/dashboard/ExtrajudicialAcknowledgment';
import { BrokerDashboard } from './pages/dashboard/BrokerDashboard';
import { ApiClientDashboard } from './pages/dashboard/ApiClientDashboard';
import { ApiCredentials } from './pages/dashboard/ApiCredentials';
import { ApiTokens } from './pages/dashboard/ApiTokens';
import { ApiLogs } from './pages/dashboard/ApiLogs';
import { ApiWebhooks } from './pages/dashboard/ApiWebhooks';
import { ApiDocs } from './pages/dashboard/ApiDocs';
import { ApiSettings } from './pages/dashboard/ApiSettings';
import { SalesRepDashboard } from './pages/dashboard/SalesRepDashboard';
import { SalesProspects } from './pages/dashboard/SalesProspects';
import { SalesProposals } from './pages/dashboard/SalesProposals';
import { SalesPipeline } from './pages/dashboard/SalesPipeline';
import { SalesMetrics } from './pages/dashboard/SalesMetrics';
import { SalesCommissions } from './pages/dashboard/SalesCommissions';
import { SalesInbox } from './pages/dashboard/SalesInbox';
import {
  AuditorDashboard,
  AuditorLogs,
  AuditorSignatures,
  AuditorPayments,
  AuditorSecurity,
  AuditorDataIntegrity,
  AuditorAgencies,
  AuditorUsers,
  AuditorDocuments,
  AuditorTools,
  AuditorSettings,
} from './pages/dashboard/auditor';
import {
  ManagerDashboard,
  ManagerAgencies,
  ManagerSupportCenter,
  ManagerInternalUsers,
  ManagerLogsIntegrity,
  ManagerPlansBilling,
  ManagerIntegrations,
  ManagerTickets,
  ManagerKnowledgeBase,
  ManagerSettings,
} from './pages/dashboard/platform-manager';
import { Inspections } from './pages/dashboard/Inspections';
import ExtrajudicialNotifications from './pages/dashboard/ExtrajudicialNotifications';
import { Agreements } from './pages/dashboard/Agreements';
import { Audit } from './pages/dashboard/Audit';
import { Notifications } from './pages/dashboard/Notifications';
import { Chat } from './pages/dashboard/Chat';
import { Settings } from './pages/dashboard/Settings';
import { ChangePassword } from './pages/dashboard/ChangePassword';
import MyAccount from './pages/dashboard/MyAccount';
import Reports from './pages/dashboard/Reports';
import Plans from './pages/dashboard/Plans';
import Billing from './pages/dashboard/Billing';
import Communications from './pages/dashboard/Communications';
import Documents from './pages/dashboard/Documents';
import { CEOPayments } from './pages/dashboard/CEOPayments';
import { PricingPage } from './pages/public/PricingPage';
import { SubscriptionPage } from './pages/dashboard/SubscriptionPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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
            {}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/forgot-password" element={<PlaceholderPage title="Recuperar Senha" />} />
            <Route path="/reset-password" element={<PlaceholderPage title="Redefinir Senha" />} />
            <Route path="/terms" element={<PlaceholderPage title="Termos de Uso" />} />
            <Route path="/pricing" element={<PricingPage />} />

            {}
            <Route path="/verify" element={<ContractVerification />} />
            <Route path="/verify/:token" element={<ContractVerification />} />
            <Route path="/sign/:linkToken" element={<ExternalSigning />} />

            {}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="properties" element={<Properties />} />
              <Route path="properties/new" element={<PlaceholderPage title="Novo Imóvel" />} />
              <Route path="properties/:id" element={<PlaceholderPage title="Detalhes do Imóvel" />} />
              <Route path="properties/:id/edit" element={<PlaceholderPage title="Editar Imóvel" />} />

              <Route path="contracts" element={<Contracts />} />
              <Route path="contracts/new" element={<PlaceholderPage title="Novo Contrato" />} />
              <Route path="contracts/:id" element={<PlaceholderPage title="Detalhes do Contrato" />} />
              <Route path="contracts/:id/edit" element={<PlaceholderPage title="Editar Contrato" />} />

              <Route path="inspections" element={<Inspections />} />
              <Route path="inspections/new" element={<PlaceholderPage title="Nova Vistoria" />} />
              <Route path="inspections/:id" element={<PlaceholderPage title="Detalhes da Vistoria" />} />
              <Route path="inspections/:id/edit" element={<PlaceholderPage title="Editar Vistoria" />} />

              <Route path="agreements" element={<Agreements />} />
              <Route path="agreements/new" element={<PlaceholderPage title="Novo Acordo" />} />
              <Route path="agreements/:id" element={<PlaceholderPage title="Detalhes do Acordo" />} />
              <Route path="agreements/:id/edit" element={<PlaceholderPage title="Editar Acordo" />} />

              <Route path="extrajudicial-notifications" element={<ExtrajudicialNotifications />} />


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

              <Route path="tenant-analysis" element={<TenantAnalysis />} />

              <Route path="brokers" element={<Brokers />} />
              <Route path="brokers/new" element={<PlaceholderPage title="Novo Corretor" />} />
              <Route path="brokers/:id" element={<PlaceholderPage title="Detalhes do Corretor" />} />
              <Route path="brokers/:id/edit" element={<PlaceholderPage title="Editar Corretor" />} />

              <Route path="owners" element={<Owners />} />
              <Route path="owners/new" element={<PlaceholderPage title="Novo Imóvel" />} />
              <Route path="owners/:id" element={<PlaceholderPage title="Detalhes do Imóvel" />} />
              <Route path="owners/:id/edit" element={<PlaceholderPage title="Editar Imóvel" />} />

              <Route path="managers" element={<Managers />} />
              <Route path="agency-users" element={<AgencyUsers />} />
              <Route path="agency-admin" element={<AgencyAdmin />} />
              <Route path="agency-split-config" element={<AgencySplitConfig />} />
              <Route path="agency-plan-config" element={<AgencyPlanConfig />} />
              <Route path="owner-plan-config" element={<OwnerPlanConfig />} />

              <Route path="agencies" element={<Agencies />} />
              <Route path="agencies/new" element={<PlaceholderPage title="Nova Agencia" />} />
              <Route path="agencies/:id" element={<PlaceholderPage title="Detalhes da Agencia" />} />
              <Route path="agencies/:id/edit" element={<PlaceholderPage title="Editar Agencia" />} />

              <Route path="reports" element={<Reports />} />
              <Route path="plans" element={<Plans />} />
              <Route path="subscription" element={<SubscriptionPage />} />
              <Route path="billing" element={<Billing />} />
              <Route path="communications" element={<Communications />} />
              <Route path="audit" element={<Audit />} />
              <Route path="documents" element={<Documents />} />
              <Route path="settings" element={<Settings />} />

              <Route path="chat" element={<Chat />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="change-password" element={<ChangePassword />} />
              <Route path="my-account" element={<MyAccount />} />

              {}
              <Route path="tenant-dashboard" element={<TenantDashboard />} />
              <Route path="tenant-contract" element={<TenantContract />} />
              <Route path="tenant-payments" element={<TenantPayments />} />
              <Route path="tenant-profile" element={<TenantProfile />} />
              <Route path="extrajudicial-acknowledgment/:notificationId" element={<ExtrajudicialAcknowledgment />} />

              {}
              <Route path="broker-dashboard" element={<BrokerDashboard />} />

              {}
              <Route path="api-dashboard" element={<ApiClientDashboard />} />
              <Route path="api-credentials" element={<ApiCredentials />} />
              <Route path="api-tokens" element={<ApiTokens />} />
              <Route path="api-logs" element={<ApiLogs />} />
              <Route path="api-webhooks" element={<ApiWebhooks />} />
              <Route path="api-docs" element={<ApiDocs />} />
              <Route path="api-settings" element={<ApiSettings />} />

              {}
              <Route path="sales-dashboard" element={<SalesRepDashboard />} />
              <Route path="sales-prospects" element={<SalesProspects />} />
              <Route path="sales-proposals" element={<SalesProposals />} />
              <Route path="sales-pipeline" element={<SalesPipeline />} />
              <Route path="sales-metrics" element={<SalesMetrics />} />
              <Route path="sales-commissions" element={<SalesCommissions />} />
              <Route path="sales-inbox" element={<SalesInbox />} />

              {}
              <Route path="auditor" element={<AuditorDashboard />} />
              <Route path="auditor-logs" element={<AuditorLogs />} />
              <Route path="auditor-signatures" element={<AuditorSignatures />} />
              <Route path="auditor-payments" element={<AuditorPayments />} />
              <Route path="auditor-security" element={<AuditorSecurity />} />
              <Route path="auditor-integrity" element={<AuditorDataIntegrity />} />
              <Route path="auditor-agencies" element={<AuditorAgencies />} />
              <Route path="auditor-users" element={<AuditorUsers />} />
              <Route path="auditor-documents" element={<AuditorDocuments />} />
              <Route path="auditor-tools" element={<AuditorTools />} />
              <Route path="auditor-settings" element={<AuditorSettings />} />

              {}
              <Route path="manager-dashboard" element={<ManagerDashboard />} />
              <Route path="manager-agencies" element={<ManagerAgencies />} />
              <Route path="manager-support" element={<ManagerSupportCenter />} />
              <Route path="manager-users" element={<ManagerInternalUsers />} />
              <Route path="manager-logs" element={<ManagerLogsIntegrity />} />
              <Route path="manager-billing" element={<ManagerPlansBilling />} />
              <Route path="manager-integrations" element={<ManagerIntegrations />} />
              <Route path="manager-tickets" element={<ManagerTickets />} />
              <Route path="manager-knowledge" element={<ManagerKnowledgeBase />} />
              <Route path="manager-settings" element={<ManagerSettings />} />

              {}
              <Route path="ceo-payments" element={<CEOPayments />} />
            </Route>

            {}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
