export type LegacyUserTenancySnapshot = {
  userId: string
  email: string
  username?: string | null
  hasMembership: boolean
  workspaceCount: number
  billingSubscriptionExists: boolean
  attachedStoreCount: number
  unattachedLegacyStoreCount: number
}

export type TenancyBackfillAction =
  | 'createOrganization'
  | 'createDefaultWorkspace'
  | 'createBillingSubscription'
  | 'attachLegacyStores'
  | 'createPrimaryStore'

export type TenancyBackfillUserPlan = {
  userId: string
  email: string
  actions: TenancyBackfillAction[]
}

export function planTenancyBackfillForUser(snapshot: LegacyUserTenancySnapshot): TenancyBackfillUserPlan {
  const actions = new Set<TenancyBackfillAction>()
  const totalStores = snapshot.attachedStoreCount + snapshot.unattachedLegacyStoreCount

  if (!snapshot.hasMembership) {
    actions.add('createOrganization')
    actions.add('createDefaultWorkspace')
    actions.add('createBillingSubscription')
  }

  if (snapshot.hasMembership && snapshot.workspaceCount === 0) {
    actions.add('createDefaultWorkspace')
  }

  if (snapshot.hasMembership && !snapshot.billingSubscriptionExists) {
    actions.add('createBillingSubscription')
  }

  if (snapshot.unattachedLegacyStoreCount > 0) {
    actions.add('attachLegacyStores')
  }

  if (totalStores === 0) {
    actions.add('createPrimaryStore')
  }

  return {
    userId: snapshot.userId,
    email: snapshot.email,
    actions: Array.from(actions),
  }
}

export function summarizeTenancyBackfillPlans(plans: TenancyBackfillUserPlan[]) {
  return plans.reduce(
    (summary, plan) => {
      summary.usersScanned += 1
      if (plan.actions.length > 0) summary.usersNeedingBackfill += 1
      for (const action of plan.actions) summary.actions[action] += 1
      return summary
    },
    {
      usersScanned: 0,
      usersNeedingBackfill: 0,
      actions: {
        createOrganization: 0,
        createDefaultWorkspace: 0,
        createBillingSubscription: 0,
        attachLegacyStores: 0,
        createPrimaryStore: 0,
      } satisfies Record<TenancyBackfillAction, number>,
    },
  )
}

export function slugifyTenantName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'organization'
}

export function displayNameFromEmail(email: string) {
  const localPart = email.split('@')[0] || 'Customer'
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Customer'
}
