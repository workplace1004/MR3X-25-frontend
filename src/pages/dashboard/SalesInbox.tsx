import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../api/client';
import { toast } from 'sonner';
import {
  MessageSquare, Send, Search, User, Clock, CheckCheck, Check,
  Bell, Star, StarOff, Trash2, MoreVertical, Plus, X
} from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string;
  recipientId: string;
  subject: string;
  content: string;
  isRead: boolean;
  isStarred: boolean;
  createdAt: string;
  readAt: string | null;
}

interface Notification {
  id: string;
  type: 'lead' | 'proposal' | 'commission' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

const mockMessages: Message[] = [
  {
    id: '1',
    senderId: 'admin1',
    senderName: 'Carlos Admin',
    senderRole: 'ADMIN',
    recipientId: 'rep1',
    subject: 'Parabéns pela venda!',
    content: 'Olá! Parabéns pela conversão do cliente Realty Plus. Excelente trabalho! Continue assim.',
    isRead: true,
    isStarred: true,
    createdAt: '2024-12-01T10:30:00Z',
    readAt: '2024-12-01T11:00:00Z',
  },
  {
    id: '2',
    senderId: 'manager1',
    senderName: 'Ana Manager',
    senderRole: 'PLATFORM_MANAGER',
    recipientId: 'rep1',
    subject: 'Novo lead qualificado',
    content: 'Temos um novo lead muito promissor: Invest Imóveis. Já fiz o primeiro contato e eles estão interessados no plano Enterprise. Pode dar seguimento?',
    isRead: false,
    isStarred: false,
    createdAt: '2024-12-01T14:00:00Z',
    readAt: null,
  },
  {
    id: '3',
    senderId: 'admin2',
    senderName: 'Roberto Diretor',
    senderRole: 'CEO',
    recipientId: 'rep1',
    subject: 'Reunião de resultados - Dezembro',
    content: 'Olá! Gostaria de marcar uma reunião para discutir os resultados do mês e as metas para 2025. Podemos agendar para a próxima semana?',
    isRead: false,
    isStarred: false,
    createdAt: '2024-11-30T16:00:00Z',
    readAt: null,
  },
  {
    id: '4',
    senderId: 'manager2',
    senderName: 'Pedro Support',
    senderRole: 'PLATFORM_MANAGER',
    recipientId: 'rep1',
    subject: 'Material de vendas atualizado',
    content: 'Oi! Atualizamos o deck de vendas com as novas funcionalidades da plataforma. Está disponível na pasta compartilhada. Qualquer dúvida me avisa.',
    isRead: true,
    isStarred: false,
    createdAt: '2024-11-29T09:00:00Z',
    readAt: '2024-11-29T10:00:00Z',
  },
];

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'lead',
    title: 'Novo lead atribuído',
    message: 'Um novo prospect foi atribuído a você: Urban Imóveis',
    isRead: false,
    createdAt: '2024-12-01T15:00:00Z',
    link: '/dashboard/sales-prospects',
  },
  {
    id: '2',
    type: 'proposal',
    title: 'Proposta visualizada',
    message: 'Imobiliária Centro visualizou sua proposta',
    isRead: false,
    createdAt: '2024-12-01T14:30:00Z',
    link: '/dashboard/sales-proposals',
  },
  {
    id: '3',
    type: 'commission',
    title: 'Comissão processada',
    message: 'Sua comissão de R$ 1.530,00 foi processada e será paga em 30/12',
    isRead: true,
    createdAt: '2024-11-30T18:00:00Z',
    link: '/dashboard/sales-commissions',
  },
  {
    id: '4',
    type: 'system',
    title: 'Meta mensal atingida!',
    message: 'Parabéns! Você atingiu 93% da meta mensal.',
    isRead: true,
    createdAt: '2024-11-28T10:00:00Z',
  },
  {
    id: '5',
    type: 'lead',
    title: 'Lead movido para negociação',
    message: 'Imóveis Premium avançou para fase de negociação',
    isRead: true,
    createdAt: '2024-11-27T14:00:00Z',
    link: '/dashboard/sales-pipeline',
  },
];

export function SalesInbox() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'messages' | 'notifications'>('messages');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  const { data: fetchedMessages = mockMessages, isLoading: loadingMessages } = useQuery({
    queryKey: ['sales-messages'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/sales-rep/messages');
        return response.data;
      } catch {
        return mockMessages;
      }
    },
  });

  const { data: fetchedNotifications = mockNotifications, isLoading: loadingNotifications } = useQuery({
    queryKey: ['sales-notifications'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/sales-rep/notifications');
        return response.data;
      } catch {
        return mockNotifications;
      }
    },
  });

  // Sync fetched data to local state
  useEffect(() => {
    setLocalMessages(fetchedMessages);
  }, [fetchedMessages]);

  useEffect(() => {
    setLocalNotifications(fetchedNotifications);
  }, [fetchedNotifications]);

  const handleMarkAsRead = async (id: string) => {
    // Update local state immediately
    setLocalMessages(prev => prev.map(msg =>
      msg.id === id ? { ...msg, isRead: true, readAt: new Date().toISOString() } : msg
    ));
    // Update selected message if it's the one being marked
    if (selectedMessage?.id === id) {
      setSelectedMessage(prev => prev ? { ...prev, isRead: true, readAt: new Date().toISOString() } : null);
    }
    // Try API call (fire and forget)
    try {
      await apiClient.patch(`/sales-rep/messages/${id}/read`);
    } catch {
      // API failed but local state already updated
    }
  };

  const handleToggleStar = async (id: string) => {
    // Update local state immediately
    setLocalMessages(prev => prev.map(msg =>
      msg.id === id ? { ...msg, isStarred: !msg.isStarred } : msg
    ));
    // Update selected message if it's the one being starred
    if (selectedMessage?.id === id) {
      setSelectedMessage(prev => prev ? { ...prev, isStarred: !prev.isStarred } : null);
    }
    toast.success('Mensagem atualizada');
    // Try API call (fire and forget)
    try {
      await apiClient.patch(`/sales-rep/messages/${id}/star`);
    } catch {
      // API failed but local state already updated
    }
  };

  const openDeleteModal = (id: string) => {
    setMessageToDelete(id);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setMessageToDelete(null);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;

    // Update local state immediately
    setLocalMessages(prev => prev.filter(msg => msg.id !== messageToDelete));
    // Clear selected message if it's the one being deleted
    if (selectedMessage?.id === messageToDelete) {
      setSelectedMessage(null);
    }
    toast.success('Mensagem excluída com sucesso');
    closeDeleteModal();
    // Try API call (fire and forget)
    try {
      await apiClient.delete(`/sales-rep/messages/${messageToDelete}`);
    } catch {
      // API failed but local state already updated
    }
  };

  const filteredMessages = localMessages.filter((message: Message) => {
    const matchesSearch =
      message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.content.toLowerCase().includes(searchTerm.toLowerCase());

    if (filter === 'unread') return matchesSearch && !message.isRead;
    if (filter === 'starred') return matchesSearch && message.isStarred;
    return matchesSearch;
  });

  const filteredNotifications = localNotifications.filter((notification: Notification) => {
    if (filter === 'unread') return !notification.isRead;
    return true;
  });

  const unreadMessagesCount = localMessages.filter((m: Message) => !m.isRead).length;
  const unreadNotificationsCount = localNotifications.filter((n: Notification) => !n.isRead).length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'CEO':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800">CEO</span>;
      case 'ADMIN':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">Admin</span>;
      case 'PLATFORM_MANAGER':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">Gestor</span>;
      default:
        return null;
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'lead':
        return <div className="p-2 bg-blue-100 rounded-full"><User className="w-4 h-4 text-blue-600" /></div>;
      case 'proposal':
        return <div className="p-2 bg-purple-100 rounded-full"><MessageSquare className="w-4 h-4 text-purple-600" /></div>;
      case 'commission':
        return <div className="p-2 bg-green-100 rounded-full"><CheckCheck className="w-4 h-4 text-green-600" /></div>;
      case 'system':
        return <div className="p-2 bg-yellow-100 rounded-full"><Bell className="w-4 h-4 text-yellow-600" /></div>;
    }
  };

  const isLoading = loadingMessages || loadingNotifications;

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Caixa de Entrada</h1>
          <p className="text-muted-foreground">Mensagens e notificações</p>
        </div>
        <Button onClick={() => setShowComposeModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Mensagem
        </Button>
      </div>

      {/* Tabs and Stats */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'messages' ? 'default' : 'outline'}
            onClick={() => setActiveTab('messages')}
            className="flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Mensagens
            {unreadMessagesCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadMessagesCount}
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === 'notifications' ? 'default' : 'outline'}
            onClick={() => setActiveTab('notifications')}
            className="flex items-center gap-2"
          >
            <Bell className="w-4 h-4" />
            Notificações
            {unreadNotificationsCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadNotificationsCount}
              </span>
            )}
          </Button>
        </div>

        <div className="flex gap-2 ml-auto">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todas
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Não lidas
          </Button>
          {activeTab === 'messages' && (
            <Button
              variant={filter === 'starred' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('starred')}
            >
              <Star className="w-4 h-4 mr-1" />
              Favoritas
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar mensagens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Mensagens ({filteredMessages.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {filteredMessages.map((message: Message) => (
                  <div
                    key={message.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      !message.isRead ? 'bg-blue-50/50' : ''
                    } ${selectedMessage?.id === message.id ? 'bg-blue-100' : ''}`}
                    onClick={() => {
                      setSelectedMessage(message);
                      if (!message.isRead) {
                        handleMarkAsRead(message.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm truncate ${!message.isRead ? 'font-bold' : 'font-medium'}`}>
                              {message.senderName}
                            </p>
                            {getRoleBadge(message.senderRole)}
                          </div>
                          <p className={`text-sm truncate ${!message.isRead ? 'font-semibold' : ''}`}>
                            {message.subject}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {message.content.slice(0, 50)}...
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(message.createdAt)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStar(message.id);
                          }}
                        >
                          {message.isStarred ? (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          ) : (
                            <StarOff className="w-4 h-4 text-gray-300 hover:text-yellow-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredMessages.length === 0 && (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma mensagem encontrada</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Message Detail */}
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              {selectedMessage ? (
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold">{selectedMessage.senderName}</h3>
                          {getRoleBadge(selectedMessage.senderRole)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(selectedMessage.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStar(selectedMessage.id)}
                        className="p-2 hover:bg-gray-100 rounded"
                        title={selectedMessage.isStarred ? 'Remover favorito' : 'Adicionar favorito'}
                      >
                        {selectedMessage.isStarred ? (
                          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <Star className="w-5 h-5 text-gray-400 hover:text-yellow-500" />
                        )}
                      </button>
                      <button
                        onClick={() => openDeleteModal(selectedMessage.id)}
                        className="p-2 hover:bg-gray-100 rounded"
                        title="Excluir mensagem"
                      >
                        <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  </div>

                  <div className="border-b pb-4">
                    <h2 className="text-xl font-semibold">{selectedMessage.subject}</h2>
                  </div>

                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-4">
                      <Input placeholder="Escreva uma resposta..." className="flex-1" />
                      <Button>
                        <Send className="w-4 h-4 mr-2" />
                        Responder
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Selecione uma mensagem para visualizar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificações ({filteredNotifications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredNotifications.map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                    !notification.isRead ? 'bg-blue-50/50 border-blue-100' : 'bg-gray-50 border-gray-100'
                  } ${notification.link ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                  onClick={() => {
                    if (notification.link) {
                      window.location.href = notification.link;
                    }
                  }}
                >
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-sm ${!notification.isRead ? 'font-bold' : 'font-medium'}`}>
                        {notification.title}
                      </h4>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                  </div>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </div>
              ))}

              {filteredNotifications.length === 0 && (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma notificação encontrada</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Excluir Mensagem</h2>
                <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir esta mensagem? Ela será removida permanentemente da sua caixa de entrada.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeDeleteModal}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteMessage}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Nova Mensagem</h2>
              <button
                onClick={() => setShowComposeModal(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Para *</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Selecione o destinatário</option>
                  <option value="admin">Carlos Admin (Admin)</option>
                  <option value="manager1">Ana Manager (Gestor)</option>
                  <option value="manager2">Pedro Support (Gestor)</option>
                  <option value="ceo">Roberto Diretor (CEO)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Assunto *</label>
                <Input placeholder="Digite o assunto da mensagem" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mensagem *</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                  rows={8}
                  placeholder="Escreva sua mensagem..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowComposeModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  <Send className="w-4 h-4 mr-2" />
                  Enviar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
