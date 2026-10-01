import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CertificateDetails } from '@/components/certificates/certificate-details'
import type { CertificateLike } from '@/lib/certificate-data'

const baseCertificate = (overrides: Partial<CertificateLike> = {}): CertificateLike => ({
  id: 'cert-1',
  certificateNumber: 'CERT-001',
  completionDate: new Date('2026-09-30'),
  status: 'active',
  certificateData: {
    courseTitle: 'Microsoft Project 2019',
    userName: 'Learner User',
    institutionName: 'MagpieBridge Education Platform',
  },
  ...overrides,
})

describe('CertificateDetails component', () => {
  it('renders the certificate number and course title', () => {
    render(<CertificateDetails certificate={baseCertificate()} />)
    expect(screen.getByText('CERT-001')).toBeInTheDocument()
    expect(screen.getByText('Microsoft Project 2019')).toBeInTheDocument()
  })

  it('renders the learner name under "Issued To"', () => {
    render(<CertificateDetails certificate={baseCertificate()} />)
    expect(screen.getByText('Learner User')).toBeInTheDocument()
  })

  it('renders the completion date formatted', () => {
    render(<CertificateDetails certificate={baseCertificate()} />)
    expect(screen.getByText(/September 30, 2026/)).toBeInTheDocument()
  })

  it('renders fallback text when certificateData is missing', () => {
    render(<CertificateDetails certificate={baseCertificate({ certificateData: undefined })} />)
    // The component falls back to placeholder strings for the course title.
    expect(screen.getByText('Course Title')).toBeInTheDocument()
  })

  it('renders the Download button when onDownload is provided', () => {
    const handleDownload = vi.fn()
    render(<CertificateDetails certificate={baseCertificate()} onDownload={handleDownload} />)
    expect(screen.getByRole('button', { name: /download certificate/i })).toBeInTheDocument()
  })

  it('fires onDownload with the certificate when clicked', () => {
    const handleDownload = vi.fn()
    render(<CertificateDetails certificate={baseCertificate()} onDownload={handleDownload} />)
    fireEvent.click(screen.getByRole('button', { name: /download certificate/i }))
    expect(handleDownload).toHaveBeenCalledTimes(1)
    expect(handleDownload).toHaveBeenCalledWith(expect.objectContaining({ id: 'cert-1' }))
  })

  it('does not render the Download button when onDownload is absent', () => {
    render(<CertificateDetails certificate={baseCertificate()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
