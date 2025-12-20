import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';
import { toast } from 'sonner';

export interface User {
  id: string;
  email: string;
  role: string;
  plan: string;
  name?: string;
  agencyId?: string;
  brokerId?: string;
  creci?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  register: (data: any) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PERMISSIONS: Record<string, string[]> = {
  
  CEO: [
    'dashboard:read',

    'users:read', 'users:create', 'users:update', 'users:delete',
    'agencies:read',
    'properties:read',
    'contracts:read',
    'payments:read',
    'reports:read',
    'audit:read',
    'documents:read',
    'notifications:read',
    'chat:read', 'chat:create', 'chat:update', 'chat:delete',

    'settings:read', 'settings:update', 
    'billing:read', 'billing:update', 
    'integrations:read', 'integrations:create', 'integrations:update', 'integrations:delete', 
    'plans:read', 'plans:update', 
  ],
  
  ADMIN: [
    'dashboard:read',
    'users:read', 'users:create', 'users:update', 'users:delete', 
    'agencies:read', 'agencies:create', 'agencies:update', 'agencies:delete',
    'reports:read', 'reports:export',
    'chat:read', 'chat:create', 'chat:update',
    'notifications:read', 'notifications:create',
    'audit:read', 'audit:create',
    'documents:read', 'documents:create',
    'settings:read', 'settings:update',
    'billing:read', 'billing:update',
    'integrations:read', 'integrations:create', 'integrations:update', 'integrations:delete',
    'plans:read', 'plans:update', 
  ],
  
  PLATFORM_MANAGER: [
    'dashboard:read', 
    'agencies:read', 
    'reports:read', 'reports:export', 
    'chat:read', 'chat:create', 'chat:update', 
    'notifications:read', 'notifications:create', 
    'audit:read', 
    'documents:read', 
    'settings:read', 
    'billing:read', 
    
  ],
  
  AGENCY_ADMIN: [
    'dashboard:read',
    
    'users:read', 'users:create', 'users:update', 'users:delete',
    
    'agencies:read', 'agencies:update',
    
    'properties:read', 'properties:create', 'properties:update', 'properties:delete',
    
    'contracts:read', 'contracts:create', 'contracts:update', 'contracts:delete', 'contracts:approve',
    
    'payments:read', 'payments:create', 'payments:update', 'payments:delete', 'payments:approve',
    
    'reports:read', 'reports:create', 'reports:export',
    
    'chat:read', 'chat:create', 'chat:update', 'chat:delete',
    
    'notifications:read', 'notifications:create', 'notifications:update', 'notifications:delete',
    
    'audit:read',
    
    'documents:read', 'documents:create', 'documents:update',
    
    'settings:read', 'settings:update',
    
    'billing:read',
    
    'integrations:read', 'integrations:update',
  ],
  
  AGENCY_MANAGER: [
    'dashboard:read',
    
    'users:read', 'users:create', 'users:update',
    
    'agencies:read',
    
    'properties:read', 'properties:create', 'properties:update',
    
    'contracts:read', 'contracts:create', 'contracts:update',
    
    'payments:read', 'payments:create', 'payments:update',
    
    'reports:read', 'reports:export',
    
    'chat:read', 'chat:create', 'chat:update',
    'notifications:read', 'notifications:create', 'notifications:update',
    
    'documents:read', 'documents:create', 'documents:update',
    
    'settings:read',
    
    'billing:read',
  ],
  BROKER: [
    'dashboard:read',
    'users:read',
    'properties:read', 'properties:create', 'properties:update',
    'contracts:read', 'contracts:create', 'contracts:update',
    'payments:read', 'payments:create', 'payments:update',
    'reports:read', 'reports:export',
    'chat:read', 'chat:create', 'chat:update', 'chat:delete',
    'notifications:read', 'notifications:create', 'notifications:update',
    'settings:read', 'settings:update',
  ],
  
  PROPRIETARIO: [
    'dashboard:read',
    'properties:read', 
    'contracts:read', 
    'payments:read', 'payments:create', 
    'reports:read', 'reports:export',
    'chat:read', 'chat:create', 'chat:update',
    'notifications:read',
    'settings:read', 'settings:update',
  ],
  
  INDEPENDENT_OWNER: [
    'dashboard:read',
    
    'users:read', 'users:create', 'users:update', 'users:delete',
    
    'properties:read', 'properties:create', 'properties:update', 'properties:delete',
    
    'contracts:read', 'contracts:create', 'contracts:update', 'contracts:delete',
    
    'payments:read', 'payments:create', 'payments:update', 'payments:delete',
    
    'reports:read', 'reports:export',
    
    'chat:read', 'chat:create', 'chat:update',
    
    'notifications:read', 'notifications:create', 'notifications:update',
    
    'documents:read', 'documents:create', 'documents:update',
    
    'settings:read', 'settings:update',
    
    'billing:read',
    
    'integrations:read', 'integrations:update',
  ],
  
  INQUILINO: [
    'dashboard:read',
    'properties:read', 
    'contracts:read', 
    'payments:read', 'payments:create', 
    'reports:read',
    'chat:read', 'chat:create', 
    'notifications:read',
    'settings:read',
  ],
  BUILDING_MANAGER: [
    'dashboard:read',
    'properties:read',
    'contracts:read',
    'payments:read',
    'reports:read', 'reports:export',
    'chat:read', 'chat:create', 'chat:update',
    'notifications:read', 'notifications:create', 'notifications:update',
    'settings:read', 'settings:update',
  ],
  LEGAL_AUDITOR: [
    'dashboard:read',
    'properties:read',
    'contracts:read',
    'payments:read',
    'reports:read', 'reports:export',
    'audit:read', 'audit:create',
    'settings:read',
  ],
  REPRESENTATIVE: [
    'dashboard:read',
    'users:read',
    'agencies:read',
    'reports:read', 'reports:export',
    'settings:read', 'settings:update',
  ],
  API_CLIENT: [
    'properties:read',
    'contracts:read',
    'payments:read',
    'reports:read',
  ],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: storeUser, setAuth, clearAuth, isAuthenticated: storeIsAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);

  const user: User | null = storeUser ? {
    id: storeUser.id,
    email: storeUser.email,
    role: storeUser.role,
    plan: storeUser.plan,
    name: storeUser.name,
    agencyId: storeUser.agencyId,
    creci: storeUser.creci,
  } : null;

  const isAuthenticated = storeIsAuthenticated;

  const getUserPermissions = (role: string): string[] => {
    return ROLE_PERMISSIONS[role] || [];
  };

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    const permissions = getUserPermissions(user.role);
    return permissions.includes(permission);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token && !storeUser) {
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(() => {
      initAuth();
    }, 100);

    return () => clearTimeout(timeout);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await authApi.login({ email, password });
      setAuth(response.user, response.accessToken, response.refreshToken);
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      // Don't show toast - let Login component show modal instead
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      toast.success('Logout realizado com sucesso!');
    }
  };

  const logoutAll = async () => {
    try {
      await authApi.logoutAll();
    } catch (error) {
      console.error('Logout all error:', error);
    } finally {
      clearAuth();
      toast.success('Logout de todos os dispositivos realizado com sucesso!');
    }
  };

  const register = async (data: any) => {
    try {
      setLoading(true);
      await authApi.register(data);
      toast.success('Conta criada com sucesso! Faça login para continuar.');
    } catch (error: any) {
      const message = error?.response?.data?.message || error.message || 'Erro ao criar conta';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      await authApi.forgotPassword(email);
      toast.success('Email de recuperação enviado!');
    } catch (error: any) {
      const message = error?.response?.data?.message || error.message || 'Erro ao enviar email de recuperação';
      toast.error(message);
      throw error;
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      await authApi.resetPassword(token, token, newPassword);
      toast.success('Senha redefinida com sucesso!');
    } catch (error: any) {
      const message = error?.response?.data?.message || error.message || 'Erro ao redefinir senha';
      toast.error(message);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    logoutAll,
    register,
    forgotPassword,
    resetPassword,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
