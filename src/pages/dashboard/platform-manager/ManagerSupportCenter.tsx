import { useState } from 'react';
import {
  Search, Clock, CheckCircle, AlertCircle,
  User, ChevronRight, Send, Users
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';

// Mock tickets data
const tickets = [
  {
    id: 'TKT-001234',
    subject: 'Problema ao gerar contrato PDF',
    description: 'Ao tentar gerar o PDF do contrato, o sistema retorna erro 500.',
    agency: 'Imobiliária Sol Nascente',
    requester: 'João Silva',
    requesterEmail: 'joao@solnascente.com.br',
    status: 'open',
    priority: 'high',
    category: 'Bug',
    assignedTo: null,
    createdAt: '2024-12-03 09:15:00',
    updatedAt: '2024-12-03 09:15:00',
    messages: [
      {
        id: 1,
        sender: 'João Silva',
        senderType: 'client',
        message: 'Ao tentar gerar o PDF do contrato, o sistema retorna erro 500. Já tentei em diferentes navegadores mas o problema persiste.',
        timestamp: '2024-12-03 09:15:00',
      },
    ],
  },
  {
    id: 'TKT-001233',
    subject: 'Dúvida sobre integração com Asaas',
    description: 'Preciso de ajuda para configurar a integração com o Asaas.',
    agency: 'ABC Imóveis',
    requester: 'Maria Santos',
    requesterEmail: 'maria@abcimoveis.com',
    status: 'in_progress',
    priority: 'medium',
    category: 'Integração',
    assignedTo: 'Carlos Admin',
    createdAt: '2024-12-02 14:30:00',
    updatedAt: '2024-12-03 10:20:00',
    messages: [
      {
        id: 1,
        sender: 'Maria Santos',
        senderType: 'client',
        message: 'Preciso de ajuda para configurar a integração com o Asaas. Onde encontro as configurações?',
        timestamp: '2024-12-02 14:30:00',
      },
      {
        id: 2,
        sender: 'Carlos Admin',
        senderType: 'support',
        message: 'Olá Maria! Para configurar a integração com o Asaas, vá em Configurações > Integrações > Asaas. Lá você encontrará o campo para inserir sua API Key.',
        timestamp: '2024-12-02 15:45:00',
      },
      {
        id: 3,
        sender: 'Maria Santos',
        senderType: 'client',
        message: 'Obrigada! Consegui encontrar, mas quando insiro a API Key aparece uma mensagem de erro.',
        timestamp: '2024-12-03 10:20:00',
      },
    ],
  },
  {
    id: 'TKT-001232',
    subject: 'Solicitação de novo recurso',
    description: 'Gostaríamos de ter a opção de enviar lembretes automáticos.',
    agency: 'Prime Realty',
    requester: 'Pedro Oliveira',
    requesterEmail: 'pedro@primerealty.com.br',
    status: 'closed',
    priority: 'low',
    category: 'Feature Request',
    assignedTo: 'Ana Suporte',
    createdAt: '2024-11-28 11:00:00',
    updatedAt: '2024-12-01 16:30:00',
    messages: [
      {
        id: 1,
        sender: 'Pedro Oliveira',
        senderType: 'client',
        message: 'Seria muito útil ter a opção de enviar lembretes automáticos de pagamento para os inquilinos.',
        timestamp: '2024-11-28 11:00:00',
      },
      {
        id: 2,
        sender: 'Ana Suporte',
        senderType: 'support',
        message: 'Olá Pedro! Obrigada pela sugestão. Já temos essa funcionalidade no roadmap e está prevista para o próximo trimestre.',
        timestamp: '2024-11-29 09:15:00',
      },
      {
        id: 3,
        sender: 'Pedro Oliveira',
        senderType: 'client',
        message: 'Ótimo! Aguardo ansiosamente. Podem fechar o ticket.',
        timestamp: '2024-12-01 16:30:00',
      },
    ],
  },
  {
    id: 'TKT-001231',
    subject: 'Erro ao cadastrar imóvel',
    description: 'O formulário trava ao tentar salvar uma nova imóvel.',
    agency: 'Casa Nova Imóveis',
    requester: 'Ana Lima',
    requesterEmail: 'ana@casanova.com',
    status: 'open',
    priority: 'high',
    category: 'Bug',
    assignedTo: null,
    createdAt: '2024-12-03 08:45:00',
    updatedAt: '2024-12-03 08:45:00',
    messages: [
      {
        id: 1,
        sender: 'Ana Lima',
        senderType: 'client',
        message: 'Quando tento cadastrar uma nova imóvel, o formulário trava após clicar em salvar. Já tentei várias vezes.',
        timestamp: '2024-12-03 08:45:00',
      },
    ],
  },
];

const internalTeam = [
  { id: 1, name: 'Carlos Admin', role: 'Administrador', available: true },
  { id: 2, name: 'Ana Suporte', role: 'Suporte', available: true },
  { id: 3, name: 'Roberto Tech', role: 'Técnico', available: false },
  { id: 4, name: 'Juliana Atendimento', role: 'Atendimento', available: true },
];

export function ManagerSupportCenter() {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<typeof tickets[0] | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [activeTab, setActiveTab] = useState('open');

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.agency.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;

    // Tab filter
    if (activeTab === 'open') return matchesSearch && matchesPriority && ticket.status === 'open';
    if (activeTab === 'in_progress') return matchesSearch && matchesPriority && ticket.status === 'in_progress';
    if (activeTab === 'closed') return matchesSearch && matchesPriority && ticket.status === 'closed';
    return matchesSearch && matchesPriority;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-red-100 text-red-700">Aberto</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-700">Em Progresso</Badge>;
      case 'closed':
        return <Badge className="bg-green-100 text-green-700">Fechado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-100 text-red-700">Alta</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-700">Média</Badge>;
      case 'low':
        return <Badge className="bg-blue-100 text-blue-700">Baixa</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const openDetails = (ticket: typeof tickets[0]) => {
    setSelectedTicket(ticket);
    setDetailsOpen(true);
  };

  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const closedCount = tickets.filter(t => t.status === 'closed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Central de Suporte</h1>
        <p className="text-muted-foreground">Gerencie tickets e atendimento ao cliente</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openCount}</p>
                <p className="text-sm text-muted-foreground">Abertos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressCount}</p>
                <p className="text-sm text-muted-foreground">Em Progresso</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{closedCount}</p>
                <p className="text-sm text-muted-foreground">Fechados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{internalTeam.filter(t => t.available).length}</p>
                <p className="text-sm text-muted-foreground">Equipe Disponível</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="open">
            Abertos ({openCount})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            Em Progresso ({inProgressCount})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Fechados ({closedCount})
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por assunto, agência ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Prioridades</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tickets List */}
        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tickets</CardTitle>
              <CardDescription>{filteredTickets.length} tickets encontrados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => openDetails(ticket)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono text-muted-foreground">{ticket.id}</span>
                        {getPriorityBadge(ticket.priority)}
                        <Badge variant="outline">{ticket.category}</Badge>
                      </div>
                      <p className="font-medium truncate">{ticket.subject}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{ticket.agency}</span>
                        <span>•</span>
                        <span>{ticket.requester}</span>
                        <span>•</span>
                        <span>{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {ticket.assignedTo && (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Atribuído a:</p>
                          <p className="text-sm font-medium">{ticket.assignedTo}</p>
                        </div>
                      )}
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
                {filteredTickets.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum ticket encontrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ticket Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-muted-foreground">{selectedTicket?.id}</span>
              {selectedTicket && getStatusBadge(selectedTicket.status)}
              {selectedTicket && getPriorityBadge(selectedTicket.priority)}
            </DialogTitle>
            <DialogDescription>{selectedTicket?.subject}</DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-6 mt-4">
              {/* Ticket Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Agência</p>
                  <p className="font-medium">{selectedTicket.agency}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Solicitante</p>
                  <p className="font-medium">{selectedTicket.requester}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Categoria</p>
                  <p className="font-medium">{selectedTicket.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Atribuído a</p>
                  <p className="font-medium">{selectedTicket.assignedTo || 'Não atribuído'}</p>
                </div>
              </div>

              {/* Assign to Team */}
              {!selectedTicket.assignedTo && selectedTicket.status === 'open' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Atribuir Ticket</CardTitle>
                    <CardDescription>Selecione um membro da equipe para atribuir este ticket</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {internalTeam.filter(t => t.available).map((member) => (
                        <Button
                          key={member.id}
                          variant="outline"
                          className="h-auto py-3 flex flex-col items-center gap-1"
                        >
                          <User className="w-5 h-5" />
                          <span className="font-medium">{member.name}</span>
                          <span className="text-xs text-muted-foreground">{member.role}</span>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Conversation History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Histórico de Conversas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedTicket.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-4 rounded-lg ${
                          message.senderType === 'client'
                            ? 'bg-gray-100 ml-0 mr-12'
                            : 'bg-blue-50 ml-12 mr-0'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{message.sender}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-sm">{message.message}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reply Box */}
                  {selectedTicket.status !== 'closed' && (
                    <div className="mt-6 space-y-3">
                      <Textarea
                        placeholder="Digite sua resposta..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        rows={4}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline">
                          Fechar Ticket
                        </Button>
                        <Button>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar Resposta
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
