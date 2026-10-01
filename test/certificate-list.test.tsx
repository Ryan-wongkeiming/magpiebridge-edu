import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CertificateList } from '@/components/certificates/certificate-list'
import type { CertificateLike } from '@/lib/certificate-data'

const baseCertificate = (overrides: Partial<CertificateLike> = {}): CertificateLike => ({
  id: 'cert-1',
  certificateNumber: 'CERT-001',
  completionDate: new Date('2026-09-30'),
  status: 'active',
  certificateData: {
    courseTitle: 'Test Course',
    userName: 'Test User',
  },
  ...overrides,
})

describe('CertificateList component', () => {
  it('renders the empty-state message when the list is empty', () => {
    render(<CertificateList certificates={[]} />)
    expect(screen.getByText('No certificates found.')).toBeInTheDocument()
  })

  it('renders the empty-state message when certificates is not an array', () => {
    // The component guards against non-array input (catalog returns this shape
    // sometimes). Passing null must not crash the render.
    render(<CertificateList certificates={null as unknown as CertificateLike[]} />)
    expect(screen.getByText('No certificates found.')).toBeInTheDocument()
  })

  it('renders one card per certificate', () => {
    const certificates = [
      baseCertificate({ id: 'cert-1', certificateNumber: 'CERT-001', certificateData: { courseTitle: 'Alpha' } }),
      baseCertificate({ id: 'cert-2', certificateNumber: 'CERT-002', certificateData: { courseTitle: 'Beta' } }),
    ]
    render(<CertificateList certificates={certificates} />)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('CERT-001')).toBeInTheDocument()
    expect(screen.getByText('CERT-002')).toBeInTheDocument()
  })

  it('fires onView with the clicked certificate', () => {
    const handleView = vi.fn()
    const certificates = [baseCertificate({ id: 'cert-1' })]
    render(<CertificateList certificates={certificates} onView={handleView} />)
    fireEvent.click(screen.getByRole('button', { name: /view/i }))
    expect(handleView).toHaveBeenCalledTimes(1)
    expect(handleView).toHaveBeenCalledWith(expect.objectContaining({ id: 'cert-1' }))
  })

  it('fires onDownload with the clicked certificate', () => {
    const handleDownload = vi.fn()
    const certificates = [baseCertificate({ id: 'cert-1' })]
    render(<CertificateList certificates={certificates} onDownload={handleDownload} />)
    fireEvent.click(screen.getByRole('button', { name: /download/i }))
    expect(handleDownload).toHaveBeenCalledTimes(1)
    expect(handleDownload).toHaveBeenCalledWith(expect.objectContaining({ id: 'cert-1' }))
  })

  it('does not render View/Download buttons when callbacks are absent', () => {
    const certificates = [baseCertificate()]
    render(<CertificateList certificates={certificates} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
