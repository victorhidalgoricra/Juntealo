import * as React from 'react'
import { Section, Text, Row, Column } from '@react-email/components'
import { EmailLayout } from '../layouts/EmailLayout'
import { EmailButton } from '../components/EmailButton'
import { EmailDivider } from '../components/EmailDivider'

export interface NuevoIntegranteProps {
  userName: string
  juntaName: string
  newMemberName: string
  juntaUrl: string
}

export function NuevoIntegrante({ userName, juntaName, newMemberName, juntaUrl }: NuevoIntegranteProps) {
  return (
    <EmailLayout preview={`${newMemberName} se unió a tu junta "${juntaName}"`}>

      <Text style={greeting}>Hola, {userName}</Text>

      <Text style={headline}>Nuevo integrante</Text>

      <Text style={body}>
        <strong style={strong}>{newMemberName}</strong> acaba de unirse a tu junta{' '}
        <strong style={strong}>{juntaName}</strong>.
      </Text>

      <EmailDivider spacing="md" />

      {/* Member card */}
      <Section style={memberCard}>
        <Row>
          <Column style={{ width: '48px', verticalAlign: 'middle' }}>
            <Section style={avatar}>
              <Text style={avatarInitial}>
                {newMemberName.charAt(0).toUpperCase()}
              </Text>
            </Section>
          </Column>
          <Column style={{ paddingLeft: '14px', verticalAlign: 'middle' }}>
            <Text style={memberName}>{newMemberName}</Text>
            <Text style={memberRole}>Integrante nuevo</Text>
          </Column>
          <Column style={{ textAlign: 'right', verticalAlign: 'middle' }}>
            <Text style={joinedBadge}>Se unió ahora</Text>
          </Column>
        </Row>
      </Section>

      <EmailDivider spacing="md" />

      <Row>
        <Column>
          <EmailButton href={juntaUrl}>Ver junta →</EmailButton>
        </Column>
      </Row>

    </EmailLayout>
  )
}

NuevoIntegrante.PreviewProps = {
  userName: 'Laura',
  juntaName: 'Junta Amigos 2025',
  newMemberName: 'Marco Rodríguez',
  juntaUrl: 'https://juntealo.com/junta/amigos-2025',
} satisfies NuevoIntegranteProps

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

const memberCard: React.CSSProperties = {
  backgroundColor: '#f5f5f3',
  borderRadius: '12px',
  padding: '18px 20px',
}

const avatar: React.CSSProperties = {
  backgroundColor: '#eef2fd',
  borderRadius: '50%',
  width: '44px',
  height: '44px',
  textAlign: 'center',
  lineHeight: '44px',
}

const avatarInitial: React.CSSProperties = {
  color: '#2d5be3',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0',
  lineHeight: '44px',
  textAlign: 'center',
}

const memberName: React.CSSProperties = {
  color: '#141412',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0 0 2px',
  lineHeight: '1.3',
}

const memberRole: React.CSSProperties = {
  color: '#7a7872',
  fontSize: '13px',
  margin: '0',
  lineHeight: '1.4',
}

const joinedBadge: React.CSSProperties = {
  backgroundColor: '#dcfce7',
  color: '#16a34a',
  borderRadius: '6px',
  padding: '4px 10px',
  fontSize: '12px',
  fontWeight: '600',
  margin: '0',
  display: 'inline-block',
}
