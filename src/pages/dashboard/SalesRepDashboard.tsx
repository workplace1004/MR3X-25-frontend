import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../api/client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import {
  TrendingUp, Users, FileText, DollarSign, Target, Award,
  Clock, CheckCircle
} from 'lucide-react';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

const mockStats = {
  leadsInProgress: 12,
  conversions: 8,
  monthlyTarget: 15,
  monthlyAchieved: 8,
  totalProspects: 45,
  proposalsSent: 18,
  proposalsAccepted: 8,
  proposalsPending: 6,
  proposalsRejected: 4,
  expectedRevenue: 125000,
  commissionEarned: 8500,
  commissionPending: 3200,
  avgTicket: 15625,
  conversionRate: 44.4,
  weeklyPerformance: [
    { week: 'Sem 1', leads: 10, conversions: 4 },
    { week: 'Sem 2', leads: 12, conversions: 5 },
    { week: 'Sem 3', leads: 8, conversions: 3 },
    { week: 'Sem 4', leads: 15, conversions: 8 },
  ],
  pipelineData: [
    { name: 'Prospecção', value: 15, color: '#3B82F6' },
    { name: 'Qualificação', value: 10, color: '#F59E0B' },
    { name: 'Proposta Enviada', value: 8, color: '#8B5CF6' },
    { name: 'Negociação', value: 5, color: '#10B981' },
    { name: 'Fechado Ganho', value: 8, color: '#22C55E' },
    { name: 'Fechado Perdido', value: 4, color: '#EF4444' },
  ],
  recentLeads: [
    { id: 1, name: 'Imobiliária Centro', contact: 'João Silva', status: 'negotiation', value: 25000, date: '2024-12-01' },
    { id: 2, name: 'Imóveis Premium', contact: 'Maria Santos', status: 'proposal_sent', value: 18000, date: '2024-11-30' },
    { id: 3, name: 'Casa & Lar', contact: 'Pedro Costa', status: 'qualification', value: 12000, date: '2024-11-29' },
    { id: 4, name: 'Invest Imóveis', contact: 'Ana Oliveira', status: 'prospecting', value: 30000, date: '2024-11-28' },
  ],
  topProspects: [
    { name: 'Imobiliária Centro', value: 25000, probability: 80 },
    { name: 'Invest Imóveis', value: 30000, probability: 45 },
    { name: 'Imóveis Premium', value: 18000, probability: 60 },
  ],
};

export function SalesRepDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['sales-rep-stats'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/sales-rep/stats');
        return response.data;
      } catch {
        return mockStats;
      }
    },
    staleTime: 30000,
  });

  const salesStats = stats || mockStats;

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-pink-600 to-rose-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">
          Olá, {user?.name || 'Representante'}! 👋
        </h1>
        <p className="text-pink-100 mt-1">
          Aqui está o resumo do seu desempenho de vendas
        </p>
        <div className="mt-4 flex items-center gap-4">
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <p className="text-sm text-pink-100">Meta Mensal</p>
            <p className="text-xl font-bold">{salesStats.monthlyAchieved}/{salesStats.monthlyTarget} conversões</p>
          </div>
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <p className="text-sm text-pink-100">Progresso</p>
            <p className="text-xl font-bold">{progressPercentage}%</p>
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leads em Progresso</p>
                <p className="text-2xl font-bold">{salesStats.leadsInProgress}</p>
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
                <p className="text-sm text-muted-foreground">Conversões</p>
                <p className="text-2xl font-bold">{salesStats.conversions}</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  {salesStats.conversionRate}% taxa
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Propostas Enviadas</p>
                <p className="text-2xl font-bold">{salesStats.proposalsSent}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {salesStats.proposalsPending} pendentes
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Esperada</p>
                <p className="text-2xl font-bold">{formatCurrency(salesStats.expectedRevenue)}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-full">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Desempenho Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesStats.weeklyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
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
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              Distribuição do Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesStats.pipelineData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }: PieLabelRenderProps) => `${name || ''}: ${((percent as number) * 100).toFixed(0)}%`}
                  >
                    {salesStats.pipelineData.map((entry: { name: string; value: number; color: string }, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Quantidade']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission and Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Commission Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Comissões
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Ganho</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(salesStats.commissionEarned)}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-xl font-bold text-yellow-600">{formatCurrency(salesStats.commissionPending)}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
              <p className="text-lg font-semibold">{formatCurrency(salesStats.avgTicket)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Proposal Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Status das Propostas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Aceitas', value: salesStats.proposalsAccepted, fill: '#10B981' },
                    { name: 'Pendentes', value: salesStats.proposalsPending, fill: '#F59E0B' },
                    { name: 'Rejeitadas', value: salesStats.proposalsRejected, fill: '#EF4444' },
                  ]}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Prospects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-500" />
              Top Prospects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salesStats.topProspects.map((prospect: { name: string; value: number; probability: number }, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{prospect.name}</span>
                    <span className="text-sm text-muted-foreground">{formatCurrency(prospect.value)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${prospect.probability}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{prospect.probability}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Leads Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Agência</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Contato</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Valor</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody>
                {salesStats.recentLeads.map((lead: { id: number; name: string; contact: string; status: string; value: number; date: string }) => (
                  <tr key={lead.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium">{lead.name}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{lead.contact}</td>
                    <td className="py-3 px-4">{getStatusBadge(lead.status)}</td>
                    <td className="py-3 px-4 text-sm">{formatCurrency(lead.value)}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {new Date(lead.date).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
