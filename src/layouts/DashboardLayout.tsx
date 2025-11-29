import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Home, Building2, Users, FileText, DollarSign, MessageSquare, Bell,
  LogOut, Menu, X, BarChart3, User, Shield, Building, Briefcase,
  UserCheck, Handshake, UserCog, ShieldCheck, Settings, FileDown,
  Crown, Package, Mail, Wrench, Receipt, Key
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const baseNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, perm: undefined },
  { name: 'Propriedades', href: '/dashboard/properties', icon: Building2, perm: 'properties:read' },
  { name: 'Inquilinos', href: '/dashboard/tenants', icon: Users, perm: 'users:read' },
  { name: 'Corretores', href: '/dashboard/brokers', icon: Briefcase, perm: 'users:read' },
  { name: 'Proprietários', href: '/dashboard/owners', icon: UserCog, perm: 'users:read' },
  { name: 'Diretor Agência', href: '/dashboard/agency-admin', icon: Crown, perm: undefined, roles: ['CEO', 'ADMIN'] },
  { name: 'Gerentes', href: '/dashboard/managers', icon: UserCheck, perm: 'users:read', roles: ['AGENCY_ADMIN'] },
  { name: 'Contratos', href: '/dashboard/contracts', icon: FileText, perm: 'contracts:read' },
  { name: 'Pagamentos', href: '/dashboard/payments', icon: DollarSign, perm: 'payments:read' },
  { name: 'Split Configuration', href: '/dashboard/agency-split-config', icon: Handshake, perm: 'payments:read', roles: ['AGENCY_ADMIN'] },
  { name: 'Plano da Agência', href: '/dashboard/agency-plan-config', icon: Package, perm: 'agencies:update', roles: ['AGENCY_ADMIN'] },
  { name: 'Meu Plano', href: '/dashboard/owner-plan-config', icon: Package, perm: undefined, roles: ['INDEPENDENT_OWNER'] },
  { name: 'Usuários', href: '/dashboard/users', icon: Users, perm: 'users:read' },
  { name: 'Agências', href: '/dashboard/agencies', icon: Building, perm: undefined, roles: ['CEO', 'ADMIN'] },
  { name: 'Relatórios', href: '/dashboard/reports', icon: BarChart3, perm: 'reports:read' },
  { name: 'Planos', href: '/dashboard/plans', icon: Package, perm: undefined, roles: ['CEO', 'ADMIN'] },
  { name: 'Faturamento', href: '/dashboard/billing', icon: Receipt, perm: 'billing:read', roles: ['CEO', 'ADMIN', 'INDEPENDENT_OWNER'] },
  { name: 'Comunicação', href: '/dashboard/communications', icon: Mail, perm: undefined, roles: ['CEO', 'ADMIN'] },
  { name: 'Centro Técnico', href: '/dashboard/integrations', icon: Wrench, perm: 'integrations:read', roles: ['CEO', 'ADMIN', 'INDEPENDENT_OWNER'] },
  { name: 'Auditoria', href: '/dashboard/audit', icon: ShieldCheck, perm: 'audit:read', roles: ['CEO', 'ADMIN'] },
  { name: 'Documentos', href: '/dashboard/documents', icon: FileDown, perm: 'documents:read', roles: ['CEO', 'ADMIN', 'INDEPENDENT_OWNER'] },
  { name: 'Configuracoes', href: '/dashboard/settings', icon: Settings, perm: 'settings:read', roles: ['CEO', 'ADMIN', 'INDEPENDENT_OWNER'] },
  { name: 'Chat', href: '/dashboard/chat', icon: MessageSquare, perm: 'chat:read' },
  { name: 'Notificacoes', href: '/dashboard/notifications', icon: Bell, perm: 'notifications:read' },
  { name: 'Alterar Senha', href: '/dashboard/change-password', icon: Key, perm: undefined },
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

    // CEO: Root profile - Can VIEW all pages but only EDIT specific things
    // Can only create ADMIN users (enforced in backend and UserNewPage)
    // CEO can view all menus - no exclusions for viewing
    if (user?.role === 'CEO') {
      // CEO can view everything - no menu exclusions
      // Edit restrictions are enforced at the component/backend level
    }

    // ADMIN: SaaS administrator - manages agencies, internal users, integrations
    // Does NOT manage properties, contracts, payments directly
    if (user?.role === 'ADMIN') {
      const excludeForAdmin = [
        '/dashboard/properties',
        '/dashboard/contracts',
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
      const excludeForPlatformManager = [
        '/dashboard/properties', // NO agency operations
        '/dashboard/contracts', // NO agency operations
        '/dashboard/payments', // NO agency operations
        '/dashboard/tenants', // NO agency operations
        '/dashboard/brokers', // NO agency operations
        '/dashboard/owners', // NO agency operations
        '/dashboard/users', // Cannot manage users (support role)
        '/dashboard/managers', // NO agency operations
        '/dashboard/agency-admin', // NO agency operations
        '/dashboard/agency-split-config', // NO agency operations
        '/dashboard/agency-plan-config', // NO agency operations
        '/dashboard/plans', // CEO/ADMIN only
        '/dashboard/billing', // Can only read
        '/dashboard/communications', // CEO/ADMIN only
        '/dashboard/integrations', // CEO/ADMIN only
        '/dashboard/settings', // Can only read
      ];
      if (excludeForPlatformManager.includes(item.href)) return false;
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

    // BROKER: Manages own properties/contracts only
    if (user?.role === 'BROKER') {
      const excludeForBroker = [
        '/dashboard/brokers',
        '/dashboard/owners',
        '/dashboard/users',
        '/dashboard/reports', // Limited report access
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
        '/dashboard/settings',
      ];
      if (excludeForBroker.includes(item.href)) return false;
    }

    // PROPRIETARIO: Owner linked to agency - limited access
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

    // INQUILINO: Tenant - very limited access
    if (user?.role === 'INQUILINO') {
      const excludeForInquilino = [
        '/dashboard/brokers',
        '/dashboard/owners',
        '/dashboard/tenants',
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
        '/dashboard/settings',
        '/dashboard/reports', // Limited or no report access
      ];
      if (excludeForInquilino.includes(item.href)) return false;
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

    // LEGAL_AUDITOR: Read-only audit access
    if (user?.role === 'LEGAL_AUDITOR') {
      const excludeForAuditor = [
        '/dashboard/brokers',
        '/dashboard/owners',
        '/dashboard/tenants',
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
        '/dashboard/documents',
        '/dashboard/settings',
        '/dashboard/chat', // Auditors don't chat
        '/dashboard/notifications',
      ];
      if (excludeForAuditor.includes(item.href)) return false;
    }

    // REPRESENTATIVE: Sales representative
    if (user?.role === 'REPRESENTATIVE') {
      const excludeForRepresentative = [
        '/dashboard/properties',
        '/dashboard/contracts',
        '/dashboard/payments',
        '/dashboard/brokers',
        '/dashboard/owners',
        '/dashboard/tenants',
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
        '/dashboard/notifications',
      ];
      if (excludeForRepresentative.includes(item.href)) return false;
    }

    // API_CLIENT: No web interface needed
    if (user?.role === 'API_CLIENT') {
      // API clients should not have web access - show minimal menu
      const allowForApiClient = ['/dashboard', '/dashboard/change-password'];
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
                         user.role === 'INDEPENDENT_OWNER' ? 'Proprietário Indep.' :
                         user.role === 'PROPRIETARIO' ? 'Proprietário' :
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
