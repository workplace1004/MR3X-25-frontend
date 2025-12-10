import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { settingsAPI } from '../../api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Save,
  Mail,
  Globe,
  Shield,
  Bell,
  CreditCard,
  Key,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Button } from '../../components/ui/button'
import { Switch } from '../../components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Separator } from '../../components/ui/separator'

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
          <p className="text-muted-foreground">Você não tem permissão para visualizar configurações.</p>
        </div>
      </div>
    )
  }

  const handleSave = async (settingsType: string) => {
    try {
      
      toast.success(`Configurações de ${settingsType} salvas com sucesso`)
    } catch (error) {
      toast.error('Falha ao salvar configurações')
    }
  }

  return (
    <div className="space-y-6">
      {}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Configurações</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Configure as configurações e preferências do sistema
          </p>
        </div>
      </div>

      {}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex w-full overflow-x-auto no-scrollbar">
          <TabsTrigger value="general" className="flex-shrink-0">Geral</TabsTrigger>
          <TabsTrigger value="payment" className="flex-shrink-0">Pagamento</TabsTrigger>
          <TabsTrigger value="email" className="flex-shrink-0">E-mail</TabsTrigger>
          <TabsTrigger value="security" className="flex-shrink-0">Segurança</TabsTrigger>
          <TabsTrigger value="api" className="flex-shrink-0">API</TabsTrigger>
        </TabsList>

        {}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notificações
              </CardTitle>
              <CardDescription>
                Configure as preferências de notificação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label>Notificações por E-mail</Label>
                  <p className="text-sm text-muted-foreground">Enviar notificações por e-mail</p>
                </div>
                <Switch
                  checked={notificationSettings.emailEnabled}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, emailEnabled: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label>Notificações WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">Enviar notificações via WhatsApp</p>
                </div>
                <Switch
                  checked={notificationSettings.whatsappEnabled}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, whatsappEnabled: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label>Notificações SMS</Label>
                  <p className="text-sm text-muted-foreground">Enviar notificações via SMS</p>
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
                  onClick={() => handleSave('notificações')}
                  disabled={!canUpdateSettings}
                  className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Configurações da Plataforma
              </CardTitle>
              <CardDescription>
                Configure as configurações gerais da plataforma
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
                  className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {}
        <TabsContent value="payment" className="space-y-6">
          <PaymentConfigurationTab canUpdateSettings={canUpdateSettings} />
        </TabsContent>

        {}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Configuração de E-mail
              </CardTitle>
              <CardDescription>
                Configure as configurações SMTP para envio de e-mails
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
                  <Label htmlFor="smtpUser">Usuário SMTP</Label>
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
                    placeholder="••••••••"
                    disabled={!canUpdateSettings}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">E-mail de Origem</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={emailSettings.fromEmail}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                    placeholder="noreply@mr3x.com"
                    disabled={!canUpdateSettings}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromName">Nome de Origem</Label>
                  <Input
                    id="fromName"
                    value={emailSettings.fromName}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                    placeholder="MR3X Platform"
                    disabled={!canUpdateSettings}
                  />
                </div>
              </div>

              {!canUpdateSettings && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Você não tem permissão para modificar as configurações de e-mail</span>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave('e-mail')}
                  disabled={!canUpdateSettings}
                  className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Configuração de Segurança
              </CardTitle>
              <CardDescription>
                Configure as configurações de segurança e autenticação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label>Exigir Verificação de E-mail</Label>
                  <p className="text-sm text-muted-foreground">Usuários devem verificar o e-mail antes de acessar a plataforma</p>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Tempo de Sessão (minutos)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
                    disabled={!canUpdateSettings}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">Máximo de Tentativas de Login</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: e.target.value })}
                    disabled={!canUpdateSettings}
                  />
                </div>
              </div>

              {!canUpdateSettings && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Você não tem permissão para modificar as configurações de segurança</span>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave('segurança')}
                  disabled={!canUpdateSettings}
                  className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Configuração da API
              </CardTitle>
              <CardDescription>
                Configure as configurações de acesso e integração da API
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
                  placeholder="••••••••••••••••"
                  disabled={!canUpdateSettings}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rateLimit">Limite de Taxa (requisições/hora)</Label>
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

              {!canUpdateSettings && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Você não tem permissão para modificar as configurações da API</span>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave('api')}
                  disabled={!canUpdateSettings}
                  className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PaymentConfigurationTab({ canUpdateSettings }: { canUpdateSettings: boolean }) {
  const queryClient = useQueryClient()
  const [platformFee, setPlatformFee] = useState<string>('2')
  const [agencyFee, setAgencyFee] = useState<string>('8')
  const [saving, setSaving] = useState(false)

  const { data: paymentConfig, isLoading } = useQuery({
    queryKey: ['paymentConfig'],
    queryFn: () => settingsAPI.getPaymentConfig(),
    enabled: canUpdateSettings,
  })

  useEffect(() => {
    if (paymentConfig) {
      setPlatformFee(paymentConfig.platformFee?.toString() || '2')
      setAgencyFee(paymentConfig.agencyFee?.toString() || '8')
    }
  }, [paymentConfig])

  const updateMutation = useMutation({
    mutationFn: (config: { platformFee: number; agencyFee: number }) =>
      settingsAPI.updatePaymentConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentConfig'] })
      toast.success('Configuração de pagamentos atualizada com sucesso')
    },
    onError: (error: any) => {
      toast.error(error.data?.message || 'Falha ao atualizar configuração de pagamentos')
    },
  })

  const handleSave = async () => {
    const platformFeeNum = parseFloat(platformFee)

    if (isNaN(platformFeeNum) || platformFeeNum < 0 || platformFeeNum > 100) {
      toast.error('A taxa da plataforma deve estar entre 0 e 100')
      return
    }

    if (platformFeeNum + parseFloat(agencyFee || '0') > 100) {
      toast.error('Taxa da plataforma não pode exceder 100% - Taxa da agência')
      return
    }

    setSaving(true)
    try {
      await updateMutation.mutateAsync({
        platformFee: platformFeeNum,
        agencyFee: parseFloat(agencyFee || '8'),
      })
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Carregando configuração de pagamentos...</p>
        </CardContent>
      </Card>
    )
  }

  const ownerFee = 100 - (parseFloat(platformFee) || 0) - (parseFloat(agencyFee) || 0)

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <CreditCard className="w-5 h-5 flex-shrink-0" />
          <span>Configuração de Divisão de Pagamentos</span>
        </CardTitle>
        <CardDescription className="text-sm">
          Configure as porcentagens de taxa para divisão de pagamentos. Essas taxas serão aplicadas a todas as divisões de pagamento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {}
          <div className="space-y-2">
            <Label htmlFor="platformFee" className="text-sm">Taxa da Plataforma (MR3X)</Label>
            <div className="relative">
              <Input
                id="platformFee"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={platformFee}
                onChange={(e) => setPlatformFee(e.target.value)}
                disabled={!canUpdateSettings}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Porcentagem de comissão da plataforma MR3X
            </p>
          </div>

          {}
          <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Label htmlFor="agencyFee" className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span>Taxa da Agência (Read-Only)</span>
            </Label>
            <div className="relative">
              <Input
                id="agencyFee"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={agencyFee}
                disabled={true}
                className="pr-8 bg-muted cursor-not-allowed"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Porcentagem padrão de comissão da agência. Configure por agência no painel de cada agência.
            </p>
          </div>

          {}
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="ownerFee" className="text-sm">Valor do Imóvel</Label>
            <div className="relative">
              <Input
                id="ownerFee"
                type="number"
                value={ownerFee.toFixed(2)}
                disabled
                className="pr-8 bg-muted"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Valor restante para o proprietário
            </p>
          </div>
        </div>

        {}
        <div className="p-3 sm:p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2 text-sm sm:text-base">Exemplo de Cálculo (Pagamento de R$ 1.000)</h4>
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span>Taxa da Plataforma ({platformFee}%):</span>
              <span className="font-medium">R$ {((1000 * parseFloat(platformFee || '0')) / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxa da Agência ({agencyFee}%):</span>
              <span className="font-medium">R$ {((1000 * parseFloat(agencyFee || '0')) / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Valor do Imóvel ({ownerFee.toFixed(2)}%):</span>
              <span className="font-medium">R$ {(1000 * ownerFee / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t mt-2">
              <span className="font-semibold">Total:</span>
              <span className="font-bold">R$ 1.000,00</span>
            </div>
          </div>
        </div>

        {!canUpdateSettings && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Você não tem permissão para modificar a configuração de pagamentos</span>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!canUpdateSettings || saving}
            className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
