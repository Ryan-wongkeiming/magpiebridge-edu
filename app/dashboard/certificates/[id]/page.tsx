'use client'

import React, { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { CertificateDetails } from '@/components/certificates/certificate-details'
import { Button } from '@/components/ui/button'
import type { CertificateLike } from '@/lib/certificate-data'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'

export default function CertificatePage({ params }: { params: { certificateId: string } }) {
  const certificateId = params.certificateId
  const [certificate, setCertificate] = useState<CertificateLike | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchCertificate()
  }, [certificateId])

  const fetchCertificate = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/certificates/${certificateId}`)
      const data = await response.json()
      
      if (response.ok) {
        setCertificate(data)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch certificate',
          variant: 'destructive'
        })
        router.push('/dashboard/certificates')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch certificate',
        variant: 'destructive'
      })
      router.push('/dashboard/certificates')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (cert: CertificateLike) => {
    // Navigate to the download endpoint
    router.push(`/api/certificates/${cert.id}/download`)
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-[300px]" />
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    )
  }

  if (!certificate) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Certificate Not Found</h2>
        <p className="text-muted-foreground mb-4">The certificate you're looking for doesn't exist or you don't have permission to view it.</p>
        <Button onClick={() => router.push('/dashboard/certificates')}>
          Back to Certificates
        </Button>
      </div>
    )
  }

  return <CertificateDetails certificate={certificate} onDownload={handleDownload} />
}
