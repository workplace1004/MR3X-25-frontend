import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  Database, Eye, History, CheckCircle, Edit, Trash2, Plus, Loader2
} from 'lucide-react';
import { auditorAPI } from '../../../api';

interface IntegrityData {
  totalChanges: number;
  creates: number;
  updates: number;
  deletes: number;
  integrityStatus: 'healthy' | 'warning' | 'critical';
}

export function AuditorDataIntegrity() {
  // Fetch integrity data from API
  const { data: integrityData, isLoading } = useQuery<IntegrityData>({
    queryKey: ['auditor-integrity'],
    queryFn: () => auditorAPI.getIntegrity(),
  });

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
      case 'healthy': return 'Íntegro';
      case 'warning': return 'Atenção';
      case 'critical': return 'Comprometido';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-emerald-100 rounded-lg">
          <Database className="w-6 h-6 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Integridade de Dados</h1>
          <p className="text-muted-foreground">Histórico de alterações e integridade do sistema (somente leitura)</p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Carregando dados de integridade...</span>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <History className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Alterações (30d)</p>
                  <p className="text-xl font-bold">{integrityData?.totalChanges || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Plus className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Criações</p>
                  <p className="text-xl font-bold">{integrityData?.creates || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Edit className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Atualizações</p>
                  <p className="text-xl font-bold">{integrityData?.updates || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Exclusões</p>
                  <p className="text-xl font-bold">{integrityData?.deletes || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Integrity Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Visão Geral de Integridade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <History className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Total de alterações registradas</p>
                      <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold">{integrityData?.totalChanges || 0}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Plus className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">Registros criados</p>
                      <p className="text-sm text-muted-foreground">Novos dados inseridos</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-green-600">{integrityData?.creates || 0}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Edit className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">Registros atualizados</p>
                      <p className="text-sm text-muted-foreground">Dados modificados</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-yellow-600">{integrityData?.updates || 0}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-medium">Registros excluídos</p>
                      <p className="text-sm text-muted-foreground">Dados removidos</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{integrityData?.deletes || 0}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">Status de Integridade</p>
                      <p className="text-sm text-muted-foreground">Avaliação geral dos dados</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(integrityData?.integrityStatus)}`}>
                    {getStatusLabel(integrityData?.integrityStatus)}
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
