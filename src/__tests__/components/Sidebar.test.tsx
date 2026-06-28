import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { mockElectron } from '../setup'

function renderSidebar(onLogout = vi.fn()) {
  return render(
    <MemoryRouter>
      <Sidebar onLogout={onLogout} />
    </MemoryRouter>
  )
}

// ── Navigation ────────────────────────────────────────────────────────────────

describe('Sidebar — navigation', () => {
  it('renders all six nav items', () => {
    renderSidebar()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Products')).toBeInTheDocument()
    expect(screen.getByText('Stock')).toBeInTheDocument()
    expect(screen.getByText('Print Label')).toBeInTheDocument()
    expect(screen.getByText('Barcode History')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('calls onLogout when Sign Out is clicked', async () => {
    const onLogout = vi.fn()
    renderSidebar(onLogout)
    await userEvent.click(screen.getByText(/sign out/i))
    expect(onLogout).toHaveBeenCalledOnce()
  })
})

// ── Branding ──────────────────────────────────────────────────────────────────

describe('Sidebar — branding', () => {
  it('shows shop name loaded from settings', async () => {
    renderSidebar()
    await waitFor(() => {
      expect(screen.getByText('Test Mill Shop')).toBeInTheDocument()
    })
  })

  it('falls back to "Mill Label" when shop name is empty', async () => {
    mockElectron.db.getSettings.mockResolvedValueOnce({
      shop_name: '', logo: '', theme: 'dark',
      label_net_wt: 'NET WT', label_price: 'PRICE',
      label_mfg: 'Mfg Date', label_exp: 'Exp Date',
    })
    renderSidebar()
    await waitFor(() => {
      expect(screen.getByText('Mill Label')).toBeInTheDocument()
    })
  })

  it('shows wheat icon when no logo is set', async () => {
    renderSidebar()
    await waitFor(() => screen.getByText('Test Mill Shop'))
    // Logo img should not be present
    expect(screen.queryByRole('img', { name: 'Logo' })).not.toBeInTheDocument()
  })

  it('shows logo image when logo is set', async () => {
    mockElectron.db.getSettings.mockResolvedValueOnce({
      shop_name: 'Test Shop',
      logo: 'data:image/png;base64,abc123',
      theme: 'dark',
      label_net_wt: 'NET WT', label_price: 'PRICE',
      label_mfg: 'Mfg Date', label_exp: 'Exp Date',
    })
    renderSidebar()
    await waitFor(() => {
      const img = screen.getByRole('img', { name: 'Logo' })
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'data:image/png;base64,abc123')
    })
  })

  it('updates when settingsUpdated event fires', async () => {
    renderSidebar()
    await waitFor(() => screen.getByText('Test Mill Shop'))

    mockElectron.db.getSettings.mockResolvedValueOnce({
      shop_name: 'New Shop Name', logo: '', theme: 'dark',
      label_net_wt: 'NET WT', label_price: 'PRICE',
      label_mfg: 'Mfg Date', label_exp: 'Exp Date',
    })
    window.dispatchEvent(new CustomEvent('settingsUpdated'))

    await waitFor(() => {
      expect(screen.getByText('New Shop Name')).toBeInTheDocument()
    })
  })
})
