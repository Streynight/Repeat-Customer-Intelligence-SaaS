import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SignupForm } from '@/components/signup-form'
import { signInWithGoogle, signUpWithPassword } from '@/app/actions/auth'

vi.mock('@/app/actions/auth', () => ({
  signInWithGoogle: vi.fn(),
  signUpWithPassword: vi.fn(),
}))

const mockSignUpWithPassword = vi.mocked(signUpWithPassword)
const mockSignInWithGoogle = vi.mocked(signInWithGoogle)

describe('SignupForm', () => {
  beforeEach(() => {
    mockSignUpWithPassword.mockReset()
    mockSignInWithGoogle.mockReset()
    mockSignUpWithPassword.mockResolvedValue({ error: '' })
    mockSignInWithGoogle.mockResolvedValue(undefined)
  })

  it('keeps create account disabled until required fields are filled', async () => {
    const user = userEvent.setup()
    render(<SignupForm />)

    const submit = screen.getByRole('button', { name: /create account/i })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText(/^username$/i), 'store_owner')
    await user.type(screen.getByLabelText(/^email$/i), 'owner@store.com')
    await user.type(screen.getByLabelText(/^password$/i), 'secret123')
    await user.type(screen.getByLabelText(/^confirm password$/i), 'secret123')

    expect(submit).toBeEnabled()
  })

  it('shows an error when passwords do not match', async () => {
    const user = userEvent.setup()
    render(<SignupForm />)

    await user.type(screen.getByLabelText(/^username$/i), 'store_owner')
    await user.type(screen.getByLabelText(/^email$/i), 'owner@store.com')
    await user.type(screen.getByLabelText(/^password$/i), 'secret123')
    await user.type(screen.getByLabelText(/^confirm password$/i), 'secret456')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(mockSignUpWithPassword).not.toHaveBeenCalled()
  })

  it('submits username, email, and password to the signup action', async () => {
    const user = userEvent.setup()
    render(<SignupForm />)

    await user.type(screen.getByLabelText(/^username$/i), 'store_owner')
    await user.type(screen.getByLabelText(/^email$/i), 'owner@store.com')
    await user.type(screen.getByLabelText(/^password$/i), 'secret123')
    await user.type(screen.getByLabelText(/^confirm password$/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(mockSignUpWithPassword).toHaveBeenCalledWith({
      username: 'store_owner',
      email: 'owner@store.com',
      password: 'secret123',
    })
  })

  it('starts the Google sign-in flow', async () => {
    const user = userEvent.setup()
    render(<SignupForm />)

    await user.click(screen.getByRole('button', { name: /continue with google/i }))

    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1)
  })
})
