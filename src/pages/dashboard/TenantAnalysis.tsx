import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { getOwnerPermissions, getRestrictionMessage } from '../../lib/owner-permissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
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
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '../../components/ui/alert';
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
  MapPin,
  Phone,
  Building2,
  User,
  Calendar,
  Hash,
} from 'lucide-react';
import { tenantAnalysisAPI } from '../../api';
import { toast } from 'sonner';

interface BasicDataCPF {
  type: 'CPF';
  name?: string;
  status?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  birthDate?: string;
  motherName?: string;
}

interface BasicDataCNPJ {
  type: 'CNPJ';
  companyName?: string;
  tradingName?: string;
  status?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  openingDate?: string;
}

interface AnalysisResult {
  id: string;
  token?: string;
  document: string;
  documentType: 'CPF' | 'CNPJ';
  name?: string;
  basicData?: BasicDataCPF | BasicDataCNPJ;
  photo?: {
    path: string;
    filename: string;
  } | null;
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
    protestRecords: Array<{
      notaryOffice: string;
      amount: number;
      creditor: string;
      status: string;
      date?: string;
      city?: string;
      state?: string;
      type?: string;
      protocol?: string;
      source?: string;
    }>;
    totalProtestValue: number;
    infoSimplesData?: {
      source: string;
      consultationProtocol?: string;
      consultationDate?: string;
      cartoriosWithProtests?: number;
    };
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
  lgpd?: {
    acceptedAt?: string;
    acceptedBy?: string;
  };
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
  token?: string;
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

const RiskGauge = ({ score, level }: { score: number; level: string }) => {
  const percentage = score / 10;
  const rotation = (percentage / 100) * 180 - 90;

  return (
    <div className="relative w-48 h-24 mx-auto">
      {}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="w-48 h-48 rounded-full border-[16px] border-gray-200"
          style={{ clipPath: 'polygon(0 50%, 100% 50%, 100% 0, 0 0)' }}
        />
      </div>
      {}
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
      {}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
        <span className="text-3xl font-bold">{score}</span>
        <span className="text-sm text-muted-foreground">/1000</span>
        <p className="text-xs text-muted-foreground mt-1">{percentage.toFixed(0)}%</p>
      </div>
    </div>
  );
};

const AnalysisDetailModal = ({
  analysis,
  open,
  onClose,
}: {
  analysis: AnalysisResult | null;
  open: boolean;
  onClose: () => void;
}) => {
  if (!analysis) return null;

  const renderBasicData = () => {
    if (!analysis.basicData) return null;

    if (analysis.basicData.type === 'CPF') {
      const data = analysis.basicData as BasicDataCPF;
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
              Dados Básicos do CPF
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Nome</p>
                <p className="font-medium text-sm sm:text-base">{data.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Status</p>
                <Badge variant={data.status === 'REGULAR' ? 'default' : 'destructive'} className="text-xs">
                  {data.status || '-'}
                </Badge>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4" /> Endereço
                </p>
                <p className="font-medium text-xs sm:text-sm">
                  {data.address ? `${data.address}, ${data.city || ''} - ${data.state || ''} ${data.zipCode ? `CEP: ${data.zipCode}` : ''}` : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4" /> Telefone
                </p>
                <p className="font-medium text-sm sm:text-base">{data.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" /> Data de Nascimento
                </p>
                <p className="font-medium text-sm sm:text-base">{data.birthDate ? data.birthDate.split('T')[0] : '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    } else {
      const data = analysis.basicData as BasicDataCNPJ;
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
              Dados Básicos do CNPJ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="col-span-1 sm:col-span-2">
                <p className="text-xs sm:text-sm text-muted-foreground">Razão Social</p>
                <p className="font-medium text-sm sm:text-base break-words">{data.companyName || '-'}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Status</p>
                <Badge variant={data.status === 'ATIVA' ? 'default' : 'destructive'} className="text-xs">
                  {data.status || '-'}
                </Badge>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4" /> Endereço
                </p>
                <p className="font-medium text-xs sm:text-sm">
                  {data.address ? `${data.address}, ${data.city || ''} - ${data.state || ''} ${data.zipCode ? `CEP: ${data.zipCode}` : ''}` : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4" /> Telefone
                </p>
                <p className="font-medium text-sm sm:text-base">{data.phone || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <UserSearch className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="truncate">Análise - {analysis.name || formatCPFCNPJ(analysis.document)}</span>
          </DialogTitle>
          {analysis.token && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
              <Hash className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-mono truncate">{analysis.token}</span>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Basic Data Card */}
          {renderBasicData()}

          {/* Risk Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">Score de Risco</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <RiskGauge score={analysis.riskScore} level={analysis.riskLevel} />
                <div className="text-center sm:text-right space-y-2">
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
                    {getRiskBadge(analysis.riskLevel)}
                    {getRecommendationBadge(analysis.recommendation)}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                    {analysis.recommendationNotes}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards - Mobile Responsive */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
            <Card className="p-2 sm:p-4">
              <div className="flex items-center justify-between">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                {getStatusIcon(analysis.summary.financialStatus)}
              </div>
              <p className="text-xs sm:text-sm font-medium mt-1 sm:mt-2">Financeiro</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{analysis.summary.financialStatus}</p>
            </Card>
            <Card className="p-2 sm:p-4">
              <div className="flex items-center justify-between">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                {getStatusIcon(analysis.summary.criminalStatus)}
              </div>
              <p className="text-xs sm:text-sm font-medium mt-1 sm:mt-2">Criminal</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{analysis.summary.criminalStatus}</p>
            </Card>
            <Card className="p-2 sm:p-4">
              <div className="flex items-center justify-between">
                <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                {getStatusIcon(analysis.summary.judicialStatus)}
              </div>
              <p className="text-xs sm:text-sm font-medium mt-1 sm:mt-2">Judicial</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{analysis.summary.judicialStatus}</p>
            </Card>
            <Card className="p-2 sm:p-4">
              <div className="flex items-center justify-between">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                {getStatusIcon(analysis.summary.protestStatus)}
              </div>
              <p className="text-xs sm:text-sm font-medium mt-1 sm:mt-2">Protesto</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{analysis.summary.protestStatus}</p>
            </Card>
            <Card className="p-2 sm:p-4 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <Fingerprint className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                {getStatusIcon(analysis.summary.documentStatus)}
              </div>
              <p className="text-xs sm:text-sm font-medium mt-1 sm:mt-2">Documento</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{analysis.summary.documentStatus}</p>
            </Card>
          </div>

          {/* Financial Analysis */}
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                Análise Financeira
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Score de Crédito</p>
                  <p className="text-lg sm:text-2xl font-bold">{analysis.financial.creditScore || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Dívidas Totais</p>
                  <p className="text-sm sm:text-2xl font-bold">{formatCurrency(analysis.financial.totalDebts)}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Dívidas Ativas</p>
                  <p className="text-lg sm:text-2xl font-bold">{analysis.financial.activeDebts}</p>
                </div>
              </div>
              {analysis.financial.debtDetails.length > 0 && (
                <div>
                  <p className="text-xs sm:text-sm font-medium mb-2">Detalhes das Dívidas:</p>
                  {/* Desktop Table */}
                  <div className="hidden sm:block">
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
                  {/* Mobile Cards */}
                  <div className="sm:hidden space-y-2">
                    {analysis.financial.debtDetails.map((debt, i) => (
                      <div key={i} className="p-2 border rounded text-xs">
                        <p className="font-medium truncate">{debt.creditor}</p>
                        <div className="flex justify-between mt-1">
                          <span>{formatCurrency(debt.amount)}</span>
                          <span className="text-muted-foreground">{debt.daysOverdue} dias</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Background Check */}
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                Verificação de Antecedentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Registros Criminais</p>
                  {analysis.background.hasCriminalRecords ? (
                    <div className="space-y-2">
                      {analysis.background.criminalRecords.map((record, i) => (
                        <div key={i} className="p-2 bg-red-50 rounded border border-red-200">
                          <p className="font-medium text-red-700 text-xs sm:text-sm">{record.type}</p>
                          <p className="text-xs text-red-600">{record.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-green-600 flex items-center gap-1 text-xs sm:text-sm">
                      <CheckCircle className="w-4 h-4" /> Nenhum registro encontrado
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Ações Judiciais</p>
                  {analysis.background.hasJudicialRecords ? (
                    <div className="space-y-2">
                      {analysis.background.judicialRecords.map((record, i) => (
                        <div key={i} className={`p-2 rounded border ${record.isEviction ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                          <p className="font-medium text-xs sm:text-sm">{record.type}</p>
                          <p className="text-xs text-muted-foreground">{record.court}</p>
                          <p className="text-[10px] sm:text-xs truncate">{record.processNumber}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-green-600 flex items-center gap-1 text-xs sm:text-sm">
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
                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-600" />
                      Protestos ({analysis.background.protestRecords.length})
                    </p>
                    <p className="text-lg font-bold text-orange-600">
                      Total: {formatCurrency(analysis.background.totalProtestValue)}
                    </p>
                  </div>
                  {analysis.background.infoSimplesData && (
                    <div className="mb-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                      <span className="font-medium">Fonte: </span>
                      {analysis.background.infoSimplesData.source}
                      {analysis.background.infoSimplesData.consultationProtocol && (
                        <span className="ml-2">| Protocolo: {analysis.background.infoSimplesData.consultationProtocol}</span>
                      )}
                      {analysis.background.infoSimplesData.cartoriosWithProtests && (
                        <span className="ml-2">| {analysis.background.infoSimplesData.cartoriosWithProtests} cartório(s)</span>
                      )}
                    </div>
                  )}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {analysis.background.protestRecords.map((protest, i) => (
                      <div key={i} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{protest.notaryOffice}</p>
                            <p className="text-xs text-muted-foreground">
                              {protest.city && `${protest.city}`}
                              {protest.state && ` - ${protest.state}`}
                            </p>
                            {protest.creditor && (
                              <p className="text-xs mt-1">
                                <span className="text-muted-foreground">Credor: </span>
                                {protest.creditor}
                              </p>
                            )}
                            {protest.type && (
                              <p className="text-xs">
                                <span className="text-muted-foreground">Tipo: </span>
                                {protest.type}
                              </p>
                            )}
                            {protest.date && (
                              <p className="text-xs">
                                <span className="text-muted-foreground">Data: </span>
                                {new Date(protest.date).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                            {protest.protocol && (
                              <p className="text-xs font-mono text-muted-foreground">
                                #{protest.protocol}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-orange-700">{formatCurrency(protest.amount)}</p>
                            {protest.source && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {protest.source === 'INFOSIMPLES_CENPROT_SP' ? 'CENPROT-SP' : protest.source}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Validation */}
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Fingerprint className="w-4 h-4 sm:w-5 sm:h-5" />
                Validação de Documento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  {analysis.documentValidation.documentValid ? (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
                  )}
                  <span className="text-xs sm:text-sm">Documento Válido</span>
                </div>
                <div className="flex items-center gap-2">
                  {analysis.documentValidation.documentActive ? (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
                  )}
                  <span className="text-xs sm:text-sm">Documento Ativo</span>
                </div>
                <div className="flex items-center gap-2">
                  {analysis.documentValidation.documentOwnerMatch ? (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
                  )}
                  <span className="text-xs sm:text-sm">Titularidade OK</span>
                </div>
                <div className="flex items-center gap-2">
                  {!analysis.documentValidation.hasFraudAlerts ? (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
                  )}
                  <span className="text-xs sm:text-sm">Sem Fraude</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-xs sm:text-sm text-muted-foreground flex flex-col sm:flex-row justify-between gap-1">
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

// LGPD Disclaimer Modal
const LGPDDisclaimerModal = ({
  open,
  onAccept,
  onCancel,
  isLoading,
}: {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) => {
  const [accepted, setAccepted] = useState(false);

  return (
    <Dialog open={open} onOpenChange={() => !isLoading && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            Aviso Legal - LGPD
          </DialogTitle>
          <DialogDescription>
            Leia atentamente antes de prosseguir com a consulta.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <p className="font-semibold mb-2">Termo de Responsabilidade</p>
            <p className="text-sm leading-relaxed">
              O usuário se responsabiliza pelo uso indevido dos dados pesquisados conforme determina a LGPD (Lei Geral de Proteção de Dados).
            </p>
            <p className="text-sm leading-relaxed mt-2">
              A plataforma possui auditoria constante, ficando armazenados os logs de acesso e uso nos moldes da Lei.
            </p>
          </AlertDescription>
        </Alert>

        <label htmlFor="lgpd-accept" className="flex items-center gap-2 mt-4 cursor-pointer">
          <Checkbox
            id="lgpd-accept"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked as boolean)}
          />
          <span className="text-sm">Li e aceito os termos de uso conforme a LGPD</span>
        </label>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={onAccept} disabled={!accepted || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Prosseguir com Análise
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function TenantAnalysis() {
  const queryClient = useQueryClient();
  const [document, setDocument] = useState('');
  const [name, setName] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showLGPDModal, setShowLGPDModal] = useState(false);
  const [filters, setFilters] = useState({
    riskLevel: '',
    status: '',
    page: 1,
    limit: 10,
  });

  // Permission check for PROPRIETARIO
  const { user } = useAuthStore();
  const permissions = getOwnerPermissions(user?.role, 'tenant_analysis');

  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['tenant-analysis-history', filters],
    queryFn: () => tenantAnalysisAPI.getHistory({
      riskLevel: filters.riskLevel as any || undefined,
      status: filters.status as any || undefined,
      page: filters.page,
      limit: filters.limit,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['tenant-analysis-stats'],
    queryFn: () => tenantAnalysisAPI.getStats(),
  });

  const analyzeMutation = useMutation({
    mutationFn: (data: { document: string; name?: string; lgpdAccepted: boolean }) =>
      tenantAnalysisAPI.analyze({ ...data, analysisType: 'FULL' }),
    onSuccess: (data) => {
      toast.success('Análise concluída com sucesso!');
      setSelectedAnalysis(data);
      setShowDetail(true);
      setShowLGPDModal(false);
      setDocument('');
      setName('');
      queryClient.invalidateQueries({ queryKey: ['tenant-analysis-history'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-analysis-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao realizar análise');
    },
  });

  const handleAnalyzeClick = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDocument = document.replace(/\D/g, '');
    if (cleanDocument.length !== 11 && cleanDocument.length !== 14) {
      toast.error('CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos');
      return;
    }
    // Show LGPD modal
    setShowLGPDModal(true);
  };

  const handleLGPDAccept = () => {
    const cleanDocument = document.replace(/\D/g, '');
    analyzeMutation.mutate({ document: cleanDocument, name: name || undefined, lgpdAccepted: true });
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
      {}
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

      {/* Stats Cards - Mobile Responsive */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-3 sm:pt-6 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total de Análises</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:pt-6 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Baixo Risco</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.byRiskLevel?.LOW || 0}</p>
                </div>
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:pt-6 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Risco Modera.</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.byRiskLevel?.MEDIUM || 0}</p>
                </div>
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:pt-6 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Alto Risco</p>
                  <p className="text-xl sm:text-2xl font-bold text-orange-600">{stats.byRiskLevel?.HIGH || 0}</p>
                </div>
                <TrendingDown className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:pt-6 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Risco Crítico</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.byRiskLevel?.CRITICAL || 0}</p>
                </div>
                <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Analysis Form - Only visible if user can create */}
      {permissions.canCreate ? (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Nova Análise</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Digite o CPF ou CNPJ do candidato para realizar uma análise completa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAnalyzeClick} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <Input
                  placeholder="CPF ou CNPJ"
                  value={document}
                  onChange={(e) => setDocument(formatCPFCNPJ(e.target.value))}
                  maxLength={18}
                  className="text-sm sm:text-base"
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Nome (opcional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-sm sm:text-base"
                />
              </div>
              <Button type="submit" disabled={analyzeMutation.isPending} className="w-full sm:w-auto">
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="sm:inline">Analisando...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    <span>Analisar</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {getRestrictionMessage('tenant_analysis')}
          </AlertDescription>
        </Alert>
      )}

      {/* History Section */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl">Histórico de Análises</CardTitle>
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex">
              <Select
                value={filters.riskLevel || 'all'}
                onValueChange={(value) => setFilters({ ...filters, riskLevel: value === 'all' ? '' : value, page: 1 })}
              >
                <SelectTrigger className="w-full sm:w-[150px] text-xs sm:text-sm">
                  <SelectValue placeholder="Todos" />
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
                <SelectTrigger className="w-full sm:w-[150px] text-xs sm:text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="COMPLETED">Concluído</SelectItem>
                  <SelectItem value="PENDING">Pendente</SelectItem>
                  <SelectItem value="FAILED">Falha</SelectItem>
                </SelectContent>
              </Select>
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
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token</TableHead>
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
                        <TableCell className="font-mono text-xs">{item.token || '-'}</TableCell>
                        <TableCell className="font-mono">{formatCPFCNPJ(item.document)}</TableCell>
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
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Nenhuma análise encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {history?.data?.map((item: HistoryItem) => (
                  <Card key={item.id} className="p-3 border shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name || 'Sem nome'}</p>
                        <p className="text-xs font-mono text-muted-foreground">{formatCPFCNPJ(item.document)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewAnalysis(item.id)}
                        className="shrink-0"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>

                    {item.token && (
                      <p className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded mb-2 truncate">
                        {item.token}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{item.riskScore}</span>
                        <span className="text-xs text-muted-foreground">/1000</span>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {getRiskBadge(item.riskLevel)}
                        {getRecommendationBadge(item.recommendation)}
                      </div>
                    </div>

                    {item.analyzedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate(item.analyzedAt)}
                      </p>
                    )}
                  </Card>
                ))}
                {(!history?.data || history.data.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma análise encontrada
                  </div>
                )}
              </div>

              {/* Pagination */}
              {history && history.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-2">
                  <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                    Mostrando {((filters.page - 1) * filters.limit) + 1} a{' '}
                    {Math.min(filters.page * filters.limit, history.total)} de {history.total}
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

      {/* Analysis Detail Modal */}
      <AnalysisDetailModal
        analysis={selectedAnalysis}
        open={showDetail}
        onClose={() => setShowDetail(false)}
      />

      {/* LGPD Disclaimer Modal */}
      <LGPDDisclaimerModal
        open={showLGPDModal}
        onAccept={handleLGPDAccept}
        onCancel={() => setShowLGPDModal(false)}
        isLoading={analyzeMutation.isPending}
      />
    </div>
  );
}

export default TenantAnalysis;
