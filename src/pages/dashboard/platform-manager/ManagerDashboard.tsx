import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, Users, Ticket, Activity, TrendingUp, TrendingDown,
  CheckCircle, AlertTriangle, Server, AlertCircle, LayoutDashboard
} from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { Badge } from '../../../components/ui/badge';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Line, AreaChart, Area
} from 'recharts';
import { platformManagerAPI } from '../../../api';

function ChartContainer({ children, height = 300 }: { children: React.ReactNode; height?: number }) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        if (offsetWidth > 0 && offsetHeight > 0) {
          setDimensions({ width: offsetWidth, height: offsetHeight });
        }
      }
    };

    const timer = setTimeout(updateDimensions, 100);

    window.addEventListener('resize', updateDimensions);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height, minHeight: height }}>
      {dimensions.width > 0 && dimensions.height > 0 ? (
        <ResponsiveContainer width="100%" height={height} minWidth={100}>
          {children}
        </ResponsiveContainer>
      ) : (
        <div style={{ height }} className="flex items-center justify-center text-muted-foreground">
          Carregando gráfico...
        </div>
      )}
    </div>
  );
}

const iconMap: Record<string, any> = {
  Building2,
  Users,
  Ticket,
  Activity,
};

export function ManagerDashboard() {
  
  const { data: metrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ['platform-manager', 'metrics'],
    queryFn: platformManagerAPI.getDashboardMetrics,
  });

  const { data: agencyStatusData = [], isLoading: agencyStatusLoading } = useQuery({
    queryKey: ['platform-manager', 'agency-status'],
    queryFn: platformManagerAPI.getAgencyStatusDistribution,
  });

  const { data: ticketStatusData = [], isLoading: ticketStatusLoading } = useQuery({
    queryKey: ['platform-manager', 'ticket-status'],
    queryFn: platformManagerAPI.getTicketStatusDistribution,
  });

  const { data: monthlyTicketsData = [], isLoading: monthlyTicketsLoading } = useQuery({
    queryKey: ['platform-manager', 'monthly-tickets'],
    queryFn: platformManagerAPI.getMonthlyTickets,
  });

  const { data: platformHealthData = [], isLoading: platformHealthLoading } = useQuery({
    queryKey: ['platform-manager', 'platform-health'],
    queryFn: platformManagerAPI.getPlatformHealth,
  });

  const { data: recentActivities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['platform-manager', 'recent-activities'],
    queryFn: platformManagerAPI.getRecentActivities,
  });

  const { data: systemStatus = [], isLoading: systemStatusLoading } = useQuery({
    queryKey: ['platform-manager', 'system-status'],
    queryFn: platformManagerAPI.getSystemStatus,
  });

  const isLoading = metricsLoading || agencyStatusLoading || ticketStatusLoading ||
                    monthlyTicketsLoading || platformHealthLoading || activitiesLoading || systemStatusLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div>
          <Skeleton className="h-8 w-56 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="mt-4">
                  <Skeleton className="h-8 w-20 mb-1" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40 mb-1" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-[300px]">
                  <Skeleton className="w-40 h-40 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bar Chart Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40 mb-1" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="w-full h-[300px] rounded" />
          </CardContent>
        </Card>

        {/* Area Chart Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48 mb-1" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="w-full h-[300px] rounded" />
          </CardContent>
        </Card>

        {/* Bottom Cards Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40 mb-1" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Handle errors gracefully - show "data currently unavailable" instead of breaking
  const hasError = !metrics || metrics.length === 0;
  const hasData = metrics && metrics.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard do Gerente"
        subtitle="Visão geral da plataforma MR3X"
        icon={<LayoutDashboard className="w-6 h-6 text-cyan-700" />}
        iconBgClass="bg-cyan-100"
      />
      {hasError && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <AlertCircle className="w-5 h-5" />
              <p>Dados atualmente indisponíveis. Tente novamente em alguns instantes.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {hasData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric: any) => {
              const IconComponent = iconMap[metric.icon] || Activity;
              return (
            <Card key={metric.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                    <IconComponent className={`w-6 h-6 ${metric.color}`} />
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${
                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {metric.change}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <p className="text-sm text-muted-foreground">{metric.title}</p>
                </div>
              </CardContent>
            </Card>
              );
            })}
          </div>

          {}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status das Agências</CardTitle>
            <CardDescription>Distribuição por status</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer height={300}>
              <PieChart>
                <Pie
                  data={agencyStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {agencyStatusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status dos Tickets</CardTitle>
            <CardDescription>Tickets por status atual</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer height={300}>
              <PieChart>
                <Pie
                  data={ticketStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {ticketStatusData.map((entry: any, index: number) => (
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

      {}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tickets Mensais</CardTitle>
          <CardDescription>Tickets abertos vs resolvidos nos últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer height={300}>
            <BarChart data={monthlyTicketsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="abertos" name="Abertos" fill="#ef4444" />
              <Bar dataKey="resolvidos" name="Resolvidos" fill="#22c55e" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Saúde da Plataforma</CardTitle>
          <CardDescription>Uptime e tempo de resposta nas últimas 24 horas</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer height={300}>
            <AreaChart data={platformHealthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis yAxisId="left" domain={[99, 100]} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 200]} />
              <Tooltip />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="uptime"
                name="Uptime (%)"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.3}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="responseTime"
                name="Tempo de Resposta (ms)"
                stroke="#3b82f6"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atividades Recentes</CardTitle>
            <CardDescription>Últimas ações na plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhuma atividade recente</p>
              ) : (
                recentActivities.map((activity: any) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    <div className={`p-2 rounded-full ${
                      activity.status === 'success' ? 'bg-green-100' :
                      activity.status === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      {activity.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : activity.status === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      ) : (
                        <Activity className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status dos Serviços</CardTitle>
            <CardDescription>Monitoramento em tempo real</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemStatus.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhum serviço encontrado</p>
              ) : (
                systemStatus.map((service: any) => (
                  <div key={service.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Server className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground">Uptime: {service.uptime}</p>
                      </div>
                    </div>
                    <Badge className={
                      service.status === 'online' ? 'bg-green-100 text-green-700' :
                      service.status === 'degraded' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }>
                      {service.status === 'online' ? 'Online' :
                       service.status === 'degraded' ? 'Degradado' : 'Offline'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </div>
  );
}
