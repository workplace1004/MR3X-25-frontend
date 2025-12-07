import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesAPI, propertiesAPI } from '../../api';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import {
  Receipt,
  Eye,
  MoreHorizontal,
  User,
  List,
  Grid3X3,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Filter,
  Ban,
  Building2,
  Download,
  Mail,
  Calendar,
  CreditCard,
  QrCode,
  Barcode,
  AlertTriangle,
} from 'lucide-react';
import { formatDate, formatCurrency } from '../../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';

// Types
interface Invoice {
  id: string;
  contractId: string;
  propertyId?: string;
  agencyId?: string;
  tenantId?: string;
  ownerId?: string;
  invoiceNumber?: string;
  referenceMonth?: string;
  description?: string;
  type: string;
  dueDate: string;
  originalValue: number;
  fine?: number;
  interest?: number;
  discount?: number;
  updatedValue: number;
  paidValue?: number;
  paidAt?: string;
  status: string;
  paymentMethod?: string;
  asaasId?: string;
  paymentLink?: string;
  boletoUrl?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  barcode?: string;
  boletoDigitableLine?: string;
  ownerAmount?: number;
  agencyAmount?: number;
  platformFee?: number;
  gatewayFee?: number;
  receiptUrl?: string;
  notes?: string;
  emailSentAt?: string;
  contract?: any;
  property?: any;
  tenant?: any;
  owner?: any;
  transfers?: any[];
  createdAt?: string;
}

export function Invoices() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check permissions
  const isCEO = user?.role === 'CEO';
  const canViewInvoices = ['CEO', 'AGENCY_ADMIN', 'AGENCY_MANAGER', 'BROKER', 'INDEPENDENT_OWNER', 'PROPRIETARIO'].includes(user?.role || '');
  const canManageInvoices = ['AGENCY_ADMIN', 'AGENCY_MANAGER', 'INDEPENDENT_OWNER'].includes(user?.role || '') && !isCEO;

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);

  // Filter states
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterProperty, setFilterProperty] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('');

  // Other states
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<Invoice | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [cancelReason, setCancelReason] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [markPaidData, setMarkPaidData] = useState({
    paymentMethod: 'PIX',
    paidValue: 0,
    paidAt: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Don't render if no permission
  if (!canViewInvoices) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Voce nao tem permissao para visualizar faturas.</p>
        </div>
      </div>
    );
  }

  // Query invoices
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', user?.id, filterType, filterStatus, filterProperty, filterMonth],
    queryFn: () => invoicesAPI.getInvoices({
      type: filterType && filterType !== 'all' ? filterType : undefined,
      status: filterStatus && filterStatus !== 'all' ? filterStatus : undefined,
      propertyId: filterProperty && filterProperty !== 'all' ? filterProperty : undefined,
      referenceMonth: filterMonth || undefined,
    }),
    enabled: canViewInvoices,
  });

  // Query statistics
  const { data: statistics } = useQuery({
    queryKey: ['invoices-statistics', user?.id],
    queryFn: () => invoicesAPI.getStatistics(),
    enabled: canViewInvoices,
  });

  // Load properties for filter
  useEffect(() => {
    const loadProperties = async () => {
      try {
        const propertiesData = await propertiesAPI.getProperties();
        setProperties(propertiesData);
      } catch (error) {
        console.error('Error loading properties:', error);
      }
    };
    loadProperties();
  }, []);

  // Helper function to close all modals
  const closeAllModals = () => {
    setShowDetailModal(false);
    setShowCancelModal(false);
    setShowResendModal(false);
    setShowMarkPaidModal(false);
    setSelectedInvoice(null);
    setInvoiceDetail(null);
    setCancelReason('');
    setResendEmail('');
    setMarkPaidData({
      paymentMethod: 'PIX',
      paidValue: 0,
      paidAt: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  // Mutations
  const markAsPaidMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => invoicesAPI.markAsPaid(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-statistics'] });
      closeAllModals();
      toast.success('Fatura marcada como paga');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao marcar fatura como paga');
    },
  });

  const cancelInvoiceMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => invoicesAPI.cancelInvoice(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-statistics'] });
      closeAllModals();
      toast.success('Fatura cancelada');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao cancelar fatura');
    },
  });

  const resendInvoiceMutation = useMutation({
    mutationFn: ({ id, email }: { id: string; email?: string }) => invoicesAPI.resendToTenant(id, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      closeAllModals();
      toast.success('Fatura reenviada para o inquilino');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao reenviar fatura');
    },
  });

  // Handlers
  const handleViewInvoice = async (invoice: Invoice) => {
    closeAllModals();
    setActionLoading(true);
    try {
      const fullDetails = await invoicesAPI.getInvoiceById(invoice.id);
      setInvoiceDetail(fullDetails);
      setShowDetailModal(true);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar detalhes da fatura');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsPaid = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setMarkPaidData({
      ...markPaidData,
      paidValue: invoice.updatedValue,
    });
    setShowMarkPaidModal(true);
  };

  const handleCancel = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowCancelModal(true);
  };

  const handleResend = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setResendEmail(invoice.tenant?.email || '');
    setShowResendModal(true);
  };

  const handleDownloadBoleto = async (invoice: Invoice) => {
    try {
      const data = await invoicesAPI.downloadInvoice(invoice.id);
      if (data.boletoUrl) {
        window.open(data.boletoUrl, '_blank');
      } else if (data.paymentLink) {
        window.open(data.paymentLink, '_blank');
      } else {
        toast.error('Link do boleto nao disponivel');
      }
    } catch (error) {
      toast.error('Erro ao baixar boleto');
    }
  };

  const handleDownloadReceipt = async (invoice: Invoice) => {
    try {
      const data = await invoicesAPI.downloadReceipt(invoice.id);
      if (data.receiptUrl) {
        window.open(data.receiptUrl, '_blank');
      } else {
        toast.info('Comprovante sera gerado automaticamente');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao baixar comprovante');
    }
  };

  const confirmMarkAsPaid = () => {
    if (selectedInvoice) {
      markAsPaidMutation.mutate({
        id: selectedInvoice.id,
        data: markPaidData,
      });
    }
  };

  const confirmCancel = () => {
    if (selectedInvoice) {
      cancelInvoiceMutation.mutate({
        id: selectedInvoice.id,
        reason: cancelReason,
      });
    }
  };

  const confirmResend = () => {
    if (selectedInvoice) {
      resendInvoiceMutation.mutate({
        id: selectedInvoice.id,
        email: resendEmail || undefined,
      });
    }
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      'PENDING': { label: 'Pendente', className: 'bg-yellow-500', icon: <Clock className="w-3 h-3" /> },
      'PAID': { label: 'Pago', className: 'bg-green-500', icon: <CheckCircle className="w-3 h-3" /> },
      'OVERDUE': { label: 'Vencido', className: 'bg-red-500', icon: <AlertTriangle className="w-3 h-3" /> },
      'CANCELED': { label: 'Cancelado', className: 'bg-gray-500', icon: <XCircle className="w-3 h-3" /> },
      'REFUNDED': { label: 'Estornado', className: 'bg-purple-500', icon: <XCircle className="w-3 h-3" /> },
    };
    const s = statusMap[status] || { label: status, className: 'bg-gray-500', icon: null };
    return (
      <Badge className={`${s.className} text-white flex items-center gap-1`}>
        {s.icon}
        {s.label}
      </Badge>
    );
  };

  // Type badge
  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; className: string }> = {
      'RENT': { label: 'Aluguel', className: 'bg-blue-100 text-blue-800' },
      'CONDOMINIUM': { label: 'Condominio', className: 'bg-purple-100 text-purple-800' },
      'EXTRA': { label: 'Extra', className: 'bg-orange-100 text-orange-800' },
      'FINE': { label: 'Multa', className: 'bg-red-100 text-red-800' },
      'PENALTY': { label: 'Penalidade', className: 'bg-pink-100 text-pink-800' },
      'OTHER': { label: 'Outro', className: 'bg-gray-100 text-gray-800' },
    };
    const t = typeMap[type] || { label: type, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={t.className}>{t.label}</Badge>;
  };

  // Check if invoice is overdue
  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === 'PAID' || invoice.status === 'CANCELED') return false;
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Faturas</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gerencie as faturas e cobran&ccedil;as dos contratos
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Toggle Buttons */}
            <div className="flex border border-border rounded-lg p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('table')}
                    className={viewMode === 'table' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visualiza&ccedil;ao em Tabela</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('cards')}
                    className={viewMode === 'cards' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visualiza&ccedil;ao em Cards</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                    <p className="text-xl font-bold">{statistics.byStatus?.pending || 0}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(statistics.totals?.pending || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pagas</p>
                    <p className="text-xl font-bold">{statistics.byStatus?.paid || 0}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(statistics.totals?.paid || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vencidas</p>
                    <p className="text-xl font-bold">{statistics.byStatus?.overdue || 0}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(statistics.totals?.overdue || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Canceladas</p>
                    <p className="text-xl font-bold">{statistics.byStatus?.canceled || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="RENT">Aluguel</SelectItem>
              <SelectItem value="CONDOMINIUM">Condominio</SelectItem>
              <SelectItem value="EXTRA">Extra</SelectItem>
              <SelectItem value="FINE">Multa</SelectItem>
              <SelectItem value="PENALTY">Penalidade</SelectItem>
              <SelectItem value="OTHER">Outro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="PAID">Pago</SelectItem>
              <SelectItem value="OVERDUE">Vencido</SelectItem>
              <SelectItem value="CANCELED">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterProperty} onValueChange={setFilterProperty}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Imóvel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos imóveis</SelectItem>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id?.toString()}>
                  {property.name || property.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-[180px]"
            placeholder="Mes de referencia"
          />
          {((filterType && filterType !== 'all') || (filterStatus && filterStatus !== 'all') || (filterProperty && filterProperty !== 'all') || filterMonth) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterType('');
                setFilterStatus('');
                setFilterProperty('');
                setFilterMonth('');
              }}
            >
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Invoices Display */}
        {invoices && invoices.length > 0 ? (
          viewMode === 'table' ? (
            /* Table View */
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-semibold">Fatura</th>
                      <th className="text-left p-4 font-semibold">Inquilino</th>
                      <th className="text-left p-4 font-semibold">Imóvel</th>
                      <th className="text-left p-4 font-semibold">Tipo</th>
                      <th className="text-left p-4 font-semibold">Vencimento</th>
                      <th className="text-right p-4 font-semibold">Valor</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-left p-4 font-semibold">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice: Invoice) => (
                      <tr key={invoice.id} className={`border-t border-border hover:bg-muted/30 transition-colors ${isOverdue(invoice) ? 'bg-red-50' : ''}`}>
                        <td className="p-4">
                          <div className="font-medium">{invoice.invoiceNumber || `#${invoice.id}`}</div>
                          {invoice.referenceMonth && (
                            <div className="text-xs text-muted-foreground">Ref: {invoice.referenceMonth}</div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{invoice.tenant?.name || 'Sem inquilino'}</div>
                              <div className="text-xs text-muted-foreground">{invoice.tenant?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{invoice.property?.name || invoice.property?.address || '-'}</span>
                          </div>
                        </td>
                        <td className="p-4">{getTypeBadge(invoice.type)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className={isOverdue(invoice) ? 'text-red-600 font-medium' : ''}>
                              {formatDate(invoice.dueDate)}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="font-medium">{formatCurrency(invoice.updatedValue)}</div>
                          {invoice.paidValue && invoice.status === 'PAID' && (
                            <div className="text-xs text-green-600">Pago: {formatCurrency(invoice.paidValue)}</div>
                          )}
                        </td>
                        <td className="p-4">{getStatusBadge(invoice.status)}</td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" disabled={actionLoading}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewInvoice(invoice)} disabled={actionLoading}>
                                <Eye className="w-4 h-4 mr-2" />
                                {actionLoading ? 'Carregando...' : 'Ver detalhes'}
                              </DropdownMenuItem>
                              {invoice.status !== 'PAID' && invoice.status !== 'CANCELED' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleDownloadBoleto(invoice)}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Baixar boleto
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleResend(invoice)}>
                                    <Mail className="w-4 h-4 mr-2" />
                                    Reenviar para inquilino
                                  </DropdownMenuItem>
                                </>
                              )}
                              {invoice.status === 'PAID' && (
                                <DropdownMenuItem onClick={() => handleDownloadReceipt(invoice)}>
                                  <FileText className="w-4 h-4 mr-2" />
                                  Baixar comprovante
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {canManageInvoices && invoice.status !== 'PAID' && invoice.status !== 'CANCELED' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice)}>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Marcar como pago
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleCancel(invoice)}
                                    className="text-red-600"
                                  >
                                    <Ban className="w-4 h-4 mr-2" />
                                    Cancelar fatura
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Card View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {invoices.map((invoice: Invoice) => (
                <Card key={invoice.id} className={`hover:shadow-md transition-shadow ${isOverdue(invoice) ? 'border-red-300' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOverdue(invoice) ? 'bg-red-100' : 'bg-orange-100'}`}>
                          <Receipt className={`w-5 h-5 ${isOverdue(invoice) ? 'text-red-600' : 'text-orange-600'}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{invoice.invoiceNumber || `#${invoice.id}`}</h3>
                          <p className="text-xs text-muted-foreground">{invoice.referenceMonth || '-'}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          {invoice.status !== 'PAID' && invoice.status !== 'CANCELED' && (
                            <>
                              <DropdownMenuItem onClick={() => handleDownloadBoleto(invoice)}>
                                <Download className="w-4 h-4 mr-2" />
                                Baixar boleto
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleResend(invoice)}>
                                <Mail className="w-4 h-4 mr-2" />
                                Reenviar
                              </DropdownMenuItem>
                            </>
                          )}
                          {canManageInvoices && invoice.status !== 'PAID' && invoice.status !== 'CANCELED' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice)}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Marcar como pago
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCancel(invoice)} className="text-red-600">
                                <Ban className="w-4 h-4 mr-2" />
                                Cancelar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{invoice.tenant?.name || 'Sem inquilino'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="w-4 h-4" />
                        <span className="truncate">{invoice.property?.name || invoice.property?.address || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className={isOverdue(invoice) ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                          {formatDate(invoice.dueDate)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                      <div>
                        {getTypeBadge(invoice.type)}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{formatCurrency(invoice.updatedValue)}</div>
                        {getStatusBadge(invoice.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          /* Empty State */
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma fatura encontrada</h3>
            <p className="text-muted-foreground">
              As faturas sao geradas automaticamente a partir dos contratos
            </p>
          </div>
        )}

        {/* Detail Modal */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Fatura</DialogTitle>
            </DialogHeader>
            {invoiceDetail && (
              <div className="space-y-6">
                {/* Header Info */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{invoiceDetail.invoiceNumber || `#${invoiceDetail.id}`}</h2>
                    {invoiceDetail.referenceMonth && (
                      <p className="text-muted-foreground">Referencia: {invoiceDetail.referenceMonth}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {getStatusBadge(invoiceDetail.status)}
                    {getTypeBadge(invoiceDetail.type)}
                  </div>
                </div>

                {/* Tenant & Property Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <Label className="text-muted-foreground">Inquilino</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="w-4 h-4" />
                      <div>
                        <p className="font-medium">{invoiceDetail.tenant?.name || 'Nao informado'}</p>
                        <p className="text-sm text-muted-foreground">{invoiceDetail.tenant?.email}</p>
                        {invoiceDetail.tenant?.phone && (
                          <p className="text-sm text-muted-foreground">{invoiceDetail.tenant?.phone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <Label className="text-muted-foreground">Imóvel</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Building2 className="w-4 h-4" />
                      <div>
                        <p className="font-medium">{invoiceDetail.property?.name || invoiceDetail.property?.address}</p>
                        <p className="text-sm text-muted-foreground">
                          {invoiceDetail.property?.neighborhood}, {invoiceDetail.property?.city}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Details */}
                <div className="p-4 border rounded-lg">
                  <Label className="text-muted-foreground mb-3 block">Valores</Label>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Valor Original</span>
                      <span>{formatCurrency(invoiceDetail.originalValue)}</span>
                    </div>
                    {invoiceDetail.fine && invoiceDetail.fine > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Multa</span>
                        <span>+ {formatCurrency(invoiceDetail.fine)}</span>
                      </div>
                    )}
                    {invoiceDetail.interest && invoiceDetail.interest > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Juros</span>
                        <span>+ {formatCurrency(invoiceDetail.interest)}</span>
                      </div>
                    )}
                    {invoiceDetail.discount && invoiceDetail.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Desconto</span>
                        <span>- {formatCurrency(invoiceDetail.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total</span>
                      <span>{formatCurrency(invoiceDetail.updatedValue)}</span>
                    </div>
                    {invoiceDetail.status === 'PAID' && invoiceDetail.paidValue && (
                      <div className="flex justify-between text-green-600">
                        <span>Valor Pago</span>
                        <span>{formatCurrency(invoiceDetail.paidValue)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Split Information */}
                {(invoiceDetail.ownerAmount || invoiceDetail.agencyAmount) && (
                  <div className="p-4 border rounded-lg">
                    <Label className="text-muted-foreground mb-3 block">Divisao (Split)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {invoiceDetail.ownerAmount && (
                        <div>
                          <p className="text-sm text-muted-foreground">Proprietario</p>
                          <p className="font-medium">{formatCurrency(invoiceDetail.ownerAmount)}</p>
                        </div>
                      )}
                      {invoiceDetail.agencyAmount && (
                        <div>
                          <p className="text-sm text-muted-foreground">Imobiliaria</p>
                          <p className="font-medium">{formatCurrency(invoiceDetail.agencyAmount)}</p>
                        </div>
                      )}
                      {invoiceDetail.platformFee && (
                        <div>
                          <p className="text-sm text-muted-foreground">Taxa MR3X</p>
                          <p className="font-medium">{formatCurrency(invoiceDetail.platformFee)}</p>
                        </div>
                      )}
                      {invoiceDetail.gatewayFee && (
                        <div>
                          <p className="text-sm text-muted-foreground">Taxa Gateway</p>
                          <p className="font-medium">{formatCurrency(invoiceDetail.gatewayFee)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <Label className="text-muted-foreground">Vencimento</Label>
                    <p className="font-medium mt-1">{formatDate(invoiceDetail.dueDate)}</p>
                  </div>
                  {invoiceDetail.paidAt && (
                    <div className="p-4 border rounded-lg">
                      <Label className="text-muted-foreground">Data do Pagamento</Label>
                      <p className="font-medium mt-1">{formatDate(invoiceDetail.paidAt)}</p>
                    </div>
                  )}
                  {invoiceDetail.paymentMethod && (
                    <div className="p-4 border rounded-lg">
                      <Label className="text-muted-foreground">Metodo de Pagamento</Label>
                      <p className="font-medium mt-1">{invoiceDetail.paymentMethod}</p>
                    </div>
                  )}
                </div>

                {/* Payment Links */}
                {invoiceDetail.status !== 'PAID' && invoiceDetail.status !== 'CANCELED' && (
                  <div className="p-4 border rounded-lg">
                    <Label className="text-muted-foreground mb-3 block">Links de Pagamento</Label>
                    <div className="flex flex-wrap gap-2">
                      {invoiceDetail.paymentLink && (
                        <Button variant="outline" onClick={() => window.open(invoiceDetail.paymentLink!, '_blank')}>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pagar Online
                        </Button>
                      )}
                      {invoiceDetail.boletoUrl && (
                        <Button variant="outline" onClick={() => window.open(invoiceDetail.boletoUrl!, '_blank')}>
                          <Barcode className="w-4 h-4 mr-2" />
                          Ver Boleto
                        </Button>
                      )}
                      {invoiceDetail.pixCopyPaste && (
                        <Button variant="outline" onClick={() => {
                          navigator.clipboard.writeText(invoiceDetail.pixCopyPaste!);
                          toast.success('Codigo PIX copiado!');
                        }}>
                          <QrCode className="w-4 h-4 mr-2" />
                          Copiar PIX
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {invoiceDetail.notes && (
                  <div className="p-4 border rounded-lg">
                    <Label className="text-muted-foreground">Observacoes</Label>
                    <p className="mt-1 whitespace-pre-wrap">{invoiceDetail.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Mark as Paid Modal */}
        <Dialog open={showMarkPaidModal} onOpenChange={setShowMarkPaidModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Marcar como Pago</DialogTitle>
              <DialogDescription>
                Registre o pagamento manual desta fatura
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Metodo de Pagamento</Label>
                <Select
                  value={markPaidData.paymentMethod}
                  onValueChange={(value) => setMarkPaidData({ ...markPaidData, paymentMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                    <SelectItem value="CREDIT_CARD">Cartao de Credito</SelectItem>
                    <SelectItem value="TRANSFER">Transferencia</SelectItem>
                    <SelectItem value="CASH">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor Pago</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={markPaidData.paidValue}
                  onChange={(e) => setMarkPaidData({ ...markPaidData, paidValue: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Data do Pagamento</Label>
                <Input
                  type="date"
                  value={markPaidData.paidAt}
                  onChange={(e) => setMarkPaidData({ ...markPaidData, paidAt: e.target.value })}
                />
              </div>
              <div>
                <Label>Observacoes</Label>
                <Textarea
                  value={markPaidData.notes}
                  onChange={(e) => setMarkPaidData({ ...markPaidData, notes: e.target.value })}
                  placeholder="Observacoes sobre o pagamento..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowMarkPaidModal(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={confirmMarkAsPaid}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={markAsPaidMutation.isPending}
                >
                  {markAsPaidMutation.isPending ? 'Salvando...' : 'Confirmar Pagamento'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancel Modal */}
        <AlertDialog open={showCancelModal} onOpenChange={setShowCancelModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar Fatura</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja cancelar esta fatura? Esta acao nao pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label>Motivo do cancelamento (opcional)</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Informe o motivo do cancelamento..."
                className="mt-2"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmCancel}
                className="bg-red-600 hover:bg-red-700"
              >
                Cancelar Fatura
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Resend Modal */}
        <Dialog open={showResendModal} onOpenChange={setShowResendModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reenviar Fatura</DialogTitle>
              <DialogDescription>
                A fatura sera reenviada para o email do inquilino
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowResendModal(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={confirmResend}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={resendInvoiceMutation.isPending}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {resendInvoiceMutation.isPending ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
