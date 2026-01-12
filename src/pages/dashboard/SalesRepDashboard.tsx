import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { useAuth } from '../../contexts/AuthContext';
import { salesRepAPI } from '../../api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import {
  TrendingUp, Users, FileText, DollarSign, Target, Award,
  Clock, CheckCircle, Inbox, Building2, Home, Phone, AlertCircle
} from 'lucide-react';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

function ChartContainer({ children, height = 256 }: { children: React.ReactNode; height?: number }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);
  if (!isMounted) {
    return (
      <div 
        style={{ height }} 
        className="flex items-center justify-center text-muted-foreground text-sm h-[180px] sm:h-auto"
      >
        Carregando...
      </div>
    );
  }
  return (
    <div style={{ width: '100%', height }} className="min-h-[180px] sm:min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function SalesRepDashboard() {
  const { user } = useAuth();

  const { data: salesStats = {
    // Lead metrics
    totalLeads: 0,
    leadsCaptured: 0,
    newLeads: 0,
    contactedLeads: 0,
    convertedLeads: 0,
    // Prospect metrics
    leadsInProgress: 0,
    conversions: 0,
    monthlyTarget: 0,
    monthlyAchieved: 0,
    totalProspects: 0,
    // Proposal metrics
    proposalsSent: 0,
    proposalsAccepted: 0,
    proposalsPending: 0,
    proposalsRejected: 0,
    // Revenue metrics
    expectedRevenue: 0,
    commissionEarned: 0,
    commissionPending: 0,
    avgTicket: 0,
    conversionRate: 0,
    // Charts and lists
    weeklyPerformance: [],
    pipelineData: [],
    recentLeads: [],
    topProspects: [],
    // Alerts
    alerts: [],
  }, isLoading } = useQuery({
    queryKey: ['sales-rep', 'stats'],
    queryFn: salesRepAPI.getStats,
  });

  const { data: agenciesMetrics } = useQuery({
    queryKey: ['sales-agencies-metrics'],
    queryFn: salesRepAPI.getAgenciesMetrics,
  });

  const progressPercentage = useMemo(() => {
    if (!salesStats) return 0;
    return ((salesStats.monthlyAchieved / salesStats.monthlyTarget) * 100).toFixed(1);
  }, [salesStats]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'prospecting':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Prospecção</span>;
      case 'qualification':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Qualificação</span>;
      case 'proposal_sent':
        return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">Proposta Enviada</span>;
      case 'negotiation':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Negociação</span>;
      case 'closed_won':
        return <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800">Fechado Ganho</span>;
      case 'closed_lost':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Fechado Perdido</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        {/* Hero Skeleton */}
        <div className="bg-gradient-to-r from-pink-600 to-rose-600 rounded-xl p-4 sm:p-6">
          <Skeleton className="h-6 sm:h-8 w-48 sm:w-64 bg-white/20 mb-2" />
          <Skeleton className="h-4 sm:h-5 w-64 sm:w-80 bg-white/20" />
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <Skeleton className="h-14 sm:h-16 w-full sm:w-40 bg-white/20 rounded-lg" />
            <Skeleton className="h-14 sm:h-16 w-full sm:w-32 bg-white/20 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6">
                <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg mb-3" />
                <Skeleton className="h-3 sm:h-4 w-20 sm:w-24 mb-2" />
                <Skeleton className="h-6 sm:h-7 w-12 sm:w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6">
                <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg mb-3" />
                <Skeleton className="h-3 sm:h-4 w-24 sm:w-28 mb-2" />
                <Skeleton className="h-6 sm:h-7 w-16 sm:w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="p-4 sm:p-6"><Skeleton className="h-5 sm:h-6 w-32 sm:w-40" /></CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="h-[200px] sm:h-[256px] flex items-end gap-2">
                  {[...Array(7)].map((_, j) => (
                    <Skeleton key={j} className="flex-1" style={{ height: `${Math.random() * 60 + 40}%` }} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {}
      <div className="bg-gradient-to-r from-pink-600 to-rose-600 rounded-xl p-4 sm:p-6 text-white">
        <div className="flex items-center gap-2 sm:gap-3">
          <Home className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
          <h1 className="text-lg sm:text-2xl font-bold truncate">
            Olá, {user?.name || 'Representante'}! 👋
          </h1>
        </div>
        <p className="text-pink-100 mt-1 text-sm sm:text-base">
          Aqui está o resumo do seu desempenho de vendas
        </p>
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="bg-white/20 rounded-lg px-3 sm:px-4 py-2 flex-1 sm:flex-none">
            <p className="text-xs sm:text-sm text-pink-100">Meta Mensal</p>
            <p className="text-lg sm:text-xl font-bold break-words">{salesStats.monthlyAchieved}/{salesStats.monthlyTarget} conversões</p>
          </div>
          <div className="bg-white/20 rounded-lg px-3 sm:px-4 py-2 flex-1 sm:flex-none">
            <p className="text-xs sm:text-sm text-pink-100">Progresso</p>
            <p className="text-lg sm:text-xl font-bold">{progressPercentage}%</p>
          </div>
        </div>
      </div>

      {}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Leads em Progresso</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{salesStats.leadsInProgress}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-full flex-shrink-0 ml-2">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Conversões</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{salesStats.conversions}</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{salesStats.conversionRate}% taxa</span>
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 rounded-full flex-shrink-0 ml-2">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Propostas Enviadas</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{salesStats.proposalsSent}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {salesStats.proposalsPending} pendentes
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 rounded-full flex-shrink-0 ml-2">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Receita Esperada</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 break-words">{formatCurrency(salesStats.expectedRevenue)}</p>
              </div>
              <div className="p-2 sm:p-3 bg-emerald-100 rounded-full flex-shrink-0 ml-2">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads and Commissions Section */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Pistas Capturadas</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{salesStats.leadsCaptured || salesStats.totalLeads || 0}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {salesStats.newLeads || 0} novas
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-cyan-100 rounded-full flex-shrink-0 ml-2">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Pistas Contatadas</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{salesStats.contactedLeads || 0}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {salesStats.convertedLeads || 0} convertidas
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-orange-100 rounded-full flex-shrink-0 ml-2">
                <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Comissões Ganhas</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 break-words">{formatCurrency(salesStats.commissionEarned || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {formatCurrency(salesStats.commissionPending || 0)} pendentes
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-amber-100 rounded-full flex-shrink-0 ml-2">
                <Award className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Propostas Aprovadas</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{salesStats.proposalsAccepted || 0}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {salesStats.proposalsRejected || 0} rejeitadas
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-indigo-100 rounded-full flex-shrink-0 ml-2">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Important Alerts Section */}
      {salesStats.alerts && salesStats.alerts.length > 0 && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
              <span>Alertas Importantes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-3">
              {salesStats.alerts.map((alert: any, index: number) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    alert.priority === 'urgent'
                      ? 'bg-red-50 border-red-200'
                      : alert.priority === 'high'
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm sm:text-base">{alert.title}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">{alert.message}</p>
                    </div>
                    {alert.actionUrl && (
                      <a
                        href={alert.actionUrl}
                        className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium flex-shrink-0"
                      >
                        Ver →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agency Sign-ups Section */}
      {agenciesMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Agências Cadastradas</p>
                  <p className="text-xl sm:text-2xl font-bold mt-1">{agenciesMetrics.totalAgencies}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{agenciesMetrics.activeAgencies} ativas</span>
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-100 rounded-full flex-shrink-0 ml-2">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Status de Ativação</p>
                  <p className="text-xl sm:text-2xl font-bold mt-1">{agenciesMetrics.activeAgencies}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    de {agenciesMetrics.totalAgencies} agências
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-full flex-shrink-0 ml-2">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Total de Usuários</p>
                  <p className="text-xl sm:text-2xl font-bold mt-1">{agenciesMetrics.totalUsers}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Em todas as agências
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-purple-100 rounded-full flex-shrink-0 ml-2">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
              <span>Desempenho Semanal</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {salesStats.weeklyPerformance && salesStats.weeklyPerformance.length > 0 ? (
              <ChartContainer height={200}>
                <AreaChart data={salesStats.weeklyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (typeof value === 'string' && value.startsWith('Sem ')) {
                        return value.replace('Sem ', 'Sem. ');
                      }
                      return value;
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    name="Leads"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="conversions"
                    name="Conversões"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                <p>Nenhum dado disponível</p>
              </div>
            )}
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 flex-shrink-0" />
              <span>Distribuição do Pipeline</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {salesStats.pipelineData && salesStats.pipelineData.length > 0 && salesStats.pipelineData.some((entry: any) => entry.value > 0) ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ChartContainer height={200}>
                  <PieChart>
                    <Pie
                      data={salesStats.pipelineData.filter((entry: any) => entry.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      label={false}
                    >
                      {salesStats.pipelineData
                        .filter((entry: any) => entry.value > 0)
                        .map((entry: { name: string; value: number; color: string }, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, 'Quantidade']} />
                  </PieChart>
                </ChartContainer>
                <div className="flex-1 w-full sm:w-auto space-y-2">
                  {salesStats.pipelineData
                    .filter((entry: any) => entry.value > 0)
                    .map((entry: { name: string; value: number; color: string }, index: number) => {
                      const total = salesStats.pipelineData.reduce((sum: number, e: any) => sum + e.value, 0);
                      const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
                      return (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: entry.color || COLORS[index % COLORS.length] }}
                            />
                            <span className="text-xs sm:text-sm truncate">{entry.name}</span>
                          </div>
                          <span className="text-xs sm:text-sm font-medium ml-2">{percentage}%</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                <p>Nenhum dado disponível</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0" />
              <span>Comissões</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Ganho</p>
                <p className="text-lg sm:text-xl font-bold text-green-600 break-words">{formatCurrency(salesStats.commissionEarned)}</p>
              </div>
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0 ml-2" />
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Pendente</p>
                <p className="text-lg sm:text-xl font-bold text-yellow-600 break-words">{formatCurrency(salesStats.commissionPending)}</p>
              </div>
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 flex-shrink-0 ml-2" />
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs sm:text-sm text-muted-foreground">Ticket Médio</p>
              <p className="text-base sm:text-lg font-semibold break-words">{formatCurrency(salesStats.avgTicket)}</p>
            </div>
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
              <span>Status das Propostas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {salesStats.proposalsAccepted > 0 || salesStats.proposalsPending > 0 || salesStats.proposalsRejected > 0 ? (
              <ChartContainer height={180}>
                <BarChart
                  data={[
                    { name: 'Aceitas', value: salesStats.proposalsAccepted || 0, fill: '#10B981' },
                    { name: 'Pendentes', value: salesStats.proposalsPending || 0, fill: '#F59E0B' },
                    { name: 'Rejeitadas', value: salesStats.proposalsRejected || 0, fill: '#EF4444' },
                  ]}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [value, 'Propostas']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
                <p>Nenhuma proposta encontrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0" />
              <span>Top Prospects</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {salesStats.topProspects && salesStats.topProspects.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {salesStats.topProspects.map((prospect: { name: string; value: number; probability: number }, index: number) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs sm:text-sm font-medium truncate flex-1">{prospect.name}</span>
                      <span className="text-xs sm:text-sm font-semibold text-emerald-600 whitespace-nowrap">{formatCurrency(prospect.value || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(prospect.probability || 0, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground min-w-[2.5rem] sm:min-w-[3rem] text-right">
                        {prospect.probability || 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-muted-foreground">
                <Target className="w-10 h-10 sm:w-12 sm:h-12 mb-2 sm:mb-3 opacity-50" />
                <p className="text-xs sm:text-sm">Nenhum prospect encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
            <span>Leads Recentes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {salesStats.recentLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-muted-foreground px-4">
              <Inbox className="w-10 h-10 sm:w-12 sm:h-12 mb-2 sm:mb-3 opacity-50" />
              <p className="text-xs sm:text-sm">Nenhum lead encontrado</p>
            </div>
          ) : (
            <>
              {/* Mobile stacked list */}
              <div className="flex flex-col gap-3 px-4 pb-4 sm:hidden">
                {salesStats.recentLeads.map((lead: { id: number; name: string; contact: string; status: string; value: number; date: string }) => (
                  <div key={lead.id} className="p-3 rounded-lg border bg-white shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{lead.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{lead.contact}</p>
                      </div>
                      <div className="flex-shrink-0">{getStatusBadge(lead.status)}</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Valor</span>
                      <span className="font-semibold">{formatCurrency(lead.value)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Data</span>
                      <span>{new Date(lead.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="overflow-x-auto hidden sm:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Agência</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Contato</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Valor</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesStats.recentLeads.map((lead: { id: number; name: string; contact: string; status: string; value: number; date: string }) => (
                      <tr key={lead.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-none">{lead.name}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-muted-foreground truncate max-w-[100px] sm:max-w-none">{lead.contact}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4">{getStatusBadge(lead.status)}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap">{formatCurrency(lead.value)}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(lead.date).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
