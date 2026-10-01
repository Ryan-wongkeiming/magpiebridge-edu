'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from '@/components/ui/toaster'
import { NavBar } from '@/components/nav-bar'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NavBar />
      {children}
      <Toaster />
    </SessionProvider>
  )
}
