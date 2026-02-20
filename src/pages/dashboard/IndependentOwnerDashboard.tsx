import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { dashboardAPI } from '../../api';
import { formatCurrency } from '../../lib/utils';
import {
  Building2, FileText, DollarSign,
  AlertCircle, CheckCircle, Clock, Home,
  PieChart as PieChartIcon, Inbox
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts';

const COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  gray: '#64748b',
};

function ChartContainer({ children, height = 280 }: { children: React.ReactNode; height?: number }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isMounted) {
    return <div style={{ height: `${height}px` }} className="flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div style={{ width: '100%', height: `${height}px`, minHeight: `${height}px` }}>
      <ResponsiveContainer width="100%" height={height} minWidth={200}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function IndependentOwnerDashboard() {
  const { user } = useAuth();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['independent-owner-dashboard', user?.id],
    queryFn: () => dashboardAPI.getDashboard(),
  });

  const { data: dueDates } = useQuery({
    queryKey: ['independent-owner-due-dates', user?.id],
    queryFn: () => dashboardAPI.getDueDates(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 sm:p-6">
                <Skeleton className="w-10 h-10 rounded-lg mb-4" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 sm:p-6">
                <Skeleton className="w-10 h-10 rounded-lg mb-4" />
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-[280px]">
                  <Skeleton className="w-48 h-48 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
          <CardContent>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 py-2 border-b last:border-0">
                {[...Array(5)].map((_, j) => (<Skeleton key={j} className="h-4 flex-1" />))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const overview = dashboard?.overview || {};

  const revenueDistributionData = [
    { name: 'Recebido', value: overview.receivedValue ?? 0, color: COLORS.success },
    { name: 'Pendente', value: Math.max(0, (overview.monthlyRevenue ?? 0) - (overview.receivedValue ?? 0) - (overview.overdueValue ?? 0)), color: COLORS.warning },
    { name: 'Vencido', value: overview.overdueValue ?? 0, color: COLORS.danger },
  ];

  const propertyStatusData = [
    { name: 'Disponíveis', value: overview.availableProperties ?? overview.vacantUnits ?? 0, color: COLORS.success },
    { name: 'Ocupados', value: overview.occupiedProperties ?? 0, color: COLORS.primary },
    { name: 'Vencidos', value: overview.overdueUnits ?? 0, color: COLORS.danger },
    { name: 'Pendentes', value: overview.pendingUnits ?? overview.maintenanceProperties ?? 0, color: COLORS.warning },
  ];

  const activeContracts = overview.activeContracts ?? 0;
  const pendingPaymentsCount = overview.pendingPayments ?? 0;
  const contractStatusData = [
    { name: 'Ativos', value: activeContracts, color: COLORS.success },
    { name: 'Pendentes', value: pendingPaymentsCount, color: COLORS.warning },
  ].filter(item => item.value > 0);

  const totalProperties = overview.totalProperties ?? 0;
  const occupiedProperties = overview.occupiedProperties ?? 0;
  const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0;

  const overdueUnits = overview.overdueUnits ?? 0;
  const defaultRate = totalProperties > 0 ? ((overdueUnits / totalProperties) * 100).toFixed(1) : 0;

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
        return <span className="px-2 py-1 rounded bg-gray-200 text-xs">Desconhecido</span>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Meu Painel" 
        subtitle="Visão geral dos seus imóveis" 
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
          subtitle={`${occupancyRate}% ocupação`}
        />
        <KPICard
          title="Contratos Ativos"
          value={activeContracts}
          icon={FileText}
          color="purple"
        />
        <KPICard
          title="Receita Total"
          value={formatCurrency(overview.totalIncome || overview.monthlyRevenue || 0)}
          icon={DollarSign}
          color="blue"
          isAmount
        />
        {overview.totalIncome !== undefined && overview.roleSpecificIncome !== undefined && overview.totalIncome > 0 && (
          <KPICard
            title="Sua Receita"
            value={formatCurrency(overview.roleSpecificIncome || 0)}
            icon={DollarSign}
            color="yellow"
            isAmount
          />
        )}
      </div>

      {}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <KPICard
          title="Imóveis Disponíveis"
          value={overview.availableProperties ?? overview.vacantUnits ?? 0}
          icon={Building2}
          color="cyan"
        />
        <KPICard
          title="Taxa de Inadimplência"
          value={`${defaultRate}%`}
          icon={AlertCircle}
          color={Number(defaultRate) > 10 ? 'red' : Number(defaultRate) > 5 ? 'yellow' : 'green'}
          subtitle="Pagamentos em atraso"
        />
        <KPICard
          title="Receita Recebida"
          value={formatCurrency(overview.receivedValue ?? 0)}
          icon={CheckCircle}
          color="green"
          subtitle="Este mês"
          isAmount
        />
        <KPICard
          title="Pagamentos Pendentes"
          value={pendingPaymentsCount}
          icon={Clock}
          color="red"
          subtitle={formatCurrency(overview.overdueValue ?? 0)}
        />
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-green-500" />
              Distribuição da Receita
            </CardTitle>
            <CardDescription>Recebido, Pendente e Vencido</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueDistributionData.some(d => d.value > 0) ? (
              <ChartContainer height={280}>
                <PieChart>
                  <Pie
                    data={revenueDistributionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(props: any) => props.value > 0 ? `${props.name}` : ''}
                  >
                    {revenueDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                <Inbox className="w-12 h-12 mb-2 opacity-50" />
                <p>Nenhum dado disponível</p>
              </div>
            )}
            <div className="text-center mt-2 font-semibold text-sm">
              Total: {formatCurrency(overview.monthlyRevenue ?? 0)}
            </div>
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-500" />
              Status dos Imóveis
            </CardTitle>
            <CardDescription>Distribuição por situação</CardDescription>
          </CardHeader>
          <CardContent>
            {propertyStatusData.some(d => d.value > 0) ? (
              <ChartContainer height={280}>
                <PieChart>
                  <Pie
                    data={propertyStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    label={(props: any) => props.value > 0 ? `${props.value}` : ''}
                  >
                    {propertyStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} imóveis`} />
                  <Legend />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                <Inbox className="w-12 h-12 mb-2 opacity-50" />
                <p>Nenhum dado disponível</p>
              </div>
            )}
            <div className="text-center mt-2 font-semibold text-sm">
              Total: {totalProperties} imóveis
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-500" />
              Status dos Contratos
            </CardTitle>
            <CardDescription>Distribuição por situação</CardDescription>
          </CardHeader>
          <CardContent>
            {contractStatusData.length > 0 ? (
              <ChartContainer height={280}>
                <BarChart data={contractStatusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {contractStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                <Inbox className="w-12 h-12 mb-2 opacity-50" />
                <p>Nenhum dado disponível</p>
              </div>
            )}
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Próximos Vencimentos
            </CardTitle>
            <CardDescription>Pagamentos com vencimento próximo</CardDescription>
          </CardHeader>
          <CardContent>
            {!dueDates || dueDates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                <Inbox className="w-12 h-12 mb-2 opacity-50" />
                <p>Nenhum vencimento encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[250px]">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="text-left font-semibold p-2">Imóvel</th>
                      <th className="text-left font-semibold p-2">Inquilino</th>
                      <th className="text-left font-semibold p-2">Vencimento</th>
                      <th className="text-left font-semibold p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dueDates.slice(0, 6).map((item: any, idx: number) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="p-2 truncate max-w-[120px]">{item.propertyName || item.name || '-'}</td>
                        <td className="p-2 truncate max-w-[100px]">{item.tenant?.name || item.tenant || '-'}</td>
                        <td className="p-2">{item.nextDueDate || item.dueDate ? new Date(item.nextDueDate || item.dueDate).toLocaleDateString('pt-BR') : '-'}</td>
                        <td className="p-2">{getStatusBadge(item.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {}
      {dashboard?.pendingPayments && dashboard.pendingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Pagamentos Pendentes
                </CardTitle>
                <CardDescription>Pagamentos em atraso que necessitam atenção</CardDescription>
              </div>
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                {dashboard.pendingPayments.length} pendentes
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.pendingPayments.slice(0, 5).map((payment: any) => (
                <div
                  key={payment.contractId}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{payment.property?.name || payment.property?.address || '-'}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.tenant?.name || '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-500">
                      {formatCurrency(Number(payment.monthlyRent || 0))}
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
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Pagamentos Recentes
            </CardTitle>
            <CardDescription>Últimos pagamentos recebidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.recentPayments.slice(0, 5).map((payment: any) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{payment.property?.name || payment.property?.address || '-'}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.tenant?.name || '-'} • {payment.date ? new Date(payment.date).toLocaleDateString('pt-BR') : '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-500">
                      {formatCurrency(Number(payment.amount || 0))}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {payment.type || '-'}
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

function KPICard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  isAmount = false,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  subtitle?: string;
  isAmount?: boolean;
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
          <div className={`p-2 sm:p-3 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <h3 className="text-xs sm:text-sm text-muted-foreground mb-1 line-clamp-1">{title}</h3>
        <p className="text-lg sm:text-2xl font-bold truncate">
          {isAmount ? value : typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {subtitle && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
