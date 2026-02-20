import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Webhook, CheckCircle, XCircle, AlertTriangle,
  Code, RefreshCw, Zap
} from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, AreaChart, Area
} from 'recharts';
import { platformManagerAPI } from '../../../api';

function ChartContainer({ children, height = 250 }: { children: React.ReactNode; height?: number }) {
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

export function ManagerIntegrations() {
  const [activeTab, setActiveTab] = useState('webhooks');

  const { data: webhookData, isLoading: webhooksLoading } = useQuery({
    queryKey: ['platform-manager', 'integrations', 'webhooks'],
    queryFn: () => platformManagerAPI.getWebhookLogs(),
  });

  const { data: apiData, isLoading: apiLoading } = useQuery({
    queryKey: ['platform-manager', 'integrations', 'api-requests'],
    queryFn: () => platformManagerAPI.getApiRequestLogs(),
  });

  const webhookResult = webhookData as { webhooks?: any[]; trend?: any[] } | undefined;
  const apiResult = apiData as { requests?: any[]; trend?: any[]; tokens?: any[]; errors?: any[] } | undefined;

  const asaasWebhooks = webhookResult?.webhooks || [];
  const webhookTrendData = webhookResult?.trend || [];
  const apiRequests = apiResult?.requests || [];
  const apiTrendData = apiResult?.trend || [];
  const tokenActivity = apiResult?.tokens || [];
  const errorLogs = apiResult?.errors || [];

  const webhookSuccessRate = asaasWebhooks.length > 0
    ? (asaasWebhooks.filter((w: any) => w.status === 'success').length / asaasWebhooks.length * 100).toFixed(1)
    : '0';
  const apiSuccessRate = apiRequests.length > 0
    ? (apiRequests.filter((r: any) => r.status < 400).length / apiRequests.length * 100).toFixed(1)
    : '0';
  const unresolvedErrors = errorLogs.filter((e: any) => !e.resolved).length;

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-blue-100 text-blue-700',
      POST: 'bg-green-100 text-green-700',
      PUT: 'bg-yellow-100 text-yellow-700',
      DELETE: 'bg-red-100 text-red-700',
      PATCH: 'bg-purple-100 text-purple-700',
    };
    return <Badge className={colors[method] || 'bg-gray-100 text-gray-700'}>{method}</Badge>;
  };

  const getStatusCodeBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return <Badge className="bg-green-100 text-green-700">{status}</Badge>;
    } else if (status >= 400 && status < 500) {
      return <Badge className="bg-yellow-100 text-yellow-700">{status}</Badge>;
    } else if (status >= 500) {
      return <Badge className="bg-red-100 text-red-700">{status}</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
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

  const isLoading = webhooksLoading || apiLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-72 mb-2" />
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
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-32 rounded" />
          ))}
        </div>

        {/* Chart Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48 mb-1" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="w-full h-[250px] rounded" />
          </CardContent>
        </Card>

        {/* List Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40 mb-1" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-5 h-5 rounded" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Skeleton className="h-5 w-24 rounded" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
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
        title="Monitoramento de Integrações"
        subtitle="Acompanhe webhooks, requisições API e logs de erro"
        icon={<Webhook className="w-6 h-6 text-green-700" />}
        iconBgClass="bg-green-100"
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
              <div className="p-2 bg-green-100 rounded-lg">
                <Webhook className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{webhookSuccessRate}%</p>
                <p className="text-sm text-muted-foreground">Webhooks Sucesso</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Code className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{apiSuccessRate}%</p>
                <p className="text-sm text-muted-foreground">API Sucesso</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tokenActivity.length}</p>
                <p className="text-sm text-muted-foreground">Tokens Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unresolvedErrors}</p>
                <p className="text-sm text-muted-foreground">Erros Não Resolvidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="webhooks">Webhooks Asaas</TabsTrigger>
          <TabsTrigger value="api">Requisições API</TabsTrigger>
          <TabsTrigger value="tokens">Atividade de Tokens</TabsTrigger>
          <TabsTrigger value="errors">Logs de Erro</TabsTrigger>
        </TabsList>

        {}
        <TabsContent value="webhooks" className="space-y-4 mt-4">
          {}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tendência de Webhooks</CardTitle>
              <CardDescription>Webhooks recebidos nas últimas 24 horas</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer height={250}>
                <AreaChart data={webhookTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="success" name="Sucesso" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="failed" name="Falha" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Webhooks Recentes</CardTitle>
              <CardDescription>Últimos webhooks do Asaas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {asaasWebhooks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhum webhook encontrado</p>
                ) : (
                  asaasWebhooks.map((webhook: any) => (
                    <div key={webhook.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {webhook.status === 'success' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{webhook.event}</Badge>
                            <span className="text-sm font-medium">{webhook.agency}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {webhook.paymentId} • R$ {webhook.amount?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{webhook.timestamp}</p>
                        {webhook.status === 'success' ? (
                          <p className="text-xs text-muted-foreground">{webhook.responseTime}ms</p>
                        ) : (
                          <p className="text-xs text-red-500">{webhook.error}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {}
        <TabsContent value="api" className="space-y-4 mt-4">
          {}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Requisições API</CardTitle>
              <CardDescription>Volume e latência nas últimas 24 horas</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer height={250}>
                <LineChart data={apiTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="requests" name="Requisições" stroke="#3b82f6" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="latency" name="Latência (ms)" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Requisições Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {apiRequests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhuma requisição encontrada</p>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Método</th>
                        <th className="text-left py-3 px-4 font-medium">Endpoint</th>
                        <th className="text-left py-3 px-4 font-medium">Cliente</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-left py-3 px-4 font-medium">Latência</th>
                        <th className="text-left py-3 px-4 font-medium">Horário</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiRequests.map((request: any) => (
                        <tr key={request.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{getMethodBadge(request.method)}</td>
                          <td className="py-3 px-4 font-mono text-sm">{request.endpoint}</td>
                          <td className="py-3 px-4">{request.client}</td>
                          <td className="py-3 px-4">{getStatusCodeBadge(request.status)}</td>
                          <td className="py-3 px-4">
                            {request.responseTime > 0 ? `${request.responseTime}ms` : '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{request.timestamp}</td>
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
        <TabsContent value="tokens" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Atividade de Tokens</CardTitle>
              <CardDescription>Histórico de criação, uso e revogação de tokens</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tokenActivity.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhuma atividade de token encontrada</p>
                ) : (
                  tokenActivity.map((activity: any) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          activity.action === 'Token Created' ? 'bg-green-100' :
                          activity.action === 'Token Revoked' ? 'bg-red-100' :
                          activity.action === 'Token Refreshed' ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <Zap className={`w-5 h-5 ${
                            activity.action === 'Token Created' ? 'text-green-600' :
                            activity.action === 'Token Revoked' ? 'text-red-600' :
                            activity.action === 'Token Refreshed' ? 'text-blue-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">{activity.action}</p>
                          <p className="text-sm text-muted-foreground">
                            {activity.client} • {activity.tokenPrefix}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{activity.timestamp}</p>
                        {activity.expiresAt && <p>Expira: {activity.expiresAt}</p>}
                        {activity.lastUsedIp && <p>IP: {activity.lastUsedIp}</p>}
                        {activity.revokedBy && <p>Por: {activity.revokedBy}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {}
        <TabsContent value="errors" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Logs de Erro de Sistemas Externos</CardTitle>
              <CardDescription>Erros de integrações e serviços externos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {errorLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhum erro encontrado</p>
                ) : (
                  errorLogs.map((error: any) => (
                    <div key={error.id} className={`p-4 border rounded-lg ${error.resolved ? 'bg-gray-50' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{error.source}</Badge>
                          {getSeverityBadge(error.severity)}
                          <span className="font-medium">{error.type}</span>
                        </div>
                        {error.resolved ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Resolvido
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{error.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">{error.timestamp}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
