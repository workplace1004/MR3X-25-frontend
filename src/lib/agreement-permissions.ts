/**
 * Agreement Permission System - Frontend Utilities
 *
 * This file mirrors the backend permission logic to provide consistent
 * access control checks on the frontend for UI/UX purposes.
 */

// User roles matching backend enum
export const UserRole = {
  CEO: 'CEO',
  ADMIN: 'ADMIN',
  PLATFORM_MANAGER: 'PLATFORM_MANAGER',
  AGENCY_ADMIN: 'AGENCY_ADMIN',
  AGENCY_MANAGER: 'AGENCY_MANAGER',
  BROKER: 'BROKER',
  PROPRIETARIO: 'PROPRIETARIO',
  INDEPENDENT_OWNER: 'INDEPENDENT_OWNER',
  INQUILINO: 'INQUILINO',
  BUILDING_MANAGER: 'BUILDING_MANAGER',
  LEGAL_AUDITOR: 'LEGAL_AUDITOR',
  REPRESENTATIVE: 'REPRESENTATIVE',
  API_CLIENT: 'API_CLIENT',
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

// Agreement actions
export const AgreementAction = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  SIGN: 'sign',
  SEND_FOR_SIGNATURE: 'send_for_signature',
  APPROVE: 'approve',
  REJECT: 'reject',
  CANCEL: 'cancel',
} as const;
export type AgreementAction = typeof AgreementAction[keyof typeof AgreementAction];

// Agreement status values
export const AgreementStatus = {
  RASCUNHO: 'RASCUNHO',
  AGUARDANDO_ASSINATURA: 'AGUARDANDO_ASSINATURA',
  ASSINADO: 'ASSINADO',
  CONCLUIDO: 'CONCLUIDO',
  REJEITADO: 'REJEITADO',
  CANCELADO: 'CANCELADO',
} as const;
export type AgreementStatus = typeof AgreementStatus[keyof typeof AgreementStatus];

// Signature types
export const SignatureType = {
  TENANT: 'tenant',
  OWNER: 'owner',
  AGENCY: 'agency',
  BROKER: 'broker',
  WITNESS: 'witness',
} as const;
export type SignatureType = typeof SignatureType[keyof typeof SignatureType];

// Access scope
export const AccessScope = {
  ALL: 'all',
  AGENCY: 'agency',
  OWN_CREATED: 'own_created',
  PARTY_TO: 'party_to',
  NONE: 'none',
} as const;
export type AccessScope = typeof AccessScope[keyof typeof AccessScope];

// Permission interface
export interface RolePermissions {
  view: AccessScope;
  create: boolean;
  edit: boolean;
  delete: boolean;
  sign: boolean;
  signatureTypes: SignatureType[];
  approve: boolean;
  reject: boolean;
  cancel: boolean;
  sendForSignature: boolean;
  requiresCreci?: boolean;
}

// User context for permission checks
export interface UserContext {
  id: string;
  role: string;
  agencyId?: string;
  brokerId?: string;
  creci?: string;
}

// Agreement context for permission checks
export interface AgreementContext {
  id: string;
  status: string;
  agencyId?: string;
  propertyId: string;
  contractId?: string;
  tenantId?: string;
  ownerId?: string;
  createdBy: string;
  tenantSignature?: string;
  ownerSignature?: string;
  agencySignature?: string;
  property?: {
    ownerId?: string;
    agencyId?: string;
    brokerId?: string;
    tenantId?: string;
  };
}

/**
 * Complete Permission Matrix by Role
 */
export const AGREEMENT_PERMISSION_MATRIX: Record<string, RolePermissions> = {
  // CEO (MR3X) - Read-only, governance and audits
  [UserRole.CEO]: {
    view: AccessScope.ALL,
    create: false,
    edit: false,
    delete: false,
    sign: false,
    signatureTypes: [],
    approve: false,
    reject: false,
    cancel: false,
    sendForSignature: false,
  },

  // Admin (MR3X) - Read-only for support and compliance
  [UserRole.ADMIN]: {
    view: AccessScope.ALL,
    create: false,
    edit: false,
    delete: false,
    sign: false,
    signatureTypes: [],
    approve: false,
    reject: false,
    cancel: false,
    sendForSignature: false,
  },

  // Platform Manager (MR3X) - Read-only for client assistance
  [UserRole.PLATFORM_MANAGER]: {
    view: AccessScope.ALL,
    create: false,
    edit: false,
    delete: false,
    sign: false,
    signatureTypes: [],
    approve: false,
    reject: false,
    cancel: false,
    sendForSignature: false,
  },

  // Agency Admin/Director - Full control within agency
  [UserRole.AGENCY_ADMIN]: {
    view: AccessScope.AGENCY,
    create: true,
    edit: true,
    delete: true,
    sign: true,
    signatureTypes: [SignatureType.AGENCY, SignatureType.OWNER],
    approve: true,
    reject: true,
    cancel: true,
    sendForSignature: true,
  },

  // Agency Manager - Full operational control
  [UserRole.AGENCY_MANAGER]: {
    view: AccessScope.AGENCY,
    create: true,
    edit: true,
    delete: true,
    sign: true,
    signatureTypes: [SignatureType.AGENCY],
    approve: true,
    reject: true,
    cancel: true,
    sendForSignature: true,
  },

  // Broker - Limited to own scope
  [UserRole.BROKER]: {
    view: AccessScope.OWN_CREATED,
    create: true,
    edit: true,
    delete: true,
    sign: true,
    signatureTypes: [SignatureType.BROKER, SignatureType.WITNESS],
    approve: false,
    reject: false,
    cancel: true,
    sendForSignature: true,
    requiresCreci: true,
  },

  // Owner (linked to Agency) - Participatory role
  [UserRole.PROPRIETARIO]: {
    view: AccessScope.PARTY_TO,
    create: false,
    edit: false,
    delete: false,
    sign: true,
    signatureTypes: [SignatureType.OWNER],
    approve: false,
    reject: false,
    cancel: false,
    sendForSignature: false,
  },

  // Independent Owner - Similar to Agency Manager for own properties
  [UserRole.INDEPENDENT_OWNER]: {
    view: AccessScope.OWN_CREATED,
    create: true,
    edit: true,
    delete: true,
    sign: true,
    signatureTypes: [SignatureType.OWNER, SignatureType.AGENCY],
    approve: true,
    reject: true,
    cancel: true,
    sendForSignature: true,
  },

  // Tenant - Participatory role
  [UserRole.INQUILINO]: {
    view: AccessScope.PARTY_TO,
    create: false,
    edit: false,
    delete: false,
    sign: true,
    signatureTypes: [SignatureType.TENANT],
    approve: false,
    reject: false,
    cancel: false,
    sendForSignature: false,
  },

  // Building Manager - Informational, rarely contractual
  [UserRole.BUILDING_MANAGER]: {
    view: AccessScope.PARTY_TO,
    create: false,
    edit: false,
    delete: false,
    sign: true,
    signatureTypes: [],
    approve: false,
    reject: false,
    cancel: false,
    sendForSignature: false,
  },

  // Legal Auditor - Pure read-only with deep visibility
  [UserRole.LEGAL_AUDITOR]: {
    view: AccessScope.ALL,
    create: false,
    edit: false,
    delete: false,
    sign: false,
    signatureTypes: [],
    approve: false,
    reject: false,
    cancel: false,
    sendForSignature: false,
  },

  // Representative/Sales - No access to agreements
  [UserRole.REPRESENTATIVE]: {
    view: AccessScope.NONE,
    create: false,
    edit: false,
    delete: false,
    sign: false,
    signatureTypes: [],
    approve: false,
    reject: false,
    cancel: false,
    sendForSignature: false,
  },

  // API Client - Scoped based on token
  [UserRole.API_CLIENT]: {
    view: AccessScope.AGENCY,
    create: false,
    edit: false,
    delete: false,
    sign: false,
    signatureTypes: [],
    approve: false,
    reject: false,
    cancel: false,
    sendForSignature: false,
  },
};

// Status-based restrictions
export const EDITABLE_STATUSES: string[] = [
  AgreementStatus.RASCUNHO,
  AgreementStatus.AGUARDANDO_ASSINATURA,
];

export const DELETABLE_STATUSES: string[] = [
  AgreementStatus.RASCUNHO,
];

export const SIGNABLE_STATUSES: string[] = [
  AgreementStatus.RASCUNHO,
  AgreementStatus.AGUARDANDO_ASSINATURA,
];

export const SIGNED_STATUSES: string[] = [
  AgreementStatus.ASSINADO,
  AgreementStatus.CONCLUIDO,
];

export const IMMUTABLE_STATUSES: string[] = [
  AgreementStatus.CONCLUIDO,
  AgreementStatus.REJEITADO,
];

// MR3X Platform roles (read-only access)
export const MR3X_ROLES: string[] = [
  UserRole.CEO,
  UserRole.ADMIN,
  UserRole.PLATFORM_MANAGER,
  UserRole.LEGAL_AUDITOR,
  UserRole.REPRESENTATIVE,
];

/**
 * Get permissions for a specific role
 */
export function getPermissionsForRole(role: string): RolePermissions {
  return AGREEMENT_PERMISSION_MATRIX[role] || AGREEMENT_PERMISSION_MATRIX[UserRole.REPRESENTATIVE];
}

/**
 * Check if a role is a platform (MR3X) role
 */
export function isMR3XRole(role: string): boolean {
  return MR3X_ROLES.includes(role);
}

/**
 * Check if status allows editing
 */
export function isEditableStatus(status: string): boolean {
  return EDITABLE_STATUSES.includes(status);
}

/**
 * Check if status allows deletion
 */
export function isDeletableStatus(status: string): boolean {
  return DELETABLE_STATUSES.includes(status);
}

/**
 * Check if status allows signing
 */
export function isSignableStatus(status: string): boolean {
  return SIGNABLE_STATUSES.includes(status);
}

/**
 * Check if agreement has been signed
 */
export function hasBeenSigned(agreement: AgreementContext): boolean {
  return !!(
    agreement.tenantSignature ||
    agreement.ownerSignature ||
    agreement.agencySignature
  );
}

/**
 * Check if status is immutable
 */
export function isImmutableStatus(status: string): boolean {
  return IMMUTABLE_STATUSES.includes(status);
}

/**
 * Check if user can perform a general action
 */
export function canPerformAction(user: UserContext, action: AgreementAction): boolean {
  const permissions = getPermissionsForRole(user.role);

  switch (action) {
    case AgreementAction.VIEW:
      return permissions.view !== AccessScope.NONE;
    case AgreementAction.CREATE:
      return permissions.create;
    case AgreementAction.EDIT:
      return permissions.edit;
    case AgreementAction.DELETE:
      return permissions.delete;
    case AgreementAction.SIGN:
      if (!permissions.sign) return false;
      if (permissions.requiresCreci && !user.creci) return false;
      return true;
    case AgreementAction.APPROVE:
      return permissions.approve;
    case AgreementAction.REJECT:
      return permissions.reject;
    case AgreementAction.CANCEL:
      return permissions.cancel;
    case AgreementAction.SEND_FOR_SIGNATURE:
      return permissions.sendForSignature;
    default:
      return false;
  }
}

/**
 * Check if user can view a specific agreement
 */
export function canViewAgreement(user: UserContext, agreement: AgreementContext): boolean {
  const permissions = getPermissionsForRole(user.role);

  switch (permissions.view) {
    case AccessScope.ALL:
      return true;

    case AccessScope.AGENCY:
      if (!user.agencyId) return false;
      return agreement.agencyId === user.agencyId;

    case AccessScope.OWN_CREATED:
      // Check if user created it
      if (agreement.createdBy === user.id) return true;
      // For brokers, also check if linked to property
      if (user.role === UserRole.BROKER && agreement.property?.brokerId === user.id) {
        return true;
      }
      return false;

    case AccessScope.PARTY_TO:
      return isPartyToAgreement(user, agreement);

    case AccessScope.NONE:
    default:
      return false;
  }
}

/**
 * Check if user can edit a specific agreement
 */
export function canEditAgreement(user: UserContext, agreement: AgreementContext): boolean {
  // First check general permission
  if (!canPerformAction(user, AgreementAction.EDIT)) return false;

  // Check status-based restriction
  if (!isEditableStatus(agreement.status)) return false;

  // Check if immutable
  if (isImmutableStatus(agreement.status)) return false;

  // MR3X roles have read-only access
  if (isMR3XRole(user.role)) return false;

  const permissions = getPermissionsForRole(user.role);

  switch (permissions.view) {
    case AccessScope.AGENCY:
      if (!user.agencyId || agreement.agencyId !== user.agencyId) return false;
      // Agency manager can't edit signed agreements
      if (user.role === UserRole.AGENCY_MANAGER && hasBeenSigned(agreement)) return false;
      return true;

    case AccessScope.OWN_CREATED:
      if (user.role === UserRole.BROKER) {
        return agreement.createdBy === user.id || agreement.property?.brokerId === user.id;
      }
      return agreement.createdBy === user.id;

    case AccessScope.PARTY_TO:
      // Parties cannot edit
      return false;

    default:
      return false;
  }
}

/**
 * Check if user can delete a specific agreement
 */
export function canDeleteAgreement(user: UserContext, agreement: AgreementContext): boolean {
  // First check general permission
  if (!canPerformAction(user, AgreementAction.DELETE)) return false;

  // Check status-based restriction
  if (!isDeletableStatus(agreement.status)) return false;

  // Check if signed
  if (hasBeenSigned(agreement)) return false;

  const permissions = getPermissionsForRole(user.role);

  switch (permissions.view) {
    case AccessScope.AGENCY:
      return !user.agencyId || agreement.agencyId === user.agencyId;

    case AccessScope.OWN_CREATED:
      return agreement.createdBy === user.id;

    default:
      return false;
  }
}

/**
 * Check if user can sign a specific agreement with a specific signature type
 */
export function canSignAgreement(
  user: UserContext,
  agreement: AgreementContext,
  signatureType: SignatureType
): boolean {
  // First check general permission
  if (!canPerformAction(user, AgreementAction.SIGN)) return false;

  // Check status
  if (!isSignableStatus(agreement.status)) return false;

  const permissions = getPermissionsForRole(user.role);

  // Check if role allows this signature type
  if (!permissions.signatureTypes.includes(signatureType)) return false;

  // Validate user is the appropriate party
  switch (signatureType) {
    case SignatureType.TENANT:
      if (agreement.tenantId !== user.id &&
          agreement.property?.tenantId !== user.id) {
        return false;
      }
      break;

    case SignatureType.OWNER:
      if (agreement.ownerId !== user.id &&
          agreement.property?.ownerId !== user.id) {
        return false;
      }
      break;

    case SignatureType.AGENCY:
      if (!user.agencyId || agreement.agencyId !== user.agencyId) {
        return false;
      }
      break;

    case SignatureType.BROKER:
      if (permissions.requiresCreci && !user.creci) return false;
      if (agreement.property?.brokerId !== user.id) return false;
      break;

    case SignatureType.WITNESS:
      // Witness can be anyone with signing permission
      break;
  }

  return true;
}

/**
 * Check if user can approve a specific agreement
 */
export function canApproveAgreement(user: UserContext, agreement: AgreementContext): boolean {
  if (!canPerformAction(user, AgreementAction.APPROVE)) return false;

  if (agreement.status === AgreementStatus.CONCLUIDO) return false;
  if (agreement.status === AgreementStatus.REJEITADO) return false;

  const permissions = getPermissionsForRole(user.role);
  if (permissions.view === AccessScope.AGENCY) {
    if (!user.agencyId || agreement.agencyId !== user.agencyId) return false;
  }

  return true;
}

/**
 * Check if user can cancel a specific agreement
 */
export function canCancelAgreement(user: UserContext, agreement: AgreementContext): boolean {
  if (!canPerformAction(user, AgreementAction.CANCEL)) return false;

  if (agreement.status === AgreementStatus.CONCLUIDO) return false;

  const permissions = getPermissionsForRole(user.role);

  if (permissions.view === AccessScope.AGENCY) {
    if (!user.agencyId || agreement.agencyId !== user.agencyId) return false;
  } else if (permissions.view === AccessScope.OWN_CREATED) {
    if (agreement.createdBy !== user.id) return false;
  }

  return true;
}

/**
 * Check if user is a party to the agreement
 */
function isPartyToAgreement(user: UserContext, agreement: AgreementContext): boolean {
  // Direct party
  if (agreement.tenantId === user.id) return true;
  if (agreement.ownerId === user.id) return true;

  // Property-based party
  if (agreement.property) {
    if (agreement.property.ownerId === user.id) return true;
    if (agreement.property.tenantId === user.id) return true;
  }

  return false;
}

/**
 * Get all available actions for a user on an agreement
 */
export function getAvailableActions(user: UserContext, agreement: AgreementContext): AgreementAction[] {
  const actions: AgreementAction[] = [];

  if (canViewAgreement(user, agreement)) actions.push(AgreementAction.VIEW);
  if (canEditAgreement(user, agreement)) actions.push(AgreementAction.EDIT);
  if (canDeleteAgreement(user, agreement)) actions.push(AgreementAction.DELETE);
  if (canApproveAgreement(user, agreement)) actions.push(AgreementAction.APPROVE);
  if (canCancelAgreement(user, agreement)) actions.push(AgreementAction.CANCEL);

  // Check each signature type
  const permissions = getPermissionsForRole(user.role);
  for (const sigType of permissions.signatureTypes) {
    if (canSignAgreement(user, agreement, sigType)) {
      actions.push(AgreementAction.SIGN);
      break;
    }
  }

  // Check send for signature
  if (canPerformAction(user, AgreementAction.SEND_FOR_SIGNATURE)) {
    if (agreement.status === AgreementStatus.RASCUNHO) {
      actions.push(AgreementAction.SEND_FOR_SIGNATURE);
    }
  }

  return [...new Set(actions)];
}

/**
 * Get user permissions summary
 */
export function getUserPermissionsSummary(user: UserContext) {
  return {
    role: user.role,
    canView: canPerformAction(user, AgreementAction.VIEW),
    canCreate: canPerformAction(user, AgreementAction.CREATE),
    canEdit: canPerformAction(user, AgreementAction.EDIT),
    canDelete: canPerformAction(user, AgreementAction.DELETE),
    canSign: canPerformAction(user, AgreementAction.SIGN),
    canApprove: canPerformAction(user, AgreementAction.APPROVE),
    canReject: canPerformAction(user, AgreementAction.REJECT),
    canCancel: canPerformAction(user, AgreementAction.CANCEL),
    canSendForSignature: canPerformAction(user, AgreementAction.SEND_FOR_SIGNATURE),
    isMR3XRole: isMR3XRole(user.role),
  };
}
