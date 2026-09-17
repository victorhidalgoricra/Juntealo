import * as React from 'react'
import { Column, Row, Section, Text } from '@react-email/components'
import { EmailLayout } from '../layouts/EmailLayout'
import { EmailButton } from '../components/EmailButton'
import { EmailDivider } from '../components/EmailDivider'

export interface RecordatorioMedioPagoProps {
  userName: string
  juntaName: string
  accountUrl: string
}

export function RecordatorioMedioPago({ userName, juntaName, accountUrl }: RecordatorioMedioPagoProps) {
  return (
    <EmailLayout preview={`Configura cómo recibir tus aportes en "${juntaName}"`}>
      <Text style={greeting}>Hola, {userName}</Text>
      <Text style={headline}>Configura cómo recibir tu pago</Text>
      <Text style={body}>
        Te corresponde recibir los aportes de la ronda en <strong style={strong}>{juntaName}</strong>,
        pero todavía no has completado tus datos de pago.
      </Text>

      <EmailDivider spacing="md" />

      <Section style={notice}>
        <Text style={noticeText}>
          Agrega tu Yape, Plin, cuenta bancaria u otro medio para que los integrantes puedan enviarte sus aportes.
        </Text>
      </Section>

      <EmailDivider spacing="md" />

      <Row>
        <Column>
          <EmailButton href={accountUrl}>Configurar medio de pago →</EmailButton>
        </Column>
      </Row>
    </EmailLayout>
  )
}

RecordatorioMedioPago.PreviewProps = {
  userName: 'Josue',
  juntaName: 'Junta Amigos',
  accountUrl: 'https://juntealo.com/account?tab=profile',
} satisfies RecordatorioMedioPagoProps

const greeting: React.CSSProperties = { color: '#7a7872', fontSize: '15px', margin: '0 0 8px', lineHeight: '1.5' }
const headline: React.CSSProperties = { color: '#141412', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px', margin: '0 0 16px', lineHeight: '1.2' }
const body: React.CSSProperties = { color: '#3d3b37', fontSize: '16px', lineHeight: '1.6', margin: '0' }
const strong: React.CSSProperties = { color: '#141412', fontWeight: '700' }
const notice: React.CSSProperties = { backgroundColor: '#eef2fd', borderRadius: '12px', padding: '18px 20px' }
const noticeText: React.CSSProperties = { color: '#334155', fontSize: '14px', lineHeight: '1.6', margin: '0' }
