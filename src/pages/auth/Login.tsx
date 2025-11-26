import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      // Error is already handled by the AuthContext
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-lg p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">MR3X</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Gestão de Aluguéis</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-base"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-base"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 sm:mt-6 text-center space-y-2">
            <Link
              to="/auth/register"
              className="block text-sm text-primary hover:underline font-medium"
            >
              Criar nova conta
            </Link>
            <Link
              to="/forgot-password"
              className="block text-sm text-muted-foreground hover:text-foreground"
            >
              Esqueceu a senha?
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Sistema de Gestão de Aluguéis
        </p>
      </div>
    </div>
  );
}
