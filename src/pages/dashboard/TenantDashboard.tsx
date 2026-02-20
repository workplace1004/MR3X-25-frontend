import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardAPI, extrajudicialNotificationsAPI, agreementsAPI } from '../../api';
import { formatCurrency } from '../../lib/utils';
import {
  FileText, DollarSign, Clock,
  CheckCircle, AlertTriangle, User, Phone, Mail,
  CreditCard, Receipt, TrendingUp, Building2,
  Scale, Handshake, AlertOctagon, Shield, MapPin, ArrowDown
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { safeGetCurrentPosition, isSecureOrigin } from '../../hooks/use-geolocation';
import { MandatoryTenantBanner } from '../../components/tenant/MandatoryTenantBanner';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// Types for alerts
interface ExtrajudicialAlert {
  id: string;
  token?: string;
  type: string;
  status: string;
  priority?: string;
  principalAmount?: number;
  deadlineDate?: string;
  viewedAt?: string;
  acknowledgedAt?: string;
  debtorSignedAt?: string;
  creditorName?: string;
}

interface AgreementAlert {
  id: string;
  token?: string;
  type: string;
  status: string;
  totalAmount?: number;
  effectiveDate?: string;
}

interface Payment {
  id?: string;
  date?: string;
  amount?: number | string;
  type?: string;
  status?: string;
}

interface TenantAlerts {
  hasOverduePayment: boolean;
  overdueAmount?: number;
  overdueDays?: number;
  hasActiveExtrajudicial: boolean;
  extrajudicialNotifications: ExtrajudicialAlert[];
  hasPendingAgreement: boolean;
  pendingAgreements: AgreementAlert[];
  isSeverelyOverdue: boolean;
  requiresImmediateAction: boolean;
}

export function TenantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State for extrajudicial modal
  const [showExtrajudicialModal, setShowExtrajudicialModal] = useState(false);
  const [activeExtrajudicial, setActiveExtrajudicial] = useState<ExtrajudicialAlert | null>(null);
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoAddress, setGeoAddress] = useState<string>('');
  const [geoConsent, setGeoConsent] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [userIp, setUserIp] = useState<string>('');
  const [hasShownModal, setHasShownModal] = useState(false);
  // Guide step: 0 = none, 1 = point to location button, 2 = point to confirm button
  const [guideStep, setGuideStep] = useState<0 | 1 | 2>(0);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['tenant-dashboard', user?.id],
    queryFn: () => dashboardAPI.getDashboard(),
  });

  // Fetch tenant alerts (extrajudicial, agreements, overdue status)
  const { data: tenantAlerts } = useQuery<TenantAlerts>({
    queryKey: ['tenant-alerts', user?.id],
    queryFn: async () => {
      try {
        return await dashboardAPI.getTenantAlerts();
      } catch {
        // Fallback: fetch individually
        const [extrajudicialRes, agreementsRes] = await Promise.allSettled([
          extrajudicialNotificationsAPI.getNotifications({ debtorId: user?.id }),
          agreementsAPI.getAgreements({ tenantId: user?.id, status: 'AGUARDANDO_ASSINATURA' }),
        ]);

        const extrajudicials = extrajudicialRes.status === 'fulfilled'
          ? (Array.isArray(extrajudicialRes.value) ? extrajudicialRes.value : [])
          : [];
        const agreements = agreementsRes.status === 'fulfilled'
          ? (Array.isArray(agreementsRes.value) ? agreementsRes.value : [])
          : [];

        const activeExtrajudicials = extrajudicials.filter((n: ExtrajudicialAlert) =>
          ['SENT', 'PENDING_SEND', 'VIEWED'].includes(n.status) && !n.acknowledgedAt && !n.debtorSignedAt
        );

        return {
          hasOverduePayment: false,
          hasActiveExtrajudicial: activeExtrajudicials.length > 0,
          extrajudicialNotifications: activeExtrajudicials,
          hasPendingAgreement: agreements.length > 0,
          pendingAgreements: agreements,
          isSeverelyOverdue: false,
          requiresImmediateAction: activeExtrajudicials.length > 0,
        };
      }
    },
    enabled: !!user?.id,
  });

  // Get user IP address
  useEffect(() => {
    const getIp = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setUserIp(data.ip);
      } catch {
        setUserIp('unknown');
      }
    };
    getIp();
  }, []);

  // Reverse geocoding to get address from coordinates
  const getAddressFromCoords = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt-BR`
      );
      const data = await response.json();
      if (data.address) {
        const { road, suburb, city, town, village, state, country } = data.address;
        const parts = [
          road,
          suburb,
          city || town || village,
          state,
          country
        ].filter(Boolean);
        return parts.join(', ');
      }
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  // Get geolocation if consent given
  const requestGeolocation = useCallback(() => {
    if (!isSecureOrigin()) {
      toast.warning('Geolocalização requer HTTPS. Continuando sem localização.');
      setGeoLocation(null);
      setGeoConsent(true); // Allow to proceed without location
      if (guideStep === 1) {
        setGuideStep(2);
      }
      return;
    }

    safeGetCurrentPosition(
      async (position) => {
        if (position) {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setGeoLocation({ lat, lng });
          setGeoConsent(true);

          // Get address from coordinates
          const address = await getAddressFromCoords(lat, lng);
          setGeoAddress(address);

          // Move guide to step 2 (point to confirm button)
          if (guideStep === 1) {
            setGuideStep(2);
          }
        } else {
          // No location available but allow to proceed
          setGeoLocation(null);
          setGeoConsent(true);
          if (guideStep === 1) {
            setGuideStep(2);
          }
          toast.warning('Continuando sem localização.');
        }
      },
      () => {
        toast.error('Não foi possível obter sua localização');
        setGeoConsent(false);
      }
    );
  }, [guideStep]);

  // Acknowledgment mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return dashboardAPI.acknowledgeExtrajudicial(notificationId, {
        acknowledgmentType: 'CLICK',
        ipAddress: userIp,
        geoLat: geoLocation?.lat,
        geoLng: geoLocation?.lng,
        geoConsent,
        userAgent: navigator.userAgent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-alerts'] });
    },
  });

  // Show extrajudicial modal on mount if needed
  useEffect(() => {
    if (!hasShownModal && tenantAlerts?.requiresImmediateAction && tenantAlerts.extrajudicialNotifications.length > 0) {
      const unacknowledged = tenantAlerts.extrajudicialNotifications.find(n => !n.acknowledgedAt && !n.debtorSignedAt);
      if (unacknowledged) {
        setActiveExtrajudicial(unacknowledged);
        setShowExtrajudicialModal(true);
        setHasShownModal(true);
      }
    }
  }, [tenantAlerts, hasShownModal]);

  // Handle acknowledgment and redirect
  const handleAcknowledge = async () => {
    if (!activeExtrajudicial) return;

    // If location not enabled, start the guide
    if (!geoLocation && guideStep === 0) {
      setGuideStep(1);
      toast.info('Por favor, permita sua localização primeiro');
      return;
    }

    // Save location data to localStorage to share with acknowledgment page
    if (geoLocation) {
      localStorage.setItem('extrajudicial_geolocation', JSON.stringify({
        lat: geoLocation.lat,
        lng: geoLocation.lng,
        address: geoAddress,
        ip: userIp,
        timestamp: Date.now()
      }));
    }

    // Reset guide and proceed
    setGuideStep(0);
    setIsAcknowledging(true);
    try {
      await acknowledgeMutation.mutateAsync(activeExtrajudicial.id);
      toast.success('Ciência registrada com sucesso');
      setShowExtrajudicialModal(false);
      // Redirect to acknowledgment page for signature
      navigate(`/dashboard/extrajudicial-acknowledgment/${activeExtrajudicial.id}`);
    } catch {
      toast.error('Erro ao registrar ciência');
    } finally {
      setIsAcknowledging(false);
    }
  };

  const chartData = useMemo(() => {
    const paymentHistory = dashboard?.paymentHistory || [];

    const monthlyTrend: Record<string, number> = {};
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      monthlyTrend[key] = 0;
    }

    paymentHistory.forEach((payment: Payment) => {
      if (payment.date) {
        const date = new Date(payment.date);
        const key = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        if (monthlyTrend[key] !== undefined) {
          monthlyTrend[key] += Number(payment.amount) || 0;
        }
      }
    });

    const monthlyData = Object.entries(monthlyTrend).map(([month, total]) => ({
      month,
      total,
    }));

    const byType: Record<string, number> = {
      'Aluguel': 0,
      'Condomínio': 0,
      'IPTU': 0,
      'Outros': 0,
    };

    paymentHistory.forEach((payment: Payment) => {
      const amount = Number(payment.amount) || 0;
      if (payment.type === 'ALUGUEL') byType['Aluguel'] += amount;
      else if (payment.type === 'CONDOMINIO') byType['Condomínio'] += amount;
      else if (payment.type === 'IPTU') byType['IPTU'] += amount;
      else byType['Outros'] += amount;
    });

    const pieData = Object.entries(byType)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    const statusData = [
      { name: 'Pagos', value: paymentHistory.filter((p: Payment) => p.status === 'PAGO' || p.status === 'paid').length, color: '#10B981' },
      { name: 'Pendentes', value: paymentHistory.filter((p: Payment) => p.status === 'PENDENTE' || p.status === 'pending').length, color: '#F59E0B' },
      { name: 'Atrasados', value: paymentHistory.filter((p: Payment) => p.status === 'ATRASADO' || p.status === 'overdue').length, color: '#EF4444' },
    ].filter(item => item.value > 0);

    const totalPaid = paymentHistory.reduce((sum: number, p: Payment) => sum + (Number(p.amount) || 0), 0);
    const totalPayments = paymentHistory.length;
    const avgPayment = totalPayments > 0 ? totalPaid / totalPayments : 0;

    return {
      monthlyData,
      pieData,
      statusData,
      totalPaid,
      totalPayments,
      avgPayment,
    };
  }, [dashboard?.paymentHistory]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Welcome Banner Skeleton */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6">
          <Skeleton className="h-8 w-64 mb-2 bg-blue-500/20" />
          <Skeleton className="h-4 w-96 bg-blue-500/20" />
        </div>

        {/* Metrics Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[250px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Property Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <Skeleton className="w-8 h-8 mx-auto mb-2 rounded-full" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const property = dashboard?.property;
  const contract = dashboard?.contract;
  const paymentHistory = dashboard?.paymentHistory || [];

  const getPaymentStatus = () => {
    if (!property?.nextDueDate) return { status: 'unknown', label: 'Sem data', color: 'gray' };

    const daysUntilDue = property.daysUntilDue;
    if (daysUntilDue === null) return { status: 'unknown', label: 'Sem data', color: 'gray' };

    if (daysUntilDue < 0) {
      return { status: 'overdue', label: `${Math.abs(daysUntilDue)} dias em atraso`, color: 'red' };
    } else if (daysUntilDue <= 5) {
      return { status: 'upcoming', label: `Vence em ${daysUntilDue} dias`, color: 'yellow' };
    } else {
      return { status: 'ok', label: 'Em dia', color: 'green' };
    }
  };

  const paymentStatus = getPaymentStatus();

  const getContractProgress = () => {
    if (!contract?.startDate || !contract?.endDate) return { progress: 0, remaining: 0 };

    const start = new Date(contract.startDate).getTime();
    const end = new Date(contract.endDate).getTime();
    const now = Date.now();

    const total = end - start;
    const elapsed = now - start;
    const progress = Math.min(Math.max((elapsed / total) * 100, 0), 100);
    const remainingDays = Math.max(Math.ceil((end - now) / (1000 * 60 * 60 * 24)), 0);

    return { progress, remaining: remainingDays };
  };

  const contractProgress = getContractProgress();

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Olá, ${user?.name || 'Inquilino'}!`}
        subtitle={contract?.status === 'ACTIVE' ? 'Contrato Ativo' : 'Portal do Inquilino'}
        showWallet={false}
      />
      {/* Mandatory Banner - Must be first, cannot be dismissed without acknowledgment */}
      <MandatoryTenantBanner 
        upcomingDueDate={dashboard?.upcomingDueDate ? new Date(dashboard.upcomingDueDate) : null}
        daysUntilUpcoming={dashboard?.daysUntilUpcoming ?? null}
      />

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">
              Olá, {user?.name || 'Inquilino'}!
            </h1>
            <p className="text-blue-100 text-sm">
              {contract?.status === 'ACTIVE' ? 'Contrato Ativo' : 'Portal do Inquilino'}
            </p>
          </div>
        </div>
        <p className="text-blue-100">
          Bem-vindo ao seu painel de locação. Aqui você pode acompanhar seu contrato, pagamentos e documentos.
        </p>
      </div>

      {/* Priority Alerts Section - Always visible when applicable */}
      {(tenantAlerts?.hasOverduePayment || tenantAlerts?.hasActiveExtrajudicial || tenantAlerts?.hasPendingAgreement) && (
        <div className="space-y-3">
          {/* Extrajudicial Notice Alert - Highest Priority */}
          {tenantAlerts?.hasActiveExtrajudicial && tenantAlerts.extrajudicialNotifications.map((notification) => (
            <Card key={notification.id} className="border-red-500 bg-red-50 border-2 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Scale className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-red-800 text-lg">⚠️ Notificação Extrajudicial</h4>
                      <Badge
                        variant="destructive"
                        className={`animate-pulse ${
                          notification.priority === 'URGENTE' ? 'bg-red-600' :
                          notification.priority === 'ALTA' ? 'bg-orange-600' :
                          notification.priority === 'MEDIA' ? 'bg-yellow-600' :
                          notification.priority === 'BAIXA' ? 'bg-blue-600' :
                          'bg-red-600'
                        }`}
                      >
                        {notification.priority === 'URGENTE' ? 'URGENTE' :
                         notification.priority === 'ALTA' ? 'ALTA' :
                         notification.priority === 'MEDIA' ? 'MÉDIA' :
                         notification.priority === 'BAIXA' ? 'BAIXA' :
                         notification.priority || 'URGENTE'}
                      </Badge>
                    </div>
                    <p className="text-red-700 mb-2">
                      Você possui uma notificação extrajudicial ativa que requer sua ciência imediata.
                      {notification.principalAmount && (
                        <span className="font-semibold"> Valor: {formatCurrency(notification.principalAmount)}</span>
                      )}
                    </p>
                    <p className="text-red-600 text-sm mb-3">
                      O não reconhecimento desta notificação pode resultar em medidas judiciais.
                    </p>
                    <Button
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => {
                        setActiveExtrajudicial(notification);
                        setShowExtrajudicialModal(true);
                      }}
                    >
                      <AlertOctagon className="w-4 h-4 mr-2" />
                      Ver Notificação e Dar Ciência
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Payment Overdue Alert */}
          {tenantAlerts?.hasOverduePayment && (
            <Card className="border-orange-500 bg-orange-50 border-2">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-orange-800">Pagamento em Atraso</h4>
                      <Badge className="bg-orange-500">ATENÇÃO</Badge>
                    </div>
                    <p className="text-orange-700 mb-2">
                      Você possui pagamento(s) em atraso.
                      {tenantAlerts.overdueAmount && (
                        <span className="font-semibold"> Total: {formatCurrency(tenantAlerts.overdueAmount)}</span>
                      )}
                      {tenantAlerts.overdueDays && (
                        <span className="font-semibold"> ({tenantAlerts.overdueDays} dias)</span>
                      )}
                    </p>
                    <Button
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={() => navigate('/dashboard/tenant-payments')}
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Regularizar Pagamento
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Agreement Available Alert */}
          {tenantAlerts?.hasPendingAgreement && tenantAlerts.pendingAgreements.map((agreement) => (
            <Card key={agreement.id} className="border-blue-500 bg-blue-50 border-2">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Handshake className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-blue-800">Acordo Disponível</h4>
                      <Badge className="bg-blue-500">NOVO</Badge>
                    </div>
                    <p className="text-blue-700 mb-2">
                      Você possui um acordo disponível para assinatura.
                      {agreement.totalAmount && (
                        <span className="font-semibold"> Valor: {formatCurrency(agreement.totalAmount)}</span>
                      )}
                    </p>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => navigate('/dashboard/agreements')}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Ver Acordo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Total Pago</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(chartData.totalPaid)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Pendente</p>
                <p className="text-2xl font-bold text-red-700">
                  {formatCurrency(dashboard?.financialOverview?.totalPending || 0)}
                </p>
                {dashboard?.financialOverview?.pendingCount ? (
                  <p className="text-xs text-red-500 mt-1">
                    {dashboard.financialOverview.pendingCount} {dashboard.financialOverview.pendingCount === 1 ? 'fatura' : 'faturas'}
                  </p>
                ) : null}
              </div>
              <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Em Atraso</p>
                <p className="text-2xl font-bold text-orange-700">
                  {formatCurrency(dashboard?.financialOverview?.totalOverdue || 0)}
                </p>
                {dashboard?.financialOverview?.overdueCount ? (
                  <p className="text-xs text-orange-500 mt-1">
                    {dashboard.financialOverview.overdueCount} {dashboard.financialOverview.overdueCount === 1 ? 'fatura' : 'faturas'}
                  </p>
                ) : null}
              </div>
              <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Média de Pagamento</p>
                <p className="text-2xl font-bold text-blue-700">
                  {formatCurrency(dashboard?.financialOverview?.averagePayment || chartData.avgPayment)}
                </p>
                {dashboard?.financialOverview?.totalPayments ? (
                  <p className="text-xs text-blue-500 mt-1">
                    {dashboard.financialOverview.totalPayments} {dashboard.financialOverview.totalPayments === 1 ? 'pagamento' : 'pagamentos'}
                  </p>
                ) : null}
              </div>
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Evolução dos Pagamentos
            </CardTitle>
            <CardDescription>Histórico mensal dos últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData.monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="month"
                    fontSize={11}
                    tick={{ fill: '#6B7280' }}
                  />
                  <YAxis
                    tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`}
                    fontSize={11}
                    tick={{ fill: '#6B7280' }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Total']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nenhum dado de pagamento disponível
              </div>
            )}
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Distribuição por Tipo
            </CardTitle>
            <CardDescription>Valores pagos por categoria</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {chartData.pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nenhum dado de pagamento disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {}
      {property && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-lg">Meu Imóvel</CardTitle>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Alugado
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{property.name || 'Imóvel'}</h3>
                <p className="text-muted-foreground">{property.address}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Valor do Aluguel</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(Number(property.monthlyRent) || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Próximo Vencimento</p>
                  <p className="text-lg font-semibold">
                    {property.nextDueDate
                      ? new Date(property.nextDueDate).toLocaleDateString('pt-BR')
                      : 'Não definido'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status do Pagamento</p>
                  <Badge
                    className={`
                      ${paymentStatus.color === 'green' ? 'bg-green-100 text-green-700' : ''}
                      ${paymentStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' : ''}
                      ${paymentStatus.color === 'red' ? 'bg-red-100 text-red-700' : ''}
                      ${paymentStatus.color === 'gray' ? 'bg-gray-100 text-gray-700' : ''}
                    `}
                  >
                    {paymentStatus.status === 'ok' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {paymentStatus.status === 'upcoming' && <Clock className="w-3 h-3 mr-1" />}
                    {paymentStatus.status === 'overdue' && <AlertTriangle className="w-3 h-3 mr-1" />}
                    {paymentStatus.label}
                  </Badge>
                </div>
              </div>

              {}
              {property.owner && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Imóvel / Administrador</p>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{property.owner.name}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {property.owner.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {property.owner.email}
                          </span>
                        )}
                        {property.owner.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {property.owner.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {}
      {contract && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-500" />
                <CardTitle className="text-lg">Progresso do Contrato</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Início: {contract.startDate ? new Date(contract.startDate).toLocaleDateString('pt-BR') : '-'}
                  </span>
                  <span className="text-muted-foreground">
                    Término: {contract.endDate ? new Date(contract.endDate).toLocaleDateString('pt-BR') : '-'}
                  </span>
                </div>
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${contractProgress.progress}%` }}
                    />
                  </div>
                  <p className="text-center mt-2 text-sm font-medium">
                    {contractProgress.progress.toFixed(1)}% concluído
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{contractProgress.remaining}</p>
                    <p className="text-sm text-muted-foreground">Dias restantes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(Number(contract.monthlyRent) || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Valor mensal</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <CardTitle className="text-lg">Status dos Pagamentos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {chartData.statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={chartData.statusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {chartData.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-green-500" />
              <CardTitle className="text-lg">Histórico de Pagamentos</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard/tenant-payments')}
            >
              Ver Todos
            </Button>
          </div>
          <CardDescription>Pagamentos mensais realizados</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.monthlyData.some(d => d.total > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData.monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="month"
                  fontSize={11}
                  tick={{ fill: '#6B7280' }}
                />
                <YAxis
                  tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`}
                  fontSize={11}
                  tick={{ fill: '#6B7280' }}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Valor']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
                <Bar
                  dataKey="total"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum pagamento registrado</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {}
      {paymentHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-500" />
              Últimos Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentHistory.slice(0, 5).map((payment: Payment, index: number) => (
                <div
                  key={payment.id || index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {payment.type === 'ALUGUEL' ? 'Aluguel' :
                         payment.type === 'CONDOMINIO' ? 'Condomínio' :
                         payment.type === 'IPTU' ? 'IPTU' : payment.type}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {payment.date
                          ? new Date(payment.date).toLocaleDateString('pt-BR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {formatCurrency(Number(payment.amount) || 0)}
                    </p>
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      Pago
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {}
      {paymentStatus.status === 'overdue' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-700">Pagamento em Atraso</h4>
                <p className="text-sm text-red-600 mt-1">
                  Você possui um pagamento em atraso. Regularize sua situação para evitar multas e juros.
                </p>
                <Button
                  className="mt-3 bg-red-600 hover:bg-red-700"
                  size="sm"
                  onClick={() => navigate('/dashboard/tenant-payments')}
                >
                  Realizar Pagamento
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {paymentStatus.status === 'upcoming' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-700">Pagamento Próximo</h4>
                <p className="text-sm text-yellow-600 mt-1">
                  Seu próximo pagamento vence em breve. Fique atento à data de vencimento.
                </p>
                <Button
                  className="mt-3 bg-yellow-600 hover:bg-yellow-700"
                  size="sm"
                  onClick={() => navigate('/dashboard/tenant-payments')}
                >
                  Ver Pagamentos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extrajudicial Acknowledgment Modal */}
      <Dialog open={showExtrajudicialModal} onOpenChange={(open) => {
        setShowExtrajudicialModal(open);
        // Reset guide step when closing
        if (!open) {
          setGuideStep(0);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 text-red-600">
              <Scale className="w-8 h-8" />
              <div>
                <DialogTitle className="text-xl text-red-700">
                  Notificação Extrajudicial
                </DialogTitle>
                <DialogDescription className="text-red-600">
                  Ciência obrigatória - Documento legal
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Legal Notice */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-bold text-red-800 mb-2">⚠️ AVISO LEGAL IMPORTANTE</h4>
              <p className="text-red-700 text-sm">
                Você está recebendo uma <strong>notificação extrajudicial</strong> referente a obrigações
                contratuais pendentes. Este documento tem validade jurídica e sua ciência está sendo
                registrada para fins legais.
              </p>
            </div>

            {/* Notification Details */}
            {activeExtrajudicial && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Token:</span>
                  <span className="font-mono text-sm">{activeExtrajudicial.token || activeExtrajudicial.id}</span>
                </div>
                {activeExtrajudicial.principalAmount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valor Principal:</span>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(activeExtrajudicial.principalAmount)}
                    </span>
                  </div>
                )}
                {activeExtrajudicial.deadlineDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Prazo:</span>
                    <span className="font-semibold">
                      {new Date(activeExtrajudicial.deadlineDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Tracking Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Registro de Ciência
              </h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>Data/Hora:</strong> {new Date().toLocaleString('pt-BR')}</p>
                <p><strong>IP:</strong> {userIp || 'Obtendo...'}</p>
                {geoLocation && (
                  <div className="mt-1">
                    <p className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <strong>Localização:</strong> {geoAddress || 'Obtendo endereço...'}
                    </p>
                    <p className="text-xs text-blue-500 ml-4">
                      ({geoLocation.lat.toFixed(6)}, {geoLocation.lng.toFixed(6)})
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Geolocation Consent */}
            {!geoLocation && (
              <div className="relative">
                {/* Arrow pointing to location button - Step 1 */}
                {guideStep === 1 && (
                  <div className="absolute -top-12 left-0 flex flex-col items-start animate-bounce z-10">
                    <div className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap">
                      Clique aqui primeiro!
                    </div>
                    <ArrowDown className="w-6 h-6 text-blue-600 ml-4" />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={requestGeolocation}
                    className={`text-blue-600 ${guideStep === 1 ? 'ring-2 ring-blue-500 ring-offset-2 animate-pulse' : ''}`}
                  >
                    <MapPin className="w-4 h-4 mr-1" />
                    Permitir localização (recomendado)
                  </Button>
                  <span className="text-xs text-gray-500">
                    Fortalece a validade jurídica do registro
                  </span>
                </div>
              </div>
            )}

            {/* Legal Declaration */}
            <div className="border-t pt-4">
              <p className="text-sm text-gray-700 mb-4">
                Ao clicar em "Dar Ciência e Continuar", declaro que:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside mb-4">
                <li>Estou ciente da notificação extrajudicial recebida</li>
                <li>Entendo que esta ação está sendo registrada para fins legais</li>
                <li>Os prazos legais passam a contar a partir desta ciência</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="relative">
              {/* Arrow pointing to confirm button - Step 2 */}
              {guideStep === 2 && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-10">
                  <div className="bg-green-600 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap">
                    Agora clique aqui para confirmar!
                  </div>
                  <ArrowDown className="w-6 h-6 text-green-600" />
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  className={`flex-1 bg-red-600 hover:bg-red-700 text-white ${guideStep === 2 ? 'ring-2 ring-green-500 ring-offset-2 animate-pulse' : ''}`}
                  onClick={handleAcknowledge}
                  disabled={isAcknowledging}
                >
                  {isAcknowledging ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Dar Ciência e Continuar
                    </>
                  )}
                </Button>
              </div>
            </div>

            <p className="text-xs text-center text-gray-500">
              Este registro serve como prova legal de que você foi notificado.
              Navegador: {navigator.userAgent.split(' ').slice(-2).join(' ')}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
