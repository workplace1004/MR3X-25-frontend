import { useQuery } from '@tanstack/react-query';
import { propertiesAPI, contractsAPI, inspectionsAPI, extrajudicialNotificationsAPI } from '../../api';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import {
  Building2,
  Eye,
  FileText,
  MoreHorizontal,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Grid3X3,
  Search,
  Download,
  Loader2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
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

export function TenantProperties() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [propertyDetail, setPropertyDetail] = useState<any>(null);
  const [propertyDetailLoading, setPropertyDetailLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [imageRefreshTrigger, setImageRefreshTrigger] = useState(0);

  const handleSearch = useCallback(() => {
    const trimmedSearch = searchTerm.trim();
    setSearchQuery(trimmedSearch);
  }, [searchTerm]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchQuery('');
  }, []);

  const { data: properties, isLoading } = useQuery({
    queryKey: ['tenant-properties', user?.id, searchQuery],
    queryFn: async () => {
      const allProperties = await propertiesAPI.getProperties(searchQuery ? { search: searchQuery } : undefined);
      const propertiesArray = Array.isArray(allProperties) ? allProperties : (allProperties?.data || []);
      // Filter to show only properties linked to this tenant
      return propertiesArray.filter((p: any) => 
        p.tenantId === user?.id || String(p.tenantId) === String(user?.id)
      );
    },
    enabled: !!user?.id,
    staleTime: 30000,
    refetchOnMount: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
  });

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
      case 'RENTED':
        return <Badge className="bg-green-500 text-white">Alugado</Badge>;
      case 'DISPONIVEL':
      case 'AVAILABLE':
        return <Badge className="bg-blue-500 text-white">Disponível</Badge>;
      case 'INCOMPLETO':
        return <Badge className="bg-orange-500 text-white">Incompleto</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Status desconhecido'}</Badge>;
    }
  };

  const PropertyImage = ({ propertyId, propertyName }: { propertyId: string, propertyName?: string }) => {
    const [errored, setErrored] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      setErrored(false);
      setLoading(true);
    }, [propertyId, imageRefreshTrigger]);

    // Use public endpoint directly - it returns primary image if no imageId is specified
    const imageUrl = `${API_URL}/properties/${propertyId}/image/public?t=${imageRefreshTrigger}&_=${Date.now()}`;

    if (errored) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <ImageIcon className="w-12 h-12 text-gray-400" />
        </div>
      );
    }

    return (
      <div className="w-full h-full relative bg-gray-100">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        )}
        <img
          src={imageUrl}
          alt={propertyName || 'Imóvel'}
          className="w-full h-full object-contain bg-gray-50"
          onLoad={() => setLoading(false)}
          onError={() => {
            setErrored(true);
            setLoading(false);
          }}
          style={{ display: loading ? 'none' : 'block' }}
        />
      </div>
    );
  };

  const PropertyImagesCarousel = ({ propertyId, propertyName, refreshTrigger }: { propertyId: string, propertyName?: string, refreshTrigger?: number }) => {
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [errored, setErrored] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
      const fetchImages = async () => {
        try {
          setLoading(true);
          setErrored(false);
          
          // For INQUILINO role or if user is not loaded yet, skip API call and use public endpoint directly
          // Since this is TenantProperties page, we know the user is INQUILINO
          if (!user || user?.role === 'INQUILINO') {
            // Use public endpoint - it will return primary image
            setImages([{ id: 'primary', isPrimary: true }]);
            setLoading(false);
            return;
          }

          // For other roles, try to get images list
          try {
            const data = await propertiesAPI.getPropertyImages(propertyId);
            setImages(Array.isArray(data) ? data : []);
          } catch (err: any) {
            // If 403 or permission error, use public endpoint for primary image only
            if (err?.response?.status === 403 || err?.response?.status === 401) {
              // Use public endpoint - it will return primary image
              setImages([{ id: 'primary', isPrimary: true }]);
            } else {
              // For other errors, log but don't set errored to true yet
              console.error('Error loading images:', err);
              setImages([]);
            }
          }
        } catch (err) {
          console.error('Error loading images:', err);
          setImages([]);
          setErrored(true);
        } finally {
          setLoading(false);
        }
      };

      if (propertyId) {
        fetchImages();
      }
    }, [propertyId, refreshTrigger, user?.role]);

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

    if (images.length === 0 || errored) {
      return (
        <div className="w-full h-64 bg-gray-100 rounded-md flex items-center justify-center">
          <div className="text-center">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Nenhuma imagem disponível</p>
          </div>
        </div>
      );
    }

    // For public endpoint, if we only have the primary placeholder, use it without imageId
    const currentImage = images[currentIndex];
    const imageUrl = currentImage.id === 'primary' 
      ? `${API_URL}/properties/${propertyId}/image/public?t=${refreshTrigger || Date.now()}`
      : `${API_URL}/properties/${propertyId}/image/public?imageId=${currentImage.id}&t=${refreshTrigger || Date.now()}`;

    return (
      <div className="relative w-full">
        <div className="relative w-full h-64 bg-gray-100 rounded-md overflow-hidden">
          <img
            src={imageUrl}
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
            {images.map((image, index) => {
              const thumbnailUrl = image.id === 'primary'
                ? `${API_URL}/properties/${propertyId}/image/public?t=${refreshTrigger || Date.now()}`
                : `${API_URL}/properties/${propertyId}/image/public?imageId=${image.id}&t=${refreshTrigger || Date.now()}`;
              return (
                <button
                  key={image.id || index}
                  type="button"
                  className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${index === currentIndex ? 'border-blue-500' : 'border-gray-200'
                    }`}
                  onClick={() => setCurrentIndex(index)}
                >
                  <img
                    src={thumbnailUrl}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-contain bg-gray-50"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const handleViewProperty = async (property: any) => {
    setSelectedProperty(property);
    setPropertyDetailLoading(true);
    setPropertyDetail(null);
    setShowDetailModal(true);

    try {
      const freshProperty = await propertiesAPI.getPropertyById(property.id);
      setPropertyDetail(freshProperty);
      setImageRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error loading property details:', error);
      setPropertyDetail(property);
    } finally {
      setPropertyDetailLoading(false);
    }
  };

  const handleViewDocuments = async (property: any) => {
    setSelectedProperty(property);
    setDocumentsLoading(true);
    setShowDocumentsModal(true);
    setDocuments([]);

    try {
      const [contracts, inspections, notificationsResponse] = await Promise.all([
        contractsAPI.getContracts().then(contracts => 
          Array.isArray(contracts) ? contracts.filter((c: any) => c.propertyId === property.id || c.property?.id === property.id) : []
        ).catch(() => []),
        inspectionsAPI.getInspections({ propertyId: property.id }).then(result => 
          Array.isArray(result) ? result : (result?.data || result?.items || [])
        ).catch(() => []),
        extrajudicialNotificationsAPI.getNotifications({ propertyId: property.id }).then(result => {
          if (Array.isArray(result)) return result;
          if (result?.data && Array.isArray(result.data)) return result.data;
          if (result?.items && Array.isArray(result.items)) return result.items;
          return [];
        }).catch(() => []),
      ]);

      const contractsArray = Array.isArray(contracts) ? contracts : [];
      const inspectionsArray = Array.isArray(inspections) ? inspections : [];
      const notificationsArray = Array.isArray(notificationsResponse) ? notificationsResponse : [];

      const allDocuments = [
        ...contractsArray.map((c: any) => ({
          id: c.id,
          name: `Contrato - ${c.property?.name || property.name || 'Imóvel'}`,
          type: 'CONTRACT',
          date: c.createdAt || c.contractDate,
          pdfUrl: c.provisionalPdfUrl || c.finalPdfUrl,
        })),
        ...inspectionsArray.map((i: any) => ({
          id: i.id,
          name: `Vistoria - ${i.property?.name || property.name || 'Imóvel'}`,
          type: 'INSPECTION',
          date: i.createdAt || i.inspectionDate,
          pdfUrl: i.pdfUrl,
        })),
        ...notificationsArray.map((n: any) => ({
          id: n.id,
          name: `Notificação Extrajudicial - ${n.property?.name || property.name || 'Imóvel'}`,
          type: 'NOTIFICATION',
          date: n.createdAt || n.notificationDate,
          pdfUrl: n.pdfUrl,
        })),
      ];

      setDocuments(allDocuments);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Erro ao carregar documentos');
    } finally {
      setDocumentsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Building2 className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Meus Imóveis</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gerencie todos os seus imóveis em um só lugar
            </p>
          </div>
        </div>

        <div className="flex justify-center w-full">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-6 w-full max-w-7xl px-2">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="w-[400px] mx-auto">
                <CardContent className="p-0">
                  <div className="flex h-full">
                    <Skeleton className="w-40 h-full" />
                    <div className="flex-1 p-4 space-y-2">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
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
              <h1 className="text-2xl sm:text-3xl font-bold">Meus Imóveis</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Visualize os imóveis vinculados aos seus contratos
              </p>
            </div>
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
                      <div className="w-40 min-w-40 h-full bg-gray-100 flex items-center justify-center rounded-l-md overflow-hidden">
                        <PropertyImage propertyId={property.id} propertyName={property.name} />
                      </div>
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
                            {getStatusBadge(property.status || 'PENDENTE')}
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
                              <DropdownMenuItem onClick={() => handleViewDocuments(property)}>
                                <FileText className="w-4 h-4 mr-2" />
                                Ver documentos
                              </DropdownMenuItem>
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
                <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhum imóvel encontrado</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {searchQuery ? 'Nenhum imóvel corresponde à sua pesquisa.' : 'Você não possui imóveis vinculados ao seu contrato no momento.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Detail Modal */}
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
                        {getStatusBadge(propertyDetail.status || 'PENDENTE')}
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
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Corretor</label>
                      <div className="text-base">{propertyDetail.broker?.name || propertyDetail.broker?.email || '-'}</div>
                    </div>
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
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Não foi possível carregar os detalhes do imóvel.
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Documents Modal */}
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
                              </div>
                            </div>
                          </div>
                          {doc.pdfUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(doc.pdfUrl, '_blank')}
                              className="flex-shrink-0"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Baixar
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum documento disponível para este imóvel.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Não foi possível carregar os documentos.
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
