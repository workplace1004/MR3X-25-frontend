import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI } from '@/api'
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import {
  UserCog,
  Home,
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
  Search,
  CreditCard
} from 'lucide-react'
import { DocumentInput } from '@/components/ui/document-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { CEPInput } from '@/components/ui/cep-input'
import { RGInput } from '@/components/ui/rg-input'
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

export function Owners() {
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

  const [newOwner, setNewOwner] = useState({
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
    nationality: '',
    maritalStatus: '',
    profession: '',
    rg: '',
    bankName: '',
    bankBranch: '',
    bankAccount: '',
    pixKey: '',
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
    nationality: '',
    maritalStatus: '',
    profession: '',
    rg: '',
    bankName: '',
    bankBranch: '',
    bankAccount: '',
    pixKey: '',
  })

  const [selectedOwner, setSelectedOwner] = useState<any>(null)
  const [ownerToDelete, setOwnerToDelete] = useState<any>(null)
  const [ownerDetail, setOwnerDetail] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)

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
          <p className="text-muted-foreground">Você não tem permissão para visualizar imóveis.</p>
        </div>
      </div>
    )
  }

  const { data: owners, isLoading } = useQuery({
    queryKey: ['owners', user?.id, user?.agencyId, searchQuery],
    queryFn: async () => {
      const list = await usersAPI.listUsers({ role: 'PROPRIETARIO', pageSize: 100, search: searchQuery || undefined })
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
    setSelectedOwner(null)
    setOwnerToDelete(null)
    setEmailError('')
    setEmailVerified(false)
    setCheckingEmail(false)
  }

  const createOwnerMutation = useMutation({
    mutationFn: (data: any) => usersAPI.createUser({
      ...data,
      role: 'PROPRIETARIO',
      plan: 'FREE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      closeAllModals()
      setNewOwner({
        document: '', name: '', phone: '', email: '', password: '', birthDate: '',
        cep: '', address: '', neighborhood: '', city: '', state: '',
        nationality: '', maritalStatus: '', profession: '', rg: '',
        bankName: '', bankBranch: '', bankAccount: '', pixKey: ''
      })
      toast.success('Imóvel criado com sucesso')
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
        toast.error(errorMessage || 'Erro ao criar proprietário')
      }
    },
  })

  const updateOwnerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => usersAPI.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      closeAllModals()
      toast.success('Imóvel atualizado com sucesso')
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Erro ao atualizar imóvel'
      toast.error(errorMessage)
    },
  })

  const deleteOwnerMutation = useMutation({
    mutationFn: (id: string) => usersAPI.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      closeAllModals()
      toast.success('Imóvel excluído com sucesso')
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Erro ao excluir imóvel'
      toast.error(errorMessage)
    },
  })

  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const docResult = validateDocument(newOwner.document)
      if (!docResult.isValid) {
        toast.error(docResult.error || 'Documento invalido (CPF/CNPJ)')
        return
      }
      if (!isValidCEPFormat(newOwner.cep)) {
        toast.error('CEP invalido')
        return
      }
      const ownerToSend = {
        ...newOwner,
        birthDate: newOwner.birthDate ? new Date(newOwner.birthDate) : null,
      }
      createOwnerMutation.mutate(ownerToSend)
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateOwner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOwner) return
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
      
      const ownerToSend = {
        ...restData,
        birthDate: editForm.birthDate || undefined,
        ...(password ? { password } : {}),
      };
      updateOwnerMutation.mutate({ id: selectedOwner.id, data: ownerToSend })
    } finally {
      setUpdating(false)
    }
  }

  const handleNewOwnerCEPData = useCallback((data: any) => {
    setNewOwner((prev: any) => ({
      ...prev,
      address: data.logradouro || prev.address,
      neighborhood: data.bairro || prev.neighborhood,
      city: data.cidade || prev.city,
      state: data.estado || prev.state,
    }))
  }, [])

  const handleEditOwnerCEPData = useCallback((data: any) => {
    setEditForm((prev: any) => ({
      ...prev,
      address: data.logradouro || prev.address,
      neighborhood: data.bairro || prev.neighborhood,
      city: data.cidade || prev.city,
      state: data.estado || prev.state,
    }))
  }, [])

  const handleViewOwner = async (owner: any) => {
    closeAllModals()
    setLoadingDetails(true)
    try {
      const fullOwnerDetails = await usersAPI.getUserById(owner.id)
      setSelectedOwner(fullOwnerDetails)
      setOwnerDetail(fullOwnerDetails)
      setShowDetailModal(true)
    } catch {
      toast.error('Erro ao carregar detalhes do imóvel')
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleEditOwner = async (owner: any) => {
    closeAllModals()
    setEmailError('')
    setLoadingDetails(true)
    try {
      const fullOwnerDetails = await usersAPI.getUserById(owner.id)
      setSelectedOwner(fullOwnerDetails)
      setEditForm({
        name: fullOwnerDetails.name || '',
        email: fullOwnerDetails.email || '',
        phone: fullOwnerDetails.phone || '',
        document: fullOwnerDetails.document || '',
        password: fullOwnerDetails.plainPassword || '',
        birthDate: fullOwnerDetails.birthDate ? fullOwnerDetails.birthDate.split('T')[0] : '',
        address: fullOwnerDetails.address || '',
        cep: fullOwnerDetails.cep || '',
        neighborhood: fullOwnerDetails.neighborhood || '',
        city: fullOwnerDetails.city || '',
        state: fullOwnerDetails.state || '',
        nationality: fullOwnerDetails.nationality || '',
        maritalStatus: fullOwnerDetails.maritalStatus || '',
        profession: fullOwnerDetails.profession || '',
        rg: fullOwnerDetails.rg || '',
        bankName: fullOwnerDetails.bankName || '',
        bankBranch: fullOwnerDetails.bankBranch || '',
        bankAccount: fullOwnerDetails.bankAccount || '',
        pixKey: fullOwnerDetails.pixKey || '',
      })
      setEmailVerified(true) // Current email is valid
      setShowEditModal(true)
    } catch {
      toast.error('Erro ao carregar detalhes do imóvel')
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleDeleteOwner = (owner: any) => {
    closeAllModals()
    setOwnerToDelete(owner)
  }

  const confirmDelete = () => {
    if (ownerToDelete) {
      deleteOwnerMutation.mutate(ownerToDelete.id)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewOwner(prev => ({ ...prev, [name]: value }))
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCog className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Proprietários</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Gerencie todos os proprietários cadastrados
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
                onClick={() => {
                  closeAllModals()
                  setEmailError('')
                  setShowCreateModal(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Cadastrar Proprietário</span>
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

        {owners && owners.length > 0 ? (
          viewMode === 'table' ? (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-semibold">Nome</th>
                      <th className="text-left p-4 font-semibold">Documento</th>
                      <th className="text-left p-4 font-semibold">Telefone</th>
                      <th className="text-left p-4 font-semibold">Email</th>
                      <th className="text-left p-4 font-semibold">Endereco</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-left p-4 font-semibold">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {owners.map((owner: any) => (
                      <tr key={owner.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="font-medium">{owner.name || 'Sem nome'}</div>
                          {owner.token && (
                            <div className="text-[10px] text-muted-foreground font-mono">{owner.token}</div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="text-muted-foreground">{owner.document || '-'}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-muted-foreground">{owner.phone || '-'}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-muted-foreground">{owner.email || '-'}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-muted-foreground">
                            {owner.address ? (
                              <>
                                {owner.address}
                                {owner.city && `, ${owner.city}`}
                                {owner.state && ` - ${owner.state}`}
                              </>
                            ) : '-'}
                          </div>
                        </td>
                        <td className="p-4">
                          {owner.isFrozen ? (
                            <Badge className="bg-amber-500 text-white">Congelado</Badge>
                          ) : owner.status === 'INACTIVE' || owner.status === 'SUSPENDED' ? (
                            <Badge className="bg-red-500 text-white">Suspenso</Badge>
                          ) : (
                            <Badge className="bg-green-500 text-white">Ativo</Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleViewOwner(owner)} disabled={loadingDetails} className="text-orange-600 border-orange-600 hover:bg-orange-50">
                              Detalhes
                            </Button>
                            {canUpdateUsers && !owner.isFrozen && (
                              <Button size="sm" variant="outline" onClick={() => handleEditOwner(owner)} disabled={loadingDetails} className="text-orange-600 border-orange-600 hover:bg-orange-50">
                                Editar
                              </Button>
                            )}
                            {canUpdateUsers && owner.isFrozen && (
                              <Button size="sm" variant="outline" disabled className="text-muted-foreground border-muted">
                                Editar (congelado)
                              </Button>
                            )}
                            {canDeleteUsers && (
                              <Button size="sm" variant="outline" onClick={() => handleDeleteOwner(owner)} className="text-red-600 border-red-600 hover:bg-red-50">
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
                {owners.map((owner: any) => (
                  <div key={owner.id} className="border-b border-border last:border-b-0 p-4">
                    <div className="flex items-start justify-between mb-3 min-w-0 gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{owner.name || 'Sem nome'}</h3>
                        {owner.token && (
                          <p className="text-[10px] text-muted-foreground font-mono">{owner.token}</p>
                        )}
                        <p className="text-sm text-muted-foreground truncate">{owner.document || '-'}</p>
                        <p className="text-sm text-muted-foreground truncate">{owner.email || '-'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-purple-500 text-white text-xs flex-shrink-0">Proprietário</Badge>
                        {owner.isFrozen ? (
                          <Badge className="bg-amber-500 text-white text-xs">Congelado</Badge>
                        ) : owner.status === 'INACTIVE' || owner.status === 'SUSPENDED' ? (
                          <Badge className="bg-red-500 text-white text-xs">Suspenso</Badge>
                        ) : (
                          <Badge className="bg-green-500 text-white text-xs">Ativo</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleViewOwner(owner)} className="text-orange-600 border-orange-600 hover:bg-orange-50 flex-1">
                        Detalhes
                      </Button>
                      {canUpdateUsers && !owner.isFrozen && (
                        <Button size="sm" variant="outline" onClick={() => handleEditOwner(owner)} className="text-orange-600 border-orange-600 hover:bg-orange-50 flex-1">
                          Editar
                        </Button>
                      )}
                      {canUpdateUsers && owner.isFrozen && (
                        <Button size="sm" variant="outline" disabled className="text-muted-foreground border-muted flex-1">
                          Editar (congelado)
                        </Button>
                      )}
                      {canDeleteUsers && (
                        <Button size="sm" variant="outline" onClick={() => handleDeleteOwner(owner)} className="text-red-600 border-red-600 hover:bg-red-50 flex-1">
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
              {owners.map((owner: any) => (
                <Card key={owner.id} className="transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Home className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{owner.name || 'Sem nome'}</h3>
                          {owner.isFrozen ? (
                            <Badge className="bg-amber-500 text-white text-xs">Congelado</Badge>
                          ) : owner.status === 'INACTIVE' || owner.status === 'SUSPENDED' ? (
                            <Badge className="bg-red-500 text-white text-xs">Suspenso</Badge>
                          ) : (
                            <Badge className="bg-green-500 text-white text-xs">Ativo</Badge>
                          )}
                        </div>
                        {owner.token && (
                          <p className="text-[10px] text-muted-foreground font-mono">{owner.token}</p>
                        )}
                        <p className="text-sm text-muted-foreground truncate">{owner.email}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewOwner(owner)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          {canUpdateUsers && !owner.isFrozen && (
                            <DropdownMenuItem onClick={() => handleEditOwner(owner)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {canUpdateUsers && owner.isFrozen && (
                            <DropdownMenuItem disabled className="text-muted-foreground">
                              <Edit className="w-4 h-4 mr-2" />
                              Editar (congelado)
                            </DropdownMenuItem>
                          )}
                          {canDeleteUsers && (
                            <DropdownMenuItem onClick={() => handleDeleteOwner(owner)} className="text-red-600">
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
            <Home className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhum proprietário cadastrado</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              Comece adicionando seu primeiro proprietário
            </p>
            {canCreateUsers && (
              <Button onClick={() => { setEmailError(''); setShowCreateModal(true) }} className="bg-orange-600 hover:bg-orange-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Proprietário
              </Button>
            )}
          </div>
        )}

        {}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Proprietário</DialogTitle>
            </DialogHeader>
            <form className="space-y-6" onSubmit={handleCreateOwner}>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <Home className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Informacoes Pessoais</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DocumentInput
                    value={newOwner.document}
                    onChange={(value) => setNewOwner(prev => ({ ...prev, document: value }))}
                    label="Documento"
                    placeholder="000.000.000-00"
                    showValidation={true}
                  />
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" name="name" value={newOwner.name} onChange={handleInputChange} placeholder="Nome completo" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" name="phone" value={newOwner.phone} onChange={handleInputChange} placeholder="(11) 99999-9999" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={newOwner.email}
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
                    <Label htmlFor="password">Senha *</Label>
                    <div className="relative">
                      <Input id="password" name="password" type={showNewPassword ? 'text' : 'password'} value={newOwner.password} onChange={handleInputChange} placeholder="Digite a senha" required className="pr-10" />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                    <Input id="birthDate" name="birthDate" type="date" value={newOwner.birthDate} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <RGInput
                    value={newOwner.rg}
                    onChange={(value) => setNewOwner(prev => ({ ...prev, rg: value }))}
                    label="RG"
                    placeholder="00.000.000-0"
                    showValidation={true}
                  />
                  <div>
                    <Label htmlFor="nationality">Nacionalidade</Label>
                    <Input id="nationality" name="nationality" value={newOwner.nationality} onChange={handleInputChange} placeholder="Brasileira" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maritalStatus">Estado Civil</Label>
                    <select
                      id="maritalStatus"
                      name="maritalStatus"
                      value={newOwner.maritalStatus}
                      onChange={handleInputChange}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">Selecione...</option>
                      <option value="Solteiro(a)">Solteiro(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viúvo(a)">Viúvo(a)</option>
                      <option value="União Estável">União Estável</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="profession">Profissão</Label>
                    <Input id="profession" name="profession" value={newOwner.profession} onChange={handleInputChange} placeholder="Ex: Empresário" />
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
                  value={newOwner.cep}
                  onChange={(v: string) => setNewOwner((prev: any) => ({ ...prev, cep: v }))}
                  onCEPData={handleNewOwnerCEPData}
                  placeholder="00000-000"
                />

                <div>
                  <Label htmlFor="address">Endereco</Label>
                  <Input id="address" name="address" value={newOwner.address} onChange={handleInputChange} placeholder="Rua, Avenida, etc." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input id="neighborhood" name="neighborhood" value={newOwner.neighborhood} onChange={handleInputChange} placeholder="Centro" />
                  </div>
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" name="city" value={newOwner.city} onChange={handleInputChange} placeholder="Sao Paulo" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Input id="state" name="state" value={newOwner.state} onChange={handleInputChange} placeholder="SP" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <Crown className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Dados Bancários</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bankName">Banco</Label>
                    <Input id="bankName" name="bankName" value={newOwner.bankName} onChange={handleInputChange} placeholder="Ex: Banco do Brasil" />
                  </div>
                  <div>
                    <Label htmlFor="bankBranch">Agência</Label>
                    <Input id="bankBranch" name="bankBranch" value={newOwner.bankBranch} onChange={handleInputChange} placeholder="Ex: 1234-5" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bankAccount">Conta</Label>
                    <Input id="bankAccount" name="bankAccount" value={newOwner.bankAccount} onChange={handleInputChange} placeholder="Ex: 12345-6" />
                  </div>
                  <div>
                    <Label htmlFor="pixKey">Chave PIX</Label>
                    <Input id="pixKey" name="pixKey" value={newOwner.pixKey} onChange={handleInputChange} placeholder="CPF, Email, Telefone ou Chave Aleatória" />
                  </div>
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
            <DialogHeader>
              <DialogTitle>Editar Imóvel</DialogTitle>
            </DialogHeader>
            <form className="space-y-6" onSubmit={handleUpdateOwner}>
              {}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <Home className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Informacoes Pessoais</h3>
                </div>

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
                        onBlur={(e) => checkEmailExists(e.target.value, selectedOwner?.email)}
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
                      <Input id="edit-password" name="password" type={showEditPassword ? 'text' : 'password'} value={editForm.password} onChange={handleEditInputChange} placeholder="Digite a senha" className="pr-10" />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit-birthDate">Data de Nascimento</Label>
                    <Input id="edit-birthDate" name="birthDate" type="date" value={editForm.birthDate} onChange={handleEditInputChange} />
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
                    <Input id="edit-nationality" name="nationality" value={editForm.nationality} onChange={handleEditInputChange} placeholder="Brasileira" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-maritalStatus">Estado Civil</Label>
                    <select
                      id="edit-maritalStatus"
                      name="maritalStatus"
                      value={editForm.maritalStatus}
                      onChange={handleEditInputChange}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">Selecione...</option>
                      <option value="Solteiro(a)">Solteiro(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viúvo(a)">Viúvo(a)</option>
                      <option value="União Estável">União Estável</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="edit-profession">Profissão</Label>
                    <Input id="edit-profession" name="profession" value={editForm.profession} onChange={handleEditInputChange} placeholder="Ex: Empresário" />
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
                    onChange={(v: string) => setEditForm((prev: any) => ({ ...prev, cep: v }))}
                    onCEPData={handleEditOwnerCEPData}
                    placeholder="00000-000"
                  />
                </div>

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

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <Crown className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Dados Bancários</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-bankName">Banco</Label>
                    <Input id="edit-bankName" name="bankName" value={editForm.bankName} onChange={handleEditInputChange} placeholder="Ex: Banco do Brasil" />
                  </div>
                  <div>
                    <Label htmlFor="edit-bankBranch">Agência</Label>
                    <Input id="edit-bankBranch" name="bankBranch" value={editForm.bankBranch} onChange={handleEditInputChange} placeholder="Ex: 1234-5" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-bankAccount">Conta</Label>
                    <Input id="edit-bankAccount" name="bankAccount" value={editForm.bankAccount} onChange={handleEditInputChange} placeholder="Ex: 12345-6" />
                  </div>
                  <div>
                    <Label htmlFor="edit-pixKey">Chave PIX</Label>
                    <Input id="edit-pixKey" name="pixKey" value={editForm.pixKey} onChange={handleEditInputChange} placeholder="CPF, Email, Telefone ou Chave Aleatória" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} disabled={updating} className="text-orange-600 border-orange-600 hover:bg-orange-50">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white border-0" disabled={updating}>
                  {updating ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Proprietário</DialogTitle>
            </DialogHeader>
            {ownerDetail ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                      <Home className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Informações Pessoais</h3>
                  </div>
                  {ownerDetail.token && (
                    <div className="mb-4">
                      <label className="text-sm font-medium text-muted-foreground">Token</label>
                      <div className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">{ownerDetail.token}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Documento (CPF/CNPJ)</label>
                      <div className="text-base">{ownerDetail.document || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome</label>
                      <div className="text-base">{ownerDetail.name || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                      <div className="text-base">{ownerDetail.phone || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <div className="text-base">{ownerDetail.email || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                      <div className="text-base">
                        {ownerDetail.birthDate ? new Date(ownerDetail.birthDate).toLocaleDateString('pt-BR') : '-'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">RG</label>
                      <div className="text-base">{ownerDetail.rg || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nacionalidade</label>
                      <div className="text-base">{ownerDetail.nationality || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Estado Civil</label>
                      <div className="text-base">{ownerDetail.maritalStatus || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Profissão</label>
                      <div className="text-base">{ownerDetail.profession || '-'}</div>
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
                      <div className="text-base">{ownerDetail.cep || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                      <div className="text-base">{ownerDetail.address || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Bairro</label>
                      <div className="text-base">{ownerDetail.neighborhood || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Cidade</label>
                      <div className="text-base">{ownerDetail.city || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Estado</label>
                      <div className="text-base">{ownerDetail.state || '-'}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Dados Bancários</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Banco</label>
                      <div className="text-base">{ownerDetail.bankName || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Agência</label>
                      <div className="text-base">{ownerDetail.bankBranch || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Conta</label>
                      <div className="text-base">{ownerDetail.bankAccount || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Chave PIX</label>
                      <div className="text-base">{ownerDetail.pixKey || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Não foi possível carregar os detalhes do proprietário.
              </div>
            )}
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={!!ownerToDelete} onOpenChange={() => setOwnerToDelete(null)}>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-xl">
            <DialogHeader>
              <DialogTitle>Excluir proprietário</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o proprietário <b>{ownerToDelete?.name}</b>? Esta ação não poderá ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-row gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOwnerToDelete(null)}
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
                  {upgradeErrorMessage || 'No plano gratuito, você pode cadastrar apenas 1 usuário.'}
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
