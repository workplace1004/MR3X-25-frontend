import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI, agenciesAPI, tenantAnalysisAPI, plansAPI } from '@/api'
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/PageHeader'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  MessageSquare,
  MapPin,
  Grid3X3,
  List,
  FileText,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Loader2,
  Crown
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PasswordInput } from '@/components/ui/password-input'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

const getStaticBaseUrl = () => {
  const url = API_BASE_URL;
  return url.endsWith('/api') ? url.slice(0, -4) : url;
};

const getPhotoUrl = (photoUrl: string | null | undefined) => {
  if (!photoUrl) return undefined;
  if (photoUrl.startsWith('http')) return photoUrl;
  return `${getStaticBaseUrl()}${photoUrl}`;
};
import { DocumentInput } from '@/components/ui/document-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { CEPInput } from '@/components/ui/cep-input'
import { RGInput } from '@/components/ui/rg-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { validateDocument, isValidCEPFormat } from '@/lib/validation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface Tenant {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  document?: string;
  birthDate?: string;
  address?: string;
  cep?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  brokerId?: string;
  agencyId?: string;
  nationality?: string;
  maritalStatus?: string;
  profession?: string;
  rg?: string;
  employerName?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  plainPassword?: string;
  photo?: string;
  photoUrl?: string;
  token?: string;
  isFrozen?: boolean;
  status?: string;
  role?: string;
  plan?: string;
}

interface CEPData {
  logradouro?: string;
  street?: string;
  bairro?: string;
  neighborhood?: string;
  cidade?: string;
  city?: string;
  estado?: string;
  state?: string;
}

interface TenantFormData {
  document?: string;
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
  birthDate?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  agencyId?: string;
  brokerId?: string;
  nationality?: string;
  maritalStatus?: string;
  profession?: string;
  rg?: string;
  employerName?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  role?: string;
  plan?: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message?: string;
}

export function Tenants() {
  const { hasPermission, user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const isCEO = user?.role === 'CEO'
  const canViewUsers = hasPermission('users:read')
  const canCreateUsers = hasPermission('users:create') && !isCEO
  const showCreateTenantButton = (user?.role === 'BROKER' || canCreateUsers) && !isCEO
  const canUpdateUsers = hasPermission('users:update') && !isCEO
  const canDeleteUsers = hasPermission('users:delete') && !isCEO

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [showContractsModal, setShowContractsModal] = useState(false)

  const [newTenant, setNewTenant] = useState({
    document: '',
    name: '',
    phone: '',
    email: '',
    password: '',
    birthDate: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    agencyId: '',
    brokerId: '',
    nationality: '',
    maritalStatus: '',
    profession: '',
    rg: '',
    employerName: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  })

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    password: '',
    birthDate: '',
    address: '',
    cep: '',
    neighborhood: '',
    city: '',
    state: '',
    brokerId: '',
    nationality: '',
    maritalStatus: '',
    profession: '',
    rg: '',
  })

  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null)
  const [tenantDetail, setTenantDetail] = useState<Tenant | null>(null)
  const [tenantDetailLoading, setTenantDetailLoading] = useState(false)
  const [whatsappMessage, setWhatsappMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [emailError, setEmailError] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)

  const [showAnalysisSearchModal, setShowAnalysisSearchModal] = useState(false)
  const [searchDocument, setSearchDocument] = useState('')
  const [searchingAnalysis, setSearchingAnalysis] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<{
    basicData?: {
      phone?: string;
      birthDate?: string;
      address?: string;
      zipCode?: string;
      city?: string;
      state?: string;
    };
    document?: string;
    name?: string;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recommendation?: 'APPROVED' | 'APPROVED_WITH_CAUTION' | 'REQUIRES_GUARANTOR' | 'REJECTED';
    riskScore?: number;
    analyzedAt?: string;
    recommendationNotes?: string;
  } | null>(null)
  const [analysisError, setAnalysisError] = useState('')

  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeErrorMessage, setUpgradeErrorMessage] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [checkingPlanLimit, setCheckingPlanLimit] = useState(false)

  const handleSearch = useCallback(() => {
    setSearchQuery(searchTerm.trim())
  }, [searchTerm])

  const handleClearSearch = useCallback(() => {
    setSearchTerm('')
    setSearchQuery('')
  }, [])

  const checkEmailExists = useCallback(async (email: string, currentEmail?: string) => {
    setEmailVerified(false)

    if (!email || email === currentEmail) {
      setEmailError('')
      if (email === currentEmail) {
        setEmailVerified(true)
      }
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailError('Formato de email inválido')
      return
    }

    setCheckingEmail(true)
    try {
      const result = await usersAPI.checkEmailExists(email)
      if (result.exists) {
        setEmailError('Este email já está em uso, por favor altere o email')
        setEmailVerified(false)
        toast.error('Este email já está em uso, por favor altere o email')
      } else {
        setEmailError('')
        setEmailVerified(true)
      }
    } catch (error) {
      console.error('Error checking email:', error)
      setEmailError('Erro ao verificar email')
      setEmailVerified(false)
    } finally {
      setCheckingEmail(false)
    }
  }, [])

  const isAdminOrCeo = user?.role === 'CEO' || user?.role === 'ADMIN'
  const canLinkBrokers = user?.role === 'AGENCY_MANAGER' || user?.role === 'AGENCY_ADMIN'

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants', user?.id, user?.agencyId, searchQuery],
    queryFn: () => usersAPI.getTenants(searchQuery ? { search: searchQuery } : undefined),
    enabled: canViewUsers,
    staleTime: 0,
  })

  const { data: agencies } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => agenciesAPI.getAgencies(),
    enabled: isAdminOrCeo,
  })

  const { data: _brokers } = useQuery({
    queryKey: ['brokers'],
    queryFn: () => usersAPI.getBrokers(),
    enabled: canLinkBrokers,
  })

  const isAgencyUser = ['AGENCY_ADMIN', 'AGENCY_MANAGER', 'BROKER'].includes(user?.role || '')
  const isOwnerUser = ['INDEPENDENT_OWNER', 'PROPRIETARIO'].includes(user?.role || '')

  const { data: tenantLimits } = useQuery({
    queryKey: ['tenant-limits', user?.agencyId, user?.id],
    queryFn: async () => {
      if (isAgencyUser && user?.agencyId) {
        return plansAPI.canCreateTenant(user.agencyId)
      } else if (isOwnerUser && user?.id) {
        return plansAPI.canCreateTenantForOwner(user.id)
      }
      return { allowed: true, current: 0, limit: 9999 }
    },
    enabled: showCreateTenantButton && (!!user?.agencyId || isOwnerUser),
  })

  const canCreateTenant = tenantLimits?.allowed !== false

  const closeAllModals = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setShowDetailModal(false)
    setShowWhatsAppModal(false)
    setShowContractsModal(false)
    setShowAnalysisSearchModal(false)
    setSelectedTenant(null)
    setTenantToDelete(null)
    setAnalysisResult(null)
    setAnalysisError('')
    setSearchDocument('')
  }

  // All hooks must be called before any early returns
  const createTenantMutation = useMutation({
    mutationFn: (data: TenantFormData) => usersAPI.createTenant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      closeAllModals()
      setNewTenant({
        document: '', name: '', phone: '', email: '', password: '', birthDate: '',
        cep: '', address: '', number: '', complement: '', neighborhood: '', city: '', state: '',
        agencyId: '', brokerId: '', nationality: '', maritalStatus: '', profession: '', rg: '',
        employerName: '', emergencyContactName: '', emergencyContactPhone: ''
      })
      toast.success('Inquilino criado com sucesso')
    },
    onError: (error: ApiError) => {
      let errorMessage = 'Erro ao criar inquilino'
      const backendMessage = error.response?.data?.message || error.message
      if (backendMessage) {
        const message = backendMessage.toLowerCase()
        if (message.includes('already exists')) {
          errorMessage = 'Este usuario ja existe. Verifique o email ou documento.'
        } else {
          errorMessage = backendMessage
        }
      }

      const isPlanLimitError = error?.response?.status === 403 ||
        errorMessage.toLowerCase().includes('plano') ||
        errorMessage.toLowerCase().includes('limite') ||
        errorMessage.toLowerCase().includes('plan') ||
        errorMessage.toLowerCase().includes('limit')

      if (isPlanLimitError) {
        setUpgradeErrorMessage(errorMessage || 'Você atingiu o limite do seu plano.')
        setShowCreateModal(false)
        setShowUpgradeModal(true)
      } else {
        toast.error(errorMessage)
      }
    },
  })

  const updateTenantMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<TenantFormData> }) => usersAPI.updateTenant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      closeAllModals()
      toast.success('Inquilino atualizado com sucesso')
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Erro ao atualizar inquilino')
    },
  })

  const deleteTenantMutation = useMutation({
    mutationFn: (id: string) => usersAPI.deleteTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      closeAllModals()
      setTenantToDelete(null)
      toast.success('Inquilino excluido com sucesso')
    },
    onError: (error: ApiError) => {
      toast.error(error?.message || 'Erro ao excluir inquilino')
    },
  })

  const handleNewTenantCEPData = useCallback((data: CEPData) => {
    setNewTenant((prev) => ({
      ...prev,
      address: data.logradouro || data.street || prev.address || '',
      neighborhood: data.bairro || data.neighborhood || prev.neighborhood || '',
      city: data.cidade || data.city || prev.city || '',
      state: data.estado || data.state || prev.state || '',
    }))
  }, [])

  const handleEditTenantCEPData = useCallback((data: CEPData) => {
    setEditForm((prev) => ({
      ...prev,
      address: data.logradouro || data.street || prev.address || '',
      neighborhood: data.bairro || data.neighborhood || prev.neighborhood || '',
      city: data.cidade || data.city || prev.city || '',
      state: data.estado || data.state || prev.state || '',
    }))
  }, [])

  // Early return check must come after all hooks
  if (!canViewUsers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Voce nao tem permissao para visualizar inquilinos.</p>
        </div>
      </div>
    )
  }

  const handleSearchAnalysis = async () => {
    if (!searchDocument || searchDocument.replace(/\D/g, '').length < 11) {
      setAnalysisError('Digite um CPF ou CNPJ válido')
      return
    }

    setSearchingAnalysis(true)
    setAnalysisError('')
    setAnalysisResult(null)

    try {
      const cleanDocument = searchDocument.replace(/\D/g, '')
      const history = await tenantAnalysisAPI.getHistory({ document: cleanDocument, status: 'COMPLETED' })

      if (history.data && history.data.length > 0) {
        
        const latestAnalysis = history.data[0]

        const approvedRecommendations = ['APPROVED', 'APPROVED_WITH_CAUTION']
        if (approvedRecommendations.includes(latestAnalysis.recommendation)) {
          setAnalysisResult(latestAnalysis)
        } else {
          setAnalysisError(`Este inquilino não foi aprovado na análise. Recomendação: ${latestAnalysis.recommendation === 'REJECTED' ? 'REJEITADO' :
              latestAnalysis.recommendation === 'REQUIRES_GUARANTOR' ? 'REQUER FIADOR' :
                latestAnalysis.recommendation
            }`)
        }
      } else {
        setAnalysisError('Nenhuma análise encontrada para este documento. Realize uma análise no módulo "Análise de Inquilinos" primeiro.')
      }
    } catch (error) {
      console.error('Error searching analysis:', error)
      setAnalysisError('Erro ao buscar análise. Tente novamente.')
    } finally {
      setSearchingAnalysis(false)
    }
  }

  const handleProceedToRegistration = () => {
    if (!analysisResult) return

    const basicData = (analysisResult?.basicData || {}) as { phone?: string; birthDate?: string; address?: string; zipCode?: string; city?: string; state?: string }
    const phone = basicData.phone || ''

    let birthDate = ''
    if (basicData.birthDate) {
      let rawDate = String(basicData.birthDate).trim()
      if (rawDate.includes('T')) {
        rawDate = rawDate.split('T')[0]
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        birthDate = rawDate
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
        const [day, month, year] = rawDate.split('/')
        birthDate = `${year}-${month}-${day}`
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(rawDate)) {
        const [day, month, year] = rawDate.split('-')
        birthDate = `${year}-${month}-${day}`
      }
    }

    let address = ''
    let neighborhood = ''
    if (basicData.address) {
      const addressParts = basicData.address.split(' - ')
      if (addressParts.length >= 2) {
        address = addressParts[0].trim()
        neighborhood = addressParts.slice(1).join(' - ').trim()
      } else {
        address = basicData.address
      }
    }

    let cep = basicData.zipCode || ''
    if (cep && !cep.includes('-') && cep.length === 8) {
      cep = `${cep.slice(0, 5)}-${cep.slice(5)}`
    }

    setNewTenant({
      document: analysisResult?.document || '',
      name: analysisResult?.name || '',
      phone: phone,
      email: '',
      password: '',
      birthDate: birthDate,
      cep: cep,
      address: address,
      number: '',
      complement: '',
      neighborhood: neighborhood,
      city: basicData.city || '',
      state: basicData.state || '',
      agencyId: '',
      brokerId: '',
      nationality: '',
      maritalStatus: '',
      profession: '',
      rg: '',
      employerName: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
    })

    setEmailVerified(false)
    setEmailError('')
    setCheckingEmail(false)

    setShowAnalysisSearchModal(false)
    setShowCreateModal(true)
  }

  const handleSkipVerification = () => {
    setNewTenant({
      name: '',
      email: '',
      document: '',
      phone: '',
      password: '',
      address: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      cep: '',
      birthDate: '',
      agencyId: '',
      brokerId: '',
      nationality: '',
      maritalStatus: '',
      profession: '',
      rg: '',
      employerName: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
    })

    setAnalysisResult(null)
    setAnalysisError('')
    setSearchDocument('')

    setEmailVerified(false)
    setEmailError('')
    setCheckingEmail(false)

    setShowAnalysisSearchModal(false)
    setShowCreateModal(true)
  }

  const handleViewContracts = (tenant: Tenant) => {
    closeAllModals()
    setSelectedTenant(tenant)
    setShowContractsModal(true)
  }

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canCreateTenant) {
      setUpgradeErrorMessage(tenantLimits?.message || 'Você atingiu o limite de usuários do seu plano.')
      setShowUpgradeModal(true)
      return
    }

    setCreating(true)
    try {
      // Validate required fields
      if (!newTenant.email?.trim()) {
        toast.error('Email é obrigatório')
        setCreating(false)
        return
      }
      if (!newTenant.name?.trim()) {
        toast.error('Nome é obrigatório')
        setCreating(false)
        return
      }
      if (!newTenant.password || newTenant.password.length < 6) {
        toast.error('Senha deve ter pelo menos 6 caracteres')
        setCreating(false)
        return
      }
      const docResult = validateDocument(newTenant.document)
      if (!docResult.isValid) {
        toast.error(docResult.error || 'Documento invalido (CPF/CNPJ)')
        setCreating(false)
        return
      }
      if (newTenant.cep && !isValidCEPFormat(newTenant.cep)) {
        toast.error('CEP invalido')
        setCreating(false)
        return
      }
      // Remove empty strings and convert to undefined for optional fields
      const tenantToSend: TenantFormData = {
        email: newTenant.email.trim(),
        password: newTenant.password,
        name: newTenant.name.trim(),
        role: 'INQUILINO',
        plan: 'FREE',
      }

      // Add optional fields only if they have values
      if (newTenant.document?.trim()) tenantToSend.document = newTenant.document.trim()
      if (newTenant.phone?.trim()) tenantToSend.phone = newTenant.phone.trim()
      if (newTenant.birthDate?.trim()) tenantToSend.birthDate = newTenant.birthDate.trim()
      if (newTenant.agencyId?.trim()) tenantToSend.agencyId = newTenant.agencyId.trim()
      if (newTenant.brokerId?.trim()) tenantToSend.brokerId = newTenant.brokerId.trim()
      if (newTenant.address?.trim()) tenantToSend.address = newTenant.address.trim()
      if (newTenant.complement?.trim()) tenantToSend.complement = newTenant.complement.trim()
      if (newTenant.cep?.trim()) tenantToSend.cep = newTenant.cep.trim()
      if (newTenant.neighborhood?.trim()) tenantToSend.neighborhood = newTenant.neighborhood.trim()
      if (newTenant.city?.trim()) tenantToSend.city = newTenant.city.trim()
      if (newTenant.state?.trim()) tenantToSend.state = newTenant.state.trim()
      if (newTenant.nationality?.trim()) tenantToSend.nationality = newTenant.nationality.trim()
      if (newTenant.maritalStatus?.trim()) tenantToSend.maritalStatus = newTenant.maritalStatus.trim()
      if (newTenant.profession?.trim()) tenantToSend.profession = newTenant.profession.trim()
      if (newTenant.rg?.trim()) tenantToSend.rg = newTenant.rg.trim()
      if (newTenant.employerName?.trim()) tenantToSend.employerName = newTenant.employerName.trim()
      if (newTenant.emergencyContactName?.trim()) tenantToSend.emergencyContactName = newTenant.emergencyContactName.trim()
      if (newTenant.emergencyContactPhone?.trim()) tenantToSend.emergencyContactPhone = newTenant.emergencyContactPhone.trim()

      createTenantMutation.mutate(tenantToSend)
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTenant) return
    setUpdating(true)
    try {
      const docResult = validateDocument(editForm.document)
      if (!docResult.isValid) {
        toast.error(docResult.error || 'Documento invalido (CPF/CNPJ)')
        setUpdating(false)
        return
      }
      if (!isValidCEPFormat(editForm.cep)) {
        toast.error('CEP invalido')
        setUpdating(false)
        return
      }
      const { password, ...restData } = editForm;
      
      const updateData = password ? { ...restData, password } : restData;
      updateTenantMutation.mutate({ id: selectedTenant.id, data: updateData })
    } finally {
      setUpdating(false)
    }
  }

  const handleViewTenant = async (tenant: Tenant) => {
    closeAllModals()
    setSelectedTenant(tenant)
    setTenantDetail(null)
    setTenantDetailLoading(true)
    setShowDetailModal(true)
    
    try {
      const fullTenantDetails = await usersAPI.getUserById(tenant.id)
      setTenantDetail(fullTenantDetails)
    } catch (error) {
      console.error('Error loading tenant details:', error)
      toast.error('Erro ao carregar detalhes do inquilino')
      setTenantDetail(tenant) // Fallback to basic tenant data
    } finally {
      setTenantDetailLoading(false)
    }
  }

  const handleEditTenant = async (tenant: Tenant) => {
    closeAllModals()
    setEmailError('')
    setEmailVerified(true)
    setCheckingEmail(false)
    const tenantId = tenant.id.toString()
    setLoadingEditId(tenantId)
    try {
      const fullTenantDetails = await usersAPI.getUserById(tenant.id)
      setSelectedTenant(fullTenantDetails)
      setEditForm({
        name: fullTenantDetails.name || '',
        email: fullTenantDetails.email || '',
        phone: fullTenantDetails.phone || '',
        document: fullTenantDetails.document || '',
        password: fullTenantDetails.plainPassword || '',
        birthDate: fullTenantDetails.birthDate ? fullTenantDetails.birthDate.split('T')[0] : '',
        address: fullTenantDetails.address || '',
        cep: fullTenantDetails.cep || '',
        neighborhood: fullTenantDetails.neighborhood || '',
        city: fullTenantDetails.city || '',
        state: fullTenantDetails.state || '',
        brokerId: fullTenantDetails.brokerId || '',
        nationality: fullTenantDetails.nationality || '',
        maritalStatus: fullTenantDetails.maritalStatus || '',
        profession: fullTenantDetails.profession || '',
        rg: fullTenantDetails.rg || '',
      })
      setShowEditModal(true)
    } catch {
      toast.error('Erro ao carregar detalhes do inquilino')
    } finally {
      setLoadingEditId(null)
    }
  }

  const handleDeleteTenant = (tenant: Tenant) => {
    closeAllModals()
    setTenantToDelete(tenant)
  }

  const confirmDelete = () => {
    if (tenantToDelete) {
      deleteTenantMutation.mutate(tenantToDelete.id)
    }
  }

  const handleWhatsAppNotification = (tenant: Tenant) => {
    closeAllModals()
    setSelectedTenant(tenant)
    setWhatsappMessage(`Ola ${tenant.name}! Este e um lembrete sobre seu aluguel.`)
    setShowWhatsAppModal(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewTenant(prev => ({ ...prev, [name]: value }))
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-20 h-10 rounded" />
            <Skeleton className="w-36 h-10 rounded" />
          </div>
        </div>

        {/* Search Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex w-full sm:max-w-lg gap-2">
            <Skeleton className="h-10 flex-1 rounded" />
            <Skeleton className="h-10 w-20 rounded" />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  {[...Array(6)].map((_, i) => (
                    <th key={i} className="p-4">
                      <Skeleton className="h-4 w-20" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(6)].map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                    </td>
                    <td className="p-4"><Skeleton className="h-5 w-28" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-40" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-36" /></td>
                    <td className="p-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Skeleton className="h-9 w-9 rounded" />
                        <Skeleton className="h-9 w-9 rounded" />
                        <Skeleton className="h-9 w-9 rounded" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <PageHeader 
          title="Inquilinos" 
          subtitle="Gerencie todos os seus inquilinos"
        />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex border border-border rounded-lg p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('table')}
                    className={viewMode === 'table' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visualizacao em Tabela</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('cards')}
                    className={viewMode === 'cards' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visualizacao em Cards</TooltipContent>
              </Tooltip>
            </div>

            {showCreateTenantButton && (
              <div className="flex items-center gap-2 w-full">
                <Button
                  className="bg-orange-600 hover:bg-orange-700 text-white flex-1 sm:flex-none"
                  onClick={async () => {
                    setCheckingPlanLimit(true)
                    try {
                      let result: { allowed: boolean; message?: string }

                      if (isOwnerUser && user?.id) {
                        // INDEPENDENT_OWNER uses userId-based check
                        result = await plansAPI.canCreateTenantForOwner(user.id.toString())
                      } else if (user?.agencyId) {
                        // Agency users use agencyId-based check
                        result = await agenciesAPI.checkUserCreationAllowed(user.agencyId.toString(), 'TENANT')
                      } else {
                        toast.error('Usuário não encontrado')
                        return
                      }

                      if (result.allowed) {
                        closeAllModals()
                        setEmailError('')
                        setShowAnalysisSearchModal(true)
                      } else {
                        setUpgradeErrorMessage(result.message || 'Você atingiu o limite de inquilinos do seu plano.')
                        setShowUpgradeModal(true)
                      }
                    } catch (error) {
                      console.error('Error checking plan limit:', error)
                      closeAllModals()
                      setEmailError('')
                      setShowAnalysisSearchModal(true)
                    } finally {
                      setCheckingPlanLimit(false)
                    }
                  }}
                  disabled={checkingPlanLimit}
                >
                  {checkingPlanLimit ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  <span className="hidden sm:inline">Cadastrar Inquilino</span>
                  <span className="sm:hidden">Adicionar</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex w-full sm:max-w-lg gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSearch()
                  }
                }}
                placeholder="Pesquisar por nome, email ou documento"
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} className="self-stretch">
              Buscar
            </Button>
            {(searchTerm || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="self-stretch"
              >
                Limpar
              </Button>
            )}
          </div>
        </div>

        {tenants && tenants.length > 0 ? (
          viewMode === 'table' ? (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-semibold">Nome</th>
                      <th className="text-left p-4 font-semibold">Telefone</th>
                      <th className="text-left p-4 font-semibold">Email</th>
                      <th className="text-left p-4 font-semibold">Endereco</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-left p-4 font-semibold">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((tenant: Tenant) => (
                      <tr key={tenant.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={getPhotoUrl(tenant.photoUrl)} alt={tenant.name || 'Inquilino'} />
                              <AvatarFallback className="bg-blue-100 text-blue-700">
                                {(tenant.name || tenant.email || 'I').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{tenant.name || 'Sem nome'}</div>
                              {tenant.token && (
                                <div className="text-[10px] text-muted-foreground font-mono">{tenant.token}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-muted-foreground">{tenant.phone || '-'}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-muted-foreground">{tenant.email || '-'}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-muted-foreground">
                            {tenant.address ? (
                              <>
                                {tenant.address}
                                {tenant.city && `, ${tenant.city}`}
                                {tenant.state && ` - ${tenant.state}`}
                              </>
                            ) : (
                              '-'
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {tenant.isFrozen ? (
                            <Badge className="bg-amber-500 text-white">Congelado</Badge>
                          ) : tenant.status === 'INACTIVE' || tenant.status === 'SUSPENDED' ? (
                            <Badge className="bg-red-500 text-white">Suspenso</Badge>
                          ) : (
                            <Badge className="bg-green-500 text-white">Ativo</Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleViewTenant(tenant)}
                              className="text-orange-600 border-orange-600 hover:bg-orange-50"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {canUpdateUsers && !tenant.isFrozen && (
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleEditTenant(tenant)}
                                disabled={loadingEditId === tenant.id.toString()}
                                className="text-orange-600 border-orange-600 hover:bg-orange-50"
                              >
                                {loadingEditId === tenant.id.toString() ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
                              </Button>
                            )}
                            {canUpdateUsers && tenant.isFrozen && (
                              <Button
                                size="icon"
                                variant="outline"
                                disabled
                                className="text-muted-foreground border-muted"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {canDeleteUsers && (
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleDeleteTenant(tenant)}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden">
                {tenants.map((tenant: Tenant) => (
                  <div key={tenant.id} className="border-b border-border last:border-b-0 p-4">
                    <div className="flex items-start justify-between mb-3 min-w-0 gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={getPhotoUrl(tenant.photoUrl)} alt={tenant.name || 'Inquilino'} />
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {(tenant.name || tenant.email || 'I').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">{tenant.name || 'Sem nome'}</h3>
                          {tenant.token && (
                            <p className="text-[10px] text-muted-foreground font-mono">{tenant.token}</p>
                          )}
                          <p className="text-sm text-muted-foreground truncate">{tenant.email || '-'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-green-500 text-white text-xs flex-shrink-0">Inquilino</Badge>
                        {tenant.isFrozen ? (
                          <Badge className="bg-amber-500 text-white text-xs">Congelado</Badge>
                        ) : tenant.status === 'INACTIVE' || tenant.status === 'SUSPENDED' ? (
                          <Badge className="bg-red-500 text-white text-xs">Suspenso</Badge>
                        ) : (
                          <Badge className="bg-green-500 text-white text-xs">Ativo</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 w-full justify-end">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleViewTenant(tenant)}
                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {canUpdateUsers && !tenant.isFrozen && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleEditTenant(tenant)}
                          disabled={loadingEditId === tenant.id.toString()}
                          className="text-orange-600 border-orange-600 hover:bg-orange-50"
                        >
                          {loadingEditId === tenant.id.toString() ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
                        </Button>
                      )}
                      {canUpdateUsers && tenant.isFrozen && (
                        <Button
                          size="icon"
                          variant="outline"
                          disabled
                          className="text-muted-foreground border-muted"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {canDeleteUsers && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleDeleteTenant(tenant)}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            
            <div className="flex justify-center w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full max-w-7xl px-2 items-stretch justify-center">
                {tenants.map((tenant: Tenant) => (
                  <Card key={tenant.id} className="transition-all hover:shadow-md flex flex-col w-full max-w-[400px] mx-auto overflow-hidden">
                    <CardContent className="p-0 h-full flex flex-col overflow-hidden min-w-0">
                      <div className="flex h-full min-w-0">
                        {}
                        <div className="w-28 min-w-28 h-36 bg-primary/10 flex items-center justify-center rounded-l-md flex-shrink-0">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={getPhotoUrl(tenant.photoUrl)} alt={tenant.name || 'Inquilino'} />
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl">
                              {(tenant.name || tenant.email || 'I').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        {}
                        <div className="flex-1 flex flex-col justify-between p-4 min-w-0 overflow-hidden">
                          <div className="min-w-0 space-y-1">
                            <h3 className="text-lg font-bold truncate" title={tenant.name || 'Sem nome'}>{tenant.name || 'Sem nome'}</h3>
                            {tenant.token && (
                              <p className="text-[10px] text-muted-foreground font-mono">{tenant.token}</p>
                            )}
                            <p className="text-sm text-muted-foreground truncate" title={tenant.email}>
                              {tenant.email}
                            </p>
                            {tenant.phone && (
                              <p className="text-xs text-muted-foreground truncate" title={tenant.phone}>
                                📞 {tenant.phone}
                              </p>
                            )}
                            {tenant.document && (
                              <p className="text-xs text-muted-foreground truncate" title={tenant.document}>
                                📄 {tenant.document}
                              </p>
                            )}
                            {tenant.address && (
                              <p className="text-xs text-muted-foreground truncate mt-1" title={`${tenant.address}${tenant.city ? `, ${tenant.city}` : ''}${tenant.state ? ` - ${tenant.state}` : ''}`}>
                                📍 {tenant.address}
                                {tenant.city && `, ${tenant.city}`}
                                {tenant.state && ` - ${tenant.state}`}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-2 gap-2 flex-shrink-0">
                            <div className="min-w-0 flex-shrink flex items-center gap-2">
                              {tenant.isFrozen ? (
                                <Badge className="bg-amber-500 text-white">Congelado</Badge>
                              ) : tenant.status === 'INACTIVE' || tenant.status === 'SUSPENDED' ? (
                                <Badge className="bg-red-500 text-white">Suspenso</Badge>
                              ) : (
                                <Badge className="bg-green-500 text-white">Ativo</Badge>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="outline" className="flex-shrink-0">
                                  <MoreHorizontal className="w-5 h-5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewTenant(tenant)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Visualizar
                                </DropdownMenuItem>
                                {canUpdateUsers && !tenant.isFrozen && (
                                  <DropdownMenuItem onClick={() => handleEditTenant(tenant)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar inquilino
                                  </DropdownMenuItem>
                                )}
                                {canUpdateUsers && tenant.isFrozen && (
                                  <DropdownMenuItem disabled className="text-muted-foreground">
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar inquilino (congelado)
                                  </DropdownMenuItem>
                                )}
                                {!tenant.isFrozen ? (
                                  <DropdownMenuItem onClick={() => handleViewContracts(tenant)}>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Ver contratos
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem disabled className="text-muted-foreground">
                                    <FileText className="w-4 h-4 mr-2" />
                                    Ver contratos (congelado)
                                  </DropdownMenuItem>
                                )}
                                {!tenant.isFrozen ? (
                                  <DropdownMenuItem onClick={() => handleWhatsAppNotification(tenant)}>
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Notificar por WhatsApp
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem disabled className="text-muted-foreground">
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Notificar por WhatsApp (congelado)
                                  </DropdownMenuItem>
                                )}
                                {canDeleteUsers && (
                                  <DropdownMenuItem onClick={() => handleDeleteTenant(tenant)} className="text-red-600 focus:text-red-700">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir inquilino
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="text-center py-12 sm:py-16 bg-card border border-border rounded-lg px-4">
            <Users className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhum inquilino cadastrado</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              Comece adicionando seu primeiro inquilino
            </p>
            {showCreateTenantButton && (
              <Button
                onClick={async () => {
                  setCheckingPlanLimit(true)
                  try {
                    let result: { allowed: boolean; message?: string }

                    if (isOwnerUser && user?.id) {
                      // INDEPENDENT_OWNER uses userId-based check
                      result = await plansAPI.canCreateTenantForOwner(user.id.toString())
                    } else if (user?.agencyId) {
                      // Agency users use agencyId-based check
                      result = await agenciesAPI.checkUserCreationAllowed(user.agencyId.toString(), 'TENANT')
                    } else {
                      toast.error('Usuário não encontrado')
                      return
                    }

                    if (result.allowed) {
                      setEmailError('')
                      setShowAnalysisSearchModal(true)
                    } else {
                      setUpgradeErrorMessage(result.message || 'Você atingiu o limite de inquilinos do seu plano.')
                      setShowUpgradeModal(true)
                    }
                  } catch (error) {
                    console.error('Error checking plan limit:', error)
                    setEmailError('')
                    setShowAnalysisSearchModal(true)
                  } finally {
                    setCheckingPlanLimit(false)
                  }
                }}
                disabled={checkingPlanLimit}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {checkingPlanLimit ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Cadastrar Inquilino
              </Button>
            )}
          </div>
        )}

        {}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Locatario</DialogTitle>
            </DialogHeader>
            <form className="space-y-6" onSubmit={handleCreateTenant}>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Informacoes Pessoais</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <DocumentInput
                      value={newTenant.document}
                      onChange={(value) => setNewTenant(prev => ({ ...prev, document: value }))}
                      label="Documento (CPF/CNPJ)"
                      placeholder="000.000.000-00"
                      showValidation={true}
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      name="name"
                      value={newTenant.name}
                      onChange={handleInputChange}
                      placeholder="Nome completo"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={newTenant.phone}
                      onChange={handleInputChange}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={newTenant.email}
                        onChange={(e) => {
                          handleInputChange(e)
                          setEmailVerified(false)
                          setEmailError('')
                        }}
                        onBlur={(e) => checkEmailExists(e.target.value)}
                        placeholder="email@exemplo.com"
                        required
                        className={`pr-10 ${emailError ? 'border-red-500' : emailVerified ? 'border-green-500' : ''}`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {checkingEmail && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                        {!checkingEmail && emailVerified && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {!checkingEmail && emailError && <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                    </div>
                    {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
                    {emailVerified && !emailError && <p className="text-green-500 text-sm mt-1">Email disponível</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PasswordInput
                    id="password"
                    name="password"
                    label="Senha"
                    value={newTenant.password}
                    onChange={handleInputChange}
                    placeholder="Digite a senha"
                    required
                    showStrengthIndicator={true}
                  />
                  <div>
                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                    <Input
                      id="birthDate"
                      name="birthDate"
                      type="date"
                      value={newTenant.birthDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <RGInput
                    value={newTenant.rg || ''}
                    onChange={(value) => setNewTenant(prev => ({ ...prev, rg: value }))}
                    label="RG"
                    placeholder="00.000.000-0"
                    showValidation={true}
                  />
                  <div>
                    <Label htmlFor="nationality">Nacionalidade</Label>
                    <Input
                      id="nationality"
                      name="nationality"
                      value={newTenant.nationality}
                      onChange={handleInputChange}
                      placeholder="Brasileira"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maritalStatus">Estado Civil</Label>
                    <Select
                      value={newTenant.maritalStatus}
                      onValueChange={(value) => setNewTenant(prev => ({ ...prev, maritalStatus: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                        <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                        <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                        <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                        <SelectItem value="União Estável">União Estável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="profession">Profissão</Label>
                    <Input
                      id="profession"
                      name="profession"
                      value={newTenant.profession}
                      onChange={handleInputChange}
                      placeholder="Ex: Engenheiro"
                    />
                  </div>
                </div>

                {}
                {isAdminOrCeo && agencies && agencies.length > 0 && (
                  <div>
                    <Label htmlFor="agencyId">Imobiliaria</Label>
                    <select
                      id="agencyId"
                      name="agencyId"
                      value={newTenant.agencyId}
                      onChange={(e) => setNewTenant(prev => ({ ...prev, agencyId: e.target.value }))}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    >
                      <option value="">Selecione uma imobiliaria (opcional)</option>
                      {agencies.map((agency: { id: string; name: string }) => (
                        <option key={agency.id} value={agency.id}>
                          {agency.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Associar o inquilino a uma imobiliaria permite que os gestores da imobiliaria o vejam
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Endereco</h3>
                </div>

                <div>
                  <CEPInput
                    value={newTenant.cep}
                    onChange={(v: string) => setNewTenant((prev) => ({ ...prev, cep: v }))}
                    onCEPData={handleNewTenantCEPData}
                    placeholder="00000-000"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Endereco</Label>
                  <Input
                    id="address"
                    name="address"
                    value={newTenant.address}
                    onChange={handleInputChange}
                    placeholder="Rua, Avenida, etc."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      name="neighborhood"
                      value={newTenant.neighborhood}
                      onChange={handleInputChange}
                      placeholder="Centro"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      name="city"
                      value={newTenant.city}
                      onChange={handleInputChange}
                      placeholder="Sao Paulo"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    name="state"
                    value={newTenant.state}
                    onChange={handleInputChange}
                    placeholder="SP"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} disabled={creating}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={creating || checkingEmail || !emailVerified}
                >
                  {creating ? 'Cadastrando...' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
            <DialogHeader>
              <DialogTitle>Editar Locatario</DialogTitle>
            </DialogHeader>
            {loadingEditId ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <Skeleton className="h-6 w-48" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleUpdateTenant}>
              {}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Informacoes Pessoais</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-document">Documento</Label>
                    <Input
                      id="edit-document"
                      name="document"
                      value={editForm.document}
                      onChange={handleEditInputChange}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-name">Nome</Label>
                    <Input
                      id="edit-name"
                      name="name"
                      value={editForm.name}
                      onChange={handleEditInputChange}
                      placeholder="Nome completo"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-phone">Telefone</Label>
                    <Input
                      id="edit-phone"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleEditInputChange}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">Email</Label>
                    <div className="relative">
                      <Input
                        id="edit-email"
                        name="email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) => {
                          handleEditInputChange(e)
                          setEmailVerified(false)
                          setEmailError('')
                        }}
                        onBlur={(e) => checkEmailExists(e.target.value, selectedTenant?.email)}
                        placeholder="email@exemplo.com"
                        required
                        className={`pr-10 ${emailError ? 'border-red-500' : emailVerified ? 'border-green-500' : ''}`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {checkingEmail && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                        {!checkingEmail && emailVerified && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {!checkingEmail && emailError && <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                    </div>
                    {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
                    {emailVerified && !emailError && <p className="text-green-500 text-sm mt-1">Email disponível</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PasswordInput
                    id="edit-password"
                    name="password"
                    label="Senha"
                    value={editForm.password}
                    onChange={handleEditInputChange}
                    placeholder="Digite a senha (deixe em branco para não alterar)"
                    showStrengthIndicator={true}
                  />
                  <div>
                    <Label htmlFor="edit-birthDate">Data de Nascimento</Label>
                    <Input
                      id="edit-birthDate"
                      name="birthDate"
                      type="date"
                      value={editForm.birthDate}
                      onChange={handleEditInputChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <RGInput
                    value={editForm.rg}
                    onChange={(value) => setEditForm(prev => ({ ...prev, rg: value }))}
                    label="RG"
                    placeholder="00.000.000-0"
                    showValidation={true}
                    id="edit-rg"
                    name="rg"
                  />
                  <div>
                    <Label htmlFor="edit-nationality">Nacionalidade</Label>
                    <Input
                      id="edit-nationality"
                      name="nationality"
                      value={editForm.nationality}
                      onChange={handleEditInputChange}
                      placeholder="Brasileira"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-maritalStatus">Estado Civil</Label>
                    <Select
                      value={editForm.maritalStatus}
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, maritalStatus: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                        <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                        <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                        <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                        <SelectItem value="União Estável">União Estável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-profession">Profissão</Label>
                    <Input
                      id="edit-profession"
                      name="profession"
                      value={editForm.profession}
                      onChange={handleEditInputChange}
                      placeholder="Ex: Engenheiro"
                    />
                  </div>
                </div>
              </div>

              {}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Endereco</h3>
                </div>

                <div>
                  <CEPInput
                    value={editForm.cep}
                    onChange={(v: string) => setEditForm((prev) => ({ ...prev, cep: v }))}
                    onCEPData={handleEditTenantCEPData}
                    placeholder="00000-000"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-address">Endereco</Label>
                  <Input
                    id="edit-address"
                    name="address"
                    value={editForm.address}
                    onChange={handleEditInputChange}
                    placeholder="Rua, Avenida, etc."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-neighborhood">Bairro</Label>
                    <Input
                      id="edit-neighborhood"
                      name="neighborhood"
                      value={editForm.neighborhood}
                      onChange={handleEditInputChange}
                      placeholder="Centro"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-city">Cidade</Label>
                    <Input
                      id="edit-city"
                      name="city"
                      value={editForm.city}
                      onChange={handleEditInputChange}
                      placeholder="Sao Paulo"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-state">Estado</Label>
                  <Input
                    id="edit-state"
                    name="state"
                    value={editForm.state}
                    onChange={handleEditInputChange}
                    placeholder="SP"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} disabled={updating} className="text-orange-600 border-orange-600 hover:bg-orange-50">
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={updating || checkingEmail || !emailVerified}
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </div>
            </form>
            )}
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
            <DialogHeader>
              <DialogTitle>Detalhes do Locatário</DialogTitle>
            </DialogHeader>
            {tenantDetailLoading ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <Skeleton className="h-6 w-48" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  </div>
                </div>
              </div>
            ) : tenantDetail ? (
              <div className="space-y-6">
                {}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Informações Pessoais</h3>
                  </div>
                  {tenantDetail.token && (
                    <div className="mb-4">
                      <label className="text-sm font-medium text-muted-foreground">Token</label>
                      <div className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">{tenantDetail.token}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Documento (CPF/CNPJ)</label>
                      <div className="text-base">{tenantDetail.document || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome</label>
                      <div className="text-base">{tenantDetail.name || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                      <div className="text-base">{tenantDetail.phone || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <div className="text-base">{tenantDetail.email || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                      <div className="text-base">
                        {tenantDetail.birthDate ? new Date(tenantDetail.birthDate).toLocaleDateString('pt-BR') : '-'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">RG</label>
                      <div className="text-base">{tenantDetail.rg || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nacionalidade</label>
                      <div className="text-base">{tenantDetail.nationality || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Estado Civil</label>
                      <div className="text-base">{tenantDetail.maritalStatus || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Profissão</label>
                      <div className="text-base">{tenantDetail.profession || '-'}</div>
                    </div>
                  </div>
                </div>

                {}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Endereço</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">CEP</label>
                      <div className="text-base">{tenantDetail.cep || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                      <div className="text-base">{tenantDetail.address || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Bairro</label>
                      <div className="text-base">{tenantDetail.neighborhood || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Cidade</label>
                      <div className="text-base">{tenantDetail.city || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Estado</label>
                      <div className="text-base">{tenantDetail.state || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Não foi possível carregar os detalhes do inquilino.
              </div>
            )}
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showWhatsAppModal} onOpenChange={setShowWhatsAppModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Notificar por WhatsApp</DialogTitle>
            </DialogHeader>
            {selectedTenant ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <strong>Inquilino:</strong> {selectedTenant.name}
                </div>
                <div>
                  <Label htmlFor="whatsapp-message">Mensagem</Label>
                  <textarea
                    id="whatsapp-message"
                    className="w-full p-3 border border-input rounded-md min-h-[120px] resize-none"
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    placeholder="Digite sua mensagem aqui..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowWhatsAppModal(false)}>
                    Cancelar
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      const phoneNumber = selectedTenant.phone || ''
                      const message = encodeURIComponent(whatsappMessage)
                      const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${message}`
                      window.open(whatsappUrl, '_blank')
                      setShowWhatsAppModal(false)
                      toast.success('Abrindo WhatsApp...')
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Enviar
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showContractsModal} onOpenChange={setShowContractsModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Contratos do Inquilino</DialogTitle>
            </DialogHeader>
            {selectedTenant ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <strong>Inquilino:</strong> {selectedTenant.name}
                </div>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum contrato encontrado</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowContractsModal(false)}>
                    Fechar
                  </Button>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Contrato
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showAnalysisSearchModal} onOpenChange={setShowAnalysisSearchModal}>
          <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden">
            {}
            <DialogHeader className="sr-only">
              <DialogTitle>Verificar Análise do Inquilino</DialogTitle>
            </DialogHeader>

            {}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Cadastrar Inquilino</h2>
                  <p className="text-orange-100 text-sm">Verificação opcional - busque por CPF ou CNPJ</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-800">
                    <strong>Verificação opcional:</strong> Se você possui créditos de análise no seu plano, pode verificar o inquilino antes de cadastrar. Caso contrário, pule esta etapa.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Documento (CPF ou CNPJ)
                </Label>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1">
                    <Input
                      value={searchDocument}
                      onChange={(e) => {
                        const inputValue = e.target.value
                        const cleanValue = inputValue.replace(/\D/g, '')
                        if (cleanValue.length > 14) return
                        let formatted = inputValue
                        if (cleanValue.length <= 11) {
                          formatted = cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                        } else {
                          formatted = cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
                        }
                        setSearchDocument(formatted)
                        setAnalysisError('')
                        setAnalysisResult(null)
                      }}
                      placeholder="000.000.000-00"
                      className="h-10"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleSearchAnalysis}
                    disabled={searchingAnalysis || !searchDocument}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-5 h-10"
                  >
                    {searchingAnalysis ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Buscar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {}
              {analysisError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <XCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 mb-1">Não foi possível prosseguir</p>
                      <p className="text-sm text-red-700">{analysisError}</p>
                      <Button
                        variant="link"
                        asChild
                        className="text-red-600 hover:text-red-800 p-0 h-auto mt-2 text-sm"
                      >
                        <a href="/dashboard/tenant-analysis">
                          Ir para Análise de Inquilinos →
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {}
              {analysisResult && (
                <div className="space-y-4">
                  {}
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-800">Inquilino Aprovado!</p>
                        <p className="text-sm text-green-700">Este inquilino pode ser cadastrado no sistema.</p>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h4 className="font-medium text-gray-800">Dados da Análise</h4>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Nome</p>
                          <p className="font-medium text-gray-900">{analysisResult?.name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Documento (CPF/CNPJ)</p>
                          <p className="font-medium text-gray-900 font-mono">{analysisResult?.document || '-'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Nível de Risco</p>
                          <Badge className={`${analysisResult?.riskLevel === 'LOW' ? 'bg-green-500 hover:bg-green-600' :
                              analysisResult?.riskLevel === 'MEDIUM' ? 'bg-yellow-500 hover:bg-yellow-600' :
                                'bg-orange-500 hover:bg-orange-600'
                            } text-white`}>
                            {analysisResult?.riskLevel === 'LOW' ? 'Baixo' :
                              analysisResult?.riskLevel === 'MEDIUM' ? 'Médio' : analysisResult?.riskLevel || '-'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Recomendação</p>
                          <Badge className={`${analysisResult?.recommendation === 'APPROVED' ? 'bg-green-500 hover:bg-green-600' :
                              'bg-yellow-500 hover:bg-yellow-600'
                            } text-white`}>
                            {analysisResult?.recommendation === 'APPROVED' ? 'Aprovado' :
                              analysisResult?.recommendation === 'APPROVED_WITH_CAUTION' ? 'Aprovado com Ressalvas' :
                                analysisResult?.recommendation || '-'}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {analysisResult?.riskScore !== undefined && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Score de Risco</p>
                            <p className="font-medium text-gray-900">{analysisResult.riskScore}/1000</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Data da Análise</p>
                          <p className="font-medium text-gray-900">
                            {analysisResult?.analyzedAt ? new Date(analysisResult.analyzedAt).toLocaleDateString('pt-BR') : '-'}
                          </p>
                        </div>
                      </div>
                      {analysisResult?.recommendation === 'APPROVED_WITH_CAUTION' && analysisResult?.recommendationNotes && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-yellow-800">{analysisResult?.recommendationNotes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {}
                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAnalysisSearchModal(false)}
                      className="w-full sm:w-auto"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleProceedToRegistration}
                      className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Prosseguir com Cadastro
                    </Button>
                  </div>
                </div>
              )}

              {}
              {!analysisResult && !analysisError && !searchingAnalysis && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-muted-foreground mb-6">Digite o documento e clique em buscar</p>

                  <div className="border-t pt-6">
                    <p className="text-sm text-muted-foreground mb-3">Ou pule a verificação e cadastre diretamente:</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSkipVerification}
                      className="w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Cadastrar sem Verificação
                    </Button>
                  </div>
                </div>
              )}

              {}
              {searchingAnalysis && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-3 border-orange-600 border-t-transparent" />
                  </div>
                  <p className="text-muted-foreground">Buscando análise...</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={!!tenantToDelete} onOpenChange={() => setTenantToDelete(null)}>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-xl">
            <DialogHeader>
              <DialogTitle>Excluir inquilino</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o inquilino <strong>{tenantToDelete?.name}</strong>? Esta acao nao podera ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-row gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setTenantToDelete(null)}
                disabled={deleteTenantMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={deleteTenantMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteTenantMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-6 h-6" />
                Limite do Plano Atingido
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                  <Crown className="w-8 h-8 text-amber-600" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-gray-900">
                  Você atingiu o limite do plano
                </p>
                <p className="text-sm text-muted-foreground">
                  {upgradeErrorMessage || 'Você atingiu o limite de usuários do seu plano atual.'}
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-green-800">
                  Faça upgrade para desbloquear:
                </p>
                <ul className="text-sm text-green-700 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Mais inquilinos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Mais imóveis
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Mais contratos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Recursos avançados
                  </li>
                </ul>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Deseja fazer upgrade do seu plano agora?
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowUpgradeModal(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                onClick={() => {
                  setShowUpgradeModal(false)
                  if (user?.role === 'AGENCY_ADMIN' || user?.role === 'AGENCY_MANAGER') {
                    navigate('/dashboard/agency-plan-config')
                  } else if (user?.role === 'INDEPENDENT_OWNER') {
                    navigate('/dashboard/owner-plan-config')
                  } else {
                    navigate('/dashboard/plans')
                  }
                }}
              >
                <Crown className="w-4 h-4 mr-2" />
                Fazer Upgrade
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
