import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inspectionsAPI, propertiesAPI, contractsAPI } from '../../api';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import {
  ClipboardCheck,
  Plus,
  Calendar,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  User,
  List,
  Grid3X3,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  PenTool,
  Upload,
  Image,
  Video,
  X,
  Printer,
  Lock,
  Copy,
  Search,
} from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
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

interface InspectionItem {
  id?: string;
  room: string;
  item: string;
  condition: 'OK' | 'DANIFICADO' | 'AUSENTE' | 'REPARAR';
  description?: string;
  photos?: string[];
  videos?: string[];
  needsRepair?: boolean;
  repairCost?: number;
  responsible?: 'INQUILINO' | 'PROPRIETARIO' | 'AGENCIA';
}

interface FilePreview {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

interface ServerMedia {
  id: string;
  inspectionId: string;
  itemIndex?: number;
  room?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  type: 'IMAGE' | 'VIDEO';
}

interface Inspection {
  id: string;
  token?: string;
  propertyId: string;
  contractId?: string;
  agencyId?: string;
  type: 'ENTRY' | 'EXIT' | 'PERIODIC';
  date: string;
  scheduledDate?: string;
  inspectorId: string;
  rooms?: string;
  photos?: string;
  notes?: string;
  status: string;
  tenantSignature?: string;
  tenantSignedAt?: string;
  ownerSignature?: string;
  ownerSignedAt?: string;
  agencySignature?: string;
  agencySignedAt?: string;
  inspectorSignature?: string;
  inspectorSignedAt?: string;
  pdfReportUrl?: string;
  property?: any;
  inspector?: any;
  assignedBy?: any;
  approvedBy?: any;
  template?: any;
  items?: InspectionItem[];
  createdAt?: string;
  hasSignatures?: boolean;
}

export function Inspections() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const isCEO = user?.role === 'CEO';
  const isProprietario = user?.role === 'PROPRIETARIO';
  const canViewInspections = hasPermission('inspections:read') || ['CEO', 'AGENCY_ADMIN', 'AGENCY_MANAGER', 'BROKER', 'INDEPENDENT_OWNER', 'PROPRIETARIO'].includes(user?.role || '');
  const canCreateInspections = (hasPermission('inspections:create') || ['AGENCY_ADMIN', 'AGENCY_MANAGER', 'BROKER', 'INDEPENDENT_OWNER'].includes(user?.role || '')) && !isCEO && !isProprietario;
  const canUpdateInspections = (hasPermission('inspections:update') || ['AGENCY_ADMIN', 'AGENCY_MANAGER', 'BROKER', 'INDEPENDENT_OWNER'].includes(user?.role || '')) && !isCEO && !isProprietario;
  const canDeleteInspections = (hasPermission('inspections:delete') || ['AGENCY_ADMIN', 'AGENCY_MANAGER', 'INDEPENDENT_OWNER'].includes(user?.role || '')) && !isCEO && !isProprietario;
  const canApproveInspections = ['AGENCY_ADMIN', 'AGENCY_MANAGER', 'INDEPENDENT_OWNER'].includes(user?.role || '') && !isProprietario;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [filterType, _setFilterType] = useState<string>('');
  const [filterStatus, _setFilterStatus] = useState<string>('');
  const [filterProperty, _setFilterProperty] = useState<string>('');

  // Suppress unused variable warnings - filters will be implemented later
  void _setFilterType;
  void _setFilterStatus;
  void _setFilterProperty;

  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = useCallback(() => {
    setSearchQuery(searchTerm.trim());
  }, [searchTerm]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchQuery('');
  }, []);

  const [newInspection, setNewInspection] = useState({
    propertyId: '',
    contractId: '',
    type: 'ENTRY' as 'ENTRY' | 'EXIT' | 'PERIODIC',
    date: new Date().toISOString().split('T')[0],
    scheduledDate: '',
    inspectorId: '',
    notes: '',
    templateId: '',
    location: '',
  });

  const [editForm, setEditForm] = useState({
    contractId: '',
    type: 'ENTRY' as 'ENTRY' | 'EXIT' | 'PERIODIC',
    date: '',
    scheduledDate: '',
    inspectorId: '',
    notes: '',
    status: '',
  });

  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>([]);
  const [itemFilePreviews, setItemFilePreviews] = useState<Map<number, FilePreview[]>>(new Map());
  const [existingMedia, setExistingMedia] = useState<Map<number, ServerMedia[]>>(new Map());
  const [mediaToDelete, setMediaToDelete] = useState<string[]>([]);
  const [_uploadingItems, _setUploadingItems] = useState<Set<number>>(new Set());

  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [inspectionToDelete, setInspectionToDelete] = useState<Inspection | null>(null);
  const [inspectionDetail, setInspectionDetail] = useState<Inspection | null>(null);
  const [detailMedia, setDetailMedia] = useState<ServerMedia[]>([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [properties, setProperties] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [_inspectors, setInspectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  if (!canViewInspections) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para visualizar vistorias.</p>
        </div>
      </div>
    );
  }

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['inspections', user?.id, filterType, filterStatus, filterProperty, searchQuery],
    queryFn: () => inspectionsAPI.getInspections({
      type: filterType && filterType !== 'all' ? filterType : undefined,
      status: filterStatus && filterStatus !== 'all' ? filterStatus : undefined,
      propertyId: filterProperty && filterProperty !== 'all' ? filterProperty : undefined,
      search: searchQuery || undefined,
    }),
    enabled: canViewInspections,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [propertiesData, contractsData] = await Promise.all([
          propertiesAPI.getProperties(),
          contractsAPI.getContracts(),
        ]);
        setProperties(propertiesData);
        setContracts(contractsData);

        const currentUserAsInspector = {
          id: user?.id,
          name: user?.name || user?.email,
          email: user?.email,
        };
        setInspectors([currentUserAsInspector]);

        setNewInspection(prev => ({
          ...prev,
          inspectorId: user?.id?.toString() || '',
        }));
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    if (canCreateInspections || canUpdateInspections) {
      loadData();
    }
  }, [canCreateInspections, canUpdateInspections, user]);

  const closeAllModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDetailModal(false);
    setShowRejectModal(false);
    setSelectedInspection(null);
    setInspectionToDelete(null);
    setInspectionDetail(null);
    setDetailMedia([]);
    setInspectionItems([]);
    setRejectionReason('');

    itemFilePreviews.forEach(files => {
      files.forEach(f => URL.revokeObjectURL(f.preview));
    });
    setItemFilePreviews(new Map());
    setExistingMedia(new Map());
    setMediaToDelete([]);
    _setUploadingItems(new Set());
  };

  const deleteInspectionMutation = useMutation({
    mutationFn: (id: string) => inspectionsAPI.deleteInspection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      closeAllModals();
      toast.success('Vistoria excluída com sucesso');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao excluir vistoria');
    },
  });

  const approveInspectionMutation = useMutation({
    mutationFn: (id: string) => inspectionsAPI.approveInspection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success('Vistoria aprovada com sucesso');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao aprovar vistoria');
    },
  });

  const rejectInspectionMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => inspectionsAPI.rejectInspection(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      closeAllModals();
      toast.success('Vistoria rejeitada');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao rejeitar vistoria');
    },
  });

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const result = await inspectionsAPI.createInspection({
        ...newInspection,
        items: inspectionItems.length > 0 ? inspectionItems : undefined,
      });

      // Upload media for each item
      const inspectionId = result.id || result.data?.id;
      if (inspectionId) {
        for (const [itemIndex, files] of itemFilePreviews.entries()) {
          if (files.length > 0) {
            const room = inspectionItems[itemIndex]?.room;
            try {
              await inspectionsAPI.uploadMedia(
                inspectionId.toString(),
                files.map(f => f.file),
                itemIndex,
                room
              );
            } catch (uploadError) {
              console.error(`Error uploading media for item ${itemIndex}:`, uploadError);
              toast.error(`Erro ao enviar mídia do item ${itemIndex + 1}`);
            }
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      closeAllModals();
      toast.success('Vistoria criada com sucesso');
      setNewInspection({
        propertyId: '',
        contractId: '',
        type: 'ENTRY',
        date: new Date().toISOString().split('T')[0],
        scheduledDate: '',
        inspectorId: user?.id?.toString() || '',
        notes: '',
        templateId: '',
        location: '',
      });
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao criar vistoria');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInspection) return;
    setUpdating(true);
    try {
      // Delete media marked for deletion
      for (const mediaId of mediaToDelete) {
        try {
          await inspectionsAPI.deleteMedia(selectedInspection.id, mediaId);
        } catch (deleteError) {
          console.error('Error deleting media:', deleteError);
        }
      }

      // Update inspection
      await inspectionsAPI.updateInspection(selectedInspection.id, {
        ...editForm,
        items: inspectionItems.length > 0 ? inspectionItems : undefined,
      });

      // Upload new media for each item
      for (const [itemIndex, files] of itemFilePreviews.entries()) {
        if (files.length > 0) {
          const room = inspectionItems[itemIndex]?.room;
          try {
            await inspectionsAPI.uploadMedia(
              selectedInspection.id,
              files.map(f => f.file),
              itemIndex,
              room
            );
          } catch (uploadError) {
            console.error(`Error uploading media for item ${itemIndex}:`, uploadError);
            toast.error(`Erro ao enviar mídia do item ${itemIndex + 1}`);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      closeAllModals();
      toast.success('Vistoria atualizada com sucesso');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar vistoria');
    } finally {
      setUpdating(false);
    }
  };

  const handleViewInspection = async (inspection: Inspection) => {
    closeAllModals();
    setLoading(true);
    try {
      const fullDetails = await inspectionsAPI.getInspectionById(inspection.id);
      setInspectionDetail(fullDetails);

      // Load media from server
      try {
        const mediaList = await inspectionsAPI.getMedia(inspection.id);
        if (Array.isArray(mediaList)) {
          setDetailMedia(mediaList);
        }
      } catch (mediaError) {
        console.error('Error loading media:', mediaError);
      }

      setShowDetailModal(true);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar detalhes da vistoria');
    } finally {
      setLoading(false);
    }
  };

  const handleEditInspection = async (inspection: Inspection) => {
    closeAllModals();
    setLoading(true);
    try {
      const fullDetails = await inspectionsAPI.getInspectionById(inspection.id);
      setSelectedInspection(fullDetails);
      setEditForm({
        contractId: fullDetails.contractId || '',
        type: fullDetails.type,
        date: fullDetails.date ? fullDetails.date.split('T')[0] : '',
        scheduledDate: fullDetails.scheduledDate ? fullDetails.scheduledDate.split('T')[0] : '',
        inspectorId: fullDetails.inspectorId || '',
        notes: fullDetails.notes || '',
        status: fullDetails.status || '',
      });
      setInspectionItems(fullDetails.items || []);

      // Load existing media from server
      try {
        const mediaList = await inspectionsAPI.getMedia(inspection.id);
        if (Array.isArray(mediaList)) {
          const mediaMap = new Map<number, ServerMedia[]>();
          mediaList.forEach((media: ServerMedia) => {
            const idx = media.itemIndex ?? -1;
            if (!mediaMap.has(idx)) {
              mediaMap.set(idx, []);
            }
            mediaMap.get(idx)!.push(media);
          });
          setExistingMedia(mediaMap);
        }
      } catch (mediaError) {
        console.error('Error loading media:', mediaError);
      }

      setShowEditModal(true);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar vistoria');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInspection = (inspection: Inspection) => {
    closeAllModals();
    setInspectionToDelete(inspection);
  };

  const confirmDelete = () => {
    if (inspectionToDelete) {
      deleteInspectionMutation.mutate(inspectionToDelete.id);
    }
  };

  const handleApprove = (inspection: Inspection) => {
    approveInspectionMutation.mutate(inspection.id);
  };

  const handleReject = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (selectedInspection && rejectionReason) {
      rejectInspectionMutation.mutate({
        id: selectedInspection.id,
        reason: rejectionReason,
      });
    }
  };

  const addInspectionItem = () => {
    setInspectionItems([
      ...inspectionItems,
      {
        room: '',
        item: '',
        condition: 'OK',
        description: '',
        needsRepair: false,
      },
    ]);
  };

  const removeInspectionItem = (index: number) => {
    setInspectionItems(inspectionItems.filter((_, i) => i !== index));
  };

  const updateInspectionItem = (index: number, field: string, value: any) => {
    const updated = [...inspectionItems];
    updated[index] = { ...updated[index], [field]: value };
    setInspectionItems(updated);
  };

  const handleFileSelect = async (index: number, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newPreviews: FilePreview[] = [];
    const maxFileSize = 50 * 1024 * 1024; 

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > maxFileSize) {
        toast.error(`Arquivo ${file.name} excede o tamanho máximo de 50MB`);
        continue;
      }

      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        toast.error(`Arquivo ${file.name} não é uma imagem ou vídeo válido`);
        continue;
      }

      const preview = URL.createObjectURL(file);
      newPreviews.push({
        file,
        preview,
        type: isImage ? 'image' : 'video',
      });
    }

    if (newPreviews.length > 0) {
      setItemFilePreviews(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(index) || [];
        newMap.set(index, [...existing, ...newPreviews]);
        return newMap;
      });
    }
  };

  const removeFilePreview = (itemIndex: number, fileIndex: number) => {
    setItemFilePreviews(prev => {
      const newMap = new Map(prev);
      const files = newMap.get(itemIndex) || [];

      if (files[fileIndex]) {
        URL.revokeObjectURL(files[fileIndex].preview);
      }

      const updated = files.filter((_, i) => i !== fileIndex);
      if (updated.length === 0) {
        newMap.delete(itemIndex);
      } else {
        newMap.set(itemIndex, updated);
      }
      return newMap;
    });
  };

  const getItemFilePreviews = (index: number): FilePreview[] => {
    return itemFilePreviews.get(index) || [];
  };

  const getItemExistingMedia = (index: number): ServerMedia[] => {
    return existingMedia.get(index) || [];
  };

  const removeExistingMedia = (itemIndex: number, mediaId: string) => {
    setMediaToDelete(prev => [...prev, mediaId]);
    setExistingMedia(prev => {
      const newMap = new Map(prev);
      const media = newMap.get(itemIndex) || [];
      newMap.set(itemIndex, media.filter(m => m.id !== mediaId));
      return newMap;
    });
  };

  const getMediaUrl = (media: ServerMedia): string => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    return `${baseUrl}${media.url}`;
  };

  const getDetailMediaForItem = (itemIndex: number): ServerMedia[] => {
    return detailMedia.filter(m => m.itemIndex === itemIndex);
  };

  const getDetailMediaGeneral = (): ServerMedia[] => {
    return detailMedia.filter(m => m.itemIndex === undefined || m.itemIndex === null);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      'RASCUNHO': { label: 'Rascunho', className: 'bg-gray-500', icon: <FileText className="w-3 h-3" /> },
      'EM_ANDAMENTO': { label: 'Em Andamento', className: 'bg-blue-500', icon: <Clock className="w-3 h-3" /> },
      'AGUARDANDO_ASSINATURA': { label: 'Aguardando Assinatura', className: 'bg-yellow-500', icon: <PenTool className="w-3 h-3" /> },
      'CONCLUIDA': { label: 'Concluída', className: 'bg-green-500', icon: <CheckCircle className="w-3 h-3" /> },
      'APROVADA': { label: 'Aprovada', className: 'bg-emerald-600', icon: <CheckCircle className="w-3 h-3" /> },
      'REJEITADA': { label: 'Rejeitada', className: 'bg-red-500', icon: <XCircle className="w-3 h-3" /> },
    };
    const s = statusMap[status] || { label: status, className: 'bg-gray-500', icon: null };
    return (
      <Badge className={`${s.className} text-white flex items-center gap-1`}>
        {s.icon}
        {s.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; className: string }> = {
      'ENTRY': { label: 'Entrada', className: 'bg-blue-100 text-blue-800' },
      'EXIT': { label: 'Saída', className: 'bg-orange-100 text-orange-800' },
      'PERIODIC': { label: 'Periódica', className: 'bg-purple-100 text-purple-800' },
    };
    const t = typeMap[type] || { label: type, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={t.className}>{t.label}</Badge>;
  };

  const getConditionBadge = (condition: string) => {
    const conditionMap: Record<string, { label: string; className: string }> = {
      'OK': { label: 'OK', className: 'bg-green-100 text-green-800' },
      'DANIFICADO': { label: 'Danificado', className: 'bg-red-100 text-red-800' },
      'AUSENTE': { label: 'Ausente', className: 'bg-yellow-100 text-yellow-800' },
      'REPARAR': { label: 'Reparar', className: 'bg-orange-100 text-orange-800' },
    };
    const c = conditionMap[condition] || { label: condition, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const defaultRooms = [
    'Sala de Estar',
    'Cozinha',
    'Quarto 1',
    'Quarto 2',
    'Quarto 3',
    'Banheiro Social',
    'Banheiro Suíte',
    'Área de Serviço',
    'Varanda',
    'Garagem',
    'Área Externa',
  ];

  const defaultItems = [
    'Paredes',
    'Piso',
    'Teto',
    'Portas',
    'Janelas',
    'Tomadas',
    'Interruptores',
    'Iluminação',
    'Pintura',
    'Armários',
  ];

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
        {}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Vistorias</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gerencie as vistorias de entrada, saída e periódicas
            </p>
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
                <TooltipContent>Visualização em Tabela</TooltipContent>
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
                <TooltipContent>Visualização em Cards</TooltipContent>
              </Tooltip>
            </div>

            {canCreateInspections && (
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
                    <span className="hidden sm:inline">Nova Vistoria</span>
                    <span className="sm:hidden">Adicionar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Criar Nova Vistoria</TooltipContent>
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
                placeholder="Pesquisar por imóvel, token ou vistoriador"
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
        {inspections && inspections.length > 0 ? (
          viewMode === 'table' ? (
            
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-semibold">Imóvel</th>
                      <th className="text-left p-4 font-semibold">Tipo</th>
                      <th className="text-left p-4 font-semibold">Data</th>
                      <th className="text-left p-4 font-semibold">Vistoriador</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-left p-4 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspections.map((inspection: Inspection) => (
                      <tr key={inspection.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="font-medium">{inspection.property?.name || inspection.property?.address || 'Sem imóvel'}</div>
                          <div className="text-sm text-muted-foreground">{inspection.property?.city || ''}</div>
                        </td>
                        <td className="p-4">{getTypeBadge(inspection.type)}</td>
                        <td className="p-4">
                          <div className="text-sm">{formatDate(inspection.date)}</div>
                          {inspection.scheduledDate && (
                            <div className="text-xs text-muted-foreground">
                              Agendada: {formatDate(inspection.scheduledDate)}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="text-muted-foreground">{inspection.inspector?.name || 'Não atribuído'}</div>
                        </td>
                        <td className="p-4">{getStatusBadge(inspection.status)}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewInspection(inspection)}
                              className="text-orange-600 border-orange-600 hover:bg-orange-50"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {canUpdateInspections && inspection.status !== 'APROVADA' && !inspection.hasSignatures && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditInspection(inspection)}
                                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {inspection.hasSignatures && inspection.status !== 'APROVADA' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled
                                    className="text-gray-400 border-gray-300"
                                  >
                                    <Lock className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Bloqueado: documento já possui assinaturas</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {canApproveInspections && inspection.status === 'CONCLUIDA' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApprove(inspection)}
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReject(inspection)}
                                  className="text-red-600 border-red-600 hover:bg-red-50"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {canDeleteInspections && inspection.status !== 'APROVADA' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteInspection(inspection)}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border">
                {inspections.map((inspection: Inspection) => (
                  <div key={inspection.id} className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{inspection.property?.name || inspection.property?.address || 'Imóvel'}</h3>
                        <p className="text-xs text-muted-foreground truncate">{inspection.inspector?.name || 'Sem vistoriador'}</p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {getTypeBadge(inspection.type)}
                        {getStatusBadge(inspection.status)}
                      </div>
                    </div>

                    {/* Token display if exists */}
                    {inspection.token && (
                      <p className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded mb-2 truncate">
                        {inspection.token}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(inspection.date)}</span>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => handleViewInspection(inspection)} className="text-xs h-8">
                        <Eye className="w-3 h-3 mr-1" />
                        Ver
                      </Button>
                      {canUpdateInspections && inspection.status !== 'APROVADA' && !inspection.hasSignatures && (
                        <Button size="sm" variant="outline" onClick={() => handleEditInspection(inspection)} className="text-xs h-8">
                          <Edit className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                      )}
                      {inspection.hasSignatures && inspection.status !== 'APROVADA' && (
                        <Button size="sm" variant="outline" disabled className="text-gray-400 text-xs h-8">
                          <Lock className="w-3 h-3 mr-1" />
                          Bloqueado
                        </Button>
                      )}
                      {canDeleteInspections && inspection.status !== 'APROVADA' && !inspection.hasSignatures && (
                        <Button size="sm" variant="outline" className="text-red-600 text-xs h-8" onClick={() => handleDeleteInspection(inspection)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inspections.map((inspection: Inspection) => (
                <Card key={inspection.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <ClipboardCheck className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold line-clamp-1">
                            {inspection.property?.name || inspection.property?.address || 'Imóvel'}
                          </h3>
                          <div className="text-sm text-muted-foreground">{getTypeBadge(inspection.type)}</div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewInspection(inspection)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          {canUpdateInspections && inspection.status !== 'APROVADA' && !inspection.hasSignatures && (
                            <DropdownMenuItem onClick={() => handleEditInspection(inspection)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {inspection.hasSignatures && inspection.status !== 'APROVADA' && (
                            <DropdownMenuItem disabled className="text-gray-400">
                              <Lock className="w-4 h-4 mr-2" />
                              Bloqueado (assinado)
                            </DropdownMenuItem>
                          )}
                          {canApproveInspections && inspection.status === 'CONCLUIDA' && (
                            <>
                              <DropdownMenuItem onClick={() => handleApprove(inspection)}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Aprovar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleReject(inspection)}>
                                <XCircle className="w-4 h-4 mr-2" />
                                Rejeitar
                              </DropdownMenuItem>
                            </>
                          )}
                          {canDeleteInspections && inspection.status !== 'APROVADA' && !inspection.hasSignatures && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteInspection(inspection)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(inspection.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{inspection.inspector?.name || 'Não atribuído'}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                      {getStatusBadge(inspection.status)}
                      {inspection.items && inspection.items.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {inspection.items.length} itens
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <ClipboardCheck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma vistoria cadastrada</h3>
            <p className="text-muted-foreground mb-4">
              Comece criando sua primeira vistoria
            </p>
            {canCreateInspections && (
              <Button
                onClick={() => {
                  closeAllModals();
                  setShowCreateModal(true);
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Vistoria
              </Button>
            )}
          </div>
        )}

        {}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Vistoria</DialogTitle>
              <DialogDescription>Preencha os dados para criar uma nova vistoria</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreateInspection}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="propertyId">Imóvel *</Label>
                  <Select
                    value={newInspection.propertyId}
                    onValueChange={(value) => setNewInspection({ ...newInspection, propertyId: value })}
                  >
                    <SelectTrigger>
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
                  <Label htmlFor="contractId">Contrato (Opcional)</Label>
                  <Select
                    value={newInspection.contractId || 'none'}
                    onValueChange={(value) => setNewInspection({ ...newInspection, contractId: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um contrato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {contracts.filter((c: any) => c.propertyId?.toString() === newInspection.propertyId).map((contract: any) => (
                        <SelectItem key={contract.id} value={contract.id?.toString()}>
                          {contract.tenantUser?.name || 'Contrato'} - {formatDate(contract.startDate)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="type">Tipo *</Label>
                  <Select
                    value={newInspection.type}
                    onValueChange={(value: 'ENTRY' | 'EXIT' | 'PERIODIC') => setNewInspection({ ...newInspection, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ENTRY">Entrada</SelectItem>
                      <SelectItem value="EXIT">Saída</SelectItem>
                      <SelectItem value="PERIODIC">Periódica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">Data da Vistoria *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newInspection.date}
                    onChange={(e) => setNewInspection({ ...newInspection, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="scheduledDate">Data Agendada</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={newInspection.scheduledDate}
                    onChange={(e) => setNewInspection({ ...newInspection, scheduledDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Observações Gerais</Label>
                <Textarea
                  id="notes"
                  value={newInspection.notes}
                  onChange={(e) => setNewInspection({ ...newInspection, notes: e.target.value })}
                  placeholder="Observações sobre a vistoria..."
                  rows={3}
                />
              </div>

              {}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Itens da Vistoria</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addInspectionItem}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Item
                  </Button>
                </div>

                {inspectionItems.map((item, index) => (
                  <div key={index} className="p-3 border border-border rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium">Item {index + 1}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeInspectionItem(index)}
                        className="text-red-600 h-6 w-6 p-0"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Cômodo</Label>
                        <Select
                          value={defaultRooms.includes(item.room) ? item.room : 'custom'}
                          onValueChange={(value) => updateInspectionItem(index, 'room', value === 'custom' ? '' : value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {defaultRooms.map((room) => (
                              <SelectItem key={room} value={room}>{room}</SelectItem>
                            ))}
                            <SelectItem value="custom">Outro...</SelectItem>
                          </SelectContent>
                        </Select>
                        {(item.room === '' || !defaultRooms.includes(item.room)) && (
                          <Input
                            className="mt-1 h-8"
                            placeholder="Nome do cômodo"
                            value={item.room}
                            onChange={(e) => updateInspectionItem(index, 'room', e.target.value)}
                          />
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">Item</Label>
                        <Select
                          value={defaultItems.includes(item.item) ? item.item : 'custom'}
                          onValueChange={(value) => updateInspectionItem(index, 'item', value === 'custom' ? '' : value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {defaultItems.map((i) => (
                              <SelectItem key={i} value={i}>{i}</SelectItem>
                            ))}
                            <SelectItem value="custom">Outro...</SelectItem>
                          </SelectContent>
                        </Select>
                        {(item.item === '' || !defaultItems.includes(item.item)) && (
                          <Input
                            className="mt-1 h-8"
                            placeholder="Nome do item"
                            value={item.item}
                            onChange={(e) => updateInspectionItem(index, 'item', e.target.value)}
                          />
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">Condição</Label>
                        <Select
                          value={item.condition}
                          onValueChange={(value: 'OK' | 'DANIFICADO' | 'AUSENTE' | 'REPARAR') => updateInspectionItem(index, 'condition', value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OK">OK</SelectItem>
                            <SelectItem value="DANIFICADO">Danificado</SelectItem>
                            <SelectItem value="AUSENTE">Ausente</SelectItem>
                            <SelectItem value="REPARAR">Reparar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Responsável</Label>
                        <Select
                          value={item.responsible || 'none'}
                          onValueChange={(value) => updateInspectionItem(index, 'responsible', value === 'none' ? undefined : value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Não definido</SelectItem>
                            <SelectItem value="INQUILINO">Inquilino</SelectItem>
                            <SelectItem value="PROPRIETARIO">Imóvel</SelectItem>
                            <SelectItem value="AGENCIA">Agência</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Descrição</Label>
                      <Input
                        className="h-8"
                        placeholder="Descrição adicional..."
                        value={item.description || ''}
                        onChange={(e) => updateInspectionItem(index, 'description', e.target.value)}
                      />
                    </div>

                    {}
                    <div className="mt-3 pt-3 border-t border-border">
                      <Label className="text-xs flex items-center gap-2 mb-2">
                        <Image className="w-3 h-3" />
                        <Video className="w-3 h-3" />
                        Fotos e Vídeos
                      </Label>

                      {}
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <Upload className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Adicionar arquivos</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={(e) => handleFileSelect(index, e.target.files)}
                          />
                        </label>
                        <span className="text-xs text-muted-foreground">
                          Imagens e vídeos (máx. 50MB cada)
                        </span>
                      </div>

                      {}
                      {getItemFilePreviews(index).length > 0 && (
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {getItemFilePreviews(index).map((filePreview, fileIndex) => (
                            <div key={fileIndex} className="relative group">
                              {filePreview.type === 'image' ? (
                                <img
                                  src={filePreview.preview}
                                  alt={`Preview ${fileIndex + 1}`}
                                  className="w-full h-20 object-cover rounded-lg border border-border"
                                />
                              ) : (
                                <div className="w-full h-20 bg-muted rounded-lg border border-border flex items-center justify-center">
                                  <Video className="w-8 h-8 text-muted-foreground" />
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => removeFilePreview(index, fileIndex)}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <div className="absolute bottom-1 left-1">
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                  {filePreview.type === 'image' ? (
                                    <><Image className="w-2 h-2 mr-1" />Foto</>
                                  ) : (
                                    <><Video className="w-2 h-2 mr-1" />Vídeo</>
                                  )}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {inspectionItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum item adicionado. Clique em "Adicionar Item" para começar.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} disabled={creating}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={creating || !newInspection.propertyId}>
                  {creating ? 'Criando...' : 'Criar Vistoria'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Vistoria</DialogTitle>
            </DialogHeader>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleUpdateInspection}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={editForm.type}
                      onValueChange={(value: 'ENTRY' | 'EXIT' | 'PERIODIC') => setEditForm({ ...editForm, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ENTRY">Entrada</SelectItem>
                        <SelectItem value="EXIT">Saída</SelectItem>
                        <SelectItem value="PERIODIC">Periódica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data da Vistoria</Label>
                    <Input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={editForm.status}
                      onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RASCUNHO">Rascunho</SelectItem>
                        <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                        <SelectItem value="AGUARDANDO_ASSINATURA">Aguardando Assinatura</SelectItem>
                        <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                {}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Itens da Vistoria</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addInspectionItem}>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar Item
                    </Button>
                  </div>

                  {inspectionItems.map((item, index) => (
                    <div key={index} className="p-3 border border-border rounded-lg space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium">Item {index + 1}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeInspectionItem(index)}
                          className="text-red-600 h-6 w-6 p-0"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs">Cômodo</Label>
                          <Input
                            className="h-8"
                            value={item.room}
                            onChange={(e) => updateInspectionItem(index, 'room', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Item</Label>
                          <Input
                            className="h-8"
                            value={item.item}
                            onChange={(e) => updateInspectionItem(index, 'item', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Condição</Label>
                          <Select
                            value={item.condition}
                            onValueChange={(value: 'OK' | 'DANIFICADO' | 'AUSENTE' | 'REPARAR') => updateInspectionItem(index, 'condition', value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OK">OK</SelectItem>
                              <SelectItem value="DANIFICADO">Danificado</SelectItem>
                              <SelectItem value="AUSENTE">Ausente</SelectItem>
                              <SelectItem value="REPARAR">Reparar</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Responsável</Label>
                          <Select
                            value={item.responsible || 'none'}
                            onValueChange={(value) => updateInspectionItem(index, 'responsible', value === 'none' ? undefined : value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Não definido</SelectItem>
                              <SelectItem value="INQUILINO">Inquilino</SelectItem>
                              <SelectItem value="PROPRIETARIO">Imóvel</SelectItem>
                              <SelectItem value="AGENCIA">Agência</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Descrição</Label>
                        <Input
                          className="h-8"
                          value={item.description || ''}
                          onChange={(e) => updateInspectionItem(index, 'description', e.target.value)}
                        />
                      </div>

                      {}
                      <div className="mt-3 pt-3 border-t border-border">
                        <Label className="text-xs flex items-center gap-2 mb-2">
                          <Image className="w-3 h-3" />
                          <Video className="w-3 h-3" />
                          Fotos e Vídeos
                        </Label>

                        {}
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                            <Upload className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Adicionar arquivos</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*,video/*"
                              className="hidden"
                              onChange={(e) => handleFileSelect(index, e.target.files)}
                            />
                          </label>
                          <span className="text-xs text-muted-foreground">
                            Imagens e vídeos (máx. 50MB cada)
                          </span>
                        </div>

                        {/* Existing media from server */}
                        {getItemExistingMedia(index).length > 0 && (
                          <div className="mt-3">
                            <Label className="text-xs text-muted-foreground mb-2 block">Mídia existente:</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {getItemExistingMedia(index).map((media) => (
                                <div key={media.id} className="relative group">
                                  {media.type === 'IMAGE' ? (
                                    <img
                                      src={getMediaUrl(media)}
                                      alt={media.originalName}
                                      className="w-full h-20 object-cover rounded-lg border border-green-300"
                                    />
                                  ) : (
                                    <div className="w-full h-20 bg-muted rounded-lg border border-green-300 flex items-center justify-center">
                                      <Video className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeExistingMedia(index, media.id)}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                  <div className="absolute bottom-1 left-1">
                                    <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-50 border-green-300">
                                      {media.type === 'IMAGE' ? (
                                        <><Image className="w-2 h-2 mr-1" />Salvo</>
                                      ) : (
                                        <><Video className="w-2 h-2 mr-1" />Salvo</>
                                      )}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* New file previews */}
                        {getItemFilePreviews(index).length > 0 && (
                          <div className="mt-3">
                            <Label className="text-xs text-muted-foreground mb-2 block">Novos arquivos:</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {getItemFilePreviews(index).map((filePreview, fileIndex) => (
                                <div key={fileIndex} className="relative group">
                                  {filePreview.type === 'image' ? (
                                    <img
                                      src={filePreview.preview}
                                      alt={`Preview ${fileIndex + 1}`}
                                      className="w-full h-20 object-cover rounded-lg border border-orange-300"
                                    />
                                  ) : (
                                    <div className="w-full h-20 bg-muted rounded-lg border border-orange-300 flex items-center justify-center">
                                      <Video className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeFilePreview(index, fileIndex)}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                  <div className="absolute bottom-1 left-1">
                                    <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-orange-50">
                                      {filePreview.type === 'image' ? (
                                        <><Image className="w-2 h-2 mr-1" />Novo</>
                                      ) : (
                                        <><Video className="w-2 h-2 mr-1" />Novo</>
                                      )}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} disabled={updating}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={updating}>
                    {updating ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Detail Modal - Mobile Responsive */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <DialogTitle className="text-base sm:text-lg">Detalhes da Vistoria</DialogTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 w-fit"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Imprimir</span>
                </Button>
              </div>
            </DialogHeader>
            {inspectionDetail && (
              <div className="space-y-4 sm:space-y-6">
                {/* Token Display */}
                {inspectionDetail.token && (
                  <div className="p-3 sm:p-4 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Label className="text-[10px] sm:text-xs text-orange-700">TOKEN DE VERIFICAÇÃO</Label>
                        <p className="font-mono text-sm sm:text-lg font-bold text-orange-800 truncate">{inspectionDetail.token}</p>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(inspectionDetail.token || '');
                              toast.success('Token copiado para a área de transferência');
                            }}
                            className="text-orange-700 hover:text-orange-800 shrink-0"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar token</TooltipContent>
                      </Tooltip>
                    </div>
                    {inspectionDetail.hasSignatures && (
                      <div className="flex items-center gap-2 mt-2 text-[10px] sm:text-xs text-orange-700">
                        <Lock className="w-3 h-3 shrink-0" />
                        <span>Documento bloqueado (possui assinaturas)</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Basic Info - Mobile Responsive Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Imóvel</Label>
                    <p className="font-medium text-sm sm:text-base truncate">{inspectionDetail.property?.name || inspectionDetail.property?.address}</p>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Tipo</Label>
                    <div>{getTypeBadge(inspectionDetail.type)}</div>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Data</Label>
                    <p className="font-medium text-sm sm:text-base">{formatDate(inspectionDetail.date)}</p>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Status</Label>
                    <div>{getStatusBadge(inspectionDetail.status)}</div>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Vistoriador</Label>
                    <p className="font-medium text-sm sm:text-base">{inspectionDetail.inspector?.name || 'Não atribuído'}</p>
                  </div>
                  {inspectionDetail.scheduledDate && (
                    <div>
                      <Label className="text-xs sm:text-sm text-muted-foreground">Data Agendada</Label>
                      <p className="font-medium text-sm sm:text-base">{formatDate(inspectionDetail.scheduledDate)}</p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {inspectionDetail.notes && (
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Observações</Label>
                    <p className="mt-1 p-2 sm:p-3 bg-muted rounded-lg text-xs sm:text-sm">{inspectionDetail.notes}</p>
                  </div>
                )}

                {/* General Media from server */}
                {getDetailMediaGeneral().length > 0 && (
                  <div>
                    <Label className="text-muted-foreground mb-2 flex items-center gap-1">
                      <Image className="w-4 h-4" />
                      <Video className="w-4 h-4" />
                      Mídia Geral ({getDetailMediaGeneral().length})
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {getDetailMediaGeneral().map((media) => (
                        <div key={media.id} className="relative group">
                          {media.type === 'IMAGE' ? (
                            <img
                              src={getMediaUrl(media)}
                              alt={media.originalName}
                              className="w-full h-32 object-cover rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(getMediaUrl(media), '_blank')}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div
                              className="w-full h-32 bg-muted rounded-lg border border-border flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(getMediaUrl(media), '_blank')}
                            >
                              <Video className="w-10 h-10 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute bottom-1 left-1">
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              {media.type === 'IMAGE' ? 'Foto' : 'Vídeo'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Legacy General Photos */}
                {inspectionDetail.photos && getDetailMediaGeneral().length === 0 && (() => {
                  try {
                    const photos = typeof inspectionDetail.photos === 'string'
                      ? JSON.parse(inspectionDetail.photos)
                      : inspectionDetail.photos;
                    if (Array.isArray(photos) && photos.length > 0) {
                      return (
                        <div>
                          <Label className="text-muted-foreground mb-2 flex items-center gap-1">
                            <Image className="w-4 h-4" />
                            Fotos Gerais ({photos.length})
                          </Label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {photos.map((photo: string, index: number) => (
                              <div key={index} className="relative group">
                                <img
                                  src={photo.startsWith('http') ? photo : `${import.meta.env.VITE_API_URL || ''}/uploads/${photo}`}
                                  alt={`Foto ${index + 1}`}
                                  className="w-full h-32 object-cover rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => {
                                    const url = photo.startsWith('http') ? photo : `${import.meta.env.VITE_API_URL || ''}/uploads/${photo}`;
                                    window.open(url, '_blank');
                                  }}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  } catch {
                    return null;
                  }
                })()}

                {/* Signatures - Mobile Responsive */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 border rounded-lg text-center">
                    <PenTool className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-muted-foreground" />
                    <Label className="text-[10px] sm:text-xs text-muted-foreground">Inquilino</Label>
                    {inspectionDetail.tenantSignedAt ? (
                      <p className="text-[10px] sm:text-xs text-green-600">Assinado</p>
                    ) : (
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Pendente</p>
                    )}
                  </div>
                  <div className="p-2 sm:p-3 border rounded-lg text-center">
                    <PenTool className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-muted-foreground" />
                    <Label className="text-[10px] sm:text-xs text-muted-foreground">Proprietário</Label>
                    {inspectionDetail.ownerSignedAt ? (
                      <p className="text-[10px] sm:text-xs text-green-600">Assinado</p>
                    ) : (
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Pendente</p>
                    )}
                  </div>
                  <div className="p-2 sm:p-3 border rounded-lg text-center">
                    <PenTool className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-muted-foreground" />
                    <Label className="text-[10px] sm:text-xs text-muted-foreground">Agência</Label>
                    {inspectionDetail.agencySignedAt ? (
                      <p className="text-[10px] sm:text-xs text-green-600">Assinado</p>
                    ) : (
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Pendente</p>
                    )}
                  </div>
                  <div className="p-2 sm:p-3 border rounded-lg text-center">
                    <PenTool className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-muted-foreground" />
                    <Label className="text-[10px] sm:text-xs text-muted-foreground">Vistoriador</Label>
                    {inspectionDetail.inspectorSignedAt ? (
                      <p className="text-[10px] sm:text-xs text-green-600">Assinado</p>
                    ) : (
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Pendente</p>
                    )}
                  </div>
                </div>

                {/* Inspection Items with Photos - Mobile Responsive */}
                {inspectionDetail.items && inspectionDetail.items.length > 0 && (
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground mb-2 block">Itens da Vistoria ({inspectionDetail.items.length})</Label>
                    <div className="space-y-3 sm:space-y-4">
                      {inspectionDetail.items.map((item: InspectionItem, index: number) => (
                        <div key={index} className="p-3 sm:p-4 border rounded-lg space-y-2 sm:space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm sm:text-base">{item.room} - {item.item}</p>
                              {item.description && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{item.description}</p>}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {getConditionBadge(item.condition)}
                              {item.responsible && (
                                <Badge variant="outline" className="text-xs">{item.responsible}</Badge>
                              )}
                            </div>
                          </div>

                          {/* Media from server */}
                          {getDetailMediaForItem(index).length > 0 && (
                            <div className="pt-3 border-t">
                              <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                <Image className="w-3 h-3" />
                                <Video className="w-3 h-3" />
                                Mídia ({getDetailMediaForItem(index).length})
                              </Label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {getDetailMediaForItem(index).map((media) => (
                                  <div key={media.id} className="relative group">
                                    {media.type === 'IMAGE' ? (
                                      <img
                                        src={getMediaUrl(media)}
                                        alt={media.originalName}
                                        className="w-full h-24 object-cover rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(getMediaUrl(media), '_blank')}
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div
                                        className="w-full h-24 bg-muted rounded-lg border border-border flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(getMediaUrl(media), '_blank')}
                                      >
                                        <Video className="w-8 h-8 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div className="absolute bottom-1 left-1">
                                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                        {media.type === 'IMAGE' ? 'Foto' : 'Vídeo'}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Legacy photos from item data */}
                          {item.photos && item.photos.length > 0 && getDetailMediaForItem(index).length === 0 && (
                            <div className="pt-3 border-t">
                              <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                <Image className="w-3 h-3" />
                                Fotos ({item.photos.length})
                              </Label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {item.photos.map((photo: string, photoIndex: number) => (
                                  <div key={photoIndex} className="relative group">
                                    <img
                                      src={photo.startsWith('http') ? photo : `${import.meta.env.VITE_API_URL || ''}/uploads/${photo}`}
                                      alt={`Foto ${photoIndex + 1} - ${item.item}`}
                                      className="w-full h-24 object-cover rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => {
                                        const url = photo.startsWith('http') ? photo : `${import.meta.env.VITE_API_URL || ''}/uploads/${photo}`;
                                        window.open(url, '_blank');
                                      }}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeitar Vistoria</DialogTitle>
              <DialogDescription>Informe o motivo da rejeição</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Motivo da rejeição..."
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
        <Dialog open={!!inspectionToDelete} onOpenChange={() => setInspectionToDelete(null)}>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-xl">
            <DialogHeader>
              <DialogTitle>Excluir Vistoria</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir esta vistoria? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-row gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setInspectionToDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Excluir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
