import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import apiClient from '../../api/client';
import {
  FileText, Plus, Search, Send, Eye, Edit,
  CheckCircle, XCircle, AlertCircle, Calendar,
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
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  validUntil: string;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  notes: string;
  createdAt: string;
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
  accepted: { label: 'Aceita', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejeitada', color: 'bg-red-100 text-red-800', icon: XCircle },
  expired: { label: 'Expirada', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
};

const planConfig = {
  starter: { label: 'Starter', color: 'bg-gray-100 text-gray-800' },
  business: { label: 'Business', color: 'bg-blue-100 text-blue-800' },
  premium: { label: 'Premium', color: 'bg-purple-100 text-purple-800' },
  enterprise: { label: 'Enterprise', color: 'bg-emerald-100 text-emerald-800' },
};

export function SalesProposals() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['sales-proposals'],
    queryFn: async () => {
      const response = await apiClient.get('/sales-rep/proposals');
      return response.data || [];
    },
  });

  const sendProposalMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/sales-rep/proposals/${id}/send`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-proposals'] });
    },
  });

  const filteredProposals = proposals.filter((proposal: Proposal) => {
    const matchesSearch =
      proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.prospectName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || proposal.status === statusFilter;
    return matchesSearch && matchesStatus;
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

  const getStatusBadge = (status: Proposal['status']) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const getPlanBadge = (plan: Proposal['planType']) => {
    const config = planConfig[plan];
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
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
          <h1 className="text-2xl font-bold">Propostas</h1>
          <p className="text-muted-foreground">Gerencie suas propostas comerciais</p>
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
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou prospect..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-background"
            >
              <option value="all">Todos os Status</option>
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Proposta</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Prospect</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Plano</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Valor</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Validade</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProposals.map((proposal: Proposal) => (
                  <tr key={proposal.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-sm">{proposal.title}</p>
                      <p className="text-xs text-muted-foreground">Criada: {formatDate(proposal.createdAt)}</p>
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
                    <td className="py-3 px-4">
                      <div className={`flex items-center gap-1 text-sm ${isExpired(proposal.validUntil) && proposal.status !== 'accepted' ? 'text-red-600' : 'text-muted-foreground'}`}>
                        <Calendar className="w-3 h-3" />
                        {formatDate(proposal.validUntil)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProposal(proposal);
                            setShowDetailModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {proposal.status === 'draft' && (
                          <>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => sendProposalMutation.mutate(proposal.id)}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm">
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Nova Proposta</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Prospect *</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Selecione um prospect</option>
                  <option value="1">Imobiliária Centro</option>
                  <option value="2">Imóveis Premium</option>
                  <option value="3">Casa & Lar Imóveis</option>
                  <option value="4">Invest Imóveis</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Título *</label>
                <Input placeholder="Ex: Proposta Plano Premium - Nome da Agência" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Plano *</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option value="starter">Starter - R$ 800/mês</option>
                    <option value="business">Business - R$ 1.500/mês</option>
                    <option value="premium">Premium - R$ 2.500/mês</option>
                    <option value="enterprise">Enterprise - R$ 5.000/mês</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Desconto (%)</label>
                  <Input type="number" min="0" max="50" defaultValue="0" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Válido até *</label>
                <Input type="date" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Observações</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                  rows={3}
                  placeholder="Condições especiais, observações..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </Button>
                <Button type="button" variant="outline">
                  Salvar Rascunho
                </Button>
                <Button type="submit">
                  Criar e Enviar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {showDetailModal && selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{selectedProposal.title}</h2>
                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                  <Building2 className="w-4 h-4" />
                  {selectedProposal.prospectName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getPlanBadge(selectedProposal.planType)}
                {getStatusBadge(selectedProposal.status)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
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

            <div className="space-y-4 mb-6">
              <h3 className="font-medium">Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Criada</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(selectedProposal.createdAt)}</p>
                  </div>
                </div>
                {selectedProposal.sentAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Send className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Enviada</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(selectedProposal.sentAt)}</p>
                    </div>
                  </div>
                )}
                {selectedProposal.viewedAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Eye className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Visualizada</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(selectedProposal.viewedAt)}</p>
                    </div>
                  </div>
                )}
                {selectedProposal.respondedAt && (
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedProposal.status === 'accepted' ? 'bg-green-100' : 'bg-red-100'}`}>
                      {selectedProposal.status === 'accepted' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{selectedProposal.status === 'accepted' ? 'Aceita' : 'Rejeitada'}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(selectedProposal.respondedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selectedProposal.notes && (
              <div className="p-4 bg-yellow-50 rounded-lg mb-6">
                <p className="text-sm text-muted-foreground mb-1">Observações</p>
                <p>{selectedProposal.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Válida até: {formatDate(selectedProposal.validUntil)}</span>
              </div>
              {isExpired(selectedProposal.validUntil) && selectedProposal.status !== 'accepted' && (
                <span className="text-sm text-red-600 font-medium">Expirada</span>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Fechar
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              {selectedProposal.status === 'draft' && (
                <Button onClick={() => sendProposalMutation.mutate(selectedProposal.id)}>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Proposta
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
