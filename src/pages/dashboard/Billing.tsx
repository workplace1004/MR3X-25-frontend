import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, AlertCircle, Receipt, Inbox, Database } from 'lucide-react'
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
import { PageHeader } from '../../components/PageHeader'

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
  agencies?: {
    total: number;
    withPayments: number;
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
      <PageHeader 
        title="Faturamento e Invoices" 
        subtitle="Gerencie faturas e receitas da plataforma"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Faturado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {billingData?.summary?.totalTransactions || 0} transações
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.thisMonth)}</div>
            <p className="text-xs text-muted-foreground mt-1 capitalize">{stats.currentMonth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pending)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {billingData?.summary?.pendingCount || 0} transações
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.paid)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {billingData?.summary?.paidCount || 0} transações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Billed Amounts Card */}
      <Card>
        <CardHeader>
          <CardTitle>Valores Faturados</CardTitle>
          <CardDescription>Resumo detalhado dos valores faturados por status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-700 mb-1">Total Recebido</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.paid)}</p>
              <p className="text-xs text-green-600 mt-1">
                {billingData?.summary?.paidCount || 0} transações pagas
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm font-medium text-yellow-700 mb-1">Aguardando Pagamento</p>
              <p className="text-2xl font-bold text-yellow-700">{formatCurrency(stats.pending)}</p>
              <p className="text-xs text-yellow-600 mt-1">
                {billingData?.summary?.pendingCount || 0} transações pendentes
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-700 mb-1">Vencido</p>
              <p className="text-2xl font-bold text-red-700">{formatCurrency(stats.overdue)}</p>
              <p className="text-xs text-red-600 mt-1">
                {billingData?.summary?.overdueCount || 0} transações vencidas
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Faturado (Histórico)</span>
              <span className="text-lg font-bold">{formatCurrency(stats.totalRevenue)}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-muted-foreground">Taxa de Conversão</span>
              <span className="text-sm font-medium">
                {stats.totalRevenue > 0 
                  ? `${((stats.paid / stats.totalRevenue) * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

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

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Receitas</CardTitle>
              <CardDescription>Resumo consolidado das receitas da plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Transações Pagas</p>
                  <p className="text-2xl font-bold text-green-700">{billingData?.summary?.paidCount || 0}</p>
                  <p className="text-xs text-green-600 mt-1">Total: {formatCurrency(stats.paid)}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-600 font-medium">Transações Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-700">{billingData?.summary?.pendingCount || 0}</p>
                  <p className="text-xs text-yellow-600 mt-1">Total: {formatCurrency(stats.pending)}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Transações Vencidas</p>
                  <p className="text-2xl font-bold text-red-700">{billingData?.summary?.overdueCount || 0}</p>
                  <p className="text-xs text-red-600 mt-1">Total: {formatCurrency(stats.overdue)}</p>
                </div>
              </div>
              
              {/* Financial History Summary */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">Histórico Financeiro Consolidado</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Receita Total Histórica</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Todas as transações desde o início</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Receita do Mês Atual</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.thisMonth)}</p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">{stats.currentMonth}</p>
                  </div>
                </div>

                {/* Detailed Financial History Table */}
                <div className="mt-4">
                  <h4 className="text-md font-semibold mb-3">Histórico Detalhado de Transações</h4>
                  {invoices.length === 0 ? (
                    <div className="text-center py-8">
                      <Database className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">Nenhuma transação registrada</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      <div className="hidden sm:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {invoices.slice(0, 50).map((invoice) => (
                              <TableRow key={invoice.id}>
                                <TableCell className="text-sm">
                                  {formatDate(invoice.paymentDate || invoice.issueDate)}
                                </TableCell>
                                <TableCell className="text-sm">{invoice.agencyName}</TableCell>
                                <TableCell>{getTypeBadge(invoice.type)}</TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(invoice.amount)}
                                </TableCell>
                                <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {invoices.length > 50 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            Mostrando 50 de {invoices.length} transações
                          </p>
                        )}
                      </div>

                      {/* Mobile view */}
                      <div className="block sm:hidden space-y-2">
                        {invoices.slice(0, 20).map((invoice) => (
                          <div key={invoice.id} className="p-3 border rounded-lg text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{invoice.agencyName}</span>
                              {getStatusBadge(invoice.status)}
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Data:</span>
                                <span>{formatDate(invoice.paymentDate || invoice.issueDate)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Tipo:</span>
                                {getTypeBadge(invoice.type)}
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Valor:</span>
                                <span className="font-semibold">{formatCurrency(invoice.amount)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {invoices.length > 20 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            Mostrando 20 de {invoices.length} transações
                          </p>
                        )}
                      </div>
                    </div>
                  )}
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

          {/* Client-level Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Breakdown por Cliente</CardTitle>
              <CardDescription>Detalhamento de receitas e faturas por agência/usuário</CardDescription>
            </CardHeader>
            <CardContent>
              {billingData?.agencies && (
                <div className="text-sm text-muted-foreground mb-4">
                  Total de agências ativas: {billingData.agencies.total} | 
                  Com pagamentos: {billingData.agencies.withPayments}
                </div>
              )}
              
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">Nenhum dado de cliente disponível</p>
                </div>
              ) : (
                <>
                  {/* Group invoices by agency/client */}
                  {(() => {
                    const clientMap = new Map<string, {
                      name: string;
                      totalBilled: number;
                      totalPaid: number;
                      totalPending: number;
                      totalOverdue: number;
                      invoiceCount: number;
                      lastPaymentDate: string | null;
                    }>();

                    invoices.forEach((invoice) => {
                      const clientKey = invoice.agencyId || invoice.id;
                      const clientName = invoice.agencyName || 'Cliente Indefinido';
                      
                      if (!clientMap.has(clientKey)) {
                        clientMap.set(clientKey, {
                          name: clientName,
                          totalBilled: 0,
                          totalPaid: 0,
                          totalPending: 0,
                          totalOverdue: 0,
                          invoiceCount: 0,
                          lastPaymentDate: null,
                        });
                      }

                      const client = clientMap.get(clientKey)!;
                      client.totalBilled += invoice.amount;
                      client.invoiceCount += 1;

                      if (invoice.status === 'paid') {
                        client.totalPaid += invoice.amount;
                        if (invoice.paymentDate && (!client.lastPaymentDate || new Date(invoice.paymentDate) > new Date(client.lastPaymentDate))) {
                          client.lastPaymentDate = invoice.paymentDate;
                        }
                      } else if (invoice.status === 'pending') {
                        client.totalPending += invoice.amount;
                      } else if (invoice.status === 'overdue') {
                        client.totalOverdue += invoice.amount;
                      }
                    });

                    const clientBreakdown = Array.from(clientMap.values()).sort((a, b) => b.totalBilled - a.totalBilled);

                    return (
                      <div className="space-y-4">
                        <div className="hidden sm:block">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead className="text-right">Total Faturado</TableHead>
                                <TableHead className="text-right">Pago</TableHead>
                                <TableHead className="text-right">Pendente</TableHead>
                                <TableHead className="text-right">Vencido</TableHead>
                                <TableHead className="text-right">Faturas</TableHead>
                                <TableHead>Último Pagamento</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {clientBreakdown.map((client, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{client.name}</TableCell>
                                  <TableCell className="text-right font-semibold">{formatCurrency(client.totalBilled)}</TableCell>
                                  <TableCell className="text-right text-green-600">{formatCurrency(client.totalPaid)}</TableCell>
                                  <TableCell className="text-right text-yellow-600">{formatCurrency(client.totalPending)}</TableCell>
                                  <TableCell className="text-right text-red-600">{formatCurrency(client.totalOverdue)}</TableCell>
                                  <TableCell className="text-right">{client.invoiceCount}</TableCell>
                                  <TableCell>{client.lastPaymentDate ? formatDate(client.lastPaymentDate) : '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Mobile view */}
                        <div className="block sm:hidden space-y-4">
                          {clientBreakdown.map((client, index) => (
                            <div key={index} className="p-4 border rounded-lg space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">{client.name}</h4>
                                <Badge variant="outline">{client.invoiceCount} fatura(s)</Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Total Faturado</p>
                                  <p className="font-semibold">{formatCurrency(client.totalBilled)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Pago</p>
                                  <p className="font-semibold text-green-600">{formatCurrency(client.totalPaid)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Pendente</p>
                                  <p className="font-semibold text-yellow-600">{formatCurrency(client.totalPending)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Vencido</p>
                                  <p className="font-semibold text-red-600">{formatCurrency(client.totalOverdue)}</p>
                                </div>
                              </div>
                              {client.lastPaymentDate && (
                                <div className="pt-2 border-t text-sm">
                                  <p className="text-muted-foreground">Último pagamento: {formatDate(client.lastPaymentDate)}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Faturamento e Fiscal</CardTitle>
              <CardDescription>Configure parâmetros de faturamento, pagamento e configurações fiscais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Configurações Fiscais</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure os parâmetros de numeração fiscal para faturas e recibos
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Formato de Token para Faturas:</span>
                      <Badge variant="outline">MR3X-FAT-{new Date().getFullYear()}-XXXX-XXXX</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Formato de Token para Recibos:</span>
                      <Badge variant="outline">MR3X-REC-{new Date().getFullYear()}-XXXX-XXXX</Badge>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Configurações de Split</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Taxa fixa de transação: 2% (Asaas)
                  </p>
                  <div className="text-sm text-muted-foreground">
                    <p>• A plataforma cobra uma taxa fixa de 2% sobre todas as transações</p>
                    <p>• O split de pagamentos é configurado individualmente por agência/proprietário</p>
                    <p>• Acesse "Configuração dividida" para ajustar porcentagens individuais</p>
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-blue-50">
                  <h3 className="font-semibold mb-2 text-blue-900">Informações Importantes</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Todas as faturas e recibos são gerados automaticamente</li>
                    <li>• Os tokens seguem o padrão fiscal brasileiro</li>
                    <li>• O histórico financeiro é mantido para auditoria e compliance</li>
                    <li>• Exportações de relatórios incluem hash de integridade</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
