import { useQuery } from '@tanstack/react-query'
import { auditAPI } from '@/api'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import apiClient from '@/api/client'
import {
  FileText,
  Filter,
  Download,
  FileDown,
  User,
  Clock,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ChevronLeft
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
  const [searchInput, setSearchInput] = useState<string>('') // What user types
  const [activeSearch, setActiveSearch] = useState<string>('') // What we actually search for
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [page, setPage] = useState(1)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [entityFilter, activeSearch, startDate, endDate])

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

  const pageSize = 15

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['audit-logs', entityFilter, activeSearch, startDate, endDate, page],
    queryFn: () => auditAPI.getAuditLogs({
      entity: entityFilter && entityFilter !== 'all' ? entityFilter : undefined,
      page,
      pageSize: pageSize,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: activeSearch.trim() || undefined,
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
    if (event === 'LOGIN') return 'bg-green-600 text-white'
    if (event === 'LOGOUT') return 'bg-orange-600 text-white'
    if (event.includes('CREATE') || event.includes('create')) return 'bg-green-500 text-white'
    if (event.includes('UPDATE') || event.includes('update')) return 'bg-blue-500 text-white'
    if (event.includes('DELETE') || event.includes('delete')) return 'bg-red-500 text-white'
    return 'bg-gray-500 text-white'
  }

  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (entityFilter && entityFilter !== 'all') params.append('entity', entityFilter)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await apiClient.get(`/audit/export/csv?${params.toString()}`, {
        responseType: 'blob',
      })

      const blob = new Blob([response.data], { type: 'text/csv; charset=utf-8' })
      // Access headers - axios normalizes to lowercase, but check all possible formats
      // Headers are available but not currently used in this export

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success('Logs exportados com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao exportar logs')
    }
  }

  const exportToPDF = async () => {
    try {
      const params = new URLSearchParams()
      if (entityFilter && entityFilter !== 'all') params.append('entity', entityFilter)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await apiClient.get(`/audit/export/pdf?${params.toString()}`, {
        responseType: 'blob',
      })

      const blob = new Blob([response.data], { type: 'application/pdf' })
      // Access headers - axios normalizes to lowercase, but check all possible formats
      // Headers are available but not currently used in this export

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success('PDF exportado com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao exportar PDF')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        {/* Filters card skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Audit logs skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination skeleton */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs de Auditoria"
        subtitle="Visualize atividades e alterações do sistema"
        actions={
          <div className="flex gap-2">
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="border-orange-600 text-orange-600 hover:bg-orange-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button
              onClick={exportToPDF}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        }
      />

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
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setActiveSearch(searchInput) // Update active search when Enter is pressed
                    setPage(1) // Reset to first page when searching
                  }
                }}
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
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={getEventBadgeColor(log.event)}>
                          {log.event}
                        </Badge>
                        {(log.event === 'LOGIN' || log.event === 'LOGOUT') && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {log.event === 'LOGIN' ? '🔐 Entrada' : '🚪 Saída'}
                          </Badge>
                        )}
                        <Badge variant="outline">{log.entity}</Badge>
                        <span className="text-sm text-muted-foreground">
                          ID: {log.entityId}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2 flex-wrap">
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
                            <span className="font-mono text-xs">IP: {log.ip}</span>
                          </div>
                        )}
                        {log.integrityHash && (
                          <div className="flex items-center gap-1">
                            <ShieldCheck className="w-4 h-4" />
                            <span className="font-mono text-xs" title="Hash de Integridade">
                              Hash: {log.integrityHash.substring(0, 16)}...
                            </span>
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
                      {log.integrityHash && (
                        <div>
                          <Label className="text-xs font-semibold">Hash de Integridade</Label>
                          <p className="text-xs font-mono text-muted-foreground mt-1 break-all">{log.integrityHash}</p>
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Este hash garante a integridade e imutabilidade deste registro de auditoria.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {auditData && auditData.total > 0 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((auditData.page - 1) * pageSize) + 1} a {Math.min(auditData.page * pageSize, auditData.total)} de {auditData.total} registros
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, Math.ceil(auditData.total / pageSize)) }, (_, i) => {
                      const totalPages = Math.ceil(auditData.total / pageSize);
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (auditData.page <= 3) {
                        pageNum = i + 1;
                      } else if (auditData.page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = auditData.page - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={auditData.page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className="min-w-[40px]"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(Math.ceil(auditData.total / pageSize), p + 1))}
                    disabled={page >= Math.ceil(auditData.total / pageSize)}
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
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
