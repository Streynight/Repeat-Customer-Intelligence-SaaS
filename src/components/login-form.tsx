'use client'

import { useState } from 'react'
import Link from 'next/link'
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
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <Card className="w-full max-w-md border-primary/10">
        <CardHeader>
          <Link href="/" aria-label="RepeatTree home">
            <BrandLogo />
          </Link>
          <CardTitle className="mt-4 text-2xl font-black">Sign in</CardTitle>
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
            className="w-full font-black"
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
          className="w-full font-black"
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
    </main>
  )
}
