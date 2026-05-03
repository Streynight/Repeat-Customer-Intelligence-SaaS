'use client'

import { useState } from 'react'
import Link from 'next/link'
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
      <Card className="w-full max-w-md border-primary/10">
        <CardHeader>
          <Link href="/" aria-label="RepeatTree home">
            <BrandLogo />
          </Link>
          <CardTitle className="mt-4 text-2xl font-black">Create your RepeatTree account</CardTitle>
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
            className="w-full font-black"
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
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-primary underline underline-offset-2">
            Sign in
          </Link>
        </p>

        <Link href="/dashboard" className="mt-4 block text-center text-sm font-bold text-muted-foreground hover:text-foreground">
          Continue to clean dashboard
        </Link>
        </CardContent>
      </Card>
    </main>
  )
}
