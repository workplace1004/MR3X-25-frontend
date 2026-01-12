import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usersAPI } from '../../api';
import { Plus, Search, Eye, UserCheck, UserX, Users, Loader2, Mail, Phone, Shield, Calendar, Activity, User, MapPin, CreditCard, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Skeleton } from '../../components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { FrozenUserBadge } from '../../components/ui/FrozenBadge';
import { getRoleLabel } from '../../lib/role-utils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

const getStaticBaseUrl = () => {
  const url = API_BASE_URL;
  return url.endsWith('/api') ? url.slice(0, -4) : url;
};

const getPhotoUrl = (photoUrl: string | null | undefined) => {
  if (!photoUrl) return undefined;
  if (photoUrl.startsWith('http')) return photoUrl;
  return `${getStaticBaseUrl()}${photoUrl}`;
};

type UserItem = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  plan?: string;
  createdAt?: string;
  isFrozen?: boolean;
  frozenReason?: string;
  photoUrl?: string | null;
  token?: string | null;
  createdBy?: string | null;
};

interface UserDetails {
  id: string;
  name: string;
  email: string;
  phone?: string;
  document?: string;
  token?: string | null;
  role: string;
  status: string;
  plan: string;
  createdAt: string;
  lastLogin?: string;
  photoUrl?: string | null;
  birthDate?: string;
  rg?: string;
  nationality?: string;
  maritalStatus?: string;
  profession?: string;
  creci?: string;
  cep?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccount?: string;
  pixKey?: string;
  ownedProperties?: Array<{ id: string; name: string; address?: string }>;
  contracts?: Array<{ id: string; status: string }>;
  _count?: {
    ownedProperties: number;
    contracts: number;
  };
  audit?: Array<{
    timestamp: string;
    event: string;
    userId: string;
  }>;
  notificationPreferences?: {
    email: boolean;
    whatsapp: boolean;
    push: boolean;
  };
  plainPassword?: string;
}

export function UsersPage() {
  const { user, hasPermission } = useAuth();
  const [items, setItems] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [userDetail, setUserDetail] = useState<UserDetails | null>(null);
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [page, setPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [hierarchyPath, setHierarchyPath] = useState<UserItem[]>([]);
  const [childRoleFilter, setChildRoleFilter] = useState<string>('');
  const pageSize = 10;

  const handleSearch = useCallback(() => {
    setSearchQuery(searchTerm.trim());
    setPage(1);
  }, [searchTerm]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchQuery('');
    setPage(1);
  }, []);

  const canViewUsers = hasPermission('users:read');
  const canCreateUsers = hasPermission('users:create');
  const canDeleteUsers = hasPermission('users:delete');
  const isAllowedRole = ['CEO', 'ADMIN', 'AGENCY_ADMIN', 'AGENCY_MANAGER', 'BROKER', 'PROPRIETARIO', 'INDEPENDENT_OWNER'].includes(user?.role || '');
  const allowAccess = canViewUsers && isAllowedRole;

  useEffect(() => {
    if (user && !allowAccess) {
      toast.error('Você não tem permissão para acessar a página de usuários');
      window.history.back();
    }
  }, [user, allowAccess]);

  const currentParent = useMemo(() => (hierarchyPath.length ? hierarchyPath[hierarchyPath.length - 1] : null), [hierarchyPath]);
  const allowedRootRoles = useMemo(() => ['ADMIN', 'AGENCY_ADMIN', 'INDEPENDENT_OWNER'], []);
  const derivedRoleFilter = useMemo(() => {
    if (childRoleFilter) return childRoleFilter;
    if (currentParent?.role === 'INDEPENDENT_OWNER') {
      return 'INQUILINO';
    }
    return role;
  }, [childRoleFilter, currentParent?.role, role]);

  const applyHierarchyFilter = useCallback((list: UserItem[]) => {
    if (!list) return [];
    if (!currentParent) {
      // root: show only top-level registry starters
      return list.filter((u) => allowedRootRoles.includes(u.role));
    }
    if (currentParent.role === 'INDEPENDENT_OWNER') {
      // tenants only; exclude owner/broker when viewing an independent owner registry
      return list.filter((u) => u.role !== 'PROPRIETARIO' && u.role !== 'BROKER');
    }
    return list;
  }, [allowedRootRoles, currentParent]);

  const handleEnterRegistry = useCallback((u: UserItem) => {
    setHierarchyPath((prev) => [...prev, u]);
    setChildRoleFilter('');
    setPage(1);
  }, []);

  const handleBackRegistry = useCallback(() => {
    setHierarchyPath((prev) => prev.slice(0, -1));
    setChildRoleFilter('');
    setPage(1);
  }, []);

  const handleResetRegistry = useCallback(() => {
    setHierarchyPath([]);
    setChildRoleFilter('');
    setPage(1);
  }, []);

  const load = useCallback(async () => {
    if (!allowAccess) return;

    setLoading(true);
    try {
      const baseRoles = currentParent ? undefined : allowedRootRoles;
      const res = await usersAPI.listUsers({
        search: searchQuery,
        role: derivedRoleFilter,
        roles: baseRoles,
        status,
        plan,
        page,
        pageSize,
        excludeCurrentUser: true,
        createdById: currentParent?.id,
      });
      const filtered = applyHierarchyFilter(res.items || []);
      setItems(filtered);
      setTotal(res.total || filtered.length || 0);
    } catch (error: any) {
      toast.error(error.message || 'Falha ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, [allowAccess, searchQuery, derivedRoleFilter, status, plan, page, pageSize, currentParent?.id, applyHierarchyFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    if (!canDeleteUsers) {
      toast.error('Você não tem permissão para alterar o status do usuário');
      return;
    }

    try {
      await usersAPI.changeStatus(userId, newStatus as 'ACTIVE' | 'SUSPENDED', `Status alterado para ${newStatus}`);
      toast.success(newStatus === 'ACTIVE' ? 'Usuário ativado com sucesso' : 'Usuário suspenso com sucesso');
      load();
    } catch (error: any) {
      toast.error(error.message || 'Falha ao alterar status do usuário');
    }
  };

  // View modal handler
  const handleViewUser = async (userData: UserItem) => {
    const userId = userData.id.toString();
    setLoadingDetailsId(userId);
    setUserDetail(null);
    setShowDetailModal(true);
    try {
      const fullUserDetails = await usersAPI.getUserById(userData.id);
      setUserDetail(fullUserDetails);
    } catch {
      toast.error('Erro ao carregar detalhes do usuário');
      setShowDetailModal(false);
    } finally {
      setLoadingDetailsId(null);
    }
  };

  const planLabelMap: Record<string, string> = {
    FREE: 'Gratuito',
    STARTER: 'Gratuito',
    BASIC: 'Básico',
    BUSINESS: 'Básico',
    PRO: 'Profissional',
    PREMIUM: 'Profissional',
    ENTERPRISE: 'Empresarial',
    ENTERPRISES: 'Empresarial',
  };

  const getPlanLabel = (plan?: string) => {
    if (!plan) return '-';
    const key = plan.toUpperCase();
    return planLabelMap[key] || plan;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INVITED':
        return 'bg-blue-100 text-blue-800';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canDrillDown = (u: UserItem) => ['ADMIN', 'AGENCY_ADMIN', 'INDEPENDENT_OWNER'].includes(u.role);
  
  // Helper function to determine if plan should be shown
  // Only show plans for AGENCY_ADMIN and INDEPENDENT_OWNER
  // Hide for CEO, ADMIN, PLATFORM_MANAGER, PROPRIETARIO, INQUILINO
  const shouldShowPlan = (userRole: string) => {
    return ['AGENCY_ADMIN', 'INDEPENDENT_OWNER'].includes(userRole);
  };
  
  // Helper function to determine if user can be deleted
  // Only internal platform users can be deleted (CEO, ADMIN, PLATFORM_MANAGER, LEGAL_AUDITOR, REPRESENTATIVE, API_CLIENT)
  // Agency users (AGENCY_ADMIN, AGENCY_MANAGER, BROKER, PROPRIETARIO, INDEPENDENT_OWNER, INQUILINO) cannot be deleted, only suspended
  const canDeleteUser = (userRole: string) => {
    const internalPlatformRoles = ['CEO', 'ADMIN', 'PLATFORM_MANAGER', 'LEGAL_AUDITOR', 'REPRESENTATIVE', 'API_CLIENT'];
    return internalPlatformRoles.includes(userRole);
  };
  
  const handleDeleteUser = async (userId: string, userName: string, userRole: string) => {
    if (!canDeleteUser(userRole)) {
      toast.error('Usuários de agência não podem ser excluídos, apenas suspensos');
      return;
    }
    
    if (!window.confirm(`Tem certeza que deseja excluir o usuário ${userName || userId}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    
    try {
      await usersAPI.deleteUser(userId);
      toast.success('Usuário excluído com sucesso');
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Falha ao excluir usuário');
    }
  };
  
  const handleSelectChildRole = useCallback((r: string) => {
    setChildRoleFilter(r);
    setPage(1);
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'CEO':
        return 'bg-purple-100 text-purple-800';
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'PLATFORM_MANAGER':
        return 'bg-orange-100 text-orange-800';
      case 'AGENCY_ADMIN':
        return 'bg-indigo-100 text-indigo-800';
      case 'AGENCY_MANAGER':
        return 'bg-blue-100 text-blue-800';
      case 'PROPRIETARIO':
        return 'bg-green-100 text-green-800';
      case 'INDEPENDENT_OWNER':
        return 'bg-emerald-100 text-emerald-800';
      case 'BROKER':
        return 'bg-yellow-100 text-yellow-800';
      case 'INQUILINO':
        return 'bg-gray-100 text-gray-800';
      case 'BUILDING_MANAGER':
        return 'bg-cyan-100 text-cyan-800';
      case 'LEGAL_AUDITOR':
        return 'bg-violet-100 text-violet-800';
      case 'REPRESENTATIVE':
        return 'bg-pink-100 text-pink-800';
      case 'API_CLIENT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!allowAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para visualizar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Users className="w-6 h-6 text-purple-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Usuários</h1>
            <p className="text-sm text-muted-foreground">Gerencie usuários e permissões</p>
          </div>
        </div>
        {canCreateUsers && (
          <Link to="/dashboard/users/new">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Novo Usuário
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex w-full sm:max-w-lg gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Pesquisar por nome, email ou documento"
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} className="self-stretch">
            Buscar
          </Button>
          {(searchTerm || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="self-stretch"
            >
              Limpar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        <Select value={role || 'all'} onValueChange={(v) => setRole(v === 'all' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Função" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Função</SelectItem>
            <SelectItem value="CEO">CEO</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="PLATFORM_MANAGER">Gerente Interno MR3X</SelectItem>
            <SelectItem value="AGENCY_ADMIN">Diretor de Agência</SelectItem>
            <SelectItem value="AGENCY_MANAGER">Gestor de Agência</SelectItem>
            <SelectItem value="BROKER">Corretor</SelectItem>
            <SelectItem value="PROPRIETARIO">Imóvel</SelectItem>
            <SelectItem value="INDEPENDENT_OWNER">Imóvel Independente</SelectItem>
            <SelectItem value="INQUILINO">Inquilino</SelectItem>
            <SelectItem value="BUILDING_MANAGER">Síndico</SelectItem>
            <SelectItem value="LEGAL_AUDITOR">Auditor</SelectItem>
            <SelectItem value="REPRESENTATIVE">Representante</SelectItem>
            <SelectItem value="API_CLIENT">API Client</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Status</SelectItem>
            <SelectItem value="ACTIVE">Ativo</SelectItem>
            <SelectItem value="INVITED">Convidado</SelectItem>
            <SelectItem value="SUSPENDED">Suspenso</SelectItem>
          </SelectContent>
        </Select>
        <Select value={plan || 'all'} onValueChange={(v) => setPlan(v === 'all' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Plano</SelectItem>
            <SelectItem value="FREE">FREE</SelectItem>
            <SelectItem value="ESSENCIAL">ESSENCIAL</SelectItem>
            <SelectItem value="PROFISSIONAL">PROFISSIONAL</SelectItem>
            <SelectItem value="PREMIUM">PREMIUM</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg p-3 bg-muted/30 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase">Registro atual</p>
            {hierarchyPath.length === 0 ? (
              <p className="text-sm text-foreground">
                Raiz: Admin / Diretor de Agência / Proprietário Independente
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {hierarchyPath.map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-1">
                    {idx > 0 && <span className="text-muted-foreground">/</span>}
                    <Badge variant="outline">{getRoleLabel(p.role)}</Badge>
                    <span className="text-foreground truncate max-w-[140px]">{p.name || p.email}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {hierarchyPath.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleBackRegistry}>
                Voltar
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleResetRegistry}>
              Ir para raiz
            </Button>
          </div>
        </div>
        {(currentParent?.role === 'AGENCY_ADMIN' || currentParent?.role === 'ADMIN') && (
          <div className="flex flex-wrap gap-2 pt-2">
            {[
              ...(currentParent?.role === 'ADMIN'
                ? [
                    { label: 'Auditor Legal', role: 'LEGAL_AUDITOR' },
                    { label: 'Representante', role: 'REPRESENTATIVE' },
                    { label: 'Gerente Interno MR3X - Suporte e Estatísticas', role: 'PLATFORM_MANAGER' },
                    { label: 'Cliente API - Integração', role: 'API_CLIENT' },
                  ]
                : []),
              ...(currentParent?.role === 'AGENCY_ADMIN'
                ? [
                    { label: 'Corretores', role: 'BROKER' },
                    { label: 'Proprietários', role: 'PROPRIETARIO' },
                    { label: 'Inquilinos', role: 'INQUILINO' },
                    { label: 'Branch Manager', role: 'AGENCY_MANAGER' },
                  ]
                : []),
            ].map((opt) => (
              <Button
                key={opt.role}
                variant={childRoleFilter === opt.role ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSelectChildRole(opt.role)}
              >
                {opt.label}
              </Button>
            ))}
            <Button
              variant={!childRoleFilter ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleSelectChildRole('')}
            >
              Todos
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        isMobile ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border border-border rounded-lg p-4 space-y-3 bg-card">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Função
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Plano
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="px-4 py-2">
                      <Skeleton className="h-6 w-20" />
                    </td>
                    <td className="px-4 py-2">
                      <Skeleton className="h-6 w-16" />
                    </td>
                    <td className="px-4 py-2">
                      <Skeleton className="h-6 w-20" />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2 justify-center">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : isMobile ? (
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="border border-border rounded-lg p-12 bg-card">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-muted rounded-full mb-4">
                  <Users className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum usuário encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || role || status || plan
                    ? 'Nenhum usuário corresponde aos filtros aplicados.'
                    : 'Ainda não há usuários cadastrados no sistema.'}
                </p>
              </div>
            </div>
          ) : items.map((u) => (
            <div key={u.id} className="border border-border rounded-lg p-4 space-y-3 bg-card shadow-sm min-w-0 overflow-hidden">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={getPhotoUrl(u.photoUrl)} alt={u.name || 'Usuário'} />
                  <AvatarFallback className="bg-orange-100 text-orange-700">
                    {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold leading-tight truncate" title={u.name || 'Sem nome'}>
                    {u.name || 'Sem nome'}
                  </h3>
                  {u.token && (
                    <p className="text-[10px] text-muted-foreground font-mono">{u.token}</p>
                  )}
                  <p className="text-xs text-muted-foreground truncate">
                    Criado em {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : 'data desconhecida'}
                  </p>
                </div>
              </div>
              <div className="text-sm min-w-0">
                <span className="font-medium text-muted-foreground">Email:</span>
                <span className="truncate block" title={u.email}>
                  {u.email}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Função:</span>
                <Badge className={getRoleColor(u.role)}>{getRoleLabel(u.role)}</Badge>
              </div>
              {shouldShowPlan(u.role) && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-muted-foreground">Plano:</span>
                  <Badge variant="outline">{getPlanLabel(u.plan)}</Badge>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Status:</span>
                {u.isFrozen ? (
                  <FrozenUserBadge reason={u.frozenReason} />
                ) : (
                  <Badge className={getStatusColor(u.status)}>{u.status}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleViewUser(u)}
                  disabled={loadingDetailsId === u.id}
                >
                  {loadingDetailsId === u.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                  Detalhes
                </Button>
                {canDrillDown(u) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => handleEnterRegistry(u)}
                  >
                    Ver registro
                  </Button>
                )}
              </div>
              {canDeleteUsers && !u.isFrozen && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleStatusChange(u.id, u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
                  >
                    {u.status === 'ACTIVE' ? (
                      <span className="flex items-center justify-center gap-2 text-red-600">
                        <UserX className="w-4 h-4" /> Suspender
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2 text-green-600">
                        <UserCheck className="w-4 h-4" /> Ativar
                      </span>
                    )}
                  </Button>
                  {canDeleteUser(u.role) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteUser(u.id, u.name || '', u.role)}
                      title="Excluir usuário (apenas usuários internos da plataforma)"
                    >
                      <Trash2 className="w-4 h-4" /> Excluir
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Função
                </th>
                {items.some(u => shouldShowPlan(u.role)) && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Plano
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={items.some(u => shouldShowPlan(u.role)) ? 6 : 5} className="px-4 py-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="p-4 bg-muted rounded-full mb-4">
                        <Users className="w-12 h-12 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum usuário encontrado</h3>
                      <p className="text-sm text-muted-foreground">
                        {searchQuery || role || status || plan
                          ? 'Nenhum usuário corresponde aos filtros aplicados.'
                          : 'Ainda não há usuários cadastrados no sistema.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/40">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={getPhotoUrl(u.photoUrl)} alt={u.name || 'Usuário'} />
                          <AvatarFallback className="bg-orange-100 text-orange-700">
                            {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-foreground">{u.name || 'Sem nome'}</div>
                          {u.token && (
                            <div className="text-[10px] text-muted-foreground font-mono">{u.token}</div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Criado em {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : 'data desconhecida'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-sm text-muted-foreground break-all">{u.email}</div>
                    </td>
                    <td className="px-4 py-2">
                      <Badge className={getRoleColor(u.role)}>{getRoleLabel(u.role)}</Badge>
                    </td>
                    {items.some(u2 => shouldShowPlan(u2.role)) && (
                      <td className="px-4 py-2">
                        {shouldShowPlan(u.role) ? (
                          <Badge variant="outline">{getPlanLabel(u.plan)}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {u.isFrozen ? (
                          <FrozenUserBadge reason={u.frozenReason} />
                        ) : (
                          <Badge className={getStatusColor(u.status)}>{u.status}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewUser(u)}
                          disabled={loadingDetailsId === u.id}
                        >
                          {loadingDetailsId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        {canDrillDown(u) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEnterRegistry(u)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                        )}
                        {canDeleteUsers && !u.isFrozen && (
                          <>
                            {u.status === 'ACTIVE' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(u.id, 'SUSPENDED')}
                                className="text-red-600 hover:text-red-700"
                                title="Suspender usuário"
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(u.id, 'ACTIVE')}
                                className="text-green-600 hover:text-green-700"
                                title="Ativar usuário"
                              >
                                <UserCheck className="w-4 h-4" />
                              </Button>
                            )}
                            {canDeleteUser(u.role) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(u.id, u.name || '', u.role)}
                                className="text-red-700 hover:text-red-800 hover:bg-red-50"
                                title="Excluir usuário (apenas usuários internos da plataforma)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Total: {total}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Anterior
          </Button>
          <span className="px-2 py-1 text-sm">
            {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            Próxima
          </Button>
        </div>
      </div>

      {/* View User Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {userDetail ? `Detalhes de ${userDetail.name || 'Usuário'}` : 'Carregando...'}
            </DialogTitle>
          </DialogHeader>
          {loadingDetailsId && !userDetail ? (
            <div className="space-y-6">
              {/* Skeleton for user info */}
              <div className="flex items-center gap-4">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-60" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ) : userDetail ? (
            <div className="space-y-6">
              {/* User Header */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={getPhotoUrl(userDetail.photoUrl)} alt={userDetail.name || 'Usuário'} />
                  <AvatarFallback className="text-xl bg-orange-100 text-orange-700">
                    {(userDetail.name || userDetail.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{userDetail.name || 'Sem nome'}</h3>
                  {userDetail.token && (
                    <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded inline-block">{userDetail.token}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{userDetail.email}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className={getRoleColor(userDetail.role)}>{getRoleLabel(userDetail.role)}</Badge>
                    <Badge className={getStatusColor(userDetail.status)}>{userDetail.status}</Badge>
                    {shouldShowPlan(userDetail.role) && (
                      <Badge variant="outline">{userDetail.plan}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <h4 className="text-base font-semibold">Informações Pessoais</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Nome</Label>
                    <p className="text-sm">{userDetail.name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p className="text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {userDetail.email}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Telefone</Label>
                    <p className="text-sm flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {userDetail.phone || 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Documento</Label>
                    <p className="text-sm">{userDetail.document || 'Não informado'}</p>
                  </div>
                  {userDetail.birthDate && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Data de Nascimento</Label>
                      <p className="text-sm">{new Date(userDetail.birthDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                  )}
                  {userDetail.creci && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">CRECI</Label>
                      <p className="text-sm">{userDetail.creci}</p>
                    </div>
                  )}
                  {userDetail.rg && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">RG</Label>
                      <p className="text-sm">{userDetail.rg}</p>
                    </div>
                  )}
                  {userDetail.nationality && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Nacionalidade</Label>
                      <p className="text-sm">{userDetail.nationality}</p>
                    </div>
                  )}
                  {userDetail.maritalStatus && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Estado Civil</Label>
                      <p className="text-sm">{userDetail.maritalStatus}</p>
                    </div>
                  )}
                  {userDetail.profession && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Profissão</Label>
                      <p className="text-sm">{userDetail.profession}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Address Section */}
              {(userDetail.address || userDetail.city || userDetail.cep) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <h4 className="text-base font-semibold">Endereço</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userDetail.cep && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">CEP</Label>
                        <p className="text-sm">{userDetail.cep}</p>
                      </div>
                    )}
                    {userDetail.address && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Endereço</Label>
                        <p className="text-sm">{userDetail.address}</p>
                      </div>
                    )}
                    {userDetail.neighborhood && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Bairro</Label>
                        <p className="text-sm">{userDetail.neighborhood}</p>
                      </div>
                    )}
                    {userDetail.city && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Cidade</Label>
                        <p className="text-sm">{userDetail.city}</p>
                      </div>
                    )}
                    {userDetail.state && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Estado</Label>
                        <p className="text-sm">{userDetail.state}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bank Data Section */}
              {(userDetail.bankName || userDetail.pixKey) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-primary" />
                    </div>
                    <h4 className="text-base font-semibold">Dados Bancários</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userDetail.bankName && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Banco</Label>
                        <p className="text-sm">{userDetail.bankName}</p>
                      </div>
                    )}
                    {userDetail.bankBranch && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Agência</Label>
                        <p className="text-sm">{userDetail.bankBranch}</p>
                      </div>
                    )}
                    {userDetail.bankAccount && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Conta</Label>
                        <p className="text-sm">{userDetail.bankAccount}</p>
                      </div>
                    )}
                    {userDetail.pixKey && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Chave PIX</Label>
                        <p className="text-sm">{userDetail.pixKey}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Account Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <h4 className="text-base font-semibold">Informações da Conta</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Criado em</Label>
                    <p className="text-sm">{userDetail.createdAt ? new Date(userDetail.createdAt).toLocaleDateString('pt-BR') : '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Último login</Label>
                    <p className="text-sm">{userDetail.lastLogin ? new Date(userDetail.lastLogin).toLocaleDateString('pt-BR') : 'Nunca'}</p>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              {userDetail.audit && userDetail.audit.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                      <Activity className="w-4 h-4 text-primary" />
                    </div>
                    <h4 className="text-base font-semibold">Atividade Recente</h4>
                  </div>
                  <div className="space-y-2">
                    {userDetail.audit.slice(0, 5).map((log, index) => (
                      <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                        <span>{log.event}</span>
                        <span className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleDateString('pt-BR')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Não foi possível carregar os detalhes do usuário.
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
