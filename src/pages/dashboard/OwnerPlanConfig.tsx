import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { plansAPI, usersAPI } from '../../api';

// Storage key for pending payment
const PENDING_PAYMENT_KEY = 'pending_owner_plan_payment';
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
      return 'Basico';
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

export function OwnerPlanConfig() {
  const { user } = useAuth();
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

  const canViewPlan = user?.role === 'INDEPENDENT_OWNER';
  const userId = user?.id;

  // Function to check payment status and confirm plan upgrade
  const checkPaymentStatus = useCallback(async (paymentId: string, newPlan: string, showToast = true) => {
    if (!userId) return false;

    setCheckingPayment(true);
    try {
      // Call the confirm endpoint which will check Asaas and update the plan
      const result = await plansAPI.confirmOwnerPlanPayment(userId, paymentId, newPlan);

      if (result.success) {
        // Clear pending payment from storage
        localStorage.removeItem(PENDING_PAYMENT_KEY);

        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['owner-details', userId] });
        queryClient.invalidateQueries({ queryKey: ['owner-plan-usage', userId] });

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
      const isPaymentPending = errorMessage.includes('nao confirmado') ||
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
  }, [userId, queryClient]);

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

  const { data: ownerData, isLoading: ownerLoading } = useQuery({
    queryKey: ['owner-details', userId],
    queryFn: () => usersAPI.getUserById(userId!),
    enabled: !!userId && canViewPlan,
  });

  const { data: planUsage, isLoading: usageLoading } = useQuery({
    queryKey: ['owner-plan-usage', userId],
    queryFn: () => plansAPI.getOwnerPlanUsage(userId!),
    enabled: !!userId && canViewPlan,
  });

  const { data: frozenEntities } = useQuery({
    queryKey: ['owner-frozen-entities', userId],
    queryFn: () => plansAPI.getOwnerFrozenEntities(userId!),
    enabled: !!userId && canViewPlan,
  });

  // Fetch actual tenant count
  const { data: tenants = [] } = useQuery({
    queryKey: ['owner-tenants-count', userId],
    queryFn: async () => {
      const data = await usersAPI.getTenants();
      return Array.isArray(data) ? data.filter((tenant: any) =>
        !tenant.isFrozen && !tenant.deleted
      ) : [];
    },
    enabled: !!userId && canViewPlan,
  });

  // Fetch owners (PROPRIETARIO) managed by this independent owner
  const { data: owners = [] } = useQuery({
    queryKey: ['owner-proprietarios-count', userId],
    queryFn: async () => {
      const response = await usersAPI.listUsers({ role: 'PROPRIETARIO', pageSize: 100 });
      const ownerIdStr = userId?.toString();
      return (response.items || []).filter((owner: any) =>
        !owner.isFrozen && !owner.deleted && owner.ownerId?.toString() === ownerIdStr
      );
    },
    enabled: !!userId && canViewPlan,
  });

  // Fetch brokers managed by this independent owner
  const { data: brokers = [] } = useQuery({
    queryKey: ['owner-brokers-count', userId],
    queryFn: async () => {
      const response = await usersAPI.listUsers({ role: 'BROKER', pageSize: 100 });
      const ownerIdStr = userId?.toString();
      return (response.items || []).filter((broker: any) =>
        !broker.isFrozen && !broker.deleted && broker.ownerId?.toString() === ownerIdStr
      );
    },
    enabled: !!userId && canViewPlan,
  });

  // Fetch managers managed by this independent owner
  const { data: managers = [] } = useQuery({
    queryKey: ['owner-managers-count', userId],
    queryFn: async () => {
      const response = await usersAPI.listUsers({ role: 'AGENCY_MANAGER', pageSize: 100 });
      const ownerIdStr = userId?.toString();
      return (response.items || []).filter((manager: any) =>
        !manager.isFrozen && !manager.deleted && manager.ownerId?.toString() === ownerIdStr
      );
    },
    enabled: !!userId && canViewPlan,
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


  if (!canViewPlan || !userId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Voce nao tem permissao para visualizar esta pagina.</p>
        </div>
      </div>
    );
  }

  if (ownerLoading || usageLoading || plansLoading) {
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

  const currentPlanName = ownerData?.plan || 'FREE';

  const currentPlanData = plans.find((p: any) => p.name.toUpperCase() === currentPlanName.toUpperCase());
  const currentPlanColor = getPlanColor(currentPlanName);
  const CurrentPlanIcon = getPlanIcon(currentPlanName);

  const handlePreviewPlanChange = async (newPlan: string) => {
    if (!userId) return;

    setLoadingPreview(true);
    setSelectedPlan(newPlan);

    try {
      const preview = await plansAPI.previewOwnerPlanChange(userId, newPlan);
      setPreviewData(preview);
      setShowUpgradeModal(true);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar previa da mudanca de plano');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleRequestPlanChange = async () => {
    if (!selectedPlan || !userId) return;

    // For upgrades, we need to create a payment first
    if (previewData?.isUpgrade) {
      setCreatingPayment(true);
      try {
        const paymentResult = await plansAPI.createOwnerPlanPayment(userId, selectedPlan);

        if (paymentResult.requiresPayment) {
          // Save pending payment to localStorage for recovery after payment
          localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify({
            userId,
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
    if (!selectedPlan || !userId) return;

    setChangingPlan(true);
    try {
      const result = await plansAPI.changeOwnerPlan(userId, selectedPlan);

      queryClient.invalidateQueries({ queryKey: ['owner-details', userId] });
      queryClient.invalidateQueries({ queryKey: ['owner-plan-usage', userId] });
      queryClient.invalidateQueries({ queryKey: ['owner-frozen-entities', userId] });

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
      toast.success('Codigo PIX copiado para a area de transferencia');
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-orange-100 rounded-lg">
          <Package className="w-6 h-6 text-orange-700" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Meu Plano</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gerencie o seu plano e limites de uso
          </p>
        </div>
      </div>

      {/* Current Plan and Usage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan Card */}
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
                {currentPlanData?.price === 0 ? 'Gratis' : `R$ ${currentPlanData?.price?.toFixed(2) || '0.00'}`}
                {currentPlanData?.price > 0 && <span className="text-sm text-muted-foreground">/mes</span>}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Imoveis:</span>
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
                <span className="text-sm">Proprietarios:</span>
                <Badge variant="outline">
                  {currentPlanData?.ownerLimit || currentPlanData?.maxOwners || currentPlanData?.propertyLimit || 1}
                </Badge>
              </div>
            </div>

            {/* Free Usage Limits Display */}
            <div className="space-y-2 border-t pt-2">
              <h4 className="text-sm font-semibold">Limites Gratuitos/mes:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Vistorias:</span>
                  <Badge variant="secondary" className="text-xs">
                    {currentPlanData?.freeInspections === -1 ? '∞' : (currentPlanData?.freeInspections ?? 0)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Analises:</span>
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

        {/* Usage Cards */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Uso de Imoveis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Ativos</span>
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
                    {planUsage.contracts.frozen} imovel(eis) congelado(s)
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

      {/* Upgrade Required Alert */}
      {planUsage?.upgradeRequired && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <p className="font-medium mb-2">Voce tem itens congelados devido ao limite do seu plano.</p>
            <p className="text-sm">
              Faca upgrade para um plano maior para desbloquear todos os seus imoveis.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Frozen Properties */}
      {frozenEntities?.properties?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              Imoveis Congelados
            </CardTitle>
            <CardDescription>
              Estes imoveis estao inativos devido ao limite do seu plano
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

      {/* Frozen Tenants */}
      {frozenEntities?.tenants?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              Inquilinos Congelados
            </CardTitle>
            <CardDescription>
              Estes inquilinos estao inativos devido ao limite do seu plano
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {frozenEntities.tenants.map((tenant: any) => (
                <div key={tenant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{tenant.name || tenant.email}</p>
                    <p className="text-sm text-muted-foreground">Inquilino</p>
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

      {/* Available Plans */}
      {plans.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">Nenhum plano encontrado</p>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Planos Disponiveis</h2>
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
                        {plan.price === 0 ? 'Gratis' : `R$ ${plan.price.toFixed(2)}`}
                        {plan.price > 0 && <span className="text-sm text-muted-foreground">/mes</span>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Imoveis:</span>
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
                        <span className="text-sm">Proprietarios:</span>
                        <Badge variant="outline">
                          {plan.ownerLimit || plan.maxOwners || plan.propertyLimit}
                        </Badge>
                      </div>
                    </div>

                    {/* Free Usage Limits Display */}
                    <div className="space-y-2 border-t pt-2">
                      <h4 className="text-sm font-semibold">Limites Gratuitos/mes:</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Vistorias:</span>
                          <Badge variant="secondary" className="text-xs">
                            {plan.freeInspections === -1 ? '∞' : (plan.freeInspections ?? 0)}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Analises:</span>
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

      {/* Plan Change Preview Modal */}
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
                ? 'Atencao: O downgrade pode afetar seus recursos ativos'
                : 'Revise as alteracoes antes de confirmar'
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
                  <span>Limite de Imoveis</span>
                  <span className={!previewData.isUpgrade && (previewData.newLimits?.properties ?? 0) < (previewData.currentLimits?.properties ?? 0) ? 'text-amber-600 font-medium' : ''}>
                    {previewData.currentLimits?.properties === -1 ? 'Ilimitado' : (previewData.currentLimits?.properties ?? 0)}
                    {' '}&rarr;{' '}
                    {previewData.newLimits?.properties === -1 ? 'Ilimitado' : (previewData.newLimits?.properties ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Limite de Inquilinos</span>
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
                      <span>{previewData.willUnfreeze?.properties} imovel(eis) serao desbloqueados. </span>
                    )}
                    {(previewData.willUnfreeze?.users ?? 0) > 0 && (
                      <span>{previewData.willUnfreeze?.users} inquilino(s) serao reativados.</span>
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}

              {!previewData.isUpgrade && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-semibold text-sm">Consequencias do Downgrade</span>
                  </div>

                  <div className="bg-gray-100 border rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-700">Situacao Atual:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Imoveis ativos:</span>
                        <span className="font-medium">{previewData.currentUsage?.properties ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Inquilinos ativos:</span>
                        <span className="font-medium">{previewData.currentUsage?.users ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
                    {(previewData.willFreeze?.properties ?? 0) > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <p className="text-sm font-semibold text-amber-800">Imoveis</p>
                        </div>
                        <div className="ml-6 space-y-1">
                          <div className="flex items-center justify-between text-xs bg-white/50 p-2 rounded">
                            <span className="text-gray-600">Voce tem atualmente:</span>
                            <span className="font-bold text-gray-800">{previewData.currentUsage?.properties ?? 0} imoveis ativos</span>
                          </div>
                          <div className="flex items-center justify-between text-xs bg-white/50 p-2 rounded">
                            <span className="text-gray-600">Novo limite do plano:</span>
                            <span className="font-bold text-amber-700">{previewData.newLimits?.properties ?? 0} imoveis</span>
                          </div>
                          <div className="flex items-center justify-between text-xs bg-red-100 p-2 rounded border border-red-200">
                            <span className="text-red-700 font-medium">Serao congelados:</span>
                            <span className="font-bold text-red-700">{previewData.willFreeze?.properties} imovel(eis)</span>
                          </div>
                          <div className="flex items-center justify-between text-xs bg-green-100 p-2 rounded border border-green-200">
                            <span className="text-green-700 font-medium">Permanecerao ativos:</span>
                            <span className="font-bold text-green-700">{previewData.newLimits?.properties ?? 0} imovel(eis) mais antigos</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {(previewData.willFreeze?.users ?? 0) > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <p className="text-sm font-semibold text-amber-800">Inquilinos</p>
                        </div>
                        <div className="ml-6 space-y-1">
                          <div className="flex items-center justify-between text-xs bg-white/50 p-2 rounded">
                            <span className="text-gray-600">Voce tem atualmente:</span>
                            <span className="font-bold text-gray-800">{previewData.currentUsage?.users ?? 0} inquilinos ativos</span>
                          </div>
                          <div className="flex items-center justify-between text-xs bg-white/50 p-2 rounded">
                            <span className="text-gray-600">Novo limite do plano:</span>
                            <span className="font-bold text-amber-700">{previewData.newLimits?.users ?? 0} inquilinos</span>
                          </div>
                          <div className="flex items-center justify-between text-xs bg-red-100 p-2 rounded border border-red-200">
                            <span className="text-red-700 font-medium">Serao congelados:</span>
                            <span className="font-bold text-red-700">{previewData.willFreeze?.users} inquilino(s)</span>
                          </div>
                          <div className="flex items-center justify-between text-xs bg-green-100 p-2 rounded border border-green-200">
                            <span className="text-green-700 font-medium">Permanecerao ativos:</span>
                            <span className="font-bold text-green-700">{previewData.newLimits?.users ?? 0} inquilino(s) mais antigos</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {(previewData.willFreeze?.properties ?? 0) === 0 && (previewData.willFreeze?.users ?? 0) === 0 && (
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-amber-800">
                            Nenhum recurso sera congelado no momento. No entanto, voce tera limites menores.
                            Se no futuro exceder esses limites, novos itens serao automaticamente congelados.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground font-medium mb-2">O que acontece apos o downgrade:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-gray-400" />
                        Recursos congelados ficam inacessiveis ate fazer upgrade
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-gray-400" />
                        Imoveis congelados nao podem ser editados ou gerar cobrancas
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-gray-400" />
                        Inquilinos congelados nao podem fazer login no sistema
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-gray-400" />
                        Dados nao sao excluidos, apenas ficam inacessiveis
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
                      <span>{previewData.willFreeze?.properties} imovel(eis) serao congelados. </span>
                    )}
                    {(previewData.willFreeze?.users ?? 0) > 0 && (
                      <span>{previewData.willFreeze?.users} inquilino(s) serao congelados.</span>
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
                <h4 className="text-sm font-semibold">Opcoes de Pagamento:</h4>

                {/* PIX Option */}
                {paymentData.pixQrCode && (
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-green-600" />
                      <span className="font-semibold">PIX</span>
                      <Badge className="bg-green-100 text-green-800 text-xs">Aprovacao instantanea</Badge>
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
                        Copiar codigo PIX
                      </Button>
                    )}
                  </div>
                )}

                {/* Invoice/Boleto Option */}
                {paymentData.invoiceUrl && (
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold">Boleto ou Cartao</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Acesse a fatura para pagar via boleto bancario ou cartao de credito.
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
                    <li>Seu plano sera ativado automaticamente apos a confirmacao do pagamento</li>
                    <li>Pagamentos via PIX sao confirmados em segundos</li>
                    <li>Pagamentos via boleto podem levar ate 3 dias uteis</li>
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

export default OwnerPlanConfig;
