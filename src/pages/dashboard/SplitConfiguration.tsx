import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { agenciesAPI, settingsAPI, usersAPI } from '../../api';
import {
  Handshake,
  Save,
  AlertCircle,
  Loader2,
  Building2,
  User,
  Info,
  Lock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Skeleton } from '../../components/ui/skeleton';
import { Slider } from '../../components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

export function SplitConfiguration() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [agencyFee, setAgencyFee] = useState<number>(8);
  const [platformFeeValue, setPlatformFeeValue] = useState<number>(2);
  const [saving, setSaving] = useState(false);
  const [savingPlatformFee, setSavingPlatformFee] = useState(false);
  const [savingOwnerFee, setSavingOwnerFee] = useState(false);
  const [exampleRent] = useState<number>(10000);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [selectedOwnerFee, setSelectedOwnerFee] = useState<number>(90);

  const canViewSplit = hasPermission('payments:read') ||
    ['AGENCY_ADMIN', 'AGENCY_MANAGER', 'INDEPENDENT_OWNER', 'CEO', 'ADMIN'].includes(user?.role || '');
  const isCeoOrAdmin = ['CEO', 'ADMIN'].includes(user?.role || '');
  const isAgencyAdmin = user?.role === 'AGENCY_ADMIN';
  const isIndependentOwner = user?.role === 'INDEPENDENT_OWNER';
  const canUpdateSplit = hasPermission('agencies:update') ||
    ['AGENCY_ADMIN', 'INDEPENDENT_OWNER', 'CEO', 'ADMIN'].includes(user?.role || '');

  // For CEO/ADMIN, use selected agency; for others, use their own agency
  const agencyId = isCeoOrAdmin ? (selectedAgencyId || undefined) : user?.agencyId;

  // Fetch agencies list for CEO/ADMIN users
  const { data: agenciesList, isLoading: agenciesLoading } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => agenciesAPI.getAgencies(),
    enabled: isCeoOrAdmin && canViewSplit,
  });

  const { data: agency, isLoading: agencyLoading } = useQuery({
    queryKey: ['agency', agencyId],
    queryFn: () => agenciesAPI.getAgencyById(agencyId!),
    enabled: !!agencyId && canViewSplit,
  });

  // CEO, ADMIN, AGENCY_ADMIN, and INDEPENDENT_OWNER can access payment config (to show platform fee)
  const canAccessPaymentConfig = user?.role === 'CEO' || user?.role === 'ADMIN' || user?.role === 'AGENCY_ADMIN' || user?.role === 'INDEPENDENT_OWNER';
  const { data: paymentConfig, isLoading: configLoading } = useQuery({
    queryKey: ['paymentConfig'],
    queryFn: () => settingsAPI.getPaymentConfig(),
    enabled: canAccessPaymentConfig,
  });

  // Fetch owners list for AGENCY_ADMIN users
  const { data: ownersList, isLoading: ownersLoading } = useQuery({
    queryKey: ['owners'],
    queryFn: () => usersAPI.getOwners(),
    enabled: isAgencyAdmin && canViewSplit,
  });

  useEffect(() => {
    if (agency?.agencyFee !== undefined) {
      setAgencyFee(agency.agencyFee);
    }
  }, [agency]);

  // Track the last saved value to prevent overwriting after save
  const lastSavedPlatformFee = useRef<number | null>(null);
  
  useEffect(() => {
    // Only update from paymentConfig if we're not saving and value is defined
    if (paymentConfig?.platformFee !== undefined && !savingPlatformFee) {
      // Don't overwrite if this is the value we just saved
      if (lastSavedPlatformFee.current !== null && 
          Math.abs(paymentConfig.platformFee - lastSavedPlatformFee.current) < 0.01) {
        // This is likely the value we just saved, keep our local state
        return;
      }
      // Update from paymentConfig (initial load or significant change)
      setPlatformFeeValue(paymentConfig.platformFee);
    }
  }, [paymentConfig, savingPlatformFee]);

  // Set owner fee when an owner is selected (for AGENCY_ADMIN)
  useEffect(() => {
    if (selectedOwnerId && ownersList) {
      const selectedOwner = ownersList.find((o: any) => o.id === selectedOwnerId);
      if (selectedOwner) {
        setSelectedOwnerFee(selectedOwner.ownerFee ?? 90);
      }
    }
  }, [selectedOwnerId, ownersList]);

  // For independent owners, owner fee is calculated (100% - platform fee), no need to fetch from profile

  const isCeo = user?.role === 'CEO';

  const updateOwnerFeeMutation = useMutation({
    mutationFn: (data: { ownerId: string; ownerFee: number }) =>
      usersAPI.updateOwnerFee(data.ownerId, data.ownerFee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      toast.success('Taxa do proprietário atualizada com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Falha ao atualizar taxa do proprietário');
    },
  });

  const updatePlatformFeeMutation = useMutation({
    mutationFn: (data: { platformFee: number }) => {
      const currentAgencyFee = paymentConfig?.agencyFee ?? 0;
      return settingsAPI.updatePaymentConfig({ 
        platformFee: data.platformFee, 
        agencyFee: currentAgencyFee 
      });
    },
    onSuccess: (data) => {
      // Update cache optimistically with the saved value
      const updatedConfig = {
        platformFee: data.platformFee,
        agencyFee: data.agencyFee ?? paymentConfig?.agencyFee ?? 0,
      };
      queryClient.setQueryData(['paymentConfig'], updatedConfig);
      // Update local state to match the saved value
      setPlatformFeeValue(data.platformFee);
      // Invalidate to ensure consistency with server
      queryClient.invalidateQueries({ queryKey: ['paymentConfig'] });
      toast.success('Taxa da plataforma atualizada com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Falha ao atualizar taxa da plataforma');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { agencyFee: number }) =>
      agenciesAPI.updateAgency(agencyId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency', agencyId] });
      toast.success('Comissão da agência atualizada com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Falha ao atualizar comissão');
    },
  });

  if (!canViewSplit) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para visualizar a configuração de split.</p>
        </div>
      </div>
    );
  }

  const isLoading = agencyLoading || configLoading || (isCeoOrAdmin && agenciesLoading) || (isAgencyAdmin && ownersLoading);

  if (isLoading && agencyId) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-96 mb-2" />
          <Skeleton className="h-4 w-[500px]" />
        </div>
        <Alert className="border-blue-200 bg-blue-50">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
          </div>
        </Alert>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-3 p-4 border rounded-lg">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-64" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get agencies array from paginated response
  const agencies = agenciesList?.data || agenciesList || [];

  const platformFee = platformFeeValue;
  const ownerFee = Math.max(0, 100 - platformFee - agencyFee);

  const handleSavePlatformFee = async () => {
    if (platformFeeValue < 0) {
      toast.error('A taxa da plataforma deve ser um valor positivo');
      return;
    }

    if (platformFeeValue > 50) {
      toast.error('A taxa da plataforma não pode exceder 50%');
      return;
    }

    const valueToSave = platformFeeValue;
    lastSavedPlatformFee.current = valueToSave; // Track the value we're saving
    setSavingPlatformFee(true);
    try {
      await updatePlatformFeeMutation.mutateAsync({ platformFee: valueToSave });
    } finally {
      setSavingPlatformFee(false);
    }
  };

  const handleSave = async () => {
    if (agencyFee < 0) {
      toast.error('A comissão deve ser um valor positivo');
      return;
    }

    if (agencyFee + platformFee > 100) {
      toast.error(`A comissão não pode exceder ${100 - platformFee}%`);
      return;
    }

    setSaving(true);
    try {
      await updateMutation.mutateAsync({ agencyFee });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOwnerFee = async () => {
    // Independent owners don't need to save - their fee is calculated automatically
    if (isIndependentOwner) {
      return;
    }

    if (!selectedOwnerId) {
      toast.error('Selecione um proprietário');
      return;
    }

    if (selectedOwnerFee < 0 || selectedOwnerFee > 100) {
      toast.error('A taxa do proprietário deve estar entre 0 e 100%');
      return;
    }

    setSavingOwnerFee(true);
    try {
      await updateOwnerFeeMutation.mutateAsync({ ownerId: selectedOwnerId, ownerFee: selectedOwnerFee });
    } finally {
      setSavingOwnerFee(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-orange-100 rounded-lg">
          <Handshake className="w-6 h-6 text-orange-700" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Configuração de Divisão de Pagamentos</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Configure a porcentagem de comissão da agência nos pagamentos de aluguel
          </p>
        </div>
      </div>

      {/* Agency Selector for CEO/ADMIN */}
      {isCeoOrAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5" />
              Selecionar Agência
            </CardTitle>
            <CardDescription>
              Escolha uma agência para configurar suas definições de divisão de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedAgencyId}
              onValueChange={(value) => {
                setSelectedAgencyId(value);
                setAgencyFee(8); // Reset to default when changing agency
              }}
            >
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder="Selecione uma agência..." />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(agencies) && agencies.map((ag: any) => (
                  <SelectItem key={ag.id} value={ag.id.toString()}>
                    {ag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedAgencyId && (
              <p className="text-sm text-muted-foreground mt-2">
                Por favor, selecione uma agência para visualizar e configurar suas definições de divisão.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show message if no agency selected for CEO/ADMIN */}
      {isCeoOrAdmin && !selectedAgencyId && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <p className="font-medium">Nenhuma Agência Selecionada</p>
            <p className="text-sm mt-1">
              Por favor, selecione uma agência no menu acima para configurar suas definições de divisão de pagamento.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Owner Selector for AGENCY_ADMIN */}
      {isAgencyAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5" />
              Selecionar Proprietário
            </CardTitle>
            <CardDescription>
              Escolha um proprietário para configurar suas definições de divisão de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedOwnerId}
              onValueChange={(value) => {
                setSelectedOwnerId(value);
              }}
            >
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder="Selecione um proprietário..." />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(ownersList) && ownersList.map((owner: any) => (
                  <SelectItem key={owner.id} value={owner.id}>
                    {owner.name} - {owner.document || owner.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedOwnerId && (
              <p className="text-sm text-muted-foreground mt-2">
                Por favor, selecione um proprietário para visualizar e configurar suas definições de divisão.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show message if no owner selected for AGENCY_ADMIN */}
      {isAgencyAdmin && !selectedOwnerId && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <p className="font-medium">Nenhum Proprietário Selecionado</p>
            <p className="text-sm mt-1">
              Por favor, selecione um proprietário no menu acima para configurar suas definições de divisão de pagamento.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Only show the rest if an agency is selected or user has agencyId (for non-agency-admin) OR owner is selected (for agency admin) OR user is independent owner */}
      {((agencyId && !isAgencyAdmin && !isIndependentOwner) || (isAgencyAdmin && selectedOwnerId) || isIndependentOwner) && (
        <>
      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <p className="font-medium">Como Funciona a Divisão de Pagamentos</p>
          <p className="text-sm mt-1">
            Quando um inquilino faz um pagamento, ele é automaticamente dividido de acordo com as porcentagens configuradas.
            {isCeo ? (
              ' Como CEO, você pode ajustar tanto a taxa da plataforma quanto a comissão da agência.'
            ) : isAgencyAdmin ? (
              ' Como Administrador da Agência, você pode ajustar a porcentagem que cada proprietário recebe.'
            ) : isIndependentOwner ? (
              ' Como Proprietário Independente, você pode ajustar a porcentagem que você recebe nos pagamentos de aluguel.'
            ) : (
              ' Você pode ajustar a comissão da agência. A taxa da plataforma é definida pelo CEO.'
            )}
          </p>
        </AlertDescription>
      </Alert>

      {/* Fee Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="w-5 h-5" />
            Configuração de Taxas
          </CardTitle>
          <CardDescription>
            {isAgencyAdmin || isIndependentOwner
              ? 'Gerencie a porcentagem que o proprietário recebe nos pagamentos de aluguel'
              : 'Gerencie a comissão da agência nos pagamentos de aluguel'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Agency Admin or Independent Owner - Owner Fee Configuration */}
          {(isAgencyAdmin || isIndependentOwner) ? (
            <>
              {/* Owner Fee - Editable for Agency Admin, Calculated for Independent Owner */}
              {isIndependentOwner ? (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-gray-600" />
                      <Label className="text-base font-medium">Sua Taxa (%) - Calculado</Label>
                    </div>
                    <span className="text-xl font-bold">
                      {formatCurrency((exampleRent * (100 - platformFee)) / 100)}
                    </span>
                  </div>

                  <Input
                    type="number"
                    value={(100 - platformFee).toFixed(1)}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />

                  <p className="text-xs text-muted-foreground mt-2">
                    Calculado automaticamente: 100% - Taxa da Plataforma
                  </p>
                </div>
              ) : (
                <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      <Label className="text-base font-medium">Taxa do Proprietário (%) - Editável</Label>
                    </div>
                    <span className="text-xl font-bold text-blue-700">
                      {formatCurrency((exampleRent * selectedOwnerFee) / 100)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Slider
                        value={[selectedOwnerFee]}
                        onValueChange={(value) => setSelectedOwnerFee(value[0])}
                        max={100 - platformFee}
                        min={0}
                        step={0.5}
                        className="cursor-pointer"
                      />
                    </div>
                    <div className="w-20">
                      <Input
                        type="number"
                        value={selectedOwnerFee}
                        onChange={(e) => setSelectedOwnerFee(parseFloat(e.target.value) || 0)}
                        min={0}
                        max={100 - platformFee}
                        step={0.5}
                        className="text-center"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                    <span className="inline-block w-3 h-3">&#10003;</span>
                    Defina quanto do aluguel irá para este proprietário
                  </p>
                </div>
              )}

              {/* Agency Commission - Calculated (only for agency admin, not for independent owners) */}
              {isAgencyAdmin && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-gray-600" />
                      <Label className="text-base font-medium">Comissão da Agência (%) - Calculado</Label>
                    </div>
                    <span className="text-xl font-bold">
                      {formatCurrency((exampleRent * Math.max(0, 100 - selectedOwnerFee - platformFee)) / 100)}
                    </span>
                  </div>

                  <Input
                    type="number"
                    value={Math.max(0, 100 - selectedOwnerFee - platformFee).toFixed(1)}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />

                  <p className="text-xs text-muted-foreground mt-2">
                    Calculado automaticamente: 100% - Taxa do Proprietário - Taxa da Plataforma
                  </p>
                </div>
              )}

              {/* Platform Fee - Read-only */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-gray-600" />
                    <Label className="text-base font-medium">Taxa da Plataforma (%) - Definida pelo CEO</Label>
                  </div>
                  <span className="text-xl font-bold">
                    {formatCurrency((exampleRent * platformFee) / 100)}
                  </span>
                </div>

                <Input
                  type="number"
                  value={platformFee}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />

                <p className="text-xs text-muted-foreground mt-2">
                  Esta taxa é definida pelo CEO da plataforma e não pode ser alterada
                </p>
              </div>

              {/* Total Percentage */}
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-lg font-semibold">Porcentagem Total</span>
                <span className={`text-2xl font-bold ${
                  isIndependentOwner 
                    ? 'text-green-600' // Always 100% for independent owners (calculated)
                    : (selectedOwnerFee + Math.max(0, 100 - selectedOwnerFee - platformFee) + platformFee === 100 ? 'text-green-600' : 'text-red-600')
                }`}>
                  {isIndependentOwner
                    ? '100%' // Always 100% for independent owners
                    : (selectedOwnerFee + Math.max(0, 100 - selectedOwnerFee - platformFee) + platformFee).toFixed(0)
                  }%
                </span>
              </div>

              {!isIndependentOwner && (100 - selectedOwnerFee - platformFee) < 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    A soma das taxas excede 100%. Por favor, reduza a taxa do proprietário.
                  </AlertDescription>
                </Alert>
              )}

              {/* Visual Split Bar */}
              <div className="space-y-2">
                <Label>Distribuição da Divisão (Baseado em {formatCurrency(exampleRent)} de aluguel)</Label>
                <div className="h-10 rounded-lg overflow-hidden flex shadow-inner">
                  <div
                    className="bg-blue-500 flex items-center justify-center text-white text-sm font-medium transition-all"
                    style={{ width: `${isIndependentOwner ? (100 - platformFee) : selectedOwnerFee}%` }}
                  >
                    {(isIndependentOwner ? (100 - platformFee) : selectedOwnerFee) > 15 && `${isIndependentOwner ? (100 - platformFee).toFixed(1) : selectedOwnerFee}%`}
                  </div>
                  {isAgencyAdmin && (
                    <div
                      className="bg-green-500 flex items-center justify-center text-white text-sm font-medium transition-all"
                      style={{ width: `${Math.max(0, 100 - selectedOwnerFee - platformFee)}%` }}
                    >
                      {(100 - selectedOwnerFee - platformFee) > 15 && `${(100 - selectedOwnerFee - platformFee).toFixed(1)}%`}
                    </div>
                  )}
                  <div
                    className="bg-orange-500 flex items-center justify-center text-white text-sm font-medium transition-all"
                    style={{ width: `${platformFee}%` }}
                  >
                    {platformFee > 5 && `${platformFee}%`}
                  </div>
                </div>
                <div className={`flex ${isAgencyAdmin ? 'justify-between' : 'justify-around'} text-xs text-muted-foreground`}>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    {isIndependentOwner ? 'Você' : 'Proprietário'} ({isIndependentOwner ? (100 - platformFee).toFixed(1) : selectedOwnerFee}%)
                  </span>
                  {isAgencyAdmin && (
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      Agência ({Math.max(0, 100 - selectedOwnerFee - platformFee).toFixed(1)}%)
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    Plataforma ({platformFee}%)
                  </span>
                </div>
              </div>

              {/* Save button only for Agency Admin, not for Independent Owner */}
              {isAgencyAdmin && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveOwnerFee}
                    disabled={savingOwnerFee || (100 - selectedOwnerFee - platformFee) < 0}
                    className="gap-2"
                  >
                    {savingOwnerFee ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {savingOwnerFee ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Agency Commission - Editable */}
              <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-green-600" />
                    <Label className="text-base font-medium">Comissão da Agência (%) - Editável</Label>
                  </div>
                  <span className="text-xl font-bold text-green-700">
                    {formatCurrency((exampleRent * agencyFee) / 100)}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Slider
                      value={[agencyFee]}
                      onValueChange={(value) => setAgencyFee(value[0])}
                      max={100 - platformFee}
                      min={0}
                      step={0.5}
                      disabled={!canUpdateSplit}
                      className="cursor-pointer"
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      value={agencyFee}
                      onChange={(e) => setAgencyFee(parseFloat(e.target.value) || 0)}
                      min={0}
                      max={100 - platformFee}
                      step={0.5}
                      disabled={!canUpdateSplit}
                      className="text-center"
                    />
                  </div>
                </div>

                {canUpdateSplit && (
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <span className="inline-block w-3 h-3">&#10003;</span>
                    Você pode ajustar este valor para definir sua porcentagem de comissão
                  </p>
                )}
              </div>

              {/* Owner Payment - Calculated */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-600" />
                    <Label className="text-base font-medium">Pagamento do Proprietário (%) - Calculado</Label>
                  </div>
                  <span className="text-xl font-bold">
                    {formatCurrency((exampleRent * ownerFee) / 100)}
                  </span>
                </div>

                <Input
                  type="number"
                  value={ownerFee.toFixed(1)}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />

                <p className="text-xs text-muted-foreground mt-2">
                  Calculado automaticamente: 100% - Sua Comissão - Taxa da Plataforma
                </p>
              </div>

              {/* Platform Fee - Editable by CEO */}
              <div className={`p-4 border rounded-lg ${isCeo ? 'bg-orange-50 border-orange-200' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isCeo ? (
                      <Building2 className="w-5 h-5 text-orange-600" />
                    ) : (
                      <Lock className="w-5 h-5 text-gray-600" />
                    )}
                    <Label className="text-base font-medium">
                      Taxa da Plataforma (%) - {isCeo ? 'Editável pelo CEO' : 'Definida pelo CEO'}
                    </Label>
                  </div>
                  <span className={`text-xl font-bold ${isCeo ? 'text-orange-700' : ''}`}>
                    {formatCurrency((exampleRent * platformFee) / 100)}
                  </span>
                </div>

                {isCeo ? (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Slider
                          value={[platformFeeValue]}
                          onValueChange={(value) => setPlatformFeeValue(value[0])}
                          max={50}
                          min={0}
                          step={0.5}
                          className="cursor-pointer"
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          value={platformFeeValue}
                          onChange={(e) => setPlatformFeeValue(parseFloat(e.target.value) || 0)}
                          min={0}
                          max={50}
                          step={0.5}
                          className="text-center"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-orange-600 flex items-center gap-1">
                        <span className="inline-block w-3 h-3">&#10003;</span>
                        Como CEO, você pode ajustar a taxa da plataforma
                      </p>
                      <Button
                        onClick={handleSavePlatformFee}
                        disabled={savingPlatformFee}
                        size="sm"
                        variant="outline"
                        className="gap-2"
                      >
                        {savingPlatformFee ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        {savingPlatformFee ? 'Salvando...' : 'Salvar Taxa'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Input
                      type="number"
                      value={platformFee}
                      disabled
                      className="bg-muted cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Esta taxa é definida pelo CEO da plataforma e não pode ser alterada no nível da agência
                    </p>
                  </>
                )}
              </div>

              {/* Total Percentage */}
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-lg font-semibold">Porcentagem Total</span>
                <span className={`text-2xl font-bold ${
                  platformFee + agencyFee + ownerFee === 100 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(platformFee + agencyFee + ownerFee).toFixed(0)}%
                </span>
              </div>

              {ownerFee < 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    A soma das taxas excede 100%. Por favor, reduza a comissão da agência.
                  </AlertDescription>
                </Alert>
              )}

              {/* Visual Split Bar */}
              <div className="space-y-2">
                <Label>Distribuição da Divisão (Baseado em {formatCurrency(exampleRent)} de aluguel)</Label>
                <div className="h-10 rounded-lg overflow-hidden flex shadow-inner">
                  <div
                    className="bg-green-500 flex items-center justify-center text-white text-sm font-medium transition-all"
                    style={{ width: `${agencyFee}%` }}
                  >
                    {agencyFee > 8 && `${agencyFee}%`}
                  </div>
                  <div
                    className="bg-blue-500 flex items-center justify-center text-white text-sm font-medium transition-all"
                    style={{ width: `${Math.max(0, ownerFee)}%` }}
                  >
                    {ownerFee > 8 && `${ownerFee.toFixed(1)}%`}
                  </div>
                  <div
                    className="bg-orange-500 flex items-center justify-center text-white text-sm font-medium transition-all"
                    style={{ width: `${platformFee}%` }}
                  >
                    {platformFee > 5 && `${platformFee}%`}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    Agência ({agencyFee}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    Proprietário ({ownerFee.toFixed(1)}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    Plataforma ({platformFee}%)
                  </span>
                </div>
              </div>

              {!canUpdateSplit && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    Você não tem permissão para modificar a configuração de divisão. Entre em contato com o administrador.
                  </AlertDescription>
                </Alert>
              )}

              {canUpdateSplit && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={saving || ownerFee < 0}
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
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Info Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Importantes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Quando a divisão é aplicada?</h4>
              <p className="text-sm text-muted-foreground">
                A divisão é aplicada automaticamente quando um pagamento de aluguel é registrado e confirmado no sistema.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Posso ter taxas diferentes por imóvel?</h4>
              <p className="text-sm text-muted-foreground">
                Sim! Você pode configurar uma taxa específica para cada imóvel na página de detalhes do imóvel.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">E os tipos de cobrança separados?</h4>
              <p className="text-sm text-muted-foreground">
                Aluguel, taxas de excesso e taxas operacionais são rastreados separadamente para facilitar reembolsos e contabilidade.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Como vejo os valores recebidos?</h4>
              <p className="text-sm text-muted-foreground">
                Acesse a página de Pagamentos para ver o histórico de pagamentos e a divisão para cada parte.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}

export default SplitConfiguration;
