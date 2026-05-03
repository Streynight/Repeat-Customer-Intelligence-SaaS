'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Database, ShieldCheck } from 'lucide-react'
import { signInWithGoogle, signInWithPassword } from '@/app/actions/auth'
import { BrandLogo } from '@/components/brand-logo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export function LoginForm() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [sending, setSending] = useState(false)
  const [connectingGoogle, setConnectingGoogle] = useState(false)
  const [error, setError] = useState('')

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!identifier || !password) return

    setSending(true)
    setError('')

    const result = await signInWithPassword({ identifier, password })

    setSending(false)
    if (result?.error) setError(result.error)
  }

  const continueWithGoogle = async () => {
    setConnectingGoogle(true)
    await signInWithGoogle()
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-8">
      <div className="grid w-full max-w-5xl gap-5 lg:grid-cols-[1fr_430px] lg:items-center">
        <section className="hidden rounded-lg border border-border bg-card p-8 shadow-lg lg:block">
          <div className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck size={22} />
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">Return to your operating workspace.</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            Access tenant-scoped imports, repeat revenue views, customer risk queues, and production health checks from the same workspace.
          </p>
          <div className="mt-6 grid gap-3">
            {['Tenant context is enforced', 'Health checks run against live services', 'Workspace data stays empty until imported'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium">
                <Database className="size-4 text-primary" />
                {item}
              </div>
            ))}
          </div>
        </section>
      <Card className="w-full border-border">
        <CardHeader>
          <Link href="/" aria-label="RepeatTree home">
            <BrandLogo />
          </Link>
          <CardTitle className="mt-4 text-2xl font-semibold">Sign in</CardTitle>
          <CardDescription className="leading-6">
            Use your username or email and password, or continue with Google.
          </CardDescription>
        </CardHeader>

        <CardContent>
        <form className="grid gap-4" onSubmit={(event) => void login(event)}>
          <div className="grid gap-2">
            <Label htmlFor="identifier">Username or email</Label>
            <Input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="your_store or you@store.com"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
            />
          </div>

          <Button
            className="w-full font-semibold"
            disabled={sending || !identifier || !password}
            type="submit"
          >
            {sending ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase text-muted-foreground">
          <Separator className="flex-1" />
          or
          <Separator className="flex-1" />
        </div>

        <Button
          variant="outline"
          className="w-full font-semibold"
          disabled={connectingGoogle}
          onClick={() => void continueWithGoogle()}
          type="button"
        >
          {connectingGoogle ? 'Connecting...' : 'Continue with Google'}
        </Button>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to RepeatTree?{' '}
          <Link href="/signup" className="font-bold text-primary underline underline-offset-2">
            Create account
          </Link>
        </p>
        </CardContent>
      </Card>
      </div>
    </main>
  )
}
