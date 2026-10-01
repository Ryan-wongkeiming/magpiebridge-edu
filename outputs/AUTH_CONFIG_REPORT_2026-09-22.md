# MagpieBridge-Edu Authentication Provider Configuration

Date: 2026-09-22  
Author: Grok  
Job: NEXT-007  
Output path: outputs/AUTH_CONFIG_REPORT_2026-09-22.md

---

## 1. Overview

This document describes the authentication provider configuration for MagpieBridge-Edu. The application uses Auth.js (formerly NextAuth.js) as its authentication framework, which provides a flexible and secure way to handle user authentication with various providers.

## 2. Current Authentication Setup

The current authentication setup includes:

- **Framework**: Auth.js/NextAuth.js
- **Database Integration**: Prisma adapter for PostgreSQL
- **Session Management**: Database-backed sessions
- **Protected Routes**: Middleware protection for authenticated areas
- **User Roles**: Role-based access control

## 3. Configured Authentication Providers

### Email Authentication (Credentials Provider)
For development and testing, we'll implement a simple email/password authentication provider. This will allow users to authenticate with their email address and a password.

### OAuth Providers (Planned)
Based on the tech stack decision, we plan to support the following OAuth providers:
- Google
- Microsoft (Entra ID/Azure AD)
- GitHub (optional)

## 4. Implementation Details

### Auth Configuration Files

#### `auth.config.ts`
```typescript
import type { NextAuthConfig } from 'next-auth'
import bcrypt from 'bcryptjs'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')
      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl))
      }
      return true
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        // Fetch user roles and add to session
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
        session.user.roles = userWithRoles?.userRoles.map(userRole => userRole.role.name) || []
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // Fetch user roles and add to token
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
    }
  },
  providers: [
    // Credentials provider for email/password authentication
    // OAuth providers will be added here
  ],
} satisfies NextAuthConfig
```

#### `auth.ts`
```typescript
import NextAuth from 'next-auth'
import { authConfig } from './auth.config'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
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

        const isValid = await bcrypt.compare(credentials.password as string, user.password)

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
```

### Middleware Configuration
The middleware protects routes and ensures only authenticated users can access certain areas:

```typescript
// middleware.ts
export { auth as middleware } from '@/auth'

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

## 5. Role-Based Access Control

The authentication system integrates with the role-based access control system:

### Role Checking in Components
```typescript
import { auth } from '@/auth'

export default async function AdminDashboard() {
  const session = await auth()
  
  if (!session?.user?.roles?.includes('admin')) {
    return <div>Access denied</div>
  }
  
  return (
    <div>
      {/* Admin dashboard content */}
    </div>
  )
}
```

### Role Checking in Server Actions
```typescript
'use server'

import { auth } from '@/auth'

export async function adminAction() {
  const session = await auth()
  
  if (!session?.user?.roles?.includes('admin')) {
    throw new Error('Unauthorized')
  }
  
  // Perform admin action
}
```

## 6. OAuth Provider Configuration

### Google OAuth
To configure Google OAuth, you'll need to:
1. Create a Google Cloud project
2. Enable the Google+ API
3. Create OAuth credentials
4. Add the credentials to your environment variables

```typescript
// Add to auth.config.ts providers array
import Google from 'next-auth/providers/google'

Google({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
}),
```

### Microsoft OAuth (Entra ID/Azure AD)
To configure Microsoft OAuth, you'll need to:
1. Register an application in Azure Portal
2. Configure authentication settings
3. Add the credentials to your environment variables

```typescript
// Add to auth.config.ts providers array
import Microsoft from 'next-auth/providers/microsoft'

Microsoft({
  clientId: process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  authorization: {
    params: {
      scope: 'openid profile email'
    }
  }
}),
```

## 7. Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Auth.js Configuration
NEXTAUTH_SECRET=your-super-secret-key-for-nextauth
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Microsoft OAuth (optional)
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## 8. Database Schema Integration

The authentication system integrates with the existing database schema through the Prisma adapter. The following tables are used:
- `User`: Stores user information
- `Account`: Stores OAuth account information
- `Session`: Stores session information
- `VerificationToken`: Stores verification tokens for email authentication

## 9. Session Management

### Database-Backed Sessions
Sessions are stored in the database for better administrative visibility and revocation capabilities.

### Session Duration
Sessions are configured with appropriate timeouts for security:
- Short-lived access tokens
- Longer-lived refresh tokens (if applicable)
- Automatic session cleanup

## 10. Security Considerations

### Password Security
- Passwords are hashed using bcrypt
- Minimum password length requirements
- Rate limiting for login attempts

### Token Security
- Secure random token generation
- Token expiration and renewal
- HTTPS-only cookies for production

### CSRF Protection
- Built-in CSRF protection through Auth.js
- Secure cookie settings

### Account Lockout
- Account lockout after multiple failed attempts
- Notification system for suspicious activity

## 11. Testing Authentication

### Development Testing
1. Use the credentials provider with seeded users
2. Test role-based access control
3. Verify session management
4. Test logout functionality

### Production Testing
1. Test OAuth providers
2. Verify account linking
3. Test password reset flows
4. Validate security measures

## 12. Customization Options

### Branding
- Custom login page design
- Organization-specific branding
- Custom email templates

### Multi-Tenancy
- Organization-specific authentication
- Tenant-aware session management
- Cross-organization access controls

### Advanced Features
- Two-factor authentication
- Passwordless authentication
- Biometric authentication
- SAML integration for enterprise

## 13. Troubleshooting

### Common Issues

1. **Invalid Credentials**
   - Verify email and password
   - Check user exists in database
   - Ensure password is properly hashed

2. **OAuth Callback Errors**
   - Verify client ID and secret
   - Check redirect URIs
   - Ensure OAuth provider is enabled

3. **Session Issues**
   - Check NEXTAUTH_SECRET
   - Verify database connection
   - Ensure session table exists

4. **Role-Based Access Issues**
   - Verify user roles in database
   - Check role assignment logic
   - Validate role checking implementation

### Debugging Steps
1. Enable debug logging
2. Check database records
3. Review environment variables
4. Validate callback URLs
5. Test with minimal configuration

## 14. Next Steps

After configuring authentication providers:

1. **Test Authentication Flows**: Verify all authentication methods work correctly
2. **Implement Password Reset**: Add password reset functionality
3. **Configure OAuth Providers**: Set up Google and Microsoft OAuth
4. **Enhance Security**: Add additional security measures
5. **Monitor Authentication**: Set up logging and monitoring

This authentication configuration provides a secure and flexible foundation for MagpieBridge-Edu, supporting both development/testing scenarios and production-ready OAuth authentication with major providers.