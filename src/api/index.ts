import apiClient from './client';

// Dashboard API
export const dashboardAPI = {
  getDashboard: async () => {
    const response = await apiClient.get('/dashboard');
    return response.data;
  },

  getDueDates: async () => {
    const response = await apiClient.get('/dashboard/due-dates');
    return response.data;
  },
};

// Properties API
export const propertiesAPI = {
  getProperties: async (params?: { search?: string }) => {
    const query = params?.search ? `?search=${encodeURIComponent(params.search)}` : '';
    const response = await apiClient.get(`/properties${query}`);
    // Backend returns { data: [...], total, page, limit }, extract the data array
    return Array.isArray(response.data) ? response.data : (response.data?.data || []);
  },

  getPropertyById: async (id: string) => {
    const response = await apiClient.get(`/properties/${id}`);
    return response.data;
  },

  createProperty: async (property: any) => {
    const response = await apiClient.post('/properties', property);
    return response.data;
  },

  updateProperty: async (id: string, property: any) => {
    const response = await apiClient.put(`/properties/${id}`, property);
    return response.data;
  },

  deleteProperty: async (id: string) => {
    const response = await apiClient.delete(`/properties/${id}`);
    return response.data;
  },

  assignBroker: async (propertyId: string, brokerId: string | null) => {
    const response = await apiClient.put(`/properties/${propertyId}/assign-broker`, { brokerId });
    return response.data;
  },

  uploadPropertyImages: async (propertyId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });
    const response = await apiClient.post(`/properties/${propertyId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getPropertyImages: async (propertyId: string) => {
    const response = await apiClient.get(`/properties/${propertyId}/images`);
    return response.data;
  },

  setPrimaryImage: async (propertyId: string, imageId: string) => {
    const response = await apiClient.patch(`/properties/${propertyId}/images/${imageId}/primary`);
    return response.data;
  },

  deletePropertyImage: async (propertyId: string, imageId: string) => {
    const response = await apiClient.delete(`/properties/${propertyId}/images/${imageId}`);
    return response.data;
  },
};

// Contracts API
export const contractsAPI = {
  getContracts: async () => {
    const response = await apiClient.get('/contracts');
    // Backend returns { data: [...], total, page, limit }, extract the data array
    return Array.isArray(response.data) ? response.data : (response.data?.data || []);
  },

  getContractById: async (id: string) => {
    const response = await apiClient.get(`/contracts/${id}`);
    return response.data;
  },

  createContract: async (contract: any) => {
    const response = await apiClient.post('/contracts', contract);
    return response.data;
  },

  updateContract: async (id: string, contract: any) => {
    const response = await apiClient.put(`/contracts/${id}`, contract);
    return response.data;
  },

  deleteContract: async (id: string) => {
    const response = await apiClient.delete(`/contracts/${id}`);
    return response.data;
  },

  downloadContract: async (id: string) => {
    const response = await apiClient.get(`/contracts/download/${id}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  uploadContractPDF: async (contractId: string, pdfFile: File) => {
    const formData = new FormData();
    formData.append('contract', pdfFile);
    formData.append('contractId', contractId);
    const response = await apiClient.post('/contracts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// Contract Templates API
export const contractTemplatesAPI = {
  getTemplates: async () => {
    const response = await apiClient.get('/contract-templates');
    return response.data;
  },

  getTemplateById: async (id: string) => {
    const response = await apiClient.get(`/contract-templates/${id}`);
    return response.data;
  },

  getTemplatesByType: async (type: 'CTR' | 'ACD' | 'VST') => {
    const response = await apiClient.get(`/contract-templates/type/${type}`);
    return response.data;
  },
};

// Payments API
export const paymentsAPI = {
  getPayments: async () => {
    const response = await apiClient.get('/payments');
    return response.data;
  },

  getPaymentsByProperty: async (propertyId: string) => {
    const response = await apiClient.get(`/payments/property/${propertyId}`);
    return response.data;
  },

  createPayment: async (payment: any) => {
    const response = await apiClient.post('/payments', payment);
    return response.data;
  },

  updatePayment: async (id: string, payment: any) => {
    const response = await apiClient.put(`/payments/${id}`, payment);
    return response.data;
  },

  deletePayment: async (id: string) => {
    const response = await apiClient.delete(`/payments/${id}`);
    return response.data;
  },

  getAnnualReport: async (year?: number) => {
    const query = year ? `?year=${year}` : '';
    const response = await apiClient.get(`/payments/reports/annual${query}`);
    return response.data;
  },
};

// Users API
export const usersAPI = {
  listUsers: async (params: { search?: string; role?: string; status?: string; plan?: string; page?: number; pageSize?: number } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
    });
    const query = qs.toString();
    const response = await apiClient.get(`/users${query ? `?${query}` : ''}`);
    // Backend returns { data: [...], total, page, limit }, map to { items: [...], total }
    const result = response.data;
    return {
      items: result.data || [],
      total: result.total || 0,
      page: result.page,
      limit: result.limit,
    };
  },

  getUserById: async (id: string) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  getUserDetails: async () => {
    const response = await apiClient.get('/users/details');
    return response.data;
  },

  checkEmailExists: async (email: string) => {
    const response = await apiClient.get(`/users/check-email?email=${encodeURIComponent(email)}`);
    return response.data;
  },

  getTenants: async () => {
    const response = await apiClient.get('/users/tenants');
    return response.data;
  },

  createTenant: async (tenant: any) => {
    const response = await apiClient.post('/users/tenants', tenant);
    return response.data;
  },

  updateTenant: async (id: string, tenant: any) => {
    const response = await apiClient.put(`/users/tenants/${id}`, tenant);
    return response.data;
  },

  deleteTenant: async (id: string) => {
    const response = await apiClient.delete(`/users/tenants/${id}`);
    return response.data;
  },

  createUser: async (payload: any) => {
    const response = await apiClient.post('/users', payload);
    return response.data;
  },

  updateUser: async (id: string, payload: any) => {
    const response = await apiClient.put(`/users/${id}`, payload);
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },

  changeStatus: async (id: string, status: 'ACTIVE' | 'SUSPENDED', reason: string) => {
    const response = await apiClient.patch(`/users/${id}/status`, { status, reason });
    return response.data;
  },
};

// Chat API
export const chatAPI = {
  getChats: async () => {
    const response = await apiClient.get('/chats');
    return response.data;
  },

  getMessages: async (chatId: string) => {
    const response = await apiClient.get(`/chats/${chatId}/messages`);
    return response.data;
  },

  sendMessage: async (chatId: string, content: string) => {
    const response = await apiClient.post(`/chats/${chatId}/messages`, { content });
    return response.data;
  },

  createChat: async (participantId: string) => {
    const response = await apiClient.post('/chats', { participantId });
    return response.data;
  },

  getAvailableUsers: async () => {
    const response = await apiClient.get('/chats/available-users');
    return response.data;
  },

  deleteChat: async (chatId: string) => {
    const response = await apiClient.delete(`/chats/${chatId}`);
    return response.data;
  },

  markAsRead: async (chatId: string) => {
    const response = await apiClient.patch(`/chats/${chatId}/read`);
    return response.data;
  },
};

// Address API
export const addressAPI = {
  getByCep: async (cep: string) => {
    const response = await apiClient.get(`/validation/cep/${cep}`);
    return response.data;
  },
};

// Agencies API
export const agenciesAPI = {
  getAgencies: async () => {
    const response = await apiClient.get('/agencies');
    return response.data;
  },

  getAgencyById: async (id: string) => {
    const response = await apiClient.get(`/agencies/${id}`);
    return response.data;
  },

  createAgency: async (agency: any) => {
    const response = await apiClient.post('/agencies', agency);
    return response.data;
  },

  updateAgency: async (id: string, agency: any) => {
    const response = await apiClient.put(`/agencies/${id}`, agency);
    return response.data;
  },

  deleteAgency: async (id: string) => {
    const response = await apiClient.delete(`/agencies/${id}`);
    return response.data;
  },
};

// Plans API
export const plansAPI = {
  getPlans: async () => {
    const response = await apiClient.get('/plans');
    return response.data;
  },

  getPlanById: async (id: string) => {
    const response = await apiClient.get(`/plans/${id}`);
    return response.data;
  },

  updatePlan: async (id: string, plan: any) => {
    const response = await apiClient.put(`/plans/${id}`, plan);
    return response.data;
  },

  updatePlanByName: async (name: string, plan: any) => {
    const response = await apiClient.put(`/plans/name/${name}`, plan);
    return response.data;
  },

  updateSubscriberCounts: async () => {
    const response = await apiClient.post('/plans/update-counts');
    return response.data;
  },
};

// Notifications API
export const notificationsAPI = {
  getNotifications: async () => {
    const response = await apiClient.get('/notifications');
    return response.data;
  },

  createNotification: async (notification: any) => {
    const response = await apiClient.post('/notifications', notification);
    return response.data;
  },

  updateNotification: async (id: string, notification: any) => {
    const response = await apiClient.put(`/notifications/${id}`, notification);
    return response.data;
  },

  deleteNotification: async (id: string) => {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },
};

// Settings API
export const settingsAPI = {
  getPaymentConfig: async () => {
    const response = await apiClient.get('/settings/payment-config');
    return response.data;
  },

  updatePaymentConfig: async (config: { platformFee: number; agencyFee: number }) => {
    const response = await apiClient.put('/settings/payment-config', config);
    return response.data;
  },

  getSetting: async (key: string) => {
    const response = await apiClient.get(`/settings/${key}`);
    return response.data;
  },

  updateSetting: async (key: string, value: string, description?: string) => {
    const response = await apiClient.put(`/settings/${key}`, { value, description });
    return response.data;
  },

  getAllSettings: async () => {
    const response = await apiClient.get('/settings');
    return response.data;
  },
};

// Audit API
export const auditAPI = {
  getAuditLogs: async (params?: {
    entity?: string;
    entityId?: string;
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          qs.append(k, String(v));
        }
      });
    }
    const query = qs.toString();
    const response = await apiClient.get(`/audit${query ? `?${query}` : ''}`);
    return response.data;
  },

  getAuditLogById: async (id: string) => {
    const response = await apiClient.get(`/audit/${id}`);
    return response.data;
  },
};

// Documents API
export const documentsAPI = {
  generateReceipt: async (data: any) => {
    const response = await apiClient.post('/documents/receipt', data, {
      responseType: 'blob',
    });
    return response.data;
  },

  generateInvoice: async (data: any) => {
    const response = await apiClient.post('/documents/invoice', data, {
      responseType: 'blob',
    });
    return response.data;
  },

  generateReceiptFromPayment: async (paymentId: string) => {
    const response = await apiClient.post(`/documents/receipt/payment/${paymentId}`, null, {
      responseType: 'blob',
    });
    return response.data;
  },

  generateAutoInvoice: async (contractId: string) => {
    const response = await apiClient.post(`/documents/invoice/auto/${contractId}`, null, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export { authApi } from './auth';
export { default as apiClient } from './client';
