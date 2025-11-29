import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Edit, Crown, Star, Zap, Building2, Clock, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { plansAPI } from '../../api'

interface ModificationRequest {
  id: string
  planName: string
  requestedBy: { id: string; name: string; email: string }
  status: string
  currentValues: {
    price?: number
    propertyLimit?: number
    userLimit?: number
    features?: string[]
    description?: string
  }
  requestedValues: {
    price?: number
    propertyLimit?: number
    userLimit?: number
    features?: string[]
    description?: string
  }
  reviewedBy?: { id: string; name: string; email: string }
  reviewedAt?: string
  rejectionReason?: string
  createdAt: string
}

export default function PlansPage() {
  const { hasPermission, user } = useAuth()
  const queryClient = useQueryClient()

  const isCEO = user?.role === 'CEO'
  const isAdmin = user?.role === 'ADMIN'
  const canManagePlans = hasPermission('plans:update')

  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [showRequestsModal, setShowRequestsModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<ModificationRequest | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set())
  const [requestsPage, setRequestsPage] = useState(1)
  const requestsPerPage = 5

  const toggleRequestExpanded = (requestId: string) => {
    setExpandedRequests(prev => {
      const newSet = new Set(prev)
      if (newSet.has(requestId)) {
        newSet.delete(requestId)
      } else {
        newSet.add(requestId)
      }
      return newSet
    })
  }

  const [planForm, setPlanForm] = useState({
    price: '',
    propertyLimit: '',
    userLimit: '',
    features: '',
    description: '',
  })

  // Fetch plans from API
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const data = await plansAPI.getPlans();
      // Ensure features are parsed if they come as a JSON string
      return data.map((plan: any) => ({
        ...plan,
        features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features
      }));
    },
  })

  // Fetch pending modification requests (CEO only)
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['plan-modification-requests-pending'],
    queryFn: plansAPI.getPendingModificationRequests,
    enabled: isCEO,
  })

  // Fetch all modification requests (CEO and ADMIN)
  const { data: allRequests = [] } = useQuery({
    queryKey: ['plan-modification-requests'],
    queryFn: plansAPI.getAllModificationRequests,
    enabled: isCEO || isAdmin,
  })

  const handleEdit = (plan: any) => {
    setSelectedPlan(plan)
    setPlanForm({
      price: String(plan.price),
      propertyLimit: String(plan.propertyLimit),
      userLimit: String(plan.userLimit),
      features: Array.isArray(plan.features) ? plan.features.join(', ') : plan.features || '',
      description: plan.description || '',
    })
    setShowEditModal(true)
  }

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => plansAPI.updatePlan(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.invalidateQueries({ queryKey: ['plan-modification-requests'] })
      queryClient.invalidateQueries({ queryKey: ['plan-modification-requests-pending'] })

      // Check if it's a modification request (ADMIN) or direct update (CEO)
      if (response.status === 'PENDING') {
        toast.success(response.message || 'Solicitação de modificação enviada para aprovação do CEO!')
      } else {
        toast.success('Plano atualizado com sucesso!')
      }
      setShowEditModal(false)
      setSelectedPlan(null)
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao atualizar plano'
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.data?.message) {
        errorMessage = error.data.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      toast.error(errorMessage)
    },
  })

  const approveRequestMutation = useMutation({
    mutationFn: (id: string) => plansAPI.approveModificationRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.invalidateQueries({ queryKey: ['plan-modification-requests'] })
      queryClient.invalidateQueries({ queryKey: ['plan-modification-requests-pending'] })
      toast.success('Solicitação aprovada! As alterações foram aplicadas ao plano.')
      setSelectedRequest(null)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao aprovar solicitação')
    },
  })

  const rejectRequestMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => plansAPI.rejectModificationRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-modification-requests'] })
      queryClient.invalidateQueries({ queryKey: ['plan-modification-requests-pending'] })
      toast.success('Solicitação rejeitada.')
      setShowRejectModal(false)
      setSelectedRequest(null)
      setRejectReason('')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao rejeitar solicitação')
    },
  })

  const handleUpdatePlan = () => {
    if (!selectedPlan) return

    const featuresArray = planForm.features.split(',').map(f => f.trim()).filter(f => f)

    updatePlanMutation.mutate({
      id: selectedPlan.id,
      data: {
        price: parseFloat(planForm.price),
        propertyLimit: parseInt(planForm.propertyLimit),
        userLimit: parseInt(planForm.userLimit),
        features: featuresArray,
        description: planForm.description,
      }
    })
  }

  const getPlanNameInPortuguese = (name: string) => {
    switch (name.toLowerCase()) {
      case 'free':
        return 'Gratuito'
      case 'essential':
        return 'Essencial'
      case 'professional':
        return 'Profissional'
      case 'enterprise':
        return 'Empresarial'
      default:
        return name
    }
  }

  const getPlanIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'free':
        return <Package className="w-8 h-8" />
      case 'essential':
        return <Star className="w-8 h-8" />
      case 'professional':
        return <Building2 className="w-8 h-8" />
      case 'enterprise':
        return <Crown className="w-8 h-8" />
      default:
        return <Zap className="w-8 h-8" />
    }
  }

  const getPlanColor = (name: string) => {
    switch (name.toLowerCase()) {
      case 'free':
        return 'bg-gray-500'
      case 'essential':
        return 'bg-blue-500'
      case 'professional':
        return 'bg-purple-500'
      case 'enterprise':
        return 'bg-orange-500'
      default:
        return 'bg-primary'
    }
  }

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando planos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Planos e Upsells</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gerencie os planos de assinatura da plataforma
          </p>
        </div>
        <div className="flex gap-2">
          {isCEO && pendingRequests.length > 0 && (
            <Button
              onClick={() => setShowRequestsModal(true)}
              className="relative"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Solicitações Pendentes
              <Badge className="absolute -top-2 -right-2 bg-red-500 text-white">
                {pendingRequests.length}
              </Badge>
            </Button>
          )}
          {(isCEO || isAdmin) && (
            <Button
              variant="outline"
              onClick={() => setShowRequestsModal(true)}
            >
              <Clock className="w-4 h-4 mr-2" />
              Histórico
            </Button>
          )}
        </div>
      </div>

      {/* ADMIN Notice */}
      {isAdmin && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200">Aprovação Necessária</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Como administrador, suas alterações nos planos precisam ser aprovadas pelo CEO antes de entrarem em vigor.
              </p>
            </div>
          </div>
        </div>
      )}

      {plans.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Nenhum plano encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
          {plans.map((plan: any) => (
          <Card key={plan.id} className="relative overflow-hidden flex flex-col">
            <div className={`absolute top-0 right-0 w-full h-2 ${getPlanColor(plan.name)}`} />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-lg ${getPlanColor(plan.name)} text-white`}>
                    {getPlanIcon(plan.name)}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{getPlanNameInPortuguese(plan.name)}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col">
              <div>
                <div className="text-3xl font-bold">
                  {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}`}
                  {plan.price > 0 && <span className="text-sm text-muted-foreground">/mês</span>}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {plan.subscribers} assinantes
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Limite de Propriedades:</span>
                  <Badge variant="outline">
                    {plan.propertyLimit}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Limite de Usuários:</span>
                  <Badge variant="outline">
                    {plan.userLimit}
                  </Badge>
                </div>
              </div>

              <div className="pt-2 border-t flex-1">
                <h4 className="text-sm font-semibold mb-2">Recursos:</h4>
                <ul className="space-y-1">
                  {plan.features.map((feature: any, idx: number) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {canManagePlans && (
                <div className="flex gap-2 pt-4 mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(plan)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {/* Edit Plan Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-plan-name">Nome do Plano</Label>
              <Input
                id="edit-plan-name"
                value={selectedPlan ? getPlanNameInPortuguese(selectedPlan.name) : ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">O nome do plano não pode ser alterado</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-plan-price">Preço Mensal (R$)</Label>
                <Input
                  id="edit-plan-price"
                  type="number"
                  step="0.01"
                  value={planForm.price}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-plan-property-limit">Limite de Propriedades</Label>
                <Input
                  id="edit-plan-property-limit"
                  type="number"
                  value={planForm.propertyLimit}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, propertyLimit: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-plan-user-limit">Limite de Usuários</Label>
                <Input
                  id="edit-plan-user-limit"
                  type="number"
                  value={planForm.userLimit}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, userLimit: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-plan-features">Recursos (separados por vírgula)</Label>
              <Textarea
                id="edit-plan-features"
                value={planForm.features}
                onChange={(e) => setPlanForm(prev => ({ ...prev, features: e.target.value }))}
                placeholder="Ex: 5 propriedades, 3 usuários, Suporte por email"
              />
            </div>
            <div>
              <Label htmlFor="edit-plan-description">Descrição</Label>
              <Input
                id="edit-plan-description"
                value={planForm.description}
                onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowEditModal(false)
                setSelectedPlan(null)
              }}>
                Cancelar
              </Button>
              <Button
                onClick={handleUpdatePlan}
                disabled={updatePlanMutation.isPending}
              >
                {updatePlanMutation.isPending ? 'Salvando...' : (isAdmin ? 'Enviar para Aprovação' : 'Salvar')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modification Requests Modal */}
      <Dialog open={showRequestsModal} onOpenChange={(open) => {
        setShowRequestsModal(open)
        if (!open) {
          setRequestsPage(1)
          setExpandedRequests(new Set())
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitações de Modificação de Planos</DialogTitle>
            <DialogDescription>
              {isCEO ? 'Revise e aprove ou rejeite as solicitações de modificação dos administradores.' : 'Histórico das suas solicitações de modificação.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {allRequests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma solicitação encontrada.</p>
            ) : (
              (() => {
                const totalPages = Math.ceil(allRequests.length / requestsPerPage)
                const startIndex = (requestsPage - 1) * requestsPerPage
                const paginatedRequests = allRequests.slice(startIndex, startIndex + requestsPerPage)

                return (
                  <>
                    {paginatedRequests.map((request: ModificationRequest) => {
                const isExpanded = expandedRequests.has(request.id)
                return (
                  <Card key={request.id} className={`${request.status === 'PENDING' ? 'border-yellow-500' : ''}`}>
                    {/* Summary Header - Always Visible */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleRequestExpanded(request.id)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{getPlanNameInPortuguese(request.planName)}</span>
                            <Badge className={
                              request.status === 'PENDING' ? 'bg-yellow-500' :
                              request.status === 'APPROVED' ? 'bg-green-500' : 'bg-red-500'
                            }>
                              {request.status === 'PENDING' ? 'Pendente' :
                               request.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(request.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })} • {request.requestedBy.name || request.requestedBy.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    <div
                      className={`grid transition-all duration-300 ease-in-out ${
                        isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <CardContent className="pt-0 border-t">
                          <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                          <div>
                            <h4 className="font-semibold mb-2">Valores Atuais</h4>
                            <ul className="space-y-1 text-muted-foreground">
                              <li>Preço: R$ {request.currentValues.price?.toFixed(2) || '0.00'}</li>
                              <li>Limite de Propriedades: {request.currentValues.propertyLimit}</li>
                              <li>Limite de Usuários: {request.currentValues.userLimit}</li>
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Valores Solicitados</h4>
                            <ul className="space-y-1">
                              <li className={request.requestedValues.price !== request.currentValues.price ? 'text-blue-600 font-medium' : 'text-muted-foreground'}>
                                Preço: R$ {request.requestedValues.price?.toFixed(2) || '0.00'}
                              </li>
                              <li className={request.requestedValues.propertyLimit !== request.currentValues.propertyLimit ? 'text-blue-600 font-medium' : 'text-muted-foreground'}>
                                Limite de Propriedades: {request.requestedValues.propertyLimit}
                              </li>
                              <li className={request.requestedValues.userLimit !== request.currentValues.userLimit ? 'text-blue-600 font-medium' : 'text-muted-foreground'}>
                                Limite de Usuários: {request.requestedValues.userLimit}
                              </li>
                            </ul>
                          </div>
                        </div>

                        {request.status === 'REJECTED' && request.rejectionReason && (
                          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <p className="text-sm text-red-700 dark:text-red-300">
                              <strong>Motivo da rejeição:</strong> {request.rejectionReason}
                            </p>
                          </div>
                        )}

                        {request.reviewedBy && (
                          <p className="text-xs text-muted-foreground mt-3">
                            Revisado por: {request.reviewedBy.name || request.reviewedBy.email} em {new Date(request.reviewedAt!).toLocaleDateString('pt-BR')}
                          </p>
                        )}

                        {isCEO && request.status === 'PENDING' && (
                          <div className="flex gap-2 mt-4">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                approveRequestMutation.mutate(request.id)
                              }}
                              disabled={approveRequestMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedRequest(request)
                                setShowRejectModal(true)
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Rejeitar
                            </Button>
                          </div>
                        )}
                        </CardContent>
                      </div>
                    </div>
                  </Card>
                )
              })}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t mt-4">
                        <p className="text-sm text-muted-foreground">
                          Mostrando {startIndex + 1}-{Math.min(startIndex + requestsPerPage, allRequests.length)} de {allRequests.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRequestsPage(prev => Math.max(1, prev - 1))}
                            disabled={requestsPage === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="text-sm font-medium px-2">
                            {requestsPage} / {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRequestsPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={requestsPage === totalPages}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Request Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação</DialogTitle>
            <DialogDescription>
              Você está rejeitando a solicitação de modificação do plano {selectedRequest ? getPlanNameInPortuguese(selectedRequest.planName) : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Motivo da Rejeição (opcional)</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explique o motivo da rejeição..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowRejectModal(false)
                setRejectReason('')
              }}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedRequest) {
                    rejectRequestMutation.mutate({ id: selectedRequest.id, reason: rejectReason })
                  }
                }}
                disabled={rejectRequestMutation.isPending}
              >
                {rejectRequestMutation.isPending ? 'Rejeitando...' : 'Confirmar Rejeição'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
