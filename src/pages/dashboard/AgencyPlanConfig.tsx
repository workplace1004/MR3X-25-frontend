import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { agenciesAPI, plansAPI } from '../../api';
import {
  Package,
  Building2,
  Users,
  Check,
  X,
  ArrowUpCircle,
  AlertTriangle,
  Loader2,
  Lock,
  Unlock,
  Crown,
  Zap,
  Star,
  Briefcase
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';

interface PlanUsage {
  properties: {
    active: number;
    frozen: number;
    total: number;
    limit: number;
  };
  users: {
    active: number;
    frozen: number;
    total: number;
    limit: number;
  };
  isOverLimit: boolean;
  upgradeRequired: boolean;
  plan: string;
}

interface PlanChangePreview {
  currentPlan: string;
  newPlan: string;
  currentLimits: { properties: number; users: number };
  newLimits: { properties: number; users: number };
  currentUsage: { properties: number; users: number };
  willFreeze: { properties: number; users: number };
  willUnfreeze: { properties: number; users: number };
  isUpgrade: boolean;
}

interface Agency {
  id: string;
  name: string;
  plan: string;
  maxProperties: number;
  maxUsers: number;
  agencyFee: number;
  frozenPropertiesCount: number;
  frozenUsersCount: number;
}

const planDetails = {
  FREE: {
    name: 'Gratuito',
    icon: Package,
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    description: 'Para experimentar a plataforma',
    properties: 1,
    users: 5,
    features: ['1 propriedade ativa', '5 usuários', 'Suporte por email'],
  },
  ESSENTIAL: {
    name: 'Essencial',
    icon: Zap,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Para pequenas imobiliárias',
    properties: 10,
    users: 10,
    features: ['10 propriedades', '10 usuários', 'Relatórios básicos', 'Suporte prioritário'],
  },
  PROFESSIONAL: {
    name: 'Profissional',
    icon: Star,
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Para imobiliárias em crescimento',
    properties: 50,
    users: 25,
    features: ['50 propriedades', '25 usuários', 'Relatórios avançados', 'API de integração', 'Suporte 24/7'],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    icon: Crown,
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Para grandes operações',
    properties: -1, // Unlimited
    users: -1, // Unlimited
    features: ['Propriedades ilimitadas', 'Usuários ilimitados', 'Relatórios personalizados', 'API completa', 'Suporte dedicado', 'SLA garantido'],
  },
};

export function AgencyPlanConfig() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PlanChangePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Check permissions
  const canViewPlan = hasPermission('agencies:read') || user?.role === 'AGENCY_ADMIN';
  const canChangePlan = hasPermission('agencies:update') || user?.role === 'AGENCY_ADMIN';
  const agencyId = user?.agencyId;

  // Fetch agency data
  const { data: agency, isLoading: agencyLoading } = useQuery({
    queryKey: ['agency', agencyId],
    queryFn: () => agenciesAPI.getAgencyById(agencyId!),
    enabled: !!agencyId && canViewPlan,
  });

  // Fetch plan usage
  const { data: planUsage, isLoading: usageLoading } = useQuery({
    queryKey: ['agency-plan-usage', agencyId],
    queryFn: () => agenciesAPI.getPlanUsage(agencyId!),
    enabled: !!agencyId && canViewPlan,
  });

  // Fetch frozen entities
  const { data: frozenEntities } = useQuery({
    queryKey: ['agency-frozen-entities', agencyId],
    queryFn: () => agenciesAPI.getFrozenEntities(agencyId!),
    enabled: !!agencyId && canViewPlan,
  });

  // Fetch available plans
  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => plansAPI.getPlans(),
    enabled: canViewPlan,
  });

  // Don't render if no permission or no agency
  if (!canViewPlan || !agencyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para visualizar o plano da agência.</p>
        </div>
      </div>
    );
  }

  if (agencyLoading || usageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentPlan = agency?.plan || 'FREE';
  const currentPlanDetails = planDetails[currentPlan as keyof typeof planDetails] || planDetails.FREE;

  const handlePreviewPlanChange = async (newPlan: string) => {
    if (!agencyId) return;

    setLoadingPreview(true);
    setSelectedPlan(newPlan);

    try {
      const preview = await agenciesAPI.previewPlanChange(agencyId, newPlan);
      setPreviewData(preview);
      setShowUpgradeModal(true);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar prévia da mudança de plano');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleRequestPlanChange = async () => {
    if (!selectedPlan) return;

    try {
      // For now, just show a message that the request was sent
      // In a real implementation, this would create a plan modification request
      toast.success('Solicitação de mudança de plano enviada! Nossa equipe entrará em contato.');
      setShowUpgradeModal(false);
      setSelectedPlan(null);
      setPreviewData(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao solicitar mudança de plano');
    }
  };

  const propertyPercent = planUsage?.properties?.limit > 0
    ? Math.min(100, (planUsage.properties.active / planUsage.properties.limit) * 100)
    : 0;

  const userPercent = planUsage?.users?.limit > 0
    ? Math.min(100, (planUsage.users.active / planUsage.users.limit) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Plano da Agência</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Gerencie o plano e os limites da sua agência
        </p>
      </div>

      {/* Current Plan Card */}
      <Card className={`border-2 ${currentPlanDetails.color}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${currentPlanDetails.color}`}>
                <currentPlanDetails.icon className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Plano {currentPlanDetails.name}</CardTitle>
                <CardDescription>{currentPlanDetails.description}</CardDescription>
              </div>
            </div>
            <Badge className={currentPlanDetails.color}>
              Plano Atual
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {currentPlanDetails.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Properties Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Uso de Propriedades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Ativas</span>
              <span className="font-medium">
                {planUsage?.properties?.active || 0} / {planUsage?.properties?.limit === -1 ? 'Ilimitado' : planUsage?.properties?.limit || 0}
              </span>
            </div>
            {planUsage?.properties?.limit !== -1 && (
              <Progress value={propertyPercent} className="h-3" />
            )}
            {planUsage?.properties?.frozen > 0 && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg">
                <Lock className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-800">
                  {planUsage.properties.frozen} propriedade(s) congelada(s)
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Uso de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Ativos</span>
              <span className="font-medium">
                {planUsage?.users?.active || 0} / {planUsage?.users?.limit === -1 ? 'Ilimitado' : planUsage?.users?.limit || 0}
              </span>
            </div>
            {planUsage?.users?.limit !== -1 && (
              <Progress value={userPercent} className="h-3" />
            )}
            {planUsage?.users?.frozen > 0 && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg">
                <Lock className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-800">
                  {planUsage.users.frozen} usuário(s) desativado(s)
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Frozen Entities Warning */}
      {planUsage?.upgradeRequired && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <p className="font-medium mb-2">Você tem itens congelados devido ao limite do seu plano.</p>
            <p className="text-sm">
              Faça upgrade para um plano maior para desbloquear todas as suas propriedades e usuários.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Frozen Properties List */}
      {frozenEntities?.properties?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              Propriedades Congeladas
            </CardTitle>
            <CardDescription>
              Estas propriedades estão inativas devido ao limite do seu plano
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {frozenEntities.properties.map((property: any) => (
                <div key={property.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{property.name || property.address}</p>
                    <p className="text-sm text-muted-foreground">
                      Congelado em: {new Date(property.frozenAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Badge variant="destructive" className="gap-1">
                    <Lock className="w-3 h-3" />
                    Congelado
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Frozen Users List */}
      {frozenEntities?.users?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              Usuários Desativados
            </CardTitle>
            <CardDescription>
              Estes usuários estão inativos devido ao limite do seu plano
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {frozenEntities.users.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{user.name || user.email}</p>
                    <p className="text-sm text-muted-foreground">{user.role}</p>
                  </div>
                  <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800">
                    <Lock className="w-3 h-3" />
                    Desativado
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Planos Disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(planDetails).map(([planKey, plan]) => {
            const isCurrentPlan = currentPlan === planKey;
            const PlanIcon = plan.icon;

            return (
              <Card
                key={planKey}
                className={`relative flex flex-col ${isCurrentPlan ? 'border-2 border-primary' : 'hover:border-gray-300'}`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">Atual</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <div className={`mx-auto p-3 rounded-lg w-fit ${plan.color}`}>
                    <PlanIcon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription className="text-xs">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="text-center space-y-1 flex-1">
                    <p className="text-sm">
                      <Building2 className="w-4 h-4 inline mr-1" />
                      {plan.properties === -1 ? 'Ilimitado' : plan.properties} propriedades
                    </p>
                    <p className="text-sm">
                      <Users className="w-4 h-4 inline mr-1" />
                      {plan.users === -1 ? 'Ilimitado' : plan.users} usuários
                    </p>
                  </div>
                  <Button
                    className="w-full mt-4"
                    variant={isCurrentPlan ? 'outline' : 'default'}
                    disabled={isCurrentPlan || loadingPreview}
                    onClick={() => handlePreviewPlanChange(planKey)}
                  >
                    {loadingPreview && selectedPlan === planKey ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : isCurrentPlan ? (
                      'Plano Atual'
                    ) : (
                      <>
                        <ArrowUpCircle className="w-4 h-4 mr-2" />
                        Selecionar
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Plan Change Preview Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Mudança de Plano</DialogTitle>
            <DialogDescription>
              Revise as alterações antes de confirmar
            </DialogDescription>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">De</p>
                  <p className="font-medium">{planDetails[previewData.currentPlan as keyof typeof planDetails]?.name || previewData.currentPlan}</p>
                </div>
                <ArrowUpCircle className="w-5 h-5 text-muted-foreground" />
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Para</p>
                  <p className="font-medium">{planDetails[previewData.newPlan as keyof typeof planDetails]?.name || previewData.newPlan}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Limite de Propriedades</span>
                  <span>
                    {previewData.currentLimits.properties === -1 ? 'Ilimitado' : previewData.currentLimits.properties}
                    {' '}&rarr;{' '}
                    {previewData.newLimits.properties === -1 ? 'Ilimitado' : previewData.newLimits.properties}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Limite de Usuários</span>
                  <span>
                    {previewData.currentLimits.users === -1 ? 'Ilimitado' : previewData.currentLimits.users}
                    {' '}&rarr;{' '}
                    {previewData.newLimits.users === -1 ? 'Ilimitado' : previewData.newLimits.users}
                  </span>
                </div>
              </div>

              {previewData.willUnfreeze.properties > 0 || previewData.willUnfreeze.users > 0 ? (
                <Alert className="border-green-300 bg-green-50">
                  <Unlock className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 text-sm">
                    {previewData.willUnfreeze.properties > 0 && (
                      <span>{previewData.willUnfreeze.properties} propriedade(s) serão desbloqueadas. </span>
                    )}
                    {previewData.willUnfreeze.users > 0 && (
                      <span>{previewData.willUnfreeze.users} usuário(s) serão reativados.</span>
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}

              {previewData.willFreeze.properties > 0 || previewData.willFreeze.users > 0 ? (
                <Alert className="border-amber-300 bg-amber-50">
                  <Lock className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-sm">
                    {previewData.willFreeze.properties > 0 && (
                      <span>{previewData.willFreeze.properties} propriedade(s) serão congeladas. </span>
                    )}
                    {previewData.willFreeze.users > 0 && (
                      <span>{previewData.willFreeze.users} usuário(s) serão desativados.</span>
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRequestPlanChange}>
              Solicitar Mudança
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AgencyPlanConfig;
