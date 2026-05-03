'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { signInWithGoogle, signUpWithPassword } from '@/app/actions/auth'
import { BrandLogo } from '@/components/brand-logo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export function SignupForm() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [sending, setSending] = useState(false)
  const [connectingGoogle, setConnectingGoogle] = useState(false)
  const [error, setError] = useState('')

  const createAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!username || !email || !password || !confirmPassword) return

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSending(true)
    setError('')

    const result = await signUpWithPassword({
      username,
      email,
      password,
    })

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
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">Create a clean revenue workspace.</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            New accounts start without demo revenue. Your dashboard, customer profiles, and automation queues appear after you import real orders.
          </p>
          <div className="mt-6 grid gap-3">
            {['No fake customer records', 'Tenant-scoped workspace by default', 'Production services checked before use'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium">
                <CheckCircle2 className="size-4 text-primary" />
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
          <CardTitle className="mt-4 text-2xl font-semibold">Create your RepeatTree account</CardTitle>
          <CardDescription className="leading-6">
            Sign up with a username and password, or continue with Google.
          </CardDescription>
        </CardHeader>

        <CardContent>
        <form className="grid gap-4" onSubmit={(event) => void createAccount(event)}>
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="your_store"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@store.com"
              autoComplete="email"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
            />
          </div>

          <Button
            className="w-full font-semibold"
            disabled={sending || !username || !email || !password || !confirmPassword}
            type="submit"
          >
            {sending ? 'Creating account...' : 'Create account'}
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
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-primary underline underline-offset-2">
            Sign in
          </Link>
        </p>

        <Link href="/dashboard" className="mt-4 block text-center text-sm font-bold text-muted-foreground hover:text-foreground">
          Preview empty workspace
        </Link>
        </CardContent>
      </Card>
      </div>
    </main>
  )
}
