'use client'

import React, { useState, useEffect } from 'react'
import { AdminCertificateManagement } from '@/components/certificates/admin-certificate-management'
import { Certificate } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function AdminCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: session, status } = useSession()
  const router = useRouter()

  // Check if user is admin
  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user || !session.user.roles?.includes('admin')) {
      router.push('/login')
      return
    }

    fetchCertificates()
  }, [session, status, router])

  const fetchCertificates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/certificates')
      
      if (!response.ok) {
        throw new Error('Failed to fetch certificates')
      }
      
      const data = await response.json()
      setCertificates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (loading) {
    return <div>Loading certificates...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Certificate Management</h1>
      <AdminCertificateManagement certificates={certificates} />
    </div>
  )
}