import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Users,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Mail,
  Phone,
  MapPin,
  Building,
  Crown,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usersAPI } from '@/api'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CEPInput } from '@/components/ui/cep-input'
import { isValidCEPFormat } from '@/lib/validation'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'

export function AgencyAdmin() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const isCEO = user?.role === 'CEO'
  const canView = user && ['CEO', 'ADMIN'].includes(user.role)
  const canUpdate = canView && !isCEO
  const canDelete = canView && !isCEO

  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedAgency, setSelectedAgency] = useState<any>(null)
  const [agencyToDelete, setAgencyToDelete] = useState<any>(null)
  const [agencyDetail, setAgencyDetail] = useState<any>(null)
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

  const { data: agencyAdminsData, isLoading } = useQuery({
    queryKey: ['agency-admins'],
    queryFn: () => usersAPI.listUsers({ role: 'AGENCY_ADMIN' }),
    enabled: !!canView,
  })

  const agencyAdmins = (agencyAdminsData as any)?.items || []

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold">Acesso Negado</h3>
          <p className="text-muted-foreground">Voce nao tem permissao para acessar esta pagina.</p>
        </div>
      </div>
    )
  }

  const closeAllModals = () => {
    setShowEditModal(false)
    setShowDetailModal(false)
    setSelectedAgency(null)
    setAgencyToDelete(null)
    setAgencyDetail(null)
    setEmailError('')
    setEmailVerified(false)
    setCheckingEmail(false)
  }

  const updateAgencyAdminMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersAPI.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-admins'] })
      closeAllModals()
      toast.success('Diretor de agencia atualizado com sucesso')
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao atualizar diretor de agencia'
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      toast.error(errorMessage)
    },
  })

  const deleteAgencyAdminMutation = useMutation({
    mutationFn: (id: string) => usersAPI.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-admins'] })
      closeAllModals()
      toast.success('Diretor de agencia excluido com sucesso')
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao excluir diretor de agencia'
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      toast.error(errorMessage)
    },
  })

  const handleEditAgencyAdmin = async () => {
    if (!canUpdate) {
      toast.error('Voce nao tem permissao para atualizar diretores de agencia')
      return
    }

    if (!selectedAgency) return

    if (!selectedAgency.name || !selectedAgency.email) {
      toast.error('Nome e e-mail sao obrigatorios')
      return
    }

    if (selectedAgency.cep && selectedAgency.cep.trim() !== '') {
      if (!isValidCEPFormat(selectedAgency.cep)) {
        toast.error('CEP invalido. Por favor, insira um CEP valido (00000-000)')
        return
      }
    }

    setUpdating(true)
    try {
      const updateData = {
        name: selectedAgency.name,
        email: selectedAgency.email,
        document: selectedAgency.document,
        phone: selectedAgency.phone,
        address: selectedAgency.address,
        neighborhood: selectedAgency.neighborhood,
        city: selectedAgency.city,
        state: selectedAgency.state,
        cep: selectedAgency.cep || undefined,
        plan: selectedAgency.plan,
        status: selectedAgency.status,
      }

      updateAgencyAdminMutation.mutate({ id: selectedAgency.id, data: updateData })
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar diretor de agencia')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteAgencyAdmin = async () => {
    if (!canDelete) {
      toast.error('Voce nao tem permissao para excluir diretores de agencia')
      return
    }

    if (!agencyToDelete) return

    setDeleting(true)
    try {
      deleteAgencyAdminMutation.mutate(agencyToDelete.id)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir diretor de agencia')
    } finally {
      setDeleting(false)
    }
  }

  const handleViewAgency = (agency: any) => {
    setAgencyDetail(agency)
    setShowDetailModal(true)
  }

  const handleEditAgencyClick = (agency: any) => {
    setSelectedAgency(agency)
    setEmailError('')
    setEmailVerified(true)
    setCheckingEmail(false)
    setShowEditModal(true)
  }

  const handleDeleteAgencyClick = (agency: any) => {
    setAgencyToDelete(agency)
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
          <div className="p-3 bg-orange-100 rounded-lg">
            <Crown className="w-6 h-6 text-orange-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Diretor Agencia</h1>
            <p className="text-muted-foreground">Visualize e gerencie os diretores de agencias imobiliarias</p>
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
        ) : agencyAdmins && agencyAdmins.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agencyAdmins.map((admin: any) => (
              <Card key={admin.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Building className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{admin.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">Diretor de Agencia</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="outline">
                          <MoreHorizontal className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewAgency(admin)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        {canUpdate && (
                          <DropdownMenuItem onClick={() => handleEditAgencyClick(admin)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() => handleDeleteAgencyClick(admin)}
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
                    <span className="truncate">{admin.email}</span>
                  </div>
                  {admin.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{admin.phone}</span>
                    </div>
                  )}
                  {admin.document && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span>{admin.document}</span>
                    </div>
                  )}
                  {(admin.city || admin.state) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{[admin.city, admin.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex gap-2">
                      <Badge className={getPlanColor(admin.plan)}>
                        {getPlanLabel(admin.plan)}
                      </Badge>
                      <Badge className={getStatusColor(admin.status)}>
                        {getStatusLabel(admin.status)}
                      </Badge>
                    </div>
                  </div>

                  {admin.agency && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Agencia:</span>
                        <span className="text-muted-foreground truncate">{admin.agency.name}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum diretor de agencia encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Nenhum diretor de agencia imobiliaria cadastrado no sistema
            </p>
          </div>
        )}

        { }
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Diretor de Agencia</DialogTitle>
              <DialogDescription>
                Visualize todas as informacoes do diretor de agencia imobiliaria
              </DialogDescription>
            </DialogHeader>
            {agencyDetail && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome</Label>
                  <div className="text-sm text-foreground mt-1">{agencyDetail.name}</div>
                </div>
                <div>
                  <Label>Documento (CPF/CNPJ)</Label>
                  <div className="text-sm text-foreground mt-1">{agencyDetail.document || '-'}</div>
                </div>
                <div>
                  <Label>E-mail</Label>
                  <div className="text-sm text-foreground mt-1">{agencyDetail.email}</div>
                </div>
                <div>
                  <Label>Telefone</Label>
                  <div className="text-sm text-foreground mt-1">{agencyDetail.phone || '-'}</div>
                </div>
                <div className="md:col-span-2">
                  <Label>CEP</Label>
                  <div className="text-sm text-foreground mt-1">{agencyDetail.cep || '-'}</div>
                </div>
                <div className="md:col-span-2">
                  <Label>Endereco</Label>
                  <div className="text-sm text-foreground mt-1">{agencyDetail.address || '-'}</div>
                </div>
                <div>
                  <Label>Bairro</Label>
                  <div className="text-sm text-foreground mt-1">{agencyDetail.neighborhood || '-'}</div>
                </div>
                <div>
                  <Label>Cidade</Label>
                  <div className="text-sm text-foreground mt-1">{agencyDetail.city || '-'}</div>
                </div>
                <div>
                  <Label>Estado</Label>
                  <div className="text-sm text-foreground mt-1">{agencyDetail.state || '-'}</div>
                </div>
                <div>
                  <Label>Plano</Label>
                  <div className="text-sm text-foreground mt-1">{getPlanLabel(agencyDetail.plan)}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="text-sm text-foreground mt-1">{getStatusLabel(agencyDetail.status)}</div>
                </div>
                <div>
                  <Label>Data de Criacao</Label>
                  <div className="text-sm text-foreground mt-1">
                    {agencyDetail.createdAt ? new Date(agencyDetail.createdAt).toLocaleDateString('pt-BR') : '-'}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        { }
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Diretor de Agencia</DialogTitle>
              <DialogDescription>
                Atualize as informacoes do diretor. Nome e e-mail sao obrigatorios.
              </DialogDescription>
            </DialogHeader>
            {selectedAgency && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Nome</Label>
                    <Input id="edit-name" value={selectedAgency.name || ''} onChange={(e) => setSelectedAgency({ ...selectedAgency, name: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">E-mail</Label>
                    <div className="relative">
                      <Input
                        id="edit-email"
                        type="email"
                        value={selectedAgency.email || ''}
                        onChange={(e) => setSelectedAgency({ ...selectedAgency, email: e.target.value })}
                        onBlur={(e) => checkEmailExists(e.target.value, selectedAgency?.email)}
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
                    <Label htmlFor="edit-document">Documento (CPF/CNPJ)</Label>
                    <Input id="edit-document" value={selectedAgency.document || ''} onChange={(e) => setSelectedAgency({ ...selectedAgency, document: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="edit-phone">Telefone</Label>
                    <Input id="edit-phone" value={selectedAgency.phone || ''} onChange={(e) => setSelectedAgency({ ...selectedAgency, phone: e.target.value })} />
                  </div>
                  <div>
                    <CEPInput
                      value={selectedAgency.cep || ''}
                      onChange={(value) => setSelectedAgency({ ...selectedAgency, cep: value })}
                      onCEPData={(data) => {
                        setSelectedAgency({
                          ...selectedAgency,
                          address: data.logradouro || selectedAgency.address,
                          neighborhood: data.bairro || selectedAgency.neighborhood,
                          city: data.cidade || selectedAgency.city,
                          state: data.estado || selectedAgency.state,
                        })
                      }}
                      label="CEP"
                      placeholder="00000-000"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={selectedAgency.status || 'ACTIVE'}
                      onValueChange={(value) => setSelectedAgency({ ...selectedAgency, status: value })}
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

                  <div className="md:col-span-2">
                    <Label htmlFor="edit-address">Endereco</Label>
                    <Input id="edit-address" value={selectedAgency.address || ''} onChange={(e) => setSelectedAgency({ ...selectedAgency, address: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="edit-neighborhood">Bairro</Label>
                    <Input id="edit-neighborhood" value={selectedAgency.neighborhood || ''} onChange={(e) => setSelectedAgency({ ...selectedAgency, neighborhood: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="edit-city">Cidade</Label>
                    <Input id="edit-city" value={selectedAgency.city || ''} onChange={(e) => setSelectedAgency({ ...selectedAgency, city: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="edit-state">Estado</Label>
                    <Input id="edit-state" value={selectedAgency.state || ''} onChange={(e) => setSelectedAgency({ ...selectedAgency, state: e.target.value })} />
                  </div>
                  <div>
                    <Label>Plano</Label>
                    <Select
                      value={selectedAgency.plan || 'FREE'}
                      onValueChange={(value) => setSelectedAgency({ ...selectedAgency, plan: value })}
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
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={closeAllModals}>Cancelar</Button>
                  <Button onClick={handleEditAgencyAdmin} disabled={updating} className="bg-orange-600 hover:bg-orange-700 text-white">
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

        { }
        <Dialog open={!!agencyToDelete} onOpenChange={() => setAgencyToDelete(null)}>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-xl">
            <DialogHeader>
              <DialogTitle>Confirmar Exclusao</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o diretor de agencia "{agencyToDelete?.name}"?
                Esta acao nao pode ser desfeita e todos os dados relacionados serao perdidos.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-row gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setAgencyToDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDeleteAgencyAdmin}
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
