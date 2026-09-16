import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

type ResendEvent = {
  type?: string
  data?: { email_id?: string }
}

const statuses: Record<string, string> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delayed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.failed': 'failed',
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!process.env.RESEND_API_KEY || !webhookSecret || !serviceRoleKey || !env.supabaseUrl) {
    return NextResponse.json({ error: 'Webhook no configurado' }, { status: 503 })
  }

  const payload = await req.text()
  let event: ResendEvent
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: req.headers.get('svix-id') ?? '',
        timestamp: req.headers.get('svix-timestamp') ?? '',
        signature: req.headers.get('svix-signature') ?? '',
      },
      webhookSecret,
    }) as ResendEvent
  } catch {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
  }

  const status = event.type ? statuses[event.type] : undefined
  const providerId = event.data?.email_id
  if (!status || !providerId) return NextResponse.json({ received: true })

  const admin = createClient(env.supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await admin
    .schema('public')
    .from('notifications')
    .update({ email_status: status, ...(status === 'delivered' ? { email_sent_at: new Date().toISOString() } : {}) })
    .eq('email_provider_id', providerId)

  if (error) {
    console.error('[resend-webhook] update failed', error.message)
    return NextResponse.json({ error: 'No se pudo registrar el evento' }, { status: 500 })
  }
  return NextResponse.json({ received: true })
}
