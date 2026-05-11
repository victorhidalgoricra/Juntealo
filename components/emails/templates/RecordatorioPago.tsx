import * as React from 'react'
import { Section, Text, Row, Column } from '@react-email/components'
import { EmailLayout } from '../layouts/EmailLayout'
import { EmailButton } from '../components/EmailButton'
import { EmailDivider } from '../components/EmailDivider'

export interface RecordatorioPagoProps {
  userName: string
  juntaName: string
  amount: string
  dueDate: string
  paymentUrl: string
}

export function RecordatorioPago({ userName, juntaName, amount, dueDate, paymentUrl }: RecordatorioPagoProps) {
  return (
    <EmailLayout preview={`Tienes un pago pendiente de ${amount} en "${juntaName}"`}>

      <Text style={greeting}>Hola, {userName}</Text>

      <Text style={headline}>Recordatorio de pago</Text>

      <Text style={body}>
        Tienes un pago pendiente en <strong style={strong}>{juntaName}</strong>.
        Realízalo antes de la fecha límite para mantener tu racha.
      </Text>

      <EmailDivider spacing="md" />

      {/* Payment details card */}
      <Section style={paymentCard}>
        <Row>
          <Column style={detailCol}>
            <Text style={detailLabel}>MONTO</Text>
            <Text style={amountText}>{amount}</Text>
          </Column>
          <Column style={dividerCol}>
            <Section style={verticalDivider} />
          </Column>
          <Column style={detailCol}>
            <Text style={detailLabel}>FECHA LÍMITE</Text>
            <Text style={dueDateText}>{dueDate}</Text>
          </Column>
        </Row>
      </Section>

      <EmailDivider spacing="md" />

      <Row>
        <Column>
          <EmailButton href={paymentUrl}>Pagar ahora →</EmailButton>
        </Column>
      </Row>

      <Section style={warningNote}>
        <Text style={warningText}>
          ⚠️ Realizar el pago a tiempo mantiene tu historial y racha en la junta.
        </Text>
      </Section>

    </EmailLayout>
  )
}

RecordatorioPago.PreviewProps = {
  userName: 'Ana',
  juntaName: 'Junta Trabajo Q1',
  amount: '$1,500 MXN',
  dueDate: '15 de enero, 2025',
  paymentUrl: 'https://juntealo.com/pagar/abc123',
} satisfies RecordatorioPagoProps

// ─── Styles ────────────────────────────────────────────────

const greeting: React.CSSProperties = {
  color: '#7a7872',
  fontSize: '15px',
  margin: '0 0 8px',
  lineHeight: '1.5',
}

const headline: React.CSSProperties = {
  color: '#141412',
  fontSize: '26px',
  fontWeight: '700',
  letterSpacing: '-0.5px',
  margin: '0 0 16px',
  lineHeight: '1.2',
}

const body: React.CSSProperties = {
  color: '#3d3b37',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0',
}

const strong: React.CSSProperties = {
  fontWeight: '700',
  color: '#141412',
}

const paymentCard: React.CSSProperties = {
  backgroundColor: '#f5f5f3',
  borderRadius: '12px',
  padding: '24px 28px',
}

const detailCol: React.CSSProperties = {
  textAlign: 'center',
  verticalAlign: 'middle',
  width: '45%',
}

const dividerCol: React.CSSProperties = {
  width: '10%',
  verticalAlign: 'middle',
}

const verticalDivider: React.CSSProperties = {
  borderLeft: '1px solid #e8e6df',
  height: '48px',
  margin: '0 auto',
  width: '1px',
}

const detailLabel: React.CSSProperties = {
  color: '#7a7872',
  fontSize: '11px',
  fontWeight: '600',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  margin: '0 0 6px',
}

const amountText: React.CSSProperties = {
  color: '#141412',
  fontSize: '28px',
  fontWeight: '700',
  letterSpacing: '-0.5px',
  margin: '0',
  lineHeight: '1.1',
}

const dueDateText: React.CSSProperties = {
  color: '#d97706',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
  lineHeight: '1.3',
}

const warningNote: React.CSSProperties = {
  backgroundColor: '#fef3c7',
  borderRadius: '10px',
  padding: '14px 18px',
  marginTop: '24px',
}

const warningText: React.CSSProperties = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
}
