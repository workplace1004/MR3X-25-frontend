import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { CEPInput } from '../../components/ui/cep-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import apiClient from '../../api/client';
import { toast } from 'sonner';
import { usersAPI } from '../../api';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  Edit,
  Eye,
  MessageSquare,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Target,
  Filter,
  ArrowRight,
  Shield,
  Trash2,
  Loader2,
} from 'lucide-react';

// Lead interface matching specification
interface Lead {
  id: string;
  token: string; // Unique token identifier
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  city: string;
  state: string;
  source: 'Website' | 'Referral' | 'Campaign' | 'Manual';
  assignedRepresentative?: string;
  representativeName?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'negotiation' | 'won' | 'lost' | 'disqualified';
  planInterest?: 'starter' | 'business' | 'premium' | 'enterprise';
  createdAt: string;
  lastContactAt?: string;
  conversionDate?: string;
  notes?: string;
  address?: string;
  cep?: string;
  activities?: LeadActivity[];
  attachments?: LeadAttachment[];
  convertedToAgencyId?: string;
}

interface LeadActivity {
  id: string;
  type: 'status_change' | 'note' | 'proposal_sent' | 'call' | 'meeting' | 'conversion';
  title: string;
  description?: string;
  createdAt: string;
  createdBy: string;
}

interface LeadAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
}

// Status configuration matching specification
const statusConfig = {
  new: { label: 'Novo', color: 'bg-gray-100 text-gray-800', icon: Clock },
  contacted: { label: 'Contatado', color: 'bg-blue-100 text-blue-800', icon: Phone },
  qualified: { label: 'Qualificado', color: 'bg-cyan-100 text-cyan-800', icon: Target },
  proposal_sent: { label: 'Proposta Enviada', color: 'bg-purple-100 text-purple-800', icon: FileText },
  negotiation: { label: 'Negociação', color: 'bg-orange-100 text-orange-800', icon: MessageSquare },
  won: { label: 'Ganho', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  lost: { label: 'Perdido', color: 'bg-red-100 text-red-800', icon: XCircle },
  disqualified: { label: 'Desqualificado', color: 'bg-gray-200 text-gray-700', icon: Shield },
};

const planConfig = {
  starter: { label: 'Gratuito', color: 'bg-gray-100 text-gray-800' },
  business: { label: 'Básico', color: 'bg-blue-100 text-blue-800' },
  premium: { label: 'Profissional', color: 'bg-purple-100 text-purple-800' },
  enterprise: { label: 'Empresarial', color: 'bg-emerald-100 text-emerald-800' },
};

const sourceConfig = {
  Website: { label: 'Site', color: 'bg-blue-50 text-blue-700' },
  Referral: { label: 'Indicação', color: 'bg-green-50 text-green-700' },
  Campaign: { label: 'Campanha', color: 'bg-purple-50 text-purple-700' },
  Manual: { label: 'Manual', color: 'bg-gray-50 text-gray-700' },
};

export function SalesLeads() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Form state for Create/Edit modals
  const [formSource, setFormSource] = useState<Lead['source']>('Manual');
  const [formPlanInterest, setFormPlanInterest] = useState<Lead['planInterest'] | ''>('');
  const [formStatus, setFormStatus] = useState<Lead['status']>('new');
  const [formCEP, setFormCEP] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formCity, setFormCity] = useState<string>('');
  const [formState, setFormState] = useState<string>('');
  const [formContactEmail, setFormContactEmail] = useState<string>('');
  const [formContactPhone, setFormContactPhone] = useState<string>('');

  // Email validation state
  const [emailError, setEmailError] = useState<string>('');
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [checkingEmail, setCheckingEmail] = useState<boolean>(false);

  // Phone validation state
  const [phoneError, setPhoneError] = useState<string>('');
  const [phoneVerified, setPhoneVerified] = useState<boolean>(false);

  // Fetch leads
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['sales-leads'],
    queryFn: async () => {
      const response = await apiClient.get('/sales-rep/prospects');
      return (response.data || []).map((p: any) => ({
        ...p,
        token: p.token || deriveToken(p.id),
        companyName: p.name,
        status: mapOldStatusToNew(p.status),
      }));
    },
  });

  // Fetch KPIs
  const { data: kpis } = useQuery({
    queryKey: ['sales-leads-kpis'],
    queryFn: async () => {
      const totalLeads = leads.length;
      const activeLeads = leads.filter((l: Lead) =>
        !['won', 'lost', 'disqualified'].includes(l.status)
      ).length;
      const wonLeads = leads.filter((l: Lead) => l.status === 'won').length;
      const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

      // Calculate average time to convert
      const convertedLeads = leads.filter((l: Lead) => l.conversionDate);
      const avgTimeToConvert = convertedLeads.length > 0
        ? convertedLeads.reduce((sum: number, l: Lead) => {
          const created = new Date(l.createdAt).getTime();
          const converted = new Date(l.conversionDate!).getTime();
          return sum + (converted - created) / (1000 * 60 * 60 * 24); // days
        }, 0) / convertedLeads.length
        : 0;

      return {
        totalLeads,
        activeLeads,
        conversionRate: Math.round(conversionRate * 10) / 10,
        avgTimeToConvert: Math.round(avgTimeToConvert),
        wonLeads,
        lostLeads: leads.filter((l: Lead) => l.status === 'lost').length,
      };
    },
    enabled: !isLoading,
  });

  // Generate unique token following MR3X pattern
  function generateToken(prefix: string = 'MR3X-LED'): string {
    const year = new Date().getFullYear();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const generateRandomSegment = (length: number) => {
      return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };
    const segment1 = generateRandomSegment(4);
    const segment2 = generateRandomSegment(4);
    return `${prefix}-${year}-${segment1}-${segment2}`;
  }

  const deriveToken = (id: any) => {
    if (!id) return generateToken();
    const year = new Date().getFullYear();
    const seed = String(id);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const hash = (s: string) =>
      s.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const makeSeg = (offset: number) => {
      let n = hash(seed + offset);
      let out = '';
      for (let i = 0; i < 4; i++) {
        out += chars[n % chars.length];
        n = Math.floor(n / chars.length) || hash(out + i);
      }
      return out;
    };
    return `MR3X-LED-${year}-${makeSeg(1)}-${makeSeg(2)}`;
  };

  // Map old status to new status flow
  function mapOldStatusToNew(oldStatus: string): Lead['status'] {
    const mapping: Record<string, Lead['status']> = {
      'new': 'new',
      'contacted': 'contacted',
      'interested': 'qualified',
      'negotiating': 'negotiation',
      'converted': 'won',
      'lost': 'lost',
    };
    return mapping[oldStatus] || 'new';
  }

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (data: Partial<Lead> & { cep?: string }) => {
      const token = generateToken();
      const response = await apiClient.post('/sales-rep/prospects', {
        name: data.companyName,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        city: data.city,
        state: data.state,
        address: data.address,
        cep: data.cep,
        source: data.source,
        status: 'new',
        planInterest: data.planInterest,
        notes: data.notes,
        token: token,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads'] });
      queryClient.invalidateQueries({ queryKey: ['sales-leads-kpis'] });
      setShowAddModal(false);
      toast.success('Pista criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao criar pista');
    },
  });

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lead> }) => {
      const response = await apiClient.put(`/sales-rep/prospects/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads'] });
      queryClient.invalidateQueries({ queryKey: ['sales-leads-kpis'] });
      setShowEditModal(false);
      setSelectedLead(null);
      toast.success('Pista atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao atualizar pista');
    },
  });

  // Convert lead to agency mutation
  const convertLeadMutation = useMutation({
    mutationFn: async ({ id, planType }: { id: string; planType: string }) => {
      const response = await apiClient.post(`/sales-rep/prospects/${id}/convert`, { planType });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads'] });
      queryClient.invalidateQueries({ queryKey: ['sales-leads-kpis'] });
      setShowConvertModal(false);
      setSelectedLead(null);
      toast.success('Pista convertida para agência com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao converter pista');
    },
  });

  // Delete lead mutation
  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/sales-rep/prospects/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads'] });
      queryClient.invalidateQueries({ queryKey: ['sales-leads-kpis'] });
      setShowDeleteModal(false);
      setSelectedLead(null);
      toast.success('Pista excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao excluir pista');
    },
  });

  const handleDeleteLead = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDeleteModal(true);
  };

  const confirmDeleteLead = () => {
    if (selectedLead) {
      deleteLeadMutation.mutate(selectedLead.id);
    }
  };

  // Filter leads
  const filteredLeads = leads.filter((lead: Lead) => {
    const matchesSearch =
      lead.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.token?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
    const matchesPlan = planFilter === 'all' || lead.planInterest === planFilter;
    const matchesCity = !cityFilter ||
      lead.city?.toLowerCase().includes(cityFilter.toLowerCase()) ||
      lead.state?.toLowerCase().includes(cityFilter.toLowerCase());

    const matchesDateRange = (!dateRangeStart && !dateRangeEnd) || (() => {
      const created = new Date(lead.createdAt);
      const start = dateRangeStart ? new Date(dateRangeStart) : null;
      const end = dateRangeEnd ? new Date(dateRangeEnd + 'T23:59:59') : null;
      return (!start || created >= start) && (!end || created <= end);
    })();

    return matchesSearch && matchesStatus && matchesSource && matchesPlan && matchesCity && matchesDateRange;
  });

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: Lead['status']) => {
    const config = statusConfig[status];
    if (!config) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
          <Clock className="w-3 h-3" />
          {status || 'Desconhecido'}
        </span>
      );
    }
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const getPlanBadge = (plan?: Lead['planInterest']) => {
    if (!plan) return null;
    const config = planConfig[plan];
    if (!config) return null;
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getSourceBadge = (source?: Lead['source']) => {
    if (!source) return null;
    const config = sourceConfig[source];
    if (!config) return null;
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setFormSource(lead.source);
    setFormStatus(lead.status);
    setFormPlanInterest(lead.planInterest || '');
    setFormCEP(lead.cep || '');
    setFormAddress(lead.address || '');
    setFormCity(lead.city || '');
    setFormState(lead.state || '');
    setFormContactEmail(lead.contactEmail || '');
    setEmailVerified(true); // Assume current email is valid
    setEmailError('');
    const phoneValue = lead.contactPhone || '';
    setFormContactPhone(phoneValue ? formatPhoneInput(phoneValue) : '');
    setPhoneVerified(phoneValue ? validatePhone(phoneValue) : true);
    setPhoneError('');
    setShowEditModal(true);
  };

  // Handle CEP data auto-fill for edit modal
  const handleEditCEPData = useCallback((data: any) => {
    setFormAddress(data.logradouro || data.street || data.address || formAddress);
    setFormCity(data.cidade || data.city || formCity);
    setFormState(data.estado || data.state || formState);
  }, [formAddress, formCity, formState]);

  const handleConvertLead = (lead: Lead) => {
    setSelectedLead(lead);
    setShowConvertModal(true);
  };

  // Handle CEP data auto-fill
  const handleCEPData = useCallback((data: any) => {
    setFormAddress(data.logradouro || data.street || data.address || formAddress);
    setFormCity(data.cidade || data.city || formCity);
    setFormState(data.estado || data.state || formState);
  }, [formAddress, formCity, formState]);

  // Format phone input
  const formatPhoneInput = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    } else if (cleaned.length <= 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    } else {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    }
  };

  // Validate phone number
  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Phone is optional
    const cleaned = phone.replace(/\D/g, '');
    // Brazilian phone: 10 digits (landline) or 11 digits (mobile)
    return cleaned.length === 10 || cleaned.length === 11;
  };

  // Handle phone input change
  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneInput(value);
    setFormContactPhone(formatted);
    setPhoneError('');

    if (formatted) {
      const isValid = validatePhone(formatted);
      if (!isValid) {
        setPhoneError('Telefone deve ter 10 ou 11 dígitos');
        setPhoneVerified(false);
      } else {
        setPhoneError('');
        setPhoneVerified(true);
      }
    } else {
      setPhoneVerified(true); // Empty is valid (optional field)
    }
  };

  // Check email exists function
  const checkEmailExists = useCallback(async (email: string, currentEmail?: string) => {
    setEmailVerified(false);

    if (!email || email === currentEmail) {
      setEmailError('');
      if (email === currentEmail) {
        setEmailVerified(true);
      }
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Formato de email inválido');
      return;
    }

    setCheckingEmail(true);
    try {
      const result = await usersAPI.checkEmailExists(email);
      if (result.exists) {
        setEmailError('Este email já está em uso, por favor altere o email');
        setEmailVerified(false);
        toast.error('Este email já está em uso, por favor altere o email');
      } else {
        setEmailError('');
        setEmailVerified(true);
      }
    } catch (error) {
      console.error('Error checking email:', error);
      setEmailError('Erro ao verificar email');
      setEmailVerified(false);
    } finally {
      setCheckingEmail(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Target className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold">Pistas</h1>
          </div>
          <p className="text-muted-foreground">
            Gerencie pistas comerciais de agências e corretores independentes
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Nova Pista
        </Button>
      </div>

      {/* KPI Summary Bar */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total de Pistas</p>
              <p className="text-2xl font-bold">{kpis.totalLeads}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pistas Ativas</p>
              <p className="text-2xl font-bold text-blue-600">{kpis.activeLeads}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
              <p className="text-2xl font-bold text-green-600">{kpis.conversionRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Tempo Médio (dias)</p>
              <p className="text-2xl font-bold text-purple-600">{kpis.avgTimeToConvert}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Ganhos vs Perdidos</p>
              <p className="text-2xl font-bold">
                <span className="text-green-600">{kpis.wonLeads}</span>
                <span className="text-gray-400"> / </span>
                <span className="text-red-600">{kpis.lostLeads}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = leads.filter((l: Lead) => l.status === key).length;
          const Icon = config.icon;
          return (
            <Card
              key={key}
              className={`cursor-pointer transition-all ${statusFilter === key ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{config.label}</span>
                </div>
                <p className="text-2xl font-bold mt-1">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por token, nome, email, empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filtros
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Origens</SelectItem>
                    {Object.entries(sourceConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Plano de Interesse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Planos</SelectItem>
                    {Object.entries(planConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Cidade/Estado"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                />

                <div className="flex gap-2">
                  <Input
                    type="date"
                    placeholder="Data Início"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    placeholder="Data Fim"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Pistas ({filteredLeads.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Token</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Empresa/Agência</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Contato</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Plano de Interesse</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Origem</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Criado em</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead: Lead) => (
                  <tr key={lead.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="text-xs font-mono text-muted-foreground">{lead.token}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-sm">{lead.companyName}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{lead.contactName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        {lead.contactEmail}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getPlanBadge(lead.planInterest)}
                    </td>
                    <td className="py-3 px-4">
                      {getSourceBadge(lead.source)}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(lead.status)}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowDetailModal(true);
                          }}
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {!lead.convertedToAgencyId && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditLead(lead)}
                              title="Editar pista"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {lead.status === 'won' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleConvertLead(lead)}
                                title="Converter para agência"
                              >
                                <ArrowRight className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLead(lead)}
                              title="Excluir pista"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filteredLeads.map((lead: Lead) => (
              <div key={lead.id} className="border rounded-lg p-4 shadow-sm bg-white">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-muted-foreground break-all">{lead.token}</p>
                    <p className="font-semibold text-sm break-words">{lead.companyName}</p>
                    <p className="text-xs text-muted-foreground">Criado em {formatDate(lead.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {getStatusBadge(lead.status)}
                    {getSourceBadge(lead.source)}
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="break-words">{lead.contactName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="break-all">{lead.contactEmail}</span>
                  </div>
                  {lead.planInterest && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Plano:</span>
                      {getPlanBadge(lead.planInterest)}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedLead(lead);
                      setShowDetailModal(true);
                    }}
                  >
                    Detalhes
                  </Button>
                  {!lead.convertedToAgencyId && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditLead(lead)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDeleteLead(lead)}
                      >
                        Excluir
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredLeads.length === 0 && (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma pista encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Lead Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Nova Pista</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createLeadMutation.mutate({
                  companyName: formData.get('companyName') as string,
                  contactName: formData.get('contactName') as string,
                  contactEmail: formContactEmail || (formData.get('contactEmail') as string),
                  contactPhone: formContactPhone || (formData.get('contactPhone') as string),
                  city: formCity || (formData.get('city') as string),
                  state: formState || (formData.get('state') as string),
                  address: formAddress || (formData.get('address') as string),
                  cep: formCEP || undefined,
                  source: formSource,
                  planInterest: formPlanInterest || undefined,
                  notes: formData.get('notes') as string || undefined,
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome da Empresa/Agência *</label>
                  <Input name="companyName" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">E-mail *</label>
                  <div className="relative">
                    <Input
                      name="contactEmail"
                      type="email"
                      value={formContactEmail}
                      onChange={(e) => {
                        setFormContactEmail(e.target.value);
                        setEmailVerified(false);
                        setEmailError('');
                      }}
                      onBlur={(e) => checkEmailExists(e.target.value)}
                      placeholder="email@exemplo.com"
                      required
                      className={`pr-10 ${emailError ? 'border-red-500' : emailVerified ? 'border-green-500' : ''}`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingEmail && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                      {!checkingEmail && emailVerified && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {!checkingEmail && emailError && <XCircle className="w-4 h-4 text-red-500" />}
                    </div>
                  </div>
                  {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
                  {emailVerified && !emailError && <p className="text-green-500 text-sm mt-1">Email disponível</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome do Contato *</label>
                  <Input name="contactName" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Telefone</label>
                  <div className="relative">
                    <Input
                      name="contactPhone"
                      type="tel"
                      value={formContactPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value && !validatePhone(e.target.value)) {
                          setPhoneError('Telefone deve ter 10 ou 11 dígitos');
                          setPhoneVerified(false);
                        }
                      }}
                      placeholder="(11) 99999-9999"
                      className={`pr-10 ${phoneError ? 'border-red-500' : phoneVerified && formContactPhone ? 'border-green-500' : ''}`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {phoneVerified && formContactPhone && !phoneError && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {phoneError && <XCircle className="w-4 h-4 text-red-500" />}
                    </div>
                  </div>
                  {phoneError && <p className="text-red-500 text-sm mt-1">{phoneError}</p>}
                  {phoneVerified && formContactPhone && !phoneError && <p className="text-green-500 text-sm mt-1">Telefone válido</p>}
                </div>
              </div>

              <div>
                <CEPInput
                  value={formCEP}
                  onChange={(value) => setFormCEP(value)}
                  onCEPData={handleCEPData}
                  label="CEP"
                  placeholder="00000-000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Endereço</label>
                <Input name="address" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Cidade</label>
                  <Input name="city" value={formCity} onChange={(e) => setFormCity(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Estado</label>
                  <Input name="state" maxLength={2} placeholder="SP" value={formState} onChange={(e) => setFormState(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Origem *</label>
                  <Select value={formSource} onValueChange={(value) => setFormSource(value as Lead['source'])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a origem" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(sourceConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Plano de Interesse</label>
                  <Select value={formPlanInterest || 'none'} onValueChange={(value) => setFormPlanInterest(value === 'none' ? '' : value as Lead['planInterest'])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" hidden>Nenhum</SelectItem>
                      {Object.entries(planConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notas (internas)</label>
                <textarea
                  name="notes"
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                  rows={3}
                  placeholder="Observações internas sobre a pista..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormSource('Manual');
                    setFormPlanInterest('');
                    setFormCEP('');
                    setFormAddress('');
                    setFormCity('');
                    setFormState('');
                    setFormContactEmail('');
                    setEmailError('');
                    setEmailVerified(false);
                    setFormContactPhone('');
                    setPhoneError('');
                    setPhoneVerified(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createLeadMutation.isPending || checkingEmail || !emailVerified || (formContactPhone ? !phoneVerified : false)}>
                  {createLeadMutation.isPending ? 'Salvando...' : 'Criar Pista'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showEditModal && selectedLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowEditModal(false);
            setSelectedLead(null);
          }}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Editar Pista</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateLeadMutation.mutate({
                  id: selectedLead.id,
                  data: {
                    companyName: formData.get('companyName') as string,
                    contactName: formData.get('contactName') as string,
                    contactEmail: formContactEmail || (formData.get('contactEmail') as string),
                    contactPhone: formContactPhone || (formData.get('contactPhone') as string),
                    city: formCity || (formData.get('city') as string),
                    state: formState || (formData.get('state') as string),
                    address: formAddress || (formData.get('address') as string),
                    cep: formCEP || undefined,
                    source: formSource,
                    status: formStatus,
                    planInterest: formPlanInterest || undefined,
                    notes: formData.get('notes') as string || undefined,
                  },
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome da Empresa/Agência *</label>
                  <Input name="companyName" defaultValue={selectedLead.companyName} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">E-mail *</label>
                  <div className="relative">
                    <Input
                      name="contactEmail"
                      type="email"
                      value={formContactEmail}
                      onChange={(e) => {
                        setFormContactEmail(e.target.value);
                        setEmailVerified(false);
                        setEmailError('');
                      }}
                      onBlur={(e) => checkEmailExists(e.target.value, selectedLead.contactEmail)}
                      placeholder="email@exemplo.com"
                      required
                      className={`pr-10 ${emailError ? 'border-red-500' : emailVerified ? 'border-green-500' : ''}`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingEmail && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                      {!checkingEmail && emailVerified && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {!checkingEmail && emailError && <XCircle className="w-4 h-4 text-red-500" />}
                    </div>
                  </div>
                  {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
                  {emailVerified && !emailError && <p className="text-green-500 text-sm mt-1">Email disponível</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome do Contato *</label>
                  <Input name="contactName" defaultValue={selectedLead.contactName} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Telefone</label>
                  <div className="relative">
                    <Input
                      name="contactPhone"
                      type="tel"
                      value={formContactPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value && !validatePhone(e.target.value)) {
                          setPhoneError('Telefone deve ter 10 ou 11 dígitos');
                          setPhoneVerified(false);
                        }
                      }}
                      placeholder="(11) 99999-9999"
                      className={`pr-10 ${phoneError ? 'border-red-500' : phoneVerified && formContactPhone ? 'border-green-500' : ''}`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {phoneVerified && formContactPhone && !phoneError && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {phoneError && <XCircle className="w-4 h-4 text-red-500" />}
                    </div>
                  </div>
                  {phoneError && <p className="text-red-500 text-sm mt-1">{phoneError}</p>}
                  {phoneVerified && formContactPhone && !phoneError && <p className="text-green-500 text-sm mt-1">Telefone válido</p>}
                </div>
              </div>

              <div>
                <CEPInput
                  value={formCEP}
                  onChange={(value) => setFormCEP(value)}
                  onCEPData={handleEditCEPData}
                  label="CEP"
                  placeholder="00000-000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Endereço</label>
                <Input name="address" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Cidade</label>
                  <Input name="city" value={formCity} onChange={(e) => setFormCity(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Estado</label>
                  <Input name="state" maxLength={2} placeholder="SP" value={formState} onChange={(e) => setFormState(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <Select value={formStatus} onValueChange={(value) => setFormStatus(value as Lead['status'])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Origem</label>
                  <Select value={formSource} onValueChange={(value) => setFormSource(value as Lead['source'])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(sourceConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Plano de Interesse</label>
                <Select value={formPlanInterest || 'none'} onValueChange={(value) => setFormPlanInterest(value === 'none' ? '' : value as Lead['planInterest'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {Object.entries(planConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notas (internas)</label>
                <textarea
                  name="notes"
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                  rows={3}
                  defaultValue={selectedLead.notes || ''}
                  placeholder="Observações internas sobre a pista..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedLead(null);
                    setFormCEP('');
                    setFormAddress('');
                    setFormCity('');
                    setFormState('');
                    setFormContactEmail('');
                    setEmailError('');
                    setEmailVerified(false);
                    setFormContactPhone('');
                    setPhoneError('');
                    setPhoneVerified(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateLeadMutation.isPending || checkingEmail || !emailVerified || (formContactPhone ? !phoneVerified : false)}>
                  {updateLeadMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {showDetailModal && selectedLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowDetailModal(false);
            setSelectedLead(null);
          }}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Detalhes da Pista</h2>

            {/* Header info with status and origem (no titles) */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4 pb-4 border-b">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold break-words">Empresa/Agência :&nbsp;{selectedLead.companyName}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1 break-words">
                  <span className="font-mono text-xs">{selectedLead.token}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {getStatusBadge(selectedLead.status)}
                {getSourceBadge(selectedLead.source)}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome da Empresa/Agência *</label>
                  <div className="px-3 py-2 border rounded-lg bg-gray-50 text-sm">
                    {selectedLead.companyName || '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">E-mail *</label>
                  <div className="px-3 py-2 border rounded-lg bg-gray-50 text-sm break-all">
                    {selectedLead.contactEmail || '-'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome do Contato *</label>
                  <div className="px-3 py-2 border rounded-lg bg-gray-50 text-sm">
                    {selectedLead.contactName || '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Telefone</label>
                  <div className="px-3 py-2 border rounded-lg bg-gray-50 text-sm">
                    {selectedLead.contactPhone || '-'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">CEP</label>
                  <div className="px-3 py-2 border rounded-lg bg-gray-50 text-sm">
                    {(selectedLead as any).cep || '-'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Endereço</label>
                  <div className="px-3 py-2 border rounded-lg bg-gray-50 text-sm">
                    {selectedLead.address || '-'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Cidade</label>
                  <div className="px-3 py-2 border rounded-lg bg-gray-50 text-sm">
                    {selectedLead.city || '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Estado</label>
                  <div className="px-3 py-2 border rounded-lg bg-gray-50 text-sm">
                    {selectedLead.state || '-'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Plano de Interesse</label>
                  <div className="px-3 py-2 border rounded-lg bg-gray-50 text-sm">
                    {getPlanBadge(selectedLead.planInterest) || <span className="text-muted-foreground">Não definido</span>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Criado em</label>
                  <div className="px-3 py-2 border rounded-lg bg-gray-50 text-sm">
                    {formatDate(selectedLead.createdAt)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notas (internas)</label>
                <div className="px-3 py-2 border rounded-lg bg-yellow-50 text-sm whitespace-pre-wrap min-h-[80px]">
                  {selectedLead.notes || '-'}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedLead(null);
                }}
              >
                Fechar
              </Button>
              {!selectedLead.convertedToAgencyId && (
                <>
                  {selectedLead.status === 'won' && (
                    <Button onClick={() => {
                      setShowDetailModal(false);
                      handleConvertLead(selectedLead);
                    }}>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Converter para Agência
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Convert Lead to Agency Modal */}
      {showConvertModal && selectedLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowConvertModal(false);
            setSelectedLead(null);
          }}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Converter Lead para Agência</h2>
            <p className="text-muted-foreground mb-6">
              Esta ação irá criar uma conta de agência para <strong>{selectedLead.companyName}</strong>.
              O lead será bloqueado para edição após a conversão.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                convertLeadMutation.mutate({
                  id: selectedLead.id,
                  planType: formData.get('planType') as string,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">Plano Inicial *</label>
                <Select name="planType" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(planConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Atenção:</strong> Após a conversão, o lead será bloqueado e não poderá ser editado.
                  Uma conta de agência será criada e o contato receberá um e-mail com instruções de acesso.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowConvertModal(false);
                    setSelectedLead(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={convertLeadMutation.isPending}>
                  {convertLeadMutation.isPending ? 'Convertendo...' : 'Converter para Agência'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Lead Confirmation Modal */}
      {showDeleteModal && selectedLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowDeleteModal(false);
            setSelectedLead(null);
          }}
        >
          <div
            className="bg-white rounded-xl px-6 sm:px-8 py-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Excluir Pista</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Esta ação não pode ser desfeita
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-700">
                Tem certeza que deseja excluir a pista <strong>"{selectedLead.companyName}"</strong>?
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Todos os dados relacionados a esta pista serão permanentemente removidos.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedLead(null);
                }}
                disabled={deleteLeadMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={confirmDeleteLead}
                disabled={deleteLeadMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteLeadMutation.isPending ? 'Excluindo...' : 'Excluir Pista'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

