import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  FileSignature, Eye, CheckCircle, Clock, Loader2, Hash, AlertTriangle
} from 'lucide-react';
import { auditorAPI } from '../../../api';

interface SignatureActivity {
  total: number;
  valid: number;
  pending: number;
  expired: number;
}

export function AuditorSignatures() {
  // Fetch signature activity from API
  const { data: signatureData, isLoading } = useQuery<SignatureActivity>({
    queryKey: ['auditor-signature-activity'],
    queryFn: () => auditorAPI.getSignatureActivity(),
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'valid': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'expired': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-purple-100 rounded-lg">
          <FileSignature className="w-6 h-6 text-purple-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Assinaturas Digitais</h1>
          <p className="text-muted-foreground">Validação e histórico de assinaturas (somente leitura)</p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Carregando dados de assinaturas...</span>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Hash className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Assinaturas</p>
                  <p className="text-xl font-bold">{signatureData?.total || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Válidas</p>
                  <p className="text-xl font-bold">{signatureData?.valid || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                  <p className="text-xl font-bold">{signatureData?.pending || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expiradas</p>
                  <p className="text-xl font-bold">{signatureData?.expired || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Signature Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Visão Geral de Assinaturas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Hash className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Total de assinaturas</p>
                      <p className="text-sm text-muted-foreground">Todos os registros de assinatura</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold">{signatureData?.total || 0}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">Assinaturas válidas</p>
                      <p className="text-sm text-muted-foreground">Documentos assinados e verificados</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-green-600">{signatureData?.valid || 0}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">Aguardando assinatura</p>
                      <p className="text-sm text-muted-foreground">Documentos pendentes de assinatura</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-yellow-600">{signatureData?.pending || 0}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-medium">Assinaturas expiradas</p>
                      <p className="text-sm text-muted-foreground">Documentos com prazo vencido</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{signatureData?.expired || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
