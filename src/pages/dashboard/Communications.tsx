import { useState } from 'react'
import { Mail, MessageSquare, Send, Building } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { toast } from 'sonner'

export default function CommunicationsPage() {
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    message: '',
    recipientType: 'all',
  })
  const [whatsAppForm, setWhatsAppForm] = useState({
    to: '',
    message: '',
    recipientType: 'all',
  })

  // Mock data - will be replaced with real API calls
  const sentMessages = [
    {
      id: '1',
      type: 'email',
      recipient: 'Todos os usuários',
      subject: 'Atualização do sistema',
      sentAt: new Date('2024-01-15'),
      status: 'sent',
      recipientsCount: 1250,
    },
    {
      id: '2',
      type: 'whatsapp',
      recipient: 'Agências Ativas',
      subject: 'Lembrete de pagamento',
      sentAt: new Date('2024-01-14'),
      status: 'sent',
      recipientsCount: 85,
    },
  ]

  const handleSendEmail = () => {
    toast.success('Email enviado com sucesso!')
    setShowEmailModal(false)
    setEmailForm({ to: '', subject: '', message: '', recipientType: 'all' })
  }

  const handleSendWhatsApp = () => {
    toast.success('Mensagem WhatsApp enviada com sucesso!')
    setShowWhatsAppModal(false)
    setWhatsAppForm({ to: '', message: '', recipientType: 'all' })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Comunicação Global</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Envie mensagens em massa por Email e WhatsApp
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowEmailModal(true)} variant="outline">
            <Mail className="w-4 h-4 mr-2" />
            Enviar Email
          </Button>
          <Button onClick={() => setShowWhatsAppModal(true)} className="bg-green-600 hover:bg-green-700">
            <MessageSquare className="w-4 h-4 mr-2" />
            Enviar WhatsApp
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total de Emails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">12,450</div>
            <p className="text-sm text-muted-foreground mt-1">Este mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total de WhatsApp</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">8,230</div>
            <p className="text-sm text-muted-foreground mt-1">Este mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Taxa de Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">98.5%</div>
            <p className="text-sm text-muted-foreground mt-1">Últimos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Histórico de Mensagens</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mensagens Enviadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sentMessages.map((message) => (
                  <div key={message.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {message.type === 'email' ? (
                        <Mail className="w-5 h-5 text-blue-500" />
                      ) : (
                        <MessageSquare className="w-5 h-5 text-green-500" />
                      )}
                      <div>
                        <div className="font-semibold">{message.subject}</div>
                        <div className="text-sm text-muted-foreground">
                          Para: {message.recipient} - {message.recipientsCount} destinatários
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {message.sentAt.toLocaleDateString('pt-BR')} às {message.sentAt.toLocaleTimeString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {message.status === 'sent' ? 'Enviado' : 'Pendente'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Templates de Mensagens</CardTitle>
              <CardDescription>Gerencie templates reutilizáveis para Email e WhatsApp</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Templates serão implementados em breve</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Análises de Comunicação</CardTitle>
              <CardDescription>Métricas e estatísticas de mensagens enviadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Building className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Análises serão implementadas em breve</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Email Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enviar Email em Massa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-recipient">Destinatário</Label>
              <Select
                value={emailForm.recipientType}
                onValueChange={(value) => setEmailForm(prev => ({ ...prev, recipientType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Usuários</SelectItem>
                  <SelectItem value="agencies">Todas as Agências</SelectItem>
                  <SelectItem value="owners">Todos os Proprietários</SelectItem>
                  <SelectItem value="tenants">Todos os Inquilinos</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="email-subject">Assunto</Label>
              <Input
                id="email-subject"
                value={emailForm.subject}
                onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Assunto do email"
              />
            </div>
            <div>
              <Label htmlFor="email-message">Mensagem</Label>
              <Textarea
                id="email-message"
                value={emailForm.message}
                onChange={(e) => setEmailForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Digite sua mensagem aqui..."
                rows={6}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEmailModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSendEmail}>
                <Send className="w-4 h-4 mr-2" />
                Enviar Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send WhatsApp Modal */}
      <Dialog open={showWhatsAppModal} onOpenChange={setShowWhatsAppModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enviar WhatsApp em Massa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="whatsapp-recipient">Destinatário</Label>
              <Select
                value={whatsAppForm.recipientType}
                onValueChange={(value) => setWhatsAppForm(prev => ({ ...prev, recipientType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Usuários</SelectItem>
                  <SelectItem value="agencies">Todas as Agências</SelectItem>
                  <SelectItem value="owners">Todos os Proprietários</SelectItem>
                  <SelectItem value="tenants">Todos os Inquilinos</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="whatsapp-message">Mensagem</Label>
              <Textarea
                id="whatsapp-message"
                value={whatsAppForm.message}
                onChange={(e) => setWhatsAppForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Digite sua mensagem aqui..."
                rows={6}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowWhatsAppModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSendWhatsApp} className="bg-green-600 hover:bg-green-700">
                <MessageSquare className="w-4 h-4 mr-2" />
                Enviar WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
