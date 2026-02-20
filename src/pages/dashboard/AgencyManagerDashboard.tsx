import { useQuery } from '@tanstack/react-query';
import { dashboardAPI, contractsAPI } from '../../api';
import { formatCurrency } from '../../lib/utils';
import {
  Building2,
  Users,
  FileText,
  DollarSign,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Home,
  PieChart as PieChartIcon,
  Clock,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { PageHeader } from '../../components/PageHeader';

function KPICard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  trendLabel,
  onClick,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'orange' | 'red' | 'cyan' | 'pink';
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  onClick?: () => void;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
    orange: 'bg-orange-500/10 text-orange-500',
    red: 'bg-red-500/10 text-red-500',
    cyan: 'bg-cyan-500/10 text-cyan-500',
    pink: 'bg-pink-500/10 text-pink-500',
  };

  return (
    <Card className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} onClick={onClick}>
      <CardContent className="p-3 sm:p-6">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div className={`p-2 sm:p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs sm:text-sm ${
              trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
            }`}>
              {trend === 'up' ? <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> : trend === 'down' ? <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" /> : null}
              <span className="hidden sm:inline">{trendLabel}</span>
              <span className="sm:hidden">{trendLabel?.replace('ocupação', 'ocup.').replace('Sem atrasos', 'OK')}</span>
            </div>
          )}
        </div>
        <h3 className="text-xs sm:text-sm text-muted-foreground mb-1">{title}</h3>
        <p className="text-lg sm:text-2xl font-bold truncate">{value}</p>
      </CardContent>
    </Card>
  );
}

const COLORS = {
  green: '#22c55e',
  blue: '#3b82f6',
  yellow: '#fbbf24',
  red: '#ef4444',
  purple: '#8b5cf6',
  orange: '#f97316',
  cyan: '#06b6d4',
  gray: '#64748b',
};

export function AgencyManagerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', 'agency-manager', user?.id, user?.agencyId],
    queryFn: () => dashboardAPI.getDashboard(),
  });

  const { data: dueDates, isLoading: dueDatesLoading } = useQuery({
    queryKey: ['due-dates', 'agency-manager', user?.id, user?.agencyId],
    queryFn: () => dashboardAPI.getDueDates(),
  });

  const { data: contracts } = useQuery({
    queryKey: ['contracts', 'agency-manager', user?.id, user?.agencyId],
    queryFn: () => contractsAPI.getContracts(),
  });


  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* KPI Row Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg" />
                  <Skeleton className="w-16 h-4" />
                </div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-36" />
              </CardHeader>
              <CardContent>
                <Skeleton className="w-full h-[220px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const overview = dashboard?.overview || {};
  const totalProperties = overview.totalProperties || 0;
  const occupiedProperties = overview.occupiedProperties || 0;
  const availableProperties = overview.vacantUnits || overview.availableProperties || 0;
  const activeContracts = overview.activeContracts || 0;
  const tenantCount = overview.tenantCount || 0;
  const totalIncome = overview.totalIncome || overview.monthlyRevenue || 0;
  const roleSpecificIncome = overview.roleSpecificIncome || overview.monthlyRevenue || 0;
  const monthlyRevenue = roleSpecificIncome; // For backward compatibility
  const receivedValue = overview.receivedValue || roleSpecificIncome || 0;
  const overdueValue = overview.overdueValue || 0;
  const overdueCount = overview.overdueCount || 0;
  const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0;

  const revenueData = [
    { name: 'Recebido', value: receivedValue, color: COLORS.green },
    { name: 'Pendente', value: Math.max(0, monthlyRevenue - receivedValue - overdueValue), color: COLORS.yellow },
    { name: 'Vencido', value: overdueValue, color: COLORS.red },
  ].filter(item => item.value > 0);

  // Calculate all property statuses to ensure total matches
  const overdueUnits = overview.overdueUnits || 0;
  const maintenanceProperties = overview.maintenanceProperties || 0;
  const pendingUnits = overview.pendingUnits || 0;
  const onTimeUnits = overview.onTimeUnits || 0;
  
  // Calculate accounted properties
  const accountedProperties = occupiedProperties + availableProperties + overdueUnits + maintenanceProperties + pendingUnits + onTimeUnits;
  
  // If there's a discrepancy, add an "Outros" category
  const otherProperties = Math.max(0, totalProperties - accountedProperties);
  
  const propertyStatusData = [
    { name: 'Ocupados', value: occupiedProperties, color: COLORS.blue },
    { name: 'Disponíveis', value: availableProperties, color: COLORS.green },
    { name: 'Em atraso', value: overdueUnits, color: COLORS.red },
    { name: 'Em dia', value: onTimeUnits, color: COLORS.cyan },
    { name: 'Pendente', value: pendingUnits, color: COLORS.orange },
    { name: 'Manutenção', value: maintenanceProperties, color: COLORS.yellow },
    ...(otherProperties > 0 ? [{ name: 'Outros', value: otherProperties, color: COLORS.gray }] : []),
  ].filter(item => item.value > 0);

  // Calculate contract status from actual contracts data
  const contractStatusData = (() => {
    if (!contracts || !Array.isArray(contracts) || contracts.length === 0) {
      return [];
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    let activeCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;

    contracts.forEach((contract: any) => {
      const status = (contract.status || '').toUpperCase();
      const startDate = contract.startDate ? new Date(contract.startDate) : null;
      const endDate = contract.endDate ? new Date(contract.endDate) : null;
      
      if (startDate) startDate.setHours(0, 0, 0, 0);
      if (endDate) endDate.setHours(0, 0, 0, 0);

      // Check for explicitly closed/ended contracts
      const isClosed = status === 'ENCERRADO' || 
                      status === 'REVOGADO' || 
                      status === 'FINALIZADO' ||
                      status === 'CLOSED' ||
                      status === 'CANCELLED' ||
                      status === 'TERMINATED';

      // Active statuses
      const isActiveStatus = status === 'ATIVO' || 
                            status === 'ASSINADO' || 
                            status === 'ACTIVE' ||
                            status === 'SIGNED';

      // Pending/awaiting signatures
      const isPendingStatus = status === 'AGUARDANDO_ASSINATURAS' ||
                             status === 'PENDENTE' ||
                             status === 'AWAITING_SIGNATURE' ||
                             status === 'PENDING';

      // Check if contract has started
      const hasStarted = !startDate || startDate <= now;

      if (isClosed) {
        // Explicitly closed contracts
        expiredCount++;
      } else if (isActiveStatus) {
        // Active contracts - check end date
        if (endDate) {
          if (endDate < now) {
            // Contract has expired
            expiredCount++;
          } else {
            // Contract is active
            activeCount++;
            // Check if expiring within 30 days
            if (endDate <= thirtyDaysFromNow) {
              expiringSoonCount++;
            }
          }
        } else {
          // Active contract without end date - consider it active
          activeCount++;
        }
      } else if (isPendingStatus) {
        // Pending contracts - check if they should be active or expired
        if (endDate) {
          if (endDate < now) {
            // Past end date - expired
            expiredCount++;
          } else if (hasStarted) {
            // Started and not expired - active
            activeCount++;
            if (endDate <= thirtyDaysFromNow) {
              expiringSoonCount++;
            }
          } else {
            // Not started yet - still pending, count as active
            activeCount++;
          }
        } else if (hasStarted) {
          // Started but no end date - active
          activeCount++;
        } else {
          // Not started, no end date - pending, count as active
          activeCount++;
        }
      } else {
        // Unknown status - use date-based logic
        if (endDate) {
          if (endDate < now) {
            // Past end date
            expiredCount++;
          } else if (hasStarted) {
            // Started and not expired - treat as active
            activeCount++;
            if (endDate <= thirtyDaysFromNow) {
              expiringSoonCount++;
            }
          } else {
            // Not started yet - treat as active
            activeCount++;
          }
        } else if (hasStarted || !startDate) {
          // Started or no start date - treat as active
          activeCount++;
        } else {
          // Not started - treat as active (pending)
          activeCount++;
        }
      }
    });

    return [
      { name: 'Ativos', value: activeCount, color: COLORS.green },
      { name: 'A vencer', value: expiringSoonCount, color: COLORS.yellow },
      { name: 'Vencidos', value: expiredCount, color: COLORS.red },
    ].filter(item => item.value > 0);
  })();

  // Get recent payments
  const recentPayments = dashboard?.recentPayments || [];
  const pendingPayments = dashboard?.pendingPayments || [];

  // Format due dates
  const formattedDueDates = (dueDates || []).slice(0, 5).map((item: any) => ({
    ...item,
    formattedDate: item.nextDueDate || item.dueDate 
      ? new Date(item.nextDueDate || item.dueDate).toLocaleDateString('pt-BR')
      : '-',
  }));

  const getStatusBadge = (status: string) => {
    const statusUpper = (status || '').toUpperCase();
    if (statusUpper === 'OVERDUE' || statusUpper === 'EM_ATRASO' || statusUpper === 'ATRASADO') {
      return <Badge variant="destructive">Em Atraso</Badge>;
    }
    if (statusUpper === 'UPCOMING' || statusUpper === 'PENDENTE') {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pendente</Badge>;
    }
    if (statusUpper === 'OK' || statusUpper === 'PAGO') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Pago</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader 
        title="Dashboard do Diretor" 
        subtitle="Visão geral da sua agência imobiliária"
      />

      {/* KPI Cards - First Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <KPICard
          title="Total de Imóveis"
          value={totalProperties}
          icon={Building2}
          color="blue"
          onClick={() => navigate('/dashboard/properties')}
        />
        <KPICard
          title="Contratos Ativos"
          value={activeContracts}
          icon={FileText}
          color="green"
          trend={activeContracts > 0 ? 'up' : 'neutral'}
          trendLabel={activeContracts > 0 ? 'Ativos' : 'Sem contratos'}
          onClick={() => navigate('/dashboard/contracts')}
        />
        <KPICard
          title="Inquilinos"
          value={tenantCount}
          icon={Users}
          color="purple"
          onClick={() => navigate('/dashboard/tenants')}
        />
        <KPICard
          title="Receita Total"
          value={formatCurrency(totalIncome)}
          icon={DollarSign}
          color="blue"
          trend={totalIncome > 0 ? 'up' : 'neutral'}
          trendLabel={totalIncome > 0 ? 'Total recebido' : 'Sem receita'}
        />
        {totalIncome > 0 && roleSpecificIncome !== totalIncome && (
          <KPICard
            title="Sua Receita"
            value={formatCurrency(roleSpecificIncome)}
            icon={DollarSign}
            color="green"
            trend={roleSpecificIncome > 0 ? 'up' : 'neutral'}
            trendLabel={roleSpecificIncome > 0 ? 'Sua parte' : 'Sem receita'}
          />
        )}
      </div>

      {/* KPI Cards - Second Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <KPICard
          title="Taxa de Ocupação"
          value={`${occupancyRate}%`}
          icon={Home}
          color="cyan"
          trend={occupancyRate >= 80 ? 'up' : occupancyRate >= 50 ? 'neutral' : 'down'}
          trendLabel={occupancyRate >= 80 ? 'Boa ocupação' : occupancyRate >= 50 ? 'Média' : 'Baixa ocupação'}
        />
        <KPICard
          title="Recebido"
          value={formatCurrency(receivedValue)}
          icon={CheckCircle}
          color="green"
        />
        <KPICard
          title="Pendente"
          value={formatCurrency(Math.max(0, monthlyRevenue - receivedValue - overdueValue))}
          icon={Clock}
          color="yellow"
        />
        <KPICard
          title="Em Atraso"
          value={overdueCount}
          icon={AlertCircle}
          color="red"
          trend={overdueCount > 0 ? 'down' : 'up'}
          trendLabel={overdueCount > 0 ? 'Atenção' : 'Sem atrasos'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Distribuição da Receita</CardTitle>
            <CardDescription className="text-sm sm:text-base">Recebido, Pendente e Vencido</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full" style={{ width: '100%', height: '320px', minHeight: '256px', position: 'relative' }}>
              {revenueData && revenueData.length > 0 && revenueData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={320} minWidth={200} minHeight={256} debounce={50}>
                  <PieChart>
                    <Pie
                      data={revenueData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(props: any) => props.value > 0 ? `${props.name}: ${formatCurrency(props.value)}` : ''}
                      labelLine={false}
                    >
                      {revenueData.map((entry: any, index) => (
                        <Cell key={`cell-revenue-${index}`} fill={entry.color || COLORS.green} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                  <PieChartIcon className="w-12 h-12 mb-2 opacity-50" />
                  <p>Nenhum dado disponível</p>
                  <p className="text-xs">Não há dados de receita para exibir</p>
                </div>
              )}
            </div>
            <div className="text-center mt-2 font-semibold text-sm sm:text-base">
              Receita Total: {formatCurrency(totalIncome)}
              {totalIncome > 0 && roleSpecificIncome !== totalIncome && (
                <div className="text-xs text-muted-foreground mt-1">
                  Sua Receita: {formatCurrency(roleSpecificIncome)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Property Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Status dos Imóveis</CardTitle>
            <CardDescription className="text-sm sm:text-base">Distribuição dos imóveis por status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full" style={{ width: '100%', height: '320px', minHeight: '256px', position: 'relative' }}>
              {propertyStatusData && propertyStatusData.length > 0 && propertyStatusData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={320} minWidth={200} minHeight={256} debounce={50}>
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
                        <Cell key={`cell-status-${index}`} fill={entry.color || COLORS.blue} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(value: number) => `${value} imóveis`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                  <PieChartIcon className="w-12 h-12 mb-2 opacity-50" />
                  <p>Nenhum dado disponível</p>
                  <p className="text-xs">Não há dados de status dos imóveis para exibir</p>
                </div>
              )}
            </div>
            <div className="text-center mt-2 font-semibold text-sm sm:text-base">
              Total de imóveis: {totalProperties}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contract Status Chart */}
      {contractStatusData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Status dos Contratos</CardTitle>
            <CardDescription className="text-sm sm:text-base">Distribuição dos contratos por status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full" style={{ width: '100%', height: '320px', minHeight: '256px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height={320} minWidth={200} minHeight={256} debounce={50}>
                <PieChart>
                  <Pie
                    data={contractStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(props: any) => props.value > 0 ? `${props.name}: ${props.value}` : ''}
                    labelLine={false}
                  >
                    {contractStatusData.map((entry: any, index) => (
                      <Cell key={`cell-contract-${index}`} fill={entry.color || COLORS.green} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(value: number) => `${value} contratos`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Due Dates and Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Due Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-orange-500" />
              Próximos Vencimentos
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">Agenda de vencimentos por imóvel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full" style={{ width: '100%', height: '320px', minHeight: '256px', position: 'relative' }}>
              {dueDatesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="w-full h-full" />
                </div>
              ) : formattedDueDates.length > 0 ? (
                <div className="overflow-y-auto h-full">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left font-semibold p-2">Imóvel</th>
                        <th className="text-left font-semibold p-2">Inquilino</th>
                        <th className="text-left font-semibold p-2">Vencimento</th>
                        <th className="text-left font-semibold p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formattedDueDates.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-2">{item.propertyName || item.name || '-'}</td>
                          <td className="p-2">{item.tenant?.name || item.tenant || '-'}</td>
                          <td className="p-2">{item.formattedDate}</td>
                          <td className="p-2">{getStatusBadge(item.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                  <CalendarDays className="w-12 h-12 mb-2 opacity-50" />
                  <p>Nenhum vencimento encontrado</p>
                  <p className="text-xs">Não há vencimentos próximos para exibir</p>
                </div>
              )}
            </div>
            <div className="text-center mt-2 font-semibold text-sm sm:text-base">
              Total de vencimentos: {formattedDueDates.length}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Pagamentos Recentes
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">Últimos pagamentos recebidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full" style={{ width: '100%', height: '320px', minHeight: '256px', position: 'relative' }}>
              {recentPayments.length > 0 ? (
                <div className="overflow-y-auto h-full">
                  <div className="space-y-3">
                    {recentPayments.slice(0, 5).map((payment: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{payment.property?.name || payment.property?.address || 'Imóvel'}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.tenant?.name || payment.user?.name || 'Inquilino'} • {payment.date ? new Date(payment.date).toLocaleDateString('pt-BR') : '-'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600 text-sm">{formatCurrency(Number(payment.amount || payment.valorPago || 0))}</p>
                          <p className="text-xs text-muted-foreground capitalize">{payment.type || 'Aluguel'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                  <DollarSign className="w-12 h-12 mb-2 opacity-50" />
                  <p>Nenhum pagamento recente</p>
                  <p className="text-xs">Não há pagamentos para exibir</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments Alert */}
      {pendingPayments.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-orange-700">
              <AlertCircle className="w-5 h-5" />
              Pagamentos Pendentes ({pendingPayments.length})
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">Pagamentos que requerem atenção</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingPayments.slice(0, 5).map((payment: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{payment.property?.name || payment.property?.address || 'Imóvel'}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.tenant?.name || payment.user?.name || 'Inquilino'}
                      {payment.daysOverdue && ` • ${payment.daysOverdue} dias em atraso`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-orange-700 text-sm">{formatCurrency(Number(payment.monthlyRent || 0))}</p>
                    <p className="text-xs text-muted-foreground">Pendente</p>
                  </div>
                </div>
              ))}
              {pendingPayments.length > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  E mais {pendingPayments.length - 5} pagamento(s) pendente(s)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

