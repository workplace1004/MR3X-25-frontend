import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export function ApiConsumptionWidget() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['api-consumption'],
    queryFn: () => dashboardAPI.getApiConsumption(),
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Consumo de APIs</CardTitle>
          <CardDescription>Erro ao carregar dados de consumo</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>
              {(() => {
                const errorData = (error as any)?.response?.data;
                if (typeof errorData?.error === 'string') {
                  return errorData.error;
                }
                if (typeof errorData === 'string') {
                  return errorData;
                }
                return 'Não foi possível carregar os dados de consumo de APIs.';
              })()}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Consumo de APIs</CardTitle>
          <CardDescription>Carregando dados de consumo...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const consumptionData = data as any;

  const cellereBalance = consumptionData?.cellere?.balance || 0;
  const infosimplesBalance = consumptionData?.infosimples?.balance || 0;
  const alerts = consumptionData?.alerts || {};
  const estimates = consumptionData?.estimates || {};

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Consumo de APIs</CardTitle>
          <CardDescription>Saldo e consumo de créditos das APIs integradas</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alerts */}
        {alerts.criticalBalance && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Saldo Crítico</AlertTitle>
            <AlertDescription>
              O saldo de créditos está abaixo de 10%. Por favor, recarregue os créditos.
            </AlertDescription>
          </Alert>
        )}

        {alerts.lowBalance && !alerts.criticalBalance && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Saldo Baixo</AlertTitle>
            <AlertDescription>
              O saldo de créditos está abaixo de 30%. Considere recarregar os créditos em breve.
            </AlertDescription>
          </Alert>
        )}

        {/* API Balances */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cellere */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cellere</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Saldo Disponível</span>
                  <span className="text-2xl font-bold">{cellereBalance.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Unidade</span>
                  <span className="text-sm">{consumptionData?.cellere?.units || 'créditos'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    consumptionData?.cellere?.status === 'ok' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {consumptionData?.cellere?.status === 'ok' ? 'Ativo' : 'Erro'}
                  </span>
                </div>
                {consumptionData?.cellere?.lastUpdate && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Última atualização: {new Date(consumptionData.cellere.lastUpdate).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Infosimples */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Infosimples</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {infosimplesBalance > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Saldo Disponível</span>
                    <span className="text-2xl font-bold">{infosimplesBalance.toLocaleString()}</span>
                  </div>
                )}
                {consumptionData?.infosimples?.dailyConsumption !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Consumo Diário</span>
                    <span className="text-sm font-medium">
                      {consumptionData.infosimples.dailyConsumption.toLocaleString()}
                    </span>
                  </div>
                )}
                {consumptionData?.infosimples?.monthlyConsumption !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Consumo Mensal</span>
                    <span className="text-sm font-medium">
                      {consumptionData.infosimples.monthlyConsumption.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    consumptionData?.infosimples?.status === 'ok' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {consumptionData?.infosimples?.status === 'ok' ? 'Ativo' : 'Indisponível'}
                  </span>
                </div>
                {consumptionData?.infosimples?.lastUpdate && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Última atualização: {new Date(consumptionData.infosimples.lastUpdate).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estimates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Estimativas</CardTitle>
            <CardDescription>Estimativas baseadas no saldo atual e consumo médio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{estimates.contractsRemaining || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Contratos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{estimates.analysesRemaining || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Análises</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{estimates.validationsRemaining || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Validações</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{estimates.daysUntilDepletion || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Dias Restantes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consumption History Chart */}
        {consumptionData?.consumptionHistory?.daily && consumptionData.consumptionHistory.daily.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Histórico de Consumo</CardTitle>
              <CardDescription>Últimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={consumptionData.consumptionHistory.daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="cellere" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Cellere"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="infosimples" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Infosimples"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

