import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CertificateCard } from '@/components/certificates/certificate-card'
import type { CertificateLike } from '@/lib/certificate-data'

describe('CertificateCard component', () => {
  const mockCertificate: CertificateLike = {
    id: 'test-cert-1',
    certificateNumber: 'CERT-001',
    completionDate: new Date('2026-09-30'),
    status: 'active',
    certificateData: {
      courseTitle: 'Test Course',
      userName: 'Test User',
    }
  }

  it('renders certificate card with course title', () => {
    render(<CertificateCard certificate={mockCertificate} />)
    expect(screen.getByText('Test Course')).toBeInTheDocument()
  })

  it('renders certificate number', () => {
    render(<CertificateCard certificate={mockCertificate} />)
    expect(screen.getByText('CERT-001')).toBeInTheDocument()
  })

  it('renders completion date', () => {
    render(<CertificateCard certificate={mockCertificate} />)
    expect(screen.getByText(/September 30, 2026/)).toBeInTheDocument()
  })

  it('renders View button when onView callback is provided', () => {
    const handleView = vi.fn()
    render(<CertificateCard certificate={mockCertificate} onView={handleView} />)
    expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument()
  })

  it('renders Download button when onDownload callback is provided', () => {
    const handleDownload = vi.fn()
    render(<CertificateCard certificate={mockCertificate} onDownload={handleDownload} />)
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument()
  })

  it('does not render View or Download buttons when callbacks are absent', () => {
    render(<CertificateCard certificate={mockCertificate} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('handles missing certificate data gracefully', () => {
    const incompleteCertificate: CertificateLike = {
      id: 'test-cert-2',
      certificateNumber: 'CERT-002',
      completionDate: new Date(),
      status: 'active',
      certificateData: undefined
    }

    render(<CertificateCard certificate={incompleteCertificate} />)
    expect(screen.getByText('Course Title')).toBeInTheDocument()
  })
})
