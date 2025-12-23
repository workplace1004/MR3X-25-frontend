import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usersAPI } from '../../api';
import { Plus, Search, Eye, UserCheck, UserX, Users, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Skeleton } from '../../components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { FrozenUserBadge } from '../../components/ui/FrozenBadge';
import { getRoleLabel } from '../../lib/role-utils';

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

export function AdminUsersPage() {
  const { user, hasPermission } = useAuth();
  const [items, setItems] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const pageSize = 10;

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [userDetail, setUserDetail] = useState<UserItem | null>(null);
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null);

  const canViewUsers = hasPermission('users:read');
  const canCreateUsers = hasPermission('users:create');
  const canDeleteUsers = hasPermission('users:delete');
  const allowAccess = canViewUsers && user?.role === 'ADMIN';

  useEffect(() => {
    if (user && !allowAccess) {
      toast.error('Você não tem permissão para acessar esta página');
      window.history.back();
    }
  }, [user, allowAccess]);

  const handleSearch = useCallback(() => {
    setSearchQuery(searchTerm.trim());
    setPage(1);
  }, [searchTerm]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchQuery('');
    setPage(1);
  }, []);

  const load = useCallback(async () => {
    if (!allowAccess) return;
    setLoading(true);
    try {
      const res = await usersAPI.listUsers({
        search: searchQuery,
        page,
        pageSize,
        excludeCurrentUser: true,
        createdById: user?.id,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (error: any) {
      toast.error(error.message || 'Falha ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, [allowAccess, searchQuery, page, pageSize, user?.id]);

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

  const getPlanLabel = (p?: string) => {
    if (!p) return '-';
    const map: Record<string, string> = {
      FREE: 'Gratuito',
      STARTER: 'Gratuito',
      BASIC: 'Básico',
      BUSINESS: 'Básico',
      PRO: 'Profissional',
      PREMIUM: 'Profissional',
      ENTERPRISE: 'Empresarial',
      ENTERPRISES: 'Empresarial',
    };
    return map[p.toUpperCase()] || p;
  };

  const getStatusColor = (s: string) => {
    switch (s) {
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

  const handleViewUser = async (u: UserItem) => {
    setLoadingDetailsId(u.id);
    setUserDetail(null);
    setShowDetailModal(true);
    try {
      const full = await usersAPI.getUserById(u.id);
      setUserDetail(full);
    } catch {
      toast.error('Erro ao carregar detalhes do usuário');
      setShowDetailModal(false);
    } finally {
      setLoadingDetailsId(null);
    }
  };

  if (!allowAccess) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Users className="w-6 h-6 text-purple-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Usuários (Administrador)</h1>
            <p className="text-sm text-muted-foreground">Usuários cadastrados por você</p>
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
            <Button variant="ghost" size="sm" onClick={handleClearSearch} className="self-stretch">
              Limpar
            </Button>
          )}
        </div>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Função</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plano</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Ações</th>
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
                  {searchQuery
                    ? 'Nenhum usuário corresponde aos filtros aplicados.'
                    : 'Ainda não há usuários cadastrados por você.'}
                </p>
              </div>
            </div>
          ) : items.map((u) => (
            <div key={u.id} className="border border-border rounded-lg p-4 space-y-3 bg-card shadow-sm min-w-0 overflow-hidden">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={u.photoUrl || undefined} alt={u.name || 'Usuário'} />
                  <AvatarFallback className="bg-orange-100 text-orange-700">
                    {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold leading-tight truncate" title={u.name || 'Sem nome'}>
                    {u.name || 'Sem nome'}
                  </h3>
                  {u.token && <p className="text-[10px] text-muted-foreground font-mono">{u.token}</p>}
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
                <Badge>{getRoleLabel(u.role)}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Plano:</span>
                <Badge variant="outline">{getPlanLabel(u.plan)}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Status:</span>
                {u.isFrozen ? <FrozenUserBadge reason={u.frozenReason} /> : <Badge className={getStatusColor(u.status)}>{u.status}</Badge>}
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
              </div>
              {canDeleteUsers && !u.isFrozen && (
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Função</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plano</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Ações</th>
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
                        {searchQuery
                          ? 'Nenhum usuário corresponde aos filtros aplicados.'
                          : 'Ainda não há usuários cadastrados por você.'}
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
                          <AvatarImage src={u.photoUrl || undefined} alt={u.name || 'Usuário'} />
                          <AvatarFallback className="bg-orange-100 text-orange-700">
                            {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-foreground">{u.name || 'Sem nome'}</div>
                          {u.token && <div className="text-[10px] text-muted-foreground font-mono">{u.token}</div>}
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
                      <Badge>{getRoleLabel(u.role)}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline">{getPlanLabel(u.plan)}</Badge>
                    </td>
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
                        {canDeleteUsers && !u.isFrozen &&
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

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do usuário</DialogTitle>
          </DialogHeader>
          {loadingDetailsId && !userDetail ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : userDetail ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={userDetail.photoUrl || undefined} alt={userDetail.name || 'Usuário'} />
                  <AvatarFallback className="bg-orange-100 text-orange-700">
                    {(userDetail.name || userDetail.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{userDetail.name || 'Sem nome'}</div>
                  <div className="text-muted-foreground">{userDetail.email}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{getRoleLabel(userDetail.role)}</Badge>
                <Badge variant="outline">{getPlanLabel(userDetail.plan)}</Badge>
                <Badge className={getStatusColor(userDetail.status)}>{userDetail.status}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground text-xs">Telefone</p>
                  <p>{(userDetail as any).phone || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Documento</p>
                  <p>{(userDetail as any).document || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Criado em</p>
                  <p>{userDetail.createdAt ? new Date(userDetail.createdAt).toLocaleDateString('pt-BR') : '-'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Não foi possível carregar os detalhes.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

