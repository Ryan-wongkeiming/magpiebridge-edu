'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

/**
 * Client-side role gate for pages that must not render for the wrong role.
 *
 * The Edge middleware can only confirm that someone is signed in — it does not
 * carry the roles that the Node-side jwt callback populates. This component
 * adds the role check in the browser, and every admin API route enforces the
 * role server-side, so no data is exposed either way.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  const isAdmin = session?.user?.roles?.includes('admin') ?? false

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.replace('/login')
      return
    }
    if (!isAdmin) {
      router.replace('/dashboard')
    }
  }, [session, status, isAdmin, router])

  if (status === 'loading') {
    return <div className="container py-8">Checking access…</div>
  }

  if (!session || !isAdmin) {
    return (
      <div className="container py-16 text-center">
        <h2 className="text-2xl font-bold mb-2">Administrator access required</h2>
        <p className="text-muted-foreground">Redirecting…</p>
      </div>
    )
  }

  return <>{children}</>
}
