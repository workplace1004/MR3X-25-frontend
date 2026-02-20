import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsAPI } from '@/api'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/PageHeader'
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Calendar,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Gavel,
  Handshake,
  ClipboardCheck,
  DollarSign,
  Filter,
  X,
  Ticket,
  Package,
  CreditCard,
  Shield,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

function formatDateTime(dateString: string) {
  try {
    return new Date(dateString).toLocaleString('pt-BR')
  } catch {
    return dateString
  }
}

export function Notifications() {
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const canViewNotifications = hasPermission('notifications:read')

  const [notificationToDelete, setNotificationToDelete] = useState<any>(null)
  const [filterSource, setFilterSource] = useState<string>('ALL')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const itemsPerPage = 15

  if (!canViewNotifications) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para visualizar notificações.</p>
        </div>
      </div>
    )
  }

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', currentPage],
    queryFn: () => {
      const skip = (currentPage - 1) * itemsPerPage
      return notificationsAPI.getNotifications(skip, itemsPerPage)
    },
    enabled: canViewNotifications,
  })

  const notifications = notificationsData?.items || []

  const markAsReadMutation = useMutation({
    mutationFn: ({ id, notification }: { id: string; notification: any }) => {
      // Dismiss the notification permanently from database
      return notificationsAPI.dismissNotification(id, notification.source)
    },
    onSuccess: (_, variables) => {
      // Remove notification from list after deletion
      queryClient.setQueryData(['notifications'], (old: any) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.filter((item: any) => {
            // Remove the notification that was deleted
            return item.id !== variables.notification.id
          }),
        }
      })
      // Invalidate queries to ensure fresh data on next fetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
      toast.success('Notificação removida')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover notificação')
    },
  })

  const handleMarkAsRead = (notification: any) => {
    // Dismiss notification permanently from database when clicking check
    markAsReadMutation.mutate({ id: notification.id, notification })
  }

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => notificationsAPI.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
      setNotificationToDelete(null)
      toast.success('Notificação excluída')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir notificação')
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
      toast.success('Todas as notificações foram marcadas como lidas')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao marcar todas como lidas')
    },
  })

  const getNotificationIcon = (source: string, type: string) => {
    switch (source) {
      case 'PAYMENT_REMINDER':
        return <DollarSign className="w-5 h-5 text-blue-500" />
      case 'EXTRAJUDICIAL':
        return <Gavel className="w-5 h-5 text-orange-500" />
      case 'CONTRACT':
        return <FileText className="w-5 h-5 text-indigo-500" />
      case 'AGREEMENT':
        return <Handshake className="w-5 h-5 text-purple-500" />
      case 'INSPECTION':
        return <ClipboardCheck className="w-5 h-5 text-teal-500" />
      case 'PAYMENT':
        return <DollarSign className="w-5 h-5 text-green-500" />
      case 'TICKET':
      case 'SUPPORT':
        return <Ticket className="w-5 h-5 text-cyan-500" />
      case 'PLAN':
        return <Package className="w-5 h-5 text-violet-500" />
      case 'BILLING':
        return <CreditCard className="w-5 h-5 text-amber-500" />
      case 'SECURITY':
        return <Shield className="w-5 h-5 text-red-500" />
      default:
        switch (type) {
          case 'INFO':
            return <Info className="w-5 h-5 text-blue-500" />
          case 'WARNING':
            return <AlertTriangle className="w-5 h-5 text-yellow-500" />
          case 'SUCCESS':
            return <CheckCircle className="w-5 h-5 text-green-500" />
          case 'ERROR':
            return <XCircle className="w-5 h-5 text-red-500" />
          default:
            return <Bell className="w-5 h-5 text-gray-500" />
        }
    }
  }

  const getNotificationBadgeColor = (source: string, type: string) => {
    switch (source) {
      case 'PAYMENT_REMINDER':
        return 'bg-blue-100 text-blue-800'
      case 'EXTRAJUDICIAL':
        return 'bg-orange-100 text-orange-800'
      case 'CONTRACT':
        return 'bg-indigo-100 text-indigo-800'
      case 'AGREEMENT':
        return 'bg-purple-100 text-purple-800'
      case 'INSPECTION':
        return 'bg-teal-100 text-teal-800'
      case 'PAYMENT':
        return 'bg-green-100 text-green-800'
      case 'TICKET':
      case 'SUPPORT':
        return 'bg-cyan-100 text-cyan-800'
      case 'PLAN':
        return 'bg-violet-100 text-violet-800'
      case 'BILLING':
        return 'bg-amber-100 text-amber-800'
      case 'SECURITY':
        return 'bg-red-100 text-red-800'
      default:
        switch (type) {
          case 'INFO':
            return 'bg-blue-100 text-blue-800'
          case 'WARNING':
            return 'bg-yellow-100 text-yellow-800'
          case 'SUCCESS':
            return 'bg-green-100 text-green-800'
          case 'ERROR':
            return 'bg-red-100 text-red-800'
          default:
            return 'bg-gray-100 text-gray-800'
        }
    }
  }

  const getNotificationTypeLabel = (source: string, type: string) => {
    switch (source) {
      case 'PAYMENT_REMINDER':
        return 'Lembrete de Pagamento'
      case 'EXTRAJUDICIAL':
        return 'Notificação Extrajudicial'
      case 'CONTRACT':
        if (type === 'contract_signature_pending') return 'Assinatura Pendente'
        if (type === 'contract_status_changed') return 'Status Alterado'
        return 'Contrato'
      case 'AGREEMENT':
        if (type === 'agreement_signature_pending') return 'Assinatura Pendente'
        return 'Acordo'
      case 'INSPECTION':
        return 'Vistoria'
      case 'PAYMENT':
        return 'Pagamento'
      case 'TICKET':
      case 'SUPPORT':
        if (type === 'TECHNICAL') return 'Suporte Técnico'
        if (type === 'BILLING') return 'Suporte Faturamento'
        if (type === 'ACCOUNT') return 'Suporte Conta'
        return 'Ticket de Suporte'
      case 'PLAN':
        if (type === 'plan_modification_request') return 'Solicitação de Plano'
        return 'Plano'
      case 'BILLING':
        return 'Faturamento'
      case 'SECURITY':
        return 'Segurança'
      default:
        switch (type) {
          case 'INFO':
            return 'Informação'
          case 'WARNING':
            return 'Aviso'
          case 'SUCCESS':
            return 'Sucesso'
          case 'ERROR':
            return 'Erro'
          case 'property_created':
            return 'Imóvel Criado'
          case 'property_status_changed':
            return 'Status Alterado'
          case 'tenant_assigned':
            return 'Inquilino Atribuído'
          case 'tenant_removed':
            return 'Inquilino Removido'
          case 'contract_status_changed':
            return 'Status do Contrato'
          case 'payment_created':
            return 'Pagamento Criado'
          case 'payment_updated':
            return 'Pagamento Atualizado'
          case 'billing_cycle_closed':
            return 'Ciclo Fechado'
          default:
            return type || 'Notificação'
        }
    }
  }

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'PAYMENT_REMINDER':
        return 'Lembrete de Pagamento'
      case 'EXTRAJUDICIAL':
        return 'Notificação Extrajudicial'
      case 'CONTRACT':
        return 'Contrato'
      case 'AGREEMENT':
        return 'Acordo'
      case 'INSPECTION':
        return 'Vistoria'
      case 'PAYMENT':
        return 'Pagamento'
      case 'TICKET':
      case 'SUPPORT':
        return 'Suporte'
      case 'PLAN':
        return 'Plano'
      case 'BILLING':
        return 'Faturamento'
      case 'SECURITY':
        return 'Segurança'
      default:
        return source || 'Notificação'
    }
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterSource, filterType])

  // Filter notifications based on selected filters
  // Note: Since we're using server-side pagination, filters should ideally be applied on the backend
  // For now, we'll apply client-side filtering on the current page's notifications
  const filteredNotifications = notifications.filter((n: any) => {
    if (filterSource !== 'ALL' && n.source !== filterSource) return false
    if (filterType !== 'ALL' && n.type !== filterType) return false
    return true
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-10 w-56" />
        </div>

        {/* Notifications skeleton */}
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-5 h-5 rounded flex-shrink-0 mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-9 h-9 rounded" />
                    <Skeleton className="w-9 h-9 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const unreadCount = notifications.filter((n: any) => !n.read)?.length || 0

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Notificações Centralizadas" 
        subtitle={unreadCount > 0 ? `Você tem ${unreadCount} notificações não lidas` : 'Todas as notificações foram lidas'}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="flex items-center gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todas as fontes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as fontes</SelectItem>
            <SelectItem value="PAYMENT_REMINDER">Lembretes de Pagamento</SelectItem>
            <SelectItem value="EXTRAJUDICIAL">Notificações Extrajudiciais</SelectItem>
            <SelectItem value="CONTRACT">Contratos</SelectItem>
            <SelectItem value="AGREEMENT">Acordos</SelectItem>
            <SelectItem value="INSPECTION">Vistorias</SelectItem>
            <SelectItem value="PAYMENT">Pagamentos</SelectItem>
            <SelectItem value="TICKET">Tickets de Suporte</SelectItem>
            <SelectItem value="SUPPORT">Suporte</SelectItem>
            <SelectItem value="PLAN">Planos</SelectItem>
            <SelectItem value="BILLING">Faturamento</SelectItem>
            <SelectItem value="SECURITY">Segurança</SelectItem>
          </SelectContent>
        </Select>
        {(filterSource !== 'ALL' || filterType !== 'ALL') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterSource('ALL')
              setFilterType('ALL')
            }}
            className="flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {filteredNotifications.length > 0 ? (
        <div className="space-y-4">
          {filteredNotifications.map((notification: any) => (
            <Card
              key={notification.id}
              className={`transition-all hover:shadow-md ${!notification.read ? 'border-l-4 border-l-orange-500 bg-orange-50/50' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.source || 'INFO', notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className={`font-semibold ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notification.title || notification.description || 'Notificação'}
                      </h3>
                      <Badge className={getNotificationBadgeColor(notification.source || 'INFO', notification.type)}>
                        {getNotificationTypeLabel(notification.source || 'INFO', notification.type)}
                      </Badge>
                      {notification.source && (
                        <Badge variant="outline" className="text-xs">
                          {getSourceLabel(notification.source)}
                        </Badge>
                      )}
                      {notification.priority === 'URGENT' && (
                        <Badge className="bg-red-500 text-white">Urgente</Badge>
                      )}
                      {notification.priority === 'HIGH' && (
                        <Badge className="bg-orange-500 text-white">Alta</Badge>
                      )}
                      {!notification.read && (
                        <Badge className="bg-blue-500 text-white">Nova</Badge>
                      )}
                    </div>
                    {notification.description && notification.title && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.description}
                      </p>
                    )}
                    {notification.property && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Imóvel: {notification.property.name || notification.property.address || 'N/A'}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateTime(notification.creationDate || notification.createdAt)}
                      </div>
                      {notification.actionUrl && notification.actionLabel && (
                        <button
                          onClick={() => {
                            // If it's "Assinar Contrato", navigate to contracts page
                            if (notification.actionLabel?.includes('Assinar Contrato')) {
                              navigate('/dashboard/contracts')
                            } else if (notification.actionUrl?.startsWith('/')) {
                              navigate(notification.actionUrl)
                            } else if (notification.actionUrl) {
                              window.location.href = notification.actionUrl
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                          {notification.actionLabel} →
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsRead(notification)}
                        className="text-green-600 border-green-600 hover:bg-green-50"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    {notification.source === 'PAYMENT_REMINDER' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const originalId = notification.metadata?.notificationId || notification.id.replace('payment_reminder_', '')
                          setNotificationToDelete({ ...notification, id: originalId })
                        }}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredNotifications.length === 0 && notifications.length > 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma notificação encontrada</h3>
            <p className="text-muted-foreground mb-4">Nenhuma notificação corresponde aos filtros selecionados</p>
            <Button
              variant="outline"
              onClick={() => {
                setFilterSource('ALL')
                setFilterType('ALL')
              }}
            >
              Limpar filtros
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma notificação</h3>
            <p className="text-muted-foreground">Você não tem notificações no momento</p>
          </CardContent>
        </Card>
      )}

      {}
      <AlertDialog open={!!notificationToDelete} onOpenChange={() => setNotificationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Notificacao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta notificacao? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => notificationToDelete && deleteNotificationMutation.mutate(notificationToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
