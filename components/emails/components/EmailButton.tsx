import * as React from 'react'
import { Button } from '@react-email/components'

interface EmailButtonProps {
  href: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
}

export function EmailButton({ href, children, variant = 'primary' }: EmailButtonProps) {
  const styles: Record<typeof variant, React.CSSProperties> = {
    primary: {
      backgroundColor: '#2d5be3',
      color: '#ffffff',
      borderRadius: '10px',
      padding: '14px 28px',
      fontSize: '15px',
      fontWeight: '600',
      textDecoration: 'none',
      display: 'inline-block',
      letterSpacing: '-0.1px',
    },
    secondary: {
      backgroundColor: 'transparent',
      color: '#2d5be3',
      borderRadius: '10px',
      padding: '13px 27px',
      fontSize: '15px',
      fontWeight: '600',
      textDecoration: 'none',
      display: 'inline-block',
      border: '1.5px solid #2d5be3',
      letterSpacing: '-0.1px',
    },
    danger: {
      backgroundColor: '#dc2626',
      color: '#ffffff',
      borderRadius: '10px',
      padding: '14px 28px',
      fontSize: '15px',
      fontWeight: '600',
      textDecoration: 'none',
      display: 'inline-block',
      letterSpacing: '-0.1px',
    },
  }

  return (
    <Button href={href} style={styles[variant]}>
      {children}
    </Button>
  )
}
