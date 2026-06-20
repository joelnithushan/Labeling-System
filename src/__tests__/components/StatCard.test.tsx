import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Package } from 'lucide-react'
import StatCard from '../../components/StatCard'

describe('StatCard', () => {
  it('renders the label', () => {
    render(<StatCard label="Total Products" value={42} icon={Package} />)
    expect(screen.getByText('Total Products')).toBeInTheDocument()
  })

  it('renders a numeric value', () => {
    render(<StatCard label="Total Products" value={42} icon={Package} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders a string value', () => {
    render(<StatCard label="Status" value="Active" icon={Package} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders a suffix when provided', () => {
    render(<StatCard label="Items" value={10} icon={Package} suffix="labels" />)
    expect(screen.getByText('labels')).toBeInTheDocument()
  })

  it('renders without suffix when not provided', () => {
    const { container } = render(<StatCard label="Items" value={10} icon={Package} />)
    expect(container.querySelector('span')).toBeNull()
  })

  it('renders zero value correctly', () => {
    render(<StatCard label="Printed Today" value={0} icon={Package} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
