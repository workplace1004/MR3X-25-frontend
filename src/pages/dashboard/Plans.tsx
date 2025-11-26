import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Edit, Crown, Star, Zap, Building2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { plansAPI } from '../../api'

export default function PlansPage() {
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()

  const canManagePlans = hasPermission('plans:update')

  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<any>(null)

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast.success('Plano atualizado com sucesso!')
      setShowEditModal(false)
      setSelectedPlan(null)
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao atualizar plano'
      if (error?.data?.message) {
        errorMessage = error.data.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      toast.error(errorMessage)
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
      </div>

      {plans.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Nenhum plano encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan: any) => (
          <Card key={plan.id} className="relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-full h-2 ${getPlanColor(plan.name)}`} />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${getPlanColor(plan.name)} text-white`}>
                    {getPlanIcon(plan.name)}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="pt-2 border-t">
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
                <div className="flex gap-2 pt-4">
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
                value={selectedPlan?.name || ''}
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
                {updatePlanMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
