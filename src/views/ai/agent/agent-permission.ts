export function canEditAiAgent(roles: readonly string[], hasEditPermission: boolean): boolean {
  return roles.includes('R_SUPER') && hasEditPermission;
}
