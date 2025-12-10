import { useQuery } from '@tanstack/react-query'
import { auditAPI } from '@/api'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import {
  FileText,
  Filter,
  Download,
  User,
  Clock,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function formatDateTime(dateString: string) {
  try {
    return new Date(dateString).toLocaleString('pt-BR')
  } catch {
    return dateString
  }
}

export function Audit() {
  const { hasPermission } = useAuth()

  const canViewAudit = hasPermission('audit:read')

  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [page, setPage] = useState(1)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  if (!canViewAudit) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Voce nao tem permissao para visualizar logs de auditoria.</p>
        </div>
      </div>
    )
  }

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['audit-logs', entityFilter, searchQuery, startDate, endDate, page],
    queryFn: () => auditAPI.getAuditLogs({
      entity: entityFilter && entityFilter !== 'all' ? entityFilter : undefined,
      page,
      pageSize: 50,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    enabled: canViewAudit,
  })

  const toggleExpand = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  const getEventBadgeColor = (event: string) => {
    if (event.includes('CREATE') || event.includes('create')) return 'bg-green-500 text-white'
    if (event.includes('UPDATE') || event.includes('update')) return 'bg-blue-500 text-white'
    if (event.includes('DELETE') || event.includes('delete')) return 'bg-red-500 text-white'
    return 'bg-gray-500 text-white'
  }

  const exportToCSV = () => {
    if (!auditData?.items) return

    const headers = ['Data', 'Usuario', 'Evento', 'Entidade', 'ID da Entidade', 'Endereco IP', 'User Agent']
    const rows = auditData.items.map((log: any) => [
      formatDateTime(log.timestamp),
      log.user?.name || 'Desconhecido',
      log.event,
      log.entity,
      log.entityId,
      log.ip || '-',
      log.userAgent || '-'
    ])

    const csv = [headers.join(','), ...rows.map((row: any[]) => row.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString()}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Logs de auditoria exportados com sucesso')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Logs de Auditoria</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Visualize atividades e alteracoes do sistema
          </p>
        </div>
        <Button
          onClick={exportToCSV}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="entity">Tipo de Entidade</Label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger id="entity">
                  <SelectValue placeholder="Todas as entidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as entidades</SelectItem>
                  <SelectItem value="USER">Usuarios</SelectItem>
                  <SelectItem value="PROPERTY">Imóveis</SelectItem>
                  <SelectItem value="CONTRACT">Contratos</SelectItem>
                  <SelectItem value="PAYMENT">Pagamentos</SelectItem>
                  <SelectItem value="AGENCY">Agencias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <div className="grid">
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="col-span-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <div className="grid">
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="col-span-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                placeholder="Buscar logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      {auditData?.items && auditData.items.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Registro de Atividades ({auditData.total} total)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {auditData.items.map((log: any) => (
                <div
                  key={log.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getEventBadgeColor(log.event)}>
                          {log.event}
                        </Badge>
                        <Badge variant="outline">{log.entity}</Badge>
                        <span className="text-sm text-muted-foreground">
                          ID: {log.entityId}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {log.user?.name || 'Usuario Desconhecido'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDateTime(log.timestamp)}
                        </div>
                        {log.ip && (
                          <div className="flex items-center gap-1">
                            <span>IP: {log.ip}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(log.id.toString())}
                    >
                      {expandedLogs.has(log.id.toString()) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {expandedLogs.has(log.id.toString()) && (
                    <div className="mt-4 space-y-2 border-t pt-4">
                      <div>
                        <Label className="text-xs font-semibold">Dados Antes</Label>
                        <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                          {log.dataBefore || 'Sem dados'}
                        </pre>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Dados Depois</Label>
                        <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                          {log.dataAfter || 'Sem dados'}
                        </pre>
                      </div>
                      {log.userAgent && (
                        <div>
                          <Label className="text-xs font-semibold">User Agent</Label>
                          <p className="text-xs text-muted-foreground mt-1">{log.userAgent}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {}
            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Pagina {auditData.page} de {Math.ceil(auditData.total / auditData.pageSize)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(auditData.total / auditData.pageSize)}
                >
                  Proxima
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum log de auditoria encontrado</h3>
            <p className="text-muted-foreground">Tente ajustar seus filtros</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
