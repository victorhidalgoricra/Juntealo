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
  const html = await render(template)

  const { data, error } = await getResend().emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    ...(replyTo && { replyTo }),
  })

  if (error) {
    return { id: null, error: error.message }
  }

  return { id: data?.id ?? null, error: null }
}
