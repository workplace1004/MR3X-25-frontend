import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsAPI, propertiesAPI, contractsAPI } from '../../api';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
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
  Clock
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
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

  // Check permissions
  // CEO can VIEW but cannot CREATE/EDIT/DELETE payments
  const isCEO = user?.role === 'CEO';
  const canViewPayments = hasPermission('payments:read');
  const canCreatePayments = hasPermission('payments:create') && !isCEO;
  const canUpdatePayments = hasPermission('payments:update') && !isCEO;
  const canDeletePayments = hasPermission('payments:delete') && !isCEO;

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Form states
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

  // Other states
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

  // Don't render if no permission
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

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => paymentsAPI.getPayments(),
    enabled: canViewPayments,
  });

  const { data: annualReport } = useQuery({
    queryKey: ['annual-report', selectedYear],
    queryFn: () => paymentsAPI.getAnnualReport(selectedYear),
  });

  // Load properties and contracts
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

  // Helper function to close all modals
  const closeAllModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDetailModal(false);
    setSelectedPayment(null);
    setPaymentToDelete(null);
  };

  // Create payment
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

  // Update payment
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

  // Delete payment
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

  // Handle form submissions
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

  // Handle payment actions
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

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewPayment(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  // Payment type badge component
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Pagamentos</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Acompanhe todos os seus pagamentos
            </p>
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

        {/* Annual Summary */}
        {annualReport && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-500/10 text-green-500 rounded-lg">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">Total Anual ({selectedYear})</h3>
                <p className="text-2xl font-bold">{formatCurrency(annualReport.total)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">Total de Pagamentos</h3>
                <p className="text-2xl font-bold">{annualReport.totalPayments}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-500/10 text-purple-500 rounded-lg">
                    <Calendar className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">Média Mensal</h3>
                <p className="text-2xl font-bold">
                  {formatCurrency(annualReport.total / 12)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex justify-center w-full">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-6 w-full max-w-7xl px-2 items-stretch justify-center">
            {payments && payments.length > 0 ? (
              payments.map((payment: any) => (
                <Card key={payment.id} className="transition-all hover:shadow-md flex flex-col w-[400px] mx-auto overflow-hidden">
                  <CardContent className="p-0 h-full flex flex-col overflow-hidden">
                    <div className="flex h-full">
                      {/* Payment Icon */}
                      <div className="w-28 min-w-28 h-36 bg-primary/10 flex items-center justify-center rounded-l-md">
                        <DollarSign className="w-12 h-12 text-primary" />
                      </div>
                      {/* Payment Content */}
                      <div className="flex-1 flex flex-col justify-between p-4">
                        <div>
                          <h3 className="text-lg font-bold break-words">
                            {formatCurrency(Number(payment.amount || payment.valorPago))}
                          </h3>
                          <p className="text-sm text-muted-foreground break-words">
                            <Building2 className="w-3 h-3 inline mr-1" />
                            {payment.property?.name || payment.property?.address || 'Propriedade'}
                          </p>
                          <p className="text-sm text-muted-foreground break-words">
                            <User className="w-3 h-3 inline mr-1" />
                            {payment.user?.name || payment.tenantUser?.name || 'Inquilino'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatDate(payment.paymentDate || payment.dataPagamento)}
                            </span>
                          </div>
                          {payment.referenceMonth && (
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Referência: {formatDate(payment.referenceMonth)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          {getPaymentTypeBadge(payment.paymentType || payment.tipo)}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="outline">
                                <MoreHorizontal className="w-5 h-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewPayment(payment)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              {canUpdatePayments && (
                                <DropdownMenuItem onClick={() => handleEditPayment(payment)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar pagamento
                                </DropdownMenuItem>
                              )}
                              {canDeletePayments && (
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
              ))
            ) : (
              <div className="text-center py-12 sm:py-16 bg-card border border-border rounded-lg px-4 col-span-full">
                <DollarSign className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhum pagamento registrado</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">
                  Comece registrando seu primeiro pagamento
                </p>
                {canCreatePayments && (
                  <Button
                    onClick={() => {
                      closeAllModals();
                      setShowCreateModal(true);
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar Pagamento
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Create Payment Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar novo pagamento</DialogTitle>
              <DialogDescription>Preencha os dados abaixo para registrar um novo pagamento.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreatePayment}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="propertyId">Propriedade</Label>
                  <select
                    id="propertyId"
                    name="propertyId"
                    value={newPayment.propertyId}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-input rounded-md"
                    required
                  >
                    <option value="">Selecione uma propriedade</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name || property.address}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="contratoId">Contrato</Label>
                  <select
                    id="contratoId"
                    name="contratoId"
                    value={newPayment.contratoId}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-input rounded-md"
                    required
                  >
                    <option value="">Selecione um contrato</option>
                    {contracts
                      .filter((c: any) => !newPayment.propertyId || c.propertyId === newPayment.propertyId)
                      .map((contract: any) => (
                      <option key={contract.id} value={contract.id}>
                        {contract.property?.address || contract.property?.name || `Contrato #${contract.id}`} - {contract.tenantUser?.name || 'Inquilino'}
                      </option>
                    ))}
                  </select>
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
                  <select
                    id="tipo"
                    name="tipo"
                    value={newPayment.tipo}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-input rounded-md"
                    required
                  >
                    <option value="ALUGUEL">Aluguel</option>
                    <option value="CONDOMINIO">Condomínio</option>
                    <option value="IPTU">IPTU</option>
                    <option value="OUTROS">Outros</option>
                  </select>
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

        {/* Edit Payment Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar pagamento</DialogTitle>
              <DialogDescription>Atualize as informações do pagamento selecionado.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleUpdatePayment}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-propertyId">Propriedade</Label>
                  <select
                    id="edit-propertyId"
                    name="propertyId"
                    value={editForm.propertyId}
                    onChange={handleEditInputChange}
                    className="w-full p-2 border border-input rounded-md"
                    required
                  >
                    <option value="">Selecione uma propriedade</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name || property.address}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="edit-contratoId">Contrato</Label>
                  <select
                    id="edit-contratoId"
                    name="contratoId"
                    value={editForm.contratoId}
                    onChange={handleEditInputChange}
                    className="w-full p-2 border border-input rounded-md"
                    required
                  >
                    <option value="">Selecione um contrato</option>
                    {contracts
                      .filter((c: any) => !editForm.propertyId || c.propertyId === editForm.propertyId)
                      .map((contract: any) => (
                      <option key={contract.id} value={contract.id}>
                        {contract.property?.address || contract.property?.name || `Contrato #${contract.id}`} - {contract.tenantUser?.name || 'Inquilino'}
                      </option>
                    ))}
                  </select>
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
                  <select
                    id="edit-tipo"
                    name="tipo"
                    value={editForm.tipo}
                    onChange={handleEditInputChange}
                    className="w-full p-2 border border-input rounded-md"
                    required
                  >
                    <option value="ALUGUEL">Aluguel</option>
                    <option value="CONDOMINIO">Condomínio</option>
                    <option value="IPTU">IPTU</option>
                    <option value="OUTROS">Outros</option>
                  </select>
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
                  {updating ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Payment Detail Modal */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes do Pagamento</DialogTitle>
              <DialogDescription>Informações completas do pagamento selecionado.</DialogDescription>
            </DialogHeader>
            {paymentDetail ? (
              <div className="space-y-2">
                <div><b>Valor:</b> {formatCurrency(Number(paymentDetail.amount || paymentDetail.valorPago))}</div>
                <div><b>Propriedade:</b> {paymentDetail.property?.name || paymentDetail.property?.address || '-'}</div>
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!paymentToDelete} onOpenChange={() => setPaymentToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir pagamento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este pagamento? Esta ação não poderá ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
