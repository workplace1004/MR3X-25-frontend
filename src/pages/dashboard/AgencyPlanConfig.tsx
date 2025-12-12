import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { agenciesAPI, plansAPI } from '../../api';
import {
  Package,
  Building2,
  Users,
  Check,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
  Loader2,
  Lock,
  Unlock,
  Crown,
  Zap,
  Star,
  Save,
  FileCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
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

const getPlanNameInPortuguese = (name?: string | null) => {
  if (!name) return 'Desconhecido';
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

const getPlanIcon = (name?: string | null) => {
  if (!name) return Package;
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
    case 'basic':
      return 'bg-blue-500';
    case 'professional':
      return 'bg-purple-500';
    case 'enterprise':
      return 'bg-orange-500';
    default:
      return 'bg-primary';
  }
};

// Plan order for comparison (higher index = better plan)
const PLAN_ORDER: Record<string, number> = {
  'FREE': 0,
  'BASIC': 1,
  'ESSENTIAL': 1,
  'PROFESSIONAL': 2,
  'ENTERPRISE': 3,
};

const getPlanOrder = (planName: string): number => {
  return PLAN_ORDER[planName.toUpperCase()] ?? 0;
};

const isUpgrade = (currentPlan: string, newPlan: string): boolean => {
  return getPlanOrder(newPlan) > getPlanOrder(currentPlan);
};

export function AgencyPlanConfig() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PlanChangePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [creci, setCreci] = useState('');
  const [creciState, setCreciState] = useState('');
  const [savingCreci, setSavingCreci] = useState(false);

  const canViewPlan = hasPermission('agencies:read') || user?.role === 'AGENCY_ADMIN';
  const agencyId = user?.agencyId;

  const { data: agency, isLoading: agencyLoading } = useQuery({
    queryKey: ['agency', agencyId],
    queryFn: () => agenciesAPI.getAgencyById(agencyId!),
    enabled: !!agencyId && canViewPlan,
  });

  const { data: planUsage, isLoading: usageLoading } = useQuery({
    queryKey: ['agency-plan-usage', agencyId],
    queryFn: () => agenciesAPI.getPlanUsage(agencyId!),
    enabled: !!agencyId && canViewPlan,
  });

  const { data: frozenEntities } = useQuery({
    queryKey: ['agency-frozen-entities', agencyId],
    queryFn: () => agenciesAPI.getFrozenEntities(agencyId!),
    enabled: !!agencyId && canViewPlan,
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

  // Load CRECI from agency data when available
  useEffect(() => {
    if (agency?.creci) {
      setCreci(agency.creci);
    }
    if (agency?.creciState) {
      setCreciState(agency.creciState);
    }
  }, [agency?.creci, agency?.creciState]);

  // Save CRECI function
  const handleSaveCreci = async () => {
    if (!agencyId || !creci.trim()) {
      toast.error('CRECI é obrigatório');
      return;
    }

    setSavingCreci(true);
    try {
      await agenciesAPI.updateAgency(agencyId, { creci, creciState });
      queryClient.invalidateQueries({ queryKey: ['agency', agencyId] });
      toast.success('CRECI salvo com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar CRECI');
    } finally {
      setSavingCreci(false);
    }
  };

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
    if (!selectedPlan || !agencyId) return;

    setChangingPlan(true);
    try {
      const result = await agenciesAPI.changePlan(agencyId, selectedPlan);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['agency', agencyId] });
      queryClient.invalidateQueries({ queryKey: ['agency-plan-usage', agencyId] });
      queryClient.invalidateQueries({ queryKey: ['agency-frozen-entities', agencyId] });

      toast.success(result.message || 'Plano alterado com sucesso!');
      setShowUpgradeModal(false);
      setSelectedPlan(null);
      setPreviewData(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Erro ao alterar plano');
    } finally {
      setChangingPlan(false);
    }
  };

  const propertyPercent = planUsage?.contracts?.limit > 0
    ? Math.min(100, (planUsage.contracts.active / planUsage.contracts.limit) * 100)
    : 0;

  const userPercent = planUsage?.users?.limit > 0
    ? Math.min(100, (planUsage.users.active / planUsage.users.limit) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-orange-100 rounded-lg">
          <Package className="w-6 h-6 text-orange-700" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Plano da Agência</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gerencie o plano e os limites da sua agência
          </p>
        </div>
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

      {/* CRECI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            CRECI da Imobiliária
          </CardTitle>
          <CardDescription>
            Configure o CRECI da sua imobiliária para uso automático nos contratos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="creci" className="flex items-center gap-1">
                Número do CRECI
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="creci"
                value={creci}
                onChange={(e) => setCreci(e.target.value)}
                placeholder="Ex: 123456 ou CRECI-SP 123456-J"
                className={!creci ? 'border-amber-300' : ''}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Obrigatório por lei (Lei 6.530/78) para validade dos contratos
              </p>
            </div>
            <div>
              <Label htmlFor="creciState">Estado</Label>
              <Input
                id="creciState"
                value={creciState}
                onChange={(e) => setCreciState(e.target.value.toUpperCase())}
                placeholder="SP"
                maxLength={2}
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div>
              {agency?.creci ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Check className="w-3 h-3 mr-1" /> CRECI Configurado
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-600">
                  <AlertTriangle className="w-3 h-3 mr-1" /> CRECI Pendente
                </Badge>
              )}
            </div>
            <Button onClick={handleSaveCreci} disabled={savingCreci || !creci.trim()}>
              {savingCreci ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar CRECI
            </Button>
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
                {planUsage?.contracts?.active || 0} / {planUsage?.contracts?.limit === -1 ? 'Ilimitado' : planUsage?.contracts?.limit || 0}
              </span>
            </div>
            {planUsage?.contracts?.limit !== -1 && (
              <Progress value={propertyPercent} className="h-3" />
            )}
            {(planUsage?.contracts?.frozen || 0) > 0 && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg">
                <Lock className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-800">
                  {planUsage.contracts.frozen} imóvel(eis) congelado(s)
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

      {}
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

      {}
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

      {}
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
              const isPlanUpgrade = isUpgrade(currentPlanName, plan.name);

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
                      variant={isCurrentPlan ? 'outline' : isPlanUpgrade ? 'default' : 'secondary'}
                      disabled={isCurrentPlan || loadingPreview}
                      onClick={() => handlePreviewPlanChange(plan.name.toUpperCase())}
                    >
                      {loadingPreview && selectedPlan === plan.name.toUpperCase() ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : isCurrentPlan ? (
                        'Plano Atual'
                      ) : isPlanUpgrade ? (
                        <>
                          <ArrowUpCircle className="w-4 h-4 mr-2" />
                          Fazer Upgrade
                        </>
                      ) : (
                        <>
                          <ArrowDownCircle className="w-4 h-4 mr-2" />
                          Fazer Downgrade
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
                    {previewData.currentLimits?.properties === -1 ? 'Ilimitado' : (previewData.currentLimits?.properties ?? 0)}
                    {' '}&rarr;{' '}
                    {previewData.newLimits?.properties === -1 ? 'Ilimitado' : (previewData.newLimits?.properties ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Limite de Usuários</span>
                  <span>
                    {previewData.currentLimits?.users === -1 ? 'Ilimitado' : (previewData.currentLimits?.users ?? 0)}
                    {' '}&rarr;{' '}
                    {previewData.newLimits?.users === -1 ? 'Ilimitado' : (previewData.newLimits?.users ?? 0)}
                  </span>
                </div>
              </div>

              {(previewData.willUnfreeze?.properties ?? 0) > 0 || (previewData.willUnfreeze?.users ?? 0) > 0 ? (
                <Alert className="border-green-300 bg-green-50">
                  <Unlock className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 text-sm">
                    {(previewData.willUnfreeze?.properties ?? 0) > 0 && (
                      <span>{previewData.willUnfreeze?.properties} imóvel(eis) serão desbloqueados. </span>
                    )}
                    {(previewData.willUnfreeze?.users ?? 0) > 0 && (
                      <span>{previewData.willUnfreeze?.users} usuário(s) serão reativados.</span>
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}

              {(previewData.willFreeze?.properties ?? 0) > 0 || (previewData.willFreeze?.users ?? 0) > 0 ? (
                <Alert className="border-amber-300 bg-amber-50">
                  <Lock className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-sm">
                    {(previewData.willFreeze?.properties ?? 0) > 0 && (
                      <span>{previewData.willFreeze?.properties} imóvel(eis) serão congelados. </span>
                    )}
                    {(previewData.willFreeze?.users ?? 0) > 0 && (
                      <span>{previewData.willFreeze?.users} usuário(s) serão desativados.</span>
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeModal(false)} disabled={changingPlan}>
              Cancelar
            </Button>
            <Button onClick={handleRequestPlanChange} disabled={changingPlan}>
              {changingPlan ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Alterando...
                </>
              ) : (
                'Confirmar Mudança'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AgencyPlanConfig;
