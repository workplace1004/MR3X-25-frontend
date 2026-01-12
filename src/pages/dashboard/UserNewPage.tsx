import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, UserPlus, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DocumentInput } from '../../components/ui/document-input';
import { PasswordInput } from '../../components/ui/password-input';
import { toast } from 'sonner';
import { validateDocument } from '../../lib/validation';
import { usersAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';

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
  const [emailError, setEmailError] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const checkEmailExists = useCallback(async (email: string) => {
    setEmailVerified(false);

    if (!email) {
      setEmailError('');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Formato de email inválido');
      return;
    }

    setCheckingEmail(true);
    try {
      const result = await usersAPI.checkEmailExists(email);
      if (result.exists) {
        setEmailError('Este email já está em uso, por favor altere o email');
        setEmailVerified(false);
        toast.error('Este email já está em uso, por favor altere o email');
      } else {
        setEmailError('');
        setEmailVerified(true);
      }
    } catch (error) {
      console.error('Error checking email:', error);
      setEmailError('Erro ao verificar email');
      setEmailVerified(false);
    } finally {
      setCheckingEmail(false);
    }
  }, []);

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
      {}
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

      {}
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
            {}
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
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    onBlur={(e) => checkEmailExists(e.target.value)}
                    placeholder="Digite o endereço de email"
                    required
                    className={`pr-10 ${emailError ? 'border-red-500' : emailVerified ? 'border-green-500' : ''}`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingEmail && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                    {!checkingEmail && emailVerified && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {!checkingEmail && emailError && <XCircle className="w-4 h-4 text-red-500" />}
                  </div>
                </div>
                {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
                {emailVerified && !emailError && <p className="text-green-500 text-sm mt-1">Email disponível</p>}
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

              <PasswordInput
                id="password"
                name="password"
                label="Senha"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Digite a senha"
                required
                showStrengthIndicator={true}
              />
            </div>

            {}
            <div className="space-y-4">
              <Label className="text-base font-medium">Preferências de Notificação</Label>
              <div className="space-y-3">
                <label htmlFor="email-notifications" className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    id="email-notifications"
                    checked={formData.notificationPreferences.email}
                    onCheckedChange={(checked) => handleNotificationChange('email', checked as boolean)}
                  />
                  <span className="text-sm">Notificações por email</span>
                </label>
                <label htmlFor="whatsapp-notifications" className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    id="whatsapp-notifications"
                    checked={formData.notificationPreferences.whatsapp}
                    onCheckedChange={(checked) => handleNotificationChange('whatsapp', checked as boolean)}
                  />
                  <span className="text-sm">Notificações por WhatsApp</span>
                </label>
                <label htmlFor="push-notifications" className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    id="push-notifications"
                    checked={formData.notificationPreferences.push}
                    onCheckedChange={(checked) => handleNotificationChange('push', checked as boolean)}
                  />
                  <span className="text-sm">Notificações push</span>
                </label>
              </div>
            </div>

            {}
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
