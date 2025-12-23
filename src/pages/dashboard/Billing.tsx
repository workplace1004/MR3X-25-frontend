import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, AlertCircle, Receipt } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Skeleton } from '../../components/ui/skeleton'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'
import { dashboardAPI } from '../../api'

interface Invoice {
  id: string;
  transactionId: string;
  agencyName: string;
  agencyId: string | null;
  plan: string;
  type: string;
  description: string | null;
  amount: number;
  issueDate: string;
  dueDate: string | null;
  status: 'paid' | 'pending' | 'overdue';
  paymentDate: string | null;
  asaasPaymentId: string | null;
}

interface BillingData {
  stats: {
    totalRevenue: number;
    thisMonth: number;
    pending: number;
    overdue: number;
    paid: number;
    currentMonth: string;
  };
  invoices: Invoice[];
  summary: {
    totalTransactions: number;
    paidCount: number;
    pendingCount: number;
    overdueCount: number;
  };
}

export default function BillingPage() {
  const { hasPermission } = useAuth()
  const canViewBilling = hasPermission('billing:read')

  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: billingData, isLoading, error } = useQuery<BillingData>({
    queryKey: ['billing-data'],
    queryFn: () => dashboardAPI.getBillingData(),
    enabled: canViewBilling,
  });

  if (!canViewBilling) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para visualizar faturamento.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Receipt className="w-6 h-6 text-orange-700" />
            </div>
            <div>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96 mt-2" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-20 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">Erro ao carregar dados</h2>
          <p className="text-muted-foreground">Não foi possível carregar os dados de faturamento.</p>
        </div>
      </div>
    )
  }

  const stats = billingData?.stats || {
    totalRevenue: 0,
    thisMonth: 0,
    pending: 0,
    overdue: 0,
    paid: 0,
    currentMonth: 'Mês atual',
  };

  const invoices = billingData?.invoices || [];

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
    const matchesSearch = searchQuery === '' ||
      invoice.agencyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500 text-white">Pago</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500 text-white">Pendente</Badge>
      case 'overdue':
        return <Badge className="bg-red-500 text-white">Vencido</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'PLAN_UPGRADE':
        return <Badge variant="outline" className="bg-purple-50">Upgrade de Plano</Badge>
      case 'EXTRA_CONTRACT':
        return <Badge variant="outline" className="bg-blue-50">Contrato Extra</Badge>
      case 'INSPECTION':
        return <Badge variant="outline" className="bg-orange-50">Vistoria</Badge>
      case 'SETTLEMENT':
        return <Badge variant="outline" className="bg-green-50">Acordo</Badge>
      case 'SCREENING':
        return <Badge variant="outline" className="bg-cyan-50">Análise</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-100 rounded-lg">
            <Receipt className="w-6 h-6 text-orange-700" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Faturamento e Invoices</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gerencie faturas e receitas da plataforma
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Histórico completo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.thisMonth)}</div>
            <p className="text-xs text-muted-foreground mt-1 capitalize">{stats.currentMonth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pending)}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando pagamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.paid)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total recebido</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">Faturas ({filteredInvoices.length})</TabsTrigger>
          <TabsTrigger value="revenue">Receitas</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <CardTitle>Faturas</CardTitle>
                  <CardDescription>
                    {invoices.length === 0
                      ? 'Nenhuma fatura encontrada no sistema'
                      : `Total de ${invoices.length} transações registradas`}
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Input
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64"
                  />
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="overdue">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {filteredInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {invoices.length === 0
                      ? 'Nenhuma transação registrada ainda'
                      : 'Nenhuma fatura corresponde aos filtros selecionados'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="block sm:hidden divide-y divide-border">
                    {filteredInvoices.map((invoice) => (
                      <div key={invoice.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{invoice.id}</span>
                          {getStatusBadge(invoice.status)}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Agência</span>
                            <span className="font-medium">{invoice.agencyName}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Tipo</span>
                            {getTypeBadge(invoice.type)}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Plano</span>
                            <Badge variant="outline">{invoice.plan}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Valor</span>
                            <span className="font-semibold">{formatCurrency(invoice.amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Emissão</span>
                            <span>{formatDate(invoice.issueDate)}</span>
                          </div>
                          {invoice.dueDate && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Vencimento</span>
                              <span>{formatDate(invoice.dueDate)}</span>
                            </div>
                          )}
                          {invoice.paymentDate && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Pagamento</span>
                              <span className="text-green-600">{formatDate(invoice.paymentDate)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Agência</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Plano</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Emissão</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.id}</TableCell>
                            <TableCell>{invoice.agencyName}</TableCell>
                            <TableCell>{getTypeBadge(invoice.type)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{invoice.plan}</Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{formatCurrency(invoice.amount)}</TableCell>
                            <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                            <TableCell>{invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</TableCell>
                            <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Receitas</CardTitle>
              <CardDescription>Resumo das receitas da plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Transações Pagas</p>
                  <p className="text-2xl font-bold text-green-700">{billingData?.summary?.paidCount || 0}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-600 font-medium">Transações Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-700">{billingData?.summary?.pendingCount || 0}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Transações Vencidas</p>
                  <p className="text-2xl font-bold text-red-700">{billingData?.summary?.overdueCount || 0}</p>
                </div>
              </div>
              {stats.overdue > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    <strong>Atenção:</strong> Você possui {formatCurrency(stats.overdue)} em pagamentos vencidos.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Faturamento</CardTitle>
              <CardDescription>Configure parâmetros de faturamento e pagamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Configurações serão implementadas em breve</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
