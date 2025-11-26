import apiClient from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  document?: string;
  phone?: string;
}

export interface CompleteRegistrationRequest {
  registrationToken: string;
  password: string;
  role: string;
  plan: string;
  name: string;
  phone?: string;
  document?: string;
  address?: string;
  cep?: string;
  neighborhood?: string;
  number?: string;
  city?: string;
  state?: string;
  agencyName?: string;
  agencyCnpj?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    plan: string;
    emailVerified: boolean;
    agencyId?: string;
    agencyName?: string;
  };
}

export interface EmailCodeResponse {
  requestId: string;
  cooldownSeconds?: number;
}

export interface ConfirmCodeResponse {
  registrationToken: string;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  // Email verification for registration flow
  requestEmailCode: async (email: string): Promise<EmailCodeResponse> => {
    const response = await apiClient.post('/auth/verify-email/request', { email });
    return response.data;
  },

  confirmEmailCode: async (requestId: string, code: string): Promise<ConfirmCodeResponse> => {
    const response = await apiClient.post('/auth/verify-email/confirm', { requestId, code });
    return response.data;
  },

  completeRegistration: async (data: CompleteRegistrationRequest) => {
    const response = await apiClient.post('/auth/register/complete', data);
    return response.data;
  },

  verifyEmailRequest: async (email: string) => {
    const response = await apiClient.post('/auth/verify-email/request', { email });
    return response.data;
  },

  verifyEmailConfirm: async (email: string, code: string) => {
    const response = await apiClient.post('/auth/verify-email/confirm', { email, code });
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (email: string, code: string, newPassword: string) => {
    const response = await apiClient.post('/auth/reset-password', { email, code, newPassword });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  logoutAll: async () => {
    const response = await apiClient.post('/auth/logout-all');
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await apiClient.post('/users/change-password', { currentPassword, newPassword });
    return response.data;
  },
};
