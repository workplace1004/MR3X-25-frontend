import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { paymentsAPI, withdrawAPI, dashboardAPI } from '../../api';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  DollarSign,
  History,
  User,
  Wallet,
  CreditCard,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export function PaymentHistory() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch payments received
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payment-history', user?.id, user?.role],
    queryFn: async () => {
      try {
        const payments = await paymentsAPI.getPayments();
        // Filter payments based on user role
        if (user?.role === 'PROPRIETARIO' || user?.role === 'INDEPENDENT_OWNER') {
          // For owners, show payments for their properties
          return Array.isArray(payments) ? payments : payments?.data || payments?.items || [];
        }
        return Array.isArray(payments) ? payments : payments?.data || payments?.items || [];
      } catch (error) {
        console.error('Error fetching payments:', error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Fetch withdrawal history
  const { data: withdrawHistory, isLoading: withdrawLoading } = useQuery({
    queryKey: ['withdraw-history', user?.id],
    queryFn: () => withdrawAPI.getWithdrawHistory(0, 100),
    enabled: !!user?.id,
  });

  // Fetch plan payments (for CEO and Agency Admin)
  const { data: planPaymentsData, isLoading: planPaymentsLoading } = useQuery({
    queryKey: ['plan-payments', user?.id],
    queryFn: () => withdrawAPI.getPlanPayments(),
    enabled: !!user?.id && (user?.role === 'CEO' || user?.role === 'AGENCY_ADMIN'),
  });

  // Fetch dashboard data to get role-specific income
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard', user?.id, user?.role],
    queryFn: () => dashboardAPI.getDashboard(),
    enabled: !!user?.id,
  });

  const isLoading = paymentsLoading || withdrawLoading || planPaymentsLoading;

  // Process payments received (rent payments)
  // For Agency Admin, we need to calculate only their share (8%), not the total
  // For CEO, use platformFee (2% from rents) NOT roleSpecificIncome (which includes plan payments)
  // We'll use the dashboard's roleSpecificIncome to get the correct total, then calculate per-payment share
  const totalRentPayments = (paymentsData || []).reduce((sum: number, p: any) => sum + Number(p.valorPago || p.amount || 0), 0);
  
  // For CEO, use platformFee (2% from rents) instead of roleSpecificIncome (which includes plan payments)
  const roleSpecificIncomeFromRents = user?.role === 'CEO' 
    ? (dashboardData?.overview?.platformFee || 0)  // Use platformFee (2% from rents) for CEO
    : (dashboardData?.overview?.roleSpecificIncome || 0);  // For other roles, use roleSpecificIncome
  
  const rolePercentage = totalRentPayments > 0 ? roleSpecificIncomeFromRents / totalRentPayments : 0;

  const paymentsReceived = (paymentsData || []).map((payment: any) => {
    const totalAmount = Number(payment.valorPago || payment.amount || 0);
    // Calculate role-specific amount (only for roles that have percentage share)
    const roleSpecificAmount = (user?.role === 'AGENCY_ADMIN' || user?.role === 'CEO' || user?.role === 'PROPRIETARIO' || user?.role === 'INDEPENDENT_OWNER') 
      ? totalAmount * rolePercentage 
      : totalAmount;
    
    return {
      id: payment.id?.toString() || `payment-${Math.random()}`,
      type: 'income' as const,
      date: payment.dataPagamento || payment.date || payment.paymentDate,
      amount: roleSpecificAmount,
      totalAmount: totalAmount, // Keep original for display if needed
      method: payment.paymentMethod || payment.method || 'N/A',
      from: payment.user?.name || payment.tenant?.name || payment.property?.name || 'N/A',
      property: payment.property?.name || payment.property?.address || 'N/A',
      contract: payment.contract?.id?.toString() || payment.contratoId?.toString() || null,
      description: payment.tipo || 'Pagamento de aluguel',
      status: payment.status || 'PAGO',
    };
  });

  // Process plan payments (for CEO and Agency Admin)
  // For CEO: all plan payments from agencies are income (CEO receives money when agencies pay for plans)
  // For Agency Admin: payments with PLATFORM_BALANCE are withdrawals (they paid with their own balance)
  const planPayments = (planPaymentsData || []).map((payment: any) => {
    const isPlatformBalancePayment = payment.method === 'PLATFORM_BALANCE';
    
    // For CEO: all plan payments from agencies are income (they receive money when agencies pay)
    if (user?.role === 'CEO') {
      return {
        id: payment.id?.toString() || `plan-${Math.random()}`,
        type: 'income' as const, // CEO always receives when agencies pay for plans
        date: payment.date,
        amount: Number(payment.amount || 0),
        method: payment.method || 'N/A',
        from: payment.from || 'Agência',
        property: null,
        contract: null,
        description: payment.description || 'Pagamento de plano',
        status: payment.status || 'PAID',
        isPlanPayment: true,
      };
    }
    
    // For Agency Admin: payments with PLATFORM_BALANCE are withdrawals (they paid with their balance)
    return {
      id: payment.id?.toString() || `plan-${Math.random()}`,
      type: isPlatformBalancePayment ? 'withdrawal' as const : 'income' as const,
      date: payment.date,
      amount: Number(payment.amount || 0),
      method: payment.method || 'N/A',
      from: payment.from || 'Agência',
      property: null,
      contract: null,
      description: payment.description || 'Pagamento de plano',
      status: payment.status || 'PAID',
      isPlanPayment: true,
    };
  });

  // Process withdrawals
  const withdrawals = (withdrawHistory?.items || []).map((transfer: any) => ({
    id: transfer.id?.toString() || `withdraw-${Math.random()}`,
    type: 'withdrawal' as const,
    date: transfer.effectiveDate || transfer.dateCreated || transfer.createdAt,
    amount: Number(transfer.value || transfer.netValue || 0),
    method: transfer.pixAddressKey ? 'PIX' : transfer.bankAccount ? 'Transferência Bancária' : 'N/A',
    to: transfer.pixAddressKey || transfer.bankAccount?.account || 'N/A',
    description: transfer.description || 'Saque',
    status: transfer.status || 'PENDING',
    transferId: transfer.id,
  }));

  // Separate plan payments into income and expenses
  const planPaymentsIncome = planPayments.filter((p: any) => p.type === 'income');
  const planPaymentsExpenses = planPayments.filter((p: any) => p.type === 'withdrawal');

  // Combine and sort by date (newest first)
  const allTransactions = [...paymentsReceived, ...planPaymentsIncome, ...withdrawals, ...planPaymentsExpenses].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });

  // Show all transactions
  const filteredTransactions = allTransactions;

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  const totalIncome = paymentsReceived.reduce((sum: number, p: any) => sum + p.amount, 0) + 
                      planPaymentsIncome.reduce((sum: number, p: any) => sum + p.amount, 0);
  const totalWithdrawals = withdrawals.reduce((sum: number, w: any) => sum + w.amount, 0) + 
                           planPaymentsExpenses.reduce((sum: number, p: any) => sum + p.amount, 0);
  const balance = totalIncome - totalWithdrawals;

  // Reset to page 1 when transactions change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const getMethodIcon = (method: string) => {
    const methodUpper = method.toUpperCase();
    if (methodUpper.includes('PIX')) return <Wallet className="h-4 w-4" />;
    if (methodUpper.includes('BOLETO')) return <FileText className="h-4 w-4" />;
    if (methodUpper.includes('CARD') || methodUpper.includes('CREDIT')) return <CreditCard className="h-4 w-4" />;
    return <DollarSign className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string, type: 'income' | 'withdrawal') => {
    const statusUpper = (status || '').toUpperCase();
    if (type === 'income') {
      if (statusUpper === 'PAGO' || statusUpper === 'PAID' || statusUpper === 'CONFIRMED') {
        return <Badge className="bg-green-500 text-white">Recebido</Badge>;
      }
      return <Badge variant="outline">Pendente</Badge>;
    } else {
      if (statusUpper === 'CONFIRMED' || statusUpper === 'COMPLETED' || statusUpper === 'DONE') {
        return <Badge className="bg-green-500 text-white">Concluído</Badge>;
      }
      if (statusUpper === 'PENDING' || statusUpper === 'PROCESSING') {
        return <Badge className="bg-yellow-500 text-white">Processando</Badge>;
      }
      if (statusUpper === 'FAILED' || statusUpper === 'CANCELLED') {
        return <Badge className="bg-red-500 text-white">Falhou</Badge>;
      }
      return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full mb-4" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Histórico de Pagamentos" 
        subtitle="Visualize todas as entradas e saídas de dinheiro da sua conta"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Recebido</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalIncome)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <ArrowDownCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Sacado</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalWithdrawals)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <ArrowUpCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Saldo Disponível</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(balance)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transações</CardTitle>
          <CardDescription>
            Todas as transações
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma transação encontrada</p>
              <p className="text-sm">Não há transações para exibir no momento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    transaction.type === 'income'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`p-3 rounded-full ${
                        transaction.type === 'income'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {transaction.type === 'income' ? (
                        <ArrowDownCircle className="h-5 w-5" />
                      ) : (
                        <ArrowUpCircle className="h-5 w-5" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{transaction.description}</h3>
                        {getStatusBadge(transaction.status, transaction.type)}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {transaction.date
                              ? new Date(transaction.date).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Data não disponível'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {getMethodIcon(transaction.method)}
                          <span>{transaction.method}</span>
                        </div>

                        {transaction.type === 'income' && (
                          <>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>De: {transaction.from}</span>
                            </div>
                            {transaction.property && !transaction.isPlanPayment && (
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                <span>{transaction.property}</span>
                              </div>
                            )}
                            {transaction.isPlanPayment && (
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                <span className="text-blue-600 font-medium">Pagamento de Plano</span>
                              </div>
                            )}
                          </>
                        )}

                        {transaction.type === 'withdrawal' && (
                          <div className="flex items-center gap-1">
                            <Wallet className="h-3 w-3" />
                            {transaction.isPlanPayment ? (
                              <span className="text-blue-600 font-medium">Atualização de plano</span>
                            ) : (
                              <span>Para: {transaction.to}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-xl font-bold ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {filteredTransactions.length > itemsPerPage && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredTransactions.length)} de {filteredTransactions.length} transações
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-[40px]"
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="px-2">...</span>;
                    }
                    return null;
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

