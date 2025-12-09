import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesAPI, usersAPI, addressAPI, paymentsAPI } from '../../api';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Settings,
  MoreHorizontal,
  Image as ImageIcon,
  Eye,
  FileText,
  MessageSquare,
  Calculator,
  Receipt,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  UserPlus,
  Loader2,
  Search,
  Crown,
  AlertTriangle
} from 'lucide-react';
import { FrozenBadge } from '../../components/ui/FrozenBadge';
import { CEPInput } from '../../components/ui/cep-input';
import { ImageUpload } from '../../components/ui/image-upload';
import { isValidCEPFormat } from '../../lib/validation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
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

const API_URL = import.meta.env.VITE_API_URL;

export function Properties() {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();

  const isCEO = user?.role === 'CEO';
  const isProprietario = user?.role === 'PROPRIETARIO';
  const canViewProperties = hasPermission('properties:read') || ['CEO', 'AGENCY_ADMIN', 'AGENCY_MANAGER', 'BROKER', 'INDEPENDENT_OWNER', 'PROPRIETARIO'].includes(user?.role || '');
  const canCreateProperties = hasPermission('properties:create') && !isCEO && !isProprietario;
  const canUpdateProperties = hasPermission('properties:update') && !isCEO && !isProprietario;
  const canDeleteProperties = hasPermission('properties:delete') && !isCEO && !isProprietario;

  const navigate = useNavigate();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [_showDiscountModal, setShowDiscountModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeErrorMessage, setUpgradeErrorMessage] = useState('');

  const [newProperty, setNewProperty] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    neighborhood: '',
    cep: '',
    monthlyRent: '',
    dueDay: '',
    ownerId: '',
    agencyFee: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    neighborhood: '',
    cep: '',
    monthlyRent: '',
    dueDay: '',
    ownerId: '',
    agencyFee: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<any>(null);
  const [propertyDetail, setPropertyDetail] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [owners, setOwners] = useState<any[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [propertyToAssign, setPropertyToAssign] = useState<any>(null);
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('none');
  const [assignTenantModalOpen, setAssignTenantModalOpen] = useState(false);
  const [propertyToAssignTenant, setPropertyToAssignTenant] = useState<any>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('none');
  const [documents] = useState<any[]>([]);
  const [_discountInfo, _setDiscountInfo] = useState<any>(null);
  const [settings, setSettings] = useState({
    lateFee: '',
    dailyFee: ''
  });
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [invoiceData, setInvoiceData] = useState({
    amount: '',
    dueDate: '',
    description: ''
  });
  const [receiptData, setReceiptData] = useState({
    amount: '',
    paymentDate: '',
    paymentMethod: 'PIX'
  });
  const [_loading, _setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [editSelectedImages, setEditSelectedImages] = useState<File[]>([]);
  const [editUploadingImages, setEditUploadingImages] = useState(false);
  const [existingImageCount, setExistingImageCount] = useState(0);
  const [imageRefreshTrigger, setImageRefreshTrigger] = useState(0);

  const handleSearch = useCallback(() => {
    setSearchQuery(searchTerm.trim());
  }, [searchTerm]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchQuery('');
  }, []);

  if (!canViewProperties) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view properties.</p>
        </div>
      </div>
    );
  }

  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties', user?.id, user?.role, user?.agencyId, user?.brokerId, searchQuery],
    queryFn: () => propertiesAPI.getProperties(searchQuery ? { search: searchQuery } : undefined),
    enabled: canViewProperties,
    staleTime: 0,
    refetchOnMount: 'always' as const,
    refetchOnReconnect: 'always' as const,
    refetchOnWindowFocus: true,
  });

  const { data: brokers = [], isLoading: brokersLoading } = useQuery({
    queryKey: ['agency-brokers', user?.agencyId, user?.id, user?.role],
    queryFn: async () => {
      const response = await usersAPI.listUsers({ role: 'BROKER', pageSize: 100 });
      return response.items || [];
    },
    enabled: user?.role === 'AGENCY_MANAGER' || user?.role === 'AGENCY_ADMIN',
  });

  const filteredBrokers = useMemo(() => {
    if (user?.role === 'AGENCY_MANAGER') {
      return (brokers || []).filter((broker: any) => broker.createdBy === user?.id);
    }
    return brokers;
  }, [brokers, user?.id, user?.role]);

  const assignBrokerMutation = useMutation({
    mutationFn: async ({ propertyId, brokerId }: { propertyId: string; brokerId: string | null }) => {
      return propertiesAPI.assignBroker(propertyId, brokerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Corretor atribuído com sucesso!');
      setAssignModalOpen(false);
      setPropertyToAssign(null);
    },
    onError: (error: any) => {
      console.error('Erro ao atribuir corretor:', error);
      const errorMessage = error?.data?.message || error?.message || 'Não foi possível atribuir o corretor';
      toast.error(errorMessage);
    },
  });

  const assignTenantMutation = useMutation({
    mutationFn: async ({ propertyId, tenantId }: { propertyId: string; tenantId: string | null }) => {
      return propertiesAPI.updateProperty(propertyId, { tenantId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['properties', user?.id, user?.role, user?.agencyId, user?.brokerId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Inquilino atribuído com sucesso!');
      setAssignTenantModalOpen(false);
      setPropertyToAssignTenant(null);
      setSelectedTenantId('none');
    },
    onError: (error: any) => {
      console.error('Erro ao atribuir inquilino:', error);
      const errorMessage = error?.data?.message || error?.message || 'Não foi possível atribuir o inquilino';
      toast.error(errorMessage);
    },
  });

  const closeAllModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDetailModal(false);
    setShowDocumentsModal(false);
    setShowDiscountModal(false);
    setShowSettingsModal(false);
    setShowWhatsAppModal(false);
    setShowInvoiceModal(false);
    setShowReceiptModal(false);
    setAssignModalOpen(false);
    setAssignTenantModalOpen(false);
    setSelectedProperty(null);
    setPropertyToAssign(null);
    setSelectedBrokerId('none');
    setPropertyToAssignTenant(null);
    setSelectedTenantId('none');
    setPropertyToDelete(null);
    setExistingImageCount(0);
    setImageRefreshTrigger(prev => prev + 1);
    setDeleting(false);
  };

  const loadTenants = async () => {
    try {
      setTenantsLoading(true);
      const data = await usersAPI.getTenants();
      setTenants(data || []);
    } catch (error) {
      console.error('Error loading tenants:', error);
      setTenants([]);
    } finally {
      setTenantsLoading(false);
    }
  };

  const loadOwners = async () => {
    
    if (user?.role === 'INDEPENDENT_OWNER') {
      setOwners([]);
      setOwnersLoading(false);
      return;
    }
    try {
      setOwnersLoading(true);
      const data = await usersAPI.listUsers({ role: 'PROPRIETARIO', pageSize: 200 });
      setOwners(data.items || []);
    } catch (error) {
      console.error('Error loading owners:', error);
      setOwners([]);
    } finally {
      setOwnersLoading(false);
    }
  };

  const refreshProperties = () => {
    queryClient.invalidateQueries({ queryKey: ['properties'] });
    setImageRefreshTrigger(prev => prev + 1);
  };

  const formatCurrencyInput = (value: string) => {
    let onlyNumbers = value.replace(/\D/g, '');
    onlyNumbers = onlyNumbers.replace(/^0+/, '');
    if (onlyNumbers.length === 0) return '0,00';
    if (onlyNumbers.length === 1) return '0,0' + onlyNumbers;
    if (onlyNumbers.length === 2) return '0,' + onlyNumbers;
    return (
      onlyNumbers.slice(0, onlyNumbers.length - 2).replace(/^0+/, '') + ',' + onlyNumbers.slice(-2)
    );
  };

  const parsePercentageInput = (value: string) => {
    if (!value) return undefined;
    const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '');
    const parsed = parseFloat(normalized);
    if (Number.isNaN(parsed)) return undefined;
    return parsed;
  };

  const handleCepLookup = async (cep: string) => {
    if (cep.replace(/\D/g, '').length === 8) {
      try {
        const data = await addressAPI.getByCep(cep.replace(/\D/g, ''));
        setNewProperty(prev => ({
          ...prev,
          address: data?.address || prev.address,
          city: data?.city || prev.city,
          state: data?.state || prev.state,
          neighborhood: data?.neighborhood || prev.neighborhood,
        }));
      } catch {
        // Silent fail - CEP lookup failure is not critical
      }
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewProperty(prev => ({ ...prev, [name]: value }));

    if (name === 'cep') {
      await handleCepLookup(value);
    }
  };

  const handleEditInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));

    if (name === 'cep') {
      if (value.replace(/\D/g, '').length === 8) {
        try {
          const data = await addressAPI.getByCep(value.replace(/\D/g, ''));
          setEditForm(prev => ({
            ...prev,
            address: data?.address || prev.address,
            city: data?.city || prev.city,
            state: data?.state || prev.state,
            neighborhood: data?.neighborhood || prev.neighborhood,
          }));
        } catch {
          // Silent fail - CEP lookup failure is not critical
        }
      }
    }
  };

  const handleCEPData = useCallback((data: any) => {
    setNewProperty(prev => ({
      ...prev,
      address: data.logradouro || prev.address,
      neighborhood: data.bairro || prev.neighborhood,
      city: data.cidade || prev.city,
      state: data.estado || prev.state,
    }));
  }, []);

  const handleEditCEPData = useCallback((data: any) => {
    setEditForm(prev => ({
      ...prev,
      address: data.logradouro || prev.address,
      neighborhood: data.bairro || prev.neighborhood,
      city: data.cidade || prev.city,
      state: data.estado || prev.state,
    }));
  }, []);

  const createPropertyMutation = useMutation({
    mutationFn: async (data: any) => {
      const property = await propertiesAPI.createProperty(data);

      if (selectedImages.length > 0) {
        setUploadingImages(true);
        try {
          await propertiesAPI.uploadPropertyImages(property.id.toString(), selectedImages);
        } catch (error) {
          console.error('Error uploading images:', error);
          toast.error('Property created but failed to upload images');
        } finally {
          setUploadingImages(false);
        }
      }

      return property;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['due-dates'] });
      closeAllModals();
      setNewProperty({
        name: '', address: '', city: '', state: '', neighborhood: '', cep: '', monthlyRent: '', dueDay: '', ownerId: '', agencyFee: ''
      });
      setSelectedImages([]);
      toast.success('Imóvel criado com sucesso');
    },
    onError: (error: any) => {
      
      const errorMessage = error?.response?.data?.message || error?.data?.message || error?.message || '';
      const isPlanLimitError = error?.response?.status === 403 ||
        errorMessage.toLowerCase().includes('plano') ||
        errorMessage.toLowerCase().includes('limite') ||
        errorMessage.toLowerCase().includes('plan');

      if (isPlanLimitError) {
        setUpgradeErrorMessage(errorMessage || 'Você atingiu o limite do seu plano.');
        setShowCreateModal(false);
        setShowUpgradeModal(true);
      } else {
        toast.error('Erro ao criar imóvel');
      }
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => propertiesAPI.updateProperty(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['due-dates'] });
    },
    onError: (error) => {
      console.error('Property update error:', error);
      toast.error('Erro ao atualizar imóvel');
    },
  });

  const deletePropertyMutation = useMutation({
    mutationFn: (id: string) => propertiesAPI.deleteProperty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['due-dates'] });
      closeAllModals();
      toast.success('Imóvel excluído com sucesso');
    },
    onError: () => {
      toast.error('Erro ao excluir imóvel');
    },
  });

  const [issuingCharge, setIssuingCharge] = useState(false);
  const issueChargeMutation = useMutation({
    mutationFn: (data: any) => paymentsAPI.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setShowInvoiceModal(false);
      setInvoiceData({ amount: '', dueDate: '', description: '' });
      toast.success('Cobrança emitida com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error issuing charge:', error);
      toast.error('Erro ao emitir cobrança');
    },
    onSettled: () => {
      setIssuingCharge(false);
    },
  });

  const [generatingReceipt, setGeneratingReceipt] = useState(false);
  const generateReceiptMutation = useMutation({
    mutationFn: (data: any) => paymentsAPI.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setShowReceiptModal(false);
      setReceiptData({ amount: '', paymentDate: '', paymentMethod: 'PIX' });
      toast.success('Recibo gerado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error generating receipt:', error);
      toast.error('Erro ao gerar recibo');
    },
    onSettled: () => {
      setGeneratingReceipt(false);
    },
  });

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      if (!isValidCEPFormat(newProperty.cep)) {
        toast.error('CEP inválido');
        setCreating(false);
        return;
      }
      
      const isIndependentOwner = user?.role === 'INDEPENDENT_OWNER';
      const ownerIdToUse = isIndependentOwner ? user?.id : newProperty.ownerId;

      if (!ownerIdToUse && !isIndependentOwner) {
        toast.error('Selecione um proprietário antes de cadastrar o imóvel');
        setCreating(false);
        return;
      }
      const propertyToSend = {
        name: newProperty.name,
        address: newProperty.address,
        monthlyRent: Number(newProperty.monthlyRent.replace(/\D/g, '')) / 100,
        status: 'DISPONIVEL' as const,
        neighborhood: newProperty.neighborhood,
        city: newProperty.city,
        cep: newProperty.cep,
        dueDay: newProperty.dueDay ? Number(newProperty.dueDay) : undefined,
        stateNumber: newProperty.state,
        ownerId: ownerIdToUse,
        agencyFee: parsePercentageInput(newProperty.agencyFee),
      };
      await createPropertyMutation.mutateAsync(propertyToSend);
    } catch (error) {
      console.error('Error creating property:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;
    setUpdating(true);
    try {
      if (!isValidCEPFormat(editForm.cep)) {
        toast.error('CEP inválido');
        setUpdating(false);
        return;
      }
      
      const isIndependentOwner = user?.role === 'INDEPENDENT_OWNER';
      const ownerIdToUse = isIndependentOwner ? user?.id : editForm.ownerId;

      if (!ownerIdToUse && !isIndependentOwner) {
        toast.error('Selecione um proprietário antes de salvar o imóvel');
        setUpdating(false);
        return;
      }
      const propertyToSend = {
        name: editForm.name,
        address: editForm.address,
        monthlyRent: Number(editForm.monthlyRent.replace(/\D/g, '')) / 100,
        status: selectedProperty.status || 'DISPONIVEL',
        neighborhood: editForm.neighborhood,
        city: editForm.city,
        cep: editForm.cep,
        dueDay: editForm.dueDay ? Number(editForm.dueDay) : undefined,
        stateNumber: editForm.state,
        ownerId: ownerIdToUse,
        agencyFee: parsePercentageInput(editForm.agencyFee),
      };

      await updatePropertyMutation.mutateAsync({ id: selectedProperty.id, data: propertyToSend });
      toast.success('Imóvel atualizado com sucesso!');

      if (editSelectedImages.length > 0) {
        setEditUploadingImages(true);
        try {
          await propertiesAPI.uploadPropertyImages(selectedProperty.id, editSelectedImages);
          setEditSelectedImages([]);
          toast.success('Imagens adicionadas com sucesso!');
        } catch (error) {
          console.error('Error uploading images:', error);
          toast.error('Imóvel atualizado, mas falha ao enviar imagens');
        } finally {
          setEditUploadingImages(false);
        }
      }

      setShowEditModal(false);
      setSelectedProperty(null);
      setEditForm({
        name: '',
        address: '',
        neighborhood: '',
        city: '',
        state: '',
        cep: '',
        monthlyRent: '',
        dueDay: '',
        ownerId: '',
        agencyFee: '',
      });
    } catch (error) {
      console.error('Error updating property:', error);
      toast.error('Erro ao atualizar imóvel');
    } finally {
      setUpdating(false);
    }
  };

  const handleViewProperty = async (property: any) => {
    closeAllModals();
    setSelectedProperty(property);
    setPropertyDetail(property);
    setShowDetailModal(true);
  };

  const handleEditProperty = async (property: any) => {
    closeAllModals();
    setSelectedProperty(property);
    setExistingImageCount(0);
    setEditForm({
      name: property.name || '',
      address: property.address || '',
      city: property.city || '',
      state: property.stateNumber || '',
      neighborhood: property.neighborhood || '',
      cep: property.cep || '',
      monthlyRent: property.monthlyRent ? String(property.monthlyRent) : '',
      dueDay: property.dueDay ? String(property.dueDay) : '',
      ownerId: property.ownerId ? String(property.ownerId) : property.owner?.id ? String(property.owner.id) : '',
      agencyFee: property.agencyFee ? String(property.agencyFee) : '',
    });
    loadTenants();
    await loadOwners();
    setShowEditModal(true);
  };

  const handleDeleteProperty = (property: any) => {
    closeAllModals();
    setPropertyToDelete(property);
  };

  const confirmDelete = async () => {
    if (!propertyToDelete) return;
    setDeleting(true);
    try {
      await deletePropertyMutation.mutateAsync(propertyToDelete.id);
    } finally {
      setDeleting(false);
    }
  };

  const handleViewDocuments = (property: any) => {
    closeAllModals();
    setSelectedProperty(property);
    setShowDocumentsModal(true);
  };

  const handleWhatsAppNotification = (property: any) => {
    closeAllModals();
    setSelectedProperty(property);
    setWhatsappMessage(`Olá! Este é um lembrete sobre o imóvel ${property.name || property.address}.`);
    setShowWhatsAppModal(true);
  };

  const handleIssueInvoice = async (property: any) => {
    closeAllModals();
    setSelectedProperty(property);

    try {
      const payments = await paymentsAPI.getPaymentsByProperty(property.id);
      const lastPendingPayment = payments.find((p: any) => p.status === 'PENDING');

      if (lastPendingPayment) {
        
        setInvoiceData({
          amount: lastPendingPayment.valorPago ? String(lastPendingPayment.valorPago) : (property.monthlyRent ? String(property.monthlyRent) : ''),
          dueDate: lastPendingPayment.dueDate ? new Date(lastPendingPayment.dueDate).toISOString().split('T')[0] : '',
          description: lastPendingPayment.description || `Aluguel - ${property.name || property.address}`
        });
        setShowInvoiceModal(true);
        return;
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }

    let nextDueDate = '';
    if (property.dueDay) {
      const today = new Date();
      const dueDay = parseInt(property.dueDay);
      let dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
      
      if (dueDate < today) {
        dueDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
      }
      nextDueDate = dueDate.toISOString().split('T')[0];
    } else if (property.nextDueDate) {
      nextDueDate = new Date(property.nextDueDate).toISOString().split('T')[0];
    }

    setInvoiceData({
      amount: property.monthlyRent ? String(property.monthlyRent) : '',
      dueDate: nextDueDate,
      description: `Aluguel - ${property.name || property.address}`
    });
    setShowInvoiceModal(true);
  };

  const handleGenerateReceipt = async (property: any) => {
    closeAllModals();
    setSelectedProperty(property);

    try {
      const payments = await paymentsAPI.getPaymentsByProperty(property.id);
      const lastPaidPayment = payments.find((p: any) => p.status === 'PAID');

      if (lastPaidPayment) {
        
        setReceiptData({
          amount: lastPaidPayment.valorPago ? String(lastPaidPayment.valorPago) : (property.monthlyRent ? String(property.monthlyRent) : ''),
          paymentDate: lastPaidPayment.dataPagamento ? new Date(lastPaidPayment.dataPagamento).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          paymentMethod: lastPaidPayment.paymentMethod || 'PIX'
        });
        setShowReceiptModal(true);
        return;
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }

    setReceiptData({
      amount: property.monthlyRent ? String(property.monthlyRent) : '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'PIX'
    });
    setShowReceiptModal(true);
  };

  const handleOpenAssignModal = (property: any) => {
    closeAllModals();
    setPropertyToAssign(property);
    setSelectedBrokerId(property.broker?.id ? String(property.broker.id) : 'none');
    setAssignModalOpen(true);
  };

  const handleAssignBrokerSubmit = () => {
    if (!propertyToAssign) return;
    const brokerId = selectedBrokerId === 'none' ? null : selectedBrokerId;
    assignBrokerMutation.mutate({
      propertyId: String(propertyToAssign.id),
      brokerId,
    });
  };

  const handleOpenAssignTenantModal = async (property: any) => {
    closeAllModals();
    setPropertyToAssignTenant(property);
    setSelectedTenantId(
      property.tenantId
        ? String(property.tenantId)
        : property.tenant?.id
          ? String(property.tenant.id)
          : 'none'
    );
    await loadTenants();
    setAssignTenantModalOpen(true);
  };

  const handleAssignTenantSubmit = () => {
    if (!propertyToAssignTenant) return;
    const tenantId = selectedTenantId === 'none' ? null : selectedTenantId;
    assignTenantMutation.mutate({
      propertyId: String(propertyToAssignTenant.id),
      tenantId,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAGO':
        return <Badge className="bg-green-500 text-white">Pago</Badge>;
      case 'EM_ATRASO':
        return <Badge className="bg-red-500 text-white">Em Atraso</Badge>;
      case 'EM_NEGOCIACAO':
        return <Badge className="bg-blue-500 text-white">Em negociação</Badge>;
      case 'PENDENTE':
        return <Badge className="bg-yellow-500 text-white">Pendente</Badge>;
      case 'ALUGADO':
        return <Badge className="bg-green-500 text-white">Alugado</Badge>;
      case 'DISPONIVEL':
        return <Badge className="bg-blue-500 text-white">Disponível</Badge>;
      default:
        return <Badge variant="secondary">Status desconhecido</Badge>;
    }
  };

  const PropertyImagesCarousel = ({ propertyId, propertyName }: { propertyId: string, propertyName?: string }) => {
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
      const fetchImages = async () => {
        try {
          setLoading(true);
          const data = await propertiesAPI.getPropertyImages(propertyId);
          setImages(data);
        } catch (err) {
          console.error('Error loading images:', err);
        } finally {
          setLoading(false);
        }
      };

      if (propertyId) {
        fetchImages();
      }
    }, [propertyId]);

    const nextImage = () => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    if (loading) {
      return (
        <div className="w-full h-64 bg-gray-100 rounded-md flex items-center justify-center animate-pulse">
          <ImageIcon className="w-12 h-12 text-gray-400" />
        </div>
      );
    }

    if (images.length === 0) {
      return (
        <div className="w-full h-64 bg-gray-100 rounded-md flex items-center justify-center">
          <div className="text-center">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Nenhuma imagem disponível</p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full">
        <div className="relative w-full h-64 bg-gray-100 rounded-md overflow-hidden">
          <img
            src={`${API_URL}/properties/${propertyId}/image/public?imageId=${images[currentIndex].id}`}
            alt={`${propertyName || 'Imóvel'} - Imagem ${currentIndex + 1}`}
            className="w-full h-full object-contain bg-gray-50"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />

          {images.length > 1 && (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                onClick={prevImage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                onClick={nextImage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            {currentIndex + 1} / {images.length}
          </div>

          {images[currentIndex].isPrimary && (
            <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
              Principal
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${
                  index === currentIndex ? 'border-blue-500' : 'border-gray-200'
                }`}
                onClick={() => setCurrentIndex(index)}
              >
                <img
                  src={`${API_URL}/properties/${propertyId}/image/public?imageId=${image.id}`}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-contain bg-gray-50"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const ExistingImages = ({ propertyId, onImageCountChange, onImageDeleted }: { propertyId: string, onImageCountChange?: (count: number) => void, onImageDeleted?: () => void }) => {
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchImages = async () => {
        try {
          setLoading(true);
          const data = await propertiesAPI.getPropertyImages(propertyId);
          setImages(data);
          if (onImageCountChange) {
            onImageCountChange(data.length);
          }
        } catch (err) {
          console.error('Error loading existing images:', err);
          if (onImageCountChange) {
            onImageCountChange(0);
          }
        } finally {
          setLoading(false);
        }
      };

      if (propertyId) {
        fetchImages();
      }
    }, [propertyId, onImageCountChange]);

    if (loading) {
      return (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-full h-20 bg-gray-100 rounded-md animate-pulse"></div>
          ))}
        </div>
      );
    }

    if (images.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500">
          Nenhuma imagem cadastrada
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">Imagens Atuais</Label>
        <div className="grid grid-cols-3 gap-2">
          {images.map((image) => (
            <div key={image.id} className="relative group">
              <img
                src={`${API_URL}/properties/${propertyId}/image/public?imageId=${image.id}`}
                alt={`Imagem ${image.id}`}
                className="w-full h-20 object-cover rounded-md"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              {image.isPrimary && (
                <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
                  Principal
                </div>
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={async () => {
                  try {
                    await propertiesAPI.deletePropertyImage(propertyId, image.id.toString());
                    const updatedImages = images.filter(img => img.id !== image.id);
                    setImages(updatedImages);
                    if (onImageCountChange) {
                      onImageCountChange(updatedImages.length);
                    }
                    if (onImageDeleted) {
                      onImageDeleted();
                    }
                    toast.success('Imagem excluída com sucesso');
                  } catch (error) {
                    toast.error('Erro ao excluir imagem');
                  }
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const PropertyImage = ({ propertyId, propertyName }: { propertyId: string, propertyName?: string }) => {
    const [errored, setErrored] = useState(false);

    useEffect(() => {
      setErrored(false);
    }, [propertyId, imageRefreshTrigger]);

    if (errored) {
      return <ImageIcon className="w-12 h-12 text-gray-300" aria-label="Sem imagem" />;
    }

    const imageUrl = `${API_URL}/properties/${propertyId}/image/public?t=${imageRefreshTrigger}`;

    return (
      <img
        key={`${propertyId}-${imageRefreshTrigger}`}
        src={imageUrl}
        alt={propertyName || 'Imóvel'}
        className="object-cover w-full h-full"
        onError={() => setErrored(true)}
      />
    );
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
            <h1 className="text-2xl sm:text-3xl font-bold">Imóveis</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gerencie todos os seus imóveis em um só lugar
            </p>
          </div>
          <div className="flex gap-2">
            {user?.role === 'AGENCY_ADMIN' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={() => {
                    closeAllModals();
                    setShowSettingsModal(true);
                  }}>
                    <Settings className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Configurações de Multa</TooltipContent>
              </Tooltip>
            )}
            {canCreateProperties && !(user?.role === 'BROKER') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => {
                      closeAllModals();
                      loadTenants();
                      loadOwners();
                      setShowCreateModal(true);
                    }}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cadastrar Imóvel</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

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
                placeholder="Pesquisar por nome, endereço ou responsável"
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

        <div className="flex justify-center w-full">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-6 w-full max-w-7xl px-2 items-stretch justify-center">
            {properties && properties.length > 0 ? (
              properties.map((property: any) => (
                <Card key={property.id} className="transition-all hover:shadow-md flex flex-col w-[400px] mx-auto overflow-hidden">
                  <CardContent className="p-0 h-full flex flex-col overflow-hidden min-w-0">
                    <div className="flex h-full min-w-0">
                      {}
                      <div className="w-40 min-w-40 h-full bg-gray-100 flex items-center justify-center rounded-l-md overflow-hidden">
                        <PropertyImage propertyId={property.id} propertyName={property.name} />
                      </div>
                      {}
                      <div className="flex-1 flex flex-col justify-between p-4 min-w-0 overflow-hidden">
                        <div className="min-w-0 space-y-1">
                          <h3 className="text-lg font-bold truncate" title={property.name}>{property.name}</h3>
                          {property.token && (
                            <p className="text-[10px] text-muted-foreground font-mono">{property.token}</p>
                          )}
                          <p className="text-sm font-semibold text-gray-700 truncate" title={property.address}>
                            {property.address}
                          </p>
                          <p className="text-xs text-gray-600 truncate">Estado: {property.stateNumber || '-'}</p>
                          <p className="text-xs text-gray-600 truncate" title={property.owner?.name || property.owner?.email || 'Sem proprietário'}>
                            Proprietário: {property.owner?.name || property.owner?.email || 'Sem proprietário'}
                          </p>
                          <p className="text-xs text-gray-600 truncate" title={property.broker?.name || property.broker?.email || 'Sem corretor'}>
                            Corretor: {property.broker?.name || property.broker?.email || 'Sem corretor'}
                          </p>
                          <p className="text-xs text-gray-600 truncate" title={property.tenant?.name || property.tenant?.email || 'Sem inquilino'}>
                            Locatário: {property.tenant?.name || property.tenant?.email || 'Sem inquilino'}
                          </p>
                          <p className="text-xs text-blue-700 font-medium mt-1 truncate">
                            Próx. vencimento: {property.nextDueDate ? new Date(property.nextDueDate).toLocaleDateString('pt-BR') : '-'}
                          </p>
                          <p className="text-base font-bold mt-2">
                            R$ {property.monthlyRent?.toLocaleString('pt-BR') || '0'}/mês
                          </p>
                          {property.agencyFee !== null && property.agencyFee !== undefined && (
                            <p className="text-xs text-gray-600 mt-1 truncate">
                              Taxa da Agência: {property.agencyFee}% (Específica)
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2 gap-2 flex-shrink-0">
                          <div className="min-w-0 flex-shrink flex items-center gap-2">
                            {getStatusBadge(property.status)}
                            {property.isFrozen && <FrozenBadge reason={property.frozenReason} />}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="outline" className="flex-shrink-0">
                                <MoreHorizontal className="w-5 h-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewProperty(property)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              {canUpdateProperties && !property.isFrozen && (
                                <DropdownMenuItem onClick={() => handleEditProperty(property)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar imóvel
                                </DropdownMenuItem>
                              )}
                              {canUpdateProperties && property.isFrozen && (
                                <DropdownMenuItem disabled className="text-muted-foreground">
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar imóvel (congelado)
                                </DropdownMenuItem>
                              )}
                              {['AGENCY_MANAGER', 'AGENCY_ADMIN'].includes(user?.role || '') && (
                                <DropdownMenuItem onClick={() => handleOpenAssignModal(property)}>
                                  <UserPlus className="w-4 h-4 mr-2" />
                                  Atribuir corretor
                                </DropdownMenuItem>
                              )}
                              {canUpdateProperties && (
                                <DropdownMenuItem onClick={() => handleOpenAssignTenantModal(property)}>
                                  <UserPlus className="w-4 h-4 mr-2" />
                                  Atribuir inquilino
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleViewDocuments(property)}>
                                <FileText className="w-4 h-4 mr-2" />
                                Ver documentos
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleWhatsAppNotification(property)}>
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Notificar por WhatsApp
                              </DropdownMenuItem>
                              {!property.isFrozen ? (
                                <>
                                  <DropdownMenuItem onClick={() => handleIssueInvoice(property)}>
                                    <Calculator className="w-4 h-4 mr-2" />
                                    Emitir cobrança
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleGenerateReceipt(property)}>
                                    <Receipt className="w-4 h-4 mr-2" />
                                    Gerar recibo
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <>
                                  <DropdownMenuItem disabled className="text-muted-foreground">
                                    <Calculator className="w-4 h-4 mr-2" />
                                    Emitir cobrança (congelado)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem disabled className="text-muted-foreground">
                                    <Receipt className="w-4 h-4 mr-2" />
                                    Gerar recibo (congelado)
                                  </DropdownMenuItem>
                                </>
                              )}
                              {canDeleteProperties && (
                                <DropdownMenuItem onClick={() => handleDeleteProperty(property)} className="text-red-600 focus:text-red-700">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir imóvel
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
                <Building2 className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhum imóvel cadastrado</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">
                  Comece adicionando seu primeiro imóvel
                </p>
                {canCreateProperties && !(user?.role === 'BROKER') && (
                  <Button
                    onClick={() => {
                      closeAllModals();
                      loadTenants();
                      loadOwners();
                      setShowCreateModal(true);
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Imóvel
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar novo imóvel</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreateProperty}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome do imóvel</Label>
                  <Input
                    id="name"
                    name="name"
                    value={newProperty.name}
                    onChange={handleInputChange}
                    placeholder="Ex: Apartamento 101"
                  />
                </div>
                <div>
                  <CEPInput
                    value={newProperty.cep}
                    onChange={(value) => setNewProperty(prev => ({ ...prev, cep: value }))}
                    onCEPData={handleCEPData}
                    label="CEP"
                    placeholder="00000-000"
                  />
                </div>
              </div>

              {}
              {user?.role !== 'INDEPENDENT_OWNER' ? (
                <div>
                  <Label htmlFor="ownerId">Proprietário</Label>
                  <select
                    id="ownerId"
                    name="ownerId"
                    value={newProperty.ownerId}
                    onChange={handleInputChange}
                    required
                    disabled={ownersLoading}
                    className="border rounded-md px-3 py-2 w-full"
                  >
                    <option value="">{ownersLoading ? 'Carregando proprietários...' : 'Selecione um proprietário'}</option>
                    {owners.map((owner: any) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.name || owner.email}
                      </option>
                    ))}
                  </select>
                  {owners.length === 0 && !ownersLoading && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Cadastre proprietários na área de usuários antes de vincular um imóvel.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <Label>Proprietário</Label>
                  <div className="border rounded-md px-3 py-2 w-full bg-muted text-muted-foreground">
                    {user?.name || user?.email} (Você)
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  name="address"
                  value={newProperty.address}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  name="neighborhood"
                  value={newProperty.neighborhood}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    name="city"
                    value={newProperty.city}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    name="state"
                    value={newProperty.state}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monthlyRent">Aluguel mensal</Label>
                  <Input
                    id="monthlyRent"
                    name="monthlyRent"
                    type="text"
                    value={newProperty.monthlyRent}
                    onChange={e => {
                      const formatted = formatCurrencyInput(e.target.value);
                      setNewProperty(prev => ({ ...prev, monthlyRent: formatted }));
                    }}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dueDay">Dia do vencimento</Label>
                  <Input
                    id="dueDay"
                    name="dueDay"
                    type="number"
                    min="1"
                    max="31"
                    value={newProperty.dueDay}
                    onChange={handleInputChange}
                    placeholder="5"
                    required
                  />
                </div>
                {user?.role === 'AGENCY_MANAGER' && (
                  <div>
                    <Label htmlFor="agencyFee">
                      Taxa da Agência (%) - Específica do Imóvel
                      <span className="text-xs text-muted-foreground ml-2">(opcional - sobrescreve a taxa global)</span>
                    </Label>
                    <Input
                      id="agencyFee"
                      name="agencyFee"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={newProperty.agencyFee}
                      onChange={handleInputChange}
                      placeholder="Deixe vazio para usar a taxa global da agência"
                    />
                  </div>
                )}
              </div>

              {}
              <ImageUpload
                onImagesChange={setSelectedImages}
                maxImages={20}
                className="mt-6"
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} disabled={creating || uploadingImages}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={creating || uploadingImages}>
                  {creating ? 'Cadastrando...' : uploadingImages ? 'Enviando imagens...' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar imóvel</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleUpdateProperty}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Nome do imóvel</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    value={editForm.name}
                    onChange={handleEditInputChange}
                    placeholder="Ex: Apartamento 101"
                  />
                </div>
                <div>
                  <CEPInput
                    value={editForm.cep}
                    onChange={(value) => setEditForm(prev => ({ ...prev, cep: value }))}
                    onCEPData={handleEditCEPData}
                    label="CEP"
                    placeholder="00000-000"
                  />
                </div>
              </div>

              {}
              {user?.role === 'INDEPENDENT_OWNER' ? (
                <div>
                  <Label>Proprietário</Label>
                  <div className="border rounded-md px-3 py-2 w-full bg-muted text-muted-foreground">
                    {user?.name || user?.email} (Você)
                  </div>
                </div>
              ) : user?.role === 'AGENCY_MANAGER' && !selectedProperty?.brokerId ? (
                <div>
                  <Label htmlFor="edit-ownerId">Proprietário</Label>
                  <select
                    id="edit-ownerId"
                    name="ownerId"
                    value={editForm.ownerId}
                    onChange={handleEditInputChange}
                    required
                    disabled={ownersLoading}
                    className="border rounded-md px-3 py-2 w-full"
                  >
                    <option value="">{ownersLoading ? 'Carregando proprietários...' : 'Selecione um proprietário'}</option>
                    {owners.map((owner: any) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.name || owner.email}
                      </option>
                    ))}
                  </select>
                  {owners.length === 0 && !ownersLoading && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Cadastre proprietários na área de usuários antes de vincular um imóvel.
                    </p>
                  )}
                </div>
              ) : null}

              <div>
                <Label htmlFor="edit-address">Endereço</Label>
                <Input
                  id="edit-address"
                  name="address"
                  value={editForm.address}
                  onChange={handleEditInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-neighborhood">Bairro</Label>
                <Input
                  id="edit-neighborhood"
                  name="neighborhood"
                  value={editForm.neighborhood}
                  onChange={handleEditInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-city">Cidade</Label>
                  <Input
                    id="edit-city"
                    name="city"
                    value={editForm.city}
                    onChange={handleEditInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-state">Estado</Label>
                  <Input
                    id="edit-state"
                    name="state"
                    value={editForm.state}
                    onChange={handleEditInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-monthlyRent">Aluguel mensal</Label>
                  <Input
                    id="edit-monthlyRent"
                    name="monthlyRent"
                    type="text"
                    value={editForm.monthlyRent}
                    onChange={e => {
                      const formatted = formatCurrencyInput(e.target.value);
                      setEditForm(prev => ({ ...prev, monthlyRent: formatted }));
                    }}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-dueDay">Dia do vencimento</Label>
                  <Input
                    id="edit-dueDay"
                    name="dueDay"
                    type="number"
                    min="1"
                    max="31"
                    value={editForm.dueDay}
                    onChange={handleEditInputChange}
                    placeholder="5"
                    required
                  />
                </div>
                {user?.role === 'AGENCY_MANAGER' && (
                  <div>
                    <Label htmlFor="edit-agencyFee">
                      Taxa da Agência (%) - Específica do Imóvel
                      <span className="text-xs text-muted-foreground ml-2">(opcional - sobrescreve a taxa global)</span>
                    </Label>
                    <Input
                      id="edit-agencyFee"
                      name="agencyFee"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={editForm.agencyFee}
                      onChange={handleEditInputChange}
                      placeholder="Deixe vazio para usar a taxa global da agência"
                    />
                  </div>
                )}
              </div>

              {}
              {selectedProperty && <ExistingImages
                propertyId={selectedProperty.id}
                onImageCountChange={setExistingImageCount}
                onImageDeleted={refreshProperties}
              />}

              {}
              <ImageUpload
                onImagesChange={setEditSelectedImages}
                maxImages={Math.max(0, 20 - existingImageCount)}
                className="mt-4"
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} disabled={updating || editUploadingImages}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={updating || editUploadingImages}>
                  {updating ? 'Salvando...' : editUploadingImages ? 'Enviando imagens...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes do Imóvel</DialogTitle>
            </DialogHeader>
            {propertyDetail ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Imagens do Imóvel</h3>
                  <PropertyImagesCarousel
                    propertyId={propertyDetail.id}
                    propertyName={propertyDetail.name}
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold mb-2">Detalhes</h3>
                  <div><b>Nome:</b> {propertyDetail.name || '-'}</div>
                  {propertyDetail.token && (
                    <div><b>Token:</b> <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{propertyDetail.token}</span></div>
                  )}
                  <div><b>CEP:</b> {propertyDetail.cep || '-'}</div>
                  <div><b>Endereço:</b> {propertyDetail.address || '-'}</div>
                  <div><b>Bairro:</b> {propertyDetail.neighborhood || '-'}</div>
                  <div><b>Cidade:</b> {propertyDetail.city || '-'}</div>
                  <div><b>Estado:</b> {propertyDetail.stateNumber || '-'}</div>
                  <div><b>Proprietário:</b> {propertyDetail.owner?.name || propertyDetail.owner?.email || '-'}</div>
                  <div><b>Corretor:</b> {propertyDetail.broker?.name || propertyDetail.broker?.email || '-'}</div>
                  <div><b>Locatário:</b> {propertyDetail.tenant?.name || propertyDetail.tenant?.email || propertyDetail.tenantName || '-'}</div>
                  <div><b>Próx. vencimento:</b> {propertyDetail.nextDueDate ? new Date(propertyDetail.nextDueDate).toLocaleDateString('pt-BR') : '-'}</div>
                  <div><b>Aluguel mensal:</b> R$ {propertyDetail.monthlyRent?.toLocaleString('pt-BR') || '-'}</div>
                  <div><b>Dia do vencimento:</b> {propertyDetail.dueDay || '-'}</div>
                  {propertyDetail.agencyFee !== null && propertyDetail.agencyFee !== undefined && (
                    <div><b>Taxa da Agência (Específica):</b> {propertyDetail.agencyFee}%</div>
                  )}
                  <div className="flex items-center gap-2">
                    <b>Status:</b> {getStatusBadge(propertyDetail.status)}
                    {propertyDetail.isFrozen && <FrozenBadge reason={propertyDetail.frozenReason} />}
                  </div>
                  {propertyDetail.isFrozen && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                      <p className="font-medium">Este imóvel está congelado</p>
                      <p className="text-xs mt-1">
                        Não é possível criar contratos, emitir cobranças ou gerar recibos enquanto o imóvel estiver congelado.
                        Faça upgrade do plano para desbloquear.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Não foi possível carregar os detalhes do imóvel.
              </div>
            )}
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurações Globais de Multa</DialogTitle>
            </DialogHeader>
            <div className="mb-4 text-primary font-medium">
              Essas configurações afetam <b>todos os imóveis</b> da plataforma.
            </div>
            <form className="space-y-4">
              <div>
                <Label htmlFor="lateFee">Multa de atraso (%)</Label>
                <Input
                  id="lateFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.lateFee}
                  onChange={e => setSettings(prev => ({ ...prev, lateFee: e.target.value }))}
                  placeholder="Ex: 2"
                />
              </div>
              <div>
                <Label htmlFor="dailyFee">Multa diária (%)</Label>
                <Input
                  id="dailyFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.dailyFee}
                  onChange={e => setSettings(prev => ({ ...prev, dailyFee: e.target.value }))}
                  placeholder="Ex: 0.33"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowSettingsModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showDocumentsModal} onOpenChange={setShowDocumentsModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Documentos do Imóvel</DialogTitle>
            </DialogHeader>
            {selectedProperty ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <strong>Imóvel:</strong> {selectedProperty.name || selectedProperty.address}
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Documentos Disponíveis:</h4>
                  {documents.length > 0 ? (
                    <div className="space-y-2">
                      {documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span>{doc.name}</span>
                          </div>
                          <Button size="sm" variant="outline">
                            <Download className="w-4 h-4 mr-1" />
                            Baixar
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum documento encontrado</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowDocumentsModal(false)}>
                    Fechar
                  </Button>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Documento
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showWhatsAppModal} onOpenChange={setShowWhatsAppModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Notificar por WhatsApp</DialogTitle>
            </DialogHeader>
            {selectedProperty ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <strong>Imóvel:</strong> {selectedProperty.name || selectedProperty.address}
                </div>
                <div>
                  <Label htmlFor="whatsapp-message">Mensagem</Label>
                  <textarea
                    id="whatsapp-message"
                    className="w-full p-3 border border-input rounded-md min-h-[120px] resize-none"
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    placeholder="Digite sua mensagem aqui..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowWhatsAppModal(false)}>
                    Cancelar
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      const phoneNumber = selectedProperty.tenant?.phone || '';
                      const message = encodeURIComponent(whatsappMessage);
                      const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${message}`;
                      window.open(whatsappUrl, '_blank');
                      setShowWhatsAppModal(false);
                      toast.success('Abrindo WhatsApp...');
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Enviar
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Emitir Cobrança</DialogTitle>
            </DialogHeader>
            {selectedProperty ? (
              <form className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <strong>Imóvel:</strong> {selectedProperty.name || selectedProperty.address}
                </div>
                <div>
                  <Label htmlFor="invoice-amount">Valor</Label>
                  <Input
                    id="invoice-amount"
                    type="text"
                    value={invoiceData.amount}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-due-date">Data de Vencimento</Label>
                  <Input
                    id="invoice-due-date"
                    type="date"
                    value={invoiceData.dueDate}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-description">Descrição</Label>
                  <Input
                    id="invoice-description"
                    value={invoiceData.description}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição da cobrança"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowInvoiceModal(false)} disabled={issuingCharge}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90"
                    disabled={issuingCharge || !invoiceData.amount || !invoiceData.dueDate}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!selectedProperty) return;

                      const amountStr = invoiceData.amount.replace(/\./g, '').replace(',', '.');
                      const amount = parseFloat(amountStr);

                      if (isNaN(amount) || amount <= 0) {
                        toast.error('Valor inválido');
                        return;
                      }

                      setIssuingCharge(true);
                      issueChargeMutation.mutate({
                        valorPago: amount,
                        dataPagamento: new Date().toISOString().split('T')[0],
                        propertyId: selectedProperty.id,
                        tipo: 'ALUGUEL',
                        description: invoiceData.description || 'Cobrança de aluguel',
                        dueDate: invoiceData.dueDate,
                        status: 'PENDING',
                      });
                    }}
                  >
                    {issuingCharge ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Calculator className="w-4 h-4 mr-2" />
                    )}
                    {issuingCharge ? 'Emitindo...' : 'Emitir Cobrança'}
                  </Button>
                </div>
              </form>
            ) : null}
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Gerar Recibo</DialogTitle>
            </DialogHeader>
            {selectedProperty ? (
              <form className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <strong>Imóvel:</strong> {selectedProperty.name || selectedProperty.address}
                </div>
                <div>
                  <Label htmlFor="receipt-amount">Valor</Label>
                  <Input
                    id="receipt-amount"
                    type="text"
                    value={receiptData.amount}
                    onChange={(e) => setReceiptData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="receipt-payment-date">Data do Pagamento</Label>
                  <Input
                    id="receipt-payment-date"
                    type="date"
                    value={receiptData.paymentDate}
                    onChange={(e) => setReceiptData(prev => ({ ...prev, paymentDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="receipt-payment-method">Método de Pagamento</Label>
                  <select
                    id="receipt-payment-method"
                    className="w-full p-2 border border-input rounded-md"
                    value={receiptData.paymentMethod}
                    onChange={(e) => setReceiptData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  >
                    <option value="PIX">PIX</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="TRANSFERENCIA">Transferência</option>
                    <option value="DINHEIRO">Dinheiro</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowReceiptModal(false)} disabled={generatingReceipt}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90"
                    disabled={generatingReceipt || !receiptData.amount || !receiptData.paymentDate}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!selectedProperty) return;

                      const amountStr = receiptData.amount.replace(/\./g, '').replace(',', '.');
                      const amount = parseFloat(amountStr);

                      if (isNaN(amount) || amount <= 0) {
                        toast.error('Valor inválido');
                        return;
                      }

                      setGeneratingReceipt(true);
                      generateReceiptMutation.mutate({
                        valorPago: amount,
                        dataPagamento: receiptData.paymentDate,
                        propertyId: selectedProperty.id,
                        tipo: 'ALUGUEL',
                        description: `Recibo de pagamento - ${selectedProperty.name || selectedProperty.address}`,
                        status: 'PAID',
                        paymentMethod: receiptData.paymentMethod,
                      });
                    }}
                  >
                    {generatingReceipt ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Receipt className="w-4 h-4 mr-2" />
                    )}
                    {generatingReceipt ? 'Gerando...' : 'Gerar Recibo'}
                  </Button>
                </div>
              </form>
            ) : null}
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Atribuir corretor ao imóvel</DialogTitle>
            </DialogHeader>
            {propertyToAssign ? (
              <div className="space-y-4">
                <div className="bg-muted/40 p-3 rounded-md">
                  <p className="text-sm font-semibold">{propertyToAssign.name || propertyToAssign.address}</p>
                  <p className="text-xs text-muted-foreground">
                    Proprietário: {propertyToAssign.owner?.name || propertyToAssign.owner?.email || 'Sem proprietário'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Corretor atual: {propertyToAssign.broker?.name || propertyToAssign.broker?.email || 'Sem corretor'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Selecione um corretor da sua agência</Label>
                  <Select
                    key={`broker-select-${filteredBrokers.length}`}
                    value={selectedBrokerId}
                    onValueChange={setSelectedBrokerId}
                    disabled={brokersLoading || assignBrokerMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={brokersLoading ? 'Carregando corretores...' : 'Escolha um corretor'} />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      <SelectItem value="none">Sem corretor</SelectItem>
                      {filteredBrokers.map((broker: any) => (
                        <SelectItem key={broker.id} value={broker.id}>
                          {broker.name || broker.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filteredBrokers.length === 0 && !brokersLoading && (
                    <p className="text-xs text-muted-foreground">
                      Cadastre corretores na sua agência para poder atribuí-los aos imóveis.
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAssignModalOpen(false)}
                    disabled={assignBrokerMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAssignBrokerSubmit}
                    disabled={assignBrokerMutation.isPending}
                  >
                    {assignBrokerMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Salvando...
                      </span>
                    ) : (
                      'Salvar atribuição'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Selecione um imóvel para atribuir um corretor.</p>
            )}
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={assignTenantModalOpen} onOpenChange={setAssignTenantModalOpen} modal={true}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Atribuir inquilino ao imóvel</DialogTitle>
            </DialogHeader>
            {propertyToAssignTenant ? (
              <div className="space-y-4">
                <div className="bg-muted/40 p-3 rounded-md">
                  <p className="text-sm font-semibold">{propertyToAssignTenant.name || propertyToAssignTenant.address}</p>
                  <p className="text-xs text-muted-foreground">
                    Proprietário: {propertyToAssignTenant.owner?.name || propertyToAssignTenant.owner?.email || 'Sem proprietário'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Corretor: {propertyToAssignTenant.broker?.name || propertyToAssignTenant.broker?.email || 'Sem corretor'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Inquilino atual: {propertyToAssignTenant.tenantName || 'Sem inquilino'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Selecione um inquilino</Label>
                  <Select
                    key={`tenant-select-${tenants.length}`}
                    value={selectedTenantId}
                    onValueChange={setSelectedTenantId}
                    disabled={tenantsLoading || assignTenantMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={tenantsLoading ? 'Carregando inquilinos...' : 'Escolha um inquilino'} />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      <SelectItem value="none">Sem inquilino</SelectItem>
                      {tenants.map((tenant: any) => (
                        <SelectItem key={tenant.id} value={String(tenant.id)}>
                          {tenant.name || tenant.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {tenants.length === 0 && !tenantsLoading && (
                    <p className="text-xs text-muted-foreground">
                      Cadastre inquilinos na área de usuários para poder atribuí-los aos imóveis.
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAssignTenantModalOpen(false)}
                    disabled={assignTenantMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAssignTenantSubmit}
                    disabled={assignTenantMutation.isPending}
                  >
                    {assignTenantMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Salvando...
                      </span>
                    ) : (
                      'Salvar atribuição'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Selecione um imóvel para atribuir um inquilino.</p>
            )}
          </DialogContent>
        </Dialog>

        {}
        <AlertDialog open={!!propertyToDelete} onOpenChange={() => setPropertyToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir imóvel</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o imóvel <b>{propertyToDelete?.address}</b>? Esta ação não poderá ser desfeita.
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

        {}
        <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-6 h-6" />
                Limite do Plano Atingido
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                  <Crown className="w-8 h-8 text-amber-600" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-gray-900">
                  Você está no plano gratuito
                </p>
                <p className="text-sm text-muted-foreground">
                  {upgradeErrorMessage || 'No plano gratuito, você pode cadastrar apenas 1 imóvel.'}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-amber-800">
                  Com o plano gratuito você pode:
                </p>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Cadastrar 1 imóvel
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Cadastrar 1 usuário
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Criar 1 contrato
                  </li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-green-800">
                  Faça upgrade para desbloquear:
                </p>
                <ul className="text-sm text-green-700 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Imóveis ilimitados
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Usuários ilimitados
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Contratos ilimitados
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Relatórios avançados
                  </li>
                </ul>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Deseja fazer upgrade do seu plano agora?
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowUpgradeModal(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                onClick={() => {
                  setShowUpgradeModal(false);
                  
                  if (user?.role === 'AGENCY_ADMIN' || user?.role === 'AGENCY_MANAGER') {
                    navigate('/dashboard/agency-plan-config');
                  } else if (user?.role === 'INDEPENDENT_OWNER') {
                    navigate('/dashboard/owner-plan-config');
                  } else {
                    navigate('/dashboard/plans');
                  }
                }}
              >
                <Crown className="w-4 h-4 mr-2" />
                Fazer Upgrade
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
