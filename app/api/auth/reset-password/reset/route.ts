import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()
    
    // Validate inputs
    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }
    
    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 })
    }
    
    // Find valid token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token }
    })
    
    if (!verificationToken) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }
    
    // Check token expiration
    if (verificationToken.expires < new Date()) {
      return NextResponse.json({ error: 'Token has expired' }, { status: 400 })
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Update user password
    await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { 
        password: hashedPassword,
        // In a real implementation, you might also want to invalidate other sessions
      }
    })
    
    // Invalidate all pending reset tokens for this user, not just the one
    // used. A reset proves the account owner had control at this moment, so
    // any other unused tokens for the same email are stale and must not be
    // accepted later.
    await prisma.verificationToken.deleteMany({
      where: { identifier: verificationToken.identifier }
    })
    
    return NextResponse.json({ message: 'Password reset successful' })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}