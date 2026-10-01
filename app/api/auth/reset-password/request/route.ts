import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSecureToken } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import { getSetting } from '@/lib/settings'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    // Validate email
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // The notifications.passwordResetEnabled setting gates the whole flow.
    // When it is off, the endpoint refuses to issue or send a reset token so
    // an admin can fully disable password reset until a mail provider is
    // configured.
    const resetEnabled = await getSetting('notifications.passwordResetEnabled')
    if (resetEnabled === false) {
      return NextResponse.json(
        { error: 'Password reset is disabled. Contact your administrator.' },
        { status: 403 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // For security, we don't reveal if the email exists
      return NextResponse.json({ message: 'If the email exists, a reset link has been sent' })
    }

    // Generate secure token
    const token = generateSecureToken()
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store token in database
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires
      }
    })

    // Send reset email
    await sendPasswordResetEmail(email, token)

    return NextResponse.json({ message: 'If the email exists, a reset link has been sent' })
  } catch (error) {
    console.error('Password reset request error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}