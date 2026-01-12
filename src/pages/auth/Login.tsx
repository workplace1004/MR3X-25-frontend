import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, LogIn, Loader2, UserPlus, AlertTriangle, ShieldX, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading } = useAuth();

  // Frozen user modal state
  const [showFrozenModal, setShowFrozenModal] = useState(false);
  const [frozenMessage, setFrozenMessage] = useState('');

  // General login error modal state
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);

      const message = error?.response?.data?.message || error.message || 'Erro ao fazer login';

      // Check if the error is related to frozen user
      if (message.startsWith('FROZEN_USER:')) {
        const reason = message.replace('FROZEN_USER:', '').trim();
        setFrozenMessage(reason || 'Sua conta foi congelada.');
        setShowFrozenModal(true);
      } else {
        // Show general error modal for other login failures
        setErrorMessage(message);
        setShowErrorModal(true);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4 py-6 sm:py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary">MR3X</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestão de Aluguéis</p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl sm:text-2xl">Bem-vindo de volta</CardTitle>
            <CardDescription className="text-sm">
              Entre com suas credenciais para acessar sua conta
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="pl-10"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pl-10 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || !email || !password}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Entrar
                  </>
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                asChild
              >
                <Link to="/auth/register">
                  <UserPlus className="w-4 h-4" />
                  Criar nova conta
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Sistema de Gestão de Aluguéis
        </p>
        
        <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border/50">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            <strong>MR3X</strong> é uma plataforma de tecnologia para gestão de aluguéis e não presta serviços jurídicos, advocatícios ou de intermediação judicial.
          </p>
        </div>
      </div>

      {/* Frozen User Modal */}
      <Dialog open={showFrozenModal} onOpenChange={setShowFrozenModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <ShieldX className="h-8 w-8 text-red-600" />
            </div>
            <DialogTitle className="text-xl text-red-600">Conta Congelada</DialogTitle>
            <DialogDescription className="text-center pt-2">
              Sua conta foi temporariamente suspensa e você não pode acessar o sistema no momento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-800">Motivo do congelamento:</p>
                  <p className="text-sm text-red-700 mt-1">{frozenMessage}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <p className="text-sm text-blue-800">
                <strong>O que fazer agora?</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>Entre em contato com o administrador da sua agência</li>
                <li>Verifique se há pendências ou pagamentos em aberto</li>
                <li>Aguarde a regularização da sua situação</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button
              variant="outline"
              onClick={() => setShowFrozenModal(false)}
              className="w-full sm:w-auto"
            >
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* General Login Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <DialogTitle className="text-xl text-red-600">Falha no Login</DialogTitle>
            <DialogDescription className="text-center pt-2">
              Não foi possível acessar sua conta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-800">Erro:</p>
                  <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-amber-800">
                <strong>Sugestões:</strong>
              </p>
              <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                <li>Verifique se o email está correto</li>
                <li>Verifique se a senha está correta</li>
                <li>Caso tenha esquecido a senha, clique em "Esqueceu a senha?"</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button
              variant="outline"
              onClick={() => setShowErrorModal(false)}
              className="w-full sm:w-auto"
            >
              Tentar Novamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
