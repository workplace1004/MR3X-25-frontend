import { useState, useEffect } from 'react';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  CreditCard,
  FileText,
  Check,
  X,
  AlertTriangle,
  Clock,
  RefreshCw,
  Key,
} from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { plansAPI } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

interface PlanConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  maxActiveContracts: number;
  maxInternalUsers: number;
  features: string[];
  isPopular: boolean;
}

interface UsageSummary {
  plan: string;
  billingMonth: string;
  extraContracts: { count: number; totalAmount: number };
  inspections: { count: number; totalAmount: number; included: boolean };
  settlements: { count: number; totalAmount: number; included: boolean };
  screenings: { count: number; totalAmount: number };
  totalPending: number;
  totalPaid: number;
}

interface PendingCharge {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
}

interface UpgradePreview {
  currentPlan: string;
  targetPlan: string;
  proratedAmount: number;
  newMonthlyPrice: number;
  daysRemaining: number;
  changes: {
    contracts: { current: number; new: number };
    users: { current: number; new: number };
    newFeatures: string[];
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const getPlanNameInPortuguese = (name: string) => {
  switch (name?.toUpperCase()) {
    case 'FREE':
      return 'Gratuito';
    case 'BASIC':
      return 'Básico';
    case 'ESSENTIAL':
      return 'Essencial';
    case 'PROFESSIONAL':
      return 'Profissional';
    case 'ENTERPRISE':
      return 'Empresarial';
    default:
      return name;
  }
};

const getPlanColor = (planName: string) => {
  switch (planName) {
    case 'FREE':
      return 'bg-gray-100 text-gray-700';
    case 'BASIC':
      return 'bg-blue-100 text-blue-700';
    case 'PROFESSIONAL':
      return 'bg-purple-100 text-purple-700';
    case 'ENTERPRISE':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export function SubscriptionPage() {
  const { user } = useAuthStore();
  const agencyId = user?.agencyId;

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [currentUsage, setCurrentUsage] = useState<any>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [pendingCharges, setPendingCharges] = useState<PendingCharge[]>([]);
  const [billingHistory, setBillingHistory] = useState<UsageSummary[]>([]);

  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [upgradePreview, setUpgradePreview] = useState<UpgradePreview | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const [apiAddOnLoading, setApiAddOnLoading] = useState(false);

  useEffect(() => {
    if (agencyId) {
      fetchData();
    }
  }, [agencyId]);

  const fetchData = async () => {
    if (!agencyId) return;

    try {
      setLoading(true);
      const [plansData, usageData, summaryData, chargesData, historyData] = await Promise.all([
        plansAPI.getPricing(),
        plansAPI.getAgencyUsage(agencyId),
        plansAPI.getUsageSummary(agencyId),
        plansAPI.getPendingCharges(agencyId),
        plansAPI.getBillingHistory(agencyId, 6),
      ]);

      setPlans(plansData);
      setCurrentUsage(usageData);
      setUsageSummary(summaryData);
      setPendingCharges(chargesData);
      setBillingHistory(historyData);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast.error('Erro ao carregar dados da assinatura');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = async (planName: string) => {
    if (!agencyId || planName === currentUsage?.plan) return;

    try {
      setUpgradeLoading(true);
      const preview = await plansAPI.calculateUpgrade(agencyId, planName);
      setUpgradePreview(preview);
      setSelectedPlan(planName);
      setUpgradeDialogOpen(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao calcular upgrade');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const confirmPlanChange = async () => {
    if (!agencyId || !selectedPlan) return;

    try {
      setUpgradeLoading(true);
      await plansAPI.changePlan(agencyId, selectedPlan);
      toast.success('Plano alterado com sucesso!');
      setUpgradeDialogOpen(false);
      setSelectedPlan(null);
      setUpgradePreview(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao alterar plano');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleApiAddOnToggle = async () => {
    if (!agencyId) return;

    try {
      setApiAddOnLoading(true);
      if (currentUsage?.features?.apiAddOnEnabled) {
        await plansAPI.disableApiAddOn(agencyId);
        toast.success('API add-on congelado');
      } else {
        await plansAPI.enableApiAddOn(agencyId);
        toast.success('API add-on ativado com sucesso!');
      }
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao alterar API add-on');
    } finally {
      setApiAddOnLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentPlan = plans.find((p) => p.name === currentUsage?.plan);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <PageHeader
        title="Gerenciar Assinatura"
        subtitle="Gerencie seu plano, visualize consumo e histórico de cobranças."
      />
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visao Geral</TabsTrigger>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="usage">Consumo</TabsTrigger>
          <TabsTrigger value="billing">Cobrancas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Plano Atual</span>
                  <Badge className={getPlanColor(currentUsage?.plan || 'FREE')}>
                    {getPlanNameInPortuguese(currentUsage?.plan || 'FREE')}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {currentPlan?.description || 'Plano gratuito para testar'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">
                  {formatCurrency(currentUsage?.billing?.monthlyPrice || 0)}
                  <span className="text-sm font-normal text-muted-foreground">/mes</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Contratos</span>
                    <span>
                      {currentUsage?.contracts?.current || 0} /{' '}
                      {currentUsage?.contracts?.limit || 0}
                    </span>
                  </div>
                  <Progress
                    value={
                      currentUsage?.contracts?.limit > 0
                        ? (currentUsage?.contracts?.current /
                            currentUsage?.contracts?.limit) *
                          100
                        : 0
                    }
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Usuarios</span>
                    <span>
                      {currentUsage?.users?.current || 0} /{' '}
                      {currentUsage?.users?.limit >= 9999
                        ? '∞'
                        : currentUsage?.users?.limit || 0}
                    </span>
                  </div>
                  {currentUsage?.users?.limit < 9999 && (
                    <Progress
                      value={
                        currentUsage?.users?.limit > 0
                          ? (currentUsage?.users?.current /
                              currentUsage?.users?.limit) *
                            100
                          : 0
                      }
                      className="h-2"
                    />
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const tabTrigger = document.querySelector(
                      '[data-state="inactive"][value="plans"]'
                    );
                    if (tabTrigger) (tabTrigger as HTMLElement).click();
                  }}
                >
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Ver Planos
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Resumo do Mes
                </CardTitle>
                <CardDescription>
                  {usageSummary?.billingMonth || 'Mes atual'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Pendente</p>
                    <p className="text-xl font-bold text-amber-600">
                      {formatCurrency(usageSummary?.totalPending || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pago</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(usageSummary?.totalPaid || 0)}
                    </p>
                  </div>
                </div>

                {pendingCharges.length > 0 && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      Voce tem {pendingCharges.length} cobranca(s) pendente(s)
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Detalhes
                </Button>
              </CardFooter>
            </Card>

            {currentUsage?.plan === 'PROFESSIONAL' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    API Add-on
                  </CardTitle>
                  <CardDescription>
                    Acesso a API para integracoes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {currentUsage?.features?.apiAddOnEnabled
                          ? 'Ativado'
                          : 'Congelado'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        +{formatCurrency(currentUsage?.billing?.apiAddOnPrice || 29)}/mes
                      </p>
                    </div>
                    <Badge
                      variant={
                        currentUsage?.features?.apiAddOnEnabled
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {currentUsage?.features?.apiAddOnEnabled
                        ? 'Ativo'
                        : 'Inativo'}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant={
                      currentUsage?.features?.apiAddOnEnabled
                        ? 'destructive'
                        : 'default'
                    }
                    className="w-full"
                    onClick={handleApiAddOnToggle}
                    disabled={apiAddOnLoading}
                  >
                    {apiAddOnLoading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : currentUsage?.features?.apiAddOnEnabled ? (
                      'Desativar API'
                    ) : (
                      'Ativar API'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {(currentUsage?.contracts?.frozen > 0 ||
              currentUsage?.users?.frozen > 0) && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="w-5 h-5" />
                    Itens Congelados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-amber-800">
                  {currentUsage?.contracts?.frozen > 0 && (
                    <p>
                      {currentUsage.contracts.frozen} contrato(s) congelado(s)
                    </p>
                  )}
                  {currentUsage?.users?.frozen > 0 && (
                    <p>{currentUsage.users.frozen} usuario(s) congelado(s)</p>
                  )}
                  <p className="text-sm">
                    Faca upgrade para desbloquear todos os itens.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handlePlanSelect('BASIC')}
                  >
                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                    Fazer Upgrade
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const isCurrent = plan.name === currentUsage?.plan;
              const isUpgrade =
                plan.price > (currentUsage?.billing?.monthlyPrice || 0);

              return (
                <Card
                  key={plan.id}
                  className={`relative ${
                    isCurrent ? 'border-primary ring-2 ring-primary' : ''
                  } ${plan.isPopular ? 'border-blue-500' : ''}`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge>Plano Atual</Badge>
                    </div>
                  )}
                  {plan.isPopular && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge variant="secondary">Mais Popular</Badge>
                    </div>
                  )}

                  <CardHeader>
                    <CardTitle>{getPlanNameInPortuguese(plan.name)}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="text-3xl font-bold">
                      {formatCurrency(plan.price)}
                      <span className="text-sm font-normal text-muted-foreground">
                        /mes
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>{plan.maxActiveContracts} contratos ativos</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>
                          {plan.maxInternalUsers === -1
                            ? 'Usuarios ilimitados'
                            : `${plan.maxInternalUsers} usuarios`}
                        </span>
                      </div>
                      {plan.features.slice(2, 6).map((feature, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Check className="w-4 h-4 text-green-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>

                  <CardFooter>
                    {isCurrent ? (
                      <Button variant="secondary" className="w-full" disabled>
                        Plano Atual
                      </Button>
                    ) : (
                      <Button
                        variant={isUpgrade ? 'default' : 'outline'}
                        className="w-full"
                        onClick={() => handlePlanSelect(plan.name)}
                        disabled={upgradeLoading}
                      >
                        {isUpgrade ? (
                          <>
                            <ArrowUpCircle className="w-4 h-4 mr-2" />
                            Upgrade
                          </>
                        ) : (
                          <>
                            <ArrowDownCircle className="w-4 h-4 mr-2" />
                            Downgrade
                          </>
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Consumo do Mes</CardTitle>
              <CardDescription>
                Detalhes do consumo de {usageSummary?.billingMonth || 'mes atual'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead className="text-center">Incluido no Plano</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      Contratos Extras
                    </TableCell>
                    <TableCell className="text-center">
                      {usageSummary?.extraContracts?.count || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      <X className="w-4 h-4 text-red-500 mx-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(usageSummary?.extraContracts?.totalAmount || 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Vistorias</TableCell>
                    <TableCell className="text-center">
                      {usageSummary?.inspections?.count || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {usageSummary?.inspections?.included ? (
                        <Check className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-red-500 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(usageSummary?.inspections?.totalAmount || 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Acordos</TableCell>
                    <TableCell className="text-center">
                      {usageSummary?.settlements?.count || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {usageSummary?.settlements?.included ? (
                        <Check className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-red-500 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(usageSummary?.settlements?.totalAmount || 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      Analise de Inquilino
                    </TableCell>
                    <TableCell className="text-center">
                      {usageSummary?.screenings?.count || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      <X className="w-4 h-4 text-red-500 mx-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(usageSummary?.screenings?.totalAmount || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          {pendingCharges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Cobrancas Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descricao</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingCharges.map((charge) => (
                      <TableRow key={charge.id}>
                        <TableCell>{charge.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{charge.type}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(charge.createdAt)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(charge.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Historico de Cobrancas</CardTitle>
              <CardDescription>Ultimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-right">Pendente</TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingHistory.map((month, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {month.billingMonth}
                      </TableCell>
                      <TableCell>
                        <Badge className={getPlanColor(month.plan)}>
                          {getPlanNameInPortuguese(month.plan)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-amber-600">
                        {formatCurrency(month.totalPending)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(month.totalPaid)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {upgradePreview?.proratedAmount && upgradePreview.proratedAmount > 0
                ? 'Confirmar Upgrade'
                : 'Confirmar Alteracao de Plano'}
            </DialogTitle>
            <DialogDescription>
              Voce esta alterando do plano {getPlanNameInPortuguese(upgradePreview?.currentPlan || '')} para{' '}
              {getPlanNameInPortuguese(upgradePreview?.targetPlan || '')}
            </DialogDescription>
          </DialogHeader>

          {upgradePreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Contratos</p>
                  <p className="font-medium">
                    {upgradePreview.changes.contracts.current} →{' '}
                    {upgradePreview.changes.contracts.new}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Usuarios</p>
                  <p className="font-medium">
                    {upgradePreview.changes.users.current} →{' '}
                    {upgradePreview.changes.users.new === -1
                      ? '∞'
                      : upgradePreview.changes.users.new}
                  </p>
                </div>
              </div>

              {upgradePreview.changes.newFeatures.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Novos recursos:</p>
                  <ul className="space-y-1">
                    {upgradePreview.changes.newFeatures.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2 text-sm text-green-600"
                      >
                        <Check className="w-4 h-4" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border-t pt-4">
                {upgradePreview.proratedAmount > 0 && (
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      Valor proporcional ({upgradePreview.daysRemaining} dias)
                    </span>
                    <span className="font-medium">
                      {formatCurrency(upgradePreview.proratedAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Novo valor mensal
                  </span>
                  <span className="font-bold text-lg">
                    {formatCurrency(upgradePreview.newMonthlyPrice)}
                  </span>
                </div>
              </div>

              {upgradePreview.newMonthlyPrice <
                (currentUsage?.billing?.monthlyPrice || 0) && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Atencao</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    Ao fazer downgrade, contratos e usuarios excedentes ao novo
                    limite serao congelados.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUpgradeDialogOpen(false);
                setSelectedPlan(null);
                setUpgradePreview(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={confirmPlanChange} disabled={upgradeLoading}>
              {upgradeLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SubscriptionPage;
