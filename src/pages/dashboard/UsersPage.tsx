import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usersAPI } from '../../api';
import { Plus, Search, Eye, Edit, UserCheck, UserX, Users } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { FrozenUserBadge } from '../../components/ui/FrozenBadge';

type UserItem = { id: string; name: string | null; email: string; role: string; status: string; plan?: string; createdAt?: string; isFrozen?: boolean; frozenReason?: string };

export function UsersPage() {
  const { user, hasPermission } = useAuth();
  const [items, setItems] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [page, setPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
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
  const canEditUsers = hasPermission('users:update');
  const canDeleteUsers = hasPermission('users:delete');
  // Allow CEO, ADMIN, AGENCY_ADMIN, AGENCY_MANAGER, BROKER, PROPRIETARIO, INDEPENDENT_OWNER
  const isAllowedRole = ['CEO', 'ADMIN', 'AGENCY_ADMIN', 'AGENCY_MANAGER', 'BROKER', 'PROPRIETARIO', 'INDEPENDENT_OWNER'].includes(user?.role || '');
  const allowAccess = canViewUsers && isAllowedRole;

  useEffect(() => {
    if (user && !allowAccess) {
      toast.error('Você não tem permissão para acessar a página de usuários');
      window.history.back();
    }
  }, [user, allowAccess]);

  const load = async () => {
    if (!allowAccess) return;

    setLoading(true);
    try {
      const res = await usersAPI.listUsers({ search: searchQuery, role, status, plan, page, pageSize, excludeCurrentUser: true });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (error: any) {
      toast.error(error.message || 'Falha ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, allowAccess, searchQuery, role, status, plan]);

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

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
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
              <div className="min-w-0">
                <h3 className="text-base font-semibold leading-tight truncate" title={u.name || 'Sem nome'}>
                  {u.name || 'Sem nome'}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  Criado em {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : 'data desconhecida'}
                </p>
              </div>
              <div className="text-sm min-w-0">
                <span className="font-medium text-muted-foreground">Email:</span>
                <span className="truncate block" title={u.email}>
                  {u.email}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Função:</span>
                <Badge className={getRoleColor(u.role)}>{u.role}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Plano:</span>
                <Badge variant="outline">{u.plan || '-'}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Status:</span>
                <Badge className={getStatusColor(u.status)}>{u.status}</Badge>
                {u.isFrozen && <FrozenUserBadge reason={u.frozenReason} />}
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to={`/dashboard/users/${u.id}`}>
                    <Eye className="w-4 h-4 mr-2" /> Detalhes
                  </Link>
                </Button>
                {canEditUsers && (
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link to={`/dashboard/users/${u.id}/edit`}>
                      <Edit className="w-4 h-4 mr-2" /> Editar
                    </Link>
                  </Button>
                )}
              </div>
              {canDeleteUsers && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
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
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12">
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
                      <div className="font-medium text-foreground">{u.name || 'Sem nome'}</div>
                      <div className="text-xs text-muted-foreground">
                        Criado em {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : 'data desconhecida'}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-sm text-muted-foreground break-all">{u.email}</div>
                    </td>
                    <td className="px-4 py-2">
                      <Badge className={getRoleColor(u.role)}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline">{u.plan || '-'}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(u.status)}>{u.status}</Badge>
                        {u.isFrozen && <FrozenUserBadge reason={u.frozenReason} />}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/dashboard/users/${u.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        {canEditUsers && (
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/dashboard/users/${u.id}/edit`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                        )}
                        {canDeleteUsers &&
                          (u.status === 'ACTIVE' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(u.id, 'SUSPENDED')}
                              className="text-red-600 hover:text-red-700"
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(u.id, 'ACTIVE')}
                              className="text-green-600 hover:text-green-700"
                            >
                              <UserCheck className="w-4 h-4" />
                            </Button>
                          ))}
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
    </div>
  );
}
