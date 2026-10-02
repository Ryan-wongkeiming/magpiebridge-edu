import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import Google from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'
import { authConfig } from './auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id

        const userWithRoles = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            userRoles: {
              include: {
                role: true
              }
            }
          }
        })

        token.roles = userWithRoles?.userRoles.map(userRole => userRole.role.name) || []
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? ''
        session.user.roles = (token.roles as string[]) ?? []
      }
      return session
    },
  },
  providers: [
    // Google OAuth sign-in. Requires AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET
    // (or GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) in the environment.
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
    // Credentials provider for email/password authentication
    {
      id: 'credentials',
      name: 'Credentials',
      type: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user || !user.password) {
          return null
        }

        // A suspended admin cannot regain a session by signing in. The
        // status field is toggled by an admin and must be respected here
        // rather than only at the page level, otherwise the suspended user
        // keeps full data access through the API.
        if (user.status !== 'active') {
          return null
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    }
  ],
})
