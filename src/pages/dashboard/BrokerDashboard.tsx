import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../../api';
import { formatCurrency } from '../../lib/utils';
import {
  Home, Building2, FileText, DollarSign, Users, Clock,
  CheckCircle, AlertTriangle, TrendingUp, Calendar, Briefcase,
  Receipt, CreditCard, PieChart as PieChartIcon
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { useMemo } from 'react';

export function BrokerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['broker-dashboard', user?.id],
    queryFn: () => dashboardAPI.getDashboard(),
  });

  const { data: dueDates } = useQuery({
    queryKey: ['broker-due-dates', user?.id],
    queryFn: () => dashboardAPI.getDueDates(),
  });

  const chartData = useMemo(() => {
    const recentPayments = dashboard?.recentPayments || [];
    const properties = dashboard?.properties || [];
    const overview = dashboard?.overview || {};

    const monthlyTrend: Record<string, number> = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      monthlyTrend[key] = 0;
    }

    recentPayments.forEach((payment: any) => {
      if (payment.date) {
        const date = new Date(payment.date);
        const key = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        if (monthlyTrend[key] !== undefined) {
          monthlyTrend[key] += Number(payment.amount) || 0;
        }
      }
    });

    const monthlyData = Object.entries(monthlyTrend).map(([month, total]) => ({
      month,
      total,
    }));

    const propertyStatusData = [
      { name: 'Ocupados', value: overview.occupiedProperties || 0, color: '#22c55e' },
      { name: 'Em Negociação', value: overview.inNegotiationProperties || 0, color: '#f59e0b' },
      { name: 'Disponíveis', value: overview.availableProperties || 0, color: '#3b82f6' },
      { name: 'Manutenção', value: overview.maintenanceProperties || 0, color: '#ef4444' },
    ].filter(item => item.value > 0);

    const dueData = dueDates || [];
    const paymentStatusData = [
      { name: 'Em dia', value: dueData.filter((d: any) => d.status === 'ok').length, color: '#22c55e' },
      { name: 'Próximos', value: dueData.filter((d: any) => d.status === 'upcoming').length, color: '#f59e0b' },
      { name: 'Vencidos', value: dueData.filter((d: any) => d.status === 'overdue').length, color: '#ef4444' },
    ].filter(item => item.value > 0);

    const revenueByProperty: Record<string, { name: string; total: number }> = {};
    recentPayments.forEach((payment: any) => {
      const propName = payment.property?.name || payment.property?.address || 'Outros';
      if (!revenueByProperty[propName]) {
        revenueByProperty[propName] = { name: propName.length > 15 ? propName.substring(0, 15) + '...' : propName, total: 0 };
      }
      revenueByProperty[propName].total += Number(payment.amount) || 0;
    });

    const propertyRevenueData = Object.values(revenueByProperty)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const totalRevenue = recentPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const avgRent = properties.length > 0
      ? properties.reduce((sum: number, p: any) => sum + (Number(p.monthlyRent) || 0), 0) / properties.length
      : 0;

    return {
      monthlyData,
      propertyStatusData,
      paymentStatusData,
      propertyRevenueData,
      totalRevenue,
      avgRent,
    };
  }, [dashboard, dueDates]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="w-8 h-8 rounded" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="w-12 h-12 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="w-full h-[250px]" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick actions skeleton */}
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overview = dashboard?.overview || {};
  const properties = dashboard?.properties || [];
  const pendingContracts = dashboard?.pendingPayments || [];
  const recentPayments = dashboard?.recentPayments || [];

  const totalProperties = overview.totalProperties || properties.length || 0;
  const occupiedProperties = overview.occupiedProperties || 0;
  const inNegotiationProperties = overview.inNegotiationProperties || 0;
  const activeContracts = overview.activeContracts || 0;
  const inNegotiationContracts = overview.inNegotiationContracts || 0;
  const monthlyRevenue = overview.monthlyRevenue || 0;
  // Use backend-calculated occupancy rate (based on fully signed contracts only)
  const occupancyRate = overview.occupancyRate !== undefined 
    ? overview.occupancyRate 
    : (totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0);

  const upcomingDueDates = dueDates?.filter((d: any) => d.status === 'upcoming' || d.status === 'overdue') || [];

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Olá, ${user?.name || 'Corretor'}!`}
        subtitle="Gerencie seus imóveis, contratos e acompanhe o desempenho dos imóveis sob sua responsabilidade"
      />
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Briefcase className="w-8 h-8" />
          <h1 className="text-2xl font-bold">
            Olá, {user?.name || 'Corretor'}!
          </h1>
        </div>
        <p className="text-amber-100">
          Gerencie seus imóveis, contratos e acompanhe o desempenho dos imóveis sob sua responsabilidade.
        </p>
      </div>

      {}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Meus Imóveis</p>
                <p className="text-2xl font-bold text-blue-700">{totalProperties}</p>
              </div>
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Ocupados</p>
                <p className="text-2xl font-bold text-green-700">{occupiedProperties}</p>
              </div>
              <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Contratos Ativos</p>
                <p className="text-2xl font-bold text-purple-700">{activeContracts}</p>
              </div>
              <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Receita Mensal</p>
                <p className="text-xl font-bold text-amber-700">{formatCurrency(monthlyRevenue)}</p>
              </div>
              <div className="w-12 h-12 bg-amber-200 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cyan-600 font-medium">Taxa Ocupação</p>
                <p className="text-2xl font-bold text-cyan-700">{occupancyRate}%</p>
                <p className="text-xs text-cyan-500 mt-1">
                  {inNegotiationProperties > 0 && `${inNegotiationProperties} em negociação`}
                </p>
              </div>
              <div className="w-12 h-12 bg-cyan-200 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property Status Breakdown */}
      {(inNegotiationProperties > 0 || inNegotiationContracts > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-800">
                  {inNegotiationProperties} {inNegotiationProperties === 1 ? 'imóvel' : 'imóveis'} em negociação
                </p>
                <p className="text-xs text-orange-600">
                  {inNegotiationContracts} {inNegotiationContracts === 1 ? 'contrato' : 'contratos'} aguardando assinaturas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Evolução da Receita
            </CardTitle>
            <CardDescription>Receita mensal dos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.monthlyData.some(d => d.total > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData.monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" fontSize={11} tick={{ fill: '#6B7280' }} />
                  <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} fontSize={11} tick={{ fill: '#6B7280' }} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Receita']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum dado de receita disponível</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-blue-500" />
              Status dos Imóveis
            </CardTitle>
            <CardDescription>Distribuição por status de ocupação</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.propertyStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={chartData.propertyStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }: { name?: string; value?: number; percent?: number }) => 
                      value && value > 0 ? `${name || ''}: ${value}` : ''
                    }
                    labelLine={true}
                  >
                    {chartData.propertyStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [`${value} imóveis`, name]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={50}
                    formatter={(value) => value}
                    wrapperStyle={{ paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum imóvel cadastrado</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="w-5 h-5 text-green-500" />
              Status dos Pagamentos
            </CardTitle>
            <CardDescription>Situação dos vencimentos</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.paymentStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={chartData.paymentStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {chartData.paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum dado de pagamento</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-500" />
              Receita por Imóvel
            </CardTitle>
            <CardDescription>Top 5 imóveis por receita</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.propertyRevenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData.propertyRevenueData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} fontSize={11} />
                  <YAxis type="category" dataKey="name" width={100} fontSize={10} tick={{ fill: '#6B7280' }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="total" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum pagamento registrado</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Ações Rápidas</CardTitle>
          <CardDescription>Acesse rapidamente as principais funções</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
              onClick={() => navigate('/dashboard/properties')}
            >
              <Building2 className="w-6 h-6 text-blue-500" />
              <span className="text-sm">Meus Imóveis</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-purple-50 hover:border-purple-300"
              onClick={() => navigate('/dashboard/contracts')}
            >
              <FileText className="w-6 h-6 text-purple-500" />
              <span className="text-sm">Meus Contratos</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-green-50 hover:border-green-300"
              onClick={() => navigate('/dashboard/tenants')}
            >
              <Users className="w-6 h-6 text-green-500" />
              <span className="text-sm">Inquilinos</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-amber-50 hover:border-amber-300"
              onClick={() => navigate('/dashboard/payments')}
            >
              <DollarSign className="w-6 h-6 text-amber-500" />
              <span className="text-sm">Pagamentos</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-lg">Meus Imóveis</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/properties')}>
                Ver Todos
              </Button>
            </div>
            <CardDescription>Imóveis sob sua responsabilidade</CardDescription>
          </CardHeader>
          <CardContent>
            {properties.length > 0 ? (
              <div className="space-y-3">
                {properties.slice(0, 5).map((property: any) => (
                  <div
                    key={property.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/dashboard/properties/${property.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Home className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{property.name || 'Imóvel'}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {property.address}
                        </p>
                      </div>
                    </div>
                    <Badge className={
                      property.status === 'ALUGADO' ? 'bg-green-100 text-green-700' :
                      property.status === 'DISPONIVEL' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {property.status === 'ALUGADO' ? 'Alugado' :
                       property.status === 'DISPONIVEL' ? 'Disponível' :
                       property.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum imóvel atribuído</p>
              </div>
            )}
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-500" />
                <CardTitle className="text-lg">Vencimentos</CardTitle>
              </div>
              {upcomingDueDates.length > 0 && (
                <Badge className="bg-orange-100 text-orange-700">
                  {upcomingDueDates.length} pendentes
                </Badge>
              )}
            </div>
            <CardDescription>Próximos vencimentos dos seus imóveis</CardDescription>
          </CardHeader>
          <CardContent>
            {dueDates && dueDates.length > 0 ? (
              <div className="space-y-3">
                {dueDates.slice(0, 5).map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        item.status === 'overdue' ? 'bg-red-100' :
                        item.status === 'upcoming' ? 'bg-yellow-100' :
                        'bg-green-100'
                      }`}>
                        {item.status === 'overdue' ? (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        ) : item.status === 'upcoming' ? (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{item.propertyName || item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.tenant?.name || 'Sem inquilino'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {item.nextDueDate || item.dueDate
                          ? new Date(item.nextDueDate || item.dueDate).toLocaleDateString('pt-BR')
                          : '-'}
                      </p>
                      <Badge variant="outline" className={`text-xs ${
                        item.status === 'overdue' ? 'border-red-300 text-red-700' :
                        item.status === 'upcoming' ? 'border-yellow-300 text-yellow-700' :
                        'border-green-300 text-green-700'
                      }`}>
                        {item.status === 'overdue' ? 'Vencido' :
                         item.status === 'upcoming' ? 'Próximo' :
                         'Em dia'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum vencimento próximo</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-500" />
              <CardTitle className="text-lg">Pagamentos Recentes</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/payments')}>
              Ver Todos
            </Button>
          </div>
          <CardDescription>Últimos pagamentos recebidos</CardDescription>
        </CardHeader>
        <CardContent>
          {recentPayments.length > 0 ? (
            <div className="space-y-3">
              {recentPayments.slice(0, 5).map((payment: any) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{payment.property?.name || payment.property?.address}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.tenant?.name} • {payment.date
                          ? new Date(payment.date).toLocaleDateString('pt-BR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {formatCurrency(Number(payment.amount) || 0)}
                    </p>
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      Pago
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum pagamento recente</p>
            </div>
          )}
        </CardContent>
      </Card>

      {}
      {pendingContracts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-700">Pagamentos Pendentes</h4>
                <p className="text-sm text-red-600 mt-1">
                  Você tem {pendingContracts.length} pagamento(s) pendente(s) ou em atraso.
                </p>
                <Button
                  className="mt-3 bg-red-600 hover:bg-red-700"
                  size="sm"
                  onClick={() => navigate('/dashboard/payments')}
                >
                  Ver Pagamentos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
