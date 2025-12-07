import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { agenciesAPI, plansAPI } from '../../api';
import {
  Package,
  Building2,
  Users,
  Check,
  ArrowUpCircle,
  AlertTriangle,
  Loader2,
  Lock,
  Unlock,
  Crown,
  Zap,
  Star,
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

// Helper functions to get plan display info
const getPlanNameInPortuguese = (name: string) => {
  switch (name.toLowerCase()) {
    case 'free':
      return 'Gratuito';
    case 'essential':
      return 'Essencial';
    case 'professional':
      return 'Profissional';
    case 'enterprise':
      return 'Empresarial';
    default:
      return name;
  }
};

const getPlanIcon = (name: string) => {
  switch (name.toLowerCase()) {
    case 'free':
      return Package;
    case 'essential':
      return Star;
    case 'professional':
      return Building2;
    case 'enterprise':
      return Crown;
    default:
      return Zap;
  }
};

const getPlanColor = (name: string) => {
  switch (name.toLowerCase()) {
    case 'free':
      return 'bg-gray-500';
    case 'essential':
      return 'bg-blue-500';
    case 'professional':
      return 'bg-purple-500';
    case 'enterprise':
      return 'bg-orange-500';
    default:
      return 'bg-primary';
  }
};

export function AgencyPlanConfig() {
  const { user, hasPermission } = useAuth();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PlanChangePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Check permissions
  const canViewPlan = hasPermission('agencies:read') || user?.role === 'AGENCY_ADMIN';
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

  // Fetch available plans from API
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

  if (agencyLoading || usageLoading || plansLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentPlanName = agency?.plan || 'FREE';
  // Find current plan from API data
  const currentPlanData = plans.find((p: any) => p.name.toUpperCase() === currentPlanName.toUpperCase());
  const currentPlanColor = getPlanColor(currentPlanName);
  const CurrentPlanIcon = getPlanIcon(currentPlanName);

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
      <Card className="relative overflow-visible">
        <div className={`absolute top-0 left-0 right-0 h-2 rounded-t-lg ${currentPlanColor}`} />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${currentPlanColor} text-white`}>
                <CurrentPlanIcon className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Plano {getPlanNameInPortuguese(currentPlanName)}</CardTitle>
                <CardDescription>{currentPlanData?.description || 'Seu plano atual'}</CardDescription>
              </div>
            </div>
            <Badge className={`${currentPlanColor} text-white`}>
              Plano Atual
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-3xl font-bold">
              {currentPlanData?.price === 0 ? 'Grátis' : `R$ ${currentPlanData?.price?.toFixed(2) || '0.00'}`}
              {currentPlanData?.price > 0 && <span className="text-sm text-muted-foreground">/mês</span>}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Limite de Imóveis:</span>
              <Badge variant="outline">
                {currentPlanData?.propertyLimit || 1}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Limite de Usuários:</span>
              <Badge variant="outline">
                {currentPlanData?.userLimit || 1}
              </Badge>
            </div>
          </div>

          <div className="pt-2 border-t">
            <h4 className="text-sm font-semibold mb-2">Recursos:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(currentPlanData?.features || []).map((feature: string, index: number) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
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
              Uso de Imóveis
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
                  {planUsage.properties.frozen} imóvel(eis) congelado(s)
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
              Faça upgrade para um plano maior para desbloquear todos os seus imóveis e usuários.
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
              Imóveis Congelados
            </CardTitle>
            <CardDescription>
              Estes imóveis estão inativos devido ao limite do seu plano
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
      {plans.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">Nenhum plano encontrado</p>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Planos Disponíveis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
            {plans.map((plan: any) => {
              const isCurrentPlan = currentPlanName.toUpperCase() === plan.name.toUpperCase();
              const PlanIcon = getPlanIcon(plan.name);
              const planColor = getPlanColor(plan.name);

              return (
                <Card key={plan.id} className={`relative overflow-visible flex flex-col ${isCurrentPlan ? 'border-2 border-primary' : ''}`}>
                  <div className={`absolute top-0 left-0 right-0 h-2 rounded-t-lg ${planColor}`} />
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-primary">Atual</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-3 rounded-lg ${planColor} text-white`}>
                          <PlanIcon className="w-8 h-8" />
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
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Limite de Imóveis:</span>
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
                        {(plan.features || []).map((feature: any, idx: number) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      className="w-full mt-4"
                      variant={isCurrentPlan ? 'outline' : 'default'}
                      disabled={isCurrentPlan || loadingPreview}
                      onClick={() => handlePreviewPlanChange(plan.name.toUpperCase())}
                    >
                      {loadingPreview && selectedPlan === plan.name.toUpperCase() ? (
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
      )}

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
                  <p className="font-medium">{getPlanNameInPortuguese(previewData.currentPlan)}</p>
                </div>
                <ArrowUpCircle className="w-5 h-5 text-muted-foreground" />
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Para</p>
                  <p className="font-medium">{getPlanNameInPortuguese(previewData.newPlan)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Limite de Imóveis</span>
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
                      <span>{previewData.willUnfreeze.properties} imóvel(eis) serão desbloqueados. </span>
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
                      <span>{previewData.willFreeze.properties} imóvel(eis) serão congelados. </span>
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
