import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { dashboardAPI } from '../../api';
import { formatCurrency } from '../../lib/utils';
import {
  Building2, Users, FileText, DollarSign, TrendingUp,
  AlertCircle, CheckCircle, Clock, Briefcase, Award,
  PieChart as PieChartIcon, Loader2, Inbox, Percent
} from 'lucide-react';
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
  pink: '#ec4899',
  indigo: '#6366f1',
  gray: '#64748b',
};

function ChartContainer({ children, height = 280 }: { children: React.ReactNode; height?: number }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (!isMounted) {
    return <div style={{ height: `${height}px`, width: '100%' }} className="flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div style={{ width: '100%', height: `${height}px` }}>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function CEODashboard() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['ceo-dashboard'],
    queryFn: () => dashboardAPI.getDashboard(),
  });

  const { data: dueDates } = useQuery({
    queryKey: ['ceo-due-dates'],
    queryFn: () => dashboardAPI.getDueDates(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const overview = dashboard?.overview || {};

  const revenueDistributionData = [
    { name: 'Recebido', value: overview.receivedRevenue ?? 0, color: COLORS.success },
    { name: 'Pendente', value: Math.max(0, (overview.monthlyRevenue ?? 0) - (overview.receivedRevenue ?? 0) - (overview.overdueRevenue ?? 0)), color: COLORS.warning },
    { name: 'Vencido', value: overview.overdueRevenue ?? 0, color: COLORS.danger },
  ];

  const propertyStatusData = dashboard?.propertyStatus
    ? [
        { name: 'Disponíveis', value: dashboard.propertyStatus.available ?? 0, color: COLORS.success },
        { name: 'Ocupados', value: dashboard.propertyStatus.occupied ?? 0, color: COLORS.primary },
        { name: 'Vencidos', value: dashboard.propertyStatus.overdue ?? 0, color: COLORS.danger },
        { name: 'Manutenção', value: dashboard.propertyStatus.maintenance ?? 0, color: COLORS.warning },
      ]
    : [];

  const topAgenciesData = dashboard?.topAgencies?.map((agency: any) => ({
    name: agency.name?.substring(0, 15) + (agency.name?.length > 15 ? '...' : ''),
    imoveis: agency.propertyCount || 0,
    usuarios: agency.userCount || 0,
    contratos: agency.contractCount || 0,
  })) || [];

  const planDistribution = dashboard?.topAgencies?.reduce((acc: any, agency: any) => {
    const plan = agency.plan || 'starter';
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {}) || {};

  const planDistributionData = Object.entries(planDistribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: value as number,
    color: name === 'enterprise' ? COLORS.purple : name === 'professional' ? COLORS.primary : COLORS.gray,
  }));

  const totalProperties = overview.totalProperties ?? 0;
  const occupiedProperties = overview.occupiedProperties ?? 0;
  const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0;
  const defaultRate = overview.defaultRate ?? 0;

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
      {}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard Executivo</h1>
        <p className="text-muted-foreground">Visão geral da plataforma MR3X</p>
      </div>

      {}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <KPICard
          title="Agências Ativas"
          value={overview.totalAgencies ?? 0}
          icon={Briefcase}
          color="indigo"
        />
        <KPICard
          title="Usuários Registrados"
          value={overview.totalUsers ?? 0}
          icon={Users}
          color="cyan"
        />
        <KPICard
          title="Total de Imóveis"
          value={totalProperties}
          icon={Building2}
          color="blue"
        />
        <KPICard
          title="Contratos Ativos"
          value={overview.activeContracts ?? 0}
          icon={FileText}
          color="purple"
        />
      </div>

      {}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <KPICard
          title="Receita Mensal Total"
          value={formatCurrency(overview.monthlyRevenue ?? 0)}
          icon={DollarSign}
          color="green"
          isAmount
        />
        <KPICard
          title="Taxa MR3X (2%)"
          value={formatCurrency(overview.platformFee ?? 0)}
          icon={Award}
          color="yellow"
          subtitle="Receita da plataforma"
          isAmount
        />
        <KPICard
          title="Taxa de Inadimplência"
          value={`${defaultRate}%`}
          icon={AlertCircle}
          color={defaultRate > 10 ? 'red' : defaultRate > 5 ? 'yellow' : 'green'}
        />
        <KPICard
          title="Pagamentos Vencidos"
          value={overview.overdueCount ?? 0}
          icon={Clock}
          color="red"
          subtitle={formatCurrency(overview.overdueRevenue ?? 0)}
        />
      </div>

      {}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <KPICard
          title="Imóveis Ocupados"
          value={occupiedProperties}
          icon={Building2}
          color="blue"
          subtitle={`${occupancyRate}% de ocupação`}
        />
        <KPICard
          title="Imóveis Disponíveis"
          value={overview.availableProperties ?? 0}
          icon={Building2}
          color="cyan"
        />
        <KPICard
          title="Receita Recebida"
          value={formatCurrency(overview.receivedRevenue ?? 0)}
          icon={CheckCircle}
          color="green"
          subtitle="Este mês"
          isAmount
        />
        <KPICard
          title="Pagamentos Pendentes"
          value={overview.pendingPayments ?? 0}
          icon={AlertCircle}
          color="yellow"
        />
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-start gap-2">
              <PieChartIcon className="w-5 h-7 text-green-500" />
              Distribuição da Receita Mensal
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
              <Building2 className="w-5 h-5 text-blue-500" />
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
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Desempenho das Agências
            </CardTitle>
            <CardDescription>Top agências por métricas</CardDescription>
          </CardHeader>
          <CardContent>
            {topAgenciesData.length > 0 ? (
              <ChartContainer height={280}>
                <BarChart data={topAgenciesData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={80}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 12)}...` : value}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="imoveis" name="Imóveis" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="contratos" name="Contratos" fill={COLORS.success} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                <Inbox className="w-12 h-12 mb-2 opacity-50" />
                <p>Nenhuma agência encontrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-purple-500" />
              Distribuição por Plano
            </CardTitle>
            <CardDescription>Agências por tipo de plano</CardDescription>
          </CardHeader>
          <CardContent>
            {planDistributionData.length > 0 ? (
              <ChartContainer height={280}>
                <PieChart>
                  <Pie
                    data={planDistributionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(props: any) => props.value > 0 ? `${props.name}: ${props.value}` : ''}
                  >
                    {planDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                <Inbox className="w-12 h-12 mb-2 opacity-50" />
                <p>Nenhum dado disponível</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Agenda de Vencimentos
          </CardTitle>
          <CardDescription>Próximos vencimentos por imóvel</CardDescription>
        </CardHeader>
        <CardContent>
          {!dueDates || dueDates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Inbox className="w-12 h-12 mb-2 opacity-50" />
              <p>Nenhum vencimento encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-semibold p-3">Imóvel</th>
                    <th className="text-left font-semibold p-3">Inquilino</th>
                    <th className="text-left font-semibold p-3">Agência</th>
                    <th className="text-left font-semibold p-3">Vencimento</th>
                    <th className="text-left font-semibold p-3">Valor</th>
                    <th className="text-left font-semibold p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dueDates.slice(0, 10).map((item: any, idx: number) => (
                    <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="p-3">{item.propertyName || item.name || '-'}</td>
                      <td className="p-3">{item.tenant?.name || '-'}</td>
                      <td className="p-3">{item.agency?.name || '-'}</td>
                      <td className="p-3">
                        {item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="p-3">{item.monthlyRent ? formatCurrency(Number(item.monthlyRent)) : '-'}</td>
                      <td className="p-3">{getStatusBadge(item.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {}
      {dashboard?.topAgencies && dashboard.topAgencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-500" />
              Principais Agências
            </CardTitle>
            <CardDescription>Agências com maior volume de operações</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.topAgencies.map((agency: any) => (
                <div
                  key={agency.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-3"
                >
                  <div>
                    <p className="font-medium">{agency.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Plano: <span className="capitalize">{agency.plan}</span>
                    </p>
                  </div>
                  <div className="flex gap-4 sm:gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-blue-600">{agency.propertyCount}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Imóveis</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-cyan-600">{agency.userCount}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Usuários</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-green-600">{agency.contractCount}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Contratos</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {}
      {dashboard?.pendingPayments && dashboard.pendingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Pagamentos Pendentes
                </CardTitle>
                <CardDescription className='mt-1'>Contratos com pagamentos em atraso</CardDescription>
              </div>
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium w-fit">
                {dashboard.pendingPayments.length} pendentes
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.pendingPayments.slice(0, 5).map((payment: any) => (
                <div
                  key={payment.contractId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-2"
                >
                  <div>
                    <p className="font-medium">{payment.property?.name || payment.property?.address || '-'}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.tenant?.name || '-'}
                      {payment.agency?.name && ` • ${payment.agency.name}`}
                    </p>
                  </div>
                  <div className="sm:text-right">
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
            <CardDescription>Últimos pagamentos recebidos na plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.recentPayments.slice(0, 5).map((payment: any) => (
                <div
                  key={payment.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-2"
                >
                  <div>
                    <p className="font-medium">{payment.property?.name || payment.property?.address || '-'}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.tenant?.name || '-'} • {payment.date ? new Date(payment.date).toLocaleDateString('pt-BR') : '-'}
                      {payment.agency?.name && ` • ${payment.agency.name}`}
                    </p>
                  </div>
                  <div className="sm:text-right">
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
    indigo: 'bg-indigo-500/10 text-indigo-500',
  };

  return (
    <Card>
      <CardContent className="p-3 sm:p-6">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div className={`p-2 sm:p-3 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <h3 className="text-xs sm:text-sm text-muted-foreground mb-1 line-clamp-2">{title}</h3>
        <p className="text-lg sm:text-2xl font-bold truncate">
          {isAmount ? value : typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
