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
  Search,
  MapPin,
  Home,
  CreditCard,
  Loader2
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null)
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

  const { data: myUsers, isLoading } = useQuery({
    queryKey: ['agency-users', user?.id, user?.agencyId],
    queryFn: async () => {
      const [brokers, owners, managers, tenants] = await Promise.all([
        usersAPI.getBrokers(),
        usersAPI.listUsers({ role: 'PROPRIETARIO', pageSize: 100 }),
        usersAPI.listUsers({ role: 'AGENCY_MANAGER', pageSize: 100 }),
        usersAPI.getTenants(),
      ])

      const userId = user?.id?.toString()
      const agencyId = user?.agencyId?.toString()

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
    const userId = userData.id.toString()
    setLoadingDetailsId(userId)
    setUserDetail(null) // Clear previous data to show skeleton
    setShowDetailModal(true) // Open modal immediately to show skeleton
    try {
      const fullUserDetails = await usersAPI.getUserById(userData.id)
      setUserDetail(fullUserDetails)
    } catch {
      toast.error('Erro ao carregar detalhes do usuário')
      setShowDetailModal(false) // Close modal on error
    } finally {
      setLoadingDetailsId(null)
    }
  }

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
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-64 rounded-md" />
            <Skeleton className="h-9 w-16 rounded-md" />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:block">
            <div className="bg-muted/50 p-4 flex gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
            {/* Table Rows */}
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border-t border-border p-4 flex items-center gap-4">
                <div className="flex items-center gap-3 w-32">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            ))}
          </div>

          {/* Mobile Skeleton */}
          <div className="md:hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="border-b border-border last:border-b-0 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ))}
          </div>
        </div>
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

        {filteredUsers.length > 0 ? (
          viewMode === 'table' ? (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-semibold">Nome</th>
                      <th className="text-left p-4 font-semibold">Email</th>
                      <th className="text-left p-4 font-semibold">Tipo</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-left p-4 font-semibold">Telefone</th>
                      <th className="text-left p-4 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((userData: any) => {
                      return (
                        <tr key={userData.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={getPhotoUrl(userData.photoUrl)} alt={userData.name || 'Usuário'} />
                                <AvatarFallback className={`${roleColors[userData.role as UserRole]?.replace('bg-', 'bg-').replace('-500', '-100')} ${roleColors[userData.role as UserRole]?.replace('bg-', 'text-').replace('-500', '-700')}`}>
                                  {(userData.name || userData.email || 'U').charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{userData.name || 'Sem nome'}</div>
                                {userData.token && (
                                  <div className="text-[10px] text-muted-foreground font-mono">{userData.token}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-muted-foreground">{userData.email || '-'}</div>
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewUser(userData)}
                              disabled={loadingDetailsId === userData.id.toString()}
                              className="text-orange-600 border-orange-600 hover:bg-orange-50"
                            >
                              {loadingDetailsId === userData.id.toString() ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden">
                {filteredUsers.map((userData: any) => {
                  return (
                    <div key={userData.id} className="border-b border-border last:border-b-0 p-4">
                      <div className="flex items-start justify-between mb-3 min-w-0 gap-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={getPhotoUrl(userData.photoUrl)} alt={userData.name || 'Usuário'} />
                            <AvatarFallback className={`${roleColors[userData.role as UserRole]?.replace('bg-', 'bg-').replace('-500', '-100')} ${roleColors[userData.role as UserRole]?.replace('bg-', 'text-').replace('-500', '-700')}`}>
                              {(userData.name || userData.email || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate">{userData.name || 'Sem nome'}</h3>
                            {userData.token && (
                              <p className="text-[10px] text-muted-foreground font-mono">{userData.token}</p>
                            )}
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
                        disabled={loadingDetailsId === userData.id.toString()}
                        className="text-orange-600 border-orange-600 hover:bg-orange-50 w-full"
                      >
                        {loadingDetailsId === userData.id.toString() ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredUsers.map((userData: any) => {
                return (
                  <Card key={userData.id} className="transition-all hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={getPhotoUrl(userData.photoUrl)} alt={userData.name || 'Usuário'} />
                          <AvatarFallback className={`${roleColors[userData.role as UserRole]?.replace('bg-', 'bg-').replace('-500', '-100')} ${roleColors[userData.role as UserRole]?.replace('bg-', 'text-').replace('-500', '-700')}`}>
                            {(userData.name || userData.email || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{userData.name || 'Sem nome'}</h3>
                          {userData.token && (
                            <p className="text-[10px] text-muted-foreground font-mono">{userData.token}</p>
                          )}
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
                            <Button size="icon" variant="ghost" disabled={loadingDetailsId === userData.id.toString()}>
                              {loadingDetailsId === userData.id.toString() ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewUser(userData)} disabled={loadingDetailsId === userData.id.toString()}>
                              {loadingDetailsId === userData.id.toString() ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                              {loadingDetailsId === userData.id.toString() ? 'Carregando...' : 'Visualizar'}
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

        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {userDetail?.role === 'PROPRIETARIO' ? 'Detalhes do Proprietário' :
                 userDetail?.role === 'BROKER' ? 'Detalhes do Corretor' :
                 userDetail?.role === 'INQUILINO' ? 'Detalhes do Locatário' :
                 userDetail?.role === 'AGENCY_MANAGER' ? 'Detalhes do Gerente' :
                 loadingDetailsId ? 'Carregando...' : 'Detalhes do Usuário'}
              </DialogTitle>
            </DialogHeader>
            {loadingDetailsId && !userDetail ? (
              <div className="space-y-6">
                {/* Skeleton for Personal Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <Skeleton className="h-6 w-48" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i}>
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-5 w-full" />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Skeleton for Address Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i}>
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-5 w-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : userDetail ? (
              <div className="space-y-6">
                {/* Personal Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                      {userDetail.role === 'PROPRIETARIO' ? (
                        <Home className="w-4 h-4 text-primary" />
                      ) : (
                        <Users className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold">Informações Pessoais</h3>
                  </div>
                  {userDetail.token && (
                    <div className="mb-4">
                      <label className="text-sm font-medium text-muted-foreground">Token</label>
                      <div className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">{userDetail.token}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Documento (CPF/CNPJ)</label>
                      <div className="text-base">{userDetail.document || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome</label>
                      <div className="text-base">{userDetail.name || '-'}</div>
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
                      <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                      <div className="text-base">
                        {userDetail.birthDate ? new Date(userDetail.birthDate).toLocaleDateString('pt-BR') : '-'}
                      </div>
                    </div>
                    {/* BROKER: show CRECI */}
                    {userDetail.role === 'BROKER' && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">CRECI</label>
                        <div className="text-base">{userDetail.creci || '-'}</div>
                      </div>
                    )}
                    {/* PROPRIETARIO or INQUILINO: show RG, Nationality, Marital Status, Profession */}
                    {(userDetail.role === 'PROPRIETARIO' || userDetail.role === 'INQUILINO') && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">RG</label>
                          <div className="text-base">{userDetail.rg || '-'}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Nacionalidade</label>
                          <div className="text-base">{userDetail.nationality || '-'}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Estado Civil</label>
                          <div className="text-base">{userDetail.maritalStatus || '-'}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Profissão</label>
                          <div className="text-base">{userDetail.profession || '-'}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Address Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Endereço</h3>
                  </div>
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

                {/* Bank Data Section - Only for PROPRIETARIO */}
                {userDetail.role === 'PROPRIETARIO' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold">Dados Bancários</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Banco</label>
                        <div className="text-base">{userDetail.bankName || '-'}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Agência</label>
                        <div className="text-base">{userDetail.bankBranch || '-'}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Conta</label>
                        <div className="text-base">{userDetail.bankAccount || '-'}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Chave PIX</label>
                        <div className="text-base">{userDetail.pixKey || '-'}</div>
                      </div>
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
    </TooltipProvider>
  )
}
