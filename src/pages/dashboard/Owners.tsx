import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI } from '@/api'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import {
  Home,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  MoreHorizontal,
  MapPin,
  Grid3X3,
  List
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

export function Owners() {
  const { hasPermission, user } = useAuth()
  const queryClient = useQueryClient()

  const isCEO = user?.role === 'CEO'
  const canViewUsers = hasPermission('users:read')
  const canCreateUsers = hasPermission('users:create') && !isCEO
  const canUpdateUsers = hasPermission('users:update') && !isCEO
  const canDeleteUsers = hasPermission('users:delete') && !isCEO

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)

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

  const checkEmailExists = useCallback(async (email: string, currentEmail?: string) => {
    if (!email || email === currentEmail) {
      setEmailError('')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailError('')
      return
    }

    try {
      const result = await usersAPI.checkEmailExists(email)
      if (result.exists) {
        setEmailError('Este email já está em uso, por favor altere o email')
        toast.error('Este email já está em uso, por favor altere o email')
      } else {
        setEmailError('')
      }
    } catch (error) {
      console.error('Error checking email:', error)
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
    queryKey: ['owners', user?.id, user?.agencyId],
    queryFn: async () => {
      const list = await usersAPI.listUsers({ role: 'PROPRIETARIO', pageSize: 100 })
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
        cep: '', address: '', neighborhood: '', city: '', state: ''
      })
      toast.success('Imóvel criado com sucesso')
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao criar imóvel'
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
      })
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewOwner(prev => ({ ...prev, [name]: value }))
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
            <h1 className="text-2xl sm:text-3xl font-bold">Proprietários</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gerencie todos os proprietários cadastrados
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

        {owners && owners.length > 0 ? (
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
                    {owners.map((owner: any) => (
                      <tr key={owner.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="font-medium">{owner.name || 'Sem nome'}</div>
                          {owner.token && (
                            <div className="text-[10px] text-muted-foreground font-mono">{owner.token}</div>
                          )}
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
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleViewOwner(owner)} disabled={loadingDetails} className="text-orange-600 border-orange-600 hover:bg-orange-50">
                              Detalhes
                            </Button>
                            {canUpdateUsers && (
                              <Button size="sm" variant="outline" onClick={() => handleEditOwner(owner)} disabled={loadingDetails} className="text-orange-600 border-orange-600 hover:bg-orange-50">
                                Editar
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
                        <p className="text-sm text-muted-foreground truncate">{owner.email || '-'}</p>
                      </div>
                      <Badge className="bg-purple-500 text-white text-xs flex-shrink-0">Imóvel</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleViewOwner(owner)} className="text-orange-600 border-orange-600 hover:bg-orange-50 flex-1">
                        Detalhes
                      </Button>
                      {canUpdateUsers && (
                        <Button size="sm" variant="outline" onClick={() => handleEditOwner(owner)} className="text-orange-600 border-orange-600 hover:bg-orange-50 flex-1">
                          Editar
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
                        <h3 className="font-semibold truncate">{owner.name || 'Sem nome'}</h3>
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
                          {canUpdateUsers && (
                            <DropdownMenuItem onClick={() => handleEditOwner(owner)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
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
                    <Input id="email" name="email" type="email" value={newOwner.email} onChange={handleInputChange} onBlur={(e) => checkEmailExists(e.target.value)} placeholder="email@exemplo.com" required className={emailError ? 'border-red-500' : ''} />
                    {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
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
                    <Input id="edit-email" name="email" type="email" value={editForm.email} onChange={handleEditInputChange} onBlur={(e) => checkEmailExists(e.target.value, selectedOwner?.email)} placeholder="email@exemplo.com" required className={emailError ? 'border-red-500' : ''} />
                    {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Imóvel</DialogTitle>
            </DialogHeader>
            {ownerDetail ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome</label>
                      <div className="text-base">{ownerDetail.name || '-'}</div>
                    </div>
                    {ownerDetail.token && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Token</label>
                        <div className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">{ownerDetail.token}</div>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                      <div className="text-base">{ownerDetail.phone || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <div className="text-base">{ownerDetail.email || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Documento</label>
                      <div className="text-base">{ownerDetail.document || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                      <div className="text-base">
                        {ownerDetail.birthDate ? new Date(ownerDetail.birthDate).toLocaleDateString('pt-BR') : '-'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Endereco</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">CEP</label>
                      <div className="text-base">{ownerDetail.cep || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Endereco</label>
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
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Não foi possível carregar os detalhes do imóvel.
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
      </div>
    </TooltipProvider>
  )
}
