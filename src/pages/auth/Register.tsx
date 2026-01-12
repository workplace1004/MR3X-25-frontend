import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Shield,
  User,
  Building2,
  MapPin,
  Phone,
  FileText,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  BadgeCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '../../api/auth';
import { DocumentInput } from '@/components/ui/document-input';
import { CEPInput } from '@/components/ui/cep-input';
import { validateDocument, isValidCEPFormat } from '@/lib/validation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';

type Step = 'email' | 'code' | 'details';

const steps: { id: Step; title: string; icon: React.ElementType }[] = [
  { id: 'email', title: 'Email', icon: Mail },
  { id: 'code', title: 'Verificação', icon: Shield },
  { id: 'details', title: 'Dados', icon: User },
];

export function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'INDEPENDENT_OWNER',
    plan: 'FREE',
    phone: '',
    document: '',
    creci: '',
    address: '',
    cep: '',
    neighborhood: '',
    city: '',
    state: '',
    agencyName: '',
    agencyCnpj: '',
    representativeName: '',
    representativeDocument: '',
  });
  const [step, setStep] = useState<Step>('email');
  const [requestId, setRequestId] = useState<string>('');
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState<number>(0);
  const [requesting, setRequesting] = useState<boolean>(false);
  const [registrationToken, setRegistrationToken] = useState<string>('');

  useEffect(() => {
    if (step !== 'code') return;
    const timer = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCEPData = useCallback((data: any) => {
    setFormData(prev => ({
      ...prev,
      address: data.logradouro || data.street || prev.address,
      neighborhood: data.bairro || data.neighborhood || prev.neighborhood,
      city: data.cidade || data.city || prev.city,
      state: data.estado || data.state || prev.state,
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (step === 'email') {
        setRequesting(true);
        const result = await authApi.requestEmailCode(formData.email);
        setRequestId(result.requestId);
        setCooldown(result.cooldownSeconds || 60);
        setStep('code');

        if ((result as any).debugCode) {
          console.log(`🔑 Verification code: ${(result as any).debugCode}`);
        }
        toast.success('Código enviado para seu email');
      } else if (step === 'code') {
        setLoading(true);
        const res = await authApi.confirmEmailCode(requestId, code);
        setRegistrationToken(res.registrationToken);
        setStep('details');
        toast.success('Email verificado com sucesso!');
      } else {
        if (formData.password !== formData.confirmPassword) {
          toast.error('As senhas não coincidem');
          return;
        }
        if (formData.password.length < 6) {
          toast.error('A senha deve ter pelo menos 6 caracteres');
          return;
        }

        const docResult = validateDocument(formData.document);
        if (!docResult.isValid) {
          toast.error(docResult.error || 'Documento inválido (CPF/CNPJ)');
          return;
        }
        if (!isValidCEPFormat(formData.cep)) {
          toast.error('CEP inválido');
          return;
        }

        if (!formData.creci || formData.creci.trim().length < 3) {
          toast.error('CRECI do Corretor é obrigatório');
          return;
        }

        if (formData.role === 'AGENCY_ADMIN') {
          if (!formData.agencyName || !formData.agencyCnpj) {
            toast.error('Nome da agência e CNPJ são obrigatórios para proprietários de agência');
            return;
          }

          const agencyCnpjResult = validateDocument(formData.agencyCnpj);
          if (!agencyCnpjResult.isValid) {
            toast.error(agencyCnpjResult.error || 'CNPJ da agência inválido');
            return;
          }

          if (!formData.representativeName || !formData.representativeDocument) {
            toast.error('Nome e documento do representante legal são obrigatórios');
            return;
          }

          const representativeDocResult = validateDocument(formData.representativeDocument);
          if (!representativeDocResult.isValid) {
            toast.error(representativeDocResult.error || 'CPF do representante inválido');
            return;
          }
        }

        setLoading(true);
        await authApi.completeRegistration({
          registrationToken: registrationToken,
          password: formData.password,
          role: formData.role,
          plan: formData.plan,
          name: formData.name,
          phone: formData.phone,
          document: formData.document,
          creci: formData.creci,
          address: formData.address,
          cep: formData.cep,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
          agencyName: formData.agencyName || undefined,
          agencyCnpj: formData.agencyCnpj || undefined,
          representativeName: formData.representativeName || undefined,
          representativeDocument: formData.representativeDocument || undefined,
        });
        toast.success('Conta criada com sucesso! Faça login para continuar.');
        navigate('/auth/login');
      }
    } catch (error: any) {
      console.error('Register flow error:', error);
      toast.error(error.response?.data?.message || error.message || 'Erro no registro');
    } finally {
      setLoading(false);
      if (step === 'email') setRequesting(false);
    }
  };

  const handleResendCode = async () => {
    try {
      const result = await authApi.requestEmailCode(formData.email);
      setRequestId(result.requestId);
      setCooldown(result.cooldownSeconds || 60);

      if ((result as any).debugCode) {
        console.log(`🔑 Verification code: ${(result as any).debugCode}`);
      }
      toast.success('Código reenviado com sucesso!');
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Falha ao reenviar');
    }
  };

  const currentStepIndex = steps.findIndex(s => s.id === step);

  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4 py-6 sm:py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">MR3X</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestão de Aluguéis</p>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            {steps.map((s, index) => {
              const Icon = s.icon;
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div key={s.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300",
                        isCompleted && "bg-primary text-primary-foreground",
                        isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                        !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                      ) : (
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                      )}
                    </div>
                    <span className={cn(
                      "text-xs mt-1.5 font-medium hidden sm:block",
                      isCurrent ? "text-primary" : "text-muted-foreground"
                    )}>
                      {s.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "w-8 sm:w-12 h-0.5 mx-2 transition-all duration-300",
                      index < currentStepIndex ? "bg-primary" : "bg-muted"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl sm:text-2xl">
              {step === 'email' && 'Criar Conta'}
              {step === 'code' && 'Verificar Email'}
              {step === 'details' && 'Complete seu Cadastro'}
            </CardTitle>
            <CardDescription className="text-sm">
              {step === 'email' && 'Comece inserindo seu endereço de email'}
              {step === 'code' && `Digite o código de 6 dígitos enviado para ${formData.email}`}
              {step === 'details' && 'Preencha suas informações para finalizar'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 'email' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        autoComplete="email"
                        className="pl-10"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={requesting || !formData.email}
                  >
                    {requesting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        Continuar
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}

              {step === 'code' && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center space-y-4">
                    <InputOTP
                      maxLength={6}
                      value={code}
                      onChange={setCode}
                      className="justify-center"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="w-11 h-12 sm:w-12 sm:h-14 text-lg" />
                        <InputOTPSlot index={1} className="w-11 h-12 sm:w-12 sm:h-14 text-lg" />
                        <InputOTPSlot index={2} className="w-11 h-12 sm:w-12 sm:h-14 text-lg" />
                        <InputOTPSlot index={3} className="w-11 h-12 sm:w-12 sm:h-14 text-lg" />
                        <InputOTPSlot index={4} className="w-11 h-12 sm:w-12 sm:h-14 text-lg" />
                        <InputOTPSlot index={5} className="w-11 h-12 sm:w-12 sm:h-14 text-lg" />
                      </InputOTPGroup>
                    </InputOTP>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        Não recebeu o código?{' '}
                        <button
                          type="button"
                          disabled={cooldown > 0}
                          onClick={handleResendCode}
                          className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          Reenviar {cooldown > 0 ? `(${cooldown}s)` : ''}
                        </button>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep('email')}
                      className="flex-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Voltar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={loading || code.length !== 6}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        <>
                          Verificar
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {step === 'details' && (
                <div className="space-y-6 max-h-[60vh] overflow-y-auto px-1 -mx-1">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
                      <User className="w-4 h-4 text-primary" />
                      Informações Pessoais
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input
                          id="name"
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          autoComplete="name"
                          placeholder="Seu nome completo"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email-readonly">Email</Label>
                        <Input
                          id="email-readonly"
                          type="email"
                          value={formData.email}
                          disabled
                          className="opacity-60"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Tipo de Conta</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de conta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INDEPENDENT_OWNER">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>Proprietário Independente</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="AGENCY_ADMIN">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              <span>Diretor de Agência</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {formData.role === 'INDEPENDENT_OWNER' &&
                          'Gerencie seus próprios imóveis, inquilinos e contratos.'}
                        {formData.role === 'AGENCY_ADMIN' &&
                          'Crie sua imobiliária e gerencie corretores, imóveis e inquilinos.'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
                      <Shield className="w-4 h-4 text-primary" />
                      Segurança
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <PasswordInput
                        id="password"
                        label="Senha"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        autoComplete="new-password"
                        placeholder="Digite a senha"
                        showStrengthIndicator={true}
                      />

                      <PasswordInput
                        id="confirmPassword"
                        label="Confirmar Senha"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        autoComplete="new-password"
                        placeholder="Confirme a senha"
                        showStrengthIndicator={false}
                        showGenerateButton={false}
                        error={formData.confirmPassword && formData.password !== formData.confirmPassword ? 'As senhas não coincidem' : undefined}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
                      <Phone className="w-4 h-4 text-primary" />
                      Contato e Documentos
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            autoComplete="tel"
                            className="pl-10"
                            placeholder="(11) 99999-9999"
                          />
                        </div>
                      </div>

                      <DocumentInput
                        id="personal-document"
                        value={formData.document}
                        onChange={(value) => setFormData(prev => ({ ...prev, document: value }))}
                        label="CPF/CNPJ"
                        placeholder="000.000.000-00"
                        showValidation={true}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="creci">
                        CRECI do Corretor <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="creci"
                          type="text"
                          name="creci"
                          value={formData.creci}
                          onChange={handleChange}
                          required
                          className="pl-10"
                          placeholder="123456/SP-F"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Obrigatório por lei (Lei 6.530/78). Formato: 123456/SP ou CRECI/SP 123456
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      Endereço
                    </div>

                    <CEPInput
                      value={formData.cep}
                      onChange={(value) => setFormData(prev => ({ ...prev, cep: value }))}
                      onCEPData={handleCEPData}
                      label="CEP"
                      placeholder="00000-000"
                    />

                    <div className="space-y-2">
                      <Label htmlFor="address">Logradouro</Label>
                      <Input
                        id="address"
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Rua, Avenida, etc."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        type="text"
                        name="neighborhood"
                        value={formData.neighborhood}
                        onChange={handleChange}
                        placeholder="Centro"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade</Label>
                        <Input
                          id="city"
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="São Paulo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado</Label>
                        <Input
                          id="state"
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          placeholder="SP"
                        />
                      </div>
                    </div>
                  </div>

                  {formData.role === 'AGENCY_ADMIN' && (
                    <>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
                          <Building2 className="w-4 h-4 text-primary" />
                          Informações da Agência
                        </div>
                        <p className="text-xs text-muted-foreground">
                          As informações da agência serão criadas automaticamente com base nos seus dados.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="agencyName">
                              Nome da Agência <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="agencyName"
                              type="text"
                              name="agencyName"
                              value={formData.agencyName}
                              onChange={handleChange}
                              required
                              placeholder="Ex: Imobiliária Central"
                            />
                          </div>

                          <DocumentInput
                            id="agency-cnpj"
                            value={formData.agencyCnpj}
                            onChange={(value) => setFormData(prev => ({ ...prev, agencyCnpj: value }))}
                            label="CNPJ da Agência"
                            placeholder="00.000.000/0000-00"
                            showValidation={true}
                          />
                        </div>

                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
                          <FileText className="w-4 h-4 text-primary" />
                          Representante Legal
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="representativeName">
                              Nome do Representante <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="representativeName"
                              type="text"
                              name="representativeName"
                              value={formData.representativeName}
                              onChange={handleChange}
                              required
                              placeholder="Ex: João da Silva"
                            />
                          </div>

                          <DocumentInput
                            id="representative-document"
                            value={formData.representativeDocument}
                            onChange={(value) => setFormData(prev => ({ ...prev, representativeDocument: value }))}
                            label="CPF do Representante"
                            placeholder="000.000.000-00"
                            showValidation={true}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Dados do representante legal para uso nos contratos.
                        </p>
                      </div>
                    </>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Criar Conta
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/auth/login"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Já tem uma conta?{' '}
                <span className="font-medium text-primary">Faça login</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6 px-4">
          Ao criar uma conta, você concorda com nossos{' '}
          <Link to="/terms" className="text-primary hover:underline">
            Termos de Uso e Política de Privacidade
          </Link>
          .
        </p>
      <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border/50">
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          <strong>MR3X</strong> é uma plataforma de tecnologia para gestão de aluguéis e não presta serviços jurídicos, advocatícios ou de intermediação judicial.
        </p>
      </div>
      </div>
      
    </div>
  );
}
