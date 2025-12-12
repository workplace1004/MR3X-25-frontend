import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI } from '@/api'
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import {
  UserCheck,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  MoreHorizontal,
  MapPin,
  Grid3X3,
  List,
  CheckCircle,
  XCircle,
  Loader2,
  Crown,
  AlertTriangle,
  Search
} from 'lucide-react'
import { DocumentInput } from '@/components/ui/document-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { CEPInput } from '@/components/ui/cep-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { validateDocument, isValidCEPFormat } from '@/lib/validation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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

export function Managers() {
  const { hasPermission, user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const canViewUsers = hasPermission('users:read')
  const canCreateUsers = hasPermission('users:create')
  const canUpdateUsers = hasPermission('users:update')
  const canDeleteUsers = hasPermission('users:delete')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const [newManager, setNewManager] = useState({
    document: '',
    name: '',
    phone: '',
    email: '',
    password: '',
    birthDate: '',
    cep: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
  })
  const [showPassword, setShowPassword] = useState(false)

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
  })
  const [showEditPassword, setShowEditPassword] = useState(false)

  const [selectedManager, setSelectedManager] = useState<any>(null)
  const [managerToDelete, setManagerToDelete] = useState<any>(null)
  const [managerDetail, setManagerDetail] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [emailError, setEmailError] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)

  // Upgrade modal states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeErrorMessage, setUpgradeErrorMessage] = useState('')

  // Search states
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

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

  if (!canViewUsers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Voce nao tem permissao para visualizar gerentes.</p>
        </div>
      </div>
    )
  }

  const { data: managers, isLoading } = useQuery({
    queryKey: ['managers', user?.id, user?.agencyId, searchQuery],
    queryFn: async () => {
      const list = await usersAPI.listUsers({ role: 'AGENCY_MANAGER', pageSize: 100, search: searchQuery || undefined })
      const filtered = (list.items || []).filter((manager: any) => {
        if (user?.agencyId) {
          const managerAgencyId = manager.agencyId?.toString() || null
          const userAgencyId = user.agencyId.toString()
          return managerAgencyId === userAgencyId
        }
        return true
      })
      return filtered
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
    setSelectedManager(null)
    setManagerToDelete(null)
    setEmailError('')
    setEmailVerified(false)
    setCheckingEmail(false)
  }

  const createManagerMutation = useMutation({
    mutationFn: (data: any) => usersAPI.createUser({
      ...data,
      role: 'AGENCY_MANAGER',
      plan: 'FREE',
      agencyId: user?.agencyId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      closeAllModals()
      setNewManager({
        document: '', name: '', phone: '', email: '', password: '', birthDate: '',
        cep: '', address: '', neighborhood: '', city: '', state: ''
      })
      toast.success('Gerente criado com sucesso')
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao criar gerente'
      // Extract error message from axios error response
      const backendMessage = error.response?.data?.message || error.message
      if (backendMessage) {
        const message = backendMessage.toLowerCase()
        if (message.includes('already exists') || message.includes('email already registered')) {
          errorMessage = 'Este usuario ja existe. Verifique o email ou documento.'
        } else {
          errorMessage = backendMessage
        }
      }

      // Check if it's a plan limit error
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

  const updateManagerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => usersAPI.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      closeAllModals()
      toast.success('Gerente atualizado com sucesso')
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Erro ao atualizar gerente'
      toast.error(errorMessage)
    },
  })

  const deleteManagerMutation = useMutation({
    mutationFn: (id: string) => usersAPI.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      closeAllModals()
      toast.success('Gerente excluido com sucesso')
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Erro ao excluir gerente'
      toast.error(errorMessage)
    },
  })

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const docResult = validateDocument(newManager.document)
      if (!docResult.isValid) {
        toast.error(docResult.error || 'Documento invalido (CPF/CNPJ)')
        return
      }
      if (!isValidCEPFormat(newManager.cep)) {
        toast.error('CEP invalido')
        return
      }
      const managerToSend = {
        ...newManager,
        birthDate: newManager.birthDate ? new Date(newManager.birthDate) : null,
      }
      createManagerMutation.mutate(managerToSend)
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateManager = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedManager) return
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
      const managerToSend = {
        ...editForm,
        birthDate: editForm.birthDate || undefined,
      }
      updateManagerMutation.mutate({ id: selectedManager.id, data: managerToSend })
    } finally {
      setUpdating(false)
    }
  }

  const handleNewManagerCEPData = useCallback((data: any) => {
    setNewManager((prev: any) => ({
      ...prev,
      address: data.logradouro || data.street || prev.address,
      neighborhood: data.bairro || data.neighborhood || prev.neighborhood,
      city: data.cidade || data.city || prev.city,
      state: data.estado || data.state || prev.state,
    }))
  }, [])

  const handleEditManagerCEPData = useCallback((data: any) => {
    setEditForm((prev: any) => ({
      ...prev,
      address: data.logradouro || data.street || prev.address,
      neighborhood: data.bairro || data.neighborhood || prev.neighborhood,
      city: data.cidade || data.city || prev.city,
      state: data.estado || data.state || prev.state,
    }))
  }, [])

  const handleViewManager = async (manager: any) => {
    closeAllModals()
    setLoadingDetails(true)
    try {
      const fullManagerDetails = await usersAPI.getUserById(manager.id)
      setSelectedManager(fullManagerDetails)
      setManagerDetail(fullManagerDetails)
      setShowDetailModal(true)
    } catch {
      toast.error('Erro ao carregar detalhes do gerente')
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleEditManager = async (manager: any) => {
    closeAllModals()
    setLoadingDetails(true)
    try {
      const fullManagerDetails = await usersAPI.getUserById(manager.id)
      setSelectedManager(fullManagerDetails)
      setEditForm({
        name: fullManagerDetails.name || '',
        email: fullManagerDetails.email || '',
        phone: fullManagerDetails.phone || '',
        document: fullManagerDetails.document || '',
        password: fullManagerDetails.plainPassword || '',
        birthDate: fullManagerDetails.birthDate ? fullManagerDetails.birthDate.split('T')[0] : '',
        address: fullManagerDetails.address || '',
        cep: fullManagerDetails.cep || '',
        neighborhood: fullManagerDetails.neighborhood || '',
        city: fullManagerDetails.city || '',
        state: fullManagerDetails.state || '',
      })
      setEmailVerified(true) // Current email is valid
      setShowEditModal(true)
    } catch {
      toast.error('Erro ao carregar detalhes do gerente')
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleDeleteManager = (manager: any) => {
    closeAllModals()
    setManagerToDelete(manager)
  }

  const confirmDelete = () => {
    if (managerToDelete) {
      deleteManagerMutation.mutate(managerToDelete.id)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewManager(prev => ({ ...prev, [name]: value }))
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Gerentes</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gerencie todos os gerentes da sua agencia
            </p>
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
                onClick={() => {
                  closeAllModals()
                  setShowCreateModal(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Cadastrar Gerente</span>
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

        {managers && managers.length > 0 ? (
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
                      <th className="text-left p-4 font-semibold">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managers.map((manager: any) => (
                      <tr key={manager.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="font-medium">{manager.name || 'Sem nome'}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-muted-foreground">{manager.phone || '-'}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-muted-foreground">{manager.email || '-'}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-muted-foreground">
                            {manager.address ? (
                              <>
                                {manager.address}
                                {manager.city && `, ${manager.city}`}
                                {manager.state && ` - ${manager.state}`}
                              </>
                            ) : '-'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleViewManager(manager)} disabled={loadingDetails} className="text-orange-600 border-orange-600 hover:bg-orange-50">
                              Detalhes
                            </Button>
                            {canUpdateUsers && (
                              <Button size="sm" variant="outline" onClick={() => handleEditManager(manager)} disabled={loadingDetails} className="text-orange-600 border-orange-600 hover:bg-orange-50">
                                Editar
                              </Button>
                            )}
                            {canDeleteUsers && (
                              <Button size="sm" variant="outline" onClick={() => handleDeleteManager(manager)} className="text-red-600 border-red-600 hover:bg-red-50">
                                Excluir
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
                {managers.map((manager: any) => (
                  <div key={manager.id} className="border-b border-border last:border-b-0 p-4">
                    <div className="flex items-start justify-between mb-3 min-w-0 gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{manager.name || 'Sem nome'}</h3>
                        <p className="text-sm text-muted-foreground truncate">{manager.email || '-'}</p>
                      </div>
                      <Badge className="bg-indigo-500 text-white text-xs flex-shrink-0">Gerente</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleViewManager(manager)} className="text-orange-600 border-orange-600 hover:bg-orange-50 flex-1">
                        Detalhes
                      </Button>
                      {canUpdateUsers && (
                        <Button size="sm" variant="outline" onClick={() => handleEditManager(manager)} className="text-orange-600 border-orange-600 hover:bg-orange-50 flex-1">
                          Editar
                        </Button>
                      )}
                      {canDeleteUsers && (
                        <Button size="sm" variant="outline" onClick={() => handleDeleteManager(manager)} className="text-red-600 border-red-600 hover:bg-red-50 flex-1">
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {managers.map((manager: any) => (
                <Card key={manager.id} className="transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <UserCheck className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{manager.name || 'Sem nome'}</h3>
                        <p className="text-sm text-muted-foreground truncate">{manager.email}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewManager(manager)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          {canUpdateUsers && (
                            <DropdownMenuItem onClick={() => handleEditManager(manager)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {canDeleteUsers && (
                            <DropdownMenuItem onClick={() => handleDeleteManager(manager)} className="text-red-600">
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
            <UserCheck className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhum gerente cadastrado</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              Comece adicionando seu primeiro gerente
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="bg-orange-600 hover:bg-orange-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Gerente
            </Button>
          </div>
        )}

        {}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Gerente</DialogTitle>
            </DialogHeader>
            <form className="space-y-6" onSubmit={handleCreateManager}>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Informacoes Pessoais</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DocumentInput
                    value={newManager.document}
                    onChange={(value) => setNewManager(prev => ({ ...prev, document: value }))}
                    label="Documento"
                    placeholder="000.000.000-00"
                    showValidation={true}
                  />
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" name="name" value={newManager.name} onChange={handleInputChange} placeholder="Nome completo" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" name="phone" value={newManager.phone} onChange={handleInputChange} placeholder="(11) 99999-9999" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={newManager.email}
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
                  <div>
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={newManager.password}
                        onChange={handleInputChange}
                        placeholder="Minimo 6 caracteres"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Se vazio, uma senha sera gerada automaticamente</p>
                  </div>
                  <div>
                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                    <Input id="birthDate" name="birthDate" type="date" value={newManager.birthDate} onChange={handleInputChange} />
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
                  value={newManager.cep}
                  onChange={(v: string) => setNewManager((prev: any) => ({ ...prev, cep: v }))}
                  onCEPData={handleNewManagerCEPData}
                  placeholder="00000-000"
                />

                <div>
                  <Label htmlFor="address">Endereco</Label>
                  <Input id="address" name="address" value={newManager.address} onChange={handleInputChange} placeholder="Rua, Avenida, etc." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input id="neighborhood" name="neighborhood" value={newManager.neighborhood} onChange={handleInputChange} placeholder="Centro" />
                  </div>
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" name="city" value={newManager.city} onChange={handleInputChange} placeholder="Sao Paulo" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Input id="state" name="state" value={newManager.state} onChange={handleInputChange} placeholder="SP" />
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
              <DialogTitle>Editar Gerente</DialogTitle>
            </DialogHeader>
            <form className="space-y-6" onSubmit={handleUpdateManager}>
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
                        onBlur={(e) => checkEmailExists(e.target.value, selectedManager?.email)}
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
                  <div>
                    <Label htmlFor="edit-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="edit-password"
                        name="password"
                        type={showEditPassword ? 'text' : 'password'}
                        value={editForm.password}
                        onChange={handleEditInputChange}
                        placeholder="Deixe vazio para manter a senha atual"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Deixe vazio para manter a senha atual</p>
                  </div>
                  <div>
                    <Label htmlFor="edit-birthDate">Data de Nascimento</Label>
                    <Input id="edit-birthDate" name="birthDate" type="date" value={editForm.birthDate} onChange={handleEditInputChange} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <CEPInput
                  value={editForm.cep}
                  onChange={(v: string) => setEditForm((prev: any) => ({ ...prev, cep: v }))}
                  onCEPData={handleEditManagerCEPData}
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
                  {updating ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Gerente</DialogTitle>
            </DialogHeader>
            {managerDetail ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome</label>
                      <div className="text-base">{managerDetail.name || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                      <div className="text-base">{managerDetail.phone || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <div className="text-base">{managerDetail.email || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Documento</label>
                      <div className="text-base">{managerDetail.document || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                      <div className="text-base">
                        {managerDetail.birthDate ? new Date(managerDetail.birthDate).toLocaleDateString('pt-BR') : '-'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Endereco</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">CEP</label>
                      <div className="text-base">{managerDetail.cep || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Endereco</label>
                      <div className="text-base">{managerDetail.address || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Bairro</label>
                      <div className="text-base">{managerDetail.neighborhood || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Cidade</label>
                      <div className="text-base">{managerDetail.city || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Estado</label>
                      <div className="text-base">{managerDetail.state || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nao foi possivel carregar os detalhes do gerente.
              </div>
            )}
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={!!managerToDelete} onOpenChange={() => setManagerToDelete(null)}>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-xl">
            <DialogHeader>
              <DialogTitle>Excluir gerente</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o gerente <b>{managerToDelete?.name}</b>? Esta acao nao podera ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-row gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setManagerToDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Excluir
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Upgrade Plan Modal */}
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
                  {upgradeErrorMessage || 'Você atingiu o limite de usuários do seu plano Gratuito. Faça upgrade para adicionar mais usuários.'}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-amber-800">
                  Com o plano gratuito você pode:
                </p>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Cadastrar 1 imóvel
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Cadastrar 1 usuário
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Criar 1 contrato
                  </li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-green-800">
                  Faça upgrade para desbloquear:
                </p>
                <ul className="text-sm text-green-700 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Imóveis ilimitados
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Usuários ilimitados
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Contratos ilimitados
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Relatórios avançados
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
