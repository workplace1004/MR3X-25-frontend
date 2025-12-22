import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { extrajudicialNotificationsAPI, propertiesAPI, usersAPI, profileAPI } from '@/api';
import { useAuth } from '@/contexts/AuthContext';
import { safeGetCurrentPosition, isSecureOrigin } from '@/hooks/use-geolocation';
import { SignatureCapture } from '@/components/contracts/SignatureCapture';
import {
  Plus,
  Search,
  Download,
  Printer,
  Eye,
  Trash2,
  Send,
  CheckCircle,
  Gavel,
  Loader2,
  PenTool,
  AlertCircle,
  User,
} from 'lucide-react';

interface Notification {
  id: string;
  notificationToken: string;
  notificationNumber: string;
  protocolNumber: string;
  type: string;
  status: string;
  priority: string;
  principalAmount?: string | null;
  fineAmount?: string | null;
  interestAmount?: string | null;
  correctionAmount?: string | null;
  lawyerFees?: string | null;
  creditorId: string;
  creditorName: string;
  creditorDocument: string;
  creditorAddress?: string;
  creditorEmail?: string;
  creditorPhone?: string;
  debtorId: string;
  debtorName: string;
  debtorDocument: string;
  debtorEmail?: string;
  debtorAddress?: string;
  debtorPhone?: string;
  title: string;
  subject: string;
  description: string;
  legalBasis: string;
  demandedAction: string;
  totalAmount: string | number;
  deadlineDate: string;
  deadlineDays: number;
  gracePeriodDays?: number | null;
  consequencesText?: string | null;
  property?: {
    id: string;
    address: string;
    city: string;
  };
  creditorSignedAt?: string;
  debtorSignedAt?: string;
  creditorSignature?: string;
  debtorSignature?: string;
  sentAt?: string;
  viewedAt?: string;
  responseAt?: string;
  resolvedAt?: string;
  createdAt: string;
  userRole?: 'CREDITOR' | 'DEBTOR' | 'VIEWER';
}

const typeOptions = [
  { value: 'COBRANCA_ALUGUEL', label: 'Cobranca de Aluguel' },
  { value: 'COBRANCA_CONDOMINIO', label: 'Cobranca de Condominio' },
  { value: 'COBRANCA_IPTU', label: 'Cobranca de IPTU' },
  { value: 'COBRANCA_MULTAS', label: 'Cobranca de Multas' },
  { value: 'COBRANCA_DANOS', label: 'Cobranca de Danos' },
  { value: 'RESCISAO_CONTRATO', label: 'Rescisao de Contrato' },
  { value: 'DESOCUPACAO', label: 'Desocupacao' },
  { value: 'DIVERGENCIA_VISTORIA', label: 'Divergencia de Vistoria' },
  { value: 'OUTROS', label: 'Outros' },
];

const statusOptions = [
  { value: 'RASCUNHO', label: 'Rascunho', color: 'bg-gray-500' },
  { value: 'GERADO', label: 'Gerado', color: 'bg-blue-400' },
  { value: 'AGUARDANDO_ENVIO', label: 'Aguardando Envio', color: 'bg-yellow-500' },
  { value: 'ENVIADO', label: 'Enviado', color: 'bg-blue-500' },
  { value: 'VISUALIZADO', label: 'Visualizado', color: 'bg-indigo-500' },
  { value: 'RESPONDIDO', label: 'Respondido', color: 'bg-purple-500' },
  { value: 'RESOLVIDO', label: 'Resolvido', color: 'bg-green-500' },
  { value: 'REJEITADO', label: 'Rejeitado', color: 'bg-red-500' },
  { value: 'PRAZO_EXPIRADO', label: 'Prazo Expirado', color: 'bg-orange-500' },
  { value: 'ENCAMINHADO_JUDICIAL', label: 'Encaminhado ao Judicial', color: 'bg-red-700' },
  { value: 'CANCELADO', label: 'Cancelado', color: 'bg-gray-700' },
];

const priorityOptions = [
  { value: 'URGENT', label: 'Urgente', color: 'bg-red-500' },
  { value: 'HIGH', label: 'Alta', color: 'bg-orange-500' },
  { value: 'NORMAL', label: 'Normal', color: 'bg-blue-500' },
  { value: 'LOW', label: 'Baixa', color: 'bg-gray-500' },
];

const getStatusBadge = (status: string) => {
  const statusConfig = statusOptions.find(s => s.value === status) || { label: status, color: 'bg-gray-500' };
  return <Badge className={`${statusConfig.color} text-white`}>{statusConfig.label}</Badge>;
};

const getPriorityBadge = (priority: string) => {
  const priorityConfig = priorityOptions.find(p => p.value === priority) || { label: priority, color: 'bg-gray-500' };
  return <Badge variant="outline" className={`${priorityConfig.color} text-white border-0`}>{priorityConfig.label}</Badge>;
};

const formatCurrency = (value: string | number | null | undefined) => {
  if (!value) return 'R$ 0,00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

const formatDate = (date: string | null | undefined) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
};

const formatDateTime = (date: string | null | undefined) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('pt-BR');
};

export default function ExtrajudicialNotifications() {
  const { user } = useAuth();
  const isInquilino = user?.role === 'INQUILINO';
  const isProprietario = user?.role === 'PROPRIETARIO';
  const isIndependentOwner = user?.role === 'INDEPENDENT_OWNER';
  const showUserRoleColumn = user?.role !== 'AGENCY_ADMIN';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, _setStatusFilter] = useState<string>('');
  const [typeFilter, _setTypeFilter] = useState<string>('');

  void _setStatusFilter;
  void _setTypeFilter;
  const [statistics, setStatistics] = useState<any>(null);

  const handleSearch = useCallback(() => {
    setSearchQuery(searchTerm.trim());
  }, [searchTerm]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchQuery('');
  }, []);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showJudicialModal, setShowJudicialModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSendErrorModal, setShowSendErrorModal] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);

  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    propertyId: '',
    type: 'COBRANCA_ALUGUEL',
    priority: 'NORMAL',
    creditorId: '',
    creditorName: '',
    creditorDocument: '',
    creditorEmail: '',
    creditorPhone: '',
    creditorAddress: '',
    debtorId: '',
    debtorName: '',
    debtorDocument: '',
    debtorEmail: '',
    debtorPhone: '',
    debtorAddress: '',
    title: '',
    subject: 'Esta notificacao extrajudicial tem por finalidade comunicar o(a) notificado(a) sobre a existencia de debito decorrente de obrigacao contratual assumida entre as partes, solicitando o pagamento integral do valor devido dentro do prazo estipulado no documento.',
    description: '',
    legalBasis: 'A presente notificacao funda-se nos arts. 389, 394, 395 e 397 do Codigo Civil, que estabelecem a responsabilidade pelo inadimplemento e a mora do devedor, bem como o dever de pagar juros, correcao, multa e demais encargos previstos contratualmente.',
    demandedAction: '',
    principalAmount: '',
    fineAmount: '',
    interestAmount: '',
    correctionAmount: '',
    lawyerFees: '',
    totalAmount: '',
    deadlineDays: '15',
    gracePeriodDays: '',
    consequencesText: 'O nao pagamento no prazo indicado caracterizara mora, autorizando a adocao das medidas legais cabiveis, incluindo cobranca judicial, protesto, negativacao e, quando aplicavel, propositura de acao de despejo, sem prejuizo dos encargos previstos no contrato.',
    notes: '',
  });

  const [signature, setSignature] = useState<string | null>(null);
  const [geoConsent, setGeoConsent] = useState(false);
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [signing, setSigning] = useState(false);

  const [judicialData, setJudicialData] = useState({
    judicialProcessNumber: '',
    judicialCourt: '',
    judicialNotes: '',
  });

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter]);

  // Auto-fill creditorId when modal opens for INDEPENDENT_OWNER
  useEffect(() => {
    if (showCreateModal && isIndependentOwner && user?.id) {
      // Fetch profile data using the same API as MyAccount page
      profileAPI.getProfile()
        .then((profileData) => {
          console.log('Profile data fetched:', profileData);
          setFormData(prev => {
            const newData = {
              ...prev,
              creditorId: user.id,
              creditorName: profileData.name || user.name || prev.creditorName || '',
              creditorDocument: profileData.document || prev.creditorDocument || '',
              creditorEmail: profileData.email || user.email || prev.creditorEmail || '',
              creditorPhone: profileData.phone || prev.creditorPhone || '',
            };
            console.log('Form data updated:', newData);
            return newData;
          });
        })
        .catch((error) => {
          console.error('Error fetching profile data:', error);
          // Fallback to owners list
          const currentOwner = owners.find((o: any) => {
            return String(o.id) === String(user.id) || o.id === user.id;
          });
          setFormData(prev => ({
            ...prev,
            creditorId: user.id,
            creditorName: currentOwner?.name || user.name || prev.creditorName || '',
            creditorDocument: currentOwner?.document || prev.creditorDocument || '',
            creditorEmail: currentOwner?.email || user.email || prev.creditorEmail || '',
            creditorPhone: currentOwner?.phone || prev.creditorPhone || '',
          }));
        });
    } else if (showCreateModal && !isIndependentOwner) {
      // Reset form when modal opens for non-independent owners
      setFormData(prev => ({
        ...prev,
        creditorId: '',
        creditorName: '',
        creditorDocument: '',
        creditorEmail: '',
        creditorPhone: '',
      }));
    }
  }, [showCreateModal, isIndependentOwner, user, owners]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (isInquilino) {
        const [notificationsRes, statsRes] = await Promise.all([
          extrajudicialNotificationsAPI.getNotifications({
            status: statusFilter || undefined,
            type: typeFilter || undefined,
          }),
          extrajudicialNotificationsAPI.getStatistics(),
        ]);

        const notificationsData = Array.isArray(notificationsRes.data) ? notificationsRes.data : (notificationsRes.data?.data || notificationsRes.data || []);
        // Ensure userRole is set for each notification
        const notificationsWithRole = notificationsData.map((n: Notification) => {
          if (!n.userRole && user?.id) {
            // If userRole is not set, determine it based on the logged-in user
            if (n.creditorId === user.id || String(n.creditorId) === String(user.id)) {
              return { ...n, userRole: 'CREDITOR' as const };
            } else if (n.debtorId === user.id || String(n.debtorId) === String(user.id)) {
              return { ...n, userRole: 'DEBTOR' as const };
            }
          }
          return n;
        });
        setNotifications(notificationsWithRole);
        setStatistics(statsRes);
      } else {
        const [notificationsRes, statsRes, propsRes, usersRes, tenantsRes] = await Promise.all([
          extrajudicialNotificationsAPI.getNotifications({
            status: statusFilter || undefined,
            type: typeFilter || undefined,
          }),
          extrajudicialNotificationsAPI.getStatistics(),
          propertiesAPI.getProperties(),
          usersAPI.listUsers({ pageSize: 100 }),
          usersAPI.getTenants(),
        ]);

        const notificationsData = Array.isArray(notificationsRes.data) ? notificationsRes.data : (notificationsRes.data?.data || notificationsRes.data || []);
        // Ensure userRole is set for each notification
        const notificationsWithRole = notificationsData.map((n: Notification) => {
          if (!n.userRole && user?.id) {
            // If userRole is not set, determine it based on the logged-in user
            if (n.creditorId === user.id || String(n.creditorId) === String(user.id)) {
              return { ...n, userRole: 'CREDITOR' as const };
            } else if (n.debtorId === user.id || String(n.debtorId) === String(user.id)) {
              return { ...n, userRole: 'DEBTOR' as const };
            }
          }
          return n;
        });
        setNotifications(notificationsWithRole);
        setStatistics(statsRes);
        setProperties(propsRes || []);
        setTenants(tenantsRes || []);

        const ownerRoles = ['PROPRIETARIO', 'INDEPENDENT_OWNER'];
        const filteredOwners = (usersRes.items || []).filter((u: any) => ownerRoles.includes(u.role));
        setOwners(filteredOwners);
        
        // If modal is open and user is INDEPENDENT_OWNER, update form data with profile API
        if (showCreateModal && isIndependentOwner && user?.id) {
          profileAPI.getProfile()
            .then((profileData) => {
              setFormData(prev => ({
                ...prev,
                creditorId: user.id,
                creditorName: profileData.name || user.name || prev.creditorName || '',
                creditorDocument: profileData.document || prev.creditorDocument || '',
                creditorEmail: profileData.email || user.email || prev.creditorEmail || '',
                creditorPhone: profileData.phone || prev.creditorPhone || '',
              }));
            })
            .catch((error) => {
              console.error('Error fetching profile data in loadData:', error);
              // Fallback to owners list
              const currentOwner = filteredOwners.find((o: any) => {
                return String(o.id) === String(user.id) || o.id === user.id;
              });
              if (currentOwner) {
                setFormData(prev => ({
                  ...prev,
                  creditorId: user.id,
                  creditorName: currentOwner.name || user.name || prev.creditorName || '',
                  creditorDocument: currentOwner.document || prev.creditorDocument || '',
                  creditorEmail: currentOwner.email || user.email || prev.creditorEmail || '',
                  creditorPhone: currentOwner.phone || prev.creditorPhone || '',
                }));
              }
            });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const requiredFields = [
      { field: 'propertyId', label: 'Imovel' },
      { field: 'creditorId', label: 'ID do Credor' },
      { field: 'creditorName', label: 'Nome do Credor' },
      { field: 'creditorDocument', label: 'Documento do Credor' },
      { field: 'debtorId', label: 'ID do Devedor' },
      { field: 'debtorName', label: 'Nome do Devedor' },
      { field: 'debtorDocument', label: 'Documento do Devedor' },
      { field: 'title', label: 'Titulo' },
      { field: 'subject', label: 'Assunto' },
      { field: 'description', label: 'Descricao' },
      { field: 'legalBasis', label: 'Fundamento Legal' },
      { field: 'demandedAction', label: 'Acao Demandada' },
      { field: 'totalAmount', label: 'Valor Total' },
      { field: 'deadlineDays', label: 'Prazo em Dias' },
    ];

    const missingFields = requiredFields.filter(
      ({ field }) => !formData[field as keyof typeof formData]
    );

    if (missingFields.length > 0) {
      toast.error(`Campos obrigatorios: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    try {
      setSaving(true);
      await extrajudicialNotificationsAPI.createNotification({
        ...formData,
        principalAmount: formData.principalAmount ? parseFloat(formData.principalAmount) : undefined,
        fineAmount: formData.fineAmount ? parseFloat(formData.fineAmount) : undefined,
        interestAmount: formData.interestAmount ? parseFloat(formData.interestAmount) : undefined,
        correctionAmount: formData.correctionAmount ? parseFloat(formData.correctionAmount) : undefined,
        lawyerFees: formData.lawyerFees ? parseFloat(formData.lawyerFees) : undefined,
        totalAmount: parseFloat(formData.totalAmount) || 0,
        deadlineDays: parseInt(formData.deadlineDays) || 15,
        gracePeriodDays: formData.gracePeriodDays ? parseInt(formData.gracePeriodDays) : undefined,
      });
      toast.success('Notificacao criada com sucesso!');
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error creating notification:', error);
      const message = error?.response?.data?.message;
      if (Array.isArray(message)) {
        toast.error(`Erros de validacao: ${message.join(', ')}`);
      } else if (message) {
        toast.error(`Erro: ${message}`);
      } else {
        toast.error('Erro ao criar notificacao. Verifique os campos e tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (id: string) => {
    // Check if notification has at least one signature before sending (for INDEPENDENT_OWNER)
    if (isIndependentOwner) {
      const notification = notifications.find(n => n.id === id);
      if (notification) {
        const hasAnySignature = 
          notification.creditorSignedAt || 
          notification.debtorSignedAt;
        
        if (!hasAnySignature) {
          setShowSendErrorModal(true);
          return;
        }
      }
    }
    
    try {
      await extrajudicialNotificationsAPI.sendNotification(id, 'EMAIL');
      toast.success('Notificacao enviada com sucesso!');
      loadData();
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Erro ao enviar notificacao');
    }
  };

  const openSignatureModal = (notification: Notification) => {
    setSelectedNotification(notification);
    setSignature(null);
    setGeoConsent(false);
    setGeoLocation(null);
    setShowSignModal(true);
  };

  const closeSignatureModal = () => {
    setShowSignModal(false);
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
    if (!selectedNotification || !signature) {
      toast.error('Por favor, desenhe sua assinatura');
      return;
    }

    if (!geoConsent || !geoLocation) {
      toast.error('Por favor, autorize o compartilhamento da localização');
      return;
    }

    if (!selectedNotification.userRole || selectedNotification.userRole === 'VIEWER') {
      toast.error('Voce nao tem permissao para assinar esta notificacao');
      return;
    }

    setSigning(true);
    try {
      const signatureField = selectedNotification.userRole === 'CREDITOR' ? 'creditorSignature' : 'debtorSignature';

      await extrajudicialNotificationsAPI.signNotification(selectedNotification.id, {
        [signatureField]: signature,
        geoLat: geoLocation.lat,
        geoLng: geoLocation.lng,
      });

      toast.success('Assinatura registrada com sucesso!');
      closeSignatureModal();
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao registrar assinatura');
    } finally {
      setSigning(false);
    }
  };

  const getSignerTypeLabel = (): string => {
    if (!selectedNotification?.userRole) return '';
    return selectedNotification.userRole === 'CREDITOR' ? 'Credor' : 'Devedor';
  };

  const handleForwardToJudicial = async () => {
    if (!selectedNotification) return;

    try {
      setSaving(true);
      await extrajudicialNotificationsAPI.forwardToJudicial(selectedNotification.id, judicialData);
      toast.success('Notificacao encaminhada ao judicial com sucesso!');
      setShowJudicialModal(false);
      loadData();
    } catch (error) {
      console.error('Error forwarding to judicial:', error);
      toast.error('Erro ao encaminhar ao judicial');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setNotificationToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!notificationToDelete) return;

    try {
      await extrajudicialNotificationsAPI.deleteNotification(notificationToDelete);
      toast.success('Notificacao excluida com sucesso!');
      setShowDeleteModal(false);
      setNotificationToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Erro ao excluir notificacao');
    }
  };

  const handlePrintPdf = async (id: string, type: 'provisional' | 'final') => {
    try {
      const blob = type === 'provisional'
        ? await extrajudicialNotificationsAPI.downloadProvisionalPdf(id)
        : await extrajudicialNotificationsAPI.downloadFinalPdf(id);

      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url);

      if (printWindow) {
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
      }
    } catch (error) {
      console.error('Error printing PDF:', error);
      toast.error('Erro ao gerar PDF para impressao');
    }
  };

  const handleDownloadPdf = async (id: string, type: 'provisional' | 'final') => {
    try {
      const blob = type === 'provisional'
        ? await extrajudicialNotificationsAPI.downloadProvisionalPdf(id)
        : await extrajudicialNotificationsAPI.downloadFinalPdf(id);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notificacao-extrajudicial-${type}-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Erro ao baixar PDF');
    }
  };

  const handleViewNotification = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowDetailsModal(true);
  };

  const resetForm = () => {
    setFormData({
      propertyId: '',
      type: 'COBRANCA_ALUGUEL',
      priority: 'NORMAL',
      creditorId: '',
      creditorName: '',
      creditorDocument: '',
      creditorEmail: '',
      creditorPhone: '',
      creditorAddress: '',
      debtorId: '',
      debtorName: '',
      debtorDocument: '',
      debtorEmail: '',
      debtorPhone: '',
      debtorAddress: '',
      title: '',
      subject: 'Esta notificacao extrajudicial tem por finalidade comunicar o(a) notificado(a) sobre a existencia de debito decorrente de obrigacao contratual assumida entre as partes, solicitando o pagamento integral do valor devido dentro do prazo estipulado no documento.',
      description: '',
      legalBasis: 'A presente notificacao funda-se nos arts. 389, 394, 395 e 397 do Codigo Civil, que estabelecem a responsabilidade pelo inadimplemento e a mora do devedor, bem como o dever de pagar juros, correcao, multa e demais encargos previstos contratualmente.',
      demandedAction: '',
      principalAmount: '',
      fineAmount: '',
      interestAmount: '',
      correctionAmount: '',
      lawyerFees: '',
      totalAmount: '',
      deadlineDays: '15',
      gracePeriodDays: '',
      consequencesText: 'O nao pagamento no prazo indicado caracterizara mora, autorizando a adocao das medidas legais cabiveis, incluindo cobranca judicial, protesto, negativacao e, quando aplicavel, propositura de acao de despejo, sem prejuizo dos encargos previstos no contrato.',
      notes: '',
    });
  };

  const filteredNotifications = notifications.filter(n => {
    if (searchQuery && searchQuery.trim()) {
      const search = searchQuery.toLowerCase().trim();
      
      // Convert all values to strings and handle null/undefined
      const safeString = (val: any): string => {
        if (val === null || val === undefined) return '';
        return String(val).toLowerCase();
      };
      
      // Search in all relevant fields
      return (
        safeString(n.notificationNumber).includes(search) ||
        safeString(n.protocolNumber).includes(search) ||
        safeString(n.notificationToken).includes(search) ||
        safeString(n.creditorName).includes(search) ||
        safeString(n.creditorDocument).includes(search) ||
        safeString(n.creditorEmail).includes(search) ||
        safeString(n.debtorName).includes(search) ||
        safeString(n.debtorDocument).includes(search) ||
        safeString(n.debtorEmail).includes(search) ||
        safeString(n.title).includes(search) ||
        safeString(n.subject).includes(search) ||
        safeString(n.description).includes(search) ||
        safeString(n.type).includes(search) ||
        safeString(n.property?.address).includes(search) ||
        safeString(n.property?.city).includes(search)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 rounded-lg">
            <Gavel className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              Notificacoes Extrajudiciais
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gerencie notificacoes extrajudiciais com valor juridico
            </p>
          </div>
        </div>
        {(!isInquilino && !isProprietario) || isIndependentOwner ? (
          <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nova Notificacao
          </Button>
        ) : null}
      </div>

      {statistics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
          <Card className="bg-gray-50">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold">{statistics.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-yellow-600">{(statistics.draft || 0) + (statistics.generated || 0)}</div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{(statistics.sent || 0) + (statistics.viewed || 0)}</div>
              <div className="text-xs text-muted-foreground">Em Andamento</div>
            </CardContent>
          </Card>
          <Card className="bg-green-50">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{statistics.resolved || 0}</div>
              <div className="text-xs text-muted-foreground">Resolvidas</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 col-span-2 sm:col-span-1">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-red-600">{(statistics.expired || 0) + (statistics.judicial || 0)}</div>
              <div className="text-xs text-muted-foreground">Criticas</div>
            </CardContent>
          </Card>
        </div>
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
              placeholder="Pesquisar por número, credor ou devedor"
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

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Notificacoes</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              Nenhuma notificacao encontrada
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {filteredNotifications.map(n => (
                  <Card key={n.id} className="border shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-mono text-xs text-muted-foreground">{n.notificationNumber}</p>
                          <p className="font-medium text-sm">Credor: {n.creditorName}</p>
                          <p className="font-medium text-sm">Devedor: {n.debtorName}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(n.status)}
                          {n.userRole === 'CREDITOR' && (
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                              Credor {n.creditorSignedAt && <CheckCircle className="h-3 w-3 ml-1 inline" />}
                            </Badge>
                          )}
                          {n.userRole === 'DEBTOR' && (
                            <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                              Devedor {n.debtorSignedAt && <CheckCircle className="h-3 w-3 ml-1 inline" />}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div>
                          <span className="text-muted-foreground">Tipo:</span>
                          <p className="font-medium">{typeOptions.find(t => t.value === n.type)?.label || n.type}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Valor:</span>
                          <p className="font-medium font-mono">{formatCurrency(n.totalAmount)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Prazo:</span>
                          <p className="font-medium">{formatDate(n.deadlineDate)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Prioridade:</span>
                          <div>{getPriorityBadge(n.priority)}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-1 border-t pt-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewNotification(n)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {n.status === 'RASCUNHO' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSend(n.id)}>
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(n.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                        {(['ENVIADO', 'VISUALIZADO', 'RASCUNHO'].includes(n.status)) &&
                         n.userRole && n.userRole !== 'VIEWER' &&
                         !((n.userRole === 'CREDITOR' && n.creditorSignedAt) || (n.userRole === 'DEBTOR' && n.debtorSignedAt)) && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openSignatureModal(n)}>
                            <PenTool className="h-4 w-4" />
                          </Button>
                        )}
                        {n.status === 'PRAZO_EXPIRADO' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedNotification(n); setShowJudicialModal(true); }}>
                            <Gavel className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadPdf(n.id, n.status === 'RASCUNHO' ? 'provisional' : 'final')}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prioridade</TableHead>
                  {showUserRoleColumn && <TableHead>Seu Papel</TableHead>}
                      <TableHead>Credor</TableHead>
                      <TableHead>Devedor</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotifications.map(n => (
                      <TableRow key={n.id}>
                        <TableCell className="font-mono text-sm">
                          {n.notificationNumber}
                        </TableCell>
                        <TableCell>
                          {typeOptions.find(t => t.value === n.type)?.label || n.type}
                        </TableCell>
                        <TableCell>{getStatusBadge(n.status)}</TableCell>
                        <TableCell>{getPriorityBadge(n.priority)}</TableCell>
                        {showUserRoleColumn && (
                          <TableCell>
                            {n.userRole === 'CREDITOR' && (
                              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                                Credor
                                {n.creditorSignedAt && <CheckCircle className="h-3 w-3 ml-1 inline" />}
                              </Badge>
                            )}
                            {n.userRole === 'DEBTOR' && (
                              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                                Devedor
                                {n.debtorSignedAt && <CheckCircle className="h-3 w-3 ml-1 inline" />}
                              </Badge>
                            )}
                            {n.userRole === 'VIEWER' && (
                              <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                                Visualizador
                              </Badge>
                            )}
                            {!n.userRole && (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="font-medium">{n.creditorName}</div>
                          <div className="text-xs text-muted-foreground">{n.creditorDocument}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{n.debtorName}</div>
                          <div className="text-xs text-muted-foreground">{n.debtorDocument}</div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatCurrency(n.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <div>{formatDate(n.deadlineDate)}</div>
                          <div className="text-xs text-muted-foreground">{n.deadlineDays} dias</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewNotification(n)}
                              title="Ver Detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {n.status === 'RASCUNHO' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSend(n.id)}
                                  title="Enviar"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteClick(n.id)}
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}

                            {(['ENVIADO', 'VISUALIZADO', 'RASCUNHO'].includes(n.status)) &&
                             n.userRole &&
                             n.userRole !== 'VIEWER' &&
                             !((n.userRole === 'CREDITOR' && n.creditorSignedAt) ||
                               (n.userRole === 'DEBTOR' && n.debtorSignedAt)) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openSignatureModal(n)}
                                title={`Assinar como ${n.userRole === 'CREDITOR' ? 'Credor' : 'Devedor'}`}
                              >
                                <PenTool className="h-4 w-4" />
                              </Button>
                            )}

                            {n.status === 'PRAZO_EXPIRADO' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedNotification(n);
                                  setShowJudicialModal(true);
                                }}
                                title="Encaminhar ao Judicial"
                              >
                                <Gavel className="h-4 w-4 text-red-500" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadPdf(n.id, n.status === 'RASCUNHO' ? 'provisional' : 'final')}
                              title="Baixar PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateModal} onOpenChange={async (open) => {
        setShowCreateModal(open);
        if (open && isIndependentOwner && user?.id) {
          // Fetch user profile data using the same API as MyAccount page
          try {
            const profileData = await profileAPI.getProfile();
            console.log('Profile data from onOpenChange:', profileData);
            setFormData(prev => {
              const newData = {
                ...prev,
                creditorId: user.id,
                creditorName: profileData.name || user.name || prev.creditorName || '',
                creditorDocument: profileData.document || prev.creditorDocument || '',
                creditorEmail: profileData.email || user.email || prev.creditorEmail || '',
                creditorPhone: profileData.phone || prev.creditorPhone || '',
              };
              console.log('Form data updated in onOpenChange:', newData);
              return newData;
            });
          } catch (error) {
            console.error('Error fetching profile data:', error);
            // Fallback to owners list or user context data
            const currentOwner = owners.find((o: any) => {
              return String(o.id) === String(user.id) || o.id === user.id;
            });
            setFormData(prev => ({
              ...prev,
              creditorId: user.id,
              creditorName: currentOwner?.name || user.name || prev.creditorName || '',
              creditorDocument: currentOwner?.document || prev.creditorDocument || '',
              creditorEmail: currentOwner?.email || user.email || prev.creditorEmail || '',
              creditorPhone: currentOwner?.phone || prev.creditorPhone || '',
            }));
          }
        } else if (!open) {
          // Reset form when modal closes (only for non-independent owners)
          if (!isIndependentOwner) {
            resetForm();
          }
        }
      }}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Nova Notificacao Extrajudicial</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Crie uma notificacao extrajudicial com valor juridico
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="parties">
            <TabsList className="grid grid-cols-4 w-full h-auto">
              <TabsTrigger value="parties" className="text-xs sm:text-sm px-1 sm:px-3 py-1.5 sm:py-2">Partes</TabsTrigger>
              <TabsTrigger value="content" className="text-xs sm:text-sm px-1 sm:px-3 py-1.5 sm:py-2">Conteudo</TabsTrigger>
              <TabsTrigger value="financial" className="text-xs sm:text-sm px-1 sm:px-3 py-1.5 sm:py-2">Financeiro</TabsTrigger>
              <TabsTrigger value="deadline" className="text-xs sm:text-sm px-1 sm:px-3 py-1.5 sm:py-2">Prazo</TabsTrigger>
            </TabsList>

            <TabsContent value="parties" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                    <User className="h-4 w-4" />
                    Notificante (Credor)
                  </h3>
                  {!isIndependentOwner && (
                    <div>
                      <Label className="text-xs sm:text-sm">Proprietario</Label>
                      <Select
                        value={formData.creditorId}
                        onValueChange={(v) => {
                          const user = owners.find(u => u.id === v);
                          setFormData(prev => ({
                            ...prev,
                            creditorId: v,
                            creditorName: user?.name || '',
                            creditorDocument: user?.document || '',
                            creditorEmail: user?.email || '',
                            creditorPhone: user?.phone || '',
                          }));
                        }}
                      >
                        <SelectTrigger className="text-xs sm:text-sm">
                          <SelectValue placeholder="Selecione o proprietario" />
                        </SelectTrigger>
                        <SelectContent>
                          {owners.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs sm:text-sm">Nome</Label>
                    <Input
                      value={formData.creditorName}
                      onChange={(e) => setFormData({ ...formData, creditorName: e.target.value })}
                      className="text-xs sm:text-sm"
                      disabled={isIndependentOwner}
                      readOnly={isIndependentOwner}
                    />
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">CPF/CNPJ</Label>
                    <Input
                      value={formData.creditorDocument ?? ''}
                      onChange={(e) => setFormData({ ...formData, creditorDocument: e.target.value })}
                      className="text-xs sm:text-sm"
                      placeholder="Digite o CPF/CNPJ"
                      disabled={isIndependentOwner}
                      readOnly={isIndependentOwner}
                    />
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">Email</Label>
                    <Input
                      value={formData.creditorEmail ?? ''}
                      onChange={(e) => setFormData({ ...formData, creditorEmail: e.target.value })}
                      className="text-xs sm:text-sm"
                      disabled={isIndependentOwner}
                      readOnly={isIndependentOwner}
                    />
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">Telefone</Label>
                    <Input
                      value={formData.creditorPhone ?? ''}
                      onChange={(e) => setFormData({ ...formData, creditorPhone: e.target.value })}
                      className="text-xs sm:text-sm"
                      placeholder="Digite o telefone"
                      disabled={isIndependentOwner}
                      readOnly={isIndependentOwner}
                    />
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                    <User className="h-4 w-4" />
                    Notificado (Devedor)
                  </h3>
                  <div>
                    <Label className="text-xs sm:text-sm">Inquilino</Label>
                    <Select
                      value={formData.debtorId}
                      onValueChange={(v) => {
                        const tenant = tenants.find(t => t.id === v);
                        setFormData(prev => ({
                          ...prev,
                          debtorId: v,
                          debtorName: tenant?.name || '',
                          debtorDocument: tenant?.document || '',
                          debtorEmail: tenant?.email || '',
                          debtorPhone: tenant?.phone || '',
                        }));
                      }}
                    >
                      <SelectTrigger className="text-xs sm:text-sm">
                        <SelectValue placeholder="Selecione o inquilino" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">Nome</Label>
                    <Input
                      value={formData.debtorName}
                      onChange={(e) => setFormData({ ...formData, debtorName: e.target.value })}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">CPF/CNPJ</Label>
                    <Input
                      value={formData.debtorDocument}
                      onChange={(e) => setFormData({ ...formData, debtorDocument: e.target.value })}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">Email</Label>
                    <Input
                      value={formData.debtorEmail}
                      onChange={(e) => setFormData({ ...formData, debtorEmail: e.target.value })}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm">Imovel</Label>
                  <Select
                    value={formData.propertyId}
                    onValueChange={(v) => setFormData({ ...formData, propertyId: v })}
                  >
                    <SelectTrigger className="text-xs sm:text-sm">
                      <SelectValue placeholder="Selecione o imovel" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.address}, {p.city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs sm:text-sm">Tipo</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) => setFormData({ ...formData, type: v })}
                    >
                      <SelectTrigger className="text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {typeOptions.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">Prioridade</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(v) => setFormData({ ...formData, priority: v })}
                    >
                      <SelectTrigger className="text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-3 sm:space-y-4 mt-4">
              <div>
                <Label className="text-xs sm:text-sm">Titulo</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Notificacao de Cobranca de Aluguel em Atraso"
                  className="text-xs sm:text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Objeto/Assunto</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Ex: Cobranca referente aos alugueis vencidos"
                  className="text-xs sm:text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Descricao Detalhada</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Descreva detalhadamente o objeto da notificacao..."
                  className="text-xs sm:text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Fundamentacao Legal</Label>
                <Textarea
                  value={formData.legalBasis}
                  onChange={(e) => setFormData({ ...formData, legalBasis: e.target.value })}
                  rows={2}
                  placeholder="Ex: Art. 389 e 395 do Codigo Civil; Lei 8.245/91 (Lei do Inquilinato)"
                  className="text-xs sm:text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Acao Requerida</Label>
                <Textarea
                  value={formData.demandedAction}
                  onChange={(e) => setFormData({ ...formData, demandedAction: e.target.value })}
                  rows={2}
                  placeholder="Ex: Pagamento integral do debito ou desocupacao do imovel"
                  className="text-xs sm:text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="financial" className="space-y-3 sm:space-y-4 mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm">Valor Principal (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.principalAmount}
                    onChange={(e) => setFormData({ ...formData, principalAmount: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Multa (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.fineAmount}
                    onChange={(e) => setFormData({ ...formData, fineAmount: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Juros (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.interestAmount}
                    onChange={(e) => setFormData({ ...formData, interestAmount: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Correcao Monetaria (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.correctionAmount}
                    onChange={(e) => setFormData({ ...formData, correctionAmount: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Honorarios (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.lawyerFees}
                    onChange={(e) => setFormData({ ...formData, lawyerFees: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Total Devido (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    className="font-bold text-xs sm:text-sm"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="deadline" className="space-y-3 sm:space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm">Prazo para Cumprimento (dias) *</Label>
                  <Input
                    type="number"
                    value={formData.deadlineDays}
                    onChange={(e) => setFormData({ ...formData, deadlineDays: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Periodo de Carencia (dias)</Label>
                  <Input
                    type="number"
                    value={formData.gracePeriodDays}
                    onChange={(e) => setFormData({ ...formData, gracePeriodDays: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Consequencias do Nao Cumprimento</Label>
                <Textarea
                  value={formData.consequencesText}
                  onChange={(e) => setFormData({ ...formData, consequencesText: e.target.value })}
                  rows={3}
                  placeholder="Ex: O nao cumprimento acarretara no ajuizamento de acao judicial..."
                  className="text-xs sm:text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Observacoes Adicionais</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="text-xs sm:text-sm"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 mt-5">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="w-full sm:w-auto order-2 sm:order-1">
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="w-full sm:w-auto order-1 sm:order-2">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Notificacao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="flex flex-row items-center justify-between p-3 sm:p-4 border-b sticky top-0 bg-background z-10">
            <DialogTitle className="text-base sm:text-lg">Detalhes da Notificacao</DialogTitle>
            {selectedNotification && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    handlePrintPdf(
                      selectedNotification.id,
                      selectedNotification.status === 'RASCUNHO' ? 'provisional' : 'final',
                    )
                  }
                  title="Imprimir PDF"
                >
                  <Printer className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    handleDownloadPdf(
                      selectedNotification.id,
                      selectedNotification.status === 'RASCUNHO' ? 'provisional' : 'final',
                    )
                  }
                  title="Baixar PDF"
                >
                  <Download className="w-5 h-5" />
                </Button>
              </div>
            )}
          </DialogHeader>

          {selectedNotification && (
            <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 bg-white relative">
              {/* Watermark for draft */}
              {selectedNotification.status === 'RASCUNHO' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  <span className="text-6xl sm:text-8xl font-bold text-gray-200 rotate-[-30deg] select-none">
                    AGUARDANDO ASSINATURAS
                  </span>
                </div>
              )}

              <div className="relative z-10">
                {/* Header Info Bar */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 border rounded-lg mb-4 text-xs sm:text-sm">
                  <span className="font-mono font-bold">Token: {selectedNotification.notificationToken}</span>
                  <div className="flex gap-2 sm:gap-4 mt-1 sm:mt-0">
                    <span><strong>N:</strong> {selectedNotification.notificationNumber}</span>
                    <span><strong>Protocolo:</strong> {selectedNotification.protocolNumber}</span>
                  </div>
                </div>

                {/* QR Code and Barcode */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 p-4 bg-gray-50 border rounded-lg mb-4">
                  <div className="flex flex-col items-center">
                    <QRCodeSVG
                      value={`https://mr3x.com.br/verify/notification/${selectedNotification.notificationToken}`}
                      size={80}
                      level="H"
                    />
                  </div>
                  <div className="flex flex-col items-center overflow-x-auto max-w-full">
                    <Barcode
                      value={selectedNotification.notificationToken || selectedNotification.notificationNumber}
                      format="CODE128"
                      width={2}
                      height={50}
                      displayValue={true}
                      fontSize={12}
                    />
                  </div>
                </div>

                {/* Main Title */}
                <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                  <h1 className="text-xl sm:text-2xl font-bold mb-1">NOTIFICACAO EXTRAJUDICIAL</h1>
                  <p className="text-sm sm:text-base text-gray-600 font-semibold uppercase">
                    {typeOptions.find(t => t.value === selectedNotification.type)?.label || selectedNotification.type}
                  </p>
                  <div className="mt-2">
                    {getPriorityBadge(selectedNotification.priority)}
                  </div>
                </div>

                {/* Parties Section */}
                <div className="mb-6">
                  <h2 className="text-sm sm:text-base font-bold border-b border-gray-300 pb-1 mb-3">PARTES</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-3">
                      <h3 className="font-bold text-sm mb-2 text-gray-700">NOTIFICANTE (Credor)</h3>
                      <p className="text-sm"><span className="font-semibold">Nome:</span> {selectedNotification.creditorName}</p>
                      <p className="text-sm"><span className="font-semibold">CPF/CNPJ:</span> {selectedNotification.creditorDocument}</p>
                      {selectedNotification.creditorAddress && (
                        <p className="text-sm"><span className="font-semibold">Endereco:</span> {selectedNotification.creditorAddress}</p>
                      )}
                      {selectedNotification.creditorEmail && (
                        <p className="text-sm"><span className="font-semibold">E-mail:</span> {selectedNotification.creditorEmail}</p>
                      )}
                      {selectedNotification.creditorPhone && (
                        <p className="text-sm"><span className="font-semibold">Telefone:</span> {selectedNotification.creditorPhone}</p>
                      )}
                    </div>
                    <div className="border rounded-lg p-3">
                      <h3 className="font-bold text-sm mb-2 text-gray-700">NOTIFICADO (Devedor)</h3>
                      <p className="text-sm"><span className="font-semibold">Nome:</span> {selectedNotification.debtorName}</p>
                      <p className="text-sm"><span className="font-semibold">CPF/CNPJ:</span> {selectedNotification.debtorDocument}</p>
                      {selectedNotification.debtorAddress && (
                        <p className="text-sm"><span className="font-semibold">Endereco:</span> {selectedNotification.debtorAddress}</p>
                      )}
                      {selectedNotification.debtorEmail && (
                        <p className="text-sm"><span className="font-semibold">E-mail:</span> {selectedNotification.debtorEmail}</p>
                      )}
                      {selectedNotification.debtorPhone && (
                        <p className="text-sm"><span className="font-semibold">Telefone:</span> {selectedNotification.debtorPhone}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Property Section */}
                {selectedNotification.property && (
                  <div className="mb-6">
                    <h2 className="text-sm sm:text-base font-bold border-b border-gray-300 pb-1 mb-3">IMOVEL OBJETO</h2>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm"><span className="font-semibold">Endereco:</span> {selectedNotification.property.address}</p>
                      <p className="text-sm"><span className="font-semibold">Cidade:</span> {selectedNotification.property.city}</p>
                    </div>
                  </div>
                )}

                {/* Object of Notification */}
                <div className="mb-6">
                  <h2 className="text-sm sm:text-base font-bold border-b border-gray-300 pb-1 mb-3">OBJETO DA NOTIFICACAO</h2>
                  <p className="text-sm mb-2"><strong>Titulo:</strong> {selectedNotification.title}</p>
                  <p className="text-sm mb-3"><strong>Assunto:</strong> {selectedNotification.subject}</p>
                  <p className="text-sm text-justify mb-4">{selectedNotification.description}</p>

                  <div className="bg-gray-100 border-l-4 border-gray-500 p-3 italic">
                    <strong>Fundamentacao Legal:</strong><br />
                    <span className="text-sm">{selectedNotification.legalBasis}</span>
                  </div>
                </div>

                {/* Financial Values */}
                <div className="mb-6">
                  <h2 className="text-sm sm:text-base font-bold border-b border-gray-300 pb-1 mb-3">VALORES DEVIDOS</h2>
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {selectedNotification.principalAmount && (
                        <tr>
                          <td className="border p-2">Valor Principal</td>
                          <td className="border p-2 text-right font-mono">
                            {formatCurrency(selectedNotification.principalAmount)}
                          </td>
                        </tr>
                      )}
                      {selectedNotification.fineAmount && (
                        <tr>
                          <td className="border p-2">Multa</td>
                          <td className="border p-2 text-right font-mono">
                            {formatCurrency(selectedNotification.fineAmount)}
                          </td>
                        </tr>
                      )}
                      {selectedNotification.interestAmount && (
                        <tr>
                          <td className="border p-2">Juros</td>
                          <td className="border p-2 text-right font-mono">
                            {formatCurrency(selectedNotification.interestAmount)}
                          </td>
                        </tr>
                      )}
                      {selectedNotification.correctionAmount && (
                        <tr>
                          <td className="border p-2">Correcao Monetaria</td>
                          <td className="border p-2 text-right font-mono">
                            {formatCurrency(selectedNotification.correctionAmount)}
                          </td>
                        </tr>
                      )}
                      {selectedNotification.lawyerFees && (
                        <tr>
                          <td className="border p-2">Honorarios Advocaticios</td>
                          <td className="border p-2 text-right font-mono">
                            {formatCurrency(selectedNotification.lawyerFees)}
                          </td>
                        </tr>
                      )}
                      <tr className="bg-gray-100 font-bold">
                        <td className="border p-2">TOTAL DEVIDO</td>
                        <td className="border p-2 text-right font-mono">
                          {formatCurrency(selectedNotification.totalAmount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Demanded Action */}
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-6">
                  <h4 className="text-sm font-bold text-cyan-800 uppercase mb-2">ACAO REQUERIDA</h4>
                  <p className="text-sm text-cyan-700">{selectedNotification.demandedAction}</p>
                </div>

                {/* Deadline Section */}
                <div className="mb-6">
                  <h2 className="text-sm sm:text-base font-bold border-b border-gray-300 pb-1 mb-3">PRAZO PARA CUMPRIMENTO</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="border text-center p-3">
                      <p className="text-xs text-gray-500 uppercase">Data Limite</p>
                      <p className="text-lg font-bold">{formatDate(selectedNotification.deadlineDate)}</p>
                    </div>
                    <div className="border text-center p-3">
                      <p className="text-xs text-gray-500 uppercase">Prazo</p>
                      <p className="text-lg font-bold">{selectedNotification.deadlineDays} dias</p>
                    </div>
                    <div className="border text-center p-3">
                      <p className="text-xs text-gray-500 uppercase">Carencia</p>
                      <p className="text-lg font-bold">
                        {selectedNotification.gracePeriodDays ? `${selectedNotification.gracePeriodDays} dias` : 'N/A'}
                      </p>
                    </div>
                    <div className="border text-center p-3 col-span-2 sm:col-span-1">
                      <p className="text-xs text-gray-500 uppercase">Status</p>
                      <div className="mt-1">{getStatusBadge(selectedNotification.status)}</div>
                    </div>
                  </div>
                </div>

                {/* Consequences Section */}
                {selectedNotification.consequencesText && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-red-800 uppercase mb-2">
                      CONSEQUENCIAS DO NAO CUMPRIMENTO
                    </h4>
                    <p className="text-xs sm:text-sm text-red-800">
                      {selectedNotification.consequencesText}
                    </p>
                  </div>
                )}

                {/* Signatures Section */}
                <div className="mb-6">
                  <h2 className="text-sm sm:text-base font-bold border-b border-gray-300 pb-1 mb-3">ASSINATURAS</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={`text-center border-t pt-3 ${selectedNotification.creditorSignedAt ? 'border-green-300 bg-green-50' : ''}`}>
                      <div className="h-12 sm:h-16 flex items-end justify-center mb-2">
                        {selectedNotification.creditorSignature ? (
                          <img 
                            src={selectedNotification.creditorSignature} 
                            alt="Assinatura Credor" 
                            className="h-10 sm:h-12 mx-auto object-contain" 
                          />
                        ) : (
                          <PenTool className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="border-t border-gray-800 pt-1">
                        <p className="font-bold text-sm">{selectedNotification.creditorName}</p>
                        <p className="text-xs text-gray-500">NOTIFICANTE - {selectedNotification.creditorDocument}</p>
                        {selectedNotification.creditorSignedAt ? (
                          <p className="text-xs text-green-600 mt-1">
                            <CheckCircle className="w-3 h-3 inline mr-1" />
                            Assinado em: {formatDateTime(selectedNotification.creditorSignedAt)}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">Pendente</p>
                        )}
                      </div>
                    </div>
                    <div className={`text-center border-t pt-3 ${selectedNotification.debtorSignedAt ? 'border-green-300 bg-green-50' : ''}`}>
                      <div className="h-12 sm:h-16 flex items-end justify-center mb-2">
                        {selectedNotification.debtorSignature ? (
                          <img 
                            src={selectedNotification.debtorSignature} 
                            alt="Assinatura Devedor" 
                            className="h-10 sm:h-12 mx-auto object-contain" 
                          />
                        ) : (
                          <PenTool className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="border-t border-gray-800 pt-1">
                        <p className="font-bold text-sm">{selectedNotification.debtorName}</p>
                        <p className="text-xs text-gray-500">NOTIFICADO - {selectedNotification.debtorDocument}</p>
                        {selectedNotification.debtorSignedAt ? (
                          <p className="text-xs text-green-600 mt-1">
                            <CheckCircle className="w-3 h-3 inline mr-1" />
                            Assinado em: {formatDateTime(selectedNotification.debtorSignedAt)}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">Pendente</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="border-t pt-4">
                  <h2 className="text-sm font-bold mb-2">Linha do Tempo</h2>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p><span className="text-gray-400">Criada:</span> {formatDateTime(selectedNotification.createdAt)}</p>
                    {selectedNotification.sentAt && (
                      <p><span className="text-gray-400">Enviada:</span> {formatDateTime(selectedNotification.sentAt)}</p>
                    )}
                    {selectedNotification.viewedAt && (
                      <p><span className="text-gray-400">Visualizada:</span> {formatDateTime(selectedNotification.viewedAt)}</p>
                    )}
                    {selectedNotification.responseAt && (
                      <p><span className="text-gray-400">Respondida:</span> {formatDateTime(selectedNotification.responseAt)}</p>
                    )}
                    {selectedNotification.resolvedAt && (
                      <p><span className="text-gray-400">Resolvida:</span> {formatDateTime(selectedNotification.resolvedAt)}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 p-3 sm:p-4 border-t sticky bottom-0 bg-background">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedNotification) {
                  handleDownloadPdf(selectedNotification.id, selectedNotification.status === 'RASCUNHO' ? 'provisional' : 'final');
                }
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      <Dialog open={showSignModal} onOpenChange={(open) => !open && closeSignatureModal()}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle>Assinar Notificação</DialogTitle>
            <DialogDescription>
              Assinatura como: <strong>{getSignerTypeLabel()}</strong>
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

      <Dialog open={showJudicialModal} onOpenChange={setShowJudicialModal}>
        <DialogContent className="w-[95vw] max-w-md p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Gavel className="h-4 w-4 sm:h-5 sm:w-5" />
              Encaminhar ao Judicial
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Esta notificacao sera marcada como encaminhada ao processo judicial
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <Label className="text-xs sm:text-sm">Numero do Processo</Label>
              <Input
                value={judicialData.judicialProcessNumber}
                onChange={(e) => setJudicialData({ ...judicialData, judicialProcessNumber: e.target.value })}
                placeholder="0000000-00.0000.0.00.0000"
                className="text-xs sm:text-sm"
              />
            </div>
            <div>
              <Label className="text-xs sm:text-sm">Tribunal/Comarca</Label>
              <Input
                value={judicialData.judicialCourt}
                onChange={(e) => setJudicialData({ ...judicialData, judicialCourt: e.target.value })}
                placeholder="Ex: 1a Vara Civel de Sao Paulo"
                className="text-xs sm:text-sm"
              />
            </div>
            <div>
              <Label className="text-xs sm:text-sm">Observacoes</Label>
              <Textarea
                value={judicialData.judicialNotes}
                onChange={(e) => setJudicialData({ ...judicialData, judicialNotes: e.target.value })}
                rows={3}
                className="text-xs sm:text-sm"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowJudicialModal(false)} className="w-full sm:w-auto order-2 sm:order-1">
              Cancelar
            </Button>
            <Button onClick={handleForwardToJudicial} disabled={saving} variant="destructive" className="w-full sm:w-auto order-1 sm:order-2">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Encaminhar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showSendErrorModal} onOpenChange={setShowSendErrorModal}>
        <AlertDialogContent className="w-[95vw] max-w-md p-3 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600 text-base sm:text-lg">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              Assinatura necessária
            </AlertDialogTitle>
            <AlertDialogDescription>
              Não é possível enviar a notificação sem assinaturas
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-medium mb-1">Assinatura necessária</p>
                <p>Primeiro, clique no botão "Ver" (ícone de olho) e assine a notificação antes de enviar.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSendErrorModal(false)}>
                Entendi
              </Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="w-[95vw] max-w-md p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 text-base sm:text-lg">
              <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
              Excluir Notificacao
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Tem certeza que deseja excluir esta notificacao? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center py-3 sm:py-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setNotificationToDelete(null);
              }}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
