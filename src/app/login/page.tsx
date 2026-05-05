import { LoginForm } from '@/components/login-form'
import { safeAuthRedirectPath } from '@/lib/auth-redirect'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const next = firstQueryValue((await searchParams).next)

  return <LoginForm nextPath={safeAuthRedirectPath(next)} />
}

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}
