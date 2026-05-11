import * as React from 'react'
import { Section, Text, Row, Column } from '@react-email/components'
import { EmailLayout } from '../layouts/EmailLayout'
import { EmailButton } from '../components/EmailButton'
import { EmailDivider } from '../components/EmailDivider'

export interface PagoConfirmadoProps {
  userName: string
  juntaName: string
  amount: string
  dueDate: string
  juntaUrl: string
}

export function PagoConfirmado({ userName, juntaName, amount, dueDate, juntaUrl }: PagoConfirmadoProps) {
  return (
    <EmailLayout preview={`Pago de ${amount} confirmado en "${juntaName}"`}>

      {/* Success icon */}
      <Section style={successBanner}>
        <Text style={successIcon}>✓</Text>
        <Text style={successLabel}>PAGO CONFIRMADO</Text>
      </Section>

      <Text style={greeting}>Hola, {userName}</Text>

      <Text style={headline}>Tu pago fue procesado</Text>

      <Text style={body}>
        Recibimos tu pago para <strong style={strong}>{juntaName}</strong>.
        Tu historial de pagos ha sido actualizado.
      </Text>

      <EmailDivider spacing="md" />

      {/* Payment receipt */}
      <Section style={receiptCard}>
        <Text style={receiptTitle}>COMPROBANTE</Text>
        <Row style={receiptRow}>
          <Column>
            <Text style={receiptKey}>Junta</Text>
          </Column>
          <Column style={{ textAlign: 'right' }}>
            <Text style={receiptValue}>{juntaName}</Text>
          </Column>
        </Row>
        <Row style={receiptRowDivided}>
          <Column>
            <Text style={receiptKey}>Monto</Text>
          </Column>
          <Column style={{ textAlign: 'right' }}>
            <Text style={receiptValueAccent}>{amount}</Text>
          </Column>
        </Row>
        <Row style={receiptRowDivided}>
          <Column>
            <Text style={receiptKey}>Fecha</Text>
          </Column>
          <Column style={{ textAlign: 'right' }}>
            <Text style={receiptValue}>{dueDate}</Text>
          </Column>
        </Row>
        <Row style={receiptRowDivided}>
          <Column>
            <Text style={receiptKey}>Estado</Text>
          </Column>
          <Column style={{ textAlign: 'right' }}>
            <Text style={statusBadge}>Confirmado</Text>
          </Column>
        </Row>
      </Section>

      <EmailDivider spacing="md" />

      <Row>
        <Column>
          <EmailButton href={juntaUrl}>Ver mi junta →</EmailButton>
        </Column>
      </Row>

    </EmailLayout>
  )
}

PagoConfirmado.PreviewProps = {
  userName: 'Carlos',
  juntaName: 'Junta Familia 2025',
  amount: '$1,500 MXN',
  dueDate: '10 enero, 2025',
  juntaUrl: 'https://juntealo.com/junta/familia-2025',
} satisfies PagoConfirmadoProps

// ─── Styles ────────────────────────────────────────────────

const successBanner: React.CSSProperties = {
  backgroundColor: '#dcfce7',
  borderRadius: '12px',
  padding: '20px',
  textAlign: 'center',
  marginBottom: '32px',
}

const successIcon: React.CSSProperties = {
  color: '#16a34a',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0 0 4px',
  lineHeight: '1',
}

const successLabel: React.CSSProperties = {
  color: '#15803d',
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '1.5px',
  margin: '0',
  textTransform: 'uppercase',
}

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

const receiptCard: React.CSSProperties = {
  backgroundColor: '#f5f5f3',
  borderRadius: '12px',
  padding: '20px 24px',
}

const receiptTitle: React.CSSProperties = {
  color: '#7a7872',
  fontSize: '11px',
  fontWeight: '600',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  margin: '0 0 16px',
}

const receiptRow: React.CSSProperties = {
  padding: '0 0 12px',
}

const receiptRowDivided: React.CSSProperties = {
  borderTop: '1px solid #e8e6df',
  padding: '12px 0 0',
}

const receiptKey: React.CSSProperties = {
  color: '#7a7872',
  fontSize: '14px',
  margin: '0',
  lineHeight: '1.4',
}

const receiptValue: React.CSSProperties = {
  color: '#141412',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
  lineHeight: '1.4',
}

const receiptValueAccent: React.CSSProperties = {
  color: '#2d5be3',
  fontSize: '16px',
  fontWeight: '700',
  margin: '0',
  lineHeight: '1.4',
}

const statusBadge: React.CSSProperties = {
  backgroundColor: '#dcfce7',
  color: '#16a34a',
  borderRadius: '6px',
  padding: '3px 8px',
  fontSize: '12px',
  fontWeight: '600',
  margin: '0',
  display: 'inline-block',
}
