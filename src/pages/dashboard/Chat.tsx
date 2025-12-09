import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatAPI } from '../../api'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { MessageSquare, Send, Menu, Trash2, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'

interface Chat {
  id: string
  name: string
  unreadCount: number
  participantId: string
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth <= 640)
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  return isMobile
}

export function Chat() {
  const { hasPermission, user } = useAuth()
  const queryClient = useQueryClient()

  const canViewChat = hasPermission('chat:read')
  const canCreateChat = hasPermission('chat:create')
  const canDeleteChat = hasPermission('chat:delete')

  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [message, setMessage] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [creatingChat, setCreatingChat] = useState(false)
  const [chatToDelete, setChatToDelete] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const [mobileShowList, setMobileShowList] = useState(true)

  if (!canViewChat) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para visualizar chat.</p>
        </div>
      </div>
    )
  }

  const { data: chats, isLoading: chatsLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: () => chatAPI.getChats(),
    enabled: canViewChat,
    refetchInterval: 3000,
  })

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedChat?.id],
    queryFn: () => chatAPI.getMessages(selectedChat!.id),
    enabled: !!selectedChat,
    refetchInterval: 2000,
  })

  const sendMessageMutation = useMutation({
    mutationFn: ({ chatId, content }: { chatId: string; content: string }) =>
      chatAPI.sendMessage(chatId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedChat?.id] })
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      setMessage('')
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    },
    onError: () => {
      toast.error('Erro ao enviar mensagem')
    },
  })

  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const createChatMutation = useMutation({
    mutationFn: (participantId: string) => chatAPI.createChat(participantId),
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      setShowNewChat(false)
      setAvailableUsers([])
      toast.success('Chat criado com sucesso')

      if (result && result.id) {
        const updatedChats = await chatAPI.getChats()
        const newChat = updatedChats.find((chat: any) => chat.id === result.id)
        if (newChat) {
          setSelectedChat(newChat)
        }
      }
    },
    onError: () => {
      toast.error('Erro ao criar chat')
    },
  })

  const deleteChatMutation = useMutation({
    mutationFn: (chatId: string) => chatAPI.deleteChat(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      if (selectedChat?.id === chatToDelete) {
        setSelectedChat(null)
      }
      setChatToDelete(null)
      toast.success('Chat excluído com sucesso')
    },
    onError: () => {
      toast.error('Erro ao excluir chat')
    },
  })

  const markAsReadMutation = useMutation({
    mutationFn: (chatId: string) => chatAPI.markAsRead(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      queryClient.invalidateQueries({ queryKey: ['chats-unread'] }) // Update sidebar badge
    },
  })

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChat || !message.trim()) return

    sendMessageMutation.mutate({
      chatId: selectedChat.id,
      content: message,
    })
  }

  const handleOpenNewChat = async () => {
    setShowNewChat(true)
    setAvailableUsers([])
    try {
      const users = await chatAPI.getAvailableUsers()
      setAvailableUsers(users || [])

      if (!users || users.length === 0) {
        toast.info('Nenhum usuário disponível para chat. Verifique se você tem inquilinos cadastrados (se for proprietário) ou se está vinculado a um proprietário (se for inquilino).')
      }
    } catch (error) {
      console.error('Error loading available users:', error)
      toast.error('Erro ao carregar usuários disponíveis')
    }
  }

  const handleCreateChat = async (participantId: string) => {
    setCreatingChat(true)
    try {
      await createChatMutation.mutateAsync(participantId)
    } finally {
      setCreatingChat(false)
    }
  }

  const handleSelectChat = async (chat: Chat) => {
    setSelectedChat(chat)
    if (isMobile) setMobileShowList(false)

    if (chat.unreadCount && chat.unreadCount > 0) {
      try {
        await markAsReadMutation.mutateAsync(chat.id)
      } catch (error) {

      }
    }
  }

  const handleShowList = () => setMobileShowList(true)

  const handleDeleteChat = (chatId: string) => {
    setChatToDelete(chatId)
  }

  const confirmDeleteChat = () => {
    if (chatToDelete) {
      deleteChatMutation.mutate(chatToDelete)
      setChatToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Chat</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Converse com inquilinos e gerencie comunicações
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {chats?.length || 0} conversas
          </Badge>
        </div>
      </div>

      <Card className="h-[600px] overflow-hidden">
        <CardContent className="p-0 h-full">
          <div className="flex h-full">
            {isMobile ? (
              mobileShowList || !selectedChat ? (
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center p-3 border-b bg-white">
                    <span className="font-bold text-sm sm:text-base">Conversas</span>
                    <div className="ml-auto">
                      {canCreateChat && (
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90"
                          onClick={handleOpenNewChat}
                        >
                          Novo Chat
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {chatsLoading ? (
                      <div className="text-center text-muted-foreground py-8 text-sm">Carregando...</div>
                    ) : chats && chats.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8 text-sm">Nenhum chat encontrado</div>
                    ) : (
                      chats?.map((chat: any) => (
                        <div
                          key={chat.id}
                          className={`mb-2 mx-2 cursor-pointer border rounded-lg ${
                            selectedChat?.id === chat.id ? 'border-primary' : 'border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between p-3 gap-2 max-w-full">
                            <span
                              className="flex-1 cursor-pointer truncate max-w-[200px] text-sm"
                              title={chat.name}
                              onClick={() => handleSelectChat(chat)}
                            >
                              {chat.name}
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {typeof chat.unreadCount === 'number' && chat.unreadCount > 0 && (
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
                                  {chat.unreadCount}
                                </span>
                              )}
                              {canDeleteChat && (
                                <button
                                  className="p-1 hover:bg-accent rounded transition-colors"
                                  onClick={() => handleDeleteChat(chat.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center p-3 border-b bg-white">
                    <button
                      className="p-1 hover:bg-accent rounded transition-colors"
                      onClick={handleShowList}
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                    <span className="font-bold ml-2 text-sm sm:text-base">{selectedChat?.name}</span>
                  </div>
                  <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-gray-50">
                    {messagesLoading ? (
                      <div className="text-center text-muted-foreground py-8 text-sm">Carregando mensagens...</div>
                    ) : messages && messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8 text-sm">Nenhuma mensagem</div>
                    ) : (
                      messages?.map((msg: any) => {
                        const isMyMessage = msg.isMine === true || msg.sender?.id?.toString() === user?.id
                        return (
                          <div key={msg.id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                            <div className={`rounded px-3 py-2 max-w-xs text-sm ${
                              isMyMessage
                                ? 'bg-primary text-primary-foreground text-right'
                                : 'bg-white border border-border'
                            }`}>
                              <div>{msg.content}</div>
                              <div className="text-[10px] text-muted-foreground mt-1">
                                {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <form className="flex p-3 border-t gap-2" onSubmit={handleSendMessage}>
                    <input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      className="flex-1 px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                    <Button type="submit" className="bg-primary hover:bg-primary/90">
                      Enviar
                    </Button>
                  </form>
                </div>
              )
            ) : (
              <>
                <div className="w-1/3 border-r flex flex-col min-w-[180px]">
                  <div className="flex items-center p-3 border-b bg-white">
                    <span className="font-bold text-sm sm:text-base">Conversas</span>
                    <div className="ml-auto">
                      {canCreateChat && (
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90"
                          onClick={handleOpenNewChat}
                        >
                          Novo Chat
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 p-2">
                    {chatsLoading ? (
                      <div className="text-center text-muted-foreground py-8 text-sm">Carregando...</div>
                    ) : chats && chats.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8 text-sm">Nenhum chat encontrado</div>
                    ) : (
                      chats?.map((chat: any) => (
                        <div
                          key={chat.id}
                          className={`mb-2 cursor-pointer border rounded-lg ${
                            selectedChat?.id === chat.id ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between p-3 gap-2 max-w-full">
                            <span
                              className="truncate flex-1 cursor-pointer text-sm"
                              title={chat.name}
                              onClick={() => handleSelectChat(chat)}
                            >
                              {chat.name}
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {typeof chat.unreadCount === 'number' && chat.unreadCount > 0 && (
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
                                  {chat.unreadCount}
                                </span>
                              )}
                              {canDeleteChat && (
                                <button
                                  className="p-1 hover:bg-accent rounded transition-colors"
                                  onClick={() => handleDeleteChat(chat.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex-1 flex flex-col">
                  {selectedChat ? (
                    <>
                      <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-semibold text-sm">
                            {selectedChat.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-sm sm:text-base">{selectedChat.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {messages && messages.length > 0 ? `${messages.length} mensagens` : 'Nenhuma mensagem'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-gray-50 min-h-0">
                        {messagesLoading ? (
                          <div className="text-center text-muted-foreground py-8 text-sm">Carregando mensagens...</div>
                        ) : messages && messages.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8 text-sm">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            Nenhuma mensagem ainda
                          </div>
                        ) : (
                          messages?.map((msg: any) => {
                            const isMyMessage = msg.isMine === true || msg.sender?.id?.toString() === user?.id
                            return (
                              <div key={msg.id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-1`}>
                                <div className={`max-w-xs sm:max-w-sm lg:max-w-md ${isMyMessage ? 'ml-12' : 'mr-12'}`}>
                                  <div className={`rounded-2xl px-4 py-2 text-sm break-words ${
                                    isMyMessage
                                      ? 'bg-primary text-primary-foreground rounded-br-md shadow-sm'
                                      : 'bg-white border border-border rounded-bl-md shadow-sm'
                                  }`}>
                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                    <div className={`text-[10px] mt-1 ${
                                      isMyMessage
                                        ? 'text-primary-foreground/70'
                                        : 'text-muted-foreground'
                                    }`}>
                                      {new Date(msg.timestamp).toLocaleString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                      <form className="flex p-3 border-t gap-2 bg-white" onSubmit={handleSendMessage}>
                        <div className="flex-1 relative">
                          <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            className="w-full px-4 py-3 border border-input rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-gray-50 transition-colors"
                            disabled={sendMessageMutation.isPending}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!message.trim() || sendMessageMutation.isPending}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground p-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {sendMessageMutation.isPending ? (
                            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                      Selecione um chat para visualizar
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Chat</DialogTitle>
            <DialogDescription>
              Selecione um usuário para iniciar uma nova conversa
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {availableUsers.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-muted-foreground text-sm mb-2">
                  Nenhum usuário disponível para chat
                </div>
                <div className="text-xs text-muted-foreground">
                  <p className="mb-1">• Se você é <strong>proprietário</strong>: cadastre inquilinos primeiro</p>
                  <p>• Se você é <strong>inquilino</strong>: verifique se está vinculado a um proprietário</p>
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {availableUsers.map((u: any) => (
                  <li key={u.id} className="flex justify-between items-center p-2 border border-border rounded-lg">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{u.name || 'Usuário'}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => handleCreateChat(u.id)}
                      disabled={creatingChat}
                    >
                      {creatingChat ? 'Criando...' : 'Iniciar'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {}
      <AlertDialog open={chatToDelete !== null} onOpenChange={(open) => !open && setChatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este chat? Esta ação não pode ser desfeita e todas as mensagens serão permanentemente removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteChat}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteChatMutation.isPending}
            >
              {deleteChatMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
