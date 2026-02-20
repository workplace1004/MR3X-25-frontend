import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Package, Search, Eye, Calendar, CheckCircle,
  Clock, AlertTriangle, DollarSign
} from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { platformManagerAPI } from '../../../api';

interface Plan {
  id: string;
  name: string;
  price: number;
  color: string;
  activeSubscriptions: number;
  features: string[];
}

interface Subscription {
  id: string;
  agency: string;
  plan: string;
  status: string;
  paymentStatus: string;
  amount: number;
  nextBilling: string;
  startDate: string;
  lastPayment?: string;
}

interface UpcomingBilling {
  agency: string;
  plan: string;
  date: string;
  amount: number;
}

export function ManagerPlansBilling() {
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('plans');

  const { data: plansData = { plans: [], subscriptions: [], upcomingBillings: [] }, isLoading } = useQuery({
    queryKey: ['platform-manager', 'plans-overview'],
    queryFn: platformManagerAPI.getPlansOverview,
  });

  const plans = plansData.plans || [];
  const subscriptions = plansData.subscriptions || [];
  const upcomingBillings = plansData.upcomingBillings || [];

  const filteredSubscriptions = subscriptions.filter((sub: Subscription) => {
    const matchesSearch = sub.agency?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter === 'all' || sub.plan === planFilter;
    const matchesStatus = statusFilter === 'all' || sub.paymentStatus === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const totalMRR = subscriptions
    .filter((s: Subscription) => s.status === 'active')
    .reduce((sum: number, s: Subscription) => sum + (s.amount || 0), 0);

  const paidCount = subscriptions.filter((s: Subscription) => s.paymentStatus === 'paid').length;
  const pendingCount = subscriptions.filter((s: Subscription) => s.paymentStatus === 'pending').length;
  const overdueCount = subscriptions.filter((s: Subscription) => s.paymentStatus === 'overdue').length;

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700">Pago</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700">Pendente</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700">Em Atraso</Badge>;
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-700">Trial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">Ativo</Badge>;
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-700">Trial</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-700">Suspenso</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-700">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openDetails = (sub: Subscription) => {
    setSelectedSubscription(sub);
    setDetailsOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-lg" />
                  <div>
                    <Skeleton className="h-8 w-24 mb-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-36 rounded" />
          ))}
        </div>

        {/* Plan Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-5 w-20 rounded" />
                </div>
                <div className="flex items-end gap-1 mt-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <Skeleton className="w-4 h-4 rounded" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planos e Cobrança"
        subtitle="Visualize planos e status de cobrança das agências (somente leitura)"
        icon={<DollarSign className="w-6 h-6 text-green-700" />}
        iconBgClass="bg-green-100"
      />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">R$ {totalMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-sm text-muted-foreground">MRR Ativo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{paidCount}</p>
                <p className="text-sm text-muted-foreground">Pagos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueCount}</p>
                <p className="text-sm text-muted-foreground">Em Atraso</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="plans">Tabela de Planos</TabsTrigger>
          <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
          <TabsTrigger value="upcoming">Próximas Cobranças</TabsTrigger>
        </TabsList>

        {}
        <TabsContent value="plans" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.length === 0 ? (
              <p className="text-muted-foreground text-center py-4 col-span-full">Nenhum plano encontrado</p>
            ) : (
              plans.map((plan: Plan) => (
                <Card key={plan.id} className="relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    plan.color === 'gray' ? 'bg-gray-400' :
                    plan.color === 'blue' ? 'bg-blue-500' :
                    plan.color === 'purple' ? 'bg-purple-500' :
                    'bg-yellow-500'
                  }`} />
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{plan.name}</span>
                      <Badge variant="outline">{plan.activeSubscriptions || 0} ativos</Badge>
                    </CardTitle>
                    <CardDescription>
                      <span className="text-2xl font-bold text-foreground">
                        R$ {(plan.price || 0).toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.features?.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {}
        <TabsContent value="subscriptions" className="space-y-4 mt-4">
          {}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar agência..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Starter">Starter</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="Premium">Premium</SelectItem>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="overdue">Em Atraso</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assinaturas de Agências</CardTitle>
              <CardDescription>{filteredSubscriptions.length} assinaturas encontradas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {filteredSubscriptions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhuma assinatura encontrada</p>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Agência</th>
                        <th className="text-left py-3 px-4 font-medium">Plano</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-left py-3 px-4 font-medium">Pagamento</th>
                        <th className="text-left py-3 px-4 font-medium">Valor</th>
                        <th className="text-left py-3 px-4 font-medium">Próxima Cobrança</th>
                        <th className="text-left py-3 px-4 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubscriptions.map((sub: Subscription) => (
                        <tr key={sub.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{sub.agency}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{sub.plan}</Badge>
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(sub.status)}</td>
                          <td className="py-3 px-4">{getPaymentStatusBadge(sub.paymentStatus)}</td>
                          <td className="py-3 px-4">R$ {(sub.amount || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-sm">
                            {sub.nextBilling ? new Date(sub.nextBilling).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <Button variant="ghost" size="sm" onClick={() => openDetails(sub)}>
                              <Eye className="w-4 h-4 mr-1" />
                              Ver
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {}
        <TabsContent value="upcoming" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Próximas Cobranças</CardTitle>
              <CardDescription>Cobranças programadas para os próximos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingBillings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhuma cobrança programada</p>
                ) : (
                  upcomingBillings.map((billing: UpcomingBilling, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{billing.agency}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">{billing.plan}</Badge>
                            <span>•</span>
                            <span>{billing.date ? new Date(billing.date).toLocaleDateString('pt-BR') : '-'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">R$ {(billing.amount || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Assinatura</DialogTitle>
            <DialogDescription>{selectedSubscription?.agency}</DialogDescription>
          </DialogHeader>

          {selectedSubscription && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Plano</p>
                    </div>
                    <p className="text-lg font-bold">{selectedSubscription.plan}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Valor Mensal</p>
                    </div>
                    <p className="text-lg font-bold">R$ {(selectedSubscription.amount || 0).toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Início</p>
                    </div>
                    <p className="text-lg font-bold">
                      {selectedSubscription.startDate ? new Date(selectedSubscription.startDate).toLocaleDateString('pt-BR') : '-'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Próxima Cobrança</p>
                    </div>
                    <p className="text-lg font-bold">
                      {selectedSubscription.nextBilling ? new Date(selectedSubscription.nextBilling).toLocaleDateString('pt-BR') : '-'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Status da Assinatura</p>
                  <div className="mt-1">{getStatusBadge(selectedSubscription.status)}</div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Status do Pagamento</p>
                  <div className="mt-1">{getPaymentStatusBadge(selectedSubscription.paymentStatus)}</div>
                </div>
              </div>

              {selectedSubscription.lastPayment && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-700">Último Pagamento</p>
                      <p className="text-sm text-green-600">
                        {new Date(selectedSubscription.lastPayment).toLocaleDateString('pt-BR')} - R$ {(selectedSubscription.amount || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {}
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-700">
          <strong>Nota:</strong> Como Gerente de Plataforma, você pode visualizar os planos e status de cobrança, mas não pode modificar preços ou alterar assinaturas. Essas ações são exclusivas do Administrador.
        </p>
      </div>
    </div>
  );
}
