import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { emailService } from '@/services/email.service'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

const schema = z.object({
  juntaId: z.string().uuid(),
  profileId: z.string().uuid(),
})

type ReminderPayload = {
  notification_id: string
  recipient_email: string
  recipient_name: string
  junta_name: string
  amount: number
  due_date: string
  schedule_id: string
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: NextRequest) {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return errorResponse('Supabase no está configurado.', 503)

  const authorization = req.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return errorResponse('No autorizado.', 401)

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return errorResponse('Datos del recordatorio inválidos.', 422)

  const client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  })
  const token = authorization.slice('Bearer '.length)
  const { data: authData, error: authError } = await client.auth.getUser(token)
  if (authError || !authData.user) return errorResponse('La sesión no es válida.', 401)

  const { data, error } = await client.schema('public').rpc('send_payment_reminder', {
    p_junta_id: parsed.data.juntaId,
    p_profile_id: parsed.data.profileId,
  })
  if (error) return errorResponse(error.message, 400)

  const reminder = data as ReminderPayload
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin).replace(/\/$/, '')
  const emailResult = await emailService.recordatorioPago(reminder.recipient_email, {
    userName: reminder.recipient_name || 'Integrante',
    juntaName: reminder.junta_name,
    amount: new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(reminder.amount),
    dueDate: new Intl.DateTimeFormat('es-PE', { dateStyle: 'long', timeZone: 'America/Lima' }).format(new Date(`${reminder.due_date}T12:00:00-05:00`)),
    paymentUrl: `${appUrl}/juntas/${parsed.data.juntaId}/registrar-pago?cuotaId=${encodeURIComponent(reminder.schedule_id)}&src=email-reminder`,
  })

  const emailStatus = emailResult.error ? 'failed' : 'sent'
  const { error: auditError } = await client.schema('public').rpc('set_payment_reminder_email_result', {
    p_notification_id: reminder.notification_id,
    p_status: emailStatus,
    p_provider_id: emailResult.id,
    p_error: emailResult.error,
  })
  if (auditError) console.error('[payment-reminder] could not audit email result', auditError.message)

  if (emailResult.error) {
    return NextResponse.json({
      notificationCreated: true,
      emailSent: false,
      message: 'La notificación interna fue creada, pero el correo no pudo enviarse.',
    })
  }

  return NextResponse.json({
    notificationCreated: true,
    emailSent: true,
    message: 'Notificación interna y correo enviados correctamente.',
  })
}
