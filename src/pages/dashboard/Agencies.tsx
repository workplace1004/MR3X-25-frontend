import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { agenciesAPI } from '@/api'
import {
  Building,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Users,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { CEPInput } from '@/components/ui/cep-input'
import { isValidCEPFormat } from '@/lib/validation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  TooltipProvider,
} from '@/components/ui/tooltip'

export function Agencies() {
  const { hasPermission, user } = useAuth()

  // CEO can VIEW but cannot CREATE/EDIT/DELETE agencies
  const isCEO = user?.role === 'CEO'
  const canViewAgencies = hasPermission('agencies:read')
  const canUpdateAgencies = hasPermission('agencies:update') && !isCEO
  const canDeleteAgencies = hasPermission('agencies:delete') && !isCEO

  if (!canViewAgencies) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Voce nao tem permissao para visualizar agencias.</p>
        </div>
      </div>
    )
  }

  const queryClient = useQueryClient()

  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const [selectedAgency, setSelectedAgency] = useState<any>(null)
  const [agencyToDelete, setAgencyToDelete] = useState<any>(null)
  const [agencyDetail, setAgencyDetail] = useState<any>(null)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { data: agencies, isLoading } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      return await agenciesAPI.getAgencies()
    },
    enabled: canViewAgencies,
  })

  const closeAllModals = () => {
    setShowEditModal(false)
    setShowDetailModal(false)
    setSelectedAgency(null)
    setAgencyToDelete(null)
    setAgencyDetail(null)
  }

  const updateAgencyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => agenciesAPI.updateAgency(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] })
      closeAllModals()
      toast.success('Agencia atualizada com sucesso')
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao atualizar agencia'
      if (error?.message) {
        errorMessage = error.message
      }
      toast.error(errorMessage)
    },
  })

  const deleteAgencyMutation = useMutation({
    mutationFn: (id: string) => agenciesAPI.deleteAgency(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] })
      closeAllModals()
      toast.success('Agencia excluida com sucesso')
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao excluir agencia'
      if (error?.message) {
        errorMessage = error.message
      }
      toast.error(errorMessage)
    },
  })

  const handleEditAgency = async () => {
    if (!canUpdateAgencies) {
      toast.error('Voce nao tem permissao para atualizar agencias')
      return
    }

    if (!selectedAgency) return

    if (!selectedAgency.name || !selectedAgency.email) {
      toast.error('Nome e e-mail sao obrigatorios')
      setUpdating(false)
      return
    }

    if (selectedAgency.zipCode && selectedAgency.zipCode.trim() !== '') {
      if (!isValidCEPFormat(selectedAgency.zipCode)) {
        toast.error('CEP invalido. Por favor, insira um CEP valido (00000-000)')
        setUpdating(false)
        return
      }
    }

    setUpdating(true)
    try {
      const updateData = {
        name: selectedAgency.name,
        email: selectedAgency.email,
        phone: selectedAgency.phone,
        address: selectedAgency.address,
        city: selectedAgency.city,
        state: selectedAgency.state,
        zipCode: selectedAgency.zipCode || undefined,
        plan: selectedAgency.plan,
        status: selectedAgency.status,
        maxProperties: selectedAgency.maxProperties,
        maxUsers: selectedAgency.maxUsers,
      }

      updateAgencyMutation.mutate({ id: selectedAgency.id, data: updateData })
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar agencia')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteAgency = async () => {
    if (!canDeleteAgencies) {
      toast.error('Voce nao tem permissao para excluir agencias')
      return
    }

    if (!agencyToDelete) return

    setDeleting(true)
    try {
      deleteAgencyMutation.mutate(agencyToDelete.id)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir agencia')
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'SUSPENDED': return 'bg-red-100 text-red-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agencias</h1>
            <p className="text-muted-foreground">Visualize e gerencie agencias imobiliarias cadastradas</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Carregando agencias...</p>
          </div>
        ) : agencies && agencies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agencies.map((agency: any) => (
              <Card key={agency.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{agency.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{agency.cnpj}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="outline">
                          <MoreHorizontal className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewAgency(agency)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        {canUpdateAgencies && (
                          <DropdownMenuItem onClick={() => handleEditAgencyClick(agency)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar agencia
                          </DropdownMenuItem>
                        )}
                        {canDeleteAgencies && (
                          <DropdownMenuItem
                            onClick={() => handleDeleteAgencyClick(agency)}
                            className="text-red-600 focus:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir agencia
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{agency.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{agency.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{agency.city}, {agency.state}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex gap-2">
                      <Badge className={getPlanColor(agency.plan)}>
                        {agency.plan}
                      </Badge>
                      <Badge className={getStatusColor(agency.status)}>
                        {agency.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{agency.userCount}/{agency.maxUsers}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Usuarios</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                        <Building className="w-4 h-4" />
                        <span>{agency.propertyCount}/{agency.maxProperties}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Propriedades</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma agencia encontrada</h3>
            <p className="text-muted-foreground mb-4">
              Nenhuma agencia encontrada no sistema
            </p>
          </div>
        )}

        {/* View Agency Modal */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Agencia</DialogTitle>
              <DialogDescription>
                Visualize todas as informacoes da agencia
              </DialogDescription>
            </DialogHeader>
            {agencyDetail && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome</Label>
                  <div className="text-sm text-foreground mt-1">{agencyDetail.name}</div>
                </div>
                <div>
                  <Label>CNPJ</Label>
                  <div className="text-sm text-foreground mt-1">{agencyDetail.cnpj}</div>
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
                  <Label>Endereco</Label>
                  <div className="text-sm text-foreground mt-1">{agencyDetail.address || '-'}</div>
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
                  <div className="text-sm text-foreground mt-1">{agencyDetail.plan}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="text-sm text-foreground mt-1">{agencyDetail.status}</div>
                </div>
                <div>
                  <Label>Usuarios</Label>
                  <div className="text-sm text-foreground mt-1">{agencyDetail.userCount}/{agencyDetail.maxUsers}</div>
                </div>
                <div>
                  <Label>Propriedades</Label>
                  <div className="text-sm text-foreground mt-1">{agencyDetail.propertyCount}/{agencyDetail.maxProperties}</div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Agency Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Agencia</DialogTitle>
              <DialogDescription>
                Atualize as informacoes da agencia. Todos os campos sao opcionais, exceto nome e e-mail.
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
                    <Input id="edit-email" type="email" value={selectedAgency.email || ''} onChange={(e) => setSelectedAgency({ ...selectedAgency, email: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="edit-phone">Telefone</Label>
                    <Input id="edit-phone" value={selectedAgency.phone || ''} onChange={(e) => setSelectedAgency({ ...selectedAgency, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="edit-status">Status</Label>
                    <select
                      id="edit-status"
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      value={selectedAgency.status || 'ACTIVE'}
                      onChange={(e) => setSelectedAgency({ ...selectedAgency, status: e.target.value })}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="PENDING">PENDING</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="edit-address">Endereco</Label>
                    <Input id="edit-address" value={selectedAgency.address || ''} onChange={(e) => setSelectedAgency({ ...selectedAgency, address: e.target.value })} />
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
                    <CEPInput
                      value={selectedAgency.zipCode || ''}
                      onChange={(value) => setSelectedAgency({ ...selectedAgency, zipCode: value })}
                      onCEPData={(data) => {
                        setSelectedAgency({
                          ...selectedAgency,
                          address: data.street || selectedAgency.address,
                          city: data.city || selectedAgency.city,
                          state: data.state || selectedAgency.state,
                        })
                      }}
                      label="CEP"
                      placeholder="00000-000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-plan">Plano</Label>
                    <select
                      id="edit-plan"
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      value={selectedAgency.plan || 'FREE'}
                      onChange={(e) => setSelectedAgency({ ...selectedAgency, plan: e.target.value })}
                    >
                      <option value="FREE">FREE</option>
                      <option value="ESSENTIAL">ESSENTIAL</option>
                      <option value="PROFESSIONAL">PROFESSIONAL</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="edit-maxUsers">Limite de Usuarios</Label>
                    <Input id="edit-maxUsers" type="number" value={selectedAgency.maxUsers ?? 3} onChange={(e) => setSelectedAgency({ ...selectedAgency, maxUsers: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label htmlFor="edit-maxProps">Limite de Propriedades</Label>
                    <Input id="edit-maxProps" type="number" value={selectedAgency.maxProperties ?? 5} onChange={(e) => setSelectedAgency({ ...selectedAgency, maxProperties: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={closeAllModals}>Cancelar</Button>
                  <Button onClick={handleEditAgency} disabled={updating} className="bg-orange-600 hover:bg-orange-700 text-white">
                    {updating ? 'Salvando...' : 'Salvar alteracoes'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!agencyToDelete} onOpenChange={() => setAgencyToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusao</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a agencia "{agencyToDelete?.name}"?
                Esta acao nao pode ser desfeita e todos os dados relacionados serao perdidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAgency}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
