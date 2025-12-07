import { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  FileText,
  Download,
  RefreshCw,
  Shield,
  MapPin,
  Clock,
  User,
  CheckCircle,
  AlertTriangle,
  Copy,
  ChevronDown,
} from 'lucide-react';
import { formatDate, formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface ContractSignature {
  type: string;
  signedAt?: string;
  signedBy?: string;
  clientIP?: string;
  geoLat?: number;
  geoLng?: number;
}

interface ContractData {
  id: string;
  contractToken: string;
  status: string;
  property?: {
    address?: string;
    city?: string;
    neighborhood?: string;
  };
  tenantUser?: {
    name?: string;
    email?: string;
  };
  ownerUser?: {
    name?: string;
  };
  agency?: {
    name?: string;
  };
  monthlyRent?: number;
  startDate?: string;
  endDate?: string;
  hashFinal?: string;
  provisionalHash?: string;
  signatures?: ContractSignature[];
  createdAt?: string;
  updatedAt?: string;
}

interface ContractPdfPreviewProps {
  contract: ContractData;
  onDownloadProvisional?: () => Promise<void>;
  onDownloadFinal?: () => Promise<void>;
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
}

export function ContractPdfPreview({
  contract,
  onDownloadProvisional,
  onDownloadFinal,
  onRefresh,
  loading = false,
  className,
}: ContractPdfPreviewProps) {
  const [downloading, setDownloading] = useState<'provisional' | 'final' | null>(null);
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);

  const handleDownload = async (type: 'provisional' | 'final') => {
    const downloadFn = type === 'provisional' ? onDownloadProvisional : onDownloadFinal;
    if (!downloadFn) return;

    setDownloading(type);
    try {
      await downloadFn();
      toast.success(`PDF ${type === 'provisional' ? 'provisório' : 'final'} baixado com sucesso`);
    } catch {
      toast.error(`Erro ao baixar PDF ${type === 'provisional' ? 'provisório' : 'final'}`);
    } finally {
      setDownloading(null);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(contract.contractToken);
    toast.success('Token copiado para a área de transferência');
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

  const signatureTypes = ['tenant', 'owner', 'agency', 'witness'];
  const signatureLabels: Record<string, string> = {
    tenant: 'Inquilino',
    owner: 'Imóvel',
    agency: 'Imobiliária',
    witness: 'Testemunha',
  };

  const getSignatureStatus = (type: string) => {
    const sig = contract.signatures?.find((s) => s.type === type);
    return sig;
  };

  return (
    <div className={cn('space-y-4 sm:space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="truncate">{contract.contractToken}</span>
            </CardTitle>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {getStatusBadge(contract.status)}
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={loading}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  <RefreshCw className={cn('w-3 h-3 sm:w-4 sm:h-4', loading && 'animate-spin')} />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {/* Property & Parties */}
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs sm:text-sm">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <span className="font-medium">Imóvel: </span>
                  <span className="break-words">{contract.property?.address || 'N/A'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <User className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                <span className="font-medium">Inquilino: </span>
                <span className="truncate">{contract.tenantUser?.name || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <User className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                <span className="font-medium">Imóvel: </span>
                <span className="truncate">{contract.ownerUser?.name || 'N/A'}</span>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 pt-2 border-t">
              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <span className="hidden sm:inline font-medium">Período: </span>
                  <span className="text-[10px] sm:text-sm">
                    {contract.startDate ? formatDate(contract.startDate) : 'N/A'} - {contract.endDate ? formatDate(contract.endDate) : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="text-xs sm:text-sm text-right">
                <span className="font-medium">Aluguel: </span>
                <span>{formatCurrency(contract.monthlyRent || 0)}</span>
              </div>
            </div>

            {/* Token */}
            <div className="flex items-center gap-2 text-xs sm:text-sm pt-2 border-t">
              <span className="font-medium shrink-0">Token:</span>
              <code className="text-[10px] sm:text-xs bg-muted px-1.5 sm:px-2 py-0.5 sm:py-1 rounded truncate flex-1 min-w-0">
                {contract.contractToken}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0"
                onClick={copyToken}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signatures Status */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-sm sm:text-base">Status das Assinaturas</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            {signatureTypes.map((type) => {
              const sig = getSignatureStatus(type);
              return (
                <div
                  key={type}
                  className={cn(
                    'p-2 sm:p-4 rounded-lg border text-center',
                    sig?.signedAt ? 'bg-green-50 border-green-200' : 'bg-muted/30'
                  )}
                >
                  <div className="flex justify-center mb-1 sm:mb-2">
                    {sig?.signedAt ? (
                      <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-muted-foreground" />
                    )}
                  </div>
                  <p className="font-medium text-[10px] sm:text-sm">{signatureLabels[type]}</p>
                  {sig?.signedAt ? (
                    <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                      {formatDate(sig.signedAt)}
                    </p>
                  ) : (
                    <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Pendente</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Security Info - Collapsible on mobile */}
      <Card>
        <CardHeader
          className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6 cursor-pointer sm:cursor-auto"
          onClick={() => setShowSecurityInfo(!showSecurityInfo)}
        >
          <CardTitle className="flex items-center justify-between text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Informações de Segurança</span>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 sm:hidden transition-transform',
                showSecurityInfo && 'rotate-180'
              )}
            />
          </CardTitle>
        </CardHeader>
        <CardContent
          className={cn(
            'px-3 sm:px-6 pb-3 sm:pb-6 space-y-2 sm:space-y-3',
            !showSecurityInfo && 'hidden sm:block'
          )}
        >
          {contract.provisionalHash && (
            <div className="space-y-1">
              <span className="font-medium text-xs sm:text-sm">Hash Provisório:</span>
              <code className="text-[9px] sm:text-xs bg-muted px-2 py-1 rounded break-all block overflow-x-auto">
                {contract.provisionalHash}
              </code>
            </div>
          )}
          {contract.hashFinal && (
            <div className="space-y-1">
              <span className="font-medium text-xs sm:text-sm">Hash Final:</span>
              <code className="text-[9px] sm:text-xs bg-muted px-2 py-1 rounded break-all block overflow-x-auto">
                {contract.hashFinal}
              </code>
            </div>
          )}
          {!contract.provisionalHash && !contract.hashFinal && (
            <p className="text-xs sm:text-sm text-muted-foreground">
              O contrato ainda não foi preparado para assinatura.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Download Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {contract.provisionalHash && onDownloadProvisional && (
          <Button
            variant="outline"
            onClick={() => handleDownload('provisional')}
            disabled={downloading !== null}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            {downloading === 'provisional' ? 'Baixando...' : 'PDF Provisório'}
          </Button>
        )}
        {contract.hashFinal && onDownloadFinal && (
          <Button
            onClick={() => handleDownload('final')}
            disabled={downloading !== null}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
          >
            <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            {downloading === 'final' ? 'Baixando...' : 'PDF Final'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default ContractPdfPreview;
