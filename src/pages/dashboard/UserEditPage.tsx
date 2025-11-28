import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import { usersAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const ALL_ROLES = [
  { value: 'CEO', label: 'CEO - Administrador MR3X' },
  { value: 'ADMIN', label: 'Admin - Administrador Sistema' },
  { value: 'AGENCY_MANAGER', label: 'Gestor - Gerente de Agência' },
  { value: 'BROKER', label: 'Corretor - Agente Imobiliário' },
  { value: 'PROPRIETARIO', label: 'Proprietário - Dono de Imóvel' },
  { value: 'INDEPENDENT_OWNER', label: 'Proprietário Independente - Sem Agência' },
  { value: 'INQUILINO', label: 'Inquilino - Locatário' },
  { value: 'BUILDING_MANAGER', label: 'Síndico - Administrador de Condomínio' },
  { value: 'LEGAL_AUDITOR', label: 'Auditor - Auditoria Legal' },
  { value: 'REPRESENTATIVE', label: 'Representante - Afiliado' },
  { value: 'API_CLIENT', label: 'Cliente API - Integração' },
];

// Filter roles based on current user's role
const getAvailableRoles = (userRole: string | undefined) => {
  // CEO can ONLY create ADMIN users
  if (userRole === 'CEO') {
    return ALL_ROLES.filter(role => role.value === 'ADMIN');
  }
  // ADMIN and other roles cannot create/edit CEO or ADMIN users
  return ALL_ROLES.filter(role => role.value !== 'CEO' && role.value !== 'ADMIN');
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const availableRoles = getAvailableRoles(user?.role);
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
    notificationPreferences: {
      email: true,
      whatsapp: true,
      push: false,
    },
  });

  // Check permissions
  const canEditUsers = hasPermission('users:update');

  // Redirect if no permission
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
      // Only send fields that the backend accepts
      const updatePayload: any = {
        name: formData.name,
        phone: formData.phone || undefined,
        role: formData.role,
        plan: formData.plan || undefined,
      };
      // Only include password if it's provided
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

  // Don't render if no permission
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar Usuário</h1>
          <p className="text-muted-foreground">Atualizar informações do usuário</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Informações do Usuário
          </CardTitle>
          <CardDescription>Atualize os dados do usuário abaixo. Alguns campos podem estar bloqueados por razões de segurança.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Selecione a função</option>
                  {availableRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan">Plano</Label>
                <Input
                  id="plan"
                  value={formData.plan}
                  onChange={(e) => handleInputChange('plan', e.target.value)}
                  placeholder="Plano do usuário"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Digite a senha"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Preferências de Notificação</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="email-notifications"
                    checked={formData.notificationPreferences?.email || false}
                    onCheckedChange={(checked) => handleNotificationChange('email', checked as boolean)}
                  />
                  <Label htmlFor="email-notifications">Notificações por email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="whatsapp-notifications"
                    checked={formData.notificationPreferences?.whatsapp || false}
                    onCheckedChange={(checked) => handleNotificationChange('whatsapp', checked as boolean)}
                  />
                  <Label htmlFor="whatsapp-notifications">Notificações por WhatsApp</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="push-notifications"
                    checked={formData.notificationPreferences?.push || false}
                    onCheckedChange={(checked) => handleNotificationChange('push', checked as boolean)}
                  />
                  <Label htmlFor="push-notifications">Notificações push</Label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
