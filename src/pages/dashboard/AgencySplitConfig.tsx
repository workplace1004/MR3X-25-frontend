import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { agenciesAPI, settingsAPI } from '../../api';
import {
  Handshake,
  Save,
  AlertCircle,
  Loader2,
  DollarSign,
  Building2,
  User,
  Percent,
  Info,
  Calculator
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Separator } from '../../components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';

interface Agency {
  id: string;
  name: string;
  agencyFee: number;
  plan: string;
}

interface PaymentConfig {
  platformFee: number;
  agencyFee: number;
}

export function AgencySplitConfig() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [agencyFee, setAgencyFee] = useState<string>('8');
  const [saving, setSaving] = useState(false);
  const [exampleRent, setExampleRent] = useState<string>('1000');

  // Check permissions
  const canViewSplit = hasPermission('payments:read') || user?.role === 'AGENCY_ADMIN';
  const canUpdateSplit = hasPermission('agencies:update') || user?.role === 'AGENCY_ADMIN';
  const agencyId = user?.agencyId;

  // Fetch agency data
  const { data: agency, isLoading: agencyLoading } = useQuery({
    queryKey: ['agency', agencyId],
    queryFn: () => agenciesAPI.getAgencyById(agencyId!),
    enabled: !!agencyId && canViewSplit,
  });

  // Fetch platform payment config (to show platform fee)
  const { data: paymentConfig, isLoading: configLoading } = useQuery({
    queryKey: ['paymentConfig'],
    queryFn: () => settingsAPI.getPaymentConfig(),
    enabled: canViewSplit,
  });

  // Update agency fee when data loads
  useEffect(() => {
    if (agency?.agencyFee !== undefined) {
      setAgencyFee(agency.agencyFee.toString());
    }
  }, [agency]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: { agencyFee: number }) =>
      agenciesAPI.updateAgency(agencyId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency', agencyId] });
      toast.success('Taxa da agência atualizada com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Falha ao atualizar taxa');
    },
  });

  // Don't render if no permission or no agency
  if (!canViewSplit || !agencyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para visualizar a configuração de divisão.</p>
        </div>
      </div>
    );
  }

  if (agencyLoading || configLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const platformFee = paymentConfig?.platformFee || 2;
  const currentAgencyFee = parseFloat(agencyFee) || 0;
  const ownerFee = Math.max(0, 100 - platformFee - currentAgencyFee);
  const rentValue = parseFloat(exampleRent) || 1000;

  const handleSave = async () => {
    const feeValue = parseFloat(agencyFee);

    // Validation
    if (isNaN(feeValue) || feeValue < 0) {
      toast.error('A taxa deve ser um valor positivo');
      return;
    }

    if (feeValue + platformFee > 100) {
      toast.error(`A taxa da agência não pode exceder ${100 - platformFee}% (100% - ${platformFee}% da plataforma)`);
      return;
    }

    setSaving(true);
    try {
      await updateMutation.mutateAsync({ agencyFee: feeValue });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Configuração de Divisão</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Configure a divisão de pagamentos entre plataforma, agência e proprietário
        </p>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <p className="font-medium">Como funciona a divisão de pagamentos?</p>
          <p className="text-sm mt-1">
            Quando um pagamento de aluguel é recebido, ele é dividido automaticamente entre:
          </p>
          <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
            <li><strong>Plataforma MR3X ({platformFee}%)</strong> - Taxa fixa do sistema</li>
            <li><strong>Agência</strong> - Sua comissão configurável</li>
            <li><strong>Proprietário</strong> - Valor restante (automático)</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Split Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="w-5 h-5" />
            Configuração de Taxas
          </CardTitle>
          <CardDescription>
            Defina a porcentagem de comissão que a agência receberá em cada pagamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Platform Fee (Read-only) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-orange-600" />
                Taxa da Plataforma (MR3X)
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  value={platformFee}
                  disabled
                  className="pr-8 bg-muted cursor-not-allowed"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Taxa fixa da plataforma (não editável)
              </p>
            </div>

            {/* Agency Fee (Editable) */}
            <div className="space-y-2">
              <Label htmlFor="agencyFee" className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Taxa da Agência
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Esta é a porcentagem que sua agência receberá de cada pagamento de aluguel.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <div className="relative">
                <Input
                  id="agencyFee"
                  type="number"
                  min="0"
                  max={100 - platformFee}
                  step="0.01"
                  value={agencyFee}
                  onChange={(e) => setAgencyFee(e.target.value)}
                  disabled={!canUpdateSplit}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Máximo: {100 - platformFee}%
              </p>
            </div>

            {/* Owner Fee (Calculated) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4 text-green-600" />
                Valor do Proprietário
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  value={ownerFee.toFixed(2)}
                  disabled
                  className="pr-8 bg-muted cursor-not-allowed"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Calculado automaticamente (100% - taxas)
              </p>
            </div>
          </div>

          {ownerFee < 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                A soma das taxas excede 100%. Reduza a taxa da agência.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Example Calculation */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">Simulação de Pagamento</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="exampleRent">Valor do Aluguel</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    id="exampleRent"
                    type="number"
                    min="0"
                    step="100"
                    value={exampleRent}
                    onChange={(e) => setExampleRent(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-sm">Plataforma ({platformFee}%)</span>
                  </div>
                  <span className="font-medium">
                    R$ {((rentValue * platformFee) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm">Agência ({currentAgencyFee}%)</span>
                  </div>
                  <span className="font-medium">
                    R$ {((rentValue * currentAgencyFee) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm">Proprietário ({ownerFee.toFixed(2)}%)</span>
                  </div>
                  <span className="font-medium">
                    R$ {((rentValue * ownerFee) / 100).toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center font-semibold">
                  <span>Total</span>
                  <span>R$ {rentValue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Split Bar */}
          <div className="space-y-2">
            <Label>Visualização da Divisão</Label>
            <div className="h-8 rounded-lg overflow-hidden flex">
              <div
                className="bg-orange-500 flex items-center justify-center text-white text-xs font-medium transition-all"
                style={{ width: `${platformFee}%` }}
              >
                {platformFee > 5 && `${platformFee}%`}
              </div>
              <div
                className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium transition-all"
                style={{ width: `${currentAgencyFee}%` }}
              >
                {currentAgencyFee > 5 && `${currentAgencyFee}%`}
              </div>
              <div
                className="bg-green-500 flex items-center justify-center text-white text-xs font-medium transition-all"
                style={{ width: `${Math.max(0, ownerFee)}%` }}
              >
                {ownerFee > 5 && `${ownerFee.toFixed(1)}%`}
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                Plataforma
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Agência
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Proprietário
              </span>
            </div>
          </div>

          {!canUpdateSplit && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Você não tem permissão para modificar a configuração de divisão.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!canUpdateSplit || saving || ownerFee < 0}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Quando a divisão é aplicada?</h4>
              <p className="text-sm text-muted-foreground">
                A divisão é aplicada automaticamente quando um pagamento de aluguel é registrado e confirmado no sistema.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Posso ter taxas diferentes por propriedade?</h4>
              <p className="text-sm text-muted-foreground">
                Sim! Você pode configurar uma taxa específica para cada propriedade na página de detalhes da propriedade.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">E se o proprietário não concordar?</h4>
              <p className="text-sm text-muted-foreground">
                A taxa da agência deve ser acordada previamente com o proprietário no contrato de administração.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Como vejo os valores recebidos?</h4>
              <p className="text-sm text-muted-foreground">
                Acesse a página de Pagamentos para ver o histórico de pagamentos e os valores de cada parte.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AgencySplitConfig;
