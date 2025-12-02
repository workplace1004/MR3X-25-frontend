import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import apiClient from '../../api/client';
import {
  Target, Building2, DollarSign, User, Calendar, Clock,
  ArrowRight, MoreVertical, Eye, Edit, Phone, Mail
} from 'lucide-react';

interface PipelineItem {
  id: string;
  prospectName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  stage: 'prospecting' | 'qualification' | 'proposal_sent' | 'negotiation' | 'closed_won' | 'closed_lost';
  value: number;
  probability: number;
  daysInStage: number;
  lastActivity: string;
  nextAction: string;
  nextActionDate: string;
}

const mockPipelineItems: PipelineItem[] = [
  {
    id: '1',
    prospectName: 'Imobiliária Centro',
    contactName: 'João Silva',
    contactEmail: 'joao@imobcentro.com',
    contactPhone: '(11) 99999-1234',
    stage: 'negotiation',
    value: 25000,
    probability: 80,
    daysInStage: 5,
    lastActivity: 'Reunião de negociação',
    nextAction: 'Enviar contrato',
    nextActionDate: '2024-12-05',
  },
  {
    id: '2',
    prospectName: 'Imóveis Premium',
    contactName: 'Maria Santos',
    contactEmail: 'maria@imoveispremium.com',
    contactPhone: '(11) 98888-5678',
    stage: 'proposal_sent',
    value: 18000,
    probability: 60,
    daysInStage: 3,
    lastActivity: 'Proposta enviada',
    nextAction: 'Follow-up por telefone',
    nextActionDate: '2024-12-03',
  },
  {
    id: '3',
    prospectName: 'Casa & Lar Imóveis',
    contactName: 'Pedro Costa',
    contactEmail: 'pedro@casaelar.com',
    contactPhone: '(21) 97777-9012',
    stage: 'qualification',
    value: 12000,
    probability: 40,
    daysInStage: 7,
    lastActivity: 'Ligação de qualificação',
    nextAction: 'Enviar material informativo',
    nextActionDate: '2024-12-02',
  },
  {
    id: '4',
    prospectName: 'Invest Imóveis',
    contactName: 'Ana Oliveira',
    contactEmail: 'ana@investimoveis.com',
    contactPhone: '(31) 96666-3456',
    stage: 'prospecting',
    value: 30000,
    probability: 20,
    daysInStage: 2,
    lastActivity: 'Lead recebido',
    nextAction: 'Primeiro contato',
    nextActionDate: '2024-12-01',
  },
  {
    id: '5',
    prospectName: 'Realty Plus',
    contactName: 'Carlos Mendes',
    contactEmail: 'carlos@realtyplus.com',
    contactPhone: '(41) 95555-7890',
    stage: 'closed_won',
    value: 20000,
    probability: 100,
    daysInStage: 0,
    lastActivity: 'Contrato assinado',
    nextAction: 'Onboarding',
    nextActionDate: '2024-12-01',
  },
  {
    id: '6',
    prospectName: 'Nova Vida Imóveis',
    contactName: 'Fernanda Lima',
    contactEmail: 'fernanda@novavida.com',
    contactPhone: '(51) 94444-1111',
    stage: 'prospecting',
    value: 15000,
    probability: 15,
    daysInStage: 1,
    lastActivity: 'Indicação recebida',
    nextAction: 'Ligar para apresentação',
    nextActionDate: '2024-12-02',
  },
  {
    id: '7',
    prospectName: 'Urban Imóveis',
    contactName: 'Ricardo Gomes',
    contactEmail: 'ricardo@urban.com',
    contactPhone: '(61) 93333-2222',
    stage: 'qualification',
    value: 22000,
    probability: 35,
    daysInStage: 4,
    lastActivity: 'Demo agendada',
    nextAction: 'Realizar demonstração',
    nextActionDate: '2024-12-04',
  },
  {
    id: '8',
    prospectName: 'Premier Realty',
    contactName: 'Lucia Santos',
    contactEmail: 'lucia@premier.com',
    contactPhone: '(71) 92222-3333',
    stage: 'closed_lost',
    value: 28000,
    probability: 0,
    daysInStage: 0,
    lastActivity: 'Negociação encerrada',
    nextAction: '-',
    nextActionDate: '',
  },
];

const stageConfig = {
  prospecting: { label: 'Prospecção', color: 'bg-blue-500', bgLight: 'bg-blue-50', textColor: 'text-blue-700' },
  qualification: { label: 'Qualificação', color: 'bg-yellow-500', bgLight: 'bg-yellow-50', textColor: 'text-yellow-700' },
  proposal_sent: { label: 'Proposta Enviada', color: 'bg-purple-500', bgLight: 'bg-purple-50', textColor: 'text-purple-700' },
  negotiation: { label: 'Negociação', color: 'bg-orange-500', bgLight: 'bg-orange-50', textColor: 'text-orange-700' },
  closed_won: { label: 'Fechado Ganho', color: 'bg-green-500', bgLight: 'bg-green-50', textColor: 'text-green-700' },
  closed_lost: { label: 'Fechado Perdido', color: 'bg-red-500', bgLight: 'bg-red-50', textColor: 'text-red-700' },
};

const stages: Array<keyof typeof stageConfig> = [
  'prospecting',
  'qualification',
  'proposal_sent',
  'negotiation',
  'closed_won',
  'closed_lost',
];

export function SalesPipeline() {
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [draggedItem, setDraggedItem] = useState<PipelineItem | null>(null);

  const { data: pipelineItems = mockPipelineItems, isLoading } = useQuery({
    queryKey: ['sales-pipeline'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/sales-rep/pipeline');
        return response.data;
      } catch {
        return mockPipelineItems;
      }
    },
  });

  const moveItemMutation = useMutation({
    mutationFn: async ({ itemId, newStage }: { itemId: string; newStage: string }) => {
      const response = await apiClient.patch(`/sales-rep/pipeline/${itemId}/stage`, { stage: newStage });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStageItems = (stage: string) => {
    return pipelineItems.filter((item: PipelineItem) => item.stage === stage);
  };

  const getStageValue = (stage: string) => {
    return getStageItems(stage).reduce((sum: number, item: PipelineItem) => sum + item.value, 0);
  };

  const _getWeightedValue = (stage: string) => {
    return getStageItems(stage).reduce((sum: number, item: PipelineItem) => sum + (item.value * item.probability / 100), 0);
  };
  void _getWeightedValue; // Marked as intentionally unused

  const handleDragStart = (e: React.DragEvent, item: PipelineItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem.stage !== stage) {
      moveItemMutation.mutate({ itemId: draggedItem.id, newStage: stage });
    }
    setDraggedItem(null);
  };

  // Calculate totals
  const totalValue = pipelineItems.reduce((sum: number, item: PipelineItem) => sum + item.value, 0);
  const totalWeightedValue = pipelineItems.reduce((sum: number, item: PipelineItem) => sum + (item.value * item.probability / 100), 0);
  const activeDeals = pipelineItems.filter((item: PipelineItem) => !['closed_won', 'closed_lost'].includes(item.stage)).length;
  const closedWonValue = getStageValue('closed_won');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Pipeline de Vendas</h1>
        <p className="text-muted-foreground">Visualização Kanban do funil de vendas</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="w-4 h-4" />
              <span className="text-sm">Negócios Ativos</span>
            </div>
            <p className="text-2xl font-bold">{activeDeals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Valor Total Pipeline</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="w-4 h-4" />
              <span className="text-sm">Valor Ponderado</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalWeightedValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Fechado Ganho</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(closedWonValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {stages.map((stage) => {
            const config = stageConfig[stage];
            const items = getStageItems(stage);
            const stageValue = getStageValue(stage);

            return (
              <div
                key={stage}
                className="w-72 flex-shrink-0"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
              >
                {/* Stage Header */}
                <div className={`rounded-t-lg p-3 ${config.bgLight}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${config.color}`} />
                      <span className={`font-medium text-sm ${config.textColor}`}>{config.label}</span>
                    </div>
                    <span className="text-xs bg-white/80 px-2 py-0.5 rounded-full">
                      {items.length}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {formatCurrency(stageValue)}
                  </div>
                </div>

                {/* Cards Container */}
                <div className="bg-gray-100 rounded-b-lg p-2 min-h-[400px] space-y-2">
                  {items.map((item: PipelineItem) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      className={`bg-white rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing border border-transparent hover:border-gray-200 transition-all ${
                        draggedItem?.id === item.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{item.prospectName}</span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowDetailModal(true);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          {item.contactName}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-bold text-green-600">{formatCurrency(item.value)}</span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {item.probability}%
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {item.daysInStage} dias neste estágio
                        </div>

                        {item.nextAction && item.nextAction !== '-' && (
                          <div className="pt-2 border-t">
                            <div className="flex items-center gap-1 text-xs">
                              <ArrowRight className="w-3 h-3 text-orange-500" />
                              <span className="text-orange-600">{item.nextAction}</span>
                            </div>
                            {item.nextActionDate && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(item.nextActionDate).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {items.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum item
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{selectedItem.prospectName}</h2>
                <p className="text-muted-foreground">{selectedItem.contactName}</p>
              </div>
              <span className={`px-3 py-1 text-sm rounded-full ${stageConfig[selectedItem.stage].bgLight} ${stageConfig[selectedItem.stage].textColor}`}>
                {stageConfig[selectedItem.stage].label}
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(selectedItem.value)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Probabilidade</p>
                  <p className="text-xl font-bold text-blue-600">{selectedItem.probability}%</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Contato</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedItem.contactName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedItem.contactEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedItem.contactPhone}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Dias no Estágio</p>
                  <p className="font-medium">{selectedItem.daysInStage}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Última Atividade</p>
                  <p className="font-medium text-sm">{selectedItem.lastActivity}</p>
                </div>
              </div>

              {selectedItem.nextAction && selectedItem.nextAction !== '-' && (
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Próxima Ação</p>
                  <p className="font-medium text-orange-700">{selectedItem.nextAction}</p>
                  {selectedItem.nextActionDate && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Data: {new Date(selectedItem.nextActionDate).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-3">Mover para:</p>
                <div className="flex flex-wrap gap-2">
                  {stages.filter(s => s !== selectedItem.stage).map((stage) => (
                    <Button
                      key={stage}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        moveItemMutation.mutate({ itemId: selectedItem.id, newStage: stage });
                        setShowDetailModal(false);
                      }}
                      className={`${stageConfig[stage].bgLight} ${stageConfig[stage].textColor} border-none`}
                    >
                      {stageConfig[stage].label}
                    </Button>
                  ))}
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
                <Eye className="w-4 h-4 mr-2" />
                Ver Prospect
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
