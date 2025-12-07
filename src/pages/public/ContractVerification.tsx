import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Shield,
  CheckCircle,
  XCircle,
  Search,
  FileText,
  Upload,
  MapPin,
  Clock,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';

const API_URL = import.meta.env.VITE_API_URL;

export function ContractVerification() {
  const { token: urlToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [searchToken, setSearchToken] = useState(urlToken || searchParams.get('token') || '');
  const [verifyingHash, setVerifyingHash] = useState(false);
  const [hashInput, setHashInput] = useState('');
  const [hashResult, setHashResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [verifyingPdf, setVerifyingPdf] = useState(false);
  const [pdfResult, setPdfResult] = useState<{
    valid: boolean;
    computedHash?: string;
    storedHash?: string;
    message: string;
  } | null>(null);
  const [showHashSection, setShowHashSection] = useState(false);
  const [showPdfSection, setShowPdfSection] = useState(false);

  const activeToken = urlToken || searchToken;

  const { data: contract, isLoading, error, refetch } = useQuery({
    queryKey: ['verify-contract', activeToken],
    queryFn: async () => {
      if (!activeToken) return null;
      const response = await axios.get(`${API_URL}/verify/${activeToken}`);
      return response.data.data;
    },
    enabled: !!activeToken,
    retry: false,
  });

  const handleSearch = () => {
    if (searchToken.trim()) {
      refetch();
    }
  };

  const handleVerifyHash = async () => {
    if (!hashInput.trim() || !activeToken) return;

    setVerifyingHash(true);
    setHashResult(null);

    try {
      const response = await axios.post(`${API_URL}/verify/${activeToken}/validate-hash`, {
        hash: hashInput.trim(),
      });
      setHashResult(response.data.data);
    } catch (err: any) {
      setHashResult({
        valid: false,
        message: err.response?.data?.message || 'Erro ao verificar hash',
      });
    } finally {
      setVerifyingHash(false);
    }
  };

  const handleVerifyPdf = async () => {
    if (!pdfFile || !activeToken) return;

    setVerifyingPdf(true);
    setPdfResult(null);

    try {
      const formData = new FormData();
      formData.append('file', pdfFile);

      const response = await axios.post(
        `${API_URL}/verify/${activeToken}/validate-pdf`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      setPdfResult(response.data.data);
    } catch (err: any) {
      setPdfResult({
        valid: false,
        message: err.response?.data?.message || 'Erro ao verificar PDF',
      });
    } finally {
      setVerifyingPdf(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="outline" className="text-xs">Rascunho</Badge>;
      case 'PENDING_SIGNATURES':
        return <Badge className="bg-yellow-500 text-xs">Aguardando</Badge>;
      case 'PARTIALLY_SIGNED':
        return <Badge className="bg-blue-500 text-xs">Parcial</Badge>;
      case 'SIGNED':
        return <Badge className="bg-green-500 text-xs">Assinado</Badge>;
      case 'FINALIZED':
        return <Badge className="bg-purple-500 text-xs">Finalizado</Badge>;
      case 'REVOKED':
        return <Badge variant="destructive" className="text-xs">Revogado</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-6 sm:py-12 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-3 sm:mb-4">
            <Shield className="w-12 h-12 sm:w-16 sm:h-16 text-primary" />
          </div>
          <h1 className="text-xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
            Verificação de Contrato
          </h1>
          <p className="text-xs sm:text-base text-muted-foreground px-4">
            Valide a autenticidade do seu contrato digital
          </p>
        </div>

        {/* Search */}
        {!urlToken && (
          <Card>
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
              <CardTitle className="text-base sm:text-lg">Buscar Contrato</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Digite o token no formato MR3X-CTR-YEAR-XXXX-XXXX
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Input
                  placeholder="MR3X-CTR-2024-XXXXX-XXXXX"
                  value={searchToken}
                  onChange={(e) => setSearchToken(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={handleSearch}
                  disabled={!searchToken.trim() || isLoading}
                  className="w-full sm:w-auto"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {isLoading && (
          <Card>
            <CardContent className="py-8 sm:py-12 text-center">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary mx-auto mb-3 sm:mb-4" />
              <p className="text-sm text-muted-foreground">Verificando contrato...</p>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-6 sm:py-8 text-center">
              <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-red-700 mb-2">
                Contrato não encontrado
              </h3>
              <p className="text-red-600 text-xs sm:text-sm px-4">
                O token informado não corresponde a nenhum contrato válido.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Contract Info */}
        {contract && (
          <>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-4 sm:py-6 px-3 sm:px-6">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  {contract.isValid ? (
                    <>
                      <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                      <span className="text-base sm:text-xl font-semibold text-green-700">
                        Contrato Válido
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
                      <span className="text-base sm:text-xl font-semibold text-yellow-700 text-center">
                        {contract.message || 'Contrato ainda não finalizado'}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-center text-xs sm:text-sm text-muted-foreground">
                  Token: <code className="bg-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs break-all">{contract.token}</code>
                </p>
              </CardContent>
            </Card>

            {/* Contract Details */}
            <Card>
              <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  Detalhes do Contrato
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
                <div className="grid grid-cols-1 gap-4 sm:gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Status:</span>
                      {getStatusBadge(contract.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">Criado em:</span>
                      <span>{formatDate(contract.createdAt)}</span>
                    </div>
                    {contract.property && (
                      <div className="flex items-start gap-2 text-xs sm:text-sm">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-medium">Imóvel:</span>
                          <p className="text-muted-foreground break-words">
                            {contract.property.address}
                            {contract.property.neighborhood && `, ${contract.property.neighborhood}`}
                            {contract.property.city && ` - ${contract.property.city}`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Signatures */}
                  {contract.signatures && contract.signatures.length > 0 && (
                    <div className="pt-3 border-t">
                      <h4 className="font-medium mb-2 text-sm">Assinaturas:</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {contract.signatures.map((sig: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-muted rounded text-xs"
                          >
                            <span className="capitalize truncate">{sig.type}</span>
                            {sig.signedAt ? (
                              <Badge className="bg-green-500 text-[10px] shrink-0">
                                <CheckCircle className="w-2 h-2 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                                <span className="hidden sm:inline">{formatDate(sig.signedAt)}</span>
                                <span className="sm:hidden">OK</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">Pendente</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Hash Info */}
                {contract.hashFinal && (
                  <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-xs sm:text-sm">
                      <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                      Hash de Verificação (SHA-256)
                    </h4>
                    <code className="text-[9px] sm:text-xs break-all block bg-white p-2 rounded border overflow-x-auto">
                      {contract.hashFinal}
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Verify Hash - Collapsible */}
            {contract.hashFinal && (
              <Card>
                <CardHeader
                  className="px-3 sm:px-6 py-3 sm:py-6 cursor-pointer"
                  onClick={() => setShowHashSection(!showHashSection)}
                >
                  <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                    <span>Verificar Hash</span>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 transition-transform',
                        showHashSection && 'rotate-180'
                      )}
                    />
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Cole o hash SHA-256 para verificar
                  </CardDescription>
                </CardHeader>
                {showHashSection && (
                  <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <Input
                        placeholder="Cole o hash SHA-256 aqui..."
                        value={hashInput}
                        onChange={(e) => setHashInput(e.target.value)}
                        className="flex-1 font-mono text-xs sm:text-sm"
                      />
                      <Button
                        onClick={handleVerifyHash}
                        disabled={!hashInput.trim() || verifyingHash}
                        className="w-full sm:w-auto"
                      >
                        {verifyingHash ? 'Verificando...' : 'Verificar'}
                      </Button>
                    </div>

                    {hashResult && (
                      <div
                        className={`p-3 sm:p-4 rounded-lg ${
                          hashResult.valid
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {hashResult.valid ? (
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
                          )}
                          <span
                            className={cn(
                              'text-xs sm:text-sm',
                              hashResult.valid ? 'text-green-700' : 'text-red-700'
                            )}
                          >
                            {hashResult.message}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )}

            {/* Verify PDF - Collapsible */}
            {contract.hashFinal && (
              <Card>
                <CardHeader
                  className="px-3 sm:px-6 py-3 sm:py-6 cursor-pointer"
                  onClick={() => setShowPdfSection(!showPdfSection)}
                >
                  <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                    <span>Verificar PDF</span>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 transition-transform',
                        showPdfSection && 'rotate-180'
                      )}
                    />
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Faça upload do PDF para verificar autenticidade
                  </CardDescription>
                </CardHeader>
                {showPdfSection && (
                  <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                        className="flex-1 text-xs sm:text-sm"
                      />
                      <Button
                        onClick={handleVerifyPdf}
                        disabled={!pdfFile || verifyingPdf}
                        className="w-full sm:w-auto"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {verifyingPdf ? 'Verificando...' : 'Verificar'}
                      </Button>
                    </div>

                    {pdfResult && (
                      <div
                        className={`p-3 sm:p-4 rounded-lg ${
                          pdfResult.valid
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {pdfResult.valid ? (
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
                          )}
                          <span
                            className={cn(
                              'text-xs sm:text-sm',
                              pdfResult.valid ? 'text-green-700' : 'text-red-700'
                            )}
                          >
                            {pdfResult.message}
                          </span>
                        </div>
                        {pdfResult.computedHash && (
                          <div className="text-[10px] sm:text-xs mt-2 space-y-1 sm:space-y-2">
                            <div>
                              <p className="font-medium">Hash do PDF enviado:</p>
                              <code className="block bg-white p-1 rounded break-all text-[9px] sm:text-xs overflow-x-auto">
                                {pdfResult.computedHash}
                              </code>
                            </div>
                            <div>
                              <p className="font-medium">Hash armazenado:</p>
                              <code className="block bg-white p-1 rounded break-all text-[9px] sm:text-xs overflow-x-auto">
                                {pdfResult.storedHash}
                              </code>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center text-[10px] sm:text-sm text-muted-foreground py-4">
          <p>Sistema de verificação de contratos MR3X</p>
          <p className="hidden sm:block">Os dados exibidos são apenas para verificação de autenticidade.</p>
        </div>
      </div>
    </div>
  );
}

export default ContractVerification;
