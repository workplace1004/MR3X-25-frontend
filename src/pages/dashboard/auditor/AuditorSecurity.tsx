import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  Shield, Key, Clock, Eye, CheckCircle, XCircle, AlertTriangle, Loader2, LogIn, LogOut
} from 'lucide-react';
import { auditorAPI } from '../../../api';

interface SecurityData {
  recentLogins: number;
  failedLogins: number;
  activeTokens: number;
  securityStatus: 'healthy' | 'warning' | 'critical';
}

export function AuditorSecurity() {
  // Fetch security data from API
  const { data: securityData, isLoading } = useQuery<SecurityData>({
    queryKey: ['auditor-security'],
    queryFn: () => auditorAPI.getSecurity(),
  });

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-700';
      case 'warning': return 'bg-yellow-100 text-yellow-700';
      case 'critical': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'healthy': return 'Saudável';
      case 'warning': return 'Atenção';
      case 'critical': return 'Crítico';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-red-100 rounded-lg">
          <Shield className="w-6 h-6 text-red-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Segurança</h1>
          <p className="text-muted-foreground">Monitoramento de segurança do sistema (somente leitura)</p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Carregando dados de segurança...</span>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <LogIn className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Logins (24h)</p>
                  <p className="text-xl font-bold">{securityData?.recentLogins || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Falhas de Login (24h)</p>
                  <p className="text-xl font-bold">{securityData?.failedLogins || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Key className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tokens Ativos</p>
                  <p className="text-xl font-bold">{securityData?.activeTokens || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getStatusStyle(securityData?.securityStatus)}`}>
                  {getStatusIcon(securityData?.securityStatus)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status Geral</p>
                  <p className="text-xl font-bold">{getStatusLabel(securityData?.securityStatus)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Security Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Visão Geral de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <LogIn className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">Logins bem-sucedidos</p>
                      <p className="text-sm text-muted-foreground">Últimas 24 horas</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold">{securityData?.recentLogins || 0}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-medium">Tentativas de login falhas</p>
                      <p className="text-sm text-muted-foreground">Últimas 24 horas</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{securityData?.failedLogins || 0}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Tokens de refresh ativos</p>
                      <p className="text-sm text-muted-foreground">Sessões ativas no sistema</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold">{securityData?.activeTokens || 0}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(securityData?.securityStatus)}
                    <div>
                      <p className="font-medium">Status de Segurança</p>
                      <p className="text-sm text-muted-foreground">Avaliação geral do sistema</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(securityData?.securityStatus)}`}>
                    {getStatusLabel(securityData?.securityStatus)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
