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

  // Check permissions
  const canViewSettings = hasPermission('settings:read')
  const canUpdateSettings = hasPermission('settings:update')

  // Settings states
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

  // Don't render if no permission
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
      // TODO: Implement API call to save settings
      toast.success(`Configurações de ${settingsType} salvas com sucesso`)
    } catch (error) {
      toast.error('Falha ao salvar configurações')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Configurações</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Configure as configurações e preferências do sistema
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="payment">Pagamento</TabsTrigger>
          <TabsTrigger value="email">E-mail</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        {/* General Settings */}
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
              <div className="flex items-center justify-between">
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

              <div className="flex items-center justify-between">
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

              <div className="flex items-center justify-between">
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
                  className="bg-orange-600 hover:bg-orange-700 text-white"
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
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Configuration */}
        <TabsContent value="payment" className="space-y-6">
          <PaymentConfigurationTab canUpdateSettings={canUpdateSettings} />
        </TabsContent>

        {/* Email Settings */}
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
                  <AlertCircle className="w-4 h-4" />
                  <span>Você não tem permissão para modificar as configurações de e-mail</span>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave('e-mail')}
                  disabled={!canUpdateSettings}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
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
                Configuração de Segurança
              </CardTitle>
              <CardDescription>
                Configure as configurações de segurança e autenticação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
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

              {!canUpdateSettings && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span>Você não tem permissão para modificar as configurações de segurança</span>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave('segurança')}
                  disabled={!canUpdateSettings}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
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
                  <AlertCircle className="w-4 h-4" />
                  <span>Você não tem permissão para modificar as configurações da API</span>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave('api')}
                  disabled={!canUpdateSettings}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
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

// Payment Configuration Component
function PaymentConfigurationTab({ canUpdateSettings }: { canUpdateSettings: boolean }) {
  const queryClient = useQueryClient()
  const [platformFee, setPlatformFee] = useState<string>('2')
  const [agencyFee, setAgencyFee] = useState<string>('8')
  const [saving, setSaving] = useState(false)

  // Fetch current payment configuration
  const { data: paymentConfig, isLoading } = useQuery({
    queryKey: ['paymentConfig'],
    queryFn: () => settingsAPI.getPaymentConfig(),
    enabled: canUpdateSettings,
  })

  // Update local state when config is loaded
  useEffect(() => {
    if (paymentConfig) {
      setPlatformFee(paymentConfig.platformFee?.toString() || '2')
      setAgencyFee(paymentConfig.agencyFee?.toString() || '8')
    }
  }, [paymentConfig])

  // Update mutation
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

    // Validation
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Configuração de Divisão de Pagamentos
        </CardTitle>
        <CardDescription>
          Configure as porcentagens de taxa para divisão de pagamentos. Essas taxas serão aplicadas a todas as divisões de pagamento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Platform Fee */}
          <div className="space-y-2">
            <Label htmlFor="platformFee">Taxa da Plataforma (MR3X)</Label>
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
            <p className="text-sm text-muted-foreground">
              Porcentagem de comissão da plataforma MR3X
            </p>
          </div>

          {/* Agency Fee - Read Only */}
          <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Label htmlFor="agencyFee" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-gray-500" />
              Taxa da Agência (Read-Only)
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
            <p className="text-sm text-muted-foreground">
              Porcentagem padrão de comissão da agência. Configure por agência no painel de cada agência.
            </p>
          </div>

          {/* Owner Amount (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="ownerFee">Valor do Proprietário</Label>
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
            <p className="text-sm text-muted-foreground">
              Valor restante para o proprietário
            </p>
          </div>
        </div>

        {/* Example Calculation */}
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Exemplo de Cálculo (Pagamento de R$ 1.000)</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Taxa da Plataforma ({platformFee}%):</span>
              <span className="font-medium">R$ {((1000 * parseFloat(platformFee || '0')) / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxa da Agência ({agencyFee}%):</span>
              <span className="font-medium">R$ {((1000 * parseFloat(agencyFee || '0')) / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Valor do Proprietário ({ownerFee.toFixed(2)}%):</span>
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
            <AlertCircle className="w-4 h-4" />
            <span>Você não tem permissão para modificar a configuração de pagamentos</span>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!canUpdateSettings || saving}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
