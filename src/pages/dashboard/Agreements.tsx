import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agreementsAPI, propertiesAPI, contractsAPI, usersAPI } from '../../api';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useAgreementPermissions, useAgreementActions } from '../../hooks/use-agreement-permissions';
import type { AgreementContext } from '../../lib/agreement-permissions';
import {
  AgreementAction,
} from '../../lib/agreement-permissions';
import {
  FileSignature,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  User,
  List,
  Grid3X3,
  CheckCircle,
  XCircle,
  FileText,
  PenTool,
  Send,
  Ban,
  DollarSign,
  Building2,
  ShieldAlert,
  Lock,
  Search,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { formatDate, formatCurrency } from '../../lib/utils';
import { safeGetCurrentPosition, isSecureOrigin } from '../../hooks/use-geolocation';
import { SignatureCapture } from '../../components/contracts/SignatureCapture';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
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

interface Agreement {
  id: string;
  contractId?: string;
  propertyId: string;
  agencyId?: string;
  type: string;
  title: string;
  description?: string;
  content?: string;
  tenantId?: string;
  ownerId?: string;
  originalAmount?: string;
  negotiatedAmount?: string;
  fineAmount?: string;
  discountAmount?: string;
  installments?: number;
  installmentValue?: string;
  effectiveDate?: string;
  expirationDate?: string;
  newDueDate?: string;
  moveOutDate?: string;
  status: string;
  tenantSignature?: string;
  tenantSignedAt?: string;
  ownerSignature?: string;
  ownerSignedAt?: string;
  agencySignature?: string;
  agencySignedAt?: string;
  asaasPaymentLink?: string;
  paymentStatus?: string;
  agreementToken?: string;
  createdBy?: string;
  property?: any;
  contract?: any;
  tenant?: any;
  owner?: any;
  approvedBy?: any;
  createdByUser?: any;
  createdAt?: string;
  availableActions?: AgreementAction[];
}

const agreementTypes = [
  { value: 'PAYMENT_SETTLEMENT', label: 'Acordo de Pagamento' },
  { value: 'DAMAGE_COMPENSATION', label: 'Compensacao por Danos' },
  { value: 'FINE_AGREEMENT', label: 'Acordo de Multa' },
  { value: 'MOVE_OUT', label: 'Entrega de Chaves' },
  { value: 'CONTRACT_ADJUSTMENT', label: 'Ajuste de Contrato' },
  { value: 'OTHER', label: 'Outro' },
];

const agreementStatuses = [
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'AGUARDANDO_ASSINATURA', label: 'Aguardando Assinatura' },
  { value: 'ASSINADO', label: 'Assinado' },
  { value: 'CONCLUIDO', label: 'Concluido' },
  { value: 'REJEITADO', label: 'Rejeitado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

function toAgreementContext(agreement: Agreement): AgreementContext {
  return {
    id: agreement.id,
    status: agreement.status,
    agencyId: agreement.agencyId,
    propertyId: agreement.propertyId,
    contractId: agreement.contractId,
    tenantId: agreement.tenantId,
    ownerId: agreement.ownerId,
    createdBy: agreement.createdBy || '',
    tenantSignature: agreement.tenantSignature,
    ownerSignature: agreement.ownerSignature,
    agencySignature: agreement.agencySignature,
    property: agreement.property ? {
      ownerId: agreement.property.ownerId,
      agencyId: agreement.property.agencyId,
      brokerId: agreement.property.brokerId,
      tenantId: agreement.property.tenantId,
    } : undefined,
  };
}

function AgreementActionsDropdown({
  agreement,
  onView,
  onEdit,
  onDelete,
  onSendForSignature,
  onSign,
  onSignWaiting,
  onApprove,
  onReject,
  onCancel,
}: {
  agreement: Agreement;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSendForSignature: () => void;
  onSign: (type: 'agency' | 'owner' | 'tenant') => void;
  onSignWaiting: () => void;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
}) {
  const context = useMemo(() => toAgreementContext(agreement), [agreement]);
  const actions = useAgreementActions(context);
  const { user } = useAuth();

  // Check if agency can sign (has permission) but is waiting for others
  const isAgencyRole = ['AGENCY_ADMIN', 'AGENCY_MANAGER'].includes(user?.role || '');
  const agencyWaitingForOthers = isAgencyRole &&
    !agreement.agencySignedAt &&
    (!agreement.tenantSignature || !agreement.ownerSignature) &&
    ['AGUARDANDO_ASSINATURA', 'RASCUNHO'].includes(agreement.status);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.canView && (
          <DropdownMenuItem onClick={onView}>
            <Eye className="w-4 h-4 mr-2" />
            Ver detalhes
          </DropdownMenuItem>
        )}

        {actions.canEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </DropdownMenuItem>
        )}

        {actions.canSendForSignature && (
          <DropdownMenuItem onClick={onSendForSignature}>
            <Send className="w-4 h-4 mr-2" />
            Enviar para assinatura
          </DropdownMenuItem>
        )}

        {}
        {actions.canSignAsAgency && !agreement.agencySignedAt && (
          <DropdownMenuItem onClick={() => onSign('agency')}>
            <PenTool className="w-4 h-4 mr-2" />
            Assinar como Agencia
          </DropdownMenuItem>
        )}
        {agencyWaitingForOthers && (
          <DropdownMenuItem onClick={onSignWaiting} className="text-gray-400">
            <Lock className="w-4 h-4 mr-2" />
            Assinar como Agencia (Aguardando)
          </DropdownMenuItem>
        )}

        {actions.canSignAsOwner && !agreement.ownerSignedAt && (
          <DropdownMenuItem onClick={() => onSign('owner')}>
            <PenTool className="w-4 h-4 mr-2" />
            Assinar como Proprietario
          </DropdownMenuItem>
        )}

        {actions.canSignAsTenant && !agreement.tenantSignedAt && (
          <DropdownMenuItem onClick={() => onSign('tenant')}>
            <PenTool className="w-4 h-4 mr-2" />
            Assinar como Inquilino
          </DropdownMenuItem>
        )}

        {}
        {actions.canApprove && agreement.status === 'ASSINADO' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onApprove}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Aprovar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onReject}>
              <XCircle className="w-4 h-4 mr-2" />
              Rejeitar
            </DropdownMenuItem>
          </>
        )}

        {}
        {actions.canCancel && !['CONCLUIDO', 'REJEITADO', 'CANCELADO'].includes(agreement.status) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCancel} className="text-orange-600">
              <Ban className="w-4 h-4 mr-2" />
              Cancelar
            </DropdownMenuItem>
          </>
        )}

        {}
        {actions.canDelete && (
          <DropdownMenuItem onClick={onDelete} className="text-red-600">
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TableRowActions({
  agreement,
  onView,
  onEdit,
  onDelete,
  onSendForSignature,
  onApprove,
  onReject,
  onSign,
  onSignWaiting,
}: {
  agreement: Agreement;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSendForSignature: () => void;
  onApprove: () => void;
  onReject: () => void;
  onSign: (type: 'agency' | 'owner' | 'tenant') => void;
  onSignWaiting: () => void;
}) {
  const context = useMemo(() => toAgreementContext(agreement), [agreement]);
  const actions = useAgreementActions(context);
  const { user } = useAuth();

  // Check if agency can sign (has permission) but is waiting for others
  const isAgencyRole = ['AGENCY_ADMIN', 'AGENCY_MANAGER'].includes(user?.role || '');
  const agencyWaitingForOthers = isAgencyRole &&
    !agreement.agencySignedAt &&
    (!agreement.tenantSignature || !agreement.ownerSignature) &&
    ['AGUARDANDO_ASSINATURA', 'RASCUNHO'].includes(agreement.status);

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={onView}
        className="text-orange-600 border-orange-600 hover:bg-orange-50"
      >
        <Eye className="w-4 h-4" />
      </Button>

      {actions.canSignAsAgency && !agreement.agencySignedAt && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onSign('agency')}
          className="text-green-600 border-green-600 hover:bg-green-50"
          title="Assinar como Agencia"
        >
          <PenTool className="w-4 h-4" />
        </Button>
      )}
      {agencyWaitingForOthers && (
        <Button
          size="sm"
          variant="outline"
          onClick={onSignWaiting}
          className="text-gray-400 border-gray-300 cursor-not-allowed"
          title="Aguardando assinaturas do Inquilino e Proprietário"
        >
          <Lock className="w-4 h-4" />
        </Button>
      )}

      {actions.canSignAsOwner && !agreement.ownerSignedAt && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onSign('owner')}
          className="text-green-600 border-green-600 hover:bg-green-50"
          title="Assinar como Proprietario"
        >
          <PenTool className="w-4 h-4" />
        </Button>
      )}

      {actions.canSignAsTenant && !agreement.tenantSignedAt && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onSign('tenant')}
          className="text-green-600 border-green-600 hover:bg-green-50"
          title="Assinar como Inquilino"
        >
          <PenTool className="w-4 h-4" />
        </Button>
      )}

      {actions.canEdit && (
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          className="text-blue-600 border-blue-600 hover:bg-blue-50"
        >
          <Edit className="w-4 h-4" />
        </Button>
      )}

      {actions.canSendForSignature && (
        <Button
          size="sm"
          variant="outline"
          onClick={onSendForSignature}
          className="text-purple-600 border-purple-600 hover:bg-purple-50"
        >
          <Send className="w-4 h-4" />
        </Button>
      )}

      {actions.canApprove && agreement.status === 'ASSINADO' && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={onApprove}
            className="text-green-600 border-green-600 hover:bg-green-50"
          >
            <CheckCircle className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4" />
          </Button>
        </>
      )}

      {actions.canDelete && (
        <Button
          size="sm"
          variant="outline"
          onClick={onDelete}
          className="text-red-600 border-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

export function Agreements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    permissions,
    isMR3XRole,
  } = useAgreementPermissions();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [showSendErrorModal, setShowSendErrorModal] = useState(false);
  const [signAgreementData, setSignAgreementData] = useState<{ agreement: Agreement | null; type: 'agency' | 'owner' | 'tenant' | null }>({ agreement: null, type: null });
  const [signature, setSignature] = useState<string | null>(null);
  const [geoConsent, setGeoConsent] = useState(false);
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [signing, setSigning] = useState(false);

  const [filterType, _setFilterType] = useState<string>('');
  const [filterStatus, _setFilterStatus] = useState<string>('');
  const [filterProperty, _setFilterProperty] = useState<string>('');

  void _setFilterType;
  void _setFilterStatus;
  void _setFilterProperty;

  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = useCallback(() => {
    setSearchQuery(searchTerm.trim());
  }, [searchTerm]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchQuery('');
  }, []);

  const [newAgreement, setNewAgreement] = useState({
    propertyId: '',
    contractId: '',
    type: 'PAYMENT_SETTLEMENT',
    title: '',
    description: '',
    content: '',
    tenantId: '',
    ownerId: '',
    originalAmount: '',
    negotiatedAmount: '',
    fineAmount: '',
    discountAmount: '',
    installments: '',
    installmentValue: '',
    effectiveDate: '',
    expirationDate: '',
    newDueDate: '',
    moveOutDate: '',
    notes: '',
  });

  const [editForm, setEditForm] = useState({
    contractId: '',
    type: 'PAYMENT_SETTLEMENT',
    title: '',
    description: '',
    content: '',
    tenantId: '',
    ownerId: '',
    originalAmount: '',
    negotiatedAmount: '',
    fineAmount: '',
    discountAmount: '',
    installments: '',
    installmentValue: '',
    effectiveDate: '',
    expirationDate: '',
    newDueDate: '',
    moveOutDate: '',
    notes: '',
    status: '',
  });

  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [agreementToDelete, setAgreementToDelete] = useState<Agreement | null>(null);
  const [agreementDetail, setAgreementDetail] = useState<Agreement | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [properties, setProperties] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  if (!permissions.canView) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <ShieldAlert className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Voce nao tem permissao para visualizar acordos.</p>
        </div>
      </div>
    );
  }

  const { data: agreementsResponse, isLoading } = useQuery({
    queryKey: ['agreements', user?.id, filterType, filterStatus, filterProperty, searchQuery],
    queryFn: () => agreementsAPI.getAgreements({
      type: filterType && filterType !== 'all' ? filterType : undefined,
      status: filterStatus && filterStatus !== 'all' ? filterStatus : undefined,
      propertyId: filterProperty && filterProperty !== 'all' ? filterProperty : undefined,
      search: searchQuery || undefined,
    }),
    enabled: permissions.canView,
  });

  const agreements = useMemo(() => {
    if (!agreementsResponse) return [];
    
    if (agreementsResponse.data && Array.isArray(agreementsResponse.data)) {
      return agreementsResponse.data;
    }
    
    if (Array.isArray(agreementsResponse)) {
      return agreementsResponse;
    }
    return [];
  }, [agreementsResponse]);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        const propertiesData = await propertiesAPI.getProperties();
        setProperties(Array.isArray(propertiesData) ? propertiesData : propertiesData.data || []);
      } catch (error) {
        console.error('Error loading properties:', error);
      }
    };

    if (permissions.canView) {
      loadProperties();
    }
  }, [permissions.canView]);

  useEffect(() => {
    const loadFormData = async () => {
      try {
        const [contractsData, tenantsData] = await Promise.all([
          contractsAPI.getContracts(),
          usersAPI.getTenants(),
        ]);
        setContracts(Array.isArray(contractsData) ? contractsData : contractsData.data || []);
        setTenants(Array.isArray(tenantsData) ? tenantsData : tenantsData.data || []);
      } catch (error) {
        console.error('Error loading form data:', error);
      }
    };

    if (permissions.canCreate || permissions.canEdit) {
      loadFormData();
    }
  }, [permissions.canCreate, permissions.canEdit]);

  const closeAllModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDetailModal(false);
    setShowRejectModal(false);
    setSelectedAgreement(null);
    setAgreementToDelete(null);
    setAgreementDetail(null);
    setRejectionReason('');
  };

  const createAgreementMutation = useMutation({
    mutationFn: (data: any) => agreementsAPI.createAgreement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreements'] });
      closeAllModals();
      toast.success('Acordo criado com sucesso');
      setNewAgreement({
        propertyId: '',
        contractId: '',
        type: 'PAYMENT_SETTLEMENT',
        title: '',
        description: '',
        content: '',
        tenantId: '',
        ownerId: '',
        originalAmount: '',
        negotiatedAmount: '',
        fineAmount: '',
        discountAmount: '',
        installments: '',
        installmentValue: '',
        effectiveDate: '',
        expirationDate: '',
        newDueDate: '',
        moveOutDate: '',
        notes: '',
      });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao criar acordo');
    },
  });

  const updateAgreementMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => agreementsAPI.updateAgreement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreements'] });
      closeAllModals();
      toast.success('Acordo atualizado com sucesso');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao atualizar acordo');
    },
  });

  const deleteAgreementMutation = useMutation({
    mutationFn: (id: string) => agreementsAPI.deleteAgreement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreements'] });
      closeAllModals();
      toast.success('Acordo excluido com sucesso');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao excluir acordo');
    },
  });

  const approveAgreementMutation = useMutation({
    mutationFn: (id: string) => agreementsAPI.approveAgreement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreements'] });
      toast.success('Acordo aprovado com sucesso');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao aprovar acordo');
    },
  });

  const rejectAgreementMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => agreementsAPI.rejectAgreement(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreements'] });
      closeAllModals();
      toast.success('Acordo rejeitado');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao rejeitar acordo');
    },
  });

  const sendForSignatureMutation = useMutation({
    mutationFn: (id: string) => agreementsAPI.sendForSignature(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreements'] });
      toast.success('Acordo enviado para assinatura');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao enviar para assinatura');
    },
  });

  const cancelAgreementMutation = useMutation({
    mutationFn: (id: string) => agreementsAPI.cancelAgreement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreements'] });
      toast.success('Acordo cancelado');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao cancelar acordo');
    },
  });

  const signAgreementMutation = useMutation({
    mutationFn: ({ id, signature }: { id: string; signature: any }) => agreementsAPI.signAgreement(id, signature),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreements'] });
      toast.success('Acordo assinado com sucesso');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao assinar acordo');
    },
  });

  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const data: any = {
        ...newAgreement,
        originalAmount: newAgreement.originalAmount ? parseFloat(newAgreement.originalAmount) : undefined,
        negotiatedAmount: newAgreement.negotiatedAmount ? parseFloat(newAgreement.negotiatedAmount) : undefined,
        fineAmount: newAgreement.fineAmount ? parseFloat(newAgreement.fineAmount) : undefined,
        discountAmount: newAgreement.discountAmount ? parseFloat(newAgreement.discountAmount) : undefined,
        installments: newAgreement.installments ? parseInt(newAgreement.installments) : undefined,
        installmentValue: newAgreement.installmentValue ? parseFloat(newAgreement.installmentValue) : undefined,
      };
      Object.keys(data).forEach(key => {
        if (data[key] === '') delete data[key];
      });
      await createAgreementMutation.mutateAsync(data);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgreement) return;
    setUpdating(true);
    try {
      const data: any = {
        ...editForm,
        originalAmount: editForm.originalAmount ? parseFloat(editForm.originalAmount) : undefined,
        negotiatedAmount: editForm.negotiatedAmount ? parseFloat(editForm.negotiatedAmount) : undefined,
        fineAmount: editForm.fineAmount ? parseFloat(editForm.fineAmount) : undefined,
        discountAmount: editForm.discountAmount ? parseFloat(editForm.discountAmount) : undefined,
        installments: editForm.installments ? parseInt(editForm.installments) : undefined,
        installmentValue: editForm.installmentValue ? parseFloat(editForm.installmentValue) : undefined,
      };
      Object.keys(data).forEach(key => {
        if (data[key] === '') delete data[key];
      });
      await updateAgreementMutation.mutateAsync({
        id: selectedAgreement.id,
        data,
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleViewAgreement = async (agreement: Agreement) => {
    closeAllModals();
    setLoading(true);
    try {
      const fullDetails = await agreementsAPI.getAgreementById(agreement.id);
      setAgreementDetail(fullDetails);
      setShowDetailModal(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao carregar detalhes do acordo');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAgreement = async (agreement: Agreement) => {
    closeAllModals();
    setLoading(true);
    try {
      const fullDetails = await agreementsAPI.getAgreementById(agreement.id);
      setSelectedAgreement(fullDetails);
      setEditForm({
        contractId: fullDetails.contractId || '',
        type: fullDetails.type,
        title: fullDetails.title || '',
        description: fullDetails.description || '',
        content: fullDetails.content || '',
        tenantId: fullDetails.tenantId || '',
        ownerId: fullDetails.ownerId || '',
        originalAmount: fullDetails.originalAmount || '',
        negotiatedAmount: fullDetails.negotiatedAmount || '',
        fineAmount: fullDetails.fineAmount || '',
        discountAmount: fullDetails.discountAmount || '',
        installments: fullDetails.installments?.toString() || '',
        installmentValue: fullDetails.installmentValue || '',
        effectiveDate: fullDetails.effectiveDate ? fullDetails.effectiveDate.split('T')[0] : '',
        expirationDate: fullDetails.expirationDate ? fullDetails.expirationDate.split('T')[0] : '',
        newDueDate: fullDetails.newDueDate ? fullDetails.newDueDate.split('T')[0] : '',
        moveOutDate: fullDetails.moveOutDate ? fullDetails.moveOutDate.split('T')[0] : '',
        notes: fullDetails.notes || '',
        status: fullDetails.status || '',
      });
      setShowEditModal(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao carregar acordo');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAgreement = (agreement: Agreement) => {
    closeAllModals();
    setAgreementToDelete(agreement);
  };

  const confirmDelete = () => {
    if (agreementToDelete) {
      deleteAgreementMutation.mutate(agreementToDelete.id);
    }
  };

  const handleApprove = (agreement: Agreement) => {
    approveAgreementMutation.mutate(agreement.id);
  };

  const handleReject = (agreement: Agreement) => {
    setSelectedAgreement(agreement);
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (selectedAgreement && rejectionReason) {
      rejectAgreementMutation.mutate({
        id: selectedAgreement.id,
        reason: rejectionReason,
      });
    }
  };

  const handleSendForSignature = (agreement: Agreement) => {
    // Check if agreement has at least one signature before sending (for INDEPENDENT_OWNER)
    if (user?.role === 'INDEPENDENT_OWNER') {
      const hasAnySignature = 
        agreement.tenantSignature || 
        agreement.ownerSignature;
      
      if (!hasAnySignature) {
        setShowSendErrorModal(true);
        return;
      }
    }
    
    sendForSignatureMutation.mutate(agreement.id);
  };

  const handleCancel = (agreement: Agreement) => {
    cancelAgreementMutation.mutate(agreement.id);
  };

  const handleSign = (agreement: Agreement, type: 'agency' | 'owner' | 'tenant') => {
    setSignAgreementData({ agreement, type });
    setShowSignModal(true);
  };

  const handleGeoConsentChange = (consent: boolean) => {
    setGeoConsent(consent);
    if (consent) {
      // Check if on secure origin first
      if (!isSecureOrigin()) {
        toast.warning('Geolocalização requer HTTPS. Continuando sem localização.');
        setGeoLocation(null);
        return;
      }

      toast.info('Obtendo localização...');
      safeGetCurrentPosition(
        (position) => {
          if (position) {
            setGeoLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            toast.success('Localização obtida com sucesso!');
          } else {
            setGeoLocation(null);
            toast.warning('Continuando sem localização.');
          }
        },
        (error) => {
          console.error('Error getting geolocation:', error);
          toast.error('Erro ao obter localização.');
          setGeoConsent(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
  };

  const closeSignModal = () => {
    setShowSignModal(false);
    setSignAgreementData({ agreement: null, type: null });
    setSignature(null);
    setGeoConsent(false);
    setGeoLocation(null);
    setSigning(false);
  };

  const confirmSign = () => {
    if (!signAgreementData.agreement || !signAgreementData.type || !signature || !geoLocation) return;

    setSigning(true);
    const signatureData: {
      tenantSignature?: string;
      ownerSignature?: string;
      agencySignature?: string;
    } = {};

    // Backend only accepts signature fields - SignedAt is set automatically by the backend
    switch (signAgreementData.type) {
      case 'agency':
        signatureData.agencySignature = signature;
        break;
      case 'owner':
        signatureData.ownerSignature = signature;
        break;
      case 'tenant':
        signatureData.tenantSignature = signature;
        break;
    }

    signAgreementMutation.mutate({
      id: signAgreementData.agreement.id,
      signature: signatureData,
    });
    closeSignModal();
  };

  const getSignTypeLabel = (type: 'agency' | 'owner' | 'tenant' | null) => {
    switch (type) {
      case 'agency': return 'Agencia';
      case 'owner': return 'Proprietario';
      case 'tenant': return 'Inquilino';
      default: return '';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      'RASCUNHO': { label: 'Rascunho', className: 'bg-gray-500', icon: <FileText className="w-3 h-3" /> },
      'AGUARDANDO_ASSINATURA': { label: 'Aguardando Assinatura', className: 'bg-yellow-500', icon: <PenTool className="w-3 h-3" /> },
      'ASSINADO': { label: 'Assinado', className: 'bg-blue-500', icon: <CheckCircle className="w-3 h-3" /> },
      'CONCLUIDO': { label: 'Concluido', className: 'bg-green-600', icon: <CheckCircle className="w-3 h-3" /> },
      'REJEITADO': { label: 'Rejeitado', className: 'bg-red-500', icon: <XCircle className="w-3 h-3" /> },
      'CANCELADO': { label: 'Cancelado', className: 'bg-gray-600', icon: <Ban className="w-3 h-3" /> },
    };
    const s = statusMap[status] || { label: status, className: 'bg-gray-500', icon: null };
    return (
      <Badge className={`${s.className} text-white inline-flex items-center `}>
        {s.icon}
        {s.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; className: string }> = {
      'PAYMENT_SETTLEMENT': { label: 'Acordo de Pagamento', className: 'bg-blue-100 text-blue-800' },
      'DAMAGE_COMPENSATION': { label: 'Compensacao por Danos', className: 'bg-orange-100 text-orange-800' },
      'FINE_AGREEMENT': { label: 'Acordo de Multa', className: 'bg-red-100 text-red-800' },
      'MOVE_OUT': { label: 'Entrega de Chaves', className: 'bg-purple-100 text-purple-800' },
      'CONTRACT_ADJUSTMENT': { label: 'Ajuste de Contrato', className: 'bg-green-100 text-green-800' },
      'OTHER': { label: 'Outro', className: 'bg-gray-100 text-gray-800' },
    };
    const t = typeMap[type] || { label: type, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={t.className}>{t.label}</Badge>;
  };

  if (isLoading) {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          {/* Search Bar Skeleton */}
          <Skeleton className="h-10 w-full max-w-lg" />

          {/* Table/Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-48 mb-2" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <Skeleton className="w-8 h-8" />
                  </div>
                  <Skeleton className="h-6 w-32 mb-2" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-20" />
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
        {}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-100 rounded-lg">
              <FileSignature className="w-6 h-6 text-violet-700" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Acordos</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Gerencie acordos e termos negociados
              </p>
              {isMR3XRole && (
                <div className="flex items-center gap-2 mt-2 text-sm text-amber-600">
                  <Lock className="w-4 h-4" />
                  <span>Modo somente leitura (Funcao de plataforma)</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {}
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
                <TooltipContent>Visualizacao em Tabela</TooltipContent>
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
                <TooltipContent>Visualizacao em Cards</TooltipContent>
              </Tooltip>
            </div>

            {permissions.canCreate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={() => {
                      closeAllModals();
                      setShowCreateModal(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Novo Acordo</span>
                    <span className="sm:hidden">Adicionar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Criar Novo Acordo</TooltipContent>
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
                placeholder="Pesquisar por título, imóvel ou inquilino"
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

        {}
        {agreements && agreements.length > 0 ? (
          viewMode === 'table' ? (
            
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-semibold">Titulo</th>
                      <th className="text-left p-4 font-semibold">Tipo</th>
                      <th className="text-left p-4 font-semibold">Imóvel</th>
                      <th className="text-left p-4 font-semibold">Inquilino</th>
                      <th className="text-left p-4 font-semibold">Valor</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-left p-4 font-semibold">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agreements.map((agreement: Agreement) => (
                      <tr key={agreement.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="font-medium">{agreement.title}</div>
                          <div className="text-xs text-muted-foreground">{agreement.agreementToken}</div>
                        </td>
                        <td className="p-4">{getTypeBadge(agreement.type)}</td>
                        <td className="p-4">
                          <div className="text-sm">{agreement.property?.name || agreement.property?.address || '-'}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">{agreement.tenant?.name || '-'}</div>
                        </td>
                        <td className="p-4">
                          {agreement.negotiatedAmount ? (
                            <div className="text-sm font-medium">{formatCurrency(parseFloat(agreement.negotiatedAmount))}</div>
                          ) : agreement.originalAmount ? (
                            <div className="text-sm">{formatCurrency(parseFloat(agreement.originalAmount))}</div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4">{getStatusBadge(agreement.status)}</td>
                        <td className="p-4">
                          <TableRowActions
                            agreement={agreement}
                            onView={() => handleViewAgreement(agreement)}
                            onEdit={() => handleEditAgreement(agreement)}
                            onDelete={() => handleDeleteAgreement(agreement)}
                            onSendForSignature={() => handleSendForSignature(agreement)}
                            onApprove={() => handleApprove(agreement)}
                            onReject={() => handleReject(agreement)}
                            onSign={(type) => handleSign(agreement, type)}
                            onSignWaiting={() => setShowWaitingModal(true)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {}
              <div className="md:hidden">
                {agreements.map((agreement: Agreement) => (
                  <div key={agreement.id} className="border-b border-border last:border-b-0 p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{agreement.title}</h3>
                        {agreement.agreementToken && (
                          <p className="text-xs text-muted-foreground font-mono">{agreement.agreementToken}</p>
                        )}
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {agreement.property?.name || agreement.property?.address}
                        </p>
                      </div>
                      <AgreementActionsDropdown
                        agreement={agreement}
                        onView={() => handleViewAgreement(agreement)}
                        onEdit={() => handleEditAgreement(agreement)}
                        onDelete={() => handleDeleteAgreement(agreement)}
                        onSendForSignature={() => handleSendForSignature(agreement)}
                        onSign={(type) => handleSign(agreement, type)}
                        onSignWaiting={() => setShowWaitingModal(true)}
                        onApprove={() => handleApprove(agreement)}
                        onReject={() => handleReject(agreement)}
                        onCancel={() => handleCancel(agreement)}
                      />
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                        {agreementTypes.find(t => t.value === agreement.type)?.label || agreement.type}
                      </span>
                      {getStatusBadge(agreement.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      {agreement.negotiatedAmount && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span className="font-medium">{formatCurrency(parseFloat(agreement.negotiatedAmount))}</span>
                        </div>
                      )}
                      {agreement.tenant?.name && (
                        <div className="flex items-center gap-1 truncate">
                          <User className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{agreement.tenant.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3 pt-2 border-t border-border">
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => handleViewAgreement(agreement)}>
                        <Eye className="w-3 h-3 mr-1" />
                        Ver detalhes
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agreements.map((agreement: Agreement) => (
                <Card key={agreement.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <FileSignature className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold line-clamp-1">{agreement.title}</h3>
                          <p className="text-xs text-muted-foreground">{agreement.agreementToken}</p>
                        </div>
                      </div>
                      <AgreementActionsDropdown
                        agreement={agreement}
                        onView={() => handleViewAgreement(agreement)}
                        onEdit={() => handleEditAgreement(agreement)}
                        onDelete={() => handleDeleteAgreement(agreement)}
                        onSendForSignature={() => handleSendForSignature(agreement)}
                        onSign={(type) => handleSign(agreement, type)}
                        onSignWaiting={() => setShowWaitingModal(true)}
                        onApprove={() => handleApprove(agreement)}
                        onReject={() => handleReject(agreement)}
                        onCancel={() => handleCancel(agreement)}
                      />
                    </div>

                    <div className="mb-2">{getTypeBadge(agreement.type)}</div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="w-4 h-4" />
                        <span className="truncate">{agreement.property?.name || agreement.property?.address || '-'}</span>
                      </div>
                      {agreement.tenant?.name && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>{agreement.tenant.name}</span>
                        </div>
                      )}
                      {(agreement.negotiatedAmount || agreement.originalAmount) && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-medium">
                            {formatCurrency(parseFloat(agreement.negotiatedAmount || agreement.originalAmount || '0'))}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                      {getStatusBadge(agreement.status)}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(agreement.createdAt || '')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <FileSignature className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum acordo encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {permissions.canCreate
                ? 'Comece criando seu primeiro acordo'
                : 'Nenhum acordo disponivel para sua visualizacao'}
            </p>
            {permissions.canCreate && (
              <Button
                onClick={() => {
                  closeAllModals();
                  setShowCreateModal(true);
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Acordo
              </Button>
            )}
          </div>
        )}

        {}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Novo Acordo</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">Preencha os dados para criar um novo acordo</DialogDescription>
            </DialogHeader>
            <form className="space-y-3 sm:space-y-4" onSubmit={handleCreateAgreement}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="propertyId">Imóvel *</Label>
                  <Select
                    value={newAgreement.propertyId}
                    onValueChange={(value) => setNewAgreement({ ...newAgreement, propertyId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um imóvel" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties
                        .filter((property) => {
                          // Only show properties with status DISPONIVEL
                          if (!property || !property.status) return false;
                          const status = String(property.status).toUpperCase().trim();
                          return status === 'DISPONIVEL' || status === 'AVAILABLE';
                        })
                        .map((property) => (
                          <SelectItem key={property.id} value={property.id?.toString()}>
                            {property.name || property.address}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="contractId">Contrato (Opcional)</Label>
                  <Select
                    value={newAgreement.contractId || 'none'}
                    onValueChange={(value) => setNewAgreement({ ...newAgreement, contractId: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um contrato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" hidden>Nenhum</SelectItem>
                      {contracts.filter((c: any) => c.propertyId?.toString() === newAgreement.propertyId).map((contract: any) => (
                        <SelectItem key={contract.id} value={contract.id?.toString()}>
                          {contract.tenantUser?.name || 'Contrato'} - {formatDate(contract.startDate)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Tipo *</Label>
                  <Select
                    value={newAgreement.type}
                    onValueChange={(value) => setNewAgreement({ ...newAgreement, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {agreementTypes.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tenantId">Inquilino</Label>
                  <Select
                    value={newAgreement.tenantId || 'none'}
                    onValueChange={(value) => setNewAgreement({ ...newAgreement, tenantId: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o inquilino" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" hidden>Nenhum</SelectItem>
                      {tenants.map((tenant: any) => (
                        <SelectItem
                          key={tenant.id}
                          value={tenant.id?.toString()}
                          disabled={tenant.isFrozen}
                          className={tenant.isFrozen ? 'opacity-50' : ''}
                        >
                          {tenant.name || tenant.email}
                          {tenant.isFrozen && <span className="ml-2 text-xs text-red-500">(Congelado)</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="title">Titulo *</Label>
                <Input
                  id="title"
                  value={newAgreement.title}
                  onChange={(e) => setNewAgreement({ ...newAgreement, title: e.target.value })}
                  placeholder="Titulo do acordo"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descricao</Label>
                <Textarea
                  id="description"
                  value={newAgreement.description}
                  onChange={(e) => setNewAgreement({ ...newAgreement, description: e.target.value })}
                  placeholder="Descricao breve do acordo..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="content">Conteudo/Termos do Acordo</Label>
                <Textarea
                  id="content"
                  value={newAgreement.content}
                  onChange={(e) => setNewAgreement({ ...newAgreement, content: e.target.value })}
                  placeholder="Termos completos do acordo..."
                  rows={4}
                />
              </div>

              {}
              <div className="border-t pt-3 sm:pt-4">
                <h4 className="text-sm sm:text-base font-medium mb-2 sm:mb-3">Valores Financeiros (Opcional)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  <div>
                    <Label htmlFor="originalAmount" className="text-xs sm:text-sm" truncate>Valor Original</Label>
                    <Input
                      id="originalAmount"
                      type="number"
                      step="0.01"
                      className="text-sm"
                      value={newAgreement.originalAmount}
                      onChange={(e) => setNewAgreement({ ...newAgreement, originalAmount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="negotiatedAmount" className="text-xs sm:text-sm" truncate>Valor Negociado</Label>
                    <Input
                      id="negotiatedAmount"
                      type="number"
                      step="0.01"
                      className="text-sm"
                      value={newAgreement.negotiatedAmount}
                      onChange={(e) => setNewAgreement({ ...newAgreement, negotiatedAmount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fineAmount" className="text-xs sm:text-sm">Multa</Label>
                    <Input
                      id="fineAmount"
                      type="number"
                      step="0.01"
                      className="text-sm"
                      value={newAgreement.fineAmount}
                      onChange={(e) => setNewAgreement({ ...newAgreement, fineAmount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="discountAmount" className="text-xs sm:text-sm">Desconto</Label>
                    <Input
                      id="discountAmount"
                      type="number"
                      step="0.01"
                      className="text-sm"
                      value={newAgreement.discountAmount}
                      onChange={(e) => setNewAgreement({ ...newAgreement, discountAmount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-2 sm:mt-3">
                  <div>
                    <Label htmlFor="installments" className="text-xs sm:text-sm">Parcelas</Label>
                    <Input
                      id="installments"
                      type="number"
                      className="text-sm"
                      value={newAgreement.installments}
                      onChange={(e) => setNewAgreement({ ...newAgreement, installments: e.target.value })}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="installmentValue" className="text-xs sm:text-sm" truncate>Valor da Parcela</Label>
                    <Input
                      id="installmentValue"
                      type="number"
                      step="0.01"
                      className="text-sm"
                      value={newAgreement.installmentValue}
                      onChange={(e) => setNewAgreement({ ...newAgreement, installmentValue: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {}
              <div className="border-t pt-3 sm:pt-4">
                <h4 className="text-sm sm:text-base font-medium mb-2 sm:mb-3">Datas (Opcional)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  <div>
                    <Label htmlFor="effectiveDate" className="text-xs sm:text-sm" truncate>Data de Vigencia</Label>
                    <Input
                      id="effectiveDate"
                      type="date"
                      className="text-sm"
                      value={newAgreement.effectiveDate}
                      onChange={(e) => setNewAgreement({ ...newAgreement, effectiveDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expirationDate" className="text-xs sm:text-sm" truncate>Data de Expiracao</Label>
                    <Input
                      id="expirationDate"
                      type="date"
                      className="text-sm"
                      value={newAgreement.expirationDate}
                      onChange={(e) => setNewAgreement({ ...newAgreement, expirationDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="newDueDate" className="text-xs sm:text-sm" truncate>Nova Data Venc.</Label>
                    <Input
                      id="newDueDate"
                      type="date"
                      className="text-sm"
                      value={newAgreement.newDueDate}
                      onChange={(e) => setNewAgreement({ ...newAgreement, newDueDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="moveOutDate" className="text-xs sm:text-sm" truncate>Data de Saida</Label>
                    <Input
                      id="moveOutDate"
                      type="date"
                      className="text-sm"
                      value={newAgreement.moveOutDate}
                      onChange={(e) => setNewAgreement({ ...newAgreement, moveOutDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className="text-xs sm:text-sm">Observacoes Internas</Label>
                <Textarea
                  id="notes"
                  className="text-sm"
                  value={newAgreement.notes}
                  onChange={(e) => setNewAgreement({ ...newAgreement, notes: e.target.value })}
                  placeholder="Notas internas..."
                  rows={2}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 sm:pt-4">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setShowCreateModal(false)} disabled={creating}>
                  Cancelar
                </Button>
                <Button type="submit" className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white" disabled={creating || !newAgreement.propertyId || !newAgreement.title}>
                  {creating ? 'Criando...' : 'Criar Acordo'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Editar Acordo</DialogTitle>
            </DialogHeader>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <form className="space-y-3 sm:space-y-4" onSubmit={handleUpdateAgreement}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-xs sm:text-sm">Tipo</Label>
                    <Select
                      value={editForm.type}
                      onValueChange={(value) => setEditForm({ ...editForm, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {agreementTypes.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">Status</Label>
                    <Select
                      value={editForm.status}
                      onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {agreementStatuses.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs sm:text-sm">Titulo</Label>
                  <Input
                    className="text-sm"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs sm:text-sm">Descricao</Label>
                  <Textarea
                    className="text-sm"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div>
                  <Label className="text-xs sm:text-sm">Conteudo/Termos</Label>
                  <Textarea
                    className="text-sm"
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    rows={4}
                  />
                </div>

                {}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  <div>
                    <Label className="text-xs sm:text-sm" truncate>Valor Original</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="text-sm"
                      value={editForm.originalAmount}
                      onChange={(e) => setEditForm({ ...editForm, originalAmount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm" truncate>Valor Negociado</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="text-sm"
                      value={editForm.negotiatedAmount}
                      onChange={(e) => setEditForm({ ...editForm, negotiatedAmount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">Multa</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="text-sm"
                      value={editForm.fineAmount}
                      onChange={(e) => setEditForm({ ...editForm, fineAmount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">Desconto</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="text-sm"
                      value={editForm.discountAmount}
                      onChange={(e) => setEditForm({ ...editForm, discountAmount: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs sm:text-sm">Observacoes</Label>
                  <Textarea
                    className="text-sm"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 sm:pt-4">
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setShowEditModal(false)} disabled={updating}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white" disabled={updating}>
                    {updating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alteracoes'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Detalhes do Acordo</DialogTitle>
            </DialogHeader>
            {agreementDetail && (
              <div className="space-y-4 sm:space-y-6">
                {}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold">{agreementDetail.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground font-mono">{agreementDetail.agreementToken}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:flex-col sm:items-end">
                    {getTypeBadge(agreementDetail.type)}
                    {getStatusBadge(agreementDetail.status)}
                  </div>
                </div>

                {}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Imóvel</Label>
                    <p className="text-sm sm:text-base font-medium">{agreementDetail.property?.name || agreementDetail.property?.address}</p>
                  </div>
                  {agreementDetail.contract && (
                    <div>
                      <Label className="text-xs sm:text-sm text-muted-foreground">Contrato</Label>
                      <p className="text-sm sm:text-base font-medium">
                        {agreementDetail.contract.tenantUser?.name} - {formatDate(agreementDetail.contract.startDate)}
                      </p>
                    </div>
                  )}
                  {agreementDetail.tenant && (
                    <div>
                      <Label className="text-xs sm:text-sm text-muted-foreground">Inquilino</Label>
                      <p className="text-sm sm:text-base font-medium">{agreementDetail.tenant.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{agreementDetail.tenant.email}</p>
                    </div>
                  )}
                  {agreementDetail.owner && (
                    <div>
                      <Label className="text-xs sm:text-sm text-muted-foreground">Proprietario</Label>
                      <p className="text-sm sm:text-base font-medium">{agreementDetail.owner.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{agreementDetail.owner.email}</p>
                    </div>
                  )}
                </div>

                {}
                {agreementDetail.description && (
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Descricao</Label>
                    <p className="mt-1 text-sm sm:text-base">{agreementDetail.description}</p>
                  </div>
                )}

                {}
                {agreementDetail.content && (
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Termos do Acordo</Label>
                    <div className="mt-1 p-2 sm:p-3 bg-muted rounded-lg whitespace-pre-wrap text-xs sm:text-sm">{agreementDetail.content}</div>
                  </div>
                )}

                {}
                {(agreementDetail.originalAmount || agreementDetail.negotiatedAmount) && (
                  <div className="border-t pt-3 sm:pt-4">
                    <h4 className="text-sm sm:text-base font-medium mb-2 sm:mb-3">Informacoes Financeiras</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                      {agreementDetail.originalAmount && (
                        <div>
                          <Label className="text-[10px] sm:text-xs text-muted-foreground">Valor Original</Label>
                          <p className="text-xs sm:text-sm font-medium">{formatCurrency(parseFloat(agreementDetail.originalAmount))}</p>
                        </div>
                      )}
                      {agreementDetail.negotiatedAmount && (
                        <div>
                          <Label className="text-[10px] sm:text-xs text-muted-foreground">Valor Negociado</Label>
                          <p className="text-xs sm:text-sm font-medium text-green-600">{formatCurrency(parseFloat(agreementDetail.negotiatedAmount))}</p>
                        </div>
                      )}
                      {agreementDetail.fineAmount && (
                        <div>
                          <Label className="text-[10px] sm:text-xs text-muted-foreground">Multa</Label>
                          <p className="text-xs sm:text-sm font-medium text-red-600">{formatCurrency(parseFloat(agreementDetail.fineAmount))}</p>
                        </div>
                      )}
                      {agreementDetail.discountAmount && (
                        <div>
                          <Label className="text-[10px] sm:text-xs text-muted-foreground">Desconto</Label>
                          <p className="text-xs sm:text-sm font-medium text-blue-600">{formatCurrency(parseFloat(agreementDetail.discountAmount))}</p>
                        </div>
                      )}
                    </div>
                    {agreementDetail.installments && (
                      <div className="mt-2 sm:mt-3">
                        <Label className="text-[10px] sm:text-xs text-muted-foreground">Parcelamento</Label>
                        <p className="text-xs sm:text-sm font-medium">
                          {agreementDetail.installments}x de {agreementDetail.installmentValue ? formatCurrency(parseFloat(agreementDetail.installmentValue)) : '-'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {}
                <div className="border-t pt-3 sm:pt-4">
                  <h4 className="text-sm sm:text-base font-medium mb-2 sm:mb-3">Assinaturas</h4>
                  {(() => {
                    // Check if this is an independent owner agreement (no agency)
                    const isIndependentOwnerAgreement = !agreementDetail.agencyId && !agreementDetail.property?.agencyId;
                    const showAgencyBox = !isIndependentOwnerAgreement;
                    
                    return (
                      <div className={`grid gap-2 sm:gap-4 ${showAgencyBox ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        <div className={`p-2 sm:p-3 border rounded-lg text-center ${agreementDetail.tenantSignedAt ? 'border-green-300 bg-green-50' : ''}`}>
                          {agreementDetail.tenantSignature ? (
                            <img src={agreementDetail.tenantSignature} alt="Assinatura Inquilino" className="h-10 sm:h-12 mx-auto object-contain mb-1" />
                          ) : (
                            <PenTool className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-muted-foreground" />
                          )}
                          <Label className="text-[10px] sm:text-xs block text-muted-foreground">Inquilino</Label>
                          {agreementDetail.tenantSignedAt ? (
                            <p className="text-[10px] sm:text-xs text-green-600">
                              <CheckCircle className="w-3 h-3 inline mr-1" />
                              Assinado
                            </p>
                          ) : (
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Pendente</p>
                          )}
                        </div>
                        <div className={`p-2 sm:p-3 border rounded-lg text-center ${agreementDetail.ownerSignedAt ? 'border-green-300 bg-green-50' : ''}`}>
                          {agreementDetail.ownerSignature ? (
                            <img src={agreementDetail.ownerSignature} alt="Assinatura Proprietário" className="h-10 sm:h-12 mx-auto object-contain mb-1" />
                          ) : (
                            <PenTool className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-muted-foreground" />
                          )}
                          <Label className="text-[10px] sm:text-xs block text-muted-foreground">Proprietário</Label>
                          {agreementDetail.ownerSignedAt ? (
                            <p className="text-[10px] sm:text-xs text-green-600">
                              <CheckCircle className="w-3 h-3 inline mr-1" />
                              Assinado
                            </p>
                          ) : (
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Pendente</p>
                          )}
                        </div>
                        {showAgencyBox && (
                          <div className={`p-2 sm:p-3 border rounded-lg text-center ${agreementDetail.agencySignedAt ? 'border-green-300 bg-green-50' : ''}`}>
                            {agreementDetail.agencySignature ? (
                              <img src={agreementDetail.agencySignature} alt="Assinatura Agência" className="h-10 sm:h-12 mx-auto object-contain mb-1" />
                            ) : (
                              <PenTool className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-muted-foreground" />
                            )}
                            <Label className="text-[10px] sm:text-xs block text-muted-foreground">Agência</Label>
                            {agreementDetail.agencySignedAt ? (
                              <p className="text-[10px] sm:text-xs text-green-600">
                                <CheckCircle className="w-3 h-3 inline mr-1" />
                                Assinado
                              </p>
                            ) : (
                              <p className="text-[10px] sm:text-xs text-muted-foreground">Pendente</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {}
                {agreementDetail.asaasPaymentLink && (
                  <div className="border-t pt-3 sm:pt-4">
                    <h4 className="text-sm sm:text-base font-medium mb-2">Link de Pagamento</h4>
                    <a
                      href={agreementDetail.asaasPaymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs sm:text-sm text-blue-600 hover:underline break-all"
                    >
                      {agreementDetail.asaasPaymentLink}
                    </a>
                    {agreementDetail.paymentStatus && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">Status: {agreementDetail.paymentStatus}</p>
                    )}
                  </div>
                )}

                {}
                <div className="border-t pt-3 sm:pt-4 text-xs sm:text-sm text-muted-foreground">
                  <p>Criado por: {agreementDetail.createdByUser?.name || agreementDetail.createdByUser?.email}</p>
                  <p>Data de criacao: {formatDate(agreementDetail.createdAt || '')}</p>
                  {agreementDetail.approvedBy && (
                    <p>Aprovado por: {agreementDetail.approvedBy.name || agreementDetail.approvedBy.email}</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeitar Acordo</DialogTitle>
              <DialogDescription>Informe o motivo da rejeicao</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Motivo da rejeicao..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                  Cancelar
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={confirmReject}
                  disabled={!rejectionReason}
                >
                  Rejeitar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {}
        <AlertDialog open={!!agreementToDelete} onOpenChange={() => setAgreementToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Acordo</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este acordo? Esta acao nao pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteAgreementMutation.isPending}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleteAgreementMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {}
        <Dialog open={showSignModal} onOpenChange={(open) => !open && closeSignModal()}>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PenTool className="w-5 h-5 text-green-600" />
                Assinar Acordo
              </DialogTitle>
              <DialogDescription>
                Assinatura como: <strong>{getSignTypeLabel(signAgreementData.type)}</strong>
              </DialogDescription>
            </DialogHeader>
            {signAgreementData.agreement && (
              <div className="space-y-4">
                <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Titulo:</span>
                    <span className="font-medium truncate ml-2">{signAgreementData.agreement.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-medium">
                      {signAgreementData.agreement.negotiatedAmount
                        ? formatCurrency(parseFloat(signAgreementData.agreement.negotiatedAmount))
                        : signAgreementData.agreement.originalAmount
                          ? formatCurrency(parseFloat(signAgreementData.agreement.originalAmount))
                          : '-'}
                    </span>
                  </div>
                </div>

                <SignatureCapture
                  onSignatureChange={setSignature}
                  onGeolocationConsent={handleGeoConsentChange}
                  geolocationRequired={true}
                  label="Desenhe sua assinatura"
                  disabled={signing}
                />

                {geoLocation && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Localização capturada: {geoLocation.lat.toFixed(6)}, {geoLocation.lng.toFixed(6)}
                  </div>
                )}

                <div className="flex flex-row gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={closeSignModal}
                    disabled={signing}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={confirmSign}
                    disabled={signing || !signature || !geoConsent || !geoLocation}
                  >
                    {signing ? 'Assinando...' : 'Confirmar Assinatura'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Waiting Modal for Agency Sign */}
        <Dialog open={showWaitingModal} onOpenChange={setShowWaitingModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-orange-500" />
                Aguardando Assinaturas
              </DialogTitle>
              <DialogDescription>
                Você poderá assinar este acordo após o Inquilino e o Proprietário assinarem.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  A assinatura da agência só pode ser realizada depois que ambas as partes (Inquilino e Proprietário) já tiverem assinado o acordo.
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setShowWaitingModal(false)}>
                  Entendi
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Send Error Modal */}
        <Dialog open={showSendErrorModal} onOpenChange={setShowSendErrorModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Erro ao Enviar
              </DialogTitle>
              <DialogDescription>
                Não é possível enviar o acordo sem assinaturas
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <p className="font-medium mb-1">Assinatura necessária</p>
                  <p>Primeiro, clique no botão "Ver" (ícone de olho) e assine o acordo antes de enviar.</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSendErrorModal(false)}>
                  Entendi
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
