import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TutorialsContent } from '@/components/tutorials/tutorials-content'

describe('TutorialsContent', () => {
  it('shows the first-run customer workflow with direct product links', () => {
    render(<TutorialsContent />)

    expect(screen.getByRole('heading', { name: /step-by-step setup/i })).toBeInTheDocument()
    expect(screen.getByText('Import real orders')).toBeInTheDocument()
    expect(screen.getByText('Read the dashboard first')).toBeInTheDocument()
    expect(screen.getByText('Weekly operating rhythm')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open imports/i })).toHaveAttribute('href', '/imports')
    expect(screen.getByRole('link', { name: /open dashboard/i })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: /open action queues/i })).toHaveAttribute('href', '/customers')
  })

  it('teaches the required CSV fields before import', () => {
    render(<TutorialsContent />)

    expect(screen.getByText('CSV file checklist')).toBeInTheDocument()
    expect(screen.getByText('order_id')).toBeInTheDocument()
    expect(screen.getByText('phone or email')).toBeInTheDocument()
    expect(screen.getByText('total_amount')).toBeInTheDocument()
  })
})
