import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import {
  Receipt, Search, Eye, DollarSign, ArrowUpRight, ArrowDownRight,
  Clock, AlertTriangle, Building2, User, Loader2
} from 'lucide-react';
import { auditorAPI } from '../../../api';

interface Transaction {
  id: string;
  type: 'payment' | 'split' | 'chargeback' | 'refund';
  description: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'scheduled' | 'failed';
  payer?: string;
  recipient?: string;
  splitDetails?: SplitDetail[];
}

interface SplitDetail {
  recipient: string;
  recipientType: 'agency' | 'owner' | 'platform';
  amount: number;
  percentage: number;
}

// Map API response to component format
const mapApiPaymentToTransaction = (payment: any): Transaction => {
  return {
    id: `TXN-${payment.id}`,
    type: 'payment',
    description: `${payment.type || 'Pagamento'} - ${payment.property || 'N/A'}`,
    amount: Number(payment.amount) || 0,
    date: payment.date ? new Date(payment.date).toLocaleString('pt-BR') : '',
    status: 'completed',
    payer: payment.tenant || 'N/A',
    recipient: payment.agency || 'N/A',
  };
};

export function AuditorPayments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Fetch payments from API
  const { data: apiPayments = [], isLoading } = useQuery({
    queryKey: ['auditor-payments'],
    queryFn: () => auditorAPI.getPayments(),
  });

  // Map API payments to component format
  const transactions: Transaction[] = Array.isArray(apiPayments) ? apiPayments.map(mapApiPaymentToTransaction) : [];

  const filteredTransactions = transactions.filter(txn =>
    txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    txn.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusStyle = (status: Transaction['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'failed': return 'bg-red-100 text-red-700';
    }
  };

  const getStatusLabel = (status: Transaction['status']) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'pending': return 'Pendente';
      case 'scheduled': return 'Agendado';
      case 'failed': return 'Falhou';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-orange-100 rounded-lg">
          <Receipt className="w-6 h-6 text-orange-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Pagamentos e Splits</h1>
          <p className="text-muted-foreground">Histórico de transações e divisões (somente leitura)</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ArrowUpRight className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pagamentos</p>
              <p className="text-xl font-bold">{isLoading ? '...' : transactions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor Total</p>
              <p className="text-xl font-bold">{isLoading ? '...' : formatCurrency(transactions.reduce((sum, t) => sum + t.amount, 0))}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Receipt className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Concluídos</p>
              <p className="text-xl font-bold">{isLoading ? '...' : transactions.filter(t => t.status === 'completed').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendentes</p>
              <p className="text-xl font-bold">{isLoading ? '...' : transactions.filter(t => t.status === 'pending' || t.status === 'scheduled').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transactions List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Histórico de Transações</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {filteredTransactions.map((txn) => (
                <div
                  key={txn.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedTransaction?.id === txn.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedTransaction(txn)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{txn.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusStyle(txn.status)}`}>
                          {getStatusLabel(txn.status)}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{txn.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{txn.payer}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${txn.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(txn.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(txn.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transaction Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Detalhes da Transação
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTransaction ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">ID da Transação</p>
                  <p className="font-mono font-medium">{selectedTransaction.id}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Descrição</p>
                  <p className="text-sm">{selectedTransaction.description}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className={`text-xl font-bold ${selectedTransaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(selectedTransaction.amount)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> Pagador
                  </p>
                  <p className="text-sm">{selectedTransaction.payer}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Destinatário
                  </p>
                  <p className="text-sm">{selectedTransaction.recipient}</p>
                </div>

                {selectedTransaction.splitDetails && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Divisão (Split)</p>
                    <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                      {selectedTransaction.splitDetails.map((split, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              split.recipientType === 'agency' ? 'bg-blue-500' :
                              split.recipientType === 'owner' ? 'bg-green-500' : 'bg-purple-500'
                            }`} />
                            <span className="truncate max-w-[140px]">{split.recipient}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(split.amount)}</p>
                            <p className="text-xs text-muted-foreground">{split.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button variant="outline" className="w-full flex items-center gap-2" disabled>
                  <Receipt className="w-4 h-4" />
                  Ver Comprovante
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Selecione uma transação para ver os detalhes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
