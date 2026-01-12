import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI, agenciesAPI } from '@/api'
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  MapPin,
  Grid3X3,
  List,
  CheckCircle,
  XCircle,
  Loader2,
  Crown,
  AlertTriangle,
  Search,
  Briefcase,
  Users
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
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
import { BadgeCheck } from 'lucide-react'
import { formatCRECIInput } from '@/lib/validation'

export function Brokers() {
  const { hasPermission, user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const isCEO = user?.role === 'CEO'
  const canViewUsers = hasPermission('users:read')
  const canCreateUsers = hasPermission('users:create') && !isCEO
  const canUpdateUsers = hasPermission('users:update') && !isCEO
  const canDeleteUsers = hasPermission('users:delete') && !isCEO

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeErrorMessage, setUpgradeErrorMessage] = useState('')

  const [newBroker, setNewBroker] = useState({
    document: '',
    name: '',
    phone: '',
    email: '',
    password: '',
    birthDate: '',
    creci: '',
    cep: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
  })

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    password: '',
    birthDate: '',
    creci: '',
    address: '',
    cep: '',
    neighborhood: '',
    city: '',
    state: '',
  })

  const [selectedBroker, setSelectedBroker] = useState<any>(null)
  const [brokerToDelete, setBrokerToDelete] = useState<any>(null)
  const [brokerDetail, setBrokerDetail] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [emailError, setEmailError] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [checkingPlanLimit, setCheckingPlanLimit] = useState(false)

  const handleSearch = useCallback(() => {
    setSearchQuery(searchTerm.trim())
  }, [searchTerm])

  const checkPlanLimitAndOpenModal = useCallback(async () => {
    if (!user?.agencyId) {
      toast.error('Agência não encontrada')
      return
    }

    setCheckingPlanLimit(true)
    try {
      const result = await agenciesAPI.checkUserCreationAllowed(user.agencyId.toString(), 'BROKER')
      if (result.allowed) {
        closeAllModals()
        setEmailError('')
        setShowCreateModal(true)
      } else {
        setUpgradeErrorMessage(result.message || 'Você atingiu o limite de usuários do seu plano.')
        setShowUpgradeModal(true)
      }
    } catch (error: any) {
      console.error('Error checking plan limit:', error)
      // If error, try to open the modal anyway and let backend handle it
      closeAllModals()
      setEmailError('')
      setShowCreateModal(true)
    } finally {
      setCheckingPlanLimit(false)
    }
  }, [user?.agencyId])

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

  if (!canViewUsers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Voce nao tem permissao para visualizar corretores.</p>
        </div>
      </div>
    )
  }

  const { data: brokers, isLoading } = useQuery({
    queryKey: ['brokers', user?.id, user?.agencyId, searchQuery],
    queryFn: async () => {
      const list = await usersAPI.listUsers({ role: 'BROKER', pageSize: 100, search: searchQuery || undefined })
      return list.items || []
    },
    enabled: canViewUsers,
    staleTime: 0,
    refetchOnMount: 'always' as const,
    refetchOnReconnect: 'always' as const,
    refetchOnWindowFocus: true,
  })

  const closeAllModals = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setShowDetailModal(false)
    setSelectedBroker(null)
    setBrokerToDelete(null)
    setEmailError('')
    setEmailVerified(false)
    setCheckingEmail(false)
  }

  const createBrokerMutation = useMutation({
    mutationFn: (data: any) => usersAPI.createUser({
      ...data,
      role: 'BROKER',
      plan: 'FREE',
      managerId: user?.id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      closeAllModals()
      setNewBroker({
        document: '',
        name: '',
        phone: '',
        email: '',
        password: '',
        birthDate: '',
        creci: '',
        cep: '',
        address: '',
        neighborhood: '',
        city: '',
        state: '',
      })
      toast.success('Corretor criado com sucesso')
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.data?.message || error?.message || ''
      const isPlanLimitError = error?.response?.status === 403 ||
        errorMessage.toLowerCase().includes('plano') ||
        errorMessage.toLowerCase().includes('limite') ||
        errorMessage.toLowerCase().includes('plan')

      if (isPlanLimitError) {
        setUpgradeErrorMessage(errorMessage || 'Você atingiu o limite do seu plano.')
        setShowCreateModal(false)
        setShowUpgradeModal(true)
      } else if (errorMessage.toLowerCase().includes('already exists')) {
        toast.error('Este usuario já existe. Verifique o email ou documento.')
      } else {
        toast.error(errorMessage || 'Erro ao criar corretor')
      }
    },
  })

  const updateBrokerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => usersAPI.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      closeAllModals()
      toast.success('Corretor atualizado com sucesso')
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Erro ao atualizar corretor'
      toast.error(errorMessage)
    },
  })

  const deleteBrokerMutation = useMutation({
    mutationFn: (id: string) => usersAPI.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      closeAllModals()
      toast.success('Corretor excluido com sucesso')
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Erro ao excluir corretor'
      toast.error(errorMessage)
    },
  })

  const handleCreateBroker = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const docResult = validateDocument(newBroker.document)
      if (!docResult.isValid) {
        toast.error(docResult.error || 'Documento invalido (CPF/CNPJ)')
        return
      }
      if (!isValidCEPFormat(newBroker.cep)) {
        toast.error('CEP invalido')
        return
      }
      const brokerToSend = {
        ...newBroker,
        birthDate: newBroker.birthDate ? new Date(newBroker.birthDate) : null,
      }
      createBrokerMutation.mutate(brokerToSend)
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateBroker = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBroker) return
    setUpdating(true)
    try {
      const docResult = validateDocument(editForm.document)
      if (!docResult.isValid) {
        toast.error(docResult.error || 'Documento invalido (CPF/CNPJ)')
        return
      }
      if (!isValidCEPFormat(editForm.cep)) {
        toast.error('CEP invalido')
        return
      }
      const { password, ...restData } = editForm;
      
      const brokerToSend = {
        ...restData,
        birthDate: editForm.birthDate || undefined,
        ...(password ? { password } : {}),
      };
      updateBrokerMutation.mutate({ id: selectedBroker.id, data: brokerToSend })
    } finally {
      setUpdating(false)
    }
  }

  const handleNewBrokerCEPData = useCallback((data: any) => {
    setNewBroker((prev: any) => ({
      ...prev,
      address: data.logradouro || data.street || prev.address,
      neighborhood: data.bairro || data.neighborhood || prev.neighborhood,
      city: data.cidade || data.city || prev.city,
      state: data.estado || data.state || prev.state,
    }))
  }, [])

  const handleEditBrokerCEPData = useCallback((data: any) => {
    setEditForm((prev: any) => ({
      ...prev,
      address: data.logradouro || data.street || prev.address,
      neighborhood: data.bairro || data.neighborhood || prev.neighborhood,
      city: data.cidade || data.city || prev.city,
      state: data.estado || data.state || prev.state,
    }))
  }, [])

  const handleViewBroker = async (broker: any) => {
    closeAllModals()
    const brokerId = broker.id.toString()
    setLoadingDetailsId(brokerId)
    try {
      const fullBrokerDetails = await usersAPI.getUserById(broker.id)
      setSelectedBroker(fullBrokerDetails)
      setBrokerDetail(fullBrokerDetails)
      setShowDetailModal(true)
    } catch {
      toast.error('Erro ao carregar detalhes do corretor')
    } finally {
      setLoadingDetailsId(null)
    }
  }

  const handleEditBroker = async (broker: any) => {
    closeAllModals()
    setEmailError('')
    const brokerId = broker.id.toString()
    setLoadingDetailsId(brokerId)
    try {
      const fullBrokerDetails = await usersAPI.getUserById(broker.id)
      setSelectedBroker(fullBrokerDetails)
      setEditForm({
        name: fullBrokerDetails.name || '',
        email: fullBrokerDetails.email || '',
        phone: fullBrokerDetails.phone || '',
        document: fullBrokerDetails.document || '',
        password: fullBrokerDetails.plainPassword || '',
        birthDate: fullBrokerDetails.birthDate ? fullBrokerDetails.birthDate.split('T')[0] : '',
        creci: fullBrokerDetails.creci || '',
        address: fullBrokerDetails.address || '',
        cep: fullBrokerDetails.cep || '',
        neighborhood: fullBrokerDetails.neighborhood || '',
        city: fullBrokerDetails.city || '',
        state: fullBrokerDetails.state || '',
      })
      setEmailVerified(true)
      setShowEditModal(true)
    } catch {
      toast.error('Erro ao carregar detalhes do corretor')
    } finally {
      setLoadingDetailsId(null)
    }
  }

  const handleDeleteBroker = (broker: any) => {
    closeAllModals()
    setBrokerToDelete(broker)
  }

  const confirmDelete = () => {
    if (brokerToDelete) {
      deleteBrokerMutation.mutate(brokerToDelete.id)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewBroker(prev => ({ ...prev, [name]: value }))
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Briefcase className="w-6 h-6 text-yellow-700" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Corretores</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Gerencie todos os corretores da sua agencia
              </p>
            </div>
          </div>
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

            {canCreateUsers && (
              <Button
                className="bg-orange-600 hover:bg-orange-700 text-white flex-1 sm:flex-none"
                onClick={checkPlanLimitAndOpenModal}
                disabled={checkingPlanLimit}
              >
                {checkingPlanLimit ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                <span className="hidden sm:inline">Cadastrar Corretor</span>
                <span className="sm:hidden">Adicionar</span>
              </Button>
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

        {brokers && brokers.length > 0 ? (
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
                    {brokers.map((broker: any) => (
                      <tr key={broker.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={getPhotoUrl(broker.photoUrl)} alt={broker.name || 'Corretor'} />
                              <AvatarFallback className="bg-yellow-100 text-yellow-700">
                                {(broker.name || broker.email || 'C').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{broker.name || 'Sem nome'}</div>
                              {broker.token && (
                                <div className="text-[10px] text-muted-foreground font-mono">{broker.token}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-muted-foreground">{broker.phone || '-'}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-muted-foreground">{broker.email || '-'}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-muted-foreground">
                            {broker.address ? (
                              <>
                                {broker.address}
                                {broker.city && `, ${broker.city}`}
                                {broker.state && ` - ${broker.state}`}
                              </>
                            ) : '-'}
                          </div>
                        </td>
                        <td className="p-4">
                          {broker.isFrozen ? (
                            <Badge className="bg-amber-500 text-white">Congelado</Badge>
                          ) : broker.status === 'INACTIVE' || broker.status === 'SUSPENDED' ? (
                            <Badge className="bg-red-500 text-white">Suspenso</Badge>
                          ) : (
                            <Badge className="bg-green-500 text-white">Ativo</Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button size="icon" variant="outline" onClick={() => handleViewBroker(broker)} disabled={loadingDetailsId === broker.id.toString()} className="text-orange-600 border-orange-600 hover:bg-orange-50">
                              {loadingDetailsId === broker.id.toString() ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            {canUpdateUsers && !broker.isFrozen && (
                              <Button size="icon" variant="outline" onClick={() => handleEditBroker(broker)} disabled={loadingDetailsId === broker.id.toString()} className="text-orange-600 border-orange-600 hover:bg-orange-50">
                                {loadingDetailsId === broker.id.toString() ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
                              </Button>
                            )}
                            {canUpdateUsers && broker.isFrozen && (
                              <Button size="icon" variant="outline" disabled className="text-muted-foreground border-muted">
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {canDeleteUsers && (
                              <Button size="icon" variant="outline" onClick={() => handleDeleteBroker(broker)} className="text-red-600 border-red-600 hover:bg-red-50">
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
                {brokers.map((broker: any) => (
                  <div key={broker.id} className="border-b border-border last:border-b-0 p-4">
                    <div className="flex items-start justify-between mb-3 min-w-0 gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={getPhotoUrl(broker.photoUrl)} alt={broker.name || 'Corretor'} />
                          <AvatarFallback className="bg-yellow-100 text-yellow-700">
                            {(broker.name || broker.email || 'C').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">{broker.name || 'Sem nome'}</h3>
                          {broker.token && (
                            <p className="text-[10px] text-muted-foreground font-mono">{broker.token}</p>
                          )}
                          <p className="text-sm text-muted-foreground truncate">{broker.email || '-'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-blue-500 text-white text-xs flex-shrink-0">Corretor</Badge>
                        {broker.isFrozen ? (
                          <Badge className="bg-amber-500 text-white text-xs">Congelado</Badge>
                        ) : broker.status === 'INACTIVE' || broker.status === 'SUSPENDED' ? (
                          <Badge className="bg-red-500 text-white text-xs">Suspenso</Badge>
                        ) : (
                          <Badge className="bg-green-500 text-white text-xs">Ativo</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 w-full justify-end">
                      <Button size="icon" variant="outline" onClick={() => handleViewBroker(broker)} disabled={loadingDetailsId === broker.id.toString()} className="text-orange-600 border-orange-600 hover:bg-orange-50">
                        {loadingDetailsId === broker.id.toString() ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      {canUpdateUsers && !broker.isFrozen && (
                        <Button size="icon" variant="outline" onClick={() => handleEditBroker(broker)} disabled={loadingDetailsId === broker.id.toString()} className="text-orange-600 border-orange-600 hover:bg-orange-50">
                          {loadingDetailsId === broker.id.toString() ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
                        </Button>
                      )}
                      {canUpdateUsers && broker.isFrozen && (
                        <Button size="icon" variant="outline" disabled className="text-muted-foreground border-muted">
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {canDeleteUsers && (
                        <Button size="icon" variant="outline" onClick={() => handleDeleteBroker(broker)} className="text-red-600 border-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {brokers.map((broker: any) => (
                <Card key={broker.id} className="transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={getPhotoUrl(broker.photoUrl)} alt={broker.name || 'Corretor'} />
                        <AvatarFallback className="bg-yellow-100 text-yellow-700">
                          {(broker.name || broker.email || 'C').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{broker.name || 'Sem nome'}</h3>
                          {broker.isFrozen ? (
                            <Badge className="bg-amber-500 text-white text-xs">Congelado</Badge>
                          ) : broker.status === 'INACTIVE' || broker.status === 'SUSPENDED' ? (
                            <Badge className="bg-red-500 text-white text-xs">Suspenso</Badge>
                          ) : (
                            <Badge className="bg-green-500 text-white text-xs">Ativo</Badge>
                          )}
                        </div>
                        {broker.token && (
                          <p className="text-[10px] text-muted-foreground font-mono">{broker.token}</p>
                        )}
                        <p className="text-sm text-muted-foreground truncate">{broker.email}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewBroker(broker)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          {canUpdateUsers && !broker.isFrozen && (
                            <DropdownMenuItem onClick={() => handleEditBroker(broker)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {canUpdateUsers && broker.isFrozen && (
                            <DropdownMenuItem disabled className="text-muted-foreground">
                              <Edit className="w-4 h-4 mr-2" />
                              Editar (congelado)
                            </DropdownMenuItem>
                          )}
                          {canDeleteUsers && (
                            <DropdownMenuItem onClick={() => handleDeleteBroker(broker)} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-12 sm:py-16 bg-card border border-border rounded-lg px-4">
            <Building2 className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhum corretor cadastrado</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              Comece adicionando seu primeiro corretor
            </p>
            {canCreateUsers && (
              <Button onClick={checkPlanLimitAndOpenModal} disabled={checkingPlanLimit} className="bg-orange-600 hover:bg-orange-700 text-white">
                {checkingPlanLimit ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Cadastrar Corretor
              </Button>
            )}
          </div>
        )}

        {}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Corretor</DialogTitle>
            </DialogHeader>
            <form className="space-y-6" onSubmit={handleCreateBroker}>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Informacoes Pessoais</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DocumentInput
                    value={newBroker.document}
                    onChange={(value) => setNewBroker(prev => ({ ...prev, document: value }))}
                    label="Documento (CPF/CNPJ)"
                    placeholder="000.000.000-00"
                    showValidation={true}
                  />
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" name="name" value={newBroker.name} onChange={handleInputChange} placeholder="Nome completo" required />
                  </div>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="creci">CRECI do Corretor</Label>
                  <div className="relative">
                    <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="creci"
                      name="creci"
                      value={newBroker.creci}
                      onChange={(e) =>
                        setNewBroker(prev => ({ ...prev, creci: formatCRECIInput(e.target.value) }))
                      }
                      placeholder="123456/SP-F"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Formato: 123456/SP ou 123456/SP-F
                  </p>
                </div>
              </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" name="phone" value={newBroker.phone} onChange={handleInputChange} placeholder="(11) 99999-9999" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={newBroker.email}
                        onChange={handleInputChange}
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
                    value={newBroker.password}
                    onChange={handleInputChange}
                    placeholder="Digite a senha"
                    required
                    showStrengthIndicator={true}
                  />
                  <div>
                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                    <Input id="birthDate" name="birthDate" type="date" value={newBroker.birthDate} onChange={handleInputChange} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Endereco</h3>
                </div>

                <CEPInput
                  value={newBroker.cep}
                  onChange={(v: string) => setNewBroker((prev: any) => ({ ...prev, cep: v }))}
                  onCEPData={handleNewBrokerCEPData}
                  placeholder="00000-000"
                />

                <div>
                  <Label htmlFor="address">Endereco</Label>
                  <Input id="address" name="address" value={newBroker.address} onChange={handleInputChange} placeholder="Rua, Avenida, etc." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input id="neighborhood" name="neighborhood" value={newBroker.neighborhood} onChange={handleInputChange} placeholder="Centro" />
                  </div>
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" name="city" value={newBroker.city} onChange={handleInputChange} placeholder="Sao Paulo" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Input id="state" name="state" value={newBroker.state} onChange={handleInputChange} placeholder="SP" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} disabled={creating}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={creating}>
                  {creating ? 'Cadastrando...' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Corretor</DialogTitle>
            </DialogHeader>
            <form className="space-y-6" onSubmit={handleUpdateBroker}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-document">Documento</Label>
                    <Input id="edit-document" name="document" value={editForm.document} onChange={handleEditInputChange} placeholder="000.000.000-00" />
                  </div>
                  <div>
                    <Label htmlFor="edit-name">Nome</Label>
                    <Input id="edit-name" name="name" value={editForm.name} onChange={handleEditInputChange} placeholder="Nome completo" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-phone">Telefone</Label>
                    <Input id="edit-phone" name="phone" value={editForm.phone} onChange={handleEditInputChange} placeholder="(11) 99999-9999" />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">Email</Label>
                    <div className="relative">
                      <Input
                        id="edit-email"
                        name="email"
                        type="email"
                        value={editForm.email}
                        onChange={handleEditInputChange}
                        onBlur={(e) => checkEmailExists(e.target.value, selectedBroker?.email)}
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
                    <Input id="edit-birthDate" name="birthDate" type="date" value={editForm.birthDate} onChange={handleEditInputChange} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-creci">CRECI do Corretor</Label>
                    <div className="relative">
                      <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="edit-creci"
                        name="creci"
                        value={editForm.creci}
                        onChange={(e) =>
                          setEditForm(prev => ({ ...prev, creci: formatCRECIInput(e.target.value) }))
                        }
                        placeholder="123456/SP-F"
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Formato: 123456/SP ou 123456/SP-F
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <CEPInput
                  value={editForm.cep}
                  onChange={(v: string) => setEditForm((prev: any) => ({ ...prev, cep: v }))}
                  onCEPData={handleEditBrokerCEPData}
                  placeholder="00000-000"
                />

                <div>
                  <Label htmlFor="edit-address">Endereco</Label>
                  <Input id="edit-address" name="address" value={editForm.address} onChange={handleEditInputChange} placeholder="Rua, Avenida, etc." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-neighborhood">Bairro</Label>
                    <Input id="edit-neighborhood" name="neighborhood" value={editForm.neighborhood} onChange={handleEditInputChange} placeholder="Centro" />
                  </div>
                  <div>
                    <Label htmlFor="edit-city">Cidade</Label>
                    <Input id="edit-city" name="city" value={editForm.city} onChange={handleEditInputChange} placeholder="Sao Paulo" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-state">Estado</Label>
                  <Input id="edit-state" name="state" value={editForm.state} onChange={handleEditInputChange} placeholder="SP" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} disabled={updating}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={updating}>
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
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Corretor</DialogTitle>
            </DialogHeader>
            {brokerDetail ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Informações Pessoais</h3>
                  </div>
                  {brokerDetail.token && (
                    <div className="mb-4">
                      <label className="text-sm font-medium text-muted-foreground">Token</label>
                      <div className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">{brokerDetail.token}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Documento (CPF/CNPJ)</label>
                      <div className="text-base">{brokerDetail.document || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome</label>
                      <div className="text-base">{brokerDetail.name || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                      <div className="text-base">{brokerDetail.phone || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <div className="text-base">{brokerDetail.email || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                      <div className="text-base">
                        {brokerDetail.birthDate ? new Date(brokerDetail.birthDate).toLocaleDateString('pt-BR') : '-'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">CRECI</label>
                      <div className="text-base">{brokerDetail.creci || '-'}</div>
                    </div>
                  </div>
                </div>

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
                      <div className="text-base">{brokerDetail.cep || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                      <div className="text-base">{brokerDetail.address || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Bairro</label>
                      <div className="text-base">{brokerDetail.neighborhood || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Cidade</label>
                      <div className="text-base">{brokerDetail.city || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Estado</label>
                      <div className="text-base">{brokerDetail.state || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Não foi possível carregar os detalhes do corretor.
              </div>
            )}
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={!!brokerToDelete} onOpenChange={() => setBrokerToDelete(null)}>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-xl">
            <DialogHeader>
              <DialogTitle>Excluir corretor</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o corretor <b>{brokerToDelete?.name}</b>? Esta acao nao podera ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-row gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setBrokerToDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={deleteBrokerMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteBrokerMutation.isPending ? (
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
                    Mais corretores
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Mais gerentes
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
