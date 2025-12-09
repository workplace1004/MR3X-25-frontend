import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import apiClient from '../../api/client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import {
  TrendingUp, TrendingDown, Target, DollarSign, Users,
  Percent, Clock, Award, Calendar
} from 'lucide-react';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const emptyMetrics = {
  totalLeads: 0,
  leadsThisMonth: 0,
  leadsLastMonth: 0,
  leadsGrowth: 0,
  totalConversions: 0,
  conversionsThisMonth: 0,
  conversionsLastMonth: 0,
  conversionsGrowth: 0,
  conversionRate: 0,
  conversionRateLastMonth: 0,
  conversionRateGrowth: 0,
  totalRevenue: 0,
  revenueThisMonth: 0,
  revenueLastMonth: 0,
  revenueGrowth: 0,
  expectedRevenue: 0,
  avgTicket: 0,
  avgTicketLastMonth: 0,
  avgTicketGrowth: 0,
  avgDealCycle: 0,
  avgDealCycleLastMonth: 0,
  avgDealCycleGrowth: 0,
  monthlyPerformance: [],
  funnelMetrics: [],
  revenueBySource: [],
  planDistribution: [],
  weeklyActivity: [],
  monthlyGoal: 0,
  yearlyGoal: 0,
  yearlyAchieved: 0,
};

export function SalesMetrics() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['sales-metrics'],
    queryFn: async () => {
      const response = await apiClient.get('/sales-rep/metrics');
      return response.data || emptyMetrics;
    },
  });

  const data = metrics || emptyMetrics;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getGrowthIndicator = (growth: number) => {
    if (growth > 0) {
      return (
        <span className="flex items-center gap-1 text-green-600 text-sm">
          <TrendingUp className="w-4 h-4" />
          +{growth.toFixed(1)}%
        </span>
      );
    } else if (growth < 0) {
      return (
        <span className="flex items-center gap-1 text-red-600 text-sm">
          <TrendingDown className="w-4 h-4" />
          {growth.toFixed(1)}%
        </span>
      );
    }
    return <span className="text-gray-500 text-sm">0%</span>;
  };

  const monthlyGoalProgress = useMemo(() => {
    return ((data.revenueThisMonth / data.monthlyGoal) * 100).toFixed(1);
  }, [data]);

  const yearlyGoalProgress = useMemo(() => {
    return ((data.yearlyAchieved / data.yearlyGoal) * 100).toFixed(1);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {}
      <div>
        <h1 className="text-2xl font-bold">Métricas de Vendas</h1>
        <p className="text-muted-foreground">Análise detalhada do seu desempenho</p>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leads Este Mês</p>
                <p className="text-2xl font-bold">{data.leadsThisMonth}</p>
                <div className="flex items-center gap-2 mt-1">
                  {getGrowthIndicator(data.leadsGrowth)}
                  <span className="text-xs text-muted-foreground">vs mês anterior</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversões Este Mês</p>
                <p className="text-2xl font-bold">{data.conversionsThisMonth}</p>
                <div className="flex items-center gap-2 mt-1">
                  {getGrowthIndicator(data.conversionsGrowth)}
                  <span className="text-xs text-muted-foreground">vs mês anterior</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <p className="text-2xl font-bold">{data.conversionRate}%</p>
                <div className="flex items-center gap-2 mt-1">
                  {getGrowthIndicator(data.conversionRateGrowth)}
                  <span className="text-xs text-muted-foreground">vs mês anterior</span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Percent className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Este Mês</p>
                <p className="text-2xl font-bold">{formatCurrency(data.revenueThisMonth)}</p>
                <div className="flex items-center gap-2 mt-1">
                  {getGrowthIndicator(data.revenueGrowth)}
                  <span className="text-xs text-muted-foreground">vs mês anterior</span>
                </div>
              </div>
              <div className="p-3 bg-emerald-100 rounded-full">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">{formatCurrency(data.avgTicket)}</p>
                <div className="flex items-center gap-2 mt-1">
                  {getGrowthIndicator(data.avgTicketGrowth)}
                  <span className="text-xs text-muted-foreground">vs mês anterior</span>
                </div>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Award className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ciclo Médio de Venda</p>
                <p className="text-2xl font-bold">{data.avgDealCycle} dias</p>
                <div className="flex items-center gap-2 mt-1">
                  {getGrowthIndicator(data.avgDealCycleGrowth)}
                  <span className="text-xs text-muted-foreground">vs mês anterior</span>
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Esperada</p>
                <p className="text-2xl font-bold">{formatCurrency(data.expectedRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">baseado no pipeline atual</p>
              </div>
              <div className="p-3 bg-cyan-100 rounded-full">
                <Target className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Meta Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">{formatCurrency(data.revenueThisMonth)}</span>
                <span className="text-muted-foreground">de {formatCurrency(data.monthlyGoal)}</span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                  style={{ width: `${Math.min(Number(monthlyGoalProgress), 100)}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {monthlyGoalProgress}% da meta atingida
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-500" />
              Meta Anual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">{formatCurrency(data.yearlyAchieved)}</span>
                <span className="text-muted-foreground">de {formatCurrency(data.yearlyGoal)}</span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all"
                  style={{ width: `${Math.min(Number(yearlyGoalProgress), 100)}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {yearlyGoalProgress}% da meta atingida
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Desempenho Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value: number, name: string) => [
                    name === 'revenue' ? formatCurrency(value) : value,
                    name === 'revenue' ? 'Receita' : name === 'leads' ? 'Leads' : 'Conversões'
                  ]} />
                  <Legend />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    name="Receita"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.2}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="leads"
                    name="Leads"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.2}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="conversions"
                    name="Conversões"
                    stroke="#8B5CF6"
                    fill="#8B5CF6"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Funil de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.funnelMetrics} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="stage" type="category" width={100} />
                  <Tooltip formatter={(value: number) => [value, 'Quantidade']} />
                  <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Receita por Origem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.revenueBySource}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }: PieLabelRenderProps) => `${name || ''}: ${((percent as number) * 100).toFixed(0)}%`}
                  >
                    {data.revenueBySource.map((entry: { name: string; value: number; color: string }, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Receita']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.planDistribution.map((plan: { name: string; value: number; revenue: number; color: string }) => (
                <div key={plan.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: plan.color }} />
                      <span className="font-medium">{plan.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{plan.value} clientes</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(plan.revenue)}</p>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(plan.value / data.totalConversions) * 100}%`,
                        backgroundColor: plan.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      <Card>
        <CardHeader>
          <CardTitle>Atividade Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="calls" name="Ligações" fill="#3B82F6" />
                <Bar dataKey="meetings" name="Reuniões" fill="#10B981" />
                <Bar dataKey="proposals" name="Propostas" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
