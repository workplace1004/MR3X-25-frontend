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

// Role hierarchy for permission checking (reserved for future use)
// const ROLE_HIERARCHY = {
//   CEO: 10,
//   ADMIN: 9,
//   AGENCY_ADMIN: 8,
//   AGENCY_MANAGER: 7,
//   BROKER: 6,
//   INDEPENDENT_OWNER: 5.5,
//   PROPRIETARIO: 5,
//   INQUILINO: 4,
//   BUILDING_MANAGER: 3,
//   LEGAL_AUDITOR: 2,
//   REPRESENTATIVE: 1,
//   API_CLIENT: 0,
// };

/**
 * Permission Matrix for all roles
 * Based on MR3X Complete Hierarchy Requirements
 *
 * CEO: Root profile - manages platform, settings, security, admins only
 *      Does NOT participate in real estate operations
 *
 * ADMIN: SaaS administrator - manages agencies, auditors, representatives, integrations
 *        Does NOT manage properties, contracts, payments directly
 *
 * AGENCY_ADMIN: Agency director - full agency operations
 * AGENCY_MANAGER: Agency manager - manages brokers and owners
 * BROKER: Manages their own properties/contracts only
 * PROPRIETARIO: Linked to agency, limited operations
 * INDEPENDENT_OWNER: Self-managed "mini agency"
 * INQUILINO: Tenant - read-only + payments
 * BUILDING_MANAGER: Condominium manager - read-only for common areas
 * LEGAL_AUDITOR: Read-only audit access
 * REPRESENTATIVE: Sales representative
 * API_CLIENT: API access only
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  // CEO: Root profile - Can VIEW all pages but only EDIT specific things
  // Can ONLY create ADMIN users (enforced by backend)
  // Cannot: create agencies, owners, operate properties/contracts
  CEO: [
    'dashboard:read',
    // View all
    'users:read', 'users:create', 'users:update', 'users:delete', // Only ADMIN creation (backend enforced)
    'agencies:read', // View agencies
    'properties:read', // View properties
    'contracts:read', // View contracts
    'payments:read', // View payments
    'reports:read', // View reports
    'audit:read', // View audit logs
    'documents:read', // View documents
    'notifications:read', // View notifications
    'chat:read', // View chats
    // Edit only platform-level settings
    'settings:read', 'settings:update', // Global settings
    'billing:read', 'billing:update', // Platform billing
    'integrations:read', 'integrations:create', 'integrations:update', 'integrations:delete', // Internal tokens
  ],
  // ADMIN: SaaS administrator - manages agencies, internal users, integrations
  // Does NOT manage properties, contracts, payments directly
  ADMIN: [
    'dashboard:read',
    'users:read', 'users:create', 'users:update', 'users:delete', // Manager, Auditor, Representative, API Client
    'agencies:read', 'agencies:create', 'agencies:update', 'agencies:delete',
    'reports:read', 'reports:export',
    'chat:read', 'chat:create', 'chat:update',
    'notifications:read', 'notifications:create',
    'audit:read', 'audit:create',
    'documents:read', 'documents:create',
    'settings:read', 'settings:update',
    'billing:read', 'billing:update',
    'integrations:read', 'integrations:create', 'integrations:update', 'integrations:delete',
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
    'documents:read', 'documents:create',
    'settings:read', 'settings:update',
    'billing:read', 'billing:update',
    'integrations:read', 'integrations:update',
  ],
  AGENCY_MANAGER: [
    'dashboard:read',
    'users:read', 'users:create', 'users:update', 'users:delete',
    'agencies:read', 'agencies:update',
    'properties:read', 'properties:create', 'properties:update', 'properties:delete',
    'contracts:read', 'contracts:create', 'contracts:update', 'contracts:delete',
    'payments:read', 'payments:create', 'payments:update', 'payments:delete',
    'reports:read', 'reports:create', 'reports:export',
    'chat:read', 'chat:create', 'chat:update', 'chat:delete',
    'notifications:read', 'notifications:create', 'notifications:update', 'notifications:delete',
    'audit:read', 'audit:create',
    'settings:read', 'settings:update',
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
  // PROPRIETARIO: Owner linked to agency - cannot create users or contracts without agency
  // Limited operations, must go through agency for most actions
  PROPRIETARIO: [
    'dashboard:read',
    'properties:read', // Can view their properties
    'contracts:read', // Can view contracts
    'payments:read', 'payments:create', // Can view and make payments
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
    'reports:read', 'reports:create', 'reports:export',
    'chat:read', 'chat:create', 'chat:update', 'chat:delete',
    'notifications:read', 'notifications:create', 'notifications:update', 'notifications:delete',
    'documents:read', 'documents:create',
    'settings:read', 'settings:update',
    'integrations:read', 'integrations:update',
  ],
  // INQUILINO: Tenant - read-only access except for signing and payments
  // Cannot create or edit any registration
  INQUILINO: [
    'dashboard:read',
    'properties:read', // View property info
    'contracts:read', // View their contract
    'payments:read', 'payments:create', // View and make payments
    'reports:read',
    'chat:read', 'chat:create', // Can message but not delete
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

  // Map store user to context user format
  const user: User | null = storeUser ? {
    id: storeUser.id,
    email: storeUser.email,
    role: storeUser.role,
    plan: storeUser.plan,
    name: storeUser.name,
    agencyId: storeUser.agencyId,
  } : null;

  const isAuthenticated = storeIsAuthenticated;

  // Get user permissions
  const getUserPermissions = (role: string): string[] => {
    return ROLE_PERMISSIONS[role] || [];
  };

  // Check if user has specific role
  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles: string[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  // Check if user has specific permission
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    const permissions = getUserPermissions(user.role);
    return permissions.includes(permission);
  };

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token && !storeUser) {
          // Try to verify the token is still valid
          // For now, we trust the stored state
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    // Small delay to allow store hydration
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
      const message = error?.response?.data?.message || error.message || 'Erro ao fazer login';
      toast.error(message);
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
