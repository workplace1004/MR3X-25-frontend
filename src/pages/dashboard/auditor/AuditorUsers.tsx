import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import {
  Users, Search, Eye, Shield, CheckCircle, XCircle, Building2, User, Loader2
} from 'lucide-react';
import { auditorAPI } from '../../../api';

type UserRole = 'CEO' | 'ADMIN' | 'PLATFORM_MANAGER' | 'REPRESENTATIVE' |
  'AGENCY_ADMIN' | 'AGENCY_MANAGER' | 'BROKER' | 'PROPRIETARIO' | 'INQUILINO' | 'LEGAL_AUDITOR' | 'INDEPENDENT_OWNER' | 'BUILDING_MANAGER' | 'API_CLIENT';

type UserCategory = 'internal' | 'agency';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  category: UserCategory;
  agency?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin: string;
  permissions: string[];
}

// Internal roles that belong to MR3X platform
const INTERNAL_ROLES = ['CEO', 'ADMIN', 'PLATFORM_MANAGER', 'REPRESENTATIVE', 'LEGAL_AUDITOR', 'API_CLIENT'];

// Map API response to component format
const mapApiUserToSystemUser = (user: any): SystemUser => {
  const isInternal = INTERNAL_ROLES.includes(user.role);
  return {
    id: user.id,
    name: user.name || 'N/A',
    email: user.email,
    role: user.role as UserRole,
    category: isInternal ? 'internal' : 'agency',
    agency: user.agencyName || undefined,
    status: user.status?.toLowerCase() === 'active' ? 'active' : 'inactive',
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : '',
    lastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleString('pt-BR') : 'Nunca',
    permissions: [], // Permissions not returned by API
  };
};

export function AuditorUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | UserCategory>('all');
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);

  // Fetch users from API
  const { data: apiUsers = [], isLoading } = useQuery({
    queryKey: ['auditor-users'],
    queryFn: () => auditorAPI.getUsers(),
  });

  // Map API users to component format
  const users: SystemUser[] = Array.isArray(apiUsers) ? apiUsers.map(mapApiUserToSystemUser) : [];

  const filteredUsers = users.filter(user => {
    if (categoryFilter !== 'all' && user.category !== categoryFilter) return false;
    return user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getRoleStyle = (role: UserRole) => {
    const styles: Record<UserRole, string> = {
      CEO: 'bg-purple-100 text-purple-700',
      ADMIN: 'bg-red-100 text-red-700',
      PLATFORM_MANAGER: 'bg-blue-100 text-blue-700',
      REPRESENTATIVE: 'bg-pink-100 text-pink-700',
      AGENCY_ADMIN: 'bg-indigo-100 text-indigo-700',
      AGENCY_MANAGER: 'bg-cyan-100 text-cyan-700',
      BROKER: 'bg-yellow-100 text-yellow-700',
      PROPRIETARIO: 'bg-green-100 text-green-700',
      INQUILINO: 'bg-orange-100 text-orange-700',
      LEGAL_AUDITOR: 'bg-gray-100 text-gray-700',
      INDEPENDENT_OWNER: 'bg-teal-100 text-teal-700',
      BUILDING_MANAGER: 'bg-violet-100 text-violet-700',
      API_CLIENT: 'bg-stone-100 text-stone-700',
    };
    return styles[role] || 'bg-gray-100 text-gray-700';
  };

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, string> = {
      CEO: 'CEO',
      ADMIN: 'Admin',
      PLATFORM_MANAGER: 'Gestor Plataforma',
      REPRESENTATIVE: 'Representante',
      AGENCY_ADMIN: 'Diretor',
      AGENCY_MANAGER: 'Gestor',
      BROKER: 'Corretor',
      PROPRIETARIO: 'Proprietário',
      INQUILINO: 'Inquilino',
      LEGAL_AUDITOR: 'Auditor Legal',
      INDEPENDENT_OWNER: 'Proprietário Indep.',
      BUILDING_MANAGER: 'Síndico',
      API_CLIENT: 'Cliente API',
    };
    return labels[role] || role;
  };

  const internalCount = users.filter(u => u.category === 'internal').length;
  const agencyCount = users.filter(u => u.category === 'agency').length;
  const activeCount = users.filter(u => u.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-cyan-100 rounded-lg">
          <Users className="w-6 h-6 text-cyan-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Visão Geral de Usuários</h1>
          <p className="text-muted-foreground">Todos os usuários do sistema (somente leitura)</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Usuários</p>
              <p className="text-xl font-bold">{isLoading ? '...' : users.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Usuários MR3X</p>
              <p className="text-xl font-bold">{internalCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Building2 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Usuários Agências</p>
              <p className="text-xl font-bold">{agencyCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ativos</p>
              <p className="text-xl font-bold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={categoryFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('all')}
        >
          Todos
        </Button>
        <Button
          variant={categoryFilter === 'internal' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('internal')}
        >
          <Shield className="w-4 h-4 mr-1" />
          MR3X Internos
        </Button>
        <Button
          variant={categoryFilter === 'agency' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('agency')}
        >
          <Building2 className="w-4 h-4 mr-1" />
          Staff Agências
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários por nome, e-mail ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Lista de Usuários ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedUser?.id === user.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.name}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${getRoleStyle(user.role)}`}>
                            {getRoleLabel(user.role)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        {user.agency && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Building2 className="w-3 h-3" /> {user.agency}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.status === 'active' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Detalhes do Usuário
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedUser ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedUser.name}</p>
                    <span className={`px-2 py-0.5 rounded text-xs ${getRoleStyle(selectedUser.role)}`}>
                      {getRoleLabel(selectedUser.role)}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">E-mail</p>
                  <p className="text-sm">{selectedUser.email}</p>
                </div>

                {selectedUser.agency && (
                  <div>
                    <p className="text-xs text-muted-foreground">Agência</p>
                    <p className="text-sm flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {selectedUser.agency}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                    selectedUser.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedUser.status === 'active' ? (
                      <><CheckCircle className="w-3 h-3" /> Ativo</>
                    ) : (
                      <><XCircle className="w-3 h-3" /> Inativo</>
                    )}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Data de Cadastro</p>
                  <p className="text-sm">{new Date(selectedUser.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Último Login</p>
                  <p className="text-sm">{selectedUser.lastLogin}</p>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Permissões</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedUser.permissions.map((perm, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Selecione um usuário para ver os detalhes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
