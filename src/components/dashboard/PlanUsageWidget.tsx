import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Building2, Users, AlertTriangle, ArrowUpCircle, Lock } from 'lucide-react';
import { agenciesAPI } from '../../api';

interface PlanUsage {
  properties: {
    active: number;
    frozen: number;
    total: number;
    limit: number;
  };
  users: {
    active: number;
    frozen: number;
    total: number;
    limit: number;
  };
  isOverLimit: boolean;
  upgradeRequired: boolean;
  plan: string;
}

interface PlanUsageWidgetProps {
  agencyId: string;
  onUpgradeClick?: () => void;
}

export function PlanUsageWidget({ agencyId, onUpgradeClick }: PlanUsageWidgetProps) {
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        setLoading(true);
        const data = await agenciesAPI.getPlanUsage(agencyId);
        setUsage(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar uso do plano');
      } finally {
        setLoading(false);
      }
    };

    if (agencyId) {
      fetchUsage();
    }
  }, [agencyId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Uso do Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Uso do Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!usage) {
    return null;
  }

  const propertyPercent = usage.properties.limit > 0
    ? Math.min(100, (usage.properties.active / usage.properties.limit) * 100)
    : 0;
  const userPercent = usage.users.limit > 0
    ? Math.min(100, (usage.users.active / usage.users.limit) * 100)
    : 0;

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'FREE': return 'text-gray-600';
      case 'ESSENTIAL': return 'text-blue-600';
      case 'PROFESSIONAL': return 'text-purple-600';
      case 'ENTERPRISE': return 'text-amber-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Uso do Plano</CardTitle>
          <span className={`text-sm font-semibold ${getPlanColor(usage.plan)}`}>
            {usage.plan}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Properties Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span>Imóveis</span>
            </div>
            <span className="font-medium">
              {usage.properties.active} / {usage.properties.limit}
            </span>
          </div>
          <Progress value={propertyPercent} className="h-2" />
          {usage.properties.frozen > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <Lock className="w-3 h-3" />
              <span>{usage.properties.frozen} congelada(s)</span>
            </div>
          )}
        </div>

        {/* Users Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>Usuários</span>
            </div>
            <span className="font-medium">
              {usage.users.active} / {usage.users.limit}
            </span>
          </div>
          <Progress value={userPercent} className="h-2" />
          {usage.users.frozen > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <Lock className="w-3 h-3" />
              <span>{usage.users.frozen} desativado(s)</span>
            </div>
          )}
        </div>

        {/* Warning / Upgrade Prompt */}
        {usage.upgradeRequired && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <p className="mb-2">
                Você tem itens congelados devido ao limite do seu plano.
              </p>
              {onUpgradeClick && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 border-amber-500 text-amber-700 hover:bg-amber-100"
                  onClick={onUpgradeClick}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  Fazer Upgrade
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {usage.isOverLimit && !usage.upgradeRequired && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Você está acima do limite do seu plano. Novos itens serão congelados.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
