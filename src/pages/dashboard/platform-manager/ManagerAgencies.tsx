import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, Search, Eye,
  Calendar, CreditCard, Activity, ArrowUpRight, ArrowDownRight, Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
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

export function ManagerAgencies() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [selectedAgency, setSelectedAgency] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch agencies
  const { data: agenciesData = { agencies: [], activityLogs: [] }, isLoading } = useQuery({
    queryKey: ['platform-manager', 'agencies', searchTerm, statusFilter, planFilter],
    queryFn: () => platformManagerAPI.getAgencies({
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      plan: planFilter !== 'all' ? planFilter : undefined,
    }),
  });

  const agencies = agenciesData.agencies || agenciesData || [];
  const activityLogs = agenciesData.activityLogs || [];

  const filteredAgencies = Array.isArray(agencies) ? agencies.filter((agency: any) => {
    const matchesSearch = agency.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agency.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agency.status === statusFilter;
    const matchesPlan = planFilter === 'all' || agency.plan === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  }) : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">Ativa</Badge>;
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-700">Trial</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-700">Suspensa</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-700">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getBillingBadge = (status: string) => {
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

  const openDetails = (agency: any) => {
    setSelectedAgency(agency);
    setDetailsOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Agências</h1>
        <p className="text-muted-foreground">Visualize e gerencie as agências da plataforma</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredAgencies.filter((a: any) => a.status === 'active').length}</p>
                <p className="text-sm text-muted-foreground">Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredAgencies.filter((a: any) => a.status === 'trial').length}</p>
                <p className="text-sm text-muted-foreground">Em Trial</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredAgencies.filter((a: any) => a.billingStatus === 'pending').length}</p>
                <p className="text-sm text-muted-foreground">Pagamento Pendente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Building2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredAgencies.filter((a: any) => a.status === 'suspended').length}</p>
                <p className="text-sm text-muted-foreground">Suspensas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspensas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Planos</SelectItem>
                <SelectItem value="Starter">Starter</SelectItem>
                <SelectItem value="Business">Business</SelectItem>
                <SelectItem value="Premium">Premium</SelectItem>
                <SelectItem value="Enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Agencies Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de Agências</CardTitle>
          <CardDescription>{filteredAgencies.length} agências encontradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {filteredAgencies.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhuma agência encontrada</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Agência</th>
                    <th className="text-left py-3 px-4 font-medium">Plano</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Cobrança</th>
                    <th className="text-left py-3 px-4 font-medium">Usuários</th>
                    <th className="text-left py-3 px-4 font-medium">Imóveis</th>
                    <th className="text-left py-3 px-4 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgencies.map((agency: any) => (
                    <tr key={agency.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{agency.name}</p>
                          <p className="text-sm text-muted-foreground">{agency.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{agency.plan}</Badge>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(agency.status)}</td>
                      <td className="py-3 px-4">{getBillingBadge(agency.billingStatus)}</td>
                      <td className="py-3 px-4">{agency.users}</td>
                      <td className="py-3 px-4">{agency.properties}</td>
                      <td className="py-3 px-4">
                        <Button variant="ghost" size="sm" onClick={() => openDetails(agency)}>
                          <Eye className="w-4 h-4 mr-1" />
                          Detalhes
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

      {/* Agency Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAgency?.name}</DialogTitle>
            <DialogDescription>{selectedAgency?.email}</DialogDescription>
          </DialogHeader>

          {selectedAgency && (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList>
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="billing">Cobrança</TabsTrigger>
                <TabsTrigger value="activity">Atividades</TabsTrigger>
                <TabsTrigger value="upgrade">Upgrade/Downgrade</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{selectedAgency.users}</p>
                      <p className="text-sm text-muted-foreground">Usuários</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{selectedAgency.properties}</p>
                      <p className="text-sm text-muted-foreground">Imóveis</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{selectedAgency.contracts}</p>
                      <p className="text-sm text-muted-foreground">Contratos</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">R$ {selectedAgency.monthlyRevenue?.toFixed(2) || '0.00'}</p>
                      <p className="text-sm text-muted-foreground">Mensalidade</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Plano Atual</p>
                    <Badge variant="outline" className="text-lg">{selectedAgency.plan}</Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Status</p>
                    {getStatusBadge(selectedAgency.status)}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Data de Criação</p>
                    <p>{selectedAgency.createdAt ? new Date(selectedAgency.createdAt).toLocaleDateString('pt-BR') : '-'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Status de Cobrança</p>
                    {getBillingBadge(selectedAgency.billingStatus)}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="billing" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-medium">Último Pagamento</p>
                      </div>
                      <p className="text-lg font-bold">
                        {selectedAgency.lastPayment
                          ? new Date(selectedAgency.lastPayment).toLocaleDateString('pt-BR')
                          : 'Nenhum'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-medium">Próxima Cobrança</p>
                      </div>
                      <p className="text-lg font-bold">
                        {selectedAgency.nextBilling ? new Date(selectedAgency.nextBilling).toLocaleDateString('pt-BR') : '-'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-medium">Valor Mensal</p>
                      </div>
                      <p className="text-lg font-bold">R$ {selectedAgency.monthlyRevenue?.toFixed(2) || '0.00'}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Histórico de Pagamentos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-center py-4">Histórico de pagamentos será carregado do banco de dados</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Logs de Atividade</CardTitle>
                    <CardDescription>Últimas ações realizadas pela agência</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {activityLogs.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">Nenhuma atividade encontrada</p>
                      ) : (
                        activityLogs.map((log: any) => (
                          <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Activity className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{log.action}</p>
                                <p className="text-sm text-muted-foreground">{log.user}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm">{log.timestamp}</p>
                              <p className="text-xs text-muted-foreground">IP: {log.ip}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="upgrade" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Solicitar Alteração de Plano</CardTitle>
                    <CardDescription>
                      Você pode solicitar upgrade ou downgrade do plano desta agência.
                      A alteração será processada pelo administrador.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border-2 hover:border-green-500 cursor-pointer transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <ArrowUpRight className="w-5 h-5 text-green-600" />
                            <p className="font-medium">Solicitar Upgrade</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Solicitar upgrade para um plano superior com mais recursos
                          </p>
                          <Button className="w-full mt-4" variant="outline">
                            Solicitar Upgrade
                          </Button>
                        </CardContent>
                      </Card>
                      <Card className="border-2 hover:border-orange-500 cursor-pointer transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <ArrowDownRight className="w-5 h-5 text-orange-600" />
                            <p className="font-medium">Solicitar Downgrade</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Solicitar downgrade para um plano mais econômico
                          </p>
                          <Button className="w-full mt-4" variant="outline">
                            Solicitar Downgrade
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4 text-center">
                      Nota: Apenas o administrador pode criar ou excluir agências.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
