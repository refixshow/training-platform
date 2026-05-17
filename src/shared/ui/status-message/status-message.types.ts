import type { HTMLAttributes, ReactNode } from 'react'

export type StatusMessageSize = 'md' | 'sm'
export type StatusMessageTone = 'error' | 'info' | 'success' | 'warning'

export interface StatusMessageProps
  extends Omit<HTMLAttributes<HTMLParagraphElement>, 'className' | 'style'> {
  children: ReactNode
  size?: StatusMessageSize
  tone: StatusMessageTone
}
