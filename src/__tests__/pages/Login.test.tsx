import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Login from '../../pages/Login'

describe('Login page', () => {
  it('renders username and password fields with a sign-in button', () => {
    render(<Login onLogin={vi.fn()} />)
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('sign-in button is disabled when fields are empty', () => {
    render(<Login onLogin={vi.fn()} />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()
  })

  it('sign-in button enables when both fields are filled', async () => {
    render(<Login onLogin={vi.fn().mockResolvedValue(true)} />)
    fireEvent.change(screen.getByPlaceholderText('Enter username'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'admin' } })
    expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled()
  })

  it('calls onLogin with trimmed username and password on submit', async () => {
    const onLogin = vi.fn().mockResolvedValue(true)
    render(<Login onLogin={onLogin} />)
    fireEvent.change(screen.getByPlaceholderText('Enter username'), { target: { value: '  admin  ' } })
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'admin' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('admin', 'admin'))
  })

  it('shows error message when onLogin returns false', async () => {
    const onLogin = vi.fn().mockResolvedValue(false)
    render(<Login onLogin={onLogin} />)
    fireEvent.change(screen.getByPlaceholderText('Enter username'), { target: { value: 'wrong' } })
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() =>
      expect(screen.getByText(/incorrect username or password/i)).toBeInTheDocument()
    )
  })

  it('does not display any credentials hint on the login screen', () => {
    render(<Login onLogin={vi.fn()} />)
    // No hints like "default: admin/admin" should appear anywhere
    expect(screen.queryByText(/admin/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/default/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/hint/i)).not.toBeInTheDocument()
  })

  it('can toggle password visibility', () => {
    render(<Login onLogin={vi.fn()} />)
    const input = screen.getByPlaceholderText('Enter password')
    expect(input).toHaveAttribute('type', 'password')
    // The toggle button is the only button besides submit while fields are empty
    const toggleBtn = screen.getByRole('button', { name: '' })
    fireEvent.click(toggleBtn)
    expect(input).toHaveAttribute('type', 'text')
    fireEvent.click(toggleBtn)
    expect(input).toHaveAttribute('type', 'password')
  })
})
