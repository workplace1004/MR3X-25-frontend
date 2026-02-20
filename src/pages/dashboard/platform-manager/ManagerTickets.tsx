import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MessageSquare, Search, Send, StickyNote, BarChart3,
  Clock, CheckCircle, TrendingUp
} from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Textarea } from '../../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import { platformManagerAPI } from '../../../api';

interface AgencyMessage {
  id: string;
  agency: string;
  subject: string;
  lastMessage: string;
  status: string;
  unread: boolean;
  timestamp: string;
}

interface InternalNote {
  id: string;
  title: string;
  content: string;
  priority: string;
  category: string;
  author: string;
  createdAt: string;
}

interface TicketCategory {
  name: string;
  value: number;
  color: string;
}

function ChartContainer({ children, height = 300 }: { children: React.ReactNode; height?: number }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!isMounted) {
    return <div style={{ height }} className="flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function ManagerTickets() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('notes');
  const [newNote, setNewNote] = useState('');

  const { data: internalNotes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['platform-manager', 'internal-notes'],
    queryFn: platformManagerAPI.getInternalNotes,
  });

  const { data: agencyMessages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['platform-manager', 'agency-messages'],
    queryFn: platformManagerAPI.getAgencyMessages,
  });

  const { data: supportMetrics = {}, isLoading: metricsLoading } = useQuery({
    queryKey: ['platform-manager', 'support-metrics'],
    queryFn: platformManagerAPI.getSupportMetrics,
  });

  const { data: ticketsByCategory = [], isLoading: categoryLoading } = useQuery({
    queryKey: ['platform-manager', 'ticket-status'],
    queryFn: platformManagerAPI.getTicketStatusDistribution,
  });

  const { data: ticketsByMonth = [], isLoading: monthlyLoading } = useQuery({
    queryKey: ['platform-manager', 'monthly-tickets'],
    queryFn: platformManagerAPI.getMonthlyTickets,
  });

  const unreadCount = agencyMessages.filter((m: AgencyMessage) => m.unread).length;

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700">Pendente</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-700">Em Andamento</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-700">Resolvido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isLoading = notesLoading || messagesLoading || metricsLoading || categoryLoading || monthlyLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div>
          <Skeleton className="h-8 w-56 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-lg" />
                  <div>
                    <Skeleton className="h-8 w-12 mb-1" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-40 rounded" />
          ))}
        </div>

        {/* New Note Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full rounded mb-4" />
            <div className="flex justify-end">
              <Skeleton className="h-9 w-32 rounded" />
            </div>
          </CardContent>
        </Card>

        {/* Notes List Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36 mb-1" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-5 w-12 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets e Comunicação"
        subtitle="Notas internas, mensagens de agências e analytics de suporte"
        icon={<MessageSquare className="w-6 h-6 text-blue-700" />}
        iconBgClass="bg-blue-100"
      />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{supportMetrics.ticketsToday || 0}</p>
                <p className="text-sm text-muted-foreground">Tickets Hoje</p>
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
                <p className="text-2xl font-bold">{supportMetrics.avgResponseTime || '-'}</p>
                <p className="text-sm text-muted-foreground">Tempo Médio Resposta</p>
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
                <p className="text-2xl font-bold">{supportMetrics.resolvedThisWeek || 0}</p>
                <p className="text-sm text-muted-foreground">Resolvidos Semana</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{supportMetrics.satisfactionScore || 0}/5</p>
                <p className="text-sm text-muted-foreground">Satisfação</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="notes">
            <StickyNote className="w-4 h-4 mr-2" />
            Notas Internas
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="w-4 h-4 mr-2" />
            Mensagens ({unreadCount} não lidas)
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {}
        <TabsContent value="notes" className="space-y-4 mt-4">
          {}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nova Nota Interna</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="Escreva uma nota para a equipe..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button>
                    <Send className="w-4 h-4 mr-2" />
                    Publicar Nota
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notas da Equipe</CardTitle>
              <CardDescription>Comunicações internas da equipe MR3X</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {internalNotes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhuma nota encontrada</p>
                ) : (
                  internalNotes.map((note: InternalNote) => (
                    <div key={note.id} className="p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{note.title}</h4>
                          {getPriorityBadge(note.priority)}
                          <Badge variant="outline">{note.category}</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{note.content}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{note.author}</span>
                        <span>•</span>
                        <span>{new Date(note.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {}
        <TabsContent value="messages" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar mensagens..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mensagens de Agências</CardTitle>
              <CardDescription>Comunicações recebidas das agências</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {agencyMessages.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhuma mensagem encontrada</p>
                ) : (
                  agencyMessages.map((message: AgencyMessage) => (
                    <div
                      key={message.id}
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        message.unread ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {message.unread && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                          <span className="font-medium">{message.agency}</span>
                          {getStatusBadge(message.status)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-1">{message.subject}</p>
                      <p className="text-sm text-muted-foreground truncate">{message.lastMessage}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tickets por Categoria</CardTitle>
                <CardDescription>Distribuição dos tickets por tipo</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer height={300}>
                  <PieChart>
                    <Pie
                      data={ticketsByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {ticketsByCategory.map((entry: TicketCategory, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tickets Mensais</CardTitle>
                <CardDescription>Tickets abertos vs resolvidos</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer height={300}>
                  <BarChart data={ticketsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="abertos" name="Abertos" fill="#ef4444" />
                    <Bar dataKey="resolvidos" name="Resolvidos" fill="#22c55e" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Métricas de Suporte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{supportMetrics.avgResponseTime || '-'}</p>
                  <p className="text-sm text-muted-foreground">Tempo Médio de Resposta</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{supportMetrics.avgResolutionTime || '-'}</p>
                  <p className="text-sm text-muted-foreground">Tempo Médio de Resolução</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">{supportMetrics.ticketsThisWeek || 0}</p>
                  <p className="text-sm text-muted-foreground">Tickets Esta Semana</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {supportMetrics.ticketsThisWeek && supportMetrics.resolvedThisWeek
                      ? ((supportMetrics.resolvedThisWeek / supportMetrics.ticketsThisWeek) * 100).toFixed(0)
                      : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Taxa de Resolução</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
