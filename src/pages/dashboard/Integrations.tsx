import { useState } from 'react'
import { Wrench, Eye, EyeOff, Plus, Edit, Trash2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'

export default function IntegrationsPage() {
  const { hasPermission } = useAuth()

  const canManageIntegrations = hasPermission('integrations:create') || hasPermission('integrations:update')

  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [_showEditModal, setShowEditModal] = useState(false)
  const [_selectedIntegration, setSelectedIntegration] = useState<any>(null)
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})

  const [apiKeyForm, setApiKeyForm] = useState({
    name: '',
    description: '',
  })

  // Mock data - will be replaced with real API calls
  const apiKeys = [
    {
      id: '1',
      name: 'API Principal',
      key: 'sk_live_1234567890abcdef',
      createdAt: new Date('2024-01-01'),
      lastUsed: new Date('2024-01-20'),
      isActive: true,
    },
    {
      id: '2',
      name: 'API de Desenvolvimento',
      key: 'sk_test_abcdef1234567890',
      createdAt: new Date('2024-01-10'),
      lastUsed: new Date('2024-01-19'),
      isActive: true,
    },
  ]

  const integrations = [
    {
      id: '1',
      name: 'Asaas',
      type: 'payment',
      status: 'connected',
      description: 'Gateway de pagamento',
      config: { apiKey: '***', environment: 'production' },
    },
    {
      id: '2',
      name: 'ZapSign',
      type: 'document',
      status: 'connected',
      description: 'Assinatura digital de documentos',
      config: { apiKey: '***', workspace: 'mr3x' },
    },
    {
      id: '3',
      name: 'WhatsApp Business API',
      type: 'communication',
      status: 'pending',
      description: 'Envio de mensagens via WhatsApp',
      config: {},
    },
    {
      id: '4',
      name: 'SendGrid',
      type: 'communication',
      status: 'disconnected',
      description: 'Envio de emails transacionais',
      config: {},
    },
  ]

  const handleCreateApiKey = () => {
    toast.success('API Key criada com sucesso!')
    setShowApiKeyModal(false)
    setApiKeyForm({ name: '', description: '' })
  }

  const toggleApiKeyVisibility = (id: string) => {
    setShowApiKey(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-500 text-white flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Conectado
          </Badge>
        )
      case 'pending':
        return <Badge className="bg-yellow-500 text-white">Pendente</Badge>
      case 'disconnected':
        return (
          <Badge className="bg-gray-500 text-white flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Desconectado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Centro Técnico</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gerencie APIs, integrações e chaves de acesso
          </p>
        </div>
        {canManageIntegrations && (
          <Button onClick={() => setShowApiKeyModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova API Key
          </Button>
        )}
      </div>

      <Tabs defaultValue="integrations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {integrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription>{integration.description}</CardDescription>
                    </div>
                    {getStatusBadge(integration.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <div className="text-sm font-medium mt-1">
                      {integration.type === 'payment' && 'Pagamento'}
                      {integration.type === 'document' && 'Documento'}
                      {integration.type === 'communication' && 'Comunicação'}
                    </div>
                  </div>

                  {Object.keys(integration.config).length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Configuração</Label>
                      <div className="text-sm mt-1 space-y-1">
                        {Object.entries(integration.config).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-mono text-xs">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {integration.status === 'disconnected' && (
                      <Button size="sm" className="flex-1">
                        Conectar
                      </Button>
                    )}
                    {integration.status === 'connected' && canManageIntegrations && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                        setSelectedIntegration(integration)
                        setShowEditModal(true)
                      }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Configurar
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Gerencie chaves de API para acesso programático</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-semibold">{key.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {showApiKey[key.id] ? key.key : '•'.repeat(key.key.length)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleApiKeyVisibility(key.id)}
                        >
                          {showApiKey[key.id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Criada em {key.createdAt.toLocaleDateString('pt-BR')} -
                        Último uso: {key.lastUsed.toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>Configure webhooks para receber notificações de eventos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Webhooks serão implementados em breve</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create API Key Modal */}
      <Dialog open={showApiKeyModal} onOpenChange={setShowApiKeyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="api-key-name">Nome</Label>
              <Input
                id="api-key-name"
                value={apiKeyForm.name}
                onChange={(e) => setApiKeyForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: API de Integração"
              />
            </div>
            <div>
              <Label htmlFor="api-key-description">Descrição</Label>
              <Input
                id="api-key-description"
                value={apiKeyForm.description}
                onChange={(e) => setApiKeyForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição opcional"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowApiKeyModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateApiKey}>
                Criar API Key
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
