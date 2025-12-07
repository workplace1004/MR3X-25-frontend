import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../../api';
import { formatCurrency } from '../../lib/utils';
import { Building2, Users, FileText, DollarSign, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { PlanUsageWidget } from '../../components/dashboard/PlanUsageWidget';
import { useNavigate } from 'react-router-dom';
import { TenantDashboard } from './TenantDashboard';
import { BrokerDashboard } from './BrokerDashboard';
import { ApiClientDashboard } from './ApiClientDashboard';
import { SalesRepDashboard } from './SalesRepDashboard';
import { AuditorDashboard } from './auditor';
import { ManagerDashboard } from './platform-manager';
import { AdminDashboard } from './AdminDashboard';
import { CEODashboard } from './CEODashboard';
import { IndependentOwnerDashboard } from './IndependentOwnerDashboard';
import { AgencyAdminDashboard } from './AgencyAdminDashboard';

export function DashboardHome() {
  const { hasPermission, user } = useAuth();
  const navigate = useNavigate();

  // Render INQUILINO users tenant dashboard directly
  if (user?.role === 'INQUILINO') {
    return <TenantDashboard />;
  }

  // Render BROKER users broker dashboard directly
  if (user?.role === 'BROKER') {
    return <BrokerDashboard />;
  }

  // Render API_CLIENT users API dashboard directly
  if (user?.role === 'API_CLIENT') {
    return <ApiClientDashboard />;
  }

  // Render REPRESENTATIVE users sales rep dashboard directly
  if (user?.role === 'REPRESENTATIVE') {
    return <SalesRepDashboard />;
  }

  // Render LEGAL_AUDITOR users auditor dashboard directly
  if (user?.role === 'LEGAL_AUDITOR') {
    return <AuditorDashboard />;
  }

  // Render PLATFORM_MANAGER users manager dashboard directly
  if (user?.role === 'PLATFORM_MANAGER') {
    return <ManagerDashboard />;
  }

  // Render ADMIN users admin dashboard directly
  if (user?.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  // Render CEO users CEO dashboard directly
  if (user?.role === 'CEO') {
    return <CEODashboard />;
  }

  // Render INDEPENDENT_OWNER users independent owner dashboard directly
  if (user?.role === 'INDEPENDENT_OWNER') {
    return <IndependentOwnerDashboard />;
  }

  // Render AGENCY_ADMIN users (Diretor) agency admin dashboard directly
  if (user?.role === 'AGENCY_ADMIN') {
    return <AgencyAdminDashboard />;
  }

  // Check permissions for different dashboard sections
  const canViewDashboard = hasPermission('dashboard:read');
  const canViewProperties = hasPermission('properties:read');
  const canViewContracts = hasPermission('contracts:read');
  const canViewPayments = hasPermission('payments:read');
  const canViewReports = hasPermission('reports:read');

  const isCEO = user?.role === 'CEO' || user?.role === 'ADMIN';

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', user?.id, user?.role, user?.agencyId],
    queryFn: () => dashboardAPI.getDashboard(),
    enabled: canViewDashboard,
  });

  const { data: dueDates, isLoading: dueDatesLoading } = useQuery({
    queryKey: ['due-dates', user?.id, user?.role, user?.agencyId],
    queryFn: () => dashboardAPI.getDueDates(),
    enabled: canViewDashboard && canViewPayments,
  });

  // Don't render if no permission
  if (!canViewDashboard) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view the dashboard.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const overview = dashboard?.overview || {};

  // Mock data for charts
  const defaultInadimplenciaData = [
    { month: 'Jan', inadimplencia: 12 },
    { month: 'Fev', inadimplencia: 8 },
    { month: 'Mar', inadimplencia: 15 },
    { month: 'Abr', inadimplencia: 6 },
    { month: 'Mai', inadimplencia: 10 },
    { month: 'Jun', inadimplencia: 4 },
  ];

  // Colors for pie charts
  const pieColors = ['#22c55e', '#fbbf24', '#ef4444']; // green, yellow, red

  // Revenue distribution data
  const revenueData = isCEO
    ? [
        { name: 'Recebido', value: overview.receivedRevenue ?? 0 },
        { name: 'Pendente', value: (overview.monthlyRevenue ?? 0) - (overview.receivedRevenue ?? 0) - (overview.overdueRevenue ?? 0) },
        { name: 'Vencido', value: overview.overdueRevenue ?? 0 },
      ]
    : [
        { name: 'Recebido', value: overview.receivedValue ?? 0 },
        { name: 'Pendente', value: (overview.monthlyRevenue ?? 0) - (overview.receivedValue ?? 0) - (overview.overdueValue ?? 0) },
        { name: 'Vencido', value: overview.overdueValue ?? 0 },
      ];

  // Property status data for CEO - with correct colors
  // Colors: Disponíveis (green), Ocupados (blue), Vencidos (red), Manutenção (yellow)
  const ceoPropertyStatusColors = ['#22c55e', '#3b82f6', '#ef4444', '#fbbf24'];

  // Property status data for non-CEO
  // Colors: Vagos (gray), Vencidos (red), Em dia (green), Pendentes (yellow)
  const defaultPropertyStatusColors = ['#64748b', '#ef4444', '#22c55e', '#fbbf24'];

  // Property status data
  const propertyStatusData = isCEO && dashboard?.propertyStatus
    ? [
        { name: 'Disponíveis', value: dashboard.propertyStatus.available ?? 0, color: '#22c55e' },
        { name: 'Ocupados', value: dashboard.propertyStatus.occupied ?? 0, color: '#3b82f6' },
        { name: 'Vencidos', value: dashboard.propertyStatus.overdue ?? 0, color: '#ef4444' },
        { name: 'Manutenção', value: dashboard.propertyStatus.maintenance ?? 0, color: '#fbbf24' },
      ]
    : [
        { name: 'Vagos', value: overview.vacantUnits ?? 0, color: '#64748b' },
        { name: 'Vencidos', value: overview.overdueUnits ?? 0, color: '#ef4444' },
        { name: 'Em dia', value: overview.onTimeUnits ?? 0, color: '#22c55e' },
        { name: 'Pendentes', value: overview.pendingUnits ?? 0, color: '#fbbf24' },
      ];

  // Get colors based on user role
  const propertyStatusPieColors = isCEO ? ceoPropertyStatusColors : defaultPropertyStatusColors;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAGO':
        return <span className="px-2 py-1 rounded text-white bg-green-500 text-xs">Pago</span>;
      case 'PENDENTE':
        return <span className="px-2 py-1 rounded text-white bg-yellow-500 text-xs">Pendente</span>;
      case 'EM_ATRASO':
        return <span className="px-2 py-1 rounded text-white bg-red-500 text-xs">Vencido</span>;
      default:
        return <span className="px-2 py-1 rounded bg-gray-200 text-xs">Desconhecido</span>;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">
          {isCEO ? 'Dashboard Geral' : 'Dashboard'}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {isCEO ? 'Visão geral da plataforma MR3X' : 'Visão geral do sistema'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {isCEO ? (
          <>
            <StatCard title="Agências Ativas" value={overview.totalAgencies || 0} icon={Building2} color="blue" />
            <StatCard title="Usuários Registrados" value={overview.totalUsers || 0} icon={Users} color="green" />
            <StatCard title="Total de Imóveis" value={overview.totalProperties || 0} icon={Building2} color="purple" />
            <StatCard title="Contratos Ativos" value={overview.activeContracts || 0} icon={FileText} color="orange" />
          </>
        ) : (
          <>
            {canViewProperties && (
              <StatCard title="Total de Imóveis" value={overview.totalProperties || 0} icon={Building2} color="blue" />
            )}
            {canViewProperties && (
              <StatCard title="Imóveis Ocupados" value={overview.occupiedProperties || 0} icon={Users} color="green" />
            )}
            {canViewContracts && (
              <StatCard title="Contratos Ativos" value={overview.activeContracts || 0} icon={FileText} color="purple" />
            )}
            {canViewPayments && (
              <StatCard title="Receita Mensal" value={formatCurrency(overview.monthlyRevenue || 0)} icon={DollarSign} color="yellow" isAmount />
            )}
          </>
        )}
      </div>

      {/* CEO-Specific Additional KPIs */}
      {isCEO && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard title="Receita Mensal Total" value={formatCurrency(overview.monthlyRevenue || 0)} icon={DollarSign} color="green" isAmount />
          <StatCard title="Taxa MR3X (2%)" value={formatCurrency(overview.platformFee || 0)} icon={DollarSign} color="yellow" isAmount />
          <StatCard title="Inadimplência" value={`${overview.defaultRate || 0}%`} icon={AlertCircle} color={overview.defaultRate > 10 ? 'red' : overview.defaultRate > 5 ? 'yellow' : 'green'} />
          <StatCard title="Pagamentos Vencidos" value={overview.overdueCount || 0} icon={AlertCircle} color="red" />
        </div>
      )}

      {/* Plan Usage Widget for Agency Users */}
      {!isCEO && user?.agencyId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PlanUsageWidget
            agencyId={user.agencyId}
            onUpgradeClick={() => navigate('/dashboard/plans')}
          />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Distribution Pie Chart */}
        {canViewPayments && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Distribuição da Receita Mensal</CardTitle>
              <CardDescription className="text-sm sm:text-base">Recebido, Pendente e Vencido</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full" style={{ width: '100%', height: '320px', minHeight: '256px', position: 'relative' }}>
                {revenueData && revenueData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={320} debounce={50}>
                    <PieChart>
                      <Pie
                        data={revenueData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(props: any) => props.value > 0 ? `${props.name}: ${formatCurrency(props.value)}` : ''}
                      >
                        {revenueData.map((_, index) => (
                          <Cell key={`cell-revenue-${index}`} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Nenhum dado disponível</p>
                  </div>
                )}
              </div>
              <div className="text-center mt-2 font-semibold text-sm sm:text-base">
                Receita Mensal Total: {formatCurrency(overview.monthlyRevenue ?? 0)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Property Status Pie Chart */}
        {canViewProperties && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Status dos Imóveis</CardTitle>
              <CardDescription className="text-sm sm:text-base">Distribuição dos imóveis por status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full" style={{ width: '100%', height: '320px', minHeight: '256px', position: 'relative' }}>
                {propertyStatusData && propertyStatusData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={320} debounce={50}>
                    <PieChart>
                      <Pie
                        data={propertyStatusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(props: any) => props.value > 0 ? `${props.name}: ${props.value}` : ''}
                        labelLine={false}
                      >
                        {propertyStatusData.map((entry: any, index) => (
                          <Cell key={`cell-status-${index}`} fill={entry.color || propertyStatusPieColors[index % propertyStatusPieColors.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip formatter={(value: number) => `${value} imóveis`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Nenhum dado disponível</p>
                  </div>
                )}
              </div>
              <div className="text-center mt-2 font-semibold text-sm sm:text-base">
                Total de imóveis: {overview.totalProperties ?? 0}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Due Dates and Inadimplencia Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Due Dates Table */}
        {canViewPayments && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Agenda de vencimentos por imóvel</CardTitle>
              <CardDescription className="text-sm sm:text-base">Próximos vencimentos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left font-semibold p-2">Imóvel</th>
                      <th className="text-left font-semibold p-2">Inquilino</th>
                      {isCEO && <th className="text-left font-semibold p-2">Agência</th>}
                      <th className="text-left font-semibold p-2">Próximo vencimento</th>
                      <th className="text-left font-semibold p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dueDatesLoading ? (
                      <tr>
                        <td colSpan={isCEO ? 5 : 4} className="text-center text-muted-foreground py-4">
                          Carregando...
                        </td>
                      </tr>
                    ) : !dueDates || dueDates.length === 0 ? (
                      <tr>
                        <td colSpan={isCEO ? 5 : 4} className="text-center text-muted-foreground py-4">
                          Nenhum vencimento encontrado.
                        </td>
                      </tr>
                    ) : (
                      dueDates.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="p-2">{item.propertyName || item.name || '-'}</td>
                          <td className="p-2">{item.tenant?.name || item.tenant || '-'}</td>
                          {isCEO && <td className="p-2">{item.agency?.name || '-'}</td>}
                          <td className="p-2">{item.nextDueDate || item.dueDate ? new Date(item.nextDueDate || item.dueDate).toLocaleDateString('pt-BR') : '-'}</td>
                          <td className="p-2">{getStatusBadge(item.status === 'overdue' ? 'EM_ATRASO' : item.status === 'upcoming' ? 'PENDENTE' : item.status === 'ok' ? 'PAGO' : item.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inadimplencia Chart */}
        {canViewReports && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Gráfico de inadimplência</CardTitle>
              <CardDescription className="text-sm sm:text-base">Histórico de inadimplência</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full" style={{ width: '100%', height: '320px', minHeight: '256px', position: 'relative' }}>
                {defaultInadimplenciaData && defaultInadimplenciaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320} debounce={50}>
                    <BarChart data={defaultInadimplenciaData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="inadimplencia" fill="#fd8431" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Nenhum dado disponível</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pending Payments */}
      {canViewPayments && dashboard?.pendingPayments && dashboard.pendingPayments.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <h2 className="text-xl font-semibold">Pagamentos Pendentes</h2>
            <span className="ml-auto bg-destructive/10 text-destructive px-3 py-1 rounded-full text-sm">
              {dashboard.pendingPayments.length}
            </span>
          </div>
          <div className="space-y-3">
            {dashboard.pendingPayments.slice(0, 5).map((payment: any) => (
              <div
                key={payment.contractId}
                className="flex items-center justify-between p-4 bg-background rounded-lg"
              >
                <div>
                  <p className="font-medium">{payment.property?.name || payment.property?.address}</p>
                  <p className="text-sm text-muted-foreground">
                    {payment.tenant?.name}
                    {isCEO && payment.agency?.name && ` • ${payment.agency.name}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-destructive">
                    {formatCurrency(Number(payment.monthlyRent))}
                  </p>
                  {payment.daysOverdue && (
                    <p className="text-sm text-muted-foreground">
                      {payment.daysOverdue} dias em atraso
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Payments */}
      {canViewPayments && dashboard?.recentPayments && dashboard.recentPayments.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Pagamentos Recentes</h2>
          <div className="space-y-3">
            {dashboard.recentPayments.slice(0, 5).map((payment: any) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 bg-background rounded-lg"
              >
                <div>
                  <p className="font-medium">{payment.property?.name || payment.property?.address}</p>
                  <p className="text-sm text-muted-foreground">
                    {payment.tenant?.name} • {new Date(payment.date).toLocaleDateString('pt-BR')}
                    {isCEO && payment.agency?.name && ` • ${payment.agency.name}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-500">
                    {formatCurrency(Number(payment.amount))}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {payment.type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Agencies (CEO only) */}
      {isCEO && dashboard?.topAgencies && dashboard.topAgencies.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Principais Agências</h2>
          <div className="space-y-3">
            {dashboard.topAgencies.map((agency: any) => (
              <div
                key={agency.id}
                className="flex items-center justify-between p-4 bg-background rounded-lg"
              >
                <div>
                  <p className="font-medium">{agency.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Plano: {agency.plan}
                  </p>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-semibold">{agency.propertyCount}</p>
                    <p className="text-muted-foreground">Imóveis</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{agency.userCount}</p>
                    <p className="text-muted-foreground">Usuários</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{agency.contractCount}</p>
                    <p className="text-muted-foreground">Contratos</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  isAmount = false,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  isAmount?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
    orange: 'bg-orange-500/10 text-orange-500',
    red: 'bg-red-500/10 text-red-500',
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <h3 className="text-sm text-muted-foreground mb-1">{title}</h3>
      <p className="text-2xl font-bold">
        {isAmount ? value : typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
