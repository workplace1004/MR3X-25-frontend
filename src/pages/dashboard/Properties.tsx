import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesAPI, usersAPI, addressAPI, paymentsAPI, agenciesAPI, plansAPI, contractsAPI, inspectionsAPI, extrajudicialNotificationsAPI } from '../../api';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
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
  AlertTriangle,
  MapPin,
  Grid3X3
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
import { Skeleton } from '../../components/ui/skeleton';
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
  const isIndependentOwner = user?.role === 'INDEPENDENT_OWNER';
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
  const [checkingPlanLimit, setCheckingPlanLimit] = useState(false);

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
    registrationNumber: '',
    builtArea: '',
    totalArea: '',
    description: '',
    furnitureList: '',
    condominiumName: '',
    condominiumFee: '',
    iptuValue: '',
    // Property Classification
    propertyType: '',
    useType: '',
    // Rural Property Fields
    totalAreaHectares: '',
    productiveArea: '',
    propertyRegistry: '',
    ccirNumber: '',
    carNumber: '',
    itrValue: '',
    georeferencing: '',
    intendedUse: '',
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
    registrationNumber: '',
    builtArea: '',
    totalArea: '',
    description: '',
    furnitureList: '',
    condominiumName: '',
    condominiumFee: '',
    iptuValue: '',
    propertyType: '',
    useType: '',
    totalAreaHectares: '',
    productiveArea: '',
    propertyRegistry: '',
    ccirNumber: '',
    carNumber: '',
    itrValue: '',
    georeferencing: '',
    intendedUse: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<any>(null);
  const [propertyDetail, setPropertyDetail] = useState<any>(null);
  const [propertyDetailLoading, setPropertyDetailLoading] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [owners, setOwners] = useState<any[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [assignBrokerModalLoading, setAssignBrokerModalLoading] = useState(false);
  const [assignTenantModalLoading, setAssignTenantModalLoading] = useState(false);
  const [invoiceModalLoading, setInvoiceModalLoading] = useState(false);
  const [receiptModalLoading, setReceiptModalLoading] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [propertyToAssign, setPropertyToAssign] = useState<any>(null);
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('none');
  const [assignTenantModalOpen, setAssignTenantModalOpen] = useState(false);
  const [propertyToAssignTenant, setPropertyToAssignTenant] = useState<any>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('none');
  const [documents, setDocuments] = useState<any[]>([]);
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
    // Only update searchQuery when user explicitly triggers search (Enter or button click)
    const trimmedSearch = searchTerm.trim();
    setSearchQuery(trimmedSearch);
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
    staleTime: 30000, // 30 seconds - prevents unnecessary refetches
    refetchOnMount: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false, // Prevent refetch on window focus to avoid refresh on typing
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

  const checkPlanLimitAndOpenModal = useCallback(async () => {
    // Handle INDEPENDENT_OWNER differently - use userId instead of agencyId
    const isIndependentOwner = user?.role === 'INDEPENDENT_OWNER';

    if (isIndependentOwner) {
      if (!user?.id) {
        toast.error('Usuário não encontrado');
        return;
      }

      setCheckingPlanLimit(true);
      try {
        const result = await plansAPI.checkOwnerPropertyCreationAllowed(user.id.toString());
        if (result.allowed) {
          closeAllModals();
          loadTenants();
          loadOwners();
          setShowCreateModal(true);
        } else {
          setUpgradeErrorMessage(result.message || 'Você atingiu o limite de imóveis do seu plano.');
          setShowUpgradeModal(true);
        }
      } catch (error: any) {
        console.error('Error checking plan limit:', error);
        closeAllModals();
        loadTenants();
        loadOwners();
        setShowCreateModal(true);
      } finally {
        setCheckingPlanLimit(false);
      }
    } else {
      // Agency users
      if (!user?.agencyId) {
        toast.error('Agência não encontrada');
        return;
      }

      setCheckingPlanLimit(true);
      try {
        const result = await agenciesAPI.checkPropertyCreationAllowed(user.agencyId.toString());
        if (result.allowed) {
          closeAllModals();
          loadTenants();
          loadOwners();
          setShowCreateModal(true);
        } else {
          setUpgradeErrorMessage(result.message || 'Você atingiu o limite de imóveis do seu plano.');
          setShowUpgradeModal(true);
        }
      } catch (error: any) {
        console.error('Error checking plan limit:', error);
        closeAllModals();
        loadTenants();
        loadOwners();
        setShowCreateModal(true);
      } finally {
        setCheckingPlanLimit(false);
      }
    }
  }, [user?.agencyId, user?.id, user?.role]);

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
        name: '', address: '', city: '', state: '', neighborhood: '', cep: '', monthlyRent: '', dueDay: '', ownerId: '', agencyFee: '',
        registrationNumber: '', builtArea: '', totalArea: '', description: '', furnitureList: '', condominiumName: '', condominiumFee: '', iptuValue: '',
        propertyType: '', useType: '', totalAreaHectares: '', productiveArea: '', propertyRegistry: '', ccirNumber: '', carNumber: '', itrValue: '', georeferencing: '', intendedUse: ''
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
      // For INDEPENDENT_OWNER, new properties should start as INCOMPLETO since they don't have tenant or nextDueDate
      const initialStatus: 'INCOMPLETO' | 'DISPONIVEL' = isIndependentOwner ? 'INCOMPLETO' : 'DISPONIVEL';
      
      const propertyToSend = {
        name: newProperty.name,
        address: newProperty.address,
        monthlyRent: Number(newProperty.monthlyRent.replace(/\D/g, '')) / 100,
        status: initialStatus,
        neighborhood: newProperty.neighborhood,
        city: newProperty.city,
        cep: newProperty.cep,
        dueDay: newProperty.dueDay ? Number(newProperty.dueDay) : undefined,
        stateNumber: newProperty.state,
        ownerId: ownerIdToUse,
        agencyFee: parsePercentageInput(newProperty.agencyFee),
        registrationNumber: newProperty.registrationNumber || undefined,
        builtArea: newProperty.builtArea ? Number(newProperty.builtArea.replace(/\D/g, '')) / 100 : undefined,
        totalArea: newProperty.totalArea ? Number(newProperty.totalArea.replace(/\D/g, '')) / 100 : undefined,
        description: newProperty.description || undefined,
        // Property Classification
        propertyType: newProperty.propertyType || undefined,
        useType: newProperty.useType || undefined,
        // Rural Property Fields
        totalAreaHectares: newProperty.totalAreaHectares ? Number(newProperty.totalAreaHectares) : undefined,
        productiveArea: newProperty.productiveArea ? Number(newProperty.productiveArea) : undefined,
        propertyRegistry: newProperty.propertyRegistry || undefined,
        ccirNumber: newProperty.ccirNumber || undefined,
        carNumber: newProperty.carNumber || undefined,
        itrValue: newProperty.itrValue ? Number(newProperty.itrValue.replace(/\D/g, '')) / 100 : undefined,
        georeferencing: newProperty.georeferencing || undefined,
        intendedUse: newProperty.intendedUse || undefined,
        furnitureList: newProperty.furnitureList || undefined,
        condominiumName: newProperty.condominiumName || undefined,
        condominiumFee: newProperty.condominiumFee ? Number(newProperty.condominiumFee.replace(/\D/g, '')) / 100 : undefined,
        iptuValue: newProperty.iptuValue ? Number(newProperty.iptuValue.replace(/\D/g, '')) / 100 : undefined,
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
      // Validate monthlyRent
      const monthlyRentValue = editForm.monthlyRent 
        ? Number(editForm.monthlyRent.replace(/\D/g, '')) / 100 
        : undefined;
      
      if (monthlyRentValue !== undefined && (isNaN(monthlyRentValue) || monthlyRentValue <= 0)) {
        toast.error('Valor do aluguel mensal inválido');
        setUpdating(false);
        return;
      }

      const propertyToSend: any = {
        name: editForm.name,
        address: editForm.address,
        status: selectedProperty.status || 'DISPONIVEL',
        neighborhood: editForm.neighborhood,
        city: editForm.city,
        cep: editForm.cep,
        stateNumber: editForm.state,
        ownerId: ownerIdToUse,
      };

      // Only include fields that have valid values
      if (monthlyRentValue !== undefined && !isNaN(monthlyRentValue) && monthlyRentValue > 0) {
        propertyToSend.monthlyRent = monthlyRentValue;
      }

      if (editForm.dueDay) {
        const dueDayNum = Number(editForm.dueDay);
        if (!isNaN(dueDayNum) && dueDayNum >= 1 && dueDayNum <= 31) {
          propertyToSend.dueDay = dueDayNum;
        }
      }

      const agencyFeeValue = parsePercentageInput(editForm.agencyFee);
      if (agencyFeeValue !== undefined && !isNaN(agencyFeeValue)) {
        propertyToSend.agencyFee = agencyFeeValue;
      }

      if (editForm.registrationNumber) {
        propertyToSend.registrationNumber = editForm.registrationNumber;
      }

      if (editForm.builtArea) {
        const builtAreaValue = Number(editForm.builtArea.replace(/\D/g, '')) / 100;
        if (!isNaN(builtAreaValue) && builtAreaValue > 0) {
          propertyToSend.builtArea = builtAreaValue;
        }
      }

      if (editForm.totalArea) {
        const totalAreaValue = Number(editForm.totalArea.replace(/\D/g, '')) / 100;
        if (!isNaN(totalAreaValue) && totalAreaValue > 0) {
          propertyToSend.totalArea = totalAreaValue;
        }
      }

      if (editForm.description) {
        propertyToSend.description = editForm.description;
      }

      if (editForm.furnitureList) {
        propertyToSend.furnitureList = editForm.furnitureList;
      }

      if (editForm.condominiumName) {
        propertyToSend.condominiumName = editForm.condominiumName;
      }

      if (editForm.condominiumFee) {
        const condominiumFeeValue = Number(editForm.condominiumFee.replace(/\D/g, '')) / 100;
        if (!isNaN(condominiumFeeValue) && condominiumFeeValue >= 0) {
          propertyToSend.condominiumFee = condominiumFeeValue;
        }
      }

      if (editForm.iptuValue) {
        const iptuValue = Number(editForm.iptuValue.replace(/\D/g, '')) / 100;
        if (!isNaN(iptuValue) && iptuValue >= 0) {
          propertyToSend.iptuValue = iptuValue;
        }
      }

      if (editForm.propertyType) {
        propertyToSend.propertyType = editForm.propertyType;
      }

      if (editForm.useType) {
        propertyToSend.useType = editForm.useType;
      }

      if (editForm.totalAreaHectares) {
        const totalAreaHectaresValue = Number(editForm.totalAreaHectares.replace(/\D/g, '')) / 100;
        if (!isNaN(totalAreaHectaresValue) && totalAreaHectaresValue > 0) {
          propertyToSend.totalAreaHectares = totalAreaHectaresValue;
        }
      }

      if (editForm.productiveArea) {
        const productiveAreaValue = Number(editForm.productiveArea.replace(/\D/g, '')) / 100;
        if (!isNaN(productiveAreaValue) && productiveAreaValue > 0) {
          propertyToSend.productiveArea = productiveAreaValue;
        }
      }

      if (editForm.propertyRegistry) {
        propertyToSend.propertyRegistry = editForm.propertyRegistry;
      }

      if (editForm.ccirNumber) {
        propertyToSend.ccirNumber = editForm.ccirNumber;
      }

      if (editForm.carNumber) {
        propertyToSend.carNumber = editForm.carNumber;
      }

      if (editForm.itrValue) {
        const itrValue = Number(editForm.itrValue.replace(/\D/g, '')) / 100;
        if (!isNaN(itrValue) && itrValue >= 0) {
          propertyToSend.itrValue = itrValue;
        }
      }

      if (editForm.georeferencing) {
        propertyToSend.georeferencing = editForm.georeferencing;
      }

      if (editForm.intendedUse) {
        propertyToSend.intendedUse = editForm.intendedUse;
      }

      await updatePropertyMutation.mutateAsync({ id: selectedProperty.id, data: propertyToSend });
      toast.success('Imóvel atualizado com sucesso!');

      if (editSelectedImages.length > 0) {
        setEditUploadingImages(true);
        try {
          await propertiesAPI.uploadPropertyImages(selectedProperty.id, editSelectedImages);
          setEditSelectedImages([]);
          setImageRefreshTrigger(prev => prev + 1);
          // Invalidate queries to refresh property list and images
          queryClient.invalidateQueries({ queryKey: ['properties'] });
          toast.success('Imagens adicionadas com sucesso!');
        } catch (error) {
          console.error('Error uploading images:', error);
          toast.error('Imóvel atualizado, mas falha ao enviar imagens');
        } finally {
          setEditUploadingImages(false);
        }
      } else {
        // Even if no new images, refresh to ensure property list is up to date
        queryClient.invalidateQueries({ queryKey: ['properties'] });
      }

      setShowEditModal(false);
      setSelectedProperty(null);
      setExistingImageCount(0);
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
        registrationNumber: '',
        builtArea: '',
        totalArea: '',
        description: '',
        furnitureList: '',
        condominiumName: '',
        condominiumFee: '',
        iptuValue: '',
        propertyType: '',
        useType: '',
        totalAreaHectares: '',
        productiveArea: '',
        propertyRegistry: '',
        ccirNumber: '',
        carNumber: '',
        itrValue: '',
        georeferencing: '',
        intendedUse: '',
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
    setPropertyDetailLoading(true);
    setPropertyDetail(null);
    setShowDetailModal(true);

    try {
      // Fetch fresh property data to ensure we have the latest information
      const freshProperty = await propertiesAPI.getPropertyById(property.id);
      setPropertyDetail(freshProperty);
      // Trigger image refresh to ensure latest images are loaded
      setImageRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error loading property details:', error);
      // Fallback to the property data we have
      setPropertyDetail(property);
      toast.error('Erro ao carregar detalhes do imóvel');
    } finally {
      setPropertyDetailLoading(false);
    }
  };

  const handleEditProperty = async (property: any) => {
    closeAllModals();
    setSelectedProperty(property);
    setExistingImageCount(0);
    setEditSelectedImages([]);
    setEditModalLoading(true);
    setShowEditModal(true);

    try {
      // Load tenants and owners in parallel
      await Promise.all([loadTenants(), loadOwners()]);

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
        registrationNumber: property.registrationNumber || '',
        builtArea: property.builtArea ? String(property.builtArea) : '',
        totalArea: property.totalArea ? String(property.totalArea) : '',
        description: property.description || '',
        furnitureList: property.furnitureList || '',
        condominiumName: property.condominiumName || '',
        condominiumFee: property.condominiumFee ? String(property.condominiumFee) : '',
        iptuValue: property.iptuValue ? String(property.iptuValue) : '',
        propertyType: property.propertyType || '',
        useType: property.useType || '',
        totalAreaHectares: property.totalAreaHectares ? String(property.totalAreaHectares) : '',
        productiveArea: property.productiveArea ? String(property.productiveArea) : '',
        propertyRegistry: property.propertyRegistry || '',
        ccirNumber: property.ccirNumber || '',
        carNumber: property.carNumber || '',
        itrValue: property.itrValue ? String(property.itrValue) : '',
        georeferencing: property.georeferencing || '',
        intendedUse: property.intendedUse || '',
      });
    } catch (error) {
      console.error('Error loading edit data:', error);
      toast.error('Erro ao carregar dados para edição');
    } finally {
      setEditModalLoading(false);
    }
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

  const handleViewDocuments = async (property: any) => {
    closeAllModals();
    setSelectedProperty(property);
    setDocumentsLoading(true);
    setShowDocumentsModal(true);
    setDocuments([]);

    try {
      // Fetch all documents linked to this property
      const [contracts, inspections, notificationsResponse] = await Promise.all([
        contractsAPI.getContracts().then(contracts => 
          Array.isArray(contracts) ? contracts.filter((c: any) => c.propertyId === property.id || c.property?.id === property.id) : []
        ).catch(() => []),
        inspectionsAPI.getInspections({ propertyId: property.id }).then(result => 
          Array.isArray(result) ? result : (result?.data || result?.items || [])
        ).catch(() => []),
        extrajudicialNotificationsAPI.getNotifications({ propertyId: property.id }).then(result => {
          // Handle different response structures
          if (Array.isArray(result)) return result;
          if (result?.data && Array.isArray(result.data)) return result.data;
          if (result?.items && Array.isArray(result.items)) return result.items;
          return [];
        }).catch(() => []),
      ]);

      // Ensure all are arrays
      const contractsArray = Array.isArray(contracts) ? contracts : [];
      const inspectionsArray = Array.isArray(inspections) ? inspections : [];
      const notificationsArray = Array.isArray(notificationsResponse) ? notificationsResponse : [];

      // Transform contracts into document format
      const contractDocs = contractsArray.map((contract: any) => ({
        id: contract.id,
        type: 'CONTRACT',
        name: `Contrato - ${contract.property?.name || contract.property?.address || 'Imóvel'}`,
        date: contract.createdAt || contract.startDate,
        status: contract.status,
        token: contract.token,
        downloadFn: () => contractsAPI.downloadContract(contract.id),
      }));

      // Transform inspections into document format
      const inspectionDocs = inspectionsArray.map((inspection: any) => ({
        id: inspection.id,
        type: 'INSPECTION',
        name: `Vistoria - ${inspection.type || 'N/A'}`,
        date: inspection.createdAt || inspection.inspectionDate,
        status: inspection.status,
        token: inspection.token,
        downloadFn: () => inspectionsAPI.downloadFinalPdf(inspection.id),
      }));

      // Transform notifications into document format
      const notificationDocs = notificationsArray.map((notification: any) => ({
        id: notification.id,
        type: 'NOTIFICATION',
        name: `Notificação Extrajudicial - ${notification.title || notification.notificationNumber || 'N/A'}`,
        date: notification.createdAt,
        status: notification.status,
        token: notification.token || notification.notificationToken,
        downloadFn: () => extrajudicialNotificationsAPI.downloadFinalPdf(notification.id),
      }));

      // Combine all documents and sort by date (newest first)
      const allDocs = [...contractDocs, ...inspectionDocs, ...notificationDocs].sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateB - dateA;
      });

      setDocuments(allDocs);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Erro ao carregar documentos');
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleWhatsAppNotification = (property: any) => {
    closeAllModals();
    setSelectedProperty(property);
    
    // Auto-generate message using property metadata
    const propertyName = property.name || property.address || 'Imóvel';
    const tenantName = property.tenant?.name || 'Inquilino';
    const monthlyRent = property.monthlyRent ? `R$ ${Number(property.monthlyRent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
    const dueDay = property.dueDay ? `dia ${property.dueDay}` : '';
    const nextDueDate = property.nextDueDate ? new Date(property.nextDueDate).toLocaleDateString('pt-BR') : '';
    
    // Generate automated message with property metadata
    let autoMessage = `Olá ${tenantName}! 👋\n\n`;
    autoMessage += `Este é um lembrete sobre o imóvel: *${propertyName}*\n\n`;
    
    if (monthlyRent) {
      autoMessage += `💰 Valor do aluguel: ${monthlyRent}\n`;
    }
    if (dueDay) {
      autoMessage += `📅 Vencimento: Todo ${dueDay} do mês\n`;
    }
    if (nextDueDate) {
      autoMessage += `📆 Próximo vencimento: ${nextDueDate}\n`;
    }
    
    autoMessage += `\nPor favor, mantenha seus pagamentos em dia.\n\n`;
    const agencyName = (user as any)?.agencyName || (user as any)?.agency?.name || 'MR3X';
    autoMessage += `Atenciosamente,\nEquipe ${agencyName}`;
    
    setWhatsappMessage(autoMessage);
    setShowWhatsAppModal(true);
  };

  const handleIssueInvoice = async (property: any) => {
    closeAllModals();
    setSelectedProperty(property);
    setInvoiceModalLoading(true);
    setShowInvoiceModal(true);

    try {
      const payments = await paymentsAPI.getPaymentsByProperty(property.id);
      const lastPendingPayment = payments.find((p: any) => p.status === 'PENDING');

      if (lastPendingPayment) {
        setInvoiceData({
          amount: lastPendingPayment.valorPago ? String(lastPendingPayment.valorPago) : (property.monthlyRent ? String(property.monthlyRent) : ''),
          dueDate: lastPendingPayment.dueDate ? new Date(lastPendingPayment.dueDate).toISOString().split('T')[0] : '',
          description: lastPendingPayment.description || `Aluguel - ${property.name || property.address}`
        });
      } else {
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
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Erro ao carregar pagamentos');

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
    } finally {
      setInvoiceModalLoading(false);
    }
  };

  const handleGenerateReceipt = async (property: any) => {
    closeAllModals();
    setSelectedProperty(property);
    setReceiptModalLoading(true);
    setShowReceiptModal(true);

    try {
      const payments = await paymentsAPI.getPaymentsByProperty(property.id);
      const lastPaidPayment = payments.find((p: any) => p.status === 'PAID');

      if (lastPaidPayment) {
        setReceiptData({
          amount: lastPaidPayment.valorPago ? String(lastPaidPayment.valorPago) : (property.monthlyRent ? String(property.monthlyRent) : ''),
          paymentDate: lastPaidPayment.dataPagamento ? new Date(lastPaidPayment.dataPagamento).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          paymentMethod: lastPaidPayment.paymentMethod || 'PIX'
        });
      } else {
        setReceiptData({
          amount: property.monthlyRent ? String(property.monthlyRent) : '',
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'PIX'
        });
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Erro ao carregar pagamentos');

      // Fallback to default values on error
      setReceiptData({
        amount: property.monthlyRent ? String(property.monthlyRent) : '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'PIX'
      });
    } finally {
      setReceiptModalLoading(false);
    }
  };

  const handleOpenAssignModal = async (property: any) => {
    closeAllModals();
    setPropertyToAssign(property);
    setAssignBrokerModalLoading(true);
    setAssignModalOpen(true);

    try {
      // Wait for brokers to load if they're not already loaded
      if (brokersLoading) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      setSelectedBrokerId(property.broker?.id ? String(property.broker.id) : 'none');
    } catch (error) {
      console.error('Error loading brokers:', error);
      toast.error('Erro ao carregar corretores');
    } finally {
      setAssignBrokerModalLoading(false);
    }
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
    setAssignTenantModalLoading(true);
    setAssignTenantModalOpen(true);

    try {
      await loadTenants();
      setSelectedTenantId(
        property.tenantId
          ? String(property.tenantId)
          : property.tenant?.id
            ? String(property.tenant.id)
            : 'none'
      );
    } catch (error) {
      console.error('Error loading tenants:', error);
      toast.error('Erro ao carregar inquilinos');
    } finally {
      setAssignTenantModalLoading(false);
    }
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
      case 'INCOMPLETO':
        return <Badge className="bg-orange-500 text-white">Incompleto</Badge>;
      default:
        return <Badge variant="secondary">Status desconhecido</Badge>;
    }
  };

  const getDisplayStatus = (propertyData: any) => {
    if (isIndependentOwner) {
      const missingTenant = !propertyData?.tenant;
      const missingNextDue = !propertyData?.nextDueDate;
      if (missingTenant || missingNextDue) {
        return 'INCOMPLETO';
      }
    }
    return propertyData?.status || 'PENDENTE';
  };

  const PropertyImagesCarousel = ({ propertyId, propertyName, refreshTrigger }: { propertyId: string, propertyName?: string, refreshTrigger?: number }) => {
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
      const fetchImages = async () => {
        try {
          setLoading(true);
          const data = await propertiesAPI.getPropertyImages(propertyId);
          setImages(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('Error loading images:', err);
          setImages([]);
        } finally {
          setLoading(false);
        }
      };

      if (propertyId) {
        fetchImages();
      }
    }, [propertyId, refreshTrigger]);

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
                className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${index === currentIndex ? 'border-blue-500' : 'border-gray-200'
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

  const ExistingImages = ({ propertyId, onImageCountChange, onImageDeleted, refreshTrigger }: { propertyId: string, onImageCountChange?: (count: number) => void, onImageDeleted?: () => void, refreshTrigger?: number }) => {
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
          setImages([]);
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
    }, [propertyId, onImageCountChange, refreshTrigger]);

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
                    // Trigger refresh for PropertyImage component in property list
                    setImageRefreshTrigger(prev => prev + 1);
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
    const [hasImages, setHasImages] = useState<boolean | null>(null);
    const [primaryImageId, setPrimaryImageId] = useState<string | null>(null);

    useEffect(() => {
      setErrored(false);
      setHasImages(null);
      setPrimaryImageId(null);

      // Check if property has images before trying to display
      const checkImages = async () => {
        try {
          const images = await propertiesAPI.getPropertyImages(propertyId);
          if (Array.isArray(images) && images.length > 0) {
            const primary = images.find((img: any) => img.isPrimary) || images[0];
            setHasImages(true);
            setPrimaryImageId(primary.id);
          } else {
            setHasImages(false);
          }
        } catch (err) {
          console.error('Error checking images:', err);
          setHasImages(false);
        }
      };

      if (propertyId) {
        checkImages();
      }
    }, [propertyId, imageRefreshTrigger]);

    if (hasImages === false || errored) {
      return <ImageIcon className="w-12 h-12 text-gray-300" aria-label="Sem imagem" />;
    }

    if (hasImages === null || !primaryImageId) {
      return (
        <div className="w-full h-full bg-gray-100 rounded-md flex items-center justify-center animate-pulse">
          <ImageIcon className="w-8 h-8 text-gray-300" />
        </div>
      );
    }

    // Use imageId for cache-busting and to ensure we get the correct image
    const imageUrl = `${API_URL}/properties/${propertyId}/image/public?imageId=${primaryImageId}&t=${imageRefreshTrigger}&_=${Date.now()}`;

    return (
      <img
        key={`${propertyId}-${primaryImageId}-${imageRefreshTrigger}`}
        src={imageUrl}
        alt={propertyName || 'Imóvel'}
        className="object-cover w-full h-full"
        onError={() => setErrored(true)}
      />
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="w-10 h-10 rounded" />
            <Skeleton className="w-10 h-10 rounded" />
          </div>
        </div>

        {/* Search Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex w-full sm:max-w-lg gap-2">
            <Skeleton className="h-10 flex-1 rounded" />
            <Skeleton className="h-10 w-20 rounded" />
          </div>
        </div>

        {/* Properties Grid Skeleton */}
        <div className="flex justify-center w-full">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-6 w-full max-w-7xl px-2 items-stretch justify-center">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="w-[400px] mx-auto overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex h-full">
                    {/* Image Skeleton */}
                    <Skeleton className="w-[160px] h-[200px] rounded-none" />

                    {/* Content Skeleton */}
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-4 w-3/4 mb-3" />
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Skeleton className="w-4 h-4" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Skeleton className="w-4 h-4" />
                            <Skeleton className="h-3 w-28" />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-1 mt-3">
                        <Skeleton className="w-8 h-8 rounded" />
                        <Skeleton className="w-8 h-8 rounded" />
                        <Skeleton className="w-8 h-8 rounded" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Building2 className="w-6 h-6 text-orange-700" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Imóveis</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Gerencie todos os seus imóveis em um só lugar
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {canCreateProperties && !(user?.role === 'BROKER') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={checkPlanLimitAndOpenModal}
                    disabled={checkingPlanLimit}
                  >
                    {checkingPlanLimit ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cadastrar Imóvel</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <form 
            className="flex w-full sm:max-w-lg gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
          >
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
            <Button 
              type="submit"
              className="self-stretch"
            >
              Buscar
            </Button>
            {(searchTerm || searchQuery) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="self-stretch"
              >
                Limpar
              </Button>
            )}
          </form>
        </div>

        <div className="flex justify-center w-full">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-6 w-full max-w-7xl px-2 items-stretch justify-center">
            {properties && properties.length > 0 ? (
              properties.map((property: any) => (
                <Card key={property.id} className="transition-all hover:shadow-md flex flex-col w-[400px] mx-auto overflow-hidden">
                  <CardContent className="p-0 h-full flex flex-col overflow-hidden min-w-0">
                    <div className="flex h-full min-w-0">
                      { }
                      <div className="w-40 min-w-40 h-full bg-gray-100 flex items-center justify-center rounded-l-md overflow-hidden">
                        <PropertyImage propertyId={property.id} propertyName={property.name} />
                      </div>
                      { }
                      <div className="flex-1 flex flex-col justify-between p-4 min-w-0 overflow-hidden">
                        <div className="min-w-0 space-y-1">
                          {property.token && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-[12px] text-muted-foreground font-mono truncate w-full justify-end flex">
                                  <div className='border border-gray-300 rounded-md px-2 py-1'>
                                    {property.token}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{property.token}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <h3 className="text-lg font-bold truncate">{property.name}</h3>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{property.name}</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-sm font-semibold text-gray-700 truncate">
                                {property.address}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{property.address}</p>
                            </TooltipContent>
                          </Tooltip>
                          <p className="text-xs text-gray-600 truncate">Estado: {property.stateNumber || '-'}</p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-xs text-gray-600 truncate">
                                Proprietário: {property.owner?.name || property.owner?.email || 'Sem proprietário'}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{property.owner?.name || property.owner?.email || 'Sem proprietário'}</p>
                            </TooltipContent>
                          </Tooltip>
                          {!isIndependentOwner && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-xs text-gray-600 truncate">
                                  Corretor: {property.broker?.name || property.broker?.email || 'Sem corretor'}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{property.broker?.name || property.broker?.email || 'Sem corretor'}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-xs text-gray-600 truncate">
                                Locatário: {property.tenant?.name || property.tenant?.email || 'Sem inquilino'}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{property.tenant?.name || property.tenant?.email || 'Sem inquilino'}</p>
                            </TooltipContent>
                          </Tooltip>
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
                            {property.isFrozen ? (
                              <FrozenBadge reason={property.frozenReason} />
                            ) : (
                              getStatusBadge(getDisplayStatus(property))
                            )}
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
                              {['AGENCY_MANAGER', 'AGENCY_ADMIN'].includes(user?.role || '') && !property.isFrozen && (
                                <DropdownMenuItem onClick={() => handleOpenAssignModal(property)}>
                                  <UserPlus className="w-4 h-4 mr-2" />
                                  Atribuir corretor
                                </DropdownMenuItem>
                              )}
                              {['AGENCY_MANAGER', 'AGENCY_ADMIN'].includes(user?.role || '') && property.isFrozen && (
                                <DropdownMenuItem disabled className="text-muted-foreground">
                                  <UserPlus className="w-4 h-4 mr-2" />
                                  Atribuir corretor (congelado)
                                </DropdownMenuItem>
                              )}
                              {canUpdateProperties && !property.isFrozen && (
                                <DropdownMenuItem onClick={() => handleOpenAssignTenantModal(property)}>
                                  <UserPlus className="w-4 h-4 mr-2" />
                                  Atribuir inquilino
                                </DropdownMenuItem>
                              )}
                              {canUpdateProperties && property.isFrozen && (
                                <DropdownMenuItem disabled className="text-muted-foreground">
                                  <UserPlus className="w-4 h-4 mr-2" />
                                  Atribuir inquilino (congelado)
                                </DropdownMenuItem>
                              )}
                              {!property.isFrozen ? (
                                <DropdownMenuItem onClick={() => handleViewDocuments(property)}>
                                  <FileText className="w-4 h-4 mr-2" />
                                  Ver documentos
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem disabled className="text-muted-foreground">
                                  <FileText className="w-4 h-4 mr-2" />
                                  Ver documentos (congelado)
                                </DropdownMenuItem>
                              )}
                              {!property.isFrozen ? (
                                <DropdownMenuItem onClick={() => handleWhatsAppNotification(property)}>
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Notificar por WhatsApp
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem disabled className="text-muted-foreground">
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Notificar por WhatsApp (congelado)
                                </DropdownMenuItem>
                              )}
                              {!property.isFrozen && (
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

        { }
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

              { }
              {user?.role !== 'INDEPENDENT_OWNER' ? (
                <div>
                  <Label htmlFor="ownerId">Proprietário</Label>
                  <Select
                    value={newProperty.ownerId}
                    onValueChange={(value) => setNewProperty({ ...newProperty, ownerId: value })}
                    disabled={ownersLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={ownersLoading ? 'Carregando proprietários...' : 'Selecione um proprietário'} />
                    </SelectTrigger>
                    <SelectContent>
                      {owners.map((owner: any) => (
                        <SelectItem
                          key={owner.id}
                          value={String(owner.id)}
                          disabled={owner.isFrozen}
                          className={owner.isFrozen ? 'opacity-50' : ''}
                        >
                          {owner.name || owner.email}
                          {owner.isFrozen && <span className="ml-2 text-xs text-red-500">(Congelado)</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3">Detalhes Adicionais (para contratos)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="registrationNumber">Matrícula / Registro</Label>
                    <Input
                      id="registrationNumber"
                      name="registrationNumber"
                      value={newProperty.registrationNumber}
                      onChange={handleInputChange}
                      placeholder="Ex: 12345"
                    />
                  </div>
                  <div>
                    <Label htmlFor="condominiumName">Nome do Condomínio</Label>
                    <Input
                      id="condominiumName"
                      name="condominiumName"
                      value={newProperty.condominiumName}
                      onChange={handleInputChange}
                      placeholder="Ex: Condomínio Residencial Sol"
                    />
                  </div>
                  <div>
                    <Label htmlFor="builtArea">Área Construída (m²)</Label>
                    <Input
                      id="builtArea"
                      name="builtArea"
                      value={newProperty.builtArea}
                      onChange={e => {
                        const formatted = formatCurrencyInput(e.target.value);
                        setNewProperty(prev => ({ ...prev, builtArea: formatted }));
                      }}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="totalArea">Área Total (m²)</Label>
                    <Input
                      id="totalArea"
                      name="totalArea"
                      value={newProperty.totalArea}
                      onChange={e => {
                        const formatted = formatCurrencyInput(e.target.value);
                        setNewProperty(prev => ({ ...prev, totalArea: formatted }));
                      }}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="condominiumFee">Taxa de Condomínio (R$)</Label>
                    <Input
                      id="condominiumFee"
                      name="condominiumFee"
                      value={newProperty.condominiumFee}
                      onChange={e => {
                        const formatted = formatCurrencyInput(e.target.value);
                        setNewProperty(prev => ({ ...prev, condominiumFee: formatted }));
                      }}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="iptuValue">IPTU (R$)</Label>
                    <Input
                      id="iptuValue"
                      name="iptuValue"
                      value={newProperty.iptuValue}
                      onChange={e => {
                        const formatted = formatCurrencyInput(e.target.value);
                        setNewProperty(prev => ({ ...prev, iptuValue: formatted }));
                      }}
                      placeholder="0,00"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="description">Descrição do Imóvel</Label>
                  <textarea
                    id="description"
                    name="description"
                    value={newProperty.description}
                    onChange={(e) => setNewProperty(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva as características do imóvel..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="mt-4">
                  <Label htmlFor="furnitureList">Mobílias / Itens Inclusos</Label>
                  <textarea
                    id="furnitureList"
                    name="furnitureList"
                    value={newProperty.furnitureList}
                    onChange={(e) => setNewProperty(prev => ({ ...prev, furnitureList: e.target.value }))}
                    placeholder="Liste os móveis e itens inclusos no imóvel..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Property Classification Section */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3">Classificação do Imóvel (Obrigatório para Validade Legal)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="propertyType">Tipo de Propriedade <span className="text-red-500">*</span></Label>
                    <Select
                      value={newProperty.propertyType}
                      onValueChange={(value) => setNewProperty(prev => ({ ...prev, propertyType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="URBAN">Urbano</SelectItem>
                        <SelectItem value="RURAL">Rural</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="useType">Tipo de Uso <span className="text-red-500">*</span></Label>
                    <Select
                      value={newProperty.useType}
                      onValueChange={(value) => setNewProperty(prev => ({ ...prev, useType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o uso" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RESIDENTIAL">Residencial</SelectItem>
                        <SelectItem value="COMMERCIAL">Comercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Rural Property Specific Fields */}
                {newProperty.propertyType === 'RURAL' && (
                  <div className="mt-4 space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                    <h5 className="text-sm font-semibold text-amber-800">Campos Específicos para Propriedade Rural</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="totalAreaHectares">Área Total (Hectares)</Label>
                        <Input
                          id="totalAreaHectares"
                          name="totalAreaHectares"
                          type="number"
                          step="0.01"
                          value={newProperty.totalAreaHectares}
                          onChange={handleInputChange}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="productiveArea">Área Produtiva (Hectares)</Label>
                        <Input
                          id="productiveArea"
                          name="productiveArea"
                          type="number"
                          step="0.01"
                          value={newProperty.productiveArea}
                          onChange={handleInputChange}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="propertyRegistry">Número da Matrícula (Registro de Imóveis)</Label>
                        <Input
                          id="propertyRegistry"
                          name="propertyRegistry"
                          value={newProperty.propertyRegistry}
                          onChange={handleInputChange}
                          placeholder="Ex: 12345"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ccirNumber">CCIR (Cadastro de Imóveis Rurais - INCRA)</Label>
                        <Input
                          id="ccirNumber"
                          name="ccirNumber"
                          value={newProperty.ccirNumber}
                          onChange={handleInputChange}
                          placeholder="Ex: CCIR-123456"
                        />
                      </div>
                      <div>
                        <Label htmlFor="carNumber">CAR (Cadastro Ambiental Rural)</Label>
                        <Input
                          id="carNumber"
                          name="carNumber"
                          value={newProperty.carNumber}
                          onChange={handleInputChange}
                          placeholder="Ex: CAR-123456"
                        />
                      </div>
                      <div>
                        <Label htmlFor="itrValue">ITR - Imposto sobre a Propriedade Territorial Rural (R$)</Label>
                        <Input
                          id="itrValue"
                          name="itrValue"
                          type="text"
                          value={newProperty.itrValue}
                          onChange={e => {
                            const formatted = formatCurrencyInput(e.target.value);
                            setNewProperty(prev => ({ ...prev, itrValue: formatted }));
                          }}
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="intendedUse">Uso Pretendido</Label>
                        <Select
                          value={newProperty.intendedUse}
                          onValueChange={(value) => setNewProperty(prev => ({ ...prev, intendedUse: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o uso pretendido" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AGRICULTURAL">Agrícola</SelectItem>
                            <SelectItem value="LIVESTOCK">Pecuária</SelectItem>
                            <SelectItem value="MIXED">Misto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="georeferencing">Georreferenciamento</Label>
                      <textarea
                        id="georeferencing"
                        name="georeferencing"
                        value={newProperty.georeferencing}
                        onChange={(e) => setNewProperty(prev => ({ ...prev, georeferencing: e.target.value }))}
                        placeholder="Coordenadas geográficas ou dados de georreferenciamento..."
                        rows={3}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}
              </div>

              { }
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

        { }
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar imóvel</DialogTitle>
            </DialogHeader>
            {editModalLoading ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
            ) : (
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

                { }
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
                    <Select
                      value={editForm.ownerId}
                      onValueChange={(value) => setEditForm({ ...editForm, ownerId: value })}
                      disabled={ownersLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={ownersLoading ? 'Carregando proprietários...' : 'Selecione um proprietário'} />
                      </SelectTrigger>
                      <SelectContent>
                        {owners.map((owner: any) => (
                          <SelectItem
                            key={owner.id}
                            value={String(owner.id)}
                            disabled={owner.isFrozen}
                            className={owner.isFrozen ? 'opacity-50' : ''}
                          >
                            {owner.name || owner.email}
                            {owner.isFrozen && <span className="ml-2 text-xs text-red-500">(Congelado)</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium mb-3">Detalhes Adicionais (para contratos)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-registrationNumber">Matrícula / Registro</Label>
                      <Input
                        id="edit-registrationNumber"
                        name="registrationNumber"
                        value={editForm.registrationNumber}
                        onChange={handleEditInputChange}
                        placeholder="Ex: 12345"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-condominiumName">Nome do Condomínio</Label>
                      <Input
                        id="edit-condominiumName"
                        name="condominiumName"
                        value={editForm.condominiumName}
                        onChange={handleEditInputChange}
                        placeholder="Ex: Condomínio Residencial Sol"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-builtArea">Área Construída (m²)</Label>
                      <Input
                        id="edit-builtArea"
                        name="builtArea"
                        value={editForm.builtArea}
                        onChange={e => {
                          const formatted = formatCurrencyInput(e.target.value);
                          setEditForm(prev => ({ ...prev, builtArea: formatted }));
                        }}
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-totalArea">Área Total (m²)</Label>
                      <Input
                        id="edit-totalArea"
                        name="totalArea"
                        value={editForm.totalArea}
                        onChange={e => {
                          const formatted = formatCurrencyInput(e.target.value);
                          setEditForm(prev => ({ ...prev, totalArea: formatted }));
                        }}
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-condominiumFee">Taxa de Condomínio (R$)</Label>
                      <Input
                        id="edit-condominiumFee"
                        name="condominiumFee"
                        value={editForm.condominiumFee}
                        onChange={e => {
                          const formatted = formatCurrencyInput(e.target.value);
                          setEditForm(prev => ({ ...prev, condominiumFee: formatted }));
                        }}
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-iptuValue">IPTU (R$)</Label>
                      <Input
                        id="edit-iptuValue"
                        name="iptuValue"
                        value={editForm.iptuValue}
                        onChange={e => {
                          const formatted = formatCurrencyInput(e.target.value);
                          setEditForm(prev => ({ ...prev, iptuValue: formatted }));
                        }}
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="edit-description">Descrição do Imóvel</Label>
                    <textarea
                      id="edit-description"
                      name="description"
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descreva as características do imóvel..."
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="edit-furnitureList">Mobílias / Itens Inclusos</Label>
                    <textarea
                      id="edit-furnitureList"
                      name="furnitureList"
                      value={editForm.furnitureList}
                      onChange={(e) => setEditForm(prev => ({ ...prev, furnitureList: e.target.value }))}
                      placeholder="Liste os móveis e itens inclusos no imóvel..."
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium mb-3">Classificação da Propriedade</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-propertyType">Tipo de Propriedade</Label>
                      <Select
                        value={editForm.propertyType}
                        onValueChange={(value) => setEditForm(prev => ({ ...prev, propertyType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="URBAN">Urbana</SelectItem>
                          <SelectItem value="RURAL">Rural</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-useType">Tipo de Uso</Label>
                      <Select
                        value={editForm.useType}
                        onValueChange={(value) => setEditForm(prev => ({ ...prev, useType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RESIDENTIAL">Residencial</SelectItem>
                          <SelectItem value="COMMERCIAL">Comercial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {editForm.propertyType === 'RURAL' && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium mb-3">Informações Rurais</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-totalAreaHectares">Área Total (Hectares)</Label>
                        <Input
                          id="edit-totalAreaHectares"
                          name="totalAreaHectares"
                          type="text"
                          value={editForm.totalAreaHectares}
                          onChange={e => {
                            const formatted = formatCurrencyInput(e.target.value);
                            setEditForm(prev => ({ ...prev, totalAreaHectares: formatted }));
                          }}
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-productiveArea">Área Produtiva (Hectares)</Label>
                        <Input
                          id="edit-productiveArea"
                          name="productiveArea"
                          type="text"
                          value={editForm.productiveArea}
                          onChange={e => {
                            const formatted = formatCurrencyInput(e.target.value);
                            setEditForm(prev => ({ ...prev, productiveArea: formatted }));
                          }}
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-propertyRegistry">Registro da Propriedade</Label>
                        <Input
                          id="edit-propertyRegistry"
                          name="propertyRegistry"
                          value={editForm.propertyRegistry}
                          onChange={handleEditInputChange}
                          placeholder="Ex: 12345"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-ccirNumber">Número CCIR</Label>
                        <Input
                          id="edit-ccirNumber"
                          name="ccirNumber"
                          value={editForm.ccirNumber}
                          onChange={handleEditInputChange}
                          placeholder="Ex: CCIR-123456"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-carNumber">Número CAR</Label>
                        <Input
                          id="edit-carNumber"
                          name="carNumber"
                          value={editForm.carNumber}
                          onChange={handleEditInputChange}
                          placeholder="Ex: SP-1234567-ABCD12345678901234567890123456"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-itrValue">Valor ITR (R$)</Label>
                        <Input
                          id="edit-itrValue"
                          name="itrValue"
                          type="text"
                          value={editForm.itrValue}
                          onChange={e => {
                            const formatted = formatCurrencyInput(e.target.value);
                            setEditForm(prev => ({ ...prev, itrValue: formatted }));
                          }}
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-intendedUse">Uso Pretendido</Label>
                        <Select
                          value={editForm.intendedUse}
                          onValueChange={(value) => setEditForm(prev => ({ ...prev, intendedUse: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AGRICULTURAL">Agrícola</SelectItem>
                            <SelectItem value="LIVESTOCK">Pecuária</SelectItem>
                            <SelectItem value="MIXED">Misto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Label htmlFor="edit-georeferencing">Georreferenciamento</Label>
                      <textarea
                        id="edit-georeferencing"
                        name="georeferencing"
                        value={editForm.georeferencing}
                        onChange={(e) => setEditForm(prev => ({ ...prev, georeferencing: e.target.value }))}
                        placeholder="Dados de georreferenciamento..."
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}

                { }
                {selectedProperty && <ExistingImages
                  propertyId={selectedProperty.id}
                  onImageCountChange={setExistingImageCount}
                  onImageDeleted={() => {
                    refreshProperties();
                    setImageRefreshTrigger(prev => prev + 1);
                  }}
                  refreshTrigger={imageRefreshTrigger}
                />}

                { }
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
                    {updating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : editUploadingImages ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando imagens...
                      </>
                    ) : (
                      'Salvar'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        { }
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Imóvel</DialogTitle>
            </DialogHeader>
            {propertyDetailLoading ? (
              <div className="space-y-6">
                <div>
                  <Skeleton className="h-6 w-40 mb-2" />
                  <Skeleton className="h-64 w-full rounded-md" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <Skeleton className="h-6 w-48" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <div key={i}>
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-5 w-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : propertyDetail ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Imagens do Imóvel</h3>
                  <PropertyImagesCarousel
                    propertyId={propertyDetail.id}
                    propertyName={propertyDetail.name}
                    refreshTrigger={imageRefreshTrigger}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Informações Básicas</h3>
                  </div>
                  {propertyDetail.token && (
                    <div className="mb-4">
                      <label className="text-sm font-medium text-muted-foreground">Token</label>
                      <div className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block mt-1">{propertyDetail.token}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome</label>
                      <div className="text-base font-medium">{propertyDetail.name || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div className="text-base">
                        {propertyDetail.isFrozen ? (
                          <FrozenBadge reason={propertyDetail.frozenReason} />
                        ) : (
                          getStatusBadge(getDisplayStatus(propertyDetail))
                        )}
                      </div>
                    </div>
                    {propertyDetail.propertyType && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tipo de Propriedade</label>
                        <div className="text-base">{propertyDetail.propertyType === 'URBAN' ? 'Urbana' : propertyDetail.propertyType === 'RURAL' ? 'Rural' : propertyDetail.propertyType}</div>
                      </div>
                    )}
                    {propertyDetail.useType && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tipo de Uso</label>
                        <div className="text-base">{propertyDetail.useType === 'RESIDENTIAL' ? 'Residencial' : propertyDetail.useType === 'COMMERCIAL' ? 'Comercial' : propertyDetail.useType}</div>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Proprietário</label>
                      <div className="text-base">{propertyDetail.owner?.name || propertyDetail.owner?.email || '-'}</div>
                    </div>
                    {!isIndependentOwner && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Corretor</label>
                        <div className="text-base">{propertyDetail.broker?.name || propertyDetail.broker?.email || '-'}</div>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Locatário</label>
                      <div className="text-base">{propertyDetail.tenant?.name || propertyDetail.tenant?.email || propertyDetail.tenantName || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Aluguel Mensal</label>
                      <div className="text-base font-medium">
                        {propertyDetail.monthlyRent ? `R$ ${Number(propertyDetail.monthlyRent).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Dia do Vencimento</label>
                      <div className="text-base">{propertyDetail.dueDay ? `Dia ${propertyDetail.dueDay}` : '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Próximo Vencimento</label>
                      <div className="text-base">
                        {propertyDetail.nextDueDate ? new Date(propertyDetail.nextDueDate).toLocaleDateString('pt-BR') : '-'}
                      </div>
                    </div>
                    {propertyDetail.agencyFee !== null && propertyDetail.agencyFee !== undefined && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Taxa da Agência (Específica)</label>
                        <div className="text-base">{propertyDetail.agencyFee}%</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Endereço</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">CEP</label>
                      <div className="text-base">{propertyDetail.cep || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                      <div className="text-base">{propertyDetail.address || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Bairro</label>
                      <div className="text-base">{propertyDetail.neighborhood || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Cidade</label>
                      <div className="text-base">{propertyDetail.city || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Estado</label>
                      <div className="text-base">{propertyDetail.stateNumber || '-'}</div>
                    </div>
                  </div>
                </div>

                {(propertyDetail.registrationNumber || propertyDetail.builtArea || propertyDetail.totalArea || propertyDetail.condominiumName || propertyDetail.condominiumFee || propertyDetail.iptuValue) && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold">Detalhes Adicionais</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {propertyDetail.registrationNumber && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Matrícula / Registro</label>
                          <div className="text-base">{propertyDetail.registrationNumber}</div>
                        </div>
                      )}
                      {propertyDetail.builtArea && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Área Construída</label>
                          <div className="text-base">{Number(propertyDetail.builtArea).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²</div>
                        </div>
                      )}
                      {propertyDetail.totalArea && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Área Total</label>
                          <div className="text-base">{Number(propertyDetail.totalArea).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²</div>
                        </div>
                      )}
                      {propertyDetail.condominiumName && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Nome do Condomínio</label>
                          <div className="text-base">{propertyDetail.condominiumName}</div>
                        </div>
                      )}
                      {propertyDetail.condominiumFee && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Taxa de Condomínio</label>
                          <div className="text-base font-medium">
                            R$ {Number(propertyDetail.condominiumFee).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      )}
                      {propertyDetail.iptuValue && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">IPTU</label>
                          <div className="text-base font-medium">
                            R$ {Number(propertyDetail.iptuValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(propertyDetail.totalAreaHectares || propertyDetail.productiveArea || propertyDetail.propertyRegistry || propertyDetail.ccirNumber || propertyDetail.carNumber || propertyDetail.itrValue || propertyDetail.intendedUse) && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                        <Grid3X3 className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold">Informações Rurais</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {propertyDetail.totalAreaHectares && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Área Total (Hectares)</label>
                          <div className="text-base">{Number(propertyDetail.totalAreaHectares).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha</div>
                        </div>
                      )}
                      {propertyDetail.productiveArea && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Área Produtiva</label>
                          <div className="text-base">{Number(propertyDetail.productiveArea).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha</div>
                        </div>
                      )}
                      {propertyDetail.propertyRegistry && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Registro da Propriedade</label>
                          <div className="text-base">{propertyDetail.propertyRegistry}</div>
                        </div>
                      )}
                      {propertyDetail.ccirNumber && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Número CCIR</label>
                          <div className="text-base font-mono text-sm">{propertyDetail.ccirNumber}</div>
                        </div>
                      )}
                      {propertyDetail.carNumber && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Número CAR</label>
                          <div className="text-base font-mono text-sm break-all">{propertyDetail.carNumber}</div>
                        </div>
                      )}
                      {propertyDetail.itrValue && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Valor ITR</label>
                          <div className="text-base font-medium">
                            R$ {Number(propertyDetail.itrValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      )}
                      {propertyDetail.intendedUse && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Uso Pretendido</label>
                          <div className="text-base">
                            {propertyDetail.intendedUse === 'AGRICULTURAL' ? 'Agrícola' : propertyDetail.intendedUse === 'LIVESTOCK' ? 'Pecuária' : propertyDetail.intendedUse === 'MIXED' ? 'Misto' : propertyDetail.intendedUse}
                          </div>
                        </div>
                      )}
                    </div>
                    {propertyDetail.georeferencing && (
                      <div className="mt-4">
                        <label className="text-sm font-medium text-muted-foreground">Georreferenciamento</label>
                        <div className="text-xs font-mono bg-muted p-2 rounded mt-1 break-all">{propertyDetail.georeferencing}</div>
                      </div>
                    )}
                  </div>
                )}

                {(propertyDetail.description || propertyDetail.furnitureList) && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold">Descrições</h3>
                    </div>
                    {propertyDetail.description && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Descrição do Imóvel</label>
                        <p className="mt-2 text-sm text-foreground bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{propertyDetail.description}</p>
                      </div>
                    )}
                    {propertyDetail.furnitureList && (
                      <div className="mt-4">
                        <label className="text-sm font-medium text-muted-foreground">Mobílias / Itens Inclusos</label>
                        <p className="mt-2 text-sm text-foreground bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{propertyDetail.furnitureList}</p>
                      </div>
                    )}
                  </div>
                )}

                {propertyDetail.isFrozen && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                    <p className="font-medium">Este imóvel está congelado</p>
                    <p className="text-xs mt-1">
                      Não é possível criar contratos, emitir cobranças ou gerar recibos enquanto o imóvel estiver congelado.
                      Faça upgrade do plano para desbloquear.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Não foi possível carregar os detalhes do imóvel.
              </div>
            )}
          </DialogContent>
        </Dialog>

        { }
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

        { }
        <Dialog open={showDocumentsModal} onOpenChange={setShowDocumentsModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Documentos do Imóvel</DialogTitle>
            </DialogHeader>
            {documentsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-64" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Skeleton className="w-4 h-4" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                        <Skeleton className="h-8 w-24" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : selectedProperty ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <strong>Imóvel:</strong> {selectedProperty.name || selectedProperty.address}
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Documentos Disponíveis:</h4>
                  {documents.length > 0 ? (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {documents.map((doc, index) => (
                        <div key={`${doc.type}-${doc.id}-${index}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{doc.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {doc.type === 'CONTRACT' ? 'Contrato' : doc.type === 'INSPECTION' ? 'Vistoria' : 'Notificação'}
                                </Badge>
                                {doc.date && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(doc.date).toLocaleDateString('pt-BR')}
                                  </span>
                                )}
                                {doc.status && (
                                  <Badge variant={doc.status === 'ASSINADO' || doc.status === 'FINALIZADO' ? 'default' : 'secondary'} className="text-xs">
                                    {doc.status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={async () => {
                              try {
                                const blob = await doc.downloadFn();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${doc.name.replace(/\s+/g, '-')}.pdf`;
                                a.click();
                                window.URL.revokeObjectURL(url);
                                toast.success('PDF baixado com sucesso!');
                              } catch (error) {
                                console.error('Error downloading PDF:', error);
                                toast.error('Erro ao baixar PDF');
                              }
                            }}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Baixar PDF
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum documento encontrado para este imóvel</p>
                      <p className="text-xs mt-1">Documentos aparecerão aqui quando houver contratos, vistorias ou notificações vinculados</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowDocumentsModal(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        { }
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

        { }
        <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Emitir Cobrança</DialogTitle>
            </DialogHeader>
            {invoiceModalLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-64" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            ) : selectedProperty ? (
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

        { }
        <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Gerar Recibo</DialogTitle>
            </DialogHeader>
            {receiptModalLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-64" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            ) : selectedProperty ? (
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
                  <Select
                    value={receiptData.paymentMethod}
                    onValueChange={(value) => setReceiptData(prev => ({ ...prev, paymentMethod: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="BOLETO">Boleto</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                      <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
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

        { }
        <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Atribuir corretor ao imóvel</DialogTitle>
            </DialogHeader>
            {assignBrokerModalLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            ) : propertyToAssign ? (
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

        { }
        <Dialog open={assignTenantModalOpen} onOpenChange={setAssignTenantModalOpen} modal={true}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Atribuir inquilino ao imóvel</DialogTitle>
            </DialogHeader>
            {assignTenantModalLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            ) : propertyToAssignTenant ? (
              <div className="space-y-4">
                <div className="bg-muted/40 p-3 rounded-md">
                  <p className="text-sm font-semibold">{propertyToAssignTenant.name || propertyToAssignTenant.address}</p>
                  <p className="text-xs text-muted-foreground">
                    Proprietário: {propertyToAssignTenant.owner?.name || propertyToAssignTenant.owner?.email || 'Sem proprietário'}
                  </p>
                  {!isIndependentOwner && (
                    <p className="text-xs text-muted-foreground">
                      Corretor: {propertyToAssignTenant.broker?.name || propertyToAssignTenant.broker?.email || 'Sem corretor'}
                    </p>
                  )}
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

        { }
        <Dialog open={!!propertyToDelete} onOpenChange={() => setPropertyToDelete(null)}>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-xl">
            <DialogHeader>
              <DialogTitle>Excluir imóvel</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir o imóvel <b>{propertyToDelete?.address}</b>? Esta ação não poderá ser desfeita.
            </p>
            <div className="flex flex-row gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPropertyToDelete(null)}
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

        { }
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
                  Você atingiu o limite do plano
                </p>
                <p className="text-sm text-muted-foreground">
                  {upgradeErrorMessage || 'Você atingiu o limite de imóveis do seu plano atual.'}
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-green-800">
                  Faça upgrade para desbloquear:
                </p>
                <ul className="text-sm text-green-700 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Mais imóveis
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Mais contratos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Recursos avançados
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
