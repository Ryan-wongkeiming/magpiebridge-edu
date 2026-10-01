'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'

export default function CertificateValidator() {
  const [certificateNumber, setCertificateNumber] = useState('')
  const [validationResult, setValidationResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleValidate = async () => {
    if (!certificateNumber.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a certificate number',
        variant: 'destructive'
      })
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/validate-certificate?certificateNumber=${encodeURIComponent(certificateNumber)}`)
      const data = await response.json()

      if (response.ok && data.valid) {
        setValidationResult(data.certificate)
      } else {
        setValidationResult(null)
        toast({
          title: 'Invalid Certificate',
          description: data.error || 'The certificate number is invalid',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to validate certificate',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Certificate Validator</CardTitle>
          <CardDescription>Enter a certificate number to verify its authenticity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="Enter certificate number"
              value={certificateNumber}
              onChange={(e) => setCertificateNumber(e.target.value)}
              disabled={loading}
            />
            {validationResult && (
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
                <h3 className="font-semibold text-green-800 dark:text-green-200">Valid Certificate</h3>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  This certificate was issued to <strong>{validationResult.userName}</strong> for completing <strong>{validationResult.courseTitle}</strong>.
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  Certificate ID: {validationResult.certificateNumber}
                </p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={handleValidate} 
            disabled={loading || !certificateNumber.trim()}
          >
            {loading ? 'Validating...' : 'Validate Certificate'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}