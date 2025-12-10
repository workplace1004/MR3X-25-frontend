import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCheck, UserX, Calendar, Mail, Phone, Shield, Activity } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { usersAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';

interface UserDetails {
  id: string;
  name: string;
  email: string;
  phone?: string;
  document?: string;
  role: string;
  status: string;
  plan: string;
  createdAt: string;
  lastLogin?: string;
  ownedProperties: Array<{ id: string; name: string }>;
  contracts: Array<{ id: string; status: string }>;
  _count: {
    ownedProperties: number;
    contracts: number;
  };
  audit: Array<{
    timestamp: string;
    event: string;
    userId: string;
  }>;
}

export function UserDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canDeleteUsers = hasPermission('users:delete');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserDetails | null>(null);

  const canViewUsers = hasPermission('users:read');

  useEffect(() => {
    if (!canViewUsers) {
      toast.error('Você não tem permissão para visualizar usuários');
      navigate('/dashboard/users');
    }
  }, [canViewUsers, navigate]);

  useEffect(() => {
    if (params.id && canViewUsers) {
      fetchUserDetails(params.id as string);
    }
  }, [params.id, canViewUsers]);

  const fetchUserDetails = async (id: string) => {
    if (!canViewUsers) return;

    try {
      const userData = await usersAPI.getUserById(id);
      setUser(userData);
    } catch (error: any) {
      toast.error(error.message || 'Falha ao carregar detalhes do usuário');
      navigate('/dashboard/users');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!user || !canDeleteUsers) {
      toast.error('Você não tem permissão para alterar o status do usuário');
      return;
    }

    try {
      await usersAPI.changeStatus(user.id, newStatus as 'ACTIVE' | 'SUSPENDED', `Status alterado para ${newStatus}`);
      toast.success(newStatus === 'ACTIVE' ? 'Usuário ativado com sucesso' : 'Usuário suspenso com sucesso');
      fetchUserDetails(user.id);
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
      case 'AGENCY_MANAGER':
        return 'bg-blue-100 text-blue-800';
      case 'PROPRIETARIO':
        return 'bg-green-100 text-green-800';
      case 'BROKER':
        return 'bg-yellow-100 text-yellow-800';
      case 'INQUILINO':
        return 'bg-gray-100 text-gray-800';
      case 'BUILDING_MANAGER':
        return 'bg-cyan-100 text-cyan-800';
      case 'LEGAL_AUDITOR':
        return 'bg-indigo-100 text-indigo-800';
      case 'REPRESENTATIVE':
        return 'bg-pink-100 text-pink-800';
      case 'API_CLIENT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!canViewUsers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para visualizar usuários.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Usuário não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            {canDeleteUsers &&
              (user.status === 'ACTIVE' ? (
                <Button variant="destructive" size="sm" onClick={() => handleStatusChange('SUSPENDED')} className="flex items-center gap-2">
                  <UserX className="w-4 h-4" />
                  Suspender
                </Button>
              ) : (
                <Button size="sm" onClick={() => handleStatusChange('ACTIVE')} className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Ativar
                </Button>
              ))}
          </div>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold break-words">{user.name}</h1>
          <p className="text-sm text-muted-foreground">Detalhes do Perfil do Usuário</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {}
        <div className="lg:col-span-2 space-y-6">
          {}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Shield className="w-5 h-5" />
                Informações Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Nome</Label>
                  <p className="text-sm font-medium break-words">{user.name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-sm flex items-center gap-2 break-all">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    {user.email}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Telefone</Label>
                  <p className="text-sm flex items-center gap-2">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    {user.phone || 'Não informado'}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Documento</Label>
                  <p className="text-sm">{user.document || 'Não informado'}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Função</Label>
                    <div><Badge className={`${getRoleColor(user.role)} text-xs whitespace-nowrap`}>{user.role}</Badge></div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Status</Label>
                    <div><Badge className={`${getStatusColor(user.status)} text-xs whitespace-nowrap`}>{user.status}</Badge></div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Plano</Label>
                    <div><Badge variant="outline" className="text-xs whitespace-nowrap">{user.plan}</Badge></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Entidades Vinculadas</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Imóveis e contratos associados a este usuário</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 text-sm">Imóveis ({user._count?.ownedProperties || 0})</h4>
                {user.ownedProperties && user.ownedProperties.length > 0 ? (
                  <div className="space-y-2">
                    {user.ownedProperties.map((property) => (
                      <div key={property.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 bg-gray-50 rounded gap-1">
                        <span className="text-sm font-medium">Imóvel #{property.id}</span>
                        <span className="text-xs sm:text-sm text-muted-foreground truncate">{property.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum imóvel vinculado</p>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2 text-sm">Contratos ({user._count?.contracts || 0})</h4>
                {user.contracts && user.contracts.length > 0 ? (
                  <div className="space-y-2">
                    {user.contracts.map((contract) => (
                      <div key={contract.id} className="flex items-center justify-between p-2 bg-gray-50 rounded gap-2">
                        <span className="text-sm font-medium">Contrato #{contract.id}</span>
                        <Badge variant="outline" className="text-xs">{contract.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum contrato vinculado</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {}
        <div className="space-y-4 sm:space-y-6">
          {}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Calendar className="w-5 h-5" />
                Informações da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Criado em</Label>
                <p className="text-sm">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Último login</Label>
                <p className="text-sm">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('pt-BR') : 'Nunca'}</p>
              </div>
            </CardContent>
          </Card>

          {}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Activity className="w-5 h-5" />
                Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.audit && user.audit.length > 0 ? (
                <div className="space-y-3">
                  {user.audit.slice(0, 5).map((log, index) => (
                    <div key={index} className="text-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <span className="font-medium text-xs sm:text-sm">{log.event}</span>
                        <span className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
