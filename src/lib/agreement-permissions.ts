
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
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

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
export type AgreementAction = (typeof AgreementAction)[keyof typeof AgreementAction];

export const AgreementStatus = {
  RASCUNHO: 'RASCUNHO',
  AGUARDANDO_ASSINATURA: 'AGUARDANDO_ASSINATURA',
  ASSINADO: 'ASSINADO',
  CONCLUIDO: 'CONCLUIDO',
  REJEITADO: 'REJEITADO',
  CANCELADO: 'CANCELADO',
} as const;
export type AgreementStatus = (typeof AgreementStatus)[keyof typeof AgreementStatus];

export const SignatureType = {
  TENANT: 'tenant',
  OWNER: 'owner',
  AGENCY: 'agency',
  BROKER: 'broker',
  WITNESS: 'witness',
} as const;
export type SignatureType = (typeof SignatureType)[keyof typeof SignatureType];

export const AccessScope = {
  ALL: 'all',
  AGENCY: 'agency',
  OWN_CREATED: 'own_created',
  PARTY_TO: 'party_to',
  NONE: 'none',
} as const;
export type AccessScope = (typeof AccessScope)[keyof typeof AccessScope];

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

export interface UserContext {
  id: string;
  role: string;
  agencyId?: string;
  brokerId?: string;
  creci?: string;
}

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

export const AGREEMENT_PERMISSION_MATRIX: Record<string, RolePermissions> = {
  
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

export const MR3X_ROLES: string[] = [
  UserRole.CEO,
  UserRole.ADMIN,
  UserRole.PLATFORM_MANAGER,
  UserRole.LEGAL_AUDITOR,
  UserRole.REPRESENTATIVE,
];

export function getPermissionsForRole(role: string): RolePermissions {
  return AGREEMENT_PERMISSION_MATRIX[role] || AGREEMENT_PERMISSION_MATRIX[UserRole.REPRESENTATIVE];
}

export function isMR3XRole(role: string): boolean {
  return MR3X_ROLES.includes(role);
}

export function isEditableStatus(status: string): boolean {
  return EDITABLE_STATUSES.includes(status);
}

export function isDeletableStatus(status: string): boolean {
  return DELETABLE_STATUSES.includes(status);
}

export function isSignableStatus(status: string): boolean {
  return SIGNABLE_STATUSES.includes(status);
}

export function hasBeenSigned(agreement: AgreementContext): boolean {
  return !!(
    agreement.tenantSignature ||
    agreement.ownerSignature ||
    agreement.agencySignature
  );
}

export function isImmutableStatus(status: string): boolean {
  return IMMUTABLE_STATUSES.includes(status);
}

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

export function canViewAgreement(user: UserContext, agreement: AgreementContext): boolean {
  const permissions = getPermissionsForRole(user.role);

  switch (permissions.view) {
    case AccessScope.ALL:
      return true;

    case AccessScope.AGENCY:
      if (!user.agencyId) return false;
      return agreement.agencyId === user.agencyId;

    case AccessScope.OWN_CREATED:
      
      if (agreement.createdBy === user.id) return true;
      
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

export function canEditAgreement(user: UserContext, agreement: AgreementContext): boolean {
  
  if (!canPerformAction(user, AgreementAction.EDIT)) return false;

  if (!isEditableStatus(agreement.status)) return false;

  if (isImmutableStatus(agreement.status)) return false;

  if (isMR3XRole(user.role)) return false;

  const permissions = getPermissionsForRole(user.role);

  switch (permissions.view) {
    case AccessScope.AGENCY:
      if (!user.agencyId || agreement.agencyId !== user.agencyId) return false;
      
      // Allow editing if status is AGUARDANDO_ASSINATURA (sent but not fully signed)
      if (agreement.status === AgreementStatus.AGUARDANDO_ASSINATURA) return true;
      
      if (user.role === UserRole.AGENCY_MANAGER && hasBeenSigned(agreement)) return false;
      return true;

    case AccessScope.OWN_CREATED:
      if (user.role === UserRole.BROKER) {
        return agreement.createdBy === user.id || agreement.property?.brokerId === user.id;
      }
      return agreement.createdBy === user.id;

    case AccessScope.PARTY_TO:
      
      return false;

    default:
      return false;
  }
}

export function canDeleteAgreement(user: UserContext, agreement: AgreementContext): boolean {
  
  if (!canPerformAction(user, AgreementAction.DELETE)) return false;

  if (!isDeletableStatus(agreement.status)) return false;

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

export function canSignAgreement(
  user: UserContext,
  agreement: AgreementContext,
  signatureType: SignatureType
): boolean {

  if (!canPerformAction(user, AgreementAction.SIGN)) return false;

  if (!isSignableStatus(agreement.status)) return false;

  const permissions = getPermissionsForRole(user.role);

  if (!permissions.signatureTypes.includes(signatureType)) return false;

  // Convert IDs to strings for comparison to avoid type mismatch
  const userId = String(user.id);
  const agreementTenantId = agreement.tenantId ? String(agreement.tenantId) : null;
  const agreementOwnerId = agreement.ownerId ? String(agreement.ownerId) : null;
  const propertyTenantId = agreement.property?.tenantId ? String(agreement.property.tenantId) : null;
  const propertyOwnerId = agreement.property?.ownerId ? String(agreement.property.ownerId) : null;
  const createdById = agreement.createdBy ? String(agreement.createdBy) : null;

  switch (signatureType) {
    case SignatureType.TENANT:
      if (agreementTenantId !== userId && propertyTenantId !== userId) {
        return false;
      }
      break;

    case SignatureType.OWNER:
      // For PROPRIETARIO role, allow signing if they are the owner or created the agreement
      if (user.role === UserRole.PROPRIETARIO) {
        const isOwner = agreementOwnerId === userId || propertyOwnerId === userId;
        const isCreator = createdById === userId;
        // PROPRIETARIO can sign if they are the owner OR if they can view the agreement (party to it)
        if (!isOwner && !isCreator && !isPartyToAgreement(user, agreement)) {
          return false;
        }
      } else {
        if (agreementOwnerId !== userId && propertyOwnerId !== userId) {
          return false;
        }
      }
      break;

    case SignatureType.AGENCY:
      if (!user.agencyId || agreement.agencyId !== user.agencyId) {
        return false;
      }
      // Agency can only sign after both tenant and owner have signed
      if (!agreement.tenantSignature || !agreement.ownerSignature) {
        return false;
      }
      break;

    case SignatureType.BROKER:
      if (permissions.requiresCreci && !user.creci) return false;
      if (agreement.property?.brokerId !== user.id) return false;
      break;

    case SignatureType.WITNESS:

      break;
  }

  return true;
}

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

function isPartyToAgreement(user: UserContext, agreement: AgreementContext): boolean {
  // Convert IDs to strings for comparison
  const userId = String(user.id);

  if (agreement.tenantId && String(agreement.tenantId) === userId) return true;
  if (agreement.ownerId && String(agreement.ownerId) === userId) return true;

  if (agreement.property) {
    if (agreement.property.ownerId && String(agreement.property.ownerId) === userId) return true;
    if (agreement.property.tenantId && String(agreement.property.tenantId) === userId) return true;
  }

  return false;
}

export function getAvailableActions(user: UserContext, agreement: AgreementContext): AgreementAction[] {
  const actions: AgreementAction[] = [];

  if (canViewAgreement(user, agreement)) actions.push(AgreementAction.VIEW);
  if (canEditAgreement(user, agreement)) actions.push(AgreementAction.EDIT);
  if (canDeleteAgreement(user, agreement)) actions.push(AgreementAction.DELETE);
  if (canApproveAgreement(user, agreement)) actions.push(AgreementAction.APPROVE);
  if (canCancelAgreement(user, agreement)) actions.push(AgreementAction.CANCEL);

  const permissions = getPermissionsForRole(user.role);
  for (const sigType of permissions.signatureTypes) {
    if (canSignAgreement(user, agreement, sigType)) {
      actions.push(AgreementAction.SIGN);
      break;
    }
  }

  if (canPerformAction(user, AgreementAction.SEND_FOR_SIGNATURE)) {
    if (agreement.status === AgreementStatus.RASCUNHO) {
      actions.push(AgreementAction.SEND_FOR_SIGNATURE);
    }
  }

  return [...new Set(actions)];
}

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
