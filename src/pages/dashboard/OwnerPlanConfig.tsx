import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { usersAPI, plansAPI, propertiesAPI } from '../../api';
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
import { Skeleton } from '../../components/ui/skeleton';
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

const getPlanNameInPortuguese = (name: string) => {
  switch (name.toLowerCase()) {
    case 'free':
      return 'Gratuito';
    case 'basic':
      return 'Básico';
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
    case 'basic':
      return Zap;
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
    case 'basic':
      return 'bg-blue-500';
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

export function OwnerPlanConfig() {
  const { user } = useAuth();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PlanChangePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const canViewPlan = user?.role === 'INDEPENDENT_OWNER';
  const userId = user?.id;

  const { data: ownerData, isLoading: ownerLoading } = useQuery({
    queryKey: ['owner-details', userId],
    queryFn: () => usersAPI.getUserById(userId!),
    enabled: !!userId && canViewPlan,
  });

  const { data: planUsage, isLoading: usageLoading } = useQuery({
    queryKey: ['owner-plan-usage', userId],
    queryFn: async () => {
      
      const properties = await propertiesAPI.getProperties();
      const activeProperties = properties.filter((p: any) => !p.isFrozen && !p.deleted);
      const frozenProperties = properties.filter((p: any) => p.isFrozen);

      const tenants = await usersAPI.getTenants();
      const activeTenants = Array.isArray(tenants) ? tenants.filter((t: any) => !t.isFrozen) : [];
      const frozenTenants = Array.isArray(tenants) ? tenants.filter((t: any) => t.isFrozen) : [];

      const userPlan = ownerData?.plan || 'FREE';
      const limits = getPlanLimits(userPlan);

      return {
        properties: {
          active: activeProperties.length,
          frozen: frozenProperties.length,
          limit: limits.properties,
        },
        users: {
          active: activeTenants.length,
          frozen: frozenTenants.length,
          limit: limits.users,
        },
        upgradeRequired: frozenProperties.length > 0 || frozenTenants.length > 0,
      };
    },
    enabled: !!userId && canViewPlan && !!ownerData,
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const data = await plansAPI.getPlans();
      return data.map((plan: any) => ({
        ...plan,
        features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features
      }));
    },
    enabled: canViewPlan,
  });

  // Get plan limits from the fetched plans data (API is source of truth)
  // This ensures limits are always in sync with backend
  function getPlanLimits(planName: string) {
    const plan = plans.find((p: any) => p.name.toUpperCase() === planName.toUpperCase());
    if (plan) {
      return {
        properties: plan.propertyLimit || plan.maxActiveContracts || 1,
        // For contracts/tenants: 1 contract = 1 tenant, so use the same limit
        users: plan.userLimit || plan.maxTenants || plan.maxActiveContracts || 1,
      };
    }
    // Fallback defaults if plan not found
    switch (planName.toUpperCase()) {
      case 'FREE':
        return { properties: 1, users: 2 };
      case 'BASIC':
        return { properties: 20, users: 20 };
      case 'PROFESSIONAL':
        return { properties: 60, users: 60 };
      case 'ENTERPRISE':
        return { properties: 200, users: 9999 };
      default:
        return { properties: 1, users: 2 };
    }
  }

  if (!canViewPlan) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para visualizar esta página.</p>
        </div>
      </div>
    );
  }

  if (ownerLoading || usageLoading || plansLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const currentPlanName = ownerData?.plan || 'FREE';
  const currentPlanData = plans.find((p: any) => p.name.toUpperCase() === currentPlanName.toUpperCase());
  const currentPlanColor = getPlanColor(currentPlanName);
  const CurrentPlanIcon = getPlanIcon(currentPlanName);

  const handlePreviewPlanChange = async (newPlan: string) => {
    if (!userId) return;

    setLoadingPreview(true);
    setSelectedPlan(newPlan);

    try {
      const currentLimits = getPlanLimits(currentPlanName);
      const newLimits = getPlanLimits(newPlan);

      const currentUsage = {
        properties: planUsage?.properties?.active || 0,
        users: planUsage?.users?.active || 0,
      };

      const willFreeze = {
        properties: Math.max(0, currentUsage.properties - newLimits.properties),
        users: Math.max(0, currentUsage.users - newLimits.users),
      };

      const willUnfreeze = {
        properties: Math.min(planUsage?.properties?.frozen || 0, newLimits.properties - currentUsage.properties),
        users: Math.min(planUsage?.users?.frozen || 0, newLimits.users - currentUsage.users),
      };

      setPreviewData({
        currentPlan: currentPlanName,
        newPlan,
        currentLimits,
        newLimits,
        currentUsage,
        willFreeze,
        willUnfreeze,
        isUpgrade: newLimits.properties > currentLimits.properties,
      });
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
      
      toast.success('Solicitação de mudança de plano enviada! Nossa equipe entrará em contato.');
      setShowUpgradeModal(false);
      setSelectedPlan(null);
      setPreviewData(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao solicitar mudança de plano');
    }
  };

  const propertyPercent = (planUsage?.properties?.limit ?? 0) > 0
    ? Math.min(100, ((planUsage?.properties?.active ?? 0) / (planUsage?.properties?.limit ?? 1)) * 100)
    : 0;

  const userPercent = (planUsage?.users?.limit ?? 0) > 0
    ? Math.min(100, ((planUsage?.users?.active ?? 0) / (planUsage?.users?.limit ?? 1)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Meu Plano</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Gerencie o seu plano e limites de uso
        </p>
      </div>

      {}
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
              <span className="text-sm">Imóveis:</span>
              <Badge variant="outline">
                {currentPlanData?.propertyLimit || 1}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Inquilinos:</span>
              <Badge variant="outline">
                {currentPlanData?.tenantLimit || currentPlanData?.maxTenants || currentPlanData?.propertyLimit || 1}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Proprietários:</span>
              <Badge variant="outline">
                {currentPlanData?.ownerLimit || currentPlanData?.maxOwners || currentPlanData?.propertyLimit || 1}
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

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {}
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
            {(planUsage?.properties?.frozen || 0) > 0 && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg">
                <Lock className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-800">
                  {planUsage?.properties?.frozen} imóvel(eis) congelado(s)
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Uso de Inquilinos
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
            {(planUsage?.users?.frozen || 0) > 0 && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg">
                <Lock className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-800">
                  {planUsage?.users?.frozen} inquilino(s) congelado(s)
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {}
      {planUsage?.upgradeRequired && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <p className="font-medium mb-2">Você tem itens congelados devido ao limite do seu plano.</p>
            <p className="text-sm">
              Faça upgrade para um plano maior para desbloquear todos os seus imóveis e inquilinos.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {}
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
                        <span className="text-sm">Imóveis:</span>
                        <Badge variant="outline">
                          {plan.propertyLimit}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Inquilinos:</span>
                        <Badge variant="outline">
                          {plan.tenantLimit || plan.maxTenants || plan.propertyLimit}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Proprietários:</span>
                        <Badge variant="outline">
                          {plan.ownerLimit || plan.maxOwners || plan.propertyLimit}
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

      {}
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
                  <span>Limite de Inquilinos</span>
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
                      <span>{previewData.willUnfreeze.users} inquilino(s) serão reativados.</span>
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
                      <span>{previewData.willFreeze.users} inquilino(s) serão congelados.</span>
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

export default OwnerPlanConfig;
