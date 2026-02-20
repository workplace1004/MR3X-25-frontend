import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsAPI, propertiesAPI, contractsAPI, invoicesAPI } from '../../api';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { useOwnerPermissions } from '../../hooks/useOwnerPermissions';
import {
  DollarSign,
  Plus,
  Calendar,
  Building2,
  TrendingUp,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  User,
  Search,
  Loader2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { ReadOnlyBadge } from '../../components/ui/read-only-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';

export function Payments() {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const ownerPermissions = useOwnerPermissions('payments');

  const isCEO = user?.role === 'CEO';
  const isReadOnlyOwner = ownerPermissions.isReadOnly;
  const canViewPayments = hasPermission('payments:read');
  const canCreatePayments = hasPermission('payments:create') && !isCEO && !isReadOnlyOwner;
  const canUpdatePayments = hasPermission('payments:update') && !isCEO && !isReadOnlyOwner;
  const canDeletePayments = hasPermission('payments:delete') && !isCEO && !isReadOnlyOwner;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [newPayment, setNewPayment] = useState({
    propertyId: '',
    contratoId: '',
    valorPago: '',
    dataPagamento: '',
    tipo: 'ALUGUEL',
  });

  const [editForm, setEditForm] = useState({
    propertyId: '',
    contratoId: '',
    valorPago: '',
    dataPagamento: '',
    tipo: 'ALUGUEL',
  });

  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<any>(null);
  const [paymentDetail, setPaymentDetail] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [selectedYear] = useState(new Date().getFullYear());
  const [_loading, _setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

  const handleSearch = useCallback(() => {
    setSearchQuery(searchTerm.trim());
  }, [searchTerm]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchQuery('');
  }, []);

  if (!canViewPayments) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view payments.</p>
        </div>
      </div>
    );
  }

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', searchQuery],
    queryFn: () => paymentsAPI.getPayments(searchQuery ? { search: searchQuery } : undefined),
    enabled: canViewPayments,
  });

  // Also fetch invoices (automatically generated when contracts are signed)
  // For PROPRIETARIO role, filter by ownerId
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices', user?.id, user?.role, user?.agencyId, searchQuery],
    queryFn: async () => {
      try {
        const params: any = { take: 1000 };
        // For PROPRIETARIO role, filter invoices by ownerId
        if (user?.role === 'PROPRIETARIO' && user?.id) {
          params.ownerId = user.id;
        }
        const result = await invoicesAPI.getInvoices(params);
        // Handle different response formats
        if (Array.isArray(result)) {
          return result;
        } else if (result?.data && Array.isArray(result.data)) {
          return result.data;
        } else if (result?.items && Array.isArray(result.items)) {
          return result.items;
        }
        return [];
      } catch (error) {
        console.error('Error fetching invoices:', error);
        return [];
      }
    },
    enabled: canViewPayments,
  });

  const isLoading = paymentsLoading || invoicesLoading;

  const { data: annualReport } = useQuery({
    queryKey: ['annual-report', selectedYear],
    queryFn: () => paymentsAPI.getAnnualReport(selectedYear),
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [propertiesData, contractsData] = await Promise.all([
          propertiesAPI.getProperties(),
          contractsAPI.getContracts()
        ]);
        setProperties(propertiesData);
        setContracts(contractsData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  // Get properties owned by PROPRIETARIO user for filtering
  const ownedProperties = useMemo(() => {
    if (user?.role === 'PROPRIETARIO' && user?.id && properties.length > 0) {
      return properties.filter((p: any) => 
        p.ownerId === user.id || 
        String(p.ownerId) === String(user.id) ||
        p.owner?.id === user.id ||
        String(p.owner?.id) === String(user.id)
      );
    }
    return properties;
  }, [properties, user?.role, user?.id]);

  const closeAllModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDetailModal(false);
    setSelectedPayment(null);
    setPaymentToDelete(null);
  };

  const createPaymentMutation = useMutation({
    mutationFn: (data: any) => paymentsAPI.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['annual-report'] });
      closeAllModals();
      setNewPayment({
        propertyId: '', contratoId: '', valorPago: '', dataPagamento: '',
        tipo: 'ALUGUEL'
      });
      toast.success('Pagamento registrado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao registrar pagamento');
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => paymentsAPI.updatePayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['annual-report'] });
      closeAllModals();
      toast.success('Pagamento atualizado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao atualizar pagamento');
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => paymentsAPI.deletePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['annual-report'] });
      closeAllModals();
      toast.success('Pagamento excluído com sucesso');
    },
    onError: () => {
      toast.error('Erro ao excluir pagamento');
    },
  });

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const paymentToSend = {
        propertyId: newPayment.propertyId,
        contratoId: newPayment.contratoId,
        valorPago: Number(newPayment.valorPago),
        dataPagamento: newPayment.dataPagamento,
        tipo: newPayment.tipo,
      };
      createPaymentMutation.mutate(paymentToSend);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setUpdating(true);
    try {
      const paymentToSend = {
        propertyId: editForm.propertyId,
        contratoId: editForm.contratoId,
        valorPago: Number(editForm.valorPago),
        dataPagamento: editForm.dataPagamento,
        tipo: editForm.tipo,
      };
      updatePaymentMutation.mutate({ id: selectedPayment.id, data: paymentToSend });
    } finally {
      setUpdating(false);
    }
  };

  const handleViewPayment = async (payment: any) => {
    closeAllModals();
    setSelectedPayment(payment);
    setPaymentDetail(payment);
    setShowDetailModal(true);
  };

  const handleEditPayment = (payment: any) => {
    closeAllModals();
    setSelectedPayment(payment);
    setEditForm({
      propertyId: payment.propertyId?.toString() || '',
      contratoId: payment.contractId?.toString() || payment.contratoId?.toString() || '',
      valorPago: (payment.valorPago || payment.amount)?.toString() || '',
      dataPagamento: (payment.dataPagamento || payment.paymentDate) ? (payment.dataPagamento || payment.paymentDate).split('T')[0] : '',
      tipo: payment.tipo || payment.paymentType || 'ALUGUEL',
    });
    setShowEditModal(true);
  };

  const handleDeletePayment = (payment: any) => {
    closeAllModals();
    setPaymentToDelete(payment);
  };

  const confirmDelete = () => {
    if (paymentToDelete) {
      deletePaymentMutation.mutate(paymentToDelete.id);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewPayment(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const getPaymentTypeBadge = (type: string) => {
    switch (type) {
      case 'PIX':
        return <Badge className="bg-green-500 text-white">PIX</Badge>;
      case 'BOLETO':
        return <Badge className="bg-blue-500 text-white">Boleto</Badge>;
      case 'TRANSFERENCIA':
        return <Badge className="bg-purple-500 text-white">Transferência</Badge>;
      case 'DINHEIRO':
        return <Badge className="bg-gray-500 text-white">Dinheiro</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">{type}</Badge>;
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    if (!method) return null;
    return getPaymentTypeBadge(method);
  };

  // Combine payments and invoices into a single list
  const allPaymentsAndInvoices = useMemo(() => {
    const paymentsList = Array.isArray(payments) ? payments : [];
    const invoicesList = Array.isArray(invoicesData) ? invoicesData : [];
    
    // For PROPRIETARIO role, filter to only show payments/invoices for owned properties
    let filteredPayments = paymentsList;
    let filteredInvoices = invoicesList;
    
    if (user?.role === 'PROPRIETARIO' && user?.id && ownedProperties.length > 0) {
      const ownedPropertyIds = ownedProperties.map((p: any) => 
        p.id?.toString() || String(p.id)
      );
      
      // Filter payments by property ownership
      filteredPayments = paymentsList.filter((payment: any) => {
        const propertyId = payment.propertyId?.toString() || String(payment.propertyId);
        return ownedPropertyIds.includes(propertyId);
      });
      
      // Filter invoices by property ownership or ownerId
      filteredInvoices = invoicesList.filter((invoice: any) => {
        // Check if invoice has ownerId matching user
        if (invoice.ownerId && (invoice.ownerId === user.id || String(invoice.ownerId) === String(user.id))) {
          return true;
        }
        // Check if invoice property is owned by user
        const propertyId = invoice.propertyId?.toString() || invoice.property?.id?.toString() || String(invoice.propertyId);
        return ownedPropertyIds.includes(propertyId);
      });
    }
    
    // Convert invoices to payment-like format for display
    const formattedInvoices = filteredInvoices.map((invoice: any) => ({
      id: `invoice_${invoice.id}`,
      isInvoice: true,
      invoiceId: invoice.id,
      amount: invoice.paidValue || invoice.updatedValue || invoice.originalValue || 0,
      valorPago: invoice.paidValue || invoice.updatedValue || invoice.originalValue || 0,
      paymentDate: invoice.paidAt || invoice.dueDate,
      dataPagamento: invoice.paidAt || invoice.dueDate,
      dueDate: invoice.dueDate, // Include dueDate for pending invoices
      tipo: invoice.paymentMethod || 'FATURA',
      paymentType: invoice.paymentMethod || 'FATURA',
      paymentMethod: invoice.paymentMethod, // Include paymentMethod for display
      status: invoice.status,
      property: invoice.property,
      user: invoice.tenant,
      tenantUser: invoice.tenant,
      contract: invoice.contract,
      referenceMonth: invoice.referenceMonth,
      invoiceNumber: invoice.invoiceNumber,
      updatedValue: invoice.updatedValue,
      originalValue: invoice.originalValue,
    }));

    // Ensure paymentMethod and status are included in payments list
    const paymentsWithMethod = filteredPayments.map((payment: any) => ({
      ...payment,
      paymentMethod: payment.paymentMethod || payment.payment_method, // Support both formats
      status: payment.status || 'PAID', // Default to PAID if status not set (for backward compatibility)
    }));

    // Remove duplicate invoices that have corresponding Payment records
    // If an invoice is PAID and there's a Payment with same contract, date, and value, exclude the invoice
    const invoicesWithoutDuplicates = formattedInvoices.filter((invoice: any) => {
      // Only check for duplicates if invoice is PAID
      if (invoice.status !== 'PAID' && invoice.status !== 'PAGO') {
        return true; // Keep pending/overdue invoices
      }

      // Check if there's a matching Payment record
      const hasMatchingPayment = paymentsWithMethod.some((payment: any) => {
        const invoiceContractId = invoice.contract?.id?.toString() || invoice.contractId?.toString();
        const paymentContractId = payment.contratoId?.toString() || payment.contractId?.toString();
        
        const invoiceDate = invoice.paymentDate || invoice.dataPagamento;
        const paymentDate = payment.dataPagamento || payment.paymentDate;
        
        const invoiceValue = Number(invoice.valorPago || invoice.amount || 0);
        const paymentValue = Number(payment.valorPago || payment.amount || 0);
        
        // Get property IDs for additional matching
        const invoicePropertyId = invoice.property?.id?.toString() || invoice.propertyId?.toString();
        const paymentPropertyId = payment.propertyId?.toString() || payment.property?.id?.toString();
        
        // Match by contract, date (same day), and similar value (within 0.01 difference for rounding)
        const contractMatch = invoiceContractId && paymentContractId && invoiceContractId === paymentContractId;
        const propertyMatch = invoicePropertyId && paymentPropertyId && invoicePropertyId === paymentPropertyId;
        const dateMatch = invoiceDate && paymentDate && 
          new Date(invoiceDate).toDateString() === new Date(paymentDate).toDateString();
        const valueMatch = Math.abs(invoiceValue - paymentValue) < 0.01;
        
        // Match if contract+date+value match, or property+date+value match (for cases without contract)
        return (contractMatch || propertyMatch) && dateMatch && valueMatch;
      });

      // Exclude invoice if there's a matching payment
      return !hasMatchingPayment;
    });

    // Combine and sort by date (most recent first)
    const combined = [...paymentsWithMethod, ...invoicesWithoutDuplicates].sort((a: any, b: any) => {
      const dateA = new Date(a.paymentDate || a.dataPagamento || 0).getTime();
      const dateB = new Date(b.paymentDate || b.dataPagamento || 0).getTime();
      return dateB - dateA;
    });

    // Apply search filter if needed
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return combined.filter((item: any) => {
        const propertyName = (item.property?.name || item.property?.address || '').toLowerCase();
        const tenantName = (item.user?.name || item.tenantUser?.name || '').toLowerCase();
        return propertyName.includes(query) || tenantName.includes(query);
      });
    }

    return combined;
  }, [payments, invoicesData, searchQuery, user?.role, user?.id, ownedProperties]);

  // Separate pending and completed payments
  const pendingPayments = useMemo(() => {
    return allPaymentsAndInvoices.filter((p: any) => {
      const status = p.status?.toUpperCase();
      return status === 'PENDING' || status === 'OVERDUE';
    });
  }, [allPaymentsAndInvoices]);

  const completedPayments = useMemo(() => {
    return allPaymentsAndInvoices.filter((p: any) => {
      const status = p.status?.toUpperCase();
      return status === 'PAID' || status === 'PAGO' || !status; // Include items without status as completed
    });
  }, [allPaymentsAndInvoices]);

  // Calculate pending totals
  const pendingTotal = useMemo(() => {
    return pendingPayments.reduce((sum, p: any) => {
      const amount = (p as any).isInvoice 
        ? Number((p as any).updatedValue || (p as any).originalValue || p.amount || p.valorPago || 0)
        : Number(p.amount || p.valorPago || 0);
      return sum + amount;
    }, 0);
  }, [pendingPayments]);

  if (isLoading) {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <Skeleton className="h-10 w-10 rounded" />
          </div>

          {/* Search Bar Skeleton */}
          <Skeleton className="h-10 w-full max-w-lg" />

          {/* Summary Cards Skeleton */}
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                  </div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Payment Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-0">
                  <div className="flex">
                    <Skeleton className="w-28 h-36 rounded-l-md" />
                    <div className="flex-1 p-4 space-y-2">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex items-center justify-between mt-auto">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="w-10 h-10" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <PageHeader 
          title="Pagamentos" 
          subtitle="Gerencie todos os seus pagamentos"
        />
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Pagamentos
                {isReadOnlyOwner && (
                  <ReadOnlyBadge className="ml-3 align-middle" />
                )}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Acompanhe todos os seus pagamentos
              </p>
            </div>
          </div>

          {canCreatePayments && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => {
                    closeAllModals();
                    setShowCreateModal(true);
                  }}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Registrar Pagamento</TooltipContent>
            </Tooltip>
          )}
        </div>

        {isReadOnlyOwner && (
          <ReadOnlyBadge
            variant="banner"
            message={ownerPermissions.restrictionMessage}
          />
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex w-full sm:max-w-lg gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="Pesquisar por imóvel ou inquilino"
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} className="self-stretch">
              Buscar
            </Button>
            {(searchTerm || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="self-stretch"
              >
                Limpar
              </Button>
            )}
          </div>
        </div>

        { }
        {annualReport && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
            <Card>
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="p-2 sm:p-3 bg-green-500/10 text-green-500 rounded-lg shrink-0">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                  </div>
                </div>
                <h3 className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1">Total Anual ({selectedYear})</h3>
                <p className="text-sm sm:text-lg md:text-2xl font-bold truncate">{formatCurrency(annualReport.total)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="p-2 sm:p-3 bg-blue-500/10 text-blue-500 rounded-lg shrink-0">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                  </div>
                </div>
                <h3 className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1">Total Pagamentos</h3>
                <p className="text-sm sm:text-lg md:text-2xl font-bold">{annualReport.totalPayments}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="p-2 sm:p-3 bg-purple-500/10 text-purple-500 rounded-lg shrink-0">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                  </div>
                </div>
                <h3 className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1">Média Mensal</h3>
                <p className="text-sm sm:text-lg md:text-2xl font-bold truncate">
                  {formatCurrency(annualReport.total / 12)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pending Payments Summary */}
        {pendingPayments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 md:gap-6">
            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="p-2 sm:p-3 bg-orange-500/10 text-orange-500 rounded-lg shrink-0">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                  </div>
                </div>
                <h3 className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1">Pagamentos Pendentes</h3>
                <p className="text-sm sm:text-lg md:text-2xl font-bold text-orange-600">{pendingPayments.length}</p>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="p-2 sm:p-3 bg-orange-500/10 text-orange-500 rounded-lg shrink-0">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                  </div>
                </div>
                <h3 className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1">Valor Total Pendente</h3>
                <p className="text-sm sm:text-lg md:text-2xl font-bold text-orange-600 truncate">{formatCurrency(pendingTotal)}</p>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50/50">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="p-2 sm:p-3 bg-red-500/10 text-red-500 rounded-lg shrink-0">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                  </div>
                </div>
                <h3 className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1">Pagamentos Vencidos</h3>
                <p className="text-sm sm:text-lg md:text-2xl font-bold text-red-600">
                  {pendingPayments.filter((p: any) => p.status?.toUpperCase() === 'OVERDUE').length}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="w-full">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'completed')} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">
                Pendentes ({pendingPayments.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completados ({completedPayments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {pendingPayments && pendingPayments.length > 0 ? (
                  pendingPayments.map((payment: any) => {
                const isPending = payment.status?.toUpperCase() === 'PENDING' || payment.status?.toUpperCase() === 'OVERDUE';
                const isOverdue = payment.status?.toUpperCase() === 'OVERDUE';
                return (
                <Card 
                  key={payment.id} 
                  className={`transition-all hover:shadow-md overflow-hidden ${
                    isOverdue ? 'border-red-300 bg-red-50/30' : 
                    isPending ? 'border-orange-300 bg-orange-50/30' : 
                    ''
                  }`}
                >
                  <CardContent className="p-0">
                    <div className="flex">
                      { }
                      <div className="w-20 sm:w-28 min-w-[5rem] sm:min-w-[7rem] h-32 sm:h-36 bg-primary/10 flex items-center justify-center rounded-l-md">
                        <DollarSign className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
                      </div>
                      { }
                      <div className="flex-1 flex flex-col justify-between p-3 sm:p-4 min-w-0">
                        <div>
                          <h3 className="text-base sm:text-lg font-bold truncate">
                            {formatCurrency(Number(payment.amount || payment.valorPago))}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            <Building2 className="w-3 h-3 inline mr-1" />
                            {payment.property?.name || payment.property?.address || 'Imóvel'}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            <User className="w-3 h-3 inline mr-1" />
                            {payment.user?.name || payment.tenantUser?.name || 'Inquilino'}
                          </p>
                          <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
                            <Calendar className={`w-3 h-3 shrink-0 ${
                              isPending ? 'text-orange-600' : 
                              isOverdue ? 'text-red-600' : 
                              'text-muted-foreground'
                            }`} />
                            <span className={`text-[10px] sm:text-xs ${
                              isPending ? 'text-orange-600 font-medium' : 
                              isOverdue ? 'text-red-600 font-medium' : 
                              'text-muted-foreground'
                            }`}>
                              {isPending && payment.dueDate 
                                ? `Vencimento: ${formatDate(payment.dueDate)}` 
                                : formatDate(payment.paymentDate || payment.dataPagamento)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {payment.isInvoice && (
                              <Badge className="bg-indigo-500 text-white text-xs">Fatura</Badge>
                            )}
                            {/* Display payment method if available */}
                            {(payment.paymentMethod || payment.payment_method) && 
                             getPaymentMethodBadge(payment.paymentMethod || payment.payment_method)}
                            {/* Display payment type if method not available or if type is different */}
                            {(!payment.paymentMethod && !payment.payment_method) && 
                             getPaymentTypeBadge(payment.paymentType || payment.tipo)}
                            {payment.status && (
                              <Badge className={
                                payment.status === 'PAID' ? 'bg-green-500 text-white' :
                                payment.status === 'PENDING' ? 'bg-yellow-500 text-white' :
                                payment.status === 'OVERDUE' ? 'bg-red-500 text-white' :
                                'bg-gray-500 text-white'
                              }>
                                {payment.status === 'PAID' ? 'Pago' :
                                 payment.status === 'PENDING' ? 'Pendente' :
                                 payment.status === 'OVERDUE' ? 'Vencido' :
                                 payment.status}
                              </Badge>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="outline" className="h-8 w-8 sm:h-10 sm:w-10">
                                <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewPayment(payment)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              {!payment.isInvoice && canUpdatePayments && (
                                <DropdownMenuItem onClick={() => handleEditPayment(payment)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar pagamento
                                </DropdownMenuItem>
                              )}
                              {!payment.isInvoice && canDeletePayments && (
                                <DropdownMenuItem onClick={() => handleDeletePayment(payment)} className="text-red-600 focus:text-red-700">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir pagamento
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
                  })
                ) : (
                  <div className="text-center py-12 sm:py-16 bg-card border border-border rounded-lg px-4 col-span-full">
                    <DollarSign className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhum pagamento pendente</h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-4">
                      Não há pagamentos pendentes no momento
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {completedPayments && completedPayments.length > 0 ? (
                  completedPayments.map((payment: any) => {
                    const isPending = payment.status?.toUpperCase() === 'PENDING' || payment.status?.toUpperCase() === 'OVERDUE';
                    const isOverdue = payment.status?.toUpperCase() === 'OVERDUE';
                    return (
                    <Card 
                      key={payment.id} 
                      className={`transition-all hover:shadow-md overflow-hidden ${
                        isOverdue ? 'border-red-300 bg-red-50/30' : 
                        isPending ? 'border-orange-300 bg-orange-50/30' : 
                        ''
                      }`}
                    >
                      <CardContent className="p-0">
                        <div className="flex">
                          { }
                          <div className="w-20 sm:w-28 min-w-[5rem] sm:min-w-[7rem] h-32 sm:h-36 bg-primary/10 flex items-center justify-center rounded-l-md">
                            <DollarSign className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
                          </div>
                          { }
                          <div className="flex-1 flex flex-col justify-between p-3 sm:p-4 min-w-0">
                            <div>
                              <h3 className="text-base sm:text-lg font-bold truncate">
                                {formatCurrency(Number(payment.amount || payment.valorPago))}
                              </h3>
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                <Building2 className="w-3 h-3 inline mr-1" />
                                {payment.property?.name || payment.property?.address || 'Imóvel'}
                              </p>
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                <User className="w-3 h-3 inline mr-1" />
                                {payment.user?.name || payment.tenantUser?.name || 'Inquilino'}
                              </p>
                              <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
                                <Calendar className={`w-3 h-3 shrink-0 ${
                                  isPending ? 'text-orange-600' : 
                                  isOverdue ? 'text-red-600' : 
                                  'text-muted-foreground'
                                }`} />
                                <span className={`text-[10px] sm:text-xs ${
                                  isPending ? 'text-orange-600 font-medium' : 
                                  isOverdue ? 'text-red-600 font-medium' : 
                                  'text-muted-foreground'
                                }`}>
                                  {isPending && payment.dueDate 
                                    ? `Vencimento: ${formatDate(payment.dueDate)}` 
                                    : formatDate(payment.paymentDate || payment.dataPagamento)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-2 gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {payment.isInvoice && (
                                  <Badge className="bg-indigo-500 text-white text-xs">Fatura</Badge>
                                )}
                                {/* Display payment method if available */}
                                {(payment.paymentMethod || payment.payment_method) && 
                                 getPaymentMethodBadge(payment.paymentMethod || payment.payment_method)}
                                {/* Display payment type if method not available or if type is different */}
                                {(!payment.paymentMethod && !payment.payment_method) && 
                                 getPaymentTypeBadge(payment.paymentType || payment.tipo)}
                                {payment.status && (
                                  <Badge className={
                                    payment.status === 'PAID' ? 'bg-green-500 text-white' :
                                    payment.status === 'PENDING' ? 'bg-yellow-500 text-white' :
                                    payment.status === 'OVERDUE' ? 'bg-red-500 text-white' :
                                    'bg-gray-500 text-white'
                                  }>
                                    {payment.status === 'PAID' ? 'Pago' :
                                     payment.status === 'PENDING' ? 'Pendente' :
                                     payment.status === 'OVERDUE' ? 'Vencido' :
                                     payment.status}
                                  </Badge>
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="outline" className="h-8 w-8 sm:h-10 sm:w-10">
                                    <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewPayment(payment)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Visualizar
                                  </DropdownMenuItem>
                                  {!payment.isInvoice && canUpdatePayments && (
                                    <DropdownMenuItem onClick={() => handleEditPayment(payment)}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      Editar pagamento
                                    </DropdownMenuItem>
                                  )}
                                  {!payment.isInvoice && canDeletePayments && (
                                    <DropdownMenuItem onClick={() => handleDeletePayment(payment)} className="text-red-600 focus:text-red-700">
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Excluir pagamento
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                  })
                ) : (
                  <div className="text-center py-12 sm:py-16 bg-card border border-border rounded-lg px-4 col-span-full">
                    <DollarSign className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhum pagamento completado</h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-4">
                      Não há pagamentos completados no momento
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        { }
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar novo pagamento</DialogTitle>
              <DialogDescription>Preencha os dados abaixo para registrar um novo pagamento.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreatePayment}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="propertyId">Imóvel</Label>
                  <Select
                    value={newPayment.propertyId}
                    onValueChange={(value) => setNewPayment(prev => ({ ...prev, propertyId: value }))}
                  >
                    <SelectTrigger className="[&>span]:text-left [&>span]:truncate">
                      <SelectValue placeholder="Selecione um imóvel" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id?.toString()}>
                          {property.name || property.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="contratoId">Contrato</Label>
                  <Select
                    value={newPayment.contratoId}
                    onValueChange={(value) => setNewPayment(prev => ({ ...prev, contratoId: value }))}
                  >
                    <SelectTrigger className="[&>span]:text-left [&>span]:truncate">
                      <SelectValue placeholder="Selecione um contrato" />
                    </SelectTrigger>
                    <SelectContent>
                      {contracts
                        .filter((c: any) => !newPayment.propertyId || c.propertyId === newPayment.propertyId)
                        .map((contract: any) => (
                          <SelectItem key={contract.id} value={contract.id?.toString()}>
                            {contract.property?.address || contract.property?.name || `Contrato #${contract.id}`} - {contract.tenantUser?.name || 'Inquilino'}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valorPago">Valor</Label>
                  <Input
                    id="valorPago"
                    name="valorPago"
                    type="number"
                    step="0.01"
                    value={newPayment.valorPago}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tipo">Tipo de pagamento</Label>
                  <Select
                    value={newPayment.tipo}
                    onValueChange={(value) => setNewPayment(prev => ({ ...prev, tipo: value }))}
                  >
                    <SelectTrigger className="[&>span]:text-left [&>span]:truncate">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALUGUEL">Aluguel</SelectItem>
                      <SelectItem value="CONDOMINIO">Condomínio</SelectItem>
                      <SelectItem value="IPTU">IPTU</SelectItem>
                      <SelectItem value="OUTROS">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="dataPagamento">Data do pagamento</Label>
                <Input
                  id="dataPagamento"
                  name="dataPagamento"
                  type="date"
                  value={newPayment.dataPagamento}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} disabled={creating}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={creating}>
                  {creating ? 'Registrando...' : 'Registrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        { }
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar pagamento</DialogTitle>
              <DialogDescription>Atualize as informações do pagamento selecionado.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleUpdatePayment}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-propertyId">Imóvel</Label>
                  <Select
                    value={editForm.propertyId}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, propertyId: value }))}
                  >
                    <SelectTrigger className="[&>span]:text-left [&>span]:truncate">
                      <SelectValue placeholder="Selecione um imóvel" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id?.toString()}>
                          {property.name || property.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-contratoId">Contrato</Label>
                  <Select
                    value={editForm.contratoId}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, contratoId: value }))}
                  >
                    <SelectTrigger className="[&>span]:text-left [&>span]:truncate">
                      <SelectValue placeholder="Selecione um contrato" />
                    </SelectTrigger>
                    <SelectContent>
                      {contracts
                        .filter((c: any) => !editForm.propertyId || c.propertyId === editForm.propertyId)
                        .map((contract: any) => (
                          <SelectItem key={contract.id} value={contract.id?.toString()}>
                            {contract.property?.address || contract.property?.name || `Contrato #${contract.id}`} - {contract.tenantUser?.name || 'Inquilino'}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-valorPago">Valor</Label>
                  <Input
                    id="edit-valorPago"
                    name="valorPago"
                    type="number"
                    step="0.01"
                    value={editForm.valorPago}
                    onChange={handleEditInputChange}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-tipo">Tipo de pagamento</Label>
                  <Select
                    value={editForm.tipo}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, tipo: value }))}
                  >
                    <SelectTrigger className="[&>span]:text-left [&>span]:truncate">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALUGUEL">Aluguel</SelectItem>
                      <SelectItem value="CONDOMINIO">Condomínio</SelectItem>
                      <SelectItem value="IPTU">IPTU</SelectItem>
                      <SelectItem value="OUTROS">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-dataPagamento">Data do pagamento</Label>
                <Input
                  id="edit-dataPagamento"
                  name="dataPagamento"
                  type="date"
                  value={editForm.dataPagamento}
                  onChange={handleEditInputChange}
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} disabled={updating}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={updating}>
                  {updating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        { }
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes do Pagamento</DialogTitle>
              <DialogDescription>Informações completas do pagamento selecionado.</DialogDescription>
            </DialogHeader>
            {paymentDetail ? (
              <div className="space-y-2">
                <div><b>Valor:</b> {formatCurrency(Number(paymentDetail.amount || paymentDetail.valorPago))}</div>
                <div><b>Imóvel:</b> {paymentDetail.property?.name || paymentDetail.property?.address || '-'}</div>
                <div><b>Inquilino:</b> {paymentDetail.user?.name || paymentDetail.tenantUser?.name || '-'}</div>
                <div><b>Data do pagamento:</b> {formatDate(paymentDetail.paymentDate || paymentDetail.dataPagamento)}</div>
                <div><b>Tipo de pagamento:</b> {getPaymentTypeBadge(paymentDetail.paymentType || paymentDetail.tipo)}</div>
                {paymentDetail.referenceMonth && (
                  <div><b>Mês de referência:</b> {formatDate(paymentDetail.referenceMonth)}</div>
                )}
                <div><b>Descrição:</b> {paymentDetail.description || '-'}</div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Não foi possível carregar os detalhes do pagamento.
              </div>
            )}
          </DialogContent>
        </Dialog>

        { }
        <Dialog open={!!paymentToDelete} onOpenChange={() => setPaymentToDelete(null)}>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-xl">
            <DialogHeader>
              <DialogTitle>Excluir pagamento</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir este pagamento? Esta ação não poderá ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-row gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPaymentToDelete(null)}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
