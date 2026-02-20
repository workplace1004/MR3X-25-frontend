import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, Wallet, History } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { notificationsAPI, withdrawAPI } from '../api';
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { WithdrawModal } from './withdraw/WithdrawModal';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showWallet?: boolean; // Optional prop to override default wallet visibility
  /** Optional custom actions (e.g. Export CSV, Send Email) rendered to the right of title, before wallet/notifications */
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, showWallet, actions }: PageHeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showWithdrawButton, setShowWithdrawButton] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const withdrawRef = useRef<HTMLDivElement>(null);

  // Determine if wallet should be shown based on user role
  const shouldShowWallet = showWallet !== undefined 
    ? showWallet 
    : ['CEO', 'INDEPENDENT_OWNER', 'PROPRIETARIO', 'AGENCY_ADMIN', 'AGENCY_MANAGER'].includes(user?.role || '');

  // Get unread notifications count
  const { data: notificationsUnreadData } = useQuery({
    queryKey: ['notifications-unread', user?.id],
    queryFn: () => notificationsAPI.getUnreadCount(),
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: !!user?.id,
  });

  const unreadNotificationsCount = notificationsUnreadData?.count || 0;

  // Get available balance for withdrawal
  const { data: balanceData } = useQuery({
    queryKey: ['withdraw-balance', user?.id],
    queryFn: () => withdrawAPI.getAvailableBalance(),
    enabled: shouldShowWallet && !!user?.id,
  });

  // Close withdraw button when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (withdrawRef.current && !withdrawRef.current.contains(event.target as Node)) {
        setShowWithdrawButton(false);
      }
    };

    if (showWithdrawButton) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showWithdrawButton]);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {actions}
          {shouldShowWallet && (
            <div 
              className="relative bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
              ref={withdrawRef}
            >
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-green-600" />
                <div className="flex flex-col">
                  <button
                    onClick={() => setShowWithdrawButton(!showWithdrawButton)}
                    className="text-xl font-bold text-green-600 hover:text-green-700 transition-colors cursor-pointer text-left"
                    title="Clique para ver opções de saque"
                  >
                    {formatCurrency(balanceData?.availableBalance ?? 0)}
                  </button>
                </div>
              </div>
              {showWithdrawButton && (
                <div className="absolute top-full mt-2 right-0 z-10 bg-white border border-green-200 rounded-lg shadow-xl p-3 min-w-[180px] space-y-2">
                  <Button
                    onClick={() => {
                      setShowWithdrawModal(true);
                      setShowWithdrawButton(false);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white w-full shadow-sm"
                    size="sm"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Sacar
                  </Button>
                  <Button
                    onClick={() => {
                      navigate('/dashboard/payment-history');
                      setShowWithdrawButton(false);
                    }}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    <History className="h-4 w-4 mr-2" />
                    Histórico de pagamentos
                  </Button>
                </div>
              )}
            </div>
          )}
          <Button
            variant="outline"
            size="icon"
            className="relative"
            onClick={() => navigate('/dashboard/notifications')}
            title="Notificações"
          >
            <Bell className="h-5 w-5" />
            {unreadNotificationsCount > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs rounded-full"
              >
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {shouldShowWallet && (
        <WithdrawModal
          open={showWithdrawModal}
          onOpenChange={setShowWithdrawModal}
          availableBalance={balanceData?.availableBalance ?? 0}
        />
      )}
    </>
  );
}

