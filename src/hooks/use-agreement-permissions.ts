import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { UserContext, AgreementContext } from '../lib/agreement-permissions';
import {
  AgreementAction,
  SignatureType,
  canPerformAction,
  canViewAgreement,
  canEditAgreement,
  canDeleteAgreement,
  canSignAgreement,
  canApproveAgreement,
  canCancelAgreement,
  getAvailableActions,
  getUserPermissionsSummary,
  getPermissionsForRole,
  isEditableStatus,
  isDeletableStatus,
  isSignableStatus,
  hasBeenSigned,
  isImmutableStatus,
} from '../lib/agreement-permissions';

/**
 * Hook to get agreement permissions for the current user
 */
export function useAgreementPermissions() {
  const { user } = useAuth();

  const userContext: UserContext = useMemo(() => ({
    id: user?.id || '',
    role: user?.role || '',
    agencyId: user?.agencyId,
    brokerId: undefined, // Would need to be set if user is a broker
    creci: undefined, // Would need to be set if user is a broker
  }), [user]);

  const permissions = useMemo(() => {
    if (!user) {
      return {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canSign: false,
        canApprove: false,
        canReject: false,
        canCancel: false,
        canSendForSignature: false,
        isMR3XRole: false,
      };
    }
    return getUserPermissionsSummary(userContext);
  }, [user, userContext]);

  // Check if user can perform a general action
  const checkAction = (action: AgreementAction): boolean => {
    if (!user) return false;
    return canPerformAction(userContext, action);
  };

  // Check if user can view a specific agreement
  const checkViewAgreement = (agreement: AgreementContext): boolean => {
    if (!user) return false;
    return canViewAgreement(userContext, agreement);
  };

  // Check if user can edit a specific agreement
  const checkEditAgreement = (agreement: AgreementContext): boolean => {
    if (!user) return false;
    return canEditAgreement(userContext, agreement);
  };

  // Check if user can delete a specific agreement
  const checkDeleteAgreement = (agreement: AgreementContext): boolean => {
    if (!user) return false;
    return canDeleteAgreement(userContext, agreement);
  };

  // Check if user can sign a specific agreement
  const checkSignAgreement = (agreement: AgreementContext, signatureType: SignatureType): boolean => {
    if (!user) return false;
    return canSignAgreement(userContext, agreement, signatureType);
  };

  // Check if user can approve a specific agreement
  const checkApproveAgreement = (agreement: AgreementContext): boolean => {
    if (!user) return false;
    return canApproveAgreement(userContext, agreement);
  };

  // Check if user can cancel a specific agreement
  const checkCancelAgreement = (agreement: AgreementContext): boolean => {
    if (!user) return false;
    return canCancelAgreement(userContext, agreement);
  };

  // Get available actions for a specific agreement
  const getActions = (agreement: AgreementContext): AgreementAction[] => {
    if (!user) return [];
    return getAvailableActions(userContext, agreement);
  };

  // Get role permissions
  const rolePermissions = useMemo(() => {
    if (!user) return null;
    return getPermissionsForRole(user.role);
  }, [user]);

  return {
    // General permissions
    permissions,
    rolePermissions,
    userContext,

    // Action checks
    checkAction,

    // Agreement-specific checks
    checkViewAgreement,
    checkEditAgreement,
    checkDeleteAgreement,
    checkSignAgreement,
    checkApproveAgreement,
    checkCancelAgreement,
    getActions,

    // Status helpers
    isEditableStatus,
    isDeletableStatus,
    isSignableStatus,
    hasBeenSigned,
    isImmutableStatus,
    isMR3XRole: permissions.isMR3XRole,

    // Re-export types for convenience
    AgreementAction,
    SignatureType,
  };
}

/**
 * Hook to check permissions for a specific agreement
 */
export function useAgreementActions(agreement: AgreementContext | null) {
  const { user } = useAuth();

  const userContext: UserContext = useMemo(() => ({
    id: user?.id || '',
    role: user?.role || '',
    agencyId: user?.agencyId,
    brokerId: undefined,
    creci: undefined,
  }), [user]);

  const actions = useMemo(() => {
    if (!user || !agreement) {
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canSign: false,
        canSignAsTenant: false,
        canSignAsOwner: false,
        canSignAsAgency: false,
        canSignAsBroker: false,
        canApprove: false,
        canCancel: false,
        canSendForSignature: false,
        availableActions: [] as AgreementAction[],
      };
    }

    return {
      canView: canViewAgreement(userContext, agreement),
      canEdit: canEditAgreement(userContext, agreement),
      canDelete: canDeleteAgreement(userContext, agreement),
      canSign: canPerformAction(userContext, AgreementAction.SIGN),
      canSignAsTenant: canSignAgreement(userContext, agreement, SignatureType.TENANT),
      canSignAsOwner: canSignAgreement(userContext, agreement, SignatureType.OWNER),
      canSignAsAgency: canSignAgreement(userContext, agreement, SignatureType.AGENCY),
      canSignAsBroker: canSignAgreement(userContext, agreement, SignatureType.BROKER),
      canApprove: canApproveAgreement(userContext, agreement),
      canCancel: canCancelAgreement(userContext, agreement),
      canSendForSignature: canPerformAction(userContext, AgreementAction.SEND_FOR_SIGNATURE) &&
                           agreement.status === 'RASCUNHO',
      availableActions: getAvailableActions(userContext, agreement),
    };
  }, [user, agreement, userContext]);

  return actions;
}

export default useAgreementPermissions;
