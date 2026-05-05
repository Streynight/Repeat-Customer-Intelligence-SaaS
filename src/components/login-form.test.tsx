import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from '@/components/login-form'
import { signInWithGoogle, signInWithPassword } from '@/app/actions/auth'

vi.mock('@/app/actions/auth', () => ({
  signInWithGoogle: vi.fn(),
  signInWithPassword: vi.fn(),
}))

const mockSignInWithPassword = vi.mocked(signInWithPassword)
const mockSignInWithGoogle = vi.mocked(signInWithGoogle)

describe('LoginForm', () => {
  beforeEach(() => {
    mockSignInWithPassword.mockReset()
    mockSignInWithGoogle.mockReset()
    mockSignInWithPassword.mockResolvedValue({ error: '' })
    mockSignInWithGoogle.mockResolvedValue(undefined)
  })

  it('submits an email and password to the login action', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText(/^username or email$/i), 'owner@store.com')
    await user.type(screen.getByLabelText(/^password$/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      identifier: 'owner@store.com',
      nextPath: '/dashboard',
      password: 'secret123',
    })
  })

  it('submits a username and password to the login action', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText(/^username or email$/i), 'store_owner')
    await user.type(screen.getByLabelText(/^password$/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      identifier: 'store_owner',
      nextPath: '/dashboard',
      password: 'secret123',
    })
  })

  it('shows the action error when a username is not found', async () => {
    const user = userEvent.setup()
    mockSignInWithPassword.mockResolvedValue({ error: 'Username, email, or password is incorrect.' })
    render(<LoginForm />)

    await user.type(screen.getByLabelText(/^username or email$/i), 'missing_user')
    await user.type(screen.getByLabelText(/^password$/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect(screen.getByText('Username, email, or password is incorrect.')).toBeInTheDocument()
  })

  it('starts the Google sign-in flow', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.click(screen.getByRole('button', { name: /continue with google/i }))

    expect(mockSignInWithGoogle).toHaveBeenCalledWith('/dashboard')
  })
})
