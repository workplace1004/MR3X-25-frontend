import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Home, Building2, Users, FileText, DollarSign, MessageSquare, Bell,
  LogOut, Menu, X, BarChart3, User, Shield, Building, Briefcase,
  UserCheck, UserCog, ShieldCheck, Settings, FileDown,
  Crown, Package, Mail, Wrench, Receipt, Key, ClipboardCheck, FileSignature,
  Code, KeyRound, Activity, Webhook, BookOpen, UserCog2,
  Award, Inbox, TrendingUp, Kanban,
  Database, GitCompare, Headphones, UserSearch
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const baseNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, perm: undefined },
  // Tenant-specific menu items (INQUILINO role only) - Dashboard shows tenant content with charts
  { name: 'Meu Contrato', href: '/dashboard/tenant-contract', icon: FileText, perm: undefined, roles: ['INQUILINO'] },
  { name: 'Meus Pagamentos', href: '/dashboard/tenant-payments', icon: DollarSign, perm: undefined, roles: ['INQUILINO'] },
  { name: 'Meu Perfil', href: '/dashboard/tenant-profile', icon: User, perm: undefined, roles: ['INQUILINO'] },
  // Broker-specific menu items (BROKER role only) - Dashboard shows broker content
  // Regular menu items for other roles
  { name: 'Imóveis', href: '/dashboard/properties', icon: Building2, perm: 'properties:read' },
  { name: 'Inquilinos', href: '/dashboard/tenants', icon: Users, perm: 'users:read' },
  { name: 'Análise de Inquilinos', href: '/dashboard/tenant-analysis', icon: UserSearch, perm: undefined },
  { name: 'Corretores', href: '/dashboard/brokers', icon: Briefcase, perm: 'users:read' },
  { name: 'Proprietários', href: '/dashboard/owners', icon: UserCog, perm: 'users:read' },
  { name: 'Diretor Agência', href: '/dashboard/agency-admin', icon: Crown, perm: undefined, roles: ['CEO', 'ADMIN'] },
  { name: 'Gerentes', href: '/dashboard/managers', icon: UserCheck, perm: 'users:read', roles: ['AGENCY_ADMIN'] },
  { name: 'Contratos', href: '/dashboard/contracts', icon: FileText, perm: 'contracts:read' },
  { name: 'Vistorias', href: '/dashboard/inspections', icon: ClipboardCheck, perm: undefined },
  { name: 'Acordos', href: '/dashboard/agreements', icon: FileSignature, perm: undefined },
  { name: 'Faturas', href: '/dashboard/invoices', icon: Receipt, perm: undefined },
  { name: 'Pagamentos', href: '/dashboard/payments', icon: DollarSign, perm: 'payments:read' },
  { name: 'Plano da Agência', href: '/dashboard/agency-plan-config', icon: Package, perm: 'agencies:update', roles: ['AGENCY_ADMIN'] },
  { name: 'Meu Plano', href: '/dashboard/owner-plan-config', icon: Package, perm: undefined, roles: ['INDEPENDENT_OWNER'] },
  { name: 'Usuários', href: '/dashboard/users', icon: Users, perm: 'users:read' },
  { name: 'Agências', href: '/dashboard/agencies', icon: Building, perm: undefined, roles: ['CEO', 'ADMIN'] },
  { name: 'Relatórios', href: '/dashboard/reports', icon: BarChart3, perm: 'reports:read' },
  { name: 'Planos', href: '/dashboard/plans', icon: Package, perm: undefined, roles: ['CEO', 'ADMIN'] },
  { name: 'Faturamento', href: '/dashboard/billing', icon: Receipt, perm: 'billing:read', roles: ['CEO', 'ADMIN', 'INDEPENDENT_OWNER'] },
  { name: 'Comunicação', href: '/dashboard/communications', icon: Mail, perm: undefined, roles: ['CEO', 'ADMIN'] },
  { name: 'Centro Técnico', href: '/dashboard/integrations', icon: Wrench, perm: 'integrations:read', roles: ['CEO', 'ADMIN', 'INDEPENDENT_OWNER'] },
  { name: 'Auditorias', href: '/dashboard/audit', icon: ShieldCheck, perm: 'audit:read', roles: ['CEO', 'ADMIN'] },
  { name: 'Documentos', href: '/dashboard/documents', icon: FileDown, perm: 'documents:read', roles: ['CEO', 'ADMIN', 'INDEPENDENT_OWNER'] },
  { name: 'Configuracoes', href: '/dashboard/settings', icon: Settings, perm: 'settings:read', roles: ['CEO', 'ADMIN', 'INDEPENDENT_OWNER'] },
  { name: 'Chat', href: '/dashboard/chat', icon: MessageSquare, perm: 'chat:read' },
  { name: 'Notificacoes', href: '/dashboard/notifications', icon: Bell, perm: 'notifications:read' },
  { name: 'Alterar Senha', href: '/dashboard/change-password', icon: Key, perm: undefined },
  // API_CLIENT specific menu items
  { name: 'API Credentials', href: '/dashboard/api-credentials', icon: KeyRound, perm: undefined, roles: ['API_CLIENT'] },
  { name: 'Access Tokens', href: '/dashboard/api-tokens', icon: Code, perm: undefined, roles: ['API_CLIENT'] },
  { name: 'API Logs', href: '/dashboard/api-logs', icon: Activity, perm: undefined, roles: ['API_CLIENT'] },
  { name: 'Webhooks', href: '/dashboard/api-webhooks', icon: Webhook, perm: undefined, roles: ['API_CLIENT'] },
  { name: 'Documentation', href: '/dashboard/api-docs', icon: BookOpen, perm: undefined, roles: ['API_CLIENT'] },
  { name: 'Account Settings', href: '/dashboard/api-settings', icon: UserCog2, perm: undefined, roles: ['API_CLIENT'] },
  // REPRESENTATIVE (Sales Rep) specific menu items
  { name: 'Prospects', href: '/dashboard/sales-prospects', icon: Building2, perm: undefined, roles: ['REPRESENTATIVE'] },
  { name: 'Propostas', href: '/dashboard/sales-proposals', icon: FileText, perm: undefined, roles: ['REPRESENTATIVE'] },
  { name: 'Pipeline', href: '/dashboard/sales-pipeline', icon: Kanban, perm: undefined, roles: ['REPRESENTATIVE'] },
  { name: 'Métricas', href: '/dashboard/sales-metrics', icon: TrendingUp, perm: undefined, roles: ['REPRESENTATIVE'] },
  { name: 'Comissões', href: '/dashboard/sales-commissions', icon: Award, perm: undefined, roles: ['REPRESENTATIVE'] },
  { name: 'Mensagens', href: '/dashboard/sales-inbox', icon: Inbox, perm: undefined, roles: ['REPRESENTATIVE'] },
  { name: 'Alterar Senha', href: '/dashboard/change-password', icon: Key, perm: undefined, roles: ['REPRESENTATIVE'] },
  // LEGAL_AUDITOR specific menu items (Read-only access)
  { name: 'Logs', href: '/dashboard/auditor-logs', icon: Activity, perm: undefined, roles: ['LEGAL_AUDITOR'] },
  { name: 'Assinaturas', href: '/dashboard/auditor-signatures', icon: FileSignature, perm: undefined, roles: ['LEGAL_AUDITOR'] },
  { name: 'Pagamentos', href: '/dashboard/auditor-payments', icon: Receipt, perm: undefined, roles: ['LEGAL_AUDITOR'] },
  { name: 'Segurança', href: '/dashboard/auditor-security', icon: Shield, perm: undefined, roles: ['LEGAL_AUDITOR'] },
  { name: 'Integridade', href: '/dashboard/auditor-integrity', icon: Database, perm: undefined, roles: ['LEGAL_AUDITOR'] },
  { name: 'Agências', href: '/dashboard/auditor-agencies', icon: Building, perm: undefined, roles: ['LEGAL_AUDITOR'] },
  { name: 'Usuários', href: '/dashboard/auditor-users', icon: Users, perm: undefined, roles: ['LEGAL_AUDITOR'] },
  { name: 'Documentos', href: '/dashboard/auditor-documents', icon: FileText, perm: undefined, roles: ['LEGAL_AUDITOR'] },
  { name: 'Ferramentas', href: '/dashboard/auditor-tools', icon: GitCompare, perm: undefined, roles: ['LEGAL_AUDITOR'] },
  { name: 'Configurações', href: '/dashboard/auditor-settings', icon: Settings, perm: undefined, roles: ['LEGAL_AUDITOR'] },
  { name: 'Alterar Senha', href: '/dashboard/change-password', icon: Key, perm: undefined, roles: ['LEGAL_AUDITOR'] },
  // PLATFORM_MANAGER specific menu items (MR3X Internal Manager)
  { name: 'Agências', href: '/dashboard/manager-agencies', icon: Building, perm: undefined, roles: ['PLATFORM_MANAGER'] },
  { name: 'Suporte', href: '/dashboard/manager-support', icon: Headphones, perm: undefined, roles: ['PLATFORM_MANAGER'] },
  { name: 'Usuários Internos', href: '/dashboard/manager-users', icon: Users, perm: undefined, roles: ['PLATFORM_MANAGER'] },
  { name: 'Logs e Integridade', href: '/dashboard/manager-logs', icon: Activity, perm: undefined, roles: ['PLATFORM_MANAGER'] },
  { name: 'Planos e Cobrança', href: '/dashboard/manager-billing', icon: Receipt, perm: undefined, roles: ['PLATFORM_MANAGER'] },
  { name: 'Configurações', href: '/dashboard/manager-settings', icon: Settings, perm: undefined, roles: ['PLATFORM_MANAGER'] },
  { name: 'Notificacoes', href: '/dashboard/notifications', icon: Bell, perm: undefined, roles: ['PLATFORM_MANAGER'] },
  { name: 'Alterar Senha', href: '/dashboard/change-password', icon: Key, perm: undefined, roles: ['PLATFORM_MANAGER'] },
];

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading, isAuthenticated, logout, hasPermission } = useAuth();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth/login');
    }
  }, [loading, isAuthenticated, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render dashboard if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const navigation = baseNavigation.filter(item => {
    // Check permission
    if (item.perm && !hasPermission(item.perm)) return false;

    // Check role-specific items
    if (item.roles && !item.roles.includes(user?.role || '')) return false;

    /**
     * Role-based menu exclusions based on MR3X Hierarchy Requirements
     */

    // CEO: Root profile - Limited menu access for governance oversight
    // Only sees: Painel, Usuários, Agências, Planos, Faturamento, Centro Técnico, Auditorias, Configuracoes, Chat, Notificacoes, Alterar Senha
    if (user?.role === 'CEO') {
      const allowedForCEO = [
        '/dashboard',              // Painel
        '/dashboard/users',        // Usuários
        '/dashboard/agencies',     // Agências
        '/dashboard/plans',        // Planos
        '/dashboard/billing',      // Faturamento
        '/dashboard/integrations', // Centro Técnico
        '/dashboard/audit',        // Auditorias
        '/dashboard/settings',     // Configuracoes
        '/dashboard/chat',         // Chat
        '/dashboard/notifications', // Notificacoes
        '/dashboard/change-password', // Alterar Senha
      ];
      if (!allowedForCEO.includes(item.href)) return false;
    }

    // ADMIN: SaaS administrator - manages agencies, internal users, integrations
    // Does NOT manage properties, contracts, payments directly
    if (user?.role === 'ADMIN') {
      const excludeForAdmin = [
        '/dashboard/properties',
        '/dashboard/contracts',
        '/dashboard/inspections',
        '/dashboard/agreements',
        '/dashboard/invoices',
        '/dashboard/payments',
        '/dashboard/brokers',
        '/dashboard/tenants',
        '/dashboard/owners',
        '/dashboard/managers',
        '/dashboard/agency-split-config',
        '/dashboard/agency-plan-config',
      ];
      if (excludeForAdmin.includes(item.href)) return false;
    }

    // AGENCY_ADMIN: Agency director - manages agency operations
    if (user?.role === 'AGENCY_ADMIN') {
      const excludeForAgencyAdmin = [
        '/dashboard/agencies', // Only CEO/ADMIN manage agencies
        '/dashboard/users', // Uses specific pages for brokers, owners, etc.
        '/dashboard/plans',
        '/dashboard/billing',
        '/dashboard/communications',
        '/dashboard/integrations',
        '/dashboard/audit',
        '/dashboard/documents',
        '/dashboard/settings',
      ];
      if (excludeForAgencyAdmin.includes(item.href)) return false;
    }

    // PLATFORM_MANAGER: MR3X Internal Manager (created by ADMIN)
    // - Works for MR3X internally
    // - Handles support, statistics, client assistance
    // - Has ZERO access to agency operations (properties, contracts, payments)
    if (user?.role === 'PLATFORM_MANAGER') {
      const allowForPlatformManager = [
        '/dashboard',                       // Manager Dashboard
        '/dashboard/manager-agencies',      // View and manage agencies
        '/dashboard/manager-support',       // Support Center
        '/dashboard/manager-users',         // Internal MR3X users (read-only)
        '/dashboard/manager-logs',          // Logs and Integrity (read-only)
        '/dashboard/manager-billing',       // Plans and Billing (read-only)
        '/dashboard/manager-settings',      // Personal Settings (limited)
        '/dashboard/notifications',         // Notifications
        '/dashboard/change-password',       // Security
      ];
      if (!allowForPlatformManager.includes(item.href)) return false;
      // Exclude general Notificacoes/Alterar Senha (show only the PLATFORM_MANAGER specific ones at end)
      if ((item.href === '/dashboard/notifications' || item.href === '/dashboard/change-password') && !item.roles?.includes('PLATFORM_MANAGER')) {
        return false;
      }
    }

    // AGENCY_MANAGER (Agency Gestor): Full agency operational permissions
    // Created ONLY by AGENCY_ADMIN (Director)
    // Works inside a real estate agency
    // Controls agency team: creates brokers, owners, contracts, properties
    if (user?.role === 'AGENCY_MANAGER') {
      const excludeForAgencyManager = [
        '/dashboard/agencies', // Only CEO/ADMIN manage agencies
        '/dashboard/users', // Uses specific pages for brokers, owners, etc.
        '/dashboard/managers', // Only AGENCY_ADMIN sees this
        '/dashboard/agency-admin',
        '/dashboard/agency-split-config', // Only AGENCY_ADMIN
        '/dashboard/agency-plan-config', // Only AGENCY_ADMIN
        '/dashboard/plans', // CEO/ADMIN only
        '/dashboard/billing', // Can only read
        '/dashboard/communications', // CEO/ADMIN only
        '/dashboard/integrations', // CEO/ADMIN only
        '/dashboard/audit', // CEO/ADMIN only
        '/dashboard/settings', // Can only read
      ];
      if (excludeForAgencyManager.includes(item.href)) return false;
    }

    // BROKER (Corretor): Property Acquisition Agent inside an Agency
    // Can: Create/edit properties, manage assigned properties, create contracts,
    //      conduct inspections, upload documents, communicate with tenants/owners
    // Cannot: Manage agency, create users, see other brokers, edit financial splits
    if (user?.role === 'BROKER') {
      const allowForBroker = [
        '/dashboard', // Main dashboard (redirects to broker dashboard)
        '/dashboard/broker-dashboard', // Broker-specific dashboard
        '/dashboard/properties', // Create/edit properties (assigned to them)
        '/dashboard/contracts', // Create/prepare contracts
        '/dashboard/inspections', // Conduct inspections
        '/dashboard/agreements', // View/sign agreements
        '/dashboard/invoices', // View invoices (read-only)
        '/dashboard/tenants', // View and interact with tenants
        '/dashboard/tenant-analysis', // Analyze prospective tenants
        '/dashboard/payments', // View payments (read-only, no financial edits)
        '/dashboard/documents', // Upload and generate documents
        '/dashboard/notifications', // Receive notifications
        '/dashboard/chat', // Communicate with tenants/owners
        '/dashboard/change-password', // Security
      ];
      // Only allow explicitly listed pages for brokers
      if (!allowForBroker.includes(item.href)) return false;
    }

    // PROPRIETARIO: Owner linked to agency - limited READ-ONLY access
    // Agency acts on behalf of PROPRIETARIO for all operations
    if (user?.role === 'PROPRIETARIO') {
      const excludeForProprietario = [
        '/dashboard/brokers',
        '/dashboard/owners',
        '/dashboard/users',
        '/dashboard/agencies',
        '/dashboard/managers',
        '/dashboard/agency-admin',
        '/dashboard/agency-split-config',
        '/dashboard/agency-plan-config',
        '/dashboard/plans',
        '/dashboard/billing',
        '/dashboard/communications',
        '/dashboard/integrations',
        '/dashboard/audit',
        '/dashboard/documents',
        '/dashboard/tenants', // Cannot manage tenants - goes through agency
        '/dashboard/tenant-analysis', // Cannot analyze tenants - agency does this
      ];
      if (excludeForProprietario.includes(item.href)) return false;
    }

    // INDEPENDENT_OWNER: Self-managed landlord who acts as a standalone mini-agency
    // - Creates their own account
    // - Manages their own properties
    // - Creates tenants
    // - Creates and signs contracts
    // - Issues invoices
    // - Tracks payments
    // - Manages inspections and documents
    if (user?.role === 'INDEPENDENT_OWNER') {
      const excludeForIndependentOwner = [
        '/dashboard/brokers', // No brokers - manages alone
        '/dashboard/owners', // No other owners - manages alone
        '/dashboard/agencies', // Not an agency - standalone
        '/dashboard/managers', // No staff management
        '/dashboard/agency-admin', // No agency admin features
        '/dashboard/agency-split-config', // No agency split config
        '/dashboard/agency-plan-config', // Uses owner-plan-config instead
        '/dashboard/users', // Uses specific pages (tenants only)
        '/dashboard/plans', // CEO/ADMIN only
        '/dashboard/communications', // CEO/ADMIN only
        '/dashboard/audit', // CEO/ADMIN only
        '/dashboard/chat', // No chat - works independently
      ];
      if (excludeForIndependentOwner.includes(item.href)) return false;
    }

    // INQUILINO: Tenant - End-User with NO operation control
    // Only shows: Dashboard (with charts and property info), Tenant-specific pages, Chat, Notifications, Change Password
    // Can: View contract, View/pay invoices, View receipts, Receive notifications, Update profile, Chat
    // Cannot: Create/edit anything, Access admin features, See other users/contracts
    if (user?.role === 'INQUILINO') {
      const allowForInquilino = [
        '/dashboard', // Main dashboard (shows tenant dashboard with charts and property info)
        '/dashboard/tenant-contract', // View their contract
        '/dashboard/tenant-payments', // View/make payments
        '/dashboard/tenant-profile', // Update their profile
        '/dashboard/chat', // Chat with agency/owner
        '/dashboard/notifications', // Receive notifications
        '/dashboard/change-password', // Security
      ];
      // Only allow explicitly listed pages for tenants
      if (!allowForInquilino.includes(item.href)) return false;
    }

    // BUILDING_MANAGER: Condominium manager - limited to common areas
    if (user?.role === 'BUILDING_MANAGER') {
      const excludeForBuildingManager = [
        '/dashboard/brokers',
        '/dashboard/owners',
        '/dashboard/tenants',
        '/dashboard/users',
        '/dashboard/agencies',
        '/dashboard/managers',
        '/dashboard/agency-admin',
        '/dashboard/agency-split-config',
        '/dashboard/agency-plan-config',
        '/dashboard/inspections',
        '/dashboard/agreements',
        '/dashboard/invoices',
        '/dashboard/plans',
        '/dashboard/billing',
        '/dashboard/communications',
        '/dashboard/integrations',
        '/dashboard/audit',
        '/dashboard/documents',
        '/dashboard/settings',
      ];
      if (excludeForBuildingManager.includes(item.href)) return false;
    }

    // LEGAL_AUDITOR: Read-only audit access to all system data
    if (user?.role === 'LEGAL_AUDITOR') {
      const allowForAuditor = [
        '/dashboard',                     // Auditor Dashboard (main page with charts)
        '/dashboard/auditor-logs',        // System Logs
        '/dashboard/auditor-signatures',  // Digital Signatures
        '/dashboard/auditor-payments',    // Payments and Splits
        '/dashboard/auditor-security',    // Security and Tokens
        '/dashboard/auditor-integrity',   // Data Integrity
        '/dashboard/auditor-agencies',    // Agencies Overview
        '/dashboard/auditor-users',       // Users Overview
        '/dashboard/auditor-documents',   // Documents
        '/dashboard/auditor-tools',       // Audit Tools
        '/dashboard/auditor-settings',    // Personal Settings
        '/dashboard/change-password',     // Change Password
      ];
      if (!allowForAuditor.includes(item.href)) return false;
      // Exclude general Alterar Senha (show only the LEGAL_AUDITOR specific one at end)
      if (item.href === '/dashboard/change-password' && !item.roles?.includes('LEGAL_AUDITOR')) {
        return false;
      }
    }

    // REPRESENTATIVE: Sales representative for MR3X platform
    // Main functions: prospect agencies, send proposals, track pipeline, view metrics, manage commissions
    if (user?.role === 'REPRESENTATIVE') {
      const allowForRepresentative = [
        '/dashboard',                    // Sales Rep Dashboard (overview, performance)
        '/dashboard/sales-prospects',    // Agencies/Prospects management
        '/dashboard/sales-proposals',    // Proposals management
        '/dashboard/sales-pipeline',     // Sales Pipeline (Kanban view)
        '/dashboard/sales-metrics',      // Metrics and KPIs
        '/dashboard/sales-commissions',  // Commissions tracking
        '/dashboard/sales-inbox',        // Internal messages/inbox
        '/dashboard/change-password',    // Change password
      ];
      if (!allowForRepresentative.includes(item.href)) return false;
      // Exclude general Alterar Senha (show only the REPRESENTATIVE specific one at end)
      if (item.href === '/dashboard/change-password' && !item.roles?.includes('REPRESENTATIVE')) {
        return false;
      }
    }

    // API_CLIENT: External integration role with API management interface
    if (user?.role === 'API_CLIENT') {
      const allowForApiClient = [
        '/dashboard',                  // API Dashboard (overview, usage stats)
        '/dashboard/api-credentials',  // API Credentials
        '/dashboard/api-tokens',       // Access Tokens
        '/dashboard/api-logs',         // API Logs
        '/dashboard/api-webhooks',     // Webhooks
        '/dashboard/api-docs',         // Documentation
        '/dashboard/api-settings',     // Account Settings
        '/dashboard/change-password',  // Change Password
      ];
      if (!allowForApiClient.includes(item.href)) return false;
    }

    return true;
  });

  return (
    <div className="bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold">MR3X</h1>
            <p className="text-xs text-muted-foreground">Gestão de Aluguéis</p>
            {user && (
              <p className="text-xs text-muted-foreground mt-1">
                {user.name || user.email}
              </p>
            )}
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:z-40
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 lg:p-6 border-b border-sidebar-border">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold">MR3X</h1>
                <p className="text-xs lg:text-sm text-muted-foreground">Gestão de Aluguéis</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Info */}
            {user && (
              <div className="mt-4 pt-4 border-t border-sidebar-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.name || user.email}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Shield className="w-3 h-3 text-muted-foreground" />
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          user.role === 'CEO' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                          user.role === 'AGENCY_ADMIN' ? 'bg-indigo-100 text-indigo-800' :
                          user.role === 'AGENCY_MANAGER' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'BROKER' ? 'bg-yellow-100 text-yellow-800' :
                        user.role === 'INDEPENDENT_OWNER' ? 'bg-emerald-100 text-emerald-800' :
                        user.role === 'PROPRIETARIO' ? 'bg-green-100 text-green-800' :
                        user.role === 'INQUILINO' ? 'bg-orange-100 text-orange-800' :
                        user.role === 'BUILDING_MANAGER' ? 'bg-cyan-100 text-cyan-800' :
                        user.role === 'LEGAL_AUDITOR' ? 'bg-gray-100 text-gray-800' :
                        user.role === 'REPRESENTATIVE' ? 'bg-pink-100 text-pink-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                          {user.role === 'CEO' ? 'CEO' :
                           user.role === 'ADMIN' ? 'Admin' :
                           user.role === 'AGENCY_ADMIN' ? 'Diretor' :
                           user.role === 'AGENCY_MANAGER' ? 'Gestor' :
                         user.role === 'BROKER' ? 'Corretor' :
                         user.role === 'INDEPENDENT_OWNER' ? 'Imóvel Indep.' :
                         user.role === 'PROPRIETARIO' ? 'Imóvel' :
                         user.role === 'INQUILINO' ? 'Inquilino' :
                         user.role === 'BUILDING_MANAGER' ? 'Síndico' :
                         user.role === 'LEGAL_AUDITOR' ? 'Auditor' :
                         user.role === 'REPRESENTATIVE' ? 'Representante' :
                         user.role || 'Usuário'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = item.href === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg transition-colors text-sm lg:text-base ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-4 h-4 lg:w-5 lg:h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-3 lg:p-4 border-t border-border">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 lg:px-4 py-2 lg:py-3 w-full text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg transition-colors text-sm lg:text-base"
            >
              <LogOut className="w-4 h-4 lg:w-5 lg:h-5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        <main className="pt-4 lg:pt-6 p-4 lg:p-8 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
