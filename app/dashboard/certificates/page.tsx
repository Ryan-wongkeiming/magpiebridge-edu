'use client'

import React, { useEffect, useState } from 'react'
import { CertificateList } from '@/components/certificates/certificate-list'

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const res = await fetch('/api/certificates');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      // Assuming the API returns { certificates: [] } or just []
      setCertificates(Array.isArray(data) ? data : data.certificates || []);
    } catch (err) {
      console.error(err);
      setCertificates([]);
    }
  };

  return (
    <div className="container py-8">
      <CertificateList certificates={certificates} />
    </div>
  );
}