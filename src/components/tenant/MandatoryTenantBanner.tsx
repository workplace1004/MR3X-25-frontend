import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { AlertTriangle, Calendar, Scale, Handshake, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';

interface TenantAlerts {
  hasOverduePayment: boolean;
  overdueAmount?: number;
  overdueDays?: number;
  hasActiveExtrajudicial: boolean;
  extrajudicialNotifications: Array<{
    id: string;
    type: string;
    status: string;
    priority?: string;
    principalAmount?: number;
    deadlineDate?: string;
  }>;
  hasPendingAgreement: boolean;
  pendingAgreements: Array<{
    id: string;
    type: string;
    status: string;
    totalAmount?: number;
    effectiveDate?: string;
  }>;
  isSeverelyOverdue: boolean;
  requiresImmediateAction: boolean;
}

interface MandatoryTenantBannerProps {
  upcomingDueDate?: Date | null;
  daysUntilUpcoming?: number | null;
}

export function MandatoryTenantBanner({ upcomingDueDate, daysUntilUpcoming }: MandatoryTenantBannerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [userIp, setUserIp] = useState<string>('');

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

  // Fetch tenant alerts
  const { data: tenantAlerts, isLoading } = useQuery<TenantAlerts>({
    queryKey: ['tenant-alerts', user?.id],
    queryFn: () => dashboardAPI.getTenantAlerts(),
    enabled: !!user?.id && !hasAcknowledged,
  });

  // Acknowledge banner mutation
  const acknowledgeBannerMutation = useMutation({
    mutationFn: async (data: {
      type: 'UPCOMING_DUE' | 'OVERDUE' | 'EXTRAJUDICIAL' | 'AGREEMENT';
      itemId?: string;
      ipAddress: string;
      userAgent: string;
    }) => {
      // Log acknowledgment to backend (create audit log)
      return dashboardAPI.acknowledgeBanner(data);
    },
    onSuccess: () => {
      setHasAcknowledged(true);
      queryClient.invalidateQueries({ queryKey: ['tenant-alerts'] });
    },
  });

  // Determine if banner should be shown
  const shouldShowBanner = () => {
    if (hasAcknowledged) return false;
    if (isLoading) return false;

    // Check for upcoming due date (7 days before)
    if (upcomingDueDate && daysUntilUpcoming !== null && daysUntilUpcoming !== undefined && daysUntilUpcoming <= 7 && daysUntilUpcoming >= 0) {
      return true;
    }

    // Check for overdue payments
    if (tenantAlerts?.hasOverduePayment) {
      return true;
    }

    // Check for extrajudicial notifications
    if (tenantAlerts?.hasActiveExtrajudicial && tenantAlerts.extrajudicialNotifications.length > 0) {
      return true;
    }

    // Check for pending agreements
    if (tenantAlerts?.hasPendingAgreement && tenantAlerts.pendingAgreements.length > 0) {
      return true;
    }

    return false;
  };

  const handleAcknowledge = async (type: 'UPCOMING_DUE' | 'OVERDUE' | 'EXTRAJUDICIAL' | 'AGREEMENT', itemId?: string) => {
    try {
      await acknowledgeBannerMutation.mutateAsync({
        type,
        itemId,
        ipAddress: userIp,
        userAgent: navigator.userAgent,
      });
      toast.success('Ciência registrada com sucesso');
    } catch (error) {
      console.error('Error acknowledging banner:', error);
      toast.error('Erro ao registrar ciência');
    }
  };

  const getBannerContent = () => {
    // Priority 1: Extrajudicial notifications
    if (tenantAlerts?.hasActiveExtrajudicial && tenantAlerts.extrajudicialNotifications.length > 0) {
      const notification = tenantAlerts.extrajudicialNotifications[0];
      return {
        title: '⚠️ NOTIFICAÇÃO EXTRAJUDICIAL - ATENÇÃO URGENTE',
        message: `Você possui uma notificação extrajudicial ativa que requer sua ciência imediata.${notification.principalAmount ? ` Valor: ${formatCurrency(notification.principalAmount)}.` : ''} O não reconhecimento desta notificação pode resultar em medidas judiciais.`,
        type: 'EXTRAJUDICIAL' as const,
        itemId: notification.id,
        severity: 'critical',
        actionLabel: 'Ver Notificação e Dar Ciência',
        actionPath: `/dashboard/extrajudicial-acknowledgment/${notification.id}`,
      };
    }

    // Priority 2: Overdue payments
    if (tenantAlerts?.hasOverduePayment) {
      return {
        title: '⚠️ PAGAMENTO EM ATRASO',
        message: `Você possui pagamento(s) em atraso.${tenantAlerts.overdueAmount ? ` Total: ${formatCurrency(tenantAlerts.overdueAmount)}.` : ''}${tenantAlerts.overdueDays ? ` (${tenantAlerts.overdueDays} dias)` : ''} Por favor, regularize sua situação o quanto antes.`,
        type: 'OVERDUE' as const,
        severity: 'high',
        actionLabel: 'Ver Pagamentos',
        actionPath: '/dashboard/tenant-payments',
      };
    }

    // Priority 3: Upcoming due date (7 days before)
    if (upcomingDueDate && daysUntilUpcoming !== null && daysUntilUpcoming !== undefined && daysUntilUpcoming <= 7 && daysUntilUpcoming >= 0) {
      return {
        title: '📅 PAGAMENTO PRÓXIMO DO VENCIMENTO',
        message: `Seu pagamento vence em ${daysUntilUpcoming} ${daysUntilUpcoming === 1 ? 'dia' : 'dias'}. Data de vencimento: ${new Date(upcomingDueDate).toLocaleDateString('pt-BR')}. Lembre-se de efetuar o pagamento antes do vencimento para evitar multas e juros.`,
        type: 'UPCOMING_DUE' as const,
        severity: 'medium',
        actionLabel: 'Ver Detalhes',
        actionPath: '/dashboard/tenant-payments',
      };
    }

    // Priority 4: Pending agreements
    if (tenantAlerts?.hasPendingAgreement && tenantAlerts.pendingAgreements.length > 0) {
      const agreement = tenantAlerts.pendingAgreements[0];
      return {
        title: '🤝 ACORDO PENDENTE DE ASSINATURA',
        message: `Você possui um acordo pendente de assinatura.${agreement.totalAmount ? ` Valor: ${formatCurrency(agreement.totalAmount)}.` : ''} Por favor, revise e assine o acordo para regularizar sua situação.`,
        type: 'AGREEMENT' as const,
        itemId: agreement.id,
        severity: 'medium',
        actionLabel: 'Ver Acordo',
        actionPath: '/dashboard/agreements',
      };
    }

    return null;
  };

  const bannerContent = getBannerContent();

  if (!shouldShowBanner() || !bannerContent) {
    return null;
  }

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          border: 'border-red-500',
          bg: 'bg-red-50',
          text: 'text-red-800',
          icon: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700',
        };
      case 'high':
        return {
          border: 'border-orange-500',
          bg: 'bg-orange-50',
          text: 'text-orange-800',
          icon: 'text-orange-600',
          button: 'bg-orange-600 hover:bg-orange-700',
        };
      default:
        return {
          border: 'border-yellow-500',
          bg: 'bg-yellow-50',
          text: 'text-yellow-800',
          icon: 'text-yellow-600',
          button: 'bg-yellow-600 hover:bg-yellow-700',
        };
    }
  };

  const styles = getSeverityStyles(bannerContent.severity);

  const getIcon = () => {
    switch (bannerContent.type) {
      case 'EXTRAJUDICIAL':
        return <Scale className="w-6 h-6" />;
      case 'OVERDUE':
        return <AlertTriangle className="w-6 h-6" />;
      case 'UPCOMING_DUE':
        return <Calendar className="w-6 h-6" />;
      case 'AGREEMENT':
        return <Handshake className="w-6 h-6" />;
      default:
        return <AlertTriangle className="w-6 h-6" />;
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className={`max-w-2xl ${styles.bg} ${styles.border} border-2`}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${styles.icon} bg-white`}>
              {getIcon()}
            </div>
            <div className="flex-1">
              <DialogTitle className={`text-xl font-bold ${styles.text}`}>
                {bannerContent.title}
              </DialogTitle>
              <DialogDescription className={`${styles.text} mt-2`}>
                {bannerContent.message}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className={`p-4 rounded-lg bg-white/50 border ${styles.border} mt-4`}>
          <div className="flex items-center gap-2 mb-2">
            <Badge className={styles.button}>
              {bannerContent.severity === 'critical' ? 'CRÍTICO' :
               bannerContent.severity === 'high' ? 'ALTA PRIORIDADE' :
               'ATENÇÃO'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Este aviso é obrigatório e não pode ser ignorado sem registro de ciência.
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            <strong>Importante:</strong> Este registro de ciência é necessário para fins legais e comprovação de notificação.
            Seu IP ({userIp}) e data/hora serão registrados para fins de auditoria.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (bannerContent.actionPath) {
                navigate(bannerContent.actionPath);
              }
            }}
            className="flex-1"
          >
            {bannerContent.actionLabel}
          </Button>
          <Button
            onClick={() => handleAcknowledge(bannerContent.type, bannerContent.itemId)}
            className={`${styles.button} text-white flex-1`}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirmar Ciência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

