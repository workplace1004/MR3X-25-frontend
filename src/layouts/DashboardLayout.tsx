import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Home, Building2, Users, FileText, DollarSign, MessageSquare, Bell,
  LogOut, Menu, X, BarChart3, User, Shield, Building, Briefcase,
  UserCheck, UserCog, ShieldCheck, Settings, FileDown,
  Crown, Package, Mail, Wrench, Receipt, Key, ClipboardCheck, FileSignature,
  Code, KeyRound, Activity, Webhook, BookOpen, UserCog2,
  Award, Inbox, TrendingUp, Kanban,
  Database, GitCompare, Headphones, UserSearch, Gavel
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { chatAPI, notificationsAPI, extrajudicialNotificationsAPI } from '../api';

const baseNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, perm: undefined },
  { name: 'Pagamentos Plataforma', href: '/dashboard/ceo-payments', icon: DollarSign, perm: undefined, roles: ['CEO'] },

  { name: 'Meu Contrato', href: '/dashboard/tenant-contract', icon: FileText, perm: undefined, roles: ['INQUILINO'] },
  { name: 'Meus Pagamentos', href: '/dashboard/tenant-payments', icon: DollarSign, perm: undefined, roles: ['INQUILINO'] },
  
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
  { name: 'Notificação extrajudicial', href: '/dashboard/extrajudicial-notifications', icon: Gavel, perm: undefined },
  { name: 'Faturas', href: '/dashboard/invoices', icon: Receipt, perm: undefined },
  { name: 'Pagamentos', href: '/dashboard/payments', icon: DollarSign, perm: 'payments:read' },
  { name: 'Plano da Agência', href: '/dashboard/agency-plan-config', icon: Package, perm: 'agencies:update', roles: ['AGENCY_ADMIN'] },
  { name: 'Meu Plano', href: '/dashboard/owner-plan-config', icon: Package, perm: undefined, roles: ['INDEPENDENT_OWNER'] },
  { name: 'Usuários', href: '/dashboard/users', icon: Users, perm: 'users:read' },
  { name: 'Agências', href: '/dashboard/agencies', icon: Building, perm: undefined, roles: ['CEO', 'ADMIN'] },
  { name: 'Relatórios', href: '/dashboard/reports', icon: BarChart3, perm: 'reports:read' },
  { name: 'Planos', href: '/dashboard/plans', icon: Package, perm: undefined, roles: ['CEO', 'ADMIN'] },
  { name: 'Faturamento', href: '/dashboard/billing', icon: Receipt, perm: 'billing:read', roles: ['CEO', 'ADMIN', 'INDEPENDENT_OWNER'] },
  { name: 'Comunicação', href: '/dashboard/communications', icon: Mail, perm: undefined, roles: ['CEO'] },
  { name: 'Centro Técnico', href: '/dashboard/integrations', icon: Wrench, perm: 'integrations:read', roles: ['CEO', 'ADMIN', 'INDEPENDENT_OWNER'] },
  { name: 'Auditorias', href: '/dashboard/audit', icon: ShieldCheck, perm: 'audit:read', roles: ['CEO', 'ADMIN'] },
  { name: 'Documentos', href: '/dashboard/documents', icon: FileDown, perm: 'documents:read', roles: ['CEO', 'ADMIN', 'INDEPENDENT_OWNER'] },
  { name: 'Configuracoes', href: '/dashboard/settings', icon: Settings, perm: 'settings:read', roles: ['CEO', 'ADMIN', 'INDEPENDENT_OWNER'] },
  { name: 'Chat', href: '/dashboard/chat', icon: MessageSquare, perm: 'chat:read' },
  { name: 'Notificacoes', href: '/dashboard/notifications', icon: Bell, perm: 'notifications:read' },
  { name: 'Alterar Senha', href: '/dashboard/change-password', icon: Key, perm: undefined },
  
  { name: 'API Credentials', href: '/dashboard/api-credentials', icon: KeyRound, perm: undefined, roles: ['API_CLIENT'] },
  { name: 'Access Tokens', href: '/dashboard/api-tokens', icon: Code, perm: undefined, roles: ['API_CLIENT'] },
  { name: 'API Logs', href: '/dashboard/api-logs', icon: Activity, perm: undefined, roles: ['API_CLIENT'] },
  { name: 'Webhooks', href: '/dashboard/api-webhooks', icon: Webhook, perm: undefined, roles: ['API_CLIENT'] },
  { name: 'Documentation', href: '/dashboard/api-docs', icon: BookOpen, perm: undefined, roles: ['API_CLIENT'] },
  { name: 'Account Settings', href: '/dashboard/api-settings', icon: UserCog2, perm: undefined, roles: ['API_CLIENT'] },
  
  { name: 'Prospects', href: '/dashboard/sales-prospects', icon: Building2, perm: undefined, roles: ['REPRESENTATIVE'] },
  { name: 'Propostas', href: '/dashboard/sales-proposals', icon: FileText, perm: undefined, roles: ['REPRESENTATIVE'] },
  { name: 'Pipeline', href: '/dashboard/sales-pipeline', icon: Kanban, perm: undefined, roles: ['REPRESENTATIVE'] },
  { name: 'Métricas', href: '/dashboard/sales-metrics', icon: TrendingUp, perm: undefined, roles: ['REPRESENTATIVE'] },
  { name: 'Comissões', href: '/dashboard/sales-commissions', icon: Award, perm: undefined, roles: ['REPRESENTATIVE'] },
  { name: 'Mensagens', href: '/dashboard/sales-inbox', icon: Inbox, perm: undefined, roles: ['REPRESENTATIVE'] },
  { name: 'Alterar Senha', href: '/dashboard/change-password', icon: Key, perm: undefined, roles: ['REPRESENTATIVE'] },
  
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

  // Fetch unread chat count
  const { data: chatsData } = useQuery({
    queryKey: ['chats-unread'],
    queryFn: () => chatAPI.getChats(),
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch unread notifications count
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsAPI.getNotifications(),
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch pending extrajudicial notifications for INQUILINO
  const { data: extrajudicialData } = useQuery({
    queryKey: ['extrajudicial-unread'],
    queryFn: () => extrajudicialNotificationsAPI.getNotifications({}),
    enabled: isAuthenticated && user?.role === 'INQUILINO',
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate unread counts
  const unreadChatsCount = Array.isArray(chatsData)
    ? chatsData.reduce((sum: number, chat: any) => sum + (chat.unreadCount || 0), 0)
    : 0;

  const unreadNotificationsCount = Array.isArray(notificationsData)
    ? notificationsData.filter((n: any) => !n.read).length
    : (notificationsData?.data ? notificationsData.data.filter((n: any) => !n.read).length : 0);

  // Calculate pending extrajudicial notifications (sent/viewed but not signed by debtor)
  const pendingExtrajudicialCount = (() => {
    const notifications = extrajudicialData?.data || [];
    return notifications.filter((n: any) =>
      ['ENVIADO', 'VISUALIZADO'].includes(n.status) &&
      n.userRole === 'DEBTOR' &&
      !n.debtorSignedAt
    ).length;
  })();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth/login');
    }
  }, [loading, isAuthenticated, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const navigation = baseNavigation.filter(item => {
    
    if (item.perm && !hasPermission(item.perm)) return false;

    if (item.roles && !item.roles.includes(user?.role || '')) return false;

    if (user?.role === 'CEO') {
      const allowedForCEO = [
        '/dashboard',
        '/dashboard/ceo-payments',
        '/dashboard/users',
        '/dashboard/agencies',
        '/dashboard/plans',
        '/dashboard/billing',
        '/dashboard/integrations',
        '/dashboard/audit',
        '/dashboard/settings',
        '/dashboard/chat',
        '/dashboard/notifications',
        '/dashboard/change-password',
      ];
      if (!allowedForCEO.includes(item.href)) return false;
    }

    if (user?.role === 'ADMIN') {
      const excludeForAdmin = [
        '/dashboard/properties',
        '/dashboard/contracts',
        '/dashboard/inspections',
        '/dashboard/agreements',
        '/dashboard/extrajudicial-notifications',
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

    if (user?.role === 'AGENCY_ADMIN') {
      const excludeForAgencyAdmin = [
        '/dashboard/agencies', 
        '/dashboard/users', 
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

    if (user?.role === 'PLATFORM_MANAGER') {
      const allowForPlatformManager = [
        '/dashboard',                       
        '/dashboard/manager-agencies',      
        '/dashboard/manager-support',       
        '/dashboard/manager-users',         
        '/dashboard/manager-logs',          
        '/dashboard/manager-billing',       
        '/dashboard/manager-settings',      
        '/dashboard/notifications',         
        '/dashboard/change-password',       
      ];
      if (!allowForPlatformManager.includes(item.href)) return false;
      
      if ((item.href === '/dashboard/notifications' || item.href === '/dashboard/change-password') && !item.roles?.includes('PLATFORM_MANAGER')) {
        return false;
      }
    }

    if (user?.role === 'AGENCY_MANAGER') {
      const excludeForAgencyManager = [
        '/dashboard/agencies', 
        '/dashboard/users', 
        '/dashboard/managers', 
        '/dashboard/agency-admin',
        '/dashboard/agency-split-config', 
        '/dashboard/agency-plan-config', 
        '/dashboard/plans', 
        '/dashboard/billing', 
        '/dashboard/communications', 
        '/dashboard/integrations', 
        '/dashboard/audit', 
        '/dashboard/settings', 
      ];
      if (excludeForAgencyManager.includes(item.href)) return false;
    }

    if (user?.role === 'BROKER') {
      const allowForBroker = [
        '/dashboard',
        '/dashboard/broker-dashboard',
        '/dashboard/properties',
        '/dashboard/contracts',
        '/dashboard/inspections',
        '/dashboard/agreements',
        '/dashboard/extrajudicial-notifications',
        '/dashboard/invoices',
        '/dashboard/tenants',
        '/dashboard/tenant-analysis',
        '/dashboard/payments',
        '/dashboard/documents',
        '/dashboard/notifications',
        '/dashboard/chat',
        '/dashboard/change-password',
      ];
      
      if (!allowForBroker.includes(item.href)) return false;
    }

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
        '/dashboard/tenants', 
        '/dashboard/tenant-analysis', 
      ];
      if (excludeForProprietario.includes(item.href)) return false;
    }

    if (user?.role === 'INDEPENDENT_OWNER') {
      const excludeForIndependentOwner = [
        '/dashboard/brokers', 
        '/dashboard/owners', 
        '/dashboard/agencies', 
        '/dashboard/managers', 
        '/dashboard/agency-admin', 
        '/dashboard/agency-split-config', 
        '/dashboard/agency-plan-config', 
        '/dashboard/users', 
        '/dashboard/plans', 
        '/dashboard/communications', 
        '/dashboard/audit', 
        '/dashboard/chat', 
      ];
      if (excludeForIndependentOwner.includes(item.href)) return false;
    }

    if (user?.role === 'INQUILINO') {
      const allowForInquilino = [
        '/dashboard',
        '/dashboard/tenant-contract',
        '/dashboard/tenant-payments',
        '/dashboard/extrajudicial-notifications',
        '/dashboard/chat',
        '/dashboard/notifications',
        '/dashboard/change-password',
      ];

      if (!allowForInquilino.includes(item.href)) return false;
    }

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
        '/dashboard/extrajudicial-notifications',
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

    if (user?.role === 'LEGAL_AUDITOR') {
      const allowForAuditor = [
        '/dashboard',
        '/dashboard/auditor-logs',
        '/dashboard/auditor-signatures',
        '/dashboard/auditor-payments',
        '/dashboard/auditor-security',
        '/dashboard/auditor-integrity',
        '/dashboard/auditor-agencies',
        '/dashboard/auditor-users',
        '/dashboard/auditor-documents',
        '/dashboard/auditor-tools',
        '/dashboard/auditor-settings',
        '/dashboard/extrajudicial-notifications',
        '/dashboard/change-password',
      ];
      if (!allowForAuditor.includes(item.href)) return false;
      
      if (item.href === '/dashboard/change-password' && !item.roles?.includes('LEGAL_AUDITOR')) {
        return false;
      }
    }

    if (user?.role === 'REPRESENTATIVE') {
      const allowForRepresentative = [
        '/dashboard',                    
        '/dashboard/sales-prospects',    
        '/dashboard/sales-proposals',    
        '/dashboard/sales-pipeline',     
        '/dashboard/sales-metrics',      
        '/dashboard/sales-commissions',  
        '/dashboard/sales-inbox',        
        '/dashboard/change-password',    
      ];
      if (!allowForRepresentative.includes(item.href)) return false;
      
      if (item.href === '/dashboard/change-password' && !item.roles?.includes('REPRESENTATIVE')) {
        return false;
      }
    }

    if (user?.role === 'API_CLIENT') {
      const allowForApiClient = [
        '/dashboard',                  
        '/dashboard/api-credentials',  
        '/dashboard/api-tokens',       
        '/dashboard/api-logs',         
        '/dashboard/api-webhooks',     
        '/dashboard/api-docs',         
        '/dashboard/api-settings',     
        '/dashboard/change-password',  
      ];
      if (!allowForApiClient.includes(item.href)) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {}
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

      {}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:z-40
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {}
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

            {}
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
                          {user.role || 'Usuário'}
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

              // Determine badge count for this item
              let badgeCount = 0;
              if (item.href === '/dashboard/chat') {
                badgeCount = unreadChatsCount;
              } else if (item.href === '/dashboard/notifications') {
                badgeCount = unreadNotificationsCount;
              } else if (item.href === '/dashboard/extrajudicial-notifications' && user?.role === 'INQUILINO') {
                badgeCount = pendingExtrajudicialCount;
              }

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
                  <div className="relative">
                    <item.icon className="w-4 h-4 lg:w-5 lg:h-5" />
                  </div>
                  <span className="flex-1">{item.name}</span>
                  {badgeCount > 0 && (
                    <span className={`min-w-[20px] h-[20px] flex items-center justify-center text-[11px] font-bold rounded-full px-1 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {}
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

      {}
      <div className="lg:pl-64 min-h-screen">
        <main className="min-h-screen pt-4 lg:pt-6 p-4 lg:p-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
