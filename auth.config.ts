import type { NextAuthConfig } from 'next-auth'

/**
 * Edge-safe Auth.js configuration.
 *
 * This file must not import Prisma or any Node-only module: it is loaded by
 * `middleware.ts`, which runs in the Edge runtime. The Prisma adapter and the
 * credentials provider are added in `auth.ts`, which runs in Node.js.
 */
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const path = nextUrl.pathname

      // Admin area requires a signed-in user. The role check itself happens in
      // the browser, because the Edge middleware does not carry the roles that
      // the Node-side jwt callback populates. The API routes enforce roles
      // server-side, so data is protected regardless.
      if (path === '/admin' || path.startsWith('/admin/')) {
        return isLoggedIn
      }

      // Other authenticated areas. Cover every learner/instructor/manager
      // surface so a signed-out visitor does not get a flash of the page
      // shell before the client redirect. Public pages (/, /login, /catalog
      // view, /validate-certificate, /reset-password, /forgot-password)
      // remain open.
      if (
        path.startsWith('/dashboard') ||
        path.startsWith('/enrollments') ||
        path.startsWith('/my-progress') ||
        path.startsWith('/instructor') ||
        path.startsWith('/courses') ||
        path.startsWith('/lessons') ||
        path.startsWith('/quizzes')
      ) {
        return isLoggedIn
      }

      // /catalog is reachable by signed-in users; an anonymous visitor is
      // redirected to sign in by the page itself.
      if (path === '/catalog' || path.startsWith('/catalog/')) {
        return isLoggedIn
      }

      return true
    },
  },
  providers: [
    // Providers are added in auth.ts
  ],
} satisfies NextAuthConfig
