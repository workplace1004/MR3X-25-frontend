import { useState } from 'react'
import { Download, TrendingUp, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { formatCurrency } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'

export default function BillingPage() {
  const { hasPermission } = useAuth()

  const canViewBilling = hasPermission('billing:read')

  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Mock data - will be replaced with real API calls
  const invoices = [
    {
      id: 'INV-001',
      agencyName: 'Imóveis Central',
      plan: 'Pro',
      amount: 99.90,
      issueDate: new Date('2024-01-15'),
      dueDate: new Date('2024-01-30'),
      status: 'paid',
      paymentDate: new Date('2024-01-18'),
    },
    {
      id: 'INV-002',
      agencyName: 'Real Estate Premium',
      plan: 'Unlimited',
      amount: 299.90,
      issueDate: new Date('2024-01-15'),
      dueDate: new Date('2024-01-30'),
      status: 'pending',
      paymentDate: null,
    },
    {
      id: 'INV-003',
      agencyName: 'Casa & Cia',
      plan: 'Free',
      amount: 0,
      issueDate: new Date('2024-01-15'),
      dueDate: new Date('2024-01-30'),
      status: 'paid',
      paymentDate: new Date('2024-01-15'),
    },
  ]

  const stats = {
    totalRevenue: 45870.50,
    thisMonth: 12450.80,
    pending: 899.80,
    paid: 43970.70,
  }

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Faturamento e Invoices</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gerencie faturas e receitas da plataforma
          </p>
        </div>
      </div>

      {/* Stats Cards */}
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
            <p className="text-xs text-muted-foreground mt-1">Janeiro 2024</p>
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
          <TabsTrigger value="invoices">Faturas</TabsTrigger>
          <TabsTrigger value="revenue">Receitas</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Faturas</CardTitle>
                  <CardDescription>Lista de todas as faturas emitidas</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
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
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Fatura</TableHead>
                    <TableHead>Agência</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.id}</TableCell>
                      <TableCell>{invoice.agencyName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{invoice.plan}</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell>{invoice.issueDate.toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{invoice.dueDate.toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Receitas</CardTitle>
              <CardDescription>Gráficos e estatísticas de receitas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Gráficos de receitas serão implementados em breve</p>
              </div>
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
