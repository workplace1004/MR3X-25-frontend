import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inspectionsAPI, propertiesAPI, contractsAPI } from '../../api';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
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
  ZoomIn,
  ZoomOut,
  Download,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { safeGetCurrentPosition, isSecureOrigin } from '../../hooks/use-geolocation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { VisuallyHidden } from '../../components/ui/visually-hidden';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
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
import { SignatureCapture } from '../../components/contracts/SignatureCapture';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

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
  sentAt?: string;
  sentById?: string;
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
  const isIndependentOwner = user?.role === 'INDEPENDENT_OWNER';
  const canViewInspections = hasPermission('inspections:read') || ['CEO', 'AGENCY_ADMIN', 'AGENCY_MANAGER', 'BROKER', 'INDEPENDENT_OWNER', 'PROPRIETARIO', 'INQUILINO'].includes(user?.role || '');
  const canCreateInspections = (hasPermission('inspections:create') || ['AGENCY_ADMIN', 'AGENCY_MANAGER', 'BROKER', 'INDEPENDENT_OWNER'].includes(user?.role || '')) && !isCEO && !isProprietario;
  const canUpdateInspections = (hasPermission('inspections:update') || ['AGENCY_ADMIN', 'AGENCY_MANAGER', 'BROKER', 'INDEPENDENT_OWNER'].includes(user?.role || '')) && !isCEO && !isProprietario;
  const canDeleteInspections = (hasPermission('inspections:delete') || ['AGENCY_ADMIN', 'AGENCY_MANAGER', 'INDEPENDENT_OWNER'].includes(user?.role || '')) && !isCEO && !isProprietario;
  const canApproveInspections = ['AGENCY_ADMIN', 'AGENCY_MANAGER', 'INDEPENDENT_OWNER'].includes(user?.role || '') && !isProprietario;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSendErrorModal, setShowSendErrorModal] = useState(false);

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
  const [_loading, _setLoading] = useState(false);
  const [inspectionDetailLoading, setInspectionDetailLoading] = useState(false);
  const [inspectionEditLoading, setInspectionEditLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const [previewImage, setPreviewImage] = useState<{ url: string; name: string; allImages: { url: string; name: string }[]; currentIndex: number } | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);

  // Signature states
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureType, setSignatureType] = useState<'tenant' | 'owner' | 'agency' | 'inspector' | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [geoConsent, setGeoConsent] = useState(false);
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [signing, setSigning] = useState(false);

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

  const sendInspectionMutation = useMutation({
    mutationFn: (id: string) => inspectionsAPI.sendInspection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success('Vistoria enviada para inquilino/proprietário');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao enviar vistoria');
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
      for (const mediaId of mediaToDelete) {
        try {
          await inspectionsAPI.deleteMedia(selectedInspection.id, mediaId);
        } catch (deleteError) {
          console.error('Error deleting media:', deleteError);
        }
      }

      await inspectionsAPI.updateInspection(selectedInspection.id, {
        ...editForm,
        items: inspectionItems.length > 0 ? inspectionItems : undefined,
      });

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
    setInspectionDetailLoading(true);
    setInspectionDetail(null);
    setDetailMedia([]);
    setShowDetailModal(true);
    try {
      const fullDetails = await inspectionsAPI.getInspectionById(inspection.id);
      setInspectionDetail(fullDetails);

      try {
        const mediaList = await inspectionsAPI.getMedia(inspection.id);
        if (Array.isArray(mediaList)) {
          setDetailMedia(mediaList);
        }
      } catch (mediaError) {
        console.error('Error loading media:', mediaError);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar detalhes da vistoria');
    } finally {
      setInspectionDetailLoading(false);
    }
  };

  const handleEditInspection = async (inspection: Inspection) => {
    closeAllModals();
    setInspectionEditLoading(true);
    setSelectedInspection(null);
    setShowEditModal(true);
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
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar vistoria');
    } finally {
      setInspectionEditLoading(false);
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

  const handleSend = (inspection: Inspection) => {
    // Check if inspection has at least one signature before sending
    const hasAnySignature = 
      inspection.tenantSignature || 
      inspection.ownerSignature || 
      inspection.agencySignature || 
      inspection.inspectorSignature ||
      inspection.hasSignatures;
    
    if (!hasAnySignature) {
      setShowSendErrorModal(true);
      return;
    }
    
    sendInspectionMutation.mutate(inspection.id);
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
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');
    return `${baseUrl}${media.url}`;
  };

  const getDetailMediaForItem = (itemIndex: number): ServerMedia[] => {
    return detailMedia.filter(m => m.itemIndex === itemIndex);
  };

  const getDetailMediaGeneral = (): ServerMedia[] => {
    return detailMedia.filter(m => m.itemIndex === undefined || m.itemIndex === null);
  };

  const openImagePreview = (url: string, name: string, allImages: { url: string; name: string }[]) => {
    const currentIndex = allImages.findIndex(img => img.url === url);
    setPreviewImage({ url, name, allImages, currentIndex: currentIndex >= 0 ? currentIndex : 0 });
    setPreviewZoom(1);
  };

  const closeImagePreview = () => {
    setPreviewImage(null);
    setPreviewZoom(1);
  };

  const navigatePreview = (direction: 'prev' | 'next') => {
    if (!previewImage) return;
    const { allImages, currentIndex } = previewImage;
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0) newIndex = allImages.length - 1;
    if (newIndex >= allImages.length) newIndex = 0;
    const newImage = allImages[newIndex];
    setPreviewImage({ ...previewImage, url: newImage.url, name: newImage.name, currentIndex: newIndex });
    setPreviewZoom(1);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setPreviewZoom(prev => {
      if (direction === 'in') return Math.min(prev + 0.25, 3);
      return Math.max(prev - 0.25, 0.5);
    });
  };

  const downloadImage = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name || 'image';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Signature functions
  const openSignatureModal = (type: 'tenant' | 'owner' | 'agency' | 'inspector') => {
    setSignatureType(type);
    setSignature(null);
    setGeoConsent(false);
    setGeoLocation(null);
    setShowSignatureModal(true);
  };

  const closeSignatureModal = () => {
    setShowSignatureModal(false);
    setSignatureType(null);
    setSignature(null);
    setGeoConsent(false);
    setGeoLocation(null);
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
    } else {
      setGeoLocation(null);
    }
  };

  const handleSubmitSignature = async () => {
    if (!inspectionDetail || !signatureType || !signature) {
      toast.error('Por favor, desenhe sua assinatura');
      return;
    }

    if (!geoConsent || !geoLocation) {
      toast.error('Por favor, autorize o compartilhamento da localização');
      return;
    }

    setSigning(true);
    try {
      await inspectionsAPI.signInspectionWithGeo(inspectionDetail.id, signatureType, {
        signature,
        geoLat: geoLocation.lat,
        geoLng: geoLocation.lng,
        geoConsent: true,
      });

      toast.success('Assinatura registrada com sucesso!');
      closeSignatureModal();

      // Refresh inspection details
      const updatedInspection = await inspectionsAPI.getInspectionById(inspectionDetail.id);
      setInspectionDetail(updatedInspection);
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao registrar assinatura');
    } finally {
      setSigning(false);
    }
  };

  const getSignerTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      tenant: 'Inquilino',
      owner: 'Proprietário',
      agency: 'Agência',
      inspector: 'Vistoriador',
    };
    return labels[type] || type;
  };

  const canUserSign = (signerType: 'tenant' | 'owner' | 'agency' | 'inspector'): boolean => {
    if (!user || !inspectionDetail) return false;

    const role = user.role;

    switch (signerType) {
      case 'tenant':
        return role === 'INQUILINO' || role === 'CEO';
      case 'owner':
        return role === 'PROPRIETARIO' || role === 'INDEPENDENT_OWNER' || role === 'CEO';
      case 'agency':
        return ['AGENCY_ADMIN', 'AGENCY_MANAGER', 'CEO'].includes(role);
      case 'inspector':
        return ['AGENCY_ADMIN', 'AGENCY_MANAGER', 'BROKER', 'CEO'].includes(role) ||
               inspectionDetail.inspectorId === user.id;
      default:
        return false;
    }
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
      <Badge className={`${s.className} text-white inline-flex items-center`}>
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

  const captureBarcodeAsRotatedImage = async (): Promise<{ rotated: string; original: string; width: number; height: number } | null> => {
    try {
      let svgElement: SVGElement | null = null;

      const allSvgs = document.querySelectorAll('#inspection-detail-content svg');

      for (const svg of allSvgs) {
        const bbox = svg.getBoundingClientRect();
        const aspectRatio = bbox.width / bbox.height;

        if (aspectRatio > 2 && svg.querySelectorAll('rect').length > 10) {
          svgElement = svg as SVGElement;
          break;
        }
      }

      if (!svgElement) return null;

      const bbox = svgElement.getBoundingClientRect();
      const svgWidth = bbox.width || 300;
      const svgHeight = bbox.height || 80;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      return new Promise((resolve) => {
        const img = document.createElement('img');
        img.onload = () => {
          const originalCanvas = document.createElement('canvas');
          originalCanvas.width = img.width || svgWidth;
          originalCanvas.height = img.height || svgHeight;
          const origCtx = originalCanvas.getContext('2d');
          if (origCtx) {
            origCtx.fillStyle = 'white';
            origCtx.fillRect(0, 0, originalCanvas.width, originalCanvas.height);
            origCtx.drawImage(img, 0, 0);
          }

          const rotatedCanvas = document.createElement('canvas');
          rotatedCanvas.width = originalCanvas.height;
          rotatedCanvas.height = originalCanvas.width;
          const rotCtx = rotatedCanvas.getContext('2d');

          if (rotCtx) {
            rotCtx.fillStyle = 'white';
            rotCtx.fillRect(0, 0, rotatedCanvas.width, rotatedCanvas.height);

            rotCtx.translate(rotatedCanvas.width, 0);
            rotCtx.rotate(Math.PI / 2);
            rotCtx.drawImage(originalCanvas, 0, 0);
          }

          URL.revokeObjectURL(url);
          resolve({
            rotated: rotatedCanvas.toDataURL('image/png'),
            original: originalCanvas.toDataURL('image/png'),
            width: rotatedCanvas.width,
            height: rotatedCanvas.height
          });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      });
    } catch (error) {
      console.error('Error capturing barcode:', error);
      return null;
    }
  };

  const handlePrintInspection = async () => {
    if (!inspectionDetail) return;

    const barcodeData = await captureBarcodeAsRotatedImage();
    const token = inspectionDetail.token || '';

    const statusLabels: Record<string, string> = {
      'RASCUNHO': 'Rascunho',
      'EM_ANDAMENTO': 'Em Andamento',
      'AGUARDANDO_ASSINATURA': 'Aguardando Assinatura',
      'CONCLUIDA': 'Concluída',
      'APROVADA': 'Aprovada',
      'REJEITADA': 'Rejeitada',
    };

    const typeLabels: Record<string, string> = {
      'ENTRY': 'Entrada',
      'EXIT': 'Saída',
      'PERIODIC': 'Periódica',
    };

    const mediaItems = getDetailMediaGeneral();
    let photosArray: string[] = [];

    if (mediaItems.length === 0 && inspectionDetail.photos) {
      try {
        const parsed = typeof inspectionDetail.photos === 'string'
          ? JSON.parse(inspectionDetail.photos)
          : inspectionDetail.photos;
        if (Array.isArray(parsed)) {
          photosArray = parsed.map((photo: string) =>
            photo.startsWith('http') ? photo : `${(import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '')}/uploads/${photo}`
          );
        }
      } catch {
        // ignore
      }
    }

    const allImages = mediaItems.length > 0
      ? mediaItems.filter(m => m.type === 'IMAGE').map(m => getMediaUrl(m))
      : photosArray;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Não foi possível abrir a janela de impressão');
      return;
    }

    const barcodeHtml = barcodeData && barcodeData.rotated
      ? `<img src="${barcodeData.rotated}" class="barcode-img" alt="barcode" />`
      : `<div style="writing-mode: vertical-rl; transform: rotate(180deg); font-family: monospace; font-size: 8pt;">${token}</div>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vistoria - ${token}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; padding-right: 25mm; color: #333; position: relative; }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #f97316; }
          .header h1 { font-size: 24px; color: #333; margin-bottom: 10px; }
          .token-box { background: linear-gradient(to right, #fff7ed, #ffedd5); border: 1px solid #fed7aa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .token-label { font-size: 10px; color: #c2410c; text-transform: uppercase; }
          .token-value { font-family: monospace; font-size: 18px; font-weight: bold; color: #9a3412; }
          .locked-notice { font-size: 11px; color: #c2410c; margin-top: 8px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .info-item { }
          .info-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
          .info-value { font-size: 14px; font-weight: 500; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
          .badge-entry { background: #dbeafe; color: #1e40af; }
          .badge-exit { background: #ffedd5; color: #9a3412; }
          .badge-periodic { background: #f3e8ff; color: #7c3aed; }
          .notes-section { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .notes-label { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
          .notes-text { font-size: 14px; }
          .media-section { margin-top: 20px; }
          .media-title { font-size: 14px; color: #6b7280; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }
          .media-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .media-item { width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; page-break-inside: avoid; }
          .signatures-section { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; page-break-inside: avoid; }
          .signatures-title { font-size: 14px; color: #6b7280; margin-bottom: 15px; }
          .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .signature-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center; }
          .signature-box.signed { border-color: #86efac; background: #f0fdf4; }
          .signature-img { height: 50px; margin: 0 auto 10px; }
          .signature-label { font-size: 12px; color: #6b7280; }
          .signature-status { font-size: 11px; margin-top: 5px; }
          .signature-status.signed { color: #16a34a; }
          .signature-status.pending { color: #6b7280; }
          .page-footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #9ca3af; }
          .barcode-container {
            position: fixed;
            right: 2mm;
            top: 50%;
            transform: translateY(-50%);
            background: white;
            z-index: 9999;
            padding: 2mm;
          }
          .barcode-img {
            max-height: 60%;
            width: auto;
            max-width: 15mm;
          }
          @media print {
            body { padding: 15px; padding-right: 20mm; margin: 0; }
            .media-item { height: 120px; }
            .barcode-container { position: fixed; right: 2mm; }
          }
        </style>
      </head>
      <body>
        <div class="barcode-container">
          ${barcodeHtml}
        </div>

        <div class="header">
          <h1>Detalhes da Vistoria</h1>
        </div>

        ${token ? `
          <div class="token-box">
            <div class="token-label">TOKEN DE VERIFICAÇÃO</div>
            <div class="token-value">${token}</div>
            ${inspectionDetail.hasSignatures ? '<div class="locked-notice">🔒 Documento bloqueado (possui assinaturas)</div>' : ''}
          </div>
        ` : ''}

        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Imóvel</div>
            <div class="info-value">${inspectionDetail.property?.name || inspectionDetail.property?.address || '-'}</div>
            ${inspectionDetail.property?.token ? `<div style="font-size: 10px; color: #9ca3af; font-family: monospace;">${inspectionDetail.property.token}</div>` : ''}
          </div>
          <div class="info-item">
            <div class="info-label">Tipo</div>
            <div class="info-value">
              <span class="badge badge-${inspectionDetail.type?.toLowerCase()}">${typeLabels[inspectionDetail.type] || inspectionDetail.type}</span>
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">Data</div>
            <div class="info-value">${formatDate(inspectionDetail.date)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Status</div>
            <div class="info-value">${statusLabels[inspectionDetail.status] || inspectionDetail.status}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Vistoriador</div>
            <div class="info-value">${inspectionDetail.inspector?.name || 'Não atribuído'}</div>
          </div>
          ${inspectionDetail.scheduledDate ? `
            <div class="info-item">
              <div class="info-label">Data Agendada</div>
              <div class="info-value">${formatDate(inspectionDetail.scheduledDate)}</div>
            </div>
          ` : ''}
        </div>

        ${inspectionDetail.notes ? `
          <div class="notes-section">
            <div class="notes-label">Observações</div>
            <div class="notes-text">${inspectionDetail.notes}</div>
          </div>
        ` : ''}

        ${allImages.length > 0 ? `
          <div class="media-section">
            <div class="media-title">📷 Mídia Geral (${allImages.length})</div>
            <div class="media-grid">
              ${allImages.map(url => `<img src="${url}" class="media-item" onerror="this.style.display='none'" />`).join('')}
            </div>
          </div>
        ` : ''}

        <div class="signatures-section">
          <div class="signatures-title">Assinaturas</div>
          <div class="signatures-grid">
            <div class="signature-box ${inspectionDetail.tenantSignedAt ? 'signed' : ''}">
              ${inspectionDetail.tenantSignature ? `<img src="${inspectionDetail.tenantSignature}" class="signature-img" />` : '<div style="height: 50px; display: flex; align-items: center; justify-content: center; color: #9ca3af;">✏️</div>'}
              <div class="signature-label">Inquilino</div>
              <div class="signature-status ${inspectionDetail.tenantSignedAt ? 'signed' : 'pending'}">
                ${inspectionDetail.tenantSignedAt ? '✓ Assinado' : 'Pendente'}
              </div>
            </div>
            <div class="signature-box ${inspectionDetail.ownerSignedAt ? 'signed' : ''}">
              ${inspectionDetail.ownerSignature ? `<img src="${inspectionDetail.ownerSignature}" class="signature-img" />` : '<div style="height: 50px; display: flex; align-items: center; justify-content: center; color: #9ca3af;">✏️</div>'}
              <div class="signature-label">Proprietário</div>
              <div class="signature-status ${inspectionDetail.ownerSignedAt ? 'signed' : 'pending'}">
                ${inspectionDetail.ownerSignedAt ? '✓ Assinado' : 'Pendente'}
              </div>
            </div>
          </div>
        </div>

        <div class="page-footer">
          Impresso em ${new Date().toLocaleString('pt-BR')} | Token: ${inspectionDetail.token || 'N/A'}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for images to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  };

  const handleDownloadInspectionPDF = async () => {
    const element = document.getElementById('inspection-detail-content');
    if (!element || !inspectionDetail) {
      toast.error('Erro ao gerar PDF');
      return;
    }

    const barcodeData = await captureBarcodeAsRotatedImage();
    const token = inspectionDetail.token || 'DRAFT';

    try {
      // Clone the element to capture at fixed width for consistent 4-column layout
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.width = '800px';
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.background = 'white';
      document.body.appendChild(clone);

      // Use html2canvas-pro which supports OKLCH colors
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        width: 800,
        windowWidth: 800,
        backgroundColor: '#ffffff',
      });

      // Remove the clone
      document.body.removeChild(clone);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Margins
      const marginLeft = 10;
      const marginTop = 10;
      const marginRight = 20; // Extra margin for barcode

      const usableWidth = pageWidth - marginLeft - marginRight;
      const usableHeight = pageHeight - marginTop - marginTop;

      // Calculate the scale to fit width
      const imgScale = usableWidth / canvas.width;
      const pxPerPage = usableHeight / imgScale;

      // Find smart break points between content rows
      const findBreakPoints = (): number[] => {
        const breaks: number[] = [0];
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to simple pagination
          let y = pxPerPage;
          while (y < canvas.height) {
            breaks.push(Math.floor(y));
            y += pxPerPage;
          }
          breaks.push(canvas.height);
          return breaks;
        }

        let currentY = 0;

        while (currentY < canvas.height) {
          const targetY = currentY + pxPerPage;

          if (targetY >= canvas.height) {
            breaks.push(canvas.height);
            break;
          }

          // Search backwards from targetY to find a good break point (white row)
          let bestBreakY = Math.floor(targetY);
          const searchStart = Math.floor(targetY);
          const searchEnd = Math.floor(currentY + pxPerPage * 0.6);

          for (let y = searchStart; y > searchEnd; y -= 2) {
            try {
              const imageData = ctx.getImageData(0, y, canvas.width, 2);
              const pixels = imageData.data;

              let whitePixels = 0;
              const totalPixels = (canvas.width * 2);

              for (let i = 0; i < pixels.length; i += 4) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                if (r > 245 && g > 245 && b > 245) {
                  whitePixels++;
                }
              }

              // If this row is mostly white (gap between content), use it as break
              if (whitePixels / totalPixels > 0.85) {
                bestBreakY = y;
                break;
              }
            } catch {
              // If getImageData fails, use default position
              break;
            }
          }

          breaks.push(bestBreakY);
          currentY = bestBreakY;
        }

        return breaks;
      };

      const breakPoints = findBreakPoints();

      for (let i = 0; i < breakPoints.length - 1; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        const srcY = breakPoints[i];
        const srcHeight = breakPoints[i + 1] - srcY;

        if (srcHeight <= 0) continue;

        const destHeight = srcHeight * imgScale;

        // Create a temporary canvas for this page's portion
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = srcHeight;
        const ctx = pageCanvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

          ctx.drawImage(
            canvas,
            0, srcY, canvas.width, srcHeight,
            0, 0, canvas.width, srcHeight
          );

          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.98);
          pdf.addImage(pageImgData, 'JPEG', marginLeft, marginTop, usableWidth, destHeight);
        }

        // Add barcode/token to this page
        if (barcodeData && barcodeData.rotated) {
          const finalWidth = 10;
          const finalHeight = pageHeight * 0.5;

          const xPos = pageWidth - finalWidth - 3;
          const yPos = (pageHeight - finalHeight) / 2;

          pdf.setFillColor(255, 255, 255);
          pdf.rect(xPos - 2, yPos - 2, finalWidth + 4, finalHeight + 4, 'F');

          pdf.addImage(barcodeData.rotated, 'PNG', xPos, yPos, finalWidth, finalHeight);
        } else {
          pdf.setFillColor(255, 255, 255);
          pdf.rect(pageWidth - 15, pageHeight / 2 - 40, 12, 80, 'F');

          pdf.setFontSize(8);
          pdf.setTextColor(0, 0, 0);
          pdf.text(token, pageWidth - 5, pageHeight / 2, { angle: 90 });
        }
      }

      pdf.save(`vistoria-${token}.pdf`);
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Erro ao gerar PDF');
    }
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
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-80" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-9 h-9 rounded" />
            <Skeleton className="w-9 h-9 rounded" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-12" />
                </div>
                <Skeleton className="w-10 h-10 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Inspections list skeleton */}
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Skeleton className="w-10 h-10 rounded" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-64" />
                      <Skeleton className="h-4 w-48" />
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </div>
                  </div>
                  <Skeleton className="w-9 h-9 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-100 rounded-lg">
              <ClipboardCheck className="w-6 h-6 text-cyan-700" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Vistorias</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Gerencie as vistorias de entrada, saída e periódicas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
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
                    className="bg-orange-600 hover:bg-orange-700 text-white w-full"
                    onClick={() => {
                      closeAllModals();
                      setShowCreateModal(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
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
                          {inspection?.token && (
                            <div className="text-[10px] text-muted-foreground font-mono">{inspection.token}</div>
                          )}
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
                              size="icon"
                              variant="outline"
                              onClick={() => handleViewInspection(inspection)}
                              className="text-orange-600 border-orange-600 hover:bg-orange-50"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {canUpdateInspections && inspection.status !== 'APROVADA' && !inspection.hasSignatures && (
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleEditInspection(inspection)}
                                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {canUpdateInspections && !inspection.sentAt && inspection.status !== 'APROVADA' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => handleSend(inspection)}
                                    className="text-green-600 border-green-600 hover:bg-green-50"
                                  >
                                    <Send className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Enviar para Inquilino/Proprietário</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {inspection.sentAt && !inspection.hasSignatures && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    disabled
                                    className="text-green-600 border-green-300"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Enviado</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {inspection.hasSignatures && inspection.status !== 'APROVADA' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
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
                                  size="icon"
                                  variant="outline"
                                  onClick={() => handleApprove(inspection)}
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
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
                                size="icon"
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

              <div className="md:hidden divide-y divide-border">
                {inspections.map((inspection: Inspection) => (
                  <div key={inspection.id} className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{inspection.property?.name || inspection.property?.address || 'Imóvel'}</h3>
                        {inspection.property?.token && (
                          <p className="text-[10px] text-muted-foreground font-mono">{inspection.property.token}</p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">{inspection.inspector?.name || 'Sem vistoriador'}</p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0 items-end">
                        {getTypeBadge(inspection.type)}
                        {getStatusBadge(inspection.status)}
                      </div>
                    </div>

                    {inspection.token && (
                      <p className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded mb-2 truncate">
                        {inspection.token}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(inspection.date)}</span>
                    </div>

                    <div className="flex gap-2 flex-wrap w-full justify-end">
                      <Button size="icon" variant="outline" onClick={() => handleViewInspection(inspection)} className="text-orange-600 border-orange-600 hover:bg-orange-50">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {canUpdateInspections && inspection.status !== 'APROVADA' && !inspection.hasSignatures && (
                        <Button size="icon" variant="outline" onClick={() => handleEditInspection(inspection)} className="text-orange-600 border-orange-600 hover:bg-orange-50">
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {inspection.hasSignatures && inspection.status !== 'APROVADA' && (
                        <Button size="icon" variant="outline" disabled className="text-gray-400 border-gray-300">
                          <Lock className="w-4 h-4" />
                        </Button>
                      )}
                      {canDeleteInspections && inspection.status !== 'APROVADA' && !inspection.hasSignatures && (
                        <Button size="icon" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleDeleteInspection(inspection)}>
                          <Trash2 className="w-4 h-4" />
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
                          {inspection.property?.token && (
                            <p className="text-[10px] text-muted-foreground font-mono">{inspection.property.token}</p>
                          )}
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
                          {canUpdateInspections && !inspection.sentAt && inspection.status !== 'APROVADA' && (
                            <DropdownMenuItem onClick={() => handleSend(inspection)}>
                              <Send className="w-4 h-4 mr-2" />
                              Enviar para Inquilino/Proprietário
                            </DropdownMenuItem>
                          )}
                          {inspection.sentAt && !inspection.hasSignatures && (
                            <DropdownMenuItem disabled className="text-green-600">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Enviado
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
                    value={newInspection.contractId || 'none'}
                    onValueChange={(value) => setNewInspection({ ...newInspection, contractId: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um contrato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" hidden>Nenhum</SelectItem>
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
              <DialogDescription>Edite os dados da vistoria</DialogDescription>
            </DialogHeader>
            {inspectionEditLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-24 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-32 w-full" />
                </div>
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

                {/* General Media (without item index) */}
                {(existingMedia.get(-1)?.length ?? 0) > 0 && (
                  <div className="p-3 border border-border rounded-lg">
                    <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      <Video className="w-4 h-4" />
                      Mídia Geral
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                      {existingMedia.get(-1)?.map((media) => (
                        <div key={media.id} className="relative group">
                          {media.type === 'IMAGE' ? (
                            <img
                              src={getMediaUrl(media)}
                              alt={media.originalName}
                              className="w-full h-20 object-cover rounded-lg border border-green-300"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80"><rect fill="%23f0f0f0" width="100" height="80"/><text fill="%23999" x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="10">Erro</text></svg>';
                              }}
                            />
                          ) : (
                            <div className="w-full h-20 bg-muted rounded-lg border border-green-300 flex items-center justify-center">
                              <Video className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeExistingMedia(-1, media.id)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-1 left-1">
                            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-50 border-green-300">
                              {media.type === 'IMAGE' ? 'Foto' : 'Vídeo'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80"><rect fill="%23f0f0f0" width="100" height="80"/><text fill="%23999" x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="10">Erro</text></svg>';
                                      }}
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
                    {updating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 print-content">
            <DialogHeader className="print-avoid-break">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <DialogTitle className="text-base sm:text-lg">Detalhes da Vistoria</DialogTitle>
                  <DialogDescription className="hidden">Visualize os detalhes completos da vistoria</DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadInspectionPDF}
                        className="flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Baixar PDF</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrintInspection}
                        className="flex items-center gap-1"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Imprimir</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </DialogHeader>
            {inspectionDetailLoading ? (
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-32 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40 mb-2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-24 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-36 mb-2" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              </div>
            ) : inspectionDetail ? (
              <div id="inspection-detail-content" className="space-y-4 sm:space-y-6">
                {inspectionDetail.token && (
                  <>
                    <div className="bg-muted p-3 sm:p-4 rounded-lg border">
                      <h3 className="font-semibold mb-3">Informações de Segurança</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
                        <div className="break-all sm:break-normal">
                          <span className="font-medium">Token:</span>{' '}
                          <span className="font-mono text-xs">{inspectionDetail.token}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(inspectionDetail.token || '');
                                  toast.success('Token copiado para a área de transferência');
                                }}
                                className="h-6 w-6 p-0 ml-1 print-hide"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar token</TooltipContent>
                          </Tooltip>
                        </div>
                        <div>
                          <span className="font-medium">Data/Hora:</span>{' '}
                          <span className="font-mono text-xs">{formatDate(inspectionDetail.createdAt || inspectionDetail.date)}</span>
                        </div>
                        {(inspectionDetail as { creatorIp?: string }).creatorIp && (
                          <div>
                            <span className="font-medium">IP:</span>{' '}
                            <span className="font-mono text-xs">{(inspectionDetail as { creatorIp?: string }).creatorIp}</span>
                          </div>
                        )}
                        {(inspectionDetail as { hash?: string }).hash && (
                          <div className="col-span-1 sm:col-span-2 break-all">
                            <span className="font-medium">Hash:</span>{' '}
                            <span className="font-mono text-xs">{(inspectionDetail as { hash?: string }).hash}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center p-3 sm:p-4 bg-white border rounded-lg gap-4 sm:gap-6">
                      <div className="flex-shrink-0">
                        <QRCodeSVG
                          value={`https://mr3x.com.br/verify/${inspectionDetail.token}`}
                          size={80}
                          level="H"
                        />
                      </div>
                      <div className="flex-shrink-0 w-full sm:w-auto overflow-x-auto flex justify-center">
                        <Barcode
                          value={inspectionDetail.token}
                          format="CODE128"
                          width={2}
                          height={50}
                          displayValue={true}
                          fontSize={14}
                          textMargin={4}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Imóvel</Label>
                    <p className="font-medium text-sm sm:text-base truncate">{inspectionDetail.property?.name || inspectionDetail.property?.address}</p>
                    {inspectionDetail.property?.token && (
                      <p className="text-[10px] text-muted-foreground font-mono">{inspectionDetail.property.token}</p>
                    )}
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

                {inspectionDetail.notes && (
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Observações</Label>
                    <p className="mt-1 p-2 sm:p-3 bg-muted rounded-lg text-xs sm:text-sm">{inspectionDetail.notes}</p>
                  </div>
                )}

                {getDetailMediaGeneral().length > 0 && (() => {
                  const generalImages = getDetailMediaGeneral()
                    .filter(m => m.type === 'IMAGE')
                    .map(m => ({ url: getMediaUrl(m), name: m.originalName }));
                  return (
                    <div className="print-page-break">
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
                                onClick={() => openImagePreview(getMediaUrl(media), media.originalName, generalImages)}
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
                  );
                })()}

                {inspectionDetail.photos && getDetailMediaGeneral().length === 0 && (() => {
                  try {
                    const photos = typeof inspectionDetail.photos === 'string'
                      ? JSON.parse(inspectionDetail.photos)
                      : inspectionDetail.photos;
                    if (Array.isArray(photos) && photos.length > 0) {
                      const photoUrls = photos.map((photo: string, idx: number) => ({
                        url: photo.startsWith('http') ? photo : `${(import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '')}/uploads/${photo}`,
                        name: `Foto ${idx + 1}`
                      }));
                      return (
                        <div className="print-page-break">
                          <Label className="text-muted-foreground mb-2 flex items-center gap-1">
                            <Image className="w-4 h-4" />
                            Fotos Gerais ({photos.length})
                          </Label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {photos.map((photo: string, index: number) => {
                              const url = photo.startsWith('http') ? photo : `${(import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '')}/uploads/${photo}`;
                              return (
                                <div key={index} className="relative group">
                                  <img
                                    src={url}
                                    alt={`Foto ${index + 1}`}
                                    className="w-full h-32 object-cover rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => openImagePreview(url, `Foto ${index + 1}`, photoUrls)}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  } catch {
                    return null;
                  }
                })()}

                <div>
                  <Label className="text-xs sm:text-sm text-muted-foreground mb-2 block">Assinaturas</Label>
                  {(() => {
                    // Check if inspection is from INDEPENDENT_OWNER (property has no agencyId)
                    const isFromIndependentOwner = !inspectionDetail.property?.agencyId;
                    // Show only Tenant and Inspector signatures for INQUILINO viewing INDEPENDENT_OWNER inspections
                    const showOnlyTenantAndInspector = user?.role === 'INQUILINO' && isFromIndependentOwner;
                    const shouldHideOwnerAndAgency = isIndependentOwner || showOnlyTenantAndInspector;
                    
                    return (
                      <div className={`grid gap-2 sm:gap-4 ${shouldHideOwnerAndAgency ? 'grid-cols-2' : 'grid-cols-2'}`}>
                        {/* Inquilino */}
                        <div
                          className={`p-2 sm:p-3 border rounded-lg text-center transition-all ${
                            inspectionDetail.tenantSignedAt
                              ? 'border-green-300 bg-green-50'
                              : canUserSign('tenant') && inspectionDetail.status !== 'APROVADA'
                              ? 'border-orange-300 bg-orange-50 cursor-pointer hover:border-orange-400 hover:shadow-sm'
                              : ''
                          }`}
                          onClick={() => {
                            if (!inspectionDetail.tenantSignedAt && canUserSign('tenant') && inspectionDetail.status !== 'APROVADA') {
                              openSignatureModal('tenant');
                            }
                          }}
                        >
                          {inspectionDetail.tenantSignature ? (
                            <img src={inspectionDetail.tenantSignature} alt="Assinatura Inquilino" className="h-10 sm:h-12 mx-auto object-contain" />
                          ) : (
                            <PenTool className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-muted-foreground" />
                          )}
                          <Label className="text-[10px] sm:text-xs text-muted-foreground">Inquilino</Label>
                          {inspectionDetail.tenantSignedAt ? (
                            <p className="text-[10px] sm:text-xs text-green-600">
                              <CheckCircle className="w-3 h-3 inline mr-1" />
                              Assinado
                            </p>
                          ) : canUserSign('tenant') && inspectionDetail.status !== 'APROVADA' ? (
                            <p className="text-[10px] sm:text-xs text-orange-600 font-medium">Clique para assinar</p>
                          ) : (
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Pendente</p>
                          )}
                        </div>

                        {/* Proprietário */}
                        {!shouldHideOwnerAndAgency && (
                          <div
                            className={`p-2 sm:p-3 border rounded-lg text-center transition-all ${
                              inspectionDetail.ownerSignedAt
                                ? 'border-green-300 bg-green-50'
                                : canUserSign('owner') && inspectionDetail.status !== 'APROVADA'
                                ? 'border-orange-300 bg-orange-50 cursor-pointer hover:border-orange-400 hover:shadow-sm'
                                : ''
                            }`}
                            onClick={() => {
                              if (!inspectionDetail.ownerSignedAt && canUserSign('owner') && inspectionDetail.status !== 'APROVADA') {
                                openSignatureModal('owner');
                              }
                            }}
                          >
                            {inspectionDetail.ownerSignature ? (
                              <img src={inspectionDetail.ownerSignature} alt="Assinatura Proprietário" className="h-10 sm:h-12 mx-auto object-contain" />
                            ) : (
                              <PenTool className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-muted-foreground" />
                            )}
                            <Label className="text-[10px] sm:text-xs text-muted-foreground">Proprietário</Label>
                            {inspectionDetail.ownerSignedAt ? (
                              <p className="text-[10px] sm:text-xs text-green-600">
                                <CheckCircle className="w-3 h-3 inline mr-1" />
                                Assinado
                              </p>
                            ) : canUserSign('owner') && inspectionDetail.status !== 'APROVADA' ? (
                              <p className="text-[10px] sm:text-xs text-orange-600 font-medium">Clique para assinar</p>
                            ) : (
                              <p className="text-[10px] sm:text-xs text-muted-foreground">Pendente</p>
                            )}
                          </div>
                        )}

                        {/* Agência */}
                        {!shouldHideOwnerAndAgency && (
                          <div
                            className={`p-2 sm:p-3 border rounded-lg text-center transition-all ${
                              inspectionDetail.agencySignedAt
                                ? 'border-green-300 bg-green-50'
                                : canUserSign('agency') && inspectionDetail.status !== 'APROVADA'
                                ? 'border-orange-300 bg-orange-50 cursor-pointer hover:border-orange-400 hover:shadow-sm'
                                : ''
                            }`}
                            onClick={() => {
                              if (!inspectionDetail.agencySignedAt && canUserSign('agency') && inspectionDetail.status !== 'APROVADA') {
                                openSignatureModal('agency');
                              }
                            }}
                          >
                            {inspectionDetail.agencySignature ? (
                              <img src={inspectionDetail.agencySignature} alt="Assinatura Agência" className="h-10 sm:h-12 mx-auto object-contain" />
                            ) : (
                              <PenTool className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-muted-foreground" />
                            )}
                            <Label className="text-[10px] sm:text-xs text-muted-foreground">Agência</Label>
                            {inspectionDetail.agencySignedAt ? (
                              <p className="text-[10px] sm:text-xs text-green-600">
                                <CheckCircle className="w-3 h-3 inline mr-1" />
                                Assinado
                              </p>
                            ) : canUserSign('agency') && inspectionDetail.status !== 'APROVADA' ? (
                              <p className="text-[10px] sm:text-xs text-orange-600 font-medium">Clique para assinar</p>
                            ) : (
                              <p className="text-[10px] sm:text-xs text-muted-foreground">Pendente</p>
                            )}
                          </div>
                        )}

                        {/* Vistoriador */}
                        <div
                          className={`p-2 sm:p-3 border rounded-lg text-center transition-all ${
                            inspectionDetail.inspectorSignedAt
                              ? 'border-green-300 bg-green-50'
                              : canUserSign('inspector') && inspectionDetail.status !== 'APROVADA'
                              ? 'border-orange-300 bg-orange-50 cursor-pointer hover:border-orange-400 hover:shadow-sm'
                              : ''
                          }`}
                          onClick={() => {
                            if (!inspectionDetail.inspectorSignedAt && canUserSign('inspector') && inspectionDetail.status !== 'APROVADA') {
                              openSignatureModal('inspector');
                            }
                          }}
                        >
                          {inspectionDetail.inspectorSignature ? (
                            <img src={inspectionDetail.inspectorSignature} alt="Assinatura Vistoriador" className="h-10 sm:h-12 mx-auto object-contain" />
                          ) : (
                            <PenTool className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-muted-foreground" />
                          )}
                          <Label className="text-[10px] sm:text-xs text-muted-foreground">Vistoriador</Label>
                          {inspectionDetail.inspectorSignedAt ? (
                            <p className="text-[10px] sm:text-xs text-green-600">
                              <CheckCircle className="w-3 h-3 inline mr-1" />
                              Assinado
                            </p>
                          ) : canUserSign('inspector') && inspectionDetail.status !== 'APROVADA' ? (
                            <p className="text-[10px] sm:text-xs text-orange-600 font-medium">Clique para assinar</p>
                          ) : (
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Pendente</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

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

                          {getDetailMediaForItem(index).length > 0 && (() => {
                            const itemImages = getDetailMediaForItem(index)
                              .filter(m => m.type === 'IMAGE')
                              .map(m => ({ url: getMediaUrl(m), name: m.originalName }));
                            return (
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
                                          onClick={() => openImagePreview(getMediaUrl(media), media.originalName, itemImages)}
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
                            );
                          })()}

                          {item.photos && item.photos.length > 0 && getDetailMediaForItem(index).length === 0 && (() => {
                            const itemPhotoUrls = item.photos!.map((photo: string, idx: number) => ({
                              url: photo.startsWith('http') ? photo : `${(import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '')}/uploads/${photo}`,
                              name: `Foto ${idx + 1} - ${item.item}`
                            }));
                            return (
                              <div className="pt-3 border-t">
                                <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                  <Image className="w-3 h-3" />
                                  Fotos ({item.photos!.length})
                                </Label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                  {item.photos!.map((photo: string, photoIndex: number) => {
                                    const url = photo.startsWith('http') ? photo : `${(import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '')}/uploads/${photo}`;
                                    return (
                                      <div key={photoIndex} className="relative group">
                                        <img
                                          src={url}
                                          alt={`Foto ${photoIndex + 1} - ${item.item}`}
                                          className="w-full h-24 object-cover rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() => openImagePreview(url, `Foto ${photoIndex + 1} - ${item.item}`, itemPhotoUrls)}
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                          }}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Signature Modal */}
        <Dialog open={showSignatureModal} onOpenChange={(open) => !open && closeSignatureModal()}>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-xl">
            <DialogHeader>
              <DialogTitle>Assinar Vistoria</DialogTitle>
              <DialogDescription>
                Assinatura como: <strong>{signatureType ? getSignerTypeLabel(signatureType) : ''}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
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
                  onClick={closeSignatureModal}
                  disabled={signing}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleSubmitSignature}
                  disabled={signing || !signature || !geoConsent || !geoLocation}
                >
                  {signing ? 'Assinando...' : 'Confirmar Assinatura'}
                </Button>
              </div>
            </div>
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

        {/* Send Error Modal */}
        <Dialog open={showSendErrorModal} onOpenChange={setShowSendErrorModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="w-5 h-5" />
                Erro ao Enviar
              </DialogTitle>
              <DialogDescription>
                Não é possível enviar a vistoria sem assinaturas
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <p className="font-medium mb-1">Assinatura necessária</p>
                  <p>Primeiro, clique no botão "Ver" (ícone de olho) e assine a vistoria antes de enviar.</p>
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
                disabled={deleteInspectionMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteInspectionMutation.isPending ? (
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

        {/* Image Preview Modal */}
        <Dialog open={!!previewImage} onOpenChange={() => closeImagePreview()}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto p-0 bg-black/95 border-none">
            <VisuallyHidden>
              <DialogTitle>Visualizar Imagem</DialogTitle>
              <DialogDescription>Visualização de imagem da vistoria</DialogDescription>
            </VisuallyHidden>
            <div className="relative flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-3 bg-black/50 text-white">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate max-w-[200px] sm:max-w-[400px]">
                    {previewImage?.name || 'Imagem'}
                  </span>
                  {previewImage && previewImage.allImages.length > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      {previewImage.currentIndex + 1} / {previewImage.allImages.length}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleZoom('out')}
                        disabled={previewZoom <= 0.5}
                        className="text-white hover:bg-white/20 h-8 w-8 p-0"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Diminuir zoom</TooltipContent>
                  </Tooltip>
                  <span className="text-xs text-white/70 w-12 text-center">{Math.round(previewZoom * 100)}%</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleZoom('in')}
                        disabled={previewZoom >= 3}
                        className="text-white hover:bg-white/20 h-8 w-8 p-0"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Aumentar zoom</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => previewImage && downloadImage(previewImage.url, previewImage.name)}
                        className="text-white hover:bg-white/20 h-8 w-8 p-0"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Baixar imagem</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={closeImagePreview}
                        className="text-white hover:bg-white/20 h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Fechar</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Image Container */}
              <div className="flex-1 flex items-center justify-center p-4 overflow-auto min-h-[300px] max-h-[80vh]">
                {previewImage && (
                  <img
                    src={previewImage.url}
                    alt={previewImage.name}
                    className="max-w-full max-h-full object-contain transition-transform duration-200"
                    style={{ transform: `scale(${previewZoom})` }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%23333" width="200" height="200"/><text fill="%23999" x="50%" y="50%" text-anchor="middle" dy=".3em">Erro ao carregar</text></svg>';
                    }}
                  />
                )}
              </div>

              {/* Navigation Arrows */}
              {previewImage && previewImage.allImages.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigatePreview('prev')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10 rounded-full bg-black/30"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigatePreview('next')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10 rounded-full bg-black/30"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </Button>
                </>
              )}

              {/* Thumbnail Strip */}
              {previewImage && previewImage.allImages.length > 1 && (
                <div className="flex gap-2 p-3 bg-black/50 overflow-x-auto justify-center">
                  {previewImage.allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setPreviewImage({ ...previewImage, url: img.url, name: img.name, currentIndex: idx });
                        setPreviewZoom(1);
                      }}
                      className={`flex-shrink-0 w-12 h-12 rounded border-2 overflow-hidden transition-all ${
                        idx === previewImage.currentIndex ? 'border-orange-500' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
