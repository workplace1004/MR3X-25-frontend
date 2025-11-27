import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI, agenciesAPI } from '@/api'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  MoreHorizontal,
  MessageSquare,
  MapPin,
  Grid3X3,
  List,
  FileText
} from 'lucide-react'
import { DocumentInput } from '@/components/ui/document-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CEPInput } from '@/components/ui/cep-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { validateDocument, isValidCEPFormat } from '@/lib/validation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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

export function Tenants() {
  const { hasPermission, user } = useAuth()
  const queryClient = useQueryClient()

  const canViewUsers = hasPermission('users:read')
  const canCreateUsers = hasPermission('users:create')
  const showCreateTenantButton = user?.role === 'BROKER' || canCreateUsers
  const canUpdateUsers = hasPermission('users:update')
  const canDeleteUsers = hasPermission('users:delete')

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
    neighborhood: '',
    city: '',
    state: '',
    agencyId: '',
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
  })

  const [selectedTenant, setSelectedTenant] = useState<any>(null)
  const [tenantToDelete, setTenantToDelete] = useState<any>(null)
  const [tenantDetail, setTenantDetail] = useState<any>(null)
  const [whatsappMessage, setWhatsappMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)

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

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants', user?.id, user?.agencyId],
    queryFn: () => usersAPI.getTenants(),
    enabled: canViewUsers,
    staleTime: 0,
  })

  // Fetch agencies for CEO/ADMIN users
  const isAdminOrCeo = user?.role === 'CEO' || user?.role === 'ADMIN'
  const { data: agencies } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => agenciesAPI.getAgencies(),
    enabled: isAdminOrCeo,
  })

  const closeAllModals = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setShowDetailModal(false)
    setShowWhatsAppModal(false)
    setShowContractsModal(false)
    setSelectedTenant(null)
    setTenantToDelete(null)
  }

  const handleViewContracts = (tenant: any) => {
    closeAllModals()
    setSelectedTenant(tenant)
    setShowContractsModal(true)
  }

  const createTenantMutation = useMutation({
    mutationFn: (data: any) => usersAPI.createTenant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      closeAllModals()
      setNewTenant({
        document: '', name: '', phone: '', email: '', password: '', birthDate: '',
        cep: '', address: '', neighborhood: '', city: '', state: '', agencyId: ''
      })
      toast.success('Inquilino criado com sucesso')
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao criar inquilino'
      if (error.message) {
        const message = error.message.toLowerCase()
        if (message.includes('already exists')) {
          errorMessage = 'Este usuario ja existe. Verifique o email ou documento.'
        } else {
          errorMessage = error.message
        }
      }
      toast.error(errorMessage)
    },
  })

  const updateTenantMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => usersAPI.updateTenant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      closeAllModals()
      toast.success('Inquilino atualizado com sucesso')
    },
    onError: (error: any) => {
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
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao excluir inquilino')
    },
  })

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const docResult = validateDocument(newTenant.document)
      if (!docResult.isValid) {
        toast.error(docResult.error || 'Documento invalido (CPF/CNPJ)')
        setCreating(false)
        return
      }
      if (!isValidCEPFormat(newTenant.cep)) {
        toast.error('CEP invalido')
        setCreating(false)
        return
      }
      const tenantToSend = {
        ...newTenant,
        role: 'INQUILINO',
        plan: 'FREE',
        birthDate: newTenant.birthDate ? new Date(newTenant.birthDate) : null,
        agencyId: newTenant.agencyId || undefined,
      }
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
      // Only send password if it's not empty
      const updateData = password ? { ...restData, password } : restData;
      updateTenantMutation.mutate({ id: selectedTenant.id, data: updateData })
    } finally {
      setUpdating(false)
    }
  }

  const handleNewTenantCEPData = useCallback((data: any) => {
    setNewTenant((prev: any) => ({
      ...prev,
      address: data.logradouro || data.street || prev.address,
      neighborhood: data.bairro || data.neighborhood || prev.neighborhood,
      city: data.cidade || data.city || prev.city,
      state: data.estado || data.state || prev.state,
    }))
  }, [])

  const handleEditTenantCEPData = useCallback((data: any) => {
    setEditForm((prev: any) => ({
      ...prev,
      address: data.logradouro || data.street || prev.address,
      neighborhood: data.bairro || data.neighborhood || prev.neighborhood,
      city: data.cidade || data.city || prev.city,
      state: data.estado || data.state || prev.state,
    }))
  }, [])

  const handleViewTenant = async (tenant: any) => {
    closeAllModals()
    setSelectedTenant(tenant)
    setTenantDetail(tenant)
    setShowDetailModal(true)
  }

  const handleEditTenant = async (tenant: any) => {
    closeAllModals()
    setLoadingEdit(true)
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
      })
      setShowEditModal(true)
    } catch (error) {
      toast.error('Erro ao carregar detalhes do inquilino')
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleDeleteTenant = (tenant: any) => {
    closeAllModals()
    setTenantToDelete(tenant)
  }

  const confirmDelete = () => {
    if (tenantToDelete) {
      deleteTenantMutation.mutate(tenantToDelete.id)
    }
  }

  const handleWhatsAppNotification = (tenant: any) => {
    closeAllModals()
    setSelectedTenant(tenant)
    setWhatsappMessage(`Ola ${tenant.name}! Este e um lembrete sobre seu aluguel.`)
    setShowWhatsAppModal(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewTenant(prev => ({ ...prev, [name]: value }))
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
            <h1 className="text-2xl sm:text-3xl font-bold">Inquilinos</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gerencie todos os seus inquilinos
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

            {showCreateTenantButton && (
              <Button
                className="bg-orange-600 hover:bg-orange-700 text-white flex-1 sm:flex-none"
                onClick={() => {
                  closeAllModals()
                  setShowCreateModal(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Cadastrar Inquilino</span>
                <span className="sm:hidden">Adicionar</span>
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
                      <th className="text-left p-4 font-semibold">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((tenant: any) => (
                      <tr key={tenant.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="font-medium">{tenant.name || 'Sem nome'}</div>
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
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewTenant(tenant)}
                              className="text-orange-600 border-orange-600 hover:bg-orange-50"
                            >
                              Detalhes
                            </Button>
                            {canUpdateUsers && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditTenant(tenant)}
                                disabled={loadingEdit}
                                className="text-orange-600 border-orange-600 hover:bg-orange-50"
                              >
                                {loadingEdit ? 'Carregando...' : 'Editar'}
                              </Button>
                            )}
                            {canDeleteUsers && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteTenant(tenant)}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
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
                {tenants.map((tenant: any) => (
                  <div key={tenant.id} className="border-b border-border last:border-b-0 p-4">
                    <div className="flex items-start justify-between mb-3 min-w-0 gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{tenant.name || 'Sem nome'}</h3>
                        <p className="text-sm text-muted-foreground truncate">{tenant.email || '-'}</p>
                      </div>
                      <Badge className="bg-green-500 text-white text-xs flex-shrink-0">Ativo</Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewTenant(tenant)}
                        className="text-orange-600 border-orange-600 hover:bg-orange-50 flex-1"
                      >
                        Detalhes
                      </Button>
                      {canUpdateUsers && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditTenant(tenant)}
                          className="text-orange-600 border-orange-600 hover:bg-orange-50 flex-1"
                        >
                          Editar
                        </Button>
                      )}
                      {canDeleteUsers && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteTenant(tenant)}
                          className="text-red-600 border-red-600 hover:bg-red-50 flex-1"
                        >
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Card View */
            <div className="flex justify-center w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full max-w-7xl px-2 items-stretch justify-center">
                {tenants.map((tenant: any) => (
                  <Card key={tenant.id} className="transition-all hover:shadow-md flex flex-col w-full max-w-[400px] mx-auto overflow-hidden">
                    <CardContent className="p-0 h-full flex flex-col overflow-hidden min-w-0">
                      <div className="flex h-full min-w-0">
                        {/* Tenant Avatar */}
                        <div className="w-28 min-w-28 h-36 bg-primary/10 flex items-center justify-center rounded-l-md flex-shrink-0">
                          <Users className="w-12 h-12 text-primary" />
                        </div>
                        {/* Tenant Content */}
                        <div className="flex-1 flex flex-col justify-between p-4 min-w-0 overflow-hidden">
                          <div className="min-w-0 space-y-1">
                            <h3 className="text-lg font-bold truncate" title={tenant.name || 'Sem nome'}>{tenant.name || 'Sem nome'}</h3>
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
                            <div className="min-w-0 flex-shrink"><Badge className="bg-green-500 text-white">Ativo</Badge></div>
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
                                {canUpdateUsers && (
                                  <DropdownMenuItem onClick={() => handleEditTenant(tenant)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar inquilino
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleViewContracts(tenant)}>
                                  <FileText className="w-4 h-4 mr-2" />
                                  Ver contratos
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleWhatsAppNotification(tenant)}>
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Notificar por WhatsApp
                                </DropdownMenuItem>
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
                onClick={() => setShowCreateModal(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Inquilino
              </Button>
            )}
          </div>
        )}

        {/* Create Tenant Modal */}
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
                      label="Documento"
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
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={newTenant.email}
                      onChange={handleInputChange}
                      placeholder="email@exemplo.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password">Senha *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newTenant.password}
                        onChange={handleInputChange}
                        placeholder="Digite a senha"
                        required
                        className="pr-10"
                      />
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
                    <Input
                      id="birthDate"
                      name="birthDate"
                      type="date"
                      value={newTenant.birthDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Agency selector for CEO/ADMIN */}
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
                      {agencies.map((agency: any) => (
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
                    onChange={(v: string) => setNewTenant((prev: any) => ({ ...prev, cep: v }))}
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
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={creating}>
                  {creating ? 'Cadastrando...' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Tenant Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
            <DialogHeader>
              <DialogTitle>Editar Locatario</DialogTitle>
            </DialogHeader>
            <form className="space-y-6" onSubmit={handleUpdateTenant}>
              {/* Personal Information Section */}
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
                    <Input
                      id="edit-email"
                      name="email"
                      type="email"
                      value={editForm.email}
                      onChange={handleEditInputChange}
                      placeholder="email@exemplo.com"
                      required
                    />
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
                        placeholder="Digite a senha"
                        className="pr-10"
                      />
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
                    <Input
                      id="edit-birthDate"
                      name="birthDate"
                      type="date"
                      value={editForm.birthDate}
                      onChange={handleEditInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Address Section */}
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
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={updating}>
                  {updating ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Tenant Detail Modal */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-2xl mx-4 sm:mx-0">
            <DialogHeader>
              <DialogTitle>Detalhes do Locatário</DialogTitle>
            </DialogHeader>
            {tenantDetail ? (
              <div className="space-y-6">
                {/* Personal Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Informações Pessoais</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <label className="text-sm font-medium text-muted-foreground">Documento</label>
                      <div className="text-base">{tenantDetail.document || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                      <div className="text-base">
                        {tenantDetail.birthDate ? new Date(tenantDetail.birthDate).toLocaleDateString('pt-BR') : '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address Section */}
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

        {/* WhatsApp Modal */}
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

        {/* Contracts Modal */}
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!tenantToDelete} onOpenChange={() => setTenantToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir inquilino</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o inquilino <b>{tenantToDelete?.name}</b>? Esta acao nao podera ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteTenantMutation.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteTenantMutation.isPending}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleteTenantMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
