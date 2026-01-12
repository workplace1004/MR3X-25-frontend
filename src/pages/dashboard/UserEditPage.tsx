import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Camera, Trash2, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Skeleton } from '../../components/ui/skeleton';
import { PasswordInput } from '../../components/ui/password-input';
import { toast } from 'sonner';
import { usersAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';

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

const ROLE_LABELS: Record<string, string> = {
  'CEO': 'CEO - Administrador MR3X',
  'ADMIN': 'Admin - Administrador Sistema',
  'PLATFORM_MANAGER': 'Gerente Interno MR3X - Suporte e Estatísticas',
  'AGENCY_ADMIN': 'Diretor de Agência - Dono de Imobiliária',
  'AGENCY_MANAGER': 'Gestor de Agência - Gerente Operacional',
  'BROKER': 'Corretor - Agente Imobiliário',
  'PROPRIETARIO': 'Imóvel - Dono de Imóvel',
  'INDEPENDENT_OWNER': 'Imóvel Independente - Sem Agência',
  'INQUILINO': 'Inquilino - Locatário',
  'BUILDING_MANAGER': 'Síndico - Administrador de Condomínio',
  'LEGAL_AUDITOR': 'Auditor - Auditoria Legal',
  'REPRESENTATIVE': 'Representante - Afiliado',
  'API_CLIENT': 'Cliente API - Integração',
};

const ROLE_CREATION_ALLOWED: Record<string, string[]> = {
  'CEO': ['ADMIN'],
  'ADMIN': ['PLATFORM_MANAGER', 'LEGAL_AUDITOR', 'REPRESENTATIVE', 'API_CLIENT'],
  'PLATFORM_MANAGER': [],
  'AGENCY_ADMIN': ['AGENCY_MANAGER', 'BROKER', 'PROPRIETARIO'],
  'AGENCY_MANAGER': ['BROKER', 'PROPRIETARIO'],
  'INDEPENDENT_OWNER': ['INQUILINO', 'BUILDING_MANAGER'],
  'BROKER': [],
  'PROPRIETARIO': [],
  'INQUILINO': [],
  'BUILDING_MANAGER': [],
  'LEGAL_AUDITOR': [],
  'REPRESENTATIVE': [],
  'API_CLIENT': [],
};

const getAvailableRoles = (userRole: string | undefined) => {
  if (!userRole) return [];
  const allowedRoles = ROLE_CREATION_ALLOWED[userRole] || [];
  return allowedRoles.map(role => ({
    value: role,
    label: ROLE_LABELS[role] || role,
  }));
};

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'INVITED', label: 'Convidado' },
  { value: 'SUSPENDED', label: 'Suspenso' },
];

interface UserData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  document?: string;
  role: string;
  status: string;
  plan: string;
  password?: string;
  photoUrl?: string | null;
  notificationPreferences?: {
    email: boolean;
    whatsapp: boolean;
    push: boolean;
  };
}

export function UserEditPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const baseAvailableRoles = getAvailableRoles(user?.role);

  const availableRoles = currentUserRole && !baseAvailableRoles.some(r => r.value === currentUserRole)
    ? [...baseAvailableRoles, { value: currentUserRole, label: ROLE_LABELS[currentUserRole] || currentUserRole }]
    : baseAvailableRoles;

  const [formData, setFormData] = useState<UserData>({
    id: '',
    name: '',
    email: '',
    phone: '',
    document: '',
    role: '',
    status: 'ACTIVE',
    plan: '',
    password: '',
    photoUrl: null,
    notificationPreferences: {
      email: true,
      whatsapp: true,
      push: false,
    },
  });

  const canEditUsers = hasPermission('users:update');

  useEffect(() => {
    if (!canEditUsers) {
      toast.error('Você não tem permissão para editar usuários');
      navigate('/dashboard/users');
    }
  }, [canEditUsers, navigate]);

  useEffect(() => {
    if (params.id && canEditUsers) {
      fetchUserDetails(params.id as string);
    }
  }, [params.id, canEditUsers]);

  const fetchUserDetails = async (id: string) => {
    if (!canEditUsers) return;

    try {
      const userData = await usersAPI.getUserById(id);
      setCurrentUserRole(userData.role || '');
      setFormData({
        id: userData.id,
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        document: userData.document || '',
        role: userData.role || '',
        status: userData.status || 'ACTIVE',
        plan: userData.plan || '',
        password: userData.plainPassword || '',
        photoUrl: userData.photoUrl || null,
        notificationPreferences: userData.notificationPreferences || {
          email: true,
          whatsapp: true,
          push: false,
        },
      });
    } catch (error: any) {
      toast.error(error.message || 'Falha ao carregar detalhes do usuário');
      navigate('/dashboard/users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canEditUsers) {
      toast.error('Você não tem permissão para editar usuários');
      return;
    }

    setSaving(true);

    try {
      
      const updatePayload: any = {
        name: formData.name,
        phone: formData.phone || undefined,
        role: formData.role,
        plan: formData.plan || undefined,
      };
      
      if (formData.password) {
        updatePayload.password = formData.password;
      }
      await usersAPI.updateUser(formData.id, updatePayload);
      toast.success('Usuário atualizado com sucesso');
      navigate('/dashboard/users');
    } catch (error: any) {
      toast.error(error.message || 'Falha ao atualizar usuário');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNotificationChange = (type: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences!,
        [type]: checked,
      },
    }));
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A foto deve ter no máximo 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const result = await usersAPI.uploadUserPhoto(formData.id, file);
      setFormData(prev => ({ ...prev, photoUrl: result.photoUrl }));
      toast.success('Foto atualizada com sucesso!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao fazer upload da foto');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async () => {
    if (!formData.photoUrl) return;

    setDeletingPhoto(true);
    try {
      await usersAPI.deleteUserPhoto(formData.id);
      setFormData(prev => ({ ...prev, photoUrl: null }));
      toast.success('Foto removida com sucesso!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao remover foto');
    } finally {
      setDeletingPhoto(false);
    }
  };

  if (!canEditUsers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para editar usuários.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Skeleton className="w-32 h-32 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="flex items-center gap-2 w-fit">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Editar Usuário</h1>
          <p className="text-sm text-muted-foreground">Atualizar informações do usuário</p>
        </div>
      </div>

      {}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <User className="w-5 h-5" />
            Informações do Usuário
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Atualize os dados do usuário abaixo. Alguns campos podem estar bloqueados por razões de segurança.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Photo Upload Section */}
            <div className="flex flex-col items-center space-y-4 pb-4 border-b">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={getPhotoUrl(formData.photoUrl)} alt={formData.name || 'Usuário'} />
                  <AvatarFallback className="text-2xl bg-orange-100 text-orange-700">
                    {(formData.name || formData.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={handlePhotoClick}
                  className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
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
              <div className="text-center">
                <p className="text-sm font-medium">{formData.name || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground">{formData.email}</p>
              </div>
              {formData.photoUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeletePhoto}
                  disabled={deletingPhoto}
                  className="text-destructive hover:text-destructive"
                >
                  {deletingPhoto ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Remover Foto
                </Button>
              )}
            </div>

            {}
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Digite o nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Digite o endereço de email"
                  required
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (WhatsApp)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+55 11 91234-5678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">CPF / CNPJ</Label>
                <Input
                  id="document"
                  value={formData.document}
                  onChange={(e) => handleInputChange('document', e.target.value)}
                  placeholder="123.456.789-00"
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-muted-foreground">O documento não pode ser alterado</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Função *</Label>
                <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                  <SelectTrigger className="[&>span]:text-left [&>span]:truncate">
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan">Plano</Label>
                <Input
                  id="plan"
                  value={formData.plan}
                  onChange={(e) => handleInputChange('plan', e.target.value)}
                  placeholder="Plano do usuário"
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <PasswordInput
                id="password"
                label="Senha"
                value={formData.password || ''}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Digite a senha (deixe em branco para não alterar)"
                showStrengthIndicator={true}
              />
            </div>

            {}
            <div className="border rounded-lg p-4 space-y-3 bg-gray-50/50">
              <Label className="text-sm font-medium">Preferências de Notificação</Label>
              <div className="space-y-3">
                <label htmlFor="email-notifications" className="flex items-center space-x-3 cursor-pointer">
                  <Checkbox
                    id="email-notifications"
                    checked={formData.notificationPreferences?.email || false}
                    onCheckedChange={(checked) => handleNotificationChange('email', checked as boolean)}
                  />
                  <span className="text-sm">Notificações por email</span>
                </label>
                <label htmlFor="whatsapp-notifications" className="flex items-center space-x-3 cursor-pointer">
                  <Checkbox
                    id="whatsapp-notifications"
                    checked={formData.notificationPreferences?.whatsapp || false}
                    onCheckedChange={(checked) => handleNotificationChange('whatsapp', checked as boolean)}
                  />
                  <span className="text-sm">Notificações por WhatsApp</span>
                </label>
                <label htmlFor="push-notifications" className="flex items-center space-x-3 cursor-pointer">
                  <Checkbox
                    id="push-notifications"
                    checked={formData.notificationPreferences?.push || false}
                    onCheckedChange={(checked) => handleNotificationChange('push', checked as boolean)}
                  />
                  <span className="text-sm">Notificações push</span>
                </label>
              </div>
            </div>

            {}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={saving} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="flex items-center justify-center gap-2 w-full sm:w-auto">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
