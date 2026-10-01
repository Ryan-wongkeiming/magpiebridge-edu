import { getSetting } from '@/lib/settings'

/**
 * Transactional email.
 *
 * In production, set the SMTP_* env vars and `notifications.passwordResetEnabled`
 * to "true". The provider is Nodemailer+SMTP so it works with any SMTP server
 * (Gmail, SES via SMTP, Postmark, a local MTA). When no SMTP host is configured,
 * the email is logged to the server console so the reset link still appears in
 * dev — this is the existing behavior and keeps password reset usable before
 * a mail server is provisioned.
 *
 * The `notifications.passwordResetEnabled` setting gates the whole flow: when
 * it is false, the caller should not even reach here (the request route checks
 * it first), and this function is a no-op.
 */

interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  fromName: string
  fromEmail: string
}

function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST
  if (!host) return null
  return {
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    fromName: process.env.SMTP_FROM_NAME ?? 'MagpieBridge-Edu',
    fromEmail:
      process.env.SMTP_FROM_EMAIL ?? 'noreply@magpiebridge.edu',
  }
}

// Nodemailer is imported at the top level (it is a runtime dependency). The
// transport is only created when SMTP is configured, so importing the module
// is side-effect-free when SMTP is not set.
import nodemailer from 'nodemailer'

async function createTransport() {
  const cfg = readSmtpConfig()!
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  })
}

/** Sends the password reset email. No-op when the setting is disabled. */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const enabled = await getSetting('notifications.passwordResetEnabled')
  if (enabled === false) return

  const resetUrl = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/reset-password?token=${token}`
  const subject = 'Password Reset Request'
  const html = `
    <p>You requested a password reset for your MagpieBridge-Edu account.</p>
    <p>Click the link below to reset your password:</p>
    <p><a href="${resetUrl}">Reset Password</a></p>
    <p>This link will expire in 1 hour.</p>
    <p>If you did not request this, you can safely ignore this email.</p>
  `

  const cfg = readSmtpConfig()
  if (!cfg) {
    // No SMTP configured — log the link so the flow still works in dev.
    console.log(`[email] Password reset for ${email}: ${resetUrl}`)
    return
  }

  try {
    const transport = await createTransport()
    await transport.sendMail({
      from: `${cfg.fromName} <${cfg.fromEmail}>`,
      to: email,
      subject,
      html,
    })
  } catch (error) {
    // Log but do not throw: password reset must not 500 just because the
    // mail server is down. The token is already in the DB, so the learner
    // can still reset if they have the link from a later successful send.
    console.error('Failed to send password reset email:', error)
  }
}
