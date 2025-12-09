import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import apiClient from '../../api/client';
import {
  Building2, Plus, Search, Phone, Mail, MapPin, Calendar,
  Edit, Eye, MessageSquare, FileText,
  Clock, CheckCircle, XCircle, User
} from 'lucide-react';

interface Prospect {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
  status: 'new' | 'contacted' | 'interested' | 'negotiating' | 'converted' | 'lost';
  notes: string;
  lastContactAt: string;
  createdAt: string;
  source: string;
  estimatedValue: number;
}

const statusConfig = {
  new: { label: 'Novo', color: 'bg-gray-100 text-gray-800', icon: Clock },
  contacted: { label: 'Contatado', color: 'bg-blue-100 text-blue-800', icon: Phone },
  interested: { label: 'Interessado', color: 'bg-yellow-100 text-yellow-800', icon: Eye },
  negotiating: { label: 'Negociando', color: 'bg-purple-100 text-purple-800', icon: MessageSquare },
  converted: { label: 'Convertido', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  lost: { label: 'Perdido', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export function SalesProspects() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ['sales-prospects'],
    queryFn: async () => {
      const response = await apiClient.get('/sales-rep/prospects');
      return response.data || [];
    },
  });

  const createProspectMutation = useMutation({
    mutationFn: async (data: Partial<Prospect>) => {
      const response = await apiClient.post('/sales-rep/prospects', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-prospects'] });
      setShowAddModal(false);
    },
  });

  const filteredProspects = prospects.filter((prospect: Prospect) => {
    const matchesSearch =
      prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || prospect.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: Prospect['status']) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agências (Prospects)</h1>
          <p className="text-muted-foreground">Gerencie suas oportunidades de vendas</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Prospect
        </Button>
      </div>

      {}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = prospects.filter((p: Prospect) => p.status === key).length;
          const Icon = config.icon;
          return (
            <Card
              key={key}
              className={`cursor-pointer transition-all ${statusFilter === key ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{config.label}</span>
                </div>
                <p className="text-2xl font-bold mt-1">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, contato ou cidade..."
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
            <Building2 className="w-5 h-5" />
            Prospects ({filteredProspects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Agência</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Contato</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Localização</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Valor Est.</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Último Contato</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProspects.map((prospect: Prospect) => (
                  <tr key={prospect.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{prospect.name}</p>
                        <p className="text-xs text-muted-foreground">{prospect.source}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm">{prospect.contactName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {prospect.contactEmail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        {prospect.city}, {prospect.state}
                      </div>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(prospect.status)}</td>
                    <td className="py-3 px-4 text-sm">{formatCurrency(prospect.estimatedValue)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(prospect.lastContactAt)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProspect(prospect);
                            setShowDetailModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <FileText className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProspects.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum prospect encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Novo Prospect</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createProspectMutation.mutate({
                  name: formData.get('name') as string,
                  contactName: formData.get('contactName') as string,
                  contactEmail: formData.get('contactEmail') as string,
                  contactPhone: formData.get('contactPhone') as string,
                  address: formData.get('address') as string,
                  city: formData.get('city') as string,
                  state: formData.get('state') as string,
                  source: formData.get('source') as string,
                  estimatedValue: Number(formData.get('estimatedValue')),
                  notes: formData.get('notes') as string,
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome da Agência *</label>
                  <Input name="name" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Origem</label>
                  <select name="source" className="w-full px-3 py-2 border rounded-lg">
                    <option value="Site">Site</option>
                    <option value="Indicação">Indicação</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="Evento">Evento</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome do Contato *</label>
                  <Input name="contactName" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Telefone</label>
                  <Input name="contactPhone" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">E-mail *</label>
                <Input name="contactEmail" type="email" required />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Endereço</label>
                <Input name="address" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Cidade</label>
                  <Input name="city" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Estado</label>
                  <Input name="state" maxLength={2} placeholder="SP" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Valor Estimado (R$)</label>
                <Input name="estimatedValue" type="number" min="0" step="0.01" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notas</label>
                <textarea
                  name="notes"
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createProspectMutation.isPending}>
                  {createProspectMutation.isPending ? 'Salvando...' : 'Salvar Prospect'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {showDetailModal && selectedProspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{selectedProspect.name}</h2>
                <p className="text-muted-foreground">{selectedProspect.source}</p>
              </div>
              {getStatusBadge(selectedProspect.status)}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Contato</p>
                  <p className="font-medium">{selectedProspect.contactName}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {selectedProspect.contactEmail}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      {selectedProspect.contactPhone}
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Localização</p>
                  <p className="font-medium">{selectedProspect.address}</p>
                  <p className="text-sm">{selectedProspect.city}, {selectedProspect.state}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Valor Estimado</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(selectedProspect.estimatedValue)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Criado em</p>
                  <p className="font-medium">{formatDate(selectedProspect.createdAt)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Último Contato</p>
                  <p className="font-medium">{formatDate(selectedProspect.lastContactAt)}</p>
                </div>
              </div>

              {selectedProspect.notes && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Notas</p>
                  <p>{selectedProspect.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t">
                <h3 className="font-medium mb-3">Histórico de Contatos</h3>
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                  <p>Nenhum histórico registrado</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t mt-4">
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Fechar
              </Button>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                Criar Proposta
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
