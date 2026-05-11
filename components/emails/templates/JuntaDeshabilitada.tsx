import * as React from 'react'
import { Section, Text, Row, Column } from '@react-email/components'
import { EmailLayout } from '../layouts/EmailLayout'
import { EmailButton } from '../components/EmailButton'
import { EmailDivider } from '../components/EmailDivider'

export interface JuntaDeshabilitadaProps {
  userName: string
  juntaName: string
  reason?: string
  juntaUrl: string
  supportUrl?: string
}

export function JuntaDeshabilitada({
  userName,
  juntaName,
  reason,
  juntaUrl,
  supportUrl = 'https://juntealo.com/soporte',
}: JuntaDeshabilitadaProps) {
  return (
    <EmailLayout preview={`La junta "${juntaName}" ha sido deshabilitada`}>

      {/* Warning banner */}
      <Section style={warningBanner}>
        <Text style={warningIcon}>!</Text>
        <Text style={warningLabel}>JUNTA DESHABILITADA</Text>
      </Section>

      <Text style={greeting}>Hola, {userName}</Text>

      <Text style={headline}>Tu junta fue deshabilitada</Text>

      <Text style={body}>
        La junta <strong style={strong}>{juntaName}</strong> ha sido deshabilitada y ya no
        está disponible para sus integrantes.
      </Text>

      {reason && (
        <Section style={reasonCard}>
          <Text style={reasonLabel}>MOTIVO</Text>
          <Text style={reasonText}>{reason}</Text>
        </Section>
      )}

      <EmailDivider spacing="md" />

      <Row>
        <Column style={{ paddingRight: '8px' }}>
          <EmailButton href={juntaUrl} variant="secondary">Ver junta</EmailButton>
        </Column>
        <Column>
          <EmailButton href={supportUrl} variant="primary">Contactar soporte →</EmailButton>
        </Column>
      </Row>

      <Text style={helpText}>
        Si crees que esto fue un error, nuestro equipo de soporte puede ayudarte a
        revisar el estado de tu junta.
      </Text>

    </EmailLayout>
  )
}

JuntaDeshabilitada.PreviewProps = {
  userName: 'María',
  juntaName: 'Junta Navidad 2024',
  reason: 'Pagos atrasados por más de 30 días',
  juntaUrl: 'https://juntealo.com/junta/navidad-2024',
  supportUrl: 'https://juntealo.com/soporte',
} satisfies JuntaDeshabilitadaProps

// ─── Styles ────────────────────────────────────────────────

const warningBanner: React.CSSProperties = {
  backgroundColor: '#fee2e2',
  borderRadius: '12px',
  padding: '20px',
  textAlign: 'center',
  marginBottom: '32px',
}

const warningIcon: React.CSSProperties = {
  color: '#dc2626',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 4px',
  lineHeight: '1',
}

const warningLabel: React.CSSProperties = {
  color: '#991b1b',
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

const reasonCard: React.CSSProperties = {
  backgroundColor: '#fff8f8',
  borderRadius: '10px',
  borderLeft: '3px solid #dc2626',
  padding: '14px 18px',
  marginTop: '20px',
}

const reasonLabel: React.CSSProperties = {
  color: '#dc2626',
  fontSize: '11px',
  fontWeight: '600',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  margin: '0 0 6px',
}

const reasonText: React.CSSProperties = {
  color: '#3d3b37',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
}

const helpText: React.CSSProperties = {
  color: '#7a7872',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '24px 0 0',
}
