import * as React from 'react'
import { Section, Text, Row, Column } from '@react-email/components'
import { EmailLayout } from '../layouts/EmailLayout'
import { EmailButton } from '../components/EmailButton'
import { EmailDivider } from '../components/EmailDivider'

export interface JuntaCreadaProps {
  userName: string
  juntaName: string
  isPrivate: boolean
  joinCode?: string
  juntaUrl: string
}

export function JuntaCreada({ userName, juntaName, isPrivate, joinCode, juntaUrl }: JuntaCreadaProps) {
  const preview = isPrivate
    ? `Tu junta "${juntaName}" está lista. Comparte el código con tus integrantes.`
    : `Tu junta "${juntaName}" está lista. Comparte el link para invitar integrantes.`

  return (
    <EmailLayout preview={preview}>

      <Text style={greeting}>Hola, {userName} 👋</Text>

      <Text style={headline}>Tu junta fue creada</Text>

      <Text style={body}>
        <strong style={strong}>{juntaName}</strong> está lista.{' '}
        {isPrivate
          ? 'Ahora puedes invitar a tus integrantes compartiendo el código de acceso.'
          : 'Puedes compartir el link de tu junta para invitar integrantes.'}
      </Text>

      <EmailDivider spacing="md" />

      {isPrivate && joinCode && (
        <Section style={codeCard}>
          <Text style={codeLabel}>CÓDIGO DE ACCESO</Text>
          <Text style={codeValue}>{joinCode}</Text>
          <Text style={codeHint}>Comparte este código solo con quienes quieras invitar</Text>
        </Section>
      )}

      {isPrivate && joinCode && <EmailDivider spacing="md" />}

      <Row>
        <Column>
          <EmailButton href={juntaUrl}>Ver mi junta →</EmailButton>
        </Column>
      </Row>

      <Text style={tip}>
        <strong style={strong}>Tip:</strong>{' '}
        {isPrivate
          ? 'Los integrantes pueden unirse desde la app usando el código o el enlace de invitación.'
          : 'Los integrantes pueden unirse desde la app usando el enlace de tu junta.'}
      </Text>

    </EmailLayout>
  )
}

JuntaCreada.PreviewProps = {
  userName: 'Carlos',
  juntaName: 'Junta Familia 2025',
  isPrivate: true,
  joinCode: 'FAM-2025',
  juntaUrl: 'https://juntealo.com/junta/fam-2025',
} satisfies JuntaCreadaProps

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

const codeCard: React.CSSProperties = {
  backgroundColor: '#f5f5f3',
  borderRadius: '12px',
  padding: '24px 28px',
  textAlign: 'center',
}

const codeLabel: React.CSSProperties = {
  color: '#7a7872',
  fontSize: '11px',
  fontWeight: '600',
  letterSpacing: '1.2px',
  margin: '0 0 10px',
  textTransform: 'uppercase',
}

const codeValue: React.CSSProperties = {
  color: '#2d5be3',
  fontSize: '32px',
  fontWeight: '700',
  letterSpacing: '4px',
  margin: '0 0 8px',
  fontFamily: "'DM Mono', 'Courier New', monospace",
}

const codeHint: React.CSSProperties = {
  color: '#7a7872',
  fontSize: '13px',
  margin: '0',
  lineHeight: '1.5',
}

const tip: React.CSSProperties = {
  backgroundColor: '#eef2fd',
  borderRadius: '10px',
  padding: '14px 18px',
  color: '#3d3b37',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '28px 0 0',
}
