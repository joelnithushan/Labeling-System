import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from '../../pages/Login'

const onLogin = vi.fn()

function renderLogin(loginResult = true) {
  onLogin.mockResolvedValue(loginResult)
  return render(<Login onLogin={onLogin} />)
}

describe('Login page — rendering', () => {
  it('renders the app title', () => {
    renderLogin()
    expect(screen.getByText('Mill Label System')).toBeInTheDocument()
  })

  it('renders username and password fields', () => {
    renderLogin()
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument()
  })

  it('renders the Sign In button', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows default credentials hint', () => {
    renderLogin()
    expect(screen.getByText(/default credentials/i)).toBeInTheDocument()
  })
})

describe('Login page — validation', () => {
  it('Sign In button is disabled when fields are empty', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()
  })

  it('Sign In button is disabled when only username is filled', async () => {
    renderLogin()
    await userEvent.type(screen.getByPlaceholderText('Enter username'), 'admin')
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()
  })

  it('Sign In button is enabled when both fields are filled', async () => {
    renderLogin()
    await userEvent.type(screen.getByPlaceholderText('Enter username'), 'admin')
    await userEvent.type(screen.getByPlaceholderText('Enter password'), 'admin')
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled()
  })
})

describe('Login page — submission', () => {
  it('calls onLogin with username and password on submit', async () => {
    renderLogin()
    await userEvent.type(screen.getByPlaceholderText('Enter username'), 'admin')
    await userEvent.type(screen.getByPlaceholderText('Enter password'), 'admin')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('admin', 'admin'))
  })

  it('shows error message on failed login', async () => {
    renderLogin(false)
    await userEvent.type(screen.getByPlaceholderText('Enter username'), 'admin')
    await userEvent.type(screen.getByPlaceholderText('Enter password'), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText('Incorrect username or password.')).toBeInTheDocument()
  })

  it('does not show error before submission', () => {
    renderLogin()
    expect(screen.queryByText('Incorrect username or password.')).not.toBeInTheDocument()
  })
})

describe('Login page — password visibility toggle', () => {
  it('password is hidden by default', () => {
    renderLogin()
    expect(screen.getByPlaceholderText('Enter password')).toHaveAttribute('type', 'password')
  })

  it('toggles password visibility when eye icon is clicked', async () => {
    renderLogin()
    const toggleBtn = screen.getByRole('button', { name: '' })
    await userEvent.click(toggleBtn)
    expect(screen.getByPlaceholderText('Enter password')).toHaveAttribute('type', 'text')
    await userEvent.click(toggleBtn)
    expect(screen.getByPlaceholderText('Enter password')).toHaveAttribute('type', 'password')
  })
})
