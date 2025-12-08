import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  UserSearch,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  DollarSign,
  Scale,
  Fingerprint,
  TrendingUp,
  TrendingDown,
  Loader2,
  Search,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { tenantAnalysisAPI } from '../../api';
import { toast } from 'sonner';

// Types
interface AnalysisResult {
  id: string;
  document: string;
  documentType: 'CPF' | 'CNPJ';
  name?: string;
  financial: {
    creditScore: number;
    totalDebts: number;
    activeDebts: number;
    hasNegativeRecords: boolean;
    paymentDelays: number;
    averageDelayDays: number;
    debtDetails: Array<{ creditor: string; amount: number; daysOverdue: number }>;
    status: 'CLEAR' | 'WARNING' | 'CRITICAL';
  };
  background: {
    hasCriminalRecords: boolean;
    criminalRecords: Array<{ type: string; description: string; severity: string }>;
    hasJudicialRecords: boolean;
    judicialRecords: Array<{ processNumber: string; court: string; type: string; status: string; isEviction?: boolean }>;
    hasEvictions: boolean;
    evictionsCount: number;
    hasProtests: boolean;
    protestRecords: Array<{ notaryOffice: string; amount: number; creditor: string; status: string }>;
    totalProtestValue: number;
    status: 'CLEAR' | 'WARNING' | 'CRITICAL';
  };
  documentValidation: {
    documentValid: boolean;
    documentActive: boolean;
    documentOwnerMatch: boolean;
    hasFraudAlerts: boolean;
    registrationName?: string;
    status: 'VALID' | 'INVALID' | 'WARNING';
  };
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskPercentage: number;
  recommendation: 'APPROVED' | 'APPROVED_WITH_CAUTION' | 'REQUIRES_GUARANTOR' | 'REJECTED';
  recommendationNotes?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  analyzedAt: string;
  validUntil?: string;
  summary: {
    financialStatus: string;
    criminalStatus: string;
    judicialStatus: string;
    protestStatus: string;
    documentStatus: string;
  };
}

interface HistoryItem {
  id: string;
  document: string;
  documentType: string;
  name?: string;
  riskScore: number;
  riskLevel: string;
  recommendation: string;
  status: string;
  analyzedAt: string;
  requestedBy: {
    id: string;
    name: string;
    email: string;
  };
}

// Helper functions
const formatCPFCNPJ = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  }
  return numbers
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const getRiskColor = (level: string) => {
  switch (level) {
    case 'LOW': return 'bg-green-500';
    case 'MEDIUM': return 'bg-yellow-500';
    case 'HIGH': return 'bg-orange-500';
    case 'CRITICAL': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getRiskBadge = (level: string) => {
  switch (level) {
    case 'LOW': return <Badge className="bg-green-100 text-green-700">Baixo Risco</Badge>;
    case 'MEDIUM': return <Badge className="bg-yellow-100 text-yellow-700">Risco Moderado</Badge>;
    case 'HIGH': return <Badge className="bg-orange-100 text-orange-700">Alto Risco</Badge>;
    case 'CRITICAL': return <Badge className="bg-red-100 text-red-700">Risco Crítico</Badge>;
    default: return <Badge variant="outline">Desconhecido</Badge>;
  }
};

const getRecommendationBadge = (rec: string) => {
  switch (rec) {
    case 'APPROVED': return <Badge className="bg-green-100 text-green-700">Aprovado</Badge>;
    case 'APPROVED_WITH_CAUTION': return <Badge className="bg-yellow-100 text-yellow-700">Aprovado com Ressalvas</Badge>;
    case 'REQUIRES_GUARANTOR': return <Badge className="bg-orange-100 text-orange-700">Exige Fiador</Badge>;
    case 'REJECTED': return <Badge className="bg-red-100 text-red-700">Reprovado</Badge>;
    default: return <Badge variant="outline">{rec}</Badge>;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'CLEAR':
    case 'VALID': return <CheckCircle className="w-5 h-5 text-green-600" />;
    case 'WARNING': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    case 'CRITICAL':
    case 'INVALID': return <XCircle className="w-5 h-5 text-red-600" />;
    default: return <Clock className="w-5 h-5 text-gray-400" />;
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Risk Score Gauge Component
const RiskGauge = ({ score, level }: { score: number; level: string }) => {
  const percentage = score / 10;
  const rotation = (percentage / 100) * 180 - 90;

  return (
    <div className="relative w-48 h-24 mx-auto">
      {/* Background arc */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="w-48 h-48 rounded-full border-[16px] border-gray-200"
          style={{ clipPath: 'polygon(0 50%, 100% 50%, 100% 0, 0 0)' }}
        />
      </div>
      {/* Colored arc */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={`w-48 h-48 rounded-full border-[16px] ${getRiskColor(level)}`}
          style={{
            clipPath: 'polygon(0 50%, 100% 50%, 100% 0, 0 0)',
            transform: `rotate(${rotation - 90}deg)`,
            transformOrigin: 'center center',
          }}
        />
      </div>
      {/* Score display */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
        <span className="text-3xl font-bold">{score}</span>
        <span className="text-sm text-muted-foreground">/1000</span>
        <p className="text-xs text-muted-foreground mt-1">{percentage.toFixed(0)}%</p>
      </div>
    </div>
  );
};

// Analysis Detail Modal
const AnalysisDetailModal = ({ analysis, open, onClose }: { analysis: AnalysisResult | null; open: boolean; onClose: () => void }) => {
  if (!analysis) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserSearch className="w-5 h-5" />
            Análise de Inquilino - {analysis.name || analysis.document}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Risk Score Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Score de Risco</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <RiskGauge score={analysis.riskScore} level={analysis.riskLevel} />
                <div className="text-right space-y-2">
                  {getRiskBadge(analysis.riskLevel)}
                  {getRecommendationBadge(analysis.recommendation)}
                  <p className="text-sm text-muted-foreground mt-2">
                    {analysis.recommendationNotes}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <DollarSign className="w-5 h-5 text-blue-600" />
                {getStatusIcon(analysis.summary.financialStatus)}
              </div>
              <p className="text-sm font-medium mt-2">Financeiro</p>
              <p className="text-xs text-muted-foreground">{analysis.summary.financialStatus}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <Shield className="w-5 h-5 text-purple-600" />
                {getStatusIcon(analysis.summary.criminalStatus)}
              </div>
              <p className="text-sm font-medium mt-2">Criminal</p>
              <p className="text-xs text-muted-foreground">{analysis.summary.criminalStatus}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <Scale className="w-5 h-5 text-orange-600" />
                {getStatusIcon(analysis.summary.judicialStatus)}
              </div>
              <p className="text-sm font-medium mt-2">Judicial</p>
              <p className="text-xs text-muted-foreground">{analysis.summary.judicialStatus}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <FileText className="w-5 h-5 text-amber-600" />
                {getStatusIcon(analysis.summary.protestStatus)}
              </div>
              <p className="text-sm font-medium mt-2">Protesto</p>
              <p className="text-xs text-muted-foreground">{analysis.summary.protestStatus}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <Fingerprint className="w-5 h-5 text-green-600" />
                {getStatusIcon(analysis.summary.documentStatus)}
              </div>
              <p className="text-sm font-medium mt-2">Documento</p>
              <p className="text-xs text-muted-foreground">{analysis.summary.documentStatus}</p>
            </Card>
          </div>

          {/* Financial Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Análise Financeira
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Score de Crédito</p>
                  <p className="text-2xl font-bold">{analysis.financial.creditScore || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dívidas Totais</p>
                  <p className="text-2xl font-bold">{formatCurrency(analysis.financial.totalDebts)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dívidas Ativas</p>
                  <p className="text-2xl font-bold">{analysis.financial.activeDebts}</p>
                </div>
              </div>
              {analysis.financial.debtDetails.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Detalhes das Dívidas:</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Credor</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Dias em Atraso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.financial.debtDetails.map((debt, i) => (
                        <TableRow key={i}>
                          <TableCell>{debt.creditor}</TableCell>
                          <TableCell>{formatCurrency(debt.amount)}</TableCell>
                          <TableCell>{debt.daysOverdue} dias</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Background Check */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Verificação de Antecedentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Registros Criminais</p>
                  {analysis.background.hasCriminalRecords ? (
                    <div className="space-y-2">
                      {analysis.background.criminalRecords.map((record, i) => (
                        <div key={i} className="p-2 bg-red-50 rounded border border-red-200">
                          <p className="font-medium text-red-700">{record.type}</p>
                          <p className="text-sm text-red-600">{record.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Nenhum registro encontrado
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Ações Judiciais</p>
                  {analysis.background.hasJudicialRecords ? (
                    <div className="space-y-2">
                      {analysis.background.judicialRecords.map((record, i) => (
                        <div key={i} className={`p-2 rounded border ${record.isEviction ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                          <p className="font-medium">{record.type}</p>
                          <p className="text-sm text-muted-foreground">{record.court}</p>
                          <p className="text-xs">{record.processNumber}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Nenhum registro encontrado
                    </p>
                  )}
                </div>
              </div>
              {analysis.background.hasEvictions && (
                <div className="mt-4 p-3 bg-red-100 rounded-lg">
                  <p className="text-red-700 font-medium flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    {analysis.background.evictionsCount} despejo(s) encontrado(s)
                  </p>
                </div>
              )}
              {analysis.background.hasProtests && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Protesto ({analysis.background.protestRecords.length})</p>
                  <p className="text-lg font-bold text-orange-600">
                    Total: {formatCurrency(analysis.background.totalProtestValue)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Validation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Fingerprint className="w-5 h-5" />
                Validação de Documento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  {analysis.documentValidation.documentValid ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span>Documento Válido</span>
                </div>
                <div className="flex items-center gap-2">
                  {analysis.documentValidation.documentActive ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span>Documento Ativo</span>
                </div>
                <div className="flex items-center gap-2">
                  {analysis.documentValidation.documentOwnerMatch ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span>Titularidade OK</span>
                </div>
                <div className="flex items-center gap-2">
                  {!analysis.documentValidation.hasFraudAlerts ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  <span>Sem Alertas de Fraude</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <div className="text-sm text-muted-foreground flex justify-between">
            <span>Análise realizada em: {formatDate(analysis.analyzedAt)}</span>
            {analysis.validUntil && (
              <span>Válida até: {formatDate(analysis.validUntil)}</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
export function TenantAnalysis() {
  const queryClient = useQueryClient();
  const [document, setDocument] = useState('');
  const [name, setName] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filters, setFilters] = useState({
    riskLevel: '',
    status: '',
    page: 1,
    limit: 10,
  });

  // Query for analysis history
  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['tenant-analysis-history', filters],
    queryFn: () => tenantAnalysisAPI.getHistory({
      riskLevel: filters.riskLevel as any || undefined,
      status: filters.status as any || undefined,
      page: filters.page,
      limit: filters.limit,
    }),
  });

  // Query for stats
  const { data: stats } = useQuery({
    queryKey: ['tenant-analysis-stats'],
    queryFn: () => tenantAnalysisAPI.getStats(),
  });

  // Mutation for new analysis
  const analyzeMutation = useMutation({
    mutationFn: (data: { document: string; name?: string }) =>
      tenantAnalysisAPI.analyze({ ...data, analysisType: 'FULL' }),
    onSuccess: (data) => {
      toast.success('Análise concluída com sucesso!');
      setSelectedAnalysis(data);
      setShowDetail(true);
      setDocument('');
      setName('');
      queryClient.invalidateQueries({ queryKey: ['tenant-analysis-history'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-analysis-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao realizar análise');
    },
  });

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDocument = document.replace(/\D/g, '');
    if (cleanDocument.length !== 11 && cleanDocument.length !== 14) {
      toast.error('CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos');
      return;
    }
    analyzeMutation.mutate({ document: cleanDocument, name: name || undefined });
  };

  const handleViewAnalysis = async (id: string) => {
    try {
      const analysis = await tenantAnalysisAPI.getById(id);
      setSelectedAnalysis(analysis);
      setShowDetail(true);
    } catch (error) {
      toast.error('Erro ao carregar análise');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 rounded-lg">
          <UserSearch className="w-6 h-6 text-blue-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Análise de Inquilinos</h1>
          <p className="text-muted-foreground">
            Verificação completa de candidatos a inquilinos
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Análises</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Baixo Risco</p>
                  <p className="text-2xl font-bold text-green-600">{stats.byRiskLevel?.LOW || 0}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alto Risco</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.byRiskLevel?.HIGH || 0}</p>
                </div>
                <TrendingDown className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Risco Crítico</p>
                  <p className="text-2xl font-bold text-red-600">{stats.byRiskLevel?.CRITICAL || 0}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Analysis Form */}
      <Card>
        <CardHeader>
          <CardTitle>Nova Análise</CardTitle>
          <CardDescription>
            Digite o CPF ou CNPJ do candidato para realizar uma análise completa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAnalyze} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="CPF ou CNPJ"
                value={document}
                onChange={(e) => setDocument(formatCPFCNPJ(e.target.value))}
                maxLength={18}
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Nome (opcional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={analyzeMutation.isPending}>
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Analisar
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Análises</CardTitle>
            <div className="flex gap-2">
              <Select
                value={filters.riskLevel || 'all'}
                onValueChange={(value) => setFilters({ ...filters, riskLevel: value === 'all' ? '' : value, page: 1 })}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Nível de Risco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="LOW">Baixo</SelectItem>
                  <SelectItem value="MEDIUM">Moderado</SelectItem>
                  <SelectItem value="HIGH">Alto</SelectItem>
                  <SelectItem value="CRITICAL">Crítico</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value, page: 1 })}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="COMPLETED">Concluído</SelectItem>
                  <SelectItem value="PENDING">Pendente</SelectItem>
                  <SelectItem value="FAILED">Falha</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['tenant-analysis-history'] })}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Nível de Risco</TableHead>
                    <TableHead>Recomendação</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history?.data?.map((item: HistoryItem) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.document}</TableCell>
                      <TableCell>{item.name || '-'}</TableCell>
                      <TableCell>
                        <span className="font-bold">{item.riskScore}</span>
                        <span className="text-muted-foreground">/1000</span>
                      </TableCell>
                      <TableCell>{getRiskBadge(item.riskLevel)}</TableCell>
                      <TableCell>{getRecommendationBadge(item.recommendation)}</TableCell>
                      <TableCell>{item.analyzedAt ? formatDate(item.analyzedAt) : '-'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewAnalysis(item.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!history?.data || history.data.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma análise encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {history && history.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((filters.page - 1) * filters.limit) + 1} a{' '}
                    {Math.min(filters.page * filters.limit, history.total)} de {history.total} resultados
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filters.page === 1}
                      onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filters.page >= history.totalPages}
                      onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <AnalysisDetailModal
        analysis={selectedAnalysis}
        open={showDetail}
        onClose={() => setShowDetail(false)}
      />
    </div>
  );
}

export default TenantAnalysis;
