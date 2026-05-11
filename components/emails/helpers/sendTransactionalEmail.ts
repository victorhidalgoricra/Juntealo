import { render } from '@react-email/components'
import { Resend } from 'resend'
import type { ReactElement } from 'react'

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

const DEFAULT_FROM = process.env.EMAIL_FROM ?? 'Juntealo <noreply@juntealo.com>'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  template: ReactElement
  from?: string
  replyTo?: string
}

export interface SendEmailResult {
  id: string | null
  error: string | null
}

export async function sendTransactionalEmail({
  to,
  subject,
  template,
  from = DEFAULT_FROM,
  replyTo,
}: SendEmailOptions): Promise<SendEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.error('[email] RESEND_API_KEY is not set — skipping send', { to, subject })
    return { id: null, error: 'RESEND_API_KEY not configured' }
  }

  console.log('[email] sending', { to, subject })

  const html = await render(template)

  const { data, error } = await getResend().emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    ...(replyTo && { replyTo }),
  })

  if (error) {
    console.error('[email] failed', { to, subject, error: error.message })
    return { id: null, error: error.message }
  }

  console.log('[email] sent', { id: data?.id, to, subject })
  return { id: data?.id ?? null, error: null }
}
