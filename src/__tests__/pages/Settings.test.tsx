import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Settings from '../../pages/Settings'
import { mockElectron } from '../setup'

// DataManagementSection uses localStorage which is unavailable in jsdom
vi.mock('../../components/settings/DataManagementSection', () => ({
  default: () => <div data-testid="data-management" />,
}))

function renderSettings() {
  return render(<Settings />)
}

afterEach(() => {
  document.documentElement.classList.remove('theme-light')
})

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('Settings — rendering', () => {
  it('renders Shop Information section', () => {
    renderSettings()
    expect(screen.getByText('Shop Information')).toBeInTheDocument()
  })

  it('renders Printer Setup section', () => {
    renderSettings()
    expect(screen.getByText('Printer Setup')).toBeInTheDocument()
  })

  it('renders Login Credentials section', () => {
    renderSettings()
    expect(screen.getByText('Login Credentials')).toBeInTheDocument()
  })

  it('renders Preferences section with Light and Dark buttons', () => {
    renderSettings()
    expect(screen.getByText('Preferences')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /light/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dark/i })).toBeInTheDocument()
  })

  it('renders logo upload button', () => {
    renderSettings()
    expect(screen.getByRole('button', { name: /upload logo/i })).toBeInTheDocument()
  })

  it('pre-fills shop name from DB on load', async () => {
    renderSettings()
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Mill Shop')).toBeInTheDocument()
    })
  })

  it('pre-fills username from DB on load', async () => {
    renderSettings()
    await waitFor(() => {
      const usernameInput = screen.getByPlaceholderText('Enter username')
      expect(usernameInput).toHaveValue('admin')
    })
  })
})

// ── Theme toggle ──────────────────────────────────────────────────────────────

describe('Settings — theme toggle', () => {
  it('adds theme-light class to <html> when Light is clicked', async () => {
    renderSettings()
    await waitFor(() => screen.getByDisplayValue('Test Mill Shop'))
    await userEvent.click(screen.getByRole('button', { name: /light/i }))
    expect(document.documentElement.classList.contains('theme-light')).toBe(true)
  })

  it('removes theme-light class when Dark is clicked', async () => {
    document.documentElement.classList.add('theme-light')
    renderSettings()
    await waitFor(() => screen.getByDisplayValue('Test Mill Shop'))
    await userEvent.click(screen.getByRole('button', { name: /dark/i }))
    expect(document.documentElement.classList.contains('theme-light')).toBe(false)
  })
})

// ── Save ──────────────────────────────────────────────────────────────────────

describe('Settings — save', () => {
  it('calls updateSettings when Save Settings is clicked', async () => {
    renderSettings()
    await waitFor(() => screen.getByDisplayValue('Test Mill Shop'))
    await userEvent.click(screen.getByRole('button', { name: /save settings/i }))
    await waitFor(() => expect(mockElectron.db.updateSettings).toHaveBeenCalled())
  })

  it('shows "Saved!" confirmation after successful save', async () => {
    renderSettings()
    await waitFor(() => screen.getByDisplayValue('Test Mill Shop'))
    await userEvent.click(screen.getByRole('button', { name: /save settings/i }))
    await waitFor(() => expect(screen.getByText('Saved!')).toBeInTheDocument())
  })

  it('triggers save on Ctrl+S', async () => {
    renderSettings()
    await waitFor(() => screen.getByDisplayValue('Test Mill Shop'))
    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    await waitFor(() => expect(mockElectron.db.updateSettings).toHaveBeenCalled())
  })

  it('triggers save on Cmd+S (Meta key)', async () => {
    renderSettings()
    await waitFor(() => screen.getByDisplayValue('Test Mill Shop'))
    fireEvent.keyDown(window, { key: 's', metaKey: true })
    await waitFor(() => expect(mockElectron.db.updateSettings).toHaveBeenCalled())
  })

  it('dispatches settingsUpdated event after save', async () => {
    const listener = vi.fn()
    window.addEventListener('settingsUpdated', listener)
    renderSettings()
    await waitFor(() => screen.getByDisplayValue('Test Mill Shop'))
    await userEvent.click(screen.getByRole('button', { name: /save settings/i }))
    await waitFor(() => expect(listener).toHaveBeenCalled())
    window.removeEventListener('settingsUpdated', listener)
  })
})

// ── Logo upload ───────────────────────────────────────────────────────────────

describe('Settings — logo upload', () => {
  it('shows logo preview and remove button when logo is loaded', async () => {
    mockElectron.db.getSettings.mockResolvedValueOnce({
      shop_name: 'Test Mill Shop', printer_name: '', label_size: '100x50',
      date_format: 'dd/MM/yyyy', address: '', phone: '',
      username: 'admin', password: 'admin',
      logo: 'data:image/png;base64,abc123', theme: 'dark',
      label_net_wt: 'NET WT', label_price: 'PRICE',
      label_mfg: 'Mfg Date', label_exp: 'Exp Date',
    })
    renderSettings()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /change logo/i })).toBeInTheDocument()
    })
  })

  it('shows Upload Logo button when no logo is set', async () => {
    renderSettings()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /upload logo/i })).toBeInTheDocument()
    })
  })
})
