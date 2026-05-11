import * as React from 'react'
import { Text } from '@react-email/components'

type BadgeVariant = 'blue' | 'green' | 'amber' | 'red' | 'neutral'

interface EmailBadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  blue: { backgroundColor: '#eef2fd', color: '#2d5be3' },
  green: { backgroundColor: '#dcfce7', color: '#16a34a' },
  amber: { backgroundColor: '#fef3c7', color: '#d97706' },
  red: { backgroundColor: '#fee2e2', color: '#dc2626' },
  neutral: { backgroundColor: '#f5f5f3', color: '#7a7872' },
}

export function EmailBadge({ children, variant = 'blue' }: EmailBadgeProps) {
  return (
    <Text
      style={{
        ...variantStyles[variant],
        display: 'inline-block',
        borderRadius: '6px',
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: '600',
        letterSpacing: '0.3px',
        margin: '0',
        lineHeight: '1.5',
      }}
    >
      {children}
    </Text>
  )
}
