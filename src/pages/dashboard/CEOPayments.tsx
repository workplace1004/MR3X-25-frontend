import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  DollarSign,
  Calendar,
  Building2,
  TrendingUp,
  Search,
  User,
  Building,
  FileText,
  Users,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { PageHeader } from '../../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { dashboardAPI } from '../../api';

interface Agency {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  plan: string;
  subscriptionStatus: string;
  totalSpent: number;
  totalPaid?: number;
  totalPending?: number;
  lastPaymentAt: string | null;
  lastPaymentAmount: number;
  nextBillingDate: string | null;
  createdAt: string;
  stats: {
    properties: number;
    contracts: number;
    users: number;
  };
}

interface IndependentOwner {
  id: string;
  name: string | null;
  email: string;
  document: string | null;
  plan: string;
  createdAt: string;
}

interface PlatformRevenueData {
  summary: {
    totalAgencies: number;
    totalIndependentOwners: number;
    totalAgencyRevenue: number;
    monthlyAgencyMicrotransactions: number;
    monthlyOwnerMicrotransactions: number;
    totalMonthlyRevenue: number;
  };
  planDistribution: {
    agencies: Record<string, number>;
    independentOwners: Record<string, number>;
  };
  agencies: Agency[];
  independentOwners: IndependentOwner[];
  recentPayments: Array<{
    id: string;
    type: 'agency';
    name: string;
    email: string;
    plan: string;
    amount: number;
    date: string;
    totalSpent: number;
  }>;
}

export function CEOPayments() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('agencies');

  const { data: platformRevenue, isLoading } = useQuery({
    queryKey: ['platform-revenue'],
    queryFn: async () => {
      const data = await dashboardAPI.getPlatformRevenue();
      console.log('[CEOPayments] Platform revenue data received:', data);
      console.log('[CEOPayments] Agencies:', data?.agencies);
      console.log('[CEOPayments] Recent payments:', data?.recentPayments);
      if (data?.agencies) {
        data.agencies.forEach((agency: any, idx: number) => {
          console.log(`[CEOPayments] Agency ${idx + 1} (${agency.name}):`);
          console.log(`  - totalPaid: ${agency.totalPaid} (type: ${typeof agency.totalPaid})`);
          console.log(`  - totalPending: ${agency.totalPending} (type: ${typeof agency.totalPending})`);
          console.log(`  - totalSpent: ${agency.totalSpent} (type: ${typeof agency.totalSpent})`);
          console.log(`  - lastPaymentAmount: ${agency.lastPaymentAmount} (type: ${typeof agency.lastPaymentAmount})`);
          console.log(`  - lastPaymentAt: ${agency.lastPaymentAt}`);
          console.log(`  - Full agency object:`, JSON.stringify(agency, null, 2));
        });
      }
      return data;
    },
    enabled: user?.role === 'CEO',
  });

  if (user?.role !== 'CEO') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-7 h-7 rounded" />
              <Skeleton className="h-8 w-64" />
            </div>
            <Skeleton className="h-4 w-96" />
          </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 sm:p-4 space-y-2">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Plan distribution cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-64" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[...Array(4)].map((_, j) => (
                    <Skeleton key={j} className="h-6 w-24" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter card skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="w-full sm:w-48 space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* List skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = platformRevenue as PlatformRevenueData;

  const filteredAgencies = (data?.agencies || []).filter((agency) => {
    const searchMatch =
      searchTerm === '' ||
      agency.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agency.cnpj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agency.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const planMatch = planFilter === 'all' || agency.plan === planFilter;

    return searchMatch && planMatch;
  });

  const filteredOwners = (data?.independentOwners || []).filter((owner) => {
    const searchMatch =
      searchTerm === '' ||
      owner.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.document?.toLowerCase().includes(searchTerm.toLowerCase());

    const planMatch = planFilter === 'all' || owner.plan === planFilter;

    return searchMatch && planMatch;
  });

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'PREMIUM':
        return 'bg-purple-100 text-purple-800';
      case 'PROFISSIONAL':
        return 'bg-blue-100 text-blue-800';
      case 'ESSENCIAL':
        return 'bg-green-100 text-green-800';
      case 'FREE':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSubscriptionStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'CANCELED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receita da Plataforma"
        subtitle="Acompanhe os pagamentos de Agências e Proprietários Independentes"
        icon={<DollarSign className="w-6 h-6 text-primary" />}
        iconBgClass="bg-primary/10"
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total Agências</p>
            <p className="text-sm sm:text-lg font-bold">{data?.summary?.totalAgencies || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Proprietários Independentes</p>
            <p className="text-sm sm:text-lg font-bold">{data?.summary?.totalIndependentOwners || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Receita Total (Agências)</p>
            <p className="text-sm sm:text-lg font-bold text-purple-600">
              {formatCurrency(data?.summary?.totalAgencyRevenue || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Microtransações (Mês)</p>
            <p className="text-sm sm:text-lg font-bold text-orange-600">
              {formatCurrency(data?.summary?.totalMonthlyRevenue || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribuição de Planos - Agências</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data?.planDistribution?.agencies || {}).map(([plan, count]) => (
                <Badge key={plan} className={getPlanColor(plan)}>
                  {plan}: {count}
                </Badge>
              ))}
              {Object.keys(data?.planDistribution?.agencies || {}).length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma agência cadastrada</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribuição de Planos - Prop. Independentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data?.planDistribution?.independentOwners || {}).map(([plan, count]) => (
                <Badge key={plan} className={getPlanColor(plan)}>
                  {plan}: {count}
                </Badge>
              ))}
              {Object.keys(data?.planDistribution?.independentOwners || {}).length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum proprietário independente cadastrado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="text-xs text-muted-foreground mb-1 block">
                Buscar
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por nome, CNPJ, CPF ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Label htmlFor="plan" className="text-xs text-muted-foreground mb-1 block">
                Plano
              </Label>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="FREE">FREE</SelectItem>
                  <SelectItem value="ESSENCIAL">ESSENCIAL</SelectItem>
                  <SelectItem value="PROFISSIONAL">PROFISSIONAL</SelectItem>
                  <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="agencies" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Agências ({filteredAgencies.length})
          </TabsTrigger>
          <TabsTrigger value="owners" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Prop. Independentes ({filteredOwners.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agencies">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Agências
              </CardTitle>
              <CardDescription>Lista de agências e seus pagamentos à plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAgencies.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma agência encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAgencies.map((agency) => (
                    <div
                      key={agency.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/50 border rounded-lg gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Building className="w-4 h-4 text-muted-foreground shrink-0" />
                          <p className="font-medium truncate">{agency.name}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          <span className="truncate">{agency.email}</span>
                          <span className="truncate">CNPJ: {agency.cnpj}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getPlanColor(agency.plan)}>{agency.plan}</Badge>
                          <Badge className={getSubscriptionStatusColor(agency.subscriptionStatus)}>
                            {agency.subscriptionStatus}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{agency.stats.properties} imóveis</span>
                          <span>{agency.stats.contracts} contratos</span>
                          <span>{agency.stats.users} usuários</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex flex-col items-end gap-1">
                          <p className="text-xs text-muted-foreground">Total Pago</p>
                          <p className="font-semibold text-lg text-green-600">
                            {formatCurrency(agency.totalPaid ?? agency.totalSpent ?? 0)}
                          </p>
                        </div>
                        {(agency.totalPending ?? 0) > 0 && (
                          <div className="flex flex-col items-end gap-1">
                            <p className="text-xs text-muted-foreground">Total Pendente</p>
                            <p className="font-semibold text-base text-orange-600">
                              {formatCurrency(agency.totalPending ?? 0)}
                            </p>
                          </div>
                        )}
                        {agency.lastPaymentAt && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>Último: {formatDate(agency.lastPaymentAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="owners">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Proprietários Independentes
              </CardTitle>
              <CardDescription>Lista de proprietários independentes e seus planos</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredOwners.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum proprietário independente encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOwners.map((owner) => (
                    <div
                      key={owner.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/50 border rounded-lg gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-muted-foreground shrink-0" />
                          <p className="font-medium truncate">{owner.name || 'Sem nome'}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          <span className="truncate">{owner.email}</span>
                          {owner.document && <span className="truncate">CPF/CNPJ: {owner.document}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getPlanColor(owner.plan)}>{owner.plan}</Badge>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>Cadastrado: {formatDate(owner.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {(data?.recentPayments?.length || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Últimos Pagamentos
            </CardTitle>
            <CardDescription>Pagamentos recentes de agências à plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.recentPayments?.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-green-50 border border-green-100 rounded-lg gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building className="w-4 h-4 text-muted-foreground shrink-0" />
                      <p className="font-medium truncate">{payment.name}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="truncate">{payment.email}</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{payment.date ? formatDate(payment.date) : '-'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="font-semibold text-green-600">{formatCurrency(payment.amount)}</p>
                    <Badge className={getPlanColor(payment.plan)}>{payment.plan}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
