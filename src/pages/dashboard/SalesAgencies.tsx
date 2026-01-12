import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { salesRepAPI } from '../../api';
import {
  Building2, Search, Phone, Mail, MapPin, Calendar,
  Users, Package, CheckCircle, XCircle, Building, User
} from 'lucide-react';

interface Agency {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  status: 'ACTIVE' | 'INACTIVE';
  plan: string;
  userCount: number;
  propertyCount: number;
  createdAt: string;
}

const planLabels: Record<string, string> = {
  FREE: 'Gratuito',
  ESSENTIAL: 'Essencial',
  PROFESSIONAL: 'Profissional',
  ENTERPRISE: 'Empresarial',
};

const planColors: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-800',
  ESSENTIAL: 'bg-blue-100 text-blue-800',
  PROFESSIONAL: 'bg-purple-100 text-purple-800',
  ENTERPRISE: 'bg-emerald-100 text-emerald-800',
};

export function SalesAgencies() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  const { data: agencies = [], isLoading } = useQuery({
    queryKey: ['sales-agencies'],
    queryFn: salesRepAPI.getAgencies,
  });

  const { data: metrics } = useQuery({
    queryKey: ['sales-agencies-metrics'],
    queryFn: salesRepAPI.getAgenciesMetrics,
  });

  const filteredAgencies = agencies.filter((agency: Agency) => {
    const matchesSearch =
      agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agency.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agency.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agency.status === statusFilter;
    const matchesPlan = planFilter === 'all' || agency.plan === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: Agency['status']) => {
    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" />
          Ativa
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
        <XCircle className="w-3 h-3" />
        Inativa
      </span>
    );
  };

  const getPlanBadge = (plan: string) => {
    const label = planLabels[plan] || plan;
    const color = planColors[plan] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${color}`}>
        <Package className="w-3 h-3" />
        {label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Building className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-bold">Agências e Proprietários Autônomos</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Visualização de agências imobiliárias e proprietários independentes cadastrados
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Agências</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalAgencies}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.activeAgencies} ativas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agências Ativas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeAgencies}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.inactiveAgencies} inativas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Em todas as agências
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Imóveis</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalProperties}</div>
              <p className="text-xs text-muted-foreground">
                Em todas as agências
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nome, email ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos os Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="ACTIVE">Ativas</SelectItem>
                <SelectItem value="INACTIVE">Inativas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos os Planos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Planos</SelectItem>
                <SelectItem value="FREE">Gratuito</SelectItem>
                <SelectItem value="ESSENTIAL">Essencial</SelectItem>
                <SelectItem value="PROFESSIONAL">Profissional</SelectItem>
                <SelectItem value="ENTERPRISE">Empresarial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Agencies List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Agências e Proprietários Autônomos ({filteredAgencies.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAgencies.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma agência ou proprietário autônomo encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAgencies.map((agency: Agency) => (
                <div
                  key={agency.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold">{agency.name}</h3>
                        {(agency as any).type === 'independent_owner' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                            <User className="w-3 h-3" />
                            Proprietário Autônomo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            <Building2 className="w-3 h-3" />
                            Agência
                          </span>
                        )}
                        {getStatusBadge(agency.status)}
                        {getPlanBadge(agency.plan)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span>{agency.email}</span>
                        </div>
                        {agency.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{agency.phone}</span>
                          </div>
                        )}
                        {(agency.city || agency.state) && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>
                              {agency.city}
                              {agency.city && agency.state && ', '}
                              {agency.state}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Cadastrada em {formatDate(agency.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{agency.userCount} usuários</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Building2 className="w-4 h-4" />
                          <span>{agency.propertyCount} imóveis</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

