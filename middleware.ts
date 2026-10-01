import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

// Built from the Edge-safe config only; `auth.ts` (which loads Prisma) is
// reserved for Node.js runtimes.
export default NextAuth(authConfig).auth
