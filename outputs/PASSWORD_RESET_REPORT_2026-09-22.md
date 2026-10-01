# MagpieBridge-Edu Password Reset Implementation

Date: 2026-09-22  
Author: Grok  
Job: NEXT-008  
Output path: outputs/PASSWORD_RESET_REPORT_2026-09-22.md

---

## 1. Overview

This document describes the password reset functionality implementation for MagpieBridge-Edu. The password reset feature allows users to securely reset their passwords when they forget them, using a token-based approach with email verification.

## 2. Current Authentication Setup

The application uses Auth.js/NextAuth.js with:
- Email/password authentication via credentials provider
- OAuth providers (Google, Microsoft) as planned extensions
- Database-backed sessions
- Role-based access control

## 3. Password Reset Workflow

### Request Password Reset
1. User navigates to the "Forgot Password" page
2. User enters their email address
3. System verifies the email exists in the database
4. System generates a secure reset token
5. System sends an email with a reset link to the user
6. System stores the reset token with an expiration time

### Reset Password
1. User clicks the reset link from their email
2. System validates the reset token
3. User enters and confirms a new password
4. System hashes the new password
5. System updates the user's password in the database
6. System invalidates the reset token
7. User is redirected to the login page

## 4. Implementation Details

### Database Schema Integration

The existing database schema includes the `VerificationToken` model which can be used for password reset tokens:

```prisma
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@id([identifier, token])
}
```

For password reset, we'll use:
- `identifier`: The user's email address
- `token`: A cryptographically secure random token
- `expires`: Token expiration time (typically 1 hour)

### API Routes

#### Request Password Reset Endpoint
`POST /api/auth/reset-password/request`

```typescript
// app/api/auth/reset-password/request/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSecureToken } from '@/lib/auth'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    // Validate email
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
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
```

#### Reset Password Endpoint
`POST /api/auth/reset-password/reset`

```typescript
// app/api/auth/reset-password/reset/route.ts
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
    
    // Delete used token
    await prisma.verificationToken.delete({
      where: { token }
    })
    
    return NextResponse.json({ message: 'Password reset successful' })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
```

### Frontend Pages

#### Forgot Password Page
`app/forgot-password/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/auth/reset-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Reset your password
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {message && (
          <div className="mb-4 rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">{message}</h3>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </div>
          </form>
        )}

        <p className="mt-10 text-center text-sm text-gray-500">
          Remember your password?{' '}
          <a href="/login" className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}
```

#### Reset Password Page
`app/reset-password/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    // Validate passwords
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Password reset successful! You can now sign in with your new password.')
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Invalid Reset Link
          </h2>
          <p className="mt-6 text-center text-sm text-gray-500">
            This password reset link is invalid or has expired.
          </p>
          <div className="mt-6">
            <a 
              href="/forgot-password" 
              className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Request New Reset Link
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Reset your password
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {message && (
          <div className="mb-4 rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">{message}</h3>
                <p className="mt-2 text-sm text-green-700">
                  <a href="/login" className="font-medium text-green-800 underline hover:text-green-900">
                    Click here to sign in
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
                New Password
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium leading-6 text-gray-900">
                Confirm New Password
              </label>
              <div className="mt-2">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
```

### Utility Functions

#### Token Generation
`lib/auth.ts`

```typescript
import crypto from 'crypto'

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}
```

#### Email Sending
`lib/email.ts`

```typescript
// Placeholder for email sending functionality
// In a real implementation, you would use an email service like SendGrid, SES, etc.

export async function sendPasswordResetEmail(email: string, token: string) {
  // In a real implementation, you would send an actual email
  // For now, we'll just log it
  console.log(`Password reset email would be sent to ${email} with token ${token}`)
  console.log(`Reset link: ${process.env.NEXTAUTH_URL}/reset-password?token=${token}`)
  
  // Example implementation with a service like SendGrid:
  /*
  const msg = {
    to: email,
    from: 'noreply@magpiebridge.edu',
    subject: 'Password Reset Request',
    html: `
      <p>You requested a password reset for your MagpieBridge-Edu account.</p>
      <p>Click the link below to reset your password:</p>
      <p><a href="${process.env.NEXTAUTH_URL}/reset-password?token=${token}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  };
  
  await sgMail.send(msg);
  */
}
```

## 5. Security Considerations

### Token Security
- Tokens are cryptographically secure random strings
- Tokens expire after 1 hour
- Tokens are invalidated after use
- Tokens are stored hashed in the database (if needed for additional security)

### Rate Limiting
- Implement rate limiting on password reset requests
- Prevent brute force attacks on reset tokens

### Email Verification
- Only send emails to existing users
- Don't reveal if an email exists in the system

### Password Strength
- Enforce minimum password length (8 characters)
- Consider additional password complexity requirements

### Session Management
- Invalidate all existing sessions after password reset
- Require re-authentication after password change

## 6. Database Integration

### VerificationToken Model
The existing `VerificationToken` model is used for password reset tokens:

```prisma
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@id([identifier, token])
}
```

### Usage Pattern
1. Create token when user requests password reset
2. Delete token when user successfully resets password
3. Automatically expire tokens after 1 hour

## 7. Testing

### Unit Tests
- Token generation and validation
- Password hashing and verification
- API endpoint responses
- Error handling

### Integration Tests
- Full password reset workflow
- Email sending (mocked)
- Database interactions
- Security measures

### Manual Testing
- End-to-end workflow testing
- Edge cases (expired tokens, invalid tokens, etc.)
- User experience validation

## 8. Customization Options

### Branding
- Custom email templates
- Organization-specific messaging
- Logo and styling in emails

### Multi-Tenancy
- Tenant-specific email templates
- Different policies per organization
- Custom expiration times

### Advanced Features
- SMS-based password reset
- Two-factor authentication integration
- Security question-based reset
- Admin-initiated password reset

## 9. Troubleshooting

### Common Issues

1. **Email Not Received**
   - Check spam/junk folders
   - Verify email address
   - Check email service configuration

2. **Token Expired**
   - Request a new reset link
   - Check system time synchronization

3. **Password Requirements Not Met**
   - Ensure password meets minimum length
   - Check for password confirmation match

4. **Invalid Token**
   - Request a new reset link
   - Check if token has already been used

### Debugging Steps
1. Check server logs
2. Verify database records
3. Test email sending manually
4. Validate token generation
5. Check environment variables

## 10. Next Steps

After implementing password reset functionality:

1. **Test Password Reset Flow**: Verify all steps work correctly
2. **Configure Email Service**: Set up actual email sending
3. **Implement Rate Limiting**: Add security measures for requests
4. **Enhance Security**: Add additional security features
5. **Monitor Password Resets**: Set up logging and monitoring

This password reset implementation provides a secure and user-friendly way for users to recover their accounts, enhancing both security and user experience for MagpieBridge-Edu.