import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { usersAPI } from '@/api'
import {
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  MapPin,
  Phone,
  Mail,
  User,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CEPInput } from '@/components/ui/cep-input'
import { isValidCEPFormat } from '@/lib/validation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  TooltipProvider,
} from '@/components/ui/tooltip'
import { Building } from 'lucide-react'

export function Agencies() {
  const { hasPermission, user } = useAuth()

  const isCEO = user?.role === 'CEO'
  const canView = hasPermission('agencies:read')
  const canUpdate = hasPermission('agencies:update') && !isCEO
  const canDelete = hasPermission('agencies:delete') && !isCEO

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Voce nao tem permissao para visualizar esta pagina.</p>
        </div>
      </div>
    )
  }

  const queryClient = useQueryClient()

  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const [selectedOwner, setSelectedOwner] = useState<any>(null)
  const [ownerToDelete, setOwnerToDelete] = useState<any>(null)
  const [ownerDetail, setOwnerDetail] = useState<any>(null)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)

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

  const { data: ownersData, isLoading } = useQuery({
    queryKey: ['independent-owners'],
    queryFn: () => usersAPI.listUsers({ role: 'INDEPENDENT_OWNER' }),
    enabled: canView,
  })

  const owners = ownersData?.items || []

  const closeAllModals = () => {
    setShowEditModal(false)
    setShowDetailModal(false)
    setSelectedOwner(null)
    setOwnerToDelete(null)
    setOwnerDetail(null)
    setEmailError('')
    setEmailVerified(false)
    setCheckingEmail(false)
  }

  const updateOwnerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersAPI.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['independent-owners'] })
      closeAllModals()
      toast.success('Proprietario independente atualizado com sucesso')
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao atualizar proprietario independente'
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      toast.error(errorMessage)
    },
  })

  const deleteOwnerMutation = useMutation({
    mutationFn: (id: string) => usersAPI.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['independent-owners'] })
      closeAllModals()
      toast.success('Proprietario independente excluido com sucesso')
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao excluir proprietario independente'
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      toast.error(errorMessage)
    },
  })

  const handleEditOwner = async () => {
    if (!canUpdate) {
      toast.error('Voce nao tem permissao para atualizar proprietarios independentes')
      return
    }

    if (!selectedOwner) return

    if (!selectedOwner.name || !selectedOwner.email) {
      toast.error('Nome e e-mail sao obrigatorios')
      setUpdating(false)
      return
    }

    if (selectedOwner.cep && selectedOwner.cep.trim() !== '') {
      if (!isValidCEPFormat(selectedOwner.cep)) {
        toast.error('CEP invalido. Por favor, insira um CEP valido (00000-000)')
        setUpdating(false)
        return
      }
    }

    setUpdating(true)
    try {
      const updateData = {
        name: selectedOwner.name,
        email: selectedOwner.email,
        document: selectedOwner.document,
        phone: selectedOwner.phone,
        address: selectedOwner.address,
        neighborhood: selectedOwner.neighborhood,
        city: selectedOwner.city,
        state: selectedOwner.state,
        cep: selectedOwner.cep || undefined,
        plan: selectedOwner.plan,
        status: selectedOwner.status,
      }

      updateOwnerMutation.mutate({ id: selectedOwner.id, data: updateData })
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar proprietario independente')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteOwner = async () => {
    if (!canDelete) {
      toast.error('Voce nao tem permissao para excluir proprietarios independentes')
      return
    }

    if (!ownerToDelete) return

    setDeleting(true)
    try {
      deleteOwnerMutation.mutate(ownerToDelete.id)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir proprietario independente')
    } finally {
      setDeleting(false)
    }
  }

  const handleViewOwner = (owner: any) => {
    setOwnerDetail(owner)
    setShowDetailModal(true)
  }

  const handleEditOwnerClick = (owner: any) => {
    setSelectedOwner(owner)
    setEmailError('')
    setEmailVerified(true)
    setCheckingEmail(false)
    setShowEditModal(true)
  }

  const handleDeleteOwnerClick = (owner: any) => {
    setOwnerToDelete(owner)
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'FREE': return 'bg-gray-100 text-gray-800'
      case 'ESSENTIAL': return 'bg-blue-100 text-blue-800'
      case 'PROFESSIONAL': return 'bg-green-100 text-green-800'
      case 'ENTERPRISE': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'FREE': return 'Gratuito'
      case 'BASIC': return 'Básico'
      case 'ESSENTIAL': return 'Essencial'
      case 'PROFESSIONAL': return 'Profissional'
      case 'ENTERPRISE': return 'Empresarial'
      default: return plan
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'SUSPENDED': return 'bg-red-100 text-red-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Ativo'
      case 'SUSPENDED': return 'Suspenso'
      case 'PENDING': return 'Pendente'
      default: return status
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Building className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agencias</h1>
            <p className="text-muted-foreground">Visualize e gerencie proprietarios independentes que trabalham diretamente com MR3X</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <div>
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </div>
                    <Skeleton className="w-10 h-10 rounded" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : owners && owners.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {owners.map((owner: any) => (
              <Card key={owner.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{owner.name || 'Sem nome'}</CardTitle>
                        <p className="text-sm text-muted-foreground">Proprietario Independente</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="outline">
                          <MoreHorizontal className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewOwner(owner)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        {canUpdate && (
                          <DropdownMenuItem onClick={() => handleEditOwnerClick(owner)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() => handleDeleteOwnerClick(owner)}
                            className="text-red-600 focus:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{owner.email}</span>
                  </div>
                  {owner.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{owner.phone}</span>
                    </div>
                  )}
                  {owner.document && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{owner.document}</span>
                    </div>
                  )}
                  {(owner.city || owner.state) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{[owner.city, owner.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex gap-2">
                      <Badge className={getPlanColor(owner.plan)}>
                        {getPlanLabel(owner.plan)}
                      </Badge>
                      <Badge className={getStatusColor(owner.status)}>
                        {getStatusLabel(owner.status)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum proprietario independente encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Nenhum proprietario independente cadastrado no sistema
            </p>
          </div>
        )}

        {}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Proprietario Independente</DialogTitle>
              <DialogDescription>
                Visualize todas as informacoes do proprietario independente
              </DialogDescription>
            </DialogHeader>
            {ownerDetail && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome</Label>
                  <div className="text-sm text-foreground mt-1">{ownerDetail.name || '-'}</div>
                </div>
                <div>
                  <Label>CPF/CNPJ</Label>
                  <div className="text-sm text-foreground mt-1">{ownerDetail.document || '-'}</div>
                </div>
                <div>
                  <Label>E-mail</Label>
                  <div className="text-sm text-foreground mt-1">{ownerDetail.email}</div>
                </div>
                <div>
                  <Label>Telefone</Label>
                  <div className="text-sm text-foreground mt-1">{ownerDetail.phone || '-'}</div>
                </div>
                <div className="md:col-span-2">
                  <Label>Endereco</Label>
                  <div className="text-sm text-foreground mt-1">{ownerDetail.address || '-'}</div>
                </div>
                <div>
                  <Label>Cidade</Label>
                  <div className="text-sm text-foreground mt-1">{ownerDetail.city || '-'}</div>
                </div>
                <div>
                  <Label>Estado</Label>
                  <div className="text-sm text-foreground mt-1">{ownerDetail.state || '-'}</div>
                </div>
                <div>
                  <Label>Plano</Label>
                  <div className="text-sm text-foreground mt-1">{getPlanLabel(ownerDetail.plan)}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="text-sm text-foreground mt-1">{getStatusLabel(ownerDetail.status)}</div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Proprietario Independente</DialogTitle>
              <DialogDescription>
                Atualize as informacoes do proprietario. Nome e e-mail sao obrigatorios.
              </DialogDescription>
            </DialogHeader>
            {selectedOwner && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Nome</Label>
                    <Input id="edit-name" value={selectedOwner.name || ''} onChange={(e) => setSelectedOwner({ ...selectedOwner, name: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">E-mail</Label>
                    <div className="relative">
                      <Input
                        id="edit-email"
                        type="email"
                        value={selectedOwner.email || ''}
                        onChange={(e) => setSelectedOwner({ ...selectedOwner, email: e.target.value })}
                        onBlur={(e) => checkEmailExists(e.target.value, selectedOwner?.email)}
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
                  <div>
                    <Label htmlFor="edit-phone">Telefone</Label>
                    <Input id="edit-phone" value={selectedOwner.phone || ''} onChange={(e) => setSelectedOwner({ ...selectedOwner, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="edit-status">Status</Label>
                    <Select
                      value={selectedOwner.status || 'ACTIVE'}
                      onValueChange={(value) => setSelectedOwner({ ...selectedOwner, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Ativo</SelectItem>
                        <SelectItem value="SUSPENDED">Suspenso</SelectItem>
                        <SelectItem value="PENDING">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <CEPInput
                      value={selectedOwner.cep || ''}
                      onChange={(value) => setSelectedOwner({ ...selectedOwner, cep: value })}
                      onCEPData={(data) => {
                        setSelectedOwner({
                          ...selectedOwner,
                          address: data.logradouro || selectedOwner.address,
                          neighborhood: data.bairro || selectedOwner.neighborhood,
                          city: data.cidade || selectedOwner.city,
                          state: data.estado || selectedOwner.state,
                        })
                      }}
                      label="CEP"
                      placeholder="00000-000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-plan">Plano</Label>
                    <Select
                      value={selectedOwner.plan || 'FREE'}
                      onValueChange={(value) => setSelectedOwner({ ...selectedOwner, plan: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o plano" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FREE">Gratuito</SelectItem>
                        <SelectItem value="ESSENTIAL">Essencial</SelectItem>
                        <SelectItem value="PROFESSIONAL">Profissional</SelectItem>
                        <SelectItem value="ENTERPRISE">Empresarial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="edit-address">Endereco</Label>
                    <Input id="edit-address" value={selectedOwner.address || ''} onChange={(e) => setSelectedOwner({ ...selectedOwner, address: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="edit-neighborhood">Bairro</Label>
                    <Input id="edit-neighborhood" value={selectedOwner.neighborhood || ''} onChange={(e) => setSelectedOwner({ ...selectedOwner, neighborhood: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="edit-city">Cidade</Label>
                    <Input id="edit-city" value={selectedOwner.city || ''} onChange={(e) => setSelectedOwner({ ...selectedOwner, city: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="edit-state">Estado</Label>
                    <Input id="edit-state" value={selectedOwner.state || ''} onChange={(e) => setSelectedOwner({ ...selectedOwner, state: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={closeAllModals}>Cancelar</Button>
                  <Button onClick={handleEditOwner} disabled={updating} className="bg-orange-600 hover:bg-orange-700 text-white">
                    {updating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar alteracoes'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={!!ownerToDelete} onOpenChange={() => setOwnerToDelete(null)}>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-xl">
            <DialogHeader>
              <DialogTitle>Confirmar Exclusao</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o proprietario independente "{ownerToDelete?.name}"?
                Esta acao nao pode ser desfeita e todos os dados relacionados serao perdidos.
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
                onClick={handleDeleteOwner}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? (
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
      </div>
    </TooltipProvider>
  )
}
