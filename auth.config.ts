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

      if (path.startsWith('/dashboard')) {
        return isLoggedIn
      }

      return true
    },
  },
  providers: [
    // Providers are added in auth.ts
  ],
} satisfies NextAuthConfig
