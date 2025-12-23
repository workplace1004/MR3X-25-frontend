import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { salesRepAPI } from '../../api';
import {
  FileDown, Download, Calendar, TrendingUp, Users, DollarSign,
  Building2, BarChart3, FileText
} from 'lucide-react';

export function SalesReports() {
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year' | 'all'>('month');

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['sales-metrics'],
    queryFn: salesRepAPI.getStats,
  });

  const { data: agenciesMetrics, isLoading: agenciesLoading } = useQuery({
    queryKey: ['sales-agencies-metrics'],
    queryFn: salesRepAPI.getAgenciesMetrics,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      alert('Nenhum dado para exportar');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    window.print();
  };

  const exportSalesReport = () => {
    const reportData = {
      periodo: dateRange,
      dataGeracao: new Date().toLocaleString('pt-BR'),
      metricas: {
        totalLeads: metrics?.totalLeads || 0,
        conversoes: metrics?.totalConversions || 0,
        taxaConversao: `${metrics?.conversionRate || 0}%`,
        receitaTotal: formatCurrency(metrics?.totalRevenue || 0),
        receitaMes: formatCurrency(metrics?.revenueThisMonth || 0),
        ticketMedio: formatCurrency(metrics?.avgTicket || 0),
      },
      agencias: {
        total: agenciesMetrics?.totalAgencies || 0,
        ativas: agenciesMetrics?.activeAgencies || 0,
        inativas: agenciesMetrics?.inactiveAgencies || 0,
        totalUsuarios: agenciesMetrics?.totalUsers || 0,
        totalImoveis: agenciesMetrics?.totalProperties || 0,
      },
      performance: {
        leadsMes: metrics?.leadsThisMonth || 0,
        conversoesMes: metrics?.conversionsThisMonth || 0,
        receitaMes: formatCurrency(metrics?.revenueThisMonth || 0),
      },
    };

    const csvData = [
      {
        'Período': dateRange,
        'Data Geração': reportData.dataGeracao,
        'Total Leads': reportData.metricas.totalLeads,
        'Conversões': reportData.metricas.conversoes,
        'Taxa Conversão': reportData.metricas.taxaConversao,
        'Receita Total': reportData.metricas.receitaTotal,
        'Receita Mês': reportData.metricas.receitaMes,
        'Ticket Médio': reportData.metricas.ticketMedio,
        'Total Agências': reportData.agencias.total,
        'Agências Ativas': reportData.agencias.ativas,
        'Total Usuários': reportData.agencias.totalUsuarios,
        'Total Imóveis': reportData.agencias.totalImoveis,
      }
    ];

    exportToCSV(csvData, 'relatorio_vendas');
  };

  if (metricsLoading || agenciesLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Skeleton className="w-7 h-7" />
              <Skeleton className="h-9 w-64" />
            </div>
            <Skeleton className="h-5 w-96 mt-1" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Date Range Selector Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detailed Reports Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div key={j} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Plan Distribution Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center p-4 border rounded-lg">
                  <Skeleton className="h-8 w-12 mx-auto mb-2" />
                  <Skeleton className="h-4 w-20 mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-bold">Relatórios de Vendas</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Relatórios e análises de performance de vendas
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportSalesReport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={exportToPDF} variant="outline">
            <FileDown className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Período do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={dateRange === 'month' ? 'default' : 'outline'}
              onClick={() => setDateRange('month')}
            >
              Mês Atual
            </Button>
            <Button
              variant={dateRange === 'quarter' ? 'default' : 'outline'}
              onClick={() => setDateRange('quarter')}
            >
              Trimestre
            </Button>
            <Button
              variant={dateRange === 'year' ? 'default' : 'outline'}
              onClick={() => setDateRange('year')}
            >
              Ano
            </Button>
            <Button
              variant={dateRange === 'all' ? 'default' : 'outline'}
              onClick={() => setDateRange('all')}
            >
              Todo Período
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalLeads || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.leadsThisMonth || 0} este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversões</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalConversions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Taxa: {metrics?.conversionRate || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(metrics?.revenueThisMonth || 0)} este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agências Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agenciesMetrics?.activeAgencies || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {agenciesMetrics?.totalAgencies || 0} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Performance de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Leads no Período</span>
                <span className="font-semibold">{metrics?.leadsThisMonth || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Conversões no Período</span>
                <span className="font-semibold">{metrics?.conversionsThisMonth || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Taxa de Conversão</span>
                <span className="font-semibold">{metrics?.conversionRate || 0}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Receita no Período</span>
                <span className="font-semibold">
                  {formatCurrency(metrics?.revenueThisMonth || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Ticket Médio</span>
                <span className="font-semibold">
                  {formatCurrency(metrics?.avgTicket || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agencies Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Resumo de Agências
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total de Agências</span>
                <span className="font-semibold">
                  {agenciesMetrics?.totalAgencies || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Agências Ativas</span>
                <span className="font-semibold text-green-600">
                  {agenciesMetrics?.activeAgencies || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Agências Inativas</span>
                <span className="font-semibold text-red-600">
                  {agenciesMetrics?.inactiveAgencies || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total de Usuários</span>
                <span className="font-semibold">
                  {agenciesMetrics?.totalUsers || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total de Imóveis</span>
                <span className="font-semibold">
                  {agenciesMetrics?.totalProperties || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution */}
      {agenciesMetrics?.planDistribution && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Distribuição por Plano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(agenciesMetrics.planDistribution).map(([plan, count]) => (
                <div key={plan} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{count as number}</div>
                  <div className="text-sm text-muted-foreground mt-1">{plan}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

