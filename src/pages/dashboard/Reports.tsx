import { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { paymentsAPI, propertiesAPI, usersAPI, financialReportsAPI, invoicesAPI } from '../../api'
import apiClient from '../../api/client'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { Download, FileDown, DollarSign, Building2, Users, Calendar, BarChart3 } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../../components/PageHeader'

export default function Reports() {
  const { hasPermission, user } = useAuth()

  const canViewReports = hasPermission('reports:read') || user?.role === 'CEO' || user?.role === 'ADMIN'
  const canViewProperties = hasPermission('properties:read')
  const canViewUsers = hasPermission('users:read')
  const canViewPayments = hasPermission('payments:read')

  // INQUILINO cannot access financial reports
  const canAccessFinancialReports = canViewReports && user?.role !== 'INQUILINO'

  const currentYear = new Date().getFullYear()
  const initialMonth = new Date().getMonth() + 1
  const initialDay = new Date().getDate()
  const [year, setYear] = useState<number>(currentYear)
  const [month, setMonth] = useState<number>(initialMonth)
  const [day, setDay] = useState<number>(initialDay)
  const [loading, setLoading] = useState<boolean>(false)

  // Update day when month or year changes to ensure valid date
  useEffect(() => {
    const daysInMonth = new Date(year, month, 0).getDate()
    if (day > daysInMonth) {
      setDay(daysInMonth)
    }
  }, [year, month, day])
  const [data, setData] = useState<Array<{ month: string; total: number; completed?: number; pending?: number }>>([])
  const [error, setError] = useState<string | null>(null)
  const [properties, setProperties] = useState<Array<{ id: string; name?: string; address?: string }>>([])
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([])
  const [payments, setPayments] = useState<Array<{ propertyId?: string; tenantId?: string; amount?: number; valorPago?: number; paymentType?: string; tipo?: string; status?: string }>>([])
  const [invoices, setInvoices] = useState<Array<{ propertyId?: string; tenantId?: string; amount?: number; valorPago?: number; paymentType?: string; tipo?: string; isInvoice?: boolean; status?: string }>>([])
  const [pendingPayments, setPendingPayments] = useState<Array<{ propertyId?: string; tenantId?: string; amount?: number; valorPago?: number; paymentType?: string; tipo?: string; status?: string; dueDate?: string | Date }>>([])
  const [pendingInvoices, setPendingInvoices] = useState<Array<{ propertyId?: string; tenantId?: string; amount?: number; valorPago?: number; paymentType?: string; tipo?: string; isInvoice?: boolean; status?: string; dueDate?: string | Date }>>([])
  const [reportType] = useState<'monthly' | 'property' | 'tenant'>('monthly')
  const [financialReportType, setFinancialReportType] = useState<'daily' | 'monthly' | 'annual'>('annual')
  const [isChartReady, setIsChartReady] = useState<boolean>(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const pieChartContainerRef = useRef<HTMLDivElement>(null)

  // Fetch financial report data
  const { data: financialReport } = useQuery({
    queryKey: ['financial-report', financialReportType, year, month, day],
    queryFn: () => {
      const params: any = { type: financialReportType };
      if (financialReportType === 'annual') {
        params.startDate = new Date(year, 0, 1).toISOString().split('T')[0];
        params.endDate = new Date(year, 11, 31).toISOString().split('T')[0];
      } else if (financialReportType === 'monthly') {
        params.startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
        params.endDate = new Date(year, month, 0).toISOString().split('T')[0];
      } else if (financialReportType === 'daily') {
        params.startDate = new Date(year, month - 1, day).toISOString().split('T')[0];
        params.endDate = new Date(year, month - 1, day).toISOString().split('T')[0];
      }
      return financialReportsAPI.generateReport(params);
    },
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

  // Helper function to check if a payment is completed (only completed payments count as income)
  const isCompletedPayment = (payment: any): boolean => {
    // For invoices: must be PAID status and have paidAt date
    if (payment.isInvoice) {
      return payment.status === 'PAID' && !!payment.paidAt && !!payment.paidValue
    }
    // For payments: must be PAID or PAGO status
    const status = payment.status?.toUpperCase()
    return status === 'PAID' || status === 'PAGO'
  }

  // Helper function to check if a payment/invoice should be excluded due to duplication
  // If an invoice is PAID and there's a corresponding Payment record, exclude the invoice
  const shouldExcludeForDuplication = (item: any, allItems: any[]): boolean => {
    // Only check invoices that are PAID
    if (!item.isInvoice || item.status !== 'PAID') {
      return false
    }

    // Check if there's a matching Payment record (created from this invoice)
    const hasMatchingPayment = allItems.some((p: any) => {
      // Skip if it's also an invoice
      if (p.isInvoice) return false

      // Match by contract, date (same day), and similar value
      const invoiceContractId = item.contractId?.toString() || item.contract?.id?.toString()
      const paymentContractId = p.contratoId?.toString() || p.contractId?.toString()
      
      const invoiceDate = item.paidAt || item.paymentDate || item.dataPagamento
      const paymentDate = p.dataPagamento || p.paymentDate
      
      const invoiceValue = Number(item.paidValue || item.amount || item.valorPago || 0)
      const paymentValue = Number(p.valorPago || p.amount || 0)
      
      const invoicePropertyId = item.propertyId?.toString() || item.property?.id?.toString()
      const paymentPropertyId = p.propertyId?.toString() || p.property?.id?.toString()
      
      const contractMatch = invoiceContractId && paymentContractId && invoiceContractId === paymentContractId
      const propertyMatch = invoicePropertyId && paymentPropertyId && invoicePropertyId === paymentPropertyId
      const dateMatch = invoiceDate && paymentDate && 
        new Date(invoiceDate).toDateString() === new Date(paymentDate).toDateString()
      const valueMatch = Math.abs(invoiceValue - paymentValue) < 0.01
      
      return (contractMatch || propertyMatch) && dateMatch && valueMatch
    })

    // Exclude invoice if there's a matching payment
    return hasMatchingPayment
  }


  // Load properties, tenants and payments for stats display (regardless of reportType)
  useEffect(() => {
    if (!canViewReports) return

    const loadData = async () => {
      try {
        // Always load properties for stats display
        // For ADMIN/CEO, always reload to ensure all properties are loaded (including from agencies and independent owners)
        // ADMIN/CEO should be able to see properties count even without properties:read permission (for stats display)
        const shouldLoadProperties = (canViewProperties || user?.role === 'ADMIN' || user?.role === 'CEO') && (properties.length === 0 || user?.role === 'ADMIN' || user?.role === 'CEO')
        
        if (shouldLoadProperties) {
          try {
            // For ADMIN/CEO, fetch all properties (use a large take value to get all)
            // For other roles, use default pagination
            const takeValue = (user?.role === 'ADMIN' || user?.role === 'CEO') ? 10000 : undefined
            const propertiesData = await propertiesAPI.getProperties({ take: takeValue })
            const propertiesArray = ensureArray(propertiesData)

            // For INQUILINO, filter to show only properties linked to their contracts
            if (user?.role === 'INQUILINO' && user?.id) {
              const filteredProperties = propertiesArray.filter((p: any) =>
                p.tenantId === user.id || String(p.tenantId) === String(user.id)
              )
              setProperties(filteredProperties)
            } else if (user?.role === 'PROPRIETARIO' && user?.id) {
              // For PROPRIETARIO, filter to show only owned properties
              const filteredProperties = propertiesArray.filter((p: any) =>
                p.ownerId === user.id ||
                String(p.ownerId) === String(user.id) ||
                p.owner?.id === user.id ||
                String(p.owner?.id) === String(user.id)
              )
              setProperties(filteredProperties)
            } else {
              // For ADMIN, CEO, AGENCY_ADMIN, AGENCY_MANAGER, etc. - show all properties
              // This includes properties from agencies (Diretor Agência) and independent owners (Proprietários Independentes)
              setProperties(propertiesArray)
            }
          } catch (err) {
            console.error('Error loading properties:', err)
            // Set empty array on error to avoid undefined
            setProperties([])
          }
        }

        // Always load tenants for stats display
        // For ADMIN/CEO, always reload to ensure all tenants are loaded (including from agencies and independent owners)
        const shouldLoadTenants = canViewUsers && (tenants.length === 0 || user?.role === 'ADMIN' || user?.role === 'CEO')
        if (shouldLoadTenants) {
          try {
            const tenantsData = await usersAPI.getTenants()
            const tenantsArray = ensureArray(tenantsData)
            // For ADMIN, CEO, etc. - show all tenants (no filtering needed)
            // This includes tenants from agencies (Diretor Agência) and independent owners (Proprietários Independentes)
            setTenants(tenantsArray)
          } catch (err) {
            console.error('Error loading tenants:', err)
            // Set empty array on error to avoid undefined
            setTenants([])
          }
        }
      } catch (err) {
        console.error('Error loading data:', err)
      }
    }
    loadData()
  }, [canViewProperties, canViewUsers, canViewReports, user?.id, user?.role])

  // Load payments and invoices separately after properties are loaded (for INQUILINO filtering)
  useEffect(() => {
    // ADMIN/CEO should be able to load payments/invoices for stats even without payments:read permission
    if (!canViewReports || (!canViewPayments && user?.role !== 'ADMIN' && user?.role !== 'CEO')) return

    const loadPaymentsAndInvoices = async () => {
      try {
        // Load payments - always reload if arrays are empty or if user role is ADMIN/CEO
        const shouldLoadPayments = (payments.length === 0 && pendingPayments.length === 0) || user?.role === 'ADMIN' || user?.role === 'CEO'
        if (shouldLoadPayments) {
          const paymentsData = await paymentsAPI.getPayments()
          const paymentsArray = ensureArray(paymentsData)

          // Separate completed and pending payments
          const completedPayments = paymentsArray.filter((p: any) => {
            const status = p.status?.toUpperCase()
            return status === 'PAID' || status === 'PAGO'
          })

          const pendingPaymentsList = paymentsArray.filter((p: any) => {
            const status = p.status?.toUpperCase()
            return status === 'PENDING' || status === 'OVERDUE'
          })

          // For INQUILINO, filter to show only payments for their properties or their own payments
          if (user?.role === 'INQUILINO' && user?.id && properties.length > 0) {
            const tenantProperties = properties.map((p: any) => p.id)

            const filteredCompleted = completedPayments.filter((p: any) =>
              tenantProperties.includes(p.propertyId) ||
              tenantProperties.includes(String(p.propertyId)) ||
              p.tenantId === user.id ||
              String(p.tenantId) === String(user.id)
            )

            const filteredPending = pendingPaymentsList.filter((p: any) =>
              tenantProperties.includes(p.propertyId) ||
              tenantProperties.includes(String(p.propertyId)) ||
              p.tenantId === user.id ||
              String(p.tenantId) === String(user.id)
            )

            setPayments(filteredCompleted)
            setPendingPayments(filteredPending)
          } else if (user?.role === 'PROPRIETARIO' && user?.id && properties.length > 0) {
            // For PROPRIETARIO, filter to show only payments for their owned properties
            const ownedPropertyIds = properties.map((p: any) => 
              p.id?.toString() || String(p.id)
            )

            const filteredCompleted = completedPayments.filter((p: any) => {
              const propertyId = p.propertyId?.toString() || String(p.propertyId)
              return ownedPropertyIds.includes(propertyId)
            })

            const filteredPending = pendingPaymentsList.filter((p: any) => {
              const propertyId = p.propertyId?.toString() || String(p.propertyId)
              return ownedPropertyIds.includes(propertyId)
            })

            setPayments(filteredCompleted)
            setPendingPayments(filteredPending)
          } else if (user?.role !== 'INQUILINO' && user?.role !== 'PROPRIETARIO') {
            // For ADMIN, CEO, AGENCY_ADMIN, AGENCY_MANAGER, etc. - show all payments
            setPayments(completedPayments)
            setPendingPayments(pendingPaymentsList)
          } else {
            // If no role match, still set empty arrays to avoid undefined
            setPayments([])
            setPendingPayments([])
          }
        }

        // Load invoices - always reload if array is empty or if user role is ADMIN/CEO
        const shouldLoadInvoices = (invoices.length === 0 && pendingInvoices.length === 0) || user?.role === 'ADMIN' || user?.role === 'CEO'
        if (shouldLoadInvoices) {
          try {
            // For PROPRIETARIO role, filter invoices by ownerId
            // For ADMIN/CEO, don't filter - get all invoices (use large take to get all)
            const params: any = { take: (user?.role === 'ADMIN' || user?.role === 'CEO') ? 10000 : 1000 }
            if (user?.role === 'PROPRIETARIO' && user?.id) {
              params.ownerId = user.id
            }
            // For ADMIN/CEO, no filter needed - they can see all invoices
            const invoicesData = await invoicesAPI.getInvoices(params)
            const invoicesArray = ensureArray(invoicesData)

            // Separate completed and pending invoices
            const completedInvoices = invoicesArray
              .filter((invoice: any) => invoice.status === 'PAID' && invoice.paidAt && invoice.paidValue)
              .map((invoice: any) => ({
                id: `invoice_${invoice.id}`,
                isInvoice: true,
                status: invoice.status,
                propertyId: invoice.propertyId || invoice.property?.id,
                tenantId: invoice.tenantId || invoice.tenant?.id,
                ownerId: invoice.ownerId || invoice.owner?.id, // Include ownerId for filtering
                amount: invoice.paidValue || 0, // Only use paidValue for completed invoices
                valorPago: invoice.paidValue || 0,
                paymentType: invoice.paymentMethod || 'FATURA',
                tipo: invoice.paymentMethod || 'FATURA',
                paymentDate: invoice.paidAt, // Only use paidAt for completed invoices
                dataPagamento: invoice.paidAt,
                paidAt: invoice.paidAt,
                dueDate: invoice.dueDate,
                paidValue: invoice.paidValue,
                updatedValue: invoice.updatedValue,
                originalValue: invoice.originalValue,
              }))

            const pendingInvoicesList = invoicesArray
              .filter((invoice: any) => invoice.status === 'PENDING' || invoice.status === 'OVERDUE')
              .map((invoice: any) => ({
                id: `invoice_${invoice.id}`,
                isInvoice: true,
                status: invoice.status,
                propertyId: invoice.propertyId || invoice.property?.id,
                tenantId: invoice.tenantId || invoice.tenant?.id,
                ownerId: invoice.ownerId || invoice.owner?.id, // Include ownerId for filtering
                amount: invoice.updatedValue || invoice.originalValue || 0,
                valorPago: invoice.updatedValue || invoice.originalValue || 0,
                paymentType: invoice.paymentMethod || 'FATURA',
                tipo: invoice.paymentMethod || 'FATURA',
                paymentDate: invoice.dueDate, // Use dueDate for pending invoices
                dataPagamento: invoice.dueDate,
                paidAt: invoice.paidAt,
                dueDate: invoice.dueDate,
                paidValue: invoice.paidValue,
                updatedValue: invoice.updatedValue,
                originalValue: invoice.originalValue,
              }))

            // For INQUILINO, filter to show only invoices for their properties or their own invoices
            if (user?.role === 'INQUILINO' && user?.id && properties.length > 0) {
              const tenantProperties = properties.map((p: any) => p.id)

              const filteredCompleted = completedInvoices.filter((inv: any) =>
                tenantProperties.includes(inv.propertyId) ||
                tenantProperties.includes(String(inv.propertyId)) ||
                inv.tenantId === user.id ||
                String(inv.tenantId) === String(user.id)
              )

              const filteredPending = pendingInvoicesList.filter((inv: any) =>
                tenantProperties.includes(inv.propertyId) ||
                tenantProperties.includes(String(inv.propertyId)) ||
                inv.tenantId === user.id ||
                String(inv.tenantId) === String(user.id)
              )

              setInvoices(filteredCompleted)
              setPendingInvoices(filteredPending)
            } else if (user?.role === 'PROPRIETARIO' && user?.id && properties.length > 0) {
              // For PROPRIETARIO, filter to show only invoices for their owned properties
              const ownedPropertyIds = properties.map((p: any) => 
                p.id?.toString() || String(p.id)
              )

              const filteredCompleted = completedInvoices.filter((inv: any) => {
                // Check if invoice has ownerId matching user
                if (inv.ownerId && (inv.ownerId === user.id || String(inv.ownerId) === String(user.id))) {
                  return true
                }
                // Check if invoice property is owned by user
                const propertyId = inv.propertyId?.toString() || String(inv.propertyId)
                return ownedPropertyIds.includes(propertyId)
              })

              const filteredPending = pendingInvoicesList.filter((inv: any) => {
                // Check if invoice has ownerId matching user
                if (inv.ownerId && (inv.ownerId === user.id || String(inv.ownerId) === String(user.id))) {
                  return true
                }
                // Check if invoice property is owned by user
                const propertyId = inv.propertyId?.toString() || String(inv.propertyId)
                return ownedPropertyIds.includes(propertyId)
              })

              setInvoices(filteredCompleted)
              setPendingInvoices(filteredPending)
            } else if (user?.role !== 'INQUILINO' && user?.role !== 'PROPRIETARIO') {
              // For ADMIN, CEO, AGENCY_ADMIN, AGENCY_MANAGER, etc. - show all invoices
              setInvoices(completedInvoices)
              setPendingInvoices(pendingInvoicesList)
            } else {
              // If no role match, still set empty arrays to avoid undefined
              setInvoices([])
              setPendingInvoices([])
            }
          } catch (err) {
            console.error('Error loading invoices:', err)
            setInvoices([])
          }
        }
      } catch (err) {
        console.error('Error loading payments:', err)
      }
    }
    loadPaymentsAndInvoices()
  }, [canViewPayments, canViewReports, payments.length, invoices.length, pendingPayments.length, pendingInvoices.length, properties, user?.id, user?.role])

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
                // Use UTC methods to avoid timezone issues
                const day = date.getUTCDate()
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
                // Use UTC methods to avoid timezone issues
                // getUTCMonth() returns 0-11, so add 1 to get 1-12
                const month = date.getUTCMonth() + 1
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
                // Use UTC methods to avoid timezone issues
                const day = date.getUTCDate()
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
                // Use UTC methods to avoid timezone issues
                // getUTCMonth() returns 0-11, so add 1 to get 1-12
                const month = date.getUTCMonth() + 1
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

  // Calculate property performance first (used for Top Imóveis)
  const propertyPerformance = useMemo(() => {
    if (!Array.isArray(properties)) return []
    // Combine payments and invoices (already filtered to only completed payments)
    const allPaymentsAndInvoices = [...payments, ...invoices]
    // Combine pending payments and invoices
    const allPending = [...pendingPayments, ...pendingInvoices]

    return properties.map(property => {
      const propertyPayments = allPaymentsAndInvoices.filter(p => {
        const matchesProperty = p.propertyId === property.id || String(p.propertyId) === String(property.id)
        if (!matchesProperty) return false

        // Only count completed payments
        if (!isCompletedPayment(p)) return false

        // Exclude invoices that have corresponding Payment records (avoid duplication)
        if (shouldExcludeForDuplication(p, allPaymentsAndInvoices)) return false

        // Filter by current year using actual payment date
        const paymentDate = (p as any).paymentDate || (p as any).dataPagamento || (p as any).paidAt
        if (!paymentDate) return false

        const date = new Date(paymentDate)
        return date.getUTCFullYear() === currentYear
      })

      // Calculate pending payments for this property
      const propertyPending = allPending.filter(p => {
        const matchesProperty = p.propertyId === property.id || String(p.propertyId) === String(property.id)
        return matchesProperty
      })

      // Use same value calculation as before for consistency
      // For invoices, use paidValue; for payments, use amount or valorPago
      const totalRevenue = propertyPayments.reduce((sum, p) => {
        if ((p as any).isInvoice) {
          return sum + Number((p as any).paidValue || 0)
        }
        return sum + Number(p.amount || p.valorPago || 0)
      }, 0)
      const totalPending = propertyPending.reduce((sum, p) => {
        const amount = (p as any).isInvoice
          ? Number((p as any).updatedValue || (p as any).originalValue || p.amount || p.valorPago || 0)
          : Number(p.amount || p.valorPago || 0)
        return sum + amount
      }, 0)

      return {
        name: property.name || property.address || '',
        revenue: totalRevenue,
        payments: propertyPayments.length,
        pendingAmount: totalPending,
        pendingCount: propertyPending.length
      }
    }).sort((a, b) => b.revenue - a.revenue)
  }, [properties, payments, invoices, pendingPayments, pendingInvoices, currentYear])

  // Calculate totals from all payments and invoices
  // IMPORTANT: Only count PAID payments - pending payments are NOT income
  // Use financialReport.summary.totalRevenue when available (duplication is now fixed in backend)
  const totalAno = useMemo(() => {
    // First, try to use financialReport data if available and it's an annual report
    if (canAccessFinancialReports && financialReport && financialReportType === 'annual') {
      // Check if the report is for the selected year
      const reportStartDate = financialReport.period?.start
      if (reportStartDate) {
        const reportDate = new Date(reportStartDate)
        // The report should be for the selected year
        if (reportDate.getUTCFullYear() === year) {
          // Use totalRevenue from financialReport if available (even if 0, use it to be consistent)
          const reportTotal = Number(financialReport.summary?.totalRevenue || 0)
          return reportTotal
        }
      }
      // If report exists but date check fails, still try to use it if it's the current year
      // This handles edge cases where date parsing might fail
      if (year === currentYear && financialReport.summary?.totalRevenue !== undefined) {
        return Number(financialReport.summary.totalRevenue) || 0
      }
    }

    // Fallback: Calculate directly from payments and invoices for the year
    // CRITICAL: Only count completed payments (PAID/PAGO status) - pending payments are NOT income
    const allPaymentsAndInvoices = [...payments, ...invoices]

    const totalFromPayments = allPaymentsAndInvoices.reduce((sum, p) => {
      // ONLY count completed payments - skip pending/overdue
      if (!isCompletedPayment(p)) return sum

      // Exclude invoices that have corresponding Payment records (avoid duplication)
      // When a paid invoice creates a Payment record, we should only count the Payment, not the invoice
      if (shouldExcludeForDuplication(p, allPaymentsAndInvoices)) return sum

      // Use actual payment date (not due date) - only count payments that were actually paid
      const paymentDate = (p as any).paymentDate || (p as any).dataPagamento || (p as any).paidAt
      if (!paymentDate) return sum

      const date = new Date(paymentDate)
      // Only count payments from the selected year
      if (date.getUTCFullYear() === year) {
        // For invoices, use paidValue (only available for paid invoices)
        if ((p as any).isInvoice) {
          return sum + Number((p as any).paidValue || 0)
        }
        // For payments, use amount or valorPago
        return sum + Number(p.amount || p.valorPago || 0)
      }
      return sum
    }, 0)

    // Return calculated total (only includes paid payments, no duplicates)
    return totalFromPayments
  }, [payments, invoices, year, financialReport, financialReportType, canAccessFinancialReports])

  const currentMonth = new Date().getMonth() + 1

  // Calculate pending totals
  const pendingTotal = useMemo(() => {
    const allPending = [...pendingPayments, ...pendingInvoices]
    return allPending.reduce((sum, p) => {
      const amount = (p as any).isInvoice
        ? Number((p as any).updatedValue || (p as any).originalValue || 0)
        : Number(p.amount || p.valorPago || 0)
      return sum + amount
    }, 0)
  }, [pendingPayments, pendingInvoices])

  const pendingCurrentMonth = useMemo(() => {
    const allPending = [...pendingPayments, ...pendingInvoices]
    return allPending.reduce((sum, p) => {
      // For pending items, use dueDate (when payment is due)
      // For invoices, dueDate is already set in the mapping
      // For payments, use dueDate field (which exists in the Payment model)
      let dueDate = (p as any).dueDate

      // For pending invoices, paymentDate was set to dueDate in the mapping
      // For pending payments, dueDate should be available from the API
      if (!dueDate) {
        // Try to get from paymentDate (which was set to dueDate for pending invoices)
        dueDate = (p as any).paymentDate
      }

      // If still no dueDate, try dataPagamento (though this shouldn't exist for pending payments)
      if (!dueDate) {
        dueDate = (p as any).dataPagamento
      }

      if (!dueDate) {
        // Skip if no due date available
        return sum
      }

      const date = new Date(dueDate)
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return sum
      }

      // Use UTC methods to avoid timezone issues
      const dueYear = date.getUTCFullYear()
      const dueMonth = date.getUTCMonth() + 1 // getUTCMonth() returns 0-11, so add 1

      if (dueYear === currentYear && dueMonth === currentMonth) {
        const amount = (p as any).isInvoice
          ? Number((p as any).updatedValue || (p as any).originalValue || 0)
          : Number(p.amount || p.valorPago || 0)
        return sum + amount
      }
      return sum
    }, 0)
  }, [pendingPayments, pendingInvoices, currentMonth, currentYear])

  const currentMonthTotal = useMemo(() => {
    // First try to use financial report summary if available
    if (canAccessFinancialReports && financialReport?.summary?.totalRevenue && financialReportType === 'monthly') {
      // For monthly report, check if it matches current month
      const reportStartDate = financialReport.summary.startDate
      if (reportStartDate) {
        const reportDate = new Date(reportStartDate)
        if (reportDate.getFullYear() === currentYear && reportDate.getMonth() === currentMonth + 1) {
          return Number(financialReport.summary.totalRevenue) || 0
        }
      }
    }

    // Otherwise, calculate from all payments and invoices for the current month
    // Only count completed payments (already filtered when loading)
    const allPaymentsAndInvoices = [...payments, ...invoices]

    const totalFromPayments = allPaymentsAndInvoices.reduce((sum, p) => {
      // Only count completed payments
      if (!isCompletedPayment(p)) return sum

      // Exclude invoices that have corresponding Payment records (avoid duplication)
      if (shouldExcludeForDuplication(p, allPaymentsAndInvoices)) return sum

      // Use actual payment date (not due date)
      const paymentDate = (p as any).paymentDate || (p as any).dataPagamento || (p as any).paidAt
      if (!paymentDate) return sum

      const date = new Date(paymentDate)
      // Use UTC methods to avoid timezone issues
      if (date.getUTCFullYear() === currentYear && date.getUTCMonth() + 1 === currentMonth) {
        // For invoices, only use paidValue; for payments, use amount or valorPago
        if ((p as any).isInvoice) {
          return sum + Number((p as any).paidValue || 0)
        }
        return sum + Number(p.amount || p.valorPago || 0)
      }
      return sum
    }, 0)

    // Fallback to chart data if no payments/invoices found
    if (totalFromPayments > 0) {
      return totalFromPayments
    }

    const currentMonthData = data.find(d => {
      const monthIndex = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].indexOf(d.month) + 1
      return monthIndex === currentMonth
    })
    return currentMonthData?.total || 0
  }, [financialReport, financialReportType, payments, invoices, currentMonth, currentYear, canAccessFinancialReports, data])

  // Calculate monthly data for completed and pending payments for the annual chart
  const monthlyChartData = useMemo(() => {
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

    // First, try to use financialReport data if available and it's an annual report
    // But we still need to use local data for pending payments since financialReport doesn't include them
    // So we'll process both financialReport transactions and local pending data
    let completedByMonth: Record<number, number> = {}
    
    if (canAccessFinancialReports && financialReport && financialReportType === 'annual' && financialReport.transactions) {
      // Process revenue transactions (completed payments) from financialReport
      financialReport.transactions
        .filter((t: any) => t.type === 'REVENUE')
        .forEach((t: any) => {
          const date = new Date(t.date)
          if (date.getUTCFullYear() === year) {
            const month = date.getUTCMonth() + 1
            completedByMonth[month] = (completedByMonth[month] || 0) + (t.amount || 0)
          }
        })
    }

    // If financialReport wasn't used or didn't have data, calculate from local payments and invoices
    if (Object.keys(completedByMonth).length === 0) {
      const allPaymentsAndInvoices = [...payments, ...invoices]
      
      allPaymentsAndInvoices.forEach((p) => {
        // Only count completed payments
        if (!isCompletedPayment(p)) return
        
        // Exclude invoices that have corresponding Payment records (avoid duplication)
        if (shouldExcludeForDuplication(p, allPaymentsAndInvoices)) return
        
        // Use actual payment date
        const paymentDate = (p as any).paymentDate || (p as any).dataPagamento || (p as any).paidAt
        if (!paymentDate) return
        
        const date = new Date(paymentDate)
        if (date.getUTCFullYear() === year) {
          const month = date.getUTCMonth() + 1
          const amount = (p as any).isInvoice
            ? Number((p as any).paidValue || 0)
            : Number(p.amount || p.valorPago || 0)
          completedByMonth[month] = (completedByMonth[month] || 0) + amount
        }
      })
    }

    // Calculate pending payments by month (always use local data since financialReport doesn't include pending)
    const allPending = [...pendingPayments, ...pendingInvoices]
    const pendingByMonth: Record<number, number> = {}
    
    allPending.forEach((p) => {
      // Use dueDate for pending items
      let dueDate = (p as any).dueDate
      if (!dueDate) {
        dueDate = (p as any).paymentDate || (p as any).dataPagamento
      }
      if (!dueDate) return
      
      const date = new Date(dueDate)
      if (isNaN(date.getTime())) return
      
      const dueYear = date.getUTCFullYear()
      const dueMonth = date.getUTCMonth() + 1
      
      if (dueYear === year) {
        const amount = (p as any).isInvoice
          ? Number((p as any).updatedValue || (p as any).originalValue || 0)
          : Number(p.amount || p.valorPago || 0)
        pendingByMonth[dueMonth] = (pendingByMonth[dueMonth] || 0) + amount
      }
    })

    return months.map(({ label, index }) => ({
      month: label,
      completed: Number(completedByMonth[index] || 0),
      pending: Number(pendingByMonth[index] || 0),
      total: Number(completedByMonth[index] || 0) + Number(pendingByMonth[index] || 0), // Keep for backward compatibility
    }))
  }, [payments, invoices, pendingPayments, pendingInvoices, year])

  const tenantPerformance = useMemo(() => {
    if (!Array.isArray(tenants)) return []
    // Combine payments and invoices (already filtered to only completed payments)
    const allPaymentsAndInvoices = [...payments, ...invoices]
    return tenants.map(tenant => {
      // Only count completed payments for each tenant
      const tenantPayments = allPaymentsAndInvoices.filter(p => {
        const matchesTenant = p.tenantId === tenant.id || String(p.tenantId) === String(tenant.id)
        return matchesTenant && isCompletedPayment(p)
      })
      const totalPaid = tenantPayments.reduce((sum, p) => sum + Number(p.amount || p.valorPago || 0), 0)
      return {
        name: tenant.name,
        totalPaid,
        payments: tenantPayments.length
      }
    }).sort((a, b) => b.totalPaid - a.totalPaid)
  }, [tenants, payments, invoices])

  const paymentTypeData = useMemo(() => {
    // Combine payments and invoices (already filtered to only completed payments)
    const allPaymentsAndInvoices = [...payments, ...invoices]
    if (!Array.isArray(allPaymentsAndInvoices) || allPaymentsAndInvoices.length === 0) return []
    // Only count completed payments in the distribution
    const types = allPaymentsAndInvoices
      .filter(p => isCompletedPayment(p))
      .reduce((acc, payment) => {
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
  }, [payments, invoices])

  const handleExportReport = async (format: 'csv' | 'pdf') => {
    if (!canAccessFinancialReports) {
      toast.error('Você não tem permissão para exportar relatórios financeiros');
      return;
    }

    try {
      let blob: Blob;
      let filename: string;
      let hash: string | null = null;

      // Build query parameters
      const params = new URLSearchParams();
      params.append('type', financialReportType);
      if (financialReportType === 'annual') {
        params.append('startDate', new Date(year, 0, 1).toISOString().split('T')[0]);
        params.append('endDate', new Date(year, 11, 31).toISOString().split('T')[0]);
      } else if (financialReportType === 'monthly') {
        params.append('startDate', new Date(year, month - 1, 1).toISOString().split('T')[0]);
        params.append('endDate', new Date(year, month, 0).toISOString().split('T')[0]);
      } else if (financialReportType === 'daily') {
        params.append('startDate', new Date(year, month - 1, day).toISOString().split('T')[0]);
        params.append('endDate', new Date(year, month - 1, day).toISOString().split('T')[0]);
      }

      if (format === 'csv') {
        const response = await apiClient.get(
          `/financial-reports/export/csv?${params.toString()}`,
          {
            responseType: 'blob',
          }
        );
        blob = response.data;
        hash = response.headers['x-integrity-hash'] || response.headers['X-Integrity-Hash'] || null;
        const generatedAt = response.headers['x-generated-at'] || response.headers['X-Generated-At'] || null;
        const ip = response.headers['x-generated-by-ip'] || response.headers['X-Generated-By-IP'] || null;
        let dateStr = '';
        if (financialReportType === 'annual') {
          dateStr = year.toString();
        } else if (financialReportType === 'monthly') {
          dateStr = `${year}-${String(month).padStart(2, '0')}`;
        } else if (financialReportType === 'daily') {
          dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        filename = `relatorio-financeiro-${financialReportType}-${dateStr}.csv`;

        const details = [
          hash ? `Hash: ${hash.substring(0, 16)}...` : '',
          generatedAt ? `Gerado em: ${new Date(generatedAt).toLocaleString('pt-BR')}` : '',
          ip ? `IP: ${ip}` : '',
        ].filter(Boolean).join(' | ');

        toast.success(`CSV exportado! ${details}`);
      } else {
        const response = await apiClient.get(
          `/financial-reports/export/pdf?${params.toString()}`,
          {
            responseType: 'blob',
          }
        );
        blob = response.data;
        hash = response.headers['x-integrity-hash'] || response.headers['X-Integrity-Hash'] || null;
        const generatedAt = response.headers['x-generated-at'] || response.headers['X-Generated-At'] || null;
        const ip = response.headers['x-generated-by-ip'] || response.headers['X-Generated-By-IP'] || null;
        const dateStr = financialReportType === 'annual' ? year.toString() : new Date().toISOString().split('T')[0];
        filename = `relatorio-financeiro-${financialReportType}-${dateStr}.pdf`;

        const details = [
          hash ? `Hash: ${hash.substring(0, 16)}...` : '',
          generatedAt ? `Gerado em: ${new Date(generatedAt).toLocaleString('pt-BR')}` : '',
          ip ? `IP: ${ip}` : '',
        ].filter(Boolean).join(' | ');

        toast.success(`PDF exportado! ${details}`);
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
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
      <PageHeader 
        title="Relatórios" 
        subtitle="Visualize relatórios e análises financeiras"
      />
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
            <Select value={financialReportType} onValueChange={(v: 'daily' | 'monthly' | 'annual') => setFinancialReportType(v)}>
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

      { }
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
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
            </div>
            {canAccessFinancialReports && (
              <div className="flex flex-col sm:flex-row gap-2">
                {(financialReportType === 'monthly' || financialReportType === 'daily') && (
                  <Select value={String(month)} onValueChange={(v: any) => setMonth(Number(v))}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { value: 1, label: 'Janeiro' },
                        { value: 2, label: 'Fevereiro' },
                        { value: 3, label: 'Março' },
                        { value: 4, label: 'Abril' },
                        { value: 5, label: 'Maio' },
                        { value: 6, label: 'Junho' },
                        { value: 7, label: 'Julho' },
                        { value: 8, label: 'Agosto' },
                        { value: 9, label: 'Setembro' },
                        { value: 10, label: 'Outubro' },
                        { value: 11, label: 'Novembro' },
                        { value: 12, label: 'Dezembro' },
                      ].map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {financialReportType === 'daily' && (
                  <Select
                    value={String(day)}
                    onValueChange={(v: any) => setDay(Number(v))}
                  >
                    <SelectTrigger className="w-full sm:w-24">
                      <SelectValue placeholder="Dia" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {(financialReportType === 'monthly' || financialReportType === 'daily' || financialReportType === 'annual') && (
                  <Select value={String(year)} onValueChange={(v: any) => setYear(Number(v))}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4].map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
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
                {((reportType === 'monthly' && financialReportType === 'annual' && monthlyChartData.length > 0) || 
                  (reportType === 'monthly' && financialReportType !== 'annual' && data.length > 0) || 
                  propertyPerformance.length > 0 || 
                  tenantPerformance.length > 0) && isChartReady && (
                  <ResponsiveContainer width="100%" height={300} minWidth={200} minHeight={256} debounce={50}>
                    {reportType === 'monthly' && financialReportType === 'annual' ? (
                      <BarChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                          formatter={(v: number, name: string) => {
                            const label = name === 'completed' ? 'Completados' : name === 'pending' ? 'Pendentes' : 'Total'
                            return [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, label]
                          }}
                          labelStyle={{ fontSize: 12 }}
                          contentStyle={{ fontSize: 12 }}
                        />
                        <Bar dataKey="completed" name="Completados" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="pending" name="Pendentes" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    ) : reportType === 'monthly' ? (
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
                  {reportType === 'monthly' && (
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                      <span>Total no ano: R$ {totalAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      {financialReportType === 'annual' && (
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-[#22c55e]"></div>
                            <span className="text-muted-foreground">Completados</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-[#ef4444]"></div>
                            <span className="text-muted-foreground">Pendentes</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {reportType === 'property' && `Total de imóveis: ${properties.length}`}
                  {reportType === 'tenant' && `Total de inquilinos: ${tenants.length}`}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      { }
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6">
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

        {/* Hide Inquilinos card for PROPRIETARIO and INQUILINO roles */}
        {user?.role !== 'PROPRIETARIO' && user?.role !== 'INQUILINO' && (
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
        )}

        {/* Pending Payments Section */}
        {/* {(pendingPayments.length > 0 || pendingInvoices.length > 0) && (
          <div className="flex gap-4 sm:gap-6"> */}
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  Pendentes Total
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Pagamentos pendentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-orange-600">
                  {formatCurrency(pendingTotal)}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {pendingPayments.length + pendingInvoices.length} pendências
                </p>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  Pendentes Este Mês
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-orange-600">
                  {formatCurrency(pendingCurrentMonth)}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Vencimentos do mês
                </p>
              </CardContent>
            </Card>
          {/* </div>
        )} */}
      </div>


      { }
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        { }
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

        { }
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
                      {property.pendingCount > 0 && (
                        <p className="text-xs text-orange-600 font-medium">
                          {property.pendingCount} pendente{property.pendingCount > 1 ? 's' : ''}: {formatCurrency(property.pendingAmount || 0)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrency(property.revenue)}</p>
                    {property.pendingAmount > 0 && (
                      <p className="text-xs text-orange-600 font-medium">
                        {formatCurrency(property.pendingAmount)}
                      </p>
                    )}
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
