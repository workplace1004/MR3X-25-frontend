import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Skeleton } from '../../components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  User,UserCog, Mail, Phone, FileText, MapPin, Shield, Camera, Trash2, Lock, Save, Loader2, Building2, Award, Users, BadgeCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { profileAPI } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import { CEPInput } from '../../components/ui/cep-input';
import { PasswordInput } from '../../components/ui/password-input';
import { formatDocumentInput, formatCNPJInput, formatCPFInput, formatCRECIInput } from '../../lib/validation';
import { validatePasswordStrength } from '../../lib/password-utils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

const getStaticBaseUrl = () => {
  const url = API_BASE_URL;
  return url.endsWith('/api') ? url.slice(0, -4) : url;
};

export default function MyAccount() {
  const { user } = useAuth();
  const { updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    document: '',
    creci: '',
    address: '',
    cep: '',
    neighborhood: '',
    city: '',
    state: '',
    addressReference: '', // Mandatory for Representatives
    rg: '', // Mandatory for Representatives (National ID)
    agencyName: '',
    agencyCnpj: '',
    representativeName: '',
    representativeDocument: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const getPhotoUrl = (photoUrl: string | null | undefined) => {
    if (!photoUrl) return undefined;
    if (photoUrl.startsWith('http')) return photoUrl;
    return `${getStaticBaseUrl()}${photoUrl}`;
  };

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: profileAPI.getProfile,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        document: profile.document || '',
        // User table now stores full CRECI in a single field (e.g. "123456/SP")
        creci: profile.creci || '',
        address: profile.address || '',
        cep: profile.cep || '',
        neighborhood: profile.neighborhood || '',
        city: profile.city || '',
        state: profile.state || '',
        addressReference: profile.addressReference || '',
        rg: profile.rg || '',
        agencyName: profile.agency?.name || '',
        agencyCnpj: profile.agency?.cnpj || '',
        representativeName: profile.agency?.representativeName || '',
        representativeDocument: profile.agency?.representativeDocument || '',
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: profileAPI.updateProfile,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      updateUser({ name: data.name });
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao atualizar perfil');
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: profileAPI.uploadPhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Foto atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao fazer upload da foto');
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: profileAPI.deletePhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Foto removida com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao remover foto');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: profileAPI.changePassword,
    onSuccess: () => {
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      toast.success('Senha alterada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao alterar senha');
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };


  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    const validation = validatePasswordStrength(passwordData.newPassword);
    if (!validation.valid) {
      toast.error(`Senha inválida: ${validation.errors.join(', ')}`);
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A foto deve ter no máximo 5MB');
        return;
      }
      uploadPhotoMutation.mutate(file);
    }
  };

  const handleDeletePhoto = () => {
    setShowDeleteModal(true);
  };

  const confirmDeletePhoto = () => {
    deletePhotoMutation.mutate();
    setShowDeleteModal(false);
  };

  const handleCEPData = useCallback((data: any) => {
    setFormData(prev => ({
      ...prev,
      address: data.logradouro || data.street || prev.address,
      neighborhood: data.bairro || data.neighborhood || prev.neighborhood,
      city: data.cidade || data.city || prev.city,
      state: data.estado || data.state || prev.state,
    }));
  }, []);

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      CEO: 'bg-purple-100 text-purple-800',
      ADMIN: 'bg-red-100 text-red-800',
      AGENCY_ADMIN: 'bg-indigo-100 text-indigo-800',
      AGENCY_MANAGER: 'bg-blue-100 text-blue-800',
      BROKER: 'bg-yellow-100 text-yellow-800',
      INDEPENDENT_OWNER: 'bg-emerald-100 text-emerald-800',
      PROPRIETARIO: 'bg-green-100 text-green-800',
      INQUILINO: 'bg-orange-100 text-orange-800',
      BUILDING_MANAGER: 'bg-cyan-100 text-cyan-800',
      LEGAL_AUDITOR: 'bg-gray-100 text-gray-800',
      REPRESENTATIVE: 'bg-pink-100 text-pink-800',
      PLATFORM_MANAGER: 'bg-teal-100 text-teal-800',
      API_CLIENT: 'bg-slate-100 text-slate-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      CEO: 'CEO',
      ADMIN: 'Administrador',
      AGENCY_ADMIN: 'Diretor de Agência',
      AGENCY_MANAGER: 'Gerente de Agência',
      BROKER: 'Corretor',
      INDEPENDENT_OWNER: 'Proprietário Independente',
      PROPRIETARIO: 'Proprietário',
      INQUILINO: 'Inquilino',
      BUILDING_MANAGER: 'Síndico',
      LEGAL_AUDITOR: 'Auditor Legal',
      REPRESENTATIVE: 'Representante',
      PLATFORM_MANAGER: 'Gerente de Plataforma',
      API_CLIENT: 'Cliente API',
    };
    return labels[role] || role;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Skeleton className="w-32 h-32 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showCreci = ['BROKER', 'AGENCY_ADMIN'].includes(user?.role || '');
  const showAgencyInfo = user?.role === 'AGENCY_ADMIN' && profile?.agency;
  const showAddressSection = (user?.role || '') !== 'ADMIN';
  const isRepresentative = user?.role === 'REPRESENTATIVE';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 rounded-lg">
          <UserCog className="w-6 h-6 text-blue-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Minha Conta</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais e configurações</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={getPhotoUrl(profile?.photoUrl)} alt={profile?.name || user?.name} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {(profile?.name || user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handlePhotoClick}
                  className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
                  disabled={uploadPhotoMutation.isPending}
                >
                  {uploadPhotoMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>

              <div className="space-y-1 text-center">
                <CardTitle className="text-xl">{profile?.name || user?.name || 'Usuário'}</CardTitle>
                <CardDescription className="flex items-center justify-center gap-1">
                  <Mail className="h-3 w-3" />
                  {user?.email}
                </CardDescription>
              </div>

              <Badge className={getRoleBadgeColor(user?.role || '')}>
                <Shield className="h-3 w-3 mr-1" />
                {getRoleLabel(user?.role || '')}
              </Badge>

              {profile?.photoUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeletePhoto}
                  disabled={deletePhotoMutation.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  {deletePhotoMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Remover Foto
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <div className="space-y-3 text-sm">
              {profile?.agency && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{profile.agency.name}</span>
                </div>
              )}
              {profile?.creci && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Award className="h-4 w-4" />
                  <span>CRECI: {profile.creci}</span>
                </div>
              )}
              {profile?.plan && 
               !['CEO', 'ADMIN', 'PLATFORM_MANAGER', 'PROPRIETARIO', 'INQUILINO'].includes(user?.role || '') && 
               profile.plan !== 'FREE' && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Plano: {profile.plan}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Dados Pessoais
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Segurança
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-6">
                <form onSubmit={handleProfileSubmit} className="space-y-6">

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Informações Pessoais</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Seu nome completo"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                          id="email"
                          value={user?.email || ''}
                          disabled
                          className="bg-muted"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="role">Tipo de Conta</Label>
                        <Input
                          id="role"
                          value={getRoleLabel(user?.role || '')}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>Contato e Documentos</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(11) 99999-9999"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="document">CPF/CNPJ</Label>
                        <Input
                          id="document"
                          value={formData.document}
                          onChange={(e) => setFormData({ ...formData, document: formatDocumentInput(e.target.value) })}
                          placeholder="000.000.000-00"
                        />
                      </div>

                      {showCreci && (
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="creci">CRECI do Corretor</Label>
                          <div className="relative">
                            <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="creci"
                              value={formData.creci}
                              onChange={(e) => setFormData({ ...formData, creci: formatCRECIInput(e.target.value) })}
                              placeholder="123456/SP-F"
                              className="pl-10"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Formato: 123456/SP ou 123456/SP-F
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {showAddressSection && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>Endereço</span>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <CEPInput
                          value={formData.cep}
                          onChange={(value) => setFormData({ ...formData, cep: value })}
                          onCEPData={handleCEPData}
                          label="CEP"
                          placeholder="00000-000"
                          className="sm:col-span-2"
                        />

                        <div className="space-y-2">
                          <Label htmlFor="address">Logradouro</Label>
                          <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Rua, Avenida, etc."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="neighborhood">Bairro</Label>
                          <Input
                            id="neighborhood"
                            value={formData.neighborhood}
                            onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                            placeholder="Centro"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="city">Cidade</Label>
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            placeholder="São Paulo"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="state">Estado</Label>
                          <Input
                            id="state"
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            placeholder="SP"
                            maxLength={2}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {showAgencyInfo && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          <span>Informações da Agência</span>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="agencyName">Nome da Agência</Label>
                            <Input
                              id="agencyName"
                              value={formData.agencyName}
                              onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                              placeholder="Nome da sua agência"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="agencyCnpj">CNPJ da Agência</Label>
                            <Input
                              id="agencyCnpj"
                              value={formData.agencyCnpj}
                              onChange={(e) => setFormData({ ...formData, agencyCnpj: formatCNPJInput(e.target.value) })}
                              placeholder="00.000.000/0000-00"
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>Representante Legal</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Dados do representante legal para uso nos contratos.
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="repName">Nome do Representante</Label>
                            <Input
                              id="repName"
                              value={formData.representativeName}
                              onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                              placeholder="Nome completo do representante"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="repDocument">CPF do Representante</Label>
                            <Input
                              id="repDocument"
                              value={formData.representativeDocument}
                              onChange={(e) => setFormData({ ...formData, representativeDocument: formatCPFInput(e.target.value) })}
                              placeholder="000.000.000-00"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="security" className="mt-6">
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Senha Atual
                      </Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        placeholder="Digite sua senha atual"
                      />
                    </div>

                    <PasswordInput
                      id="newPassword"
                      label="Nova Senha"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Digite sua nova senha"
                      showStrengthIndicator={true}
                    />

                    <PasswordInput
                      id="confirmPassword"
                      label="Confirmar Nova Senha"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Confirme sua nova senha"
                      showStrengthIndicator={false}
                      showGenerateButton={false}
                      error={passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword ? 'As senhas não coincidem' : undefined}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Alterando...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Alterar Senha
                        </>
                      )}
                    </Button>
                  </div>
                </form>

                {/* Two-Factor Authentication Section for Representatives */}
                {isRepresentative && (
                  <>
                    <Separator className="my-6" />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Autenticação de Dois Fatores (2FA)
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Adicione uma camada extra de segurança à sua conta
                          </p>
                        </div>
                        <Badge className={'bg-gray-100 text-gray-800'}>
                          Desativado
                        </Badge>
                      </div>

                      {true ? (
                        <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                          <p className="text-sm text-muted-foreground">
                            A autenticação de dois fatores (2FA) é obrigatória para representantes comerciais.
                            Isso protege sua conta mesmo se sua senha for comprometida.
                          </p>
                          <Button
                            type="button"
                            onClick={() => {
                              // TODO: Implement 2FA setup
                              toast.info('Configuração de 2FA será implementada em breve');
                            }}
                            className="w-full sm:w-auto"
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Configurar 2FA
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4 p-4 border rounded-lg bg-green-50">
                          <p className="text-sm text-green-800">
                            ✓ Autenticação de dois fatores está ativada
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              // TODO: Implement 2FA disable
                              toast.info('Desativação de 2FA será implementada em breve');
                            }}
                            className="w-full sm:w-auto"
                          >
                            Desativar 2FA
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Foto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover sua foto de perfil? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePhoto}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePhotoMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
