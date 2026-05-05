import { SignupForm } from '@/components/signup-form'
import { safeAuthRedirectPath } from '@/lib/auth-redirect'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const next = firstQueryValue((await searchParams).next)

  return <SignupForm nextPath={safeAuthRedirectPath(next)} />
}

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}
