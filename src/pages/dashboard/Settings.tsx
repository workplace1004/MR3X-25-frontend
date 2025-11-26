import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import {
  Save,
  Mail,
  Globe,
  Shield,
  Bell,
  Key,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

export function Settings() {
  const { hasPermission } = useAuth()

  const canViewSettings = hasPermission('settings:read')
  const canUpdateSettings = hasPermission('settings:update')

  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    fromEmail: '',
    fromName: 'MR3X Platform'
  })

  const [notificationSettings, setNotificationSettings] = useState({
    emailEnabled: true,
    whatsappEnabled: false,
    smsEnabled: false
  })

  const [securitySettings, setSecuritySettings] = useState({
    requireVerification: true,
    sessionTimeout: '30',
    maxLoginAttempts: '5'
  })

  const [apiSettings, setApiSettings] = useState({
    apiKey: '',
    rateLimit: '100',
    webhookUrl: ''
  })

  if (!canViewSettings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Voce nao tem permissao para visualizar configuracoes.</p>
        </div>
      </div>
    )
  }

  const handleSave = async (settingsType: string) => {
    try {
      toast.success(`Configuracoes de ${settingsType} salvas com sucesso`)
    } catch (error) {
      toast.error('Falha ao salvar configuracoes')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Configuracoes</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Configure as configuracoes e preferencias do sistema
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="email">E-mail</TabsTrigger>
          <TabsTrigger value="security">Seguranca</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notificacoes
              </CardTitle>
              <CardDescription>
                Configure as preferencias de notificacao
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificacoes por E-mail</Label>
                  <p className="text-sm text-muted-foreground">Enviar notificacoes por e-mail</p>
                </div>
                <Switch
                  checked={notificationSettings.emailEnabled}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, emailEnabled: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificacoes WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">Enviar notificacoes via WhatsApp</p>
                </div>
                <Switch
                  checked={notificationSettings.whatsappEnabled}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, whatsappEnabled: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificacoes SMS</Label>
                  <p className="text-sm text-muted-foreground">Enviar notificacoes via SMS</p>
                </div>
                <Switch
                  checked={notificationSettings.smsEnabled}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, smsEnabled: checked })
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave('notificacoes')}
                  disabled={!canUpdateSettings}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alteracoes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Configuracoes da Plataforma
              </CardTitle>
              <CardDescription>
                Configure as configuracoes gerais da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platformName">Nome da Plataforma</Label>
                <Input
                  id="platformName"
                  value="MR3X"
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseUrl">URL Base</Label>
                <Input
                  id="baseUrl"
                  value={import.meta.env.VITE_API_URL || 'http://localhost:8081'}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave('plataforma')}
                  disabled={!canUpdateSettings}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alteracoes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Configuracao de E-mail
              </CardTitle>
              <CardDescription>
                Configure as configuracoes SMTP para envio de e-mails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">Servidor SMTP</Label>
                  <Input
                    id="smtpHost"
                    value={emailSettings.smtpHost}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                    disabled={!canUpdateSettings}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">Porta SMTP</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={emailSettings.smtpPort}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: e.target.value })}
                    placeholder="587"
                    disabled={!canUpdateSettings}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">Usuario SMTP</Label>
                  <Input
                    id="smtpUser"
                    value={emailSettings.smtpUser}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                    placeholder="seu-email@gmail.com"
                    disabled={!canUpdateSettings}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPass">Senha SMTP</Label>
                  <Input
                    id="smtpPass"
                    type="password"
                    value={emailSettings.smtpPass}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpPass: e.target.value })}
                    placeholder="********"
                    disabled={!canUpdateSettings}
                  />
                </div>
              </div>

              {!canUpdateSettings && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span>Voce nao tem permissao para modificar as configuracoes de e-mail</span>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave('e-mail')}
                  disabled={!canUpdateSettings}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alteracoes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Configuracao de Seguranca
              </CardTitle>
              <CardDescription>
                Configure as configuracoes de seguranca e autenticacao
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir Verificacao de E-mail</Label>
                  <p className="text-sm text-muted-foreground">Usuarios devem verificar o e-mail antes de acessar</p>
                </div>
                <Switch
                  checked={securitySettings.requireVerification}
                  onCheckedChange={(checked) =>
                    setSecuritySettings({ ...securitySettings, requireVerification: checked })
                  }
                  disabled={!canUpdateSettings}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Tempo de Sessao (minutos)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
                  disabled={!canUpdateSettings}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxLoginAttempts">Maximo de Tentativas de Login</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  value={securitySettings.maxLoginAttempts}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: e.target.value })}
                  disabled={!canUpdateSettings}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave('seguranca')}
                  disabled={!canUpdateSettings}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alteracoes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Settings */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Configuracao da API
              </CardTitle>
              <CardDescription>
                Configure as configuracoes de acesso e integracao da API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">Chave da API</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiSettings.apiKey}
                  onChange={(e) => setApiSettings({ ...apiSettings, apiKey: e.target.value })}
                  placeholder="****************"
                  disabled={!canUpdateSettings}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rateLimit">Limite de Taxa (requisicoes/hora)</Label>
                  <Input
                    id="rateLimit"
                    type="number"
                    value={apiSettings.rateLimit}
                    onChange={(e) => setApiSettings({ ...apiSettings, rateLimit: e.target.value })}
                    disabled={!canUpdateSettings}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">URL do Webhook</Label>
                  <Input
                    id="webhookUrl"
                    value={apiSettings.webhookUrl}
                    onChange={(e) => setApiSettings({ ...apiSettings, webhookUrl: e.target.value })}
                    placeholder="https://exemplo.com/webhook"
                    disabled={!canUpdateSettings}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave('api')}
                  disabled={!canUpdateSettings}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alteracoes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
