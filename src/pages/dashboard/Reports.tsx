import { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { paymentsAPI, propertiesAPI, usersAPI, financialReportsAPI } from '../../api'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { Download, DollarSign, Building2, Users, Calendar, BarChart3, FileDown } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { useQuery } from '@tanstack/react-query'

export default function Reports() {
  const { hasPermission, user } = useAuth()

  const canViewReports = hasPermission('reports:read')
  const canViewProperties = hasPermission('properties:read')
  const canViewUsers = hasPermission('users:read')
  const canViewPayments = hasPermission('payments:read')
  
  // INQUILINO cannot access financial reports
  const canAccessFinancialReports = canViewReports && user?.role !== 'INQUILINO'

  const currentYear = new Date().getFullYear()
  const [year] = useState<number>(currentYear)
  const [loading, setLoading] = useState<boolean>(false)
  const [data, setData] = useState<Array<{ month: string; total: number }>>([])
  const [error, setError] = useState<string | null>(null)
  const [properties, setProperties] = useState<Array<{ id: string; name?: string; address?: string }>>([])
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([])
  const [payments, setPayments] = useState<Array<{ propertyId?: string; tenantId?: string; amount?: number; valorPago?: number; paymentType?: string; tipo?: string }>>([])
  const [reportType] = useState<'monthly' | 'property' | 'tenant'>('monthly')
  const [financialReportType, setFinancialReportType] = useState<'daily' | 'monthly' | 'annual'>('monthly')
  const [isChartReady, setIsChartReady] = useState<boolean>(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const pieChartContainerRef = useRef<HTMLDivElement>(null)

  // Fetch financial report data
  const { data: financialReport } = useQuery({
    queryKey: ['financial-report', financialReportType],
    queryFn: () => financialReportsAPI.generateReport({ type: financialReportType }),
    enabled: canAccessFinancialReports,
  })

  useEffect(() => {
    // Ensure charts only render after container has dimensions
    const timer = setTimeout(() => {
      setIsChartReady(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [data, reportType])

  const ensureArray = <T,>(input: T | T[] | { data?: T[]; items?: T[] } | null | undefined): T[] => {
    if (!input) return []
    if (Array.isArray(input)) return input
    if (typeof input === 'object' && input !== null) {
      if ('data' in input && Array.isArray(input.data)) return input.data
      if ('items' in input && Array.isArray(input.items)) return input.items
    }
    return []
  }


  // Load properties, tenants and payments for stats display (regardless of reportType)
  useEffect(() => {
    if (!canViewReports) return

    const loadData = async () => {
      try {
        // Always load properties for stats display
        if (canViewProperties && properties.length === 0) {
          const propertiesData = await propertiesAPI.getProperties()
          const propertiesArray = ensureArray(propertiesData)
          
          // For INQUILINO, filter to show only properties linked to their contracts
          if (user?.role === 'INQUILINO' && user?.id) {
            const filteredProperties = propertiesArray.filter((p: any) => 
              p.tenantId === user.id || String(p.tenantId) === String(user.id)
            )
            setProperties(filteredProperties)
          } else {
            setProperties(propertiesArray)
          }
        }

        // Always load tenants for stats display
        if (canViewUsers && tenants.length === 0) {
          const tenantsData = await usersAPI.getTenants()
          setTenants(ensureArray(tenantsData))
        }
      } catch (err) {
        console.error('Error loading data:', err)
      }
    }
    loadData()
  }, [canViewProperties, canViewUsers, canViewReports, properties.length, tenants.length, user?.id, user?.role])

  // Load payments separately after properties are loaded (for INQUILINO filtering)
  useEffect(() => {
    if (!canViewReports || !canViewPayments || payments.length > 0) return

    const loadPayments = async () => {
      try {
        const paymentsData = await paymentsAPI.getPayments()
        const paymentsArray = ensureArray(paymentsData)
        
        // For INQUILINO, filter to show only payments for their properties or their own payments
        if (user?.role === 'INQUILINO' && user?.id && properties.length > 0) {
          const tenantProperties = properties.map((p: any) => p.id)
          
          const filteredPayments = paymentsArray.filter((p: any) => 
            tenantProperties.includes(p.propertyId) || 
            tenantProperties.includes(String(p.propertyId)) ||
            p.tenantId === user.id || 
            String(p.tenantId) === String(user.id)
          )
          setPayments(filteredPayments)
        } else if (user?.role !== 'INQUILINO') {
          setPayments(paymentsArray)
        }
      } catch (err) {
        console.error('Error loading payments:', err)
      }
    }
    loadPayments()
  }, [canViewPayments, canViewReports, payments.length, properties, user?.id, user?.role])

  useEffect(() => {
    if (!canViewReports) return

    const fetchReport = async () => {
      setLoading(true)
      setError(null)
      try {
        // Use financial report data if available and user has access, otherwise fall back to annual report
        if (canAccessFinancialReports && financialReport && financialReport.transactions) {
          let chartData: Array<{ month: string; total: number }> = []

          if (financialReportType === 'daily') {
            // For daily reports, we'll show hours (0-23) 
            // Note: Since transactions only have dates, not times, we'll show the total distributed
            // In a production system, you'd want to fetch payment timestamps from the backend
            const totalsByHour: Record<number, number> = {}
            const transactions = financialReport.transactions.filter((t: any) => t.type === 'REVENUE')
            
            if (transactions.length > 0) {
              // Distribute transactions evenly across hours, or show total in a single hour
              // For now, show all transactions in hour 12 (noon) as a placeholder
              // In production, you'd want actual payment timestamps
              const totalDaily = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
              totalsByHour[12] = totalDaily
            }

            // Merge with previous data if available
            const previousTotalsByHour: Record<number, number> = {}
            if (previousData.length > 0) {
              previousData.forEach((item, idx) => {
                previousTotalsByHour[idx] = item.total
              })
            }

            chartData = Array.from({ length: 24 }, (_, i) => ({
              month: `${i.toString().padStart(2, '0')}h`,
              total: Number(totalsByHour[i] || 0),
              previous: Number(previousTotalsByHour[i] || 0),
            }))
          } else if (financialReportType === 'monthly') {
            // Group by day of month (1-31)
            const totalsByDay: Record<number, number> = {}
            financialReport.transactions
              .filter((t: any) => t.type === 'REVENUE')
              .forEach((t: any) => {
                const date = new Date(t.date)
                const day = date.getDate()
                totalsByDay[day] = (totalsByDay[day] || 0) + (t.amount || 0)
              })

            // Merge with previous data if available
            const previousTotalsByDay: Record<number, number> = {}
            if (previousData.length > 0) {
              previousData.forEach((item) => {
                const day = parseInt(item.month)
                if (!isNaN(day)) {
                  previousTotalsByDay[day] = item.total
                }
              })
            }

            const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
            chartData = Array.from({ length: daysInMonth }, (_, i) => ({
              month: `${i + 1}`,
              total: Number(totalsByDay[i + 1] || 0),
              previous: Number(previousTotalsByDay[i + 1] || 0),
            }))
          } else if (financialReportType === 'annual') {
            // Group by month (1-12)
            const totalsByMonth: Record<number, number> = {}
            financialReport.transactions
              .filter((t: any) => t.type === 'REVENUE')
              .forEach((t: any) => {
                const date = new Date(t.date)
                const month = date.getMonth() + 1
                totalsByMonth[month] = (totalsByMonth[month] || 0) + (t.amount || 0)
              })

            // Merge with previous data if available
            const previousTotalsByMonth: Record<number, number> = {}
            if (previousData.length > 0) {
              previousData.forEach((item) => {
                const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                const monthIndex = monthLabels.indexOf(item.month) + 1
                if (monthIndex > 0) {
                  previousTotalsByMonth[monthIndex] = item.total
                }
              })
            }

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

            chartData = months.map(({ label, index }) => ({
              month: label,
              total: Number(totalsByMonth[index] || 0),
              previous: Number(previousTotalsByMonth[index] || 0),
            }))
          }

          setData(chartData)
        } else {
          // Fallback to annual report for backward compatibility
          const response = await paymentsAPI.getAnnualReport(year)
          const backendData = Array.isArray(response) ? response : (response?.monthly || response?.data || [])

          const monthToIndex = (m: string | number | undefined): number => {
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
          backendData.forEach((item: { month?: string | number; mes?: string | number; value?: number; total?: number; totalPaid?: number; amount?: number; valor?: number }) => {
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
        }
      } catch {
        setError('Não foi possível carregar o relatório.')
        setData([])
        toast.error('Erro ao carregar relatório')
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [year, canViewReports, financialReport, financialReportType])

  // Fetch previous period data for comparison
  const [previousData, setPreviousData] = useState<Array<{ month: string; total: number }>>([])
  
  useEffect(() => {
    if (!canAccessFinancialReports || !financialReport) return

    const fetchPreviousData = async () => {
      try {
        let previousReport: any = null
        
        if (financialReportType === 'daily') {
          // Get previous day
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          previousReport = await financialReportsAPI.generateReport({ 
            type: 'daily',
            startDate: yesterday.toISOString().split('T')[0],
            endDate: yesterday.toISOString().split('T')[0]
          })
        } else if (financialReportType === 'monthly') {
          // Get previous month
          const lastMonth = new Date()
          lastMonth.setMonth(lastMonth.getMonth() - 1)
          previousReport = await financialReportsAPI.generateReport({ 
            type: 'monthly',
            startDate: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString().split('T')[0],
            endDate: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString().split('T')[0]
          })
        } else if (financialReportType === 'annual') {
          // Get previous year
          const lastYear = year - 1
          previousReport = await financialReportsAPI.generateReport({ 
            type: 'annual',
            startDate: new Date(lastYear, 0, 1).toISOString().split('T')[0],
            endDate: new Date(lastYear, 11, 31).toISOString().split('T')[0]
          })
        }

        if (previousReport && previousReport.transactions) {
          let chartData: Array<{ month: string; total: number }> = []

          if (financialReportType === 'daily') {
            const totalsByHour: Record<number, number> = {}
            const transactions = previousReport.transactions.filter((t: any) => t.type === 'REVENUE')
            
            if (transactions.length > 0) {
              const totalDaily = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
              totalsByHour[12] = totalDaily
            }

            chartData = Array.from({ length: 24 }, (_, i) => ({
              month: `${i.toString().padStart(2, '0')}h`,
              total: Number(totalsByHour[i] || 0),
            }))
          } else if (financialReportType === 'monthly') {
            const totalsByDay: Record<number, number> = {}
            previousReport.transactions
              .filter((t: any) => t.type === 'REVENUE')
              .forEach((t: any) => {
                const date = new Date(t.date)
                const day = date.getDate()
                totalsByDay[day] = (totalsByDay[day] || 0) + (t.amount || 0)
              })

            const lastMonth = new Date()
            lastMonth.setMonth(lastMonth.getMonth() - 1)
            const daysInMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).getDate()
            chartData = Array.from({ length: daysInMonth }, (_, i) => ({
              month: `${i + 1}`,
              total: Number(totalsByDay[i + 1] || 0),
            }))
          } else if (financialReportType === 'annual') {
            const totalsByMonth: Record<number, number> = {}
            previousReport.transactions
              .filter((t: any) => t.type === 'REVENUE')
              .forEach((t: any) => {
                const date = new Date(t.date)
                const month = date.getMonth() + 1
                totalsByMonth[month] = (totalsByMonth[month] || 0) + (t.amount || 0)
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

            chartData = months.map(({ label, index }) => ({
              month: label,
              total: Number(totalsByMonth[index] || 0),
            }))
          }

          setPreviousData(chartData)
        }
      } catch (error) {
        console.error('Error fetching previous period data:', error)
        setPreviousData([])
      }
    }

    fetchPreviousData()
  }, [financialReport, financialReportType, year, canAccessFinancialReports])

  const totalAno = useMemo(() => data.reduce((acc, cur) => acc + (Number(cur.total) || 0), 0), [data])

  const currentMonth = new Date().getMonth() + 1
  const currentMonthData = data.find(d => {
    const monthIndex = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].indexOf(d.month) + 1
    return monthIndex === currentMonth
  })
  const currentMonthTotal = currentMonthData?.total || 0

  const propertyPerformance = useMemo(() => {
    if (!Array.isArray(properties)) return []
    return properties.map(property => {
      const propertyPayments = payments.filter(p => p.propertyId === property.id)
      const totalRevenue = propertyPayments.reduce((sum, p) => sum + Number(p.amount || p.valorPago || 0), 0)
      return {
        name: property.name || property.address || '',
        revenue: totalRevenue,
        payments: propertyPayments.length
      }
    }).sort((a, b) => b.revenue - a.revenue)
  }, [properties, payments])

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

  const handleExportReport = async (format: 'csv' | 'pdf') => {
    if (!canAccessFinancialReports) {
      toast.error('Você não tem permissão para exportar relatórios financeiros');
      return;
    }

    try {
      let blob: Blob;
      let filename: string;
      let hash: string | null = null;

      if (format === 'csv') {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/financial-reports/export/csv?type=${financialReportType}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
          }
        );
        if (!response.ok) throw new Error('Failed to export CSV');
        blob = await response.blob();
        hash = response.headers.get('X-Integrity-Hash');
        filename = `relatorio-financeiro-${financialReportType}-${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/financial-reports/export/pdf?type=${financialReportType}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
          }
        );
        if (!response.ok) throw new Error('Failed to export PDF');
        blob = await response.blob();
        hash = response.headers.get('X-Integrity-Hash');
        filename = `relatorio-financeiro-${financialReportType}-${new Date().toISOString().split('T')[0]}.pdf`;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success(`${format.toUpperCase()} exportado! ${hash ? `Hash: ${hash.substring(0, 16)}...` : ''}`);
    } catch (error: any) {
      toast.error(error.message || `Erro ao exportar ${format.toUpperCase()}`);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Skeleton className="h-10 w-full sm:w-40 rounded" />
            <Skeleton className="h-10 w-full sm:w-40 rounded" />
            <Skeleton className="h-10 w-full sm:w-auto sm:w-32 rounded" />
          </div>
        </div>

        {/* Main chart card skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64 mb-2" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent>
            <Skeleton className="w-full h-[320px] rounded" />
            <div className="mt-4 text-center">
              <Skeleton className="h-5 w-48 mx-auto" />
            </div>
          </CardContent>
        </Card>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-4 w-32 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom section skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie chart skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="w-full h-[256px] rounded" />
            </CardContent>
          </Card>

          {/* Top properties skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-lg">
            <BarChart3 className="w-6 h-6 text-purple-700" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Relatórios</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {canAccessFinancialReports 
                ? 'Relatórios de receitas e despesas para a Receita Federal (diário, mensal, anual) com hash de integridade'
                : 'Visualize relatórios de pagamentos e performance'}
            </p>
          </div>
        </div>
        {canAccessFinancialReports && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={financialReportType} onValueChange={(v: any) => setFinancialReportType(v)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="annual">Anual</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => handleExportReport('csv')} variant="outline" className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={() => handleExportReport('pdf')} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white">
              <FileDown className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        )}
      </div>

      {/* Financial Report Summary for Brazilian Federal Revenue */}
      {canAccessFinancialReports && financialReport && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">
                {financialReportType === 'daily' && 'Recebimentos Diários'}
                {financialReportType === 'monthly' && 'Recebimentos por Mês'}
                {financialReportType === 'annual' && 'Recebimentos Anuais'}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {financialReportType === 'daily' && `Período: ${new Date(financialReport.period.start).toLocaleDateString('pt-BR')}`}
                {financialReportType === 'monthly' && `Período: ${new Date(financialReport.period.start).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}
                {financialReportType === 'annual' && `Ano: ${new Date(financialReport.period.start).getFullYear()}`}
              </CardDescription>
            </CardHeader>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(financialReport.summary.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">{financialReport.summary.revenueTransactions || 0} transações</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Despesas Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(financialReport.summary.totalExpenses)}</div>
              <p className="text-xs text-muted-foreground mt-1">{financialReport.summary.expenseTransactions || 0} transações</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(financialReport.summary.netIncome)}</div>
              <p className="text-xs text-muted-foreground mt-1">Receita - Despesas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Hash de Integridade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs font-mono break-all">{financialReport.hash?.substring(0, 32)}...</div>
              <p className="text-xs text-muted-foreground mt-1">Gerado em: {new Date(financialReport.generatedAt).toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">IP: {financialReport.ip}</p>
            </CardContent>
          </Card>
        </div>
        </>
      )}

      {}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">
            {reportType === 'monthly' && canAccessFinancialReports && (
              <>
                {financialReportType === 'daily' && `Recebimentos Diários - ${new Date().toLocaleDateString('pt-BR')}`}
                {financialReportType === 'monthly' && `Recebimentos por Mês - ${year}`}
                {financialReportType === 'annual' && `Recebimentos Anuais - ${year}`}
              </>
            )}
            {reportType === 'monthly' && !canAccessFinancialReports && `Recebimentos por Mês - ${year}`}
            {reportType === 'property' && 'Performance por Imóvel'}
            {reportType === 'tenant' && 'Performance por Inquilino'}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {reportType === 'monthly' && canAccessFinancialReports && (
              <>
                {financialReportType === 'daily' && 'Somatório de valores pagos no dia'}
                {financialReportType === 'monthly' && 'Somatório de valores pagos em cada mês'}
                {financialReportType === 'annual' && 'Somatório de valores pagos no ano'}
              </>
            )}
            {reportType === 'monthly' && !canAccessFinancialReports && 'Somatório de valores pagos em cada mês'}
            {reportType === 'property' && 'Receita gerada por cada imóvel'}
            {reportType === 'tenant' && 'Valores pagos por cada inquilino'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-destructive py-8 sm:py-12 text-center">
              <div className="text-sm sm:text-base">{error}</div>
            </div>
          ) : (
            <>
              <div 
              ref={chartContainerRef}
              className="w-full" 
              style={{ width: '100%', height: '320px', minHeight: '256px', minWidth: '200px', position: 'relative', overflow: 'hidden' }}
            >
                {(data.length > 0 || propertyPerformance.length > 0 || tenantPerformance.length > 0) && isChartReady && (
                  <ResponsiveContainer width="100%" height={300} minWidth={200} minHeight={256} debounce={50}>
                  {reportType === 'monthly' ? (
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        fontSize={12}
                        tick={{ fontSize: 12 }}
                        angle={canAccessFinancialReports && (financialReportType === 'daily' || financialReportType === 'monthly') ? -45 : 0}
                        textAnchor={canAccessFinancialReports && (financialReportType === 'daily' || financialReportType === 'monthly') ? 'end' : 'middle'}
                        height={canAccessFinancialReports && (financialReportType === 'daily' || financialReportType === 'monthly') ? 60 : 30}
                      />
                      <YAxis
                        tickFormatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR')}`}
                        fontSize={12}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(v: number, name: string) => {
                          const label = name === 'total' ? 'Atual' : name === 'previous' ? 'Anterior' : 'Total pago'
                          return [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, label]
                        }}
                        labelStyle={{ fontSize: 12 }}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="total" name="Atual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      {previousData.length > 0 && (
                        <Bar dataKey="previous" name="Anterior" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} opacity={0.7} />
                      )}
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

      {}
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

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {}
        {paymentTypeData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tipos de Pagamento</CardTitle>
              <CardDescription>
                Distribuição dos métodos de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                ref={pieChartContainerRef}
                className="w-full" 
                style={{ width: '100%', height: '256px', minHeight: '256px', minWidth: '200px', position: 'relative', overflow: 'hidden' }}
              >
                {paymentTypeData.length > 0 && isChartReady && (
                  <ResponsiveContainer width="100%" height={240} minWidth={200} minHeight={240} debounce={50}>
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

        {}
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
