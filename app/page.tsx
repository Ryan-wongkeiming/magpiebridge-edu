'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'

interface CardLink {
  href: string
  title: string
  description: string
}

const learnerCards: CardLink[] = [
  {
    href: '/dashboard',
    title: 'Dashboard',
    description: 'Access your personalised learning dashboard.',
  },
  {
    href: '/catalog',
    title: 'Catalog',
    description: 'Browse available courses and enroll.',
  },
  {
    href: '/my-progress',
    title: 'My Progress',
    description: 'See how far you have got across your courses.',
  },
]

const authorCards: CardLink[] = [
  {
    href: '/courses',
    title: 'Authoring',
    description: 'Create and edit courses, modules, and lessons.',
  },
]

const instructorCards: CardLink[] = [
  {
    href: '/instructor/progress',
    title: 'Learner Progress',
    description: 'See who is enrolled and who has finished.',
  },
]

const adminCards: CardLink[] = [
  {
    href: '/admin',
    title: 'Administration',
    description: 'Manage courses, people, and platform settings.',
  },
]

export default function Home() {
  const { data: session, status } = useSession()

  const roles = session?.user?.roles ?? []
  const isAdmin = roles.includes('admin')
  const isInstructor = roles.includes('instructor') || isAdmin

  // Only the cards this person can actually use. Showing an Admin link to a
  // learner sends them into a redirect, which is worse than not showing it.
  const cards = [
    ...learnerCards,
    ...(isInstructor ? authorCards : []),
    ...(isInstructor ? instructorCards : []),
    ...(isAdmin ? adminCards : []),
  ]

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold">MagpieBridge-Edu</h1>
        <p className="mt-3 text-muted-foreground">
          The in-house learning platform for organisational training.
        </p>
      </div>

      {status === 'loading' ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !session ? (
        <div className="w-full max-w-2xl">
          <Link
            href="/login"
            className="block rounded-lg border p-6 text-center transition-colors hover:border-primary hover:bg-accent"
          >
            <h2 className="text-xl font-semibold">Sign in to continue</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your work email address.
            </p>
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Signed in as {session.user.name ?? session.user.email}
            {roles.length > 0 ? ` · ${roles.join(', ')}` : ''}
          </p>
          <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="rounded-lg border p-5 transition-colors hover:border-primary hover:bg-accent"
              >
                <h2 className="font-semibold">{card.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
