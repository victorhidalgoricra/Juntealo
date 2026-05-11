import * as React from 'react'
import { sendTransactionalEmail } from '@/components/emails/helpers/sendTransactionalEmail'
import { JuntaCreada } from '@/components/emails/templates/JuntaCreada'
import { NuevoIntegrante } from '@/components/emails/templates/NuevoIntegrante'
import { RecordatorioPago } from '@/components/emails/templates/RecordatorioPago'
import { PagoConfirmado } from '@/components/emails/templates/PagoConfirmado'
import { JuntaDeshabilitada } from '@/components/emails/templates/JuntaDeshabilitada'
import type {
  JuntaCreadaProps,
  NuevoIntegranteProps,
  RecordatorioPagoProps,
  PagoConfirmadoProps,
  JuntaDeshabilitadaProps,
} from '@/components/emails'

export const emailService = {
  async juntaCreada(to: string, props: JuntaCreadaProps) {
    return sendTransactionalEmail({
      to,
      subject: `¡Tu junta "${props.juntaName}" está lista! 🎉`,
      template: React.createElement(JuntaCreada, props),
    })
  },

  async nuevoIntegrante(to: string, props: NuevoIntegranteProps) {
    return sendTransactionalEmail({
      to,
      subject: `Nuevo integrante en "${props.juntaName}"`,
      template: React.createElement(NuevoIntegrante, props),
    })
  },

  async recordatorioPago(to: string, props: RecordatorioPagoProps) {
    return sendTransactionalEmail({
      to,
      subject: `Recordatorio: pago pendiente en "${props.juntaName}"`,
      template: React.createElement(RecordatorioPago, props),
    })
  },

  async pagoConfirmado(to: string, props: PagoConfirmadoProps) {
    return sendTransactionalEmail({
      to,
      subject: `Pago confirmado en "${props.juntaName}" ✓`,
      template: React.createElement(PagoConfirmado, props),
    })
  },

  async juntaDeshabilitada(to: string, props: JuntaDeshabilitadaProps) {
    return sendTransactionalEmail({
      to,
      subject: `Tu junta "${props.juntaName}" fue deshabilitada`,
      template: React.createElement(JuntaDeshabilitada, props),
    })
  },
}
