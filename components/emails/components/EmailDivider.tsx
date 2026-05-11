import * as React from 'react'
import { Hr } from '@react-email/components'

interface EmailDividerProps {
  spacing?: 'sm' | 'md' | 'lg'
}

export function EmailDivider({ spacing = 'md' }: EmailDividerProps) {
  const margins = { sm: '16px 0', md: '28px 0', lg: '40px 0' }

  return (
    <Hr
      style={{
        borderColor: '#e8e6df',
        borderTopWidth: '1px',
        margin: margins[spacing],
      }}
    />
  )
}
