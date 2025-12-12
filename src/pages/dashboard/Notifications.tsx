import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsAPI } from '@/api'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import {
  Bell,
  Check,
  Trash2,
  Calendar,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

  const canViewNotifications = hasPermission('notifications:read')

  const [notificationToDelete, setNotificationToDelete] = useState<any>(null)

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
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getNotifications(),
    enabled: canViewNotifications,
  })

  const notifications = notificationsData?.items || []

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsAPI.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] }) // Update sidebar badge
      toast.success('Notificação marcada como lida')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao marcar notificação')
    },
  })

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => notificationsAPI.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] }) // Update sidebar badge
      setNotificationToDelete(null)
      toast.success('Notificação excluída')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir notificação')
    },
  })

  const getNotificationIcon = (type: string) => {
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

  const getNotificationBadgeColor = (type: string) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const unreadCount = notifications.filter((n: any) => !n.read)?.length || 0

  return (
    <div className="space-y-6">
      {}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-100 rounded-lg">
            <Bell className="w-6 h-6 text-orange-700" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Notificações</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {unreadCount > 0 ? `Você tem ${unreadCount} notificações não lidas` : 'Todas as notificações foram lidas'}
            </p>
          </div>
        </div>
      </div>

      {}
      {notifications.length > 0 ? (
        <div className="space-y-4">
          {notifications.map((notification: any) => (
            <Card
              key={notification.id}
              className={`transition-all hover:shadow-md ${!notification.read ? 'border-l-4 border-l-orange-500 bg-orange-50/50' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notification.description || notification.title || 'Notificação'}
                      </h3>
                      <Badge className={getNotificationBadgeColor(notification.type)}>
                        {notification.type}
                      </Badge>
                      {!notification.read && (
                        <Badge className="bg-orange-500 text-white">Nova</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.message || notification.description}
                    </p>
                    {notification.property && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Imóvel: {notification.property.name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {formatDateTime(notification.creationDate || notification.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                        className="text-green-600 border-green-600 hover:bg-green-50"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setNotificationToDelete(notification)}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
