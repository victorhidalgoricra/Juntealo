export { EmailLayout } from './layouts/EmailLayout'
export { EmailButton } from './components/EmailButton'
export { EmailDivider } from './components/EmailDivider'
export { EmailBadge } from './components/EmailBadge'

export { JuntaCreada } from './templates/JuntaCreada'
export { NuevoIntegrante } from './templates/NuevoIntegrante'
export { RecordatorioPago } from './templates/RecordatorioPago'
export { PagoConfirmado } from './templates/PagoConfirmado'
export { JuntaDeshabilitada } from './templates/JuntaDeshabilitada'

export { sendTransactionalEmail } from './helpers/sendTransactionalEmail'

export type { JuntaCreadaProps } from './templates/JuntaCreada'
export type { NuevoIntegranteProps } from './templates/NuevoIntegrante'
export type { RecordatorioPagoProps } from './templates/RecordatorioPago'
export type { PagoConfirmadoProps } from './templates/PagoConfirmado'
export type { JuntaDeshabilitadaProps } from './templates/JuntaDeshabilitada'
export type { SendEmailOptions, SendEmailResult } from './helpers/sendTransactionalEmail'
