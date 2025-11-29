import { Card, CardContent } from './card';
import { Button } from './button';
import { Lock, ArrowUpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradePromptProps {
  feature: string;
  planRequired?: string;
  message?: string;
  onUpgrade?: () => void;
}

export function UpgradePrompt({
  feature,
  planRequired = 'ESSENTIAL',
  message,
  onUpgrade,
}: UpgradePromptProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate('/dashboard/plans');
    }
  };

  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardContent className="text-center py-8 px-6">
        <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-amber-900 mb-2">
          Recurso Bloqueado
        </h3>
        <p className="text-amber-800 mb-4">
          {message || `Seu plano atual não permite ${feature}.`}
        </p>
        <Button
          onClick={handleUpgrade}
          className="gap-2 bg-amber-600 hover:bg-amber-700"
        >
          <ArrowUpCircle className="w-4 h-4" />
          Fazer upgrade para {planRequired}
        </Button>
      </CardContent>
    </Card>
  );
}

// Inline upgrade banner for smaller spaces
export function UpgradeBanner({
  message,
  onUpgrade,
}: {
  message: string;
  onUpgrade?: () => void;
}) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate('/dashboard/plans');
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center">
          <Lock className="w-4 h-4 text-amber-700" />
        </div>
        <p className="text-sm text-amber-800">{message}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleUpgrade}
        className="gap-1 border-amber-500 text-amber-700 hover:bg-amber-100"
      >
        <ArrowUpCircle className="w-4 h-4" />
        Upgrade
      </Button>
    </div>
  );
}
