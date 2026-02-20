import { useQuery } from '@tanstack/react-query';
import { dashboardAPI, contractsAPI, paymentsAPI } from '../../api';
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
  Inbox
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';

function KPICard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  trendLabel,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'orange' | 'red' | 'cyan' | 'pink';
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
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
    <Card>
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

export function AgencyAdminDashboard() {
  const { user } = useAuth();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', 'agency-admin', user?.id, user?.agencyId],
    queryFn: () => dashboardAPI.getDashboard(),
  });

  const { data: dueDates, isLoading: dueDatesLoading } = useQuery({
    queryKey: ['due-dates', 'agency-admin', user?.id, user?.agencyId],
    queryFn: () => dashboardAPI.getDueDates(),
  });

  const { data: contracts } = useQuery({
    queryKey: ['contracts', 'agency-admin', user?.id, user?.agencyId],
    queryFn: () => contractsAPI.getContracts(),
  });

  const { data: payments } = useQuery({
    queryKey: ['payments', 'agency-admin', user?.id, user?.agencyId],
    queryFn: () => paymentsAPI.getPayments(),
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

        {/* First KPI Row Skeleton */}
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

        {/* Second KPI Row Skeleton */}
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
                <div className="flex items-center justify-center h-[220px]">
                  <Skeleton className="w-40 h-40 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Second Charts Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-36" />
              </CardHeader>
              <CardContent>
                <div className="h-[220px] flex items-end gap-2">
                  {[...Array(6)].map((_, j) => (
                    <Skeleton key={j} className="flex-1" style={{ height: `${Math.random() * 60 + 40}%` }} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-36" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Table Header */}
              <div className="flex gap-4 border-b pb-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-4 flex-1" />
                ))}
              </div>
              {/* Table Rows */}
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 py-2">
                  {[...Array(5)].map((_, j) => (
                    <Skeleton key={j} className="h-4 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
  const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0;

  const revenueData = [
    { name: 'Recebido', value: receivedValue, color: COLORS.green },
    { name: 'Pendente', value: Math.max(0, monthlyRevenue - receivedValue - overdueValue), color: COLORS.yellow },
    { name: 'Vencido', value: overdueValue, color: COLORS.red },
  ].filter(item => item.value > 0);

  const propertyStatusData = [
    { name: 'Ocupados', value: occupiedProperties, color: COLORS.blue },
    { name: 'Disponíveis', value: availableProperties, color: COLORS.green },
    { name: 'Em atraso', value: overview.overdueUnits || 0, color: COLORS.red },
    { name: 'Manutenção', value: overview.maintenanceProperties || 0, color: COLORS.yellow },
  ].filter(item => item.value > 0);

  // Calculate contract status from actual contracts data
  const contractStatusData = (() => {
    if (!contracts || !Array.isArray(contracts) || contracts.length === 0) {
      return [];
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    let activeCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;

    contracts.forEach((contract: any) => {
      const status = (contract.status || '').toUpperCase();
      const startDate = contract.startDate ? new Date(contract.startDate) : null;
      const endDate = contract.endDate ? new Date(contract.endDate) : null;
      
      // Normalize dates to start of day for comparison
      if (startDate) {
        startDate.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        endDate.setHours(0, 0, 0, 0);
      }

      // Contracts that are considered for this card (excluding drafts and clearly closed ones):
      // - ATIVO: Definitely active
      // - ASSINADO: Signed
      // - AGUARDANDO_ASSINATURAS: Awaiting signatures
      // - PENDENTE: Pending (but has dates, so should be shown)
      const isRelevantStatus = status === 'ATIVO' || 
                              status === 'ASSINADO' || 
                              status === 'AGUARDANDO_ASSINATURAS' ||
                              status === 'PENDENTE' ||
                              status === 'AWAITING_SIGNATURE' || // Alternative format
                              status === 'PENDING'; // Alternative format
      
      // Check if contract has started (no startDate means it's considered started, or startDate has passed)
      const hasStarted = !startDate || startDate <= now;
      // Show contracts that have started, or contracts with dates that are relevant (even if not started yet)
      const shouldShow = hasStarted || (isRelevantStatus && (startDate || endDate));

      if (isRelevantStatus) {
        // For active status contracts, check dates
        if (endDate) {
          if (endDate < now) {
            // Contract has expired (past end date)
            expiredCount++;
          } else if (shouldShow) {
            // Contract is active or should be shown (hasn't expired and meets criteria)
            activeCount++;
            // Check if contract is expiring within 30 days
            if (endDate <= thirtyDaysFromNow) {
              expiringSoonCount++;
            }
          }
        } else {
          // Active status contract without end date - consider it active if it has started or is AGUARDANDO_ASSINATURAS
          if (shouldShow) {
            activeCount++;
          }
        }
      } else if (status === 'ENCERRADO' || status === 'REVOGADO' || status === 'FINALIZADO') {
        // Closed/ended/revoked contracts
        expiredCount++;
      } else if (endDate && endDate < now) {
        // Any other contract that has passed its end date
        expiredCount++;
      }
    });

    return [
      { name: 'Ativos', value: activeCount, color: COLORS.green },
      { name: 'A vencer', value: expiringSoonCount, color: COLORS.yellow },
      { name: 'Vencidos', value: expiredCount, color: COLORS.red },
    ].filter(item => item.value > 0);
  })();

  // Derive due dates from contracts and payments if dueDates API is empty
  const derivedDueDates = (() => {
    if (dueDates && dueDates.length > 0) {
      return dueDates;
    }
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const results: any[] = [];

    // First, try to derive from contracts
    if (contracts && Array.isArray(contracts) && contracts.length > 0) {
      contracts.forEach((contract: any) => {
        const status = (contract.status || '').toUpperCase();
        const endDate = contract.endDate ? new Date(contract.endDate) : null;
        const startDate = contract.startDate ? new Date(contract.startDate) : null;
        
        // Include active contracts or contracts awaiting signatures
        const isRelevant = status === 'ATIVO' || 
                          status === 'ASSINADO' || 
                          status === 'AGUARDANDO_ASSINATURAS' ||
                          status === 'PENDENTE';
        
        if (!isRelevant) return;
        
        if (endDate) {
          endDate.setHours(0, 0, 0, 0);
          if (endDate < now) return; // Contract expired
        }
        
        const monthlyRent = Number(contract.monthlyRent) || Number(contract.valorMensal) || 0;
        if (monthlyRent <= 0) return;
        
        // Calculate next payment date
        let nextDueDate = new Date(now);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        nextDueDate.setDate(1); // First day of next month
        
        if (startDate) {
          startDate.setHours(0, 0, 0, 0);
          if (startDate > now) {
            // Contract hasn't started yet, use start date
            nextDueDate = new Date(startDate);
          } else {
            // Contract has started, calculate next payment based on start date
            // Find next payment date after start date
            let paymentDate = new Date(startDate);
            while (paymentDate <= now) {
              paymentDate.setMonth(paymentDate.getMonth() + 1);
            }
            nextDueDate = paymentDate;
          }
        }
        
        // Don't show if next due date is past end date
        if (endDate && nextDueDate > endDate) {
          return;
        }

        results.push({
          propertyName: contract.property?.name || contract.property?.address || 'Imóvel',
          tenant: contract.tenantUser?.name || contract.tenant?.name || contract.tenantUser || 'Inquilino',
          amount: monthlyRent,
          monthlyRent: monthlyRent,
          nextDueDate: nextDueDate.toISOString(),
          dueDate: nextDueDate.toISOString(),
          status: nextDueDate < now ? 'overdue' : 'upcoming',
        });
      });
    }

    // If still no results, try to derive from payments (calculate next payment based on last payment)
    if (results.length === 0 && payments && Array.isArray(payments) && payments.length > 0) {
      // Group payments by property and tenant
      const paymentMap = new Map<string, any>();
      
      payments.forEach((payment: any) => {
        const propertyId = payment.propertyId || payment.property?.id;
        const tenantId = payment.tenantId || payment.user?.id || payment.tenantUser?.id;
        const key = `${propertyId}-${tenantId}`;
        
        if (!paymentMap.has(key)) {
          paymentMap.set(key, []);
        }
        paymentMap.get(key)!.push(payment);
      });

      paymentMap.forEach((paymentList) => {
        // Get the most recent payment
        const sortedPayments = paymentList.sort((a: any, b: any) => {
          const dateA = new Date(a.paymentDate || a.dataPagamento || 0);
          const dateB = new Date(b.paymentDate || b.dataPagamento || 0);
          return dateB.getTime() - dateA.getTime();
        });
        
        const lastPayment = sortedPayments[0];
        if (!lastPayment) return;
        
        const lastPaymentDate = new Date(lastPayment.paymentDate || lastPayment.dataPagamento);
        if (isNaN(lastPaymentDate.getTime())) return;
        
        lastPaymentDate.setHours(0, 0, 0, 0);
        
        // Calculate next payment date (one month after last payment)
        const nextDueDate = new Date(lastPaymentDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        
        // Only show if next due date is in the future
        if (nextDueDate >= now) {
          const amount = Number(lastPayment.amount || lastPayment.valorPago || 0);
          if (amount > 0) {
            results.push({
              propertyName: lastPayment.property?.name || lastPayment.property?.address || 'Imóvel',
              tenant: lastPayment.user?.name || lastPayment.tenantUser?.name || 'Inquilino',
              amount: amount,
              monthlyRent: amount,
              nextDueDate: nextDueDate.toISOString(),
              dueDate: nextDueDate.toISOString(),
              status: nextDueDate < now ? 'overdue' : 'upcoming',
            });
          }
        }
      });
    }

    // Sort by due date
    return results.sort((a: any, b: any) => {
      const dateA = new Date(a.nextDueDate || a.dueDate);
      const dateB = new Date(b.nextDueDate || b.dueDate);
      return dateA.getTime() - dateB.getTime();
    });
  })();

  // Process chart data - group by property, avoid duplicates, use highest amount
  const dueDatesChartData = (() => {
    if (!derivedDueDates || derivedDueDates.length === 0) {
      return [];
    }

    // Group by property name, use the highest amount if duplicates exist
    const propertyMap = new Map<string, { name: string; valor: number; status: string }>();
    
    derivedDueDates.slice(0, 10).forEach((item: any) => {
      const propertyName = (item.propertyName || 'Imóvel').substring(0, 15);
      const amount = Number(item.amount) || Number(item.monthlyRent) || 0;
      
      if (amount <= 0) return; // Skip zero amounts
      
      if (propertyMap.has(propertyName)) {
        // If property already exists, use the maximum amount (avoid summing different sources)
        const existing = propertyMap.get(propertyName)!;
        if (amount > existing.valor) {
          existing.valor = amount;
        }
      } else {
        // New property entry
        propertyMap.set(propertyName, {
          name: propertyName,
          valor: amount,
          status: item.status || 'upcoming',
        });
      }
    });

    return Array.from(propertyMap.values())
      .filter(item => item.valor > 0)
      .sort((a, b) => b.valor - a.valor);
  })();

  const paymentTrendData = [
    { month: 'Jan', recebido: Math.round(monthlyRevenue * 0.85), pendente: Math.round(monthlyRevenue * 0.15) },
    { month: 'Fev', recebido: Math.round(monthlyRevenue * 0.88), pendente: Math.round(monthlyRevenue * 0.12) },
    { month: 'Mar', recebido: Math.round(monthlyRevenue * 0.82), pendente: Math.round(monthlyRevenue * 0.18) },
    { month: 'Abr', recebido: Math.round(monthlyRevenue * 0.90), pendente: Math.round(monthlyRevenue * 0.10) },
    { month: 'Mai', recebido: Math.round(monthlyRevenue * 0.87), pendente: Math.round(monthlyRevenue * 0.13) },
    { month: 'Jun', recebido: receivedValue, pendente: monthlyRevenue - receivedValue },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAGO':
      case 'ok':
        return <span className="px-2 py-1 rounded text-white bg-green-500 text-xs">Pago</span>;
      case 'PENDENTE':
      case 'upcoming':
        return <span className="px-2 py-1 rounded text-white bg-yellow-500 text-xs">Pendente</span>;
      case 'EM_ATRASO':
      case 'overdue':
        return <span className="px-2 py-1 rounded text-white bg-red-500 text-xs">Vencido</span>;
      default:
        return <span className="px-2 py-1 rounded bg-gray-200 text-xs">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader 
        title="Dashboard Administrativo" 
        subtitle="Visão geral da sua agência" 
      />

      {}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <KPICard
          title="Total de Imóveis"
          value={totalProperties}
          icon={Building2}
          color="blue"
        />
        <KPICard
          title="Imóveis Ocupados"
          value={occupiedProperties}
          icon={Home}
          color="green"
          trend={occupancyRate >= 80 ? 'up' : occupancyRate >= 50 ? 'neutral' : 'down'}
          trendLabel={`${occupancyRate}% ocupação`}
        />
        <KPICard
          title="Contratos Ativos"
          value={activeContracts}
          icon={FileText}
          color="purple"
        />
        <KPICard
          title="Receita Total"
          value={formatCurrency(totalIncome)}
          icon={DollarSign}
          color="blue"
        />
        {totalIncome > 0 && roleSpecificIncome !== totalIncome && (
          <KPICard
            title="Sua Receita"
            value={formatCurrency(roleSpecificIncome)}
            icon={DollarSign}
            color="yellow"
          />
        )}
      </div>

      {}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <KPICard
          title="Valor Recebido"
          value={formatCurrency(receivedValue)}
          icon={TrendingUp}
          color="green"
        />
        <KPICard
          title="Valor Pendente"
          value={formatCurrency(Math.max(0, monthlyRevenue - receivedValue - overdueValue))}
          icon={CalendarDays}
          color="orange"
        />
        <KPICard
          title="Valor em Atraso"
          value={formatCurrency(overdueValue)}
          icon={AlertCircle}
          color="red"
          trend={overdueValue > 0 ? 'down' : 'up'}
          trendLabel={overdueValue > 0 ? 'Atenção' : 'Sem atrasos'}
        />
        <KPICard
          title="Inquilinos"
          value={tenantCount}
          icon={Users}
          color="cyan"
        />
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Distribuição da Receita</CardTitle>
            <CardDescription>Recebido, Pendente e Vencido</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <Pie
                      data={revenueData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    >
                      {revenueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                  <DollarSign className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">Nenhum dado de receita disponível</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Status dos Imóveis</CardTitle>
            <CardDescription>Distribuição por status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              {propertyStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <Pie
                      data={propertyStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {propertyStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} imóveis`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                  <Building2 className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">Nenhum imóvel cadastrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Status dos Contratos</CardTitle>
            <CardDescription>Ativos, A vencer e Vencidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              {contractStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <Pie
                      data={contractStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={70}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {contractStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} contratos`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                  <FileText className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">Nenhum contrato cadastrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Tendência de Pagamentos</CardTitle>
            <CardDescription>Evolução dos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={paymentTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Area type="monotone" dataKey="recebido" stackId="1" stroke={COLORS.green} fill={COLORS.green} name="Recebido" />
                  <Area type="monotone" dataKey="pendente" stackId="1" stroke={COLORS.yellow} fill={COLORS.yellow} name="Pendente" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      {dueDatesChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Próximos Vencimentos</CardTitle>
            <CardDescription>Valores por imóvel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart 
                  data={dueDatesChartData} 
                  margin={{ top: 10, right: 10, left: 60, bottom: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    fontSize={12} 
                    tickFormatter={(value) => formatCurrency(value)}
                    width={55}
                    domain={[0, 'dataMax']}
                  />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="valor" fill={COLORS.blue} radius={[4, 4, 0, 0]} name="Valor" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Agenda de Vencimentos</CardTitle>
          <CardDescription>Próximos vencimentos por imóvel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-semibold p-2">Imóvel</th>
                  <th className="text-left font-semibold p-2">Inquilino</th>
                  <th className="text-left font-semibold p-2">Valor</th>
                  <th className="text-left font-semibold p-2">Vencimento</th>
                  <th className="text-left font-semibold p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {dueDatesLoading ? (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-2"><Skeleton className="h-4 w-32" /></td>
                        <td className="p-2"><Skeleton className="h-4 w-24" /></td>
                        <td className="p-2"><Skeleton className="h-4 w-20" /></td>
                        <td className="p-2"><Skeleton className="h-4 w-24" /></td>
                        <td className="p-2"><Skeleton className="h-6 w-16 rounded" /></td>
                      </tr>
                    ))}
                  </>
                ) : !derivedDueDates || derivedDueDates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Inbox className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-sm">Nenhum vencimento encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  derivedDueDates.slice(0, 10).map((item: any, idx: number) => (
                    <tr key={idx} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-2">{item.propertyName || item.name || '-'}</td>
                      <td className="p-2">{item.tenant?.name || item.tenant || '-'}</td>
                      <td className="p-2">{formatCurrency(Number(item.amount) || Number(item.monthlyRent) || 0)}</td>
                      <td className="p-2">
                        {item.nextDueDate || item.dueDate
                          ? new Date(item.nextDueDate || item.dueDate).toLocaleDateString('pt-BR')
                          : '-'}
                      </td>
                      <td className="p-2">{getStatusBadge(item.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {}
      {dashboard?.pendingPayments && dashboard.pendingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <CardTitle className="text-lg sm:text-xl">Pagamentos Pendentes</CardTitle>
              <span className="ml-auto bg-destructive/10 text-destructive px-3 py-1 rounded-full text-sm">
                {dashboard.pendingPayments.length}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.pendingPayments.slice(0, 5).map((payment: any) => (
                <div
                  key={payment.contractId}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{payment.property?.name || payment.property?.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.tenant?.name}
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
          </CardContent>
        </Card>
      )}

      {}
      {dashboard?.recentPayments && dashboard.recentPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Pagamentos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.recentPayments.slice(0, 5).map((payment: any) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{payment.property?.name || payment.property?.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.tenant?.name} • {new Date(payment.date).toLocaleDateString('pt-BR')}
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
          </CardContent>
        </Card>
      )}

    </div>
  );
}
