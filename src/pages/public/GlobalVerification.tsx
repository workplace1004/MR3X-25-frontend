import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Search, FileText, CheckCircle, XCircle, Loader2, Hash, Upload, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Alert, AlertDescription } from '../../components/ui/alert';

const API_URL = import.meta.env.VITE_API_URL;

type DocumentType = 'CONTRACT' | 'AGREEMENT' | 'INSPECTION' | 'EXTRAJUDICIAL_NOTIFICATION' | 'AUTO';

interface VerificationResult {
  valid: boolean;
  message: string;
  documentType: string;
  token: string;
  hash?: string;
  storedHash?: string;
  computedHash?: string;
  status?: string;
  createdAt?: string;
  signedAt?: string;
  details?: any;
}

export function GlobalVerification() {
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('token');
  
  const [searchToken, setSearchToken] = useState(urlToken || '');
  const [selectedType, setSelectedType] = useState<DocumentType>('AUTO');
  const [hashInput, setHashInput] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [verifyingHash, setVerifyingHash] = useState(false);
  const [verifyingPdf, setVerifyingPdf] = useState(false);
  const [hashResult, setHashResult] = useState<VerificationResult | null>(null);
  const [pdfResult, setPdfResult] = useState<VerificationResult | null>(null);

  const activeToken = urlToken || searchToken;

  const { data: verification, isLoading, error, refetch } = useQuery({
    queryKey: ['verify-document', activeToken, selectedType],
    queryFn: async () => {
      if (!activeToken) return null;
      const typeParam = selectedType !== 'AUTO' ? `?type=${selectedType}` : '';
      const response = await axios.get(`${API_URL}/verify/token/${activeToken}${typeParam}`);
      return response.data.data;
    },
    enabled: !!activeToken,
    retry: false,
  });

  const handleSearch = () => {
    if (searchToken.trim()) {
      refetch();
      setHashResult(null);
      setPdfResult(null);
    }
  };

  const handleVerifyHash = async () => {
    if (!hashInput.trim() || !activeToken) return;

    setVerifyingHash(true);
    setHashResult(null);

    try {
      const typeParam = selectedType !== 'AUTO' ? `?type=${selectedType}` : '';
      const response = await axios.post(`${API_URL}/verify/token/${activeToken}/hash${typeParam}`, {
        hash: hashInput.trim(),
      });
      setHashResult(response.data.data);
    } catch (err: any) {
      setHashResult({
        valid: false,
        message: err.response?.data?.message || 'Erro ao verificar hash',
        documentType: selectedType,
        token: activeToken,
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

      const typeParam = selectedType !== 'AUTO' ? `&type=${selectedType}` : '';
      const response = await axios.post(
        `${API_URL}/verify/token/${activeToken}/pdf${typeParam ? '?' + typeParam.substring(1) : ''}`,
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
        documentType: selectedType,
        token: activeToken,
      });
    } finally {
      setVerifyingPdf(false);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'CONTRACT':
        return 'Contrato';
      case 'AGREEMENT':
        return 'Acordo';
      case 'INSPECTION':
        return 'Vistoria';
      case 'EXTRAJUDICIAL_NOTIFICATION':
        return 'Notificação Extrajudicial';
      default:
        return type;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const statusUpper = status.toUpperCase();
    if (statusUpper.includes('ATIVO') || statusUpper.includes('ASSINADO') || statusUpper.includes('CONCLUIDO')) {
      return <Badge className="bg-green-500 text-white">Válido</Badge>;
    }
    if (statusUpper.includes('PENDENTE') || statusUpper.includes('RASCUNHO') || statusUpper.includes('AGUARDANDO')) {
      return <Badge className="bg-yellow-500 text-white">Pendente</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Verificação de Documentos</h1>
          </div>
          <p className="text-lg text-gray-600">
            Verifique a autenticidade e integridade de contratos, acordos, vistorias e notificações extrajudiciais
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Buscar Documento
            </CardTitle>
            <CardDescription>
              Digite o token do documento ou selecione um tipo específico
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="token">Token do Documento</Label>
                  <Input
                    id="token"
                    value={searchToken}
                    onChange={(e) => setSearchToken(e.target.value)}
                    placeholder="Ex: MR3X-CTR-2024-XXXXX ou MR3X-AGR-2024-XXXXX"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Tipo de Documento (Opcional)</Label>
                  <Select value={selectedType} onValueChange={(v) => setSelectedType(v as DocumentType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUTO">Auto-detectar</SelectItem>
                      <SelectItem value="CONTRACT">Contrato</SelectItem>
                      <SelectItem value="AGREEMENT">Acordo</SelectItem>
                      <SelectItem value="INSPECTION">Vistoria</SelectItem>
                      <SelectItem value="EXTRAJUDICIAL_NOTIFICATION">Notificação Extrajudicial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSearch} className="w-full" disabled={!searchToken.trim() || isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Verificar Token
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert className="mb-6 border-red-500 bg-red-50">
            <XCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error instanceof Error ? error.message : 'Erro ao verificar documento'}
            </AlertDescription>
          </Alert>
        )}

        {verification && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Informações do Documento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Tipo</Label>
                    <p className="font-semibold">{getDocumentTypeLabel(verification.documentType)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Status</Label>
                    <div className="mt-1">{getStatusBadge(verification.status)}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Token</Label>
                    <p className="font-mono text-sm break-all">{verification.token}</p>
                  </div>
                  {verification.hash && (
                    <div>
                      <Label className="text-sm text-gray-500">Hash SHA-256</Label>
                      <p className="font-mono text-xs break-all">{verification.hash.substring(0, 32)}...</p>
                    </div>
                  )}
                  {verification.createdAt && (
                    <div>
                      <Label className="text-sm text-gray-500">Criado em</Label>
                      <p>{new Date(verification.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                  )}
                  {verification.signedAt && (
                    <div>
                      <Label className="text-sm text-gray-500">Assinado em</Label>
                      <p>{new Date(verification.signedAt).toLocaleString('pt-BR')}</p>
                    </div>
                  )}
                </div>

                <Alert className={verification.valid ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}>
                  {verification.valid ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-yellow-600" />
                  )}
                  <AlertDescription className={verification.valid ? 'text-green-800' : 'text-yellow-800'}>
                    {verification.message}
                  </AlertDescription>
                </Alert>

                {verification.details && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-md">
                    <Label className="text-sm font-semibold mb-2 block">Detalhes das Assinaturas</Label>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {verification.details.hasTenantSignature !== undefined && (
                        <div className="flex items-center gap-2">
                          {verification.details.hasTenantSignature ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span>Inquilino</span>
                        </div>
                      )}
                      {verification.details.hasOwnerSignature !== undefined && (
                        <div className="flex items-center gap-2">
                          {verification.details.hasOwnerSignature ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span>Proprietário</span>
                        </div>
                      )}
                      {verification.details.hasAgencySignature !== undefined && (
                        <div className="flex items-center gap-2">
                          {verification.details.hasAgencySignature ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span>Agência</span>
                        </div>
                      )}
                      {verification.details.hasInspectorSignature !== undefined && (
                        <div className="flex items-center gap-2">
                          {verification.details.hasInspectorSignature ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span>Inspetor</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="w-5 h-5" />
                    Verificar Hash
                  </CardTitle>
                  <CardDescription>
                    Digite o hash SHA-256 para validar a integridade do documento
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="hash">Hash SHA-256</Label>
                    <Input
                      id="hash"
                      value={hashInput}
                      onChange={(e) => setHashInput(e.target.value)}
                      placeholder="Cole o hash SHA-256 aqui"
                      className="font-mono text-xs"
                    />
                  </div>
                  <Button
                    onClick={handleVerifyHash}
                    disabled={!hashInput.trim() || verifyingHash}
                    className="w-full"
                  >
                    {verifyingHash ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <Hash className="w-4 h-4 mr-2" />
                        Verificar Hash
                      </>
                    )}
                  </Button>
                  {hashResult && (
                    <Alert className={hashResult.valid ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                      {hashResult.valid ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <AlertDescription className={hashResult.valid ? 'text-green-800' : 'text-red-800'}>
                        {hashResult.message}
                      </AlertDescription>
                      {hashResult.storedHash && hashResult.computedHash && (
                        <div className="mt-2 text-xs space-y-1">
                          <p className="font-mono break-all">Armazenado: {hashResult.storedHash.substring(0, 32)}...</p>
                          <p className="font-mono break-all">Fornecido: {hashResult.computedHash.substring(0, 32)}...</p>
                        </div>
                      )}
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Verificar PDF
                  </CardTitle>
                  <CardDescription>
                    Faça upload do PDF para validar sua integridade
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="pdf">Arquivo PDF</Label>
                    <Input
                      id="pdf"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                  </div>
                  <Button
                    onClick={handleVerifyPdf}
                    disabled={!pdfFile || verifyingPdf}
                    className="w-full"
                  >
                    {verifyingPdf ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Verificar PDF
                      </>
                    )}
                  </Button>
                  {pdfResult && (
                    <Alert className={pdfResult.valid ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                      {pdfResult.valid ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <AlertDescription className={pdfResult.valid ? 'text-green-800' : 'text-red-800'}>
                        {pdfResult.message}
                      </AlertDescription>
                      {pdfResult.storedHash && pdfResult.computedHash && (
                        <div className="mt-2 text-xs space-y-1">
                          <p className="font-mono break-all">Armazenado: {pdfResult.storedHash.substring(0, 32)}...</p>
                          <p className="font-mono break-all">Calculado: {pdfResult.computedHash.substring(0, 32)}...</p>
                        </div>
                      )}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                <strong>Como funciona:</strong>
              </p>
              <ul className="text-xs text-gray-600 space-y-1 text-left max-w-2xl mx-auto">
                <li>• <strong>Token:</strong> Identificador único do documento (ex: MR3X-CTR-2024-XXXXX)</li>
                <li>• <strong>Hash SHA-256:</strong> Assinatura digital que garante a integridade do documento</li>
                <li>• <strong>Verificação:</strong> Compara o hash do documento com o hash armazenado no sistema</li>
                <li>• <strong>Autenticidade:</strong> Se os hashes coincidirem, o documento é autêntico e não foi alterado</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

