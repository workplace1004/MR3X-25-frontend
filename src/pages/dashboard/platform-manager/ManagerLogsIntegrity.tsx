import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, Search, AlertTriangle, CheckCircle, XCircle,
  Clock, Shield, Code, RefreshCw
} from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { platformManagerAPI } from '../../../api';

interface PlatformLog {
  id: string;
  message: string;
  user: string;
  action: string;
  type: string;
  module: string;
  ip: string;
  timestamp: string;
}

interface SuspiciousActivity {
  id: string;
  type: string;
  description: string;
  severity: string;
  status: string;
  ip: string;
  timestamp: string;
}

interface ActionHistory {
  id: string;
  action: string;
  target: string;
  from: string;
  to: string;
  performedBy: string;
  timestamp: string;
  validated: boolean;
}

interface APIUsageStat {
  client: string;
  requests: number;
  errors: number;
  avgLatency: number;
  quota: number;
}

export function ManagerLogsIntegrity() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('logs');

  const { data: logsData = { logs: [], suspiciousActivities: [], actionHistory: [], apiUsageStats: [], integrityScore: 0 }, isLoading } = useQuery({
    queryKey: ['platform-manager', 'logs', typeFilter, moduleFilter],
    queryFn: () => platformManagerAPI.getLogs({
      type: typeFilter !== 'all' ? typeFilter : undefined,
    }),
  });

  const platformLogs = logsData.logs || [];
  const suspiciousActivities = logsData.suspiciousActivities || [];
  const actionHistory = logsData.actionHistory || [];
  const apiUsageStats = logsData.apiUsageStats || [];
  const integrityScore = logsData.integrityScore || 0;

  const filteredLogs = platformLogs.filter((log: PlatformLog) => {
    const matchesSearch = log.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || log.type === typeFilter;
    const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;
    return matchesSearch && matchesType && matchesModule;
  });

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge className="bg-red-100 text-red-700">Alta</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-700">Média</Badge>;
      case 'low':
        return <Badge className="bg-blue-100 text-blue-700">Baixa</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'investigating':
        return <Badge className="bg-yellow-100 text-yellow-700">Investigando</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-700">Resolvido</Badge>;
      case 'verified':
        return <Badge className="bg-blue-100 text-blue-700">Verificado</Badge>;
      case 'blocked':
        return <Badge className="bg-red-100 text-red-700">Bloqueado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-9 w-28 rounded" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-lg" />
                  <div>
                    <Skeleton className="h-8 w-16 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-36 rounded" />
          ))}
        </div>

        {/* Filters Skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <Skeleton className="h-10 flex-1 rounded" />
              <Skeleton className="h-10 w-[150px] rounded" />
              <Skeleton className="h-10 w-[150px] rounded" />
            </div>
          </CardContent>
        </Card>

        {/* Logs List Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36 mb-1" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <Skeleton className="w-4 h-4 rounded" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-5 w-16 rounded" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <div className="flex items-center gap-4 mt-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
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
      <PageHeader
        title="Logs e Integridade"
        subtitle="Visualize logs e monitore a integridade da plataforma (somente leitura)"
        icon={<Activity className="w-6 h-6 text-blue-700" />}
        iconBgClass="bg-blue-100"
      />
      <div className="flex justify-end">
        <Button variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{platformLogs.length}</p>
                <p className="text-sm text-muted-foreground">Logs Recentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{suspiciousActivities.filter((a: SuspiciousActivity) => a.status === 'investigating').length}</p>
                <p className="text-sm text-muted-foreground">Em Investigação</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{platformLogs.filter((l: PlatformLog) => l.type === 'error').length}</p>
                <p className="text-sm text-muted-foreground">Erros</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{integrityScore || 99.8}%</p>
                <p className="text-sm text-muted-foreground">Integridade</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="logs">Logs da Plataforma</TabsTrigger>
          <TabsTrigger value="suspicious">Atividades Suspeitas</TabsTrigger>
          <TabsTrigger value="actions">Histórico de Ações</TabsTrigger>
          <TabsTrigger value="api">Uso de API</TabsTrigger>
        </TabsList>

        {}
        <TabsContent value="logs" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={moduleFilter} onValueChange={setModuleFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Auth">Auth</SelectItem>
                    <SelectItem value="Contracts">Contracts</SelectItem>
                    <SelectItem value="Payments">Payments</SelectItem>
                    <SelectItem value="API">API</SelectItem>
                    <SelectItem value="Users">Users</SelectItem>
                    <SelectItem value="System">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Logs Recentes</CardTitle>
              <CardDescription>{filteredLogs.length} logs encontrados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhum log encontrado</p>
                ) : (
                  filteredLogs.map((log: PlatformLog) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                      {getLogIcon(log.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{log.action}</span>
                          <Badge variant="outline" className="text-xs">{log.module}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{log.message}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>{log.user}</span>
                          <span>IP: {log.ip}</span>
                          <span>{log.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {}
        <TabsContent value="suspicious" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Atividades Suspeitas</CardTitle>
              <CardDescription>Atividades que requerem atenção</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suspiciousActivities.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhuma atividade suspeita encontrada</p>
                ) : (
                  suspiciousActivities.map((activity: SuspiciousActivity) => (
                    <div key={activity.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(activity.severity)}
                          <span className="font-medium">{activity.type}</span>
                        </div>
                        {getStatusBadge(activity.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>IP: {activity.ip}</span>
                        <span>{activity.timestamp}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {}
        <TabsContent value="actions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Ações</CardTitle>
              <CardDescription>Ações administrativas realizadas na plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {actionHistory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhuma ação encontrada</p>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Ação</th>
                        <th className="text-left py-3 px-4 font-medium">Alvo</th>
                        <th className="text-left py-3 px-4 font-medium">De / Para</th>
                        <th className="text-left py-3 px-4 font-medium">Realizado por</th>
                        <th className="text-left py-3 px-4 font-medium">Data</th>
                        <th className="text-left py-3 px-4 font-medium">Validado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionHistory.map((action: ActionHistory) => (
                        <tr key={action.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{action.action}</td>
                          <td className="py-3 px-4">{action.target}</td>
                          <td className="py-3 px-4">
                            <span className="text-muted-foreground">{action.from}</span>
                            <span className="mx-2">→</span>
                            <span>{action.to}</span>
                          </td>
                          <td className="py-3 px-4 text-sm">{action.performedBy}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{action.timestamp}</td>
                          <td className="py-3 px-4">
                            {action.validated ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <Clock className="w-5 h-5 text-yellow-500" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {}
        <TabsContent value="api" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Uso de API</CardTitle>
              <CardDescription>Estatísticas de uso por cliente API</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {apiUsageStats.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhuma estatística de API encontrada</p>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Cliente</th>
                        <th className="text-left py-3 px-4 font-medium">Requisições</th>
                        <th className="text-left py-3 px-4 font-medium">Erros</th>
                        <th className="text-left py-3 px-4 font-medium">Latência Média</th>
                        <th className="text-left py-3 px-4 font-medium">Uso de Quota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiUsageStats.map((stat: APIUsageStat) => {
                        const quotaPercent = stat.quota > 0 ? (stat.requests / stat.quota) * 100 : 0;
                        return (
                          <tr key={stat.client} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Code className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{stat.client}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">{stat.requests?.toLocaleString() || 0}</td>
                            <td className="py-3 px-4">
                              <Badge className={stat.errors > 100 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                                {stat.errors}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">{stat.avgLatency}ms</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${quotaPercent > 80 ? 'bg-red-500' : quotaPercent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                    style={{ width: `${Math.min(quotaPercent, 100)}%` }}
                                  />
                                </div>
                                <span className="text-sm text-muted-foreground w-12">{quotaPercent.toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {}
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-700">
          <strong>Nota:</strong> Como Gerente de Plataforma, você tem acesso somente leitura aos logs e dados de integridade. Nenhuma edição é permitida.
        </p>
      </div>
    </div>
  );
}
