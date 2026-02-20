import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings, User, Bell, Shield, Lock,
  Mail, Phone, Calendar, Clock, Save, Loader2
} from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Switch } from '../../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Skeleton } from '../../../components/ui/skeleton';
import { platformManagerAPI } from '../../../api';

interface NotificationSettings {
  emailTickets: boolean;
  emailAgencies: boolean;
  emailReports: boolean;
  pushTickets: boolean;
  pushAlerts: boolean;
  pushMessages: boolean;
  digestDaily: boolean;
  digestWeekly: boolean;
}

export function ManagerSettings() {
  const [activeTab, setActiveTab] = useState('profile');
  const queryClient = useQueryClient();

  const { data: profileData = {}, isLoading: profileLoading } = useQuery({
    queryKey: ['platform-manager', 'profile'],
    queryFn: platformManagerAPI.getManagerProfile,
  });

  const { data: notificationsData = {}, isLoading: notificationsLoading } = useQuery({
    queryKey: ['platform-manager', 'notification-settings'],
    queryFn: platformManagerAPI.getNotificationSettings,
  });

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    createdAt: '',
    lastLogin: '',
  });

  const [notifications, setNotifications] = useState({
    emailTickets: true,
    emailAgencies: true,
    emailReports: false,
    pushTickets: true,
    pushAlerts: true,
    pushMessages: false,
    digestDaily: true,
    digestWeekly: false,
  });

  useState(() => {
    if (profileData && Object.keys(profileData).length > 0) {
      setProfile({
        name: profileData.name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        role: profileData.role || '',
        department: profileData.department || '',
        createdAt: profileData.createdAt || '',
        lastLogin: profileData.lastLogin || '',
      });
    }
  });

  useState(() => {
    if (notificationsData && Object.keys(notificationsData).length > 0) {
      setNotifications(prev => ({ ...prev, ...notificationsData }));
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: { name?: string; phone?: string }) => platformManagerAPI.updateManagerProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-manager', 'profile'] });
    },
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: (settings: NotificationSettings) => platformManagerAPI.updateNotificationSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-manager', 'notification-settings'] });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({ name: profile.name, phone: profile.phone });
  };

  const handleSaveNotifications = () => {
    updateNotificationsMutation.mutate(notifications);
  };

  const isLoading = profileLoading || notificationsLoading;

  const displayProfile = {
    ...profile,
    name: profile.name || profileData.name || '',
    email: profile.email || profileData.email || '',
    phone: profile.phone || profileData.phone || '',
    role: profileData.role || 'PLATFORM_MANAGER',
    department: profileData.department || 'Gestão',
    createdAt: profileData.createdAt || '',
    lastLogin: profileData.lastLogin || '',
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-32" />
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        subtitle="Gerencie suas preferências pessoais (acesso limitado)"
        icon={<Settings className="w-6 h-6 text-slate-700" />}
        iconBgClass="bg-slate-100"
      />
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Meu Perfil
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Settings className="w-4 h-4 mr-2" />
            Preferências
          </TabsTrigger>
        </TabsList>

        {}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Pessoais</CardTitle>
              <CardDescription>Seus dados cadastrados no sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                  {displayProfile.name?.charAt(0) || '?'}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{displayProfile.name || 'Usuário'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-blue-100 text-blue-700">Gerente de Plataforma</Badge>
                    <Badge variant="outline">{displayProfile.department}</Badge>
                  </div>
                </div>
              </div>

              {}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={profile.name || displayProfile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <Input id="email" value={displayProfile.email} disabled className="bg-gray-50" />
                  </div>
                  <p className="text-xs text-muted-foreground">Email não pode ser alterado</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={profile.phone || displayProfile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Input value="Gerente de Plataforma" disabled className="bg-gray-50" />
                  <p className="text-xs text-muted-foreground">Função definida pelo administrador</p>
                </div>
              </div>

              {}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Membro desde</p>
                    <p className="font-medium">{displayProfile.createdAt ? new Date(displayProfile.createdAt).toLocaleDateString('pt-BR') : '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Último acesso</p>
                    <p className="font-medium">{displayProfile.lastLogin ? new Date(displayProfile.lastLogin).toLocaleString('pt-BR') : '-'}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preferências de Notificação</CardTitle>
              <CardDescription>Configure como você deseja receber notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {}
              <div>
                <h4 className="font-medium mb-4">Notificações por Email</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Novos Tickets</p>
                      <p className="text-sm text-muted-foreground">Receber email quando novos tickets forem abertos</p>
                    </div>
                    <Switch
                      checked={notifications.emailTickets}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, emailTickets: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Atividade de Agências</p>
                      <p className="text-sm text-muted-foreground">Notificações sobre novas agências e mudanças de status</p>
                    </div>
                    <Switch
                      checked={notifications.emailAgencies}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, emailAgencies: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Relatórios Automáticos</p>
                      <p className="text-sm text-muted-foreground">Receber relatórios periódicos por email</p>
                    </div>
                    <Switch
                      checked={notifications.emailReports}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, emailReports: checked })}
                    />
                  </div>
                </div>
              </div>

              {}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-4">Notificações Push</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Tickets Urgentes</p>
                      <p className="text-sm text-muted-foreground">Notificação instantânea para tickets de alta prioridade</p>
                    </div>
                    <Switch
                      checked={notifications.pushTickets}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, pushTickets: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Alertas do Sistema</p>
                      <p className="text-sm text-muted-foreground">Alertas de erros e problemas na plataforma</p>
                    </div>
                    <Switch
                      checked={notifications.pushAlerts}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, pushAlerts: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Mensagens</p>
                      <p className="text-sm text-muted-foreground">Notificação para novas mensagens de agências</p>
                    </div>
                    <Switch
                      checked={notifications.pushMessages}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, pushMessages: checked })}
                    />
                  </div>
                </div>
              </div>

              {}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-4">Resumo Periódico</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Resumo Diário</p>
                      <p className="text-sm text-muted-foreground">Receber resumo das atividades do dia</p>
                    </div>
                    <Switch
                      checked={notifications.digestDaily}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, digestDaily: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Resumo Semanal</p>
                      <p className="text-sm text-muted-foreground">Receber resumo das atividades da semana</p>
                    </div>
                    <Switch
                      checked={notifications.digestWeekly}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, digestWeekly: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveNotifications} disabled={updateNotificationsMutation.isPending}>
                  {updateNotificationsMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Preferências
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {}
        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Segurança da Conta</CardTitle>
              <CardDescription>Configurações de segurança e autenticação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Senha</p>
                    <p className="text-sm text-muted-foreground">Última alteração: Nunca</p>
                  </div>
                </div>
                <Button variant="outline">Alterar Senha</Button>
              </div>

              {}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Autenticação em Duas Etapas</p>
                    <p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança</p>
                  </div>
                </div>
                <Badge variant="outline">Em breve</Badge>
              </div>

              {}
              <div>
                <h4 className="font-medium mb-4">Sessões Ativas</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Windows - Chrome</p>
                      <p className="text-sm text-muted-foreground">Sessão atual</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700">Ativa</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {}
        <TabsContent value="preferences" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preferências de Interface</CardTitle>
              <CardDescription>Personalize sua experiência na plataforma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Tema Escuro</p>
                  <p className="text-sm text-muted-foreground">Usar tema escuro na interface</p>
                </div>
                <Badge variant="outline">Em breve</Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Idioma</p>
                  <p className="text-sm text-muted-foreground">Idioma da interface</p>
                </div>
                <Badge>Português (BR)</Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Fuso Horário</p>
                  <p className="text-sm text-muted-foreground">Fuso horário para exibição de datas</p>
                </div>
                <Badge>America/Sao_Paulo (GMT-3)</Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Formato de Data</p>
                  <p className="text-sm text-muted-foreground">Como as datas são exibidas</p>
                </div>
                <Badge>DD/MM/YYYY</Badge>
              </div>
            </CardContent>
          </Card>

          {}
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-700">
              <strong>Nota:</strong> Como Gerente de Plataforma, você pode modificar suas preferências pessoais e configurações de notificação. Configurações do sistema e permissões são gerenciadas exclusivamente pelo Administrador.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
