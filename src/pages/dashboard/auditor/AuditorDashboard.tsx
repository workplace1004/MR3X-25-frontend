import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import {
  Building2, FileText, Receipt, FileSignature, Server, Eye, Users,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, DollarSign, Loader2
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { auditorAPI } from '../../../api';

// Chart container to prevent -1 dimension errors
function ChartContainer({ children, height = 220 }: { children: React.ReactNode; height?: number }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);
  if (!isMounted) {
    return <div style={{ height }} className="flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

const iconMap: Record<string, any> = {
  Building2,
  FileText,
  Receipt,
  FileSignature,
  Server,
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export function AuditorDashboard() {
  // Fetch all auditor dashboard data
  const { data: metrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ['auditor', 'metrics'],
    queryFn: auditorAPI.getDashboardMetrics,
  });

  const { data: agencyPlanData = [], isLoading: agencyLoading } = useQuery({
    queryKey: ['auditor', 'agency-plan-distribution'],
    queryFn: auditorAPI.getAgencyPlanDistribution,
  });

  const { data: contractStatusData = [], isLoading: contractLoading } = useQuery({
    queryKey: ['auditor', 'contract-status-distribution'],
    queryFn: auditorAPI.getContractStatusDistribution,
  });

  const { data: monthlyTransactionsData = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['auditor', 'monthly-transactions'],
    queryFn: auditorAPI.getMonthlyTransactions,
  });

  const { data: signatureActivityData = [], isLoading: signatureLoading } = useQuery({
    queryKey: ['auditor', 'signature-activity'],
    queryFn: auditorAPI.getSignatureActivity,
  });

  const { data: userRoleData = [], isLoading: userRoleLoading } = useQuery({
    queryKey: ['auditor', 'user-role-distribution'],
    queryFn: auditorAPI.getUserRoleDistribution,
  });

  const { data: paymentStatusData = [], isLoading: paymentLoading } = useQuery({
    queryKey: ['auditor', 'payment-status-distribution'],
    queryFn: auditorAPI.getPaymentStatusDistribution,
  });

  const { data: logsData = [], isLoading: logsLoading } = useQuery({
    queryKey: ['auditor', 'logs-summary'],
    queryFn: auditorAPI.getLogsSummary,
  });

  const { data: revenueTrendData = [], isLoading: revenueLoading } = useQuery({
    queryKey: ['auditor', 'revenue-trend'],
    queryFn: auditorAPI.getRevenueTrend,
  });

  const { data: recentActivity = [], isLoading: activityLoading } = useQuery({
    queryKey: ['auditor', 'recent-activity'],
    queryFn: auditorAPI.getRecentActivity,
  });

  const { data: systemStatus = [], isLoading: statusLoading } = useQuery({
    queryKey: ['auditor', 'system-status'],
    queryFn: auditorAPI.getSystemStatus,
  });

  const { data: summaryStats = {}, isLoading: summaryLoading } = useQuery({
    queryKey: ['auditor', 'summary-stats'],
    queryFn: auditorAPI.getSummaryStats,
  });

  const isLoading = metricsLoading || agencyLoading || contractLoading || transactionsLoading ||
    signatureLoading || userRoleLoading || paymentLoading || logsLoading || revenueLoading ||
    activityLoading || statusLoading || summaryLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gray-100 rounded-lg">
          <Eye className="w-6 h-6 text-gray-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
      </div>

      {/* Read-Only Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4 flex items-center gap-3">
          <Eye className="w-5 h-5 text-amber-600" />
          <p className="text-sm text-amber-800">
            <strong>Modo Somente Leitura:</strong> Você tem acesso de visualização a todos os dados do sistema para fins de auditoria. Nenhuma modificação é permitida.
          </p>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((metric: any) => {
          const IconComponent = iconMap[metric.icon] || Building2;
          return (
            <Card key={metric.title}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={`p-2 ${metric.bgColor} rounded-lg`}>
                    <IconComponent className={`w-5 h-5 ${metric.color}`} />
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${
                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {metric.change}
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold">
                    {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{metric.title}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row 1 - Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agency Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Distribuição de Agências por Plano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer height={220}>
              <PieChart>
                <Pie
                  data={agencyPlanData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {agencyPlanData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-2">
              {agencyPlanData.map((item: any) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contract Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Status dos Contratos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer height={220}>
              <PieChart>
                <Pie
                  data={contractStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  label={({ percent }: any) => `${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {contractStatusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Payment Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Status dos Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer height={220}>
              <PieChart>
                <Pie
                  data={paymentStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  label={({ percent }: any) => `${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {paymentStatusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 - Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transações Mensais</CardTitle>
            <CardDescription>Volume de transações e receita nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer height={280}>
              <BarChart data={monthlyTransactionsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis yAxisId="left" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? formatCurrency(value) : value.toLocaleString(),
                    name === 'revenue' ? 'Receita' : 'Transações'
                  ]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="transactions" name="Transações" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="revenue" name="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tendência de Receita</CardTitle>
            <CardDescription>Receita total e taxa MR3X (2%)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer height={280}>
              <AreaChart data={revenueTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `R$${(v/1000000).toFixed(1)}M`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Area type="monotone" dataKey="receita" name="Receita Total" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Area type="monotone" dataKey="taxa" name="Taxa MR3X" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signature Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSignature className="w-4 h-4" />
              Atividade de Assinaturas (Última Semana)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer height={250}>
              <LineChart data={signatureActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="assinaturas" name="Assinaturas" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="verificacoes" name="Verificações" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Distribuição de Usuários por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer height={250}>
              <BarChart data={userRoleData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={12} />
                <YAxis dataKey="name" type="category" fontSize={12} width={80} />
                <Tooltip />
                <Bar dataKey="value" name="Usuários" radius={[0, 4, 4, 0]}>
                  {userRoleData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Activity & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Logs Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logs do Sistema (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer height={200}>
              <BarChart data={logsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" fontSize={11} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" name="Registros" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[200px] overflow-y-auto">
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Nenhuma atividade recente</p>
              ) : (
                recentActivity.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <span className="text-xs text-muted-foreground w-12">{item.time}</span>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      item.type === 'success' ? 'bg-green-500' :
                      item.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <span className="text-sm truncate">{item.event}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status dos Serviços</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[200px] overflow-y-auto">
              {systemStatus.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Nenhum serviço encontrado</p>
              ) : (
                systemStatus.map((service: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm">{service.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{service.latency}</span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
              <CheckCircle className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{summaryStats.successRate || '0%'}</p>
            <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-yellow-600 mb-2">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{summaryStats.avgResponseTime || '0s'}</p>
            <p className="text-xs text-muted-foreground">Tempo Médio Resp.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{(summaryStats.activeUsers || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Usuários Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-purple-600 mb-2">
              <FileSignature className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{(summaryStats.weeklySignatures || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Assinaturas/Semana</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-orange-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{summaryStats.delinquencyRate || '0%'}</p>
            <p className="text-xs text-muted-foreground">Inadimplência</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
              <DollarSign className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{summaryStats.monthlyFee || 'R$ 0'}</p>
            <p className="text-xs text-muted-foreground">Taxa MR3X (Mês)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
