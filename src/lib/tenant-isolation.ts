export type TenantScope = {
  organizationId: string
  workspaceId: string
}

export function storeAccessWhere(storeId: string, scope: TenantScope) {
  return {
    id: storeId,
    workspaceId: scope.workspaceId,
  }
}

export function workspaceAccessWhere(workspaceId: string, scope: TenantScope) {
  return {
    id: workspaceId,
    organizationId: scope.organizationId,
  }
}
