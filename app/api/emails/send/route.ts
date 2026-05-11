import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/services/email.service'
import type { SendEmailResult } from '@/components/emails'
import { z } from 'zod'

// ─── Payload schemas ────────────────────────────────────────

const baseSchema = z.object({ to: z.string().email() })

const schemas = {
  junta_creada: baseSchema.extend({
    userName: z.string(),
    juntaName: z.string(),
    isPrivate: z.boolean(),
    joinCode: z.string().optional(),
    juntaUrl: z.string().url(),
  }),
  nuevo_integrante: baseSchema.extend({
    userName: z.string(),
    juntaName: z.string(),
    newMemberName: z.string(),
    juntaUrl: z.string().url(),
  }),
  recordatorio_pago: baseSchema.extend({
    userName: z.string(),
    juntaName: z.string(),
    amount: z.string(),
    dueDate: z.string(),
    paymentUrl: z.string().url(),
  }),
  pago_confirmado: baseSchema.extend({
    userName: z.string(),
    juntaName: z.string(),
    amount: z.string(),
    dueDate: z.string(),
    juntaUrl: z.string().url(),
  }),
  junta_deshabilitada: baseSchema.extend({
    userName: z.string(),
    juntaName: z.string(),
    reason: z.string().optional(),
    juntaUrl: z.string().url(),
    supportUrl: z.string().url().optional(),
  }),
} as const

type EmailType = keyof typeof schemas

// ─── Route handler ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body.type !== 'string') {
    return NextResponse.json({ error: 'Missing required field: type' }, { status: 400 })
  }

  const type = body.type as EmailType
  const schema = schemas[type]
  if (!schema) {
    return NextResponse.json(
      { error: `Unknown email type. Valid types: ${Object.keys(schemas).join(', ')}` },
      { status: 400 },
    )
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const { to, ...props } = parsed.data

  const handlers: Record<EmailType, (to: string, props: never) => Promise<SendEmailResult>> = {
    junta_creada: emailService.juntaCreada as (to: string, props: never) => Promise<SendEmailResult>,
    nuevo_integrante: emailService.nuevoIntegrante as (to: string, props: never) => Promise<SendEmailResult>,
    recordatorio_pago: emailService.recordatorioPago as (to: string, props: never) => Promise<SendEmailResult>,
    pago_confirmado: emailService.pagoConfirmado as (to: string, props: never) => Promise<SendEmailResult>,
    junta_deshabilitada: emailService.juntaDeshabilitada as (to: string, props: never) => Promise<SendEmailResult>,
  }

  const result = await handlers[type](to, props as never)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  return NextResponse.json({ success: true, id: result.id })
}
