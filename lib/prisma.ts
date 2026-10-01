import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}