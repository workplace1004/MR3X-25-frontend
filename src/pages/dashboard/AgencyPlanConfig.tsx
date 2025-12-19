import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { agenciesAPI, plansAPI, usersAPI } from '../../api';

// Storage key for pending payment
const PENDING_PAYMENT_KEY = 'pending_plan_payment';
import { getRoleLabel } from '../../lib/role-utils';
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
  CreditCard,
  QrCode,
  Copy,
  ExternalLink,
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

interface PaymentData {
  requiresPayment: boolean;
  paymentId?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  value?: number;
  dueDate?: string;
  currentPlan?: string;
  newPlan?: string;
  message?: string;
}

const getPlanNameInPortuguese = (name?: string | null) => {
  if (!name) return 'Desconhecido';
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PlanChangePreview | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const canViewPlan = hasPermission('agencies:read') || user?.role === 'AGENCY_ADMIN';
  const agencyId = user?.agencyId;

  // Function to check payment status and confirm plan upgrade
  const checkPaymentStatus = useCallback(async (paymentId: string, newPlan: string, showToast = true) => {
    if (!agencyId) return false;

    setCheckingPayment(true);
    try {
      // Call the confirm endpoint which will check Asaas and update the plan
      const result = await agenciesAPI.confirmPlanPayment(agencyId, paymentId, newPlan);

      if (result.success) {
        // Clear pending payment from storage
        localStorage.removeItem(PENDING_PAYMENT_KEY);

        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['agency', agencyId] });
        queryClient.invalidateQueries({ queryKey: ['agency-plan-usage', agencyId] });

        // Close modals and reset state
        setShowPaymentModal(false);
        setPaymentData(null);
        setSelectedPlan(null);

        toast.success(`Plano atualizado para ${getPlanNameInPortuguese(newPlan)} com sucesso!`);
        return true;
      } else {
        // Payment not confirmed yet - silently continue (no toast during polling)
        return false;
      }
    } catch (error: any) {
      // Check if this is a "payment not confirmed" error - don't show toast for this during polling
      const errorMessage = error.response?.data?.message || '';
      const isPaymentPending = errorMessage.includes('não confirmado') ||
                               errorMessage.includes('not confirmed') ||
                               errorMessage.includes('PENDING');

      if (!isPaymentPending && showToast) {
        // Only show toast for actual errors, not for "payment pending"
        toast.error(errorMessage || 'Erro ao verificar pagamento');
      }
      return false;
    } finally {
      setCheckingPayment(false);
    }
  }, [agencyId, queryClient]);

  // Check for pending payment on component mount - DISABLED
  useEffect(() => {
    // Clear any old pending payment data
    localStorage.removeItem(PENDING_PAYMENT_KEY);
  }, []);

  // Auto-check payment status when payment modal is open (polling every 5 seconds)
  useEffect(() => {
    if (!showPaymentModal || !paymentData?.paymentId || !selectedPlan) return;

    let isChecking = false;
    const checkPayment = async () => {
      if (isChecking || checkingPayment) return;
      isChecking = true;
      await checkPaymentStatus(paymentData.paymentId!, selectedPlan, false);
      isChecking = false;
    };

    // Check immediately when modal opens
    checkPayment();

    // Set up polling interval (every 5 seconds)
    const intervalId = setInterval(checkPayment, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [showPaymentModal, paymentData?.paymentId, selectedPlan, checkPaymentStatus, checkingPayment]);

  // Check payment when window gets focus (user returns from payment page)
  useEffect(() => {
    if (!paymentData?.paymentId || !selectedPlan) return;

    const handleFocus = async () => {
      // Small delay to ensure page is fully focused
      setTimeout(async () => {
        await checkPaymentStatus(paymentData.paymentId!, selectedPlan, false);
      }, 500);
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && paymentData?.paymentId && selectedPlan) {
        setTimeout(async () => {
          await checkPaymentStatus(paymentData.paymentId!, selectedPlan, false);
        }, 500);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [paymentData?.paymentId, selectedPlan, checkPaymentStatus]);

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

  // Fetch actual user counts
  const { data: brokers = [] } = useQuery({
    queryKey: ['agency-brokers-count', agencyId],
    queryFn: async () => {
      const response = await usersAPI.listUsers({ role: 'BROKER', pageSize: 100 });
      const agencyIdStr = agencyId?.toString();
      return (response.items || []).filter((broker: any) => 
        !broker.isFrozen && !broker.deleted && broker.agencyId?.toString() === agencyIdStr
      );
    },
    enabled: !!agencyId && canViewPlan,
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ['agency-tenants-count', agencyId],
    queryFn: async () => {
      const data = await usersAPI.getTenants();
      const agencyIdStr = agencyId?.toString();
      return (Array.isArray(data) ? data : []).filter((tenant: any) => 
        !tenant.isFrozen && !tenant.deleted && tenant.agencyId?.toString() === agencyIdStr
      );
    },
    enabled: !!agencyId && canViewPlan,
  });

  const { data: managers = [] } = useQuery({
    queryKey: ['agency-managers-count', agencyId],
    queryFn: async () => {
      const response = await usersAPI.listUsers({ role: 'AGENCY_MANAGER', pageSize: 100 });
      const agencyIdStr = agencyId?.toString();
      return (response.items || []).filter((manager: any) => 
        !manager.isFrozen && !manager.deleted && manager.agencyId?.toString() === agencyIdStr
      );
    },
    enabled: !!agencyId && canViewPlan,
  });

  const { data: owners = [] } = useQuery({
    queryKey: ['agency-owners-count', agencyId],
    queryFn: async () => {
      const response = await usersAPI.listUsers({ role: 'PROPRIETARIO', pageSize: 100 });
      const agencyIdStr = agencyId?.toString();
      return (response.items || []).filter((owner: any) => 
        !owner.isFrozen && !owner.deleted && owner.agencyId?.toString() === agencyIdStr
      );
    },
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
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
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

    // For upgrades, we need to create a payment first
    if (previewData?.isUpgrade) {
      setCreatingPayment(true);
      try {
        const paymentResult = await agenciesAPI.createPlanPayment(agencyId, selectedPlan);

        if (paymentResult.requiresPayment) {
          // Save pending payment to localStorage for recovery after payment
          localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify({
            agencyId,
            paymentId: paymentResult.paymentId,
            newPlan: selectedPlan,
            invoiceUrl: paymentResult.invoiceUrl,
            value: paymentResult.value,
            createdAt: new Date().toISOString(),
          }));

          // Show payment modal
          setPaymentData(paymentResult);
          setShowUpgradeModal(false);
          setShowPaymentModal(true);
        } else {
          // No payment required (shouldn't happen for upgrades, but handle it)
          await handleDirectPlanChange();
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || error.message || 'Erro ao criar pagamento');
      } finally {
        setCreatingPayment(false);
      }
    } else {
      // For downgrades, change plan directly
      await handleDirectPlanChange();
    }
  };

  const handleDirectPlanChange = async () => {
    if (!selectedPlan || !agencyId) return;

    setChangingPlan(true);
    try {
      const result = await agenciesAPI.changePlan(agencyId, selectedPlan);

      queryClient.invalidateQueries({ queryKey: ['agency', agencyId] });
      queryClient.invalidateQueries({ queryKey: ['agency-plan-usage', agencyId] });
      queryClient.invalidateQueries({ queryKey: ['agency-frozen-entities', agencyId] });

      toast.success(result.message || 'Plano alterado com sucesso!');
      setShowUpgradeModal(false);
      setShowPaymentModal(false);
      setSelectedPlan(null);
      setPreviewData(null);
      setPaymentData(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Erro ao alterar plano');
    } finally {
      setChangingPlan(false);
    }
  };

  const handleCopyPixCode = () => {
    if (paymentData?.pixCopyPaste) {
      navigator.clipboard.writeText(paymentData.pixCopyPaste);
      toast.success('Código PIX copiado para a área de transferência');
    }
  };

  const handleOpenInvoice = () => {
    if (paymentData?.invoiceUrl) {
      window.open(paymentData.invoiceUrl, '_blank');
    }
  };

  const propertyPercent = planUsage?.contracts?.limit > 0
    ? Math.min(100, (planUsage.contracts.active / planUsage.contracts.limit) * 100)
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {}
        <Card className="relative overflow-visible lg:col-span-2">
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
              <div className="flex items-center justify-between">
                <span className="text-sm">Corretores:</span>
                <Badge variant="outline">
                  {currentPlanData?.brokerLimit || currentPlanData?.maxBrokers || 1}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Gerentes:</span>
                <Badge variant="outline">
                  {currentPlanData?.managerLimit || currentPlanData?.maxManagers || 1}
                </Badge>
              </div>
            </div>

            {/* Free Usage Limits Display */}
            <div className="space-y-2 border-t pt-2">
              <h4 className="text-sm font-semibold">Limites Gratuitos/mês:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Vistorias:</span>
                  <Badge variant="secondary" className="text-xs">
                    {currentPlanData?.freeInspections === -1 ? '∞' : (currentPlanData?.freeInspections ?? 0)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Análises:</span>
                  <Badge variant="secondary" className="text-xs">
                    {currentPlanData?.freeSearches === -1 ? '∞' : (currentPlanData?.freeSearches ?? 0)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Acordos:</span>
                  <Badge variant="secondary" className="text-xs">
                    {currentPlanData?.freeSettlements === -1 ? '∞' : (currentPlanData?.freeSettlements ?? 0)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">API:</span>
                  <Badge variant="secondary" className="text-xs">
                    {currentPlanData?.freeApiCalls === -1 ? '∞' : (currentPlanData?.freeApiCalls ?? 0)}
                  </Badge>
                </div>
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
        <div className="flex flex-col gap-6 lg:col-span-1">
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Uso de Usuários
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {/* Inquilinos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Inquilinos</span>
                    <span className="font-medium">
                      {tenants.length} / {currentPlanData?.tenantLimit === -1 ? 'Ilimitado' : currentPlanData?.tenantLimit || currentPlanData?.maxTenants || currentPlanData?.propertyLimit || 0}
                    </span>
                  </div>
                  {currentPlanData?.tenantLimit !== -1 && (currentPlanData?.tenantLimit || currentPlanData?.maxTenants || currentPlanData?.propertyLimit) && (
                    <Progress 
                      value={currentPlanData?.tenantLimit ? Math.min(100, (tenants.length / (currentPlanData.tenantLimit || 1)) * 100) : 0} 
                      className="h-2" 
                    />
                  )}
                </div>

                {/* Proprietários */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Proprietários</span>
                    <span className="font-medium">
                      {owners.length} / {currentPlanData?.ownerLimit === -1 ? 'Ilimitado' : currentPlanData?.ownerLimit || currentPlanData?.maxOwners || currentPlanData?.propertyLimit || 0}
                    </span>
                  </div>
                  {currentPlanData?.ownerLimit !== -1 && (currentPlanData?.ownerLimit || currentPlanData?.maxOwners || currentPlanData?.propertyLimit) && (
                    <Progress 
                      value={currentPlanData?.ownerLimit ? Math.min(100, (owners.length / (currentPlanData.ownerLimit || 1)) * 100) : 0} 
                      className="h-2" 
                    />
                  )}
                </div>

                {/* Corretores */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Corretores</span>
                    <span className="font-medium">
                      {brokers.length} / {currentPlanData?.brokerLimit === -1 ? 'Ilimitado' : currentPlanData?.brokerLimit || currentPlanData?.maxBrokers || 1}
                    </span>
                  </div>
                  {currentPlanData?.brokerLimit !== -1 && currentPlanData?.brokerLimit && (
                    <Progress 
                      value={currentPlanData?.brokerLimit ? Math.min(100, (brokers.length / (currentPlanData.brokerLimit || 1)) * 100) : 0} 
                      className="h-2" 
                    />
                  )}
                </div>

                {/* Gerentes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Gerentes</span>
                    <span className="font-medium">
                      {managers.length} / {currentPlanData?.managerLimit === -1 ? 'Ilimitado' : currentPlanData?.managerLimit || currentPlanData?.maxManagers || 1}
                    </span>
                  </div>
                  {currentPlanData?.managerLimit !== -1 && currentPlanData?.managerLimit && (
                    <Progress 
                      value={currentPlanData?.managerLimit ? Math.min(100, (managers.length / (currentPlanData.managerLimit || 1)) * 100) : 0} 
                      className="h-2" 
                    />
                  )}
                </div>
              </div>

              {planUsage?.users?.frozen > 0 && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border-t pt-3 mt-3">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-800">
                    {planUsage.users.frozen} usuário(s) congelado(s)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
              Usuários Congelados
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
                    <p className="text-sm text-muted-foreground">{getRoleLabel(user.role)}</p>
                  </div>
                  <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800">
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
      {plans.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">Nenhum plano encontrado</p>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Planos Disponíveis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Corretores:</span>
                        <Badge variant="outline">
                          {plan.brokerLimit || plan.maxBrokers || 1}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Gerentes:</span>
                        <Badge variant="outline">
                          {plan.managerLimit || plan.maxManagers || 1}
                        </Badge>
                      </div>
                    </div>

                    {/* Free Usage Limits Display */}
                    <div className="space-y-2 border-t pt-2">
                      <h4 className="text-sm font-semibold">Limites Gratuitos/mês:</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Vistorias:</span>
                          <Badge variant="secondary" className="text-xs">
                            {plan.freeInspections === -1 ? '∞' : (plan.freeInspections ?? 0)}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Análises:</span>
                          <Badge variant="secondary" className="text-xs">
                            {plan.freeSearches === -1 ? '∞' : (plan.freeSearches ?? 0)}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Acordos:</span>
                          <Badge variant="secondary" className="text-xs">
                            {plan.freeSettlements === -1 ? '∞' : (plan.freeSettlements ?? 0)}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">API:</span>
                          <Badge variant="secondary" className="text-xs">
                            {plan.freeApiCalls === -1 ? '∞' : (plan.freeApiCalls ?? 0)}
                          </Badge>
                        </div>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewData && !previewData.isUpgrade ? (
                <>
                  <ArrowDownCircle className="w-5 h-5 text-amber-600" />
                  Confirmar Downgrade de Plano
                </>
              ) : (
                <>
                  <ArrowUpCircle className="w-5 h-5 text-green-600" />
                  Confirmar Upgrade de Plano
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {previewData && !previewData.isUpgrade
                ? 'Atenção: O downgrade pode afetar seus recursos ativos'
                : 'Revise as alterações antes de confirmar'
              }
            </DialogDescription>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">De</p>
                  <p className="font-medium">{getPlanNameInPortuguese(previewData.currentPlan)}</p>
                </div>
                {previewData.isUpgrade ? (
                  <ArrowUpCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <ArrowDownCircle className="w-5 h-5 text-amber-500" />
                )}
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Para</p>
                  <p className="font-medium">{getPlanNameInPortuguese(previewData.newPlan)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Limite de Contratos Ativos</span>
                  <span className={!previewData.isUpgrade && (previewData.newLimits?.properties ?? 0) < (previewData.currentLimits?.properties ?? 0) ? 'text-amber-600 font-medium' : ''}>
                    {previewData.currentLimits?.properties === -1 ? 'Ilimitado' : (previewData.currentLimits?.properties ?? 0)}
                    {' '}&rarr;{' '}
                    {previewData.newLimits?.properties === -1 ? 'Ilimitado' : (previewData.newLimits?.properties ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Limite de Usuários</span>
                  <span className={!previewData.isUpgrade && (previewData.newLimits?.users ?? 0) < (previewData.currentLimits?.users ?? 0) ? 'text-amber-600 font-medium' : ''}>
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
                      <span>{previewData.willUnfreeze?.properties} contrato(s) serão desbloqueados. </span>
                    )}
                    {(previewData.willUnfreeze?.users ?? 0) > 0 && (
                      <span>{previewData.willUnfreeze?.users} usuário(s) serão reativados.</span>
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}

              {!previewData.isUpgrade && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-semibold text-sm">Consequências do Downgrade</span>
                  </div>

                  <div className="bg-gray-100 border rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-700">Situação Atual:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Contratos ativos:</span>
                        <span className="font-medium">{previewData.currentUsage?.properties ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Usuários ativos:</span>
                        <span className="font-medium">{previewData.currentUsage?.users ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
                    {(previewData.willFreeze?.properties ?? 0) > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <p className="text-sm font-semibold text-amber-800">Contratos</p>
                        </div>
                        <div className="ml-6 space-y-1">
                          <div className="flex items-center justify-between text-xs bg-white/50 p-2 rounded">
                            <span className="text-gray-600">Você tem atualmente:</span>
                            <span className="font-bold text-gray-800">{previewData.currentUsage?.properties ?? 0} contratos ativos</span>
                          </div>
                          <div className="flex items-center justify-between text-xs bg-white/50 p-2 rounded">
                            <span className="text-gray-600">Novo limite do plano:</span>
                            <span className="font-bold text-amber-700">{previewData.newLimits?.properties ?? 0} contratos</span>
                          </div>
                          <div className="flex items-center justify-between text-xs bg-red-100 p-2 rounded border border-red-200">
                            <span className="text-red-700 font-medium">Serão congelados:</span>
                            <span className="font-bold text-red-700">{previewData.willFreeze?.properties} contrato(s)</span>
                          </div>
                          <div className="flex items-center justify-between text-xs bg-green-100 p-2 rounded border border-green-200">
                            <span className="text-green-700 font-medium">Permanecerão ativos:</span>
                            <span className="font-bold text-green-700">{previewData.newLimits?.properties ?? 0} contrato(s) mais antigos</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {(previewData.willFreeze?.users ?? 0) > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <p className="text-sm font-semibold text-amber-800">Usuários</p>
                        </div>
                        <div className="ml-6 space-y-1">
                          <div className="flex items-center justify-between text-xs bg-white/50 p-2 rounded">
                            <span className="text-gray-600">Você tem atualmente:</span>
                            <span className="font-bold text-gray-800">{previewData.currentUsage?.users ?? 0} usuários ativos</span>
                          </div>
                          <div className="flex items-center justify-between text-xs bg-white/50 p-2 rounded">
                            <span className="text-gray-600">Novo limite do plano:</span>
                            <span className="font-bold text-amber-700">{previewData.newLimits?.users ?? 0} usuários</span>
                          </div>
                          <div className="flex items-center justify-between text-xs bg-red-100 p-2 rounded border border-red-200">
                            <span className="text-red-700 font-medium">Serão congelados:</span>
                            <span className="font-bold text-red-700">{previewData.willFreeze?.users} usuário(s)</span>
                          </div>
                          <div className="flex items-center justify-between text-xs bg-green-100 p-2 rounded border border-green-200">
                            <span className="text-green-700 font-medium">Permanecerão ativos:</span>
                            <span className="font-bold text-green-700">{previewData.newLimits?.users ?? 0} usuário(s) mais antigos</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {(previewData.willFreeze?.properties ?? 0) === 0 && (previewData.willFreeze?.users ?? 0) === 0 && (
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-amber-800">
                            Nenhum recurso será congelado no momento. No entanto, você terá limites menores.
                            Se no futuro exceder esses limites, novos itens serão automaticamente congelados.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground font-medium mb-2">O que acontece após o downgrade:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-gray-400" />
                        Recursos congelados ficam inacessíveis até fazer upgrade
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-gray-400" />
                        Contratos congelados não podem ser editados ou gerar cobranças
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-gray-400" />
                        Usuários congelados não podem fazer login no sistema
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-gray-400" />
                        Dados não são excluídos, apenas ficam inacessíveis
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {previewData.isUpgrade && ((previewData.willFreeze?.properties ?? 0) > 0 || (previewData.willFreeze?.users ?? 0) > 0) && (
                <Alert className="border-amber-300 bg-amber-50">
                  <Lock className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-sm">
                    {(previewData.willFreeze?.properties ?? 0) > 0 && (
                      <span>{previewData.willFreeze?.properties} contrato(s) serão congelados. </span>
                    )}
                    {(previewData.willFreeze?.users ?? 0) > 0 && (
                      <span>{previewData.willFreeze?.users} usuário(s) serão congelados.</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowUpgradeModal(false)} disabled={changingPlan || creatingPayment}>
              Cancelar
            </Button>
            <Button
              onClick={handleRequestPlanChange}
              disabled={changingPlan || creatingPayment}
              variant={previewData && !previewData.isUpgrade ? 'destructive' : 'default'}
            >
              {changingPlan || creatingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {creatingPayment ? 'Criando pagamento...' : 'Alterando...'}
                </>
              ) : previewData && !previewData.isUpgrade ? (
                'Confirmar Downgrade'
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Continuar para Pagamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              Pagamento do Plano
            </DialogTitle>
            <DialogDescription>
              Complete o pagamento para ativar seu novo plano
            </DialogDescription>
          </DialogHeader>
          {paymentData && (
            <div className="space-y-4">
              {/* Plan Change Summary */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plano atual:</span>
                  <span className="font-medium">{paymentData.currentPlan}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Novo plano:</span>
                  <span className="font-medium text-green-600">{paymentData.newPlan}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-sm font-semibold">Valor:</span>
                  <span className="text-xl font-bold text-green-600">
                    R$ {paymentData.value?.toFixed(2)}
                  </span>
                </div>
                {paymentData.dueDate && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Vencimento:</span>
                    <span>{new Date(paymentData.dueDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </div>

              {/* Payment Options */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Opções de Pagamento:</h4>

                {/* PIX Option */}
                {paymentData.pixQrCode && (
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-green-600" />
                      <span className="font-semibold">PIX</span>
                      <Badge className="bg-green-100 text-green-800 text-xs">Aprovação instantânea</Badge>
                    </div>
                    <div className="flex justify-center">
                      <img
                        src={`data:image/png;base64,${paymentData.pixQrCode}`}
                        alt="QR Code PIX"
                        className="w-40 h-40 border rounded"
                      />
                    </div>
                    {paymentData.pixCopyPaste && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleCopyPixCode}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar código PIX
                      </Button>
                    )}
                  </div>
                )}

                {/* Invoice/Boleto Option */}
                {paymentData.invoiceUrl && (
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold">Boleto ou Cartão</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Acesse a fatura para pagar via boleto bancário ou cartão de crédito.
                    </p>
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={handleOpenInvoice}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Acessar Fatura
                    </Button>
                  </div>
                )}
              </div>

              {/* Important Notice */}
              <Alert className="border-blue-300 bg-blue-50">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <p className="font-medium">Importante:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                    <li>Seu plano será ativado automaticamente após a confirmação do pagamento</li>
                    <li>Pagamentos via PIX são confirmados em segundos</li>
                    <li>Pagamentos via boleto podem levar até 3 dias úteis</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPaymentModal(false);
                setPaymentData(null);
                setSelectedPlan(null);
              }}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AgencyPlanConfig;
