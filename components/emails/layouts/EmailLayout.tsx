import * as React from 'react'
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Row,
  Column,
  Text,
  Hr,
  Preview,
  Font,
  Img,
} from '@react-email/components'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://juntealo.com'

interface EmailLayoutProps {
  preview: string
  children: React.ReactNode
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="es" dir="ltr">
      <Head>
        <Font
          fontFamily="DM Sans"
          fallbackFontFamily={['Arial', 'sans-serif']}
          webFont={{
            url: 'https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZOIHQ.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="DM Sans"
          fallbackFontFamily={['Arial', 'sans-serif']}
          webFont={{
            url: 'https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZa_HQ.woff2',
            format: 'woff2',
          }}
          fontWeight={700}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* ── Header ── */}
          <Section style={header}>
            <Row>
              <Column style={{ verticalAlign: 'middle', width: '40px' }}>
                <Img
                  src={`${APP_URL}/brand/juntealo-icon.svg`}
                  width="32"
                  height="32"
                  alt="Juntealo"
                  style={{ display: 'block' }}
                />
              </Column>
              <Column style={{ verticalAlign: 'middle' }}>
                <Text style={logoText}>Juntealo</Text>
              </Column>
            </Row>
          </Section>

          {/* ── Content ── */}
          <Section style={contentSection}>
            {children}
          </Section>

          {/* ── Footer ── */}
          <Hr style={footerDivider} />
          <Section style={footerSection}>
            <Text style={footerPrimary}>
              Juntealo · Gestión de juntas digitales
            </Text>
            <Text style={footerSecondary}>
              Recibiste este correo porque tienes una cuenta en Juntealo.{' '}
              <a href={`${APP_URL}/settings`} style={footerLink}>
                Gestionar notificaciones
              </a>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

// ─── Styles ────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: '#f5f5f3',
  fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
  margin: '0',
  padding: '32px 0',
}

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e8e6df',
  maxWidth: '600px',
  margin: '0 auto',
  overflow: 'hidden',
}

const header: React.CSSProperties = {
  backgroundColor: '#141412',
  padding: '20px 32px',
}

const logoText: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '700',
  letterSpacing: '-0.3px',
  margin: '0',
  lineHeight: '1',
}

const contentSection: React.CSSProperties = {
  padding: '40px 48px',
}

const footerDivider: React.CSSProperties = {
  borderColor: '#e8e6df',
  margin: '0',
}

const footerSection: React.CSSProperties = {
  backgroundColor: '#141412',
  padding: '24px 48px',
  borderRadius: '0 0 16px 16px',
}

const footerPrimary: React.CSSProperties = {
  color: '#9d9992',
  fontSize: '13px',
  fontWeight: '500',
  margin: '0 0 6px',
  lineHeight: '1.5',
}

const footerSecondary: React.CSSProperties = {
  color: '#5a5852',
  fontSize: '12px',
  margin: '0',
  lineHeight: '1.6',
}

const footerLink: React.CSSProperties = {
  color: '#5a5852',
  textDecoration: 'underline',
}
