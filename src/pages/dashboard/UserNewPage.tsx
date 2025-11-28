import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, UserPlus, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { DocumentInput } from '../../components/ui/document-input';
import { toast } from 'sonner';
import { validateDocument } from '../../lib/validation';
import { usersAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Role labels for display in dropdown
 */
const ROLE_LABELS: Record<string, string> = {
  'CEO': 'CEO - Administrador MR3X',
  'ADMIN': 'Admin - Administrador Sistema',
  'AGENCY_ADMIN': 'Diretor de Agência - Dono de Imobiliária',
  'AGENCY_MANAGER': 'Gestor - Gerente de Agência',
  'BROKER': 'Corretor - Agente Imobiliário',
  'PROPRIETARIO': 'Proprietário - Dono de Imóvel',
  'INDEPENDENT_OWNER': 'Proprietário Independente - Sem Agência',
  'INQUILINO': 'Inquilino - Locatário',
  'BUILDING_MANAGER': 'Síndico - Administrador de Condomínio',
  'LEGAL_AUDITOR': 'Auditor - Auditoria Legal',
  'REPRESENTATIVE': 'Representante - Afiliado',
  'API_CLIENT': 'Cliente API - Integração',
};

/**
 * Role Creation Hierarchy - Who can create which roles
 * Based on MR3X Complete Hierarchy Requirements:
 *
 * CEO -> ADMIN only
 * ADMIN -> AGENCY_MANAGER (MR3X), LEGAL_AUDITOR, REPRESENTATIVE, API_CLIENT
 * AGENCY_ADMIN -> AGENCY_MANAGER, BROKER, PROPRIETARIO
 * AGENCY_MANAGER -> BROKER, PROPRIETARIO
 * INDEPENDENT_OWNER -> INQUILINO, BUILDING_MANAGER
 * Others -> Cannot create users
 */
const ROLE_CREATION_ALLOWED: Record<string, string[]> = {
  'CEO': ['ADMIN'],
  'ADMIN': ['AGENCY_MANAGER', 'LEGAL_AUDITOR', 'REPRESENTATIVE', 'API_CLIENT'],
  'AGENCY_ADMIN': ['AGENCY_MANAGER', 'BROKER', 'PROPRIETARIO'],
  'AGENCY_MANAGER': ['BROKER', 'PROPRIETARIO'],
  'INDEPENDENT_OWNER': ['INQUILINO', 'BUILDING_MANAGER'],
  // These roles cannot create users
  'BROKER': [],
  'PROPRIETARIO': [],
  'INQUILINO': [],
  'BUILDING_MANAGER': [],
  'LEGAL_AUDITOR': [],
  'REPRESENTATIVE': [],
  'API_CLIENT': [],
};

/**
 * Get roles that the current user can create based on hierarchy
 */
const getAvailableRoles = (userRole: string | undefined) => {
  if (!userRole) return [];
  const allowedRoles = ROLE_CREATION_ALLOWED[userRole] || [];
  return allowedRoles.map(role => ({
    value: role,
    label: ROLE_LABELS[role] || role
  }));
};

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'INVITED', label: 'Convidado' },
  { value: 'SUSPENDED', label: 'Suspenso' },
];

export function UserNewPage() {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const availableRoles = getAvailableRoles(user?.role);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    role: '',
    status: 'ACTIVE',
    password: '',
    notificationPreferences: {
      email: true,
      whatsapp: true,
      push: false,
    },
  });

  const canCreateUsers = hasPermission('users:create');

  // Redirect if no permission
  useEffect(() => {
    if (!canCreateUsers) {
      toast.error('Você não tem permissão para criar usuários');
      navigate('/dashboard/users');
    }
  }, [canCreateUsers, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreateUsers) {
      toast.error('Você não tem permissão para criar usuários');
      return;
    }

    setLoading(true);

    try {
      if (formData.document) {
        const docResult = validateDocument(formData.document);
        if (!docResult.isValid) {
          toast.error(docResult.error || 'Documento inválido (CPF/CNPJ)');
          setLoading(false);
          return;
        }
      }
      // Only send fields that the backend accepts
      const createPayload = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        phone: formData.phone || undefined,
        document: formData.document || undefined,
      };
      await usersAPI.createUser(createPayload);
      toast.success('Usuário criado com sucesso');
      navigate('/dashboard/users');
    } catch (error: any) {
      toast.error(error.message || 'Falha ao criar usuário');
    } finally {
      setLoading(false);
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
        ...prev.notificationPreferences,
        [type]: checked,
      },
    }));
  };

  // Don't render if no permission
  if (!canCreateUsers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para criar usuários.</p>
        </div>
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
          <h1 className="text-2xl font-bold">Criar Novo Usuário</h1>
          <p className="text-muted-foreground">Adicione um novo usuário ao sistema</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Informações do Usuário
          </CardTitle>
          <CardDescription>Preencha os dados abaixo para criar uma nova conta de usuário</CardDescription>
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
                />
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
                <DocumentInput
                  value={formData.document}
                  onChange={(value) => handleInputChange('document', value)}
                  label="CPF / CNPJ"
                  placeholder="123.456.789-00 ou 00.000.000/0000-00"
                  showValidation={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Função *</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  required
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
                <Label htmlFor="password">Senha *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Digite a senha"
                    required
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
                    checked={formData.notificationPreferences.email}
                    onCheckedChange={(checked) => handleNotificationChange('email', checked as boolean)}
                  />
                  <Label htmlFor="email-notifications">Notificações por email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="whatsapp-notifications"
                    checked={formData.notificationPreferences.whatsapp}
                    onCheckedChange={(checked) => handleNotificationChange('whatsapp', checked as boolean)}
                  />
                  <Label htmlFor="whatsapp-notifications">Notificações por WhatsApp</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="push-notifications"
                    checked={formData.notificationPreferences.push}
                    onCheckedChange={(checked) => handleNotificationChange('push', checked as boolean)}
                  />
                  <Label htmlFor="push-notifications">Notificações push</Label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {loading ? 'Criando...' : 'Criar Usuário'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
