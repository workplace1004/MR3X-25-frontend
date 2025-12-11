import apiClient from './client';

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

export const propertiesAPI = {
  getProperties: async (params?: { search?: string }) => {
    const query = params?.search ? `?search=${encodeURIComponent(params.search)}` : '';
    const response = await apiClient.get(`/properties${query}`);
    
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

export const contractsAPI = {
  getContracts: async () => {
    const response = await apiClient.get('/contracts');
    
    return Array.isArray(response.data) ? response.data : (response.data?.data || []);
  },

  getContractById: async (id: string) => {
    const response = await apiClient.get(`/contracts/${id}`);
    return response.data;
  },

  getContractByToken: async (token: string) => {
    const response = await apiClient.get(`/contracts/token/${token}`);
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
    const response = await apiClient.get(`/contracts/${id}/final-pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadProvisionalContract: async (id: string) => {
    const response = await apiClient.get(`/contracts/${id}/provisional-pdf`, {
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

  signContract: async (id: string, data: {
    signature: string;
    signatureType: 'tenant' | 'owner' | 'agency' | 'witness';
    witnessName?: string;
    witnessDocument?: string;
  }) => {
    const response = await apiClient.post(`/contracts/${id}/sign`, data);
    return response.data;
  },

  signContractWithGeo: async (id: string, data: {
    signature: string;
    signatureType: 'tenant' | 'owner' | 'agency' | 'witness';
    geoLat: number;
    geoLng: number;
    geoConsent: boolean;
    witnessName?: string;
    witnessDocument?: string;
  }) => {
    const response = await apiClient.post(`/contracts/${id}/sign-with-geo`, data);
    return response.data;
  },

  prepareForSigning: async (id: string) => {
    const response = await apiClient.post(`/contracts/${id}/prepare-signing`);
    return response.data;
  },

  finalizeContract: async (id: string) => {
    const response = await apiClient.post(`/contracts/${id}/finalize`);
    return response.data;
  },

  downloadProvisionalPdf: async (id: string) => {
    const response = await apiClient.get(`/contracts/${id}/provisional-pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadFinalPdf: async (id: string) => {
    const response = await apiClient.get(`/contracts/${id}/final-pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  updateClauses: async (id: string, clauses: string, changeReason?: string) => {
    const response = await apiClient.put(`/contracts/${id}/clauses`, { clauses, changeReason });
    return response.data;
  },

  getClauseHistory: async (id: string) => {
    const response = await apiClient.get(`/contracts/${id}/clause-history`);
    return response.data;
  },

  sendSignatureInvitation: async (id: string, data: {
    signerType: 'tenant' | 'owner' | 'agency' | 'witness';
    signerEmail: string;
    signerName?: string;
    expiresInHours?: number;
  }) => {
    const response = await apiClient.post(`/contracts/${id}/send-invitation`, data);
    return response.data;
  },

  getSignatureLinks: async (id: string) => {
    const response = await apiClient.get(`/contracts/${id}/signature-links`);
    return response.data;
  },

  revokeSignatureLink: async (contractId: string, linkToken: string) => {
    const response = await apiClient.post(`/contracts/${contractId}/revoke-link/${linkToken}`);
    return response.data;
  },

  revokeContract: async (id: string, reason: string) => {
    const response = await apiClient.post(`/contracts/${id}/revoke`, { reason });
    return response.data;
  },

  getMyContract: async () => {
    const response = await apiClient.get('/contracts/my-contract/tenant');
    return response.data;
  },
};

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

export const usersAPI = {
  listUsers: async (params: { search?: string; role?: string; status?: string; plan?: string; page?: number; pageSize?: number; excludeCurrentUser?: boolean } = {}) => {
    const { page = 1, pageSize = 10, excludeCurrentUser = true, ...otherParams } = params;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const qs = new URLSearchParams();
    qs.append('skip', String(skip));
    qs.append('take', String(take));
    if (excludeCurrentUser) {
      qs.append('excludeCurrentUser', 'true');
    }
    Object.entries(otherParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
    });
    const query = qs.toString();
    const response = await apiClient.get(`/users${query ? `?${query}` : ''}`);
    
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

  getBrokers: async () => {
    const response = await apiClient.get('/users?role=BROKER');
    return response.data?.data || [];
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

export const addressAPI = {
  getByCep: async (cep: string) => {
    const response = await apiClient.get(`/validation/cep/${cep}`);
    return response.data;
  },
};

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

  getPlanUsage: async (id: string) => {
    const response = await apiClient.get(`/agencies/${id}/plan-usage`);
    return response.data;
  },

  getFrozenEntities: async (id: string) => {
    const response = await apiClient.get(`/agencies/${id}/frozen-entities`);
    return response.data;
  },

  previewPlanChange: async (id: string, newPlan: string) => {
    const response = await apiClient.get(`/agencies/${id}/preview-plan-change?newPlan=${newPlan}`);
    return response.data;
  },

  switchActiveProperty: async (id: string, newActivePropertyId: string) => {
    const response = await apiClient.post(`/agencies/${id}/switch-active-property`, { newActivePropertyId });
    return response.data;
  },

  enforcePlanLimits: async (id: string) => {
    const response = await apiClient.post(`/agencies/${id}/enforce-plan`);
    return response.data;
  },

  checkPropertyCreationAllowed: async (id: string) => {
    const response = await apiClient.get(`/agencies/${id}/check-property-creation`);
    return response.data;
  },

  checkUserCreationAllowed: async (id: string) => {
    const response = await apiClient.get(`/agencies/${id}/check-user-creation`);
    return response.data;
  },
};

export const plansAPI = {
  // Basic plan endpoints
  getPlans: async () => {
    const response = await apiClient.get('/plans');
    return response.data;
  },

  getPricing: async () => {
    const response = await apiClient.get('/plans/pricing');
    return response.data;
  },

  getPlanConfig: async (planName: string) => {
    const response = await apiClient.get(`/plans/config/${planName}`);
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

  // Agency usage & billing
  getAgencyUsage: async (agencyId: string) => {
    const response = await apiClient.get(`/plans/agency/${agencyId}/usage`);
    return response.data;
  },

  getUsageSummary: async (agencyId: string, month?: string) => {
    const query = month ? `?month=${month}` : '';
    const response = await apiClient.get(`/plans/agency/${agencyId}/usage-summary${query}`);
    return response.data;
  },

  getBillingHistory: async (agencyId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    const response = await apiClient.get(`/plans/agency/${agencyId}/billing-history${query}`);
    return response.data;
  },

  getPendingCharges: async (agencyId: string) => {
    const response = await apiClient.get(`/plans/agency/${agencyId}/pending-charges`);
    return response.data;
  },

  getAgencyPricing: async (agencyId: string) => {
    const response = await apiClient.get(`/plans/agency/${agencyId}/pricing`);
    return response.data;
  },

  // Plan limits & enforcement
  getFrozenSummary: async (agencyId: string) => {
    const response = await apiClient.get(`/plans/agency/${agencyId}/frozen`);
    return response.data;
  },

  getFrozenList: async (agencyId: string) => {
    const response = await apiClient.get(`/plans/agency/${agencyId}/frozen/list`);
    return response.data;
  },

  switchActiveContract: async (agencyId: string, contractId: string) => {
    const response = await apiClient.post(`/plans/agency/${agencyId}/switch-contract/${contractId}`);
    return response.data;
  },

  canCreateContract: async (agencyId: string) => {
    const response = await apiClient.get(`/plans/agency/${agencyId}/can-create-contract`);
    return response.data;
  },

  canPerformInspection: async (agencyId: string) => {
    const response = await apiClient.get(`/plans/agency/${agencyId}/can-perform-inspection`);
    return response.data;
  },

  canCreateSettlement: async (agencyId: string) => {
    const response = await apiClient.get(`/plans/agency/${agencyId}/can-create-settlement`);
    return response.data;
  },

  getScreeningPrice: async (agencyId: string) => {
    const response = await apiClient.get(`/plans/agency/${agencyId}/screening-price`);
    return response.data;
  },

  // Upgrade & downgrade
  calculateUpgrade: async (agencyId: string, targetPlan: string) => {
    const response = await apiClient.get(`/plans/agency/${agencyId}/calculate-upgrade/${targetPlan}`);
    return response.data;
  },

  previewPlanChange: async (agencyId: string, targetPlan: string) => {
    const response = await apiClient.get(`/plans/agency/${agencyId}/preview-change/${targetPlan}`);
    return response.data;
  },

  changePlan: async (agencyId: string, newPlan: string) => {
    const response = await apiClient.post(`/plans/agency/${agencyId}/change-plan`, { newPlan });
    return response.data;
  },

  // API add-on
  enableApiAddOn: async (agencyId: string) => {
    const response = await apiClient.post(`/plans/agency/${agencyId}/api-addon/enable`);
    return response.data;
  },

  disableApiAddOn: async (agencyId: string) => {
    const response = await apiClient.post(`/plans/agency/${agencyId}/api-addon/disable`);
    return response.data;
  },

  checkApiAccess: async (agencyId: string) => {
    const response = await apiClient.get(`/plans/agency/${agencyId}/api-access`);
    return response.data;
  },

  // Microtransaction charges
  chargeExtraContract: async (agencyId: string, contractId: string) => {
    const response = await apiClient.post(`/plans/agency/${agencyId}/charge/extra-contract`, { contractId });
    return response.data;
  },

  chargeInspection: async (agencyId: string, inspectionId: string) => {
    const response = await apiClient.post(`/plans/agency/${agencyId}/charge/inspection`, { inspectionId });
    return response.data;
  },

  chargeSettlement: async (agencyId: string, agreementId: string) => {
    const response = await apiClient.post(`/plans/agency/${agencyId}/charge/settlement`, { agreementId });
    return response.data;
  },

  chargeScreening: async (agencyId: string, analysisId: string) => {
    const response = await apiClient.post(`/plans/agency/${agencyId}/charge/screening`, { analysisId });
    return response.data;
  },

  markMicrotransactionPaid: async (id: string, paymentDetails?: { asaasPaymentId?: string; paymentMethod?: string }) => {
    const response = await apiClient.post(`/plans/microtransaction/${id}/mark-paid`, paymentDetails || {});
    return response.data;
  },

  resetMonthlyUsage: async (agencyId: string) => {
    const response = await apiClient.post(`/plans/agency/${agencyId}/reset-monthly-usage`);
    return response.data;
  },

  // Plan modification requests
  getPendingModificationRequests: async () => {
    const response = await apiClient.get('/plans/modification-requests/pending');
    return response.data;
  },

  getAllModificationRequests: async () => {
    const response = await apiClient.get('/plans/modification-requests');
    return response.data;
  },

  approveModificationRequest: async (id: string) => {
    const response = await apiClient.post(`/plans/modification-requests/${id}/approve`);
    return response.data;
  },

  rejectModificationRequest: async (id: string, reason?: string) => {
    const response = await apiClient.post(`/plans/modification-requests/${id}/reject`, { reason });
    return response.data;
  },

  // Legacy endpoints
  checkUserLimits: async (userId: string, type: 'property' | 'user' | 'contract') => {
    const response = await apiClient.get(`/plans/user/${userId}/limits?type=${type}`);
    return response.data;
  },

  getUserUsage: async (userId: string) => {
    const response = await apiClient.get(`/plans/user/${userId}/usage`);
    return response.data;
  },
};

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

export const inspectionsAPI = {
  getInspections: async (params?: {
    propertyId?: string;
    contractId?: string;
    type?: string;
    status?: string;
    inspectorId?: string;
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
    const response = await apiClient.get(`/inspections${query ? `?${query}` : ''}`);
    return Array.isArray(response.data) ? response.data : (response.data?.data || []);
  },

  getInspectionById: async (id: string) => {
    const response = await apiClient.get(`/inspections/${id}`);
    return response.data;
  },

  createInspection: async (inspection: any) => {
    const response = await apiClient.post('/inspections', inspection);
    return response.data;
  },

  updateInspection: async (id: string, inspection: any) => {
    const response = await apiClient.put(`/inspections/${id}`, inspection);
    return response.data;
  },

  deleteInspection: async (id: string) => {
    const response = await apiClient.delete(`/inspections/${id}`);
    return response.data;
  },

  signInspection: async (id: string, signatures: {
    tenantSignature?: string;
    ownerSignature?: string;
    agencySignature?: string;
    inspectorSignature?: string;
  }) => {
    const response = await apiClient.patch(`/inspections/${id}/sign`, signatures);
    return response.data;
  },

  // Electronic signature with geolocation
  signInspectionWithGeo: async (id: string, signerType: 'tenant' | 'owner' | 'agency' | 'inspector', data: {
    signature: string;
    geoLat: number;
    geoLng: number;
    geoConsent: boolean;
    legalDeclarationAccepted?: boolean;
  }) => {
    const response = await apiClient.post(`/inspections/${id}/sign/${signerType}`, data);
    return response.data;
  },

  getSignatureStatus: async (id: string) => {
    const response = await apiClient.get(`/inspections/${id}/signature-status`);
    return response.data;
  },

  finalizeInspection: async (id: string) => {
    const response = await apiClient.post(`/inspections/${id}/finalize`);
    return response.data;
  },

  approveInspection: async (id: string) => {
    const response = await apiClient.patch(`/inspections/${id}/approve`);
    return response.data;
  },

  rejectInspection: async (id: string, rejectionReason: string) => {
    const response = await apiClient.patch(`/inspections/${id}/reject`, { rejectionReason });
    return response.data;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/inspections/${id}/status`, { status });
    return response.data;
  },

  getStatistics: async () => {
    const response = await apiClient.get('/inspections/statistics');
    return response.data;
  },

  // PDF Generation
  downloadProvisionalPdf: async (id: string) => {
    const response = await apiClient.get(`/inspections/${id}/pdf/provisional`, {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadFinalPdf: async (id: string) => {
    const response = await apiClient.get(`/inspections/${id}/pdf/final`, {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadStoredPdf: async (id: string, type: 'provisional' | 'final') => {
    const response = await apiClient.get(`/inspections/${id}/pdf/download/${type}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Signature Links
  createSignatureLinks: async (id: string, parties: Array<{
    signerType: 'tenant' | 'owner' | 'agency' | 'inspector';
    email: string;
    name?: string;
  }>, expiresInHours?: number) => {
    const response = await apiClient.post(`/inspections/${id}/signature-links`, {
      parties,
      expiresInHours,
    });
    return response.data;
  },

  getSignatureLinks: async (id: string) => {
    const response = await apiClient.get(`/inspections/${id}/signature-links`);
    return response.data;
  },

  revokeSignatureLinks: async (id: string) => {
    const response = await apiClient.delete(`/inspections/${id}/signature-links`);
    return response.data;
  },

  getAuditLog: async (id: string) => {
    const response = await apiClient.get(`/inspections/${id}/audit-log`);
    return response.data;
  },

  // Templates
  getTemplates: async (params?: { type?: string; isDefault?: boolean }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          qs.append(k, String(v));
        }
      });
    }
    const query = qs.toString();
    const response = await apiClient.get(`/inspections/templates${query ? `?${query}` : ''}`);
    return response.data;
  },

  getTemplateById: async (id: string) => {
    const response = await apiClient.get(`/inspections/templates/${id}`);
    return response.data;
  },

  createTemplate: async (template: any) => {
    const response = await apiClient.post('/inspections/templates', template);
    return response.data;
  },

  updateTemplate: async (id: string, template: any) => {
    const response = await apiClient.put(`/inspections/templates/${id}`, template);
    return response.data;
  },

  deleteTemplate: async (id: string) => {
    const response = await apiClient.delete(`/inspections/templates/${id}`);
    return response.data;
  },

  // Media upload
  uploadMedia: async (id: string, files: File[], room?: string) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (room) formData.append('room', room);
    const response = await apiClient.post(`/inspections/${id}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getMedia: async (id: string) => {
    const response = await apiClient.get(`/inspections/${id}/media`);
    return response.data;
  },

  deleteMedia: async (inspectionId: string, mediaId: string) => {
    const response = await apiClient.delete(`/inspections/${inspectionId}/media/${mediaId}`);
    return response.data;
  },
};

// Extrajudicial Notifications API (Notificacao Extrajudicial)
export const extrajudicialNotificationsAPI = {
  getNotifications: async (params?: {
    propertyId?: string;
    contractId?: string;
    creditorId?: string;
    debtorId?: string;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    skip?: number;
    take?: number;
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
    const response = await apiClient.get(`/extrajudicial-notifications${query ? `?${query}` : ''}`);
    return response.data;
  },

  getNotificationById: async (id: string) => {
    const response = await apiClient.get(`/extrajudicial-notifications/${id}`);
    return response.data;
  },

  getNotificationByToken: async (token: string) => {
    const response = await apiClient.get(`/extrajudicial-notifications/token/${token}`);
    return response.data;
  },

  createNotification: async (notification: {
    propertyId: string;
    contractId?: string;
    agreementId?: string;
    inspectionId?: string;
    type: string;
    priority?: string;
    creditorId: string;
    creditorName: string;
    creditorDocument: string;
    creditorAddress?: string;
    creditorEmail?: string;
    creditorPhone?: string;
    debtorId: string;
    debtorName: string;
    debtorDocument: string;
    debtorAddress?: string;
    debtorEmail?: string;
    debtorPhone?: string;
    title: string;
    subject: string;
    description: string;
    legalBasis: string;
    demandedAction: string;
    principalAmount?: number;
    fineAmount?: number;
    interestAmount?: number;
    correctionAmount?: number;
    lawyerFees?: number;
    totalAmount: number;
    deadlineDays: number;
    gracePeriodDays?: number;
    consequencesText?: string;
    notes?: string;
  }) => {
    const response = await apiClient.post('/extrajudicial-notifications', notification);
    return response.data;
  },

  updateNotification: async (id: string, notification: any) => {
    const response = await apiClient.put(`/extrajudicial-notifications/${id}`, notification);
    return response.data;
  },

  deleteNotification: async (id: string) => {
    const response = await apiClient.delete(`/extrajudicial-notifications/${id}`);
    return response.data;
  },

  // Workflow Actions
  sendNotification: async (id: string, sentVia?: 'EMAIL' | 'WHATSAPP' | 'REGISTERED_MAIL' | 'IN_PERSON') => {
    const response = await apiClient.post(`/extrajudicial-notifications/${id}/send`, { sentVia });
    return response.data;
  },

  markAsViewed: async (id: string) => {
    const response = await apiClient.patch(`/extrajudicial-notifications/${id}/view`);
    return response.data;
  },

  signNotification: async (id: string, data: {
    creditorSignature?: string;
    debtorSignature?: string;
    witness1Signature?: string;
    witness1Name?: string;
    witness1Document?: string;
    witness2Signature?: string;
    witness2Name?: string;
    witness2Document?: string;
    geoLat?: number;
    geoLng?: number;
  }) => {
    const response = await apiClient.post(`/extrajudicial-notifications/${id}/sign`, data);
    return response.data;
  },

  respondToNotification: async (id: string, data: {
    responseText?: string;
    accepted?: boolean;
  }) => {
    const response = await apiClient.post(`/extrajudicial-notifications/${id}/respond`, data);
    return response.data;
  },

  resolveNotification: async (id: string, data: {
    resolutionMethod?: string;
    resolutionNotes?: string;
  }) => {
    const response = await apiClient.post(`/extrajudicial-notifications/${id}/resolve`, data);
    return response.data;
  },

  forwardToJudicial: async (id: string, data: {
    judicialProcessNumber?: string;
    judicialCourt?: string;
    judicialNotes?: string;
  }) => {
    const response = await apiClient.post(`/extrajudicial-notifications/${id}/forward-judicial`, data);
    return response.data;
  },

  cancelNotification: async (id: string, reason?: string) => {
    const response = await apiClient.post(`/extrajudicial-notifications/${id}/cancel`, { reason });
    return response.data;
  },

  // PDF Generation
  downloadProvisionalPdf: async (id: string) => {
    const response = await apiClient.get(`/extrajudicial-notifications/${id}/pdf/provisional`, {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadFinalPdf: async (id: string) => {
    const response = await apiClient.get(`/extrajudicial-notifications/${id}/pdf/final`, {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadStoredPdf: async (id: string, type: 'provisional' | 'final') => {
    const response = await apiClient.get(`/extrajudicial-notifications/${id}/pdf/download/${type}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  finalizeNotification: async (id: string) => {
    const response = await apiClient.post(`/extrajudicial-notifications/${id}/finalize`);
    return response.data;
  },

  // Verification
  verifyHash: async (id: string) => {
    const response = await apiClient.get(`/extrajudicial-notifications/${id}/verify`);
    return response.data;
  },

  getAuditLog: async (id: string) => {
    const response = await apiClient.get(`/extrajudicial-notifications/${id}/audit-log`);
    return response.data;
  },

  getStatistics: async () => {
    const response = await apiClient.get('/extrajudicial-notifications/statistics');
    return response.data;
  },
};

// Public Verification API for Inspections and Notifications
export const verificationAPI = {
  verifyInspection: async (token: string) => {
    const response = await apiClient.get(`/verify/inspection/${token}`);
    return response.data;
  },

  verifyNotification: async (token: string) => {
    const response = await apiClient.get(`/verify/notification/${token}`);
    return response.data;
  },

  downloadInspectionPdfByToken: async (token: string) => {
    const response = await apiClient.get(`/verify/inspection/${token}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadNotificationPdfByToken: async (token: string) => {
    const response = await apiClient.get(`/verify/notification/${token}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getNotificationStatus: async (token: string) => {
    const response = await apiClient.get(`/verify/notification/${token}/status`);
    return response.data;
  },
};

export const agreementsAPI = {
  getAgreements: async (params?: {
    propertyId?: string;
    contractId?: string;
    type?: string;
    status?: string;
    tenantId?: string;
    ownerId?: string;
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
    const response = await apiClient.get(`/agreements${query ? `?${query}` : ''}`);
    return Array.isArray(response.data) ? response.data : (response.data?.data || []);
  },

  getAgreementById: async (id: string) => {
    const response = await apiClient.get(`/agreements/${id}`);
    return response.data;
  },

  createAgreement: async (agreement: any) => {
    const response = await apiClient.post('/agreements', agreement);
    return response.data;
  },

  updateAgreement: async (id: string, agreement: any) => {
    const response = await apiClient.put(`/agreements/${id}`, agreement);
    return response.data;
  },

  deleteAgreement: async (id: string) => {
    const response = await apiClient.delete(`/agreements/${id}`);
    return response.data;
  },

  signAgreement: async (id: string, signatures: {
    tenantSignature?: string;
    ownerSignature?: string;
    agencySignature?: string;
  }) => {
    const response = await apiClient.patch(`/agreements/${id}/sign`, signatures);
    return response.data;
  },

  sendForSignature: async (id: string) => {
    const response = await apiClient.patch(`/agreements/${id}/send-for-signature`);
    return response.data;
  },

  approveAgreement: async (id: string) => {
    const response = await apiClient.patch(`/agreements/${id}/approve`);
    return response.data;
  },

  rejectAgreement: async (id: string, rejectionReason: string) => {
    const response = await apiClient.patch(`/agreements/${id}/reject`, { rejectionReason });
    return response.data;
  },

  cancelAgreement: async (id: string) => {
    const response = await apiClient.patch(`/agreements/${id}/cancel`);
    return response.data;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/agreements/${id}/status`, { status });
    return response.data;
  },

  getStatistics: async () => {
    const response = await apiClient.get('/agreements/statistics');
    return response.data;
  },

  getTemplates: async (params?: { type?: string; isDefault?: boolean }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          qs.append(k, String(v));
        }
      });
    }
    const query = qs.toString();
    const response = await apiClient.get(`/agreements/templates${query ? `?${query}` : ''}`);
    return response.data;
  },

  getTemplateById: async (id: string) => {
    const response = await apiClient.get(`/agreements/templates/${id}`);
    return response.data;
  },

  createTemplate: async (template: any) => {
    const response = await apiClient.post('/agreements/templates', template);
    return response.data;
  },

  updateTemplate: async (id: string, template: any) => {
    const response = await apiClient.put(`/agreements/templates/${id}`, template);
    return response.data;
  },

  deleteTemplate: async (id: string) => {
    const response = await apiClient.delete(`/agreements/templates/${id}`);
    return response.data;
  },
};

export const invoicesAPI = {
  getInvoices: async (params?: {
    propertyId?: string;
    contractId?: string;
    tenantId?: string;
    ownerId?: string;
    type?: string;
    status?: string;
    referenceMonth?: string;
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
    const response = await apiClient.get(`/invoices${query ? `?${query}` : ''}`);
    return Array.isArray(response.data) ? response.data : (response.data?.data || []);
  },

  getInvoiceById: async (id: string) => {
    const response = await apiClient.get(`/invoices/${id}`);
    return response.data;
  },

  createInvoice: async (invoice: any) => {
    const response = await apiClient.post('/invoices', invoice);
    return response.data;
  },

  updateInvoice: async (id: string, invoice: any) => {
    const response = await apiClient.put(`/invoices/${id}`, invoice);
    return response.data;
  },

  markAsPaid: async (id: string, data: {
    paymentMethod?: string;
    paidValue?: number;
    paidAt?: string;
    notes?: string;
  }) => {
    const response = await apiClient.patch(`/invoices/${id}/mark-paid`, data);
    return response.data;
  },

  cancelInvoice: async (id: string, reason?: string) => {
    const response = await apiClient.patch(`/invoices/${id}/cancel`, { reason });
    return response.data;
  },

  resendToTenant: async (id: string, email?: string) => {
    const response = await apiClient.post(`/invoices/${id}/resend`, { email });
    return response.data;
  },

  downloadInvoice: async (id: string) => {
    const response = await apiClient.get(`/invoices/${id}/download`);
    return response.data;
  },

  downloadReceipt: async (id: string) => {
    const response = await apiClient.get(`/invoices/${id}/receipt`);
    return response.data;
  },

  getStatistics: async () => {
    const response = await apiClient.get('/invoices/statistics');
    return response.data;
  },
};

export const platformManagerAPI = {
  
  getDashboardMetrics: async () => {
    const response = await apiClient.get('/platform-manager/dashboard/metrics');
    return response.data;
  },

  getAgencyStatusDistribution: async () => {
    const response = await apiClient.get('/platform-manager/dashboard/agency-status');
    return response.data;
  },

  getTicketStatusDistribution: async () => {
    const response = await apiClient.get('/platform-manager/dashboard/ticket-status');
    return response.data;
  },

  getMonthlyTickets: async () => {
    const response = await apiClient.get('/platform-manager/dashboard/monthly-tickets');
    return response.data;
  },

  getPlatformHealth: async () => {
    const response = await apiClient.get('/platform-manager/dashboard/platform-health');
    return response.data;
  },

  getRecentActivities: async () => {
    const response = await apiClient.get('/platform-manager/dashboard/recent-activities');
    return response.data;
  },

  getSystemStatus: async () => {
    const response = await apiClient.get('/platform-manager/dashboard/system-status');
    return response.data;
  },

  getAgencies: async (params?: { search?: string; status?: string; plan?: string }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
      });
    }
    const query = qs.toString();
    const response = await apiClient.get(`/platform-manager/agencies${query ? `?${query}` : ''}`);
    return response.data;
  },

  getAgencyById: async (id: string) => {
    const response = await apiClient.get(`/platform-manager/agencies/${id}`);
    return response.data;
  },

  getTickets: async (params?: { status?: string; priority?: string; category?: string }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
      });
    }
    const query = qs.toString();
    const response = await apiClient.get(`/platform-manager/tickets${query ? `?${query}` : ''}`);
    return response.data;
  },

  getTicketById: async (id: string) => {
    const response = await apiClient.get(`/platform-manager/tickets/${id}`);
    return response.data;
  },

  updateTicketStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/platform-manager/tickets/${id}/status`, { status });
    return response.data;
  },

  getInternalUsers: async (params?: { search?: string; role?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
      });
    }
    const query = qs.toString();
    const response = await apiClient.get(`/platform-manager/internal-users${query ? `?${query}` : ''}`);
    return response.data;
  },

  getLogs: async (params?: { type?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
      });
    }
    const query = qs.toString();
    const response = await apiClient.get(`/platform-manager/logs${query ? `?${query}` : ''}`);
    return response.data;
  },

  getPlansOverview: async () => {
    const response = await apiClient.get('/platform-manager/plans-overview');
    return response.data;
  },

  getBillingOverview: async () => {
    const response = await apiClient.get('/platform-manager/billing-overview');
    return response.data;
  },

  getWebhookLogs: async (params?: { service?: string; status?: string; startDate?: string; endDate?: string }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
      });
    }
    const query = qs.toString();
    const response = await apiClient.get(`/platform-manager/integrations/webhooks${query ? `?${query}` : ''}`);
    return response.data;
  },

  getApiRequestLogs: async (params?: { method?: string; status?: string; startDate?: string; endDate?: string }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
      });
    }
    const query = qs.toString();
    const response = await apiClient.get(`/platform-manager/integrations/api-requests${query ? `?${query}` : ''}`);
    return response.data;
  },

  getInternalNotes: async () => {
    const response = await apiClient.get('/platform-manager/internal-notes');
    return response.data;
  },

  getAgencyMessages: async () => {
    const response = await apiClient.get('/platform-manager/agency-messages');
    return response.data;
  },

  getSupportMetrics: async () => {
    const response = await apiClient.get('/platform-manager/support-metrics');
    return response.data;
  },

  getKnowledgeBaseCategories: async () => {
    const response = await apiClient.get('/platform-manager/knowledge-base/categories');
    return response.data;
  },

  getKnowledgeBaseArticles: async (params?: { category?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
      });
    }
    const query = qs.toString();
    const response = await apiClient.get(`/platform-manager/knowledge-base/articles${query ? `?${query}` : ''}`);
    return response.data;
  },

  getProcedures: async () => {
    const response = await apiClient.get('/platform-manager/knowledge-base/procedures');
    return response.data;
  },

  getChecklists: async () => {
    const response = await apiClient.get('/platform-manager/knowledge-base/checklists');
    return response.data;
  },

  getManagerProfile: async () => {
    const response = await apiClient.get('/platform-manager/profile');
    return response.data;
  },

  updateManagerProfile: async (data: { name?: string; phone?: string }) => {
    const response = await apiClient.put('/platform-manager/profile', data);
    return response.data;
  },

  getNotificationSettings: async () => {
    const response = await apiClient.get('/platform-manager/notification-settings');
    return response.data;
  },

  updateNotificationSettings: async (settings: any) => {
    const response = await apiClient.put('/platform-manager/notification-settings', settings);
    return response.data;
  },
};

export const auditorAPI = {
  getDashboardMetrics: async () => {
    const response = await apiClient.get('/auditor/dashboard/metrics');
    return response.data;
  },

  getAgencyPlanDistribution: async () => {
    const response = await apiClient.get('/auditor/dashboard/agency-plan-distribution');
    return response.data;
  },

  getContractStatusDistribution: async () => {
    const response = await apiClient.get('/auditor/dashboard/contract-status-distribution');
    return response.data;
  },

  getMonthlyTransactions: async () => {
    const response = await apiClient.get('/auditor/dashboard/monthly-transactions');
    return response.data;
  },

  getSignatureActivity: async () => {
    const response = await apiClient.get('/auditor/dashboard/signature-activity');
    return response.data;
  },

  getUserRoleDistribution: async () => {
    const response = await apiClient.get('/auditor/dashboard/user-role-distribution');
    return response.data;
  },

  getPaymentStatusDistribution: async () => {
    const response = await apiClient.get('/auditor/dashboard/payment-status-distribution');
    return response.data;
  },

  getLogsSummary: async () => {
    const response = await apiClient.get('/auditor/dashboard/logs-summary');
    return response.data;
  },

  getRevenueTrend: async () => {
    const response = await apiClient.get('/auditor/dashboard/revenue-trend');
    return response.data;
  },

  getRecentActivity: async () => {
    const response = await apiClient.get('/auditor/dashboard/recent-activity');
    return response.data;
  },

  getSystemStatus: async () => {
    const response = await apiClient.get('/auditor/dashboard/system-status');
    return response.data;
  },

  getSummaryStats: async () => {
    const response = await apiClient.get('/auditor/dashboard/summary-stats');
    return response.data;
  },

  getAgencies: async (params?: { search?: string }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
      });
    }
    const query = qs.toString();
    const response = await apiClient.get(`/auditor/agencies${query ? `?${query}` : ''}`);
    return response.data;
  },

  getDocuments: async (params?: { type?: string; status?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
      });
    }
    const query = qs.toString();
    const response = await apiClient.get(`/auditor/documents${query ? `?${query}` : ''}`);
    return response.data;
  },

  getUsers: async (params?: { role?: string; status?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
      });
    }
    const query = qs.toString();
    const response = await apiClient.get(`/auditor/users${query ? `?${query}` : ''}`);
    return response.data;
  },

  getPayments: async (params?: { status?: string; startDate?: string; endDate?: string }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
      });
    }
    const query = qs.toString();
    const response = await apiClient.get(`/auditor/payments${query ? `?${query}` : ''}`);
    return response.data;
  },

  getSignatures: async (params?: { type?: string; status?: string; startDate?: string; endDate?: string }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
      });
    }
    const query = qs.toString();
    const response = await apiClient.get(`/auditor/signatures${query ? `?${query}` : ''}`);
    return response.data;
  },

  getSecurity: async () => {
    const response = await apiClient.get('/auditor/security');
    return response.data;
  },

  getDataIntegrity: async () => {
    const response = await apiClient.get('/auditor/data-integrity');
    return response.data;
  },

  getLogs: async (params?: { type?: string; level?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
      });
    }
    const query = qs.toString();
    const response = await apiClient.get(`/auditor/logs${query ? `?${query}` : ''}`);
    return response.data;
  },

  getTools: async () => {
    const response = await apiClient.get('/auditor/tools');
    return response.data;
  },
};

export const salesRepAPI = {
  getStats: async () => {
    const response = await apiClient.get('/sales-rep/stats');
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await apiClient.get('/sales-rep/dashboard/stats');
    return response.data;
  },

  getWeeklyPerformance: async () => {
    const response = await apiClient.get('/sales-rep/dashboard/weekly-performance');
    return response.data;
  },

  getPipelineData: async () => {
    const response = await apiClient.get('/sales-rep/dashboard/pipeline');
    return response.data;
  },

  getRecentLeads: async () => {
    const response = await apiClient.get('/sales-rep/dashboard/recent-leads');
    return response.data;
  },

  getTopProspects: async () => {
    const response = await apiClient.get('/sales-rep/dashboard/top-prospects');
    return response.data;
  },
};

export const apiClientDashboardAPI = {
  getStats: async () => {
    const response = await apiClient.get('/api-client/stats');
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await apiClient.get('/api-client/dashboard/stats');
    return response.data;
  },

  getDailyRequests: async () => {
    const response = await apiClient.get('/api-client/dashboard/daily-requests');
    return response.data;
  },

  getRequestsByMethod: async () => {
    const response = await apiClient.get('/api-client/dashboard/requests-by-method');
    return response.data;
  },

  getRequestsByEndpoint: async () => {
    const response = await apiClient.get('/api-client/dashboard/requests-by-endpoint');
    return response.data;
  },

  getRecentRequests: async () => {
    const response = await apiClient.get('/api-client/dashboard/recent-requests');
    return response.data;
  },
};

export const tenantAnalysisAPI = {

  analyze: async (data: { document: string; name?: string; analysisType?: 'FULL' | 'FINANCIAL' | 'BACKGROUND' | 'QUICK'; lgpdAccepted: boolean }) => {
    const response = await apiClient.post('/tenant-analysis/analyze', data);
    return response.data;
  },

  getHistory: async (params?: {
    document?: string;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
      });
    }
    const query = qs.toString();
    const response = await apiClient.get(`/tenant-analysis/history${query ? `?${query}` : ''}`);
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/tenant-analysis/stats');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/tenant-analysis/${id}`);
    return response.data;
  },

  uploadPhoto: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await apiClient.post(`/tenant-analysis/${id}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  healthCheck: async () => {
    const response = await apiClient.get('/tenant-analysis/health');
    return response.data;
  },
};

export { authApi } from './auth';
export { default as apiClient } from './client';
