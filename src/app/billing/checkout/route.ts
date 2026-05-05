import { NextResponse, type NextRequest } from 'next/server'
import { createBillingCheckoutForTenant, parseBillingCheckoutPlan } from '@/lib/billing/checkout'
import { hasPermission } from '@/lib/rbac'
import { getTenantContext } from '@/lib/tenancy'

export async function GET(request: NextRequest) {
  const plan = parseBillingCheckoutPlan(request.nextUrl.searchParams.get('plan'))
  if (!plan) return NextResponse.redirect(new URL('/pricing?checkout=invalid', request.url))

  const nextPath = `/billing/checkout?plan=${encodeURIComponent(plan)}`
  const context = await getTenantContext()
  if (!context) {
    return NextResponse.redirect(new URL(`/signup?next=${encodeURIComponent(nextPath)}`, request.url))
  }

  if (!hasPermission(context.role, 'manageBilling', context.permissions)) {
    return NextResponse.redirect(new URL('/settings?billing=permission', request.url))
  }

  try {
    return NextResponse.redirect(await createBillingCheckoutForTenant(context, plan))
  } catch {
    return NextResponse.redirect(new URL(`/pricing?checkout=error&plan=${encodeURIComponent(plan)}`, request.url))
  }
}
