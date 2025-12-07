import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { paymentsAPI, propertiesAPI, usersAPI } from '../../api'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { Download, DollarSign, Building2, Users, Calendar } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'

export default function Reports() {
  const { hasPermission } = useAuth()

  // Check permissions
  const canViewReports = hasPermission('reports:read')
  const canViewProperties = hasPermission('properties:read')
  const canViewUsers = hasPermission('users:read')
  const canViewPayments = hasPermission('payments:read')

  // Don't render if no permission
  if (!canViewReports) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view reports.</p>
        </div>
      </div>
    )
  }

  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState<number>(currentYear)
  const [loading, setLoading] = useState<boolean>(false)
  const [data, setData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])

  // Helper function to ensure data is always an array
  const ensureArray = (data: any): any[] => {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (data.data && Array.isArray(data.data)) return data.data
    if (data.items && Array.isArray(data.items)) return data.items
    return []
  }
  const [reportType, setReportType] = useState<'monthly' | 'property' | 'tenant'>('monthly')

  const years = useMemo(() => {
    return Array.from({ length: 5 }).map((_, idx) => currentYear - idx)
  }, [currentYear])

  // Load additional data only when needed (lazy loading)
  useEffect(() => {
    const loadData = async () => {
      try {
        // Only load properties and tenants when switching to those report types
        if (reportType === 'property' && canViewProperties && properties.length === 0) {
          const propertiesData = await propertiesAPI.getProperties()
          setProperties(ensureArray(propertiesData))
        }

        if (reportType === 'tenant' && canViewUsers && tenants.length === 0) {
          const tenantsData = await usersAPI.getTenants()
          setTenants(ensureArray(tenantsData))
        }

        // Only load payments when needed for property/tenant performance
        if ((reportType === 'property' || reportType === 'tenant') && canViewPayments && payments.length === 0) {
          const paymentsData = await paymentsAPI.getPayments()
          setPayments(ensureArray(paymentsData))
        }
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }
    loadData()
  }, [reportType, canViewProperties, canViewUsers, canViewPayments])

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await paymentsAPI.getAnnualReport(year)
        const backendData: any[] = Array.isArray(response) ? response : (response?.data || [])

        const monthToIndex = (m: any): number => {
          if (typeof m === 'number') return Math.min(Math.max(m, 1), 12)
          if (typeof m === 'string') {
            const map: Record<string, number> = {
              jan: 1, janeiro: 1,
              fev: 2, fevereiro: 2,
              mar: 3, março: 3, marco: 3,
              abr: 4, abril: 4,
              mai: 5, maio: 5,
              jun: 6, junho: 6,
              jul: 7, julho: 7,
              ago: 8, agosto: 8,
              set: 9, setembro: 9,
              out: 10, outubro: 10,
              nov: 11, novembro: 11,
              dez: 12, dezembro: 12,
            }
            const key = m.toString().trim().toLowerCase()
            return map[key] || 0
          }
          return 0
        }

        const totalsByMonth: Record<number, number> = {}
        backendData.forEach((item: any) => {
          const idx = monthToIndex(item.month ?? item.mes)
          const value: number = Number(
            item.value ?? item.total ?? item.totalPaid ?? item.amount ?? item.valor ?? 0
          )
          if (idx >= 1 && idx <= 12) {
            totalsByMonth[idx] = value
          }
        })

        const months = [
          { label: 'Jan', index: 1 },
          { label: 'Fev', index: 2 },
          { label: 'Mar', index: 3 },
          { label: 'Abr', index: 4 },
          { label: 'Mai', index: 5 },
          { label: 'Jun', index: 6 },
          { label: 'Jul', index: 7 },
          { label: 'Ago', index: 8 },
          { label: 'Set', index: 9 },
          { label: 'Out', index: 10 },
          { label: 'Nov', index: 11 },
          { label: 'Dez', index: 12 },
        ]

        const chartData = months.map(({ label, index }) => ({
          month: label,
          total: Number(totalsByMonth[index] || 0),
        }))

        setData(chartData)
      } catch (e) {
        setError('Não foi possível carregar o relatório.')
        setData([])
        toast.error('Erro ao carregar relatório')
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [year])

  const totalAno = useMemo(() => data.reduce((acc, cur) => acc + (Number(cur.total) || 0), 0), [data])

  // Calculate additional metrics
  const currentMonth = new Date().getMonth() + 1
  const currentMonthData = data.find(d => {
    const monthIndex = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].indexOf(d.month) + 1
    return monthIndex === currentMonth
  })
  const currentMonthTotal = currentMonthData?.total || 0

  // Property performance data
  const propertyPerformance = useMemo(() => {
    if (!Array.isArray(properties)) return []
    return properties.map(property => {
      const propertyPayments = payments.filter(p => p.propertyId === property.id)
      const totalRevenue = propertyPayments.reduce((sum, p) => sum + Number(p.amount || p.valorPago || 0), 0)
      return {
        name: property.name || property.address,
        revenue: totalRevenue,
        payments: propertyPayments.length
      }
    }).sort((a, b) => b.revenue - a.revenue)
  }, [properties, payments])

  // Tenant performance data
  const tenantPerformance = useMemo(() => {
    if (!Array.isArray(tenants)) return []
    return tenants.map(tenant => {
      const tenantPayments = payments.filter(p => p.tenantId === tenant.id)
      const totalPaid = tenantPayments.reduce((sum, p) => sum + Number(p.amount || p.valorPago || 0), 0)
      return {
        name: tenant.name,
        totalPaid,
        payments: tenantPayments.length
      }
    }).sort((a, b) => b.totalPaid - a.totalPaid)
  }, [tenants, payments])

  // Payment type distribution
  const paymentTypeData = useMemo(() => {
    if (!Array.isArray(payments)) return []
    const types = payments.reduce((acc, payment) => {
      const type = payment.paymentType || payment.tipo || 'Outros'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']
    return Object.entries(types).map(([type, count], index) => ({
      name: type,
      value: count,
      color: colors[index % colors.length]
    }))
  }, [payments])

  const handleExportReport = () => {
    toast.success('Relatório exportado com sucesso!')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Relatórios</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Análise completa de recebimentos e pagamentos
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Tipo de relatório" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="property">Por Imóvel</SelectItem>
              <SelectItem value="tenant">Por Inquilino</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExportReport} variant="outline" className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Main Report Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">
            {reportType === 'monthly' && `Recebimentos por mês - ${year}`}
            {reportType === 'property' && 'Performance por Imóvel'}
            {reportType === 'tenant' && 'Performance por Inquilino'}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {reportType === 'monthly' && 'Somatório de valores pagos em cada mês'}
            {reportType === 'property' && 'Receita gerada por cada imóvel'}
            {reportType === 'tenant' && 'Valores pagos por cada inquilino'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground py-8 sm:py-12 text-center">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : error ? (
            <div className="text-destructive py-8 sm:py-12 text-center">
              <div className="text-sm sm:text-base">{error}</div>
            </div>
          ) : (
            <>
              <div className="w-full" style={{ width: '100%', height: '320px', minHeight: '256px', minWidth: '200px', position: 'relative', overflow: 'hidden' }}>
                {(data.length > 0 || propertyPerformance.length > 0 || tenantPerformance.length > 0) && (
                  <ResponsiveContainer width="100%" height={300} minWidth={200} debounce={50}>
                  {reportType === 'monthly' ? (
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        fontSize={12}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        tickFormatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR')}`}
                        fontSize={12}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(v: number) => [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Total pago']}
                        labelStyle={{ fontSize: 12 }}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="total" name="Total pago" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : reportType === 'property' ? (
                    <BarChart data={propertyPerformance.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        fontSize={10}
                        tick={{ fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        tickFormatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR')}`}
                        fontSize={12}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(v: number) => [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
                        labelStyle={{ fontSize: 12 }}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="revenue" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <BarChart data={tenantPerformance.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        fontSize={10}
                        tick={{ fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        tickFormatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR')}`}
                        fontSize={12}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(v: number) => [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Total pago']}
                        labelStyle={{ fontSize: 12 }}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="totalPaid" name="Total pago" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                  </ResponsiveContainer>
                )}
                {data.length === 0 && propertyPerformance.length === 0 && tenantPerformance.length === 0 && (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Nenhum dado disponível para exibir</p>
                  </div>
                )}
              </div>
              <div className="mt-4 text-center">
                <div className="text-sm sm:text-base font-semibold text-primary">
                  {reportType === 'monthly' && `Total no ano: R$ ${totalAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  {reportType === 'property' && `Total de imóveis: ${properties.length}`}
                  {reportType === 'tenant' && `Total de inquilinos: ${tenants.length}`}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Anual
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Receita total do ano
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-primary">
              {formatCurrency(totalAno)}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {year}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Este Mês
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-green-600">
              {formatCurrency(currentMonthTotal)}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Recebimentos do mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Imóveis
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Total de imóveis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-blue-600">
              {properties.length}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Imóveis cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Users className="w-4 h-4" />
              Inquilinos
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Total de inquilinos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-purple-600">
              {tenants.length}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Inquilinos ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Types Distribution */}
        {paymentTypeData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tipos de Pagamento</CardTitle>
              <CardDescription>
                Distribuição dos métodos de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full" style={{ width: '100%', height: '256px', minHeight: '256px', minWidth: '200px', position: 'relative', overflow: 'hidden' }}>
                {paymentTypeData.length > 0 && (
                  <ResponsiveContainer width="100%" height={240} minWidth={200} debounce={50}>
                    <PieChart>
                      <Pie
                        data={paymentTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {paymentTypeData.length === 0 && (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Nenhum dado disponível</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Properties */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Imóveis</CardTitle>
            <CardDescription>
              Imóveis com maior receita
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {propertyPerformance.slice(0, 5).map((property, index) => (
                <div key={property.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{property.name}</p>
                      <p className="text-xs text-muted-foreground">{property.payments} pagamentos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrency(property.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
