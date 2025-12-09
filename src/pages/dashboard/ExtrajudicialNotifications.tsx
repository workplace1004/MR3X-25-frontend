import { useState, useEffect, useRef } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { extrajudicialNotificationsAPI, propertiesAPI, usersAPI } from '@/api';
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
  History,
  PenTool,
  Shield,
  AlertCircle,
  DollarSign,
  Calendar,
  User,
  RefreshCw,
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
  { value: 'AGUARDANDO_ENVIO', label: 'Aguardando Envio', color: 'bg-yellow-500' },
  { value: 'ENVIADA', label: 'Enviada', color: 'bg-blue-500' },
  { value: 'VISUALIZADA', label: 'Visualizada', color: 'bg-indigo-500' },
  { value: 'RESPONDIDA', label: 'Respondida', color: 'bg-purple-500' },
  { value: 'ACEITA', label: 'Aceita', color: 'bg-green-500' },
  { value: 'REJEITADA', label: 'Rejeitada', color: 'bg-red-500' },
  { value: 'PRAZO_EXPIRADO', label: 'Prazo Expirado', color: 'bg-orange-500' },
  { value: 'ENCAMINHADA_JUDICIAL', label: 'Encaminhada ao Judicial', color: 'bg-red-700' },
  { value: 'CANCELADA', label: 'Cancelada', color: 'bg-gray-700' },
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
  const [showAuditModal, setShowAuditModal] = useState(false);

  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [properties, setProperties] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
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
    subject: '',
    description: '',
    legalBasis: '',
    demandedAction: '',
    principalAmount: '',
    fineAmount: '',
    interestAmount: '',
    correctionAmount: '',
    lawyerFees: '',
    totalAmount: '',
    deadlineDays: '15',
    gracePeriodDays: '',
    consequencesText: '',
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
      const [notificationsRes, statsRes, propsRes, usersRes] = await Promise.all([
        extrajudicialNotificationsAPI.getNotifications({
          status: statusFilter || undefined,
          type: typeFilter || undefined,
        }),
        extrajudicialNotificationsAPI.getStatistics(),
        propertiesAPI.getProperties(),
        usersAPI.listUsers({ pageSize: 100 }),
      ]);

      setNotifications(notificationsRes.data || []);
      setStatistics(statsRes);
      setProperties(propsRes || []);
      setUsers(usersRes.items || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      await extrajudicialNotificationsAPI.createNotification({
        ...formData,
        principalAmount: formData.principalAmount ? parseFloat(formData.principalAmount) : undefined,
        fineAmount: formData.fineAmount ? parseFloat(formData.fineAmount) : undefined,
        interestAmount: formData.interestAmount ? parseFloat(formData.interestAmount) : undefined,
        correctionAmount: formData.correctionAmount ? parseFloat(formData.correctionAmount) : undefined,
        lawyerFees: formData.lawyerFees ? parseFloat(formData.lawyerFees) : undefined,
        totalAmount: parseFloat(formData.totalAmount),
        deadlineDays: parseInt(formData.deadlineDays),
        gracePeriodDays: formData.gracePeriodDays ? parseInt(formData.gracePeriodDays) : undefined,
      });
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating notification:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (id: string) => {
    try {
      await extrajudicialNotificationsAPI.sendNotification(id, 'EMAIL');
      loadData();
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const handleSign = async () => {
    if (!selectedNotification || !signatureRef.current) return;

    try {
      setSaving(true);

      // Get geolocation
      if (signData.geoConsent && navigator.geolocation) {
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setSignData(prev => ({
                ...prev,
                geoLat: position.coords.latitude,
                geoLng: position.coords.longitude,
              }));
              resolve();
            },
            reject,
          );
        });
      }

      const signature = signatureRef.current.toDataURL('image/png');

      await extrajudicialNotificationsAPI.signNotification(selectedNotification.id, {
        [signData.signerType === 'creditor' ? 'creditorSignature' : 'debtorSignature']: signature,
        geoLat: signData.geoLat,
        geoLng: signData.geoLng,
      });

      setShowSignModal(false);
      loadData();
    } catch (error) {
      console.error('Error signing notification:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleForwardToJudicial = async () => {
    if (!selectedNotification) return;

    try {
      setSaving(true);
      await extrajudicialNotificationsAPI.forwardToJudicial(selectedNotification.id, judicialData);
      setShowJudicialModal(false);
      loadData();
    } catch (error) {
      console.error('Error forwarding to judicial:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta notificacao? Esta acao nao pode ser desfeita.')) return;

    try {
      await extrajudicialNotificationsAPI.deleteNotification(id);
      loadData();
    } catch (error) {
      console.error('Error deleting notification:', error);
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
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const handleViewAudit = async (notification: Notification) => {
    try {
      const logs = await extrajudicialNotificationsAPI.getAuditLog(notification.id);
      setAuditLogs(logs);
      setSelectedNotification(notification);
      setShowAuditModal(true);
    } catch (error) {
      console.error('Error loading audit log:', error);
    }
  };

  const handleVerifyHash = async (id: string) => {
    try {
      const result = await extrajudicialNotificationsAPI.verifyHash(id);
      alert(result.message);
    } catch (error) {
      console.error('Error verifying hash:', error);
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
      subject: '',
      description: '',
      legalBasis: '',
      demandedAction: '',
      principalAmount: '',
      fineAmount: '',
      interestAmount: '',
      correctionAmount: '',
      lawyerFees: '',
      totalAmount: '',
      deadlineDays: '15',
      gracePeriodDays: '',
      consequencesText: '',
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Notificacoes Extrajudiciais
          </h1>
          <p className="text-muted-foreground">
            Gerencie notificacoes extrajudiciais com valor juridico
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Notificacao
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card className="bg-gray-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{statistics.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{statistics.draft}</div>
              <div className="text-xs text-muted-foreground">Rascunho</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.sent}</div>
              <div className="text-xs text-muted-foreground">Enviadas</div>
            </CardContent>
          </Card>
          <Card className="bg-indigo-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">{statistics.viewed}</div>
              <div className="text-xs text-muted-foreground">Visualizadas</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{statistics.responded}</div>
              <div className="text-xs text-muted-foreground">Respondidas</div>
            </CardContent>
          </Card>
          <Card className="bg-green-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.resolved}</div>
              <div className="text-xs text-muted-foreground">Resolvidas</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{statistics.expired}</div>
              <div className="text-xs text-muted-foreground">Expiradas</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{statistics.judicial}</div>
              <div className="text-xs text-muted-foreground">Judicial</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por numero, partes ou titulo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os Status</SelectItem>
                {statusOptions.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os Tipos</SelectItem>
                {typeOptions.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Notificacoes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              Nenhuma notificacao encontrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
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
                          onClick={() => {
                            setSelectedNotification(n);
                            setShowDetailsModal(true);
                          }}
                          title="Ver detalhes"
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
                              onClick={() => handleDelete(n.id)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}

                        {['ENVIADA', 'VISUALIZADA'].includes(n.status) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedNotification(n);
                              setShowSignModal(true);
                            }}
                            title="Assinar"
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

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewAudit(n)}
                          title="Historico de Auditoria"
                        >
                          <History className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleVerifyHash(n.id)}
                          title="Verificar Integridade"
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Notificacao Extrajudicial</DialogTitle>
            <DialogDescription>
              Crie uma notificacao extrajudicial com valor juridico
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="parties">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="parties">Partes</TabsTrigger>
              <TabsTrigger value="content">Conteudo</TabsTrigger>
              <TabsTrigger value="financial">Financeiro</TabsTrigger>
              <TabsTrigger value="deadline">Prazo</TabsTrigger>
            </TabsList>

            <TabsContent value="parties" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Notificante (Credor)
                  </h3>
                  <div>
                    <Label>Usuario</Label>
                    <Select
                      value={formData.creditorId}
                      onValueChange={(v) => {
                        const user = users.find(u => u.id === v);
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
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o credor" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={formData.creditorName}
                      onChange={(e) => setFormData({ ...formData, creditorName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>CPF/CNPJ</Label>
                    <Input
                      value={formData.creditorDocument}
                      onChange={(e) => setFormData({ ...formData, creditorDocument: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={formData.creditorEmail}
                      onChange={(e) => setFormData({ ...formData, creditorEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Notificado (Devedor)
                  </h3>
                  <div>
                    <Label>Usuario</Label>
                    <Select
                      value={formData.debtorId}
                      onValueChange={(v) => {
                        const user = users.find(u => u.id === v);
                        setFormData(prev => ({
                          ...prev,
                          debtorId: v,
                          debtorName: user?.name || '',
                          debtorDocument: user?.document || '',
                          debtorEmail: user?.email || '',
                          debtorPhone: user?.phone || '',
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o devedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={formData.debtorName}
                      onChange={(e) => setFormData({ ...formData, debtorName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>CPF/CNPJ</Label>
                    <Input
                      value={formData.debtorDocument}
                      onChange={(e) => setFormData({ ...formData, debtorDocument: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={formData.debtorEmail}
                      onChange={(e) => setFormData({ ...formData, debtorEmail: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Imovel</Label>
                  <Select
                    value={formData.propertyId}
                    onValueChange={(v) => setFormData({ ...formData, propertyId: v })}
                  >
                    <SelectTrigger>
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
                    <Label>Tipo</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) => setFormData({ ...formData, type: v })}
                    >
                      <SelectTrigger>
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
                    <Label>Prioridade</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(v) => setFormData({ ...formData, priority: v })}
                    >
                      <SelectTrigger>
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

            <TabsContent value="content" className="space-y-4 mt-4">
              <div>
                <Label>Titulo</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Notificacao de Cobranca de Aluguel em Atraso"
                />
              </div>
              <div>
                <Label>Objeto/Assunto</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Ex: Cobranca referente aos alugueis vencidos"
                />
              </div>
              <div>
                <Label>Descricao Detalhada</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Descreva detalhadamente o objeto da notificacao..."
                />
              </div>
              <div>
                <Label>Fundamentacao Legal</Label>
                <Textarea
                  value={formData.legalBasis}
                  onChange={(e) => setFormData({ ...formData, legalBasis: e.target.value })}
                  rows={2}
                  placeholder="Ex: Art. 389 e 395 do Codigo Civil; Lei 8.245/91 (Lei do Inquilinato)"
                />
              </div>
              <div>
                <Label>Acao Requerida</Label>
                <Textarea
                  value={formData.demandedAction}
                  onChange={(e) => setFormData({ ...formData, demandedAction: e.target.value })}
                  rows={2}
                  placeholder="Ex: Pagamento integral do debito ou desocupacao do imovel"
                />
              </div>
            </TabsContent>

            <TabsContent value="financial" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Valor Principal (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.principalAmount}
                    onChange={(e) => setFormData({ ...formData, principalAmount: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Multa (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.fineAmount}
                    onChange={(e) => setFormData({ ...formData, fineAmount: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Juros (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.interestAmount}
                    onChange={(e) => setFormData({ ...formData, interestAmount: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Correcao Monetaria (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.correctionAmount}
                    onChange={(e) => setFormData({ ...formData, correctionAmount: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Honorarios (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.lawyerFees}
                    onChange={(e) => setFormData({ ...formData, lawyerFees: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Total Devido (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    className="font-bold"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="deadline" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prazo para Cumprimento (dias) *</Label>
                  <Input
                    type="number"
                    value={formData.deadlineDays}
                    onChange={(e) => setFormData({ ...formData, deadlineDays: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Periodo de Carencia (dias)</Label>
                  <Input
                    type="number"
                    value={formData.gracePeriodDays}
                    onChange={(e) => setFormData({ ...formData, gracePeriodDays: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Consequencias do Nao Cumprimento</Label>
                <Textarea
                  value={formData.consequencesText}
                  onChange={(e) => setFormData({ ...formData, consequencesText: e.target.value })}
                  rows={3}
                  placeholder="Ex: O nao cumprimento acarretara no ajuizamento de acao judicial..."
                />
              </div>
              <div>
                <Label>Observacoes Adicionais</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Notificacao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Notificacao</DialogTitle>
          </DialogHeader>

          {selectedNotification && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-muted-foreground">Numero</div>
                  <div className="font-mono font-bold">{selectedNotification.notificationNumber}</div>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(selectedNotification.status)}
                  {getPriorityBadge(selectedNotification.priority)}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-semibold">Notificante (Credor)</h4>
                  <p className="font-medium">{selectedNotification.creditorName}</p>
                  <p className="text-sm text-muted-foreground">{selectedNotification.creditorDocument}</p>
                  {selectedNotification.creditorEmail && (
                    <p className="text-sm">{selectedNotification.creditorEmail}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Notificado (Devedor)</h4>
                  <p className="font-medium">{selectedNotification.debtorName}</p>
                  <p className="text-sm text-muted-foreground">{selectedNotification.debtorDocument}</p>
                  {selectedNotification.debtorEmail && (
                    <p className="text-sm">{selectedNotification.debtorEmail}</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">{selectedNotification.title}</h4>
                  <p className="text-muted-foreground">{selectedNotification.subject}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Descricao</h4>
                  <p className="text-sm">{selectedNotification.description}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Fundamentacao Legal</h4>
                  <p className="text-sm italic">{selectedNotification.legalBasis}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Acao Requerida</h4>
                  <p className="text-sm">{selectedNotification.demandedAction}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Valor Total
                  </h4>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedNotification.totalAmount)}
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Prazo
                  </h4>
                  <p className="text-xl font-bold">
                    {formatDate(selectedNotification.deadlineDate)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ({selectedNotification.deadlineDays} dias)
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-semibold">Linha do Tempo</h4>
                <div className="space-y-1 text-sm">
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

      {/* Sign Modal */}
      <Dialog open={showSignModal} onOpenChange={setShowSignModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assinar Notificacao</DialogTitle>
            <DialogDescription>
              Sua assinatura tem valor juridico e sera registrada com data, hora, IP e geolocalizacao
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tipo de Assinatura</Label>
              <Select
                value={signData.signerType}
                onValueChange={(v: any) => setSignData({ ...signData, signerType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="creditor">Credor (Notificante)</SelectItem>
                  <SelectItem value="debtor">Devedor (Notificado)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Assinatura</Label>
              <div className="border rounded-lg p-2 bg-white">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    width: 400,
                    height: 150,
                    className: 'signature-canvas',
                  }}
                />
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={() => signatureRef.current?.clear()}
              >
                Limpar
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="geoConsent"
                checked={signData.geoConsent}
                onChange={(e) => setSignData({ ...signData, geoConsent: e.target.checked })}
              />
              <Label htmlFor="geoConsent" className="text-sm">
                Autorizo a captura da minha localizacao para fins de validacao juridica
              </Label>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Ao assinar, voce declara ciencia do conteudo desta notificacao e aceita
                que esta assinatura tem validade juridica equivalente a uma assinatura fisica.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSign} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assinar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forward to Judicial Modal */}
      <Dialog open={showJudicialModal} onOpenChange={setShowJudicialModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Encaminhar ao Judicial
            </DialogTitle>
            <DialogDescription>
              Esta notificacao sera marcada como encaminhada ao processo judicial
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Numero do Processo</Label>
              <Input
                value={judicialData.judicialProcessNumber}
                onChange={(e) => setJudicialData({ ...judicialData, judicialProcessNumber: e.target.value })}
                placeholder="0000000-00.0000.0.00.0000"
              />
            </div>
            <div>
              <Label>Tribunal/Comarca</Label>
              <Input
                value={judicialData.judicialCourt}
                onChange={(e) => setJudicialData({ ...judicialData, judicialCourt: e.target.value })}
                placeholder="Ex: 1a Vara Civel de Sao Paulo"
              />
            </div>
            <div>
              <Label>Observacoes</Label>
              <Textarea
                value={judicialData.judicialNotes}
                onChange={(e) => setJudicialData({ ...judicialData, judicialNotes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJudicialModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleForwardToJudicial} disabled={saving} variant="destructive">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Encaminhar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Log Modal */}
      <Dialog open={showAuditModal} onOpenChange={setShowAuditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historico de Auditoria
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[400px]">
            {auditLogs.length === 0 ? (
              <p className="text-center text-muted-foreground p-4">
                Nenhum registro de auditoria
              </p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant="outline">{log.action}</Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDateTime(log.performedAt)}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {log.clientIP && <div>IP: {log.clientIP}</div>}
                      </div>
                    </div>
                    {log.details && (
                      <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
