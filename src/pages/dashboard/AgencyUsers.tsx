import { useQuery } from '@tanstack/react-query'
import { usersAPI } from '@/api'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import {
  Users,
  UsersRound,
  Eye,
  MoreHorizontal,
  Grid3X3,
  List,
  Briefcase,
  UserCog,
  UserCheck,
  Search
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type UserRole = 'BROKER' | 'PROPRIETARIO' | 'AGENCY_MANAGER' | 'INQUILINO'

const roleLabels: Record<UserRole, string> = {
  BROKER: 'Corretor',
  PROPRIETARIO: 'Proprietário',
  AGENCY_MANAGER: 'Gerente',
  INQUILINO: 'Inquilino',
}

const roleColors: Record<UserRole, string> = {
  BROKER: 'bg-yellow-500',
  PROPRIETARIO: 'bg-green-500',
  AGENCY_MANAGER: 'bg-indigo-500',
  INQUILINO: 'bg-blue-500',
}

const roleIcons: Record<UserRole, any> = {
  BROKER: Briefcase,
  PROPRIETARIO: UserCog,
  AGENCY_MANAGER: UserCheck,
  INQUILINO: Users,
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'Ativo',
  FROZEN: 'Congelado',
  SUSPENDED: 'Suspenso',
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  FROZEN: 'bg-blue-100 text-blue-800',
  SUSPENDED: 'bg-red-100 text-red-800',
}

// Get display status based on user data (checks isFrozen for plan limits)
const getDisplayStatus = (userData: any): string => {
  if (userData.isFrozen) {
    return 'FROZEN'
  }
  if (userData.status === 'SUSPENDED') {
    return 'SUSPENDED'
  }
  return 'ACTIVE'
}

export function AgencyUsers() {
  const { user } = useAuth()

  const [showDetailModal, setShowDetailModal] = useState(false)
  const [userDetail, setUserDetail] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = useCallback(() => {
    setSearchQuery(searchTerm.trim())
  }, [searchTerm])

  const handleClearSearch = useCallback(() => {
    setSearchTerm('')
    setSearchQuery('')
  }, [])

  // Fetch users created by this AGENCY_ADMIN or in the same agency
  const { data: myUsers, isLoading } = useQuery({
    queryKey: ['agency-users', user?.id, user?.agencyId],
    queryFn: async () => {
      // Get all users that are BROKER, PROPRIETARIO, AGENCY_MANAGER, or INQUILINO
      const [brokers, owners, managers, tenants] = await Promise.all([
        usersAPI.getBrokers(),
        usersAPI.listUsers({ role: 'PROPRIETARIO', pageSize: 100 }),
        usersAPI.listUsers({ role: 'AGENCY_MANAGER', pageSize: 100 }),
        usersAPI.getTenants(),
      ])

      const userId = user?.id?.toString()
      const agencyId = user?.agencyId?.toString()

      // Filter users by either:
      // 1. Created by this AGENCY_ADMIN (createdBy matches)
      // 2. In the same agency (agencyId matches)
      const filterByAgency = (u: any) => {
        const userCreatedBy = u.createdBy?.toString()
        const userAgencyId = u.agencyId?.toString()
        return userCreatedBy === userId || (agencyId && userAgencyId === agencyId)
      }

      const myBrokers = (brokers || []).filter(filterByAgency)
      const myOwners = ((owners?.items || []) as any[]).filter(filterByAgency)
      const myManagers = ((managers?.items || []) as any[]).filter(filterByAgency)
      const myTenants = (tenants || []).filter(filterByAgency)

      return [...myBrokers, ...myOwners, ...myManagers, ...myTenants]
    },
    enabled: !!user?.id,
    staleTime: 0,
  })

  const handleViewUser = async (userData: any) => {
    setLoadingDetails(true)
    try {
      const fullUserDetails = await usersAPI.getUserById(userData.id)
      setUserDetail(fullUserDetails)
      setShowDetailModal(true)
    } catch {
      toast.error('Erro ao carregar detalhes do usuário')
    } finally {
      setLoadingDetails(false)
    }
  }

  // Filter users based on search query
  const filteredUsers = (myUsers || []).filter((userData: any) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      userData.name?.toLowerCase().includes(query) ||
      userData.email?.toLowerCase().includes(query) ||
      userData.phone?.toLowerCase().includes(query) ||
      userData.document?.toLowerCase().includes(query) ||
      roleLabels[userData.role as UserRole]?.toLowerCase().includes(query)
    )
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <UsersRound className="w-6 h-6 text-purple-700" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Meus Usuários</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Visualize os usuários que você cadastrou ({myUsers?.length || 0} total)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex border border-border rounded-lg p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('table')}
                    className={viewMode === 'table' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visualização em Tabela</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('cards')}
                    className={viewMode === 'cards' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visualização em Cards</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Search Box */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex w-full sm:max-w-lg gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSearch()
                  }
                }}
                placeholder="Pesquisar por nome, email, telefone, documento ou tipo..."
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

        {/* Users List */}
        {filteredUsers.length > 0 ? (
          viewMode === 'table' ? (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-semibold">Nome</th>
                      <th className="text-left p-4 font-semibold">Tipo</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-left p-4 font-semibold">Telefone</th>
                      <th className="text-left p-4 font-semibold">Email</th>
                      <th className="text-left p-4 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((userData: any) => {
                      const RoleIcon = roleIcons[userData.role as UserRole] || Users
                      return (
                        <tr key={userData.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <RoleIcon className="w-4 h-4 text-primary" />
                              </div>
                              <div className="font-medium">{userData.name || 'Sem nome'}</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={`${roleColors[userData.role as UserRole] || 'bg-gray-500'} text-white`}>
                              {roleLabels[userData.role as UserRole] || userData.role}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {(() => {
                              const displayStatus = getDisplayStatus(userData)
                              return (
                                <Badge className={statusColors[displayStatus] || 'bg-gray-100 text-gray-800'}>
                                  {statusLabels[displayStatus] || displayStatus}
                                </Badge>
                              )
                            })()}
                          </td>
                          <td className="p-4">
                            <div className="text-muted-foreground">{userData.phone || '-'}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-muted-foreground">{userData.email || '-'}</div>
                          </td>
                          <td className="p-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewUser(userData)}
                              disabled={loadingDetails}
                              className="text-orange-600 border-orange-600 hover:bg-orange-50"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Detalhes
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile view */}
              <div className="md:hidden">
                {filteredUsers.map((userData: any) => {
                  const RoleIcon = roleIcons[userData.role as UserRole] || Users
                  return (
                    <div key={userData.id} className="border-b border-border last:border-b-0 p-4">
                      <div className="flex items-start justify-between mb-3 min-w-0 gap-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <RoleIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate">{userData.name || 'Sem nome'}</h3>
                            <p className="text-sm text-muted-foreground truncate">{userData.email || '-'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 items-end flex-shrink-0">
                          <Badge className={`${roleColors[userData.role as UserRole] || 'bg-gray-500'} text-white text-xs`}>
                            {roleLabels[userData.role as UserRole] || userData.role}
                          </Badge>
                          {(() => {
                            const displayStatus = getDisplayStatus(userData)
                            return (
                              <Badge className={`${statusColors[displayStatus] || 'bg-gray-100 text-gray-800'} text-xs`}>
                                {statusLabels[displayStatus] || displayStatus}
                              </Badge>
                            )
                          })()}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewUser(userData)}
                        className="text-orange-600 border-orange-600 hover:bg-orange-50 w-full"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredUsers.map((userData: any) => {
                const RoleIcon = roleIcons[userData.role as UserRole] || Users
                return (
                  <Card key={userData.id} className="transition-all hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <RoleIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{userData.name || 'Sem nome'}</h3>
                          <p className="text-sm text-muted-foreground truncate">{userData.email}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            <Badge className={`${roleColors[userData.role as UserRole] || 'bg-gray-500'} text-white`}>
                              {roleLabels[userData.role as UserRole] || userData.role}
                            </Badge>
                            {(() => {
                              const displayStatus = getDisplayStatus(userData)
                              return (
                                <Badge className={statusColors[displayStatus] || 'bg-gray-100 text-gray-800'}>
                                  {statusLabels[displayStatus] || displayStatus}
                                </Badge>
                              )
                            })()}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewUser(userData)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )
        ) : (
          <div className="text-center py-12 sm:py-16 bg-card border border-border rounded-lg px-4">
            <Users className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">
              {searchQuery ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              {searchQuery
                ? 'Tente buscar com outros termos.'
                : 'Você ainda não cadastrou nenhum usuário.'}
            </p>
          </div>
        )}

        {/* Detail Modal */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Usuário</DialogTitle>
            </DialogHeader>
            {userDetail ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome</label>
                      <div className="text-base">{userDetail.name || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                      <div>
                        <Badge className={`${roleColors[userDetail.role as UserRole] || 'bg-gray-500'} text-white`}>
                          {roleLabels[userDetail.role as UserRole] || userDetail.role}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                      <div className="text-base">{userDetail.phone || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <div className="text-base">{userDetail.email || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Documento</label>
                      <div className="text-base">{userDetail.document || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                      <div className="text-base">
                        {userDetail.birthDate ? new Date(userDetail.birthDate).toLocaleDateString('pt-BR') : '-'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">CEP</label>
                      <div className="text-base">{userDetail.cep || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                      <div className="text-base">{userDetail.address || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Bairro</label>
                      <div className="text-base">{userDetail.neighborhood || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Cidade</label>
                      <div className="text-base">{userDetail.city || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Estado</label>
                      <div className="text-base">{userDetail.state || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Não foi possível carregar os detalhes do usuário.
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
