import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { usersAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const ALL_ROLES = [
  { value: 'CEO', label: 'CEO - Administrador MR3X' },
  { value: 'ADMIN', label: 'Admin - Administrador Sistema' },
  { value: 'AGENCY_MANAGER', label: 'Gestor - Gerente de Agência' },
  { value: 'BROKER', label: 'Corretor - Agente Imobiliário' },
  { value: 'PROPRIETARIO', label: 'Imóvel - Dono de Imóvel' },
  { value: 'INDEPENDENT_OWNER', label: 'Imóvel Independente - Sem Agência' },
  { value: 'INQUILINO', label: 'Inquilino - Locatário' },
  { value: 'BUILDING_MANAGER', label: 'Síndico - Administrador de Condomínio' },
  { value: 'LEGAL_AUDITOR', label: 'Auditor - Auditoria Legal' },
  { value: 'REPRESENTATIVE', label: 'Representante - Afiliado' },
  { value: 'API_CLIENT', label: 'Cliente API - Integração' },
];

const getAvailableRoles = (userRole: string | undefined) => {
  
  if (userRole === 'CEO') {
    return ALL_ROLES.filter(role => role.value === 'ADMIN');
  }
  
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
                  <SelectTrigger>
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
