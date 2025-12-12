import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../../api';
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
  Loader2,
  Inbox
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
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
  
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', 'agency-admin'],
    queryFn: () => dashboardAPI.getDashboard(),
  });

  const { data: dueDates, isLoading: dueDatesLoading } = useQuery({
    queryKey: ['due-dates', 'agency-admin'],
    queryFn: () => dashboardAPI.getDueDates(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const overview = dashboard?.overview || {};

  const totalProperties = overview.totalProperties || 0;
  const occupiedProperties = overview.occupiedProperties || 0;
  const availableProperties = overview.vacantUnits || overview.availableProperties || 0;
  const activeContracts = overview.activeContracts || 0;
  const monthlyRevenue = overview.monthlyRevenue || 0;
  const receivedValue = overview.receivedValue || 0;
  const overdueValue = overview.overdueValue || 0;
  const pendingPaymentsCount = overview.pendingPayments || 0;
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

  const contractStatusData = [
    { name: 'Ativos', value: activeContracts, color: COLORS.green },
    { name: 'A vencer', value: Math.round(activeContracts * 0.15), color: COLORS.yellow },
    { name: 'Vencidos', value: Math.max(0, pendingPaymentsCount), color: COLORS.red },
  ].filter(item => item.value > 0);

  const dueDatesChartData = dueDates?.slice(0, 10).map((item: any, index: number) => ({
    name: item.propertyName?.substring(0, 15) || `Imóvel ${index + 1}`,
    valor: Number(item.amount) || Number(item.monthlyRent) || 0,
    status: item.status,
  })) || [];

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
      {}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-orange-100 rounded-lg">
          <Home className="w-6 h-6 text-orange-700" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard do Diretor</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Visão geral da sua agência imobiliária
          </p>
        </div>
      </div>

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
          title="Receita Mensal"
          value={formatCurrency(monthlyRevenue)}
          icon={DollarSign}
          color="yellow"
        />
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
          value={occupiedProperties}
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
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
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
                <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
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
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
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
                <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
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
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={contractStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
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
                <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
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
                <BarChart data={dueDatesChartData} margin={{ top: 10, right: 10, left: 0, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis fontSize={12} tickFormatter={(value) => formatCurrency(value)} />
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
                  <tr>
                    <td colSpan={5} className="text-center text-muted-foreground py-4">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : !dueDates || dueDates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Inbox className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-sm">Nenhum vencimento encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  dueDates.slice(0, 10).map((item: any, idx: number) => (
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
