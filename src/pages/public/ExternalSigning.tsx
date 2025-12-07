import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { SignatureCapture } from '../../components/contracts/SignatureCapture';
import { useGeolocation } from '../../hooks/use-geolocation';
import {
  FileText,
  MapPin,
  User,
  Calendar,
  DollarSign,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Navigation,
} from 'lucide-react';
import { formatDate, formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL;

export function ExternalSigning() {
  const { linkToken } = useParams<{ linkToken: string }>();
  const navigate = useNavigate();

  const [signature, setSignature] = useState<string | null>(null);
  const [geoConsent, setGeoConsent] = useState(false);
  const [witnessName, setWitnessName] = useState('');
  const [witnessDocument, setWitnessDocument] = useState('');

  const geolocation = useGeolocation({ enableHighAccuracy: true });

  // Fetch contract data
  const { data, isLoading, error } = useQuery({
    queryKey: ['signing-data', linkToken],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/sign/${linkToken}`);
      return response.data.data;
    },
    enabled: !!linkToken,
    retry: false,
  });

  // Request geolocation when consent is given
  useEffect(() => {
    if (geoConsent && !geolocation.hasLocation && !geolocation.loading) {
      geolocation.getLocation().catch(() => {
        toast.error('Não foi possível obter sua localização. Por favor, verifique as permissões do navegador.');
      });
    }
  }, [geoConsent, geolocation]);

  // Submit signature mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!signature) throw new Error('Assinatura é obrigatória');
      if (!geolocation.latitude || !geolocation.longitude) {
        throw new Error('Geolocalização é obrigatória');
      }
      if (!geoConsent) throw new Error('Consentimento de geolocalização é obrigatório');

      const payload: any = {
        signature,
        geoLat: geolocation.latitude,
        geoLng: geolocation.longitude,
        geoConsent,
      };

      if (data?.signerType === 'witness') {
        if (!witnessName.trim()) throw new Error('Nome da testemunha é obrigatório');
        if (!witnessDocument.trim()) throw new Error('Documento da testemunha é obrigatório');
        payload.witnessName = witnessName;
        payload.witnessDocument = witnessDocument;
      }

      const response = await axios.post(`${API_URL}/sign/${linkToken}/submit`, payload);
      return response.data;
    },
    onSuccess: (result) => {
      toast.success('Assinatura registrada com sucesso!');
      // Redirect to verification page
      setTimeout(() => {
        navigate(`/verify/${result.data.contractToken}`);
      }, 2000);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Erro ao registrar assinatura');
    },
  });

  const handleSubmit = () => {
    submitMutation.mutate();
  };

  const canSubmit =
    signature &&
    geoConsent &&
    geolocation.hasLocation &&
    (data?.signerType !== 'witness' || (witnessName.trim() && witnessDocument.trim()));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 sm:py-12 text-center">
            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-primary mx-auto mb-3 sm:mb-4" />
            <p className="text-sm text-muted-foreground">Carregando dados do contrato...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const errorMessage = (error as any)?.response?.data?.message || 'Link inválido ou expirado';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardContent className="py-8 sm:py-12 text-center">
            <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-red-700 mb-2">
              Link Inválido
            </h3>
            <p className="text-red-600 text-xs sm:text-sm px-4">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const signerTypeLabels: Record<string, string> = {
    tenant: 'Inquilino',
    owner: 'Imóvel',
    agency: 'Imobiliária',
    witness: 'Testemunha',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-2 sm:mb-4">
            <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
          </div>
          <h1 className="text-lg sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">
            Assinatura de Contrato
          </h1>
          <p className="text-xs sm:text-base text-muted-foreground">
            Você foi convidado para assinar um contrato
          </p>
        </div>

        {/* Signer Info */}
        <Card>
          <CardContent className="py-3 sm:py-4 px-3 sm:px-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
                <span className="font-medium text-sm truncate">{data?.signerName || data?.signerEmail}</span>
              </div>
              <Badge className="text-xs shrink-0">{signerTypeLabels[data?.signerType] || data?.signerType}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Contract Details */}
        <Card>
          <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
            <CardTitle className="text-base sm:text-lg">Detalhes do Contrato</CardTitle>
            <CardDescription className="text-xs sm:text-sm truncate">
              Token: {data?.contractToken}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
            {data?.property && (
              <div className="flex items-start gap-2 sm:gap-3">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm">Imóvel</p>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">
                    {data.property.address}
                    {data.property.neighborhood && `, ${data.property.neighborhood}`}
                    {data.property.city && ` - ${data.property.city}`}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {data?.parties && (
                <>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm">Inquilino</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{data.parties.tenant}</p>
                    </div>
                  </div>
                  {data.parties.owner && (
                    <div className="flex items-start gap-2 sm:gap-3">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm">Imóvel</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{data.parties.owner}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2 border-t">
              <div className="flex items-start gap-2 sm:gap-3">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-xs sm:text-sm">Período</p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">
                    {formatDate(data?.startDate)}
                    <br className="sm:hidden" />
                    <span className="hidden sm:inline"> a </span>
                    <span className="sm:hidden">até </span>
                    {formatDate(data?.endDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-3">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-xs sm:text-sm">Aluguel</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {formatCurrency(data?.monthlyRent || 0)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Witness Fields */}
        {data?.signerType === 'witness' && (
          <Card>
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
              <CardTitle className="text-base sm:text-lg">Dados da Testemunha</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
              <div>
                <Label htmlFor="witnessName" className="text-xs sm:text-sm">Nome Completo</Label>
                <Input
                  id="witnessName"
                  value={witnessName}
                  onChange={(e) => setWitnessName(e.target.value)}
                  placeholder="Digite seu nome completo"
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="witnessDocument" className="text-xs sm:text-sm">CPF ou RG</Label>
                <Input
                  id="witnessDocument"
                  value={witnessDocument}
                  onChange={(e) => setWitnessDocument(e.target.value)}
                  placeholder="Digite seu documento"
                  className="mt-1 text-sm"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Geolocation Status */}
        <Card>
          <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Navigation className="w-4 h-4 sm:w-5 sm:h-5" />
              Localização
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              A geolocalização é obrigatória para validar sua assinatura
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
            {geolocation.loading && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin shrink-0" />
                Obtendo localização...
              </div>
            )}
            {geolocation.error && (
              <div className="flex items-start gap-2 text-red-600 text-xs sm:text-sm">
                <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 shrink-0" />
                <span>{geolocation.error}</span>
              </div>
            )}
            {geolocation.hasLocation && (
              <div className="flex items-center gap-2 text-green-600 text-xs sm:text-sm">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                <span className="break-all">
                  Localização obtida
                  <span className="hidden sm:inline">
                    {' '}({geolocation.latitude?.toFixed(6)}, {geolocation.longitude?.toFixed(6)})
                  </span>
                </span>
              </div>
            )}
            {!geoConsent && !geolocation.hasLocation && !geolocation.loading && !geolocation.error && (
              <div className="flex items-center gap-2 text-amber-600 text-xs sm:text-sm">
                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                <span>Aguardando consentimento</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Signature */}
        <Card>
          <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              Assinatura
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Desenhe sua assinatura no campo abaixo
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
            <SignatureCapture
              onSignatureChange={setSignature}
              onGeolocationConsent={setGeoConsent}
              geolocationRequired={true}
              disabled={submitMutation.isPending}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <Card>
          <CardContent className="py-4 sm:py-6 px-3 sm:px-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="text-xs sm:text-sm text-muted-foreground">
                <p className="mb-1 sm:mb-2 font-medium">Ao assinar, você declara que:</p>
                <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 text-[11px] sm:text-sm">
                  <li>Leu e concorda com todos os termos do contrato</li>
                  <li>As informações fornecidas são verdadeiras</li>
                  <li>Autoriza o uso da sua geolocalização para verificação</li>
                </ul>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={!canSubmit || submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Registrando assinatura...</span>
                    <span className="sm:hidden">Aguarde...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Assinar Contrato
                  </>
                )}
              </Button>

              {!canSubmit && (
                <p className="text-center text-[10px] sm:text-sm text-amber-600">
                  {!signature && 'Desenhe sua assinatura. '}
                  {!geoConsent && 'Autorize a localização. '}
                  {geoConsent && !geolocation.hasLocation && 'Obtendo localização... '}
                  {data?.signerType === 'witness' && (!witnessName.trim() || !witnessDocument.trim()) &&
                    'Preencha seus dados.'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-[10px] sm:text-sm text-muted-foreground py-2 sm:py-4">
          <p>Sistema de assinatura eletrônica MR3X</p>
          <p className="hidden sm:block">Sua assinatura será registrada com data, hora, IP e geolocalização.</p>
        </div>
      </div>
    </div>
  );
}

export default ExternalSigning;
