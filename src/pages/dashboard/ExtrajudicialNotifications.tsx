import { useState, useEffect, useRef } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { extrajudicialNotificationsAPI, propertiesAPI, usersAPI } from '@/api';
import { useAuth } from '@/contexts/AuthContext';
import SignatureCanvas from 'react-signature-canvas';
import {
  Plus,
  Search,
  Download,
  Eye,
  Trash2,
  Send,
  FileText,
  CheckCircle,
  Gavel,
  Loader2,
  PenTool,
  AlertCircle,
  DollarSign,
  Calendar,
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
  creditorId: string;
  creditorName: string;
  creditorDocument: string;
  creditorEmail?: string;
  debtorId: string;
  debtorName: string;
  debtorDocument: string;
  debtorEmail?: string;
  title: string;
  subject: string;
  description: string;
  legalBasis: string;
  demandedAction: string;
  totalAmount: string;
  deadlineDate: string;
  deadlineDays: number;
  property?: {
    id: string;
    address: string;
    city: string;
  };
  creditorSignedAt?: string;
  debtorSignedAt?: string;
  sentAt?: string;
  viewedAt?: string;
  responseAt?: string;
  resolvedAt?: string;
  createdAt: string;
  userRole?: 'CREDITOR' | 'DEBTOR' | 'VIEWER'; // User's role in this notification
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
  const signatureRef = useRef<SignatureCanvas>(null);
  const { user } = useAuth();
  const isInquilino = user?.role === 'INQUILINO';
  const isProprietario = user?.role === 'PROPRIETARIO';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statistics, setStatistics] = useState<any>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showJudicialModal, setShowJudicialModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

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

  const [signData, setSignData] = useState({
    signerType: 'creditor' as 'creditor' | 'debtor',
    geoLat: 0,
    geoLng: 0,
    geoConsent: false,
  });

  const [judicialData, setJudicialData] = useState({
    judicialProcessNumber: '',
    judicialCourt: '',
    judicialNotes: '',
  });

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // INQUILINO users can only see their notifications, not create them
      // So we skip loading properties, users, and tenants for them
      if (isInquilino) {
        const [notificationsRes, statsRes] = await Promise.all([
          extrajudicialNotificationsAPI.getNotifications({
            status: statusFilter || undefined,
            type: typeFilter || undefined,
          }),
          extrajudicialNotificationsAPI.getStatistics(),
        ]);

        setNotifications(notificationsRes.data || []);
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

        setNotifications(notificationsRes.data || []);
        setStatistics(statsRes);
        setProperties(propsRes || []);
        setTenants(tenantsRes || []);

        // Filter owners from users (PROPRIETARIO, INDEPENDENT_OWNER roles)
        const ownerRoles = ['PROPRIETARIO', 'INDEPENDENT_OWNER'];
        const filteredOwners = (usersRes.items || []).filter((u: any) => ownerRoles.includes(u.role));
        setOwners(filteredOwners);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    // Validate required fields
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
    try {
      await extrajudicialNotificationsAPI.sendNotification(id, 'EMAIL');
      toast.success('Notificacao enviada com sucesso!');
      loadData();
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Erro ao enviar notificacao');
    }
  };

  const handleSign = async () => {
    if (!selectedNotification || !signatureRef.current) return;

    // Check user has valid signing role
    if (!selectedNotification.userRole || selectedNotification.userRole === 'VIEWER') {
      toast.error('Voce nao tem permissao para assinar esta notificacao');
      return;
    }

    try {
      setSaving(true);

      // Get geolocation (optional - continues without it if unavailable or blocked)
      let geoLat = signData.geoLat;
      let geoLng = signData.geoLng;
      if (signData.geoConsent && navigator.geolocation) {
        try {
          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                geoLat = position.coords.latitude;
                geoLng = position.coords.longitude;
                resolve();
              },
              (error) => {
                // Log the error but don't reject - allow signing to continue without geolocation
                console.warn('Geolocation unavailable:', error.message);
                resolve();
              },
              { timeout: 10000 }
            );
          });
        } catch (geoError) {
          // Geolocation failed but we continue without it
          console.warn('Geolocation error:', geoError);
        }
      }

      const signature = signatureRef.current.toDataURL('image/png');

      // Use userRole to determine which signature field to send
      const signatureField = selectedNotification.userRole === 'CREDITOR' ? 'creditorSignature' : 'debtorSignature';

      await extrajudicialNotificationsAPI.signNotification(selectedNotification.id, {
        [signatureField]: signature,
        geoLat,
        geoLng,
      });

      toast.success('Notificacao assinada com sucesso!');
      setShowSignModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error signing notification:', error);
      const message = error?.response?.data?.message || 'Erro ao assinar notificacao';
      toast.error(message);
    } finally {
      setSaving(false);
    }
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

  const handleViewPdf = async (notification: Notification) => {
    setPdfLoading(true);
    setSelectedNotification(notification);
    setShowPdfPreviewModal(true);

    try {
      const type = notification.status === 'RASCUNHO' ? 'provisional' : 'final';
      const blob = type === 'provisional'
        ? await extrajudicialNotificationsAPI.downloadProvisionalPdf(notification.id)
        : await extrajudicialNotificationsAPI.downloadFinalPdf(notification.id);

      const url = window.URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
    } catch (error) {
      console.error('Error viewing PDF:', error);
      toast.error('Erro ao visualizar PDF');
      setShowPdfPreviewModal(false);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleClosePdfPreview = () => {
    setShowPdfPreviewModal(false);
    if (pdfPreviewUrl) {
      window.URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
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
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        n.notificationNumber?.toLowerCase().includes(search) ||
        n.creditorName?.toLowerCase().includes(search) ||
        n.debtorName?.toLowerCase().includes(search) ||
        n.title?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
            Notificacoes Extrajudiciais
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie notificacoes extrajudiciais com valor juridico
          </p>
        </div>
        {!isInquilino && !isProprietario && (
          <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nova Notificacao
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
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

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="w-full sm:flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-4">
              <Select value={statusFilter || 'ALL'} onValueChange={(v) => setStatusFilter(v === 'ALL' ? '' : v)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Status</SelectItem>
                  {statusOptions.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter || 'ALL'} onValueChange={(v) => setTypeFilter(v === 'ALL' ? '' : v)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Tipos</SelectItem>
                  {typeOptions.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Notificacoes</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              Nenhuma notificacao encontrada
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredNotifications.map(n => (
                  <Card key={n.id} className="border shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-mono text-xs text-muted-foreground">{n.notificationNumber}</p>
                          <p className="font-medium text-sm">{n.debtorName}</p>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewPdf(n)}>
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
                        {['ENVIADO', 'VISUALIZADO'].includes(n.status) &&
                         n.userRole && n.userRole !== 'VIEWER' &&
                         !((n.userRole === 'CREDITOR' && n.creditorSignedAt) || (n.userRole === 'DEBTOR' && n.debtorSignedAt)) && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedNotification(n); setShowSignModal(true); }}>
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

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Seu Papel</TableHead>
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
                              onClick={() => handleViewPdf(n)}
                              title="Ver PDF"
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

                            {/* Show sign button only for CREDITOR/DEBTOR who haven't signed yet */}
                            {['ENVIADO', 'VISUALIZADO'].includes(n.status) &&
                             n.userRole &&
                             n.userRole !== 'VIEWER' &&
                             !((n.userRole === 'CREDITOR' && n.creditorSignedAt) ||
                               (n.userRole === 'DEBTOR' && n.debtorSignedAt)) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedNotification(n);
                                  setShowSignModal(true);
                                }}
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

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
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
                  <div>
                    <Label className="text-xs sm:text-sm">Nome</Label>
                    <Input
                      value={formData.creditorName}
                      onChange={(e) => setFormData({ ...formData, creditorName: e.target.value })}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">CPF/CNPJ</Label>
                    <Input
                      value={formData.creditorDocument}
                      onChange={(e) => setFormData({ ...formData, creditorDocument: e.target.value })}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">Email</Label>
                    <Input
                      value={formData.creditorEmail}
                      onChange={(e) => setFormData({ ...formData, creditorEmail: e.target.value })}
                      className="text-xs sm:text-sm"
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

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
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

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Detalhes da Notificacao</DialogTitle>
          </DialogHeader>

          {selectedNotification && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div className="space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm">
                    <span><strong>N:</strong> {selectedNotification.notificationNumber}</span>
                    <span><strong>Protocolo:</strong> {selectedNotification.protocolNumber}</span>
                    <span><strong>Data:</strong> {formatDate(selectedNotification.createdAt)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(selectedNotification.status)}
                  {getPriorityBadge(selectedNotification.priority)}
                </div>
              </div>

              {/* QR Code and Barcode */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 p-3 sm:p-4 bg-gray-50 border rounded-lg">
                <div className="flex flex-col items-center">
                  <QRCodeSVG
                    value={`https://mr3x.com.br/verify/notification/${selectedNotification.notificationToken}`}
                    size={60}
                    level="H"
                    className="sm:w-20 sm:h-20"
                  />
                </div>
                <div className="flex flex-col items-center overflow-x-auto max-w-full">
                  <Barcode
                    value={selectedNotification.notificationToken || selectedNotification.notificationNumber}
                    format="CODE128"
                    width={1.5}
                    height={30}
                    displayValue={true}
                    fontSize={10}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1 sm:space-y-2">
                  <h4 className="font-semibold text-sm sm:text-base">Notificante (Credor)</h4>
                  <p className="font-medium text-sm">{selectedNotification.creditorName}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{selectedNotification.creditorDocument}</p>
                  {selectedNotification.creditorEmail && (
                    <p className="text-xs sm:text-sm">{selectedNotification.creditorEmail}</p>
                  )}
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <h4 className="font-semibold text-sm sm:text-base">Notificado (Devedor)</h4>
                  <p className="font-medium text-sm">{selectedNotification.debtorName}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{selectedNotification.debtorDocument}</p>
                  {selectedNotification.debtorEmail && (
                    <p className="text-xs sm:text-sm">{selectedNotification.debtorEmail}</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <h4 className="font-semibold text-sm sm:text-base">{selectedNotification.title}</h4>
                  <p className="text-muted-foreground text-xs sm:text-sm">{selectedNotification.subject}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-xs sm:text-sm">Descricao</h4>
                  <p className="text-xs sm:text-sm">{selectedNotification.description}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-xs sm:text-sm">Fundamentacao Legal</h4>
                  <p className="text-xs sm:text-sm italic">{selectedNotification.legalBasis}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-xs sm:text-sm">Acao Requerida</h4>
                  <p className="text-xs sm:text-sm">{selectedNotification.demandedAction}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1 sm:space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                    <DollarSign className="h-4 w-4" />
                    Valor Total
                  </h4>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">
                    {formatCurrency(selectedNotification.totalAmount)}
                  </p>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                    <Calendar className="h-4 w-4" />
                    Prazo
                  </h4>
                  <p className="text-base sm:text-xl font-bold">
                    {formatDate(selectedNotification.deadlineDate)}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    ({selectedNotification.deadlineDays} dias)
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-semibold text-sm sm:text-base">Linha do Tempo</h4>
                <div className="space-y-1 text-xs sm:text-sm">
                  <p>
                    <span className="text-muted-foreground">Criada:</span>{' '}
                    {formatDateTime(selectedNotification.createdAt)}
                  </p>
                  {selectedNotification.sentAt && (
                    <p>
                      <span className="text-muted-foreground">Enviada:</span>{' '}
                      {formatDateTime(selectedNotification.sentAt)}
                    </p>
                  )}
                  {selectedNotification.viewedAt && (
                    <p>
                      <span className="text-muted-foreground">Visualizada:</span>{' '}
                      {formatDateTime(selectedNotification.viewedAt)}
                    </p>
                  )}
                  {selectedNotification.creditorSignedAt && (
                    <p className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span className="text-muted-foreground">Assinada pelo Credor:</span>{' '}
                      {formatDateTime(selectedNotification.creditorSignedAt)}
                    </p>
                  )}
                  {selectedNotification.debtorSignedAt && (
                    <p className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span className="text-muted-foreground">Assinada pelo Devedor:</span>{' '}
                      {formatDateTime(selectedNotification.debtorSignedAt)}
                    </p>
                  )}
                  {selectedNotification.responseAt && (
                    <p>
                      <span className="text-muted-foreground">Respondida:</span>{' '}
                      {formatDateTime(selectedNotification.responseAt)}
                    </p>
                  )}
                  {selectedNotification.resolvedAt && (
                    <p className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span className="text-muted-foreground">Resolvida:</span>{' '}
                      {formatDateTime(selectedNotification.resolvedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal */}
      <Dialog open={showPdfPreviewModal} onOpenChange={handleClosePdfPreview}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[95vh] p-0">
          <DialogHeader className="p-3 sm:p-4 pb-2">
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="truncate">PDF - {selectedNotification?.notificationToken}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden" style={{ height: 'calc(95vh - 120px)', minHeight: '300px' }}>
            {pdfLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground text-sm">Carregando PDF...</span>
              </div>
            ) : pdfPreviewUrl ? (
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Erro ao carregar PDF
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 p-3 sm:p-4 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedNotification) {
                  handleDownloadPdf(selectedNotification.id, selectedNotification.status === 'RASCUNHO' ? 'provisional' : 'final');
                }
              }}
              className="w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
            <Button variant="outline" onClick={handleClosePdfPreview} className="w-full sm:w-auto">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sign Modal */}
      <Dialog open={showSignModal} onOpenChange={setShowSignModal}>
        <DialogContent className="w-[95vw] max-w-lg p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Assinar Notificacao</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Sua assinatura tem valor juridico e sera registrada com data, hora, IP e geolocalizacao
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4">
            {/* Show signing role based on userRole */}
            <div className="p-3 sm:p-4 bg-muted rounded-lg">
              <Label className="text-xs sm:text-sm text-muted-foreground">Voce esta assinando como:</Label>
              <p className="text-base sm:text-lg font-semibold mt-1">
                {selectedNotification?.userRole === 'CREDITOR' && 'Credor (Notificante)'}
                {selectedNotification?.userRole === 'DEBTOR' && 'Devedor (Notificado)'}
                {!selectedNotification?.userRole && 'Carregando...'}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {selectedNotification?.userRole === 'CREDITOR' && selectedNotification?.creditorName}
                {selectedNotification?.userRole === 'DEBTOR' && selectedNotification?.debtorName}
              </p>
            </div>

            {/* Check if already signed */}
            {selectedNotification?.userRole === 'CREDITOR' && selectedNotification?.creditorSignedAt && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 text-xs sm:text-sm">
                  Voce ja assinou esta notificacao como Credor.
                </AlertDescription>
              </Alert>
            )}
            {selectedNotification?.userRole === 'DEBTOR' && selectedNotification?.debtorSignedAt && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 text-xs sm:text-sm">
                  Voce ja assinou esta notificacao como Devedor.
                </AlertDescription>
              </Alert>
            )}

            {/* Show signature canvas only if not already signed */}
            {!(
              (selectedNotification?.userRole === 'CREDITOR' && selectedNotification?.creditorSignedAt) ||
              (selectedNotification?.userRole === 'DEBTOR' && selectedNotification?.debtorSignedAt)
            ) && (
              <>
                <div>
                  <Label className="text-xs sm:text-sm">Assinatura</Label>
                  <div className="border rounded-lg p-2 bg-white">
                    <SignatureCanvas
                      ref={signatureRef}
                      canvasProps={{
                        className: 'signature-canvas w-full',
                        style: { width: '100%', height: '120px' },
                      }}
                    />
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => signatureRef.current?.clear()}
                    className="text-xs sm:text-sm"
                  >
                    Limpar
                  </Button>
                </div>

                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="geoConsent"
                    checked={signData.geoConsent}
                    onChange={(e) => setSignData({ ...signData, geoConsent: e.target.checked })}
                    className="mt-1"
                  />
                  <Label htmlFor="geoConsent" className="text-xs sm:text-sm leading-tight">
                    Autorizo a captura da minha localizacao para fins de validacao juridica
                  </Label>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs sm:text-sm">
                    Ao assinar, voce declara ciencia do conteudo desta notificacao e aceita
                    que esta assinatura tem validade juridica equivalente a uma assinatura fisica.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowSignModal(false)} className="w-full sm:w-auto order-2 sm:order-1">
              {(selectedNotification?.userRole === 'CREDITOR' && selectedNotification?.creditorSignedAt) ||
              (selectedNotification?.userRole === 'DEBTOR' && selectedNotification?.debtorSignedAt)
                ? 'Fechar'
                : 'Cancelar'}
            </Button>
            {!(
              (selectedNotification?.userRole === 'CREDITOR' && selectedNotification?.creditorSignedAt) ||
              (selectedNotification?.userRole === 'DEBTOR' && selectedNotification?.debtorSignedAt)
            ) && (
              <Button onClick={handleSign} disabled={saving} className="w-full sm:w-auto order-1 sm:order-2">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Assinar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forward to Judicial Modal */}
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

      {/* Delete Confirmation Modal */}
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
