'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

const learnerLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/catalog', label: 'Catalog' },
  { href: '/enrollments', label: 'My Courses' },
  { href: '/my-progress', label: 'My Progress' },
  { href: '/dashboard/certificates', label: 'Certificates' },
]

const authorLinks = [{ href: '/courses', label: 'Authoring' }]
const instructorLinks = [{ href: '/instructor/progress', label: 'Learner Progress' }]
// A single entry point; the individual sections live on the admin hub page.
const adminLinks = [{ href: '/admin', label: 'Admin' }]

export function NavBar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const roles = session?.user?.roles ?? []

  const isAdmin = roles.includes('admin')
  const isInstructor = roles.includes('instructor') || isAdmin
  // Manager team view is not built yet (Phase 5 / BLK-004). Only show the
  // Admin link for admins; managers see the standard learner nav until a
  // /manager/team route exists.
  const links = [
    ...learnerLinks,
    ...(isInstructor ? authorLinks : []),
    ...(isInstructor ? instructorLinks : []),
    ...(isAdmin ? adminLinks : []),
  ]

  // Keep the visible set small by dropping duplicate hrefs.
  const seen = new Set<string>()
  const visible = links.filter((l) => {
    if (seen.has(l.href)) return false
    seen.add(l.href)
    return true
  })

  return (
    <header className="border-b bg-white">
      <div className="container flex h-14 items-center gap-6">
        <Link href="/" className="font-semibold whitespace-nowrap">
          MagpieBridge-Edu
        </Link>

        <nav className="flex flex-1 items-center gap-4 overflow-x-auto text-sm">
          {status === 'authenticated' &&
            visible.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    active
                      ? 'font-medium text-foreground whitespace-nowrap'
                      : 'text-muted-foreground hover:text-foreground whitespace-nowrap'
                  }
                >
                  {link.label}
                </Link>
              )
            })}
        </nav>

        {status === 'authenticated' ? (
          <div className="flex items-center gap-3 text-sm whitespace-nowrap">
            <span className="text-muted-foreground hidden sm:inline">
              {session?.user?.name ?? session?.user?.email}
            </span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        ) : status === 'unauthenticated' ? (
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
        ) : null}
      </div>
    </header>
  )
}
