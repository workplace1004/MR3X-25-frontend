import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { documentsAPI } from '../../api'
import { toast } from 'sonner'
import { FileText, Download, Receipt, ReceiptText } from 'lucide-react'

export default function DocumentsPage() {
  const [generating, setGenerating] = useState(false)

  const [receiptData, setReceiptData] = useState({
    receiptNumber: '',
    paymentDate: '',
    ownerName: '',
    ownerDocument: '',
    tenantName: '',
    tenantDocument: '',
    propertyAddress: '',
    amount: '',
    description: '',
    paymentMethod: 'PIX',
    referenceMonth: '',
  })

  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    ownerName: '',
    ownerDocument: '',
    ownerAddress: '',
    ownerCity: '',
    ownerState: '',
    ownerZipCode: '',
    tenantName: '',
    tenantDocument: '',
    propertyAddress: '',
    referenceMonth: '',
    description: '',
    originalValue: '',
    lateFee: '',
    interest: '',
    discount: '',
    finalValue: '',
    instructions: '',
  })

  const validateReceiptData = (): string[] => {
    const errors: string[] = []
    if (!receiptData.receiptNumber.trim()) errors.push('Número do Recibo')
    if (!receiptData.paymentDate) errors.push('Data do Pagamento')
    if (!receiptData.ownerName.trim()) errors.push('Nome do Imóvel')
    if (!receiptData.ownerDocument.trim()) errors.push('CPF/CNPJ do Imóvel')
    if (!receiptData.tenantName.trim()) errors.push('Nome do Inquilino')
    if (!receiptData.tenantDocument.trim()) errors.push('CPF/CNPJ do Inquilino')
    if (!receiptData.propertyAddress.trim()) errors.push('Endereço do Imóvel')
    if (!receiptData.amount || parseFloat(receiptData.amount) <= 0) errors.push('Valor')
    if (!receiptData.description.trim()) errors.push('Descrição')
    if (!receiptData.paymentMethod.trim()) errors.push('Forma de Pagamento')
    if (!receiptData.referenceMonth.trim()) errors.push('Mês de Referência')
    return errors
  }

  const validateInvoiceData = (): string[] => {
    const errors: string[] = []
    if (!invoiceData.invoiceNumber.trim()) errors.push('Número da Fatura')
    if (!invoiceData.invoiceDate) errors.push('Data da Fatura')
    if (!invoiceData.dueDate) errors.push('Data de Vencimento')
    if (!invoiceData.ownerName.trim()) errors.push('Nome do Imóvel')
    if (!invoiceData.ownerDocument.trim()) errors.push('CPF/CNPJ do Imóvel')
    if (!invoiceData.tenantName.trim()) errors.push('Nome do Inquilino')
    if (!invoiceData.tenantDocument.trim()) errors.push('CPF/CNPJ do Inquilino')
    if (!invoiceData.propertyAddress.trim()) errors.push('Endereço do Imóvel')
    if (!invoiceData.referenceMonth.trim()) errors.push('Mês de Referência')
    if (!invoiceData.originalValue || parseFloat(invoiceData.originalValue) <= 0) errors.push('Valor Original')
    if (!invoiceData.finalValue || parseFloat(invoiceData.finalValue) <= 0) errors.push('Valor Final')
    return errors
  }

  const handleGenerateReceipt = async () => {
    const errors = validateReceiptData()
    if (errors.length > 0) {
      toast.error(`Preencha os campos obrigatórios: ${errors.join(', ')}`)
      return
    }

    setGenerating(true)
    try {
      const data = {
        ...receiptData,
        amount: parseFloat(receiptData.amount),
      }

      const blob = await documentsAPI.generateReceipt(data)

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recibo-${receiptData.receiptNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Recibo gerado com sucesso!')
    } catch (error) {
      console.error('Error generating receipt:', error)
      toast.error('Erro ao gerar recibo')
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateInvoice = async () => {
    const errors = validateInvoiceData()
    if (errors.length > 0) {
      toast.error(`Preencha os campos obrigatórios: ${errors.join(', ')}`)
      return
    }

    setGenerating(true)
    try {
      const data = {
        ...invoiceData,
        originalValue: parseFloat(invoiceData.originalValue),
        lateFee: parseFloat(invoiceData.lateFee || '0'),
        interest: parseFloat(invoiceData.interest || '0'),
        discount: parseFloat(invoiceData.discount || '0'),
        finalValue: parseFloat(invoiceData.finalValue),
      }

      const blob = await documentsAPI.generateInvoice(data)

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fatura-${invoiceData.invoiceNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Fatura gerada com sucesso!')
    } catch (error) {
      console.error('Error generating invoice:', error)
      toast.error('Erro ao gerar fatura')
    } finally {
      setGenerating(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setReceiptData(prev => ({ ...prev, [field]: value }))
  }

  const handleInvoiceInputChange = (field: string, value: string) => {
    setInvoiceData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-orange-100 rounded-lg">
          <ReceiptText className="w-6 h-6 text-orange-700" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Geração de Documentos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gere automaticamente recibos e faturas em PDF
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-orange-600" />
              <CardTitle>Gerar Recibo</CardTitle>
            </div>
            <CardDescription>
              Gere um recibo de pagamento automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="space-y-4 flex-1 overflow-visible max-h-[650px]">
            <div className="space-y-2">
              <Label htmlFor="receiptNumber">Número do Recibo</Label>
              <Input
                id="receiptNumber"
                value={receiptData.receiptNumber}
                onChange={(e) => handleInputChange('receiptNumber', e.target.value)}
                placeholder="001/2024"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate">Data do Pagamento</Label>
              <Input
                id="paymentDate"
                type="date"
                value={receiptData.paymentDate}
                onChange={(e) => handleInputChange('paymentDate', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ownerName">Nome do Imóvel</Label>
                <Input
                  id="ownerName"
                  value={receiptData.ownerName}
                  onChange={(e) => handleInputChange('ownerName', e.target.value)}
                  placeholder="João Silva"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerDocument">CPF/CNPJ Imóvel</Label>
                <Input
                  id="ownerDocument"
                  value={receiptData.ownerDocument}
                  onChange={(e) => handleInputChange('ownerDocument', e.target.value)}
                  placeholder="123.456.789-00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenantName">Nome do Inquilino</Label>
                <Input
                  id="tenantName"
                  value={receiptData.tenantName}
                  onChange={(e) => handleInputChange('tenantName', e.target.value)}
                  placeholder="Maria Santos"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenantDocument">CPF/CNPJ Inquilino</Label>
                <Input
                  id="tenantDocument"
                  value={receiptData.tenantDocument}
                  onChange={(e) => handleInputChange('tenantDocument', e.target.value)}
                  placeholder="987.654.321-00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyAddress">Endereço do Imóvel</Label>
              <Input
                id="propertyAddress"
                value={receiptData.propertyAddress}
                onChange={(e) => handleInputChange('propertyAddress', e.target.value)}
                placeholder="Rua das Flores, 123"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                value={receiptData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="2000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={receiptData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Aluguel referente a outubro/2024"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                <Input
                  id="paymentMethod"
                  value={receiptData.paymentMethod}
                  onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                  placeholder="PIX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referenceMonth">Mês de Referência</Label>
                <Input
                  id="referenceMonth"
                  value={receiptData.referenceMonth}
                  onChange={(e) => handleInputChange('referenceMonth', e.target.value)}
                  placeholder="Outubro 2024"
                />
              </div>
            </div>
            </div>

            <Button
              type="button"
              onClick={handleGenerateReceipt}
              disabled={generating}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white mt-4"
            >
              <FileText className="w-4 h-4 mr-2" />
              {generating ? 'Gerando...' : 'Gerar Recibo PDF'}
            </Button>
          </CardContent>
        </Card>

        {}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-blue-600" />
              <CardTitle>Gerar Fatura</CardTitle>
            </div>
            <CardDescription>
              Gere uma fatura com cálculos automáticos
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="space-y-4 flex-1 overflow-visible max-h-[650px]">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Número da Fatura</Label>
              <Input
                id="invoiceNumber"
                value={invoiceData.invoiceNumber}
                onChange={(e) => handleInvoiceInputChange('invoiceNumber', e.target.value)}
                placeholder="FAT-001/2024"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Data da Fatura</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={invoiceData.invoiceDate}
                  onChange={(e) => handleInvoiceInputChange('invoiceDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Data de Vencimento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={invoiceData.dueDate}
                  onChange={(e) => handleInvoiceInputChange('dueDate', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceOwnerName">Nome do Imóvel</Label>
              <Input
                id="invoiceOwnerName"
                value={invoiceData.ownerName}
                onChange={(e) => handleInvoiceInputChange('ownerName', e.target.value)}
                placeholder="João Silva"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceOwnerDocument">CPF/CNPJ</Label>
                <Input
                  id="invoiceOwnerDocument"
                  value={invoiceData.ownerDocument}
                  onChange={(e) => handleInvoiceInputChange('ownerDocument', e.target.value)}
                  placeholder="123.456.789-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerZipCode">CEP</Label>
                <Input
                  id="ownerZipCode"
                  value={invoiceData.ownerZipCode}
                  onChange={(e) => handleInvoiceInputChange('ownerZipCode', e.target.value)}
                  placeholder="01234-567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerAddress">Endereço</Label>
              <Input
                id="ownerAddress"
                value={invoiceData.ownerAddress}
                onChange={(e) => handleInvoiceInputChange('ownerAddress', e.target.value)}
                placeholder="Rua Principal, 456"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ownerCity">Cidade</Label>
                <Input
                  id="ownerCity"
                  value={invoiceData.ownerCity}
                  onChange={(e) => handleInvoiceInputChange('ownerCity', e.target.value)}
                  placeholder="São Paulo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerState">Estado</Label>
                <Input
                  id="ownerState"
                  value={invoiceData.ownerState}
                  onChange={(e) => handleInvoiceInputChange('ownerState', e.target.value)}
                  placeholder="SP"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceTenantName">Nome do Inquilino</Label>
                <Input
                  id="invoiceTenantName"
                  value={invoiceData.tenantName}
                  onChange={(e) => handleInvoiceInputChange('tenantName', e.target.value)}
                  placeholder="Maria Santos"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceTenantDocument">CPF/CNPJ Inquilino</Label>
                <Input
                  id="invoiceTenantDocument"
                  value={invoiceData.tenantDocument}
                  onChange={(e) => handleInvoiceInputChange('tenantDocument', e.target.value)}
                  placeholder="987.654.321-00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoicePropertyAddress">Endereço do Imóvel</Label>
              <Input
                id="invoicePropertyAddress"
                value={invoiceData.propertyAddress}
                onChange={(e) => handleInvoiceInputChange('propertyAddress', e.target.value)}
                placeholder="Rua das Flores, 123"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceReferenceMonth">Mês de Referência</Label>
                <Input
                  id="invoiceReferenceMonth"
                  value={invoiceData.referenceMonth}
                  onChange={(e) => handleInvoiceInputChange('referenceMonth', e.target.value)}
                  placeholder="Outubro 2024"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceDescription">Descrição</Label>
                <Input
                  id="invoiceDescription"
                  value={invoiceData.description}
                  onChange={(e) => handleInvoiceInputChange('description', e.target.value)}
                  placeholder="Aluguel mensal"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="originalValue">Valor Original (R$)</Label>
                <Input
                  id="originalValue"
                  type="number"
                  value={invoiceData.originalValue}
                  onChange={(e) => handleInvoiceInputChange('originalValue', e.target.value)}
                  placeholder="2000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="finalValue">Valor Final (R$)</Label>
                <Input
                  id="finalValue"
                  type="number"
                  value={invoiceData.finalValue}
                  onChange={(e) => handleInvoiceInputChange('finalValue', e.target.value)}
                  placeholder="2120"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lateFee">Multa (R$)</Label>
                <Input
                  id="lateFee"
                  type="number"
                  value={invoiceData.lateFee}
                  onChange={(e) => handleInvoiceInputChange('lateFee', e.target.value)}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interest">Juros (R$)</Label>
                <Input
                  id="interest"
                  type="number"
                  value={invoiceData.interest}
                  onChange={(e) => handleInvoiceInputChange('interest', e.target.value)}
                  placeholder="20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Desconto (R$)</Label>
                <Input
                  id="discount"
                  type="number"
                  value={invoiceData.discount}
                  onChange={(e) => handleInvoiceInputChange('discount', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instruções de Pagamento</Label>
              <Input
                id="instructions"
                value={invoiceData.instructions}
                onChange={(e) => handleInvoiceInputChange('instructions', e.target.value)}
                placeholder="Depositar na conta..."
              />
            </div>
            </div>

            <Button
              type="button"
              onClick={handleGenerateInvoice}
              disabled={generating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
            >
              <Download className="w-4 h-4 mr-2" />
              {generating ? 'Gerando...' : 'Gerar Fatura PDF'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
