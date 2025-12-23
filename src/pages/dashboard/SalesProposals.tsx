import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import apiClient from '../../api/client';
import { toast } from 'sonner';
import {
  FileText, Plus, Search, Send, Eye, Edit,
  CheckCircle, XCircle, AlertCircle,
  Building2, Download, Copy
} from 'lucide-react';

interface Proposal {
  id: string;
  prospectId: string;
  prospectName: string;
  title: string;
  planType: 'starter' | 'business' | 'premium' | 'enterprise';
  value: number;
  discount: number;
  finalValue: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'archived';
  validUntil: string;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt?: string;
  ownerName?: string;
  followUpDate?: string | null;
  stage?: 'lead' | 'proposal' | 'negotiation' | 'won' | 'lost' | 'archived';
  items: ProposalItem[];
}

interface ProposalItem {
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

const statusConfig = {
  draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800', icon: Edit },
  sent: { label: 'Enviada', color: 'bg-blue-100 text-blue-800', icon: Send },
  viewed: { label: 'Visualizada', color: 'bg-yellow-100 text-yellow-800', icon: Eye },
  accepted: { label: 'Ganha', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Perdida', color: 'bg-red-100 text-red-800', icon: XCircle },
  expired: { label: 'Expirada', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  archived: { label: 'Arquivada', color: 'bg-gray-200 text-gray-700', icon: AlertCircle },
};

const planConfig = {
  starter: { label: 'Starter', color: 'bg-gray-100 text-gray-800', value: 800 },
  business: { label: 'Business', color: 'bg-blue-100 text-blue-800', value: 1500 },
  premium: { label: 'Premium', color: 'bg-purple-100 text-purple-800', value: 2500 },
  enterprise: { label: 'Enterprise', color: 'bg-emerald-100 text-emerald-800', value: 5000 },
};

const stageConfig: Record<string, string> = {
  draft: 'proposal',
  sent: 'proposal',
  viewed: 'negotiation',
  accepted: 'won',
  rejected: 'lost',
  expired: 'lost',
  archived: 'archived',
};

export function SalesProposals() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProspectId, setSelectedProspectId] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('starter');
  const [detailTab, setDetailTab] = useState<'summary' | 'items' | 'documents' | 'history' | 'followups'>('summary');
  const [monthlyPrice, setMonthlyPrice] = useState<number>(planConfig.starter.value);
  const [setupFee, setSetupFee] = useState<number>(0);
  const [contractTerm, setContractTerm] = useState<string>('monthly');
  const [scopeModules, setScopeModules] = useState<string[]>([]);
  const [followUpDate, setFollowUpDate] = useState<string>('');

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['sales-proposals'],
    queryFn: async () => {
      const response = await apiClient.get('/sales-rep/proposals');
      return response.data || [];
    },
  });

  const { data: prospects = [] } = useQuery({
    queryKey: ['sales-prospects'],
    queryFn: async () => {
      const response = await apiClient.get('/sales-rep/prospects');
      return response.data || [];
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('pt-BR');
  };

  const getProposalCode = (proposal: Proposal) => {
    const year = new Date(proposal.createdAt || Date.now()).getFullYear();
    const seed = String(proposal.id || Math.random().toString(36).substring(2, 8));
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const hash = (s: string) => s.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const makeSeg = (offset: number) => {
      let n = hash(seed + offset);
      let out = '';
      for (let i = 0; i < 4; i++) {
        out += chars[n % chars.length];
        n = Math.floor(n / chars.length) || hash(out + i);
      }
      return out;
    };
    return `MR3X-PRO-${year}-${makeSeg(1)}-${makeSeg(2)}`;
  };

  const buildNotes = (base: string, extras: { setupFee?: number; contractTerm?: string; modules?: string[]; followUpDate?: string }) => {
    const parts: string[] = [];
    if (base) parts.push(base);
    if (extras.setupFee && extras.setupFee > 0) parts.push(`Setup: R$ ${extras.setupFee.toLocaleString('pt-BR')}`);
    if (extras.contractTerm) parts.push(`Contrato: ${extras.contractTerm}`);
    if (extras.modules && extras.modules.length > 0) parts.push(`Escopo: ${extras.modules.join(', ')}`);
    if (extras.followUpDate) parts.push(`Follow-up: ${formatDate(extras.followUpDate)}`);
    return parts.join('\n');
  };

  const createProposalMutation = useMutation({
    mutationFn: async (data: { prospectId: string; title: string; planType: string; value: number; discount: number; validUntil: string; notes?: string; send?: boolean }) => {
      const response = await apiClient.post('/sales-rep/proposals', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-proposals'] });
      setShowAddModal(false);
      setSelectedProspectId('');
      setSelectedPlan('starter');
      toast.success('Proposta criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao criar proposta');
    },
  });

  const updateProposalMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { title: string; planType: string; value: number; discount: number; validUntil: string; notes?: string } }) => {
      const response = await apiClient.put(`/sales-rep/proposals/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-proposals'] });
      setShowEditModal(false);
      setSelectedProposal(null);
      toast.success('Proposta atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao atualizar proposta');
    },
  });

  const sendProposalMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/sales-rep/proposals/${id}/send`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-proposals'] });
      toast.success('Proposta enviada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao enviar proposta');
    },
  });

  const filteredProposals = proposals.filter((proposal: Proposal) => {
    const code = getProposalCode(proposal);
    const matchesSearch =
      proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.prospectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || proposal.status === statusFilter;
    const matchesPlan = planFilter === 'all' || proposal.planType === planFilter;
    const matchesOwner = ownerFilter === 'all' || proposal.ownerName === ownerFilter;
    const matchesDateRange = true;
    return matchesSearch && matchesStatus && matchesPlan && matchesOwner && matchesDateRange;
  });

  const getStatusBadge = (status: Proposal['status']) => {
    const config = statusConfig[status];
    if (!config) {
      // Fallback for unknown statuses
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
          <Edit className="w-3 h-3" />
          {status || 'Desconhecido'}
        </span>
      );
    }
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const getStageBadge = (proposal: Proposal) => {
    const stage = proposal.stage || stageConfig[proposal.status] || 'proposal';
    const stageLabelMap: Record<string, string> = {
      lead: 'Lead',
      proposal: 'Proposta',
      negotiation: 'Negociação',
      won: 'Ganho',
      lost: 'Perdido',
      archived: 'Arquivado',
    };
    const colorMap: Record<string, string> = {
      lead: 'bg-gray-100 text-gray-800',
      proposal: 'bg-blue-100 text-blue-800',
      negotiation: 'bg-orange-100 text-orange-800',
      won: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800',
      archived: 'bg-gray-200 text-gray-700',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${colorMap[stage] || 'bg-gray-100 text-gray-800'}`}>
        {stageLabelMap[stage] || stage}
      </span>
    );
  };

  const getPlanBadge = (plan: Proposal['planType']) => {
    const config = planConfig[plan];
    if (!config) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
          {plan || 'Desconhecido'}
        </span>
      );
    }
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  const handleEditProposal = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setSelectedProspectId(proposal.prospectId);
    setSelectedPlan(proposal.planType);
    setMonthlyPrice(proposal.value || planConfig[proposal.planType as keyof typeof planConfig]?.value || 0);
    setSetupFee(0);
    setContractTerm('monthly');
    setScopeModules([]);
    setFollowUpDate(proposal.followUpDate || '');
    setShowEditModal(true);
  };

  const handleCopyProposal = async (proposal: Proposal) => {
    try {
      const newTitle = `${proposal.title} (Cópia)`;
      const planValue = planConfig[proposal.planType as keyof typeof planConfig]?.value || proposal.value;
      
      await createProposalMutation.mutateAsync({
        prospectId: proposal.prospectId,
        title: newTitle,
        planType: proposal.planType,
        value: planValue,
        discount: proposal.discount,
        validUntil: proposal.validUntil,
        notes: proposal.notes || undefined,
        send: false,
      });
      
      toast.success('Proposta copiada com sucesso!');
    } catch (error) {
      // Error is already handled by onError callback
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = {
    total: proposals.length,
    draft: proposals.filter((p: Proposal) => p.status === 'draft').length,
    sent: proposals.filter((p: Proposal) => p.status === 'sent').length,
    viewed: proposals.filter((p: Proposal) => p.status === 'viewed').length,
    accepted: proposals.filter((p: Proposal) => p.status === 'accepted').length,
    rejected: proposals.filter((p: Proposal) => p.status === 'rejected').length,
    totalValue: proposals
      .filter((p: Proposal) => p.status === 'accepted')
      .reduce((sum: number, p: Proposal) => sum + p.finalValue, 0),
  };

  return (
    <div className="space-y-6">
      {}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <FileText className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold">Propostas</h1>
          </div>
          <p className="text-muted-foreground mt-1">Gerencie suas propostas comerciais</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Proposta
        </Button>
      </div>

      {}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className={statusFilter === 'draft' ? 'ring-2 ring-primary' : ''}>
          <CardContent className="p-4 cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'draft' ? 'all' : 'draft')}>
            <p className="text-sm text-muted-foreground">Rascunhos</p>
            <p className="text-2xl font-bold">{stats.draft}</p>
          </CardContent>
        </Card>
        <Card className={statusFilter === 'sent' ? 'ring-2 ring-primary' : ''}>
          <CardContent className="p-4 cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'sent' ? 'all' : 'sent')}>
            <p className="text-sm text-muted-foreground">Enviadas</p>
            <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card className={statusFilter === 'viewed' ? 'ring-2 ring-primary' : ''}>
          <CardContent className="p-4 cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'viewed' ? 'all' : 'viewed')}>
            <p className="text-sm text-muted-foreground">Visualizadas</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.viewed}</p>
          </CardContent>
        </Card>
        <Card className={statusFilter === 'accepted' ? 'ring-2 ring-primary' : ''}>
          <CardContent className="p-4 cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'accepted' ? 'all' : 'accepted')}>
            <p className="text-sm text-muted-foreground">Aceitas</p>
            <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
          </CardContent>
        </Card>
        <Card className={statusFilter === 'rejected' ? 'ring-2 ring-primary' : ''}>
          <CardContent className="p-4 cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}>
            <p className="text-sm text-muted-foreground">Rejeitadas</p>
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Valor Fechado</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(stats.totalValue)}</p>
          </CardContent>
        </Card>
      </div>

      {}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, título ou prospect..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Planos</SelectItem>
                  {Object.entries(planConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Owners</SelectItem>
                  {[...new Set(proposals.map((p: Proposal) => p.ownerName).filter(Boolean))].map((owner) => (
                    <SelectItem key={owner as string} value={owner as string}>
                      {owner as string}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Propostas ({filteredProposals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Token</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Proposta</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Prospect/Agência</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Plano</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Valor mensal</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Etapa</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Owner</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Última atualização</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Próx. follow-up</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProposals.map((proposal: Proposal) => {
                  const lastUpdate = proposal.respondedAt || proposal.viewedAt || proposal.sentAt || proposal.updatedAt || proposal.createdAt;
                  const followUpDate = proposal.followUpDate;
                  const overdueFollowUp = followUpDate ? new Date(followUpDate) < new Date() : false;
                  const expiringSoon = proposal.validUntil && new Date(proposal.validUntil) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) && proposal.status !== 'accepted';
                  return (
                    <tr key={proposal.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="text-xs font-mono text-muted-foreground">{getProposalCode(proposal)}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-sm truncate">{proposal.title}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{proposal.prospectName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{getPlanBadge(proposal.planType)}</td>
                      <td className="py-3 px-4">
                        <div>
                          {proposal.discount > 0 && (
                            <p className="text-xs text-muted-foreground line-through">{formatCurrency(proposal.value)}</p>
                          )}
                          <p className="font-medium">{formatCurrency(proposal.finalValue)}</p>
                          {proposal.discount > 0 && (
                            <p className="text-xs text-green-600">-{proposal.discount}%</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(proposal.status)}</td>
                      <td className="py-3 px-4">{getStageBadge(proposal)}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {proposal.ownerName || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDate(lastUpdate)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {followUpDate ? (
                          <span className={`px-2 py-1 rounded-full text-xs ${overdueFollowUp ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {overdueFollowUp ? 'Atrasado' : 'Agendado'} • {formatDate(followUpDate)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                        {expiringSoon && (
                          <div className="text-xs text-orange-600 mt-1">Expira em breve</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedProposal(proposal);
                              setDetailTab('summary');
                              setShowDetailModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyProposal(proposal)}
                            title="Copiar proposta"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          {proposal.status === 'draft' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditProposal(proposal)}
                                title="Editar proposta"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => sendProposalMutation.mutate(proposal.id)}
                                title="Enviar proposta"
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filteredProposals.map((proposal: Proposal) => {
              const followUpDate = proposal.followUpDate;
              const overdueFollowUp = followUpDate ? new Date(followUpDate) < new Date() : false;
              const expiringSoon = proposal.validUntil && new Date(proposal.validUntil) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) && proposal.status !== 'accepted';
              return (
                <div key={proposal.id} className="border rounded-lg p-4 shadow-sm bg-white">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-muted-foreground break-all">{getProposalCode(proposal)}</p>
                      <p className="font-semibold text-sm break-words">{proposal.title}</p>
                      <p className="text-xs text-muted-foreground">Criado em {formatDate(proposal.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {getStatusBadge(proposal.status)}
                      {getStageBadge(proposal)}
                    </div>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="break-words">{proposal.prospectName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Plano:</span>
                      {getPlanBadge(proposal.planType)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Valor:</span>
                      <span className="font-medium">{formatCurrency(proposal.finalValue)}</span>
                    </div>
                    {proposal.ownerName && (
                      <div className="text-xs text-muted-foreground">Owner: {proposal.ownerName}</div>
                    )}
                    {followUpDate && (
                      <div className={`text-xs ${overdueFollowUp ? 'text-red-600' : 'text-blue-700'}`}>
                        {overdueFollowUp ? 'Follow-up atrasado' : 'Follow-up agendado'} • {formatDate(followUpDate)}
                      </div>
                    )}
                    {expiringSoon && (
                      <div className="text-xs text-orange-600">Expira em breve</div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedProposal(proposal);
                        setDetailTab('summary');
                        setShowDetailModal(true);
                      }}
                    >
                      Detalhes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleCopyProposal(proposal)}
                    >
                      Copiar
                    </Button>
                    {proposal.status === 'draft' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEditProposal(proposal)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => sendProposalMutation.mutate(proposal.id)}
                        >
                          Enviar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProposals.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma proposta encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowAddModal(false);
            setSelectedProspectId('');
            setSelectedPlan('starter');
          }}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Nova Proposta</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const title = formData.get('title') as string;
                const discount = Number(formData.get('discount') || 0);
                const validUntil = formData.get('validUntil') as string;
                const notes = formData.get('notes') as string;

                if (!selectedProspectId || !title || !validUntil) {
                  alert('Por favor, preencha todos os campos obrigatórios');
                  return;
                }

                const planValue = monthlyPrice || planConfig[selectedPlan as keyof typeof planConfig]?.value || 0;
                const notesCombined = buildNotes(notes || '', {
                  setupFee,
                  contractTerm,
                  modules: scopeModules,
                  followUpDate,
                });

                createProposalMutation.mutate({
                  prospectId: selectedProspectId,
                  title,
                  planType: selectedPlan,
                  value: planValue,
                  discount,
                  validUntil,
                  notes: notesCombined || undefined,
                  send: false,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">Prospect *</label>
                <Select value={selectedProspectId} onValueChange={setSelectedProspectId} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um prospect" />
                  </SelectTrigger>
                  <SelectContent>
                    {prospects.map((prospect: any) => (
                      <SelectItem key={prospect.id} value={prospect.id}>
                        {prospect.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Título *</label>
                <Input name="title" placeholder="Ex: Proposta Plano Premium - Nome da Agência" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Plano *</label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter - R$ {planConfig.starter.value.toLocaleString('pt-BR')}/mês</SelectItem>
                      <SelectItem value="business">Business - R$ {planConfig.business.value.toLocaleString('pt-BR')}/mês</SelectItem>
                      <SelectItem value="premium">Premium - R$ {planConfig.premium.value.toLocaleString('pt-BR')}/mês</SelectItem>
                      <SelectItem value="enterprise">Enterprise - R$ {planConfig.enterprise.value.toLocaleString('pt-BR')}/mês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Desconto (%)</label>
                  <Input name="discount" type="number" min="0" max="50" defaultValue="0" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Válido até *</label>
                <Input name="validUntil" type="date" required />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Observações</label>
                <textarea
                  name="notes"
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                  rows={3}
                  placeholder="Condições especiais, observações..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedProspectId('');
                    setSelectedPlan('starter');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget.closest('form');
                    if (!form) return;
                    const formData = new FormData(form);
                    const title = formData.get('title') as string;
                    const discount = Number(formData.get('discount') || 0);
                    const validUntil = formData.get('validUntil') as string;
                    const notes = formData.get('notes') as string;

                    if (!selectedProspectId || !title || !validUntil) {
                      alert('Por favor, preencha todos os campos obrigatórios');
                      return;
                    }

                    const planValue = planConfig[selectedPlan as keyof typeof planConfig]?.value || 0;

                    createProposalMutation.mutate({
                      prospectId: selectedProspectId,
                      title,
                      planType: selectedPlan,
                      value: planValue,
                      discount,
                      validUntil,
                      notes: notes || undefined,
                      send: false,
                    });
                  }}
                  disabled={createProposalMutation.isPending}
                >
                  Salvar Rascunho
                </Button>
                <Button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget.closest('form');
                    if (!form) return;
                    const formData = new FormData(form);
                    const title = formData.get('title') as string;
                    const discount = Number(formData.get('discount') || 0);
                    const validUntil = formData.get('validUntil') as string;
                    const notes = formData.get('notes') as string;

                    if (!selectedProspectId || !title || !validUntil) {
                      alert('Por favor, preencha todos os campos obrigatórios');
                      return;
                    }

                    const planValue = planConfig[selectedPlan as keyof typeof planConfig]?.value || 0;

                    try {
                      const result = await createProposalMutation.mutateAsync({
                        prospectId: selectedProspectId,
                        title,
                        planType: selectedPlan,
                        value: planValue,
                        discount,
                        validUntil,
                        notes: notes || undefined,
                        send: false,
                      });
                      
                      // After creating, send the proposal
                      if (result?.id) {
                        await sendProposalMutation.mutateAsync(result.id);
                      }
                    } catch (error) {
                      // Error is already handled by onError callbacks
                    }
                  }}
                  disabled={createProposalMutation.isPending || sendProposalMutation.isPending}
                >
                  {createProposalMutation.isPending || sendProposalMutation.isPending ? 'Criando...' : 'Criar e Enviar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {showEditModal && selectedProposal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowEditModal(false);
            setSelectedProposal(null);
          }}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Editar Proposta</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const title = formData.get('title') as string;
                const discount = Number(formData.get('discount') || 0);
                const validUntil = formData.get('validUntil') as string;
                const notes = formData.get('notes') as string;

                if (!title || !validUntil) {
                  toast.error('Por favor, preencha todos os campos obrigatórios');
                  return;
                }

                const planValue = monthlyPrice || planConfig[selectedPlan as keyof typeof planConfig]?.value || selectedProposal.value;
                const notesCombined = buildNotes(notes || '', {
                  setupFee,
                  contractTerm,
                  modules: scopeModules,
                  followUpDate,
                });

                updateProposalMutation.mutate({
                  id: selectedProposal.id,
                  data: {
                    title,
                    planType: selectedPlan,
                    value: planValue,
                    discount,
                    validUntil,
                    notes: notesCombined || undefined,
                  },
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">Prospect *</label>
                <Select value={selectedProspectId} onValueChange={setSelectedProspectId} disabled>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um prospect" />
                  </SelectTrigger>
                  <SelectContent>
                    {prospects.map((prospect: any) => (
                      <SelectItem key={prospect.id} value={prospect.id}>
                        {prospect.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">O prospect não pode ser alterado</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Título *</label>
                <Input 
                  name="title" 
                  defaultValue={selectedProposal.title}
                  placeholder="Ex: Proposta Plano Premium - Nome da Agência" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Plano *</label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter - R$ {planConfig.starter.value.toLocaleString('pt-BR')}/mês</SelectItem>
                      <SelectItem value="business">Business - R$ {planConfig.business.value.toLocaleString('pt-BR')}/mês</SelectItem>
                      <SelectItem value="premium">Premium - R$ {planConfig.premium.value.toLocaleString('pt-BR')}/mês</SelectItem>
                      <SelectItem value="enterprise">Enterprise - R$ {planConfig.enterprise.value.toLocaleString('pt-BR')}/mês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Desconto (%)</label>
                  <Input 
                    name="discount" 
                    type="number" 
                    min="0" 
                    max="50" 
                    defaultValue={selectedProposal.discount} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Válido até *</label>
                  <Input 
                    name="validUntil" 
                    type="date" 
                    defaultValue={selectedProposal.validUntil.split('T')[0]}
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Follow-up</label>
                  <Input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Preço mensal (R$)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Setup (R$)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={setupFee}
                    onChange={(e) => setSetupFee(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Prazo contratual</label>
                  <Select value={contractTerm} onValueChange={setContractTerm}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Prazo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="annual">Anual</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Escopo (módulos)</label>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    {['Contratos', 'Imóveis', 'Inquilinos', 'Vistorias', 'Notificações/Acordos', 'Assinatura Digital', 'Relatórios/Billing', 'API/Integrações'].map((m) => (
                      <label key={m} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={scopeModules.includes(m)}
                          onChange={(e) => {
                            if (e.target.checked) setScopeModules([...scopeModules, m]);
                            else setScopeModules(scopeModules.filter((x) => x !== m));
                          }}
                        />
                        {m}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Observações</label>
                <textarea
                  name="notes"
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                  rows={4}
                  placeholder="Condições especiais, observações..."
                  defaultValue={selectedProposal.notes || ''}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedProposal(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateProposalMutation.isPending}
                >
                  {updateProposalMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {showDetailModal && selectedProposal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{selectedProposal.title}</h2>
                <p className="text-xs text-muted-foreground font-mono">{getProposalCode(selectedProposal)}</p>
                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                  <Building2 className="w-4 h-4" />
                  {selectedProposal.prospectName}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap gap-2">
                  {getPlanBadge(selectedProposal.planType)}
                  {getStatusBadge(selectedProposal.status)}
                  {getStageBadge(selectedProposal)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Owner: {selectedProposal.ownerName || '-'}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              {[
                { key: 'summary', label: 'Resumo' },
                { key: 'items', label: 'Itens / Escopo' },
                { key: 'documents', label: 'Documentos' },
                { key: 'history', label: 'Histórico' },
                { key: 'followups', label: 'Follow-ups' },
              ].map((tab) => (
                <Button
                  key={tab.key}
                  variant={detailTab === tab.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDetailTab(tab.key as typeof detailTab)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {detailTab === 'summary' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Valor Original</p>
                    <p className="text-xl font-bold">{formatCurrency(selectedProposal.value)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Desconto</p>
                    <p className="text-xl font-bold text-green-600">{selectedProposal.discount}%</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Valor Final</p>
                    <p className="text-xl font-bold text-emerald-600">{formatCurrency(selectedProposal.finalValue)}</p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedProposal.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Etapa</p>
                    <div className="mt-1">{getStageBadge(selectedProposal)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Válida até</p>
                    <p className={`text-sm ${isExpired(selectedProposal.validUntil) && selectedProposal.status !== 'accepted' ? 'text-red-600' : 'text-gray-700'}`}>
                      {formatDate(selectedProposal.validUntil)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Próx. follow-up</p>
                    <p className="text-sm">{selectedProposal.followUpDate ? formatDate(selectedProposal.followUpDate) : '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Notas (internas)</p>
                    <p className="text-sm whitespace-pre-wrap bg-yellow-50 rounded-lg p-3">
                      {selectedProposal.notes || 'Nenhuma nota'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'items' && (
              <div className="space-y-3">
                {selectedProposal.items && selectedProposal.items.length > 0 ? (
                  selectedProposal.items.map((item, idx) => (
                    <div key={idx} className="p-3 border rounded-lg bg-gray-50">
                      <p className="font-medium text-sm">{item.name}</p>
                      {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        Quantidade: {item.quantity} • Valor: {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
                )}
              </div>
            )}

            {detailTab === 'documents' && (
              <div className="p-4 border rounded-lg bg-gray-50 text-sm text-muted-foreground">
                Nenhum documento enviado. (Upload/versões não disponíveis nesta versão)
              </div>
            )}

            {detailTab === 'history' && (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">Criada</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(selectedProposal.createdAt)}</p>
                </div>
                {selectedProposal.sentAt && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium">Enviada</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(selectedProposal.sentAt)}</p>
                  </div>
                )}
                {selectedProposal.viewedAt && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium">Visualizada</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(selectedProposal.viewedAt)}</p>
                  </div>
                )}
                {selectedProposal.respondedAt && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium">Resposta</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(selectedProposal.respondedAt)}</p>
                  </div>
                )}
              </div>
            )}

            {detailTab === 'followups' && (
              <div className="p-4 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium mb-1">Follow-up</p>
                <p className="text-muted-foreground">
                  Próxima data: {selectedProposal.followUpDate ? formatDate(selectedProposal.followUpDate) : '-'}
                </p>
                <p className="text-muted-foreground text-xs mt-1">Notas de follow-up não estão disponíveis nesta versão.</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t mt-4">
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Fechar
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              {selectedProposal.status === 'draft' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDetailModal(false);
                      handleEditProposal(selectedProposal);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button onClick={() => sendProposalMutation.mutate(selectedProposal.id)}>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Proposta
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
