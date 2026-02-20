import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { documentsAPI } from '../../api'
import { toast } from 'sonner'
import { FileText, Download, Receipt, ReceiptText, Building2, User, DollarSign, Calendar, MapPin, Calculator, Loader2 } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'

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
      <PageHeader 
        title="Geração de Documentos" 
        subtitle="Gere automaticamente recibos e faturas em PDF"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {}
        <Card className="flex flex-col border-2 border-orange-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-600 rounded-lg">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Gerar Recibo</CardTitle>
                <CardDescription className="text-sm">
                  Gere um recibo de pagamento automaticamente
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 p-6">
            <div className="space-y-6 flex-1 overflow-y-auto max-h-[650px] pr-2">
              {/* Informações do Recibo */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <h3 className="font-semibold text-sm text-gray-700">Informações do Recibo</h3>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiptNumber" className="text-sm font-medium">Número do Recibo</Label>
                  <Input
                    id="receiptNumber"
                    value={receiptData.receiptNumber}
                    onChange={(e) => handleInputChange('receiptNumber', e.target.value)}
                    placeholder="001/2024"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentDate" className="text-sm font-medium">Data do Pagamento</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={receiptData.paymentDate}
                    onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="referenceMonth" className="text-sm font-medium">Mês de Referência</Label>
                    <Input
                      id="referenceMonth"
                      value={receiptData.referenceMonth}
                      onChange={(e) => handleInputChange('referenceMonth', e.target.value)}
                      placeholder="Outubro 2024"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod" className="text-sm font-medium">Forma de Pagamento</Label>
                    <Input
                      id="paymentMethod"
                      value={receiptData.paymentMethod}
                      onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                      placeholder="PIX"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Dados do Proprietário */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Building2 className="w-4 h-4 text-orange-600" />
                  <h3 className="font-semibold text-sm text-gray-700">Dados do Proprietário</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerName" className="text-sm font-medium">Nome do Proprietário</Label>
                    <Input
                      id="ownerName"
                      value={receiptData.ownerName}
                      onChange={(e) => handleInputChange('ownerName', e.target.value)}
                      placeholder="João Silva"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerDocument" className="text-sm font-medium">CPF/CNPJ</Label>
                    <Input
                      id="ownerDocument"
                      value={receiptData.ownerDocument}
                      onChange={(e) => handleInputChange('ownerDocument', e.target.value)}
                      placeholder="123.456.789-00"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Dados do Inquilino */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <User className="w-4 h-4 text-orange-600" />
                  <h3 className="font-semibold text-sm text-gray-700">Dados do Inquilino</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tenantName" className="text-sm font-medium">Nome do Inquilino</Label>
                    <Input
                      id="tenantName"
                      value={receiptData.tenantName}
                      onChange={(e) => handleInputChange('tenantName', e.target.value)}
                      placeholder="Maria Santos"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tenantDocument" className="text-sm font-medium">CPF/CNPJ Inquilino</Label>
                    <Input
                      id="tenantDocument"
                      value={receiptData.tenantDocument}
                      onChange={(e) => handleInputChange('tenantDocument', e.target.value)}
                      placeholder="987.654.321-00"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Dados do Imóvel e Pagamento */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <MapPin className="w-4 h-4 text-orange-600" />
                  <h3 className="font-semibold text-sm text-gray-700">Dados do Imóvel</h3>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propertyAddress" className="text-sm font-medium">Endereço do Imóvel</Label>
                  <Input
                    id="propertyAddress"
                    value={receiptData.propertyAddress}
                    onChange={(e) => handleInputChange('propertyAddress', e.target.value)}
                    placeholder="Rua das Flores, 123"
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Informações de Pagamento */}
              <div className="space-y-4 bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 pb-2 border-b border-orange-300">
                  <DollarSign className="w-4 h-4 text-orange-600" />
                  <h3 className="font-semibold text-sm text-gray-700">Informações de Pagamento</h3>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-medium text-orange-700">Valor Pago (R$)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={receiptData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    placeholder="2000.00"
                    className="text-sm font-semibold text-orange-700 border-orange-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">Descrição</Label>
                  <Input
                    id="description"
                    value={receiptData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Aluguel referente a outubro/2024"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGenerateReceipt}
              disabled={generating}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white mt-6 shadow-md hover:shadow-lg transition-all duration-200"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Gerar Recibo PDF
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {}
        <Card className="flex flex-col border-2 border-blue-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <ReceiptText className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Gerar Fatura</CardTitle>
                <CardDescription className="text-sm">
                  Gere uma fatura com cálculos automáticos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 p-6">
            <div className="space-y-6 flex-1 overflow-y-auto max-h-[650px] pr-2">
              {/* Informações da Fatura */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-sm text-gray-700">Informações da Fatura</h3>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber" className="text-sm font-medium">Número da Fatura</Label>
                  <Input
                    id="invoiceNumber"
                    value={invoiceData.invoiceNumber}
                    onChange={(e) => handleInvoiceInputChange('invoiceNumber', e.target.value)}
                    placeholder="FAT-001/2024"
                    className="text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceDate" className="text-sm font-medium">Data da Fatura</Label>
                    <Input
                      id="invoiceDate"
                      type="date"
                      value={invoiceData.invoiceDate}
                      onChange={(e) => handleInvoiceInputChange('invoiceDate', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate" className="text-sm font-medium">Data de Vencimento</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={invoiceData.dueDate}
                      onChange={(e) => handleInvoiceInputChange('dueDate', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceReferenceMonth" className="text-sm font-medium">Mês de Referência</Label>
                    <Input
                      id="invoiceReferenceMonth"
                      value={invoiceData.referenceMonth}
                      onChange={(e) => handleInvoiceInputChange('referenceMonth', e.target.value)}
                      placeholder="Outubro 2024"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceDescription" className="text-sm font-medium">Descrição</Label>
                    <Input
                      id="invoiceDescription"
                      value={invoiceData.description}
                      onChange={(e) => handleInvoiceInputChange('description', e.target.value)}
                      placeholder="Aluguel mensal"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Dados do Proprietário */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-sm text-gray-700">Dados do Proprietário</h3>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoiceOwnerName" className="text-sm font-medium">Nome do Proprietário</Label>
                  <Input
                    id="invoiceOwnerName"
                    value={invoiceData.ownerName}
                    onChange={(e) => handleInvoiceInputChange('ownerName', e.target.value)}
                    placeholder="João Silva"
                    className="text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceOwnerDocument" className="text-sm font-medium">CPF/CNPJ</Label>
                    <Input
                      id="invoiceOwnerDocument"
                      value={invoiceData.ownerDocument}
                      onChange={(e) => handleInvoiceInputChange('ownerDocument', e.target.value)}
                      placeholder="123.456.789-00"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerZipCode" className="text-sm font-medium">CEP</Label>
                    <Input
                      id="ownerZipCode"
                      value={invoiceData.ownerZipCode}
                      onChange={(e) => handleInvoiceInputChange('ownerZipCode', e.target.value)}
                      placeholder="01234-567"
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerAddress" className="text-sm font-medium">Endereço</Label>
                  <Input
                    id="ownerAddress"
                    value={invoiceData.ownerAddress}
                    onChange={(e) => handleInvoiceInputChange('ownerAddress', e.target.value)}
                    placeholder="Rua Principal, 456"
                    className="text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerCity" className="text-sm font-medium">Cidade</Label>
                    <Input
                      id="ownerCity"
                      value={invoiceData.ownerCity}
                      onChange={(e) => handleInvoiceInputChange('ownerCity', e.target.value)}
                      placeholder="São Paulo"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerState" className="text-sm font-medium">Estado</Label>
                    <Input
                      id="ownerState"
                      value={invoiceData.ownerState}
                      onChange={(e) => handleInvoiceInputChange('ownerState', e.target.value)}
                      placeholder="SP"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Dados do Inquilino */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <User className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-sm text-gray-700">Dados do Inquilino</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceTenantName" className="text-sm font-medium">Nome do Inquilino</Label>
                    <Input
                      id="invoiceTenantName"
                      value={invoiceData.tenantName}
                      onChange={(e) => handleInvoiceInputChange('tenantName', e.target.value)}
                      placeholder="Maria Santos"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceTenantDocument" className="text-sm font-medium">CPF/CNPJ Inquilino</Label>
                    <Input
                      id="invoiceTenantDocument"
                      value={invoiceData.tenantDocument}
                      onChange={(e) => handleInvoiceInputChange('tenantDocument', e.target.value)}
                      placeholder="987.654.321-00"
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoicePropertyAddress" className="text-sm font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Endereço do Imóvel
                  </Label>
                  <Input
                    id="invoicePropertyAddress"
                    value={invoiceData.propertyAddress}
                    onChange={(e) => handleInvoiceInputChange('propertyAddress', e.target.value)}
                    placeholder="Rua das Flores, 123"
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Valores Financeiros */}
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-300">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-sm text-gray-700">Valores Financeiros</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="originalValue" className="text-sm font-medium">Valor Original (R$)</Label>
                    <Input
                      id="originalValue"
                      type="number"
                      step="0.01"
                      value={invoiceData.originalValue}
                      onChange={(e) => handleInvoiceInputChange('originalValue', e.target.value)}
                      placeholder="2000.00"
                      className="text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="finalValue" className="text-sm font-medium text-blue-700">Valor Final (R$)</Label>
                    <Input
                      id="finalValue"
                      type="number"
                      step="0.01"
                      value={invoiceData.finalValue}
                      onChange={(e) => handleInvoiceInputChange('finalValue', e.target.value)}
                      placeholder="2120.00"
                      className="text-sm font-semibold text-blue-700 border-blue-300"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lateFee" className="text-sm font-medium">Multa (R$)</Label>
                    <Input
                      id="lateFee"
                      type="number"
                      step="0.01"
                      value={invoiceData.lateFee}
                      onChange={(e) => handleInvoiceInputChange('lateFee', e.target.value)}
                      placeholder="100.00"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interest" className="text-sm font-medium">Juros (R$)</Label>
                    <Input
                      id="interest"
                      type="number"
                      step="0.01"
                      value={invoiceData.interest}
                      onChange={(e) => handleInvoiceInputChange('interest', e.target.value)}
                      placeholder="20.00"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount" className="text-sm font-medium">Desconto (R$)</Label>
                    <Input
                      id="discount"
                      type="number"
                      step="0.01"
                      value={invoiceData.discount}
                      onChange={(e) => handleInvoiceInputChange('discount', e.target.value)}
                      placeholder="0.00"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Instruções de Pagamento */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-sm text-gray-700">Instruções de Pagamento</h3>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instructions" className="text-sm font-medium">Instruções</Label>
                  <Input
                    id="instructions"
                    value={invoiceData.instructions}
                    onChange={(e) => handleInvoiceInputChange('instructions', e.target.value)}
                    placeholder="Depositar na conta bancária ou realizar pagamento via PIX..."
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGenerateInvoice}
              disabled={generating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-6 shadow-md hover:shadow-lg transition-all duration-200"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Gerar Fatura PDF
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
