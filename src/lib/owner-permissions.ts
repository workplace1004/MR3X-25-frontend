/**
 * Owner Permission Utilities for Frontend
 *
 * PROPRIETARIO (Owner linked to agency):
 * - Has READ-ONLY access to most modules
 * - Cannot sign rental contracts (agency represents them)
 * - Cannot create/edit/delete tenant analysis, payments, inspections, agreements
 * - Can ONLY sign service contracts with the agency
 *
 * INDEPENDENT_OWNER (Owner without agency):
 * - Has FULL control over their properties
 * - Can perform all operations
 */

export type UserRole =
  | 'CEO'
  | 'ADMIN'
  | 'PLATFORM_MANAGER'
  | 'AGENCY_ADMIN'
  | 'AGENCY_MANAGER'
  | 'BROKER'
  | 'PROPRIETARIO'
  | 'INDEPENDENT_OWNER'
  | 'INQUILINO'
  | 'BUILDING_MANAGER'
  | 'LEGAL_AUDITOR'
  | 'REPRESENTATIVE'
  | 'API_CLIENT';

export type OwnerAction = 'view' | 'create' | 'edit' | 'delete' | 'sign' | 'approve' | 'export';

export interface ModulePermission {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canSign: boolean;
  canApprove: boolean;
  canExport: boolean;
  message?: string;
}

/**
 * Permission matrix for PROPRIETARIO (agency-managed owner)
 * Key principle: Owner views, Agency acts on their behalf
 */
const PROPRIETARIO_PERMISSIONS: Record<string, ModulePermission> = {
  dashboard: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canSign: false,
    canApprove: false,
    canExport: false,
  },
  properties: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canSign: false,
    canApprove: false,
    canExport: false,
    message: 'Imóveis são gerenciados pela imobiliária',
  },
  tenant_analysis: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canSign: false,
    canApprove: false,
    canExport: false,
    message: 'Análise de inquilinos é realizada pela imobiliária',
  },
  payments: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canSign: false,
    canApprove: false,
    canExport: true,
    message: 'Pagamentos são gerenciados pela imobiliária',
  },
  invoices: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canSign: false,
    canApprove: false,
    canExport: true,
    message: 'Faturas são gerenciadas pela imobiliária',
  },
  contracts: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canSign: false, // Cannot sign rental contracts - agency represents them
    canApprove: false,
    canExport: true,
    message: 'Contratos de aluguel são assinados pela imobiliária em nome do proprietário',
  },
  service_contracts: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canSign: true, // CAN sign service contracts with agency
    canApprove: false,
    canExport: true,
    message: 'Imóvel assina apenas o contrato de prestação de serviços com a imobiliária',
  },
  inspections: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canSign: false,
    canApprove: false,
    canExport: false,
    message: 'Vistorias são realizadas pela imobiliária',
  },
  agreements: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canSign: false,
    canApprove: false,
    canExport: false,
    message: 'Acordos são gerenciados pela imobiliária',
  },
  reports: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canSign: false,
    canApprove: false,
    canExport: true,
  },
  notifications: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canSign: false,
    canApprove: false,
    canExport: false,
  },
  chat: {
    canView: true,
    canCreate: true, // Can communicate with agency
    canEdit: false,
    canDelete: false,
    canSign: false,
    canApprove: false,
    canExport: false,
  },
  profile: {
    canView: true,
    canCreate: false,
    canEdit: true, // Can edit their own profile
    canDelete: false,
    canSign: false,
    canApprove: false,
    canExport: false,
  },
  documents: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canSign: false,
    canApprove: false,
    canExport: true,
  },
};

/**
 * Full permissions for INDEPENDENT_OWNER
 */
const FULL_PERMISSIONS: ModulePermission = {
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canSign: true,
  canApprove: true,
  canExport: true,
};

/**
 * Check if user is an agency-managed owner (PROPRIETARIO)
 */
export function isAgencyManagedOwner(role: string | undefined): boolean {
  return role === 'PROPRIETARIO';
}

/**
 * Check if user is an independent owner
 */
export function isIndependentOwner(role: string | undefined): boolean {
  return role === 'INDEPENDENT_OWNER';
}

/**
 * Check if user is any type of owner
 */
export function isOwner(role: string | undefined): boolean {
  return role === 'PROPRIETARIO' || role === 'INDEPENDENT_OWNER';
}

/**
 * Get permissions for a user role and module
 */
export function getOwnerPermissions(role: string | undefined, module: string): ModulePermission {
  if (role === 'PROPRIETARIO') {
    return PROPRIETARIO_PERMISSIONS[module] || {
      canView: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canSign: false,
      canApprove: false,
      canExport: false,
    };
  }

  // All other roles (including INDEPENDENT_OWNER) get full permissions
  // (individual role restrictions are handled by the backend)
  return FULL_PERMISSIONS;
}

/**
 * Check if owner can perform a specific action on a module
 */
export function canOwnerPerformAction(
  role: string | undefined,
  module: string,
  action: OwnerAction
): { allowed: boolean; message?: string } {
  const permissions = getOwnerPermissions(role, module);

  const actionMap: Record<OwnerAction, keyof ModulePermission> = {
    view: 'canView',
    create: 'canCreate',
    edit: 'canEdit',
    delete: 'canDelete',
    sign: 'canSign',
    approve: 'canApprove',
    export: 'canExport',
  };

  const permissionKey = actionMap[action];
  const allowed = permissions[permissionKey] as boolean;

  return {
    allowed,
    message: allowed ? undefined : permissions.message,
  };
}

/**
 * Hook-friendly function to check if user is in read-only mode for a module
 */
export function isReadOnlyForModule(role: string | undefined, module: string): boolean {
  if (role !== 'PROPRIETARIO') return false;

  const permissions = getOwnerPermissions(role, module);
  return !permissions.canCreate && !permissions.canEdit && !permissions.canDelete;
}

/**
 * Get a user-friendly message for why an action is restricted
 */
export function getRestrictionMessage(module: string): string {
  const messages: Record<string, string> = {
    properties: 'Imóveis são gerenciados pela imobiliária',
    tenant_analysis: 'Análise de inquilinos é realizada pela imobiliária',
    payments: 'Pagamentos são gerenciados pela imobiliária',
    invoices: 'Faturas são gerenciadas pela imobiliária',
    contracts: 'Contratos de aluguel são assinados pela imobiliária em nome do proprietário',
    inspections: 'Vistorias são realizadas pela imobiliária',
    agreements: 'Acordos são gerenciados pela imobiliária',
    default: 'Esta ação é realizada pela imobiliária em seu nome',
  };

  return messages[module] || messages.default;
}
