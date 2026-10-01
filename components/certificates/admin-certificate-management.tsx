'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CertificateLike } from '@/lib/certificate-data'
import { format } from 'date-fns'
import { getCertificateData } from '@/lib/certificate-data'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface AdminCertificateManagementProps {
  certificates: CertificateLike[]
}

export function AdminCertificateManagement({ certificates }: AdminCertificateManagementProps) {
  const [filteredCertificates, setFilteredCertificates] = useState<CertificateLike[]>(certificates)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [certificateToRevoke, setCertificateToRevoke] = useState<CertificateLike | null>(null)
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false)

  useEffect(() => {
    let result = certificates
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(cert => {
        const data = getCertificateData(cert)
        return (
          data.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          data.courseTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cert.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(cert => cert.status === statusFilter)
    }
    
    // Apply date range filter
    if (dateFrom) {
      result = result.filter(cert => new Date(cert.completionDate) >= new Date(dateFrom))
    }
    
    if (dateTo) {
      result = result.filter(cert => new Date(cert.completionDate) <= new Date(dateTo))
    }
    
    setFilteredCertificates(result)
  }, [certificates, searchTerm, statusFilter, dateFrom, dateTo])

  const handleRevoke = async (certificateId: string) => {
    try {
      const response = await fetch(`/api/admin/certificates/${certificateId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'revoke' }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to revoke certificate')
      }
      
      // Refresh the certificates list
      const updatedCertificates = filteredCertificates.map(cert => 
        cert.id === certificateId ? { ...cert, status: 'revoked' } : cert
      )
      setFilteredCertificates(updatedCertificates)
      
      // Close the dialog
      setIsRevokeDialogOpen(false)
      setCertificateToRevoke(null)
    } catch (error) {
      console.error('Error revoking certificate:', error)
      alert('Failed to revoke certificate. Please try again.')
    }
  }

  const openRevokeDialog = (certificate: CertificateLike) => {
    setCertificateToRevoke(certificate)
    setIsRevokeDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    if (status === 'revoked') {
      return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">Revoked</span>
    }
    return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Active</span>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Certificate Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Learner, course, or certificate #"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date-from">From</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date-to">To</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          
          {/* Certificates Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Certificate #</TableHead>
                <TableHead>Completion Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCertificates.map((certificate) => (
                <TableRow key={certificate.id}>
                  <TableCell>{getCertificateData(certificate).userName || 'Unknown'}</TableCell>
                  <TableCell>{getCertificateData(certificate).courseTitle || 'Unknown'}</TableCell>
                  <TableCell>{certificate.certificateNumber}</TableCell>
                  <TableCell>{format(new Date(certificate.completionDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    {getStatusBadge(certificate.status)}
                    {certificate.revokedAt && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Revoked: {format(new Date(certificate.revokedAt), 'MMM d, yyyy')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {certificate.status !== 'revoked' && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => openRevokeDialog(certificate)}
                      >
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredCertificates.length === 0 && (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No certificates found.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to revoke this certificate?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The certificate will be marked as revoked and will no longer be valid.
              {certificateToRevoke && (
                <div className="mt-4 p-4 bg-muted rounded-md">
                  <p><strong>Learner:</strong> {getCertificateData(certificateToRevoke).userName || 'Unknown'}</p>
                  <p><strong>Course:</strong> {getCertificateData(certificateToRevoke).courseTitle || 'Unknown'}</p>
                  <p><strong>Certificate #:</strong> {certificateToRevoke.certificateNumber}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => certificateToRevoke && handleRevoke(certificateToRevoke.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Revoke Certificate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}